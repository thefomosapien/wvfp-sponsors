# West Valley Fast Pitch — Sponsorships

An evergreen, one-page site that invites local businesses to sponsor West Valley Fast Pitch
and turns interest into a conversation. Recommended home:
`wvfastpitch.org/sponsors`.

The page has three goals: **inspire** (why girls softball matters and WVFP's
history since 1974), **inform** (opportunities, visibility, and impact), and
**convert** (an easy inquiry form). It also recognizes current sponsors.

It is built on the WVFP brand system ([brand.wvfastpitch.org](https://brand.wvfastpitch.org/)):
Roboto Slab, EB Garamond, and Lato, with the red, cream, and gold core palette and the
official logo files.

## Page sections

1. **Hero:** "Support the girls. Strengthen the game.", two calls to action (Explore Sponsorships · Become a Partner), and one line: "Opportunities starting at $250"
2. **About WVFP:** the league's story, quick facts, and what sponsorship supports
3. **Featured sponsorships** ("Promote your business while supporting girls softball"): four category cards (Field, Jersey, Snack Shack, Digital), each with the same structure: starting price, duration label, exactly three short benefits, and "View details." Variants, comparisons, exclusivity, and full terms open in a modal.
4. **Community supporters** ("Make a difference with a contribution at any level"): Bronze ("Show your support"), Silver ("Get recognized"), and Gold ("Become a featured supporter") with progressively more visual weight, a pointer back to featured sponsorships for businesses that want advertising, and a "Compare levels & terms" table (expandable per-level comparisons on phones)
5. **Custom partnerships:** $5,000+, scholarships, equipment, facilities, and in-kind support
6. **Our community partners:** a filterable directory generated from the data file, in four tiers (see below)
7. **Inquiry form:** the clicked interest appears as "Your interest: … · Change", Jersey adds a Spring/Fall choice, and the form includes spam protection and a confirmation screen
8. **FAQ** and a closing call to action

## Evergreen by design

The page sells WVFP as a long-standing community partner, not a single season. No year
appears on the page. `settings.bookingSeason` in the data file is never displayed; it's
attached to each inquiry so the tracker knows which season the business is asking about.
To roll over to a new year, update `bookingSeason` and add the new season's rows to the
Inventory tab.

## Inventory is private

The public page never shows counts, open slots, or sold-out states, and every option can
always be selected, so businesses can always express interest. The form says plainly that
an inquiry doesn't reserve a sponsorship or guarantee availability. Exclusivity and general
limits (one jersey sponsor per season, up to four website sponsors, and so on) stay
visible as terms, not as live counts.

Inventory lives only in the **Inventory** tab of the Sponsorship Prospect Tracker:

| Product key | Product | Price | Season | Capacity | Committed | On hold | Remaining | Open for inquiries? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

`setupInventory()` in the Apps Script creates the tab once, seeded with all ten products.
Leave Capacity blank for unlimited community levels. "Remaining" is a formula. Set "Open
for inquiries?" to `No` to mark something paused internally (the website is unaffected).

When an inquiry arrives, the script **reads** that tab and adds a private snapshot to the
owner email and the inquiry row, for example *"Internal availability (not shown on the
website): Spring Jersey Sponsorship 2027: fully committed (0 of 1)"*. That way whoever replies
knows whether to offer the placement, an alternative, or a spot on a waitlist. The script
never changes the Inventory tab.

## Running locally

It's a static site with no build step:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Day-to-day updates: `assets/js/sponsorship-data.js`

Most website changes only need this one file. (Inventory is not in it; see above.)

**Sponsors.** Add confirmed partners only, meaning signed and paid:

```js
{ name: "Example Plumbing Co.", level: "gold",
  logo: "assets/img/sponsors/example-plumbing.png",
  url: "https://example.com", until: "2027-12-31" }
```

**How the directory scales.** Placement comes entirely from each sponsor's `level`, so
adding or removing sponsors never needs a layout change:

| Tier | Levels | Display |
| --- | --- | --- |
| Featured Website Sponsors | `website` | Largest cards, gold border, always fully shown |
| Premier Partners | `partner`, `jersey`, `snack-shack`, `gold` | Large cards; first 9 shown, then "Show all" |
| Sponsors | `silver`, `field`, `digital`, `in-kind` | Consistent logo grid; first 15 shown, then "Show all" |
| Bronze Supporters / Past Supporters | `bronze`, `past` | Business names |

Within a tier, bigger commitments come first, then names A–Z. Filter buttons appear
automatically once more than one tier has sponsors.

Verified historical supporters can be listed with `level: "past"` (and optional
`years: "1985–2010"`). They appear as text under "Thank You to Past Supporters." Until
there is at least one current partner, the "Become one of our community partners"
invitation stays visible.

Put logo files in `assets/img/sponsors/`. A listing hides itself after its
`until` date. Bronze sponsors appear as text only, which matches their benefits.
List a business once, at its highest recognition level.

**Pricing status.** `pricingStatus: "proposed"` shows a gold notice saying the
program is pending board approval. Change it to `"approved"` after the
board votes and the notice disappears.

## Inquiry form setup

Out of the box, `formEndpoint` is empty. In that case, submitting the form opens
the visitor's email app with a prefilled message to `contactEmail`.

The recommended setup sends every inquiry straight into the prospect tracker and
emails the owner. It takes about 10 minutes:

1. Follow the steps at the top of `integrations/google-apps-script.gs`.
2. Paste the resulting `/exec` URL into `settings.formEndpoint`.

### What the script does with each submission

1. **Screens bots on the server.** A filled-in hidden honeypot field or a form completed
   in under 2.5 seconds gets a normal-looking reply, but nothing is stored or emailed.
2. **Validates everything:** required fields, email format, consent, allowed interest /
   budget / season values, and length limits (business name 120 characters, message 3,000,
   and so on). The website's inputs use the same limits.
3. **Rate-limits:** 3 inquiries per email address per hour, 20 per 10 minutes overall, and
   80 per day overall. Apps Script can't see visitor IP addresses, so the overall caps
   protect the Gmail sending quota (100/day on a personal Google account, 1,500 on
   Google Workspace).
4. **Writes exactly one row.** Each filled-in form carries a random submission ID, and
   repeats of an ID (a double-click, a retry after a network blip, or the browser's own
   automatic re-send) are confirmed without adding a row or sending another email.
   Rows are written by **header name**, so reordering or adding columns in the tab is safe.
   The timestamp, the "Interested in" label, and the Status come from the server.
5. **Emails sponsors@wvfastpitch.org** (the only recipient), with reply-to set to the
   business. The row's **Email notification** column shows `Sent …`, `FAILED — …`, or
   `Not sent — daily quota reached`. Failures are also written to an **Integration Log**
   tab. `retryFailedEmails()` resends them, and `installEmailRetryTrigger()` runs that
   every hour.
6. **Replies to the website in JSON.** The site shows its thank-you screen **only** when
   the reply is `{"ok": true}`. Rejections (invalid fields, rate limit, busy) show a
   specific message, and an unreadable reply or network failure shows "We couldn't
   confirm…" with a safe retry.

**Website Inquiries columns:** Submitted · Submission ID · Status · Owner · Interested in ·
Product key · Season preference · Booking season · Business / organization · Contact name ·
Email · Phone · Website · Budget range · Message · Possible duplicate · Availability at
inquiry (internal) · Email notification · Flags · Page

The script only ever writes to **Website Inquiries** and **Integration Log** (creating
them if needed) and reads **Inventory**. It never touches other tabs.

**Testing the script:** `node tests/apps-script.test.js` runs the real script against
simulated Apps Script services (48 checks, no dependencies). Run it after any edit.

## From inquiry to sponsor

An inquiry is a **lead, not a sponsor**. It never counts toward inventory or revenue
and is never listed publicly. A business moves through the tracker by hand:

| Status | What happens | Inventory tab | Website |
| --- | --- | --- | --- |
| New Inquiry | Arrives from the form | — | — |
| Contacted → Offer Sent | Owner checks the Inventory tab and sends written terms | Optionally add 1 to **On hold** for a scarce slot | — |
| Accepted → Paid / Received | WVFP accepts in writing; payment or in-kind contribution confirmed | Move 1 from **On hold** to **Committed** | — |
| Active Sponsor | Artwork received, placement activated | — | Add the business to `sponsors` |
| Declined / Not a Fit / Waitlist | Closed or parked | Release any **On hold** | — |

Only **Active Sponsor** businesses belong in the public directory.

`docs/launch-qa.md` has the click-through and test-inquiry checklist to run after
deploying.

## Linking to a specific opportunity

Outreach emails can deep-link with the opportunity already selected:

```
https://wvfastpitch.org/sponsors/?opportunity=jersey-spring#inquire
```

Valid keys: `field`, `shared-banner`, `dedicated-banner`, `jersey`, `jersey-spring`,
`jersey-fall`, `snack-shack`, `digital`, `website`, `digital-feature`, `bronze`,
`silver`, `gold`, `custom`, `in-kind`, `not-sure`. (`jersey-spring` and `jersey-fall`
select Jersey with that season already chosen.)

## Photography

Each image placement has a specific art direction and a fixed file in
`assets/img/photos/` (`hero.jpg`, `about.jpg`, `field.jpg`, `jersey.jpg`, `custom.jpg`).
The Snack Shack and Digital cards use built-in placement mockups for now. See
**[docs/photography-art-direction.md](docs/photography-art-direction.md)** for the full
brief, ratios, and permissions checklist. Add `?slots` to the URL to see every placement
labeled on the page.

The current photos are stand-ins from the brand guide mockups. Replace them with real,
released WVFP photography before launch.

## Before launch

- [ ] Board approves pricing, benefits, and terms, then set `pricingStatus: "approved"`
- [ ] Run `setupInventory()` once and enter current Committed / On hold numbers
- [ ] Run `installEmailRetryTrigger()` once, so failed notification emails retry hourly
- [ ] Confirm the public sponsorship email (`contactEmail`, `NOTIFY_EMAILS` in the Apps Script)
- [ ] Deploy the Apps Script and set `formEndpoint`, then run `docs/launch-qa.md` on the live URL
- [ ] Verify banner capacity and locations, Snack Shack signage rights, and jersey vendor deadlines
- [ ] Replace stand-in photos following `docs/photography-art-direction.md`, with parent/guardian releases for identifiable minors
- [ ] Decide whether Community Supporter recognition runs 12 months from activation or by calendar year, and update the terms to match
- [ ] Add confirmed sponsors to `sponsors`, plus any verified past supporters you'd like to thank

## Structure

```
index.html                         # all page content
assets/css/styles.css              # brand tokens + layout
assets/js/sponsorship-data.js      # settings + confirmed sponsors (edit this; public, no inventory)
assets/js/main.js                  # dialogs, form, directory, nav
assets/img/photos/                 # one file per photo placement
assets/img/                        # brand logos, favicons
docs/photography-art-direction.md  # image briefs per placement
docs/launch-qa.md                  # pre-launch click-through + test inquiry
integrations/google-apps-script.gs # form -> Sheet + email; private Inventory tab
tests/                             # node tests/apps-script.test.js (server-side checks)
```
