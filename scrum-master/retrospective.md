# Sprint Retrospective — earthandhoney

## Sprint-5 — Frontstage publishing (PRD Phase 4)

- **Sprint goal:** Turn the proven Frontstage↔Backstage seam and the locked design tokens into a
  real, deterministic, lead-generating public site — a structured `Pages` model with a standard
  template every page inherits, navigation driven by fields, a form builder writing durable
  Inquiries, the homepage / Details / Story templates, and real SEO output in actual HTML — opening
  with one piece of engineering debt: splitting the twenty-minute serial test suite.
- **Outcome:** All 8 stories (US-30…US-37) and all **62 acceptance criteria** delivered and merged
  across 8 PRs (#82–#89), every one with a green CI run recorded against its exact head SHA. Tester
  gates: 7 DONE, 1 DEFECT-FOUND (US-33 — a routing defect, not a code defect). The AC count grew
  46 → 62 in flight, entirely inside US-33 and US-37. No deploy was run.
- **Retrospective completed:** 2026-08-15 (at close — see Missed checks item 1, now the fourth
  consecutive sprint)

---

### What went well

- **A criterion refused to falsify a fork-integrity artifact, and rebuilt it instead.** AC-33.5.2's
  original wording told the implementer to register our new migration `120` in
  `picpeakMigrationManifest.ts` "so the migration-manifest integrity test stays green". Following
  that instruction would have kept the test green **while making it false** — the manifest is
  documented in three separate places as a fingerprint of *upstream at the pinned commit*, and its
  entry type has no field that can say a file is ours. Rather than comply, AC-33.5.2.1 built a
  fork-added-migration lane (`origin: 'fork'`, permitted only when recorded in `FORK_CHANGELOG.md`),
  proved it in both directions including the negative case, and updated `vendor/README.md` and
  `UPSTREAM_SYNC.md` so the artifact's documented meaning matches what it now does. Commit `3dcddb3`
  is the counterfactual: an earlier session hit the same wall and **deleted its own working code**
  rather than resolve it.
- **Pillar 3 stopped being a sentence and became a test.** US-31 AC-31.2 walks the real `Pages`
  field tree — including nested groups, arrays and block definitions — and fails if a `blocks`
  field, a free-text CSS field or a margin/padding/position control is ever added, with a self-test
  proving the walker actually catches each planted violation. US-35 went further and made copy
  restraint *structural*: the Details template simply has no long-form body field, so PRD §13.4's
  "do not over-explain in copy" cannot be violated by content entry. US-36 did the same for blog
  chrome. A non-goal that is only written down is a non-goal that comes back.
- **Phase 4's exit criterion was demonstrated, not asserted.** AC-31.7 renders two `Pages` records
  with deliberately different content — short vs. long heading, 1 vs. 4 placements, 0 vs. 3 text
  sections — reduces each to a structural shell, and commits the snapshot pair, then proves the
  shared shell is byte-identical with a per-testid style-drift walk. Sanity checks guard against a
  vacuous pass. "New content inherits design quality without manual layout work" is now falsifiable.
- **A performance miss was published at full size.** AC-34.6 reports mobile Lighthouse **0.91
  (PASS)**, image-attributable **CLS 0**, and **LCP 3410ms against a ~2500ms target — FAIL on all
  three passes, a ≈910ms / 36% gap** — then attributes the gap to the still-open R2 delivery
  decision and explicitly declines to close that decision. A later session re-derived every median
  from the retained raw JSON and confirmed the runs had loaded a real photograph rather than the
  placeholder before accepting the numbers. This is US-29's precedent used exactly as intended.
- **Two real defects were found by writing the tests, not by users.** US-32's keyboard-order test
  surfaced a genuine accessibility bug — below `lg` the closed drawer was pushed off-canvas by
  `transform` alone, leaving its links in the tab order. US-37's AC-37.4.3 found that
  `GalleryImage.url` is only a public `/api/gallery/…` path at `basic`/`standard` protection; at
  `enhanced`/`maximum` the fork emits an **unexpanded `{{token}}` template** on a route the Next
  rewrite does not proxy, and the prior code was piping that straight into `<image:loc>`.
- **Harness-first paid off a second time.** No committed suite in this repository had ever fetched a
  Payload *admin* page over HTTP, and that unmapped cost is what ended two capped sessions on the
  un-split AC-37.6.3. AC-37.6.3.1 stood the harness up once and recorded it in
  `SEO_ASSISTANT_ADMIN_OBSERVABILITY.md` — the authenticated fetch, a fourteen-row observation
  recipe table, and a required NOT COVERED section — with "not observable in the initial HTML, read
  from form-state key X" defined in advance as a *passing* row. The three sub-ACs that followed
  reused it instead of rediscovering it. This is the `WEBHOOK_LIVE_PROOF.md` pattern from US-26.
- **A determinism problem against a shared database was solved properly.** AC-37.6.3.3.2's
  internal-link assertion could have been made to pass by hardcoding a position. Instead the suite
  queries the live published candidate set the way the production code does, picks a
  `photographyType` no published document currently uses so both fixtures are each other's sole
  rank-0 match, and codes a documented fallback that computes the expectation from the same live set
  when no unused option exists. The suite states which branch it took and why.
- **The sprint-4 merge rule held on all 8 PRs.** DoD item 8 was written after PR #73 was merged with
  both CI jobs red. This sprint the Tester confirmed a green run against the **exact head SHA** for
  every PR by matching `gh run view --json headSha` against `gh pr view --json headRefOid`. One
  process failure, one rule, zero recurrences — the only one of sprint-4's action items that
  demonstrably worked.
- **`logs/` was read before criteria were rewritten.** Sprint-3 action item 3 finally shows up in
  practice: both the AC-33.5.2 split and the AC-37.4 split cite the specific session logs and their
  `max_turns` terminal reason, and the AC-33.5.2 split explicitly re-checked whether the *previous*
  diagnosis still applied before splitting again — concluding it did not, and finding a different
  cause. AC-37.4's split also records the check against both known non-convergent shapes, and names
  `AC-17.4.1.1.1.2.2.2` as the precedent for what recursive splitting costs.

---

### Missed checks / what didn't go well

- **DoD item 9 (`retrospective.md` updated incrementally) was UNMET for the FOURTH consecutive
  sprint** (1, 3, 4, 5). Sprint 3 diagnosed the missing owner; sprint 4 added an owner *and* a
  checkpoint to the DoD; **sprint 5 escalated it to an orchestrator pipeline step** — "the
  orchestrator appends to `retrospective.md` after every second story close-out", written explicitly
  because "nothing short of a self-executing step counts". Eight stories closed and it never fired.
  _Root cause: the DoD described a pipeline step that does not exist in the pipeline. Writing the
  instruction in the sprint file cannot create the step — only changing the orchestrator can._
- **The routing hole recurred a third time — on the very AC built to prove it could not.** Sprint 5
  added `pending_po_routing` to `sprint5.json` precisely because a DoD cannot grant write scope
  (AC-17.9 in sprint 3, AC-22.2 in sprint 4). AC-33.5.2.1 was written to use it, and its own text
  says the sub-AC "is not closed until that entry is drained". The array is `[]`, `po-requests.md`
  has no entry, and the AC is recorded `checked: true` / `dev_status: done`. **The mechanism was
  never exercised once.** _Root cause: the array grants write scope, but nothing verifies the write
  happened. The AC's closing condition is enforced by reading the AC text — which is exactly the
  kind of enforcement that failed the previous two times._
- **US-30's headline measurement was never recorded.** AC-30.2 required "the measured wall-clock
  time of the UNIT lane and of the full suite before the change… reported as real numbers", and
  warned that "a rounded or estimated one is not" acceptable. The guard test's header says the
  figure is "recorded on the story"; the story's AC-30.2 note is one sentence about waiting for a
  background run. Re-checked for this retrospective: no wall-clock figure exists in `sprint5.json`,
  `TEST_LANE_CLASSIFICATION.md`, PR #82's diff, or that session's log. The mechanism was verified;
  the number that justified building it was not.
- **The lane split's headroom was consumed inside the same sprint — and CI never got any of it.**
  CI's gated command is `npm test` = `jest --runInBand` across **both** lanes, so only dev sessions
  benefit from `test:unit`. Same runner, same command: PR #82's `test` job **10m30s** at 159 suites;
  PR #89's **21m18s** at 236 suites, eight days later. The suite grew **48%** in one sprint. US-30
  bought time and Phase 4 spent it immediately.
- **The 80-turn cap, not requirements quality, shaped two stories.** AC-33.5 timed out twice,
  AC-33.5.2 twice more (`logs/20260814_064803`, `logs/20260814_070541`, both `max_turns`), AC-37.4
  twice, plus the AC-37.6.3 sessions — pushing the sprint from 46 to 62 ACs. The splits themselves
  were well reasoned, and both PO split notes correctly identified a *specific* blocker rather than
  reflexively cutting by size. But each retry burned a session, and each left uncommitted work that
  the next session had to verify line by line rather than trust.
- **"Prior partial work to review rather than trust" became a standing tax.** Roughly a third of
  US-33's and US-37's criteria carry a paragraph telling the next session which uncommitted
  leftovers exist, which branch they are on, and which of them are wrong — including one AC that had
  to correct a previous AC's note that named two helper files which **do not exist in any commit on
  any branch**. The notes were accurate and valuable; needing them at all is the cost of capped
  sessions discarding context.
- **Mid-sentence `dev_notes` recurred at scale.** Sprint 4 recorded six; sprint 5 has roughly a
  third of all AC notes ending "I'll wait for the background run" / "I'll pause here". Sprint-4
  action item 7 — have the harness auto-commit annotate the notes it rescues — was never actioned,
  so the Tester again had to reconstruct from `git log` which apparently-abandoned work was actually
  committed. PR #82's own commit log shows the pattern plainly: two commits titled "AC-30.x:
  follow-up (auto-committed, dev agent did not commit)".
- **Tracker staleness recurred for the third consecutive sprint.** All 8 stories read
  `dev_status: not-started` and `phase` read `planning` while every AC read `done` and all 8 PRs
  were merged. Sprint-4 action item 5 adopted this as DoD item 15 ("written as work completes"); it
  was reconciled at review again, exactly as in sprints 3 and 4.
- **Two tests coupled to sprint-file *content* broke on legitimate growth.** `us21-ac21.3` pinned
  `current-sprint: sprint-4` and regresses every time planning advances; `us22-ac22.4`'s regex
  grabbed the first `| 9 |` row once a second action-items table existed above it. Both were
  repaired in PR #82 to select by content rather than position — a good fix, but the class of test
  (assert against a document that is *supposed* to change) will keep producing these.
- **No deploy was run.** `deploy_summary` is empty and `tester_sprint_status` is `not-started`.
  Sprints 3 and 4 both closed with a deploy passing all verification tiers; sprint 5, which is the
  first sprint to produce actual public routes, closed without one.

---

### Tester (Quality Gate) feedback

Recorded from the Tester's per-story close-out notes in `sprint5.json` (2026-08-15):

- **7 stories DONE, 1 DEFECT-FOUND.** Every story's PR was verified independently rather than on
  `dev_notes` assertion: for all 8, the CI run's `headSha` was matched against the PR's
  `headRefOid` — #82/`c73c6ea`, #83/`5108c25`, #84/`2ee377b`, #85/`1caa461`, #86/`96354d3`,
  #87/`6f7ed9e`, #88/`fbcad2e`, #89/`728e449` — all `smoke` + `test` green.
- **DEFECT, US-33 only:** "AC-33.5.2.1's own evidence clause is explicit… this sub-AC is not closed
  until that entry is drained", yet `pending_po_routing` is `[]` and `po-requests.md` contains no
  matching entry under any of `33.5.2.1`, `migration lane`, `origin.*fork` or `F10`. Called out as
  "the exact routing-hole failure (AC-17.9 in sprint 3, AC-22.2 in sprint 4) recurring a third
  time — this time on the very AC that exercises the new `pending_po_routing` mechanism the sprint
  built specifically to prevent it, so the mechanism has never actually been proven end to end." The
  underlying work is judged "real, verified and sound — only the PO-routing step was skipped."
  Recommendation: the PO adds the entry now (proposed disposition **accept as-is**) and the
  orchestrator exercises the drain at least once before US-33 is treated as fully closed.
- **Fork discipline verified independently on US-33:** `git log --name-only` across the merge commit
  shows only two NEW files under `vendor/picpeak/backend/migrations/core/` (`120`, `121`) and **no
  migration 001–119 touched**; `FORK_CHANGELOG.md` and `PICPEAK_PORT_LEDGER.md` both carry dated,
  file-level entries; `.env.example` carries `BACKSTAGE_API_TOKEN=change-me-in-production` — a
  placeholder, no secret committed.
- **No retired artifact reintroduced:** repo-wide grep under `src/` (excluding `__tests__`) for the
  retired auth, mail and lead-capture systems returns nothing after US-32's navigation rewrite;
  `src/collections/` contains exactly `Forms`, `GalleryPlacements`, `Inquiries`, `Media`, `Pages`,
  `Stories`, `Users` — no retired Testimonials/Packages/FAQ collection.
- **Coverage gate spot-checked at source:** `.github/workflows/ci.yml:69` still reads
  `{"branches":80,"functions":80,"lines":80}` with no `continue-on-error` and no `passWithNoTests`,
  and it is the exact command CI runs. The `us28-ac28.5` coverage-gate anchor is untouched since its
  sprint-4 creation commit.
- **Cross-cutting finding raised on US-37:** "`retrospective.md` has no Sprint-5 section at all —
  confirmed via a header-only grep… this is the fourth consecutive sprint (1, 3, 4, 5) this item
  has gone unmet."
- **Sprint-wide finding raised on every story:** story-level `dev_status: not-started` and
  `phase: planning` against fully-done ACs — "not rewritten here per instruction; reported to the
  orchestrator/PO rather than silently fixed."
- **Plan-review value, recorded at sprint start:** the Tester's plan review caught and corrected
  **eight missing-test-criteria gaps** before any code was written — four in US-33 (the PRD §20.2
  set was claimed but only field types were tested; captured values/source/utm claimed but only
  persistence proved; three spam defences named but two tested; no evidence at all for the
  no-SMTP-secret-in-the-browser claim), one in US-35 (five masonry behaviours claimed, one tested),
  one in US-36 (external-identifier-only claimed, only order tested) and two in US-37 (image-sitemap
  entries, and the fourteen SEO controls named individually so the AC could not close on a partial
  implementation). Each was an evidence clause narrower than its own claim.

---

### Process improvements / action items

| # | Action | Rationale | Owner |
|---|--------|-----------|-------|
| 1 | **Write AC-33.5.2.1's migration-lane decision into `po-requests.md`** (option chosen: an `origin: 'fork'` discriminator on the manifest entry; rejected: appending our migration as if it were upstream, and a separate parallel fork list; disposition: accept as-is) **and re-close US-33.** Do it before sprint-6 planning closes. | The sprint's one open defect, and a copy-one-entry task — the same shape as sprint-4 action item 1. It is also the third repeat of the same class of failure. | Product Owner |
| 2 | **Make the routing drain a step that runs, and prove it once.** The `pending_po_routing` array grants the write scope the DoD could not — but nothing checks that the write happened, so it inherited the old failure mode intact. Either the story-close step drains the array unconditionally, or a test fails when a closed AC's text says it owes a routing entry and none exists. | Adding the array was the right diagnosis and it still did not fire. An unexercised mechanism is indistinguishable from an intention — this is now three sprints of evidence for that specific claim. | Project Lead |
| 3 | **Make the retrospective append an actual orchestrator step, or stop putting it in the DoD.** Four sprints, four escalations (intent → owner → owner + checkpoint → "pipeline step"), four misses. The fourth escalation failed because the DoD *described* a pipeline step that was never added to the pipeline. | This is now the longest-running unmet item in the project, and each restatement costs a sprint. If the step will not be built, the honest move is to schedule the retrospective as a closing story with an AC, not a DoD line. | Project Lead |
| 4 | **Record AC-30.2's missing measurement, or accept the story's evidence as incomplete.** Run `test:unit` and the full serial suite once in Docker and write both wall-clock figures onto US-30, or note explicitly that the story shipped without its stated evidence. | The AC forbade an estimate and got no number at all. The split may well be worth it — nobody can currently say by how much. | Dev Team |
| 5 | **Decide what to do about CI's serial run before Phase 5.** CI gates on `npm test` (`--runInBand`, both lanes), so the parallel lane never helps it: 10m30s → 21m18s inside one sprint as the suite grew 159 → 236 suites. Options: run the two lanes as separate CI jobs, or accept the cost explicitly. | The problem US-30 was created to fix is back at its original size, and PRD Phases 5–8 will grow the suite further. | Dev Team / Project Lead |
| 6 | **Action sprint-4 item 7 — have the harness auto-commit annotate the `dev_notes` it rescues.** Carried unchanged; the rate went up, not down. | Roughly a third of this sprint's AC notes end mid-task. PR #82's log literally contains "auto-committed, dev agent did not commit". Every one costs the Tester a `git log` reconstruction. | Project Lead |
| 7 | **Have the story-close step write `dev_status` and `phase`** — carried from sprint-4 action item 5, unmet a third time and reconciled at review a third time. | DoD item 15 said "written as work completes". Nothing writes them, so nothing changed. | Project Lead |
| 8 | **Run and record a sprint deploy for sprint 5's output** before sprint-6 work lands on top of it. | Sprints 3 and 4 both closed on a passed deploy. Sprint 5 produced the first real public routes and closed without one. | Project Lead |
| 9 | **Treat tests that assert against intentionally-changing documents as a known class** — select by content, never by position or by a pinned sprint literal, and prefer asserting the invariant over the instance. | Two such tests broke on legitimate growth this sprint and were fixed in PR #82; the class will keep producing them as `scrum-master/` grows. | Dev Team |
| 10 | **Carry the three Tier-3 anchors and add the four new decision-encoding guards** (no page builder, no blog chrome, no meta keywords, the lane-classification manifest). Treat a change to any of them as a decision, not a refactor. | Each new guard exists because a retired non-goal or a scoping decision would otherwise be reversible by a routine cleanup — the same reasoning that created the original three. | Tester / Dev Team |

**Still open from earlier sprints:** sprint-3 items 9 (the UD-1 upstream report still needs a human
GitHub identity — `po-requests.md` item 16) and 10 (SPF/DKIM/DMARC before production email — item
17). Sprint-4 item 8 (design-token sign-off) is **closed** — signed off as-is on 2026-08-13, so
every Phase 4 template built this sprint sits on a confirmed specification. Sprint-4 item 9 is
**half closed**: contract signing is resolved as option (a), the **R2 delivery path (item 15) is
still open** and now carries a second measurement against it — AC-34.6's ≈910ms homepage LCP gap
tracks the miss US-29 already recorded. Sprint-4 items 1–5 and 10 were adopted into sprint 5's DoD;
of those, only item 4 (the green-CI-at-exact-head-SHA merge rule) actually changed behaviour.

---

## Sprint-4 — Making the pivot real on `main` + the Frontstage foundation

- **Sprint goal:** Make the post-pivot direction real on `main` (restore the stranded pivot
  documentation, route the sprint-3 findings that never reached the Product Owner), complete PRD
  Phase 2 (ownership boundaries) and start Phase 4 (Frontstage publishing) — tokens locked before any
  page is built, one studio identity record, a Backstage gallery rendered on a Frontstage page
  through the agreed API boundary, refreshed by a verified webhook, duplicate Backstage surfaces
  disabled, superseded Payload artifacts retired, and the deferred R2 delivery decision closed with
  measurements rather than preference.
- **Outcome:** All 9 stories (US-21…US-29) and all 51 acceptance criteria delivered and merged across
  9 PRs (#73–#81). Tester sprint gate **PASS** with one AC-level defect (AC-22.2) and one process
  flag (PR #73). Deploy passed all verification tiers.
- **Retrospective completed:** 2026-08-09 (at close — see Missed checks item 1)

---

### What went well

- **The single most dangerous thing in the repository was fixed first.** Sprint-4 planning found that
  the entire pivot lived only on an unmerged branch, so every agent since 2026-07-30 had been reading
  the retired Gallery-Engine direction — and a sprint-3 deliverable that *passed its quality gate*
  (`SYSTEM_OWNERSHIP.md`) was wrong in four rows because of it. US-21 was correctly ordered ahead of
  all seven feature stories rather than treated as documentation chores to fit in later.
- **The fix was made structural, not just applied.** US-21 AC-21.6 added a standing Jest guard that
  fails if `PRD.md`, `CLAUDE.md`, `scrum-master.md` or `SYSTEM_OWNERSHIP.md` silently lose the pivot
  direction again. The direction had already been lost twice — once to a branch switch, once by never
  reaching `main`. Reminders 15 and 16 finally have an enforcement mechanism instead of a restatement.
- **An honest non-decision was delivered as the deliverable.** US-29 benchmarked the two measurable
  R2 delivery candidates, found both missed the ADR's own targets, stated the miss magnitudes, named
  the infrastructure prerequisite blocking candidates 3–4, and **left the decision open** with PO
  sign-off `PENDING`. AC-29.6 was written specifically to make this an acceptable outcome, and it was
  used as intended rather than as cover for picking the least-bad path.
- **A benchmark session discredited its own numbers.** The US-29 harness initially measured 83-byte
  404 bodies as though they were photographs; the session caught it, withdrew the runs, and re-ran —
  rather than publishing fast, false numbers. For a benchmark-shaped story this is the whole ball game.
- **Live-system proof, not unit-test proof, for the two seams that everything downstream inherits.**
  `WEBHOOK_LIVE_PROOF.md` (1606 lines) exercises the real webhook against a real running stack and
  records two out-of-order fixture findings it caught along the way instead of hiding them; US-25's
  Flow A boundary was independently re-exercised live by both US-26 and US-29's work. Both seams are
  now the most-depended-on new code in the repo and both are backed at the right bar.
- **A deletion story deleted its own safety net correctly.** US-28 removed the lock-in tests pinning
  retired behaviour **in the same commit as the removal that breaks them** — never left failing,
  never skipped — with each deletion recorded against the accepted AC it belonged to, and it closed
  sprint-3 action item 8 (the orphaned env vars a test had been preventing anyone from removing).
  Coverage fell only 96.11→95.85 / 96.58→96.52 / 99.67→99.38, all far above the 80% floor, and a new
  guard now makes lowering the gate itself a test failure.
- **A deliberate non-removal was encoded as a test.** US-27 AC-27.4 asserts the static CMS Pages
  surface is *not* disabled, so the AC-18.5 scoping decision cannot be silently reversed by a future
  cleanup. Recording why something was kept is as load-bearing as recording why something went.
- **AC sizing worked.** Sprint-4 criteria named every file to be read or changed and pre-ran searches
  into the criterion text (retrospective action item 5). Where criteria still needed splitting
  (US-26, US-28, US-29), the splits were shallow and purposeful — nothing approaching sprint-3's
  `AC-17.4.1.1.1.2.2.2.1.1`.

---

### Missed checks / what didn't go well

- **DoD item 9 (`retrospective.md` updated incrementally, not at close) was UNMET for the THIRD
  consecutive sprint.** The file held only sprint-3 and sprint-1 content until this review was
  written. Sprint 3 correctly diagnosed the cause — the action item had no named owner and no
  in-sprint checkpoint — and sprint 4 put **both** into the Definition of Done (owner: Product Owner;
  checkpoint: append after every second story close-out). It still did not happen. _Root cause: the
  checkpoint is written in a document, but nothing in the pipeline stops or prompts at the checkpoint,
  so it can only fire if an agent volunteers. Two sprints of evidence now say it will not._
- **A finding was documented but not routed — again, one sprint after the DoD was rewritten to
  forbid exactly that.** AC-22.2's F1–F9 register was fully authored in `PIVOT_AUDIT.md:6479–6518`
  and never transcribed into `po-requests.md`. Sprint-4's DoD item 7 says verbatim that "a finding
  that an AC requires to be routed there is not closed until it has actually been written there," and
  US-22 *is* the story created to fix sprint 3's identical AC-17.9 gap. _Root cause: unchanged from
  sprint 3 — the implementing agent has no write scope over `scrum-master/`, and the handoff across
  that boundary is a hope, not a mechanism. The dev session behaved correctly; the process has a hole
  where a step should be._
- **A PR was merged with both CI jobs red (US-21 / PR #73).** The only recorded run for head SHA
  `390f8de` failed in docker buildx (`failed to reserve cache`) — an infra flake, so lint, types and
  tests never ran at all. It was merged anyway, violating DoD item 8. The content happens to be
  correct (8 downstream stories built on it with 16/16 green jobs), but that is luck-adjacent
  evidence gathered afterwards, not a gate. _Root cause: "it's just a flake" is currently a judgement
  call at merge time rather than a rule that says re-run until green._
- **Tracker staleness recurred at the source while being fixed downstream.** `sprint4.json` still
  reads `"phase": "planning"` with story-level `dev_status: "not-started"` on all 9 stories, even
  though every AC reads `done` and the deploy passed. This is the exact defect US-21 AC-21.4 was
  written to repair in `sprint3.json` — repaired in the old file, reproduced in the new one, because
  nothing writes those fields as work completes.
- **Six dev sessions ended mid-sentence waiting on a background task.** In US-26, US-28 and US-29,
  `dev_notes` trail off with "I'll stop here and wait for the background test run." Every one was
  rescued by the harness's auto-commit (`34ceed5`, `d8aaac2`, `bd30706`, `a15b213`, `8e13b64`,
  `1de4dd2`), so nothing was lost — but the Tester had to verify six times via `git log` that work
  which *looked* abandoned was not. The auto-commit is doing real work; the session notes do not
  reflect it, which costs review time on every story.
- **A twenty-minute serial test suite is now shaping how criteria are written.** `npm test` is
  `jest --runInBand` over ~140 suites, measured at 1,169,738 ms wall against 395,331 ms of API time
  (`logs/20260807_235236_dev-team.json`). AC-28.5 had to be split into three explicitly *because* two
  coverage runs plus remediation would not fit in one session. The runInBand fix that stabilised the
  sprint-1 live-boot flake is now the dominant cost in every dev session.
- **The Phase 4 foundation is built on tokens no human has looked at yet.** US-23 delivered the
  specimen route and correctly routed it to `po-requests.md` item 14, but sign-off is still open while
  US-24 and US-25 have already been built on the tokens. That was the accepted sequencing, not a
  mistake — but the repaint cost grows with every page added before the look is confirmed.

---

### Tester (Quality Gate) feedback

Recorded from the Tester's sprint-level close-out notes in `sprint4.json`:

- **Sprint gate: PASS**, with one defect and one process flag. All 9 stories merged via PRs #73–#81;
  **8 of 9 PRs show fully green CI** (`smoke` + `test`) on their final head SHA.
- **Defect, AC-22.2 only, not the sprint:** the F1–F9 register "was fully authored
  (`PIVOT_AUDIT.md:6479–6518`) but never transcribed into `po-requests.md`, violating the sprint's own
  DoD item 7." Independently confirmed by grep — `po-requests.md` contains no F1–F9 entries; only
  F8/UD-1 appears, and only via the separate AC-22.4 routing. Judged "a small, well-scoped
  PO/orchestrator follow-up (copy one table), not a rework." Recommendation: close it **before**
  sprint-4 is marked fully complete.
- **Process flag, PR #73:** merged despite both CI jobs failing on its only recorded run
  (`gh run view 31129644959`). Residual risk assessed **low** — 8 downstream stories depend on that
  exact content and all 16 of their jobs passed, "effectively re-validating US-21's content 8 times
  over." Recommendation for sprint 5: "the merge step must require a green CI run recorded against
  the exact head SHA being merged, and must re-run rather than merge through a failed run even when
  the failure looks like infra flake."
- **On US-25/US-26:** the Flow A boundary and the webhook receiver are "the two most-depended-on new
  integration seams in the codebase… Both are backed by live-system proof (not just unit tests) in
  this sprint, which is the right bar for seams at this level."
- **On US-29:** the story "closes one of the 'decisions no agent may make alone' and does so
  correctly" — the ADR records no path chosen with miss magnitudes stated and PO sign-off PENDING,
  "the honest-non-decision AC-29.6 requires, not a least-bad-path shortcut." The withdrawn
  discredited benchmark runs are called out as "a strong quality signal for a benchmark-shaped story."
- **On US-28:** the coverage gate was independently spot-checked at `.github/workflows/ci.yml:69` —
  still at 80 on branches/functions/lines, no `continue-on-error`, no `passWithNoTests` — satisfying
  DoD item 11 explicitly where the story removed tests.
- **On the mid-sentence `dev_notes`:** verified via `git log` on each feature branch as harness
  auto-commits — "tooling noise, not a gap." **No gaps found** on US-23, US-24, US-25, US-26, US-27,
  US-28 or US-29.
- **Three Tier-3 regression anchors named for sprint 5** (must not regress): the pivot-direction
  guard, the webhook signature-verification + idempotency suites, and the coverage-gate guard.

---

### Process improvements / action items

| # | Action | Rationale | Owner |
|---|--------|-----------|-------|
| 1 | ~~**Transcribe the F1–F9 register from `PIVOT_AUDIT.md:6479–6518` into `po-requests.md` verbatim and re-close AC-22.2.**~~ **DONE 2026-08-09**, before sprint-5 planning: transcribed verbatim under *"Upstream findings F1–F9 — routed for Product Owner attention"*, AC-22.2 and US-22 re-closed, and F6/F9 scheduled against the backlog items that own them (#38, #34) rather than left floating. | The sprint's one open defect. The content exists and is merge-ready; only the copy is missing. | Product Owner |
| 2 | **Give the routing handoff a mechanism instead of an intention: add a `pending-po-routing` block to the sprint JSON that a dev AC writes into, and make the orchestrator drain it into `po-requests.md` at story close.** **ADOPTED into sprint 5** — `sprint5.json` carries a `pending_po_routing` array plus a `pending_po_routing_schema` describing the entry shape, and DoD item 7 states an AC is not closed until its entry's `drained` field is true. | Two sprints running, an AC has authored a finding it had no write scope to route (AC-17.9, then AC-22.2). Rewriting the DoD did not fix it because the DoD cannot grant write scope. | Product Owner / Project Lead |
| 3 | **Make the retrospective checkpoint a pipeline step, not a document line — the orchestrator appends to `retrospective.md` after every second story close-out.** **ADOPTED into sprint 5** as DoD item 9, stated as an orchestrator step rather than an owner or a checkpoint (both already tried and both failed). | Unmet in sprints 1, 3 and 4. Sprint 3 added the diagnosis, sprint 4 added the owner *and* the checkpoint to the DoD, and it still did not fire. Nothing self-executing has been tried yet. | Project Lead |
| 4 | **Never merge a PR without a green CI run recorded against its exact head SHA — re-run infra flakes, do not merge through them.** **ADOPTED into sprint 5** as part of DoD item 8, naming the buildx cache flake explicitly. | PR #73 was merged on a doubly-failed run where lint/types/tests never executed. It happened to be fine; that is not a gate. | Project Lead / Tester |
| 5 | **Have the story-close step write the story-level `dev_status`/`phase` fields, so the sprint JSON is true at a glance.** **ADOPTED into sprint 5** as DoD item 15. `sprint4.json` itself was reconciled on 2026-08-09 (all nine stories → `done`, `phase` → `complete`). | `sprint4.json` reproduced the exact staleness US-21 AC-21.4 was written to repair in `sprint3.json`. Fixing files downstream while the source keeps producing them is not a fix. | Project Lead |
| 6 | **Reduce the cost of a full verification run** — investigate parallelising the suites that do not touch shared Postgres state, or split a fast unit lane from the serial live lane. **SCHEDULED as sprint-5 US-30**, the only non-feature story in that sprint, with no dependants so a stall blocks nothing. | `jest --runInBand` over ~140 suites now costs ~20 minutes wall clock and is directly shaping AC decomposition (AC-28.5 was split three ways because of it). | Dev Team |
| 7 | **Have the harness auto-commit annotate the session notes it rescues**, so a story whose `dev_notes` end mid-sentence does not read as abandoned. | The Tester had to reconstruct six such cases from `git log` this sprint. The work was always there; only the record looked broken. | Project Lead |
| 8 | **Get design-token sign-off (`po-requests.md` item 14) before any further Phase 4 page is built.** | Two stories are already on the tokens and every remaining Phase 4 page will be. The repaint cost only grows. | Project Lead (human decision) |
| 9 | **Decide the two open "no agent may decide alone" items**: contract signing (item 7 — PO recommends accepting the sibling audit PDF for V1) and the R2 delivery path (item 15 — needs a Cloudflare custom domain and/or Worker before candidates 3–4 can be measured). | PRD Phase 3 is deliberately excluded from sprint 4 because of item 7; item 15 is the only thing keeping the delivery decision open. | Project Lead (human decision) |
| 10 | **Protect the three Tier-3 regression anchors named by the Tester** — treat a change to the pivot-direction guard, the webhook signature/idempotency suites, or the coverage-gate guard as a decision, not a refactor. **ADOPTED into sprint 5** as DoD item 16, naming all three files; US-30 AC-30.4 additionally pins the coverage-gate guard while the suites are re-grouped. | Each one exists because the failure it guards against has already happened or is explicitly forbidden by the DoD. | Dev Team / Tester |

**Still open from sprint-3's action list:** items 4 (capped sessions committing partial work — the
harness auto-commit now covers much of it in practice, see action 7 above), 9 (the UD-1 upstream
report still needs a human GitHub identity — `po-requests.md` item 16) and 10 (SPF/DKIM/DMARC before
production email — item 17). Sprint-3 item 1 is **half delivered** — the AC-17.10 reopening landed
(US-22 AC-22.1), the F1–F9 routing did not, and it is carried here as action 1. Items 6 and 7 were
delivered by US-21 and US-22 AC-22.5, item 8 by US-28; items 2, 3 and 5 are superseded by actions 3,
5 and the AC-sizing result above.

---

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
