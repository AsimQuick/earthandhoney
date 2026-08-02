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
related-ac: 18.2, 18.3
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
Frontstage cache allowance. `AC-18.3` (below, "No cross-database access")
adds the no-cross-database-join rule. It deliberately does **not** yet
state: the three named flows a future sprint depends on (`AC-18.4`),
which Backstage surfaces get disabled (`AC-18.5`), or the user-facing
terminology mapping (`AC-18.6`) — those are separate ACs of this same
story and are recorded when their own AC runs, not pre-empted here.

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

`AC-18.4` (a separate AC of this story) is expected to describe a
Frontstage-inquiry-to-Backstage-client-and-project flow. This AC's own
evidence — a direct read of `adminCustomers.js` and `adminProjects.js` —
found that the only two routes capable of creating those records require
an interactive admin session cookie, not the Bearer-token
service-to-service mechanism the pinned fork otherwise provides for
exactly this kind of integration (row 3, `v1/events`). This document
records that gap now, with file-level evidence, rather than assuming a
calling mechanism that does not exist in the pinned fork. Closing it
(extending the `v1` API's scope, or another mechanism) is a decision for
whichever AC or follow-on story implements the inquiry-conversion flow —
this document does not invent one on that AC's behalf.

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
