/**
 * West Valley Fast Pitch — Sponsorship inquiry receiver (Google Apps Script)
 *
 * Every website inquiry is:
 *   1. appended as a row to the "Website Inquiries" tab of the
 *      WVFP Sponsorship Prospect Tracker (Google Sheet), and
 *   2. emailed to the sponsorship owner(s).
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

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet();
    var row = COLUMNS.map(function (c) { return clean(p[c[0]]); });
    row.push("New"); // Status — for the owner to update
    row.push("");    // Owner
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  var subject = "New sponsorship inquiry — " + clean(p.organization) + " (" + clean(p.opportunity_label) + ")";
  var body = COLUMNS.map(function (c) { return c[1] + ": " + clean(p[c[0]]); }).join("\n") +
    "\n\nInquiry alone does not reserve inventory. Verify availability in the tracker before replying.";

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
    var headers = COLUMNS.map(function (c) { return c[1]; }).concat(["Status", "Owner"]);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}

// Trim, cap length, and neutralize spreadsheet formula injection
function clean(v) {
  v = String(v == null ? "" : v).trim().slice(0, 4000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
