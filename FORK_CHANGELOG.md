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
