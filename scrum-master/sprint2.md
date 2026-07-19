# Sprint 2

**Phase:** planning
**Progress:** 0/7 stories | 0/31 ACs
**Last Updated:** 2026-07-19

## Sprint Goal
Ship the public, lead-generating photography website on top of the Gallery Engine delivered in sprint-1. Port the photobuddy design system into the app shell; add the content-driving CMS collections (Homepage, Portfolio, Blog, Testimonials, Packages, FAQ) the photographer manages without a developer; render all public marketing pages (Home, Galleries, Blog, and About with Packages/Testimonials/FAQ sections) with static generation + ISR powered by the existing Gallery Engine; and deliver lead conversion (contact form + WhatsApp capture) writing to a Leads collection with Resend email notification. Close sprint-1's carried-over deploy/CI/flake follow-ups first.

## Reference Documents
- `scrum-master/PRD.md`
- `CLAUDE.md`
- `scrum-master/retrospective.md`
- `public/photobuddy/`

## Definition of Done
- [ ] All ACs verified by CI
- [ ] No critical defects
- [ ] Coverage threshold met
- [ ] Code file headers include metadata
- [ ] All services run in Docker
- [ ] retrospective.md updated

## User Stories

### US-7: Sprint-1 carry-over: deploy pipeline, clean-checkout CI smoke, and live-boot flake stabilization
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-7.1:** A valid `.github/workflows/deploy.yml` exists (triggered on push to `main` and via `workflow_dispatch`) so a sprint-close deploy no longer returns HTTP 404 for the missing workflow; the workflow parses cleanly and builds the app inside Docker per the CLAUDE.md Docker rules.
- [ ] **AC-7.2:** CI includes a clean-checkout smoke path (fresh `actions/checkout` -> `cp .env.example .env` -> `docker compose up` that boots `web`+`db`), so latent config gaps (like the sprint-1 `PAYLOAD_SECRET` bug) surface immediately rather than several ACs later.
- [ ] **AC-7.3:** The AC-1.2 live-boot test is stabilized so it no longer false-fails in the full local Docker suite (live/server-spawning suites are isolated from parallel jest, e.g. `--runInBand`, or given an adaptive timeout); verified by 5 consecutive full local-suite runs with zero false failures and by the test remaining green on CI runners.
- [ ] **AC-7.4:** `.env.example` is authoritative for every variable required by sprint-2 (adds `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_SITE_URL`) with placeholder values only and no real secrets committed.

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  PLAN REVIEW: approved 2026-07-19 (planning-phase draft review; implementation not yet tested). Independently re-verified, not just re-stamped. Read the real repo state: `.github/workflows/` currently contains only `ci.yml` (no `deploy.yml`) and the current `.env.example` does not yet define RESEND_API_KEY/LEAD_NOTIFICATION_EMAIL/NEXT_PUBLIC_WHATSAPP_NUMBER/NEXT_PUBLIC_SITE_URL -- both consistent with dev_status=not-started and with what 7.1/7.4 ask for. Cross-checked AC-1.2's actual sprint-1 text (`sprint1.json`: Postgres runs in docker-compose, Payload connects via the `db` hostname and runs its initial migration) against retrospective.md's description of the flaky verification test for that AC (spawns a live server, polls /api/users, times out under full local-suite parallelism) and the MEMORY.md note `ac1.2-live-boot-test-flaky-locally` -- the two are consistent (AC text vs. its verification-test behavior), so AC-7.3's reference to 'the AC-1.2 live-boot test' is accurate, not a misnomer. All 4 ACs have objective pass/fail lines: 7.1 (file exists, both triggers present, parses as YAML, contains a Docker build step), 7.2 (a job doing fresh-checkout -> cp .env.example .env -> docker compose up), 7.3 (isolation/timeout fix + 5 consecutive clean local runs + green CI), 7.4 (diff .env.example keys against vars actually referenced in code, placeholder values only). No wording changes needed, no scope issues.

---

### US-8: Public site design system + app shell ported from the photobuddy template
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-8.1:** The `(frontend)` route group has a shared public layout that renders the photobuddy chrome — the left vertical menu with logo, primary nav (Home, About, Galleries, Blog, Contact), social icons, and copyright, plus the footer — replacing the create-next-app placeholder layout.
- [ ] **AC-8.2:** The photobuddy global styling and the Rubik webfont are ported into the app (Tailwind theme tokens / globals.css); verified by: Rubik being loaded as a webfont via `next/font/google` or an equivalent mechanism (the template itself loads Rubik via a Google Fonts `<link>` at `public/photobuddy/index.html:21`, not a local `@font-face` — there is no `@font-face` for Rubik anywhere in `public/photobuddy/css/`), the app's base font-family resolving to Rubik matching the `font-family:'Rubik', Arial, Helvetica, sans-serif;` rule at `public/photobuddy/css/style.css:27`, Tailwind theme colors matching the hex values used throughout that file (e.g. #333333, #999999, #000), and the create-next-app placeholder homepage markup being fully removed.
- [ ] **AC-8.3:** A mobile menu trigger (client component) toggles the vertical menu drawer, delivering the mobile-first navigation the template specifies (menu collapses on small viewports, opens on tap).
- [ ] **AC-8.4:** Frontend `<head>`/metadata is real (earthandhoney site title, description, favicon) and no 'Create Next App' / 'Generated by create next app' strings remain anywhere in the frontend shell.

**Dependencies:** US-7

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  PLAN REVIEW: approved 2026-07-19 (planning-phase draft review; implementation not yet tested). Independently re-verified against the actual template files, not taken on faith. Read public/photobuddy/index.html lines 46-115 directly: the vertical-menu nav list is exactly five items -- home/about/galleries/blog/contact (lowercase in markup) -- with no Packages entry, confirming 8.1's nav list and the 'no Packages in the template nav' fact relied on later by US-11. Also confirmed the vertical menu carries a logo, 5 social-icon links, and a copyright block, and that .photobuddy_fl_menu_trigger has default/light/opened CSS states plus per-breakpoint position rules in style.css, supporting 8.3's collapse/tap-open behavior as a real, testable template feature. 8.2 as originally drafted was subtly wrong, not just vague: it pointed to style.css:27 as if it were an '@font-face declaration', but grep confirms there is NO @font-face for Rubik anywhere under public/photobuddy/css/ (only fontello.css and flexslider.css have @font-face, for icon fonts) -- style.css:27 is just the `font-family:'Rubik',...` rule applied to <body>. The actual Rubik font load happens via a Google Fonts <link> in index.html:21. Rewrote 8.2's text field to cite both anchors correctly (index.html:21 for the load mechanism, style.css:27 for the applied font-family) so Dev/CI verification checks the real thing instead of a non-existent @font-face rule. 8.1, 8.3, 8.4 needed no changes -- each already has a concrete DOM/metadata/string-grep pass/fail line. No PO-level scope issues.

---

### US-9: Content CMS collections: Homepage, Portfolio, Testimonials, Packages, FAQ
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-9.1:** A Homepage global/singleton lets the photographer manage the hero gallery (relationship -> galleries), headline/intro text, a primary CTA (label + link), and an ordered, reorderable array/blocks-type field for content sections (exact block types are a Dev Team technical decision, since `public/photobuddy/index.html` has no homepage sections beyond the hero gallery grid to derive them from) — no code change is needed to update homepage content, and reordering the array changes the rendered order.
- [ ] **AC-9.2:** A Portfolio collection models portfolio entries that each reference one or more Galleries (title, slug, category, cover, ordered galleries) so portfolio pages are gallery-driven and reuse the Gallery Engine, with no separate image system.
- [ ] **AC-9.3:** Testimonials, Packages, and FAQ collections exist with the fields their pages need (Testimonial: quote, author, role; Package: name, price, description, features[]; FAQ: question, answer, order) and are all editable in the Payload admin.
- [ ] **AC-9.4:** All new collections/globals are registered in `payload.config.ts`, carry required fields and an admin `useAsTitle`, and include the metadata front-matter header per project conventions.

**Dependencies:** US-8

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  PLAN REVIEW: approved 2026-07-19 (planning-phase draft review; implementation not yet tested). Independently re-verified, not copied. Read public/photobuddy/index.html in full (205 lines): after the vertical menu/header, the only content is the flexslider hero gallery and an empty <footer> -- confirms 9.1's claim that the template has no homepage sections beyond the hero grid, so leaving exact content-section block types to Dev Team judgment is the right call, not a cop-out. Cross-checked 9.2/9.3's field lists against PRD.md section 7 (Payload CMS Scope): Portfolio, Testimonials, Packages, and FAQ are named as collections there but the PRD gives no field-level spec for Testimonials/Packages/FAQ (unlike Blog, which gets an explicit field list) -- so the Dev-team-reasonable field lists in 9.3 don't contradict the PRD and are fully testable against the Payload config either way. 9.4's text already reflects the earlier fix (dropped an inapplicable devrag-reindex clause, kept registration/useAsTitle/header requirements) and is accurate: mcp__devrag__reindex_document re-indexes /scrum-master/ markdown, not Payload source, so that clause could never be satisfied by a code artifact. No further changes needed. No scope issues.

---

### US-10: Blog publishing system (galleries, not featured images) with two sample posts
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-10.1:** A Blog collection exists with Title, unique Slug, Content (lexical rich text), Gallery (relationship -> galleries), SEO (meta title + description), Publish Date, and Status (draft/published) — and NO featured-image field, because blog posts use galleries per the PRD.
- [ ] **AC-10.2:** The no-`<em>` rule is enforced on blog content (validation/serialization rejects or strips `<em>` emphasis) so no `<em>` tags can appear in published blog output.
- [ ] **AC-10.3:** The public read path exposes only posts whose Status is `published` and whose Publish Date is <= now; drafts and future-dated posts are excluded.
- [ ] **AC-10.4:** Two complete sample blog posts (each with title, slug, body content, and an attached gallery — no featured image, no `<em>`) are seeded and readable via the API.

**Dependencies:** US-9

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  PLAN REVIEW: approved 2026-07-19 (planning-phase draft review; implementation not yet tested). Independently re-verified against PRD.md section 7 (Blog): the field list there is exactly Title/Slug/Content/Gallery/SEO/Publish Date/Status, plus the explicit rules 'blog posts use galleries, not featured images', 'no <em> tags anywhere in blog content', and 'two complete sample blog posts must be created' -- all four ACs map 1:1 onto those rules with no gaps or invented requirements. Each AC has an objective pass/fail line: explicit field list plus explicit negative requirement (10.1), a grep-able output guarantee (10.2), an explicit query filter on Status+Publish Date (10.3), a seed-then-API-read check for exactly 2 posts (10.4). No wording changes needed, no scope issues.

---

### US-11: Public marketing pages (Home, Galleries, Blog, About with Packages/Testimonials/FAQ sections) via Gallery Engine + ISR
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-11.1:** The Home page renders the Homepage content and its hero gallery through the existing Gallery Engine in Hero display mode (slideshow enabled, hover-preview + fullscreen disabled) plus a lead-generation CTA, matching the photobuddy `index.html` layout.
- [ ] **AC-11.2:** The Galleries (portfolio) index lists Portfolio entries, and each portfolio/gallery detail page renders its gallery via the Gallery Engine in Portfolio display mode (hover preview + fullscreen), matching `gallery.html` / `gallery_single.html`.
- [ ] **AC-11.3:** The Blog index lists published posts and each post page renders its body with its attached gallery (never a featured image), matching `blog.html` / `blog_single.html`.
- [ ] **AC-11.4:** The About page renders its About Us heading and body copy from CMS-managed content (not the hardcoded template lorem), reusing the existing `public/photobuddy/about.html` two-column `photobuddy_fl_about` layout (about image + `about_us` sticky-sidebar text block) so the About Us section matches the template exactly. There is no standalone Packages page and no new primary-nav entry: the US-8-approved template nav (Home, About, Galleries, Blog, Contact) is unchanged, and Packages/Testimonials/FAQ render as sections of this About page per AC-11.6.
- [ ] **AC-11.5:** All public pages are statically generated with ISR and regenerate on-demand when their backing content changes (reusing the US-6 revalidation pattern); no page loads a full gallery upfront (visible images + required thumbnails only).
- [ ] **AC-11.6:** Below the About Us block, the About page renders Packages, Testimonials, and FAQ as three distinct stacked sections, each populated by a query against its US-9 collection with no hardcoded entries — Package (name, price, description, features[]), Testimonial (quote, author, role), and FAQ (question, answer, in `order`). Because the photobuddy template ships no dedicated packages/testimonial/FAQ markup (a case-insensitive search across `public/photobuddy/` returns zero matches), these sections are built from the shared photobuddy design system delivered in US-8 — the Rubik type scale, the color tokens in `public/photobuddy/css/style.css`, and the `photobuddy_fl_*` section/container conventions — rather than a per-type template file; a section whose collection has no entries renders nothing (no empty heading).

**Dependencies:** US-8, US-9, US-10

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  REQUIREMENTS REVIEW: approved 2026-07-19 (testability/verifiability pass; implementation not yet tested). AC-11.4/AC-11.6 were previously held at requirements-defect: the PRD (section 8, Pages list: Home/Portfolio/Blog/Packages/About/Contact) lists Packages as its own top-level page, but the photobuddy template has no packages.html and no Packages nav slot (index.html nav is exactly home/about/galleries/blog/contact), and a case-insensitive grep for testimonial|pricing|package|faq across public/photobuddy/ returns zero files -- a genuine PRD-vs-template conflict that only the PO/human could resolve, not a wording defect. That conflict is now RESOLVED: po-requests.md item 4 records the human decision (2026-07-19) to skip a standalone Packages page, fold Packages/Testimonials/FAQ into the About page exactly as AC-11.4/AC-11.6 already draft it, and relax CLAUDE.md's 'look exactly like the template' directive for this case. AC-11.4/AC-11.6 text already matches that decision verbatim, so no AC rewrite was needed -- only the status was blocked pending the answer. Independently re-verified today: about.html (171 lines) has only the photobuddy_fl_about wrapper with about_img/about_us sticky-sidebar divs and an 'About Us' heading, confirming AC-11.4's reuse target is real; AC-11.1/AC-11.2/AC-11.5 re-checked against PRD.md section 5.6 (Hero: slideshow on, hover/fullscreen off; Portfolio: hover+fullscreen on -- both match verbatim) and AC-11.3 against the Blog rules in section 7; AC-11.5's reuse of the US-6 revalidation pattern is grounded in that pattern already existing, not aspirational. All 6 ACs (11.1-11.6) are approved as testable and verifiable; no scope issues remain.

---

### US-12: Lead generation: contact form -> Leads collection + Resend email notification
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-12.1:** A Leads collection captures every enquiry (name, email, phone, photographyType, preferredDate, message, source, status starting at `new`, created timestamp) and is visible/manageable in the Payload admin.
- [ ] **AC-12.2:** The Contact page renders a form with the PRD-required fields (Name, Email OR Phone, Photography Type, Preferred Date, Message). `public/photobuddy/contact.html`'s stock form only has Name/Email/Subject/Message fields (no Phone, Photography Type, or Preferred Date), so 'matching contact.html' means reusing its layout and styling conventions (the `.your-name`/`.your-email`/`.your-message` field-wrapper classes and the `.photobuddy_fl_btn.photobuddy_fl_message_submit` submit button), extended with the additional PRD-required fields the template does not include — not a field-for-field match with the template's stock markup.
- [ ] **AC-12.3:** Server-side validation requires Name + Message + at least one of Email or Phone; invalid submissions are rejected with field-level errors and create no lead.
- [ ] **AC-12.4:** A valid submission creates exactly one Lead via a server action / route handler and returns a success state to the user (every submission creates a lead, per the PRD).
- [ ] **AC-12.5:** A lead-notification email is sent to the photographer via Resend on each new lead; a Resend send failure is handled gracefully and does not lose the already-persisted lead.

**Dependencies:** US-8

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  PLAN REVIEW: approved 2026-07-19 (planning-phase draft review; implementation not yet tested). Independently re-verified, and found one real inaccuracy the prior pass missed. Read public/photobuddy/contact.html directly (lines 140-155): the actual stock form only has four fields -- your-name, your-email, your-subject, your-message -- with a `photobuddy_fl_btn photobuddy_fl_message_submit` submit button. There is no Phone, Photography Type, or Preferred Date field in the template at all. 12.2 as originally drafted said the form should have the PRD's 5 fields 'matching contact.html', which is ambiguous-to-wrong if read as field-for-field parity, since the template literally lacks 3 of the 5 required fields (Phone/Photography Type/Preferred Date only exist in the PRD, section 9, cross-checked directly: 'Name / Email OR Phone / Photography Type / Preferred Date / Message'). Rewrote 12.2's text to name the actual template classes to reuse for styling and to state explicitly that the PRD field set supersedes the template's stock fields, so Dev Team doesn't drop required fields chasing an impossible literal template match. 12.1/12.3/12.4/12.5 needed no changes -- each has an explicit schema, validation rule, or failure-handling guarantee with a concrete pass/fail line. No scope issues; PRD.md section 9's WhatsApp workflow (checked below for US-13) confirms 'every submission creates a lead' is a real PRD rule, not invented for 12.4.

---

### US-13: WhatsApp lead-capture flow (no anonymous conversations)
**Status:** draft | **Priority:** medium

#### Acceptance Criteria
- [ ] **AC-13.1:** A WhatsApp button is present on public pages; clicking it opens a lead-capture form (contact details) rather than a direct chat, so no anonymous WhatsApp conversation is possible.
- [ ] **AC-13.2:** Submitting the WhatsApp form creates a Lead with `source = whatsapp` using the same Leads collection and validation as the contact form.
- [ ] **AC-13.3:** After the lead is saved, the user is handed off to WhatsApp via a `wa.me` deep link to the configured business number (`NEXT_PUBLIC_WHATSAPP_NUMBER`) with a pre-filled message assembled from the captured details.
- [ ] **AC-13.4:** Lead-first ordering is enforced: if lead capture fails, the WhatsApp handoff does not occur.

**Dependencies:** US-12

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  PLAN REVIEW: approved 2026-07-19 (planning-phase draft review; implementation not yet tested). Independently re-verified against PRD.md's 'WhatsApp Workflow' section (read directly, immediately after section 9): the documented flow is literally 'User clicks WhatsApp -> Form appears -> User enters contact details -> Lead saved -> WhatsApp opens with pre-filled message', with the explicit rule 'No anonymous WhatsApp conversations.' -- this maps 1:1 onto 13.1 (form not direct chat), 13.2 (lead created before handoff), 13.3 (wa.me deep link with pre-filled message), and 13.4 (lead-save failure blocks handoff, i.e. the PRD's ordering is a hard gate, not a suggestion). All 4 ACs correctly build on the already-approved US-12 Leads collection/validation rather than duplicating it. No vague wording, no scope issues, no changes needed.

---

---

## Sprint Review

### Dev Team Sprint Notes
_Pending_

### Tester Sprint Notes
_Pending_

### PO Sprint Review Notes
_Pending_

---
_Auto-generated from `sprint2.json` — do not edit directly._
