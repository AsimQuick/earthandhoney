# Product Owner — Requests to the Human (sprint-2)

_Raised 2026-07-19 during sprint-2 planning. None of these block the **start** of sprint-2 (dev/CI can proceed on placeholders per US-7 AC-7.4), but each is required before the corresponding story can be **verified as production-ready / deployed**. Please answer inline or in a reply._

## 1. Deploy target for `deploy.yml` (US-7 · AC-7.1) — highest priority
The sprint-1 close deploy returned HTTP 404 only because `.github/workflows/deploy.yml` does not exist. AC-7.1 is scoped to create a workflow that **parses cleanly, is `workflow_dispatch`-triggerable, and builds the app in Docker** — but it cannot actually _ship_ anywhere without a target.
- **Where should the app deploy?** (Vercel / self-hosted Docker host + registry / a VPS / other)
- If self-hosted: host, and where should deploy **secrets** live (GitHub Actions secrets)?
- Confirm the managed **PostgreSQL** and **Cloudflare R2** endpoints for the deployed environment (CI uses the Dockerised `db`; production needs a real database).

## 2. Resend account + notification recipient (US-12 · AC-12.5)
Lead-notification email needs real credentials before it works in production. Placeholders (`RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL`) are added to `.env.example` in AC-7.4, and tests will mock the Resend client, so this does **not** block the build.
- Provide (or create) a **Resend API key** and confirm the **verified sending domain**.
- Which **email address** should receive new-lead notifications?

## 3. WhatsApp business number (US-13 · AC-13.3)
The `wa.me` hand-off needs the real business number (`NEXT_PUBLIC_WHATSAPP_NUMBER`, international format, digits only). A placeholder is used for dev/CI.
- Provide the **WhatsApp business number** for lead hand-off.

## 4. Packages page — template has no Packages page (US-11 · AC-11.4) — RESOLVED 2026-07-19
**Human decision:** No standalone Packages page. Render Packages + Testimonials + FAQ as sections on the About page (AC-11.4/AC-11.6 as drafted). The site does not need to match the photobuddy template exactly — CLAUDE.md's "look exactly like it" directive is relaxed for this case.

## 5. Real launch content (non-blocking — placeholders approved)
Per your operator note, we will **reuse the photobuddy template imagery** (multiple dimensions already in `public/photobuddy/img/`) as our gallery/hero placeholders and lorem-style copy for sample content, so nothing here blocks sprint-2.
- When available, please supply the **real hero/portfolio galleries, homepage headline + CTA copy, package pricing, testimonials, and FAQ entries** so the photographer-managed content replaces placeholders before public launch.

---
_Contact: Product Owner (sprint-2 planning). Machine-readable plan: `scrum-master/sprint2.json`._
