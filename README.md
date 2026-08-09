# www.uncommunlogic.com

The Uncommun Logic site. Static HTML, CSS and JavaScript. No build step, no
dependencies, no framework. Open any `.html` file and it works.

Built on **Brand guidelines v1.0, 9 August 2026**: three colours, one type
family, one easing curve. If a change would break one of those rules, the
guidelines win.

## Run it locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Use a server rather than opening the file
directly: every path in the site is root-relative (`/assets/...`), and the
catalogue fetches a JSON file, which `file://` blocks.

## Deploy

Push to `main`. GitHub Pages serves it. `CNAME` binds the domain, so do not
delete or edit that file.

## What is where

```
index.html               Landing page
solutions/               The 78-system catalogue, rendered from JSON
how-we-work/             The method, the costing, the pricing rule, FAQ
technology/              The stack, grouped, with the trade mark notice
who-we-are/              The two founders
book/                    Booking, plus the direct-contact fallback
contact/                 Contact details and the brief builder
notes/                   Published pieces
  _template.html         Copy this to write a new one
legal/                   Terms, privacy, cookies, disclaimer, accessibility
404.html
assets/
  css/site.css           The whole design system, one file, numbered sections
  js/
    boot.js              Runs in <head> before paint. Capability class only
    config.js            EDIT THIS: contact details and the booking URL
    motion.js            Reveals, counters, header, drawer, hero canvas, scrubs
    solutions.js         The catalogue page
    brief.js             The brief builder
    booking.js           The Google Calendar embed
  data/solutions.json    The catalogue. One source of truth for all 78 items
  brand/                 Logos, marks, pictograms, motifs, rules
  fonts/                 Archivo and JetBrains Mono, WOFF2, self-hosted
  founders/              Drop the two portraits here. See its README
  favicon/  social/  motion/
SETUP.md                 What still needs filling in. Read this first
SECURITY.md              Security review, gaps and required actions
```

## The two rules that matter when editing

**1. Never write "Uncommon".** The name is **Uncommun**. The substituted U is
the brand. Correcting the spelling destroys it.

**2. Oxblood is never text on a dark background.** It measures 1.82:1 on ink,
which fails every contrast threshold. On a dark surface, text is paper and
oxblood is only ever a solid shape. Any dark section must carry the `on-ink`
class so the colour tokens flip with it.

## Editing content

Plain HTML. Find the text, change the text. Two things to know:

- **Contact details and the booking URL live only in `assets/js/config.js`.**
  Elements marked `data-ul="email"` or `data-ul="phone"` are filled in at
  runtime from that file. Change it once and every page updates. Add
  `data-ul-keep` to keep a link's visible label and only set its `href`.
- **The catalogue lives only in `assets/data/solutions.json`.** Adding an item
  there adds it to the page, the filters and the counters. Do not hand-edit the
  tiles.

## Adding a note

1. `cp notes/_template.html notes/your-slug/index.html`
2. Follow the checklist in the comment at the top of that file.
3. Add a row to `notes/index.html`, newest first.
4. Add the URL to `sitemap.xml`.

## Tone, from the guidelines

Assert, do not cushion. Name what you will not do. Numbers over adjectives.
Short sentences.

Banned words: revolutionary, game-changing, unlock, leverage, synergy,
cutting-edge, seamless, empower, transform your business, AI-powered.

## Accessibility and motion

Every scroll effect stops under `prefers-reduced-motion`, and the opening
animation never runs. Every page is real HTML that works with JavaScript
disabled; you lose the animation and the catalogue filter and keep all the
content. Contrast was measured, not estimated. The known gaps are listed
honestly in `legal/accessibility/`.

Do not remove the `:where(html.js)` prefixes in the reveal rules in
`site.css`. They are what keeps content visible when scripting is unavailable,
and `:where()` is used so the `.in` rules still win.
