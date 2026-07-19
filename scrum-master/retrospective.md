# Sprint Retrospective — earthandhoney

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
