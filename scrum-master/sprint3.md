# Sprint 3

**Phase:** planning
**Progress:** 3/7 stories | 18/66 ACs
**Last Updated:** 2026-08-01T00:47:46+00:00

## Sprint Goal
De-risk the pivot before any feature is built on it. Produce an approved pivot map for the existing codebase, create a licence-compliant fork of the PicPeak Backstage pinned to a verified commit, prove that fork really delivers the photography flow (project, client, gallery, upload, protection, expiry, download, email, webhook) on PostgreSQL and the existing R2 bucket inside Docker, and settle the four decisions the next sprint cannot start without: system ownership, the Frontstage-to-Backstage API boundary, the media-reuse model, and the R2 delivery path. Separately, extract the proven Stripe environment and key-pairing convention from the reference project so the payment work later cannot repeat a known past failure. No new public pages are built this sprint.

## Reference Documents
- `scrum-master/PRD.md`
- `CLAUDE.md`
- `scrum-master/scrum-master.md`
- `scrum-master/retrospective.md`
- `scrum-master/po-requests.md`
- `scrum-master/PRD-archive.md (historical only — do not build from it)`
- `/Users/asim/NoIcloud/techno (Stripe reference implementation)`

## Definition of Done
- [ ] Every acceptance criterion is closed with recorded evidence, not assertion — a command output, a screenshot, a measured number, or a named file and line
- [ ] Every claim about the forked upstream is verified against the actual pinned code, never against documentation alone
- [ ] No already-shipped upstream migration has been modified
- [ ] All services run in Docker; nothing installed on the host
- [ ] No secret value is committed anywhere; .env.example stays authoritative for every required variable
- [ ] Every decision record names the option chosen, the options rejected, and the reason
- [ ] Anything needing human input is in po-requests.md, not silently decided
- [ ] Existing CI stays green (lint, types, tests, coverage threshold)
- [ ] retrospective.md updated incrementally during the sprint, not at close
- [ ] No critical or major defect remains open against any story in this sprint
- [ ] Coverage threshold met — the existing CI coverage gate is not lowered to pass
- [ ] Every code file created or changed carries its structured metadata header comment (CLAUDE.md convention)

## User Stories

### US-14: Pivot audit: keep / replace / retire map for the existing codebase
**Status:** done | **Priority:** critical

#### Acceptance Criteria
- [x] **AC-14.1:** `PIVOT_AUDIT.md` exists at the repo root and inventories every feature currently implemented in this repository, stating for each one whether it is Kept, Replaced by PicPeak, Repurposed as a Frontstage layer, or Retired — with a one-line reason per entry. Every item delivered in sprint-1 (US-1…US-6) and sprint-2 (US-7…US-9) appears exactly once.
  - Dev: done
- [x] **AC-14.2:** The audit explicitly names which existing artifacts are superseded by the PicPeak fork — the Payload Galleries collection, the Payload-owned Sharp derivative pipeline, the Payload-owned R2 upload path, and the in-repo gallery viewer components — and records, for each, whether it is deleted now, left dormant, or kept as a Frontstage renderer that reads from PicPeak. The audit must also list orphaned configuration left behind by retired stories — including the `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL` and `NEXT_PUBLIC_WHATSAPP_NUMBER` entries in `.env.example`, which belong to retired US-12 and US-13 — and state for each whether it is removed or retained, so no orphaned environment variables survive the pivot unexplained.
  - Dev: done
- [x] **AC-14.3:** The audit lists every duplicate-feature risk between the current codebase and PicPeak (two upload paths, two media stores, two galleries, two auth systems, two email senders) and names the single authoritative owner for each, consistent with the ownership table in `CLAUDE.md`.
  - Dev: done
- [x] **AC-14.4:** A dependency and licence audit is included: every third-party dependency that will be newly introduced or dropped by the pivot is listed with its licence, and any copyleft or commercially restrictive licence is flagged for Product Owner decision.
  - Dev: done
- [x] **AC-14.5:** A migration-risk section lists the data that exists today (Payload media records, galleries, users, uploaded R2 objects), states whether each must be migrated, discarded, or left in place, and names the risk of getting it wrong.
  - Dev: done
- [x] **AC-14.6:** The audit ends with an explicit keep/replace/retire recommendation and an open-questions list. Anything the audit cannot resolve without human input is added to `scrum-master/po-requests.md` rather than being decided silently.
  - Dev: done

**Dev Team Status:** not-started
**Dev Team Notes:**
  AC-14.1 implemented (local checks green): Committed on `feature/US-14` (not pushed, per instructions).
  
  **Implementation summary:**
  - `PIVOT_AUDIT.md` (new, repo root): inventories all 40 acceptance criteria delivered across sprint-1 (US-1…US-6) and sprint-2 (US-7…US-9), each in its own table row, classified as Kept / Replaced by PicPeak / Repurposed as a Frontstage layer / Retired with a one-line reason. Includes a note flagging that US-9 AC-9.1/AC-9.2 code (`a800bd8`, `1d5aa13`) is not present in this branch's working tree due to the known main/story-branch git desync, even though it's still inventoried as a delivered item.
  - `src/__tests__/us14-ac14.1-pivot-audit.test.ts` (new): derives the authoritative AC list dynamically from `scrum-master/sprint1.json` and `scrum-master/sprint2.json` (US-7..US-9 only), then asserts the file exists, every item appears exactly once, every row carries one of the four valid classifications, and every row has a non-empty reason. 85 assertions, all passing.
  - Full suite: 37 test suites / 667 tests, all passing. No dependency changes, no `package-lock.json` update needed. No coverage threshold is configured in this repo.
  - Left `tsconfig.json`'s pre-existing uncommitted modification untouc …
  AC-14.2 implemented (local checks green): Committed on `feature/US-14`. Summary:
  
  **Files changed:**
  - `PIVOT_AUDIT.md` — added two new sections: "Superseded artifacts (AC-14.2)" (Payload `Galleries` collection, Payload-owned Sharp derivative pipeline, Payload-owned R2 upload path, in-repo gallery viewer components — each with concrete file paths and one of three dispositions: Deleted now / Left dormant / Kept as a Frontstage renderer) and "Orphaned configuration (AC-14.2)" (`RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL`, `NEXT_PUBLIC_WHATSAPP_NUMBER` from retired US-12/US-13, each marked Removed or Retained, plus a note that `NEXT_PUBLIC_SITE_URL` is not orphaned).
  - `src/__tests__/us14-ac14.2-superseded-artifacts.test.ts` (new) — 16 tests verifying both tables exist, every required artifact/var is named, dispositions are restricted to the allowed vocabulary, cited file paths actually exist in the repo, and Retained/Removed dispositions match reality in `.env.example`.
  
  **Key decisions:** The three orphaned env vars are marked **Retained**, not removed — deleting them now would break the already-accepted `us7-ac7.4-env-example-sprint2-vars.test.ts` lock-in test from US-7, so actual removal is deferred to a follow-on pivot-ex …
  AC-14.3 implemented (local checks green): **Summary — AC-14.3 implemented:**
  
  - **`PIVOT_AUDIT.md`**: added a new `## Duplicate-feature risk map (AC-14.3)` section with a 5-row table (`R1`–`R5`) covering the five named duplicate-feature risks (two upload paths, two media stores, two galleries, two auth systems, two email senders). Each row names the current-codebase side, the PicPeak side, the CLAUDE.md-designated owner, the single authoritative owner, and a reason. Gallery/media/upload risks resolve to **PicPeak** (consistent with this audit's own AC-14.1/14.2 classifications); auth/email risks resolve to the pre-existing CLAUDE.md Technology Stack owners (**Better Auth**, **Resend**), since the pivot never reassigns those concerns. Front-matter `related-ac` updated to include `14.3`. Used `R1`–`R5` row labels (not plain numbers) to avoid colliding with the AC-14.1 test's document-wide `| \d+ |` row scan.
  - **`src/__tests__/us14-ac14.3-duplicate-ownership.test.ts`** (new, 8 tests): asserts all five risks are named exactly once, each has exactly one table row, each row names an owner from the allowed set, gallery/media/upload risks own to PicPeak, auth/email risks own to Better Auth/Resend, and the named owners actually ap …
  AC-14.4 implemented (local checks green): Committed on `feature/US-14` (not pushed, per instructions).
  
  **Summary:**
  - **PIVOT_AUDIT.md** — added a new `## Dependency and licence audit (AC-14.4)` section:
    - **Dropped by the pivot**: `sharp` (Apache-2.0) and `@payloadcms/storage-s3` (MIT), tied to the AC-14.2 "left dormant" superseded artifacts — both permissive, no PO flag needed.
    - **Newly introduced by the pivot**: the PicPeak fork itself, whose licence is explicitly recorded as **unconfirmed** (PRD assumes MIT but this hasn't been verified against the upstream licence file) and **flagged for Product Owner decision**, cross-referenced to US-15 AC-15.1's stop-and-notify gate and `po-requests.md` rather than resolving the question here.
    - Notes `photoswipe` is kept (not dropped/introduced), and lists remaining current runtime deps (`next`, `payload`, `react`, `react-dom`, `photoswipe`) as MIT with no pivot impact.
    - Licence values were verified by reading each package's actual `node_modules/<pkg>/package.json`, not assumed.
  - **src/__tests__/us14-ac14.4-dependency-licence-audit.test.ts** (new, 7 tests) — verifies the dropped/introduced/no-impact subsections exist, checks the PicPeak flag language and PO-decision ro …
  AC-14.5 implemented (local checks green): Committed as `81c4be5`.
  
  **Summary:**
  - `PIVOT_AUDIT.md`: added `## Migration-risk section (AC-14.5)` with a table covering the four data categories the AC names — Payload media records, galleries, users, and uploaded R2 objects — each with today's storage location, a migrate/discard/left-in-place disposition, and the concrete risk of getting that disposition wrong. Cross-references the existing Superseded artifacts (AC-14.2) and Duplicate-feature risk map (AC-14.3) sections rather than restating them.
  - `src/__tests__/us14-ac14.5-migration-risk.test.ts` (new): 7 tests verifying each category appears exactly once, has the expected disposition, states a substantive risk, names a concrete storage location, and that media/galleries/R2 objects aren't recommended for outright discard.
  - Full suite: 41 suites / 718 tests passing, no dependency changes so no `package-lock.json` update needed.
  AC-14.6 implemented (local checks green): **Summary of AC-14.6 implementation:**
  
  - `PIVOT_AUDIT.md`: added final `## Recommendation and open questions (AC-14.6)` section — an explicit keep/replace/retire recommendation table (consolidating AC-14.1–14.5's classifications by category, each row citing its basis) plus a 5-item numbered open-questions list (PicPeak licence, follow-on pivot-execution story timing, long-term status of Payload's `users` collection, confirmation no real production client data exists, and the still-unresolved production deploy target from `po-requests.md` item 1). Updated the file's front-matter to mention AC-14.6.
  - `src/__tests__/us14-ac14.6-recommendation-open-questions.test.ts` (new, 7 tests): asserts the section is the document's final section, the recommendation table covers Replace/Keep/Retire verdicts with a cited basis per row, at least 3 numbered open questions exist, and the section references `scrum-master/po-requests.md` for routing rather than deciding silently.
  - `src/__tests__/us14-ac14.5-migration-risk.test.ts`: bounded its section-extraction end heading to the new AC-14.6 heading (previously read to end-of-file, which broke once AC-14.6's table added new "Migrate"/"Galleries" rows …

**Tester Status:** approved
**Tester Notes:**
  Requirements validated for testability. All 6 ACs bind to a concrete, checkable artifact (PIVOT_AUDIT.md sections) with enumerable pass/fail conditions (every sprint-1/2 item appears exactly once, orphaned env vars named and dispositioned, duplicate-feature risks mapped to the CLAUDE.md ownership table, licence flags recorded, migration risk stated per data category, open questions routed to po-requests.md). No vague or unmeasurable wording found. Approved as written.

---

### US-15: Verify PicPeak upstream and create the pinned fork with licence compliance
**Status:** done | **Priority:** critical

#### Acceptance Criteria
- [x] **AC-15.1:** The PicPeak upstream repository is verified to actually exist and to be obtainable, and its licence is confirmed by reading the licence file in the repository rather than trusting documentation. If the licence is not MIT as the PRD assumes, work stops and the Product Owner is notified through `scrum-master/po-requests.md`.
  - Dev: done
- [x] **AC-15.2:** A specific upstream commit is identified that contains all four capabilities the pivot depends on — Projects grouping above galleries, customer accounts, webhooks, and S3-compatible storage — and the evidence for each capability at that commit is recorded. If no single commit provides all four, the gap is documented as a blocking finding.
  - Dev: done
- [x] **AC-15.3:** `PICPEAK_UPSTREAM.md` exists and records the upstream URL, the exact pinned commit hash, the branch or tag it came from, the date pinned, and the process for evaluating a future upstream update. It states that production must never track a floating upstream branch.
  - Dev: done
- [x] **AC-15.4:** `THIRD_PARTY_NOTICES.md` exists and reproduces the upstream licence text and copyright notice in full, alongside notices for any other code copied into this repository.
  - Dev: done
- [x] **AC-15.5:** `FORK_CHANGELOG.md` and `UPSTREAM_SYNC.md` exist. The changelog is initialised with the pinned baseline and is the place every deliberate deviation from upstream gets recorded. The sync document states the merge or rebase policy and names the files most likely to conflict on a future update.
  - Dev: done
- [x] **AC-15.6:** The forked code is present in this project in a clearly separated location, and no already-shipped upstream database migration has been modified — verifiable by comparing the fork's migration files against the pinned upstream.
  - Dev: done

**Dependencies:** US-14

**Dev Team Status:** not-started
**Dev Team Notes:**
  AC-15.1 implemented (local checks green): **Implementation summary — AC-15.1**
  
  Verified live that the PicPeak upstream repository exists and is obtainable (`git ls-remote https://github.com/PicPeak/picpeak.git` resolved `HEAD` at `3bcded78a448f5b099e87a73c7f1e44e859882aa`) and confirmed its licence by fetching and reading the actual `LICENSE` file content via the GitHub Contents API (not trusting GitHub's inferred licence badge or README claims) — full text is MIT, matching the PRD assumption, so the stop condition (non-MIT → `scrum-master/po-requests.md`) was not triggered.
  
  Files:
  - `PICPEAK_LICENCE_VERIFICATION.md` (new) — durable evidence record: upstream URL, obtainability proof, full quoted LICENSE text, MIT conclusion, stop-condition status.
  - `src/lib/licenceVerification.ts` (new) — `classifyLicenceText()`, pure MIT-vs-not classification logic encoding the stop-condition decision, reusable/testable independent of network access.
  - `src/__tests__/us15-ac15.1-picpeak-licence-verification.test.ts` (new) — 13 tests covering: classification of the actual PicPeak licence text as MIT; classification of GPL-3.0/Apache-2.0/dual-licence-mention/empty text as non-MIT (stop-condition trigger, including the `po-requests.md` ro …
  AC-15.2 implemented (local checks green): AC-15.2 implemented and committed on `feature/US-15` (commit `0dbf12e`).
  
  **Summary:**
  - Researched the real upstream PicPeak repo (`github.com/PicPeak/picpeak`) via GitHub API (`gh api`) to find the introducing commit for each of the four required capabilities, then verified all four are present together at a single commit and that it's an ancestor of `main`.
  - **PICPEAK_CAPABILITY_AUDIT.md** — records evidence per capability (Projects grouping → `eb263137b98935754155824de2a03848121304b6`, 2026-06-06; customer accounts → `087ef459`, 2026-05-10; webhooks → `c488f481`, 2026-04-28; S3-compatible storage → `1b717ce5`, 2026-04-28), confirms all four files coexist at `eb263137...` with blob SHAs, confirms it's an ancestor of `main` via the compare API, and states the blocking-finding condition is **not** triggered since a single commit provides all four.
  - **src/lib/capabilityAudit.ts** — `auditCapabilities()`, pure logic that takes capability evidence records and returns `allPresent`/`blockingFinding` (the reusable decision logic behind the AC's blocking-finding requirement).
  - **src/__tests__/us15-ac15.2-picpeak-capability-audit.test.ts** — 9 tests covering the audit logic (all-presen …
  AC-15.3 implemented (local checks green): Implemented AC-15.3 on `feature/US-15`:
  
  - **`PICPEAK_UPSTREAM.md`** — records upstream URL (`https://github.com/PicPeak/picpeak`), pinned commit hash (`eb263137b98935754155824de2a03848121304b6`, matching the AC-15.2 candidate), source branch (`main`), date pinned (2026-07-31), the future-update evaluation process (trigger → diff range → re-verify licence/capabilities → check `FORK_CHANGELOG.md`/`UPSTREAM_SYNC.md` conflicts → record decision → never partial-adopt), and an explicit statement that production must never track a floating upstream branch.
  - **`src/lib/upstreamPin.ts`** — `validatePin` decision logic enforcing the pin is a full 40-char commit hash (not a branch/tag), plus required URL/ref/date fields.
  - **`src/__tests__/us15-ac15.3-picpeak-upstream-pin.test.ts`** — 14 tests covering `validatePin` (accept valid pin; reject branch name, short SHA, empty fields, bad date) and the document's required content.
  
  Full suite: 45 suites / 779 tests passing; new `upstreamPin.ts` at 100% coverage.
  AC-15.4 implemented (local checks green): **AC-15.4 implemented, committed as `e68b474` on `feature/US-15`.**
  
  **Files changed:**
  - `THIRD_PARTY_NOTICES.md` (new) — reproduces the PicPeak upstream MIT licence text and copyright notice in full (cross-referenced to the pin in `PICPEAK_UPSTREAM.md` and the verification in `PICPEAK_LICENCE_VERIFICATION.md`), plus a second section covering other third-party code already copied into this repo: the bundled `public/photobuddy` libraries (jQuery MIT, FlexSlider GPLv2+, Theia Sticky Sidebar MIT, Themedo's Skeleton grid CSS — explicitly flagged as carrying no stated licence rather than assuming one) and the PhotoBuddy template's own commercial ThemeForest copyright notice.
  - `src/lib/thirdPartyNotices.ts` (new) — `checkNoticeCompleteness`, pure logic deciding whether a notice entry has a non-empty component, copyright, and full (not just named) licence text.
  - `src/__tests__/us15-ac15.4-third-party-notices.test.ts` (new, 14 tests) — verifies the file exists, reproduces the PicPeak licence text verbatim, cites the pinned commit, includes a notice per bundled library, and that every quoted copyright line actually appears in the source file it credits (not fabricated).
  
  Full suite: 46 t …
  AC-15.5 implemented (local checks green): AC-15.5 implemented and committed on `feature/US-15`.
  
  **Summary:**
  - `FORK_CHANGELOG.md` — new file. Initialised with a `baseline` entry recording the pinned commit (`eb263137b98935754155824de2a03848121304b6`), documents the entry shape (`baseline`/`deviation`, dated, files-touched required for deviations), and states it's the place every deliberate deviation from upstream gets recorded.
  - `UPSTREAM_SYNC.md` — new file. States the sync policy is **merge, not rebase** (with rationale: preserves commit-hash references in `FORK_CHANGELOG.md`/`PICPEAK_UPSTREAM.md`, avoids replaying migration edits), and names files most likely to conflict on a future update (storage backend, webhooks, migrations, `package.json`, `.env.example`).
  - `src/lib/forkChangelog.ts` — `validateChangelogEntry`: pure logic requiring `deviation` entries to name touched files.
  - `src/lib/upstreamSync.ts` — `validateSyncPolicy`: pure logic requiring a valid strategy, ≥1 conflict-prone file, and a rationale.
  - `src/__tests__/us15-ac15.5-fork-changelog-upstream-sync.test.ts` — 19 tests covering both decision-logic functions and doc content assertions.
  
  Full suite: 822/822 tests pass, `tsc --noEmit` clean, coverage 98 …
  AC-15.6 implemented (local checks green): AC-15.6 implemented and committed as `919c31a` on `feature/US-15`. Working tree clean.
  
  ## Implementation summary
  
  **Files added**
  - `vendor/picpeak/` (933 files, 21 MB) — the PicPeak fork vendored at pinned upstream commit `eb263137b98935754155824de2a03848121304b6`. Tree only; the upstream `.git` directory is deliberately not vendored so there is no floating history. One upstream-tracked file (`backend/docs/SECURITY_LOGGING.md`) is masked by upstream's own `.gitignore` and was force-added to keep the vendored tree faithful.
  - `vendor/README.md` — declares `vendor/` as the separated third-party location, states the no-edit rule for already-shipped upstream migrations (deviations go in a new higher-numbered migration + `FORK_CHANGELOG.md`), and lists where the boundary is enforced.
  - `src/lib/picpeakMigrationManifest.ts` — git blob SHA-1 of all 127 files under `backend/migrations/` exactly as shipped at the pinned commit.
  - `src/lib/picpeakMigrationIntegrity.ts` — `gitBlobSha()`, injectable-IO `verifyMigrationsUnmodified()`, and `verifyVendoredMigrations()` which recompute hashes from disk and report `modified` / `missing` violations. Any edit to a migration, down to whitespace, cha …

**Tester Status:** approved
**Tester Notes:**
  Requirements validated for testability. Each AC has an explicit verification method (read the licence file directly, compare fork migrations against pinned upstream, record commit/hash/date in named files) rather than relying on assertion. AC-15.1's stop condition (non-MIT licence -> po-requests.md) and AC-15.2's blocking-finding condition are both binary and checkable. Approved as written.

---

### US-16: Boot the forked Backstage in a production-like Docker environment on PostgreSQL and existing R2 credentials
**Status:** done | **Priority:** critical

#### Acceptance Criteria
- [x] **AC-16.1:** The forked Backstage, its database, and any worker or cache component it requires all run as services defined in `docker-compose.yml`. Nothing is installed on the host machine, and services address each other by Docker network hostname rather than localhost.
  - Dev: done
- [x] **AC-16.2:** The Backstage runs on PostgreSQL — not on any development-only database the upstream may default to — and its migrations complete cleanly against an empty database.
  - Dev: done
- [x] **AC-16.3:** The Backstage is configured to use the project's existing Cloudflare R2 bucket through its S3-compatible storage settings. No new parallel bucket is created. If the existing R2 credentials cannot be obtained, the story is blocked and recorded in `scrum-master/po-requests.md` rather than worked around with a substitute store.
  - Dev: done
- [x] **AC-16.4:** `.env.example` documents every environment variable the Backstage needs, with safe placeholder values and a comment for each explaining what it is and where the real value comes from. No real secret is committed.
  - Dev: done
- [x] **AC-16.5:** A documented, repeatable start-up procedure exists that takes a clean checkout to a running Backstage with an administrator able to sign in, and it is exercised end to end at least once with the result recorded.
  - Dev: done
- [x] **AC-16.6:** The migration path is proven safe as far as it can be at this point in the sprint. Two runs are executed and their command output recorded: (a) a fresh install applies the pinned upstream migrations cleanly to an empty database, and (b) the same migration command re-run against that now-already-migrated database completes as a no-op — no error, no re-application, no data loss — with the migration-state table (or the upstream's equivalent record) shown before and after to prove the runner is idempotent and safe against an existing install. Proving an upgrade that applies *our own* extension migrations on top of an already-migrated upstream database is explicitly out of scope for this story: under Fork Discipline no such migration exists yet, and inventing a throwaway one would prove nothing real. That proof is deferred to the sprint that introduces the first extension migration, and `UPSTREAM_SYNC.md` records the deferral so it is not lost.
  - Dev: done

**Dependencies:** US-15

**Dev Team Status:** not-started
**Dev Team Notes:**
  AC-16.1 implemented (local checks green): Done. Working tree clean, still on `feature/US-16`, nothing pushed.
  
  ## Implementation summary — US-16 / AC-16.1
  
  **State on arrival:** the previous agent's commit `326d26b` had already added the three Backstage services and the AC test. I verified that work rather than duplicating it, then found and fixed one real defect it left.
  
  **Files changed (this session, commit `df59e72`):**
  - `docker-compose.yml` — added a default-network alias `backend` to the `backstage-backend` service. The vendored `vendor/picpeak/frontend/nginx.conf` hardcodes `proxy_pass http://$backend_upstream:3000` with `set $backend_upstream backend;`, resolved at request time through Docker DNS (`resolver 127.0.0.11`). Our service is named `backstage-backend`, so without the alias every `/api` request from the frontend would fail DNS resolution. Fixed in compose rather than by editing the vendored config, preserving Fork Discipline.
  - `src/__tests__/us16-ac16.1-backstage-docker-services.test.ts` — added a test that pins the nginx proxy target and the compose alias together, so an upstream rename of that hostname fails loudly instead of silently breaking routing.
  
  **Already in place from `326d26b` (verified, not …
  AC-16.2 implemented (local checks green): AC-16.2 is complete and committed on `feature/US-16`.
  
  ## Implementation summary
  
  **Files changed (1 commit, `aedaf49`):**
  - `src/__tests__/us16-ac16.2-backstage-postgres-migrations.test.ts` (new, 12 tests) — pins the configuration that makes the Postgres migration outcome deterministic: `DATABASE_CLIENT=pg` set inline in `environment:` (so it outranks `env_file: .env`), `NODE_ENV` routed to `knexfile.js`'s production block rather than its `sqlite3` development default, no `DATABASE_PATH`/`TEST_DATABASE_PATH` sqlite escape hatch, `backstage-db` running the official `postgres:` image, credentials/DB-name wired end-to-end between backend and db, backend gated on `service_healthy`, and the vendored entrypoint running `npm run migrate:safe` *before* `exec "$@"` hands off to the server.
  
  No production code changed. The compose wiring itself (`DATABASE_CLIENT: pg`, `NODE_ENV: ${NODE_ENV:-production}`, dedicated `backstage-db`) already landed with AC-16.1, so this AC's deliverable is the proof and the regression lock. No vendored file was edited — Fork Discipline holds. No dependency changes, so no `package-lock.json` update.
  
  **Live verification (run by me, from a genuinely empty databas …
  AC-16.3 implemented (local checks green): AC-16.3 implemented and committed on `feature/US-16`.
  
  **Summary:**
  - `docker-compose.yml` — added `STORAGE_BACKEND=s3` plus `STORAGE_S3_BUCKET`, `STORAGE_S3_REGION`, `STORAGE_S3_ENDPOINT`, `STORAGE_S3_ACCESS_KEY`, `STORAGE_S3_SECRET_KEY`, `STORAGE_S3_PREFIX`, `STORAGE_S3_FORCE_PATH_STYLE` to the `backstage-backend` service environment. These map directly to the project's existing `R2_*` vars (already in `.env`/`.env.example` from US-2) — no new bucket, no new credential set. `STORAGE_S3_PREFIX=backstage` namespaces objects within the shared bucket so Backstage and the Payload app's uploads don't collide.
  - `src/__tests__/us16-ac16.3-backstage-r2-storage.test.ts` (new, 9 tests) — verifies the compose config selects the `s3` backend, reuses `R2_BUCKET`/`R2_ENDPOINT`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`, uses a prefix rather than a new bucket, that the vendored fork's storage module (`vendor/picpeak/backend/src/services/storage/index.js`) actually implements those exact env var names, and that the real R2 credentials in `.env` are non-placeholder (so the story is not blocked).
  
  Credentials were obtainable — real R2 values already exist in `.env` (bucket `earthandhoney`) — so no …
  AC-16.4 implemented (local checks green): **Summary:**
  
  - `.env.example` — added a new "Backstage" section documenting every env var referenced by the `backstage-db`, `backstage-backend`, and `backstage-frontend` services in `docker-compose.yml`: `NODE_ENV`, `BACKSTAGE_DB_NAME`, `BACKSTAGE_DB_USER`, `BACKSTAGE_DB_PASSWORD`, `BACKSTAGE_JWT_SECRET`, `BACKSTAGE_ADMIN_USERNAME`, `BACKSTAGE_ADMIN_EMAIL`, `BACKSTAGE_ADMIN_PASSWORD`, `BACKSTAGE_API_URL` — each with a safe placeholder value and an explanatory comment (what it is, where the real value comes from). R2_* vars were already documented (reused from US-2) and untouched.
  - `src/__tests__/us16-ac16.4-env-example-backstage-vars.test.ts` (new, 20 tests) — parses `docker-compose.yml` to extract every `BACKSTAGE_*` var actually referenced, asserts each has a non-empty placeholder in `.env.example` with no gaps, checks `NODE_ENV` is documented, verifies explanatory comments exist, checks placeholders don't look like real credentials, and confirms `.env` stays gitignored.
  - Full suite: 52 test files, 911 tests, all passing. No dependency changes — no `package-lock.json` update needed.
  AC-16.5 implemented (local checks green): Implemented AC-16.5 for US-16.
  
  **Summary:**
  - `BACKSTAGE_STARTUP.md` (new): a documented, repeatable start-up procedure — clean checkout → `cp .env.example .env` → `docker compose --profile backstage up -d --build backstage-db backstage-backend backstage-frontend` → wait for `backstage-backend` healthy → sign in as admin via the nginx frontend on port 3100. Includes a "Recorded run" section with verbatim output from actually executing it end to end today (`down -v` first to guarantee a clean state): 96 migrations applied, health check → `healthy`, `admin_users` had exactly one seeded row, and `POST http://localhost:3100/api/auth/admin/login` with the unmodified `.env.example` defaults returned `200 OK` with a `Set-Cookie: admin_token=...` session cookie. Explicit `Result: **PASS**`.
  - `src/__tests__/us16-ac16.5-backstage-startup-runbook.test.ts` (new, 12 tests, all passing): pins the runbook's required steps and the recorded evidence (migration summary, health status, 200 response with cookie, PASS verdict) so the proof can't silently rot out of the doc.
  
  Full suite: 53 test suites / 925 tests passing, coverage 98.46% statements. No dependency changes. Docker services torn down af …
  AC-16.6 already satisfied on the story branch (no new commit; Tester-verified): Already fully satisfied — the previous session's commits already completed this AC.
  
  **ALREADY-SATISFIED** — evidence:
  - `MIGRATION_IDEMPOTENCY.md` (commit `cf43bb4`) records both required proof runs: (a) fresh install applying all 96 pinned migrations cleanly to an empty database with before/after migration-table row counts, and (b) the identical command re-run against the already-migrated database completing as a no-op (Applied: 0), including a second re-run confirming steady-state convergence, plus explicit no-data-loss checks (unchanged `applied_at` timestamps, table counts, seeded admin user).
  - `UPSTREAM_SYNC.md` §3 (same commit) records the deferral of proving our own extension-migration upgrade path, citing Fork Discipline as the reason none exists yet.
  - `src/__tests__/us16-ac16.6-migration-idempotency.test.ts` — Jest suite pinning the recorded evidence in both docs so it can't silently rot, cleaned up in follow-up commit `42bf2b9` (removed an unused `idx` variable).
  
  No further changes needed; leaving the branch as-is with no new commit.
  US-16 CI fix: ## Summary
  
  The Tester's coverage-threshold theory didn't hold up: reproducing CI exactly (placeholder `.env`, same `--coverage --coverageThreshold` flags, in Docker) showed overall coverage at 99.3%/97.9%/91.8%/99.3% — well clear of the 80% gate.
  
  The real failure was in `src/__tests__/us16-ac16.3-backstage-r2-storage.test.ts:68-80`: a test asserting the local `.env` has real (non-placeholder) R2 credentials, guarded only by "does `.env` exist." CI's "Prepare env file" step (`cp .env.example .env`) means `.env` always exists in CI — just with placeholder values — so the guard never fired and the assertion failed against `change-me-in-production`.
  
  **Fix:** the guard now also skips when the `R2_BUCKET` value is still the documented placeholder, consistent with the `hasLiveR2Config()` pattern already used elsewhere in the suite. Verified both ways in Docker: passes with placeholder `.env` (CI scenario) and still passes with the real local `.env` restored afterward.
  
  Committed as `1b54e42` on `feature/US-16`. Not pushed, per instructions — the orchestrator will re-run local checks and push.

**Tester Status:** approved
**Tester Notes:**
  US-16 CI diagnosis: This confirms the diagnosis. My findings:
  
  ## Diagnosis: environment/integration gap, not a code bug — AC-16.4 vs. the coverage gate
  
  **What's failing:** the `test` job's "Run tests with coverage" step, which runs with a hard-coded `--coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80}}'` gate (`.github/workflows/ci.yml:69`).
  
  **Root cause:** three pre-existing "live round-trip" test files (`us2-ac2.3-media-variant-urls`, `us2-ac2.4-alt-text-required`, `us3-ac3.3-admin-ui-image-management` — just touched by this branch's latest commit, `75fa311`) contain a guard:
  
  ```ts
  function hasLiveR2Config(): boolean {
    const endpoint = process.env.R2_ENDPOINT || ''
    return endpoint.length > 0 && !endpoint.includes('change-me-in-production')
  }
  ```
  
  They only execute their real upload/round-trip bodies (which exercise a meaningful slice of the R2/S3-adapter and auth code paths) when `R2_ENDPOINT` is a *real* value. Otherwise they early-`return` and contribute almost nothing to coverage.
  
  - **Locally**, this dev's `.env` has real R2 credentials (recorded in `sprint3.json`'s `available_configuration` note), so `hasLiveR2Config()` is true, the live bodies actually run, and the …

---

### US-17: Prove the forked Backstage delivers the real photography flow before we build on it
**Status:** in-progress | **Priority:** critical

#### Acceptance Criteria
- [ ] **AC-17.1.1:** A Client record can be created in the running Backstage through the interface upstream provides (admin UI or API), and it persists: after a container restart the same Client is still retrievable with the values it was created with. The exact creation route used (screen or endpoint) and the resulting database row are recorded in `PIVOT_AUDIT.md`.
  - Dev: implemented
- [ ] **AC-17.1.2:** A Project record can be created in the running Backstage and linked to the Client created in AC-17.1.1. Reading the Project back shows the Client it belongs to, and the link is stored as a real foreign-key relationship in PostgreSQL, not a free-text field. If upstream models Projects and Clients differently than the PRD assumes, that is written up in `PIVOT_AUDIT.md` rather than worked around.
  - Dev: implemented
- [ ] **AC-17.1.3.1:** A Gallery record can be created inside the Project from AC-17.1.2 through the interface upstream provides (admin UI or API), and it persists: reading the Gallery back returns it with the values it was created with. The exact creation route used (screen or endpoint), the resulting database row, and the column that carries the Project association are recorded in `PIVOT_AUDIT.md`. If upstream names or models the Gallery differently than the PRD assumes (for example as an event, a share, or a collection), that is written up in `PIVOT_AUDIT.md` rather than worked around.
  - Dev: implemented
- [ ] **AC-17.1.3.2:** The Project-to-Gallery direction resolves: opening or querying the Project from AC-17.1.2 lists the Gallery created in AC-17.1.3.1. The exact query or screen used to prove this direction, and its output, are recorded in `PIVOT_AUDIT.md`.
  - Dev: implemented
- [ ] **AC-17.1.3.3:** The Gallery-to-Project-to-Client direction resolves: opening or querying the Gallery from AC-17.1.3.1 identifies both its Project from AC-17.1.2 and the owning Client from AC-17.1.1. The exact query or screen used to prove this direction, and its output, are recorded in `PIVOT_AUDIT.md`. If the Client is only reachable by a second lookup through the Project rather than directly from the Gallery, that is recorded as the actual upstream shape rather than worked around.
  - Dev: implemented
- [ ] **AC-17.2:** A batch of real images can be uploaded and processed. Every uploaded original is stored in R2 exactly once, the expected derivative sizes are produced, and stored image records include width, height, aspect ratio, format, file size, and processing state.
  - Dev: implemented
- [ ] **AC-17.3:** Gallery protection works as delivered by upstream: a password-protected gallery refuses access without the password, and grants it with the password.
  - Dev: implemented
- [ ] **AC-17.4.1.1.1.1.1.1:** The expiry search is defined and run against the pinned commit, and the commands are recorded so a reader can re-run them verbatim. `PIVOT_AUDIT.md` states the pinned commit and the set of search terms used — at minimum `expir`, `expires_at`, `expiry`, `ttl`, `valid_until`, `lifetime`, with any further term the auditor adds listed alongside them — and records the exact commands that ran those terms across the fork's backend source directory and its migration directory at that commit, including the directories searched and any file-type filter, written out so a reader can re-run them verbatim against the same commit and get the same result. For each recorded command the audit also records how many matching lines it returned, so the volume of output the two criteria that follow work from is fixed and checkable rather than open-ended. No names are extracted and nothing is classified at this criterion: the re-runnable commands and their recorded hit counts are the deliverable. This criterion is a code-level finding: no live gallery has to be created or changed for it.
  - Dev: implemented
- [ ] **AC-17.4.1.1.1.1.1.2:** The migration-directory output of that search is reduced to a deduplicated list of names. Using only the commands recorded in AC-17.4.1.1.1.1.1.1, re-run against the same pinned commit, `PIVOT_AUDIT.md` records every distinct field, column, or setting name those commands surface inside the fork's migration directory, deduplicated so each name appears once. Names that differ only in spelling — a snake_case column and the camelCase form the fork uses for the same underlying value — are recorded together as a single entry naming both spellings rather than as two entries. The list states the recorded hit count it was reduced from, so the reduction from raw output to names is visible. Nothing is classified at this criterion and no name is dropped for looking irrelevant. This criterion is a code-level finding: no live gallery has to be created or changed for it.
  - Dev: implemented
- [ ] **AC-17.4.1.1.1.1.1.3:** The backend-source output is reduced to names and merged with the migration list into the one inventory the criteria that follow divide. Using only the commands recorded in AC-17.4.1.1.1.1.1.1, `PIVOT_AUDIT.md` records every distinct field, column, or setting name those commands surface inside the fork's backend source directory, applying the same deduplication and the same one-entry-per-value treatment of camelCase and snake_case spellings as AC-17.4.1.1.1.1.1.2, and then merges that list with the migration-directory list into a single deduplicated inventory in which each underlying value appears exactly once, noting for each entry whether it was surfaced in the backend source, in the migrations, or in both. Every name recorded in AC-17.4.1.1.1.1.1.2 appears in the merged inventory, so nothing is lost between the two halves of the search. Nothing is classified at this criterion and no name is dropped for looking irrelevant: the merged inventory is the deliverable, and it is the list AC-17.4.1.1.1.1.2 and AC-17.4.1.1.1.1.3 divide between them. This criterion is a code-level finding: no live gallery has to be created or changed for it.
  - Dev: implemented
- [ ] **AC-17.4.1.1.1.1.2:** The occurrences that are not about a Gallery's own expiry are named as ruled out, with evidence. Working from the merged inventory recorded in AC-17.4.1.1.1.1.1.3, `PIVOT_AUDIT.md` gathers every name that does not express a Gallery's own lifetime into named groups, and records each group as ruled out with a one-line reason saying what the value actually governs and at least one file and line against the pinned commit. The fork uses expiry wording for admin sessions, guest tokens and share links, and each of those is named explicitly as a ruled-out group rather than left unmentioned. A name is ruled out only on the evidence cited, never because it looked unpromising. This criterion is a code-level finding: no live gallery has to be created or changed for it.
  - Dev: implemented
- [ ] **AC-17.4.1.1.1.1.3:** The candidate shortlist is stated and reconciled against the full inventory. Every name in the AC-17.4.1.1.1.1.1.3 merged inventory that AC-17.4.1.1.1.1.2 did not rule out is recorded in `PIVOT_AUDIT.md` as a candidate for the Gallery's own expiry, each with a one-line reason and at least one file and line against the pinned commit. The audit then reconciles the two lists and states that every name in the inventory appears exactly once, either as a candidate or inside a ruled-out group, so nothing the search surfaced is silently dropped; any name that cannot yet be placed either way is listed as unresolved with the reason rather than omitted. The shortlist recorded here is the output of this group of criteria as a whole, and it is what AC-17.4.1.1.1.2 confirms from code. This criterion is a code-level finding: no live gallery has to be created or changed for it.
  - Dev: implemented
- [ ] **AC-17.4.1.1.1.2.1:** Each candidate on the shortlist is settled as confirmed or ruled out, with the evidence that settled it. Working from the candidate shortlist recorded in AC-17.4.1.1.1.1.3, `PIVOT_AUDIT.md` records a disposition for every entry on that shortlist against the pinned commit: either confirmed as participating in a Gallery's own expiry on the Gallery path, or not the gallery-lifetime field — in which case it is moved to the ruled-out list begun in AC-17.4.1.1.1.1.2, placed in a named group there, with the file and line that settled it. Every disposition carries a one-line reason and at least one file and line against the pinned commit, and is settled from application code rather than from documentation or assumption; a candidate is never confirmed or ruled out because it looked promising or unpromising. The audit then reconciles the two lists and states that every shortlist entry appears exactly once, either in the confirmed set or inside a ruled-out group, so the shortlist, the ruled-out list, and the confirmed set stay consistent; any entry that cannot yet be settled either way is listed as unresolved with the reason rather than omitted. No field's role and no set-or-read evidence is required at this criterion: the confirmed set and the corrected ruled-out list are the deliverable, and the confirmed set is what AC-17.4.1.1.1.2.2 and AC-17.4.1.1.1.2.3 evidence on the write and read paths. This criterion is a code-level finding: no live gallery has to be created or changed for it.
  - Dev: implemented
- [ ] **AC-17.4.1.1.1.2.2:** The write path is evidenced: where each confirmed field is set when a Gallery is created or edited. For every field in the confirmed set recorded in AC-17.4.1.1.1.2.1, `PIVOT_AUDIT.md` records with file and line evidence against the pinned commit the code that writes or otherwise determines it on the Gallery path — where it is set when a Gallery is created, and where it is set or changed when a Gallery is edited. If more than one field participates, each is recorded with the role it plays on that path. Where a confirmed field is never written on the Gallery path because it is derived, computed, or supplied as a default or a policy value rather than stored, that is recorded as the actual upstream shape with the file and line establishing it, rather than worked around or left blank. Every field in the confirmed set is accounted for here, so none is left without a write-path disposition. This criterion introduces no new candidates and moves nothing between the confirmed and ruled-out lists on its own; if inspection here contradicts a disposition recorded in AC-17.4.1.1.1.2.1, the contradiction is recorded with the file and line that settled it and both lists are corrected, so the shortlist and the confirmed set stay consistent. This criterion is a code-level finding: no live gallery has to be created or changed for it.
- [ ] **AC-17.4.1.1.1.2.3:** The read path is evidenced and the confirmed finding is stated. For every field in the confirmed set recorded in AC-17.4.1.1.1.2.1, `PIVOT_AUDIT.md` records with file and line evidence against the pinned commit the code that reads it on the Gallery path — where it is read when a Gallery is served, and where it is read when an access decision is made — stating for each read whether it gates access, only reports state, or does both. Where a confirmed field is never read on the Gallery path, that is recorded as the actual upstream shape with the evidence establishing it rather than worked around. The same consistency rule as AC-17.4.1.1.1.2.2 applies: nothing moves between the confirmed and ruled-out lists except with the file and line that settled it, recorded in both places. The audit then closes with the finding this group of criteria exists to produce — a plain statement of the field or fields the pinned fork uses to express a Gallery's own expiry, each with the role it plays — drawn only from the code evidence recorded in AC-17.4.1.1.1.2.1 through this criterion, not from documentation or assumption. That statement is the field or fields AC-17.4.1.1.1.3 identifies the PostgreSQL column for and AC-17.4.1.1.2 looks for a scheduled process against. This criterion is a code-level finding: no live gallery has to be created or changed for it.
- [ ] **AC-17.4.1.1.1.3:** The PostgreSQL table and column that carry the value are identified from the schema that creates them. For the field or fields confirmed in AC-17.4.1.1.1.2.1 and stated with its role in AC-17.4.1.1.1.2.3, `PIVOT_AUDIT.md` records the table and column name together with the upstream migration or schema definition that creates it — migration filename, file and line against the pinned commit — and the column's declared type, nullability, and default. Where a confirmed field has no column of its own because it is derived or carried inside another value, that is recorded as the actual upstream shape rather than worked around. This is the column AC-17.4.1.2 later reads directly from PostgreSQL, so it is recorded precisely enough to be queried verbatim. This criterion is a code-level finding: no live gallery has to be created or changed for it.
- [ ] **AC-17.4.1.1.2:** The scheduled process that acts on the expiry field, and how it is triggered, are located in code. Any scheduled process in the pinned fork that acts on the field or fields confirmed in AC-17.4.1.1.1.2.1 and stated with its role in AC-17.4.1.1.1.2.3 is identified from code with file and line evidence against the pinned commit, together with how it is triggered — cron expression, timer interval, or on request — and the file and line where that trigger is registered or started. If the pinned fork has no scheduled process acting on those fields at all, that absence is itself the finding and is recorded with the evidence establishing it: where such a process would be registered, and what was searched to conclude it is not there. Recorded in `PIVOT_AUDIT.md`. This criterion is a code-level finding: no live gallery has to be created or changed for it.
- [ ] **AC-17.4.1.1.3:** Upstream's expiry model is written up against what the PRD assumes. `PIVOT_AUDIT.md` states plainly how the pinned fork's expiry model, as found in AC-17.4.1.1.1.1.1.1 through AC-17.4.1.1.1.3 and AC-17.4.1.1.2, compares with the PRD's assumption. Where upstream expresses expiry differently — for example only as an archive or deactivation state, or with no scheduled process at all — the difference is written up as the actual upstream shape rather than worked around, and no fork patch is made to close it. Where the two agree, that is stated too, so the comparison is a recorded finding rather than a silence. This criterion draws only on the code evidence already recorded by the two preceding criteria; no new investigation and no live gallery are required.
- [ ] **AC-17.4.1.2:** The pre-expiry client-facing baseline is recorded. While the Gallery from AC-17.1.3.1 is still unexpired, `PIVOT_AUDIT.md` records its stored expiry value read directly from PostgreSQL using the column identified in AC-17.4.1.1.1.3, and one exact client-facing request that currently succeeds — the request as issued, its status code, and enough of the response body to show the gallery is being served. This is the request AC-17.4.2 re-runs after expiry, so it is recorded precisely enough to be repeated verbatim.
- [ ] **AC-17.4.1.3:** The pre-expiry photographer-facing baseline is recorded. While the Gallery from AC-17.1.3.1 is still unexpired, one photographer-facing screen or endpoint that currently shows it as live is identified and recorded in `PIVOT_AUDIT.md`: the exact screen or query, its output, and the field carrying the live-versus-expired state. If the only photographer-visible signal is a raw expiry date the photographer must interpret themselves rather than an explicit state, that is recorded as the actual upstream shape rather than worked around. This is the surface AC-17.4.3 re-checks after expiry, so it is recorded precisely enough to be repeated verbatim.
- [ ] **AC-17.4.2:** Past its expiry, the gallery no longer grants client access. The Gallery from AC-17.1.3.1 is brought past its expiry through the interface upstream provides (admin screen, endpoint, or the scheduled expiration process), and the exact client-facing request recorded as succeeding in AC-17.4.1.2 is re-run and is now refused — with the status code and response body recorded in `PIVOT_AUDIT.md`. It is also recorded whether a client session or token issued before expiry is still accepted afterwards, since a session that outlives the expiry is a real gap rather than a detail. If upstream provides no supported route for setting an expiry in the past and the value has to be changed directly in the database, that is recorded as the actual upstream shape rather than presented as a supported flow. No fork patch and no workaround — any gap goes to `PIVOT_AUDIT.md` and `scrum-master/po-requests.md` per AC-17.9.
- [ ] **AC-17.4.3:** The expired state is visible to the photographer. The photographer-facing screen or endpoint recorded in AC-17.4.1.3 is re-checked after the expiry proven in AC-17.4.2, and now reports the Gallery as expired — with the exact screen or query, its output, and the field carrying the state recorded in `PIVOT_AUDIT.md`. It is recorded whether that visibility is immediate or only appears once the scheduled expiration process runs; if a scheduled process is required, it is actually triggered and its output recorded, along with any side effect it performs (archiving, deactivation, or a queued notification). If the only photographer-visible signal is a raw expiry date the photographer must interpret themselves, or an email rather than a state in the interface, that is recorded as the actual upstream shape rather than worked around.
- [ ] **AC-17.5:** A client can view the gallery through its client-facing route and download images where the gallery's download policy permits, including any archive download the upstream provides.
- [ ] **AC-17.6:** At least one operational gallery email is sent through the Backstage email system to a capture inbox or mail catcher, and its queued/sent state is visible.
- [ ] **AC-17.7:** At least one Backstage webhook fires and is received by a listener that logs the payload, proving the outbound integration path we will later use to refresh Frontstage content.
- [ ] **AC-17.8:** The bundled gallery style templates render unmodified, and a copy of each original template file is preserved so future Earth & Honey variants can be diffed against the untouched baseline. `PICPEAK_PORT_LEDGER.md` records every template copied and where it is used.
- [ ] **AC-17.9:** Findings are recorded honestly: anything that does not work as the PRD assumed is written up in `PIVOT_AUDIT.md` and raised to the Product Owner rather than quietly patched.
- [ ] **AC-17.10:** PicPeak's native contract-signing capability is verified against the actual pinned commit, not assumed from documentation or memory: typed name capture, a consent checkbox, a drawn signature, signer IP address and timestamp, a frozen snapshot of the signed contract contents, a SHA-256 integrity hash, and an audit page baked into the delivered PDF. For each element, the evidence (file/line, or a reproduced signing flow) is recorded in `PIVOT_AUDIT.md`. If any element is missing or works differently than assumed in `CLAUDE.md`/PRD §29, this is written up honestly and raised in `scrum-master/po-requests.md` as reopening the contract-signing decision — no silent workaround, and no quiet fallback to an external e-sign vendor or manual upload.

**Dependencies:** US-16

**Dev Team Status:** not-started
**Dev Team Notes:**
  AC-17.1.1 implemented (local checks green): Committed on `feature/US-17` (not pushed).
  
  ## Implementation summary — AC-17.1.1
  
  **Status:** Implemented (partial work existed; completed, verified, and one regression fixed).
  
  **Files changed (2):**
  
  1. **`PIVOT_AUDIT.md`** — new `## AC-17.1.1 — Client creation and persistence` section recording:
     - **Which record is the "Client":** `customer_accounts` (from upstream migration `090_add_customer_accounts.js`), explicitly distinguished from `admin_users` (photographer/staff login).
     - **Creation route used:** `POST /api/admin/customers` — handler `vendor/picpeak/backend/src/routes/adminCustomers.js:232`, mounted at `vendor/picpeak/backend/server.js:687`, guarded by `adminAuth` + `requirePermission('customers.create')`, creating the row via `customerAccountsService.createDirect`. Admin session obtained through the real `/api/auth/admin/login` front door; session value redacted in the recorded command.
     - **Resulting database row:** `customer_accounts` id 3 read directly with `psql`, plus the 201 create response.
     - **Persistence:** `backstage-backend` restarted, waited to `healthy`, then the same row re-read through both the admin API and `psql` — identical id, field values …
  AC-17.1.2 implemented (local checks green): Committed on `feature/US-17` as `eaa3cbe`. Not pushed, still on the story branch.
  
  ## Implementation summary — US-17 AC-17.1.2
  
  **Status:** implemented (partial work from the previous agent was present, verified, corrected, and completed).
  
  **Files changed (2):**
  
  - **`PIVOT_AUDIT.md`** — new `## AC-17.1.2 — Project creation and Client linkage` section, plus `17.1.2` added to the front-matter `related-ac` list and purpose block. Records:
    - The Project↔Client link **is** a real Postgres FK — `projects_customer_account_id_foreign FOREIGN KEY (customer_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL`, created by upstream migration `117_add_projects.js`; `projectService.getProjectById` joins `customer_accounts` and `transformProject` exposes `customerAccountId`/`customerEmail`. The PRD's assumption holds here.
    - **An upstream defect, written up rather than worked around** (as this AC explicitly requires): `POST /api/admin/projects`, `PUT /api/admin/projects/:id`, and `POST /api/admin/projects/:id/events` are all gated on `requirePermission('events.manage')` (`adminProjects.js:32,54,74`), but **no migration in the pinned fork ever inserts a permission named `events.m …
  AC-17.1.3.1 implemented (local checks green): Working tree clean, commit landed on `feature/US-17`, nothing pushed.
  
  ## Implementation summary — AC-17.1.3.1
  
  **State found:** the previous agent had left a complete but **uncommitted** `PIVOT_AUDIT.md` write-up and no test suite. I independently re-verified every claim in that write-up against the live stack and the pinned fork before building on it — the Postgres row, the `events_project_id_foreign` constraint, the `projects` row it points at, and all eight cited file/line references all check out. I found one genuine gap and closed it.
  
  **Files changed (2):**
  
  - **`PIVOT_AUDIT.md`** (+~330 lines, new `## AC-17.1.3.1` section, placed ahead of the AC-14.6 block so that block stays last as AC-14.6 requires):
    - **Upstream models the Gallery differently** — written up, not worked around: there is no gallery or collection object in the pinned fork. The PRD's Gallery is the `events` table and the `/api/admin/events` route family.
    - **Creation route:** `POST /api/admin/events` (`adminEvents.js:330`). Unlike AC-17.1.2's Project routes this one *is* reachable — it gates on `events.create`, which the seed migration actually inserts, not the never-seeded `events.manage`. Full mount ch …
  AC-17.1.3.2 implemented (local checks green): Committed as `efc1187`.
  
  **Implementation summary — AC-17.1.3.2**
  
  - `PIVOT_AUDIT.md`: added a new `## AC-17.1.3.2` section (front-matter `related-ac` list updated too) documenting the exact query proving the Project-to-Gallery direction: `GET /api/admin/projects/1/overview` (`vendor/picpeak/backend/src/routes/adminProjects.js:83`, gated on the seeded `events.view` permission). It reuses the already-established AC-17.1.2 Project and AC-17.1.3.1 Gallery (no new records created) and records the response showing the Project's `events` array listing the Gallery by id/name, closing with an explicit verdict citing both directions (Gallery→Project from AC-17.1.3.1, Project→Gallery here).
  - `src/__tests__/us17-ac17.1.3.2-project-lists-gallery.test.ts`: new 14-test suite pinning the audit section content and independently re-verifying the cited route file/line against the pinned vendored fork source.
  - Full suite: 58 test files / 1063 tests pass, no regressions. No coverage threshold is configured in this repo.
  
  `tsconfig.json`'s pre-existing modification (present before this session started) was left untouched and not committed.
  AC-17.1.3.3 implemented (local checks green): Committed on `feature/US-17` as `5dd9249`. Not pushed.
  
  ## What I found and changed
  
  The previous agent left an uncommitted PIVOT_AUDIT.md section concluding that the Client is **only** reachable by a second lookup through the Project, because `GET /api/admin/events/3` returned `"customer_accounts": []`. I re-ran the evidence live against the running Backstage and that conclusion was wrong about the upstream shape:
  
  - Upstream **does** provide a direct Gallery→Client link — `event_customer_assignments`, populated via `customer_account_ids` on `POST`/`PUT /api/admin/events` (`adminEvents.js:419-420`, `:720-727`, `:1471-1478` → `customerAccountsService.setAssignmentsForEvent`).
  - A sibling gallery on the same instance (`events.id = 2`) already had that link populated and resolved the Client directly.
  - The array was empty for the AC-17.1.3.1 Gallery only because its create call omitted the field.
  
  I established the link through upstream's own admin edit route (no fork patch, no hand-seeded row), and `GET /api/admin/events/3` now returns `project_id: 1` **and** `customer_accounts[0].id: 3` in one query. Both directions resolve; the Project-overview second lookup is recorded as agreein …
  AC-17.2 implemented (local checks green): Committed to `feature/US-17`, not pushed.
  
  ## Implementation summary — AC-17.2
  
  The previous agent had left an uncommitted audit section and test file claiming a live Docker run. **I independently re-verified that evidence against the still-running stack before trusting it** — it is genuine:
  
  - **Live DB** (`earthandhoney-backstage-db-1`): all three `photos` rows match the recorded values exactly — widths 950/1920/350, heights 534/1080/262, sizes 15539/64450/5440, `mime_type=image/jpeg`, `processing_status=complete`, `hero_path` NULL, thumbnail/preview hashes as written.
  - **Live R2**: exactly one object per original at the precise source byte sizes, plus the recorded thumbnail and preview derivatives.
  - **Source files**: byte sizes, SHA-256, and pixel dimensions all match the audit.
  
  ### Files changed
  - **`PIVOT_AUDIT.md`** — AC-17.2 section: upload route and permission seeding (with file/line citations), processing to `complete`, R2 exactly-once + byte-identical proof, eager-vs-lazy derivative analysis, and a field-by-field table against the AC's list. Corrected one factual error: the schema has **37** columns, not 36 (verified via `\d photos`).
  - **`src/__tests__/us17-ac17.2-bat …
  AC-17.3 implemented (local checks green): Working tree clean, one new commit on `feature/US-17`, not pushed.
  
  ## Implementation summary — US-17 / AC-17.3
  
  **Status: implemented** (commit `1af65ed` — `[US-17] AC-17.3 implemented`)
  
  A previous agent left partial work on the branch (an uncommitted `PIVOT_AUDIT.md` section and an untracked test file, 2 of 33 tests failing). I re-verified its claims live rather than trusting them, then completed and corrected the work.
  
  ### Live re-verification performed
  Backstage was up (`docker compose --profile backstage`). I re-ran the whole sequence against `events.id = 3` (slug `wedding-ac-17-1-3-1-verification-gallery-2026-09-01`, `require_password = true`) and it reproduced exactly:
  
  | Step | Result |
  |---|---|
  | `GET /api/gallery/:slug/photos`, no token | `401 {"error":"No token provided"}` |
  | `POST /api/auth/gallery/verify`, wrong password | `401 {"error":"Invalid gallery or password"}`, logged as `login_fail` in `access_logs` |
  | `POST /api/auth/gallery/verify`, correct password | `200`, JWT issued, `gallery_token` + per-slug cookies set |
  | `GET .../photos` with that cookie jar | `200`, photo ids `[3, 2, 1]` (the AC-17.2 batch) |
  
  ### Files changed
  - **`PIVOT_AUDIT.md`** — AC-17.3 …
  AC-17.4.1.1.1.1.1.1 implemented (local checks green): Committed to `feature/US-17`.
  
  ## Summary
  
  Implemented AC-17.4.1.1.1.1.1.1 — the expiry-search definition/run/record deliverable.
  
  **Files changed:**
  - `PIVOT_AUDIT.md` — added front-matter entry and a new `## AC-17.4.1.1.1.1.1.1` section (inserted before the AC-14.6 recommendation section, which stays last). It states the pinned commit (`eb263137b98935754155824de2a03848121304b6`, cross-referenced to `PICPEAK_UPSTREAM.md`), the six required search terms (`expir`, `expires_at`, `expiry`, `ttl`, `valid_until`, `lifetime`) with no extra term added, the searched directories (`vendor/picpeak/backend/src`, `vendor/picpeak/backend/migrations`) and file-type filter (`*.js`, confirmed as the only non-markdown extension present), the exact `grep -rIn --include="*.js" -i -- "<term>" <src> <migrations>` command per term, and each command's matching-line count (697, 238, 87, 81, 47, 1), plus a source/migration split table. It also flags the known `ttl` substring-noise property (e.g. matches inside "settled") as a factual note about the search method, without classifying any hit — that's explicitly deferred to later criteria.
  - `src/__tests__/us17-ac17.4.1.1.1.1.1.1-expiry-search.test.ts` (new, …
  AC-17.4.1.1.1.1.1.2 implemented (local checks green): Committed to `feature/US-17`, working tree clean, not pushed.
  
  ## Implementation summary — AC-17.4.1.1.1.1.1.2
  
  Partial work existed from the previous agent (audit section + test file). I verified its factual claims against the vendored code, fixed a failing test and a cross-AC regression, and committed.
  
  **Files changed (2):**
  
  - **`PIVOT_AUDIT.md`** — new section *"AC-17.4.1.1.1.1.1.2 — migration-directory names: deduplicated list"*, plus the AC added to the front-matter `related-ac` list. Re-runs the six commands from AC-17.4.1.1.1.1.1.1 against the same pin (`eb26313…`), scopes output to `vendor/picpeak/backend/migrations`, and states the reduced-from count of **405** raw hits → 262 unique lines → **8 distinct names**. The two snake_case/camelCase pairs are single entries (`invite_expires_at`/`hasInviteExpiresAt`, `gallery_expired`/`galleryExpiredExists`). Nothing classified; the 67 prose-only lines and the two `ttl` false positives (`settled`, `Throttle`) are recorded as naming nothing rather than dropped. Code-level only — no live gallery.
  - **`src/__tests__/us17-ac17.4.1.1.1.1.1.2-migration-name-dedup.test.ts`** (new, with structured metadata header) — **25 tests**, all pass …
  AC-17.4.1.1.1.1.1.3 implemented (local checks green): Committed on `feature/US-17` (not pushed).
  
  ## Implementation summary — AC-17.4.1.1.1.1.1.3
  
  **Status:** implemented (commit `06586e3`). Partial work existed on the branch but was uncommitted and contained three factual errors plus a defect that broke an existing test suite; I verified every claim against the pinned fork, corrected it, and added the test suite.
  
  ### Files changed
  
  **`PIVOT_AUDIT.md`** — new `## AC-17.4.1.1.1.1.1.3` section (and front-matter `related-ac` entry) recording:
  - The same six commands from AC-17.4.1.1.1.1.1.1, same pinned commit `eb26313`, scoped to `vendor/picpeak/backend/src`: **746** raw hits → **546** unique lines → **118** carrying no name, each accounted for by a named bucket (prose, behaviour-describing function names, internal variables, `ttl` substring false positives), none silently dropped.
  - **33** distinct field/column/setting names with `file:line` evidence, camelCase/snake_case spellings of one value recorded as a single entry.
  - A merged inventory of **35** entries (33 backend + 8 migration, 6 shared collapsed), each underlying value exactly once, marked Backend source only / Migrations only / Both. All 8 AC-17.4.1.1.1.1.1.2 names carry th …
  AC-17.4.1.1.1.1.2 implemented (local checks green): Committed on `feature/US-17`, not pushed.
  
  ## Implementation summary — AC-17.4.1.1.1.1.2
  
  **Status:** Implemented (commit `9b43d38`). Partial work from the prior agent existed; I verified its citations, fixed the two failing tests, dropped unrelated churn, and committed.
  
  **Files changed (2):**
  
  - **`PIVOT_AUDIT.md`** (+223) — new section *"AC-17.4.1.1.1.1.2 — ruling out occurrences that are not about a Gallery's own expiry"*. Working from the 35-entry merged inventory recorded in AC-17.4.1.1.1.1.1.3, against the same pinned commit `eb263137b98935754155824de2a03848121304b6`:
    - Eight named ruled-out groups, each with a one-line **Governs:** statement and ≥1 `file:line` citation per row — **Admin sessions**, **Gallery-access and customer-portal session tokens**, **Guest tokens**, **Share links**, Internal cache and housekeeping constants, Session-token revocation bookkeeping, Business-document validity and status (quotes & contracts), HTTP cache-control header. The three groups the AC names explicitly (admin sessions, guest tokens, share links) each appear as their own group.
    - A contrast table recording the 14 entries that *stay aside* because they do express the Gallery's own ` …
  AC-17.4.1.1.1.1.3 implemented (local checks green): **Summary:**
  
  Implemented AC-17.4.1.1.1.1.3 by adding an `## AC-17.4.1.1.1.1.3` section to `PIVOT_AUDIT.md` (between the AC-17.4.1.1.1.1.2 ruled-out-groups section and the AC-14.6 recommendation section), which:
  
  - States the **candidate shortlist**: the 14 merged-inventory entries (E1's `events` occurrence, E4, E5, E6, E7, E10, E11, E12, E13, E16, E30, E31, E32, E33) that AC-17.4.1.1.1.1.2 did not rule out, each with a one-line reason and file:line evidence against the pinned commit `eb263137b98935754155824de2a03848121304b6`.
  - **Reconciles** all 35 merged-inventory entries in a single table, showing each entry's disposition (candidate vs. ruled-out group), with E1 recorded as an explicit **Split** row since it has both a candidate occurrence and nine ruled-out occurrences.
  - States the 14 + 21 = 35 accounting and an explicit "Unresolved entries: none" conclusion.
  - Updated the file's front-matter purpose/related-ac list accordingly.
  
  Added `src/__tests__/us17-ac17.4.1.1.1.1.3-candidate-shortlist-reconciled.test.ts` (105 tests) verifying: section placement, the 14-entry candidate table with reasons/evidence, full 35-entry reconciliation coverage, E1's split treatment, that every c …
  AC-17.4.1.1.1.2.1 implemented (local checks green): AC-17.4.1.1.1.2.1 is complete on `feature/US-17`.
  
  ## What I found and did
  
  The previous agent had already committed the substance of this AC (`6f0fe4c`). Rather than trust it, I re-verified every disposition against the vendored fork by opening the cited lines — all citations hold:
  
  - `auth.js:178-182` — the `expires_at` access gate and `GALLERY_EXPIRED` code (E1, E16)
  - `expirationChecker.js:25-30/44-50` — the `whereNotNull('expires_at')` queries feeding the warning and expiry emails (E5, E6)
  - `adminEvents.js:596-605` — `require_expiration` gating the block that computes `expires_at` from `expiration_days` (E7, E10, E12)
  - `gallery.js:186`, `adminDashboard.js:23-29`, `adminEvents.js:905-913`, `webhookService.js:17` + `expirationChecker.js:99-119` (E13, E30, E32, E33)
  - The `expirationChecker` ruling-out reproduces exactly: three occurrences in the backend source — a hardcoded `{ status: 'active' }` literal, a `require`, and a comment — and the module exports only `startExpirationChecker`.
  
  One real gap remained against the AC's wording. The AC requires the ruled-out entry be moved into *the ruled-out list begun in AC-17.4.1.1.1.1.2* and that the three lists "stay consistent," bu …

**Tester Status:** approved
**Tester Notes:**
  Requirements validated for testability. All 10 ACs specify a concrete, reproducible action and an observable result (create/associate records, upload and check derivative/metadata fields, password gate on/off, expiry state change visible, client download via client route, queued/sent email state, logged webhook payload, template-diff preservation, honest write-up routed to PIVOT_AUDIT.md/po-requests.md). AC-17.10 in particular requires file/line or reproduced-flow evidence per signing element and an explicit reopen-the-decision path if any element is missing -- this is the strongest AC in the sprint and needs no changes. Approved as written.

---

### US-18: Document system ownership and the Frontstage-to-Backstage boundary
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-18.1:** `SYSTEM_OWNERSHIP.md` exists and, for every domain in the ownership table in `CLAUDE.md`, names the single authoritative system, what the other systems may cache for display only, and what they are forbidden to write.
- [ ] **AC-18.2:** `PAYLOAD_PICPEAK_API_CONTRACT.md` exists and specifies the boundary between the Frontstage application and the Backstage: which direction each call travels, what each call is for, how it authenticates, what identifiers cross the boundary, what happens on failure or timeout, and what the Frontstage is allowed to cache and for how long.
- [ ] **AC-18.3:** The contract states that the Frontstage never reads the Backstage database directly and that no cross-database join exists anywhere in application code. Cross-system relationships are expressed as stored external identifiers.
- [ ] **AC-18.4:** The contract covers the three flows the next sprint depends on: a Frontstage page displaying a public gallery by referencing its Backstage gallery identifier, a Frontstage inquiry being converted into a Backstage client and project, and a Backstage change triggering a Frontstage content refresh.
- [ ] **AC-18.5:** The document records which Backstage surfaces are to be disabled because they duplicate our chosen architecture — its public landing-page content management, its native quote/invoice/accounting screens, and any page-building capability — and how each will be disabled or hidden.
- [ ] **AC-18.6:** A user-facing terminology mapping is recorded so internal names and the language the photographer sees never drift apart: the object PicPeak's own internal schema/UI calls an "Event" (its media-collection object) is presented to users as Gallery -- this is distinct from, and must not be confused with, this project's own controlled-vocabulary Event (a single dated occasion inside a Project, e.g. ceremony or reception) -- the customer account is called Client, the admin area is Backstage, and the customer portal is the Project Room.

**Dependencies:** US-17

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Requirements validated for testability; all ACs bind to checkable document content. One minor wording defect was found and fixed directly (not a scope issue): AC-18.6 originally read 'the internal event concept is called Gallery,' which collides with this project's own controlled-vocabulary term 'Event' (scrum-master.md, a dated occasion inside a Project) -- an implementer reading the AC in isolation could not tell whether it meant PicPeak's internal object or our own Event concept. Reworded to explicitly name PicPeak's internal 'Event' object as the thing being relabelled, and to call out that it is not our own Event term. No scope change; approved as amended.

---

### US-19: Decide and record the media-reuse model, and audit the existing R2 setup
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-19.1:** `MEDIA_REUSE_ADR.md` states, on evidence from the running fork, how tightly an image is currently bound to a single gallery, and whether one stored original can already be referenced by more than one gallery.
- [ ] **AC-19.2:** The decision record chooses exactly one path forward — keep the upstream binding for V1 with a safe promotion workflow, introduce a reusable media-asset and gallery-item layer through new migrations, or an equivalent low-risk model — and states the reasons, the risks, and what would have to be true to revisit the decision.
- [ ] **AC-19.3:** The chosen model guarantees that no original binary is stored twice, that per-gallery ordering and metadata overrides remain possible, that selected client images can be promoted into a public portfolio gallery deliberately, and that promoting one image can never expose the rest of a private gallery.
- [ ] **AC-19.4:** `R2_STORAGE_AND_DELIVERY_ADR.md` records the audit of the existing R2 setup: which bucket is in use, whether its permissions are least-privilege, whether browser upload access is correctly restricted, what lifecycle rules exist, and which paths are public versus private.
- [ ] **AC-19.5:** `R2_STORAGE_AND_DELIVERY_ADR.md` opens with the delivery-path decision explicitly marked UNDECIDED and lists the candidate paths to be benchmarked in the next sprint — serving through the Backstage, direct time-limited links, public delivery through a content-network domain, an edge authorisation layer, and a hybrid — together with the measurements that will decide it and the performance targets the decision is accountable to (no image-caused layout shift, mobile-first performance near ninety on representative public pages, largest-contentful-paint around two and a half seconds or better on a realistic mobile profile, and public pages never requesting full-resolution originals unnecessarily). No agent may choose a path by preference before that benchmark exists.

**Dependencies:** US-17

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Requirements validated for testability. AC-19.1/19.4 are evidence-gathering ACs against the running fork (binding, checkable) and AC-19.2/19.3 require selecting exactly one path with stated reasons/risks/revisit-conditions -- testable via document inspection. AC-19.5 correctly scopes this sprint's deliverable as an explicitly UNDECIDED delivery-path record with named candidates and measurement criteria, not a premature decision -- this is testable (does the doc open with UNDECIDED and list the five candidates and the four targets) and does not overreach sprint-3 scope. Approved as written.

---

### US-20: Extract the proven Stripe key-pairing and environment convention from the reference project
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-20.1:** The Stripe implementation in the reference project at `/Users/asim/NoIcloud/techno` is read directly — its payment routes, its server and client split, its templates, its environment example, and its deployment workflow — and `STRIPE_PORT_REPORT.md` lists every file inspected.
- [ ] **AC-20.2:** The report records the reference project's environment-variable convention exactly as found: flat names with no test or live suffix, a secret key, a publishable key, and one identifier per priced item, with the operating mode determined solely by which coherent set of values is loaded.
- [ ] **AC-20.3:** The report states the key-pairing rule in unambiguous terms — the secret key, the publishable key, and every priced-item identifier must all belong to the same Stripe mode — and explains why a mismatched pair fails, since this is the specific mistake made previously on this project.
- [ ] **AC-20.4:** A start-up validation is specified that refuses to start, or fails loudly with an actionable message, when the loaded Stripe values are not all from the same mode or when any required value is missing. The specification says what is checked, when it runs, and what the operator sees.
- [ ] **AC-20.5:** The report records the reference project's secret-handling shape and confirms it will be mirrored here: local values in an uncommitted environment file, deployed values in repository secrets whose names match the environment variable names exactly, and the deployment step writing the environment file on the server. No secret value appears in the report or in any committed file.
- [ ] **AC-20.6:** The report records which behaviours will be preserved when the payment flow is actually built — server-side payment creation, the route layout, webhook signature verification, repeat-event protection, success and cancel handling, and the rule that the authoritative amount is fetched from Stripe rather than trusted from the browser — and which behaviours are deliberately not carried over, with reasons. It is explicit that the reference project is a different language and framework, so faithful means matching logic and required-field structure, not copying lines.
- [ ] **AC-20.7:** The report states plainly that this payment path exists so the studio can charge its photography clients and is not subscription billing for a future software product, and it records the settled payment architecture rather than reopening it: the ported direct flow initiates payment, the ledger's own payment gateway stays disconnected, and the verified webhook reconciles the payment into the ledger and advances the project milestone. It states that exactly one webhook endpoint exists and that it lives in the fork backend where invoice status lives, that a browser redirect is never proof of payment, and that because the reference project is a different language the port crosses a language boundary and must be recorded in `FORK_CHANGELOG.md` as a deliberate deviation.
- [ ] **AC-20.8:** `.env.example` is updated with the placeholder Stripe variable names in the convention taken from the reference project, each with a comment explaining what it is and which mode it must match.
- [ ] **AC-20.9:** The report records the boundary of what "port faithfully" does and does not cover: the reference project is a one-shot checkout flow containing no saved payment method, no off-session charge, and no retry or dunning logic, so none of that is inherited. It states that V1 ships a payment schedule whose installments are each paid manually against a real ledger invoice, that automatic recurring card charges are deferred to V1.1 and must then be built on that same schedule, and that a subscription product must never be used because it would place an authoritative billing schedule outside the ledger.

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Requirements validated for testability. All 9 ACs are report-content requirements with a specific, enumerable checklist per AC (files inspected, exact env-var convention, key-pairing rule, start-up validation spec, secret-handling shape, preserved vs dropped behaviours, settled architecture restated rather than reopened, .env.example placeholders, and the explicit boundary of what 'port faithfully' excludes). AC-20.7's restatement of the settled payment architecture and AC-20.9's exclusion boundary are both testable as document-content checks, not implementation claims -- correctly scoped to a report-only story. Approved as written.

---

---

## Sprint Review

### Dev Team Sprint Notes
_Pending_

### Tester Sprint Notes
_Pending_

### PO Sprint Review Notes
Sprint-3 scope is unchanged by the 2026-07-30 finance revision — no story here touches finance. US-18's AC-18.1 references the ownership table in CLAUDE.md by reference, so it automatically inherits The Ledger Rule rows and the display-only-cache language; no AC edit was needed. AC-14.2 was extended to catch orphaned configuration left by retired sprint-2 stories.

PIPELINE RECOVERY CLOSED (2026-07-30). Both blockers are resolved: the pivot and finance documentation, sprint3.json and sprint3.md are committed (9624a07), and project-state.json has been advanced by the Project Lead to sprint-3 / planning with status active and no current task. Nothing blocks the start of this sprint.

PLAN REVISION (2026-07-30, final planning pass). US-20 was the only story left carrying pre-revision language and has been corrected: AC-20.7 previously told the Dev Team that the payment-initiation choice was still an open decision, which contradicted the settled architecture in PRD §26.3 — it now records the settled position (ported direct flow initiates, ledger gateway disconnected, exactly one webhook endpoint in the fork backend, a browser redirect is never proof of payment, language-boundary port recorded in FORK_CHANGELOG.md). A new AC-20.9 fixes the matching scope gap: the reference project is a one-shot checkout with no saved-card, off-session, or retry logic, so 'port faithfully' does not silently pull that in — V1 is a manual-pay installment schedule and auto-charge is V1.1 built on the same schedule, never a subscription product. Sprint is now 7 stories / 47 acceptance criteria. Definition of done carries the three standing project conventions (no open critical/major defects, coverage threshold not lowered, structured metadata headers on all code files).

STILL OUTSTANDING, not blocking this sprint's start: VPS access (po-requests item 2) is needed before US-16 can be called production-like on the real target; Stripe credentials (item 5) are not needed until the finance phase; and open decisions 7, 8 and 9 (contract provider, design-token lock-down, token starting point) need human confirmation before sprint-4 planning closes.

CONTRACT-SIGNING DECISION (2026-07-30). po-requests.md item 7 is resolved, conditionally: V1 uses PicPeak's own native contract-signing capability (typed name, consent checkbox, drawn signature, IP/timestamp, frozen snapshot, SHA-256 hash, audit page in the delivered PDF), hardened with one-time signing links, mandatory email verification, dual-party PDF delivery, and immutable R2 storage. No external e-sign vendor and no manual-upload fallback are carried into V1. This is conditional on verification: new AC-17.10 requires US-17 to confirm the capability actually exists at the pinned commit before any Project Room story depends on it, and to reopen the decision honestly in po-requests.md if it does not. Sprint is now 7 stories / 48 acceptance criteria.

REQUIREMENTS-DEFECT RESOLUTION — AC-16.6 (2026-07-30). The Tester correctly returned AC-16.6 as unexecutable: it required proving an upgrade install that applies "our new migrations" on top of an already-migrated upstream database, but no story in sprint-3 or earlier creates any extension migration, so the artifact under test does not exist. Of the Tester's three options I chose (b), reworded rather than deferred or padded. Option (a) — scoping a no-op migration purely to exercise the mechanism — was rejected because a throwaway migration proves the runner tolerates an empty change, not that our real extension migrations apply safely; it would buy false confidence and leave a meaningless file in the fork's migration history, which Fork Discipline makes expensive to remove later. Option (c), deferring the whole criterion, was rejected because it would leave US-16 with no upgrade-path evidence at all, and the genuinely valuable half of the proof — that the migration runner is idempotent and safe to re-run against an existing install — is executable today and is exactly what protects us on every future upstream sync. AC-16.6 now requires both runs (fresh-to-empty, then re-run against already-migrated) with command output and before/after migration-state evidence, and explicitly names the extension-migration upgrade proof as deferred to the sprint that introduces the first real one, with the deferral recorded in UPSTREAM_SYNC.md so it cannot be lost. No po-requests.md entry was opened: this is a sequencing and scope judgment inside the Product Owner's authority, not a question needing human input, and adding it there would dilute a file reserved for genuine blockers. Sprint remains 7 stories / 48 acceptance criteria — this pass reworded one criterion and added none. AC-16.6 and US-16 remain flagged requirements-defect pending the Tester's own re-review; tester fields were not touched.

TRACKER RECONCILIATION (2026-07-30). Issues #50-#56 were regenerated from this file so the tracker cannot disagree with the plan. Issue #53 (US-17) was missing AC-17.10 altogether — the criterion that verifies PicPeak's native contract-signing capability at the pinned commit, and the sole condition the contract-signing decision rests on; an agent working from the issue alone would have closed US-17 without testing that assumption. Issues #50-#55 also carried the pre-extension nine-line definition of done, missing the three standing project conventions. Issue #37 (US-9) was closed, having been left open although sprint2.json records US-9 as done with AC-9.3 retired in place. No acceptance criterion text changed in this pass; the plan is unchanged and the tracker now matches it.

AC SPLIT — AC-17.1 (2026-07-31). AC-17.1 bundled three separate proofs (create a Client, create a Project linked to it, create a Gallery associated with both) into one criterion and was too large to complete in a single dev session — two implementation attempts timed out. It is replaced in place by AC-17.1.1 (Client created and persisted across restart), AC-17.1.2 (Project created and linked to that Client by a real foreign key), and AC-17.1.3 (Gallery created in that Project, with the association resolving in both directions to Project and Client). Each sub-criterion is sized for one session and builds on the record created by the previous one; no requirement was dropped and none was added — the split makes the evidence per step explicit and routes any upstream model mismatch to PIVOT_AUDIT.md, consistent with AC-17.9. The sub-criteria inherit the Tester's approval of the original AC-17.1 text; tester fields were not otherwise touched. US-17 is now 12 acceptance criteria; the sprint totals 7 stories / 50 acceptance criteria.

AC SPLIT — AC-17.1.3 (2026-07-31). AC-17.1.3 was still too large to complete in a single dev session — both a Sonnet and an Opus implementation attempt timed out — because it bundled three proofs: creating the Gallery, and resolving the association in each of two directions. It is replaced in place by AC-17.1.3.1 (Gallery created inside the Project from AC-17.1.2, persisted, with creation route, database row and association column recorded), AC-17.1.3.2 (the Project-to-Gallery direction, with the proving query or screen and its output recorded), and AC-17.1.3.3 (the Gallery-to-Project-to-Client direction, likewise recorded). Each sub-criterion is sized for one session and builds on the record created by the previous one; no requirement was dropped and none was added — the split makes the evidence per direction explicit and routes any upstream model mismatch to PIVOT_AUDIT.md, consistent with AC-17.9. The sub-criteria inherit the Tester's approval of the original AC-17.1 text; tester fields were not otherwise touched. US-17 is now 14 acceptance criteria; the sprint totals 7 stories / 52 acceptance criteria.

AC SPLIT — AC-17.4 (2026-07-31). AC-17.4 was too large to complete in a single dev session — both a Sonnet and an Opus implementation attempt timed out — because one sentence bundled three separate pieces of work: finding how the pinned fork actually expresses expiry, driving a live gallery past that expiry and proving client access is refused, and proving the photographer can see the changed state. It is replaced in place by AC-17.4.1 (locate the mechanism with file/line evidence and record the pre-expiry baseline for the AC-17.1.3.1 Gallery), AC-17.4.2 (past expiry, the recorded client-facing request is refused, including whether a pre-expiry session survives), and AC-17.4.3 (the expired state is visible on the photographer-facing surface, including whether the scheduled expiration process must run first). Each sub-criterion is sized for one session and builds on the record created by the previous one; no requirement was dropped and none was added — the split separates the baseline from the two observable outcomes the original criterion asserted together, and routes any upstream model mismatch to PIVOT_AUDIT.md, consistent with AC-17.9. The sub-criteria inherit the Tester's approval of the original AC-17.4 text; tester fields were not otherwise touched. US-17 is now 16 acceptance criteria; the sprint totals 7 stories / 54 acceptance criteria.

AC SPLIT — AC-17.4.1 (2026-07-31). AC-17.4.1 was too large to complete in a single dev session — both a Sonnet and an Opus implementation attempt timed out — because it bundled a code-level investigation of the pinned fork with two separate live-system recordings. It is replaced in place by AC-17.4.1.1 (locate the expiry field or fields and any scheduled process with file and line evidence against the pinned commit, a code-only finding needing no live gallery), AC-17.4.1.2 (the pre-expiry client-facing baseline: the stored expiry value read from PostgreSQL plus the one client-facing request that currently succeeds, recorded precisely enough for AC-17.4.2 to re-run it verbatim), and AC-17.4.1.3 (the pre-expiry photographer-facing baseline: the screen or endpoint showing the Gallery as live and the field carrying that state, recorded precisely enough for AC-17.4.3 to re-check it verbatim). Each sub-criterion is sized for one session and builds on the record created by the previous one; no requirement was dropped and none was added — the split separates the static code evidence from the two live baselines the original criterion gathered together, and routes any upstream model mismatch to PIVOT_AUDIT.md, consistent with AC-17.9. AC-17.4.2 and AC-17.4.3 were amended only to point at AC-17.4.1.2 and AC-17.4.1.3 respectively, where the baseline each is compared against is now recorded; their substance is unchanged. The sub-criteria inherit the Tester's approval of the original AC-17.4 text; tester fields were not otherwise touched. US-17 is now 18 acceptance criteria; the sprint totals 7 stories / 56 acceptance criteria.

AC SPLIT — AC-17.4.1.1 (2026-07-31). AC-17.4.1.1 was too large to complete in a single dev session — both a Sonnet and an Opus implementation attempt timed out — because it asked one session to sweep a 424-file vendored fork in which expiry wording is used for admin sessions, guest tokens and share links as well as galleries, and to settle the data field, the database column, the scheduled process, its trigger and the comparison against the PRD all at once. It is replaced in place by AC-17.4.1.1.1 (the gallery expiry field and its PostgreSQL column, with file and line evidence and an explicit statement of which expiry occurrences were ruled out), AC-17.4.1.1.2 (any scheduled process acting on that field and how it is triggered, with the absence of such a process being an acceptable and recordable finding), and AC-17.4.1.1.3 (the write-up comparing the upstream expiry model found in the first two against what the PRD assumes). Each sub-criterion is sized for one session and builds on the record created by the previous one; no requirement was dropped and none was added — the split separates the field evidence from the scheduled-process evidence from the PRD reconciliation the original criterion demanded together, and all three remain code-level findings needing no live gallery. AC-17.4.1.2 was amended only to point at AC-17.4.1.1.1, where the database column it reads is now identified; its substance is unchanged. The sub-criteria inherit the Tester's approval of the original AC-17.4 text; tester fields were not otherwise touched. Any upstream gap surfaced by AC-17.4.1.1.3 is routed to `scrum-master/po-requests.md` per AC-17.9 rather than patched. US-17 is now 20 acceptance criteria; the sprint totals 7 stories / 58 acceptance criteria.

AC SPLIT — AC-17.4.1.1.1 (2026-07-31). AC-17.4.1.1.1 was too large to complete in a single dev session — both a Sonnet and an Opus implementation attempt timed out — because it asked one session to sweep a vendored fork whose expiry wording covers admin sessions, guest tokens and share links as well as galleries, and then, in that same session, to settle the gallery-lifetime field from application code and the PostgreSQL column from the migration that creates it. It is replaced in place by AC-17.4.1.1.1.1 (enumerate and classify the fork's expiry vocabulary from a stated search, recording the search commands, the candidate shortlist, and the ruled-out occurrences with a reason and file and line each), AC-17.4.1.1.1.2 (confirm from application code, with file and line evidence against the pinned commit, which shortlisted field or fields actually express a Gallery's own expiry and what role each plays), and AC-17.4.1.1.1.3 (identify the PostgreSQL table and column carrying that value from the upstream migration or schema definition that creates it, with its declared type, nullability and default). Each sub-criterion is sized for one session and consumes the record the previous one produced: the sweep bounds the search, the code confirmation narrows the shortlist to the real field, and the schema evidence names the column AC-17.4.1.2 later queries. No requirement was dropped and none was added — the ruled-out statement, the file and line evidence against the pinned commit, the migration-backed column, and the `PIVOT_AUDIT.md` record are all preserved, and all three remain code-level findings needing no live gallery. AC-17.4.1.1.2, AC-17.4.1.1.3 and AC-17.4.1.2 were amended only to point at the sub-criterion that now carries the evidence each depends on; their substance is unchanged. The sub-criteria inherit the Tester's approval of the original AC-17.4 text; tester fields were not otherwise touched. US-17 is now 22 acceptance criteria; the sprint totals 7 stories / 60 acceptance criteria.

AC SPLIT — AC-17.4.1.1.1.1 (2026-07-31). AC-17.4.1.1.1.1 was too large to complete in a single dev session — both a Sonnet and an Opus implementation attempt timed out — because it asked one session to run the expiry sweep over the vendored fork, which returns roughly 800 hits reducing to some 88 distinct identifier names, and then, in that same session, to classify every one of those names as candidate or ruled out with a reason and file and line evidence for each ruled-out group. It is replaced in place by AC-17.4.1.1.1.1.1 (run the stated search terms against the pinned commit across the fork's backend source and migration directories, and record the exact re-runnable commands together with one deduplicated inventory of every distinct name they surface), AC-17.4.1.1.1.1.2 (group and record the occurrences that are not a Gallery's own lifetime as ruled out, each group with a one-line reason and at least one file and line, with admin sessions, guest tokens and share links named explicitly), and AC-17.4.1.1.1.1.3 (state the candidate shortlist with a reason and file and line each, and reconcile it against the inventory so every name surfaced appears exactly once as candidate, ruled out, or explicitly unresolved). Each sub-criterion is sized for one session and consumes the record the previous one produced: the search bounds the vocabulary, the rule-outs remove the admin-session, guest-token and share-link wording, and what remains is the shortlist AC-17.4.1.1.1.2 confirms from code. No requirement was dropped and none was added — the stated search terms, the exact search commands, the distinct names surfaced, the candidate-or-ruled-out classification with a one-line reason, the file and line evidence for every ruled-out group against the pinned commit, the named admin-session, guest-token and share-link occurrences, the shortlist handed to AC-17.4.1.1.1.2 and the `PIVOT_AUDIT.md` record are all preserved; the only addition is the reconciliation in AC-17.4.1.1.1.1.3, which exists to prove the split itself lost nothing between the inventory and the two lists. All three remain code-level findings needing no live gallery. AC-17.4.1.1.1.2 and AC-17.4.1.1.3 were amended only to point at the sub-criterion that now carries the evidence each depends on; their substance is unchanged. The sub-criteria inherit the Tester's approval of the original AC-17.4 text; tester fields were not otherwise touched. US-17 is now 24 acceptance criteria; the sprint totals 7 stories / 62 acceptance criteria.

AC SPLIT — AC-17.4.1.1.1.1.1 (2026-07-31). AC-17.4.1.1.1.1.1 was too large to complete in a single dev session — both a Sonnet and an Opus implementation attempt timed out — because it asked one session to compose and run the expiry sweep across both the vendored fork's backend source tree and its migration directory and then, in that same session, to read roughly 800 matching lines down to one deduplicated inventory of some 88 distinct names while also merging every camelCase spelling with the snake_case value it duplicates. It is replaced in place by AC-17.4.1.1.1.1.1.1 (state the pinned commit and the search terms, record the exact commands with the directories searched and any file-type filter so they can be re-run verbatim, and record each command's hit count so the output volume is fixed), AC-17.4.1.1.1.1.1.2 (reduce the migration-directory output of those commands to a deduplicated list of distinct field, column and setting names, with the camelCase and snake_case spellings of one value recorded as a single entry), and AC-17.4.1.1.1.1.1.3 (reduce the backend-source output the same way and merge it with the migration list into the single deduplicated inventory, noting for each entry whether it came from the source, the migrations, or both). Each sub-criterion is sized for one session and consumes the record the previous one produced: the commands bound and quantify the search, the migration half is reduced first because it is the smaller and more structured of the two, and the source half is reduced and merged into the inventory the classification criteria then divide. No requirement was dropped and none was added — the stated search terms, the exact re-runnable commands including the directories and file-type filter, the pinned commit, the deduplicated inventory of every distinct field, column or setting name, the camelCase spellings, the refusal to classify anything or to drop a name for looking irrelevant, the handover to AC-17.4.1.1.1.1.2 and AC-17.4.1.1.1.1.3, and the `PIVOT_AUDIT.md` record are all preserved; the only additions are the per-command hit counts and the source-versus-migrations provenance note, which exist to make the two halves of the split checkable against each other and to prove nothing was lost between them. All three remain code-level findings needing no live gallery. AC-17.4.1.1.1.1.2, AC-17.4.1.1.1.1.3 and AC-17.4.1.1.3 were amended only to point at the sub-criterion that now carries the inventory each depends on; their substance is unchanged. The sub-criteria inherit the Tester's approval of the original AC-17.4 text; tester fields were not otherwise touched. US-17 is now 26 acceptance criteria; the sprint totals 7 stories / 64 acceptance criteria.

AC SPLIT — AC-17.4.1.1.1.2 (2026-07-31). AC-17.4.1.1.1.2 was too large to complete in a single dev session — both a Sonnet and an Opus implementation attempt timed out — because it asked one session to settle all fourteen entries of the AC-17.4.1.1.1.1.3 candidate shortlist as confirmed or ruled out, and then, in that same session, to trace every confirmed field through both halves of the Gallery path, recording file and line evidence for where each is set when a Gallery is created and edited and where each is read when a Gallery is served or an access decision is made, with the role of each field and any correction back to the ruled-out list. It is replaced in place by AC-17.4.1.1.1.2.1 (settle every shortlist entry as confirmed or ruled out with a one-line reason and file and line each, moving anything that is not the gallery-lifetime field into the AC-17.4.1.1.1.1.2 ruled-out list, and reconcile the shortlist so every entry appears exactly once), AC-17.4.1.1.1.2.2 (evidence the write path — where each confirmed field is set when a Gallery is created or edited, with the role each plays), and AC-17.4.1.1.1.2.3 (evidence the read path — where each confirmed field is read when a Gallery is served or an access decision is made — and state the confirmed finding the criteria that follow consume). Each sub-criterion is sized for one session and consumes the record the previous one produced: the disposition narrows the fourteen candidates to the confirmed set, the write path shows how that set is populated, and the read path shows how it is enforced before the finding is stated. No requirement was dropped and none was added — confirmation from application code rather than documentation or assumption, the file and line evidence against the pinned commit, the set-when-created-or-edited evidence, the read-when-served-or-access-decided evidence, the role of each field where more than one participates, the move of any disproved candidate into the AC-17.4.1.1.1.1.2 ruled-out list with the file and line that settled it, and the `PIVOT_AUDIT.md` record are all preserved; the only additions are the reconciliation in AC-17.4.1.1.1.2.1 and the matching consistency rule in the two criteria that follow, which exist to prove the split itself lost nothing between the shortlist and the confirmed set. All three remain code-level findings needing no live gallery. AC-17.4.1.1.1.3 and AC-17.4.1.1.2 were amended only to point at the sub-criteria that now carry the confirmed field set each depends on; their substance is unchanged. AC-17.4.1.1.1.1.3 is already implemented and approved and its text was left untouched: its forward reference to AC-17.4.1.1.1.2 now reads as the group of sub-criteria that share that prefix. The sub-criteria inherit the Tester's approval of the original AC-17.4 text; tester fields were not otherwise touched. US-17 is now 28 acceptance criteria; the sprint totals 7 stories / 66 acceptance criteria.

---
_Auto-generated from `sprint3.json` — do not edit directly._
