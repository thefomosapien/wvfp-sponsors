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
 * An inquiry is a LEAD, not a sponsor. This script never changes
 * inventory, revenue, or the public partner directory. A business
 * becomes a sponsor only after WVFP accepts it in writing and the
 * payment or in-kind contribution is confirmed — then an owner
 * updates the tracker and the website data file by hand.
 *
 * SETUP (about 10 minutes, once):
 *   1. Open the WVFP Sponsorship Prospect Tracker in Google Sheets.
 *   2. Extensions → Apps Script. Paste this whole file in, replacing Code.gs.
 *   3. Edit NOTIFY_EMAILS below.
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
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet();
    duplicateNote = findDuplicate(sheet, p);
    var row = COLUMNS.map(function (c) { return clean(p[c[0]]); });
    row.push(STATUS_NEW);   // Status — owner moves it along the pipeline
    row.push("");           // Owner
    row.push(duplicateNote); // Possible duplicate
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  var subject = (duplicateNote ? "[Repeat] " : "") + "New sponsorship inquiry — " + clean(p.organization) + " (" + clean(p.opportunity_label) + ")";
  var body = COLUMNS.map(function (c) { return c[1] + ": " + clean(p[c[0]]); }).join("\n") +
    (duplicateNote ? "\n\n" + duplicateNote + "." : "") +
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
    var headers = COLUMNS.map(function (c) { return c[1]; }).concat(["Status", "Owner", "Possible duplicate"]);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
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
