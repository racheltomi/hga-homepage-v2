/* Site-wide micro-interactions (subtle). Pairs with motion.css.
   1. scroll reveal for content nothing else animates  2. smooth FAQ <details>
   3. header firms up once scrolled. Progressive: without this file everything is visible. */
(function () {
  "use strict";
  var root = document.documentElement;
  if (!root.hasAttribute("data-theme")) return; // HGA pages only (story.html runs its own system)
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- 3. header ----------
  function initHeader() {
    var hdr = document.querySelector(".hdr");
    if (!hdr) return;
    var on = null, queued = false;
    function upd() {
      queued = false;
      var s = (window.pageYOffset || root.scrollTop) > 8;
      if (s !== on) { on = s; hdr.classList.toggle("mx-scrolled", s); }
    }
    window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  // ---------- 1. scroll reveal ----------
  // Single items: section eyebrows, headings, ledes, closing notes and CTAs.
  var SINGLE = [
    "main .sec .eb", "main .sec .h2", "main .sec .lede", "main .sec .gx-show-lede",
    "main .sec .v2-note", "main .sec .v2-cta", "main .sec .hz-same", "main .sec .hm-fine",
    "main .sec .fq-h", "main .endcta .wrap > *"
  ];
  // Grid / list children: these get a small stagger across siblings entering together.
  var GRID = [
    ".v2-steps > li", ".hc-pics > figure", ".hm-steps > li", ".hm-cal-notes > li", ".hm-plans > article",
    ".hm-faq-list > details", ".kb-grid > *", ".ty-3 > *", ".next > li", ".ps-steps > li",
    ".sg-notes > *", ".sg-intro > *", ".usps > *", ".faq > details", ".pass-wall > *"
  ];
  // Never touch: things that already animate, first screens, sticky / modal / menu UI, interactive demos.
  var SKIP = [
    ".rv", ".gs", ".reveal", "[data-mx-skip]", ".hc2", ".phero", ".shophero", ".pdp", ".cko", ".ty-hero",
    ".hdr", ".sbar", ".cart-mbar", ".abar", ".hnav", ".subnav", "dialog", "[role=dialog]", "[aria-modal]",
    "#process", "[data-proc]", ".rp", ".rp-top", ".rv3-hero", "[data-gbox]", ".rvs-win", ".rv-track",
    ".rail", ".jmarq", ".ticker", "[data-ben]", "[data-acc]", "[data-tabs]", "[data-steps]",
    ".pf-grid", ".gcal-card", "[data-faq-lib] .faq", "[data-hc-rv]"
  ].join(",");

  function eligible(el) {
    if (el.closest(SKIP)) return false;
    if (el.querySelector(".rv,.gs,.reveal,[data-count]")) return false;
    if (el.style.opacity || el.style.transform) return false; // GSAP or inline motion owns it
    var cs = getComputedStyle(el);
    if (cs.display === "none" || cs.position === "fixed" || cs.position === "sticky") return false;
    if (cs.animationName && cs.animationName !== "none") return false;
    if (cs.transform !== "none" || parseFloat(cs.opacity) < 1) return false;
    return true;
  }

  function initReveal() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var vh = window.innerHeight || root.clientHeight;
    var picked = [];
    var seen = new Set();
    function take(sel) {
      $$(sel).forEach(function (el) {
        if (seen.has(el)) return;
        seen.add(el);
        if (!eligible(el)) return;
        // anything already on screen (or above it) is left alone: no flash, no wait
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.98) return;
        picked.push(el);
      });
    }
    GRID.forEach(take);
    SINGLE.forEach(take);
    // never nest: drop anything inside another picked element
    picked = picked.filter(function (el) { return !picked.some(function (o) { return o !== el && o.contains(el); }); });
    if (!picked.length) return;

    picked.forEach(function (el) { el.classList.add("mx-r"); });

    var pending = picked.length;
    function show(el, delay) {
      if (el.classList.contains("in")) return;
      if (delay) el.style.setProperty("--mx-d", delay + "ms");
      el.classList.add("in");
      pending--;
      // once revealed, drop the stagger delay so it never lingers on later transitions
      if (delay) setTimeout(function () { el.style.removeProperty("--mx-d"); }, delay + 800);
    }
    var io = new IntersectionObserver(function (es) {
      fired = true;
      var batch = es.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      // stagger in document order across whatever entered together (capped)
      batch.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
      batch.forEach(function (el, i) { io.unobserve(el); show(el, Math.min(i, 6) * 75); });
      if (pending <= 0) io.disconnect();
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });
    picked.forEach(function (el) { io.observe(el); });

    // fail-safes. (a) IntersectionObserver always reports once right after observe(); if it has not
    // reported within 2.5s it is not working, so show everything. (b) after scrolling settles, anything
    // that is now above the bottom of the viewport but missed (fast jump, End key, anchor) is shown.
    var fired = false;
    setTimeout(function () { if (!fired) revealAll(); }, 2500);
    var settle = null;
    window.addEventListener("scroll", function () {
      if (pending <= 0) return;
      clearTimeout(settle);
      settle = setTimeout(function () {
        var vb = window.innerHeight || vh;
        picked.forEach(function (el) { if (!el.classList.contains("in") && el.getBoundingClientRect().top < vb) show(el, 0); });
      }, 250);
    }, { passive: true });
    function revealAll() { picked.forEach(function (el) { show(el, 0); }); }
    window.addEventListener("beforeprint", revealAll);
    window.hgaMotionRevealAll = revealAll; // escape hatch for other scripts / debugging
  }

  // ---------- 2e. FAQ details: smooth open/close ----------
  function initDetails() {
    if (reduce || !window.Element || !Element.prototype.animate) return;
    $$("details").forEach(function (d) {
      var sum = d.querySelector(":scope > summary");
      if (!sum || d.closest(".hdr,.hnav,dialog,[role=dialog]")) return;
      d.classList.add("mx-acc");
      var anim = null;
      sum.addEventListener("click", function (e) {
        if (e.defaultPrevented) return;
        e.preventDefault();
        var startH = d.getBoundingClientRect().height;
        if (anim) { anim.cancel(); anim = null; }
        var opening = !d.open || d.classList.contains("mx-closing");
        d.classList.remove("mx-closing");
        var endH;
        if (opening) {
          d.classList.add("mx-opening");
          d.open = true;
          endH = d.getBoundingClientRect().height;
        } else {
          d.open = false;
          endH = d.getBoundingClientRect().height;
          d.open = true;
          d.classList.add("mx-closing");
        }
        d.classList.add("mx-anim");
        anim = d.animate({ height: [startH + "px", endH + "px"] }, { duration: opening ? 380 : 300, easing: "cubic-bezier(.2,.7,.2,1)" });
        if (opening) requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.remove("mx-opening"); }); });
        anim.onfinish = function () {
          anim = null;
          d.classList.remove("mx-anim", "mx-opening");
          if (!opening) { d.open = false; d.classList.remove("mx-closing"); }
        };
      });
    });
  }

  function init() {
    if (!reduce) root.classList.add("mx");
    initHeader(); initReveal(); initDetails(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
