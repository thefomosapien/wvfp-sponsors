/* ============================================================
   West Valley Fast Pitch — Sponsorship data
   ------------------------------------------------------------
   This is the ONE file to edit when something changes:
     • SETTINGS   — contact email, form endpoint, booking season
     • INVENTORY  — how many of each opportunity are sold/held
     • SPONSORS   — confirmed partners shown in "Our Community Partners"

   The public page is evergreen. The only place a year appears is
   `bookingSeason`, which is shown next to availability and in the
   inquiry form — update it when you open the next season's inventory.

   Keep INVENTORY in sync with the WVFP Sponsorship Prospect
   Tracker (the source of truth). The page never shows an
   opportunity as available once sold + held reaches capacity.
   ============================================================ */
window.WVFP = {

  settings: {
    // Where inquiries are sent. Leave formEndpoint empty to fall back
    // to opening the visitor's email app addressed to contactEmail.
    // See integrations/google-apps-script.gs for the recommended setup
    // (logs each inquiry to the prospect tracker sheet + emails the owner).
    formEndpoint: "",
    contactEmail: "sponsors@wvfastpitch.org", // TODO: confirm the public sponsorship email

    // The season/year currently being sold. Shown only beside availability
    // ("Now booking 2027") and attached to every inquiry.
    bookingSeason: "2027",

    // "proposed" — shows a "pricing pending board approval" notice.
    // "approved" — removes the notice once the board approves the program.
    pricingStatus: "proposed"
  },

  /* ----------------------------------------------------------
     INVENTORY — for the current bookingSeason
     capacity: total positions offered (null = unlimited)
     sold:     confirmed (accepted + paid) positions
     held:     positions on hold for renewals / pending agreements
     open:     set false to pause an offer entirely (e.g. vendor
               deadline passed) — it shows as "Not currently available"
     ---------------------------------------------------------- */
  inventory: {
    "shared-banner":    { name: "Shared Field Banner",            price: 350,  capacity: 12,   sold: 0, held: 0, open: true },
    "dedicated-banner": { name: "Dedicated Field Banner",         price: 750,  capacity: 12,   sold: 0, held: 0, open: true },
    "jersey-spring":    { name: "Spring Jersey Sponsorship",      price: 4500, capacity: 1,    sold: 0, held: 0, open: true },
    "jersey-fall":      { name: "Fall Jersey Sponsorship",        price: 2500, capacity: 1,    sold: 0, held: 0, open: true },
    "snack-shack":      { name: "Snack Shack Presenting Sponsor", price: 2500, capacity: 1,    sold: 0, held: 0, open: true },
    "website":          { name: "Official Website Sponsor",       price: 1500, capacity: 4,    sold: 0, held: 0, open: true },
    "digital-feature":  { name: "Digital Feature Sponsor",        price: 300,  capacity: 6,    sold: 0, held: 0, open: true },
    "bronze":           { name: "Bronze Community Supporter",     price: 250,  capacity: null, sold: 0, held: 0, open: true },
    "silver":           { name: "Silver Community Supporter",     price: 500,  capacity: null, sold: 0, held: 0, open: true },
    "gold":             { name: "Gold Community Supporter",       price: 1000, capacity: null, sold: 0, held: 0, open: true }
  },

  /* ----------------------------------------------------------
     SPONSORS — confirmed partners only (accepted in writing + paid
     or in-kind received). Website inquiries NEVER go here
     automatically — add a business only after it converts.
     level: "partner" (major/custom), "website", "jersey",
            "snack-shack", "gold", "silver", "bronze",
            "field", "digital", "in-kind",
            "past" (verified historical supporter — shown as text
                    under "Thank You to Past Supporters"; add
                    years: "1998–2012" if known)
     logo:  path under assets/img/sponsors/ (optional — Bronze is text only)
     url:   business website (optional)
     until: last day of recognition, YYYY-MM-DD — listings hide
            automatically after this date.

     Example:
     { name: "Example Plumbing Co.", level: "gold",
       logo: "assets/img/sponsors/example-plumbing.png",
       url: "https://example.com", until: "2027-12-31" },
     { name: "Longtime Hardware", level: "past", years: "1985–2010" },
     ---------------------------------------------------------- */
  sponsors: [
  ]
};
