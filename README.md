# West Valley Fast Pitch — 2027 Sponsorships

A one-page site that invites local businesses to sponsor West Valley Fast Pitch
and turns interest into a conversation. Recommended home:
`wvfastpitch.org/sponsors`.

The page has three goals: **inspire** (why girls softball matters and WVFP's
history since 1974), **inform** (opportunities, visibility, and impact), and
**convert** (an easy inquiry form). It also recognizes current sponsors.

It is built on the WVFP brand system ([brand.wvfastpitch.org](https://brand.wvfastpitch.org/)):
Roboto Slab, EB Garamond, and Lato, with the red, cream, and gold core palette and the
official logo files.

## Page sections

1. **Hero:** "Support the girls. Strengthen the game." plus a starting-price ladder
2. **Make an impact:** WVFP's story, what sponsorship funds, and why businesses partner
3. **Featured sponsorships:** Fields, Jerseys, Snack Shack, and Digital, with price, term, live availability, benefits, and limits
4. **Community levels:** Bronze, Silver, and Gold cards, a comparison table, and a "mix & match" example
5. **Custom partnerships:** $5,000+, scholarships, equipment, facilities, and in-kind gifts
6. **Our sponsors:** a filterable directory generated from the data file
7. **Inquiry form:** the clicked opportunity is preselected, with spam protection and a confirmation screen
8. **FAQ** and a closing call to action

## Running locally

It's a static site with no build step:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Day-to-day updates: `assets/js/sponsorship-data.js`

Most changes only need this one file.

**Inventory.** When a sponsorship is accepted and paid, increase `sold` for that
product. Use `held` for renewal holds and pending agreements. The page then works
out availability on its own ("12 of 12 available", then "Only 2 left", then
"Sold out"). Once an opportunity is sold out, its button changes to "Join the
waitlist", so it is never shown as available. Set `open: false` to pause an
offer (for example, after the jersey vendor's print deadline passes). Keep these
numbers in sync with the **WVFP Sponsorship Prospect Tracker**, which remains the
source of truth.

**Sponsors.** Add confirmed partners only, meaning signed and paid:

```js
{ name: "Example Plumbing Co.", level: "gold",
  logo: "assets/img/sponsors/example-plumbing.png",
  url: "https://example.com", until: "2027-12-31" }
```

Put logo files in `assets/img/sponsors/`. A listing hides itself after its
`until` date. Bronze sponsors appear as text only, which matches their benefits.
List a business once, at its highest recognition level.

**Pricing status.** `pricingStatus: "proposed"` shows a gold notice saying the
2027 program is pending board approval. Change it to `"approved"` after the
board votes and the notice disappears.

## Inquiry form setup

Out of the box, `formEndpoint` is empty. In that case, submitting the form opens
the visitor's email app with a prefilled message to `contactEmail`.

The recommended setup sends every inquiry straight into the prospect tracker and
emails the owner. It takes about 10 minutes:

1. Follow the steps at the top of `integrations/google-apps-script.gs`.
2. Paste the resulting `/exec` URL into `settings.formEndpoint`.

Each submission adds a row to a **Website Inquiries** tab, with Status and Owner
columns for follow-up, and sends a notification email that you can reply to.

## Linking to a specific opportunity

Outreach emails can deep-link with the opportunity already selected:

```
https://wvfastpitch.org/sponsors/?opportunity=jersey-spring#inquire
```

Valid keys: `shared-banner`, `dedicated-banner`, `snack-shack`, `jersey-spring`,
`jersey-fall`, `website`, `digital-feature`, `bronze`, `silver`, `gold`,
`custom`, `in-kind`, `not-sure`.

## Before launch

- [ ] Board approves pricing, benefits, and terms, then set `pricingStatus: "approved"`
- [ ] Confirm the public sponsorship email (`contactEmail`, `NOTIFY_EMAILS` in the Apps Script)
- [ ] Deploy the Apps Script and set `formEndpoint`, then send a test inquiry
- [ ] Verify banner capacity and locations, Snack Shack signage rights, and jersey vendor deadlines
- [ ] Replace placeholder and mockup photography with real, approved league photos where possible
- [ ] Add confirmed sponsors to `sponsors`

## Structure

```
index.html                         # all page content
assets/css/styles.css              # brand tokens + layout
assets/js/sponsorship-data.js      # settings, inventory, sponsors (edit this)
assets/js/main.js                  # availability, form, directory, nav
assets/img/                        # brand logos, photos, favicons
integrations/google-apps-script.gs # form -> Google Sheet + email
```
