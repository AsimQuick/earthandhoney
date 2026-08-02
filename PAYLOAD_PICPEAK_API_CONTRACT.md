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
created-by: dev-team
related-story: US-18
related-ac: 18.2, 18.3, 18.4
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
decision. It deliberately does **not** yet state which Backstage surfaces
get disabled (`AC-18.5`) or the user-facing terminology mapping
(`AC-18.6`) — those are separate ACs of this same story and are recorded
when their own AC runs, not pre-empted here.

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
