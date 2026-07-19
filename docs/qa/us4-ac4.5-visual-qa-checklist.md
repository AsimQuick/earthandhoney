<!--
---
file: docs/qa/us4-ac4.5-visual-qa-checklist.md
project: earthandhoney
purpose: Manual visual QA checklist for US-4 AC-4.5 — the artefact the AC
         requires ("verified via manual visual QA checklist against the
         template"). A human compares the Gallery Engine, rendered on the
         internal demo route, side-by-side against the public/photobuddy
         template and ticks each item. Every item cites the exact template
         file + CSS rule (or the engine source) it verifies, so the check is
         objective rather than a matter of taste.
created-by: dev-team
related-story: US-4
related-ac: 4.5
---
-->

# US-4 · AC-4.5 — Visual QA checklist (Gallery Engine ↔ `public/photobuddy`)

**Acceptance criterion.** _"The engine's layout, spacing, typography, and
gradient-overlay treatment visually match the `public/photobuddy` template when
compared side-by-side (verified via manual visual QA checklist against the
template), and template images are used as placeholder content in the rendered
contexts."_

This checklist is the manual gate the AC calls for. The automated companion
suite (`src/__tests__/us4-ac4.5-visual-parity.test.tsx`) locks the concrete,
machine-checkable design tokens (font, type scale, gradient stops, container
width, nav treatment, template-image usage) so they cannot silently drift away
from the template; this document covers what only a human eye can confirm — that
the composed result actually _reads_ like the template.

## How to run this QA pass

1. Start the stack in Docker (`docker compose up -d`) — no service is installed
   on the host.
2. Open the internal demo/test-harness route (not linked from public nav):
   **`/dev/gallery-demo`**. It instantiates the engine twice — a **Hero-mode**
   instance and a **Portfolio-mode** instance — using `public/photobuddy` images
   as placeholder content.
3. In a second window, open the template pages directly from disk:
   `public/photobuddy/index.html` (homepage hero flexslider) and
   `public/photobuddy/gallery.html` (gallery grid).
4. Place the two windows side-by-side at the same viewport width and tick each
   item below. Re-run at a mobile width (~375px) for the responsive rows.

Reference tokens (all sourced from the template, not invented):

| Token | Value | Source |
| --- | --- | --- |
| Body font | `'Rubik', Arial, Helvetica, sans-serif` | `css/style.css` `body` + `index.html` Google Fonts `<link>` |
| Body type scale | `14px` / `line-height 1.5` / `letter-spacing 0.5px` / weight `400` | `css/style.css` `body` |
| Content container | `max-width: 1130px`, `padding: 0 40px`, centered | `css/skeleton.css` `.container` |
| Gradient overlay | `linear-gradient(transparent 0%, transparent 70%, rgba(0,0,0,0.1) 76%, rgba(0,0,0,0.4) 93%, rgba(0,0,0,0.49) 100%)` | `css/style.css` `.photobuddy_fl_slider ... background-image` |
| Nav / prev-next text | `12px`, `uppercase`, `letter-spacing 2px`, transparent bottom-border → border on hover | `css/style.css` `.photobuddy_fl_gallery_single_in .img_list span.prev_next[ a]` |
| Accent-underline + transitions | `all .5s ease` | `css/style.css` `.title_holder h2 span:after` (motif used throughout) |
| Overlay text colour | `#fffefe` (near-white) | `css/style.css` `.photobuddy_fl_slider .title_holder a` |

---

## 1. Typography

- [ ] Gallery text renders in **Rubik** (not a system serif/sans fallback), matching the template's body copy.
- [ ] Base text is **14px** with **1.5** line-height and **0.5px** letter-spacing — the same rhythm as the template body.
- [ ] Weight is regular (**400**); nothing in the engine looks heavier/lighter than the template's body copy.
- [ ] Uppercase labels (section headings, prev/next) use the template's wide tracking, not default spacing.

## 2. Layout

- [ ] The **Portfolio-mode** instance sits inside a centered container that visually matches the template's `.container` gutter — content does not run edge-to-edge.
- [ ] The **Hero-mode** instance spans full-bleed width like the template's homepage flexslider.
- [ ] Main image area holds a stable landscape aspect box (no layout shift as images load / as you navigate).
- [ ] Thumbnail strip sits below the main image in a single horizontal row, matching the template's supporting-image rows.
- [ ] Prev/Next controls are overlaid on the main image (bottom corners), not stacked below it.

## 3. Spacing

- [ ] Container side padding matches the template's **40px** gutter at desktop width.
- [ ] Vertical rhythm between the main image, thumbnails, and section headings is even and uncramped — comparable to the template's whitespace.
- [ ] Thumbnails have consistent gaps; no thumbnail is flush against its neighbour.
- [ ] At mobile width the container padding relaxes but content never touches the screen edge.

## 4. Gradient-overlay treatment

- [ ] Every main image carries a **subtle** black gradient that is invisible across the top ~70% and deepens only toward the bottom — matching the template slider overlay.
- [ ] The darkest point is a **translucent** black (~0.49), never a solid/opaque black band.
- [ ] The gradient is applied **consistently** on both the Hero-mode and Portfolio-mode instances (same treatment, one shared overlay).
- [ ] White overlay text/controls remain legible against the gradient, as the template's title text does.

## 5. Template images as placeholder content

- [ ] The Hero-mode instance shows the template's own hero slides (`public/photobuddy/img/slide/*.jpg`).
- [ ] The Portfolio-mode instance shows the template's own gallery photos (`public/photobuddy/img/gallery/*.jpg`).
- [ ] No third-party/stock/placeholder-service images appear anywhere on the demo route — all placeholder content comes from `public/photobuddy`.

## 6. Responsive parity (mobile ~375px)

- [ ] Layout, spacing, and gradient treatment still read like the template when narrowed; nothing overflows horizontally.
- [ ] The main image keeps a sensible portrait/landscape crop and the thumbnail strip scrolls horizontally rather than wrapping awkwardly.

---

## Sign-off

| Field | Value |
| --- | --- |
| Reviewer | |
| Date | |
| Demo route | `/dev/gallery-demo` |
| Template refs | `public/photobuddy/index.html`, `public/photobuddy/gallery.html` |
| Result | ☐ Pass ☐ Pass with notes ☐ Fail |
| Notes | |
