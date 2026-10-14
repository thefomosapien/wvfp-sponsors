/**
 * West Valley Fast Pitch — Sponsorship inquiry receiver (Google Apps Script)
 *
 * Every website inquiry is:
 *   1. appended as a row to the "Website Inquiries" tab of the
 *      WVFP Sponsorship Prospect Tracker (Google Sheet) with the
 *      status "New Inquiry" (and flagged if the email or business
 *      has inquired before), and
 *   2. emailed to the sponsorship owner(s).
 *
 * Sponsorship INVENTORY is private and lives in this Sheet, in an
 * "Inventory" tab (run setupInventory() once to create it). The public
 * website never shows counts or sold-out states. Each inquiry email
 * includes an internal availability snapshot for the product asked
 * about, read from that tab, so the owner knows what's open before
 * replying.
 *
 * An inquiry is a LEAD, not a sponsor. This script only READS the
 * Inventory tab — it never changes inventory, revenue, or the public
 * partner directory. A business
 * becomes a sponsor only after WVFP accepts it in writing and the
 * payment or in-kind contribution is confirmed — then an owner
 * updates the tracker and the website data file by hand.
 *
 * SETUP (about 10 minutes, once):
 *   1. Open the WVFP Sponsorship Prospect Tracker in Google Sheets.
 *   2. Extensions → Apps Script. Paste this whole file in, replacing Code.gs.
 *   3. Edit NOTIFY_EMAILS below. Then choose setupInventory in the function
 *      menu and click Run once — it creates the "Inventory" tab.
 *   4. Deploy → New deployment → type "Web app".
 *        Execute as: Me   ·   Who has access: Anyone
 *      Authorize when asked.
 *   5. Copy the Web app URL (ends in /exec) and paste it into
 *      assets/js/sponsorship-data.js → settings.formEndpoint.
 *   6. Submit a test inquiry from the live site and confirm the row + email.
 *
 * If you later edit this script, use Deploy → Manage deployments → Edit →
 * Version: New version, so the same URL keeps working.
 */

var NOTIFY_EMAILS = "sponsors@wvfastpitch.org"; // comma-separate multiple addresses
var SHEET_NAME = "Website Inquiries";
var STATUS_NEW = "New Inquiry";
var INVENTORY_SHEET = "Inventory";

// Starting inventory for setupInventory(). After setup, edit the Sheet,
// not this list. Leave Capacity blank for unlimited (community levels).
var INVENTORY_SEED = [
  // key,               product,                          price, capacity
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

// Form interest keys that cover more than one product
var INTEREST_GROUPS = {
  "field": ["shared-banner", "dedicated-banner"],
  "jersey": ["jersey-spring", "jersey-fall"],
  "digital": ["website", "digital-feature"]
};
// Suggested pipeline for the Status column:
// New Inquiry → Contacted → Offer Sent → Accepted → Paid / Received → Active Sponsor
// (or Declined / Not a Fit / Waitlist). Only "Active Sponsor" belongs on the website.

var COLUMNS = [
  ["submitted_at", "Submitted"],
  ["opportunity_label", "Interested in"],
  ["booking_season", "Booking season"],
  ["organization", "Business / organization"],
  ["name", "Contact name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["website", "Website"],
  ["budget", "Budget range"],
  ["message", "Message"],
  ["opportunity", "Product key"],
  ["page", "Page"]
];

function doPost(e) {
  var p = (e && e.parameter) || {};

  // Basic guards: required fields + consent
  if (!p.organization || !p.name || !p.email || p.consent !== "yes") {
    return json({ ok: false, error: "missing_fields" });
  }

  var duplicateNote = "";
  var inventorySnapshot = describeAvailability(p.opportunity, p.season, p.booking_season);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet();
    duplicateNote = findDuplicate(sheet, p);
    var row = COLUMNS.map(function (c) { return clean(p[c[0]]); });
    row.push(STATUS_NEW);   // Status — owner moves it along the pipeline
    row.push("");           // Owner
    row.push(duplicateNote); // Possible duplicate
    row.push(inventorySnapshot); // Internal availability at the time of inquiry
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  var subject = (duplicateNote ? "[Repeat] " : "") + "New sponsorship inquiry — " + clean(p.organization) + " (" + clean(p.opportunity_label) + ")";
  var body = COLUMNS.map(function (c) { return c[1] + ": " + clean(p[c[0]]); }).join("\n") +
    (duplicateNote ? "\n\n" + duplicateNote + "." : "") +
    (inventorySnapshot ? "\n\nInternal availability (not shown on the website): " + inventorySnapshot : "") +
    "\n\nStatus: " + STATUS_NEW + ". This is a lead, not a sponsor: it does not reserve inventory or count toward revenue." +
    "\nVerify availability in the tracker before replying.";

  MailApp.sendEmail({
    to: NOTIFY_EMAILS,
    replyTo: clean(p.email),
    subject: subject,
    body: body
  });

  return json({ ok: true });
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    var headers = COLUMNS.map(function (c) { return c[1]; }).concat(["Status", "Owner", "Possible duplicate", "Availability at inquiry (internal)"]);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

/* ------------------------------------------------------------
   INVENTORY (private)
   ------------------------------------------------------------ */

// Run once from the Apps Script editor to create the Inventory tab.
// Safe to re-run: it won't overwrite an existing tab.
function setupInventory() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(INVENTORY_SHEET)) return "Inventory tab already exists — edit it directly.";
  var sh = ss.insertSheet(INVENTORY_SHEET);
  sh.appendRow(INVENTORY_HEADERS);
  var season = new Date().getFullYear() + 1;
  INVENTORY_SEED.forEach(function (r, i) {
    var n = i + 2;
    sh.appendRow([r[0], r[1], r[2], season, r[3], 0, 0,
      '=IF(E' + n + '="","Unlimited",MAX(0,E' + n + '-F' + n + '-G' + n + '))', "Yes", ""]);
  });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, INVENTORY_HEADERS.length).setFontWeight("bold");
  return "Inventory tab created.";
}

// Read-only: summarize availability for the product(s) a visitor asked about
function describeAvailability(interest, season, bookingSeason) {
  var keys = INTEREST_GROUPS[interest] || [interest];
  if (interest === "jersey" && (season === "spring" || season === "fall")) keys = ["jersey-" + season];
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INVENTORY_SHEET);
  if (!sh || !interest) return "";
  var rows = sh.getDataRange().getValues();
  var h = rows[0];
  var col = function (name) { return h.indexOf(name); };
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (keys.indexOf(String(r[col("Product key")])) === -1) continue;
    // Prefer the row for the season being booked when the tab tracks several seasons
    var rowSeason = String(r[col("Season")] || "");
    if (bookingSeason && rowSeason && rowSeason !== String(bookingSeason)) continue;
    var name = r[col("Product")];
    var open = String(r[col("Open for inquiries?")] || "Yes").toLowerCase() !== "no";
    var cap = r[col("Capacity")];
    var text;
    if (!open) text = "paused";
    else if (cap === "" || cap === null) text = "unlimited";
    else {
      var left = Math.max(0, Number(cap) - Number(r[col("Committed")] || 0) - Number(r[col("On hold")] || 0));
      text = left === 0 ? "fully committed (0 of " + cap + ")" : left + " of " + cap + " remaining";
    }
    out.push(name + (rowSeason ? " " + rowSeason : "") + ": " + text);
  }
  return out.join("; ");
}

// Flag a repeat contact (same email or business name) so the owner can
// merge it with the existing prospect instead of creating a second one
function findDuplicate(sheet, p) {
  var last = sheet.getLastRow();
  if (last < 2) return "";
  var data = sheet.getRange(2, 1, last - 1, COLUMNS.length).getValues();
  var emailCol = indexOfKey("email"), orgCol = indexOfKey("organization");
  var email = String(p.email || "").trim().toLowerCase();
  var org = normalize(p.organization);
  for (var i = data.length - 1; i >= 0; i--) {
    if (email && String(data[i][emailCol]).trim().toLowerCase() === email) return "Same email as row " + (i + 2);
    if (org && normalize(data[i][orgCol]) === org) return "Same business as row " + (i + 2);
  }
  return "";
}

function indexOfKey(key) {
  for (var i = 0; i < COLUMNS.length; i++) if (COLUMNS[i][0] === key) return i;
  return -1;
}

function normalize(v) {
  return String(v == null ? "" : v).toLowerCase().replace(/^'/, "").replace(/[^a-z0-9]/g, "");
}

// Trim, cap length, and neutralize spreadsheet formula injection
function clean(v) {
  v = String(v == null ? "" : v).trim().slice(0, 4000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
