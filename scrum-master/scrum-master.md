# Scrum Master — earthandhoney

## Current Sprint: sprint-4 (Planning, 2026-08-02)

> **The product is NOT feature-complete.** No `*_SPEC.md` feature-specification document exists
> anywhere in this repository (verified by repo-wide search, excluding `node_modules/` and
> `vendor/`), so remaining scope comes from the post-pivot PRD's phase plan (§34) and the post-pivot
> product backlog, exactly as it did for sprints 1–3. Sprint 4 takes backlog items 1–7 plus the
> sprint-3 carry-overs; **backlog items 8–42 remain**, covering Frontstage publishing, the darkroom,
> the Project cockpit and Project Room, the headless ledger and Stripe, email/contracts/delivery, and
> hardening/launch. PRD Phases 4–8 are all still open.

---

## Sprint-4 (Planning, 2026-08-02)

**Sprint Goal:** Make the post-pivot direction real on `main`, then lay the Frontstage foundation on
top of the fork proven in sprint 3 — restore the authoritative pivot documentation, route the
sprint-3 findings that never reached the Product Owner, complete PRD Phase 2 (ownership boundaries)
and start Phase 4 (Frontstage publishing).

Full plan: `scrum-master/sprint4.json` (machine-readable, authoritative).

### ⚠ Blocking finding surfaced during planning — the pivot never reached `main`

The pivot recovery commit `9624a07` lives **only on branch `feature/US-9`** and was never merged.
`main` therefore still holds:

| Artifact | On `main` today | Authoritative version (on `feature/US-9`) |
|---|---|---|
| `scrum-master/PRD.md` | Retired **Gallery-Engine** PRD, 937 lines, dated 2026-07-19 | Post-pivot PRD, 1855 lines, with §25 The Ledger Rule and §34 the phase plan |
| `CLAUDE.md` | Pre-pivot, 61 lines — names Better Auth, Resend, Adobe Sign, `Sessions`, Testimonials/Packages/FAQ | Post-pivot, 218 lines — Three Surfaces, 8 pillars, Ledger Rule, Stripe Port Rule |
| `scrum-master/scrum-master.md` | No post-pivot backlog | 486 lines incl. Product Backlog items 1–42 and Reminders 1–16 |
| `scrum-master/sprint2.json` | `phase: planning`, US-9 `in-progress`, **US-10…US-13 still `draft`** | `phase: complete`, US-10…US-13 marked `retired` |

Two consequences are already measurable, not hypothetical:

1. **`SYSTEM_OWNERSHIP.md` — a sprint-3 deliverable that passed its quality gate — is wrong in four
   rows.** It names **Better Auth** as the auth owner and **Resend** as the email owner, lists
   Testimonials/Packages/FAQ as Payload CMS content, and predates The Ledger Rule — because it was
   written against `main`'s stale `CLAUDE.md`. All of those were retired by the pivot.
2. **The orchestrator can still be handed retired sprint-2 work** (WhatsApp lead capture,
   Testimonials/Packages/FAQ pages) from `main`'s `sprint2.json` — precisely what stalled the
   pipeline on 2026-07-30.

This is Reminder 15 (*a direction change is not applied until the sprint JSON is updated*) and
Reminder 16 (*documentation changes must be committed*) failing together. **US-21 closes it and
blocks every other sprint-4 story.**

### Stories

| ID | Title | Priority | Depends on | Backlog |
|----|-------|----------|------------|---------|
| US-21 | Restore the authoritative post-pivot documentation onto `main` and correct the ownership record | critical | — | sprint-3 carry-over |
| US-22 | Route the sprint-3 findings: reopen the contract-signing decision and register F1–F9 | critical | US-21 | sprint-3 carry-over |
| US-23 | Design-token lock-down: the shared token set every Frontstage and Project Room surface is built from | critical | US-21 | #1 |
| US-24 | Studio identity: one `StudioProfile` and the photographer's bounded branding controls | high | US-21, US-23 | #3 |
| US-25 | Gallery Placement: a Frontstage page renders a Backstage gallery through the agreed API boundary | critical | US-21, US-23 | #4 |
| US-26 | A Backstage change triggers a Frontstage content refresh through a verified webhook | high | US-25 | #6 |
| US-27 | Disable the duplicate Backstage surfaces so every business function has exactly one owner | high | US-21 | #2 |
| US-28 | Pivot execution: retire the superseded Frontstage gallery artifacts and the orphaned configuration | medium | US-25 | #5 |
| US-29 | Benchmark the R2 delivery paths and close the deferred delivery decision with evidence | high | US-25 | #7 |

9 stories / 51 acceptance criteria, all `draft` and unstarted. US-21 is the single root. US-22, US-23
and US-27 fan out from it in parallel; US-24 and US-25 need the tokens; US-26, US-28 and US-29 all
need a Frontstage page that actually renders a Backstage gallery. The graph is acyclic. GitHub issues
are not yet filed — regenerate them from `sprint4.json` so the tracker cannot disagree with the plan.

### Why PRD Phase 3 is deliberately excluded

The Project cockpit and Project Room (backlog items 22–26) depend on PicPeak's native
contract-signing capability, whose verification **failed** on one of seven elements (AC-17.10 — the
audit page is a separate sibling PDF, never merged into the signed contract). US-22 reopens that
decision. Building a Project Room on it now would inherit a known-false premise.

### Definition of Done (sprint-wide)

The sprint-3 twelve-item DoD, carried forward with three changes: routing to `po-requests.md` is now
part of closing an AC that requires it (sprint 3 documented F1–F9 and never routed them); the
retrospective has a **named owner and an in-sprint checkpoint** rather than an intent (unmet in both
sprint 1 and sprint 3); and `logs/` must be read for the session exit reason before any failed
criterion is rewritten. Full list in `sprint4.json`.

### Explicitly out of scope for sprint-4

Anything financial (PRD Phase 6) · Project cockpit and Project Room (Phase 3) · contracts and the
email matrix (Phase 7) · deployment and hardening (Phase 8) · the alt-text model benchmark · the form
builder · the SEO assistant · and every standing non-goal — in particular any tax surface, any
client-facing ledger surface, automatic recurring card charges, and WhatsApp lead capture.

---

## Sprint-3 (Review — Complete, 2026-08-02)

---

## Sprint-3 Review Summary (2026-08-02)

**Result: Delivered.** All 7 stories (US-14…US-20) and all 70 acceptance criteria are `done`, merged to `main` across 7 PRs (#57–#63), each with green CI (`smoke` + `test`). Every story carries a Tester **PASS** quality gate. Deploy: **PASSED** — all verification tiers passed (`deploy_summary`, `sprint3.json`), closing the sprint-1 carry-over where the sprint-close deploy 404'd.

| Story | Title | ACs | PR | Merged | Status |
|-------|-------|-----|----|--------|--------|
| US-14 | Pivot audit: keep / replace / retire map for the existing codebase | 6/6 | [#57](https://github.com/AsimQuick/earthandhoney/pull/57) | 2026-07-30 | done |
| US-15 | Verify PicPeak upstream and create the pinned fork with licence compliance | 6/6 | [#58](https://github.com/AsimQuick/earthandhoney/pull/58) | 2026-07-31 | done |
| US-16 | Boot the forked Backstage in Docker on PostgreSQL + existing R2 credentials | 6/6 | [#59](https://github.com/AsimQuick/earthandhoney/pull/59) | 2026-07-31 | done |
| US-17 | Prove the forked Backstage delivers the real photography flow | 32/32 | [#60](https://github.com/AsimQuick/earthandhoney/pull/60) | 2026-08-02 | done |
| US-18 | Document system ownership and the Frontstage-to-Backstage boundary | 6/6 | [#61](https://github.com/AsimQuick/earthandhoney/pull/61) | 2026-08-02 | done |
| US-19 | Decide and record the media-reuse model, and audit the existing R2 setup | 5/5 | [#62](https://github.com/AsimQuick/earthandhoney/pull/62) | 2026-08-02 | done |
| US-20 | Extract the proven Stripe key-pairing and environment convention | 9/9 | [#63](https://github.com/AsimQuick/earthandhoney/pull/63) | 2026-08-02 | done |

**Sprint goal met.** The pivot was de-risked before anything was built on it:

- **Pivot map approved** — `PIVOT_AUDIT.md` inventories all 40 sprint-1/sprint-2 delivered ACs exactly once as Kept / Replaced by PicPeak / Repurposed as Frontstage / Retired, names the superseded artifacts and orphaned env vars, maps the five duplicate-feature risks to a single owner each, and closes with a recommendation plus an open-questions list.
- **Licence-compliant pinned fork** — PicPeak upstream verified by reading the actual `LICENSE` file (MIT; stop-condition not triggered), pinned at commit `eb263137b98935754155824de2a03848121304b6`, vendored under `vendor/picpeak/`. `PICPEAK_UPSTREAM.md`, `THIRD_PARTY_NOTICES.md`, `FORK_CHANGELOG.md` and `UPSTREAM_SYNC.md` all created. A SHA-1 migration manifest proves **no already-shipped upstream migration was modified**.
- **Fork proven, not assumed** — Backstage + db + worker run as `docker-compose` services addressed by hostname; Postgres migrations clean on an empty DB and idempotent on re-run; the **existing** R2 bucket reused via S3-compatible settings with no parallel store. The full photography flow (client → project → gallery → upload → protection → expiry → download → email → webhook) and PicPeak's native contract-signing capability were reproduced live against the pinned code.
- **Four blocking decisions settled** — system ownership and the Frontstage-to-Backstage API boundary in `PAYLOAD_PICPEAK_API_CONTRACT.md`; the media-reuse model and the R2 audit in `R2_STORAGE_AND_DELIVERY_ADR.md`. The R2 **delivery path is deliberately recorded as UNDECIDED** with five candidate paths, four measurement targets and explicit performance thresholds — a benchmark obligation for sprint-4, not a preference chosen early (AC-19.5).
- **Stripe convention extracted** — `STRIPE_PORT_REPORT.md` records the reference project's flat, mode-agnostic key-pairing convention, reproduces it in `.env.example` with per-variable comments, and fixes the V1 (manual-pay installment schedule) / V1.1 (auto-charge on the same schedule) boundary — never a Stripe Subscription product.

**Definition of Done:** 11 of 12 items met with direct evidence. Item 9 (`retrospective.md` updated **incrementally during the sprint, not at close**) was **UNMET** — the file contained only sprint-1 content until this review. This is a repeat of sprint-1's single sign-off blocker and of sprint-1 action item #1.

**Defects and findings (all disclosed, none hidden):**
- **One verified vendor defect** — single-image gallery download hangs against S3/R2 (`vendor/picpeak/backend/src/routes/gallery.js:631` never resolves through the storage backend, unlike its download-all/download-selected siblings). Disposition decided by the Project Lead (po-requests item 11): patch the fork narrowly **and** report upstream. Registered in `FORK_CHANGELOG.md`, `PICPEAK_UPSTREAM_DEFECTS.md` and `UPSTREAM_SYNC.md` — not a silent workaround. The upstream bug report is **prepared, not submitted** (needs a human to publish it).
- **Nine honest upstream findings (F1–F9)** in `PIVOT_AUDIT.md` where the pinned fork behaves differently than the PRD assumed — e.g. a Gallery does not auto-inherit its Project's Client (F1), no `aspect_ratio` column (F4), ~1 hour of expiry-enforcement lag (F5), missing `gallery_expired`/`archive_complete` email templates (F9).
- **One requirements defect** — AC-16.6 was correctly returned by the Tester as unexecutable (it required migrations no story creates). Reworded rather than deferred or padded; the extension-migration upgrade proof is explicitly deferred and recorded in `UPSTREAM_SYNC.md`.
- **One CI defect** — a US-16 test guard asserted live R2 credentials against CI's placeholder `.env` instead of skipping; fixed in `1b54e42` before merge.
- **One wording defect** — AC-18.6's "Gallery" collided with this project's controlled-vocabulary term; caught during requirements validation and fixed before implementation.

**Open follow-ups carried to sprint-4:**
1. **AC-17.10 routing gap (highest priority).** 6 of 7 contract-signing elements were confirmed at the pinned commit; the 7th — *"an audit page baked into the delivered PDF"* — **does not hold**: the fork ships the audit trail as a separate sibling PDF, never merged into the signed contract. The AC requires this be raised in `po-requests.md` as **reopening** the contract-signing decision. `PIVOT_AUDIT.md` documents the finding, but `po-requests.md` item 7 still reads "Confirmed 2026-07-30, conditionally" with no reopening entry. Must be added before any sprint-4 Project Room story relies on that capability.
2. **F1–F9 not yet routed** to `po-requests.md`, as AC-17.9 directs (`PIVOT_AUDIT.md` records them and states they "are to be added").
3. **Upstream defect report for F8/UD-1** is prepared but unsubmitted — needs a human GitHub identity.
4. **Orphaned env vars retained, not removed.** `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL`, `NEXT_PUBLIC_WHATSAPP_NUMBER` (retired US-12/US-13) are marked Retained because removing them would break the US-7 `.env.example` lock-in test. Needs a follow-on pivot-execution story.
5. **Production email** still needs SPF, DKIM and DMARC records for the sending domain.
6. **Sprint-4 sequencing already decided:** design tokens are the first story (po-requests item 8), derived from the photobuddy shell then deliberately modernized — Fraunces + Inter, near-black ink, neutral grey scale, no accent colour (item 9).

**Tracker hygiene:** every story's `status` is `done` and `tester_status` is `done`, but story-level `dev_status` still reads `not-started` across all 7 stories despite every AC showing `dev_status: done`. `sprint3.json` also still reports `"phase": "planning"`. Both are stale-field artifacts, not delivery gaps — see retrospective action item 5.

---

## Sprint-2 (Halted mid-flight by the pivot, 2026-07-30)

Sprint-2 was **not completed and has no review or retrospective section**. `sprint2.json` still records `phase: planning` with US-7 and US-8 `done` (8/8 ACs), US-9 `in-progress` (0/4 checked, with AC-9.3 retired in place), and US-10…US-13 still `draft`. The pivot to the PicPeak Backstage superseded the remaining scope: US-12 and US-13 are recorded as **Retired** in `PIVOT_AUDIT.md`, and the sprint-2 entries in `po-requests.md` are archived as superseded (2026-07-30). No sprint-2 close-out is planned; its delivered and retired items are accounted for in the sprint-3 pivot audit instead.

---

## Sprint-2 (Planning, 2026-07-19)

**Sprint Goal:** Ship the public, lead-generating photography website on top of the Gallery Engine delivered in sprint-1 — port the photobuddy design system into the app shell, add the content-driving CMS collections the photographer manages without a developer, render all public marketing pages (Home, Galleries, Blog, and About with Packages/Testimonials/FAQ sections) with static generation + ISR powered by the existing Gallery Engine, and deliver lead conversion (contact form + WhatsApp capture) — while closing sprint-1's carried-over deploy/CI/flake follow-ups first.

### Why this scope
Sprint-1 delivered the core Gallery Engine IP (data model → Sharp/R2 media pipeline → mobile-first viewer → ISR/lazy performance), proven on internal `noindex` demo routes. The PRD is explicit that the public website's purpose is **lead generation**, and the platform's pillars 1–5 (gallery speed, image quality, mobile experience, CMS simplicity, lead conversion) are all realised by putting a real, content-managed, lead-capturing website in front of that engine. Sprint-2 therefore turns the engine into a shippable public product. Pillar 6 (customer-workflow management) and the client-delivery lifecycle depend on this public front-end and on auth/external integrations, so they are deferred to sprint-3+.

### Stories
| ID | Title | Priority | Depends on | Issue |
|----|-------|----------|------------|-------|
| US-7 | Sprint-1 carry-over: deploy pipeline, clean-checkout CI smoke, live-boot flake stabilization | high | — | [#35](https://github.com/AsimQuick/earthandhoney/issues/35) |
| US-8 | Public site design system + app shell ported from the photobuddy template | high | US-7 | [#36](https://github.com/AsimQuick/earthandhoney/issues/36) |
| US-9 | Content CMS collections: Homepage, Portfolio, Testimonials, Packages, FAQ | high | US-8 | [#37](https://github.com/AsimQuick/earthandhoney/issues/37) |
| US-10 | Blog publishing system (galleries, not featured images) with two sample posts | high | US-9 | [#38](https://github.com/AsimQuick/earthandhoney/issues/38) |
| US-11 | Public marketing pages (Home, Galleries, Blog, About with Packages/Testimonials/FAQ sections) via Gallery Engine + ISR | high | US-8, US-9, US-10 | [#39](https://github.com/AsimQuick/earthandhoney/issues/39) |

_Open questions for the human are tracked in `scrum-master/po-requests.md` (deploy target, Resend credentials, WhatsApp number). None block the start of sprint-2; each blocks production verification of its story._
| US-12 | Lead generation: contact form → Leads collection + Resend email notification | high | US-8 | [#40](https://github.com/AsimQuick/earthandhoney/issues/40) |
| US-13 | WhatsApp lead-capture flow (no anonymous conversations) | medium | US-12 | [#41](https://github.com/AsimQuick/earthandhoney/issues/41) |

### Plan status (reconciled 2026-07-19)
Plan **finalized and ready for dev pickup**: 7 stories / 31 ACs, all `draft` · `not-started` · unchecked. `sprint2.json` validated against the required schema; `sprint2.md` and GitHub issues #35–#41 resynced to the finalized AC text (the tester review pass had sharpened AC-7.3, 8.2, 9.1, 9.4, 12.2 and split AC-11.4 → 11.4 + 11.6 after the issues were first filed). Issue #39 was also retitled to drop the standalone Packages page per the human decision in `po-requests.md` item 4. Story-level `tester_status` reset to `not-started` (the plan-review approval is preserved in each story's `tester_notes`, prefixed `PLAN REVIEW:`) — it records draft review, not implementation testing.

Plan claims spot-checked against the live repo: `.github/workflows/` contains only `ci.yml` (AC-7.1 holds) · `.env.example` lacks the four sprint-2 vars (AC-7.4 holds) · template nav is exactly home/about/galleries/blog/contact with no Packages entry (AC-8.1, AC-11.4 hold) · `contact.html` ships only name/email/subject/message + `photobuddy_fl_message_submit` (AC-12.2 holds) · no `packages.html` exists in the template.

### Definition of Done (sprint-wide)
- All ACs verified by CI
- No critical defects
- Coverage threshold met
- Code file headers include metadata
- All services run in Docker
- `retrospective.md` updated (incrementally, per sprint-1 action item #1)

### Carried-over action items from sprint-1 retrospective (folded into US-7)
- Create `.github/workflows/deploy.yml` (sprint-close deploy 404'd) → AC-7.1
- Add a clean-checkout CI smoke path → AC-7.2
- Stabilize the AC-1.2 live-boot flake → AC-7.3
- Keep `.env.example` authoritative for every required var → AC-7.4

### Explicitly out of scope for sprint-2 (backlog for sprint-3+)
- **Photographer dashboard** (Leads / Clients / Sessions views; Sessions as the central business object linking Contract → Payment → Gallery) — pillar 6
- **Contracts** — Adobe Acrobat Sign (send → sign → webhook → status → signed PDF stored)
- **Payments** — Stripe Checkout + Invoice Ninja (app displays status only, never recreates billing logic)
- **Client gallery delivery lifecycle** — Better Auth-gated private links, password protection, download flow, expiration window, archive (engine display-mode toggles for download/auth already exist from US-3/US-5; the full delivery flow is deferred)
- Advanced SEO/sitemap, analytics, and any items in PRD §14 "Future Enhancements" (print store, ecommerce, Lightroom, mobile app, AI tagging, multi-photographer)

### Artifacts
- Machine-readable plan: `scrum-master/sprint2.json`
- PRD: `scrum-master/PRD.md` · Retrospective: `scrum-master/retrospective.md` · Design template: `public/photobuddy/`

_No SPEC (`*_SPEC.md`) documents are present anywhere in the repo; remaining scope is derived from the PRD and CLAUDE.md pillars, as it was for sprint-1._

---

## Sprint-1 (Review — Complete)

## Sprint-1 Review Summary (2026-07-19)

**Result: Delivered.** All 6 stories (US-1…US-6) and all 28 acceptance criteria are `done` and merged to `main` across 28 PRs (#7–#34), each with clean CI (2/2 `test` checks: `eslint --max-warnings 0`, `tsc --noEmit`, and `jest --coverage` at the 80% global gate, all run via `docker compose run --rm web`).

| Story | Title | ACs | Status |
|-------|-------|-----|--------|
| US-1 | Project foundation: Payload CMS + PostgreSQL in Docker | 5/5 | done |
| US-2 | Media system: Sharp pipeline + Cloudflare R2 storage | 5/5 | done |
| US-3 | Gallery data model: reusable Galleries collection | 5/5 | done |
| US-4 | Gallery Engine core components | 5/5 | done |
| US-5 | Mobile-first interaction (PhotoSwipe, drawer, swipe/keyboard) | 4/4 | done |
| US-6 | Gallery performance: lazy/progressive load, static gen + ISR | 4/4 | done |

**Sprint goal met:** the reusable Gallery Engine IP (data model → Sharp/R2 media pipeline → mobile-first viewer → ISR/lazy performance) was delivered and proven on internal `noindex` demo routes before any public pages — one engine, two display-mode contexts (hero + portfolio), driven purely by gallery settings.

**Definition of Done:** items 1–5 met with direct evidence (CI verification, 80% coverage, code-file metadata headers spot-checked, Docker-only services `web`+`db`, no critical defects). Item 6 (`retrospective.md` updated) was **UNMET at Tester close-out** and has now been remedied — see `scrum-master/retrospective.md`.

**Defects during sprint (all resolved before merge):** AC-1.1 missing `.env` creation step in CI; AC-1.3 latent empty `PAYLOAD_SECRET`; AC-6.3 live-test `first-register` race on shared Postgres. One known non-blocking local-only flake remains documented (AC-1.2 live-boot timeout under full-suite parallelism).

**Open follow-ups (carried to next sprint):** `.github/workflows/deploy.yml` does not exist (sprint-close deploy 404'd); stabilize the AC-1.2 live-boot test; add a clean-checkout CI smoke path. Full action list in `retrospective.md`.

---

## Sprint-1 (Planning)

**Sprint Goal:** Establish the project foundation (Payload CMS + PostgreSQL + Cloudflare R2, all in Docker) and deliver the **core Gallery Engine IP** — the reusable gallery data model, Sharp image pipeline, and mobile-first gallery viewer components — **before** any public website pages are built.

### Why this scope
The PRD and CLAUDE.md are unambiguous: the **Gallery Engine is the core IP and must be built before any website pages**. The gallery — not the image — is the primary content object, and one reusable engine must power the hero, portfolio, blog, and client-delivery experiences. Sprint-1 therefore concentrates entirely on foundation + engine. Public pages, lead generation, the photographer dashboard, contracts, and payments are intentionally deferred to later sprints so they can build on a proven engine.

### Controlled Vocabulary
- **Gallery** — the primary, reusable content object (title, description, ordered images[], cover image, settings). Not "a set of images."
- **Media** — a reusable image asset with original + thumbnail/medium/large variants + metadata + alt text, stored in Cloudflare R2.
- **Gallery Engine** — the single reusable component set that renders any gallery in any display mode.
- **Display Mode** — a gallery-settings-driven configuration (Hero, Portfolio, Blog, Client Delivery) toggling slideshow / hover-preview / fullscreen / download / authentication.

### Stories
| ID | Title | Priority | Depends on |
|----|-------|----------|------------|
| US-1 | Project foundation: Payload CMS + PostgreSQL in Docker | high | — |
| US-2 | Media system: Sharp image pipeline with Cloudflare R2 storage | high | US-1 |
| US-3 | Gallery data model: reusable Galleries collection in Payload | high | US-1, US-2 |
| US-4 | Gallery Engine core components (container, main display, thumbnails, nav, gradient overlay) | high | US-3 |
| US-5 | Mobile-first interaction: PhotoSwipe fullscreen, thumbnail drawer, swipe & keyboard nav | high | US-4 |
| US-6 | Gallery performance: progressive/lazy loading, partial load, static generation + ISR | high | US-4 |

### Definition of Done (sprint-wide)
- All ACs verified by CI
- No critical defects
- Coverage threshold met
- Code file headers include metadata
- All services run in Docker
- `retrospective.md` updated

### Explicitly out of scope for sprint-1 (backlog for later sprints)
- Public website pages (Home, Portfolio, Blog, Packages, About, Contact)
- Lead generation: contact form + WhatsApp lead-capture flow
- Photographer dashboard (Leads, Clients, Sessions)
- Contracts (Adobe Acrobat Sign), Payments (Stripe + Invoice Ninja)
- Client delivery lifecycle (expiration windows, password links, archive) — engine settings are wired in US-5, full flow deferred
- CMS collections beyond Media/Galleries (Portfolio, Blog, Homepage, Testimonials, Packages, FAQ)

### Artifacts
- Machine-readable plan: `scrum-master/sprint1.json`
- PRD: `scrum-master/PRD.md`
- Project instructions: `CLAUDE.md`

_No SPEC (`*_SPEC.md`) documents are present; scope was derived from the PRD and CLAUDE.md._
