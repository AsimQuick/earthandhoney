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

## Sprint-2 — Public website on the Gallery Engine (closed early by the pivot)

- **Sprint goal:** ship the public, lead-generating website on top of the sprint-1 Gallery Engine.
- **Outcome:** US-7 and US-8 delivered. US-9 landed with AC-9.1 (Homepage global) and AC-9.2
  (Portfolio collection) implemented and **AC-9.3 retired**. **US-10, US-11, US-12 and US-13 were
  retired unbuilt.** Sprint closed early on 2026-07-30 by the product pivot.

---

### What the pivot revealed

- **The Tester approved four stories that were later withdrawn wholesale.** US-10 through US-13 were
  well-formed, testable requirements for work that should never have been specified. The premise —
  a Payload-owned gallery engine, a Blog/Testimonials/Packages/FAQ content model, a Leads collection
  — was about to change. **Our process validates acceptance criteria against the PRD; it has no
  mechanism for questioning the PRD itself.** That is a structural gap, not a Tester failure.
- **Sprint-1's core deliverable was largely superseded within one sprint of shipping.** Six stories
  and 28 acceptance criteria built a gallery engine that a forked upstream now provides. The engine
  was built exactly as specified and to a good standard; the specification was the problem.

### Root cause analysis

The old PRD instructed us to build a gallery engine as the core intellectual property. The new PRD
observes that a mature open-source project already does almost exactly that job. **Nothing in our
process ever asked "does this already exist?"** before committing a sprint to building it.

This is not a defect in any agent's execution. It is a missing step at the front of planning: a
build-versus-adopt check. Sprint-1 planning derived scope faithfully from the PRD and CLAUDE.md, and
both said "build it," so it was built. A single "what proven implementation already solves this, and
what would adopting it cost?" question at planning time would have surfaced the fork option before
28 acceptance criteria were written against building it from scratch.

The secondary cause is that pillars and vision statements were treated as settled facts rather than
as assumptions with a cost. "The Gallery Engine is the core IP" was load-bearing for two sprints and
was never re-examined.

### Process improvements from the pivot

| # | Action | Rationale | Owner |
|---|--------|-----------|-------|
| 7 | **Add a build-versus-adopt check to sprint planning.** Before any story that builds a substantial subsystem, record what proven implementation already exists, what adopting it would cost, and why building is the better choice. One paragraph in the sprint file. | The entire pivot exists because this question was never asked. | Product Owner |
| 8 | **The Tester's requirements review may challenge a premise, not only the wording.** If an acceptance criterion is testable but the *assumption behind it* looks doubtful, raise it as `requirement-gap` and escalate rather than approving well-formed criteria for the wrong thing. | Four stories were approved as high-quality requirements right up until their premise was withdrawn. | Tester / Product Owner |
| 9 | **Do not file GitHub issues for a story until the sprint immediately before it starts.** Issues were filed for US-10…US-13 well ahead of implementation and all four had to be closed as retired. | Reduce the cost of a direction change. | Product Owner |
| 10 | **Retire, never delete.** A cancelled story keeps its `retired` status and a recorded reason in the sprint file and on its issue. | Future agents must be able to see what was deliberately abandoned and why, or they will rebuild it. | Product Owner |
| 11 | **Verify an upstream claim against the upstream code, not its documentation.** Every claim the new PRD makes about the forked project (its Projects layer, customer accounts, webhooks, storage, licence) is a spike deliverable in US-15/US-17 with a hard stop if it does not hold. | The pivot rests on assumptions about someone else's codebase that we have not yet checked. | Dev Team / Tester |
| 12 | **Carry the Stripe key-pairing rule as a permanent constraint, not a story detail.** It is now in `CLAUDE.md` and in the cross-sprint reminders, and US-20 requires a start-up validation. | This already failed once on this project. | Product Owner / Dev Team |

### Carried forward from sprint-1 (status)

- Action items 1–6 from the sprint-1 retrospective are **closed**: retrospective now maintained
  incrementally, `.env.example` authoritative, clean-checkout CI smoke path added, shared live-test
  auth fixture standardised, AC-1.2 flake fixed, `deploy.yml` created. Item 6's follow-on — the
  deploy workflow still has no real target — is now `po-requests.md` item 2.

---

## Change Requests

_Every mid-sprint scope change, direction change, tool addition, or removal, with its impact._

| Date | Sprint | Request | Impact | Approved By | Status |
|------|--------|---------|--------|-------------|--------|
| 2026-07-19 | 2 | No standalone Packages page; render Packages/Testimonials/FAQ as About-page sections | Unblocked AC-11.4/AC-11.6; relaxed the "look exactly like the template" directive for that case | Human | superseded by the 2026-07-30 pivot |
| 2026-07-30 | 2→3 | **PIVOT: adopt a forked PicPeak Backstage instead of building our own Gallery Engine** | Sprint-1's Payload Galleries collection, Sharp derivative pipeline, R2 upload path, and gallery viewer are superseded. Payload's role narrows to Frontstage. Fork discipline, upstream pinning, licence compliance, and migration rules become permanent constraints. Sprint 2 closed early; sprint 3 becomes an audit-and-prove sprint. | Human | approved |
| 2026-07-30 | 2 | Close sprint 2 early; retire US-10, US-11, US-12, US-13 | 4 stories / 17 acceptance criteria abandoned unbuilt; GitHub issues closed as retired with reasons; US-9 allowed to land as-is with AC-9.3 retired | Human | approved |
| 2026-07-30 | — | Remove Testimonials, Packages, and FAQ from product scope | AC-9.3 retired; the About-page sections decision from 2026-07-19 is void; three collections never built | Human | approved |
| 2026-07-30 | — | Retire the WhatsApp lead-capture flow | US-13 retired outright; `NEXT_PUBLIC_WHATSAPP_NUMBER` no longer needed; direction is minimal-friction contact forms | Human | approved |
| 2026-07-30 | — | Replace `Leads` with `Inquiry`; replace `Session` with `Project`; replace `Blog post` with `Story` | Controlled vocabulary rewritten; the Inquiry must never auto-create a financial client | Human | approved |
| 2026-07-30 | — | Retire Better Auth, Resend, and locked-in Adobe Acrobat Sign | Auth comes from the fork; operational email from the fork's queue and financial email from the billing system; the e-sign provider becomes an open decision with a manual-upload fallback recommended | Human | approved |
| 2026-07-30 | — | Deployment target fixed to a dedicated VPS with Docker Compose and one reverse proxy; no Kubernetes | Resolves the open sprint-2 deploy-target question; VPS access becomes a blocking request | Human (via PRD) | approved |
| 2026-07-30 | — | Stripe must mirror the reference project's environment and key-pairing convention | New permanent constraint in `CLAUDE.md`; US-20 extracts and documents it; a start-up mode-consistency validation is required before any payment code | Human | approved |
| 2026-07-30 | — | `public/photobuddy/` demoted from design authority to inspiration and reusable code | Frontstage no longer has to match the template; design tokens must be locked before page creation expands (recommended as the first sprint-4 story, pending confirmation) | Human (via PRD) | approved |
| 2026-07-30 | — | Add LumaForge (V2) as a captured but explicitly out-of-scope backlog section | Prevents SaaS scope leaking into V1 while preserving the seams the PRD requires | Human (via PRD) | approved |
| 2026-07-30 | 3→finance | **FINANCE REVISION: Invoice Ninja becomes a headless, API-only ledger — no client portal, no client-facing surface** | Adopted **The Ledger Rule** (records to the ledger, experiences ours, Stripe alone moves money). Removes the duplicate client portal, duplicate client record, duplicate payment status, and second sender identity. PRD §4.3, §4.5, §5, §9, §10, §25 (rewritten), §26.3, §27, §28.1, §29, §31, §34 Phase 6, §35.1, §35.5, §36, §38, §40 revised; `CLAUDE.md` ownership table, stack, and decisions list rewritten. Sprint 3 scope unaffected. | Human | approved |
| 2026-07-30 | — | Payment path settled: the ported direct Stripe flow, ledger gateway disconnected | Closes PRD open decision #5 and `po-requests.md` item 6. One payment path, one Pay button, one webhook endpoint, located in the fork backend where invoice status lives — which makes the Flask→JS port a `FORK_CHANGELOG.md` entry. | Human | approved |
| 2026-07-30 | — | Ledger hosting settled: our own VPS, our own `docker-compose.yml` | Closes PRD open decision #7 and `po-requests.md` item 3. The "decisions no agent may make alone" list drops from eight to seven. | Human | approved |
| 2026-07-30 | — | **Tax is never product surface** | No tax breakdown UI, rate picker, registration-number field, or settings screen, and no tax story may enter the backlog. Tax correctness happens invisibly inside the ledger. Recorded as a non-goal in `CLAUDE.md`, PRD §25.3/§36, and cross-sprint reminder 12. Rationale (owner's): the audience is wedding clients, who neither know nor care about bookkeeping. | Human | approved |
| 2026-07-30 | — | **Installments: V1 ships a manual-pay payment schedule; automatic recurring card charges deferred to V1.1** | Avoids pulling saved payment methods (SetupIntent), off-session SCA/3DS failure-and-recovery, and dunning/retry into V1 — none of which exists in the `techno` reference. V1.1 must build on the same schedule so nothing is rebuilt. Stripe Subscriptions are forbidden: the schedule must stay in the ledger. | Human | approved |
| 2026-07-30 | — | **Payment gating: standard case only; no revocation/relocking spec** | PRD §27.1 now defines the one required flow (gallery ready → notification → locked → paid → recorded → unlocked). Default-after-release is deliberately left unspecified rather than designed either way; it is a human business matter. Prevents an agent inventing a revocation rule. | Human | approved |
| 2026-07-30 | — | Email ownership: Backstage queue owns client-facing mail **by default**, not by rigid rule | The Backstage queue is the default owner (one sender identity, one brand, one template editor), but a row may be reassigned to the ledger where that clearly saves real implementation or configuration work, with PO sign-off recorded in `SYSTEM_OWNERSHIP.md`. The inviolable part is only that exactly one system owns each email type. Flips several PRD §28.1 rows away from the billing system. | Human | approved |
| 2026-07-30 | — | **VPS access resolved: earthandhoney reuses the shared gitops VPS (`root@140.82.43.36`)**, not a newly-provisioned dedicated box | Closes `po-requests.md` item 2. Verified reachable by a read-only SSH check; the host already runs `solanaBilly`, `solanatrilly`, `litadvisor`, `Pulau`, and a hosting-panel stack, so earthandhoney gets its own `/root/earthandhoney/` and its own non-colliding ports (final assignment deferred to the sprint-4+ deploy story). Recorded honestly as shared tenancy with an actively-trading crypto system, not glossed over as dedicated. | Human | approved |
| 2026-07-30 | — | **Stripe account confirmed to already exist for Earth & Honey**; keys to be supplied directly by the human, not sourced by an agent | Consistent with the Stripe Port Rule's prohibition on reusing `techno`'s or any sister project's credentials. Closes the account-existence half of `po-requests.md` item 5; the actual key values remain outstanding until the finance phase. | Human | approved |
| 2026-07-30 | 7 | **Contract signing: V1 uses PicPeak's own native signing capability, conditional on verification** — no external e-sign vendor, no manual-upload fallback | Closes `po-requests.md` item 7 and PRD §5 decision 5, following an independent Tester research verdict (not the PO's own preference): manual-upload was found to add booking-moment friction without buying more legal weight than a cheap in-house checkbox flow, and it breaks the project's own payment-gate discipline (unverified human toggle vs. Stripe's verified-webhook standard). PicPeak's native capability (typed name, consent checkbox, drawn signature, IP/timestamp, frozen snapshot, SHA-256 hash, audit page in the PDF) is treated the same as gallery logic under "fork, don't rebuild," hardened with one-time signing links, mandatory email verification, dual-party PDF delivery, and immutable R2 storage. **Conditional, not final:** new AC-17.10 requires US-17 to verify this capability actually exists at the pinned commit; if it doesn't, the decision reopens rather than silently substituting a workaround. | Human, informed by Tester research | approved (conditional) |
| 2026-07-30 | 8, 9 | **Design tokens: lock in sprint 4, derived from photobuddy but modernized** — Fraunces (display serif) + Inter (body sans), near-black + greyscale only, no accent color | Closes `po-requests.md` items 8 and 9. Creative brief recorded for the sprint-4 design-token story: small, disciplined token scale; small composable components, not page-specific styling; built to serve both Frontstage and Backstage/Project Room from day one. Real mockups still required before broad rollout — this is direction, not a locked visual spec. | Human | approved |

---

## Direction Change Log — 2026-07-30 finance revision

**What happened.** The human product owner proposed removing Invoice Ninja entirely and having
PicPeak+Stripe own the whole photography-business workflow. The PO pushed back on the parts that
were genuinely uncertain — PicPeak's finance capability is an unvalidated *beta*, heavy extension of
it would sit in the worst possible upstream-merge conflict zone, and "remove Invoice Ninja" risked
silently becoming "author an accounting system," which PRD §36 already forbade. A middle path
(**headless Invoice Ninja**) was surfaced, and that is what was adopted.

**Why this is worth recording.** This is retrospective action item #7 (the build-versus-adopt check)
working in the opposite direction, and working correctly. Sprint 1 built something that already
existed because nobody asked "does this exist?" Here, the question was asked *before* any story was
written, and it prevented an unplanned rebuild of invoicing, tax, numbering, and credit notes.

**The durable output** is a boundary principle rather than a feature matrix. The owner initially
considered mapping every capability to a system; the PO argued that "use whichever is cheaper" is a
good tiebreaker and a bad principle, because cheapness is judged per-story and drifts into exactly
the "who owns this" ambiguity `CLAUDE.md` warns about. **The Ledger Rule** — records to the ledger,
experiences ours, Stripe alone moves money, with "is this a record or an experience?" as the
grey-zone test — keeps opportunistic reuse legal while fixing where truth lives. It already decided a
non-obvious downstream question on its own (reminder email ownership), which is the test of whether a
principle is real or decorative.

**Process note.** Nothing was written to disk during the three-turn design conversation. Files
changed only after all four open questions were answered. That is the pattern to repeat for
architecture changes of this size.

| # | Action | Rationale | Owner |
|---|--------|-----------|-------|
| 13 | **State a boundary principle, not a capability matrix, when integrating a third-party system.** Record it where agents will read it, and check that it decides at least one non-obvious case. | A matrix freezes decisions too early and rots; a cost heuristic alone reintroduces ownership ambiguity. | Product Owner |
| 14 | **Guards that can silently un-decide themselves must become testable acceptance criteria.** Portal disabled, gateway disconnected, no client-facing link, no tax UI. | A headless integration stops being headless the first time someone enables a convenient feature. | Product Owner / Tester |

---

## Incident — 2026-07-30: pipeline stalled on retired scope, and pivot documentation lost

**Symptom.** `project-state.json` went to `status: error`. The Dev Team refused to implement
**sprint-2 / US-9 / AC-9.3** because that AC required Testimonials, Packages, and FAQ collections —
scope the pivot had removed entirely. The refusal was correct behaviour.

**Root cause 1 — the pivot was never applied to the machine-readable state.** The pivot was recorded
in markdown. `scrum-master/sprint2.json` still had US-9 in `draft` and US-10 through US-13 live,
describing the retired Gallery-Engine direction. The orchestrator reads the JSON, so it dispatched
retired work. Fixing AC-9.3 alone would have produced the identical refusal on US-10, then US-11,
US-12 and US-13 — four more stalls.

**Root cause 2 — the pivot documentation was never committed.** `PRD.md`, `scrum-master.md`,
`po-requests.md` and `retrospective.md` existed only as modified-but-uncommitted tracked files. The
orchestrator switches between `main` and `feature/US-9` repeatedly; one of those switches discarded
every modification, reverting all four files to their pre-pivot committed state. The untracked files
(`PRD-archive.md`, `sprint3.json`, `sprint3.md`) survived, which is the diagnostic signature. The
Product Owner restored the four documents from context.

**Why this was severe.** For a period, `CLAUDE.md` described the post-pivot direction while
`scrum-master/PRD.md` — the document `CLAUDE.md` names as authoritative — contained the *retired*
Gallery-Engine direction. Any agent reading the PRD would have built the wrong product with full
documentary justification.

| # | Action | Rationale | Owner |
|---|--------|-----------|-------|
| 15 | **A direction change is not applied until every affected sprint JSON is updated in the same change.** Markdown alone does not stop an agent being handed retired work. Retire the stories in the JSON, and prefix retired AC text with `[RETIRED — DO NOT IMPLEMENT]` so it is visible even when only the AC string is read. | The pipeline stalled on exactly this gap, with four more stalls queued behind it. | Product Owner |
| 16 | **Commit planning and direction documentation immediately; never leave it uncommitted across an orchestrator run.** The orchestrator switches branches freely and will silently destroy uncommitted tracked-file changes. | An entire pivot PRD was lost this way and had to be reconstructed. | Product Owner / Project Lead |
| 17 | **When an agent refuses work, treat the refusal as a signal about the backlog, not a failure of the agent.** The correct first question is "is this task still valid?", not "why won't it comply?" | The Dev Team's refusal was the only thing that prevented retired scope being built. | Project Lead |

