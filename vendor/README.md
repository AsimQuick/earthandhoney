<!--
---
file: vendor/README.md
project: earthandhoney
purpose: AC-15.6 — declares vendor/ as the clearly separated location for
         third-party code held verbatim at a pinned commit, states the
         no-edit rule for the vendored PicPeak fork, and points at the
         migration-integrity check that enforces it.
created-by: dev-team
related-story: US-15
related-ac: 15.6
---
-->

# `vendor/` — third-party code, held verbatim

Everything under `vendor/` is **not this project's code**. It is upstream code
copied in at an exact pinned commit and kept byte-for-byte identical to what
upstream shipped. Nothing in this directory is authored, reviewed, or
maintained here.

| Directory | Upstream | Pinned commit | Records |
|---|---|---|---|
| `vendor/picpeak/` | `https://github.com/PicPeak/picpeak` | `eb263137b98935754155824de2a03848121304b6` | `PICPEAK_UPSTREAM.md`, `THIRD_PARTY_NOTICES.md`, `FORK_CHANGELOG.md`, `UPSTREAM_SYNC.md` |

## Why it is separated this way

The fork sits in its own top-level directory, entirely outside `src/`, so the
boundary between our code and upstream's is a path, not a convention. That
separation is enforced by tooling rather than trusted:

- `eslint.config.mjs` — `vendor/picpeak/**` is in `globalIgnores`; upstream code
  is never linted against our rules.
- `tsconfig.json` — `vendor` is in `exclude`; upstream code is never typechecked
  or compiled as part of this project.
- `jest.config.ts` — `vendor/` is in `testPathIgnorePatterns`,
  `modulePathIgnorePatterns`, and `coveragePathIgnorePatterns`; upstream's ~100
  test suites belong to upstream's tooling and never run in `npm test`, and
  upstream source never counts towards our coverage threshold.
- `src/__tests__/us1-ac1.5-code-file-headers.test.ts` — `vendor` is an ignored
  directory; upstream files keep upstream's headers, not ours.

The upstream `.git` directory is deliberately **not** vendored: only the pinned
tree is present, so there is no floating history to accidentally advance
(see `PICPEAK_UPSTREAM.md`).

## The no-edit rule for already-shipped migrations

An upstream database migration that has already shipped has, by definition,
already run against real databases. Editing one in the fork means the same
migration id has two different bodies depending on when a database was
migrated — a divergence that cannot be repaired by re-running anything.

**Already-shipped upstream migrations under
`vendor/picpeak/backend/migrations/` must never be modified.** Deviations are
made by adding a *new*, higher-numbered migration in the fork and recording it
in `FORK_CHANGELOG.md` — never by rewriting an existing one.

This is verified, not asserted. `src/lib/picpeakMigrationManifest.ts` records
the git blob SHA-1 of every migration file exactly as it exists at the pinned
upstream commit, and `src/lib/picpeakMigrationIntegrity.ts` recomputes those
hashes from the files on disk. Any edit to any migration file — a whitespace
change is enough — changes its blob SHA and fails
`src/__tests__/us15-ac15.6-picpeak-vendored-fork.test.ts` in CI.

When the fork is updated to a newer upstream commit, the manifest is
regenerated as part of that deliberate update and the change is recorded in
`FORK_CHANGELOG.md` per the process in `UPSTREAM_SYNC.md`.
