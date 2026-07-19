# Scrum Master — earthandhoney

## Current Sprint: sprint-2 (Planning — plan finalized 2026-07-19)

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
