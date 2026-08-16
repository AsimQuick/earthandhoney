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

## 7. US-33 AC-33.5.2.2.2 — the inquiry-notification route and its server.js mount, file paths touched

This section records the file paths touched by the `deviation` entry dated
`2026-08-14` in `FORK_CHANGELOG.md` (US-33, AC-33.5.2.2.2: the fork gains
`POST /api/v1/notifications/inquiry`, queuing a studio notification email
through the existing `queueEmail()` with `event_id: null` and the fixed
`template_key: 'inquiry_received'` migration `120` (§6) already inserts).
See that changelog entry for the full description of what changed and why;
this is the flat list of paths for cross-reference against
`UPSTREAM_SYNC.md` §2 during a future sync.

| File | Change |
|---|---|
| `vendor/picpeak/backend/src/routes/v1/notifications.js` | new — `POST /notifications/inquiry` behind `apiTokenAuth` + `requireApiScope('write')`, delegates to `queueEmail(null, recipient_email, 'inquiry_received', emailData)` |
| `vendor/picpeak/backend/server.js` | one new `app.use('/api/v1', require('./src/routes/v1/notifications'))` line beside the existing `v1/events` mount; the existing mount is unchanged |
| `vendor/picpeak/backend/src/routes/v1/__tests__/notifications.inquiry.test.js` | new — fork-side Jest suite (9 tests) covering the route's request/response behaviour, run offline with no Docker |
| `PAYLOAD_PICPEAK_API_CONTRACT.md` | new call-catalog row `3a`, immediately after row 3 |
| `src/__tests__/us33-ac33.5.2.2.2-inquiry-notification-route.test.ts` | new — pins the route, the mount, and these records against the pinned fork source |

None of the above is a file under `vendor/picpeak/backend/migrations/` —
every change is additive (a new route file, a one-line mount, new tests, a
new documentation row) — and `src/lib/picpeakMigrationManifest.ts`'s SHA-1
integrity test stays green against this change.

- **Recorded:** 2026-08-14
- **Recorded by:** dev-team (US-33, AC-33.5.2.2.2)

## 8. US-33 AC-33.6 — the inquiry-acknowledgement template and route, file paths touched

This section records the file paths touched by the `deviation` entry dated
`2026-08-14` in `FORK_CHANGELOG.md` (US-33, AC-33.6: the optional branded
acknowledgement to a form submitter, off by default and sent through the
same single Backstage email queue as the AC-33.5 studio notification —
migration `121` and a sibling route on the existing
`vendor/picpeak/backend/src/routes/v1/notifications.js` router). See that
changelog entry for the full description of what changed and why; this is
the flat list of paths for cross-reference against `UPSTREAM_SYNC.md` §2
during a future sync.

| File | Change |
|---|---|
| `vendor/picpeak/backend/migrations/core/121_add_inquiry_acknowledgement_email_template.js` | new — inserts the `inquiry_acknowledgement` `email_templates` row, guarded on `template_key` already existing |
| `src/lib/picpeakMigrationManifest.ts` | migration `121` recorded as a second `origin: 'fork'` entry |
| `vendor/picpeak/backend/src/routes/v1/notifications.js` | new `POST /notifications/inquiry-acknowledgement` handler added beside the existing inquiry-notification handler; no new router, no new `server.js` mount |
| `vendor/picpeak/backend/src/routes/v1/__tests__/notifications.inquiryAcknowledgement.test.js` | new — fork-side Jest suite (7 tests) covering the route's request/response behaviour, run offline with no Docker |
| `PAYLOAD_PICPEAK_API_CONTRACT.md` | new call-catalog row `3b`, immediately after row `3a` |
| `src/__tests__/us33-ac33.6-inquiry-acknowledgement-route.test.ts` | new — pins the route and these records against the pinned fork source |

None of the above adds a new `server.js` mount or a new migrations
directory entry point — the migration is additive-only (a single guarded
`INSERT`) and the route reuses the router `server.js` already mounts for
AC-33.5.2.2.2 — and `src/lib/picpeakMigrationManifest.ts`'s SHA-1 integrity
test stays green against this change.

- **Recorded:** 2026-08-14
- **Recorded by:** dev-team (US-33, AC-33.6)

## 9. US-38 ACs 38.1–38.4 — Project/Event/Milestone/Document schema extension migrations (122–125), file paths touched

This section records the file paths touched by the four `deviation` entries
dated `2026-08-16` in `FORK_CHANGELOG.md` (US-38, ACs 38.1–38.4: the fork's
first *schema-altering* extension migrations — `ALTER TABLE projects`/
`events` and `CREATE TABLE project_milestones`/`project_documents`/
`project_integration_status`, closing the deferral `UPSTREAM_SYNC.md` §3
tracked since AC-16.6). See those four changelog entries for the full
description of what each migration changed and why; this is the flat list
of paths for cross-reference against `UPSTREAM_SYNC.md` §2 during a future
sync, and is the evidence AC-38.6 requires — that every new migration this
story added is named here, not only in `FORK_CHANGELOG.md`.

| File | Change |
|---|---|
| `vendor/picpeak/backend/migrations/core/122_add_project_new_project_fields.js` | new — adds eleven columns to `projects` (PRD 22.2's New Project fields), each guarded individually by `hasColumn` so a partial or repeated prior run is a safe no-op. US-38 AC-38.1. |
| `vendor/picpeak/backend/migrations/core/123_add_event_detail_fields.js` | new — adds ten columns to `events` (PRD 22.4's event-detail fields, including the distinct `client_visible_notes`/`internal_notes` pair), each guarded individually by `hasColumn`. US-38 AC-38.2. |
| `vendor/picpeak/backend/migrations/core/124_add_project_milestones.js` | new — creates `project_milestones` and seeds PRD 23.2's eighteen milestone template rows (`project_id IS NULL`), guarded so a partial or repeated prior run is a safe no-op. US-38 AC-38.3. |
| `vendor/picpeak/backend/migrations/core/125_add_project_documents_and_integration_status.js` | new — creates `project_documents` (the per-Project document area) and `project_integration_status` (success/pending/failure, with `message`/`occurred_at` on failure). US-38 AC-38.4. |
| `src/lib/picpeakMigrationManifest.ts` | migrations `122`, `123`, `124` and `125` recorded as the manifest's third through sixth `origin: 'fork'` entries, each with its blob SHA. US-38 ACs 38.1–38.4. |
| `src/lib/projectMilestones.ts` | new — `getMilestoneDefinitions` reader that returns the seeded `project_milestones` template rows from a query rather than a literal list. US-38 AC-38.3. |
| `src/__tests__/us38-ac38.1-project-new-fields-migration.test.ts` | new — names each of the eleven added `projects` columns individually against a fake knex schema builder; live-verified with `\d projects` before/after in Docker. |
| `src/__tests__/us38-ac38.2-event-detail-fields-migration.test.ts` | new — maps each of PRD 22.4's ten named items to the column that carries it, and asserts the client-visible/internal note columns are distinct. |
| `src/__tests__/us38-ac38.3-project-milestones-migration.test.ts` | new — asserts the eighteen seeded milestone rows by name and count, and that the reader is not backed by a hardcoded literal. |
| `src/__tests__/us38-ac38.4-project-documents-integration-status-migration.test.ts` | new — writes and reads back a `project_documents` row and a `project_integration_status` row for each of the success/pending/failure states. |

None of the above is a file that already shipped under
`vendor/picpeak/backend/migrations/core/` before this story — each of the
four migrations is a brand-new file (`122`-`125`); no migration numbered
001-121 is touched — and `src/lib/picpeakMigrationManifest.ts`'s SHA-1
integrity test (`verifyVendoredMigrations`) stays green against this change,
proven live in `src/__tests__/us38-ac38.6-fork-discipline-integrity.test.ts`.

- **Recorded:** 2026-08-16
- **Recorded by:** dev-team (US-38, AC-38.1–AC-38.4; cross-referenced under AC-38.6)

## 10. US-39 AC-39.2 — booking-requirement configuration migration (126), file paths touched

This section records the file paths touched by the `deviation` entry dated
`2026-08-16` in `FORK_CHANGELOG.md` (US-39 AC-39.2: PRD 23.2's booking rule
evaluated from configured, data-backed milestone requirements rather than a
hardcoded three-item check). See that changelog entry for the full
description of what changed and why; this is the flat list of paths for
cross-reference against `UPSTREAM_SYNC.md` §2 during a future sync.

| File | Change |
|---|---|
| `vendor/picpeak/backend/migrations/core/126_add_project_booking_requirements.js` | new — creates `project_booking_requirements` and seeds PRD 23.2's normal-case three requirements as template rows (`project_id IS NULL`), guarded so a partial or repeated prior run is a safe no-op. US-39 AC-39.2. |
| `src/lib/picpeakMigrationManifest.ts` | migration `126` recorded as the manifest's seventh `origin: 'fork'` entry, with its blob SHA. US-39 AC-39.2. |
| `src/lib/bookingRule.ts` | new — `evaluateBookingRule` (pure predicate over configured-vs-completed milestone key sets), `getBookingRequirements` (a Project's own override rows, falling back to the default template), and `isProjectBooked` (composes both against real milestone completion state). US-39 AC-39.2. |
| `src/__tests__/us39-ac39.2-booking-rule.test.ts` | new — drives migration 126 against a fake knex, proves the booking rule books a Project only once every configured requirement is complete (each default requirement completed independently, plus a non-default requirement set), and proves `bookingRule.ts` carries no hardcoded requirement key. |

None of the above is a file that already shipped under
`vendor/picpeak/backend/migrations/core/` before this story — migration
`126` is a brand-new file; no migration numbered 001-125 is touched — and
`src/lib/picpeakMigrationManifest.ts`'s SHA-1 integrity test
(`verifyVendoredMigrations`) stays green against this change.

- **Recorded:** 2026-08-16
- **Recorded by:** dev-team (US-39, AC-39.2)

## 11. US-39 AC-39.3.2 — the single next-action computation, wired into both surfaces, file paths touched

This section records the file paths touched by the `deviation` entry dated
`2026-08-16` in `FORK_CHANGELOG.md` (US-39 AC-39.3.2: the Project's next
action computed once, server-side, by one module both the cockpit and the
Project Room require). See that changelog entry for the full description of
what changed and why; this is the flat list of paths for cross-reference
against `UPSTREAM_SYNC.md` §2 during a future sync, and against
`NEXT_ACTION_CROSS_SURFACE_MAP.md` (AC-39.3.1) for the mount paths and
middleware each route was wired against.

| File | Change |
|---|---|
| `vendor/picpeak/backend/src/services/nextActionRules.js` | new — the pure rule set (`resolveNextAction`); requires nothing, unit-testable without Docker. US-39 AC-39.3.2. |
| `vendor/picpeak/backend/src/services/nextActionService.js` | new — `computeProjectNextAction(projectId)`, the single DB-backed entry point (`projects.current_phase`, `project_milestones`, `project_booking_requirements`) both route handlers require. US-39 AC-39.3.2. |
| `vendor/picpeak/backend/src/routes/adminProjects.js` | additive — requires `nextActionService`; adds `GET /:id/next-action` (`events.view`). US-39 AC-39.3.2. |
| `vendor/picpeak/backend/src/routes/customer.js` | additive — requires `nextActionService`; adds `GET /projects/:id/next-action`, `customerAuth`-gated per-route, scoped to the caller's own `customer_account_id`. US-39 AC-39.3.2. |
| `src/__tests__/us39-ac39.3.2-next-action-single-computation.test.ts` | new — table-driven across all seven phases and representative milestone states against the real `nextActionRules.js`, plus source-level assertions that both routes require the one service and neither reads the phase/milestone/booking-requirement tables itself or duplicates its wording. |

No migration is added by this AC — `project_milestones` (124) and
`project_booking_requirements` (126) already exist — so
`src/lib/picpeakMigrationManifest.ts` is untouched and its SHA-1 integrity
test is unaffected. `adminProjects.js` and `customer.js` are pre-existing
vendored route files each already amended by earlier stories; this AC's
changes to them are purely additive (one new route each), per Fork
Discipline.

- **Recorded:** 2026-08-16
- **Recorded by:** dev-team (US-39, AC-39.3.2)

## 12. US-39 AC-39.5 — the manual next-action override, file paths touched

This section records the file paths touched by the `deviation` entry dated
`2026-08-16` in `FORK_CHANGELOG.md` (US-39 AC-39.5: a photographer can
override the computed next action; the override is presented alongside the
computation, never silently replacing it). See that changelog entry for the
full description of what changed and why.

| File | Change |
|---|---|
| `vendor/picpeak/backend/migrations/core/127_add_project_next_action_overrides.js` | new — creates `project_next_action_overrides` (one row per Project, unique on `project_id`); `override_text`, `actor_admin_id` (FK `admin_users`, `SET NULL`), `actor_name` snapshot, `created_at`/`updated_at`. US-39 AC-39.5. |
| `src/lib/picpeakMigrationManifest.ts` | migration `127` recorded as the manifest's eighth `origin: 'fork'` entry, with its blob SHA. US-39 AC-39.5. |
| `vendor/picpeak/backend/src/services/nextActionOverride.js` | new — `presentNextAction({ computedNextAction, override })`, the pure computed/override merge; requires nothing, unit-testable without Docker. US-39 AC-39.5. |
| `vendor/picpeak/backend/src/services/nextActionOverrideService.js` | new — `getProjectNextActionOverride`/`setProjectNextActionOverride`, the database-backed read/upsert against migration 127's table. US-39 AC-39.5. |
| `vendor/picpeak/backend/src/routes/adminProjects.js` | additive — `GET /:id/next-action`'s handler extended to merge in the override (`computedNextAction`/`nextAction`/`override` fields); new `PUT /:id/next-action/override` (`events.manage`) added after it. US-39 AC-39.5. |
| `src/__tests__/us39-ac39.5-next-action-override.test.ts` | new — drives migration 127 against a fake knex (schema, idempotency, upsert-not-accumulate write/read-back), table-drives the pure `presentNextAction` merge, and asserts from source that both routes wire in the one override service/presenter pair. |

No migration numbered 001-126 is touched — migration `127` is a brand-new
file — and `src/lib/picpeakMigrationManifest.ts`'s SHA-1 integrity test
(`verifyVendoredMigrations`) stays green against this change.

- **Recorded:** 2026-08-16
- **Recorded by:** dev-team (US-39, AC-39.5)
