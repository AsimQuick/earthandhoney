<!--
---
file: PICPEAK_PORT_LEDGER.md
project: earthandhoney
purpose: AC-17.8 — records every bundled gallery style template copied out
         of the pinned upstream PicPeak source into a preserved,
         byte-identical baseline file, and where that template is used, so
         future Earth & Honey style variants can be diffed against the
         untouched original instead of against a migration file's DB-seed
         plumbing.
created-by: dev-team
related-story: US-17
related-ac: 17.8
---
-->

# PicPeak Port Ledger (AC-17.8)

## 1. What this records

Upstream ships its three bundled gallery style templates as CSS text
embedded in two database migrations
(`vendor/picpeak/backend/migrations/core/052_add_css_templates.js` and
`053_add_liquid_glass_templates.js`), seeded into the `css_templates` table
at boot. There is no standalone `.css` file to diff against upstream by eye,
and any future Earth & Honey-branded variant will most likely be authored by
editing the *DB row* (via the admin CSS Template Editor, see §3) rather than
the migration source — so the migration text alone stops being a reliable
diff target the moment a variant is saved.

This ledger is the fix: each template's CSS text, exactly as the pinned
migration exports it, is copied verbatim into its own file under
[`gallery-style-templates-baseline/`](gallery-style-templates-baseline/).
Those copies are **not modified in any way** — no added header, no
reformatting — so they stay byte-identical to what upstream shipped and a
future variant can be `diff`ed against them directly. The manifest module
[`src/lib/galleryStyleTemplateBaseline.ts`](src/lib/galleryStyleTemplateBaseline.ts)
is the single source of truth for the mapping below; the AC-17.8 test suite
(`src/__tests__/us17-ac17.8-gallery-style-template-baseline.test.ts`) reads
from the same module and fails if any baseline copy drifts from the pinned
migration's export, or if this table falls out of sync with it.

## 2. Templates copied

| Template | Slot | Upstream source (pinned commit `eb263137b98935754155824de2a03848121304b6`) | Preserved baseline copy |
|---|---|---|---|
| Elegant Dark | 1 | `vendor/picpeak/backend/migrations/core/052_add_css_templates.js` — `DEFAULT_CSS_TEMPLATE` (lines 7–125) | [`gallery-style-templates-baseline/elegant-dark.css`](gallery-style-templates-baseline/elegant-dark.css) |
| Apple Liquid Glass | 2 | `vendor/picpeak/backend/migrations/core/053_add_liquid_glass_templates.js` — `APPLE_LIQUID_GLASS` (lines 9–333) | [`gallery-style-templates-baseline/apple-liquid-glass.css`](gallery-style-templates-baseline/apple-liquid-glass.css) |
| Liquid Glass Dark | 3 | `vendor/picpeak/backend/migrations/core/053_add_liquid_glass_templates.js` — `LIQUID_GLASS_DARK` (lines 335–680) | [`gallery-style-templates-baseline/liquid-glass-dark.css`](gallery-style-templates-baseline/liquid-glass-dark.css) |

Both source migrations are confirmed unmodified since vendoring: their git
blob SHA-1s (`5006a4bdd2092fa6ed6f6968f22647a4ff0a637c` for `052`,
`af19bdd0d1f0cd81afd02ac77fd5495fa747d4be` for `053`) match the fingerprints
recorded in `PICPEAK_MIGRATION_MANIFEST`
(`src/lib/picpeakMigrationManifest.ts`, AC-15.6) — so the templates render
exactly as upstream authored them, with no fork patch in between.

## 3. Where each template is used

The three templates share one render path end-to-end; nothing about it is
per-template.

- **Storage:** `css_templates` table (created in migration `052`; slots 2
  and 3 re-seeded with their final content in `053`). Each `events` row
  optionally points at one enabled template via `events.css_template_id`.
- **Public read:** `GET /:slug/css-template`
  (`vendor/picpeak/backend/src/routes/gallery.js:1854-1883`) — looks up the
  event's `css_template_id`, returns the matching `css_templates.css_content`
  as raw CSS if the template is enabled, `204` otherwise.
- **Client fetch + injection:** `cssTemplatesService.getGalleryCss()`
  (`vendor/picpeak/frontend/src/services/cssTemplates.service.ts:75-92`) is
  called by the `useGalleryCustomCss` hook
  (`vendor/picpeak/frontend/src/hooks/useGalleryCustomCss.ts`), which injects
  the returned CSS text into a `<style id="gallery-custom-css">` element in
  `document.head`. The hook is invoked from the client gallery page component,
  `GalleryView.tsx:90`
  (`vendor/picpeak/frontend/src/components/gallery/GalleryView.tsx`).
- **Admin selection/editing:** the three seeded slots are listed and edited
  through `CssTemplateEditor.tsx`
  (`vendor/picpeak/frontend/src/components/admin/CssTemplateEditor.tsx`)
  against the admin API in
  `vendor/picpeak/backend/src/routes/adminCssTemplates.js`; a gallery is
  assigned one of the enabled templates at creation/edit time in
  `CreateEventPage.tsx` / `EventDetailsPage.tsx`.

## 4. Verification

`src/__tests__/us17-ac17.8-gallery-style-template-baseline.test.ts` asserts,
for all three entries in `GALLERY_STYLE_TEMPLATE_BASELINE`:

1. the preserved baseline file's bytes equal the pinned migration's exported
   CSS constant, byte for byte (proves the copy is unmodified and the
   template renders exactly as upstream shipped it);
2. the two source migration files are unmodified against
   `PICPEAK_MIGRATION_MANIFEST` (proves the upstream source itself hasn't
   drifted since vendoring); and
3. this ledger names every template, its baseline file, and its source
   migration (proves the ledger and the manifest module cannot silently
   fall out of sync).
