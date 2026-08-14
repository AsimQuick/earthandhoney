<!--
---
file: FORK_CHANGELOG.md
project: earthandhoney
purpose: AC-15.5 — initialised with the pinned baseline; the place every
         deliberate deviation from upstream PicPeak gets recorded, so drift
         from the pinned commit is always traceable to a dated, named
         reason rather than discovered by diffing later.
created-by: dev-team
related-story: US-15
related-ac: 15.5
---
-->

# Fork Changelog

This file is the place every deliberate deviation from upstream gets
recorded, initialised with the pinned baseline from `PICPEAK_UPSTREAM.md`.
It is **not** a record of upstream's own history — that lives in
`PICPEAK_UPSTREAM.md` (the pin) and upstream's own commit log. It is the
record of what *this fork* changed relative to that pin, and why.

Every entry has a date, a type (`baseline` or `deviation`), a summary, and —
for `deviation` entries — the files it touched. This shape is enforced by
`validateChangelogEntry` in `src/lib/forkChangelog.ts`: a `deviation` entry
that names no files is rejected, because an untraceable deviation is
indistinguishable from silent drift from upstream, which is exactly what
this changelog exists to prevent.

New entries are added to the top of the log (most recent first).

A `deviation` entry that exists only to work around an upstream *bug* also
gets an entry in `PICPEAK_UPSTREAM_DEFECTS.md` and is flagged
drop-rather-than-merge in `UPSTREAM_SYNC.md` §4, so it is never mistaken at
sync time for a permanent, project-specific deviation.

---

## 2026-08-14 — `deviation`

**Backstage gains an HTTP way for a service to queue an email:
`POST /api/v1/notifications/inquiry`.** AC-33.5.2.1's go/no-go recorded
that no existing route let Frontstage queue an email — `v1/events.js`'s
own family creates/lists/reads gallery events, uploads photos, and mints
share links, but calls no email path at all. This entry closes that gap
with the minimum addition the go/no-go named: a second router mounted
beside `v1/events.js` under `/api/v1`, behind the same `apiTokenAuth` +
`requireApiScope('write')` pair row 3 of `PAYLOAD_PICPEAK_API_CONTRACT.md`'s
call catalog already documents, delegating to the existing `queueEmail()`
(`emailProcessor.js:959`) with a fixed `template_key: 'inquiry_received'`
— the row `120_add_inquiry_notification_email_template.js` (AC-33.5.2.1)
already inserts — and `event_id: null`, legal because `email_queue.event_id`
is nullable (`db.js`) and the admin queue view `leftJoin`s `events`
(`adminEmail.js`) so a null-`event_id` row still lists. The route accepts
data fields only (`form_title`, `source_page`, `submitted_at`,
`submission_summary` — the migration's own template variables) and renders
no subject or body itself; queueing only inserts a `pending` row for the
existing 60-second background processor to send. US-33 AC-33.5.2.2.2.

- **Type:** permanent deviation — a genuine, intentional fork addition
  (Fork Discipline: extend via new code, never by rewriting shipped
  upstream logic), not an upstream-bug workaround, so `UPSTREAM_SYNC.md` §4
  does not apply; it is carried forward on every future merge per §1. The
  same kind of additive `server.js` change as the US-27 `publicSite`
  deviation recorded above (2026-08-07) — precedented, not a new argument
  to have.
- **What changed:**
  1. `vendor/picpeak/backend/src/routes/v1/notifications.js` — new file.
     `POST /notifications/inquiry` behind `apiTokenAuth` +
     `requireApiScope('write')`; validates `recipient_email`, `form_title`,
     `source_page`, `submission_summary` server-side (`express-validator`,
     the same library `events.js` uses); calls
     `queueEmail(null, recipient_email, 'inquiry_received', emailData)`.
     US-33 AC-33.5.2.2.2.
  2. `vendor/picpeak/backend/server.js` — one new `app.use('/api/v1', ...)`
     line, immediately beside the existing `v1/events` mount
     (`server.js:531`); the existing mount is left byte-identical. US-33
     AC-33.5.2.2.2.
  3. `vendor/picpeak/backend/src/routes/v1/__tests__/notifications.inquiry.test.js`
     — new fork-side Jest suite (9 tests), `queueEmail` and `db` mocked,
     `requireApiScope` exercised for real. Run offline with the fork's own
     local `node_modules` — no Docker, no live HTTP call. US-33
     AC-33.5.2.2.2.
  4. `PAYLOAD_PICPEAK_API_CONTRACT.md` — new call-catalog row `3a`,
     immediately after row 3, recording this boundary crossing; existing
     row numbers 4/5 are left unchanged since this document's own prose
     cites them by number in several other sections. US-33 AC-33.5.2.2.2.
- **Files touched:** see `PICPEAK_PORT_LEDGER.md` §7 for the flat list.
- **Evidence:** `src/__tests__/us33-ac33.5.2.2.2-inquiry-notification-route.test.ts`
  pins the route's auth pair, its `queueEmail` call shape, the fixed
  `template_key`, the minimal additive `server.js` mount, and the
  changelog/ledger/contract records against the pinned fork source
  directly — never against this prose alone. The fork-side suite named
  above proves the route's actual request/response behaviour: a valid
  request queues exactly once with `event_id === null` and the fixed
  `template_key`, an invalid body 400s before `queueEmail` is reached, and
  a read-only-scoped token 403s via the real `requireApiScope`. Live
  behaviour against a real minted `pp_live_` token, and the queued row read
  back from Backstage's own Postgres, is deliberately out of scope here —
  AC-33.5.2.2.3.

- **Recorded:** 2026-08-14
- **Recorded by:** dev-team (US-33, AC-33.5.2.2.2)

---

## 2026-08-14 — `deviation`

**The fork's first extension migration lands: `120_add_inquiry_notification_email_template.js`
inserts the `email_templates` row a Frontstage form submission's studio
notification will render from, and the manifest that fingerprints every
vendored migration file gains an explicit lane for fork-added migrations
like it, distinct from the pinned-upstream fingerprint it already kept.**
Before this entry, `PICPEAK_MIGRATION_MANIFEST` fingerprinted only what
GitHub actually shipped at the pin — appending a fork migration's hash to
that same undifferentiated list would have kept
`us15-ac15.6-picpeak-vendored-fork.test.ts` green while making it false: a
later edit to *our own* migration would read as upstream tampering, and the
drift detector would carry our own addition forward as an approved upstream
baseline on the next sync. `MigrationManifestEntry` now carries an optional
`origin: 'fork'` field (omitted = upstream, the default, so none of the
~130 pre-existing entries needed to change); a fork-origin entry's blob SHA
is still enforced exactly like an upstream entry's, and it carries one
further requirement upstream entries do not: it must be named in this file,
checked by `verifyVendoredMigrations` reading `FORK_CHANGELOG.md` directly.
US-33 AC-33.5.2.1.

The migration itself is additive only — a single `INSERT`, guarded on
`template_key` already existing (the same idempotency convention
`059_add_admin_email_templates.js` uses) — populating the legacy
`subject_en`/`body_html_en`/`body_text_en`/`_de` columns `processTemplate`
falls back to when no `email_template_translations` row exists
(`emailProcessor.js:503, 541-548`). Without this row, every
`inquiry_received` row a later sub-AC queues would sit `pending` and retry
to exhaustion exactly like the two templates finding F9 already named
(`gallery_expired`, `archive_complete`) — `scrum-master/po-requests.md`.

- **Type:** permanent deviation — the migration is a genuine, intentional
  fork addition (Fork Discipline requires a *new* migration for any
  fork-side schema/data change, never an edit to a shipped one), not an
  upstream-bug workaround, so `UPSTREAM_SYNC.md` §4 does not apply; it is
  carried forward on every future merge per §1.
- **What changed:**
  1. `vendor/picpeak/backend/migrations/core/120_add_inquiry_notification_email_template.js`
     — new migration, inserts the `inquiry_received` `email_templates` row
     (English and German subject/body, `form_title`/`source_page`/
     `submitted_at`/`submission_summary` variables). US-33 AC-33.5.2.1.
  2. `src/lib/picpeakMigrationManifest.ts` — `MigrationManifestEntry` gained
     the optional `origin?: 'fork'` field; migration `120` is recorded as
     the manifest's first `origin: 'fork'` entry, alongside its blob SHA.
     US-33 AC-33.5.2.1.
  3. `src/lib/picpeakMigrationIntegrity.ts` — `verifyMigrationsUnmodified`
     gained the `isForkAdditionDocumented` check, consulted only for
     `origin: 'fork'` entries whose blob SHA already matched; a fork
     addition absent from `FORK_CHANGELOG.md` now fails with reason
     `'undocumented'`. `verifyVendoredMigrations` wires this to a real read
     of this file. US-33 AC-33.5.2.1.
  4. `vendor/README.md` — new "The fork-addition lane" section documents
     the `origin` field and the `FORK_CHANGELOG.md` requirement it enforces.
     US-33 AC-33.5.2.1.
  5. `UPSTREAM_SYNC.md` §3 — the claim that "this fork has not added a
     single schema migration of its own" is now out of date; updated with
     a dated note pointing at migration `120` and scoping the still-owed
     AC-16.6 upgrade proof to a future *schema-altering* fork migration
     (this one only inserts a row). US-33 AC-33.5.2.1.
  6. `PICPEAK_PORT_LEDGER.md` — new §6 recording the file paths this entry
     touched, per the same cross-reference convention §5 established for
     US-27 AC-27.5. US-33 AC-33.5.2.1.
- **Files touched:** see `PICPEAK_PORT_LEDGER.md` §6 for the flat list.
- **Evidence:** `src/__tests__/us33-ac33.5.2.1-fork-migration-lane.test.ts`
  proves the lane both directions through `verifyMigrationsUnmodified`'s
  injected `readFile`/`isForkAdditionDocumented` — a fork addition that is
  blob-identical and documented passes, one that is undocumented fails with
  reason `'undocumented'`, and an *upstream* entry with a tampered blob SHA
  still fails with reason `'modified'` exactly as it did before this lane
  existed. `us15-ac15.6-picpeak-vendored-fork.test.ts` stays green against
  the real vendored tree with migration `120` present. Applied live against
  the `backstage-db` Postgres service in Docker
  (`docker compose --profile backstage up -d`): `SELECT * FROM email_templates
  WHERE template_key = 'inquiry_received'` returns exactly one row, and
  re-running the migration is a no-op (the `template_key` guard).

- **Recorded:** 2026-08-14
- **Recorded by:** dev-team (US-33, AC-33.5.2.1)

---

## 2026-08-07 — `deviation`

**Every duplicate Backstage publishing surface AC-18.5 identified is now held
off by its own feature flag, not just a settings default.** A new
`publicSite` flag was added to `KNOWN_FLAGS`/`DEFAULT_FLAGS`, mirroring the
existing `quotes`/`bills` pattern exactly, defaulting to `false`; the raw-HTML
homepage renderer now checks it **before** `app_settings` is read, closing
the gap where a single `PUT /api/admin/settings/general` write could turn
Backstage into a second publisher of the site's `/` route. The equivalent
admin-UI panel is hidden behind the same flag using the fork's existing
`RequireFeature` gate, so the capability is not merely unreachable at the
server — it is not offered. The native quote/invoice/tax-report subsystem's
`quotes`/`bills` defaults were confirmed `false` with a live 403 proof rather
than assumed off, and the static CMS Pages surface was confirmed to stay
**enabled** (a deliberate scoping decision, not an oversight) with a test
that would fail if a future cleanup silently reversed it. US-27 AC-27.1
through AC-27.4.

- **Type:** permanent deviation — new flag keys and gate checks this project
  adds on top of upstream's existing flag mechanism. Not a vendor-defect
  workaround, so §4 of `UPSTREAM_SYNC.md` does not apply; it is carried
  forward on every future merge per §1.
- **What changed:**
  1. `publicSite` added to `KNOWN_FLAGS`/`DEFAULT_FLAGS`
     (`adminFeatureFlags.js`), defaulting to `false`. US-27 AC-27.1.
  2. `handlePublicSiteRequest` in `publicSiteService.js` now checks the
     `publicSite` flag before reading `general_public_site_enabled` from
     `app_settings`; the raw-HTML composition helpers (`composeInlineStyles`,
     `renderBrandHeader`, `renderBrandFooter`, and the rest of the homepage
     template) moved out of `server.js` and into the service alongside that
     check, so the flag gate and the rendering it gates live in one place.
     US-27 AC-27.1.
  3. The admin "Public Site" raw HTML/CSS panel in `CMSPage.tsx` is hidden
     behind the same `publicSite` flag via `RequireFeature`, the way the
     quotes UI already is; `FeatureFlagsContext.tsx` and
     `featureFlags.service.ts` carry the new flag through to the admin UI.
     US-27 AC-27.2.
  4. `publicQuotes.js` gained an explicit `quotes`-flag check on its public
     routes (previously reachable whenever a quote existed, with no flag
     behind it); `adminQuotes.js`, `adminInvoices.js`, `adminTaxReport.js`,
     and `adminBusinessProfile.js` were confirmed to already default `quotes`
     / `bills` to `false` with at least one flag-gated route per flag proven
     to 403 with the flag off. US-27 AC-27.3.
  5. `adminCMS.js` / `publicCMS.js` (the static CMS Pages surface) confirmed
     to stay enabled — no flag added, by design; a pinning test now protects
     that decision. US-27 AC-27.4.
- **Files touched:**
  - `vendor/picpeak/backend/src/routes/adminFeatureFlags.js` — `publicSite`
    flag key.
  - `vendor/picpeak/backend/src/services/publicSiteService.js` — flag check
    moved ahead of the `app_settings` read; HTML-rendering helpers relocated
    in from `server.js`.
  - `vendor/picpeak/backend/server.js` — the relocated helpers removed; the
    route now delegates entirely to `handlePublicSiteRequest`.
  - `vendor/picpeak/backend/src/routes/publicQuotes.js` — new file, `quotes`
    flag check added ahead of the public quote routes.
  - `vendor/picpeak/frontend/src/pages/admin/CMSPage.tsx` — Public Site panel
    wrapped in `RequireFeature('publicSite')`.
  - `vendor/picpeak/frontend/src/contexts/FeatureFlagsContext.tsx` —
    `publicSite` added to the tracked flag set.
  - `vendor/picpeak/frontend/src/services/featureFlags.service.ts` —
    `publicSite` added to the flag-service type/defaults.
  - `vendor/picpeak/backend/src/__tests__/adminFeatureFlags.publicSite.test.js`
    — new pinning suite for the flag default and its gate order.
  - `vendor/picpeak/backend/src/__tests__/publicSiteService.test.js` —
    extended to cover the pre-`app_settings` flag check.
  - `vendor/picpeak/backend/__tests__/routes/cmsStaysEnabled.test.js` — new,
    pins the CMS Pages surface as deliberately not flag-gated.
  - `vendor/picpeak/backend/__tests__/routes/nativeBillingFlags.test.js` —
    new, proves the `quotes`/`bills` defaults and the 403-with-flag-off
    behaviour.
  - `vendor/picpeak/backend/__tests__/routes/publicQuotes.test.js` — new,
    covers the added `quotes` flag check.
  - `src/__tests__/us27-ac27.2-cms-public-site-panel-flag-gated.test.ts` —
    new, mirrors the existing quotes-panel `RequireFeature` test pattern.
  - `src/__tests__/us18-ac18.5-backstage-surfaces-disabled.test.ts` — updated
    now that AC-27.1 closed the gap AC-18.5 originally recorded as open.
- **Evidence:** none of the above are under
  `vendor/picpeak/backend/migrations/` — every change is a new flag key, a
  new check, or a gated panel, never an edit to an already-shipped migration.
  `src/lib/picpeakMigrationManifest.ts`'s SHA-1 integrity test
  (`src/__tests__/us15-ac15.6-picpeak-vendored-fork.test.ts`) stays green
  against this change, re-asserted by
  `src/__tests__/us27-ac27.5-additive-deviation-recorded.test.ts`.

- **Recorded:** 2026-08-07
- **Recorded by:** dev-team (US-27, AC-27.5)

---

## 2026-08-01 — `deviation`

**Single-photo gallery download patched: read through the storage backend,
answer on every failure path, and record the download only once it is
confirmed sent.** Works around upstream defect **UD-1** — see
`PICPEAK_UPSTREAM_DEFECTS.md` for the defect, the upstream report, and the
condition under which this patch is dropped.

- **Type:** vendor-defect workaround, **not** a permanent deviation. It is
  flagged drop-rather-than-merge in `UPSTREAM_SYNC.md` §4: when the pin moves
  to an upstream commit carrying upstream's own fix, this patch is deleted
  rather than merged forward.
- **Upstream location patched:** `backend/src/routes/gallery.js`, the
  `GET /:slug/download/:photoId` route (line 631 at the pinned commit
  `eb263137b98935754155824de2a03848121304b6`).
- **What changed, in three parts** (all three are the same upstream route and
  were fixed together):
  1. Managed photos resolve through `resolvePhotoStorageKey()` +
     `getStorage()` instead of the local-filesystem-only
     `resolvePhotoFilePath()` (which survives only for external/reference
     photos), with `Content-Length` from the storage `stat()`; the watermark
     branch materializes a temp local copy via `withLocalCopy()`. US-17
     AC-17.5.2.
  2. Every failure path answers — `404`/`500` while headers are unsent,
     `res.destroy()` once they are — including the `res.sendFile()` error
     callback that upstream left logging-only, which hung the request. US-17
     AC-17.5.2.
  3. The `download_count` increment (upstream `gallery.js:654`) and the
     `access_logs` insert (upstream `gallery.js:657`) moved out of their
     pre-send position into a single guarded helper fired only on a confirmed
     delivery — the response's `finish` event, and `res.sendFile()`'s success
     branch — never from a failure branch. US-17 AC-17.5.3.
- **Files touched:**
  - `vendor/picpeak/backend/src/routes/gallery.js` — the patched route; every
    changed region carries an in-file `vendor-defect fix: US-17 AC-17.5.2` or
    `AC-17.5.3` comment so the patch stays legible against a future sync.
  - `vendor/picpeak/backend/src/__tests__/galleryDownload.storageBackend.test.js`
    — new pinning suite covering the patched behaviour (14 tests).
- **Evidence:** `PIVOT_AUDIT.md`, sections "AC-17.5.2 — the single-photo
  download route patched to read through the storage backend, proven live"
  and "AC-17.5.3 — the download recorded only on a confirmed delivery, proven
  live from Postgres".

- **Recorded:** 2026-08-01
- **Recorded by:** dev-team (US-17, AC-17.5.3)

---

## 2026-07-31 — `baseline`

**Fork initialised at the pinned upstream commit. No deviations yet.**

- **Upstream:** `https://github.com/PicPeak/picpeak`
- **Pinned commit:** `eb263137b98935754155824de2a03848121304b6` (branch `main`,
  dated 2026-06-06T01:50:55Z upstream — see `PICPEAK_UPSTREAM.md` for the
  full pin record and `PICPEAK_CAPABILITY_AUDIT.md` for why this commit was
  selected)
- **Licence:** MIT, verified in `PICPEAK_LICENCE_VERIFICATION.md`
- **Files touched:** none — this entry records the baseline only. The fork's
  vendored code is not yet present in this repository (tracked separately as
  AC-15.6); no deviation from upstream has been made at this point.

From this baseline forward, every change made to the vendored fork code that
is *not* a straight sync from a newer upstream pin — a bug fix, a
configuration change, a feature added or removed, a dependency bumped ahead
of or independently from upstream — gets its own dated `deviation` entry
below, naming the files it touched.

- **Recorded:** 2026-07-31
- **Recorded by:** dev-team (US-15, AC-15.5)
