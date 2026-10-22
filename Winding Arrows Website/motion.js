/* ==========================================================================
   MOTION SYSTEM — game-agnostic runtime
   --------------------------------------------------------------------------
   Reads window.MOTION_BINDINGS (motion.config.js), tags elements with data
   attributes, and drives them. Contains no game-specific words or logic.

   Binding forms (all optional keys):
     { sel, set:{m,from,base,stagger,load,surface,parallax,icon,aura,...}, each:true, kids:'css' }
     { sel, heading:true, set:{...} }            word-masked heading (+ eyebrow / lead)
     { sel, group:{cards,from,fromSmall,drive,mq,stagger,order} }
     { sel, window:'draw'|'sequence', set:{...} } animated visual window
     { sel, counter:true }
   ========================================================================== */
(() => {
  "use strict";

  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CFG = Object.assign({ pageTransition: true, loadTimeout: 700 }, window.MOTION_CONFIG || {});
  const BINDINGS = window.MOTION_BINDINGS || [];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const num = (v, d = 0) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);

  const header = $("header.fixed");
  const sections = $$("main > section[id]");
  const navLinks = $$('header nav[aria-label="Primary"] a[href^="#"]');
  const nav = navLinks[0] ? navLinks[0].parentElement : null;

  let groups = [];
  let parallaxEls = [];
  let surfaces = [];
  let indicator = null;
  let currentLink = null;
  let currentSection = -1;

  /* ------------------------------------------------------------------ */
  /* Navigation + header state (runs even with reduced motion)            */
  /* ------------------------------------------------------------------ */
  function initNavigation() {
    if (nav) {
      nav.style.position = "relative";
      indicator = document.createElement("span");
      indicator.className = "m-nav-ind";
      indicator.setAttribute("aria-hidden", "true");
      nav.appendChild(indicator);
    }
    const menu = $("#mobile-menu");
    if (menu) {
      $$("a", menu).forEach((a, i) => a.style.setProperty("--i", i));
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu.dataset.open === "true") $("#menu-toggle")?.click();
      });
    }
  }

  function moveIndicator() {
    if (!indicator || !currentLink || !currentLink.offsetWidth) return;
    indicator.style.opacity = "1";
    indicator.style.transform = `translateX(${currentLink.offsetLeft}px) scaleX(${currentLink.offsetWidth})`;
  }

  function setActiveLink(link) {
    if (link === currentLink) return;
    currentLink = link;
    navLinks.forEach((l) => (l === link ? l.setAttribute("aria-current", "page") : l.removeAttribute("aria-current")));
    moveIndicator();
  }

  /* ------------------------------------------------------------------ */
  /* Binding application                                                  */
  /* ------------------------------------------------------------------ */
  function setAttrs(el, o) {
    if (!o) return;
    for (const k in o) {
      const v = o[k];
      if (k === "i") el.style.setProperty("--i", v);
      else if (k === "base") el.style.setProperty("--base", v + "ms");
      else if (k === "stagger") el.style.setProperty("--stagger", v + "ms");
      else if (k === "m") el.setAttribute("data-m", v);
      else el.setAttribute("data-m-" + k, v === true ? "" : v);
    }
  }

  function splitWords(el) {
    const text = el.textContent.replace(/\s+/g, " ").trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    text.split(" ").forEach((word, i, arr) => {
      const outer = document.createElement("span");
      outer.className = "m-w";
      outer.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.className = "m-wi";
      inner.style.setProperty("--w", i);
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
  }

  function prepareDraw(win) {
    const svgs = win.matches("svg") ? [win] : $$("svg", win);
    svgs.forEach((svg) => {
      let pi = -1;
      Array.from(svg.children).forEach((el) => {
        const tag = el.tagName.toLowerCase();
        if (tag === "path" || tag === "circle" || tag === "line" || tag === "polyline" || tag === "ellipse") {
          pi++;
          let len = 400;
          try { len = Math.ceil(el.getTotalLength()) + 2; } catch (e) { /* keep default */ }
          el.classList.add("m-draw");
          el.style.setProperty("--len", len);
          el.style.setProperty("--pi", pi);
        } else if (tag === "polygon") {
          el.classList.add("m-head");
          el.style.setProperty("--pi", Math.max(pi, 0));
        }
      });
      svg.style.setProperty("--n", Math.max(pi + 1, 1));
    });
  }

  function bindHeading(h, set) {
    if (h.hasAttribute("data-m")) return;
    const base = num(set && set.base, 0);
    splitWords(h);
    h.setAttribute("data-m", "words");
    h.style.setProperty("--base", base + 60 + "ms");
    if (set && set.load) h.setAttribute("data-m-load", "");
    const prev = h.previousElementSibling;
    const next = h.nextElementSibling;
    if (prev && prev.tagName === "P" && !prev.hasAttribute("data-m")) {
      setAttrs(prev, { m: "rise", base, i: 0, ...(set && set.load ? { load: true } : {}) });
    }
    if (next && next.tagName === "P" && !next.hasAttribute("data-m")) {
      setAttrs(next, { m: "rise", base: base + 260, i: 0, ...(set && set.load ? { load: true } : {}) });
    }
  }

  function bindGroup(el, g) {
    const cards = $$(g.cards, el);
    if (!cards.length) return;
    const mq = g.mq ? matchMedia(g.mq) : null;
    const grp = { el, cards, g, mq, mode: "time" };
    const n = cards.length;
    const rankOf = (i) => (g.order === "reverse" ? n - 1 - i : i);

    el.setAttribute("data-m-group", "");
    cards.forEach((c) => {
      c.setAttribute("data-m-card", "");
      c.style.setProperty("--cp", "0");
      Array.from(c.children).forEach((k, j) => k.style.setProperty("--k", j));
      c._rev = false;
    });

    grp.rank = rankOf;

    grp.apply = () => {
      const wide = !mq || mq.matches;
      grp.mode = wide && g.drive === "scroll" ? "scroll" : "time";
      cards.forEach((c, i) => {
        let from = wide ? g.from : g.fromSmall || "up";
        if (from === "alt") from = i % 2 ? "right" : "left";
        c.setAttribute("data-m-from", from);
        c.classList.toggle("m-scrub", grp.mode === "scroll");
        c.style.setProperty("--delay", rankOf(i) * (g.stagger || 100) + "ms");
        if (grp.mode !== "scroll") c.style.setProperty("--cp", c._rev ? "1" : "0");
      });
      if (grp.mode === "scroll") grp.update(true);
    };

    // time-driven cards: play in when they enter, play out when they leave (either direction), replay every time
    grp.sweep = () => {
      if (grp.mode !== "time") return;
      const vh = innerHeight;
      const rects = cards.map((c) => c.getBoundingClientRect());
      let kIn = 0, kOut = 0;
      cards.forEach((c, i) => {
        const r = rects[i];
        if (!c._rev) {
          if (r.top < vh * 0.9 && r.bottom > 0) {
            c._rev = true;
            c.classList.remove("m-out");
            c.style.setProperty("--delay", kIn++ * (g.stagger || 100) + "ms");
            c.style.setProperty("--cp", "1");
          }
        } else if (r.top > vh * 0.97 || r.bottom < -vh * 0.15) {
          c._rev = false;
          c.classList.add("m-out");
          c.style.setProperty("--delay", kOut++ * 40 + "ms");
          c.style.setProperty("--cp", "0");
        }
      });
    };

    // scroll-driven: scrub card progress with the group's position
    grp.update = (force) => {
      if (grp.mode !== "scroll") return;
      const vh = innerHeight;
      const r = el.getBoundingClientRect();
      if (!force && (r.bottom < -vh || r.top > vh * 2)) return;
      const s = clamp((vh * 0.94 - r.top) / (vh * 0.6));
      const lag = 0.18;
      const span = Math.max(0.4, 1 - (n - 1) * lag);
      cards.forEach((c, i) => {
        const raw = clamp((s - rankOf(i) * lag) / span);
        const v = +easeOut(raw).toFixed(4);
        if (c._cp !== v) { c._cp = v; c.style.setProperty("--cp", v); }
      });
    };

    if (mq) (mq.addEventListener ? mq.addEventListener("change", grp.apply) : mq.addListener(grp.apply));
    grp.apply();
    groups.push(grp);
  }

  function applyBindings() {
    BINDINGS.forEach((b) => {
      $$(b.sel).forEach((el, idx) => {
        if (b.heading) return bindHeading(el, b.set);
        if (b.group) return bindGroup(el, b.group);
        if (b.counter) { el.setAttribute("data-m-count", ""); el.classList.add("m-stat"); return; }

        if (b.window) {
          el.classList.add("m-window");
          el.setAttribute("data-m-vis", b.window);
          prepareDraw(el);
          if (b.window === "sequence" && !el.hasAttribute("data-m")) el.setAttribute("data-m", "trigger");
          if (b.set) setAttrs(el, b.set);
          return;
        }

        if (b.kids) {
          const all = Array.from(el.children);
          all.forEach((c, i) => {
            if (c.matches(b.kids.replace(/^:scope\s*>\s*/, "")) && !c.hasAttribute("data-m")) {
              setAttrs(c, { ...b.set, i: (b.set && b.set.i0 ? b.set.i0 : 0) + i });
              c.removeAttribute("data-m-i0");
            }
          });
          return;
        }

        const set = { ...b.set };
        if (b.each) set.i = idx;
        if (set.m && el.hasAttribute("data-m") && !b.override) return;
        setAttrs(el, set);
      });
    });
    // clean helper attribute
    $$("[data-m-i0]").forEach((e) => e.removeAttribute("data-m-i0"));
  }

  /* ------------------------------------------------------------------ */
  /* Reveal observer                                                      */
  /* ------------------------------------------------------------------ */
  function countUp(el) {
    const target = num(el.textContent, NaN);
    if (!Number.isFinite(target) || el._counted) return;
    el._counted = true;
    el._final = el.textContent;
    const dur = 1400;
    const t0 = performance.now();
    el.textContent = "0";
    const tick = (now) => {
      if (!el._counted) return;
      const p = clamp((now - t0) / dur);
      el.textContent = String(Math.round(target * easeOut(p)));
      if (p < 1) requestAnimationFrame(tick); else el.textContent = String(target);
    };
    requestAnimationFrame(tick);
  }

  function reveal(el) {
    if (el.classList.contains("is-in")) return;
    el.classList.remove("m-rev");
    el.classList.add("is-in");
    const base = num(el.style.getPropertyValue("--base"), 0);
    const stag = num(el.style.getPropertyValue("--stagger"), 80);
    const i = num(el.style.getPropertyValue("--i"), 0);
    const total = base + i * stag;
    $$("[data-m-count]", el).forEach((c) => setTimeout(() => { if (el.classList.contains("is-in")) countUp(c); }, total + 150));
    // once settled, drop the entrance delay and the clip so hover etc. feel instant
    clearTimeout(el._doneT);
    el._doneT = setTimeout(() => el.classList.add("is-done"), total + 1700);
  }

  // reverse of reveal: quick and undelayed, so scrolling back up visibly plays the entrance backwards
  function hide(el) {
    if (!el.classList.contains("is-in")) return;
    clearTimeout(el._doneT);
    el.classList.remove("is-in", "is-done");
    el.classList.add("m-rev");
    $$("[data-m-count]", el).forEach((c) => {
      if (c._counted) { c._counted = false; c.textContent = c._final; }
    });
  }

  let managed = [];
  function sweepReveals() {
    if (!managed.length || !root.classList.contains("m-ready")) return;
    const vh = innerHeight;
    const rects = managed.map((e) => e.getBoundingClientRect());
    managed.forEach((e, i) => {
      const r = rects[i];
      if (!e.classList.contains("is-in")) {
        if (r.top < vh * 0.9 && r.bottom > 0) reveal(e);
      } else if (r.top > vh * 0.97 || r.bottom < -vh * 0.15) {
        hide(e);
      }
    });
  }

  function initReveal() {
    managed = $$("[data-m]").filter((e) => !e.closest("header"));
  }

  /* ------------------------------------------------------------------ */
  /* Scroll loop: surfaces, scrubbed cards, parallax, nav, aura           */
  /* ------------------------------------------------------------------ */
  let ticking = false;
  const aura = { el: null, idx: -1 };

  function frame() {
    ticking = false;
    const vh = innerHeight;
    const y = scrollY;

    if (header) header.classList.toggle("is-scrolled", y > 24);

    // --- read phase
    const sRects = surfaces.map((s) => s.getBoundingClientRect());
    const secRects = sections.map((s) => s.getBoundingClientRect());
    const linkTargets = navLinks.map((l) => {
      const t = $(l.getAttribute("href"));
      return t ? t.getBoundingClientRect().top : Infinity;
    });
    const pRects = parallaxEls.map((e) => (e.parentElement || e).getBoundingClientRect());

    // --- write phase
    surfaces.forEach((s, i) => {
      const r = sRects[i];
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.6) return;
      const enter = easeOut(clamp((vh * 0.98 - r.top) / (vh * 0.55)));
      const leave = clamp((vh * 0.5 - r.bottom) / (vh * 0.5));
      const inset = +Math.max(1 - enter, leave * 0.6).toFixed(3);
      if (s._inset !== inset) { s._inset = inset; s.style.setProperty("--inset", inset); }
      const lv = +leave.toFixed(3);
      if (s._leave !== lv) { s._leave = lv; s.style.setProperty("--leave", lv); }
    });

    sweepReveals();
    groups.forEach((g) => { g.update(); g.sweep && g.sweep(); });

    parallaxEls.forEach((e, i) => {
      const r = pRects[i];
      if (r.bottom < -200 || r.top > vh + 200) return;
      const speed = num(e.getAttribute("data-m-parallax"), 0.05);
      const d = r.top + r.height / 2 - vh / 2;
      const py = clamp(d * speed, -60, 60).toFixed(1);
      if (e._py !== py) { e._py = py; e.style.setProperty("--py", py + "px"); }
    });

    // active nav link: last target that has crossed ~35% of the viewport
    let active = navLinks[0];
    linkTargets.forEach((top, i) => { if (top <= vh * 0.35) active = navLinks[i]; });
    setActiveLink(active);

    // aura drifts to a new position for each section in view
    if (aura.el) {
      let idx = 0;
      secRects.forEach((r, i) => { if (r.top <= vh * 0.5) idx = i; });
      if (idx !== aura.idx) {
        aura.idx = idx;
        aura.el.style.setProperty("--gx", 18 + ((idx * 37 + 11) % 64) + "%");
        aura.el.style.setProperty("--gy", 14 + ((idx * 53 + 7) % 62) + "%");
      }
    }
  }

  function requestFrame() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  /* ------------------------------------------------------------------ */
  /* Pointer + control feel                                               */
  /* ------------------------------------------------------------------ */
  function initPointer() {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    $$("[data-m-card]").forEach((card) => {
      let raf = 0;
      let last = null;
      card.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        last = e;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = card.getBoundingClientRect();
          const x = last.clientX - r.left;
          const yy = last.clientY - r.top;
          card.style.setProperty("--mx", x + "px");
          card.style.setProperty("--my", yy + "px");
          card.style.setProperty("--nx", (x / r.width - 0.5).toFixed(3));
          card.style.setProperty("--ny", (yy / r.height - 0.5).toFixed(3));
        });
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--nx", "0");
        card.style.setProperty("--ny", "0");
      });
    });
  }

  function initButtons() {
    $$("a.rounded-full, button.rounded-full").forEach((b) => {
      b.classList.add("m-btn");
      if (b.classList.contains("w-11")) b.classList.add("m-btn-icon");
      const icon = $(".material-symbols-outlined", b);
      if (icon && icon.textContent.trim() === "arrow_forward") icon.classList.add("m-arrow");
    });

    const themeBtn = $("#theme-toggle");
    const themeIcon = $("#theme-icon");
    if (themeBtn && themeIcon && themeIcon.animate) {
      themeBtn.addEventListener("click", () =>
        themeIcon.animate(
          [{ rotate: "-90deg", scale: 0.5, opacity: 0 }, { rotate: "0deg", scale: 1, opacity: 1 }],
          { duration: 480, easing: "cubic-bezier(.22,1,.36,1)" }
        )
      );
    }

    // selected tab → the matching card pulses once
    const modeCards = $$(".mode-card");
    if (modeCards.length) {
      modeCards.forEach((c) => (c._was = c.classList.contains("is-active")));
      const mo = new MutationObserver((list) =>
        list.forEach((m) => {
          const c = m.target;
          const on = c.classList.contains("is-active");
          if (on && !c._was) {
            c.classList.remove("m-flash");
            void c.offsetWidth;
            c.classList.add("m-flash");
            c.addEventListener("animationend", () => c.classList.remove("m-flash"), { once: true });
          }
          c._was = on;
        })
      );
      modeCards.forEach((c) => mo.observe(c, { attributes: true, attributeFilter: ["class"] }));
    }
  }

  /* Same-origin page changes fade out first; anchors, new tabs and modified clicks are untouched */
  function initPageTransition() {
    if (!CFG.pageTransition) return;
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      root.classList.add("m-leaving");
      setTimeout(() => { location.href = url.href; }, 230);
    });
    addEventListener("pageshow", () => root.classList.remove("m-leaving"));
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                 */
  /* ------------------------------------------------------------------ */
  function start() {
    initNavigation();
    surfaces = $$("[data-m-surface]");

    addEventListener("scroll", requestFrame, { passive: true });
    addEventListener("resize", () => { moveIndicator(); groups.forEach((g) => g.update(true)); requestFrame(); }, { passive: true });
    requestFrame();
  }

  function boot() {
    if (reduced) {
      // Reduced motion: no entrances, parallax or scrubbing — only navigation state stays live.
      root.classList.add("m-ready");
      initNavigation();
      addEventListener("scroll", requestFrame, { passive: true });
      addEventListener("resize", () => { moveIndicator(); requestFrame(); }, { passive: true });
      requestFrame();
      return;
    }

    root.classList.add("m-js");
    applyBindings();
    parallaxEls = $$("[data-m-parallax]");

    aura.el = document.createElement("div");
    aura.el.id = "m-aura";
    aura.el.setAttribute("aria-hidden", "true");
    const scrim = $(".page-scrim");
    if (scrim) scrim.after(aura.el); else document.body.prepend(aura.el);

    initReveal();
    initPointer();
    initButtons();
    initPageTransition();
    start();

    // staged page entrance, never blocking input
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, new Promise((r) => setTimeout(r, CFG.loadTimeout))]).then(() =>
      requestAnimationFrame(() => {
        root.classList.add("m-ready");
        $$("[data-m-load]").forEach(reveal);
        moveIndicator();
        requestFrame();
      })
    );
  }

  try {
    boot();
  } catch (err) {
    // Never leave content hidden if something goes wrong
    root.classList.add("m-fail");
    console.error("[motion]", err);
  }
})();
