/* ============================================================
   West Valley Fast Pitch — Sponsorship data
   ------------------------------------------------------------
   This is the ONE file to edit when something changes:
     • SETTINGS   — contact email, form endpoint, pricing status
     • INVENTORY  — how many of each opportunity are sold/held
     • SPONSORS   — confirmed partners shown in "Our Sponsors"

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

    // "proposed" — shows a "Proposed 2027 pricing · pending board approval" notice.
    // "approved" — removes the notice once the board approves the program.
    pricingStatus: "proposed",

    season: "2027"
  },

  /* ----------------------------------------------------------
     INVENTORY
     capacity: total positions offered (null = unlimited)
     sold:     confirmed (accepted + paid) positions
     held:     positions on hold for renewals / pending agreements
     open:     set false to pause an offer entirely (e.g. vendor
               deadline passed) — it shows as "Not currently available"
     ---------------------------------------------------------- */
  inventory: {
    "shared-banner":    { name: "Shared Field Banner",            price: 350,  capacity: 12,   sold: 0, held: 0, open: true },
    "dedicated-banner": { name: "Dedicated Field Banner",         price: 750,  capacity: 12,   sold: 0, held: 0, open: true },
    "snack-shack":      { name: "Snack Shack Presenting Sponsor", price: 2500, capacity: 1,    sold: 0, held: 0, open: true },
    "jersey-spring":    { name: "Jersey Sponsor — Spring 2027",   price: 4500, capacity: 1,    sold: 0, held: 0, open: true },
    "jersey-fall":      { name: "Jersey Sponsor — Fall 2027",     price: 2500, capacity: 1,    sold: 0, held: 0, open: true },
    "website":          { name: "Official Website Sponsor",       price: 1500, capacity: 4,    sold: 0, held: 0, open: true },
    "digital-feature":  { name: "Digital Feature Sponsor",        price: 300,  capacity: 6,    sold: 0, held: 0, open: true, per: "per season" },
    "bronze":           { name: "Bronze Community Supporter",     price: 250,  capacity: null, sold: 0, held: 0, open: true },
    "silver":           { name: "Silver Community Supporter",     price: 500,  capacity: null, sold: 0, held: 0, open: true },
    "gold":             { name: "Gold Community Supporter",       price: 1000, capacity: null, sold: 0, held: 0, open: true }
  },

  /* ----------------------------------------------------------
     SPONSORS — confirmed partners only (signed + paid).
     level: "partner" (major/custom), "website", "jersey",
            "snack-shack", "gold", "silver", "bronze",
            "field", "digital", "in-kind"
     logo:  path under assets/img/sponsors/ (optional — Bronze is text only)
     url:   business website (optional)
     until: last day of recognition, YYYY-MM-DD — listings hide
            automatically after this date.

     Example:
     { name: "Example Plumbing Co.", level: "gold",
       logo: "assets/img/sponsors/example-plumbing.png",
       url: "https://example.com", until: "2027-12-31" },
     ---------------------------------------------------------- */
  sponsors: [
  ]
};
