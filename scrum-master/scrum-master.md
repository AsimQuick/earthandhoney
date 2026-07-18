# Scrum Master — earthandhoney

## Current Sprint: sprint-1 (Planning)

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
