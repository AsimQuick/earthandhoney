# Sprint Retrospective — earthandhoney

## Sprint-3 — Pivot De-risking (PicPeak Backstage fork)

- **Sprint goal:** De-risk the pivot before any feature is built on it — an approved pivot map, a licence-compliant fork pinned to a verified commit, proof that the fork really delivers the photography flow on PostgreSQL + the existing R2 bucket in Docker, and the four decisions sprint-4 cannot start without (system ownership, the Frontstage↔Backstage API boundary, the media-reuse model, the R2 delivery path). Plus extraction of the proven Stripe environment/key-pairing convention. No new public pages.
- **Outcome:** All 7 stories (US-14…US-20) and all 70 acceptance criteria delivered and merged. 7 PRs (#57–#63), every one green on `smoke` + `test`. Deploy passed all verification tiers.
- **Retrospective completed:** 2026-08-02 (at close — see Missed checks item 1)

---

### What went well

- **Nothing was taken on trust.** The sprint's defining discipline held: the PicPeak licence was confirmed by reading the actual `LICENSE` file rather than GitHub's inferred badge or the README; the four required capabilities were traced to their introducing commits and proven to coexist at a single pinned commit; dependency licences were read out of each package's real `node_modules/<pkg>/package.json`. Every claim about the fork is anchored to file/line or a live reproduction.
- **The fork boundary was built to be maintainable, not just legal.** `PICPEAK_UPSTREAM.md` (pin + update-evaluation process + "production never tracks a floating branch"), `THIRD_PARTY_NOTICES.md`, `FORK_CHANGELOG.md` and `UPSTREAM_SYNC.md` (merge-not-rebase, with the likely conflict files named) all landed together. `src/lib/picpeakMigrationManifest.ts` records a git blob SHA-1 for all 127 upstream migration files, so any edit — down to whitespace — fails a test. That turns "no already-shipped upstream migration was modified" from a promise into an enforced invariant.
- **The fork was proven, not assumed.** US-17 reproduced the whole photography flow live against the pinned code: client → project → gallery, upload and derivatives, gallery protection, expiry, download, an operational email visible as queued then sent and independently confirmed in MailHog, and a webhook fired and verified by a signature-checking listener. Each proof was shown to reproduce rather than run once.
- **Bad news travelled honestly and fast.** A real vendor defect (single-image download hangs on S3/R2) was escalated to the Project Lead with options rather than quietly patched, and the chosen fix was registered across four dated artifacts so it can be dropped when upstream fixes it. Nine further findings (F1–F9) where upstream contradicts PRD assumptions were written up as facts, not smoothed over. AC-17.10 reported that 6 of 7 contract-signing elements hold and that the 7th does **not** — a finding that undercuts an already-recorded decision, reported anyway.
- **The Tester and PO caught requirements defects before code was written.** AC-16.6 was returned as unexecutable (it required migrations no story creates) and reworded to keep the genuinely provable half — migration-runner idempotency — while explicitly deferring the rest in `UPSTREAM_SYNC.md`. AC-18.6's "Gallery" term collision was fixed at requirements time, not patched after implementation. Both are cheaper failures than the alternative.
- **Decisions were allowed to stay open when that was the honest answer.** AC-19.5 records the R2 delivery path as **UNDECIDED**, with five candidates, four measurements and named performance targets, and forbids any agent choosing by preference before the benchmark exists. Recording an open question well is a deliverable.
- **Sprint-1's deploy carry-over is closed.** Sprint-1 ended with a 404 on a non-existent `deploy.yml`; sprint-3 closed with deploy passing all verification tiers.

---

### Missed checks / what didn't go well

- **DoD item 9 (`retrospective.md` updated incrementally, not at close) was UNMET again.** The file held only sprint-1 content until this review was written. This is a verbatim repeat of sprint-1's sole sign-off blocker and of sprint-1 action item #1, which was written specifically to prevent it. _Root cause: the action item added the intent but never a named owner or an in-sprint checkpoint, so it stayed a close-out task by default._ Related: `po-requests.md` item 7 asserts the contract-signing decision was "Recorded in … `retrospective.md`" — it was not, because the file was never touched during the sprint.
- **Sprint-2 was never closed out.** `sprint2.json` still reads `phase: planning` with US-9 `in-progress` and US-10…US-13 `draft`. Its retired scope is accounted for inside `PIVOT_AUDIT.md`, but there is no sprint-2 review or retrospective section anywhere. A pivot is a legitimate reason to abandon scope; it is not a reason to leave the record ambiguous.
- **A 40-turn dev-session cap burned $31.32 producing zero committed work — and was misdiagnosed for six sessions.** US-17 grew from 1 AC to 32 through a long chain of splits, each change record assuming the criterion was too large. Reading the session logs showed every failure was identical: `error_max_turns`, "Reached maximum number of turns (40)" — not token budget (one failing session used 19,434 of 50,000 tokens), not ambiguity. **Eleven of the last twelve dev sessions in US-17 ended at the cap.** Two properties made it worse: `PIVOT_AUDIT.md` reached 171 KB, so every fresh session paid to read it before writing; and capped sessions committed nothing, so each attempt restarted from zero — destroying the resume-from-uncommitted-draft mechanism that several earlier ACs had actually depended on to pass. _Root cause: the failure signal was in `logs/`, and five consecutive change records were written without reading it._
- **AC splitting was applied as a reflex to a problem it could not solve.** One criterion was split four times and rewritten twice, producing IDs as deep as `AC-17.4.1.1.1.2.2.2.1.1`. The splits were well-documented and preserved scope, but they were treating the wrong cause. What finally worked was reducing **tool calls**, not word count: pre-running the grep and writing its 15 call sites into the criterion as fixed scope, dropping outputs no downstream criterion consumed, and stating that a documentation-only criterion owes no pinning test suite.
- **A Dev Team convention was silently costing 25–105 tests per audit AC.** Documentation-only criteria were being given full pinning test suites that the Definition of Done never required. Unmeasured until it became the thing pushing sessions over the turn cap.
- **Findings were documented but not routed.** AC-17.9 requires F1–F9 to reach `po-requests.md`; AC-17.10 requires the audit-page failure to reopen the contract-signing decision there. `PIVOT_AUDIT.md` records both and states they "are to be added" — the addition never happened, because `po-requests.md` is PO-owned and outside the implementing AC's write scope. The ownership boundary is correct; the handoff across it has no mechanism.
- **An operational fix did not survive container recreation (F7).** The `/storage` permission fix applied under AC-17.5.1 had to be reapplied by hand under AC-17.7. Operational-only fixes were implicitly assumed to be one-time costs; this one is not, and nothing yet makes it reproducible.
- **Orphaned config could not actually be removed.** `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL` and `NEXT_PUBLIC_WHATSAPP_NUMBER` belong to retired US-12/US-13, but deleting them would break the accepted US-7 `.env.example` lock-in test — so they are marked *Retained* rather than removed. A test written to keep config honest now blocks config from being cleaned up.
- **A test guard asserted live credentials against CI's placeholder `.env`.** The US-16 R2 assertion should have skipped in CI and instead failed it (fixed in `1b54e42` before merge). This is the same class of defect as sprint-1's AC-1.1/AC-1.3: tests and config disagreeing about which environment they are in.
- **Story-level tracker fields are stale.** All 7 stories show `dev_status: not-started` while every one of their ACs shows `dev_status: done`, and `sprint3.json` still reports `"phase": "planning"` after a passed deploy. Harmless to delivery, but it means the file cannot be trusted at a glance.

---

### Tester (Quality Gate) feedback

Recorded from the Tester's final close-out notes in `sprint3.json`:

- **Every story: PASS.** US-14 (#57), US-15 (#58), US-16 (#59), US-17 (#60), US-18 (#61), US-19 (#62), US-20 (#63) — all merged, all `smoke` + `test` green on the merged head, verified via `gh pr checks`.
- **On US-17's AC growth (1 → 32):** explicitly attributed to dev-session turn-cap limits on audit-shaped criteria, **not** to requirements defects. Each split preserved scope and inherited the original approval; the sprint total (70 ACs) reconciles with `sprint3.md`.
- **On the vendor defect:** confirmed as a genuine upstream defect with a Project-Lead-decided disposition, "openly registered … not a silent workaround."
- **On US-16's CI failure:** "correctly diagnosed and fixed in commit `1b54e42` before merge; current CI is green with no open follow-up." AC-16.6's deferral judged "explicitly and correctly deferred … not silently dropped."
- **On US-19:** the R2 audit was run read-only against the live bucket (`list-buckets`, `list-objects-v2`, `get-bucket-lifecycle-configuration`, `get-bucket-cors`), confirming single-bucket usage and no second parallel store. AC-19.5's UNDECIDED framing judged "appropriate given sprint-3's goal is de-risking, not building new pages."
- **On US-20:** both PO amendments (AC-20.7, AC-20.9) judged scope clarifications, not defects.
- **One open item flagged, explicitly non-blocking for sprint-3 closure:** the AC-17.10 audit-page finding has not been routed into `po-requests.md`. Tester recommendation: *"the PO add the reopening entry to `po-requests.md` before any sprint-4 Project Room story relies on PicPeak's contract-signing capability as currently assumed."*

---

### Process improvements / action items

| # | Action | Rationale | Owner |
|---|--------|-----------|-------|
| 1 | **Route the AC-17.10 audit-page finding into `po-requests.md` as an explicit reopening of item 7, and add F1–F9 as PO findings.** Do this before sprint-4 planning closes. | Two ACs require this routing and neither happened; item 7 still reads "Confirmed, conditionally" against a condition that has since failed. Any Project Room story built on it would inherit a known-false assumption. | Product Owner |
| 2 | **Give the retrospective a named owner and a mid-sprint checkpoint** (e.g. append after every second story close-out), not just an intent in the DoD. | Sprint-1 action item #1 said the same thing and was missed identically in sprint-3. Restating it will not work a third time; a checkpoint might. | Product Owner / Scrum Master |
| 3 | **Read `logs/` before rewriting any acceptance criterion that failed.** Make "what was the session's exit reason?" the first question, ahead of "was the criterion too big?" | Six consecutive US-17 failures shared one exit reason (`error_max_turns`) that five change records never looked at; splitting could not have fixed it. | Product Owner / Project Lead |
| 4 | **Make capped dev sessions commit partial work before exiting.** The turn cap was raised 40 → 80 (po-requests item 12), which relieves pressure but does not fix the discard. | Several earlier ACs only passed because a later session found an earlier one's uncommitted draft. That mechanism failed silently in US-17 and cost $31.32 in abandoned work. | Project Lead |
| 5 | **Budget tool calls, not just words, when writing audit-shaped criteria** — pre-run unbounded searches into the criterion as fixed scope, drop outputs no downstream AC consumes, and state explicitly when a documentation-only AC owes no pinning test suite. | This is what actually unblocked AC-17.4.1.1.1.2.2.2 after four splits and two rewrites. Codify it before the next audit story repeats the thread. | Product Owner |
| 6 | **Close out sprint-2 with a short honest record** (delivered / retired / superseded by the pivot), and reconcile `sprint3.json`'s stale `phase: planning` and story-level `dev_status: not-started` fields. | The tracker currently disagrees with reality in three places; each is small, and together they make the files unreliable at a glance. | Product Owner / Project Lead |
| 7 | **Convert the `/storage` permission fix (F7) into something that survives container recreation**, or record it as a known manual step in the runbook. | It has already had to be reapplied by hand once; the next recreation will hit it again with no note explaining why. | Dev Team |
| 8 | **Resolve the retained orphaned env vars** (`RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`) in a follow-on pivot-execution story, updating the US-7 lock-in test alongside them. | Retired stories' config is still in `.env.example` only because a test forbids removing it. | Dev Team |
| 9 | **Decide whether to submit the prepared upstream defect report (F8/UD-1).** It needs a human GitHub identity to publish. | The fork patch is registered as droppable "when upstream fixes it" — which cannot happen while the report sits unfiled. | Project Lead (human decision) |
| 10 | **Add SPF, DKIM and DMARC records for the sending domain** before any production email is sent. | The SMTP set is populated and proven in Docker, but production deliverability is unaddressed. | Project Lead |

---

## Sprint-1 — Foundation + Gallery Engine IP

- **Sprint goal:** Establish the project foundation (Payload CMS + PostgreSQL + Cloudflare R2, all in Docker) and deliver the core Gallery Engine IP before any public website pages.
- **Outcome:** All 6 stories (US-1…US-6) and all 28 acceptance criteria delivered and merged. 28 PRs (#7–#34), every one with clean CI (2/2 `test` checks green).
- **Retrospective completed:** 2026-07-19

---

### What went well

- **100% clean CI across the whole sprint.** All 28 PRs (#7–#34) passed both `test` checks — `eslint --max-warnings 0`, `tsc --noEmit`, and `jest --coverage` at the 80% global threshold — every check executed via `docker compose run --rm web` per `.github/workflows/ci.yml`. Coverage ran well above the gate (several ACs at 100%).
- **Docker discipline held.** `docker-compose.yml` defines only `web` + `db` (postgres:16-alpine, named volume, healthcheck). No service was ever installed on the host, satisfying the CLAUDE.md Docker rules.
- **Verification-only pattern used well.** Many ACs (1.2, 2.3, 2.5, 3.2, 3.3, 3.5, 4.x) were already satisfied by wiring landed in earlier ACs; instead of inventing redundant production code, the Dev Team added dedicated verification tests. This kept the codebase lean while still closing each AC with real evidence.
- **Strong root-cause discipline.** The AC-1.3 `PAYLOAD_SECRET` bug was found by cloning `HEAD` into a scratch dir to reproduce CI's clean `actions/checkout` exactly, rather than guessing. Defaults for Payload admin-UI behavior (array sortability, relationship `allowCreate`) were verified against installed `node_modules` source, not assumed.
- **Core IP delivered as designed.** One reusable Gallery Engine renders any gallery, demonstrated in two distinct display-mode contexts (hero + portfolio) on internal, `noindex`, non-public demo routes — driven purely by gallery settings, with no duplicated image systems.

---

### Missed checks / what didn't go well

- **DoD item 6 (`retrospective.md` updated) was UNMET at close-out.** The Tester's final US-6 pass confirmed via repo-wide glob, directory listing, and git-log search that no `retrospective.md` existed anywhere in the repo or its history. The sprint could not be cleanly signed off until this document was created. **This retrospective remedies that gap.** _Root cause: the artifact was treated as a sprint-close deliverable with no owner or checkpoint during the sprint._
- **Config was carried in uncommitted local `.env` files, hiding two defects until CI.**
  - **AC-1.1:** `.github/workflows/ci.yml` never created a `.env` before running `docker compose`, so every step failed with "env file not found" on a clean checkout. Fixed by adding a `cp .env.example .env` step.
  - **AC-1.3:** `.env.example` never defined `PAYLOAD_SECRET`; only a developer's local uncommitted `.env` had one, so Payload booted with an empty secret and 500'd. The bug stayed latent until AC-1.3 added `depends_on: db (service_healthy)`, which for the first time exercised the live-boot path in CI. Fixed by documenting `PAYLOAD_SECRET` in `.env.example`.
- **Live round-trip tests raced on shared Postgres state (AC-6.3).** `us3-ac3.5` and `us6-ac6.3` each registered their own fixture user against the same shared `db` container. Payload allows only one `first-register` per database lifetime, so whichever test ran first won the slot and the other's fallback login 401'd. Fixed by extracting a single shared fixture identity + auth helper (`src/test-support/liveApiAuth.ts`).
- **AC-1.2 live-boot test is flaky in the full local Docker suite.** It spawns a real Next/Payload server and waits up to 60s for `/api/users`; under full-suite jest parallelism on the macOS Docker host, cold-start boot competes for CPU and can exceed the timeout — a false failure. It passes in isolation (~10s warm) and is green on GitHub Actions runners. Documented; not a regression.
- **Deploy could not be triggered.** Sprint-close deploy failed: `HTTP 404 Not Found` for `actions/workflows/deploy.yml` — the deploy workflow does not exist yet.

---

### Tester (Quality Gate) feedback

Recorded from the Tester's final close-out notes in `sprint1.json`:

- **Sprint-wide verification:** All 28 PRs (#7–#34) show 2/2 `test` checks passing; all merged to `main` in the expected chronological AC order (verified via `gh pr checks` and `gh pr list --state merged --base main`).
- **DoD status at close-out:**
  - Item 1 (All ACs verified by CI) — **met**, direct evidence.
  - Item 2 (No critical defects) — **met**; the one historical defect (AC-6.3 test race) was fixed and verified clean before merge.
  - Item 3 (Coverage threshold met) — **met**, 80% global gate enforced in CI.
  - Item 4 (Code file headers include metadata) — **met**, spot-checked directly against source (e.g. `Galleries.ts`, `GalleryEngine.tsx`).
  - Item 5 (All services run in Docker) — **met**, confirmed via `docker-compose.yml` (web + db only).
  - Item 6 (`retrospective.md` updated) — **UNMET at close-out** → now remedied by this file.
- **Tester recommendation:** Project Lead should trigger `retrospective.md` creation/population (Missed Checks + Process Improvements) before formally closing sprint-1 — actioned here.

---

### Process improvements / action items

| # | Action | Rationale | Owner |
|---|--------|-----------|-------|
| 1 | Create and populate `retrospective.md` incrementally during the sprint, not at close; add it to the sprint kickoff checklist with a named owner. | DoD item 6 was the sole reason sprint-1 could not be cleanly signed off. | Product Owner / Scrum Master |
| 2 | Keep `.env.example` complete and authoritative for **every** required var (incl. `PAYLOAD_SECRET`, all `R2_*`); never rely on uncommitted local `.env` for anything CI needs. | Two defects (AC-1.1, AC-1.3) were hidden behind local-only config. | Dev Team |
| 3 | Add a clean-checkout smoke path in CI (fresh clone + `cp .env.example .env` + `docker compose up`) so latent config gaps surface immediately, not several ACs later. | The `PAYLOAD_SECRET` bug stayed latent until a live-boot path first ran. | Dev Team |
| 4 | Standardize the shared live-test auth fixture (`src/test-support/liveApiAuth.ts`) as the pattern for any future live round-trip test; document that `first-register` is once-per-DB-lifetime. | Prevents a repeat of the AC-6.3 cross-suite race. | Dev Team |
| 5 | Stabilize the AC-1.2 live-boot test — raise/adapt the timeout or isolate it from the parallel suite (e.g. `--runInBand` for live suites) — to kill the local false-failure. | Recurring local flake; see memory note `ac1-2-live-boot-test-flaky-locally`. | Dev Team |
| 6 | Create `.github/workflows/deploy.yml` before the next sprint's deploy is expected. | Sprint-close deploy 404'd because the workflow is missing. | Dev Team / Project Lead |

---
