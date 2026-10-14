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
3. **Featured sponsorships** ("Promote your business while supporting girls softball"): four category cards (Field, Jersey, Snack Shack, Digital), each with the same structure: starting price, duration label, three benefits, and "View options." Variants, comparisons, availability, and full terms open in a modal.
4. **Community supporters** ("Make a difference with a contribution at any level"): Bronze, Silver, and Gold as lighter typographic cards, a pointer back to featured sponsorships for businesses that want advertising, and a "Compare levels & terms" disclosure
5. **Custom partnerships:** $5,000+, scholarships, equipment, facilities, and in-kind support
6. **Our community partners:** a filterable directory generated from the data file, with optional verified past supporters
7. **Inquiry form:** the clicked interest is preselected, Jersey adds a Spring/Fall choice, and the form includes spam protection and a confirmation screen
8. **FAQ** and a closing call to action

## Evergreen by design

The page sells WVFP as a long-standing community partner, not a single season. The only
year on the page comes from `settings.bookingSeason` in the data file, and it appears only
where it matters operationally: availability inside the option modals ("Now booking
the 2027 season"), availability hints in the form, and every inquiry submission. To roll
over to a new year, update `bookingSeason` and reset the inventory counts.

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

Each submission adds a row to a **Website Inquiries** tab in the prospect tracker,
with the status **New Inquiry**, an empty Owner column, and a **Possible duplicate**
flag when the same email or business has inquired before. It also sends the owner a
notification email; replying goes straight to the business.

## From inquiry to sponsor

An inquiry is a **lead, not a sponsor**. The website never counts it toward
inventory or revenue and never lists it publicly. A business moves through the
tracker by hand:

| Status | What happens | Website change |
| --- | --- | --- |
| New Inquiry | Arrives from the form | None |
| Contacted → Offer Sent | Owner confirms real availability and sends written terms | Optionally add to `held` to protect a scarce slot |
| Accepted → Paid / Received | WVFP accepts in writing; payment or in-kind contribution confirmed | Move the slot from `held` to `sold` |
| Active Sponsor | Artwork received, placement activated | Add the business to `sponsors` |
| Declined / Not a Fit / Waitlist | Closed or parked | Release any `held` slot |

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
assets/js/sponsorship-data.js      # settings, inventory, sponsors (edit this)
assets/js/main.js                  # availability, form, directory, nav
assets/img/photos/                 # one file per photo placement
assets/img/                        # brand logos, favicons
docs/photography-art-direction.md  # image briefs per placement
docs/launch-qa.md                  # pre-launch click-through + test inquiry
integrations/google-apps-script.gs # form -> Google Sheet + email
```
