/* ============================================================
   West Valley Fast Pitch — Sponsorship site data
   ------------------------------------------------------------
   This is the ONE file to edit for the public page:
     • SETTINGS — contact email, form endpoint, pricing status
     • SPONSORS — confirmed partners shown in "Our Community Partners"

   Sponsorship inventory (capacity, sold, held, availability) is
   deliberately NOT here: this file is public. Inventory lives in
   the "Inventory" tab of the WVFP Sponsorship Prospect Tracker
   (see integrations/google-apps-script.gs).
   ============================================================ */
window.WVFP = {

  settings: {
    // The deployed Google Apps Script web app (Deploy → Manage deployments →
    // Web app URL). Must look like https://script.google.com/macros/s/…/exec
    // The form submits only here — it never opens the visitor's email app.
    formEndpoint: "https://script.google.com/macros/s/AKfycbyBW4NVFmXvJiJSJY083xm6nD141_xQDwxt4FVbqv5NDa3A3Qu0fLM5F1gjD_GgnvQE/exec",
    contactEmail: "sponsors@wvfastpitch.org", // TODO: confirm the public sponsorship email

    // The season/year currently being sold. Never shown on the page —
    // it's attached to each inquiry so the tracker knows which season it's for.
    bookingSeason: "2027",

    // "proposed" — shows a "pricing pending board approval" notice.
    // "approved" — removes the notice once the board approves the program.
    pricingStatus: "proposed"
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
