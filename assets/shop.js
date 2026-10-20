// HGA redesign: the shopping flow. One cart shared by home, PDP, cart,
// checkout and thank you. Kept in localStorage per viewer; the page still
// works (in memory) when storage is blocked. Payments are not wired: placing
// an order stores a demo order and opens the thank you page.
(function () {
  "use strict";

  var PRICES = {
    poly: { now: 29, open: 150, name: "HGA Poly" },
    glass: { now: 200, open: 600, name: "HGA Glass" }
  };
  var KEY = "hga_cart", ORDER = "hga_last_order";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "$" + n.toLocaleString("en-US"); };
  var clamp = function (n) { n = parseInt(n, 10); return isNaN(n) ? 0 : Math.max(0, Math.min(100, n)); };
  var mem = { poly: 0, glass: 0 };

  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || "null");
      if (c && typeof c.poly === "number") return { poly: clamp(c.poly), glass: clamp(c.glass) };
    } catch (e) {}
    return { poly: mem.poly, glass: mem.glass };
  }
  function write(c) {
    mem = { poly: clamp(c.poly), glass: clamp(c.glass) };
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {}
    badge(true);
    render();
  }
  function add(h, n) { var c = read(); c[h] = clamp(c[h] + n); write(c); }
  function totals(c) {
    var now = c.poly * PRICES.poly.now + c.glass * PRICES.glass.now;
    var open = c.poly * PRICES.poly.open + c.glass * PRICES.glass.open;
    return { count: c.poly + c.glass, now: now, open: open, save: open - now };
  }
  function badge(bump) {
    var n = totals(read()).count;
    $$("[data-cart-count]").forEach(function (b) {
      b.textContent = n; b.hidden = n === 0;
      if (bump) { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
    });
  }
  function set(sel, v) { $$(sel).forEach(function (e) { e.textContent = v; }); }

  // Fills every data-c-* hook on the page from a cart (or a placed order).
  function fill(c, scope) {
    var t = totals(c);
    var r = scope || document;
    ["poly", "glass"].forEach(function (h) {
      $$('[data-line-row="' + h + '"]', r).forEach(function (e) { e.hidden = c[h] === 0; });
      $$('[data-line-q="' + h + '"]', r).forEach(function (e) { if ("value" in e && e.tagName === "INPUT") e.value = c[h]; else e.textContent = c[h]; });
      $$('[data-line-now="' + h + '"]', r).forEach(function (e) { e.textContent = money(c[h] * PRICES[h].now); });
      $$('[data-line-open="' + h + '"]', r).forEach(function (e) { e.textContent = money(c[h] * PRICES[h].open); });
      $$('[data-xsell="' + h + '"]', r).forEach(function (e) { e.hidden = !(c[h] === 0 && t.count > 0); });
    });
    $$("[data-c-count]", r).forEach(function (e) { e.textContent = t.count + (t.count === 1 ? " slot" : " slots"); });
    $$("[data-c-verb]", r).forEach(function (e) { e.textContent = t.count === 1 ? "is" : "are"; });
    $$("[data-c-sub]", r).forEach(function (e) { e.textContent = money(t.open); });
    $$("[data-c-save]", r).forEach(function (e) { e.textContent = "-" + money(t.save); });
    $$("[data-c-save-plain]", r).forEach(function (e) { e.textContent = money(t.save); });
    $$("[data-c-total]", r).forEach(function (e) { e.textContent = money(t.now); });
    $$("[data-c-empty]", r).forEach(function (e) { e.hidden = t.count > 0; });
    $$("[data-c-full]", r).forEach(function (e) { e.hidden = t.count === 0; });
    $$("[data-c-go]", r).forEach(function (e) { e.classList.toggle("is-off", t.count === 0); e.setAttribute("aria-disabled", String(t.count === 0)); });
  }
  function render() { if (!$("[data-thanks]")) fill(read()); }

  // ---------- home builder: add the chosen quantities ----------
  $$("[data-add-cart]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      if (a.classList.contains("is-off")) return;
      var c = {};
      ["poly", "glass"].forEach(function (h) { var i = $('[data-qty="' + h + '"]'); c[h] = i ? clamp(i.value) : 0; });
      write(c);
      location.href = a.getAttribute("href");
    });
  });

  // ---------- PDP ----------
  var pdp = $("[data-pdp]");
  if (pdp) {
    var params = new URLSearchParams(location.search);
    var st = { h: params.get("h") === "poly" ? "poly" : "glass", q: 1 };
    var pdpRender = function () {
      var p = PRICES[st.h];
      $$("[data-pdp-pick]").forEach(function (r) { r.checked = r.value === st.h; r.closest(".hopt").classList.toggle("on", r.checked); });
      $$("[data-slab]", pdp).forEach(function (s) { s.hidden = s.dataset.slab !== st.h; });
      $$("[data-pdp-only]").forEach(function (e) { e.hidden = e.dataset.pdpOnly !== st.h; });
      set("[data-pdp-name]", p.name);
      set("[data-pdp-price]", money(p.now));
      set("[data-pdp-open]", money(p.open));
      set("[data-pdp-save]", money(p.open - p.now));
      set("[data-pdp-pct]", Math.round((1 - p.now / p.open) * 100) + "%");
      $$("[data-pdp-qty]").forEach(function (i) { if (document.activeElement !== i) i.value = st.q; });
      set("[data-pdp-count]", st.q + (st.q === 1 ? " slot" : " slots"));
      set("[data-pdp-total]", money(st.q * p.now));
      set("[data-pdp-total-open]", money(st.q * p.open));
      set("[data-pdp-total-save]", money(st.q * (p.open - p.now)));
      $$("[data-pdp-quick]").forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.pdpQuick) === st.q)); });
    };
    $$("[data-pdp-pick]").forEach(function (r) { r.addEventListener("change", function () { st.h = r.value; pdpRender(); }); });
    $$("[data-pdp-step]").forEach(function (b) { b.addEventListener("click", function () { st.q = Math.max(1, clamp(st.q + Number(b.dataset.pdpStep))); pdpRender(); }); });
    $$("[data-pdp-quick]").forEach(function (b) { b.addEventListener("click", function () { st.q = Number(b.dataset.pdpQuick); pdpRender(); }); });
    var qi = $("[data-pdp-qty]");
    if (qi) {
      qi.addEventListener("input", function () { st.q = Math.max(1, clamp(qi.value)); pdpRender(); });
      qi.addEventListener("blur", function () { qi.value = st.q; });
    }
    var toast = $("[data-added]");
    $$("[data-pdp-add]").forEach(function (b) {
      b.addEventListener("click", function () {
        add(st.h, st.q);
        if (toast) {
          set("[data-added-what]", st.q + " × " + PRICES[st.h].name + " slot" + (st.q === 1 ? "" : "s"));
          toast.hidden = false;
          requestAnimationFrame(function () { toast.classList.add("show"); });
          clearTimeout(toast._t);
          toast._t = setTimeout(function () { toast.classList.remove("show"); }, 6000);
        }
      });
    });
    $$("[data-added-close]").forEach(function (b) { b.addEventListener("click", function () { toast.classList.remove("show"); }); });
    $$("[data-pdp-buy]").forEach(function (b) { b.addEventListener("click", function () { add(st.h, st.q); location.href = "checkout.html"; }); });

    // sticky add to cart once the buy box button leaves the screen
    var bar = $("[data-pdp-bar]"), anchor = $("[data-pdp-anchor]"), stop = $("[data-pdp-stop]");
    if (bar && anchor && "IntersectionObserver" in window) {
      var past = false, stopped = false;
      var upd = function () { bar.classList.toggle("show", past && !stopped); };
      new IntersectionObserver(function (es) { past = !es[0].isIntersecting && es[0].boundingClientRect.top < 0; upd(); }).observe(anchor);
      if (stop) new IntersectionObserver(function (es) { stopped = es[0].isIntersecting; upd(); }).observe(stop);
    }
    pdpRender();
  }


  // ---------- claim buttons (variation A): add one slot and open the cart ----------
  $$("[data-claim]").forEach(function (b) {
    b.addEventListener("click", function () { add(b.dataset.claim === "poly" ? "poly" : "glass", 1); location.href = "cart.html"; });
  });
  // ---------- cart page + checkout summary controls ----------
  $$("[data-cart-step]").forEach(function (b) {
    b.addEventListener("click", function () {
      var c = read(), h = b.dataset.cartStep;
      c[h] = clamp(c[h] + Number(b.dataset.d));
      write(c);
    });
  });
  $$('input[data-line-q]').forEach(function (i) {
    i.addEventListener("change", function () { var c = read(); c[i.dataset.lineQ] = clamp(i.value); write(c); });
  });
  $$("[data-cart-remove]").forEach(function (b) {
    b.addEventListener("click", function () { var c = read(); c[b.dataset.cartRemove] = 0; write(c); });
  });
  $$("[data-cart-add]").forEach(function (b) {
    b.addEventListener("click", function () { add(b.dataset.cartAdd, Number(b.dataset.n || 1)); });
  });
  $$("[data-c-go]").forEach(function (a) { a.addEventListener("click", function (e) { if (a.classList.contains("is-off")) e.preventDefault(); }); });

  // ---------- checkout ----------
  var co = $("[data-checkout-form]");
  if (co) {
    var gift = $("[data-gift-toggle]"), giftFields = $("[data-gift-fields]");
    if (gift) gift.addEventListener("change", function () {
      giftFields.hidden = !gift.checked;
      $$("input", giftFields).forEach(function (i) { i.required = gift.checked && i.dataset.req === "1"; });
    });
    var cc = $("[data-cc]");
    if (cc) cc.addEventListener("input", function () {
      var d = cc.value.replace(/\D/g, "").slice(0, 16);
      cc.value = d.replace(/(.{4})/g, "$1 ").trim();
    });
    var exp = $("[data-exp]");
    if (exp) exp.addEventListener("input", function () {
      var d = exp.value.replace(/\D/g, "").slice(0, 4);
      exp.value = d.length > 2 ? d.slice(0, 2) + " / " + d.slice(2) : d;
    });
    var place = function (method) {
      var c = read();
      if (totals(c).count === 0) { location.href = "cart.html"; return; }
      var email = ($("#co-email") || {}).value || "you@example.com";
      var order = {
        num: "HGA-" + String(Date.now()).slice(-6),
        poly: c.poly, glass: c.glass, email: email,
        name: ($("#co-first") || {}).value || "",
        gift: gift && gift.checked ? (($("#gift-email") || {}).value || "") : "",
        method: method
      };
      try { localStorage.setItem(ORDER, JSON.stringify(order)); } catch (e) {}
      try { sessionStorage.setItem(ORDER, JSON.stringify(order)); } catch (e) {}
      write({ poly: 0, glass: 0 });
      location.href = "thank-you.html";
    };
    // inline errors: a message under each invalid field, first one focused
    var msg = function (f) {
      if (f.validity.valueMissing) return f.type === "checkbox" ? "Please confirm to continue." : "This field is required.";
      if (f.validity.typeMismatch) return "Enter a valid email address.";
      return f.validationMessage;
    };
    var clear = function (f) {
      f.removeAttribute("aria-invalid");
      var e = document.getElementById(f.id + "-err"); if (e) e.remove();
    };
    co.addEventListener("invalid", function (e) {
      var f = e.target; e.preventDefault();
      if (!f.id) f.id = "f" + Math.random().toString(36).slice(2, 8);
      clear(f);
      var p = document.createElement("p");
      p.className = "err"; p.id = f.id + "-err"; p.textContent = msg(f);
      f.setAttribute("aria-invalid", "true"); f.setAttribute("aria-describedby", p.id);
      (f.type === "checkbox" ? f.closest(".chk") : f).insertAdjacentElement("afterend", p);
      if (!co._focused) { co._focused = true; f.focus(); setTimeout(function () { co._focused = false; }, 0); }
    }, true);
    $$("input,select,textarea", co).forEach(function (f) { f.addEventListener("input", function () { if (f.checkValidity()) clear(f); }); f.addEventListener("change", function () { if (f.checkValidity()) clear(f); }); });
    co.addEventListener("submit", function (e) { e.preventDefault(); place("card"); });
    $$("[data-express]").forEach(function (b) { b.addEventListener("click", function () { place(b.dataset.express); }); });
  }

  // ---------- thank you ----------
  var ty = $("[data-thanks]");
  if (ty) {
    var o = null;
    try { o = JSON.parse(localStorage.getItem(ORDER) || "null"); } catch (e) {}
    if (!o) o = { num: "HGA-204117", poly: 2, glass: 1, email: "you@example.com", name: "", gift: "" };
    fill({ poly: o.poly, glass: o.glass }, ty);
    set("[data-o-num]", o.num);
    set("[data-o-email]", o.email);
    if (o.name) set("[data-o-name]", ", " + o.name);
    $$("[data-o-gift]").forEach(function (e) { e.hidden = !o.gift; });
    set("[data-o-gift-email]", o.gift);

    // one slot card per card bought, up to 6 shown
    var tpl = $("[data-pass-tpl]"), wall = $("[data-pass-wall]"), more = $("[data-pass-more]");
    if (tpl && wall) {
      // show a mix when both housings were bought: up to 3 of each, then fill
      var g = Math.min(o.glass, o.poly ? 3 : 6), pl = Math.min(o.poly, 6 - g);
      g = Math.min(o.glass, 6 - pl);
      var list = [], total = o.glass + o.poly;
      for (var i = 0; i < g; i++) list.push("glass");
      for (var j = 0; j < pl; j++) list.push("poly");
      list.forEach(function (h, k) {
        var el = tpl.cloneNode(true);
        el.removeAttribute("data-pass-tpl"); el.hidden = false;
        el.classList.add(h);
        $("[data-pass-h]", el).textContent = PRICES[h].name;
        $("[data-pass-logo]", el).src = h === "glass" ? "./assets/hybrid_grading/hga-glass-828ebfd2.svg" : "./assets/hybrid_grading/hga-poly-69885480.svg";
        $("[data-pass-logo]", el).alt = PRICES[h].name;
        var code = o.num.replace("HGA-", "") + "-" + String(k + 1).padStart(3, "0");
        $("[data-pass-code]", el).textContent = "SLOT " + code;
        el.style.setProperty("--i", k);
        wall.insertBefore(el, more || null);
      });
      if (more) { more.hidden = total <= 6; more.textContent = "+" + (total - 6) + " more in My Slots"; }
    }

    // a calendar reminder for the day booking opens
    var ics = $("[data-ics]");
    if (ics) {
      var body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HGA//Presale//EN", "BEGIN:VEVENT",
        "UID:hga-calendar-opens-2027@hybridgrading.com", "DTSTAMP:20261101T000000Z",
        "DTSTART;VALUE=DATE:20270118", "DTEND;VALUE=DATE:20270119",
        "SUMMARY:HGA grading calendar opens: reserve your grading day",
        "DESCRIPTION:Your HGA slots are ready to book. Pick your grading date on the HGA Grading Calendar. Grading begins Feb 1.",
        "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      try { ics.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" })); } catch (e) {}
    }
  }

  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var done = function () { var t = b.dataset.label || b.textContent; b.dataset.label = t; b.textContent = "Link copied"; setTimeout(function () { b.textContent = t; }, 2000); };
      try { navigator.clipboard.writeText(b.dataset.copy).then(done, done); } catch (e) { done(); }
    });
  });

  badge(false);
  render();
})();
