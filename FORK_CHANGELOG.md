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
