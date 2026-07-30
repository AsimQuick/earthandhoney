---
project: earthandhoney
type: master
created: 2026-07-18
last-updated: 2026-07-30
last-updated-by: product-owner
current-sprint: sprint-3
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

# earthandhoney — Scrum Master

> **PIVOT — 2026-07-30.** The product direction changed. The authoritative PRD is
> `scrum-master/PRD.md`. The previous direction is archived at `scrum-master/PRD-archive.md`
> and is **historical only** — nothing may be planned or built from it.
> The most consequential change: **we no longer build our own Gallery Engine.** We fork a proven
> Backstage (PicPeak) and own the Frontstage, branding, workflow, and delivery layers on top of it.

> **FINANCE REVISION — 2026-07-30 (approved).** Invoice Ninja is now **headless**: an API-only ledger
> and document generator with **no client portal and no client-facing surface**. The client only ever
> sees the Project Room. The governing statement is **The Ledger Rule** in `CLAUDE.md` and PRD §25.
> Consequences: one payment path (the ported direct Stripe flow, gateway disconnected); the Backstage
> email queue owns client-facing mail by default; tax is never product surface; automatic recurring
> card charges are deferred to V1.1; the eight "decisions no agent may make alone" are now seven.
> **Sprint 3 scope is unchanged by this** — it lands in the finance phase.

> **RECOVERY NOTE — 2026-07-30.** This file, `PRD.md`, `po-requests.md`, and `retrospective.md` were
> reverted to their pre-pivot committed state by an uncommitted-working-tree loss during orchestrator
> branch switching, and have been restored by the Product Owner. **Resolved:** the pivot and
> finance-revision documentation, together with `sprint3.json` and `sprint3.md`, is committed as of
> `9624a07`, so a branch switch can no longer destroy it. `project-state.json` has since been advanced
> to sprint-3 / planning by the Project Lead, closing the last recovery item — see the "Pipeline
> recovery" section below.

## Current Sprint: sprint-3 (planning)

**Sprint Goal:** de-risk the pivot before anything is built on it — an approved pivot map, a
licence-clean pinned fork, hard evidence the fork does the real photography job on our own
PostgreSQL and R2 inside Docker, the four boundary decisions the next sprint depends on, and the
proven Stripe environment/key-pairing convention extracted from the reference project.

Full plan: `scrum-master/sprint3.md` · machine-readable: `scrum-master/sprint3.json`

| ID | Title | Priority | Depends on | Issue |
|----|-------|----------|------------|-------|
| US-14 | Pivot audit: keep / replace / retire map for the existing codebase | critical | — | [#50](https://github.com/AsimQuick/earthandhoney/issues/50) |
| US-15 | Verify PicPeak upstream and create the pinned fork with licence compliance | critical | US-14 | [#51](https://github.com/AsimQuick/earthandhoney/issues/51) |
| US-16 | Boot the forked Backstage in production-like Docker on PostgreSQL + existing R2 | critical | US-15 | [#52](https://github.com/AsimQuick/earthandhoney/issues/52) |
| US-17 | Prove the forked Backstage delivers the real photography flow | critical | US-16 | [#53](https://github.com/AsimQuick/earthandhoney/issues/53) |
| US-18 | Document system ownership and the Frontstage↔Backstage boundary | high | US-17 | [#54](https://github.com/AsimQuick/earthandhoney/issues/54) |
| US-19 | Decide the media-reuse model; audit the existing R2 setup | high | US-17 | [#55](https://github.com/AsimQuick/earthandhoney/issues/55) |
| US-20 | Extract the proven Stripe key-pairing and environment convention | high | — | [#56](https://github.com/AsimQuick/earthandhoney/issues/56) |

7 stories / 48 acceptance criteria. US-20 has no dependencies and can run in parallel from day one.
US-14 → US-15 → US-16 → US-17 is a strict chain; US-18 and US-19 both fan out from US-17 and can run
in parallel with each other. Issues #50–#56 are open. All stories are `draft` and all 48 ACs are
unstarted — the sprint is ready for requirements validation.

**Final planning pass — 2026-07-30.** US-20 was the one story still carrying pre-revision language.
AC-20.7 told the Dev Team that the payment-initiation choice was *still an open decision*, which
directly contradicted the settled architecture (PRD §26.3, `po-requests.md` item 6). It now records
the settled position instead: the ported direct flow initiates payment, the ledger gateway stays
disconnected, exactly one webhook endpoint exists and lives in the fork backend, a browser redirect
is never proof of payment, and the language-boundary port is recorded in `FORK_CHANGELOG.md`. A new
**AC-20.9** closes the matching scope gap — the reference project is a one-shot checkout with no
saved-card, off-session, or retry logic, so "port faithfully" must not silently pull that in. V1 is a
manual-pay installment schedule; auto-charge is V1.1 on the same schedule, never a subscription
product. This is the same class of failure as the stalled pipeline: a direction change that had
reached the markdown but not the file an agent is actually handed.

**Definition of done** (`sprint3.json`): evidence-not-assertion on every AC; upstream claims verified
against the pinned code rather than documentation; no shipped upstream migration modified; everything
in Docker; no committed secrets and `.env.example` authoritative; every decision record naming the
rejected options; human-input items in `po-requests.md`; CI green; no open critical or major defect;
coverage threshold met without lowering the gate; structured metadata headers on every code file;
`retrospective.md` updated incrementally.

---

## Pipeline recovery — 2026-07-30

**What blocked the pipeline.** `project-state.json` dispatched **sprint-2 / US-9 / AC-9.3** and the
Dev Team correctly refused: AC-9.3 required Testimonials, Packages, and FAQ collections, which the
pivot removed from product scope entirely.

**Root cause.** The pivot was written up in markdown only. `scrum-master/sprint2.json` — the
machine-readable file the orchestrator actually reads — still described the retired Gallery-Engine
direction, with US-9 in `draft` and US-10 through US-13 live. Fixing AC-9.3 alone would have produced
the same refusal on US-10, then US-11, US-12, and US-13.

**Fixed.** `sprint2.json` is now closed: phase `complete`, US-7/US-8/US-9 `done`, AC-9.3 retired
in place with a `[RETIRED — DO NOT IMPLEMENT]` prefix on the AC text itself, and US-10 through US-13
retired with recorded reasons. Nothing was deleted (retrospective action item #10).

**Recovery is closed. Nothing blocks the start of sprint 3.**
1. ~~Commit the pivot and finance documentation.~~ **DONE** — committed in `9624a07`.
2. ~~`project-state.json` needs Project Lead attention.~~ **DONE** — advanced by the Project Lead to
   `status: active`, `current_sprint: sprint-3`, `current_phase: planning`, `current_task: null`,
   with sprint-2 recorded as closed. It can no longer re-dispatch retired sprint-2 work.
3. ~~`sprint3.json` and `sprint3.md` are untracked.~~ **DONE** — both are tracked as of `9624a07`,
   so the orchestrator has a sprint-3 to advance to.

**Carried into the sprint as a standing check, not a blocker:** VPS access (`po-requests.md` item 2)
is still outstanding, so US-16 can be proven in production-*like* Docker but not yet against the real
deployment target. Open decisions 7, 8 and 9 — contract provider, design-token lock-down, and the
token starting point — need human confirmation before sprint-4 planning can close.

---

## Product Definition (post-pivot)

**V1 — Earth & Honey Studios.** A dedicated production deployment of a photography-first studio
operating system for one real wedding and engagement photography business (operating since 2006).

**V2 — LumaForge.** A possible future SaaS for photography studios. Create clean seams for it now;
**do not build the LumaForge business in V1.**

### The three surfaces
- **Frontstage** — the public, photo-driven, lead-generating website. Big full-width imagery,
  restrained copy, minimal-friction contact forms.
- **Backstage** — the private studio operating system and digital darkroom (forked, not written).
- **Project Room** — the protected client-facing project, payment, document, and gallery experience.

**There is no fourth surface.** No integrated system may present its own UI to a client or to the
photographer. If a human sees it, we built it.

### Non-negotiables
- **Fork, don't rebuild.** Use the forked Backstage's database configuration and backend logic
  wholesale. Customise the Frontstage, UX, and branding layer so the product feels like ours.
- **One owner per business function.** Duplicate ownership is a defect, not a style choice.
- **Records versus experiences.** A proven external system may hold records. Every experience is ours.
- **No drag-and-drop page builder.** Structured forms in, deterministic premium output out.
- **The Project exists before the images.**
- **A browser redirect is never proof of payment.**
- **This is not permanent photo hosting.** Defined delivery window, then archive and purge.

---

## Controlled Vocabulary

All agents must use these exact terms in front matter and documentation. This section is the single
source of truth. Terms marked **[retired]** must not appear in any new document.

### Domain terms (post-pivot)
- **Frontstage** — the public website surface (Next.js + Payload). Owns pages, stories, forms,
  inquiries, SEO, navigation, studio identity, and gallery placements.
- **Backstage** — the private studio operating system (forked). Owns galleries, media, uploads,
  derivatives, access, expiry, downloads, watermarks, operational email, and the Project record.
- **Project Room** — the protected client-facing view of a Project: dates, venues, document and
  payment state, image state, galleries, and one clear next action. The only portal a client sees.
- **Project** — the operational backbone and central business object. Exists before the images.
  Connects inquiry, client, dates and venues, quote, contract, invoices, shoot, galleries,
  final payment, delivery, expiry, and closure. **Replaces "Session".**
- **Event** — one dated occasion inside a Project (engagement, mehndi, nikah, ceremony, reception,
  portrait session), each with its own venue, address, coverage notes, and timing.
- **Gallery** — an ordered media collection owned by the Backstage, with its own security, access
  rules, expiry, client relationship, and delivery behaviour. May be Portfolio or Client Delivery.
  May exist with no public page at all.
- **Gallery Placement** — a Frontstage record describing *where* a Gallery appears and *how* it
  renders there (layout, heading, overlay preset, visibility, order). It references a Backstage
  gallery identifier. A placement is never a copy of the gallery.
- **Layout** — how a placement renders: `slideshow` or `masonry`. Fullscreen viewing is shared.
- **Media Asset** — one stored original plus its purposeful derivatives and metadata. Stored once.
- **Derivative** — a generated size serving one purpose: contact sheet, masonry, slideshow,
  fullscreen, watermarked preview, authorised download.
- **Inquiry** — a raw enquiry captured by a Frontstage form. Durable, notified, spam-protected,
  with source page and campaign captured. An Inquiry is **not** automatically a financial client.
  **Replaces "Lead".**
- **Client** — an operational client identity in the Backstage, created deliberately when an
  Inquiry is converted. The ledger client record is an internal financial mirror of it.
- **Ledger** — the headless Invoice Ninja instance. Holds financial *records* (invoice, tax,
  numbering, payment record, credit note, receipt PDF) and payment-schedule definitions. Reached only
  by API. Renders no page, is never linked to from a client surface, and never charges a card.
- **The Ledger Rule** — the finance boundary principle: *records* go to the ledger, *experiences* are
  ours, Stripe alone moves money. Grey-zone tiebreak: "is this a record or an experience?" Cost may
  decide **how** we implement something, never **where the truth lives**.
- **Display-only cache** — a locally stored financial value shown to a human. Backstage shows what
  the ledger last said; it never performs authoritative financial arithmetic itself.
- **Payment schedule** — a set of dated amounts on a Project, each producing a real ledger invoice.
  V1 pays each one manually; automatic recurring charges are V1.1.
- **Story** — a visual editorial record of real work: real weddings, venues, cultural details,
  suppliers, experiences. Built from repeating section-heading + text + gallery-placement blocks.
  **Replaces "Blog post".**
- **Phase** — where a Project is overall: `lead`, `booking`, `preparation`, `shoot`,
  `post-production`, `delivery`, `closed`.
- **Milestone** — one discrete completable step inside a Project (quote sent, contract signed,
  deposit paid, gallery ready, final balance paid, gallery released, downloads completed…).
- **Booked** — the state reached only when the configured booking requirements are all complete;
  normally quote approved + contract signed + deposit paid.
- **Gate** — the rule controlling gallery viewing or downloading: `none`, `manual`,
  `deposit-paid`, `named-invoice-paid`, or `final-payment-paid`. Unlocked only by a verified
  financial event or reconciliation.
- **Design Token** — a locked shared value (font pairing, colour, type scale, line height, text
  measure, spacing, gallery gap, radius, overlay preset, breakpoint, animation timing). The
  photographer may change a controlled subset; nobody may hand-edit CSS per page.
- **Spike** — a time-boxed investigation whose only deliverable is recorded evidence and a decision.
- **ADR** — an architecture decision record: option chosen, options rejected, reasons, revisit
  conditions.

### Retired terms (do not use in new work)
- **[retired] Gallery Engine** — we no longer build one; the forked Backstage provides it.
- **[retired] Session** — replaced by **Project**.
- **[retired] Lead** — replaced by **Inquiry**.
- **[retired] Blog post** — replaced by **Story**.
- **[retired] Display Mode** — replaced by **Layout** on a **Gallery Placement**.
- **[retired] Testimonial / Package / FAQ** — removed from product scope.
- **[retired] Invoice Ninja client portal / financial portal** — the ledger is headless.

### story-status
- `draft` — PO has written the story, not yet validated
- `in-review` — Tester is reviewing requirements
- `requirements-defect` — Tester found issues, returned to PO
- `approved` — Tester confirmed requirements are satisfactory
- `in-progress` — Dev Team is implementing
- `in-testing` — Tester is verifying implementation
- `defect-found` — Tester found bugs, returned to Dev Team
- `resolved` — Dev Team fixed defects, returned to Tester
- `done` — Tester confirmed implementation passes all criteria
- `retired` — story is cancelled by a direction change and will never be built; it keeps a recorded
  reason and is never silently deleted

### priority
- `critical` — Blocks other stories or sprint goals
- `high` — Core functionality, must be in this sprint
- `medium` — Important but not blocking
- `low` — Nice to have, can be deferred

### sprint-phase
- `planning` — PO is defining stories
- `requirements-validation` — Tester is reviewing stories
- `development` — Dev Team is implementing
- `testing` — Tester is verifying implementation
- `retrospective` — Sprint wrap-up and lessons learned
- `complete` — Sprint is fully done

### blocker-type
- `requirement-gap` — Acceptance criteria unclear or missing
- `technical` — Code-level issue or limitation
- `dependency` — Blocked by another story or external factor
- `needs-human` — Only the user can resolve this
- `needs-decision` — one of the PRD §5 decisions that no agent may make alone
- `upstream` — the forked upstream does not behave as the PRD assumed
- `retired-scope` — the work belongs to a retired direction and must not be implemented

### defect-severity
- `critical` — Feature is broken or unusable
- `major` — Significant functionality issue
- `minor` — Small issue, workaround exists
- `cosmetic` — Visual or text issue only

### test-status
- `not-started` — No testing begun
- `in-progress` — Testing underway
- `passed` — All test cases pass
- `failed` — One or more test cases failed
- `blocked` — Cannot test due to dependency or blocker

---

## Sprint Summary

| Sprint | Phase | Goal | Outcome |
|--------|-------|------|---------|
| Sprint 1 | complete | Foundation + build our own Gallery Engine (US-1…US-6) | Delivered 6/6 stories, 28/28 ACs. **Largely superseded by the pivot** — see US-14. |
| Sprint 2 | complete (closed early) | Public lead-generating website on the Gallery Engine (US-7…US-13) | US-7, US-8 and US-9 delivered (AC-9.3 retired); **US-10…US-13 retired**. `sprint2.json` closed 2026-07-30. |
| Sprint 3 | planning | Pivot: freeze, audit, fork, prove the foundation, settle boundaries (US-14…US-20) | Planned and ready for requirements validation: 7 stories / 48 ACs, issues #50–#56 open, pipeline recovery closed. No sprint-3 story touches finance; US-20 documents the Stripe convention only. |

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

## Artifacts
- Authoritative PRD: `scrum-master/PRD.md`
- Archived old PRD (historical only): `scrum-master/PRD-archive.md`
- Project instructions: `CLAUDE.md`
- Finance boundary: **The Ledger Rule** in `CLAUDE.md` and PRD §25
- Current sprint: `scrum-master/sprint3.md` / `scrum-master/sprint3.json`
- Closed sprints: `scrum-master/sprint1.md`, `scrum-master/sprint2.md`
- Retrospective and change-request log: `scrum-master/retrospective.md`
- Blocking requests to the human: `scrum-master/po-requests.md`
- Stripe reference implementation: `/Users/asim/NoIcloud/techno`
