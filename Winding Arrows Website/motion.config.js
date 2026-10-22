/* ==========================================================================
   MOTION BINDINGS — the only file that connects motion to this page's content.
   --------------------------------------------------------------------------
   motion.css and motion.js are game-agnostic. To reuse them on another site,
   keep those two files and rewrite this list: choose selectors for your own
   sections and pick a variant for each. A CMS could later generate this file.

   Variants   m: rise | left | right | scale | panel | slide | device | chip | fade
   Cards      group: { cards, from: left|right|up|alt, fromSmall, drive: scroll|time,
                       mq, stagger, order: 'reverse' }
   Windows    window: 'draw' (driven by its card) | 'sequence' (plays on its own)
   ========================================================================== */
window.MOTION_CONFIG = {
  pageTransition: true,
  loadTimeout: 700
};

window.MOTION_BINDINGS = [
  /* ---------- Page chrome ---------- */
  { sel: "header.fixed", set: { m: "header", load: true, base: 80 } },
  { sel: 'header nav[aria-label="Primary"] a', each: true, set: { m: "fade", load: true, base: 420, stagger: 70 } },
  { sel: "header > div > div:last-child", set: { m: "fade", load: true, base: 700 } },
  /* ---------- Opening composition ---------- */
  { sel: "#home > div:first-child", set: { m: "fade", load: true, base: 150 } },
  { sel: "#home > div:first-child", kids: ":scope > *:not(h1)", set: { m: "rise", load: true, base: 430, stagger: 95 } },
  { sel: "#home h1", heading: true, set: { load: true, base: 300 } },
  { sel: "#home figure", set: { m: "device", load: true, base: 520, parallax: -0.05 } },

  /* ---------- Section surfaces (wipe open on enter, ease away on leave) ---------- */
  { sel: "#mechanics, #power-ups, #modes, #faq", set: { surface: true } },

  /* ---------- Headings: word masks + eyebrow/lead for every section title ---------- */
  /* ---------- Section: how it works (right-to-left on wide screens) ---------- */
  {
    sel: "#mechanics .grid.mt-10",
    group: { cards: "article", from: "right", fromSmall: "up", drive: "scroll", mq: "(min-width: 768px)", stagger: 140, order: "reverse" }
  },
  { sel: "#mechanics article > div.my-4", window: "draw" },
  { sel: "#mechanics article > div:first-child > span:last-child", set: { icon: true } },

  /* ---------- Section: feature cards (alternating sides) ---------- */
  {
    sel: "#features > div.grid",
    group: { cards: "article", from: "alt", fromSmall: "up", drive: "time", mq: "(min-width: 768px)", stagger: 130 }
  },
  { sel: "#features .flex-wrap > span", each: true, set: { m: "chip", base: 500, stagger: 45 } },

  /* ---------- Section: tool cards ---------- */
  { sel: "#power-ups > div > h3, #power-ups > div > h3 + p", set: { m: "rise" } },
  {
    sel: "#power-ups div.grid",
    group: { cards: "article", from: "up", fromSmall: "up", drive: "time", mq: "(min-width: 768px)", stagger: 90 }
  },
  { sel: "#power-ups article > div:first-child > span:first-child", set: { icon: true } },

  /* ---------- Section: mode cards ---------- */
  { sel: "#mode-tabs", set: { m: "left", base: 200 } },
  {
    sel: "#modes-grid",
    group: { cards: "article", from: "up", fromSmall: "up", drive: "time", mq: "(min-width: 768px)", stagger: 80 }
  },
  { sel: "#modes article > div:first-child > div:first-child > span.material-symbols-outlined", set: { icon: true } },

  /* ---------- Section: summary panel ---------- */
  { sel: "#about > div", set: { m: "panel" } },
  { sel: "#about .grid.gap-8 > div:first-child", kids: ":scope > *", set: { m: "rise", base: 250, stagger: 80 } },
  {
    sel: "#about .mt-6.grid",
    group: { cards: ":scope > div", from: "up", fromSmall: "up", drive: "time", mq: "(min-width: 768px)", stagger: 110 }
  },

  /* ---------- Questions ---------- */
  { sel: "#faq details", each: true, set: { m: "rise", stagger: 70 } },

  /* ---------- Closing panel ---------- */
  { sel: "#start > div", set: { m: "scale", aura: true } },
  { sel: "#start > div", kids: ":scope > *:not(h2)", set: { m: "rise", base: 250, stagger: 95 } },

  /* ---------- Footer ---------- */
  { sel: "footer .grid > div", each: true, set: { m: "rise", stagger: 90 } },
  { sel: "footer > div > div:last-child", set: { m: "fade", base: 300 } },

  /* ---------- Generic: every remaining section title (keep last) ---------- */
  { sel: "main section h2", heading: true }
];
