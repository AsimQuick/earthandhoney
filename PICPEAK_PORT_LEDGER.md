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

## 5. US-27 AC-27.5 — publicSite flag-gating deviation, file paths touched

This section records the file paths touched by the `deviation` entry dated
`2026-08-07` in `FORK_CHANGELOG.md` (US-27, AC-27.1–27.4: gating every
duplicate Backstage publishing surface behind a feature flag), as required by
AC-27.5. See that changelog entry for the full description of what changed
and why; this is the flat list of paths for cross-reference against
`UPSTREAM_SYNC.md` §2 during a future sync.

| File | Change |
|---|---|
| `vendor/picpeak/backend/src/routes/adminFeatureFlags.js` | `publicSite` flag added to `KNOWN_FLAGS`/`DEFAULT_FLAGS`, default `false` |
| `vendor/picpeak/backend/src/services/publicSiteService.js` | `handlePublicSiteRequest` checks `publicSite` before reading `app_settings`; homepage HTML-rendering helpers relocated in from `server.js` |
| `vendor/picpeak/backend/server.js` | relocated HTML-rendering helpers removed; route delegates to `handlePublicSiteRequest` |
| `vendor/picpeak/backend/src/routes/publicQuotes.js` | new — `quotes` flag check added ahead of the public quote routes |
| `vendor/picpeak/frontend/src/pages/admin/CMSPage.tsx` | Public Site panel wrapped in `RequireFeature('publicSite')` |
| `vendor/picpeak/frontend/src/contexts/FeatureFlagsContext.tsx` | `publicSite` added to the tracked flag set |
| `vendor/picpeak/frontend/src/services/featureFlags.service.ts` | `publicSite` added to the flag-service type/defaults |
| `vendor/picpeak/backend/src/__tests__/adminFeatureFlags.publicSite.test.js` | new pinning suite |
| `vendor/picpeak/backend/src/__tests__/publicSiteService.test.js` | extended for the pre-`app_settings` flag check |
| `vendor/picpeak/backend/__tests__/routes/cmsStaysEnabled.test.js` | new — pins CMS Pages as deliberately not flag-gated |
| `vendor/picpeak/backend/__tests__/routes/nativeBillingFlags.test.js` | new — proves `quotes`/`bills` defaults and 403-with-flag-off |
| `vendor/picpeak/backend/__tests__/routes/publicQuotes.test.js` | new — covers the added `quotes` flag check |
| `src/__tests__/us27-ac27.2-cms-public-site-panel-flag-gated.test.ts` | new |
| `src/__tests__/us18-ac18.5-backstage-surfaces-disabled.test.ts` | updated now the AC-18.5 gap is closed |

None of the above is a file under `vendor/picpeak/backend/migrations/` — every
change is additive (a new flag key, a new check, a gated panel), and
`src/lib/picpeakMigrationManifest.ts`'s SHA-1 integrity test stays green
against this change (verified in
`src/__tests__/us27-ac27.5-additive-deviation-recorded.test.ts`).

- **Recorded:** 2026-08-07
- **Recorded by:** dev-team (US-27, AC-27.5)

## 6. US-33 AC-33.5.2.1 — first fork migration and the manifest's fork-addition lane, file paths touched

This section records the file paths touched by the `deviation` entry dated
`2026-08-14` in `FORK_CHANGELOG.md` (US-33, AC-33.5.2.1: the fork's first
extension migration, and the `origin: 'fork'` lane `PICPEAK_MIGRATION_MANIFEST`
gained to fingerprint it as a fork addition rather than pinned-upstream
drift). See that changelog entry for the full description of what changed
and why; this is the flat list of paths for cross-reference against
`UPSTREAM_SYNC.md` §2 during a future sync — this is also, by virtue of
being the first entry under `vendor/picpeak/backend/migrations/`, the first
row of this ledger's file list that sits inside that directory.

| File | Change |
|---|---|
| `vendor/picpeak/backend/migrations/core/120_add_inquiry_notification_email_template.js` | new — inserts the `inquiry_received` `email_templates` row, guarded on `template_key` already existing |
| `src/lib/picpeakMigrationManifest.ts` | `MigrationManifestEntry` gained the optional `origin?: 'fork'` field; migration `120` recorded as the manifest's first `origin: 'fork'` entry |
| `src/lib/picpeakMigrationIntegrity.ts` | `verifyMigrationsUnmodified` gained the `isForkAdditionDocumented` check for `origin: 'fork'` entries; `verifyVendoredMigrations` wires it to a real `FORK_CHANGELOG.md` read |
| `vendor/README.md` | new "The fork-addition lane" section |
| `UPSTREAM_SYNC.md` | §3 updated — the "no fork migration exists yet" claim no longer holds |
| `src/__tests__/us33-ac33.5.2.1-fork-migration-lane.test.ts` | new — fixture-level proof of the lane in both directions, plus the negative case (a tampered upstream entry still fails as `'modified'`) |

- **Recorded:** 2026-08-14
- **Recorded by:** dev-team (US-33, AC-33.5.2.1)
