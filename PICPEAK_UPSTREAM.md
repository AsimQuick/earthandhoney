<!--
---
file: PICPEAK_UPSTREAM.md
project: earthandhoney
purpose: AC-15.3 — records the upstream URL, the exact pinned commit hash,
         the branch/tag it came from, the date pinned, and the process for
         evaluating a future upstream update. States that production must
         never track a floating upstream branch.
created-by: dev-team
related-story: US-15
related-ac: 15.3
---
-->

# PicPeak Upstream — Pin Record (AC-15.3)

## 1. Pin

| Field | Value |
|---|---|
| **Upstream URL** | `https://github.com/PicPeak/picpeak` |
| **Pinned commit** | `eb263137b98935754155824de2a03848121304b6` |
| **Source branch/tag** | `main` (upstream's default branch — the commit itself is a fixed hash, not the branch name) |
| **Date pinned** | 2026-07-31 |

This is the candidate commit identified in `PICPEAK_CAPABILITY_AUDIT.md`
(AC-15.2) as the earliest upstream commit verified to provide all four
capabilities the pivot depends on (Projects grouping above galleries,
customer accounts, webhooks, S3-compatible storage), and verified in
`PICPEAK_LICENCE_VERIFICATION.md` (AC-15.1) to come from an MIT-licensed,
existing, obtainable repository.

## 2. Production must never track a floating upstream branch

**Production deploys, builds, and dependency references must resolve to the
pinned commit hash above (`eb263137b98935754155824de2a03848121304b6`), never
to `main`, any other upstream branch, or a mutable tag.** Upstream `main`
advances continuously; if any part of this project's build, vendoring, or
sync tooling referenced `main` directly, an unrelated upstream commit could
silently change fork behaviour without a corresponding deliberate decision
in `FORK_CHANGELOG.md`. Every reference to the upstream fork content in this
repository (the vendored code itself, and any tooling that re-fetches or
diffs against upstream) must be anchored to this exact commit hash until the
update process below produces a new pin.

`validatePin` (`src/lib/upstreamPin.ts`) encodes this rule as unit-tested
logic: a pin is rejected unless `pinnedCommit` is a full 40-character commit
hash, so a branch or tag name accidentally substituted for a hash fails
validation rather than being silently accepted.

## 3. Process for evaluating a future upstream update

Upstream updates are never pulled automatically or tracked continuously.
Evaluating whether to move the pin forward is a deliberate, occasional
decision:

1. **Trigger.** A specific reason to look upstream again — a security
   advisory affecting the pinned commit, a capability this project needs
   that shipped after the pin, or a scheduled periodic review (at most
   quarterly). Idle curiosity is not a trigger.
2. **Diff the range.** Compare the pinned commit against the prospective new
   commit (`GET /repos/PicPeak/picpeak/compare/<pinned>...<candidate>`) and
   read the commit list, not just the final diff, to understand what
   changed and why.
3. **Re-run the AC-15.1/AC-15.2 checks against the candidate.** Confirm the
   licence at the candidate commit is still MIT (licences can change on
   later commits) and that the four required capabilities are still present
   and not regressed.
4. **Check for conflicts with fork deviations.** Cross-reference the files
   changed upstream against `UPSTREAM_SYNC.md`'s list of files most likely
   to conflict, and against every entry in `FORK_CHANGELOG.md`, to scope the
   merge/rebase effort before committing to it.
5. **Record the decision.** Whether the pin moves or the team decides to
   stay on the current commit, record the evaluation and its outcome in
   `FORK_CHANGELOG.md`. If the pin moves, update the pin table in Section 1
   of this document (new commit hash and a new date pinned) as part of the
   same change.
6. **Never partially adopt.** The pin always identifies one exact commit for
   the whole vendored fork — never a mix of files cherry-picked from
   different upstream commits, which would make the "pinned commit" claim
   meaningless.

- **Recorded:** 2026-07-31
- **Recorded by:** dev-team (US-15, AC-15.3)
