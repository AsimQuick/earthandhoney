# Sprint 3

**Phase:** planning
**Progress:** 1/7 stories | 6/48 ACs
**Last Updated:** 2026-07-31T07:57:55+00:00

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
**Status:** in-progress | **Priority:** critical

#### Acceptance Criteria
- [ ] **AC-15.1:** The PicPeak upstream repository is verified to actually exist and to be obtainable, and its licence is confirmed by reading the licence file in the repository rather than trusting documentation. If the licence is not MIT as the PRD assumes, work stops and the Product Owner is notified through `scrum-master/po-requests.md`.
  - Dev: implemented
- [ ] **AC-15.2:** A specific upstream commit is identified that contains all four capabilities the pivot depends on — Projects grouping above galleries, customer accounts, webhooks, and S3-compatible storage — and the evidence for each capability at that commit is recorded. If no single commit provides all four, the gap is documented as a blocking finding.
  - Dev: implemented
- [ ] **AC-15.3:** `PICPEAK_UPSTREAM.md` exists and records the upstream URL, the exact pinned commit hash, the branch or tag it came from, the date pinned, and the process for evaluating a future upstream update. It states that production must never track a floating upstream branch.
  - Dev: implemented
- [ ] **AC-15.4:** `THIRD_PARTY_NOTICES.md` exists and reproduces the upstream licence text and copyright notice in full, alongside notices for any other code copied into this repository.
  - Dev: implemented
- [ ] **AC-15.5:** `FORK_CHANGELOG.md` and `UPSTREAM_SYNC.md` exist. The changelog is initialised with the pinned baseline and is the place every deliberate deviation from upstream gets recorded. The sync document states the merge or rebase policy and names the files most likely to conflict on a future update.
  - Dev: implemented
- [ ] **AC-15.6:** The forked code is present in this project in a clearly separated location, and no already-shipped upstream database migration has been modified — verifiable by comparing the fork's migration files against the pinned upstream.
  - Dev: implemented

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
**Status:** draft | **Priority:** critical

#### Acceptance Criteria
- [ ] **AC-16.1:** The forked Backstage, its database, and any worker or cache component it requires all run as services defined in `docker-compose.yml`. Nothing is installed on the host machine, and services address each other by Docker network hostname rather than localhost.
- [ ] **AC-16.2:** The Backstage runs on PostgreSQL — not on any development-only database the upstream may default to — and its migrations complete cleanly against an empty database.
- [ ] **AC-16.3:** The Backstage is configured to use the project's existing Cloudflare R2 bucket through its S3-compatible storage settings. No new parallel bucket is created. If the existing R2 credentials cannot be obtained, the story is blocked and recorded in `scrum-master/po-requests.md` rather than worked around with a substitute store.
- [ ] **AC-16.4:** `.env.example` documents every environment variable the Backstage needs, with safe placeholder values and a comment for each explaining what it is and where the real value comes from. No real secret is committed.
- [ ] **AC-16.5:** A documented, repeatable start-up procedure exists that takes a clean checkout to a running Backstage with an administrator able to sign in, and it is exercised end to end at least once with the result recorded.
- [ ] **AC-16.6:** The migration path is proven safe as far as it can be at this point in the sprint. Two runs are executed and their command output recorded: (a) a fresh install applies the pinned upstream migrations cleanly to an empty database, and (b) the same migration command re-run against that now-already-migrated database completes as a no-op — no error, no re-application, no data loss — with the migration-state table (or the upstream's equivalent record) shown before and after to prove the runner is idempotent and safe against an existing install. Proving an upgrade that applies *our own* extension migrations on top of an already-migrated upstream database is explicitly out of scope for this story: under Fork Discipline no such migration exists yet, and inventing a throwaway one would prove nothing real. That proof is deferred to the sprint that introduces the first extension migration, and `UPSTREAM_SYNC.md` records the deferral so it is not lost.

**Dependencies:** US-15

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  AC-16.1 through 16.5 are testable as written (Docker-only services, Postgres-not-dev-db, existing R2 bucket reuse or documented block, .env.example completeness, an exercised and recorded start-up procedure) and are approved.
  
  RE-REVIEW (2026-07-30): AC-16.6 was previously returned as a requirements-defect because it required proving an upgrade that applies 'our own' extension migrations on top of an already-migrated upstream database, and no such migration exists yet in the sprint. The PO resolved this by rewording the AC (option b) rather than padding scope with a throwaway migration or deferring the whole criterion: it now requires only (a) a fresh install applying the pinned upstream migrations cleanly to an empty database, and (b) a re-run of that same command against the now-migrated database completing as a verified no-op, both with recorded command output and before/after migration-state evidence. It explicitly scopes out proving our own extension-migration upgrade path, naming Fork Discipline as the reason no such migration exists yet, and requires the deferral to be recorded in `UPSTREAM_SYNC.md` so it is not lost. This is now fully testable: two concrete, reproducible runs with an enumerable pass/fail condition (no error, no re-application, no data loss) and a named artifact (UPSTREAM_SYNC.md) for the deferral record. Approved as reworded.

---

### US-17: Prove the forked Backstage delivers the real photography flow before we build on it
**Status:** draft | **Priority:** critical

#### Acceptance Criteria
- [ ] **AC-17.1:** A Project, a Client, and a Gallery can be created in the running Backstage, and the Gallery is correctly associated with the Project and the Client.
- [ ] **AC-17.2:** A batch of real images can be uploaded and processed. Every uploaded original is stored in R2 exactly once, the expected derivative sizes are produced, and stored image records include width, height, aspect ratio, format, file size, and processing state.
- [ ] **AC-17.3:** Gallery protection works as delivered by upstream: a password-protected gallery refuses access without the password, and grants it with the password.
- [ ] **AC-17.4:** The expiry mechanism works: a gallery past its expiry no longer grants client access, and the state change is visible to the photographer.
- [ ] **AC-17.5:** A client can view the gallery through its client-facing route and download images where the gallery's download policy permits, including any archive download the upstream provides.
- [ ] **AC-17.6:** At least one operational gallery email is sent through the Backstage email system to a capture inbox or mail catcher, and its queued/sent state is visible.
- [ ] **AC-17.7:** At least one Backstage webhook fires and is received by a listener that logs the payload, proving the outbound integration path we will later use to refresh Frontstage content.
- [ ] **AC-17.8:** The bundled gallery style templates render unmodified, and a copy of each original template file is preserved so future Earth & Honey variants can be diffed against the untouched baseline. `PICPEAK_PORT_LEDGER.md` records every template copied and where it is used.
- [ ] **AC-17.9:** Findings are recorded honestly: anything that does not work as the PRD assumed is written up in `PIVOT_AUDIT.md` and raised to the Product Owner rather than quietly patched.
- [ ] **AC-17.10:** PicPeak's native contract-signing capability is verified against the actual pinned commit, not assumed from documentation or memory: typed name capture, a consent checkbox, a drawn signature, signer IP address and timestamp, a frozen snapshot of the signed contract contents, a SHA-256 integrity hash, and an audit page baked into the delivered PDF. For each element, the evidence (file/line, or a reproduced signing flow) is recorded in `PIVOT_AUDIT.md`. If any element is missing or works differently than assumed in `CLAUDE.md`/PRD §29, this is written up honestly and raised in `scrum-master/po-requests.md` as reopening the contract-signing decision — no silent workaround, and no quiet fallback to an external e-sign vendor or manual upload.

**Dependencies:** US-16

**Dev Team Status:** not-started

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

---
_Auto-generated from `sprint3.json` — do not edit directly._
