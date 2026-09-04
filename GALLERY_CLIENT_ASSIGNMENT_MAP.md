<!--
---
file: GALLERY_CLIENT_ASSIGNMENT_MAP.md
project: earthandhoney
purpose: AC-41.2.1 — maps the Gallery-to-Client assignment path against the
         pinned fork before any live assignment is attempted, in the shape
         AC-41.1.1's PROJECT_SETUP_MECHANISM_MAP.md and AC-39.3.1's
         NEXT_ACTION_CROSS_SURFACE_MAP.md established. Answers a closed list
         of seven questions; every answer carries a file and line from the
         pinned commit as it stands on this branch, never a claim from F1/F2
         as recorded in po-requests.md, from this AC's own pre-verification
         prose, or from another document's summary. It ships no service, no
         route and no behaviour — a mechanism found missing, gated off, or
         broader/narrower than F1/F2 describe is recorded here as a finding,
         never silently patched or worked around.
created-by: dev-team
related-story: US-41
related-ac: 41.2.1
---
-->

# Gallery-to-Client Assignment Map

Seven questions, answered against the pinned fork commit (`vendor/picpeak`,
pinned at `eb263137b98935754155824de2a03848121304b6` per `PICPEAK_UPSTREAM.md`
§1 / US-15, dated 2026-07-31) as it stands on this branch — i.e. that
upstream baseline plus every fork-origin migration and service US-38/US-39/
US-40/US-41's own earlier ACs have since added (this branch's HEAD at the
time of writing is `43e4746`). Every claim below was verified by opening the
named file at the named line, or, for question 5's feature-flag value, by
running a command directly against the live `earthandhoney-backstage-backend-1`
container — never inferred from a comment, this file's own prose, PRD
wording, F1/F2's own one-line summaries, or another document's summary.
Several of this AC's own pre-verification citations (in the story text that
commissioned this map) turned out to be off by a small number of lines
against the file as it stands right now; where that happened, the line
number given below is the one independently verified against the current
file, not the pre-verification citation — exactly the discipline this AC
exists to enforce.

## 1. How a Gallery is created, and whether any create path can carry either link

**The one live handler:** `POST /` (`vendor/picpeak/backend/src/routes/adminEvents.js:330`),
gated `adminAuth, requirePermission('events.create')`. Its `customer_account_ids`
validators sit at `adminEvents.js:419-420`:

```
419  body('customer_account_ids').optional().isArray(),
420  body('customer_account_ids.*').optional().isInt({ min: 1 }),
```

Its own assignment block — applying `customer_account_ids` if the array was
sent — sits at `adminEvents.js:716-735`, gated on
`customerAccountsService.isCustomerPortalEnabled()` (`:723`) and wrapped in a
`try`/`catch` that only logs on failure (`:730-734`, `logger.error(...)`, no
rethrow). This block never references `req.body.project_id` or any
Project-linking field — see question 2.

**A second `POST /` registration exists on disk, but it is not a second
live handler.** `adminEvents-enhanced.js:12` does declare its own
`router.post('/', adminAuth, requirePermission('events.create'), [...`.
Verified it is dead code, not a second mount, on three independent grounds:

- **Never required anywhere.** A repo-wide search for the literal string
  `adminEvents-enhanced` under `vendor/picpeak/backend` returns zero
  matches outside the file's own path — no route file, `admin.js`
  (`vendor/picpeak/backend/src/routes/admin.js:9`, which requires only
  `./adminEvents`), or `server.js` ever `require`s it.
- **It cannot even be required successfully.** The file never declares
  `const router = express.Router()` or `require('express')` — `router` is a
  free variable. If anything ever did `require()` this file, line 12's
  top-level `router.post(...)` call would throw `ReferenceError: router is
  not defined` immediately, before any route could register.
- **It says so about itself.** Lines 1-2 and 10-11 are its own header
  comments: "This is a partial file showing the enhanced event creation...
  Only the relevant parts are shown - merge with existing adminEvents.js"
  and "this is a partial/reference file."

So every later answer in this map names `adminEvents.js`'s handler — the
one Express actually dispatches to — never `adminEvents-enhanced.js`'s.

## 2. Whether the Gallery-to-Project link is settable through that route at all

**Confirmed as speculated, narrowly — and the broader inference does not
hold.** Migration 117 creates `events.project_id` as the Gallery-to-Project
foreign key: the guard check is at
`vendor/picpeak/backend/migrations/core/117_add_projects.js:41-42`
(`// 2. events.project_id` / `if ((await knex.schema.hasTable('events')) …`),
the column add itself at `:44-45`
(`table.integer('project_id').unsigned().references('id').inTable('projects')…`).
A case-sensitive search of `adminEvents.js`'s full 2022 lines for
`project_id` returns **zero matches** — confirmed by both `grep -n` and
`grep -c`. So `project_id` is not settable through `adminEvents.js` at all,
on create or edit, exactly as this AC's own pre-verification prose stated.

**But the inference "so 'a Gallery created inside a Project' is not an
existing flow at the pinned commit at all" does not hold — it is
narrower than that prose feared, not broader.** A separate, working
mechanism exists on a different router:

```
adminProjects.js:73-81   router.post('/:id/events',
                           requirePermission('events.manage'),
                           [param('id').isInt({ min: 1 }), body('eventId').isInt({ min: 1 })],
                           handleAsync(async (req, res) => {
                             validateRequest(req);
                             const result = await projectService.assignEvent(
                               parseInt(req.params.id, 10), parseInt(req.body.eventId, 10));
                             return successResponse(res, result, 200, 'Event attached to project');
                           }));

projectService.js:88-95  async function assignEvent(projectId, eventId) {
                            const project = await db('projects').where({ id: projectId }).first();
                            if (!project) throw new AppError('Project not found', 404);
                            const event = await db('events').where({ id: eventId }).first();
                            if (!event) throw new AppError('Event not found', 404);
                            await db('events').where({ id: eventId }).update({ project_id: projectId });
                            return { projectId, eventId };
                          }
```

`POST /api/admin/projects/:id/events` (mounted at `server.js:517`, `app.use('/api/admin/projects', require('./src/routes/adminProjects'))`)
does write `events.project_id`, via `projectService.assignEvent`. The
Gallery-to-Project link is exactly as explicit as the Gallery-to-Client
link F1 already describes — assigned after the fact, through its own
dedicated route — not absent. **This is a finding this map records as a
correction of its own commissioning prose, not a gap requiring
`pending_po_routing`: the mechanism exists, is wired, and needs no product
decision.** `requirePermission('events.manage')` is the same permission
migration 129 (`129_seed_events_manage_permission.js`) had to seed for the
sibling routes on this same router — already live and already proven by
AC-41.1.3's live proof (`POST /api/admin/projects` succeeding end to end),
so this route is not blocked by the gap that migration fixed.

## 3. The edit route's exact handler shape

`PUT /:id` — `adminEvents.js:1129` —
`router.put('/:id', adminAuth, requirePermission('events.edit'), requireEventOwnership, [`.
`requireEventOwnership` is defined at `vendor/picpeak/backend/src/middleware/ownership.js:7`.
Its `customer_account_ids` validators sit at `adminEvents.js:1227-1228`,
identical in shape to the create route's:

```
1227  body('customer_account_ids').optional().isArray(),
1228  body('customer_account_ids.*').optional().isInt({ min: 1 }),
```

Both `events.edit` and `events.create` (question 1) are seeded to
`super_admin` (and to the plain `admin` role by explicit name) from the
pinned commit's own base migrations —
`migrations/core/055_add_permissions_table.js:49-53` seeds the five
`events.*` permission rows (`view`, `create`, `edit`, `delete`, `archive`);
`migrations/core/056_add_role_permissions_table.js:38`
(`super_admin: permissions.map(p => p.name)`) and `:44` (the `admin` role's
explicit list, which names `events.edit` and `events.create` directly)
grant them. Unlike `events.manage` (the permission migration 129 had to add
for the Projects router — `PROJECT_SETUP_MECHANISM_MAP.md`'s own item 12
context), there is no seeding gap on this route: the same admin credential
AC-41.1.3's live proof already used (`POST /api/auth/admin/login`, default
`super_admin`) can call this route today.

## 4. F2's mechanism from source, and the minimum request body that does not 500

**Mechanism, read from source, not reproduced by trial.** The handler
deletes `customer_account_ids` before the update — `adminEvents.js:1331-1336`:

```
1331  // customer_account_ids (#354) is a body-only field consumed
1332  // separately below by customerAccountsService.setAssignmentsForEvent
1333  // — it isn't a column on the events table, so spreading it into
1334  // the UPDATE statement throws "column does not exist" and crashes
1335  // the entire edit with 500 Failed to update event.
1336  delete updates.customer_account_ids;
```

— and then issues the update at `adminEvents.js:1464-1466`:

```
1464  await db('events')
1465    .where('id', id)
1466    .update(updates);
```

A body carrying only `customer_account_ids` reaches that call with `updates`
having been reduced to `{}`. The 500 is not a database round trip:
Knex's own query compiler throws synchronously, before any SQL is sent, on
an empty update object —
`vendor/picpeak/backend/node_modules/knex/lib/query/querycompiler.js:1364-1375`
(`if (isEmpty(vals)) { throw new Error(['Empty .update() call detected!', …`).
That throw propagates to the route's own outer `catch` —
`adminEvents.js:1502-1504` — which responds
`res.status(500).json({ error: 'Failed to update event' })`, the exact
message the line-1335 comment names. F2's "returns 500" is this mechanism
exactly, confirmed from source; nothing about it needed a live 500 to be
reproduced.

**Which additional field(s) make `updates` non-empty.** Every field the
`PUT /:id` validators accept (`adminEvents.js:1130-1228`) survives into
`updates` unless the handler's own conditional logic (`:1238-1462`) deletes,
rejects, or transforms it — deletion/rejection applies to `host_name`/
`host_email` (400), `customer_name`/`customer_email` (deleted unless a
non-empty value resolves and the customer-contact columns exist),
`customer_phone` (deleted unless the phone field toggle is on), `password`
(always deleted, consumed separately), `client_password` (always deleted,
consumed separately), `regenerate_client_token` (always deleted), and
`customer_account_ids` itself (question 4's own subject, always deleted).
Every other validated field is a **plain passthrough with no conditional
deletion and no dependency on another field or app setting** —
confirmed by reading `adminEvents.js:1238-1462` line by line for each
validator name. The simplest single-field member of that set is
`event_name` (`adminEvents.js:1130`, `body('event_name').optional().trim().notEmpty()`):
it is referenced nowhere else in the PUT handler except the pre-update
`event.event_name` read used for a log line (`:1490`, which reads the
row's *old* name, not `updates.event_name`) — so resending the event's own
current name is a genuine no-op write with zero side effects. Other equally
safe single-field members of the same passthrough set: `is_active`,
`welcome_message`, `allow_user_uploads`, `allow_downloads`,
`disable_right_click`, `watermark_downloads` (note: also triggers a
download-zip cache invalidation at `:1497-1498`, harmless but not a pure
no-op), `watermark_text`, `allow_presigned_download`, `upload_category_id`,
`hero_photo_id`, `css_template_id`, `hero_logo_visible`, `hero_logo_size`,
`hero_logo_position`, `header_style`, `hero_divider_style`,
`default_photo_sort`, `og_image_share_enabled`. This map records the set
and names `event_name` as the cleanest single choice; which field
AC-41.2.2 actually sends is that AC's own decision, not one this map makes
for it.

## 5. The two silent-failure hazards, answered with this deployment's actual state

**Hazard A — the feature-flag gate, and this deployment's actual value.**
The PUT route's assignment block is gated on
`customerAccountsService.isCustomerPortalEnabled()`. Verified precisely
(the pre-verification citation of `:1471` for this call was one line off
against the file as it stands — the outer array check is at `:1471`, the
gate call itself at `:1474`):

```
1471  if (Array.isArray(req.body.customer_account_ids)) {
1472    try {
1473      const customerAccountsService = require('../services/customerAccountsService');
1474      if (await customerAccountsService.isCustomerPortalEnabled()) {
1475        await customerAccountsService.setAssignmentsForEvent(
1476          parseInt(id, 10),
1477          req.body.customer_account_ids,
1478          req.admin.id
1479        );
1480      }
1481    } catch (e) {
```

`isCustomerPortalEnabled` (`customerAccountsService.js:1177-1189`) returns
`false` on any install whose `feature_flags` table lacks a truthy
`customerPortal` row:

```
1177  async function isCustomerPortalEnabled() {
1178    try {
1179      if (!(await db.schema.hasTable('feature_flags'))) return false;
1180      const row = await db('feature_flags').where({ key: 'customerPortal' }).first();
1181      if (!row) return false;
1182      const v = row.value;
1183      return v === true || v === 1 || v === '1' || v === 'true';
1184    } catch (e) {
1185      // Defensive: if feature_flags is briefly unavailable (early bootstrap,
1186      // failover) treat as off rather than throwing a 500 from the gate.
1187      return false;
1188    }
1189  }
```

**Probed directly against this deployment, not assumed** (same technique
as `PROJECT_SETUP_MECHANISM_MAP.md`'s storage-backend probe):

```
$ docker exec earthandhoney-backstage-backend-1 sh -c "cd /app && node -e \"
const { db } = require('./src/database/db');
(async () => {
  const hasTable = await db.schema.hasTable('feature_flags');
  console.log('feature_flags table exists:', hasTable);
  if (hasTable) {
    const row = await db('feature_flags').where({ key: 'customerPortal' }).first();
    console.log('customerPortal row:', JSON.stringify(row));
  }
  const svc = require('./src/services/customerAccountsService');
  console.log('isCustomerPortalEnabled():', await svc.isCustomerPortalEnabled());
  process.exit(0);
})().catch(e => { console.error('PROBE FAILED:', e.message); process.exit(1); });
\""
feature_flags table exists: true
customerPortal row: {"key":"customerPortal","value":false,"updated_at":"2026-08-16T08:18:58.172Z","updated_by":null}
isCustomerPortalEnabled(): false
```

**`isCustomerPortalEnabled()` returns `false` on this deployment, right
now.** That means the PUT route's whole assignment block — the mechanism
F1/F2 describe and AC-41.2.2/AC-41.2.3 would exercise live — is currently
gated off. Calling `PUT /:id` with `customer_account_ids` plus a non-empty
field (question 4) will return `200 Event updated successfully`
unconditionally, having silently skipped `setAssignmentsForEvent` entirely.
This is not a hypothetical: it is this deployment's actual, current,
verified configuration.

**Hazard B — the swallowed catch.** The block's own `catch` (`adminEvents.js:1481-1485`)
logs (`logger.error('Failed to set customer assignments on event update', …)`)
and does not rethrow — so even with the flag on, a failure inside
`setAssignmentsForEvent` (e.g. every id in `customer_account_ids` resolving
to an inactive/missing customer) still returns `200`. A live assertion that
only checks the HTTP status can pass falsely for either hazard; only a
direct read of `event_customer_assignments` (question 6) proves the
assignment actually happened.

**Enabling the flag is not a free configuration change — recorded, not
decided, here.** `customerAccountsService.js:1169-1171`'s own header
comment: "When false, every customer-side surface (login, dashboard,
accept-invite, reset) returns 403/410." Turning `customerPortal` on to
unblock a live assignment test would simultaneously open those
customer-facing surfaces — a client-facing surface CLAUDE.md's "there is
no fourth surface" rule and the System Ownership row "Client-facing portal
| Project Room only" both govern. **This is a Product Owner decision,
routed through `pending_po_routing`** — this map does not flip the flag,
and no later AC in this sub-sequence should either, without that decision
being made explicitly.

## 6. Which table `setAssignmentsForEvent` actually writes

`customerAccountsService.js:840-882`:

```
840  async function setAssignmentsForEvent(eventId, targetCustomerIds, adminId, trx = db) {
841    const wanted = new Set((targetCustomerIds || []).map(Number).filter((n) => Number.isFinite(n) && n > 0));
842    const existing = await trx('event_customer_assignments')
843      .where('event_id', eventId)
844      .select('id', 'customer_account_id');
...
850    if (toRemove.length > 0) {
851      await trx('event_customer_assignments')
852        .whereIn('id', toRemove.map((r) => r.id))
853        .del();
...
870      const rows = [...validSet].map((customerId) => ({
871        event_id: eventId,
872        customer_account_id: customerId,
873        assigned_by_admin_id: adminId,
874        assigned_at: new Date(),
875      }));
876      if (rows.length > 0) {
877        await trx('event_customer_assignments').insert(rows);
878      }
```

The table is **`event_customer_assignments`** — a diff-and-apply
(remove rows not wanted, insert rows newly wanted) against
`(event_id, customer_account_id)`. A live AC-41.2.3 must assert a row in
`event_customer_assignments` for the target `event_id`/`customer_account_id`
pair, never a `200` status alone (question 5 explains why the status alone
proves nothing).

**One caveat worth recording, not fixing:** the function's own doc comment
(`:832-839`) says the diff-and-apply happens "inside one transaction so the
event row and its assignments either both update or neither does," but the
route never passes its own `trx` — the call sites
(`adminEvents.js:724-729` on create, `:1475-1479` on edit) invoke it with
only three arguments, so `trx` defaults to the bare `db` (`:840`'s own
default parameter), not a transaction shared with the preceding
`db('events')...update(updates)` call. The `events` row and the
`event_customer_assignments` rows are two independent statements, not one
atomic unit, on both routes today. This is additional context for why
question 5's swallowed catch matters (a failure here does not roll back
the event update either) — it is not this map's question to resolve and is
listed under NOT COVERED.

## 7. Whether a Gallery exists after Project setup at all

**It does not — confirmed, not assumed.** PRD 22.3's ten items (the list
`PROJECT_SETUP_MECHANISM_MAP.md` maps one-by-one) name no Gallery/event of
any kind. The actually-committed `projectSetupService.js`
(AC-41.1.2.1's shared setup path) contains **zero** references to the
`events` table, `adminEvents`, `createEvent`, or `eventService` anywhere in
its source — confirmed by a case-sensitive grep across the whole file.
AC-41.1.3's live-proof suite
(`src/__tests__/us41-ac41.1.3-project-setup-live-proof.test.ts`) performs
exactly one live call, `POST /api/admin/projects`, and its ten `it()`
blocks read back only Project-scoped state (`GET /:id`, `/media-area`,
`/room-access`, `/next-action`, `/milestones`, `/documents`,
`/integration-status`, `/timeline`, and one `email_queue` row) — no
`events` row is created, read, or asserted anywhere in that suite.

**What AC-41.2.3's live run must therefore create first, through which
route, under which credential.** Before any assignment can be exercised
live, a Gallery must exist. The only live create path is question 1's
`POST /api/admin/events` (`adminEvents.js:330`), under the same
`super_admin` credential AC-41.1.3 already used
(`POST /api/auth/admin/login`, `events.create` seeded per question 3).
If the live test also wants to prove the Gallery is attached to the
Project it was ostensibly "created inside," question 2's separate route —
`POST /api/admin/projects/:id/events` (`adminProjects.js:73-81`,
`events.manage`, same credential) — is the second call; there is no
single call that does both. Only after that Gallery exists can
`PUT /api/admin/events/:id` (question 3) be called to exercise the
Client assignment questions 4-6 describe.

## Findings routed to `pending_po_routing`

Per this AC's own instruction, a mechanism found missing, gated off, or
materially different from F1/F2's recorded framing is a finding recorded
here, never an edit this AC makes or a route this AC invents. `sprint6.json`
is outside this AC's write scope (`scrum-master/` is orchestrator-owned);
this section names exactly what belongs in `sprint6.json`'s
`pending_po_routing` array so the orchestrator can drain it at story close,
the same mechanism `po-requests.md:149-157` describes.

1. **This deployment's `customerPortal` feature flag is currently `false`
   (question 5), which gates off both the create-time and edit-time
   Gallery-to-Client assignment blocks entirely.** A live AC-41.2.2/
   AC-41.2.3 assignment call will silently no-op — return `200`, write no
   row — unless this flag is turned on for this deployment. Turning it on
   is not a narrow toggle: `customerAccountsService.js:1169-1171` names it
   as the master gate for the entire customer-facing login/dashboard/
   accept-invite/reset surface, which CLAUDE.md's "there is no fourth
   surface" rule and `SYSTEM_OWNERSHIP.md`'s "Client-facing portal |
   Project Room only" row both govern. **Decision needed:** whether to
   enable `customerPortal` on this deployment (and accept that it also
   exposes those other customer-facing routes), or find/build a
   narrower path to `setAssignmentsForEvent` that does not carry that
   surface with it. Neither option is this map's or any single AC's call.

No other question surfaced a gap requiring a Product Owner decision.
Question 2's own inference (that the Project link might not exist as a
flow at all) was checked and does **not** hold — `projectService.assignEvent`
is a live, working, correctly-gated mechanism — so it is recorded above as
a correction, not routed here.

## NOT COVERED

- **Whether `event_customer_assignments` writes should be wrapped in the
  same transaction as the `events` row update.** Recorded as a fact
  (question 6's caveat) — fixing the missing shared transaction, if it is
  ever judged worth fixing, is not this AC's decision or edit.
- **Enabling `customerPortal` on this deployment**, or building any
  narrower alternative path to the assignment mechanism. Both are named
  under "Findings routed to `pending_po_routing`" above, not decided or
  built here.
- **AC-41.2.2's actual live assignment call and AC-41.2.3's actual live
  assertion.** This map names the request shape, the credential, the
  Gallery-must-exist-first ordering, and the two silent-failure hazards
  those ACs must guard against — it does not perform any of those calls
  itself. The one live command this map runs is the question-5 feature-flag
  probe transcribed verbatim above.
- **Whether `adminEvents-enhanced.js` should be deleted.** It is confirmed
  dead, unmounted, and unrequireable (question 1) — removing it is a
  housekeeping decision for whichever AC or story owns dead-code cleanup,
  not this one.
- **The Payload/React frontend rendering of any of this.** Out of scope —
  this map covers only the backend mechanisms a live assignment call and
  its read-backs would use.
