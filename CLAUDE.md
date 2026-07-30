# earthandhoney

> **PIVOT NOTICE (2026-07-30).** This project changed direction. The previous vision
> ("build our own Gallery Engine as the core IP") is **retired**. The old PRD is archived at
> `/scrum-master/PRD-archive.md` for history only — do not build from it.
> The authoritative source is `/scrum-master/PRD.md`.

> **FINANCE ARCHITECTURE UPDATE (2026-07-30).** Invoice Ninja is now **headless**: an API-only
> ledger and document generator with **no client portal and no client-facing surface**. The client
> only ever sees the Project Room. See **The Ledger Rule** below — it replaces the previous
> "Invoice Ninja owns the financial experience" model.

## Product Vision
Build a **photography-first studio operating system**: photo-driven, gallery-first, fast, simple, commercially useful.

- **V1 is a dedicated production delivery for Earth & Honey Studios** — an established wedding and engagement photography business (since 2006). One real studio, one VPS, one deployment.
- **V2 (LumaForge)** is a possible future SaaS for photography studios. Create clean seams for it; **do not build the LumaForge business in V1.**
- This is a **pivot, not a greenfield restart.** Preserve working code where it still earns its place. Replace duplicated or weaker logic with proven open-source foundations. Never rewrite mature functionality just to make the stack look uniform.

Governing rule:

> **Deliver Earth & Honey exceptionally well now. Create clean seams for LumaForge later.**

Full PRD: `/scrum-master/PRD.md`

## The Three Surfaces
- **Frontstage** — the public, photo-driven, lead-generating website (Next.js + Payload).
- **Backstage** — the private studio operating system and digital darkroom (PicPeak fork).
- **Project Room** — the protected client-facing project, payment, document, and gallery experience.

**There is no fourth surface.** No integrated system may present its own UI to a client or to the
photographer. If a human sees it, we built it.

## Product Pillars
1. **Fork, don't rebuild** — PicPeak is the Backstage foundation (galleries, media pipeline, customers, access, passwords, expiry, downloads/ZIP, watermarks, feedback, email queue, webhooks, CSS templates). We use PicPeak's database config and backend logic wholesale and customize the Frontstage/UX/branding layer on top so the product feels like ours. We do **not** reimplement PicPeak's backend.
2. **Photo-driven Frontstage** — big full-width imagery, restrained copy, minimal-friction contact forms. The photography does the selling.
3. **Deterministic beauty** — structured CMS forms in, consistently premium responsive output out. **No drag-and-drop page builder**, no blank canvas, no page-level CSS editing, no arbitrary margin/padding controls.
4. **Project first** — the Project is the operational backbone and exists before the images. Inquiry → Client → Quote → Contract → Deposit → Shoot → Galleries → Final payment → Delivery → Expiry → Closure.
5. **One owner per business function** — every important function has exactly one authoritative system. Duplicate ownership is a defect.
6. **Payment-aware delivery** — verified payment milestones unlock gallery viewing/downloads. A browser redirect is never proof of payment.
7. **Not permanent photo hosting** — clients receive a defined delivery window, then archive/purge.
8. **Records vs experiences** — a proven external system may hold *records*. Every *experience* is ours. See The Ledger Rule.

## The Ledger Rule (finance boundary — approved 2026-07-30)

> **1. Invoice Ninja holds records, never surfaces.** Anything that must still be true in seven
> years to an accountant or the CRA — the invoice, its number, its tax, the payment record, the
> credit note, the receipt PDF — is created in Invoice Ninja **by API**, and Invoice Ninja's copy
> is the truth.
>
> **2. Every surface is ours.** Anything a human sees or clicks — client or photographer — is
> Frontstage (Payload) or Backstage / Project Room (PicPeak). Invoice Ninja renders no page and is
> never linked to from a client-facing surface.
>
> **3. Stripe alone moves money.** Invoice Ninja records what Stripe reports; it never charges a
> card, and **its own payment gateway stays disconnected**.
>
> **Grey-zone tiebreak:** ask *"is this a record or an experience?"* Records go to the ledger;
> experiences are ours. Cost may decide **how** we implement something — never **where the truth
> lives**.

### Why headless
The reason is **architectural declutter**, not bookkeeping features: it removes the duplicate client
portal, the duplicate client record, the duplicate payment status, and the second sender identity.
Compliance correctness is a welcome side effect of not authoring records ourselves — it is not a
product goal.

### Tax is invisible
Tax must never appear as a decision anywhere in the product. The client sees a name, a description,
an amount due, a Pay button, and afterwards a receipt PDF. **No tax breakdown UI, no rate pickers,
no registration-number fields, no tax settings screen, no tax stories in the backlog.** If a tax
line appears on a generated document it is because Invoice Ninja was configured once, in its own
admin, by the studio owner or their accountant. That configuration is not product surface.

### Headless guards (must stay true; each is testable)
- Invoice Ninja's **client portal is disabled**; no Invoice Ninja URL is ever surfaced to a client.
- Invoice Ninja's **Stripe gateway is not connected** — otherwise there are two payment paths and
  two Pay buttons, the exact failure the single-payment-path rule exists to prevent.
- Our stored balances and statuses are **display-only caches**. Backstage shows what the ledger last
  said; it never computes authoritative financial arithmetic itself.

### Email: pragmatic default, not a rigid rule
The **default** is that PicPeak's email queue owns all client-facing email, financial included, so
there is one sender identity, one brand, and one place the photographer edits templates. This is a
default for coherence, **not an inviolable constraint**: where Invoice Ninja's own mail clearly
saves meaningful implementation or configuration work, it may be used, subject to Product Owner
sign-off and a recorded entry in `SYSTEM_OWNERSHIP.md`. The hard rule is only this: **exactly one
system sends any given email type.** Duplicate reminders are a defect.

### Adding new Invoice Ninja usage
Invoice Ninja may be used opportunistically wherever it produces a record we would otherwise have to
author. Any use beyond the approved rows below requires a one-line addition to `SYSTEM_OWNERSHIP.md`
naming the owner and stating what our side may cache. Nothing may be adopted if it makes Invoice
Ninja visible to a client or duplicates a record we already own.

## System Ownership (authoritative — do not duplicate)
| Domain | Authoritative system |
|---|---|
| Studio identity, Frontstage branding | Payload `StudioProfile` |
| Public pages, stories, forms, inquiries, SEO, navigation | Payload |
| Public gallery placement + layout | Payload placement record (references a PicPeak gallery ID) |
| Galleries, media, uploads, derivatives, access, expiry, delivery | PicPeak fork |
| Operational client identity + Photography Project | PicPeak (extended via new migrations) |
| Quote and contract **workflow and presentation** | PicPeak / Project Room |
| Invoice, tax, numbering, payment record, credit note, receipt **document** | Invoice Ninja (headless, API only) |
| Payment schedule / installment plan definition | Invoice Ninja |
| Actual card charge | Stripe — one payment path only, ported from `techno` |
| Payment-gated gallery unlock | PicPeak, triggered by verified Stripe webhook + ledger reconciliation |
| Client-facing portal | Project Room only — never Invoice Ninja's portal |
| All client and photographer email, financial included | PicPeak/Backstage email queue (see the pragmatic-default note above) |
| Contract signature | PicPeak's own native signing capability (Project Room), hardened per the Contracts entry below — pending US-15/US-17 verification |
| Originals, derivatives, documents, ZIPs | Cloudflare R2 |

## Technology Stack
- **Backstage core:** PicPeak fork (pinned commit, MIT notices retained)
- **Frontstage:** Next.js App Router, TypeScript, React Server Components
- **Styling:** Tailwind CSS + shadcn/ui, driven by locked design tokens
- **CMS:** Payload CMS (Frontstage only)
- **Database:** PostgreSQL — one server, separate logical databases/credentials per system, **no cross-database joins**
- **Storage:** Cloudflare R2 (credentials already exist — audit and reuse, never provision parallel storage)
- **Image processing:** Sharp / libvips via PicPeak's pipeline
- **Auth:** PicPeak authentication and authorization (Better Auth is retired)
- **Email:** SMTP via the PicPeak email queue as the default owner of all client-facing mail (Resend is retired)
- **Ledger:** Invoice Ninja, **headless** — API only, portal disabled, gateway disconnected. Runs in **our** `docker-compose.yml` on **our** VPS.
- **Payments:** Stripe, ported from `/Users/asim/NoIcloud/techno` (see below). One payment path: the ported direct flow, reconciled into the ledger.
- **Contracts:** PicPeak's own native contract-signing capability is the V1 mechanism — typed name, consent checkbox, drawn signature, IP address, timestamp, a frozen snapshot of the signed contract contents, a SHA-256 integrity hash, and an audit page baked into the delivered PDF. Hardened with: one-time signing links, mandatory email verification before a signature is accepted, the signed PDF emailed to both parties, immutable/versioned storage in R2, and no editing of contract contents after signature. No external e-sign vendor (Adobe Sign, DocuSign, Dropbox Sign, SignWell) and no manual-PDF-upload fallback are carried into V1. **This entire mechanism is unverified against the actual pinned fork** — US-15/US-17 must confirm it really exists at the pinned commit before any Project Room work depends on it; if it does not, this decision reopens (see `po-requests.md` item 7). Contract wording should still get a one-time review by an Ontario lawyer; electronic signatures are generally recognized under Ontario/Canadian law but this is not legal advice.
- **Alt text:** self-hosted caption suggestion (Florence-2 is the first candidate, must be benchmarked) + human approval
- **Deployment:** dedicated VPS, Docker Compose, one reverse proxy (Caddy or Nginx). **No Kubernetes.**

## Stripe Port Rule (mandatory)
The working, production-validated Stripe integration at `/Users/asim/NoIcloud/techno` is the mandated starting point.

"Port verbatim" means **mimic its logic and required-field structure faithfully** — not transliterate Flask to TypeScript line by line. In particular, preserve:
- **Flat, mode-agnostic env names:** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE<THING>_ID`. There are **no** `_TEST`/`_LIVE` suffixes — the mode is decided by which coherent key set is loaded into `.env`.
- **Key pairing discipline:** the secret key, the publishable key, and every price ID must come from the **same Stripe mode**. A test-mode price ID with a live secret key is a hard failure. This pairing is the exact thing a previous agent got wrong — treat it as a first-class requirement with explicit startup validation.
- Secret key used **server-side only**; publishable key reaching the browser through markup/props, never hardcoded in client source.
- Authoritative amounts fetched from Stripe (`Price.retrieve`) rather than trusted from the client.
- The same secret-storage shape: `.env` locally, GitHub Actions secrets for CI/deploy, GitHub secret names matching env var names 1:1, and the deploy job writing `.env` on the VPS.

Do **not** copy secret keys, live customer data, foreign product/customer identifiers, or unrelated business logic. Produce `STRIPE_PORT_REPORT.md`.

**Port target and scope.** Payment routes and the Stripe webhook endpoint live where invoice status
lives — the PicPeak fork's backend — so the port crosses a language boundary and is a
`FORK_CHANGELOG.md` entry. There is **exactly one** Stripe webhook endpoint. The reference project
is a one-shot checkout flow: it contains **no** saved-card, off-session, or retry logic, so none of
that is covered by "port verbatim" — see the installments note below.

**Installments (V1 vs V1.1).** V1 ships the payment-plan **data model** — a Project may have a
schedule of dated amounts, each producing a real invoice with reminders and a Pay button the client
clicks. **Automatic recurring card charges are deferred to V1.1**, and must then be built on the same
schedule so nothing is rebuilt. Deferred because auto-charge pulls in saved payment methods
(SetupIntent), off-session SCA/3DS failure-and-recovery, and dunning/retry logic. If a payment
schedule is ever automated, **Invoice Ninja owns the schedule and the invoice records; Stripe owns
only the charge.** Stripe Subscriptions must not be used — it would place an authoritative billing
schedule outside the ledger.

## Docker Rules (ALL AGENTS MUST FOLLOW)
- ALL services (databases, caches, queues, the ledger) run INSIDE Docker containers
- NEVER run `apt install postgresql`, `brew install redis`, or install any service on the host machine
- ALL services are defined in `docker-compose.yml` — including Invoice Ninja
- Connect to services via Docker network hostnames (`db`, `redis`, `web`) — NOT `localhost`
- To start services: `docker compose up -d`
- To run tests: `docker compose run --rm web npm test`
- The ONLY things that run on the host: git, claude, gh CLI, and the Project Lead script
- If you need a new service, add it to `docker-compose.yml` — do not install it on the host

## Fork Discipline (PicPeak)
- Fork at a **pinned commit**. Production must never track a floating upstream branch.
- **Never edit an already-shipped PicPeak migration.** Add new numbered migrations for our extensions.
- Copy PicPeak CSS templates **verbatim first**, then adapt only through intentional, documented changes.
- Maintain `PICPEAK_UPSTREAM.md`, `THIRD_PARTY_NOTICES.md`, `FORK_CHANGELOG.md`, `PICPEAK_PORT_LEDGER.md`, `UPSTREAM_SYNC.md`, `ARCHITECTURE_DECISIONS/`.
- Keep disabled: PicPeak's public landing-page CMS, its native quote/invoice/accounting UI (the ledger owns those records), and any page-building capability that conflicts with Payload's Frontstage ownership.

## Decisions No Agent May Make Alone
These require a documented spike and Product Owner sign-off (PRD §5):
1. What of the current codebase is retained vs replaced
2. The Payload ↔ PicPeak API boundary
3. Whether PicPeak media can be reused across galleries without duplicating originals
4. The R2 delivery path (backend streaming / presigned / CDN / Worker / hybrid)
5. VPS capacity for real image batch sizes
6. Any use of Invoice Ninja beyond the approved ownership rows, and any decision to let Invoice Ninja send a given email type

_Three former entries are now settled: how Stripe is initiated (**the ported direct flow, reconciled
into the ledger** — Invoice Ninja's gateway stays disconnected), where Invoice Ninja runs (**our
VPS, our `docker-compose.yml`**), and the V1 contract-signing mechanism (**PicPeak's own native
signing capability — see "Contracts" in the Technology Stack below — conditional on US-15/US-17
verifying it actually exists at the pinned commit; no external e-sign vendor and no manual-PDF-upload
fallback are carried into V1**)._

## Project Conventions
- Commit format: `[US-X] Description of change`
- Branch format: `feature/US-X-AC-Y`
- All code files must include structured front matter / metadata header comments
- Sprint documentation lives in `/scrum-master/`
- `project-state.json` is owned exclusively by the Project Lead — agents do not modify it

## Retired From the Old Direction (do not build)
- A home-grown "Gallery Engine" as core IP (superseded by the PicPeak fork)
- A Payload `Galleries` collection / Payload-owned Sharp+R2 upload pipeline as the system of record
- `Sessions` as the central business object (replaced by **Project**)
- Testimonials, Packages, FAQ collections; a standalone Packages page
- WhatsApp lead-capture flow
- Blog sample-content requirement and the no-`<em>` content rule
- Better Auth, Resend, locked-in Adobe Acrobat Sign
- "The site must look exactly like `public/photobuddy/`" — that template is now **inspiration and a source of reusable code only**, not the design authority
- **Invoice Ninja as a client-facing system** — its portal, its client login, and any link to it from a client surface
- **A tax, GST/HST, or bookkeeping feature surface** in the product
- **Automatic recurring card charges in V1** (deferred to V1.1)

## Agent Reference
- **Product Owner:** Backlog, user stories, sprint files, change control, PRD-derived architecture decisions (does NOT write code)
- **Dev Team:** Implements code in Docker, pushes to feature branches (does NOT modify PO/Tester sections)
- **Tester:** Quality gate — validates requirements, interprets CI results, enforces DoD (does NOT execute tests or modify source code)
- **Project Lead:** External Python script that orchestrates all agents — not an AI agent

## Current Sprint
See `/scrum-master/scrum-master.md` for current sprint status and controlled vocabulary.
Blocking requests to the human are in `/scrum-master/po-requests.md`.
