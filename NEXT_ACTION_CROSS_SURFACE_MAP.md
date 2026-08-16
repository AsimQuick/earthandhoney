<!--
---
file: NEXT_ACTION_CROSS_SURFACE_MAP.md
project: earthandhoney
purpose: AC-39.3.1 — maps the two request paths AC-39.3's cross-surface
         next-action proof depends on, against the pinned fork commit,
         BEFORE any behaviour proof is attempted. AC-39.3 as originally
         written was a live proof against a vendored system nobody had
         mapped, and twice consumed a whole dev session doing the mapping
         inside the implementation rather than up front. This document
         answers a closed list of six questions; every answer carries a
         file and line from the pinned commit, never a claim from prose
         documentation. It ships no behaviour and changes no code path —
         a path found missing or broken here is recorded as a finding, not
         silently patched or worked around.
created-by: dev-team
related-story: US-39
related-ac: 39.3.1
---
-->

# Next-Action Cross-Surface Map

Six questions, answered against the pinned fork commit (`vendor/picpeak`, pinned
at `7f13837` per `PICPEAK_UPSTREAM.md` / US-15) as it stands on this branch.
Every claim below was verified by opening the named file at the named line,
not inferred from a comment, a PRD section, or another document's summary.

## 1. Router file + mount path serving a Project to the photographer's cockpit

**`vendor/picpeak/backend/src/routes/adminProjects.js`, mounted at
`/api/admin/projects`.**

- Mount registration: `vendor/picpeak/backend/server.js:517` —
  `app.use('/api/admin/projects', require('./src/routes/adminProjects'));`
- The router-level auth gate: `adminProjects.js:19` —
  `router.use(adminAuth);` (applies to every route below it in the file).
- The Project-detail read a cockpit would call: `adminProjects.js:45` —
  `router.get('/:id', requirePermission('events.view'), ...)`, backed by
  `projectService.getProjectById` (`adminProjects.js:47`).
- List: `adminProjects.js:22` (`GET /`, `events.view`). Create: `adminProjects.js:31`
  (`POST /`, `events.manage`). Update/relink: `adminProjects.js:53`
  (`PUT /:id`, `events.manage`). Attach event: `adminProjects.js:73`
  (`POST /:id/events`, `events.manage`).

**Finding, not a defect this AC fixes:** the three `events.manage`-gated
routes (create/update/attach — `adminProjects.js:32,54,74`) return an
unconditional `403 Forbidden` for every role, including `super_admin`,
because no migration in the pinned fork ever seeds a permission row named
`events.manage`:

- The permissions seed lists exactly five `events.*` rows —
  `events.view`, `events.create`, `events.edit`, `events.delete`,
  `events.archive` — and no `events.manage`
  (`vendor/picpeak/backend/migrations/core/055_add_permissions_table.js:49-53`).
- The role/permission junction seed grants `super_admin` every row that
  exists in `permissions` at migration time, not a fixed list, so
  `super_admin` can still only ever hold a permission that was actually
  seeded (`vendor/picpeak/backend/migrations/core/056_add_role_permissions_table.js:46`).
- Migration `117_add_projects.js`, which introduces these routes, never
  inserts an `events.manage` row, and no later migration does either.

This exact finding, including a live `403` reproduction against the
running stack, was already recorded independently at `PIVOT_AUDIT.md`'s
`## AC-17.1.2` write-up (`PIVOT_AUDIT.md:722-781`); this map cites it
rather than re-deriving it a third time. The **read** path (`GET /:id`,
`GET /`, `events.view`) is unaffected and reachable — only the three
write routes 403.

## 2. Router file + mount path serving a Project to the client's Project Room

**No such route exists at the pinned commit. This is a finding, not an
answer.**

The client-facing router is `vendor/picpeak/backend/src/routes/customer.js`,
mounted at `/api/customer` (`server.js:505` —
`app.use('/api/customer', noStoreCache, require('./src/routes/customer'));`).
Its own header comment enumerates its complete endpoint list
(`customer.js:1-12`):

```
GET  /events                       list assigned events for dashboard
GET  /events/:slug/access-token    mint a gallery JWT
```

Neither endpoint — nor any other route in the file — reads `projects`,
`project_milestones`, or `project_booking_requirements`; a case-insensitive
search of the file for `project` returns no matches. This is consistent
with, and directly caused by, the vendored fork's own design statement:
migration `117_add_projects.js:7` — *"Customers never see projects."*
The customer surface's only scoping primitive today is **per-event**, via
`event_customer_assignments` rows (`server.js:479-481`), not per-project.

A client-facing Project route is squarely what AC-39.3 (and US-44's
Project Room) must add; it is not present to map today.

## 3. Auth middleware each is gated on, and the request a test makes to obtain a credential

**Admin (`/api/admin/projects/*`):**

- Middleware: `adminAuth` (`vendor/picpeak/backend/src/middleware/auth.js:11`,
  `async function adminAuth(req, res, next)`), applied via
  `router.use(adminAuth)` at `adminProjects.js:19`.
- Credential request: `POST /api/auth/admin/login`
  (route defined at `vendor/picpeak/backend/src/routes/auth.js:36`, mounted
  at `/api/auth` via `server.js:442` — `app.use('/api/auth', authRoutes);`).
  Body: `{ "username": string, "password": string }`
  (`auth.js:37-38`). On success the response sets the `admin_token` cookie
  `adminAuth` reads back. This is the exact call the project's existing
  live-suite precedent already makes
  (`src/__tests__/us25-ac25.2-backstage-client-flow-a.test.ts:404`,
  `fetch(`${base}/api/auth/admin/login`, ...)`), so a cross-surface proof
  test can reuse that pattern rather than invent a new one.

**Customer (`/api/customer/*`):**

- Middleware: `customerAuth` (`vendor/picpeak/backend/src/middleware/customerAuth.js:19`,
  `async function customerAuth(req, res, next)`). Unlike the admin router,
  `customer.js` applies it **per route**, not via a blanket `router.use`
  (e.g. `customer.js:91` — `router.get('/events', customerAuth, ...)`).
  Any project-scoped route AC-39.3 adds must opt in the same way.
- Credential request: `POST /api/customer/auth/login`
  (route defined at `vendor/picpeak/backend/src/routes/customerAuth.js:66`,
  mounted at `/api/customer/auth` via `server.js:504` —
  `app.use('/api/customer/auth', noStoreCache, require('./src/routes/customerAuth'));`).
  Body: `{ "email": string, "password": string }`
  (`customerAuth.js:67-68`). On success the response sets the
  `customer_token` cookie (`setCustomerAuthCookie`, `customerAuth.js:128`)
  that `customerAuth` middleware reads back.

## 4. How a Project is scoped to a customer on the client side

**Not observable at the pinned commit — no code path exists to cite.**

Because no customer-facing Project route exists (question 2), there is no
handler that reads `projects.customer_account_id` for the customer surface
and therefore nothing to point to for "how a customer is prevented from
reading another customer's Project." What does exist:

- The data model supports it: `projects.customer_account_id` is a real
  foreign key to `customer_accounts.id`, `ON DELETE SET NULL`
  (`vendor/picpeak/backend/migrations/core/117_add_projects.js:32-33`).
- The nearest working precedent, for **events** rather than projects, is
  `event_customer_assignments`: a junction table re-checked by
  `verifyGalleryAccess` on every customer-minted gallery JWT
  (`server.js:479-481`'s comment names this explicitly as the live
  per-gallery revocation mechanism).

Building the actual project-ownership check (most likely: a route that
selects the Project only `WHERE customer_account_id = req.customer.id`,
returning `404` rather than `403` for a Project that exists but is not
theirs, mirroring how `customerAuth`-gated routes already avoid confirming
existence to the wrong caller) is AC-39.3 / US-44 work, not this AC's.

## 5. Backend and database hostnames on the Docker network, and the seeded admin credential

From `docker-compose.yml` (the `backstage` Compose profile):

- Backend hostname: **`backstage-backend`** (`docker-compose.yml:66`,
  service name), listening on container port `3000`
  (`docker-compose.yml:80`, `PORT: "3000"`). Also reachable as `backend`
  — an explicit network alias added so the vendored frontend's own
  `nginx.conf` (which proxies to the literal name `backend`) resolves it
  (`docker-compose.yml:116-119`). Exposed to the host at `3101`
  (`docker-compose.yml:110`), which is irrelevant from inside another
  container on the same Compose network.
- Database hostname: **`backstage-db`** (`docker-compose.yml:51`, service
  name), port `5432` (confirmed via the backend's own connection env,
  `docker-compose.yml:90` — `DB_PORT: "5432"`).
- Seeded admin credential: username from `BACKSTAGE_ADMIN_USERNAME`
  (default `admin`, `docker-compose.yml:82`), password from
  `BACKSTAGE_ADMIN_PASSWORD` (default `change-me-in-production`,
  `docker-compose.yml:84`) — passed into the `backstage-backend` container
  as the plain `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars. Those two are
  consumed once, on first migrate, by
  `vendor/picpeak/backend/migrations/core/001_init.js:14-31`: if
  `admin_users` is empty, it inserts exactly one row using
  `process.env.ADMIN_USERNAME || 'admin'` (`001_init.js:22`) and
  `process.env.ADMIN_PASSWORD` (bcrypt-hashed at `001_init.js:19`,
  falling back to a randomly generated password — never a fixed default —
  when the env var is unset, `001_init.js:18`).

## 6. How a Project, a customer account, and milestone rows are seeded for a test

**No automated seeding path exists yet — the same absence question 1's
finding already names.** `POST /api/admin/projects`, the route that would
otherwise create a Project through the API, 403s unconditionally
(question 1), and US-41 (PRD 22.3's atomic Project setup, which is what
would create the customer relationship, default milestones, etc. together)
is not yet built (`status: "not-started"` in `scrum-master/sprint6.json`).

The reproducible path at the pinned commit is a direct write against
`backstage-db` — the same Postgres instance the admin and customer APIs
themselves read from, never a mock or a separate store. This is not a
workaround invented for this AC: it is the exact technique
`PIVOT_AUDIT.md`'s `## AC-17.1.2` write-up already established and
recorded as the correct response to the unreachable create route, not a
patch around it (`PIVOT_AUDIT.md:783-802`, insert directly into `projects`,
read back through the working `GET` route). For each table, the columns a
seed insert needs:

- `customer_accounts` — `email`, `password_hash` (bcrypt; the account is
  then authenticated for real through the actual
  `POST /api/customer/auth/login` route from question 3 — only row
  *creation* bypasses the API, never authentication itself), `is_active`
  (columns per `vendor/picpeak/backend/migrations/core/090_add_customer_accounts.js:22-40`).
- `projects` — `name`, `customer_account_id` (FK to `customer_accounts.id`,
  `117_add_projects.js:27-38`), `current_phase` (added by
  `vendor/picpeak/backend/migrations/core/122_add_project_new_project_fields.js:86`,
  `table.string('current_phase', 24).notNullable().defaultTo('lead');`).
- `project_milestones` — `project_id`, `milestone_key`, `name`,
  `sequence_order`, `completion_state`, `completed_at`, `completed_by`.
  A real per-Project row set does not exist yet either (US-41 clones it
  from the eighteen canonical template rows, `project_id IS NULL`); those
  eighteen template rows themselves — the `milestone_key` / `name` /
  `sequence_order` values a seed must reuse rather than invent — are
  defined and seeded at
  `vendor/picpeak/backend/migrations/core/124_add_project_milestones.js:30-49`.

## Operational hazard: a currently running container does not reflect this source

Confirmed while producing this map, and recorded because it is exactly the
kind of gotcha that would otherwise burn a session's worth of confused
debugging: at the time of writing, this branch already had a `backstage`
profile running (`docker compose ps` — `backstage-backend` "Up 23
minutes", built earlier in this same working tree). That running
container's image was built from an *earlier* version of
`adminProjects.js`/`customer.js` that **did** carry `next-action` routes —
`docker compose exec backstage-backend grep -n next-action src/routes/adminProjects.js`
shows a real `router.get('/:id/next-action', ...)` at that container's
line 115, and `customer.js` line 729 likewise — routes that do **not**
exist in the checked-out source questions 1 and 2 above cite (`git diff
HEAD` on both files is empty; a fresh `grep` on disk finds no
`next-action` match in either). The routes, and the `nextActionService.js`
/ `nextActionRules.js` files that back them, were added by an earlier,
uncommitted attempt at AC-39.3, then reverted from the working tree
without the running container being rebuilt.

**Consequence:** a live cross-surface test run against that already-running
container right now would silently pass — it would exercise the stale
baked-in routes, not the pinned source. Before AC-39.3 (or any AC) treats a
live round trip against `backstage-backend` as proof of anything, run
`docker compose build backstage-backend` (or `up -d --build`) first, so
the container matches the committed source rather than a stale prior
session's leftover build. This map's own answers were verified by reading
the files on disk / in git, never by trusting the running container.

## NOT COVERED

- **The next-action route itself.** Neither `adminProjects.js` nor
  `customer.js` carries a `next-action` endpoint at the pinned commit.
  Adding it, on both surfaces, sharing one computation, is AC-39.3's job —
  this map exists so that AC can be built directly against real routes and
  real auth instead of discovering them mid-implementation, which is the
  failure this AC was split off to prevent.
- **Whether to patch the `events.manage` gap.** Question 1's finding is
  recorded, not resolved. Fork Discipline forbids editing the vendored
  route on this AC's own authority; any fix (seed the permission, change
  the gate, or route around it) is a decision for whichever AC actually
  needs the admin write routes to work, not this one.
- **The customer-side ownership check's exact shape** (question 4) — no
  code exists to describe; only the data model and the nearest
  event-scoped precedent are recorded. The actual check (404 vs. 403,
  which query, which route file) is AC-39.3 / US-44 implementation, not a
  mapping fact.
- **Frontend rendering of any of this** — the photographer cockpit's and
  the Project Room's own UI (Payload/React) are out of scope; this map
  covers only the backend request paths a live proof would call directly.
- **`project_booking_requirements` seeding** — not seeded here because
  question 6 asks only about a Project, a customer account, and milestone
  rows; AC-39.2's own suite (`bdd8c80`) already establishes that table's
  shape and default template rows independently.
- **Live command output as evidence.** All six answers above are static
  file:line citations against the pinned commit, per this AC's own
  evidence clause — question 1's 403 finding is corroborated by
  `PIVOT_AUDIT.md`'s own already-recorded live reproduction rather than by
  a fresh one here. The only commands actually run against the live stack
  while producing this document were the `docker compose ps` / `exec grep`
  pair behind the operational-hazard section above — used to confirm that
  hazard, not to derive any of the six answers themselves.
