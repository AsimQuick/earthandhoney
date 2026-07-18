# earthandhoney

## Product Vision
A premium, gallery-first photography business website powered by a world-class lightweight **Gallery Engine**, combined with simple business workflow tools (leads, sessions, contracts, payments, client delivery).

- The **Gallery Engine is the core IP** and must be built before any website pages. The gallery — not the image — is the primary content object; one reusable engine powers the homepage hero, portfolio, blog galleries, and client delivery. No separate image systems.
- The public website's goal is **lead generation**, not gallery browsing. Every contact form and WhatsApp click captures a lead before anything else happens.
- The platform is **not permanent photo storage**. Client lifecycle: Visitor → Lead → Booking → Contract → Payment → Session → temporary Gallery Delivery → Download → Archive. Clients do not live inside the platform.
- The photographer manages everything through the CMS without developer assistance.
- **Design template:** `public/photobuddy/` — the end product should look exactly like it (creative direction is already done; replace its pictures with our gallery concept). Its images (multiple dimensions) may be reused.
- Full PRD: `/scrum-master/PRD.md`

## Product Pillars
1. **Gallery speed** — performance is a core feature; the gallery must feel instant (static generation + ISR, lazy/progressive loading, never load a full gallery upfront)
2. **Image quality** — Sharp pipeline generating thumbnail/medium/large from originals stored in Cloudflare R2
3. **Mobile-first experience** — touch navigation, swipe gestures, thumbnail drawer on tap; desktop adds hover previews; subtle black CSS gradient overlay on every gallery for the premium aesthetic
4. **CMS simplicity** — Payload collections (Media, Galleries, Portfolio, Blog, Homepage, Testimonials, Packages, FAQ); blog posts use galleries, never featured images
5. **Lead conversion** — contact form (Name, Email OR Phone, Photography Type, Preferred Date, Message) and WhatsApp lead-capture flow; no anonymous WhatsApp conversations
6. **Customer workflow management** — lightweight dashboard (not a CRM): Leads, Clients, and Sessions as the central business object linking Contract → Payment → Gallery

## Technology Stack
- Stack: nextjs
- Frontend: Next.js App Router, TypeScript, React Server Components
- Styling: Tailwind CSS + shadcn/ui
- CMS: Payload CMS
- Database: PostgreSQL (in Docker)
- Storage: Cloudflare R2
- Image processing: Sharp
- Gallery viewer: PhotoSwipe
- Auth: Better Auth
- Email: Resend
- Payments: Stripe Checkout (checkout/processing) + Invoice Ninja (invoices, receipts, balances — app displays status only, never recreates billing logic)
- Contracts: Adobe Acrobat Sign (webhook-driven signing status, signed PDF stored)

## Docker Rules (ALL AGENTS MUST FOLLOW)
- ALL services (databases, caches, queues) run INSIDE Docker containers
- NEVER run `apt install postgresql`, `brew install redis`, or install any service on the host machine
- ALL services are defined in `docker-compose.yml`
- Connect to services via Docker network hostnames (`db`, `redis`, `web`) — NOT `localhost`
- To start services: `docker compose up -d`
- To run tests: `docker compose run --rm web pytest` (or stack equivalent)
- The ONLY things that run on the host: git, claude, gh CLI, and the Project Lead script
- If you need a new service, add it to `docker-compose.yml` — do not install it on the host

## Project Conventions
- Commit format: `[US-X] Description of change`
- Branch format: `feature/US-X-AC-Y`
- All code files must include structured front matter / metadata header comments
- Sprint documentation lives in `/scrum-master/`
- `project-state.json` is owned exclusively by the Project Lead — agents do not modify it
- After updating any documentation in `/scrum-master/`, use `mcp__devrag__reindex_document` to re-index

## Agent Reference
- **Product Owner:** Backlog, user stories, sprint files, change control (does NOT write code)
- **Dev Team:** Implements code in Docker, pushes to feature branches (does NOT modify PO/Tester sections)
- **Tester:** Quality gate — validates requirements, interprets CI results, enforces DoD (does NOT execute tests or modify source code)
- **Project Lead:** External Python script that orchestrates all agents — not an AI agent

## Current Sprint
See `/scrum-master/scrum-master.md` for current sprint status and controlled vocabulary.
See `/scrum-master/prd.md` for the full Product Requirements Document (if provided).
