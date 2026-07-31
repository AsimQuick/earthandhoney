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

This list is not exhaustive — it names the conflict-prone files known at
fork-initialisation time (AC-15.5), before the fork's vendored code is
present in this repository (AC-15.6). It is expected to grow as
`FORK_CHANGELOG.md` accumulates deviation entries: every file named in a
`deviation` entry there is, by definition, a file that can now conflict on
a future sync, and should be cross-referenced here during the update
process in `PICPEAK_UPSTREAM.md` §3.

- **Recorded:** 2026-07-31
- **Recorded by:** dev-team (US-15, AC-15.5)
