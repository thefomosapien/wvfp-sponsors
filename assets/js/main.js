/* ============================================================
   West Valley Fast Pitch — Sponsorships
   Nav, availability from the inventory record, form prefill +
   submission, and the sponsor directory. No dependencies.
   Data lives in sponsorship-data.js (window.WVFP).
   ============================================================ */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  var DATA = window.WVFP || { settings: {}, inventory: {}, sponsors: [] };
  var SETTINGS = DATA.settings || {};
  var INVENTORY = DATA.inventory || {};
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Header state ---------- */
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

  /* ---------- Settings: pricing status + contact email ---------- */
  if (SETTINGS.pricingStatus === "approved") {
    var bar = $("#statusBar");
    if (bar) bar.remove();
  }
  var email = SETTINGS.contactEmail;
  if (email) {
    $$(".js-contact-email").forEach(function (a) {
      a.href = "mailto:" + email;
      a.textContent = email;
    });
  }

  /* ============================================================
     AVAILABILITY — computed from the inventory record
     ============================================================ */
  function availability(key) {
    var item = INVENTORY[key];
    if (!item) return null;
    if (item.open === false) return { state: "out", label: "Not currently available", soldOut: true };
    if (item.capacity == null) return { state: "ok", label: "Open to all", soldOut: false };
    var left = Math.max(0, item.capacity - (item.sold || 0) - (item.held || 0));
    var per = item.per ? " " + item.per : "";
    if (left === 0) return { state: "out", label: item.capacity === 1 ? "Sold out" : "Sold out" + per, soldOut: true, left: 0 };
    if (item.capacity === 1) return { state: "ok", label: "1 sponsor · Available", soldOut: false, left: 1 };
    var low = left <= Math.max(1, Math.floor(item.capacity / 4));
    return {
      state: low ? "low" : "ok",
      label: (low ? "Only " + left + " left" : left + " of " + item.capacity + " available") + per,
      soldOut: false,
      left: left
    };
  }

  $$("[data-product]").forEach(function (el) {
    var key = el.getAttribute("data-product");
    var a = availability(key);
    if (!a) return;
    var avail = $(".offer__avail", el);
    if (avail) { avail.textContent = a.label; avail.setAttribute("data-state", a.state); }
    if (a.soldOut) {
      el.classList.add("is-soldout");
      $$("[data-select='" + key + "']", el).forEach(function (btn) {
        btn.textContent = "Join the waitlist";
      });
    }
  });

  /* ============================================================
     INQUIRY FORM
     ============================================================ */
  var form = $("#inquiryForm");
  var select = $("#f-opportunity");
  var selectedBox = $("#formSelected");
  var selectedName = $("#formSelectedName");
  var availHint = $("#availHint");
  var formCard = $(".form-card");
  var formDone = $("#formDone");
  var errorBox = $("#formError");
  var submitBtn = $("#submitBtn");
  var formStarted = Date.now();

  // Mark sold-out options so nobody thinks they're reserving one
  $$("option", select).forEach(function (opt) {
    var a = availability(opt.value);
    if (a && a.soldOut) opt.textContent = opt.textContent + " — sold out (waitlist)";
  });

  function optionLabel(value) {
    var opt = $("option[value='" + value + "']", select);
    return opt ? opt.textContent : value;
  }

  function updateSelected() {
    var v = select.value;
    var show = v && v !== "not-sure";
    selectedBox.hidden = !show;
    if (show) selectedName.textContent = optionLabel(v).replace(/ — sold out \(waitlist\)$/, "");

    var a = availability(v);
    availHint.removeAttribute("data-state");
    if (!a) { availHint.textContent = ""; return; }
    if (a.soldOut) {
      availHint.textContent = "This one is currently spoken for — we'll add you to the waitlist and suggest similar options.";
      availHint.setAttribute("data-state", "out");
    } else if (a.left != null) {
      availHint.textContent = "Availability: " + a.label + ". An inquiry doesn't reserve a spot — WVFP confirms in writing.";
    } else {
      availHint.textContent = "";
    }
  }

  function preselect(value) {
    if (!value || !$("option[value='" + value + "']", select)) return;
    select.value = value;
    updateSelected();
  }

  select.addEventListener("change", updateSelected);

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-select]");
    if (!trigger) return;
    var value = trigger.getAttribute("data-select");
    // Generic "become a sponsor" buttons shouldn't wipe a choice someone already made
    if (value === "not-sure" && select.value !== "not-sure") return;
    preselect(value);
    if (!formDone.hidden) return;
    if (formCard && !prefersReduced) {
      formCard.animate(
        [{ boxShadow: "0 0 0 0 rgba(243,193,44,.9)" }, { boxShadow: "0 0 0 14px rgba(243,193,44,0)" }],
        { duration: 900, delay: 450, easing: "ease-out" }
      );
    }
  });

  // Support links like /sponsors/?opportunity=jersey-spring#inquire for outreach emails
  var params = new URLSearchParams(window.location.search);
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
  $$("input, select, textarea", form).forEach(function (f) {
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

  function collect() {
    var fd = new FormData(form);
    var out = {};
    fd.forEach(function (v, k) { out[k] = typeof v === "string" ? v.trim() : v; });
    out.opportunity_label = optionLabel(out.opportunity);
    out.page = window.location.href.split("#")[0];
    out.submitted_at = new Date().toISOString();
    delete out.company_fax;
    return out;
  }

  function mailtoFor(d) {
    var lines = [
      "Hello WVFP,",
      "",
      "I'd like to learn more about sponsoring West Valley Fast Pitch.",
      "",
      "Interested in: " + d.opportunity_label,
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

  function finish(d, viaEmailApp) {
    form.hidden = true;
    formDone.hidden = false;
    var text = $("#formDoneText");
    if (viaEmailApp) {
      text.innerHTML = "We've opened your email app with your inquiry ready to send — just hit send. " +
        "If it didn't open, email us at <a href=\"" + mailtoFor(d) + "\">" + (SETTINGS.contactEmail || "") + "</a>.";
    } else {
      text.textContent = "Thanks, " + d.name.split(" ")[0] + "! Your inquiry about " +
        d.opportunity_label.replace(/ — .*$/, "") + " is on its way to the WVFP sponsorship team.";
    }
    formDone.focus();
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

    // Quietly drop obvious bots: honeypot filled, or submitted impossibly fast
    if ($("#f-company").value || Date.now() - formStarted < 2500) {
      finish(d, false);
      return;
    }

    if (!SETTINGS.formEndpoint) {
      window.location.href = mailtoFor(d);
      finish(d, true);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.setAttribute("aria-busy", "true");
    submitBtn.firstChild.textContent = "Sending… ";

    // URL-encoded POST is a "simple" request — works with Google Apps Script without CORS preflight
    fetch(SETTINGS.formEndpoint, { method: "POST", body: new URLSearchParams(d) })
      .then(function (res) {
        if (res.type !== "opaque" && !res.ok) throw new Error("HTTP " + res.status);
        finish(d, false);
      })
      .catch(function () {
        showError("Sorry — something went wrong sending your inquiry. Please try again, or " +
          "<a href=\"" + mailtoFor(d) + "\">send it by email instead</a>.");
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.removeAttribute("aria-busy");
        submitBtn.firstChild.textContent = "Send my inquiry ";
      });
  });

  $("#formReset").addEventListener("click", function () {
    var keep = select.value;
    form.reset();
    select.value = keep;
    updateSelected();
    formStarted = Date.now();
    formDone.hidden = true;
    form.hidden = false;
    $("#f-org").focus();
  });

  /* ============================================================
     SPONSOR DIRECTORY
     ============================================================ */
  var GROUPS = [
    { id: "website",  title: "Official Website Partners", levels: ["website"],                 size: "xl", logos: true },
    { id: "partner",  title: "Major Partners",            levels: ["partner"],                 size: "xl", logos: true },
    { id: "featured", title: "Featured Partners",         levels: ["jersey", "snack-shack"],   size: "lg", logos: true },
    { id: "gold",     title: "Gold Supporters",           levels: ["gold"],                    size: "lg", logos: true },
    { id: "silver",   title: "Silver Supporters",         levels: ["silver"],                  size: "md", logos: true },
    { id: "bronze",   title: "Bronze Supporters",         levels: ["bronze"],                  size: "sm", logos: false },
    { id: "field",    title: "Field & Digital Sponsors",  levels: ["field", "digital"],        size: "sm", logos: true },
    { id: "in-kind",  title: "In-Kind Partners",          levels: ["in-kind"],                 size: "sm", logos: true }
  ];
  var LEVEL_NAMES = {
    "website": "Website Partner", "partner": "Major Partner", "jersey": "Jersey Sponsor",
    "snack-shack": "Snack Shack Presenting Sponsor", "gold": "Gold", "silver": "Silver", "bronze": "Bronze",
    "field": "Field Sponsor", "digital": "Digital Sponsor", "in-kind": "In-Kind Partner"
  };

  var dirList = $("#dirList");
  var dirFilters = $("#dirFilters");
  var dirEmpty = $("#dirEmpty");
  var today = new Date().toISOString().slice(0, 10);

  var active = (DATA.sponsors || []).filter(function (s) {
    return s && s.name && (!s.until || s.until >= today);
  });

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

  function renderDirectory(filter) {
    dirList.innerHTML = "";
    GROUPS.forEach(function (g) {
      if (filter && filter !== "all" && filter !== g.id) return;
      var members = active.filter(function (s) { return g.levels.indexOf(s.level) !== -1; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (!members.length) return;

      var section = document.createElement("div");
      section.className = "dir-group";
      var h = document.createElement("h3");
      h.className = "dir-group__title";
      h.textContent = g.title;
      section.appendChild(h);

      if (g.logos) {
        var grid = document.createElement("div");
        grid.className = "dir-grid dir-grid--" + g.size;
        members.forEach(function (s) { grid.appendChild(card(s, true)); });
        section.appendChild(grid);
      } else {
        // Bronze: business name in text (no linked logo)
        var ul = document.createElement("ul");
        ul.className = "dir-text-list";
        members.forEach(function (s) {
          var li = document.createElement("li");
          li.textContent = s.name;
          ul.appendChild(li);
        });
        section.appendChild(ul);
      }
      dirList.appendChild(section);
    });
  }

  if (active.length) {
    dirEmpty.hidden = true;
    var present = GROUPS.filter(function (g) {
      return active.some(function (s) { return g.levels.indexOf(s.level) !== -1; });
    });
    if (present.length > 1) {
      dirFilters.hidden = false;
      [{ id: "all", title: "All", count: active.length }].concat(present.map(function (g) {
        return {
          id: g.id,
          title: g.title.replace(/ (Supporters|Partners|Sponsors)$/, ""),
          count: active.filter(function (s) { return g.levels.indexOf(s.level) !== -1; }).length
        };
      })).forEach(function (f, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
        b.innerHTML = "";
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
