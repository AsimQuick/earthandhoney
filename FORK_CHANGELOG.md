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
