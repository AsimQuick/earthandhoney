<!--
---
file: UPSTREAM_SYNC.md
project: earthandhoney
purpose: AC-15.5 — states the merge or rebase policy for pulling future
         PicPeak upstream updates into the fork, and names the files most
         likely to conflict on a future update.
created-by: dev-team
related-story: US-15
related-ac: 15.5
---
-->

# Upstream Sync Policy

This document states how a future PicPeak upstream update is actually
pulled into this fork, once the process in `PICPEAK_UPSTREAM.md` §3 decides
the pin should move. It is the operational counterpart to that document:
`PICPEAK_UPSTREAM.md` says *when* to look upstream again; this says *how*
to bring the change in without losing this fork's own deviations, which are
tracked in `FORK_CHANGELOG.md`.

The policy shape (a strategy, at least one named conflict-prone file, and a
stated rationale) is enforced by `validateSyncPolicy` in
`src/lib/upstreamSync.ts`.

## 1. Strategy: merge, not rebase

**This fork pulls upstream updates with a merge, never a rebase.**

- **Rationale:** `PICPEAK_UPSTREAM.md` and `FORK_CHANGELOG.md` both cite
  specific, already-recorded commit hashes as anchors (the pin itself, and
  every future deviation entry). A rebase rewrites commit history, which
  would silently invalidate those references and make past changelog
  entries point at commits that no longer exist. A merge preserves the
  fork's existing commit history — including every deviation recorded in
  `FORK_CHANGELOG.md` — and adds the upstream update as new commits on top,
  so every historical reference stays valid. This also matches the DoD rule
  that no already-shipped upstream migration is ever modified: a rebase
  that replays fork commits onto a new upstream base risks re-applying a
  migration edit upstream itself has since changed; a merge does not touch
  already-shipped commits on either side at all.

## 2. Files most likely to conflict on a future update

These are named ahead of time so a future update can scope its conflict
review before starting, per `PICPEAK_UPSTREAM.md` §3 step 4 ("check for
conflicts with fork deviations"). Each is likely to conflict because this
fork is expected to deviate from upstream's default at exactly that file:

| File / path (within the PicPeak fork tree) | Why it's likely to conflict |
|---|---|
| `backend/src/services/storage/S3StorageBackend.js` and its storage-backend config | This project points storage at its own Cloudflare R2 bucket (`STORAGE_BACKEND=s3` plus R2-specific credentials/endpoint), diverging from upstream's default local-storage configuration. Any upstream change to this file's interface conflicts with that configuration. |
| `backend/src/routes/adminWebhooks.js` and `webhookService.js` | Webhooks are expected to be wired into this project's own lead/booking workflow (per `CLAUDE.md`'s client lifecycle), which is a deviation from upstream's generic webhook delivery. |
| Database migration files (e.g. the schema introduced by the webhooks migration referenced in `PICPEAK_CAPABILITY_AUDIT.md` as "migration 082") | The DoD forbids ever modifying an already-shipped upstream migration. Any fork-side schema change must be added as a new migration, never an edit to an existing one — the highest-risk category for silently breaking that rule during a sync. |
| `backend/package.json` / `backend/package-lock.json` | Dependency versions are likely to drift between what this fork pins and what upstream moves to, independent of any feature change. |
| `.env.example` (upstream's own, inside the fork tree) | This fork adds R2-specific and project-specific environment variables not present upstream; an upstream change to its own `.env.example` needs manual reconciliation rather than a straight overwrite. |
| `backend/src/routes/adminFeatureFlags.js` | This fork adds a `publicSite` flag key to `KNOWN_FLAGS`/`DEFAULT_FLAGS` (US-27, AC-27.1). Any upstream change to this file's flag list or default-computation logic conflicts with that addition. |
| `backend/src/services/publicSiteService.js` | This fork moved the homepage HTML-rendering helpers in from `server.js` and added a `publicSite` flag check ahead of the `app_settings` read (US-27, AC-27.1). An upstream change to `getPublicSitePayload`/`handlePublicSiteRequest`'s signature or call order conflicts directly with this restructuring. |
| `backend/server.js` | The homepage HTML-rendering helpers that used to live here were relocated to `publicSiteService.js` as part of the same US-27 AC-27.1 change; an upstream edit to that removed code has nothing left here to apply against. |
| `backend/src/routes/publicQuotes.js` | This fork adds an explicit `quotes` flag check ahead of the public quote routes (US-27, AC-27.3), where upstream has none. |
| `frontend/src/pages/admin/CMSPage.tsx` | This fork wraps the Public Site panel in `RequireFeature('publicSite')` (US-27, AC-27.2), mirroring the existing quotes-panel gate; an upstream restructuring of this panel conflicts with that wrapper. |
| `frontend/src/contexts/FeatureFlagsContext.tsx` and `frontend/src/services/featureFlags.service.ts` | This fork adds the `publicSite` flag to the tracked flag set/type (US-27, AC-27.2), alongside the existing `quotes`/`bills` flags upstream already tracks. |

This list is not exhaustive — it names the conflict-prone files known at
fork-initialisation time (AC-15.5), before the fork's vendored code is
present in this repository (AC-15.6). It is expected to grow as
`FORK_CHANGELOG.md` accumulates deviation entries: every file named in a
`deviation` entry there is, by definition, a file that can now conflict on
a future sync, and should be cross-referenced here during the update
process in `PICPEAK_UPSTREAM.md` §3.

- **Recorded:** 2026-07-31
- **Recorded by:** dev-team (US-15, AC-15.5)

## 3. Deferred proof: upgrading with our own extension migrations (AC-16.6)

`MIGRATION_IDEMPOTENCY.md` (US-16, AC-16.6) proves the migration path is
safe for the two scenarios provable today: a fresh install applying the
pinned upstream migrations to an empty database, and the same migration
command re-run against that now-migrated database as a no-op.

It explicitly does **not** prove a third scenario: an upgrade that applies
*our own* extension migration(s) on top of an already-migrated upstream
database. Under Fork Discipline, no such migration exists yet — this fork
has not added a single schema migration of its own — so there is nothing
real to run that proof against. Inventing a throwaway migration purely to
exercise the path would prove nothing about how our actual future
migrations behave.

**This proof is deferred to the sprint that introduces this fork's first
extension migration.** When that migration lands, its story must repeat the
AC-16.6 proof shape (before/after migration-state table, re-run as a no-op)
using that real migration, before the deviation is also logged in
`FORK_CHANGELOG.md`.

- **Recorded:** 2026-07-31
- **Recorded by:** dev-team (US-16, AC-16.6)

## 4. Drop-rather-than-merge: vendor-defect patches

Not every entry in `FORK_CHANGELOG.md` should survive a sync. §1's merge
strategy preserves fork commits by default, which is right for a *deliberate*
deviation (pointing storage at our R2 bucket, say) — those are permanent and
must survive every future update. It is wrong for a patch that exists only
because upstream is broken: once upstream fixes the bug, carrying our
workaround forward means maintaining a second, divergent fix forever.

**Patches listed below are flagged drop-rather-than-merge.** At every sync,
before resolving conflicts in the files they touch, check each patch's drop
condition in `PICPEAK_UPSTREAM_DEFECTS.md`. If the condition is met at the new
pin, **delete the patch rather than merging it forward**, and record the
deletion as a new `FORK_CHANGELOG.md` entry. If the condition is not met, the
patch is carried unchanged and stays flagged here.

| Patch | Files it touches (within the fork tree) | Register entry | Drop when |
|---|---|---|---|
| Single-photo gallery download: storage-backend resolution, responding failure paths, and recording the download only on a confirmed send (US-17 AC-17.5.2 / AC-17.5.3; `FORK_CHANGELOG.md` `2026-08-01` `deviation`) | `backend/src/routes/gallery.js` (`GET /:slug/download/:photoId`); `backend/src/__tests__/galleryDownload.storageBackend.test.js` | **UD-1** in `PICPEAK_UPSTREAM_DEFECTS.md` | The pin moves to an upstream commit in which this route resolves managed photos through `getStorage()`, its failure paths send a response, **and** the `download_count`/`access_logs` writes happen only after a confirmed send. All three, at that commit — a partial upstream fix means the patch is reduced, not dropped. |

`backend/src/routes/gallery.js` is, by virtue of the above, now also a
conflict-prone file for the purposes of §2 — it carries a fork patch that any
upstream change to the same route will collide with. It is deliberately not
added to §2's table, because §2 lists files this fork expects to deviate at
*permanently*; this one is expected to stop deviating.

- **Recorded:** 2026-08-01
- **Recorded by:** dev-team (US-17, AC-17.5.3)
