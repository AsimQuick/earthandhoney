---
title: "Earth & Honey Studios / LumaForge Foundation"
subtitle: "Product Pivot PRD — Photography-First Studio Operating System"
audience: "Product Owner AI Agent and Development Agents"
status: "V1 dedicated Earth & Honey delivery; V2 SaaS foundation"
date: "30 July 2026"
revision: "2026-07-30 — headless-ledger finance revision (see §25)"
---

> **RESTORATION NOTE (2026-07-30).** This file was reverted to the retired Gallery-Engine PRD by an
> uncommitted-working-tree loss during orchestrator branch switching, and has been restored by the
> Product Owner. The retired document is preserved at `scrum-master/PRD-archive.md`. **This file is
> authoritative. `PRD-archive.md` is historical only — do not build from it.**

> **REVISION NOTE (2026-07-30).** The finance architecture changed after this PRD was first written.
> **Invoice Ninja is now headless**: an API-only ledger and document generator with **no client
> portal and no client-facing surface**. The client only ever sees the Project Room. The governing
> statement is **The Ledger Rule** in §25. Sections 4.3, 4.5, 5, 9, 10, 25, 26, 27, 28, 31, 35.5 and
> 36 have been revised accordingly. Where any older passage conflicts with §25, §25 wins.

# 1. Product Owner Directive

> **Build a comprehensive online operating system for photography businesses: photography-first, gallery-first, fast, simple, and commercially useful.**

The immediate production delivery is for **Earth & Honey Studios**, an established wedding and engagement photography business operating since 2006.

The longer-term business is **LumaForge**, a viable SaaS platform for photography studios. V1 must prove the product with one real studio while creating reusable technical value for V2.

This is a pivot, not a greenfield restart. The Product Owner must preserve working code where it remains useful, replace duplicated or weaker logic with proven open-source foundations, and avoid rewriting mature functionality merely to make the stack look uniform.

The governing rule is:

> **Deliver Earth & Honey exceptionally well now. Create clean seams for LumaForge later. Do not build the LumaForge business in V1.**

# 2. Product Goal

Earth & Honey Studios needs one coherent online system that makes both sides of the business easier:

- a premium public website that generates qualified inquiries;
- a deterministic publishing system for pages, visual stories, galleries, and forms;
- a project workflow that remembers where every client is in the process;
- a digital darkroom for organizing and delivering images;
- polished quote, contract, invoice, payment, receipt, and reminder workflows;
- a client-facing Project Room showing what is complete, pending, payable, and ready;
- search-engine-readable content and image metadata;
- temporary, secure gallery delivery rather than permanent photo hosting.

The product must remain true to photography:

> **Images are not decorative content inside a generic business app. Images and galleries are the primary product objects around which the business workflow is organized.**

# 3. Technical Goal

The technical goal is to deliver the above with the smallest practical system:

- reuse proven open-source logic instead of rebuilding it;
- keep service boundaries clear;
- avoid duplicate databases and duplicate sources of truth where possible;
- avoid a drag-and-drop visual builder;
- use structured CMS inputs to produce consistently beautiful output;
- use Cloudflare R2 and an optimized derivative pipeline for sharp, fast delivery;
- keep the deployment understandable enough to operate on one dedicated VPS;
- avoid Kubernetes, unnecessary microservices, and speculative SaaS infrastructure;
- preserve future portability through adapters, external IDs, and centralized studio settings.

# 4. Locked Product Decisions

The following decisions are settled unless a blocking technical fact is discovered during the pivot audit.

## 4.1 Product Surfaces

- **Frontstage**: Earth & Honey's public website and public portfolio experience.
- **Backstage**: the private studio operating system and editor.
- **Project Room**: the protected client-facing project, payment, document, and gallery experience.

**There is no fourth surface.** No integrated system may present its own UI to a client or to the photographer. If a human sees it, we built it.

## 4.2 Product Interaction Model

This is **not** a Format, Wix, Squarespace, or Canva-style editor.

The system will not offer:

- a blank canvas;
- arbitrary element placement;
- page-level CSS editing;
- freeform resizing;
- random margin and padding controls;
- drag-and-drop website composition.

The user creates structured objects:

```text
New Project
New Gallery
New Page
New Story
New Contact Form
```

Each opens a purposeful form. The system turns those inputs into responsive, visually consistent output.

## 4.3 Core Technology Roles

- **PicPeak fork**: core Backstage gallery, project, customer, delivery, media, access, expiry, email-queue, and gallery-theme foundation.
- **Payload CMS + Next.js**: Frontstage pages, stories, forms, inquiries, SEO, navigation, and deterministic website publishing.
- **Invoice Ninja (headless)**: API-only ledger and document generator for invoices, tax, numbering, payment records, credit notes, receipts, and payment-schedule definitions. **No client portal, no client-facing surface, no connected payment gateway.** Quote and contract *workflow and presentation* belong to the Project Room, not to Invoice Ninja.
- **Stripe**: the only system that moves money. One payment path, ported from `techno`.
- **Cloudflare R2**: image, derivative, download, and document storage.
- **PostgreSQL**: production database technology.
- **Dedicated VPS**: Earth & Honey V1 deployment target.

## 4.4 PicPeak Reuse

PicPeak is no longer merely an engineering reference. It is the starting Backstage foundation.

The team must fork and preserve as much proven PicPeak functionality as practical, including its:

- database schema and migrations;
- Project and Event/Gallery relationships;
- customer accounts;
- upload and image-processing pipeline;
- gallery permissions and passwords;
- expiry and archiving;
- download and ZIP logic;
- watermarks and protection settings;
- feedback and client-review flows;
- email templates and email queue;
- API, webhooks, retries, and audit visibility;
- CSS gallery templates;
- Docker, tests, and operational tooling.

PicPeak's CSS templates must be copied **verbatim first**, then adapted only through intentional, documented changes.

## 4.5 Finance Boundary

PicPeak's native CRM/accounting modules are not the V1 financial authority. They remain disabled.

Invoice Ninja remains the financial record of truth, but **headless**. It holds records; it presents nothing. The full statement is **The Ledger Rule** in §25.1. The reason for keeping it is architectural declutter — removing the duplicate portal, duplicate client record, duplicate payment status, and second sender identity — not the acquisition of bookkeeping features.

## 4.6 Infrastructure Already Available

- This project has its own VPS.
- Cloudflare R2 credentials already exist.
- The team must audit and reuse those credentials securely rather than provisioning unnecessary parallel storage.

# 5. Decisions That Must Be Validated, Not Assumed

The Product Owner must resolve these through short technical spikes before dependent implementation:

1. Whether the current codebase is best retained as the Frontstage/Payload application or partially replaced.
2. The exact API boundary between Payload/Next.js and the PicPeak fork.
3. Whether PicPeak media records can be reused across multiple galleries without duplicating original binaries.
4. The optimal public and private R2 delivery path: backend streaming, presigned R2 URLs, Cloudflare Worker/CDN access, or a hybrid.
5. The VPS capacity required for image processing at Earth & Honey's expected batch sizes.
6. Any use of Invoice Ninja beyond the ownership rows in §10, and any decision to let Invoice Ninja send a given email type rather than the Backstage email queue.

Three decisions previously listed here are now **settled** (2026-07-30):

- *How Stripe payment is initiated* — **the ported direct Stripe flow**, reconciled into the ledger. Invoice Ninja's own payment gateway stays disconnected, so there is exactly one payment path.
- *Where Invoice Ninja runs* — **the project's own VPS, in the project's own `docker-compose.yml`.**
- *The V1 contract-signing mechanism* — **PicPeak's own native signing capability**, hardened per §29, with no external e-sign vendor and no manual-upload fallback. This one is settled **conditionally**: US-15/US-17 must still verify the capability actually exists at the pinned commit before Project Room work depends on it (see §29 and `po-requests.md` item 7).

No agent should silently choose one of these based only on preference.

# 6. Product Principles

## 6.1 Gallery First

A Gallery is a first-class digital asset. It may:

- appear on the homepage;
- appear on a standard portfolio page;
- appear inside a Story;
- exist only for a client;
- be password-protected;
- be payment-gated;
- expire;
- be reused in more than one Frontstage placement where the data model permits;
- exist without any public page.

## 6.2 Project First for Business Workflow

The Project exists before the images.

A Project connects:

```text
Inquiry
→ Client
→ Dates and venues
→ Emails
→ Quote
→ Contract
→ Deposit and invoices
→ Shoot
→ Galleries
→ Final payment
→ Delivery
→ Expiry and closure
```

Invoices belong to Projects, not directly to galleries. A gallery may observe a named Project payment milestone to decide whether viewing or downloading is unlocked.

## 6.3 Deterministic Beauty

The photographer supplies content, images, context, and judgement. The system supplies:

- layout;
- hierarchy;
- responsiveness;
- typography;
- spacing;
- image treatment;
- accessibility;
- metadata;
- performance.

## 6.4 One Owner per Business Function

Every important function has one authoritative system. Duplicate ownership is prohibited.

## 6.5 Lightweight by Subtraction

The system should feel powerful because unnecessary choices and duplicated workflows have been removed.

## 6.6 Records versus Experiences

A proven external system may hold *records*. Every *experience* is ours. This is the tiebreak used throughout §25.

# 7. LumaForge Intellectual Property Targets

PicPeak-derived code is a foundation, not the full LumaForge differentiation. The team must deliberately build original value in the following areas.

## 7.1 Deterministic Photography Publishing Engine

Structured forms produce premium, responsive pages, stories, forms, and gallery placements without a visual canvas.

## 7.2 Photography-Specific Project State Machine

A Project cockpit and Project Room make the end-to-end photography workflow visible and actionable.

## 7.3 Project-to-Payment-to-Gallery Gate

Verified payment milestones control gallery viewing and downloads without awkward manual chasing.

## 7.4 High-Performance Gallery Delivery Adapter

A reusable media-delivery layer selects the correct derivative, delivery path, cache policy, access rule, and prefetch behavior for:

- public portfolio images;
- protected previews;
- watermarked images;
- fullscreen viewing;
- authorized original downloads.

## 7.5 Image-to-SEO Translation Layer

The system turns visual work and trusted project metadata into useful alt text, page metadata, structured data, image sitemaps, and local relevance.

## 7.6 Protected Design System

Photographers can change a controlled set of brand inputs while the platform protects visual quality.

# 8. V1 and V2 Boundary

## 8.1 V1: Earth & Honey Studios

Earth & Honey receives a dedicated production deployment with its own:

- VPS;
- domain and TLS;
- PostgreSQL data;
- R2 storage and credentials;
- PicPeak fork deployment;
- Payload/Next.js deployment;
- headless Invoice Ninja ledger instance;
- Stripe configuration;
- email configuration;
- backups and monitoring.

V1 is a single-studio system.

## 8.2 V2: LumaForge

LumaForge may later add:

- photographer signup;
- SaaS subscriptions;
- tenant provisioning;
- custom-domain onboarding;
- shared or cell-based hosting;
- centralized support and billing;
- multiple studios logging in through LumaForge;
- reusable templates and plan controls.

These are not V1 requirements.

## 8.3 SaaS-Aware V1 Rules

Without implementing multi-tenancy now:

- centralize Earth & Honey identity in a `StudioProfile` or equivalent;
- never scatter business name, domains, colors, sender names, or storage paths through code;
- use adapters for billing, storage, email, and media delivery;
- store external system IDs explicitly;
- keep cross-system mappings documented;
- avoid direct cross-database joins;
- preserve an API boundary between Frontstage and Backstage;
- do not retrofit `tenant_id` across PicPeak core tables in V1 merely for appearance;
- create an Architecture Decision Record for V2 tenancy: true shared multi-tenancy versus isolated studio cells.

# 9. Target Architecture

```text
Visitors
   ↓
Frontstage — Next.js + Payload
Pages, stories, forms, SEO, public placements
   ↓                          ↘
PicPeak API / webhooks          Inquiry records
   ↓                              ↓ Convert
Backstage PicPeak Fork ←────── Projects / Clients / Galleries
   ↓
Project Room and Private Galleries
Quote, contract, invoice presentation, Pay button — all rendered by us
   ↓
Stripe (the only money path)
   ↓
Verified payment webhook
   ↓
Invoice Ninja (headless, API only)
Invoice, tax, numbering, payment record, credit note, receipt PDF
   ↓
Verified payment events
   ↓
Project milestone and gallery access update

Cloudflare R2
Originals, derivatives, downloads, PDFs, documents

Dedicated VPS + Docker Compose + reverse proxy
```

# 10. System Ownership Matrix

| Domain | Authoritative system | Notes |
|---|---|---|
| Studio identity and Frontstage branding | Payload `StudioProfile` | Backstage may cache/display it. |
| Public navigation, pages, stories, forms, SEO | Payload | No PicPeak CMS landing-page duplication. |
| Raw inquiries | Payload | Do not create financial clients automatically. |
| Operational client identity after conversion | PicPeak customer account | The ledger client record is an internal financial mirror the client never sees. |
| Photography Project | PicPeak Project, extended by our migrations | Project Room becomes client-visible. |
| Galleries and media delivery | PicPeak Event/Gallery and photo pipeline | UI may call Events "Galleries." |
| Public gallery placement and layout | Payload placement record | References PicPeak gallery ID. |
| Quote and contract workflow and presentation | PicPeak / Project Room | We render every surface. |
| Invoice, tax, numbering, payment record, credit note, receipt document | Invoice Ninja (headless, API only) | Record of truth. No portal, no gateway. |
| Payment schedule / installment plan definition | Invoice Ninja | Stripe Subscriptions must not be used. |
| Actual card charge | Stripe | One payment path only, ported from `techno`. |
| Payment-gated gallery unlock | PicPeak | Verified Stripe webhook + ledger reconciliation. |
| Client-facing portal | Project Room only | Never Invoice Ninja's portal. |
| Contract signature | PicPeak's own native signing capability | Status linked to Project; pending US-15/US-17 verification (§29). |
| Project/gallery operational emails | PicPeak/Backstage email system | Templates editable. |
| Financial emails and reminders | PicPeak/Backstage email system by default | May flex to the ledger where clearly simpler — PO sign-off, recorded in `SYSTEM_OWNERSHIP.md`. Exactly one system owns each email type. |
| Original and derivative files | R2 | Access controlled by purpose. |

# 11. PicPeak Fork Strategy

## 11.1 Fork, Do Not Recreate

Create an Earth & Honey/LumaForge fork from a pinned PicPeak commit that includes the required Projects, customer accounts, webhooks, S3-compatible storage, and gallery features.

Production must never track a floating upstream branch.

## 11.2 Required Repository Files

Create and maintain:

- `PICPEAK_UPSTREAM.md` — upstream URL, pinned commit, branch/tag, update process;
- `THIRD_PARTY_NOTICES.md` — PicPeak MIT notice and other copied dependencies;
- `FORK_CHANGELOG.md` — all deliberate deviations;
- `PICPEAK_PORT_LEDGER.md` — copied templates/components and destination behavior;
- `UPSTREAM_SYNC.md` — merge/rebase policy and known conflict zones;
- `ARCHITECTURE_DECISIONS/` — important boundary decisions.

## 11.3 Migration Discipline

- Never edit an already-shipped PicPeak migration.
- Add new numbered migrations for Earth & Honey/LumaForge extensions.
- Preserve rollback behavior where practical.
- Test fresh install and upgrade install.
- Keep PostgreSQL as the production requirement.

## 11.4 CSS Templates

Copy the bundled PicPeak CSS templates verbatim as the first implementation baseline.

Then:

- preserve the original files or upstream snapshots;
- create Earth & Honey variants as separate templates;
- document changes;
- rename potentially confusing branded template names where appropriate;
- keep the photographer's template choices limited and curated.

## 11.5 What Stays Disabled

Disable or hide PicPeak features that duplicate the agreed architecture, especially:

- PicPeak public landing-page CMS;
- PicPeak native quote/invoice/accounting UI (the ledger owns those records);
- generic configuration clutter not needed by Earth & Honey;
- any page-building capability that conflicts with Payload Frontstage ownership.

## 11.6 Backstage Terminology

To reduce migration risk, internal API/database names may remain PicPeak-native. The user-facing language should be:

- PicPeak `Project` → **Project**;
- PicPeak `Event` → **Gallery** in most Earth & Honey UI;
- PicPeak customer account → **Client**;
- admin panel → **Backstage**;
- customer portal → **Project Room**.

# 12. Frontstage Product

Frontstage is a premium lead-generation website, not a generic portfolio CMS.

## 12.1 First Public Navigation

- Weddings
- Engagements
- Details

Navigation remains configurable through structured fields.

## 12.2 Frontstage Design Direction

- mobile-first;
- image-led;
- restrained copy;
- full-width photography where appropriate;
- ample line height and whitespace;
- intentional type scale;
- consistent alignment and text measure;
- system-defined padding and margins;
- subtle black overlays and vignettes on slideshows;
- careful corner radius rules;
- minimal, fast transitions;
- no layout shift from images;
- no style drift between original and newly created pages.

The existing template is inspiration and a source of reusable code, not the final design authority. Before expanding page creation, the team must establish shared design tokens for:

- one primary serif/display font and one sans-serif/utility font;
- two or three approved font combinations at most;
- color palette;
- type scale;
- line heights;
- text measures;
- spacing scale;
- gallery gaps;
- radii;
- overlay and vignette presets;
- breakpoints;
- animation timing.

## 12.3 Photographer-Controlled Branding

The photographer may control only:

- logo;
- accent color from a safe input with contrast validation;
- one approved font pairing;
- site identity and contact details;
- content and gallery selections.

The photographer cannot edit arbitrary CSS, layout, margins, or component positioning.

# 13. Deterministic Content Creation

## 13.1 New Page

"Add New Page" opens a structured form.

| Backstage field | Output |
|---|---|
| Internal page name | Backstage organization |
| Navigation label | Menu text |
| Page heading | Visible H1 |
| Short introduction | Visible text and search context |
| Photography type | Service context and schema |
| City/region | Local relevance |
| Venue, optional | Venue relevance and image context |
| URL slug | Public path |
| SEO title | `<title>` |
| Meta description | Search snippet |
| Social image | Open Graph image |
| Gallery placements | Main visual content |
| Tags | Internal relationships |
| Include in menu | Navigation visibility |
| Index/noindex | Search visibility |
| Draft/published | Publication state |

The system generates canonical URL, Open Graph data, structured data, sitemap entries, image sitemap references, and correct heading hierarchy.

## 13.2 Homepage Template

```text
Navigation
Full-width hero slideshow placement
Optional short introduction
Selected galleries or stories
Primary inquiry form
Footer
```

The homepage hero is slideshow-first, full-width, sharp, and uses a controlled overlay/vignette.

## 13.3 Standard Page Template

```text
H1
Short introduction
One or more gallery placements
Optional structured text sections
Inquiry form
Footer
```

## 13.4 Details Template

```text
Minimal H1
Optional one-line introduction
Full-width masonry placement
Inquiry form
Footer
```

The imagery explains rings, dresses, venues, details, and behind-the-scenes moments. Do not over-explain in copy.

## 13.5 Story / Blog Template

Stories are visual editorial records, not generic weekly blog posts.

```text
Title
Subtitle / introduction

Section heading
Short text
Gallery placement

Repeat

Inquiry form
```

Stories should be based on real weddings, venues, cultural details, suppliers, and experiences.

# 14. Gallery Placement Model

The Gallery and its Frontstage layout must remain separate concepts.

- **PicPeak Gallery/Event**: ordered media collection, security, access, expiry, customer relationship, and delivery behavior.
- **Payload Gallery Placement**: where the Gallery appears on Frontstage and how it renders there.

A placement contains:

- PicPeak gallery/event ID;
- layout: slideshow or masonry;
- optional heading;
- optional description;
- optional theme/overlay preset;
- visibility rules;
- order within the page/story.

This permits one gallery to appear in different layouts without changing the underlying gallery, subject to the reuse model validated in the architecture spike.

# 15. Gallery Layout Specifications

## 15.1 Masonry

Masonry must:

- preserve every image's received aspect ratio;
- never crop or stretch;
- preserve the photographer's selected order;
- place images at the natural height created by their aspect ratio and responsive column width;
- use the full available width;
- use system-defined, consistent gaps;
- use approximately one column on mobile, two on tablet, and three or four on larger screens after visual testing;
- reserve aspect-ratio space before load;
- open images in the shared sharp fullscreen viewer.

"Display it as received" refers to composition and aspect ratio. The system may still create optimized derivatives.

## 15.2 Slideshow

Slideshow must:

- be full-width and visually immersive;
- support homepage and internal-page presets;
- use responsive cover behavior with a focal point;
- support controlled dark overlay and vignette presets;
- have minimal accessible controls;
- support swipe, keyboard, and touch;
- preload only the current and next images;
- avoid heavy animation;
- remain crisp on high-density displays.

## 15.3 Fullscreen Viewer

The viewer must provide:

- instant transition from loaded thumbnail/slide;
- responsive high-resolution source selection;
- next/previous;
- keyboard and touch navigation;
- zoom and pan;
- close and Escape support;
- optional caption and count;
- background prefetch of the next image;
- no original download when access does not allow it.

# 16. Backstage: Digital Darkroom

Backstage is not a photo editor. It is an organizer, curator, publisher, and delivery system.

## 16.1 Visual Direction

- near-black and charcoal surfaces;
- subtle red safe-light accents;
- red used for focus, selection, progress, and primary action—not to tint photographs;
- fast contact-sheet behavior;
- keyboard-friendly workflows;
- minimal navigation clutter;
- visible system status and processing state;
- no generic SaaS card overload.

## 16.2 Primary Navigation

- Today / Projects
- Inquiries
- Clients
- Galleries
- Media
- Pages
- Stories
- Forms
- Billing
- SEO / Account
- Settings

## 16.3 Core Darkroom Capabilities

Reuse PicPeak functionality wherever possible, then improve the experience:

- drag-and-drop and file-picker upload;
- chunked/resumable upload where available;
- asynchronous image processing;
- immediate upload status;
- thumbnail contact sheet;
- multi-select and bulk actions;
- folders and Project assignment;
- gallery ordering;
- set cover/hero;
- focal-point selection;
- alt-text suggestions and approval;
- filter by Project, gallery, orientation, state, or missing metadata;
- draft/publish;
- password and security controls;
- expiry and archiving;
- download policy;
- feedback/client review;
- activity log.

# 17. Gallery Creation

A Gallery may be public portfolio content or private client delivery.

## 17.1 New Gallery Entry Choice

```text
New Gallery
→ Portfolio Gallery
or
→ Client Delivery Gallery
```

## 17.2 Shared Fields

Use and adapt PicPeak's proven Event form fields:

- gallery/event type;
- gallery name;
- event date or TBD;
- full-day toggle where useful;
- welcome message;
- theme preset;
- CSS template;
- default gallery layout;
- photo sorting;
- photo cap;
- draft/published state;
- feedback setting.

## 17.3 Client Delivery Fields

Where linked to a Project, prefill rather than retype:

- Project;
- customer name;
- customer email;
- studio/admin email;
- password requirement;
- gallery password;
- client review access;
- guest upload permission;
- expiry rule;
- view/download permissions;
- watermarks/protection;
- payment milestone;
- gallery-ready email.

## 17.4 Portfolio Gallery Fields

Portfolio galleries should omit client-only clutter by default:

- no client account required;
- public/unlisted/draft visibility;
- SEO eligibility;
- Frontstage placement eligibility;
- theme/default layout;
- title and optional description;
- alt-text completeness audit.

# 18. Media Data Model Gap to Resolve

PicPeak's existing model must be audited for how tightly a photo is bound to one Event/Gallery.

Earth & Honey/LumaForge ideally needs:

- one original stored once;
- one media asset referenced by multiple galleries;
- separate gallery ordering and metadata overrides;
- safe promotion of selected client images into public portfolio galleries;
- no accidental exposure of a complete private gallery.

The Product Owner must choose and document one path:

1. preserve PicPeak event-bound photos for V1 and create a safe promotion/copy-reference workflow;
2. introduce a reusable `media_assets` + `gallery_items` layer through new migrations;
3. use an equivalent low-risk model that avoids duplicate original binaries.

This is a high-value architecture decision and a likely LumaForge IP area.

# 19. Image Pipeline and R2

## 19.1 Existing Credentials

The R2 credentials already exist. The team must:

- identify the current bucket and permissions;
- verify least privilege;
- confirm CORS for browser uploads if used;
- confirm lifecycle rules;
- confirm private/public access strategy;
- never commit credentials;
- map them into PicPeak's S3-compatible storage configuration and any Frontstage adapter.

## 19.2 Storage Objectives

Store the original once. Generate only purposeful derivatives such as:

- contact-sheet thumbnail;
- masonry/grid;
- slideshow;
- fullscreen;
- watermarked preview;
- authorized download size;
- cached ZIP where required.

Store width, height, aspect ratio, format, size, processing state, and relevant metadata.

## 19.3 Delivery Adapter Spike

PicPeak's current S3-compatible path should be treated as proven secure functionality, not automatically as the final fastest Frontstage path.

Benchmark:

- PicPeak backend streaming;
- direct R2 presigned delivery;
- public derivative delivery through an R2 custom domain/CDN;
- a Cloudflare Worker or equivalent authorization layer;
- hybrid behavior: direct public derivatives, protected backend or signed delivery for private/watermarked assets.

The chosen adapter must preserve access control, logging, watermarks, and revocation where required.

## 19.4 Performance Targets

Directional production targets:

- no image-caused cumulative layout shift;
- mobile-first Lighthouse performance near or above 90 on representative public pages after production optimization;
- representative LCP approximately 2.5 seconds or better on a realistic mobile profile;
- fullscreen viewer opens perceptibly instantly from an already loaded image;
- contact sheets remain usable with thousands of images through pagination/virtualization;
- failed uploads can be retried without restarting the entire batch;
- public pages never request original full-resolution files unnecessarily.

# 20. Forms and Inquiries

Forms are a primary commercial surface.

## 20.1 Form Design

The visual direction is simple, premium, and restrained:

- large readable labels;
- generous spacing;
- minimal fields;
- one clear submit action;
- no generic SaaS styling;
- responsive by default.

## 20.2 Form Builder

The photographer may configure:

- internal name;
- public title;
- description;
- recipient(s);
- success message;
- field order;
- labels and helper text;
- required/optional status;
- Early Booking Benefits footer/link.

V1 fields:

- short text;
- email;
- phone;
- date;
- dropdown;
- checkbox/consent;
- long text.

No complex conditional form engine is required in V1.

## 20.3 Required Behavior

- client and server validation;
- durable Inquiry record;
- studio email notification;
- optional branded acknowledgement;
- source page and campaign capture;
- spam protection;
- no browser-exposed SMTP secrets.

# 21. SEO System

SEO is part of publishing, not a forgotten settings page.

## 21.1 Account (SEO)

Central studio fields:

- business name;
- owner name;
- description;
- "Since 2006" or established year;
- address;
- public phone/email;
- service areas;
- social profiles;
- default social image;
- default title pattern;
- default meta description;
- business hours/contact details where appropriate.

This data must populate actual metadata and structured data.

## 21.2 Page and Story SEO Assistant

Each public page/story provides:

- search-result preview;
- SEO title;
- slug;
- meta description;
- canonical URL;
- H1 preview;
- photography type;
- city/region;
- venue;
- Open Graph image;
- index/noindex;
- schema preview;
- missing-alt-text audit;
- internal-link suggestions.

Do not create a meta-keywords field. Tags are internal relationships only.

## 21.3 Alt Text

Alt text belongs to images, not one page-level field.

The system should offer self-hosted caption suggestions without requiring a paid external LLM. Florence-2 is the first model candidate, but must be benchmarked for quality, speed, memory, and licensing before adoption.

The system combines:

- visual caption output;
- trusted Project/Gallery metadata such as venue, city, and event type;
- human approval.

It must not invent identity, culture, relationships, or locations.

# 22. Project: Operational Backbone

PicPeak already contains a Project grouping layer above Events/Galleries. Earth & Honey will extend it substantially.

## 22.1 Two Entry Paths

```text
Frontstage form
→ Inquiry
→ Review
→ Convert to Project
```

```text
Backstage
→ New Project
→ Manual creation
```

A raw Inquiry does not automatically become a ledger client record.

## 22.2 New Project Form

Keep the first screen short:

| Field | Downstream use |
|---|---|
| Project/couple names | Project title, emails, documents, Project Room |
| Primary contact | Access, communication, billing |
| Secondary contact, optional | Partner, parent, planner |
| Photography type | Workflow, templates, gallery defaults |
| First event date or TBD | Timeline and reminders |
| Venue/city or TBD | Project display, email merge fields, documents |
| Lead source | Reporting |
| Internal note | Photographer context |

## 22.3 Automatic Project Setup

Creating a Project creates or prepares:

- Project record;
- operational client relationship;
- empty project media area/folder;
- Project Room access record;
- default phase and milestones;
- next-action calculation;
- document area;
- email merge context;
- financial integration placeholder;
- activity timeline.

## 22.4 Multiple Events

A Project can contain engagement, mehndi, nikah, ceremony, reception, portrait session, or other Events.

Each supports:

- name/type;
- date/time or TBD;
- full-day state where useful;
- venue name;
- full address;
- map link;
- coordinator/contact;
- coverage notes;
- client-visible notes;
- internal notes.

# 23. Project Cockpit and Project Room

The largest pain point is remembering where each client is in the process.

The shared state must answer:

> **What is complete, what is pending, what is blocked, and what happens next?**

## 23.1 Phases

1. Lead
2. Booking
3. Preparation
4. Shoot
5. Post-production
6. Delivery
7. Closed

## 23.2 Milestones

- inquiry reviewed;
- consultation completed, if used;
- quote sent;
- quote approved;
- contract sent;
- contract signed;
- deposit invoice sent;
- deposit paid;
- booked;
- dates and venues confirmed;
- shoot completed;
- images in production;
- gallery ready;
- final balance paid;
- gallery released;
- downloads completed;
- gallery expired/archived;
- project closed.

A Project becomes Booked only when its configured booking requirements are complete, normally:

```text
Quote approved
+ Contract signed
+ Deposit paid
= Booked
```

## 23.3 Status Presentation

- green: complete;
- amber: waiting/pending;
- blue: in progress;
- red: blocked/overdue/action required;
- grey: upcoming.

Color must always be paired with text and icons.

## 23.4 Photographer View

Shows:

- contacts;
- venues and maps;
- internal notes;
- phases, milestones, and next action;
- email/activity timeline;
- quote, contract, invoice, payment, and receipt references;
- galleries and access rules;
- manual overrides;
- integration failures.

## 23.5 Client Project Room

PicPeak's Project is currently an admin-oriented grouping concept. Earth & Honey must create a client-safe Project Room.

The client sees:

- project/couple name;
- confirmed dates and venue addresses;
- quote status;
- contract status and signed document;
- invoices, payments, receipts, and balance;
- image-production status;
- galleries and access state;
- one clear next action.

Example:

```text
Amin & Daisy

Event details           Confirmed
Quote                   Approved
Contract                Signed
Deposit                 Paid
Remaining balance       $1,400
Images                   Being prepared
```

When images are ready but payment is pending:

```text
Images                   Ready
Remaining balance       $1,400

[ Pay Balance ]
```

After verified payment:

```text
Images                   Available

[ View Gallery ]   [ Download Images ]
```

This is the only portal the client ever sees. There is no second financial portal.

# 24. Booking Ceremony

The booking stage is a sales and confidence-building experience, not only paperwork.

The Backstage action is:

> **Prepare Booking Packet**

The photographer:

1. confirms Project and event details;
2. selects package, services, deposit, and optional upgrades;
3. reviews the quote;
4. reviews the email;
5. optionally attaches a manually designed visual PDF;
6. includes the contract/signature path;
7. previews the client experience;
8. deliberately clicks Send.

The visual PDF may contain:

- exceptional portfolio work;
- behind-the-scenes photographs;
- studio approach and experience;
- package explanation;
- engagement session, extra coverage, albums, prints, or other upgrades.

V1 does not need an automatic proposal-PDF generator. It must support a polished manually created attachment.

# 25. The Ledger: Headless Invoice Ninja

## 25.1 The Ledger Rule

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
> card, and its own payment gateway stays disconnected.
>
> **Grey-zone tiebreak:** ask *"is this a record or an experience?"* Records go to the ledger;
> experiences are ours. Cost may decide **how** we implement something — never **where the truth
> lives**.

`PicPeak Project is the operational source of truth. The ledger is the financial record of truth. Stripe moves the money. Every surface is ours.`

Do not independently calculate authoritative invoice numbers, taxes, balances, receipts, credits, or payment state in Payload or PicPeak. Our stored balances and statuses are **display-only caches**: Backstage shows what the ledger last said; it never performs authoritative financial arithmetic.

## 25.2 Why Headless

The reason for keeping Invoice Ninja is **architectural declutter**, not the acquisition of bookkeeping features. Running it with its own portal enabled would give the client two logins, two brands, two senders, a duplicate client record, and two systems that both claim to know the payment status. Running it headless removes all of that while ensuring we never author invoice numbering, tax presentation, or credit-note semantics ourselves.

## 25.3 Tax Is Invisible

Tax must never appear as a decision anywhere in the product.

The client sees a name, a description, an amount due, a Pay button, and afterwards a receipt PDF. There is **no tax breakdown UI, no rate picker, no registration-number field, no tax settings screen, and no tax story in the backlog.** If a tax line appears on a generated document, it is because Invoice Ninja was configured once, in its own admin, by the studio owner or their accountant. That configuration is not product surface and is not a deliverable.

## 25.4 Headless Guards

Each of these is a testable acceptance criterion, because these are the constraints that silently un-decide themselves:

- Invoice Ninja's **client portal is disabled**, and no Invoice Ninja URL is ever surfaced to a client.
- Invoice Ninja's **Stripe gateway is not connected** — otherwise there are two payment paths and two Pay buttons.
- No client-facing surface links to, redirects to, or embeds Invoice Ninja.
- Every authoritative financial value shown to a human is a cached ledger value, not a locally computed one.

## 25.5 Email — Pragmatic Default

The **default** is that PicPeak's email queue owns all client-facing email, financial included, so there is one sender identity, one brand, and one place the photographer edits templates.

This is a default for coherence, **not an inviolable constraint.** Where Invoice Ninja's own mail clearly saves meaningful implementation or configuration work, it may be used — subject to Product Owner sign-off and a recorded entry in `SYSTEM_OWNERSHIP.md`.

The hard rule is only this: **exactly one system sends any given email type.** Duplicate reminders are a defect.

## 25.6 Normal Backstage Billing Surface

Backstage exposes the studio workflow, rendered by us:

- create/select the ledger client record;
- create/review quote;
- choose line items, package, deposit, and upgrades;
- attach PDF;
- send quote;
- record quote approval;
- create deposit, final, add-on, or scheduled-installment invoices;
- send invoice;
- see partial/full payment;
- see balance;
- open/download invoice PDF;
- open/download receipt;
- resend payment link;
- see reminder status;
- issue credit/refund where permitted.

An **Advanced Billing** escape hatch may open Invoice Ninja directly **for the photographer only**, for rare accounting configuration. It is never exposed to a client.

## 25.7 Payment Schedules and Installments

A Project may have a **payment schedule**: a set of dated amounts, each producing a real invoice in the ledger, each with reminders and a Pay button the client clicks.

**V1 ships the schedule with manual payment per installment. Automatic recurring card charges are deferred to V1.1** and must then be built on the same schedule so nothing is rebuilt.

Deferred because auto-charge pulls in saved payment methods (SetupIntent), off-session SCA/3DS failure-and-recovery, and dunning/retry logic — none of which exists in the `techno` reference implementation, and all of which is high-consequence code.

When automation does arrive: **the ledger owns the schedule and the invoice records; Stripe owns only the charge.** Stripe Subscriptions must not be used, as that would place an authoritative billing schedule outside the ledger.

## 25.8 Integration Adapter

Create one server-side ledger adapter/service. Do not scatter API calls through UI components.

Add a PicPeak-side integration mapping through new migrations, for example:

- project ID;
- ledger client ID;
- quote IDs;
- invoice IDs;
- payment/receipt references;
- named payment milestone;
- status cache;
- balance cache;
- payment URL;
- last sync time;
- sync/error state.

Caches are for display only; the ledger remains authoritative.

## 25.9 Extending Ledger Usage

Invoice Ninja may be used opportunistically wherever it produces a record we would otherwise have to author. Any use beyond the ownership rows in §10 requires a one-line addition to `SYSTEM_OWNERSHIP.md` naming the owner and stating what our side may cache.

Nothing may be adopted if it makes Invoice Ninja visible to a client or duplicates a record we already own.

## 25.10 Required Reliability

- server-side API token;
- HTTPS only;
- verified webhooks;
- idempotent event handling;
- retries and failure log;
- scheduled reconciliation;
- no direct writes to the ledger's database;
- clear audit trail covering every financial mutation and every gallery unlock.

# 26. Stripe Integration — Mandatory Local Reference

The Product Owner and payment agent must inspect:

```text
/Users/asim/NoIcloud/techno
```

The Stripe implementation in that project is the mandated starting point.

## 26.1 Porting Rule

Copy the Stripe implementation from `techno` **verbatim wherever technically compatible**. Preserve its file organization, route structure, server/client boundary, webhook handling, state transitions, environment-variable pattern, tests, and error handling. Do not rewrite proven code merely to make it look more native to this repository. Adapt only the minimum interfaces required to connect it to the Earth & Honey Project workflow and the headless ledger. The port target is the PicPeak fork backend, where invoice status lives.

This V1 Stripe integration exists so **Earth & Honey can charge its photography clients**. It is not LumaForge subscription billing.

Copy, including where applicable:

- server-side checkout/payment creation;
- route structure;
- webhook verification;
- idempotency handling;
- success/cancel return behavior;
- environment-variable pattern;
- client status handling;
- tests and error handling.

Do not copy:

- secret keys;
- live customer data;
- hard-coded product/customer identifiers that belong to the other project;
- unrelated business logic.

## 26.2 Required Port Report

Create `STRIPE_PORT_REPORT.md` containing:

- files inspected;
- files copied;
- behavior preserved;
- environment variables required;
- deliberate divergences and reasons;
- how verified Stripe events update the ledger and the PicPeak Project;
- confirmation that the ledger gateway is disconnected and only one webhook endpoint exists;
- confirmation that there is one payment path and no duplicate financial ledger.

## 26.3 Payment Architecture — Settled

This was formerly an open decision. It is now settled:

> **The ported direct Stripe flow initiates payment. The verified webhook then records the payment
> in the ledger and advances the Project milestone.** Invoice Ninja's own Stripe gateway stays
> disconnected.

There is exactly **one** Stripe webhook endpoint, and it lives where invoice status lives — the PicPeak fork's backend. Because the reference implementation is Flask/Python and the fork is a JavaScript codebase, the port crosses a language boundary and must be recorded in `FORK_CHANGELOG.md` as a deliberate deviation.

The reference implementation is a **one-shot checkout flow**. It contains no saved-card, off-session, or retry logic, so none of that is covered by "port verbatim" — see §25.7 for the V1/V1.1 split.

The final system must not expose two competing Pay buttons or create duplicate payment records. The Product Owner must prove the chosen path with an end-to-end payment, webhook, receipt, Project status update, and gallery-unlock test.

# 27. Project Billing and Gallery Gates

Invoices are linked to Projects.

A Project can have:

- deposit invoice;
- final invoice;
- scheduled installment invoices;
- album invoice;
- print invoice;
- extra-hours invoice;
- other add-on invoice.

A gallery must not simply ask whether the whole Project balance is zero. A later album invoice must not relock a wedding gallery already released.

Each private gallery supports:

- viewing gate: none, manual, deposit paid, named invoice paid, or final-payment milestone paid;
- download gate: none, manual, deposit paid, named invoice paid, or final-payment milestone paid.

Unlock only after a verified financial event or reconciliation. A browser redirect is not proof of payment.

## 27.1 V1 Scope — Standard Case Only

V1 implements the **standard, run-of-the-mill flow and nothing more**:

```text
Gallery ready
→ notification email sent to the client
→ Project Room updates
→ client cannot unlock until the gated milestone is paid
→ client pays
→ verified webhook
→ invoice and receipt recorded in the ledger
→ Project Room updates
→ gallery unlocks
```

Everything on that path must be fully functional.

**Out of scope for V1:** bespoke revocation, relocking, or default-recovery behaviour after a gallery has already been released. This is deliberately left unspecified rather than designed. If it arises operationally it is handled as a human business matter, not as a system feature. No agent may introduce a revocation rule as a requirement.

# 28. Email System and Reminder Matrix

The photographer receives far more control over emails than over website layout.

## 28.1 Ownership

| Stage | Owning system | Default |
|---|---|---|
| Inquiry acknowledgement | Payload/Frontstage | Optional automatic |
| Personal inquiry response | Backstage | Review and click Send |
| Project/date/venue communication | Backstage/PicPeak email system | Manual or scheduled |
| Booking packet and quote | Backstage/PicPeak email system | Review and click Send |
| Quote reminder | Backstage/PicPeak email system | Optional automatic |
| Contract/signature reminder | Backstage/PicPeak email system | Configurable |
| Deposit/final/installment/add-on invoice | Backstage/PicPeak email system | Initial send deliberate |
| Payment reminders | Backstage/PicPeak email system | Automatic after enabling |
| Receipt | Backstage/PicPeak email system | Automatic; PDF comes from the ledger |
| Gallery ready | Backstage/PicPeak | Review and click Send |
| Gallery expiry | Backstage/PicPeak | Automatic |
| Review request | Backstage/PicPeak | Scheduled but editable |

One system owns each email type. Duplicate reminders are a defect.

**Pragmatic default, not a rigid rule (§25.5).** The Backstage queue owns client-facing mail by default so there is one sender identity, one brand, and one template editor. Where the ledger's own mail clearly saves meaningful implementation or configuration work, a row above may be reassigned to it — subject to Product Owner sign-off and a recorded entry in `SYSTEM_OWNERSHIP.md`. What may never change is that exactly one system owns each row.

## 28.2 Photographer Controls

- editable global templates;
- Project-level edits;
- HTML and plain-text output;
- merge fields for names, dates, venues, addresses, balances, links, and expiry;
- recipient/CC/BCC;
- attachments;
- preview;
- test email;
- send now/schedule;
- visible history and delivery state;
- pause/cancel automation per Project.

## 28.3 Initial Reminder Defaults

All defaults are editable:

- quote: 3 and 7 days after send;
- deposit: 3 days before, due date, 3 days overdue;
- final balance: 14 days before, 3 days before, due date;
- gallery expiry: 7 days and 1 day before;
- review request: configurable delay after successful delivery.

Automations stop when their milestone is complete.

# 29. Contracts and PDFs

**Settled 2026-07-30, conditional on verification.** V1 uses PicPeak's own native contract-signing
capability inside the Project Room — not an external e-sign vendor, and not a manual-PDF-upload
fallback. This is the "fork, don't rebuild" principle applied to contracts the same way it already
applies to galleries: if the fork already does this, we use it, and we do not stand up a second
signing system beside it. It remains **conditional**: US-15/US-17 must verify against the actual
pinned commit that this capability genuinely exists before any Project Room story depends on it. If
it does not exist as assumed, this decision reopens — do not silently substitute a workaround.

V1 contract requirements, assuming verification passes:

- typed name, consent checkbox, and drawn signature captured at signing time;
- signer IP address and timestamp recorded;
- the contract contents are frozen (a snapshot) at the moment of signature — no editing after signing;
- a SHA-256 integrity hash of the signed contract, and an audit page describing the signing event, included in the delivered PDF;
- **hardening required beyond whatever PicPeak ships by default:** one-time signing links (not a reusable/guessable URL), mandatory email verification of the signer before a signature is accepted, the signed PDF emailed to both the photographer and the client, immutable/versioned storage of the signed document in R2, and a visible signer/contract-version/timestamp audit history in the Project Room;
- Project-linked document status (sent/signed), visible to photographer and client;
- final signed PDF stored in the Project documents area/R2.

No external e-sign vendor (Adobe Sign, DocuSign, Dropbox Sign, SignWell) and no manual mark-signed
upload fallback are carried into V1 — see `po-requests.md` item 7 for the research behind this and
the fallback path if verification fails. Contract wording should still get a one-time review by an
Ontario lawyer; this PRD is not legal advice.

Do not build a legal signature engine from scratch — this section describes hardening an existing
capability, not building one.

PDF requirements:

- invoices, credit notes, and receipts are generated by the ledger and surfaced through our UI — the client never visits the ledger to obtain one;
- visual sales PDF is manually prepared and attached in V1;
- all PDFs displayed in Project Room must have clear type, date, amount, state, and download access;
- stored delivered documents must remain immutable records of what the client received.

# 30. Private Gallery Delivery and Retention

Private galleries support:

- draft;
- ready;
- sent;
- viewed;
- download-enabled;
- expired;
- archived;
- purged according to policy.

Security requirements:

- noindex;
- no sitemap inclusion;
- revocable access;
- optional password;
- expiring access;
- server-side authorization;
- signed or authorized file delivery;
- view/download logging;
- payment gates;
- expiry reminders.

Earth & Honey is not a permanent photo-hosting service. The client receives a defined delivery window. Archive and purge behavior must be explicit and must not destroy images still referenced by public galleries.

# 31. Deployment and Operations

## 31.1 VPS

Use the project's dedicated VPS.

Preferred deployment:

- Docker Compose;
- one reverse proxy such as Caddy or Nginx;
- PicPeak frontend/backend and required worker/Redis components;
- Next.js/Payload application;
- PostgreSQL;
- the headless Invoice Ninja ledger, running in this project's own `docker-compose.yml` on this project's own VPS, with its client portal disabled and its payment gateway disconnected;
- monitoring and backups.

Do not introduce Kubernetes.

## 31.2 Database Topology

Use one PostgreSQL server with separate logical databases and credentials for PicPeak, Payload, and the ledger. Do not allow one system's migration framework to manage another system's tables.

No cross-database joins in application code. Use APIs and mapping IDs.

## 31.3 Capacity Check

Before launch, test:

- large image batches;
- Sharp/libvips memory behavior;
- worker concurrency;
- ZIP generation;
- simultaneous gallery visitors;
- R2 bandwidth path;
- backup duration.

Tune worker concurrency to the actual VPS rather than assuming defaults.

## 31.4 Backups and Monitoring

- daily PostgreSQL backups;
- tested restore procedure;
- R2 lifecycle/versioning appropriate to accidental deletion risk;
- VPS snapshots;
- job and webhook failure visibility;
- email failure visibility;
- health checks;
- deployment rollback;
- staging or protected preview before production changes.

# 32. Security and Privacy

- preserve PicPeak authentication and authorization unless a tested replacement is necessary;
- role-based Backstage access;
- client-safe Project Room authorization;
- hashed passwords and tokens;
- least-privilege R2 credentials;
- verified PicPeak (including its native contract-signing events), Invoice Ninja, and Stripe webhooks;
- rate limits on login, forms, magic links, and downloads;
- secrets only in protected runtime/CI configuration;
- SPF, DKIM, and DMARC before production email;
- audit logs for sends, payments, gallery unlocks, and destructive actions;
- no private image/client data in public analytics.

# 33. Environment and Secrets

The Product Owner must audit the current environment rather than replacing it blindly.

At minimum, document and securely configure:

```text
# Frontstage / Payload
PAYLOAD_DATABASE_URL
PAYLOAD_SECRET
AUTH_SECRET
NEXT_PUBLIC_SITE_URL
BACKSTAGE_URL
PROJECT_ROOM_URL

# PicPeak
PICPEAK_DATABASE_URL
PICPEAK_JWT_SECRET
PICPEAK_REDIS_URL
PICPEAK_API_TOKEN
PICPEAK_WEBHOOK_SECRET

# R2 / S3 compatible storage
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_ENDPOINT
R2_PUBLIC_BASE_URL (only if applicable)

# Invoice Ninja — headless ledger, internal network only
INVOICE_NINJA_BASE_URL
INVOICE_NINJA_API_TOKEN
INVOICE_NINJA_WEBHOOK_SECRET

# Stripe — based on the techno port
STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

# Email
SMTP_SERVER
SMTP_PORT
SMTP_USERNAME
SMTP_PASSWORD
EMAIL_USE_SSL
SENDER_EMAIL
SUPPORT_EMAIL

# Deployment
VPS_HOST
VPS_USER
SSH_PRIVATE_KEY
```

Business name, public email, address, site description, logo, and SEO data belong in `StudioProfile`, not in GitHub secrets.

# 34. Product Owner Pivot Plan

The Product Owner must not send all agents directly into implementation. Execute the pivot in controlled phases.

## Phase 0 — Freeze and Audit

Deliver:

- current-code inventory;
- working-feature inventory;
- duplicate-feature inventory;
- PicPeak feature map;
- keep/replace/retire recommendation;
- dependency and license audit;
- VPS/R2 readiness report;
- `techno` Stripe audit;
- major data migration risks.

Exit criterion: approved pivot map.

## Phase 1 — Fork PicPeak and Prove the Foundation

- fork at pinned commit;
- preserve MIT notices;
- boot production-like Docker environment;
- use PostgreSQL;
- connect existing R2 credentials;
- create Project, customer, and Gallery;
- upload/process images;
- test password, expiry, client access, download, email, CSS templates, and webhooks;
- verify fresh and upgrade migrations.

Exit criterion: a working PicPeak-derived gallery/project flow on staging.

## Phase 2 — Establish Ownership Boundaries

- disable duplicate PicPeak CMS/CRM surfaces;
- define Payload ↔ PicPeak API contract;
- add cross-system mapping fields/tables;
- convert Payload Inquiry into PicPeak Client/Project;
- reference a PicPeak Gallery from a Payload page;
- use PicPeak webhook to revalidate Frontstage content.

Exit criterion: no duplicate media upload and no unclear source of truth.

## Phase 3 — Project Cockpit and Project Room

- extend PicPeak Project through new migrations;
- add events, venues, milestones, next action, documents, and integration status;
- create photographer Project cockpit;
- create client-safe Project Room;
- show green/pending/blocked states.

Exit criterion: photographer and client can see the same authoritative workflow state.

## Phase 4 — Frontstage Publishing

- lock design tokens;
- implement homepage, Weddings, Engagements, Details;
- implement deterministic New Page, Story, and Form flows;
- implement SEO Assistant;
- connect gallery placements;
- implement global lead form.

Exit criterion: new content inherits design quality without manual layout work.

## Phase 5 — Gallery Performance and Darkroom

- preserve and refine PicPeak upload/processing logic;
- copy CSS templates verbatim;
- implement Earth & Honey slideshow, masonry, and fullscreen specifications;
- resolve reusable media model;
- benchmark delivery adapter paths;
- implement alt-text suggestion workflow.

Exit criterion: gallery is sharp, fast, secure, and manageable at realistic scale.

## Phase 6 — Headless Ledger and Stripe

- run the narrowed ledger spike: confirm the Invoice Ninja API covers invoice, credit-note, receipt, and payment-schedule creation cleanly **with the portal disabled and the gateway disconnected**;
- stand up the headless ledger in `docker-compose.yml` on the project VPS;
- port the `techno` Stripe implementation into the fork backend, with one webhook endpoint;
- build the Project-to-ledger identifier mapping via new migrations;
- implement the quote/booking packet in the Project Room;
- implement invoices, payments, receipts, reminders, and the manual-pay installment schedule;
- implement payment-gated gallery access for the standard case (§27.1).

Exit criterion: verified payment changes Project and gallery access exactly once.

## Phase 7 — Email, Contract, and Delivery Workflow

- implement email ownership matrix;
- template editor and Project overrides;
- contract-signing hardening on top of PicPeak's native capability (one-time links, email verification, dual-party PDF delivery, immutable R2 storage);
- gallery-ready, expiry, and review flows;
- retention/archive/purge workflow.

Exit criterion: complete inquiry-to-delivery communication path with no duplicate sends.

## Phase 8 — Hardening and Launch

- performance testing;
- accessibility audit;
- security review;
- backup/restore test;
- mobile QA;
- email deliverability;
- webhook failure testing;
- launch and rollback plan.

# 35. V1 Acceptance Criteria

## 35.1 Architecture

- PicPeak is forked at a pinned commit with MIT notices retained.
- Existing PicPeak migrations are unchanged; custom changes use new migrations.
- Payload, PicPeak, the headless ledger, Stripe, and R2 have documented ownership per The Ledger Rule.
- No duplicate financial ledger.
- The ledger is headless: portal disabled, gateway disconnected, no client-facing link to it.
- No duplicate upload of an original unless explicitly required and documented.

## 35.2 Frontstage

- Homepage, Weddings, Engagements, and Details are responsive and visually consistent.
- New Pages and Stories inherit the design system automatically.
- No drag-and-drop page builder exists.
- Forms persist inquiries and send notifications.
- SEO fields are injected into real HTML, metadata, sitemap, and schema.
- Early Booking Benefits remains subtle, not a discount banner.

## 35.3 Galleries

- New Gallery supports Portfolio and Client Delivery paths.
- PicPeak passwords, expiry, drafts, client access, feedback, and downloads work.
- Masonry preserves aspect ratio and selected order without cropping.
- Slideshow and fullscreen are sharp, fast, and mobile-ready.
- Public and private assets use appropriate delivery and access rules.
- Gallery can exist without a public page.

## 35.4 Projects

- Inquiry conversion and manual Project creation both work.
- Project exists before images.
- Project supports multiple events, venues, invoices, and galleries.
- Project cockpit computes and displays the next action.
- Project Room shows client-safe dates, venues, documents, payment state, image state, and galleries.
- Complete/pending/blocked states are clear without relying only on color.

## 35.5 Finance and Payment

- The headless ledger creates the authoritative invoice, tax, numbering, payment record, credit note, and receipt; nothing authoritative is computed locally.
- The ledger's client portal is disabled and no client-facing surface links to it.
- The ledger's payment gateway is disconnected; exactly one Stripe webhook endpoint exists.
- Quotes, invoices, balances, and receipts are presented entirely by our own surfaces.
- No tax breakdown UI, rate picker, registration-number field, or tax settings screen exists.
- Initial sends require photographer action.
- Reminders are visible, configurable, and stop after completion, and no email type has two senders.
- A Project may carry a payment schedule whose installments are paid manually; **no automatic recurring card charge exists in V1**.
- `techno` Stripe behavior is ported and documented; key-mode pairing is validated at start-up.
- One payment path exists.
- Verified payment unlocks only the configured gallery milestone.
- Later add-on invoices do not relock an already released gallery.
- The standard flow of §27.1 works end to end: gallery ready → notification → locked → paid → recorded → unlocked.

## 35.6 Operations

- Existing R2 credentials work without exposure.
- Backup and restore are tested.
- Large upload batches do not crash the VPS under configured limits.
- Webhook failures are visible and retryable.
- Deployment has rollback.

# 36. Explicit V1 Non-Goals

- LumaForge public marketing site;
- photographer SaaS self-signup;
- LumaForge subscription billing or photographer-plan checkout;
- automated tenant/domain provisioning;
- shared multi-tenant database conversion;
- drag-and-drop page design;
- photo retouching or editing;
- generic e-commerce cart/catalog;
- permanent client hosting;
- automatic visual proposal-PDF generation;
- mass-generated location pages;
- PicPeak native accounting as the financial authority;
- rebuilding PicPeak's mature gallery logic in Payload;
- rebuilding Invoice Ninja's accounting logic;
- building a signature platform from scratch;
- **any client-facing Invoice Ninja surface** — its portal, its client login, or a link to it;
- **a tax, GST/HST, or bookkeeping feature surface** in the product;
- **automatic recurring card charges** — saved payment methods, off-session SCA/3DS recovery, and dunning/retry are deferred to V1.1;
- **bespoke revocation or relocking of an already-released gallery** (§27.1).

# 37. Product Success Measures

Initial measures should include:

- inquiry conversion rate by page/source;
- time to create a Project;
- time to create and publish a Gallery;
- upload/processing failure rate;
- Frontstage page performance;
- Project milestone completion visibility;
- quote approval and deposit completion time;
- overdue-payment reminder effectiveness;
- percentage of galleries delivered without manual payment chasing;
- client gallery view/download completion;
- support issues per Project.

# 38. Required Product Owner Deliverables

Before full implementation resumes, the Product Owner must deliver:

1. `PIVOT_AUDIT.md`
2. `SYSTEM_OWNERSHIP.md`
3. `PICPEAK_UPSTREAM.md`
4. `PICPEAK_PORT_LEDGER.md`
5. `FORK_CHANGELOG.md`
6. `R2_STORAGE_AND_DELIVERY_ADR.md`
7. `MEDIA_REUSE_ADR.md`
8. `PAYLOAD_PICPEAK_API_CONTRACT.md`
9. `INVOICE_NINJA_INTEGRATION.md` — written around The Ledger Rule (§25.1)
10. `STRIPE_PORT_REPORT.md`
11. `VPS_DEPLOYMENT.md`
12. `V2_TENANCY_ADR.md`

# 39. Final Product Statement

> **Earth & Honey Studios V1 is a photography-first studio operating system: a premium Frontstage, a deterministic publishing engine, a digital darkroom, a Project cockpit, a client Project Room, and a payment-aware gallery delivery system.**

> **LumaForge V2 will commercialize the reusable system only after Earth & Honey proves the workflow in real production use.**

The product wins through simplicity:

- fewer tools exposed to the photographer;
- fewer design decisions required;
- fewer repeated data entries;
- fewer forgotten client steps;
- fewer payment-chasing conversations;
- faster, sharper images;
- more polished client experiences.

# 40. Implementation References

The Product Owner should verify current upstream behavior before each integration milestone.

- PicPeak repository: `https://github.com/PicPeak/picpeak`
- PicPeak creating events: `https://docs.picpeak.app/guides/creating-events`
- PicPeak API: `https://docs.picpeak.app/api`
- PicPeak CRM beta overview: `https://docs.picpeak.app/features/crm`
- PicPeak MIT license: `https://github.com/PicPeak/picpeak/blob/main/LICENSE`
- Invoice Ninja API: `https://invoiceninja.github.io/docs/api-reference/invoice-ninja-api-reference`
- Invoice Ninja payment gateways (reference only — **we leave these disconnected**): `https://invoiceninja.github.io/docs/user-guide/gateways`
- Invoice Ninja client portal (reference only — **we disable it**): `https://invoiceninja.github.io/docs/user-guide/client-portal`
- Payload hooks: `https://payloadcms.com/docs/hooks/overview`
- Payload REST API: `https://payloadcms.com/docs/rest-api/overview`
- Cloudflare R2 presigned URLs: `https://developers.cloudflare.com/r2/api/s3/presigned-urls/`
- Cloudflare R2 browser CORS: `https://developers.cloudflare.com/r2/buckets/cors/`
