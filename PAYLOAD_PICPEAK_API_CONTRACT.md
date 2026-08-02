<!--
---
file: PAYLOAD_PICPEAK_API_CONTRACT.md
project: earthandhoney
purpose: AC-18.2 — specify the boundary between the Frontstage application
         and the Backstage: which direction each call travels, what each
         call is for, how it authenticates, what identifiers cross the
         boundary, what happens on failure or timeout, and what the
         Frontstage is allowed to cache and for how long.
         AC-18.3 — state that the Frontstage never reads the Backstage
         database directly, that no cross-database join exists anywhere
         in application code, and that cross-system relationships are
         expressed as stored external identifiers.
         AC-18.5 — record which Backstage surfaces are to be disabled
         because they duplicate this project's chosen architecture (its
         public landing-page content management, its native
         quote/invoice/accounting screens, and any page-building
         capability), and how each will be disabled or hidden.
         AC-18.6 — record a user-facing terminology mapping so internal
         names and the language the photographer sees never drift apart:
         PicPeak's own internal "Event" object is presented to users as
         Gallery, distinct from this project's own controlled-vocabulary
         Event (a dated occasion inside a Project); the customer account
         is Client, the admin area is Backstage, and the customer portal
         is the Project Room.
created-by: dev-team
related-story: US-18
related-ac: 18.2, 18.3, 18.4, 18.5, 18.6
---
-->

# Payload ↔ PicPeak API Contract

## Scope of this document

**Frontstage** and **Backstage** are the terms [[SYSTEM_OWNERSHIP.md]]
already uses for the two sides of this boundary: Frontstage is this
repository's Next.js/Payload application (the public site, the CMS, and —
once built — the Project Room); Backstage is the vendored PicPeak fork
(`vendor/picpeak/`, pinned per `PICPEAK_UPSTREAM.md`), which
`SYSTEM_OWNERSHIP.md`'s ownership table already names as the single
authoritative system for gallery & media data and for storage.

This document is being built across `US-18`'s ACs, each adding one
required piece; `AC-18.2` added the general **call catalog** below —
every call that AC's evidence found crossing the boundary, with its
direction, purpose, auth, identifiers, failure/timeout behavior, and
Frontstage cache allowance. `AC-18.3` added the no-cross-database-join
rule ("No cross-database access", below). `AC-18.4` adds "The three flows
the next sprint depends on", walking the call-catalog rows into concrete
end-to-end sequences and closing the row-4 gap with a named design
decision. `AC-18.5` adds "Backstage surfaces to disable", recording which
duplicated Backstage capabilities are turned off and how. `AC-18.6` adds
"User-facing terminology mapping", recording the internal-name-to-
user-facing-word pairing this document and every future story must keep
in sync.

All evidence below is either a direct read of the pinned fork's source
(`vendor/picpeak/backend/...`) or a live-verified finding already recorded
in `PIVOT_AUDIT.md` (`US-17`). Nothing in this document was inferred
without a citation to one of the two.

## Call catalog

| # | Direction | Call | What it's for | Auth | Identifiers crossing the boundary | On failure / timeout | Frontstage may cache |
|---|---|---|---|---|---|---|---|
| 1 | Frontstage → Backstage | `GET /api/gallery/:slug/info` | Fetch a gallery's display metadata (title, theme, password-required flag, expiry, downloads/upload toggles) so a Frontstage page can render around it before/without fetching photos. | None required for a published, non-archived gallery — this route has no auth middleware. An optional `?token=` query param is checked against the gallery's `share_token` only when the caller supplies one. | Backstage gallery `slug` (path param); optional `share_token` (query param). | `404` for "not found" *and* for archived/still-draft galleries — Frontstage must treat all three as "not available," not as a transient error. A `301` body (`{redirect:true,newSlug}`) means the slug was renamed — Frontstage must follow it, not retry the old slug. Network error/5xx/timeout: serve the last cached copy if one exists; if none exists, render a "temporarily unavailable" state — never fabricate gallery metadata. | The metadata fields returned (title, theme, requires_password, expiry, toggles) — display only, per row 5's TTL rule below. |
| 2 | Frontstage → Backstage | `POST /api/auth/gallery/verify` (password handshake) → `GET /api/gallery/:slug/photos` (photo list) | Retrieve the actual photo list the Gallery Engine renders. | A gallery with `require_password: false` needs no token — `photos` returns directly. A password-protected gallery requires a gallery JWT (`issuer: 'picpeak-auth'`, carrying `eventId`), obtained by first calling `/api/auth/gallery/verify` with the slug + password and presenting the returned token (cookie or bearer) on the `photos` call. | `slug`; gallery JWT (opaque to Frontstage — it must not decode/trust claims beyond passing the token back); numeric `photo` ids in the response. | `401` "No token provided"/invalid password: Frontstage must re-run the verify handshake (or prompt the visitor for the gallery password again) — it must never surface a raw 401 to the visitor as if the gallery were broken. `404` "Gallery not found or expired": same "not available" treatment as row 1. Timeout/5xx: serve last-known-good cached photo list if one exists and is within its TTL; otherwise show a loading/unavailable state, never an empty gallery presented as "no photos." | Rendered photo URLs, thumbnails, and item count — display only (`SYSTEM_OWNERSHIP.md`'s existing language), same TTL rule as row 5. The gallery JWT itself must **not** be cached/persisted beyond the session that obtained it. |
| 3 | Frontstage → Backstage | `/api/v1/events` family: `POST /api/v1/events` (create), `GET /api/v1/events` (list), `GET /api/v1/events/:id` (get), `POST /api/v1/events/:id/photos` (upload), `GET /api/v1/events/:id/share-link` (share URL) | The fork's own sanctioned server-to-server automation surface (added for an n8n use case, `vendor/picpeak/backend/src/routes/v1/events.js:1-11`) — the only Backstage route family designed to be called by another *service*, not a logged-in human. | Bearer API token (`Authorization: Bearer pp_live_...`), minted via `POST /api/admin/api-tokens` (admin-cookie-authenticated, one-time plaintext) and scoped `read`/`write`/`admin` (`admin` implies `write`; `write` implies `read`). Each route requires a specific scope: create is `admin`, upload is `write`, list/get/share-link are `read`. | Backstage event `id`/`slug`; the API token itself (opaque secret, not a per-request identifier); `share_token`. | `401` with a `code` (`NO_TOKEN`/`INVALID_TOKEN`/`TOKEN_REVOKED`/`TOKEN_EXPIRED`): Frontstage's server-side integration must alert/log this as an operational failure, not retry the same token — a revoked/expired token needs a human to mint a new one via the admin UI. `403 INSUFFICIENT_SCOPE`: a code defect (wrong scope requested), not a runtime condition to handle gracefully. `404`/`400`/`500`: standard per-call handling; no implicit retry is safe for the `write`-scope create/upload calls (they are not idempotent) without a caller-generated idempotency key, which this route family does not currently accept. | Nothing beyond what rows 1/2 already allow for the resulting gallery's display data — this family's own responses (ids, share URLs) are configuration, not content to cache. |
| 4 | Frontstage → Backstage (**gap** — no server-to-server path exists yet) | `POST /api/admin/customers` (create Client), `POST /api/admin/projects` (create Project) | These are the only Backstage routes that create the records a Frontstage inquiry-to-client flow would need. | **Admin session cookie only** (`adminAuth`, JWT `admin_token`, `expiresIn: '24h'`) — both routes destructure only `adminAuth`, not `apiTokenAuth` (`vendor/picpeak/backend/src/routes/adminCustomers.js:11`, `adminProjects.js:11`; confirmed against the pinned fork, no `apiTokenAuth` import in either file). Unlike row 3, there is **no Bearer-token-authenticated path** into these two routes today. | Would-be: Client `customer_account` id, Project id — but see the gap note below. | N/A until a calling mechanism exists. | N/A until a calling mechanism exists. |
| 5 | Backstage → Frontstage | Outbound webhook delivery, one HTTP `POST` per event, to a Frontstage-hosted receiver URL registered in advance via `POST /api/admin/webhooks` (admin-cookie-gated, a one-time setup call, not a per-request one) | Push notification that a Backstage gallery changed, so Frontstage can trigger a content refresh instead of polling. Event-type catalog is fixed: `event.created`, `event.published`, `event.archived`, `event.expired`, `photo.uploaded`, `photo.deleted` (`vendor/picpeak/backend/src/services/webhookService.js:13-19`). | HMAC-SHA256 signature over the exact request body, computed with the webhook's own per-subscription secret (`whsec_...`, shown once at creation) and sent as the `X-PicPeak-Signature` header; Frontstage's receiver must recompute and compare it before trusting the payload — this is Backstage authenticating *to* Frontstage, the reverse of every other row (`vendor/picpeak/backend/src/services/webhookDeliveryWorker.js:15-16,124-131`). Also carries `X-PicPeak-Event` (event type) and `X-PicPeak-Delivery` (delivery id) headers. | Event `type` string; the changed gallery's Backstage `id`/`slug` (inside the JSON payload); the delivery id. | Backstage's own retry policy, not Frontstage's: `10`s send timeout, up to `5` attempts with backoff `1m → 5m → 30m → 2h → 12h`, then the delivery is marked `failed` and **not retried further** (`vendor/picpeak/backend/src/services/webhookDeliveryWorker.js:7-30`). Consequence for Frontstage: a webhook is a *hint*, not a guarantee — the receiver must return 2xx quickly, and Frontstage must not rely on webhooks alone for correctness (see the TTL rule below, which bounds the worst case). | See below — this is the row that sets the TTL for rows 1 and 2's cacheable fields. |

## What the Frontstage is allowed to cache, and for how long

Rendered gallery display data (rows 1–2 above: title, theme, toggles,
photo URLs/thumbnails, item counts) may be cached by the Frontstage for
display only, under the same **on-demand-revalidation-plus-bounded-safety-net**
pattern this codebase already established for gallery-bearing routes in
`US-6` (`src/app/(frontend)/dev/gallery-isr-demo/page.tsx:55`,
`export const revalidate = 60`) and its on-demand trigger
(`src/lib/galleryRevalidation.ts`, `US-6 AC-6.3`):

- **Immediate invalidation** on a verified, signature-checked webhook
  delivery for the affected gallery (row 5) — the same role Payload's
  `afterChange` hook played before the pivot, now filled by Backstage's
  push instead.
- **A bounded safety-net cap of 60 seconds** even with no webhook
  received — the same numeric value this codebase already committed to
  for gallery-bearing ISR routes, so a lost/failed webhook delivery
  (row 5's failure mode) cannot leave Frontstage showing stale content
  for longer than the pre-existing convention already tolerates.
- Nothing else may be cached longer than that 60-second bound, and
  nothing from row 4 (Client/Project data) is cacheable under this AC's
  evidence at all — no read route back from Backstage for that data was
  found, so there is nothing yet to cache.

## The row 4 gap, recorded rather than papered over

This AC's own evidence — a direct read of `adminCustomers.js` and
`adminProjects.js` — found that the only two routes capable of creating
those records require an interactive admin session cookie, not the
Bearer-token service-to-service mechanism the pinned fork otherwise
provides for exactly this kind of integration (row 3, `v1/events`). This
document records that gap here, with file-level evidence, rather than
assuming a calling mechanism that does not exist in the pinned fork.
`AC-18.4` below ("Flow B") is where that gap gets closed with a named
design decision, not invented silently on this section's behalf.

## The three flows the next sprint depends on (AC-18.4)

The call catalog above lists every individual call the pivot's evidence
found; this section walks three of those calls into the concrete
end-to-end sequences the next sprint's stories are written against. Each
flow names which call-catalog row(s) it uses, what crosses the boundary
in which direction, and how it fails.

### Flow A — a Frontstage page displays a public gallery by referencing its Backstage gallery identifier

1. A Frontstage content record (a Portfolio/Blog entry, or a Homepage
   gallery block) stores a **Backstage gallery `slug`** in a plain field —
   the stored external identifier `SYSTEM_OWNERSHIP.md` and the "No
   cross-database access" section above both require. The photographer
   sets this value from the Backstage admin UI when they publish a
   gallery there; nothing in Frontstage assigns or generates it.
2. At request/build/revalidation time, the Frontstage route calls **row
   1** (`GET /api/gallery/:slug/info`) for display metadata (title,
   theme, `requires_password`, toggles), then **row 2**
   (`/api/auth/gallery/verify` + `GET /api/gallery/:slug/photos`) for the
   photo list. Public portfolio/blog galleries are expected to carry
   `requires_password: false`, so the verify handshake is a no-op for
   this flow in practice — it still must be coded, because nothing in
   the contract lets Frontstage assume that in advance per-gallery.
3. The existing, reusable **Gallery Engine** (`US-1`…`US-6`) renders the
   returned photo URLs/thumbnails — this flow introduces no second
   gallery-rendering system, consistent with `CLAUDE.md`'s "one reusable
   engine" pillar.
4. Caching and failure behavior follow rows 1–2 and the "What the
   Frontstage is allowed to cache" section above without modification:
   the bounded 60-second safety net, immediate invalidation on a
   verified webhook (Flow C, below), and the 404/timeout handling
   already specified per row.
5. **What crosses the boundary:** outbound, only the `slug` (and an
   optional `share_token` for a non-public gallery reused in this same
   flow). Inbound, display data only — never a Backstage database row.

### Flow B — a Frontstage inquiry is converted into a Backstage client and project

This is where the row-4 gap above gets closed. No route capable of
service-to-service Client/Project creation exists in the pinned fork
today, so this section is a **design decision for the implementing
story**, not a description of code that already runs — that distinction
is deliberate and is not glossed over.

**Decision: extend the fork's own `v1` automation family (row 3), not
the admin-cookie routes.** Row 3 already establishes the pinned fork's
sanctioned pattern for exactly this kind of integration — Bearer API
token, `apiTokenAuth` + `requireApiScope`, `admin` scope for
record-creating calls. The lowest-risk close of the gap is two new
routes following that same pattern rather than reusing
`adminCustomers.js`/`adminProjects.js`'s cookie-based auth or inventing a
third auth mechanism:

- `POST /api/v1/customers` — same request/response shape as
  `adminCustomers.js`'s existing `POST /api/admin/customers` (an
  `email` plus an optional `prefill` object requiring at least one
  human-readable name field), mounted under `apiTokenAuth` +
  `requireApiScope('admin')` instead of `adminAuth`. Delegates to the
  same `customerAccountsService.createDirect()` the admin route already
  calls, so no new business logic is written — only a new authenticated
  entry point into logic that already exists and is already tested.
- `POST /api/v1/projects` — same shape as `adminProjects.js`'s
  `POST /api/admin/projects` (`name` + optional `customerAccountId`),
  same auth swap, same delegation to the existing `projectService.createProject()`.

Because these are **new** routes, not edits to an already-shipped
upstream migration or route, adding them is a Fork Discipline-compliant
deviation (`FORK_CHANGELOG.md` records it when the implementing story
actually writes the code — not here, since this AC's deliverable is the
contract, not the implementation).

**Flow steps:**

1. A visitor submits a Frontstage inquiry (the contact form —
   Name, Email or Phone, Photography Type, Preferred Date, Message,
   per `CLAUDE.md`'s Pillar 5). Frontstage stores it as a **Lead**, a
   Frontstage-owned record; nothing about a Lead is Backstage's concern
   yet.
2. When the photographer qualifies the Lead (a Frontstage-side action —
   this document does not assume auto-conversion), Frontstage calls the
   new `POST /api/v1/customers` with the Lead's `email` and a `prefill`
   built from its name/phone fields, and receives back a Backstage
   `customer_account.id`.
3. Frontstage then calls the new `POST /api/v1/projects` with a `name`
   (e.g. derived from the Lead's photography type/date) and that
   `customerAccountId`, and receives back a Backstage `project.id`.
4. Both ids are written onto the Frontstage Lead/Client record as
   **stored external identifiers** — never a foreign key into
   `backstage-db`, consistent with "No cross-database access" below.
5. **On failure or timeout:** neither call is idempotent (no
   caller-supplied idempotency key exists on this route family, the same
   limitation row 3 already states for the sibling `v1/events` routes).
   A failed conversion must surface to the photographer as a retry
   action, not an automatic silent retry — a blind retry against a
   create endpoint risks a duplicate customer/project pair. If step 2
   succeeds and step 3 fails, the Lead record must persist the
   `customer_account.id` it already has rather than discard it, so a
   retry only re-attempts the project-creation half.
6. **What crosses the boundary:** outbound, the Lead's identity fields
   (email, name, phone) and a project name — never a Backstage
   credential or admin session. Inbound, only the two integer ids.

### Flow C — a Backstage change triggers a Frontstage content refresh

1. A change happens in Backstage — the photographer publishes a gallery,
   or uploads/deletes a photo in one already published.
2. Backstage's webhook worker fires the matching event
   (`event.published`, `photo.uploaded`, `photo.deleted`, etc. — the
   fixed catalog row 5 already lists) as a signed `POST` to Frontstage's
   registered receiver URL, per row 5's auth (`X-PicPeak-Signature`
   HMAC-SHA256) and retry policy.
3. Frontstage's receiver (a route the implementing story adds; none
   exists yet) recomputes and verifies the signature before trusting
   the payload — row 5's rule, restated here because this is the flow
   that depends on it — then extracts the changed gallery's Backstage
   `id`/`slug` from the JSON body.
4. It maps that identifier to the Frontstage page(s) that reference it
   (Flow A, step 1's stored `slug` field) and calls the existing
   on-demand revalidation mechanism this codebase already built in
   `US-6` (`src/lib/galleryRevalidation.ts`,
   `getGalleryBearingPaths()`) — re-keyed by the implementing story from
   the Payload-gallery-title lookup it uses today to a Backstage
   `slug`/`id` lookup, since the source of truth it maps *from* has
   changed with the pivot, not its role.
5. The receiver returns `2xx` quickly (row 5's requirement) after
   queuing/performing the revalidation, not after Backstage's own work
   finishes.
6. **Bounded staleness even if the webhook is lost:** the same
   60-second safety-net cap "What the Frontstage is allowed to cache"
   already states means a dropped or permanently-failed delivery (row
   5's five-attempt-then-`failed` policy) cannot leave a public gallery
   page stale for longer than that pre-existing bound — this flow does
   not introduce a new staleness ceiling, it reuses the one already
   committed to.
7. **What crosses the boundary:** outbound (Backstage → Frontstage,
   the one reversed-direction row in the catalog), the event `type`,
   the changed gallery's `id`/`slug`, and the delivery id — never
   photo binary data or a database row.

## No cross-database access

The Frontstage **never reads the Backstage database directly**, and **no cross-database join exists anywhere in application code**. Every row in
the call catalog above crosses the boundary over HTTP — a REST call
(rows 1–4) or a webhook delivery (row 5) — never a database connection,
and every relationship between a Frontstage record and a Backstage
record is expressed as a **stored external identifier** (a Backstage
`slug`, event/gallery `id`, or `share_token`, captured in a Frontstage
field or cache entry — see `SYSTEM_OWNERSHIP.md`'s "display only"
language), not a foreign key a query could join across.

This is not merely a stated intention; it is a structural fact of this
project's infrastructure, verifiable independently of application code:

- **Two separate Postgres instances, not two databases on one server.**
  `docker-compose.yml` runs Frontstage's Payload backend against the
  `db` service and Backstage's PicPeak backend against a distinct
  `backstage-db` service, each with its own container, its own named
  volume (`pgdata` vs. `backstage_pgdata`), and its own credentials
  (`POSTGRES_*` vs. `BACKSTAGE_DB_*`). The compose file's own comment
  states the intent directly: *"A dedicated Postgres instance, kept
  separate from the `db` service above ..., so the two systems' schemas
  and lifecycles never collide."* Two separate server processes with no
  shared network path a query could traverse make a cross-database
  `JOIN` a physical impossibility, not just a coding convention
  (`docker-compose.yml`, `backstage-db` and `db` service definitions;
  cross-checked by `us16-ac16.1-backstage-docker-services.test.ts`,
  which already asserts `compose.services['backstage-db']).not.toBe(
  compose.services['db'])`).
- **Frontstage's only database credential points at its own database.**
  `src/payload.config.ts` configures Payload's `postgresAdapter` with a
  single `connectionString: process.env.DATABASE_URL`, and `.env.example`
  sets `DATABASE_URL=postgresql://postgres:postgres@db:5432/earthandhoney`
  — the `db` host, never `backstage-db`. No file under `src/` imports the
  `pg` driver directly, opens a second connection pool, or references
  `backstage-db`/`BACKSTAGE_DB_*` outside test comments describing a
  tester's own direct-to-`psql` verification queries (used only to
  independently confirm what Backstage's API returned, e.g.
  `us17-ac17.1.2-project-client-link.test.ts`, `us17-ac17.3-gallery-password-protection.test.ts`
  — a verification technique, not application code, and not something a
  running Frontstage request path ever does).
- **The API contract above never returns raw rows, only identifiers and
  display data.** Rows 1–2's Frontstage-cacheable fields (title, theme,
  toggles, photo URLs, item counts) are response bodies from Backstage's
  own HTTP API, already filtered to what a viewer may see — not a
  database read Frontstage could join against something else. The
  identifiers that do cross (`slug`, `id`, `share_token`, the gallery JWT)
  are exactly the "stored external identifiers" this rule refers to: a
  Frontstage record may store a Backstage `slug`/`id` as a plain field
  value to look up later via the API (row 1/3), but nothing in this
  codebase's schema declares a foreign-key relationship into
  `backstage-db`'s tables, because no ORM or query layer in `src/` is
  configured to reach that database at all.

Consequently, the row-4 gap (`Client`/`Project` creation, above) cannot
be closed by adding a database-level join or shared-schema shortcut
either — any future flow that needs a Frontstage inquiry to become a
Backstage client/project must do so by calling a Backstage API (extending
row 3's Bearer-token surface, or another HTTP mechanism) and storing the
Backstage-assigned id it gets back, the same external-identifier pattern
already used elsewhere in this contract. `AC-18.4` is where that specific
flow is designed; this section only fixes the rule it must follow.

## Backstage surfaces to disable (AC-18.5)

`SYSTEM_OWNERSHIP.md`'s ownership table already forbids Backstage from
duplicating two domains — *"Backstage/PicPeak must never create, edit, or
store a record for [CMS — non-gallery business content]; it has no table
or route for it and none should be added"* (`SYSTEM_OWNERSHIP.md:49`), and
*"The app must never recreate billing logic or compute an authoritative
balance itself"* for Payments (`SYSTEM_OWNERSHIP.md:54`). This section is
the evidence check on that assumption: it audits the pinned fork
(`eb263137b98935754155824de2a03848121304b6`, `PICPEAK_UPSTREAM.md`) for
the three surface categories `CLAUDE.md`'s architecture already assigns
elsewhere — public landing-page content management, native
quote/invoice/accounting screens, and any page-building capability — and
finds that, contrary to the "no table or route for it" assumption, the
first two **do** exist in the vendored code today. Each is recorded below
with file-level evidence and exactly how it is (or will be) disabled or
hidden. The third category is audited and found not to exist at all.

### 1. Public landing-page content management

The fork ships two distinct surfaces reachable from the same admin
screen (`frontend/src/pages/admin/CMSPage.tsx`, wired as the Settings →
Content & Appearance → "CMS Pages" tab, `SettingsPage.tsx:211,410`) —
only one of which actually overlaps `SYSTEM_OWNERSHIP.md`'s CMS row.

**1a. Static "CMS Pages" (impressum/privacy/terms, footer-linked legal
copy) — scoped out, left enabled.** Backed by the `cms_pages` table via
`backend/src/routes/adminCMS.js` (`GET/PUT /pages/:slug`, mounted
`/api/admin/cms/*` through `admin.js:12,25` → `server.js:638`) and a
public read route (`backend/src/routes/publicCMS.js`, mounted
`/api/public/pages/:slug` via `server.js:740`), gated only by the
`cms.view`/`cms.edit` RBAC permissions (`permissions.js:51`), not a
feature flag. `CLAUDE.md`'s CMS pillar names Payload's actual collection
set — Media, Galleries, Portfolio, Blog, Homepage, Testimonials,
Packages, FAQ — and none of them is a legal/impressum page type; nothing
in that list is what `cms_pages` stores. This capability is therefore
**not** a duplicate of anything Payload owns and is left enabled,
recorded here as a deliberate scoping decision rather than an oversight.

**1b. The "Public Site" raw HTML/CSS homepage editor — a genuine
duplicate, disabled by the fork's own shipped default.** This is the
actual overlap: PicPeak's admin literally authors the content served at
the whole application's `GET /` route. The editor (`CMSPage.tsx:27-31`
state, `:68-113` save/reset mutations) writes three settings —
`general_public_site_enabled`, `general_public_site_html`,
`general_public_site_custom_css` — through the generic
`PUT /api/admin/settings/general` route (`adminSettings.js:776`,
sanitized at `:781-816`), gated only by the `settings.edit` permission.
`backend/src/services/publicSiteService.js:38-50`
(`fetchPublicSiteSettings`) defaults `general_public_site_enabled` to
`false` when no `app_settings` row overrides it, and
`handlePublicSiteRequest` — the actual `GET /` handler, mounted twice
depending on whether a built frontend bundle exists
(`server.js:757,776`) — checks that flag first: *"if (!payload.enabled)
... `res.redirect(302, '/admin/login')`"* (`server.js:350-353`), so the
homepage renders nothing admin-authored while the setting is off.
**Disabling mechanism:** the shipped default (`enabled: false`) already
satisfies this AC without a code change; the operational rule this
document records is that `general_public_site_enabled` must never be set
to `true` via `PUT /api/admin/settings/general`. Unlike quote/invoice
(below), this toggle is **not** wired into the fork's `feature_flags`
system — `general_public_site_enabled`/`publicSite` is absent from
`KNOWN_FLAGS` (`adminFeatureFlags.js:25-65`) — so there is no
server-side 403 equivalent to `requireQuotesFlag`/`requireBillsFlag`
backing the default, only the RBAC permission and the default value
itself. This is recorded here as a gap, in the same spirit as the row-4
gap above: the implementing story's hardening step is to add a new
`publicSite` key to `KNOWN_FLAGS`/`DEFAULT_FLAGS` (default `false`,
mirroring `quotes`/`bills`'s existing pattern exactly) and check it
inside `handlePublicSiteRequest` before the `app_settings` value is even
read, plus hide the "Public Site" panel in `CMSPage.tsx` behind that
flag the same way `RequireFeature` gates the quotes UI (below) — a
Fork-Discipline-compliant deviation recorded in `FORK_CHANGELOG.md` when
that story writes the code, not here.

### 2. Native quote/invoice/accounting screens

A full native quotes → invoices → tax-report subsystem exists,
independent of Stripe Checkout:

| Surface | Route file | Mount | Flag |
|---|---|---|---|
| Quotes (admin) | `adminQuotes.js` | `/api/admin/quotes` (`server.js:703`) | `quotes` |
| Quotes (customer, token-only) | `publicQuotes.js` | `/api/public/quotes` (`server.js:712`) | `quotes` |
| Bills/Invoices (admin) | `adminInvoices.js` | `/api/admin/invoices` (`server.js:704`) | `bills` |
| Tax report | `adminTaxReport.js` | `/api/admin/tax-report` (`server.js:709`) | `bills` (reused — the file's own header states *"Reuses the existing `bills` feature flag + `bills.view` permission"*) |

`adminBusinessProfile.js` (`/api/admin/business-profile`,
`server.js:702` — the issuer/bank-account block every quote/invoice PDF
pulls from) and `adminDeals.js` (`/api/admin/deals`, `server.js:708` — a
CRM sales pipeline) sit in the same admin area but are not named by this
AC's "quote/invoice/accounting" wording and are left out of scope here.
`adminContracts.js` (`/api/admin/contracts`, `server.js:705`) is
deliberately **excluded** from this disable list: `SYSTEM_OWNERSHIP.md`'s
Contracts row assigns PicPeak/Backstage as the *authoritative* signing
system (the opposite direction from CMS/Payments), so `flags.contracts`
must stay on, not off — called out explicitly so a reader doesn't assume
every CRM flag gets the same treatment.

**Disabling mechanism — already shipped, already the default, and
enforced at four independent layers, not just one:**

1. **Flag defaults.** `DEFAULT_FLAGS.quotes = false`,
   `DEFAULT_FLAGS.bills = false`, `DEFAULT_FLAGS.taxReport = false`
   (`adminFeatureFlags.js:78-79,84`), with dependency rules that force
   the children off whenever the parent is off — `if (out.quotes ===
   false) out.bills = false` and `if (out.bills === false)
   out.taxReport = false` (`adminFeatureFlags.js:105,110`) — so a single
   `quotes: false` (the shipped default) already cascades to disable
   bills and the tax report too.
2. **Server-side enforcement on the routes themselves, not just the
   UI.** `adminQuotes.js`'s `requireQuotesFlag` middleware
   (`adminQuotes.js:40-45`, applied via `router.use(requireQuotesFlag)`
   at `:54`) returns `403 { code: 'QUOTES_DISABLED' }` for every request
   under `/api/admin/quotes` while the flag is off; `adminInvoices.js`'s
   `requireBillsFlag` (`adminInvoices.js:77-81`, applied at `:87`)
   does the same with `403 { code: 'BILLS_DISABLED' }` for
   `/api/admin/invoices`. A direct API call bypassing the admin UI is
   refused, not merely hidden.
3. **Frontend route hiding.** `frontend/src/App.tsx` wraps the quote and
   bill route trees in `<Route element={<RequireFeature flag="quotes"
   />}>` (`App.tsx:199`) and `flag="bills"` (`App.tsx:206`);
   `RequireFeature` (`RequireFeature.tsx:18-24`) redirects to
   `/admin/dashboard` whenever `flags[flag]` is false, so a stale
   bookmark to `/admin/clients/quotes/...` never renders the page.
4. **Nav hiding.** The single sidebar entry that leads to Quotes/Bills
   at all — `/admin/clients` — is itself gated by `featureFlag:
   'clients'` plus `featureFlagsAny: [..., 'quotes', 'bills',
   'taxReport', ...]` (`AdminSidebar.tsx:84-93`); with every listed flag
   at its off default, the derived `clients` flag evaluates `false`
   (`applyDependencyRules`'s `out.clients = Boolean(... || out.quotes ||
   out.bills || out.taxReport || ...)`) and the entry never renders at
   all. (The Settings "CRM behaviour" tab still shows because
   `flags.contracts` alone satisfies its `flags.quotes || flags.bills ||
   flags.contracts` condition, `SettingsPage.tsx:238` — expected, since
   Contracts stays enabled per the exclusion above, and noted here so
   that visible tab isn't mistaken for a disabling failure.)

**Operational rule this document records:** never set `quotes`, `bills`,
or `taxReport` to `true` via `PUT /api/admin/feature-flags` — the
pinned fork's shipped defaults already satisfy this AC without any code
change.

### 3. Page-building capability — audited, not present

The pinned fork's backend and frontend were searched for a drag-and-drop
or block-based page composer: `frontend/package.json` and
`backend/package.json` carry no `react-dnd`, `@dnd-kit`, `grapesjs`,
`craftjs`, `react-beautiful-dnd`, or similar dependency; a
case-insensitive source search for
`dnd-kit|react-dnd|grapesjs|craftjs|puck|page-builder|PageBuilder` across
`vendor/picpeak/` returns only an unrelated file-upload dropzone comment
(`frontend/src/components/admin/PhotoUpload.tsx:392`, *"accepts both
click-to-pick and drag-and-drop"* — for photo uploads, not page layout).
The only two content editors that exist are confirmed to be linear, not
block-based: `CMSEditor.tsx` (used by 1a, above) imports `@tiptap/react`
+ `@tiptap/starter-kit` (`CMSEditor.tsx:2-3`), a rich-text WYSIWYG editor
with no block/section model; the "Public Site" editor (1b, above) is a
plain HTML/CSS textarea pair (`CMSPage.tsx`'s `publicSiteHtml`/
`publicSiteCss` state is `string`, not a block array), sanitized and
rendered as a preview, not composed visually. **Conclusion: no
page-building capability exists in the pinned fork.** There is nothing
to disable or hide for this category; this is recorded explicitly,
mirroring `PICPEAK_CAPABILITY_AUDIT.md`'s practice of stating a negative
finding rather than leaving it silently unaddressed.

### Summary

| Duplicated surface | Exists in fork? | Disabling mechanism | State today |
|---|---|---|---|
| Public Site homepage HTML/CSS editor (1b) | Yes | Shipped default `general_public_site_enabled: false`; `publicSite` feature-flag hardening is a recorded design decision for the implementing story | Disabled by default |
| Static CMS Pages / impressum (1a) | Yes, but not a duplicate (see reasoning above) | N/A — out of scope | Left enabled |
| Quotes | Yes | `quotes` flag (default `false`) + `requireQuotesFlag` 403 + `RequireFeature` + nav hiding | Disabled by default |
| Bills/Invoices | Yes | `bills` flag (default `false`, forced off when `quotes` is off) + `requireBillsFlag` 403 + `RequireFeature` + nav hiding | Disabled by default |
| Tax report | Yes | `taxReport` flag (default `false`, forced off when `bills` is off) | Disabled by default |
| Page builder | No | N/A — audited, not present | Nothing to disable |

## User-facing terminology mapping (AC-18.6)

Every row above and every future Frontstage/Backstage story reads and
writes code against PicPeak's internal names (table/column names, route
paths, i18n keys) while the photographer and their clients only ever see
the user-facing word. This section is the single place that pairing is
recorded, so a future story cannot silently rename one side without the
other drifting out of sync.

| Internal name (schema / code / route) | System it lives in | User-facing word | Evidence |
|---|---|---|---|
| PicPeak's `Event` object — `events` table, `event_id`/`eventId` columns, `useGalleryAuth().event`, the `/api/v1/events` and `/api/customer/events/:slug` route families, `navigation.events` nav label ("Events") | Backstage | **Gallery** | The public-facing route is `/gallery/:slug`, rendered by `GalleryPage.tsx`/`GalleryView`, not `/event/:slug`; the admin's own per-row action button is labelled via the i18n key `events.viewGallery` → *"View Gallery"* (`EventsListPage.tsx:572`, `en.json`); the customer dashboard's own code comment states the intent directly — *"list of every **gallery** the admin has granted"* and *"which **gallery** did they upload yesterday?"* (`CustomerDashboardPage.tsx:2,46`) — describing the same underlying `Event` rows the `customer-events` query fetches (`CustomerDashboardPage.tsx:59-60`). |
| This project's own **Event** — a single dated occasion inside a Project (e.g. ceremony, reception) | Frontstage (a controlled-vocabulary term for a modeling concept; no Frontstage collection implements it yet) | **Event** — same word, deliberately not renamed | Defined by this AC's own text (`sprint3.json`, story US-18, AC-18.6) as distinct from, and not to be confused with, PicPeak's internal `Event` object directly above. **This is the one row in this table where the internal name and the user-facing word are already identical on purpose** — the risk this AC guards against is not a missing translation, it is a future implementer reading "Event" in Backstage's code and assuming it means this row instead of the row above. Any code or document that uses the bare word "Event" without stating which of these two rows it means is a defect against this AC. |
| PicPeak's `customer_account` / `Customer` record (`adminCustomers.js`, `customerAccountsService`, row 4 of the call catalog above) | Backstage | **Client** | `POST /api/admin/customers` and its `AC-18.4` Flow-B-proposed sibling `POST /api/v1/customers` are the routes that create this record; `SYSTEM_OWNERSHIP.md`'s own ownership table already uses "Client" as the user-facing word for it. |
| PicPeak's admin UI as a whole — everything under `frontend/src/pages/admin/`, mounted at `/admin/*` | Backstage (the vendored fork itself, as `SYSTEM_OWNERSHIP.md` and this document's own "Scope" section already name it) | **Backstage** | Already the term this entire document is written in; this row records it in the mapping table for completeness rather than introducing it here. |
| PicPeak's customer-facing UI — everything under `frontend/src/pages/customer/`, mounted at `/customer/*` (login, dashboard, per-gallery access, contracts, quotes/bills where enabled) | Backstage-hosted, but presented to the client, not the photographer | **Project Room** | This document's own "Scope of this document" section already names the Project Room as the customer-facing counterpart to Backstage; `scrum-master/po-requests.md` item 9 confirms it as "Backstage/Project Room (PicPeak fork templates)" — i.e. the Project Room is PicPeak's own customer UI under its user-facing name, not a second system Frontstage builds separately. |

**The rule this table enforces:** any UI copy, commit message, code comment,
or future document written for this project uses the user-facing word in
the right-hand column when addressing the photographer or a client, and
the internal name in the middle column only inside code that actually
touches PicPeak's schema/routes. The one exception is this project's own
Event (row 2), which keeps its bare word in both contexts — precisely
because it is a different concept from PicPeak's `Event`, not a
synonym for it, so no translation step ever applies to it. A future PR
that writes "Event" in Frontstage-facing copy without stating which row
it means, or that surfaces PicPeak's `events`/`Events` wording verbatim
in a Frontstage page instead of "Gallery", is a defect against this
table.
