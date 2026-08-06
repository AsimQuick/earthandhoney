---
project: earthandhoney
type: master
created: 2026-07-18
last-updated: 2026-08-07
last-updated-by: product-owner
current-sprint: sprint-4
sprint-phase: planning
pivot-date: 2026-07-30
tech-stack:
  backstage: PicPeak fork (pinned commit)
  frontstage: Next.js App Router, TypeScript, React Server Components, Tailwind, shadcn/ui
  cms: Payload CMS (Frontstage only)
  database: PostgreSQL (one server, separate logical databases per system)
  storage: Cloudflare R2
  payments: Stripe (ported convention) — the only money path, one webhook endpoint
  ledger: Invoice Ninja, headless (API only; portal disabled, gateway disconnected), own VPS/compose
  email: SMTP via the Backstage email queue (default owner of all client-facing mail)
  deployment: dedicated VPS, Docker Compose, single reverse proxy
---

# Scrum Master — earthandhoney

## Current Sprint: sprint-4 (Planning — ready for dev pickup, 2026-08-07)

> **The product is NOT feature-complete.** No `*_SPEC.md` feature-specification document exists
> anywhere in this repository (verified by repo-wide search, excluding `node_modules/` and
> `vendor/`), so remaining scope comes from the post-pivot PRD's phase plan (§34) and the post-pivot
> product backlog, exactly as it did for sprints 1–3. Sprint 4 takes backlog items 1–7 plus the
> sprint-3 carry-overs; **backlog items 8–42 remain**, covering Frontstage publishing, the darkroom,
> the Project cockpit and Project Room, the headless ledger and Stripe, email/contracts/delivery, and
> hardening/launch. PRD Phases 4–8 are all still open.

---

## Sprint-4 (Planning, 2026-08-02 · tracker synced 2026-08-07)

**Sprint Goal:** Make the post-pivot direction real on `main`, then lay the Frontstage foundation on
top of the fork proven in sprint 3 — restore the authoritative pivot documentation, route the
sprint-3 findings that never reached the Product Owner, complete PRD Phase 2 (ownership boundaries)
and start Phase 4 (Frontstage publishing).

Full plan: `scrum-master/sprint4.json` (machine-readable, authoritative) · human-readable mirror:
`scrum-master/sprint4.md` (generated from the JSON — do not edit directly, per Reminder 15).

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

| ID | Title | Priority | Depends on | Backlog | Issue |
|----|-------|----------|------------|---------|-------|
| US-21 | Restore the authoritative post-pivot documentation onto `main` and correct the ownership record | critical | — | sprint-3 carry-over | [#64](https://github.com/AsimQuick/earthandhoney/issues/64) |
| US-22 | Route the sprint-3 findings: reopen the contract-signing decision and register F1–F9 | critical | US-21 | sprint-3 carry-over | [#65](https://github.com/AsimQuick/earthandhoney/issues/65) |
| US-23 | Design-token lock-down: the shared token set every Frontstage and Project Room surface is built from | critical | US-21 | #1 | [#66](https://github.com/AsimQuick/earthandhoney/issues/66) |
| US-24 | Studio identity: one `StudioProfile` and the photographer's bounded branding controls | high | US-21, US-23 | #3 | [#67](https://github.com/AsimQuick/earthandhoney/issues/67) |
| US-25 | Gallery Placement: a Frontstage page renders a Backstage gallery through the agreed API boundary | critical | US-21, US-23 | #4 | [#68](https://github.com/AsimQuick/earthandhoney/issues/68) |
| US-26 | A Backstage change triggers a Frontstage content refresh through a verified webhook | high | US-25 | #6 | [#69](https://github.com/AsimQuick/earthandhoney/issues/69) |
| US-27 | Disable the duplicate Backstage surfaces so every business function has exactly one owner | high | US-21 | #2 | [#70](https://github.com/AsimQuick/earthandhoney/issues/70) |
| US-28 | Pivot execution: retire the superseded Frontstage gallery artifacts and the orphaned configuration | medium | US-25 | #5 | [#71](https://github.com/AsimQuick/earthandhoney/issues/71) |
| US-29 | Benchmark the R2 delivery paths and close the deferred delivery decision with evidence | high | US-25 | #7 | [#72](https://github.com/AsimQuick/earthandhoney/issues/72) |

9 stories / 51 acceptance criteria, all `draft` and unstarted. US-21 is the single root. US-22, US-23
and US-27 fan out from it in parallel; US-24 and US-25 need the tokens; US-26, US-28 and US-29 all
need a Frontstage page that actually renders a Backstage gallery. The graph is acyclic.

### Tracker sync — 2026-08-07

Issues **#64–#72 generated directly from `sprint4.json`**, one per story, each carrying its full
acceptance-criteria list and the fourteen-item sprint-4 definition of done, so the tracker cannot
disagree with the plan (Reminder 15). Every issue body opens with the US-21 warning that `main`'s
`PRD.md` and `CLAUDE.md` are still the retired Gallery-Engine direction — an agent handed only the
issue must not build from them. The issue number is stored back on each story in `sprint4.json`.

Two drifts were found and closed in the same pass:

1. **Sprint-3 issues #50–#56 were still open** although all seven stories are `done`, merged across
   PRs #57–#63 and signed off by the Tester on 2026-08-02. All seven are now closed with a comment
   citing the review. An open issue for delivered work is the same class of tracker/plan divergence
   that let retired sprint-2 work stay dispatchable.
2. `sprint4.json`'s `last_updated` advanced to 2026-08-07 and the previously empty `issue` field on
   each story is populated.

**Plan re-validated against the schema at sync time — no change needed:** every story carries
`status`, `priority`, `dependencies`, `dev_status`/`dev_notes`, `tester_status`/`tester_notes`; every
AC carries `checked`, `dev_status`, `tester_status`; AC numbering matches its story throughout
(US-23 → 23.1…23.7); all 51 ACs are `checked:false` and unstarted; all 9 stories are `draft`; every
dependency resolves to a story in this sprint and the graph is acyclic with US-21 as the single root.

**The blocking finding below was re-verified on 2026-08-07, not assumed:** commit `9624a07` is
reachable only from `feature/US-9` and `origin/feature/US-9` (`git branch -a --contains`); `main`'s
`PRD.md` is 937 lines opening on the retired Gallery-Engine positioning; `main`'s `CLAUDE.md` is 61
lines; and `main`'s `sprint2.json` still reads `phase: planning` with US-9 `in-progress` and
US-10…US-13 `draft`. It still holds.

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

## Product Backlog (post-pivot)

Detailed acceptance criteria exist for the **current sprint only**. Sprint-4 candidates are
one-liners here and get full criteria when sprint 3 closes. Ordering follows the PRD phase plan.

### Sprint-4 candidates — Frontstage foundation (PRD Phase 2 completion + Phase 4 start)
1. **Design-token lock-down** — establish and lock the shared token set before any new page is
   built. *(Product Owner recommendation, **pending human confirmation** — see `po-requests.md`.)*
2. Disable the duplicate Backstage surfaces identified in US-18 (its landing-page CMS, its native
   billing screens, its page-building capability).
3. Studio identity: a single `StudioProfile` owning business name, contact details, service areas,
   social profiles, default social image, and default metadata patterns — no studio detail scattered
   through code.
4. Gallery Placement model: reference a Backstage gallery from a Frontstage page and render it.
5. Retire or repurpose the superseded Payload gallery artifacts per the US-14 decision.
6. Backstage change triggers a Frontstage content refresh via webhook.
7. R2 delivery-path benchmark and decision (deferred from US-19).

### Frontstage publishing (PRD Phase 4)
8. Navigation: Weddings, Engagements, Details — configurable through structured fields.
9. Homepage template: full-width slideshow hero placement, short introduction, selected galleries
   or stories, primary inquiry form, footer.
10. Deterministic **New Page** form and standard page template.
11. **Details** template: minimal heading, full-width masonry placement, inquiry form.
12. **Story** template: repeating section heading + text + gallery placement.
13. Form builder + durable Inquiry records, notification, spam protection, source/campaign capture.
14. SEO system: account-level fields, per-page/story SEO assistant, real metadata, structured data,
    canonical URLs, sitemap and image-sitemap entries.

### Gallery experience and darkroom (PRD Phase 5)
15. Masonry specification: preserve every aspect ratio and the chosen order, never crop or stretch,
    reserve space before load, responsive column counts.
16. Slideshow specification: full-width, focal-point cover behaviour, controlled overlay and
    vignette presets, preload current and next only.
17. Shared fullscreen viewer: instant from a loaded image, zoom and pan, keyboard and touch,
    background prefetch, no unauthorised original download.
18. Copy the Backstage gallery style templates verbatim, then create Earth & Honey variants.
19. Darkroom experience: contact sheet, multi-select and bulk actions, ordering, cover and focal
    point, filters, draft/publish, activity log.
20. New Gallery entry choice: Portfolio Gallery or Client Delivery Gallery, with the right fields
    for each and Project prefill instead of retyping.
21. Alt-text suggestion workflow: self-hosted caption model benchmarked for quality, speed, memory,
    and licence; combined with trusted Project metadata; human approval required; never invents
    identity, culture, relationships, or locations.

### Project cockpit and Project Room (PRD Phase 3)
22. Extend the Backstage Project via new migrations: events, venues, milestones, next action,
    documents, integration status.
23. Two entry paths: convert an Inquiry, or create a Project manually.
24. Automatic Project setup: media area, Project Room access, default phase and milestones,
    next-action calculation, document area, email merge context, activity timeline.
25. Photographer Project cockpit with computed next action.
26. Client-safe Project Room, with state conveyed by text and icon as well as colour.

### Finance and payment (PRD Phase 6)
27. Narrowed ledger spike: confirm the Invoice Ninja API covers invoice, credit-note, receipt, and
    payment-schedule creation cleanly **with the portal disabled and the gateway disconnected**.
    Stand it up in `docker-compose.yml` on our VPS. Produce `INVOICE_NINJA_INTEGRATION.md` written
    around The Ledger Rule.
28. Headless-ledger adapter: one server-side service, cross-system identifier mapping, verified
    webhooks, idempotent handling, retries, scheduled reconciliation, display-only caches.
29. Build the payment flow on the convention extracted in US-20: the ported direct Stripe flow, one
    webhook endpoint in the fork backend, reconciled into the ledger. One payment path, one Pay
    button, no duplicate ledger.
30. Booking packet / quote workflow in the Project Room, with a manually prepared visual PDF
    attachment. Quote approval is our surface, not the ledger's.
31. Payment schedule / installments: a Project may carry dated amounts, each producing a real ledger
    invoice with reminders and a Pay button. **Manual pay only in V1.**
32. Payment-gated gallery access, standard case only (PRD §27.1): gallery ready → notification →
    locked → client pays → verified webhook → recorded → unlocked. A later add-on invoice must never
    relock an already released gallery. **No bespoke revocation/relocking logic is in scope.**
33. Headless guards as testable criteria: ledger portal disabled, ledger gateway disconnected, no
    client-facing link to the ledger, no tax UI anywhere.

### Email, contracts, delivery (PRD Phase 7)
34. Email ownership matrix implemented — one owner per email type; duplicate reminders are defects.
35. Template editor, Project-level overrides, merge fields, preview, test send, history, pause.
36. Reminder matrix with editable defaults that stop when their milestone completes.
37. Contract flow: chosen e-sign provider **or** manual signed-PDF upload with audit entry
    *(open decision — see `po-requests.md`)*.
38. Private gallery lifecycle: draft, ready, sent, viewed, download-enabled, expired, archived,
    purged — with noindex, revocable access, logging, and expiry reminders. Purge must never
    destroy images still referenced by a public gallery.

### Hardening and launch (PRD Phase 8)
39. VPS deployment: Docker Compose, one reverse proxy, TLS, monitoring, backups with a **tested**
    restore, deployment rollback, staging or protected preview. Produce `VPS_DEPLOYMENT.md`.
40. Capacity check against real batch sizes: image processing memory, worker concurrency, archive
    generation, simultaneous gallery visitors, R2 bandwidth, backup duration.
41. Security review: least-privilege storage credentials, verified webhooks everywhere, rate limits
    on login/forms/magic links/downloads, mail authentication records before production email,
    audit logs for sends, payments, gallery unlocks, and destructive actions.
42. Performance, accessibility, and mobile QA against the stated targets.

### V2 — LumaForge (NOT in scope, captured only so it cannot leak into a sprint)
- Photographer self-signup, subscription billing, plan controls
- Tenant and custom-domain provisioning, shared or cell-based hosting
- Multiple studios logging in through a shared product
- Shared multi-tenant database conversion
- A LumaForge public marketing site
- `V2_TENANCY_ADR.md` — the one V2 artifact worth writing early, because it constrains V1 seams.
  Scheduled after the Project cockpit exists, not before.

### Explicit non-goals (do not build, do not backlog)
Drag-and-drop page design · photo retouching or editing · generic e-commerce cart or catalogue ·
permanent client hosting · automatic visual proposal-PDF generation · mass-generated location pages ·
the Backstage's native accounting as the financial authority · rebuilding the forked gallery logic in
Payload · rebuilding billing logic · building a signature platform from scratch ·
WhatsApp lead-capture · Testimonials, Packages, or FAQ collections ·
**any client-facing ledger surface (its portal, its client login, or a link to it)** ·
**a tax / GST-HST / bookkeeping feature surface** ·
**automatic recurring card charges in V1** ·
**bespoke revocation or relocking of an already-released gallery**.

---

## Reminders (cross-sprint constraints)

1. **Seven decisions may not be made by any agent alone** (PRD §5). Use `needs-decision` and
   escalate: what of the codebase is retained; the Frontstage↔Backstage API boundary; media reuse
   across galleries; the R2 delivery path; the contract-signing provider; VPS capacity for real batch
   sizes; and any use of the ledger beyond its approved ownership rows, including letting it send a
   given email type. *(Two former entries are settled as of 2026-07-30: Stripe is initiated by the
   **ported direct flow** with the ledger gateway disconnected, and the ledger runs on **our VPS in
   our `docker-compose.yml`**.)*
2. **Never edit an already-shipped upstream migration.** Add new numbered migrations.
3. **Copy upstream style templates verbatim first**, preserve the originals, then vary deliberately
   and record it in `FORK_CHANGELOG.md` and `PICPEAK_PORT_LEDGER.md`.
4. **One Postgres server, separate logical databases, no cross-database joins.** Cross-system
   relationships are stored external identifiers, resolved over an API.
5. **Stripe key pairing.** Secret key, publishable key, and every priced-item identifier must be from
   the same Stripe mode. This has already failed once on this project. Validate at start-up.
6. **`.env.example` is authoritative for every required variable.** Two sprint-1 defects hid behind
   uncommitted local config. No secret is ever committed.
7. **`retrospective.md` is updated incrementally during the sprint**, with a named owner — it was
   the sole reason sprint 1 could not be cleanly signed off.
8. **`public/photobuddy/` is inspiration and reusable code only.** It is not the design authority,
   and the site does not have to match it.
9. **Photo-driven, minimal friction.** Prefer big imagery and a simple contact form over elaborate
   capture flows.
10. **`project-state.json` belongs to the Project Lead.** No agent modifies it.
11. **The Ledger Rule governs every finance question.** Records go to the headless ledger;
    experiences are ours; Stripe alone moves money. The ledger's portal stays disabled, its gateway
    stays disconnected, and no client-facing surface ever links to it. Cost may decide *how* we
    implement something, never *where the truth lives*.
12. **Tax is never product surface.** No tax breakdown UI, rate picker, registration-number field, or
    settings screen, and no tax story in the backlog. If a tax line appears on a document it is
    because the ledger was configured once in its own admin.
13. **No automatic recurring card charges in V1.** Payment schedules exist; each installment is paid
    manually. Saved cards, off-session SCA/3DS recovery, and dunning are V1.1.
14. **Standard case only for payment gating** (PRD §27.1). Do not spec revocation or relocking of an
    already-released gallery — that is a human business matter, not a system feature.
15. **A direction change is not applied until the sprint JSON is updated.** The JSON is what the
    orchestrator reads. Markdown alone does not stop an agent being handed retired work — this is
    exactly what stalled the pipeline on 2026-07-30.
16. **Documentation changes must be committed.** Uncommitted working-tree documentation has already
    been destroyed once by a branch switch.

## Required Product Owner deliverables (PRD §38)

| Document | Sprint | Story |
|---|---|---|
| `PIVOT_AUDIT.md` | 3 | US-14 |
| `PICPEAK_UPSTREAM.md`, `THIRD_PARTY_NOTICES.md`, `FORK_CHANGELOG.md`, `UPSTREAM_SYNC.md` | 3 | US-15 |
| `PICPEAK_PORT_LEDGER.md` | 3 | US-17 |
| `SYSTEM_OWNERSHIP.md`, `PAYLOAD_PICPEAK_API_CONTRACT.md` | 3 | US-18 |
| `MEDIA_REUSE_ADR.md`, `R2_STORAGE_AND_DELIVERY_ADR.md` (delivery decision completed in sprint 4) | 3 | US-19 |
| `STRIPE_PORT_REPORT.md` (convention now; payment behaviour appended when built) | 3 | US-20 |
| `INVOICE_NINJA_INTEGRATION.md` (written around The Ledger Rule) | finance phase | backlog #27 |
| `VPS_DEPLOYMENT.md` | launch phase | backlog #39 |
| `V2_TENANCY_ADR.md` | after Project cockpit | V2 section |

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
