/* ============================================================
   West Valley Fast Pitch — Sponsorships
   Nav, option dialogs,
   form prefill + submission, and the partner directory.
   No dependencies. Data lives in sponsorship-data.js (window.WVFP).
   ============================================================ */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");
  document.documentElement.classList.add("js");

  var DATA = window.WVFP || { settings: {}, inventory: {}, sponsors: [] };
  var SETTINGS = DATA.settings || {};
  // The season being sold is attached to each inquiry for the tracker; it is never displayed
  var SEASON = SETTINGS.bookingSeason ? String(SETTINGS.bookingSeason) : "";
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var params = new URLSearchParams(window.location.search);

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ?slots labels every photo placement with its art-direction brief
  if (params.has("slots")) document.documentElement.classList.add("show-slots");

  /* ---------- Header state + mobile CTA ---------- */
  var header = $("#siteHeader");
  var mobileCta = $("#mobileCta");
  var hero = $("#hero");
  var inquire = $("#inquire");
  var inquireVisible = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    header.classList.toggle("is-solid", y > 40);
    if (mobileCta) {
      var pastHero = hero ? y > hero.offsetHeight - 80 : y > 600;
      mobileCta.classList.toggle("is-visible", pastHero && !inquireVisible);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile nav ---------- */
  var nav = $("#primaryNav");
  var navToggle = $("#navToggle");
  function closeNav() {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }
  navToggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeNav(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { closeNav(); navToggle.focus(); }
  });

  /* ---------- Scrollspy + reveal ---------- */
  var navLinks = {};
  $$("a", nav).forEach(function (a) { navLinks[a.getAttribute("href").slice(1)] = a; });

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Object.keys(navLinks).forEach(function (key) {
          navLinks[key].classList.toggle("is-active", key === entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach(function (s) { if (navLinks[s.id]) spy.observe(s); });

    if (inquire) {
      new IntersectionObserver(function (entries) {
        inquireVisible = entries[0].isIntersecting;
        onScroll();
      }, { threshold: 0.05 }).observe(inquire);
    }
  }

  var reveals = $$(".reveal");
  if (prefersReduced || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var revealObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); obs.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    reveals.forEach(function (el) { revealObs.observe(el); });
  }
  onScroll();

  /* ---------- Settings: pricing status, contact email ---------- */
  if (SETTINGS.pricingStatus === "approved") {
    var bar = $("#statusBar");
    if (bar) bar.remove();
  }
  if (SETTINGS.contactEmail) {
    $$(".js-contact-email").forEach(function (a) {
      a.href = "mailto:" + SETTINGS.contactEmail;
      a.textContent = SETTINGS.contactEmail;
    });
  }
  /* ---------- Community levels: expandable comparisons for small screens ---------- */
  var tierTable = $(".compare--tiers table");
  if (tierTable) {
    var heads = $$("thead th", tierTable).slice(1).map(function (th) { return th.textContent.trim(); });
    var prices = { Bronze: "$250", Silver: "$500", Gold: "$1,000" };
    var wrap = document.createElement("div");
    wrap.className = "compare-m";
    heads.forEach(function (level, col) {
      var d = document.createElement("details");
      d.setAttribute("data-level", level.toLowerCase());
      var sum = document.createElement("summary");
      sum.appendChild(document.createTextNode(level + " "));
      var pr = document.createElement("span");
      pr.textContent = prices[level] || "";
      sum.appendChild(pr);
      d.appendChild(sum);
      var ul = document.createElement("ul");
      $$("tbody tr", tierTable).forEach(function (tr) {
        var cell = tr.children[col + 1];
        var no = !!$(".no", cell);
        var li = document.createElement("li");
        if (no) li.className = "is-no";
        var mark = document.createElement("b");
        mark.textContent = no ? "—" : ($(".yes", cell) ? "✓" : cell.textContent.trim());
        mark.setAttribute("aria-label", no ? "Not included" : "Included");
        li.appendChild(mark);
        li.appendChild(document.createTextNode(tr.children[0].textContent.trim()));
        ul.appendChild(li);
      });
      d.appendChild(ul);
      wrap.appendChild(d);
    });
    tierTable.parentNode.parentNode.insertBefore(wrap, tierTable.parentNode.nextSibling);
  }

  /* ============================================================
     OPTION DIALOGS
     ============================================================ */
  var lastTrigger = null;

  function openDialog(dlg) {
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    document.body.classList.add("dlg-open");
    var closeBtn = $(".dlg__close", dlg);
    if (closeBtn) closeBtn.focus();
  }
  function closeDialog(dlg) {
    // Unlock scrolling right away so a following jump to the form can scroll
    onDialogClosed();
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }
  function onDialogClosed() {
    document.body.classList.remove("dlg-open");
  }

  $$("[data-open]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var dlg = document.getElementById(btn.getAttribute("data-open"));
      if (!dlg) return;
      lastTrigger = btn;
      openDialog(dlg);
    });
  });

  $$(".dlg").forEach(function (dlg) {
    dlg.addEventListener("close", function () {
      onDialogClosed();
      // Return focus to the card unless we're heading to the form
      if (lastTrigger && !dlg.dataset.toForm) lastTrigger.focus();
      delete dlg.dataset.toForm;
    });
    // Click on the backdrop closes
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) closeDialog(dlg);
      var closer = e.target.closest("[data-close]");
      if (!closer) return;
      if (closer.getAttribute("href") === "#inquire") {
        e.preventDefault();
        dlg.dataset.toForm = "1";
        closeDialog(dlg);
        var target = formCard || inquire;
        target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
        if (history.replaceState) history.replaceState(null, "", "#inquire");
      } else {
        closeDialog(dlg);
      }
    });
  });

  /* ============================================================
     INQUIRY FORM
     ============================================================ */
  var form = $("#inquiryForm");
  var select = $("#f-opportunity");
  var seasonField = $("#seasonField");
  var interestBox = $("#interest");
  var interestName = $("#interestName");
  var interestPrice = $("#interestPrice");
  var interestChange = $("#interestChange");
  var oppField = $("#opportunityField");
  // While someone is actively choosing from the dropdown, keep it open
  var pickerOpen = false;
  var formCard = $(".form-card");
  var formDone = $("#formDone");
  var errorBox = $("#formError");
  var submitBtn = $("#submitBtn");
  var formStarted = Date.now();

  function cleanLabel(text) {
    return text.replace(/^\s+/, "");
  }
  function optionLabel(value) {
    var opt = $("option[value='" + value + "']", select);
    return opt ? cleanLabel(opt.textContent) : value;
  }

  function updateSelected() {
    var v = select.value;
    var chosen = v && v !== "not-sure";
    // Show the selection back as "Your interest", with the dropdown tucked behind "Change"
    interestBox.hidden = !chosen || pickerOpen;
    oppField.hidden = chosen && !pickerOpen;
    if (chosen) {
      var parts = optionLabel(v).split(" — ");
      interestName.textContent = parts[0];
      interestPrice.textContent = parts.slice(1).join(" — ");
    }
    seasonField.hidden = v !== "jersey";
  }

  function preselect(value) {
    if (!value) return;
    var season = null;
    var m = /^jersey-(spring|fall)$/.exec(value);
    if (m) { season = m[1]; value = "jersey"; }
    if (!$("option[value='" + value + "']", select)) return;
    select.value = value;
    pickerOpen = false;
    if (value !== "not-sure") {
      interestBox.classList.remove("is-new");
      void interestBox.offsetWidth; // restart the highlight animation
      interestBox.classList.add("is-new");
    }
    if (season) {
      var r = $("input[name='season'][value='" + season + "']", seasonField);
      if (r) r.checked = true;
    }
    updateSelected();
  }

  select.addEventListener("change", updateSelected);
  interestChange.addEventListener("click", function () {
    pickerOpen = true;
    updateSelected();
    select.focus();
  });

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-select]");
    if (!trigger) return;
    var value = trigger.getAttribute("data-select");
    // Generic "become a partner" buttons shouldn't wipe a choice someone already made
    if (value === "not-sure" && select.value !== "not-sure") return;
    preselect(value);
    if (!formDone.hidden) return;
    if (formCard && !prefersReduced && formCard.animate) {
      formCard.animate(
        [{ boxShadow: "0 0 0 0 rgba(243,193,44,.9)" }, { boxShadow: "0 0 0 14px rgba(243,193,44,0)" }],
        { duration: 900, delay: 450, easing: "ease-out" }
      );
    }
  });

  // Deep links for outreach emails: ?opportunity=jersey-spring#inquire
  preselect(params.get("opportunity") || params.get("interest"));
  updateSelected();

  function setInvalid(field, msg) {
    field.setAttribute("aria-invalid", "true");
    var wrap = field.closest(".field");
    if (field.type === "checkbox") { wrap.classList.add("is-invalid"); return; }
    if (!wrap.querySelector(".field__err")) {
      var p = document.createElement("p");
      p.className = "field__err";
      p.id = field.id + "-err";
      p.textContent = msg;
      wrap.appendChild(p);
      field.setAttribute("aria-describedby", p.id);
    }
  }
  function clearInvalid(field) {
    field.removeAttribute("aria-invalid");
    var wrap = field.closest(".field");
    wrap.classList.remove("is-invalid");
    var err = wrap.querySelector(".field__err");
    if (err) { err.remove(); field.removeAttribute("aria-describedby"); }
  }
  $$("input:not([type='radio']), select, textarea", form).forEach(function (f) {
    f.addEventListener("input", function () { clearInvalid(f); });
    f.addEventListener("change", function () { clearInvalid(f); });
  });

  function validate() {
    var firstBad = null;
    var checks = [
      ["#f-org", function (v) { return v.trim().length > 1; }, "Please enter your business or organization."],
      ["#f-name", function (v) { return v.trim().length > 1; }, "Please enter your name."],
      ["#f-email", function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }, "Please enter a valid email address."]
    ];
    checks.forEach(function (c) {
      var el = $(c[0]);
      clearInvalid(el);
      if (!c[1](el.value)) { setInvalid(el, c[2]); firstBad = firstBad || el; }
    });
    var consent = $("#f-consent");
    clearInvalid(consent);
    if (!consent.checked) { setInvalid(consent); firstBad = firstBad || consent; }
    return firstBad;
  }

  function showError(html) {
    errorBox.innerHTML = html;
    errorBox.hidden = false;
  }

  // One ID per filled-in form. Retries reuse it, so the server never records
  // the same inquiry twice; "Send another inquiry" starts a new one.
  var submissionId = newSubmissionId();
  function newSubmissionId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var a = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }

  // Display data for the confirmation screen and the email fallback
  function collect() {
    var fd = new FormData(form);
    var out = {};
    fd.forEach(function (v, k) { out[k] = typeof v === "string" ? v.trim() : v; });
    out.opportunity_label = optionLabel(out.opportunity);
    if (out.opportunity === "jersey") {
      out.opportunity_label += " (" + { spring: "Spring", fall: "Fall", either: "Spring or Fall" }[out.season || "either"] + ")";
    } else {
      delete out.season;
    }
    return out;
  }

  // What the server receives. It derives labels and the timestamp itself,
  // and gets the honeypot and fill time so it can screen bots server-side.
  function payloadFor(d) {
    var keys = ["opportunity", "season", "organization", "name", "email", "phone", "website", "budget", "message", "consent", "company_fax"];
    var p = {};
    keys.forEach(function (k) { if (d[k] != null) p[k] = d[k]; });
    p.company_fax = $("#f-company").value; // always sent, normally empty
    p.submission_id = submissionId;
    p.booking_season = SEASON;
    p.elapsed_ms = String(Date.now() - formStarted);
    p.page = window.location.href.split("#")[0].slice(0, 300);
    return p;
  }

  function mailtoFor(d) {
    var lines = [
      "Hello WVFP,",
      "",
      "I'd like to learn more about sponsoring West Valley Fast Pitch.",
      "",
      "Interested in: " + d.opportunity_label + (SEASON ? " — " + SEASON : ""),
      "Business: " + d.organization,
      "Name: " + d.name,
      "Email: " + d.email
    ];
    if (d.phone) lines.push("Phone: " + d.phone);
    if (d.website) lines.push("Website: " + d.website);
    if (d.budget) lines.push("Budget range: " + d.budget);
    if (d.message) lines.push("", d.message);
    return "mailto:" + (SETTINGS.contactEmail || "") +
      "?subject=" + encodeURIComponent("Sponsorship inquiry — " + d.organization) +
      "&body=" + encodeURIComponent(lines.join("\n"));
  }

  // Only ever called after the server confirms {"ok": true}
  function finish(d) {
    form.hidden = true;
    formDone.hidden = false;
    $("#formDoneText").textContent = "Thanks, " + d.name.split(" ")[0] + "! Your inquiry about " +
      d.opportunity_label.replace(/ — .*$/, "") + " has been received by the WVFP sponsorship team.";
    formDone.focus();
  }

  // The form submits only to the deployed Google Apps Script web app
  var ENDPOINT = String(SETTINGS.formEndpoint || "").trim();
  var ENDPOINT_OK = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(ENDPOINT);
  if (!ENDPOINT_OK && window.console) {
    console.error("WVFP sponsorship form: settings.formEndpoint must be the Apps Script web app URL " +
      "(https://script.google.com/macros/s/…/exec). Current value: " + (ENDPOINT || "(empty)"));
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorBox.hidden = true;

    var bad = validate();
    if (bad) {
      showError("Please check the highlighted fields.");
      bad.focus();
      return;
    }

    var d = collect();

    // Never fall back to opening an email app; without a valid endpoint, say so
    if (!ENDPOINT_OK) {
      showError("Our inquiry form isn't available right now. Please email us at " +
        "<a href=\"mailto:" + (SETTINGS.contactEmail || "") + "\">" + (SETTINGS.contactEmail || "") + "</a>.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.setAttribute("aria-busy", "true");
    submitBtn.firstChild.textContent = "Sending… ";

    sendInquiry(payloadFor(d))
      .then(function (result) {
        if (result && result.ok === true) { finish(d); return; }
        showServerError(result || {}, d);
      })
      .catch(function () {
        // Network failure, timeout, or a reply we couldn't read. Retrying is safe:
        // the same submission ID means the server won't record it twice.
        showError("We couldn't confirm that your inquiry was received. Please try again — " +
          "you won't be submitted twice — or <a href=\"" + mailtoFor(d) + "\">send it by email instead</a>.");
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.removeAttribute("aria-busy");
        submitBtn.firstChild.textContent = "Send my inquiry ";
      });
  });

  // Google Apps Script web apps answer a POST with a 302 redirect to
  // script.googleusercontent.com, which serves the JSON reply with
  // Access-Control-Allow-Origin: *. A default ("cors") fetch follows the
  // redirect and can read it. Rules that keep this working:
  //   - form-encoded body and no custom headers (anything else triggers a
  //     CORS preflight, which Apps Script doesn't answer);
  //   - never mode: "no-cors" (the reply would be unreadable);
  //   - success is ONLY {"ok": true} in the body — Apps Script always
  //     returns HTTP 200, even for rejected submissions.
  function sendInquiry(payload) {
    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 25000) : null;
    return fetch(ENDPOINT, {
      method: "POST",
      body: new URLSearchParams(payload),
      redirect: "follow",
      credentials: "omit",
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        if (timer) clearTimeout(timer);
        try { return JSON.parse(text); }
        catch (err) { throw new Error("Unreadable reply"); } // e.g. a Google sign-in page if access isn't "Anyone"
      }, function (err) {
        if (timer) clearTimeout(timer);
        throw err;
      });
  }

  var SERVER_FIELDS = {
    organization: "#f-org", name: "#f-name", email: "#f-email", phone: "#f-phone",
    website: "#f-website", message: "#f-message", consent: "#f-consent",
    budget: "#f-budget", opportunity: "#f-opportunity"
  };
  function showServerError(result, d) {
    var email = "<a href=\"" + mailtoFor(d) + "\">" + (SETTINGS.contactEmail || "email us") + "</a>";
    if (result.error === "invalid") {
      var first = null;
      (result.fields || []).forEach(function (f) {
        var el = SERVER_FIELDS[f] && $(SERVER_FIELDS[f]);
        if (!el) return;
        if (f === "opportunity") { pickerOpen = true; updateSelected(); }
        setInvalid(el, "Please check this field.");
        first = first || el;
      });
      showError(first ? "Please check the highlighted fields." :
        "Something about this inquiry couldn't be accepted. Please try again, or email us at " + email + ".");
      if (first) first.focus();
    } else if (result.error === "rate_limited") {
      showError("We've received several inquiries in a short time. Please try again a little later, or email us at " + email + ".");
    } else if (result.error === "busy") {
      showError("Our system is busy for a moment. Please try again — you won't be submitted twice.");
    } else {
      showError("Sorry — something went wrong on our end. Please try again, or email us at " + email + ".");
    }
  }

  $("#formReset").addEventListener("click", function () {
    var keep = select.value;
    form.reset();
    select.value = keep;
    pickerOpen = false;
    updateSelected();
    formStarted = Date.now();
    submissionId = newSubmissionId();
    formDone.hidden = true;
    form.hidden = false;
    $("#f-org").focus();
  });

  /* ============================================================
     COMMUNITY PARTNER DIRECTORY
     ============================================================ */
  // Four tiers of prominence. Placement is driven entirely by each sponsor's
  // `level` in the data file — adding or removing sponsors never needs a layout change.
  //   premium   — featured website sponsors (largest)
  //   prominent — major partners, jersey, Snack Shack, and Gold
  //   grid      — every other logo, in a consistent grid
  //   names     — Bronze (text), and verified past supporters
  var DIR_GROUPS = [
    { id: "website", short: "Website",   title: "Featured Website Sponsors",     levels: ["website"],                                  style: "premium",   size: "xl", logos: true,  limit: 0 },
    { id: "premier", short: "Premier",   title: "Premier Partners",              levels: ["partner", "jersey", "snack-shack", "gold"], style: "prominent", size: "lg", logos: true,  limit: 9 },
    { id: "sponsors", short: "Sponsors",  title: "Sponsors",                      levels: ["silver", "field", "digital", "in-kind"],    style: "grid",      size: "sm", logos: true,  limit: 15 },
    { id: "bronze", short: "Bronze",    title: "Bronze Supporters",             levels: ["bronze"],                                   style: "names",     logos: false },
    { id: "past", short: "Past",      title: "Thank You to Past Supporters",  levels: ["past"],                                     style: "names",     logos: false }
  ];
  // Within a tier, higher commitments come first, then alphabetical
  var LEVEL_RANK = ["website", "partner", "jersey", "snack-shack", "gold", "silver", "field", "digital", "in-kind", "bronze", "past"];
  var LEVEL_NAMES = {
    "website": "Website Partner", "partner": "Major Partner", "jersey": "Jersey Sponsor",
    "snack-shack": "Snack Shack Presenting Sponsor", "gold": "Gold", "silver": "Silver", "bronze": "Bronze",
    "field": "Field Sponsor", "digital": "Digital Sponsor", "in-kind": "In-Kind Partner", "past": "Past Supporter"
  };

  var dirList = $("#dirList");
  var dirFilters = $("#dirFilters");
  var dirEmpty = $("#dirEmpty");
  var today = new Date().toISOString().slice(0, 10);

  // Current partners expire after `until`; verified past supporters are historical and always shown
  var active = (DATA.sponsors || []).filter(function (s) {
    return s && s.name && (s.level === "past" || !s.until || s.until >= today);
  });
  var current = active.filter(function (s) { return s.level !== "past"; });

  function safeUrl(u) {
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    try { return new URL(u).href; } catch (err) { return ""; }
  }

  function card(s, withLogo) {
    var url = safeUrl(s.url);
    var el = document.createElement(url ? "a" : "div");
    el.className = "dir-card";
    if (url) { el.href = url; el.target = "_blank"; el.rel = "noopener sponsored"; }
    if (withLogo && s.logo) {
      var img = document.createElement("img");
      img.src = s.logo;
      img.alt = s.name + (url ? " (opens website)" : "");
      img.loading = "lazy";
      el.appendChild(img);
    } else {
      var n = document.createElement("span");
      n.className = "dir-card__name";
      n.textContent = s.name;
      el.appendChild(n);
    }
    var lvl = document.createElement("span");
    lvl.className = "dir-card__level";
    lvl.textContent = LEVEL_NAMES[s.level] || "";
    el.appendChild(lvl);
    return el;
  }

  function membersOf(g) {
    return active.filter(function (s) { return g.levels.indexOf(s.level) !== -1; })
      .sort(function (a, b) {
        return (LEVEL_RANK.indexOf(a.level) - LEVEL_RANK.indexOf(b.level)) || a.name.localeCompare(b.name);
      });
  }

  function renderDirectory(filter) {
    dirList.innerHTML = "";
    DIR_GROUPS.forEach(function (g) {
      if (filter && filter !== "all" && filter !== g.id) return;
      var members = membersOf(g);
      if (!members.length) return;

      var section = document.createElement("div");
      section.className = "dir-group dir-group--" + g.style;
      var h = document.createElement("h3");
      h.className = "dir-group__title";
      h.textContent = g.title;
      section.appendChild(h);

      if (g.logos) {
        var grid = document.createElement("div");
        grid.className = "dir-grid dir-grid--" + g.size;
        // Premium sponsors share the row evenly (1–3 across; 4 becomes 2 × 2)
        if (g.style === "premium") grid.style.setProperty("--premium-cols", members.length === 4 ? 2 : Math.min(members.length, 3));
        members.forEach(function (s, i) {
          var c = card(s, true);
          if (g.limit && i >= g.limit) c.classList.add("is-extra");
          grid.appendChild(c);
        });
        section.appendChild(grid);
        // Long tiers collapse behind "Show all" so the wall of logos never runs away
        if (g.limit && members.length > g.limit) {
          var more = document.createElement("button");
          more.type = "button";
          more.className = "dir-more";
          more.setAttribute("aria-expanded", "false");
          more.textContent = "Show all " + members.length;
          more.addEventListener("click", function () {
            var open = section.classList.toggle("is-expanded");
            more.setAttribute("aria-expanded", open ? "true" : "false");
            more.textContent = open ? "Show fewer" : "Show all " + members.length;
          });
          section.appendChild(more);
        }
      } else {
        // Bronze: business name in text (no linked logo)
        var ul = document.createElement("ul");
        ul.className = "dir-text-list" + (g.id === "past" ? " dir-text-list--past" : "");
        members.forEach(function (s) {
          var li = document.createElement("li");
          li.textContent = s.name + (s.years ? " (" + s.years + ")" : "");
          ul.appendChild(li);
        });
        section.appendChild(ul);
      }
      dirList.appendChild(section);
    });
  }

  // Keep the invitation visible until there are current partners
  dirEmpty.hidden = current.length > 0;
  if (active.length) {
    var present = DIR_GROUPS.filter(function (g) { return membersOf(g).length; });
    if (present.length > 1) {
      dirFilters.hidden = false;
      [{ id: "all", title: "All", count: active.length }].concat(present.map(function (g) {
        return { id: g.id, title: g.short, count: membersOf(g).length };
      })).forEach(function (f, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
        b.appendChild(document.createTextNode(f.title));
        var c = document.createElement("span");
        c.textContent = "(" + f.count + ")";
        b.appendChild(c);
        b.addEventListener("click", function () {
          $$("button", dirFilters).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true");
          renderDirectory(f.id);
        });
        dirFilters.appendChild(b);
      });
    }
    renderDirectory("all");
  }
})();
