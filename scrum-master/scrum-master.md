---
project: earthandhoney
type: master
created: 2026-07-18
last-updated: 2026-08-09
last-updated-by: product-owner
current-sprint: sprint-5
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

## Current Sprint: sprint-5 (Planning, 2026-08-09)

> **The product is NOT feature-complete.** No `*_SPEC.md` feature-specification document exists
> anywhere in this repository — re-verified at sprint-5 planning by repo-wide search excluding
> `node_modules/` and `vendor/`, which returns no `*_SPEC.md` file at all and no case-insensitive
> `spec` markdown file other than `retrospective.md`. Remaining scope therefore comes from the
> post-pivot PRD's phase plan (§34) and the post-pivot product backlog, exactly as it did for
> sprints 1–4. Sprint 4 took backlog items 1–7 plus the sprint-3 carry-overs; **sprint 5 takes items
> 8–14** (Frontstage publishing, PRD Phase 4). **Backlog items 15–42 remain**, covering the gallery
> experience and darkroom, the Project cockpit and Project Room, the headless ledger and Stripe,
> email/contracts/delivery, and hardening/launch. PRD Phases 3 and 5–8 are all still open.

---

## Sprint-5 (Planning, 2026-08-09)

**Sprint Goal:** Complete **PRD Phase 4 — Frontstage publishing.** Sprint 4 proved the seam; it did
not build a website. Turn the proven Frontstage↔Backstage boundary and the locked design tokens into
a real, deterministic, lead-generating public site: a structured `Pages` model with a New Page form
and a standard template every page inherits, navigation driven by fields, a form builder writing
durable Inquiries, the homepage / Details / Story templates, and real SEO output in actual HTML.

Full plan: `scrum-master/sprint5.json` (machine-readable, authoritative).

### Why this scope

The Frontstage today is **entirely internal**. `src/collections/` holds only `GalleryPlacements`,
`Media` and `Users`; `src/globals/` holds only `StudioProfile`; and every route under
`src/app/(frontend)/` is a `noindex` dev or benchmark page. There is no `Pages` collection, no
`Forms`, no `Inquiries`, no navigation model, no sitemap — and the site chrome still renders the
**pre-pivot photobuddy link array** (`home`/`about`/`galleries`/`blog`/`contact`) with five
placeholder social links pointing at `#`. PRD §2 says the Frontstage exists for lead generation;
today it cannot generate a lead. Backlog items 8–14 are exactly that gap and are the next contiguous
block in the phase plan.

### Stories

| ID | Title | Priority | Depends on | Backlog | ACs |
|----|-------|----------|------------|---------|-----|
| US-30 | Split the verification suite into a fast parallel lane and a serial live lane | high | — | retro action 6 | 5 |
| US-31 | Deterministic page model: `Pages` collection, New Page form, standard page template | critical | — | #10 | 7 |
| US-32 | Navigation driven by structured fields — Weddings, Engagements, Details | high | US-31 | #8 | 5 |
| US-33 | Forms and durable Inquiries, notified through the Backstage email queue | critical | US-31 | #13 | 7 |
| US-34 | Homepage template: full-width hero slideshow, curated selections, primary inquiry form | high | US-31, US-32, US-33 | #9 | 6 |
| US-35 | Details template: minimal copy, full-width masonry placement, inquiry form | medium | US-31, US-33 | #11 | 4 |
| US-36 | Story template: repeating heading + text + gallery placement — not a blog | medium | US-31, US-33 | #12 | 5 |
| US-37 | SEO system: metadata, structured data, canonical URLs, sitemap, SEO assistant | high | US-31, US-34, US-36 | #14 | 7 |

8 stories / 46 acceptance criteria, all `draft` and unstarted. Two roots: **US-31** (which everything
else in Phase 4 hangs off) and **US-30** (which has no dependants, so if it stalls nothing is
blocked). The graph is acyclic.

### Why a test-infrastructure story sits in a feature sprint

US-30 is the only non-feature story and earns its place on measurement, not tidiness. `npm test` is
`jest --runInBand` over ~140 suites, measured at **1,169,738 ms wall** (`retrospective.md`, citing
`logs/20260807_235236_dev-team.json`), and sprint 4 recorded that **AC-28.5 had to be split three
ways specifically because the runs would not fit in one dev session**. The suite cost is now shaping
how acceptance criteria are written, and PRD Phases 4–8 will all pay it.

### Why PRD Phase 3 is still excluded

Unchanged from sprint 4: backlog items 22–26 rest on PicPeak's native contract-signing capability,
whose verification failed on one of seven elements (AC-17.10 — the audit trail ships as a **separate
sibling PDF**, never merged into the signed contract). `po-requests.md` item 7 is **REOPENED and
awaiting a human decision**, with the PO recommendation on record as option (a). Building a Project
Room on an unresolved premise would inherit a known-false assumption (Reminder 1).

### What sprint 5 changes about process, rather than restates

Three failures now have a **mechanism** rather than another DoD sentence:

1. **The routing hole** (AC-17.9 in sprint 3, AC-22.2 in sprint 4). `sprint5.json` carries a
   `pending_po_routing` array that an implementing AC *does* have write scope over; the orchestrator
   drains it into `po-requests.md` at story close, and the AC is not closed until `drained` is true.
   Rewriting the DoD could never fix this, because a DoD cannot grant write scope.
2. **The retrospective**, missed at close in sprints 1, 3 and 4. A named owner and a written
   checkpoint have both been tried and both failed; DoD item 9 makes it an orchestrator pipeline step
   after every second story close-out.
3. **Merging through red CI** (PR #73). DoD item 8 now states the rule outright: no merge without a
   green run recorded against the exact head SHA; infra flakes are re-run, never merged through.

DoD items 15–17 additionally require story-level tracker fields to be written as work completes, the
three Tier-3 regression anchors to stay untouched, and no retired artifact to be reintroduced.

### Explicitly out of scope for sprint-5

The gallery experience and darkroom (PRD Phase 5 — backlog 15–21, including the full masonry
refinement, the slideshow spec, the shared fullscreen viewer, the verbatim style-template copy, the
darkroom UI, the New Gallery entry choice, and the alt-text caption model) · the Project cockpit and
Project Room (Phase 3) · anything financial (Phase 6) · contracts and the wider email matrix beyond
the single inquiry-notification type US-33 needs (Phase 7) · deployment and hardening (Phase 8) · and
every standing non-goal, in particular any tax surface, any client-facing ledger surface, automatic
recurring card charges, WhatsApp lead capture, and any drag-and-drop page builder.

---

## Sprint-4 Review Summary (2026-08-09)

**Result: Delivered. Closed clean on 2026-08-09.** All 9 stories (US-21…US-29) and all 51 acceptance
criteria are `checked` with `dev_status: done`, merged to `main` across 9 PRs (#73–#81). Tester
sprint gate: **PASS**, recording one AC-level defect (AC-22.2) and one process flag (PR #73's merge).
Deploy: **PASSED** — all verification tiers passed (`deploy_summary`, `sprint4.json`).

> **CLOSE-OUT COMPLETED 2026-08-09, before sprint-5 planning.** The sprint's one open defect is
> resolved: the **F1–F9 upstream findings register has been transcribed verbatim** from
> `PIVOT_AUDIT.md:6479–6518` into `po-requests.md` (section *"Upstream findings F1–F9 — routed for
> Product Owner attention"*), so DoD item 7 is now met for AC-22.2 and both AC-22.2 and US-22 read
> `tester_status: done`. `sprint4.json`'s nine stale story-level `dev_status: not-started` fields
> were advanced to `done` to match their ACs, their merged PRs and the passed deploy (retrospective
> action item 5). The PR #73 process flag remains recorded and is carried into sprint 5 as a merge
> rule in the definition of done, not as an open defect.

| Story | Title | ACs | PR | Merged | Story status | Tester |
|-------|-------|-----|----|--------|--------------|--------|
| US-21 | Restore the authoritative post-pivot documentation onto `main` and correct the ownership record | 6/6 | [#73](https://github.com/AsimQuick/earthandhoney/pull/73) | 2026-08-06 | done | done |
| US-22 | Route the sprint-3 findings: reopen contract-signing, register F1–F9 | 5/5 | [#74](https://github.com/AsimQuick/earthandhoney/pull/74) | 2026-08-06 | done | done _(defect closed 2026-08-09)_ |
| US-23 | Design-token lock-down | 7/7 | [#75](https://github.com/AsimQuick/earthandhoney/pull/75) | 2026-08-06 | done | done |
| US-24 | Studio identity: one `StudioProfile` and bounded branding controls | 5/5 | [#76](https://github.com/AsimQuick/earthandhoney/pull/76) | 2026-08-07 | done | done |
| US-25 | Gallery Placement: a Frontstage page renders a Backstage gallery | 6/6 | [#77](https://github.com/AsimQuick/earthandhoney/pull/77) | 2026-08-07 | done | done |
| US-26 | Backstage change triggers a Frontstage refresh via verified webhook | 12/12 | [#78](https://github.com/AsimQuick/earthandhoney/pull/78) | 2026-08-07 | done | done |
| US-27 | Disable the duplicate Backstage surfaces | 5/5 | [#79](https://github.com/AsimQuick/earthandhoney/pull/79) | 2026-08-07 | done | done |
| US-28 | Pivot execution: retire superseded gallery artifacts and orphaned config | 9/9 | [#80](https://github.com/AsimQuick/earthandhoney/pull/80) | 2026-08-08 | done | done |
| US-29 | Benchmark the R2 delivery paths and close the delivery decision | 14/14 | [#81](https://github.com/AsimQuick/earthandhoney/pull/81) | 2026-08-08 | done | done |

**Sprint goal met.** The post-pivot direction is now real on `main`, and the Frontstage foundation
sits on top of the fork proven in sprint 3:

- **The pivot reached `main` (US-21).** The post-pivot `PRD.md` (1855 lines), `CLAUDE.md`, the
  post-pivot backlog (items 1–42) and the sixteen Reminders, and the closed `sprint2.json` (US-10…
  US-13 `retired` in place) were restored verbatim from `9624a07`. `SYSTEM_OWNERSHIP.md`'s four
  wrong rows (Better Auth, Resend, Testimonials/Packages/FAQ, pre-Ledger-Rule payments) were
  corrected against the restored `CLAUDE.md`, each citing the line it now matches. A standing Jest
  guard (`us21-ac21.6-pivot-direction-guard.test.ts`) now fails if any of those documents silently
  loses the pivot direction a third time — the enforcement Reminders 15 and 16 have been asking for.
- **The sprint-3 findings were routed (US-22), except one.** `po-requests.md` item 7 is
  **REOPENED — awaiting decision**, naming the failed element (an audit page baked into the delivered
  PDF), citing `PIVOT_AUDIT.md` and three fork call sites, listing all three options and the PO
  recommendation. The reopening is propagated to `CLAUDE.md`, PRD §29 (plus F1/F5 markers at §6.2,
  §17.3, §28.1, §30) and `SYSTEM_OWNERSHIP.md`. The drafted UD-1 upstream report is surfaced as
  po-requests item 16. The F7 `/storage` permission fix is now reproducible in `docker-compose.yml`
  and proven live across `down -v` → rebuild, with no file under `vendor/picpeak/` touched.
  **Not routed: F1–F9** — see the open defect below.
- **Design tokens are locked (US-23).** One token source of truth (`src/styles/tokens.css`) covering
  all twelve PRD §12.2 categories, self-hosted Fraunces + Inter with no Google Fonts request,
  near-black ink and a neutral grey scale with **no accent colour**, WCAG AA contrast computed from
  the token values themselves, the US-8 shell re-parameterised onto tokens with an identical
  structural snapshot, a `noindex` specimen route, and a reproducible framework-free export
  (`exports/design-tokens/tokens.css`) so Backstage/Project Room templates are consumers from day one.
- **The Frontstage↔Backstage seam exists and is proven live (US-24, US-25, US-26).** A single
  `StudioProfile` global owns every studio detail with bounded branding controls; a
  `GalleryPlacements` collection references a Backstage gallery **by external identifier with no
  relation into the Backstage database**, resolved over Flow A (`backstageClient.ts`,
  `backstageGalleryMapper.ts`, 60s cache cap) and rendered on a `noindex` demo route; a Backstage
  change triggers a Frontstage refresh through an **HMAC-verified, idempotent** webhook, evidenced by
  `WEBHOOK_LIVE_PROOF.md` (1606 lines) against a real running stack — including two out-of-order
  fixture findings caught and recorded rather than hidden.
- **One owner per business function (US-27).** A new `publicSite` feature flag defaults `false` and
  is checked server-side before `app_settings`; the raw HTML/CSS "Public Site" panel is hidden behind
  the fork's own `RequireFeature` gate; the native quote/invoice/tax-report subsystem is *shown* off
  by default (403 with the flag off) rather than assumed off. The static CMS Pages surface
  (impressum/privacy/terms) deliberately stays **enabled**, encoded as a test so a future cleanup
  cannot silently reverse the AC-18.5 decision. All changes additive; the migration-manifest SHA-1
  integrity test stays green; recorded in `FORK_CHANGELOG.md`, `PICPEAK_PORT_LEDGER.md` and
  `UPSTREAM_SYNC.md`.
- **The pivot was executed, not just documented (US-28).** The Payload `Galleries` collection, the
  Payload-owned Sharp derivative pipeline and the Payload-owned R2 upload path are removed, with
  their lock-in tests deleted **in the same commit as the removal that breaks them** — never left
  failing, never skipped — and each deletion recorded against the accepted AC it belonged to. The
  three orphaned env vars (`RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL`,
  `NEXT_PUBLIC_WHATSAPP_NUMBER`) are finally out of `.env.example`, closing sprint-3 action item 8.
  Coverage moved 96.11→95.85 branches, 96.58→96.52 functions, 99.67→99.38 lines — all far above the
  80% floor, and the gate itself is now guarded against being lowered.
- **The R2 delivery decision was closed honestly, not conveniently (US-29).** Both measurable
  candidates were benchmarked and **both were rejected against the ADR's own targets** —
  `backstage-proxy` and `presigned-r2` each fell 3 points short of the mobile performance target on
  `portfolio-gallery` and missed LCP by ~1.08–1.35s there and up to 714–997ms on `story-gallery`.
  Candidates 3–5 are recorded as unmeasured with their infrastructure prerequisite named (po-requests
  item 15: Cloudflare custom domain / Worker). **No path is chosen; the decision stays open** with a
  named next step and PO sign-off `PENDING` — exactly what AC-29.6 exists to permit. The session also
  caught and withdrew its own discredited early runs (83-byte 404 bodies mistaken for photographs)
  rather than reporting false numbers.

**Definition of Done:** 13 of 15 items met with direct evidence. Two unmet:

- **Item 7 (routing to `po-requests.md` is part of closing an AC that requires it) — UNMET at review
  for AC-22.2, MET as of 2026-08-09.** See the close-out note above.
- **Item 9 (`retrospective.md` updated incrementally during the sprint, with a named owner and an
  in-sprint checkpoint) — UNMET for the third consecutive sprint.** The file held only sprint-3 and
  sprint-1 content until this review was written. Sprint 3 diagnosed the missing owner/checkpoint and
  sprint 4 added both to the DoD; the checkpoint still did not fire.

Item 8 (existing CI stays green) is met for 8 of 9 PRs and flagged for #73 — see below.

**Defects and findings (all disclosed):**

- **CLOSED 2026-08-09 — AC-22.2, F1–F9 never reached `po-requests.md`.** The register was fully
  authored and merge-ready in `PIVOT_AUDIT.md:6479–6518` (finding id, one-line statement,
  contradicted PRD section, proposed disposition, for all nine findings), but the dev session
  correctly held that `scrum-master/` is outside an implementing AC's write scope, so the table was
  never transcribed. This was precisely the failure sprint-4's DoD item 7 was written to prevent,
  repeating sprint 3's AC-17.9 gap one sprint later. **Resolved as diagnosed — a PO transcription
  task, not a dev rework:** the table is now in `po-requests.md` verbatim, and F6 and F9 (the two
  findings calling for fork work) are explicitly scheduled against the backlog items that own them
  (#38 private gallery lifecycle, #34 email ownership matrix) rather than left floating. Sprint 5
  adds the missing mechanism — a `pending_po_routing` array in `sprint5.json` drained by the
  orchestrator at story close — so the third repeat cannot happen the same way.
- **PROCESS FLAG — PR #73 was merged with both CI jobs failed.** `gh run view 31129644959` shows the
  only recorded run for head SHA `390f8de` failed in docker buildx (`failed to reserve cache`) — an
  infra flake; lint, type-check and test never executed. No green re-run exists for that SHA. Direct
  violation of DoD item 8. Residual risk assessed low: all 8 downstream stories branch from that
  exact content and all 16 of their CI jobs passed, re-validating it eight times over. Not re-opened;
  carried as a process action item.
- **Tooling noise, not delivery gaps.** Several `dev_notes` entries in US-26, US-28 and US-29 end
  mid-sentence waiting on a background task. Each was independently confirmed against
  `git log origin/feature/US-2x` to have been captured by the harness auto-commit (`34ceed5`,
  `d8aaac2`, `bd30706`, `a15b213`, `8e13b64`, `1de4dd2`).
- **Tracker hygiene repeats — reconciled 2026-08-09.** `sprint4.json` read `"phase": "planning"` and
  story-level `dev_status: "not-started"` on all 9 stories, despite every AC reading
  `dev_status: done` and the deploy having passed — the identical stale-field pattern US-21 AC-21.4
  was written to fix in `sprint3.json`, fixed downstream but not at source. All nine story fields are
  now `done` and `phase` is `complete`. Sprint 5's DoD item 15 requires these fields to be written as
  work completes, so the reconciliation is not needed a third time.

**Tier-3 regression anchors for sprint 5 (load-bearing — must not regress):**

1. `src/__tests__/us21-ac21.6-pivot-direction-guard.test.ts` — the only thing preventing a second
   loss of the pivot direction.
2. `src/__tests__/us26-ac26.1-picpeak-webhook-signature-verification.test.ts` and the AC-26.5
   idempotency suite — the entire security basis of the Backstage→Frontstage webhook flow.
3. `src/__tests__/us28-ac28.5-coverage-gate-guard.test.ts` — stops a future coverage shortfall being
   "fixed" by editing the threshold.

The two most-depended-on new seams are US-25's Flow A boundary (`backstageClient.ts`,
`backstageGalleryMapper.ts`, the 60s cache) and US-26's webhook receiver. Both are backed by
live-system proof, not unit tests alone.

**Open follow-ups carried to sprint-5:**

1. ~~**Transcribe the F1–F9 register from `PIVOT_AUDIT.md` into `po-requests.md`** and re-close
   AC-22.2.~~ **DONE 2026-08-09.** Sprint 4 closes clean.
2. **Two decisions await the human**: the reopened contract-signing decision (po-requests item 7,
   PO recommendation (a) accept the sibling audit PDF for V1) and the R2 delivery path (po-requests
   item 15 — needs a Cloudflare custom domain and/or Worker before candidates 3–4 can be measured).
   Both are "decisions no agent may make alone".
3. **Design-token sign-off** (po-requests item 14) — the specimen route is built and awaiting a human
   look. Every Phase 4 page is built on whatever is locked there.
4. ~~**Reconcile `sprint4.json`** — `phase` → `complete`, story-level `dev_status` → `done`.~~
   **DONE 2026-08-09.**
5. Still standing from sprint 3: the UD-1 upstream report needs a human GitHub identity
   (po-requests item 16); SPF/DKIM/DMARC before any production email (item 17).

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

_All seven delivered in sprint 4 (2026-08-09). Kept numbered in place so the backlog's 1–42
numbering stays stable; each carries the story that closed it._

1. **Design-token lock-down** — establish and lock the shared token set before any new page is
   built. *(**Delivered — US-23.** Human sign-off on the specimen route is still open: `po-requests.md` item 14.)*
2. Disable the duplicate Backstage surfaces identified in US-18 (its landing-page CMS, its native
   billing screens, its page-building capability). *(**Delivered — US-27**; static CMS Pages
   deliberately left enabled per AC-18.5.)*
3. Studio identity: a single `StudioProfile` owning business name, contact details, service areas,
   social profiles, default social image, and default metadata patterns — no studio detail scattered
   through code. *(**Delivered — US-24.**)*
4. Gallery Placement model: reference a Backstage gallery from a Frontstage page and render it.
   *(**Delivered — US-25**, over Flow A with no relation into the Backstage database.)*
5. Retire or repurpose the superseded Payload gallery artifacts per the US-14 decision.
   *(**Delivered — US-28**, together with the three orphaned env vars.)*
6. Backstage change triggers a Frontstage content refresh via webhook. *(**Delivered — US-26**,
   HMAC-verified and idempotent, proven live in `WEBHOOK_LIVE_PROOF.md`.)*
7. R2 delivery-path benchmark and decision (deferred from US-19). *(**Benchmarked — US-29; decision
   deliberately still open.** Both measured candidates missed the ADR's targets; candidates 3–5 need
   infrastructure that does not exist yet — `po-requests.md` item 15.)*

### Frontstage publishing (PRD Phase 4) — _all seven taken by sprint 5_
8. Navigation: Weddings, Engagements, Details — configurable through structured fields. *(**Sprint 5
   — US-32.**)*
9. Homepage template: full-width slideshow hero placement, short introduction, selected galleries
   or stories, primary inquiry form, footer. *(**Sprint 5 — US-34.**)*
10. Deterministic **New Page** form and standard page template. *(**Sprint 5 — US-31**, the root
    story every other Phase 4 story depends on.)*
11. **Details** template: minimal heading, full-width masonry placement, inquiry form. *(**Sprint 5
    — US-35.**)*
12. **Story** template: repeating section heading + text + gallery placement. *(**Sprint 5 —
    US-36.**)*
13. Form builder + durable Inquiry records, notification, spam protection, source/campaign capture.
    *(**Sprint 5 — US-33**; the notification is queued through the Backstage email queue, the single
    authoritative owner of client and photographer email.)*
14. SEO system: account-level fields, per-page/story SEO assistant, real metadata, structured data,
    canonical URLs, sitemap and image-sitemap entries. *(**Sprint 5 — US-37**; account-level fields
    come from the existing `StudioProfile`, not a second settings record.)*

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
    *Carries upstream finding **F9**: the `gallery_expired` and `archive_complete` templates do not
    exist in `email_templates`, so those types stay `pending` and retry to exhaustion. Fix is two new
    template rows via a **new** migration/seed — never an edit to a shipped migration (Reminder 2).*
35. Template editor, Project-level overrides, merge fields, preview, test send, history, pause.
36. Reminder matrix with editable defaults that stop when their milestone completes.
37. Contract flow: chosen e-sign provider **or** manual signed-PDF upload with audit entry
    *(open decision — see `po-requests.md`)*.
38. Private gallery lifecycle: draft, ready, sent, viewed, download-enabled, expired, archived,
    purged — with noindex, revocable access, logging, and expiry reminders. Purge must never
    destroy images still referenced by a public gallery. *Carries upstream finding **F6**'s unpatched
    occurrence: `POST /api/admin/archives/:id/restore` 404s under the S3 backend because of a
    local-filesystem-only assumption. Needs a fork patch of the same shape as the F8/UD-1 one.*

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
