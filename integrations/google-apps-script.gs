/**
 * West Valley Fast Pitch — Sponsorship inquiry receiver (Google Apps Script)
 * =========================================================================
 *
 * WHAT IT DOES
 *   Each valid inquiry from the sponsorship website is:
 *     1. validated and screened for bots/abuse on the server,
 *     2. written ONCE to the "Website Inquiries" tab of the WVFP Sponsorship
 *        Prospect Tracker (retries of the same submission never add rows),
 *     3. emailed to sponsors@wvfastpitch.org. If the email fails, the row says
 *        so, the failure is logged, and retryFailedEmails() can resend it.
 *   The website shows its thank-you screen only after this script replies
 *   {"ok": true}.
 *
 * WHAT IT NEVER DOES
 *   - Never trusts browser-supplied timestamps, labels, or prices.
 *   - Never changes the Inventory tab, revenue, or the public partner list.
 *     Inventory is private: it's READ to add an internal availability note
 *     to the owner email. Nothing about inventory is ever sent back to the
 *     website, and inquiries are accepted no matter what inventory says.
 *   - Never touches any tab other than "Website Inquiries", "Integration Log"
 *     (both created on first use), and reading "Inventory".
 *
 * SETUP (once)
 *   1. Open the WVFP Sponsorship Prospect Tracker → Extensions → Apps Script.
 *   2. Replace the contents of Code.gs with this file and Save.
 *   3. Run setupInventory once (function menu → setupInventory → Run) and
 *      approve the permissions. Then fill in Committed / On hold.
 *   4. Optional but recommended: run installEmailRetryTrigger once, so failed
 *      notification emails are retried automatically every hour.
 *   5. Deploy → New deployment → Web app.
 *        Execute as: Me   ·   Who has access: Anyone
 *   6. Copy the Web app URL (ends in /exec). Open it in a browser: you should
 *      see {"ok":true,"service":"wvfp-sponsorship-inquiries"}. Paste it into
 *      assets/js/sponsorship-data.js → settings.formEndpoint.
 *   7. Submit a test inquiry from the live site (see docs/launch-qa.md).
 *
 *   After editing this script later: Deploy → Manage deployments → Edit →
 *   Version: New version. That keeps the same /exec URL.
 */

/* =========================================================================
   CONFIGURATION
   ========================================================================= */

var NOTIFY_EMAIL = "sponsors@wvfastpitch.org"; // the only notification recipient

var SHEET_NAME = "Website Inquiries";
var LOG_SHEET = "Integration Log";
var INVENTORY_SHEET = "Inventory";
var STATUS_NEW = "New Inquiry";
// Suggested Status pipeline: New Inquiry → Contacted → Offer Sent → Accepted →
// Paid / Received → Active Sponsor (or Declined / Not a Fit / Waitlist).

// Abuse protection. Apps Script can't see visitor IP addresses, so limits are
// per email address plus overall caps. The daily cap stays under the Gmail
// sending quota (100/day on consumer accounts, 1,500 on Google Workspace).
var RATE_LIMITS = {
  perEmailPerHour: 3,     // same email address
  globalPer10Min: 20,     // all inquiries combined
  dailyMax: 80            // all inquiries combined, per calendar day
};
var MIN_FILL_MS = 2500;   // forms "filled in" faster than this are treated as bots
var MAX_LINKS_IN_MESSAGE = 3; // more links than this flags the row as possible spam

// Maximum accepted length per field (the website enforces the same limits)
var LIMITS = {
  submission_id: 64, opportunity: 40, season: 10, booking_season: 10,
  organization: 120, name: 100, email: 254, phone: 40, website: 200,
  budget: 40, message: 3000, page: 300, elapsed_ms: 12, consent: 3
};

// Server-side source of truth for what a visitor can ask about.
// Labels come from here, never from the browser.
var OPPORTUNITIES = {
  "not-sure":         "Not sure yet — help me choose",
  "field":            "Field Sponsorship — from $350",
  "shared-banner":    "Shared Field Banner — $350",
  "dedicated-banner": "Dedicated Field Banner — $750",
  "jersey":           "Jersey Sponsorship — from $2,500",
  "snack-shack":      "Snack Shack Sponsorship — $2,500",
  "digital":          "Digital Sponsorship — from $300",
  "website":          "Official Website Sponsor — $1,500/yr",
  "digital-feature":  "Digital Feature — $300",
  "bronze":           "Bronze Supporter — $250",
  "silver":           "Silver Supporter — $500",
  "gold":             "Gold Supporter — $1,000",
  "custom":           "Custom partnership — $5,000+",
  "in-kind":          "In-kind goods or services"
};
var SEASONS = { "spring": "Spring", "fall": "Fall", "either": "Spring or Fall" };
var BUDGETS = ["", "Under $500", "$500 – $1,000", "$1,000 – $2,500", "$2,500 – $5,000", "$5,000+"];

// "Website Inquiries" columns. Rows are written by header NAME, so columns can
// be reordered (or extra columns added) in the Sheet without breaking anything.
var HEADERS = [
  "Submitted", "Submission ID", "Status", "Owner", "Interested in", "Product key",
  "Season preference", "Booking season", "Business / organization", "Contact name",
  "Email", "Phone", "Website", "Budget range", "Message", "Possible duplicate",
  "Availability at inquiry (internal)", "Email notification", "Flags", "Page"
];

// Inventory (private). After setupInventory(), edit the Sheet, not this list.
var INVENTORY_SEED = [
  // key,               product,                          price, capacity ("" = unlimited)
  ["shared-banner",    "Shared Field Banner",             350,   12],
  ["dedicated-banner", "Dedicated Field Banner",          750,   12],
  ["jersey-spring",    "Spring Jersey Sponsorship",       4500,  1],
  ["jersey-fall",      "Fall Jersey Sponsorship",         2500,  1],
  ["snack-shack",      "Snack Shack Presenting Sponsor",  2500,  1],
  ["website",          "Official Website Sponsor",        1500,  4],
  ["digital-feature",  "Digital Feature (per season)",    300,   6],
  ["bronze",           "Bronze Community Supporter",      250,   ""],
  ["silver",           "Silver Community Supporter",      500,   ""],
  ["gold",             "Gold Community Supporter",        1000,  ""]
];
var INVENTORY_HEADERS = ["Product key", "Product", "Price", "Season", "Capacity", "Committed", "On hold", "Remaining", "Open for inquiries?", "Notes"];
var INTEREST_GROUPS = {
  "field": ["shared-banner", "dedicated-banner"],
  "jersey": ["jersey-spring", "jersey-fall"],
  "digital": ["website", "digital-feature"]
};

/* =========================================================================
   WEB APP ENTRY POINTS
   ========================================================================= */

// Health check: open the /exec URL in a browser to confirm the deployment.
function doGet() {
  return json({ ok: true, service: "wvfp-sponsorship-inquiries" });
}

// Always replies with JSON (an uncaught error would return an HTML page the
// website can't read). The website treats only {"ok": true} as success.
function doPost(e) {
  try {
    return json(handleInquiry((e && e.parameter) || {}));
  } catch (err) {
    logEvent("ERROR", "Unhandled error in doPost", String(err && err.stack || err));
    return json({ ok: false, error: "server" });
  }
}

function handleInquiry(raw) {
  // 1. Honeypot and fill-time checks. Bots get a normal-looking "ok" so they
  //    don't learn anything, but nothing is stored or emailed.
  if (str(raw.company_fax) !== "") return { ok: true };
  var elapsed = parseInt(str(raw.elapsed_ms), 10);
  if (!isNaN(elapsed) && elapsed < MIN_FILL_MS) return { ok: true };

  // 2. Validation (lengths, formats, allowed values)
  var v = validate(raw);
  if (v.errors.length) return { ok: false, error: "invalid", fields: v.errors };
  var d = v.data;
  var flags = [];
  if (isNaN(elapsed)) flags.push("No fill-time data");
  if (countLinks(d.message) > MAX_LINKS_IN_MESSAGE) flags.push("Possible spam (many links)");

  var cache = CacheService.getScriptCache();
  var idKey = "sub:" + d.submission_id;

  // 3. Retries of an already-recorded submission: confirm without a new row/email
  if (cache.get(idKey)) return { ok: true, duplicate: true };

  // 4. Rate limits (checked before writing anything)
  var limited = checkRateLimits(d.email, cache);
  if (limited) return { ok: false, error: "rate_limited" };

  // 5. Internal-only inventory note (read-only, never returned to the browser)
  var snapshot = "";
  try { snapshot = describeAvailability(d.opportunity, d.season, d.booking_season); }
  catch (err) { logEvent("WARN", "Inventory lookup failed", String(err)); }

  // 6. Write exactly one row, under a lock
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, error: "busy" };
  var rowNumber, duplicateNote, sheet, cols;
  try {
    sheet = getInquirySheet();
    cols = headerMap(sheet);
    if (findSubmission(sheet, cols, d.submission_id)) {
      cache.put(idKey, "1", 21600);
      return { ok: true, duplicate: true };
    }
    duplicateNote = findDuplicate(sheet, cols, d);
    var record = {
      "Submitted": new Date(),                 // server time, not the browser's
      "Submission ID": d.submission_id,
      "Status": STATUS_NEW,
      "Owner": "",
      "Interested in": d.opportunity_label,
      "Product key": d.opportunity,
      "Season preference": d.season ? SEASONS[d.season] : "",
      "Booking season": d.booking_season,
      "Business / organization": d.organization,
      "Contact name": d.name,
      "Email": d.email,
      "Phone": d.phone,
      "Website": d.website,
      "Budget range": d.budget,
      "Message": d.message,
      "Possible duplicate": duplicateNote,
      "Availability at inquiry (internal)": snapshot,
      "Email notification": "Pending",
      "Flags": flags.join("; "),
      "Page": d.page
    };
    rowNumber = writeRecord(sheet, cols, record);
    countAccepted(d.email, cache);
    cache.put(idKey, "1", 21600);
  } finally {
    lock.releaseLock();
  }

  // 7. Notify. A failure here doesn't lose the inquiry: the row exists, and
  //    the failure is recorded on it and in the Integration Log.
  var status = sendNotification(rowFromSheet(sheet, cols, rowNumber));
  setCell(sheet, cols, rowNumber, "Email notification", status);

  return { ok: true };
}

/* =========================================================================
   VALIDATION
   ========================================================================= */

function validate(raw) {
  var errors = [];
  var d = {};
  Object.keys(LIMITS).forEach(function (k) {
    d[k] = str(raw[k]);
    if (d[k].length > LIMITS[k]) errors.push(k);
  });

  if (!/^[A-Za-z0-9_-]{8,64}$/.test(d.submission_id)) errors.push("submission_id");
  if (d.organization.length < 2) errors.push("organization");
  if (d.name.length < 2) errors.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errors.push("email");
  if (d.consent !== "yes") errors.push("consent");
  if (!OPPORTUNITIES.hasOwnProperty(d.opportunity)) errors.push("opportunity");
  if (BUDGETS.indexOf(d.budget) === -1) errors.push("budget");
  if (d.season && !SEASONS.hasOwnProperty(d.season)) errors.push("season");
  if (d.booking_season && !/^\d{4}$/.test(d.booking_season)) errors.push("booking_season");

  // Season only applies to jersey interest
  if (d.opportunity !== "jersey") d.season = "";
  else if (!d.season) d.season = "either";

  d.opportunity_label = OPPORTUNITIES[d.opportunity] || "";
  if (d.opportunity === "jersey") d.opportunity_label += " (" + SEASONS[d.season] + ")";

  // De-duplicate the error list
  errors = errors.filter(function (x, i) { return errors.indexOf(x) === i; });
  return { errors: errors, data: d };
}

function countLinks(text) {
  return (String(text).match(/https?:\/\/|www\./gi) || []).length;
}

/* =========================================================================
   RATE LIMITING (CacheService for short windows, Properties for the day)
   ========================================================================= */

function checkRateLimits(email, cache) {
  var now = Date.now();
  var emailKey = "rl:e:" + email.toLowerCase() + ":" + Math.floor(now / 3600000);
  var globalKey = "rl:g:" + Math.floor(now / 600000);
  if (num(cache.get(emailKey)) >= RATE_LIMITS.perEmailPerHour) return note("per-email hourly limit", email);
  if (num(cache.get(globalKey)) >= RATE_LIMITS.globalPer10Min) return note("10-minute limit", "");
  var props = PropertiesService.getScriptProperties();
  if (num(props.getProperty(dayKey())) >= RATE_LIMITS.dailyMax) return note("daily limit", "");
  return "";

  function note(which, who) {
    // Log the first trip per window, not every blocked request
    var flag = "rl:logged:" + which + ":" + Math.floor(now / 600000);
    if (!cache.get(flag)) {
      cache.put(flag, "1", 900);
      logEvent("WARN", "Rate limit reached: " + which, who ? "Email: " + who : "");
    }
    return which;
  }
}

function countAccepted(email, cache) {
  var now = Date.now();
  var emailKey = "rl:e:" + email.toLowerCase() + ":" + Math.floor(now / 3600000);
  var globalKey = "rl:g:" + Math.floor(now / 600000);
  cache.put(emailKey, String(num(cache.get(emailKey)) + 1), 3700);
  cache.put(globalKey, String(num(cache.get(globalKey)) + 1), 700);
  var props = PropertiesService.getScriptProperties();
  var key = dayKey();
  props.setProperty(key, String(num(props.getProperty(key)) + 1));
  // Clean up old daily counters
  Object.keys(props.getProperties()).forEach(function (k) {
    if (k.indexOf("count:") === 0 && k !== key) props.deleteProperty(k);
  });
}

function dayKey() {
  return "count:" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

/* =========================================================================
   SHEET ACCESS — header-mapped, never overwrites existing data
   ========================================================================= */

function getInquirySheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    // Add any of our headers that are missing, to the right of existing ones
    var existing = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(String);
    var missing = HEADERS.filter(function (h) { return existing.indexOf(h) === -1; });
    if (missing.length) {
      var start = existing.length + 1;
      sheet.getRange(1, start, 1, missing.length).setValues([missing]);
      sheet.getRange(1, start, 1, missing.length).setFontWeight("bold");
    }
  }
  return sheet;
}

function headerMap(sheet) {
  var row = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = { _width: row.length };
  row.forEach(function (h, i) { if (h !== "" && !(h in map)) map[String(h)] = i + 1; });
  return map;
}

function writeRecord(sheet, cols, record) {
  var width = cols._width;
  var values = [], formats = [];
  for (var c = 1; c <= width; c++) { values.push(""); formats.push("@"); } // plain text keeps phones/ZIPs intact
  Object.keys(record).forEach(function (h) {
    var c = cols[h];
    if (!c) return;
    var val = record[h];
    if (val instanceof Date) { values[c - 1] = val; formats[c - 1] = "yyyy-mm-dd hh:mm:ss"; }
    else values[c - 1] = clean(val);
  });
  var r = sheet.getLastRow() + 1;
  var range = sheet.getRange(r, 1, 1, width);
  range.setNumberFormats([formats]);
  range.setValues([values]);
  return r;
}

function setCell(sheet, cols, row, header, value) {
  if (cols[header]) sheet.getRange(row, cols[header], 1, 1).setValues([[clean(value)]]);
}

function rowFromSheet(sheet, cols, row) {
  var vals = sheet.getRange(row, 1, 1, cols._width).getValues()[0];
  var out = { _row: row };
  HEADERS.forEach(function (h) { out[h] = cols[h] ? vals[cols[h] - 1] : ""; });
  return out;
}

function columnValues(sheet, cols, header) {
  var last = sheet.getLastRow();
  if (last < 2 || !cols[header]) return [];
  return sheet.getRange(2, cols[header], last - 1, 1).getValues().map(function (r) { return r[0]; });
}

function findSubmission(sheet, cols, id) {
  return columnValues(sheet, cols, "Submission ID").some(function (v) { return String(v) === id; });
}

// Flag repeat contacts so the owner can merge them with an existing prospect
function findDuplicate(sheet, cols, d) {
  var emails = columnValues(sheet, cols, "Email");
  var orgs = columnValues(sheet, cols, "Business / organization");
  var email = d.email.toLowerCase(), org = normalize(d.organization);
  for (var i = emails.length - 1; i >= 0; i--) {
    if (String(emails[i]).trim().toLowerCase() === email) return "Same email as row " + (i + 2);
    if (org && normalize(orgs[i]) === org) return "Same business as row " + (i + 2);
  }
  return "";
}

/* =========================================================================
   EMAIL NOTIFICATION — failures are recorded, logged, and retryable
   ========================================================================= */

function sendNotification(row) {
  try {
    if (MailApp.getRemainingDailyQuota() < 1) {
      logEvent("ERROR", "Email not sent: daily Gmail quota reached", "Row " + row._row + " — run retryFailedEmails later");
      return "Not sent — daily quota reached (will retry)";
    }
    var subject = (row["Possible duplicate"] ? "[Repeat] " : "") +
      "New sponsorship inquiry — " + row["Business / organization"] + " (" + row["Interested in"] + ")";
    var lines = [
      "Submitted: " + formatDate(row["Submitted"]),
      "Interested in: " + row["Interested in"],
      "Booking season: " + row["Booking season"],
      "Business: " + row["Business / organization"],
      "Contact: " + row["Contact name"],
      "Email: " + row["Email"],
      "Phone: " + (row["Phone"] || "—"),
      "Website: " + (row["Website"] || "—"),
      "Budget: " + (row["Budget range"] || "—"),
      "",
      "Message:",
      row["Message"] || "—",
      ""
    ];
    if (row["Possible duplicate"]) lines.push("Possible duplicate: " + row["Possible duplicate"]);
    if (row["Flags"]) lines.push("Flags: " + row["Flags"]);
    if (row["Availability at inquiry (internal)"]) {
      lines.push("Internal availability (not shown on the website): " + row["Availability at inquiry (internal)"]);
    }
    lines.push("",
      "Status: " + STATUS_NEW + ". This is a lead, not a sponsor — it doesn't reserve inventory or count toward revenue.",
      "Tracker row: " + row._row + " in \"" + SHEET_NAME + "\".");

    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      replyTo: String(row["Email"]),
      subject: oneLine(subject).slice(0, 250),
      body: lines.join("\n")
    });
    return "Sent " + formatDate(new Date());
  } catch (err) {
    logEvent("ERROR", "Notification email failed", "Row " + row._row + ": " + String(err));
    return "FAILED — " + String(err).slice(0, 180) + " (will retry)";
  }
}

// Resends notifications that failed or were skipped. Run manually, or let
// installEmailRetryTrigger() run it every hour.
function retryFailedEmails() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return "Nothing to retry.";
  var cols = headerMap(sheet);
  var statuses = columnValues(sheet, cols, "Email notification");
  var retried = 0, sent = 0;
  for (var i = 0; i < statuses.length; i++) {
    var s = String(statuses[i]);
    if (s.indexOf("FAILED") !== 0 && s.indexOf("Not sent") !== 0 && s !== "Pending") continue;
    var row = rowFromSheet(sheet, cols, i + 2);
    // Leave very recent "Pending" rows alone; they may still be in progress
    if (s === "Pending" && row["Submitted"] instanceof Date && Date.now() - row["Submitted"].getTime() < 10 * 60000) continue;
    retried++;
    var result = sendNotification(row);
    if (result.indexOf("Sent") === 0) { sent++; result = result + " (retry)"; }
    setCell(sheet, cols, i + 2, "Email notification", result);
  }
  if (retried) logEvent("INFO", "Email retry run", sent + " of " + retried + " sent");
  return sent + " of " + retried + " sent.";
}

function installEmailRetryTrigger() {
  var exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === "retryFailedEmails"; });
  if (!exists) ScriptApp.newTrigger("retryFailedEmails").timeBased().everyHours(1).create();
  return exists ? "Retry trigger already installed." : "Hourly retry trigger installed.";
}

/* =========================================================================
   INVENTORY (private, read-only from here)
   ========================================================================= */

// Run once from the editor. Safe to re-run: won't touch an existing tab.
function setupInventory() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(INVENTORY_SHEET)) return "Inventory tab already exists — edit it directly.";
  var sh = ss.insertSheet(INVENTORY_SHEET);
  var season = new Date().getFullYear() + 1;
  var rows = [INVENTORY_HEADERS];
  INVENTORY_SEED.forEach(function (r, i) {
    var n = i + 2;
    rows.push([r[0], r[1], r[2], season, r[3], 0, 0,
      '=IF(E' + n + '="","Unlimited",MAX(0,E' + n + '-F' + n + '-G' + n + '))', "Yes", ""]);
  });
  sh.getRange(1, 1, rows.length, INVENTORY_HEADERS.length).setValues(rows);
  sh.getRange(1, 1, 1, INVENTORY_HEADERS.length).setFontWeight("bold");
  sh.setFrozenRows(1);
  return "Inventory tab created.";
}

function describeAvailability(interest, season, bookingSeason) {
  if (!interest || interest === "not-sure") return "";
  var keys = INTEREST_GROUPS[interest] || [interest];
  if (interest === "jersey" && (season === "spring" || season === "fall")) keys = ["jersey-" + season];
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INVENTORY_SHEET);
  if (!sh || sh.getLastRow() < 2) return "";
  var rows = sh.getDataRange().getValues();
  var h = rows[0].map(String);
  var col = function (name) { return h.indexOf(name); };
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (keys.indexOf(String(r[col("Product key")])) === -1) continue;
    var rowSeason = String(r[col("Season")] || "");
    if (bookingSeason && rowSeason && rowSeason !== String(bookingSeason)) continue;
    var open = String(r[col("Open for inquiries?")] || "Yes").toLowerCase() !== "no";
    var cap = r[col("Capacity")];
    var text;
    if (!open) text = "paused";
    else if (cap === "" || cap === null) text = "unlimited";
    else {
      var left = Math.max(0, num(cap) - num(r[col("Committed")]) - num(r[col("On hold")]));
      text = left === 0 ? "fully committed (0 of " + cap + ")" : left + " of " + cap + " remaining";
    }
    out.push(r[col("Product")] + (rowSeason ? " " + rowSeason : "") + ": " + text);
  }
  return out.join("; ");
}

/* =========================================================================
   LOGGING & HELPERS
   ========================================================================= */

// Writes to the "Integration Log" tab and the Apps Script execution log.
// Logging problems never break an inquiry.
function logEvent(level, event, detail) {
  try { console.log(level + " " + event + (detail ? " — " + detail : "")); } catch (e) {}
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(LOG_SHEET);
    if (!sh) {
      sh = ss.insertSheet(LOG_SHEET);
      sh.getRange(1, 1, 1, 4).setValues([["Time", "Level", "Event", "Detail"]]);
      sh.getRange(1, 1, 1, 4).setFontWeight("bold");
      sh.setFrozenRows(1);
    }
    sh.getRange(sh.getLastRow() + 1, 1, 1, 4).setValues([[new Date(), level, event, clean(detail || "")]]);
  } catch (e) {}
}

function str(v) {
  return String(v == null ? "" : v).replace(/\r\n?/g, "\n").trim();
}
function num(v) {
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}
function oneLine(v) {
  return String(v).replace(/[\r\n]+/g, " ");
}
function normalize(v) {
  return String(v == null ? "" : v).toLowerCase().replace(/^'/, "").replace(/[^a-z0-9]/g, "");
}
// Neutralize spreadsheet formula injection
function clean(v) {
  v = String(v == null ? "" : v);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}
function formatDate(d) {
  if (!(d instanceof Date)) return String(d || "");
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
