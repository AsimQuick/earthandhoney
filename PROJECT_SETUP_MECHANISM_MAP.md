<!--
---
file: PROJECT_SETUP_MECHANISM_MAP.md
project: earthandhoney
purpose: AC-41.1.1 — maps the mechanism behind each of PRD 22.3's ten
         automatic-Project-setup items against the pinned fork, before any
         live create is attempted, in the shape AC-39.3.1's
         NEXT_ACTION_CROSS_SURFACE_MAP.md established. Answers a closed
         list of twelve questions; every answer carries a file and line
         from the pinned commit, never a claim from PRD prose or from the
         projectSetupService.js draft an earlier, out-of-sequence AC-41.1
         attempt wrote (that file's own claims are treated here as a
         hypothesis to verify, not as a source, regardless of its own
         commit status on this branch). It ships no service, no route and
         no behaviour — a mechanism found missing or broken here is
         recorded as a finding, not silently patched or worked around.
created-by: dev-team
related-story: US-41
related-ac: 41.1.1
---
-->

# Project Setup Mechanism Map

Twelve questions, answered against the pinned fork commit
(`vendor/picpeak`, pinned at `eb263137b98935754155824de2a03848121304b6` per
`PICPEAK_UPSTREAM.md` §1 / US-15, dated 2026-07-31) as it stands on this
branch — i.e. that upstream baseline plus every fork-origin migration and
service US-38/US-39/US-40 have since added (this branch's HEAD at the time
of writing is `7ec4bb4`). Every claim below was verified by opening the
named file at the named line, or, for the three storage-backend claims in
the "answers that would be wrong if assumed" section, by running a command
directly against the live `earthandhoney-backstage-backend-1` container —
never inferred from a comment, this file's own prose, PRD wording, or
another document's summary.

**A note on the projectSetupService.js draft.** Three files —
`vendor/picpeak/backend/src/services/projectSetupService.js` and its two
companion test files (`src/__tests__/us41-ac41.1-project-setup-service.test.ts`,
`src/__tests__/us41-ac41.1-project-setup-live-proof.test.ts`) — were an
earlier, out-of-sequence attempt at the full AC-41.1 live create, written
before this mapping AC existed — the same situation
`NEXT_ACTION_CROSS_SURFACE_MAP.md`'s own "operational hazard" section and
commit `0f914eb` record for the analogous AC-39.3 → AC-39.3.1 split. They
were uncommitted in this working tree at the moment this map was first
written and verified; a later follow-up commit on this branch (`e18fb64`,
"dev agent did not commit") swept them into git history without this
map's review, silently expanding `vendor/picpeak/backend/src` beyond the
pinned commit's own content and leaving two suites this branch's other
inventories did not know about — breaking AC-17.4.1.1.1.1.1.1's pinned-tree
grep counts and AC-30.1's suite manifest, neither of which this AC is
meant to touch. A subsequent commit on this branch removed all three files
again to restore this AC's own stated scope ("ships no service, no route
and no behaviour") and both inventories' accuracy. That round trip does
not change this map's own treatment of the draft: it remains unused as
evidence and untouched by this document, out of this AC's scope, exactly
as `0f914eb` treated the equivalent
`nextActionRules.js`/`nextActionService.js` pair. Several of this draft's
own in-file claims turned out to be useful leads and are verified
independently below (against the file's content as read while it existed
on this branch); one — `ENTRY_TYPES.PROJECT_CREATED`
(`projectSetupService.js:238`) — is verified **wrong**: see item 10.

## PRD 22.3's ten items, in the PRD's own order

For each item: (a) the existing fork mechanism that satisfies it, and (b)
whether setup would CREATE a row/object for it or merely make it
ADDRESSABLE. Three of the ten — 6, 7 and 8 — have nothing to insert at
create time, for three different structural reasons given under each.

### 1. Project record

**(a)** `projectService.createProject` (`vendor/picpeak/backend/src/services/projectService.js:63-74`):
one `db('projects').insert({ name, customer_account_id, status: 'active',
created_at, updated_at })`, called from `POST /` (`adminProjects.js:36-39`).
**(b) CREATES.** This is the literal insert; nothing else in this map is
possible before it.

### 2. Operational client relationship

**(a)** The FK column `projects.customer_account_id`
(`vendor/picpeak/backend/migrations/core/117_add_projects.js:32-33`,
`table.integer('customer_account_id').unsigned().references('id')
.inTable('customer_accounts').onDelete('SET NULL')`), nullable. `POST /`
already accepts an optional `customerAccountId` body field
(`adminProjects.js:33`, `body('customerAccountId').optional({ values:
'falsy' }).isInt({ min: 1 })`) and `createProject` writes it straight onto
the new row if supplied (`projectService.js:67`). Establishing the
relationship when the caller does **not** already have a `customerAccountId`
— the common case for a brand-new inquiry — requires
`customerAccountsService.createDirect`
(`vendor/picpeak/backend/src/services/customerAccountsService.js:197-256`),
the existing passive-customer-creation path US-18 AC-18.4 already ships,
called with the primary contact's email.
**(b) CREATES.** Either a new `customer_accounts` row (`createDirect`) or,
at minimum, a non-null write to `projects.customer_account_id` — there is
no default relationship without a write of some kind, so this item can
never be satisfied by mere addressability.

### 3. Empty project media area/folder

**(a)** The storage abstraction's `put()`, reached through
`getStorage()` (`vendor/picpeak/backend/src/services/storage/index.js:65-70`),
which returns whichever backend `STORAGE_BACKEND` selects
(`storage/index.js:31-58`). The one existing in-fork precedent for calling
it directly, rather than raw `fs`, is `watermarkService.js:280`
(`await getStorage().put(relativePath, watermarkedBuffer, {...})`).
**(b) CREATES — a zero-byte marker object, not merely addressable.** This
is a genuine structural requirement, not a stylistic choice: unlike a SQL
table row scoped by a foreign key (items 6/7/8 below), an S3-compatible
key-value store has no real directory concept. `list('projects/{id}/media/')`
against zero written objects returns an empty array — indistinguishable
from "this Project has no media folder" and "this Project's media folder
was never prepared." Only a written object (even zero bytes) makes the
prefix observably exist. Confirmed live (see the storage-backend answer
below): `getStorage().put('…/.keep', Buffer.alloc(0))` followed by
`exists()` returning `true` against this deployment's real backend.

### 4. Project Room access record

**(a)** `customerAccountsService.createInvitation`
(`customerAccountsService.js:101-170`) — writes one `customer_invitations`
row (`vendor/picpeak/backend/migrations/core/090_add_customer_accounts.js:79-81`
for the table; columns include `email`, `token`, `invited_by`,
`expires_at`, `prefill_data`) and queues the invite email via `queueEmail`
(`customerAccountsService.js:157-160`) — **unless** the client already has
`password_hash` set on their `customer_accounts` row (an existing active
login), in which case that row already **is** the access record and
nothing new is written (`createInvitation` itself 409s on a duplicate
active email, `customerAccountsService.js:110-113`).
**(b) CREATES, in the common case.** For a brand-new client (the normal
shape of a fresh Project) a `customer_invitations` row must be inserted;
only the already-has-an-account case is addressable-only. See "what a
'Project Room access record' actually IS," below, for why this item does
not name a dedicated per-Project table.

### 5. Default phase and milestones

**(a)** The phase half needs no insert: `projects.current_phase` defaults
to `'lead'` on the column itself
(`vendor/picpeak/backend/migrations/core/122_add_project_new_project_fields.js:85-86`,
`table.string('current_phase', 24).notNullable().defaultTo('lead')`), so
item 1's own bare insert already sets it. The milestones half is a real
write: migration 124's eighteen `project_id IS NULL` template rows
(`vendor/picpeak/backend/migrations/core/124_add_project_milestones.js:31-49`
for the PRD 23.2 list, `:53-69` for the table) must be cloned into this
Project's own rows — the exact clone migration 124's own header comment
defers to "later, by US-41's atomic Project-setup path."
**(b) CREATES.** The phase is free (a column default fired by item 1's own
insert), but eighteen `project_milestones` rows are a genuine, mandatory
set of inserts — net CREATES.

### 6. Next-action calculation

**(a)** `nextActionService.computeProjectNextAction`
(`vendor/picpeak/backend/src/services/nextActionService.js:87-107`,
US-39 AC-39.3.2) — reads `projects.current_phase` plus
`project_milestones`/`project_booking_requirements` and returns a computed
string via `resolveNextAction` (`nextActionRules.js`). The same function
reference both `GET /api/admin/projects/:id/next-action`
(`adminProjects.js:119-135`) and `GET /api/customer/projects/:id/next-action`
(`customer.js:738-767`) call.
**(b) ADDRESSABLE only — nothing is ever inserted for it.** There is no
`next_action` table or column anywhere in the schema; the value is
recomputed on every read from item 1's phase and item 5's milestone rows.
No implementation of "prepare the next-action calculation" could
legitimately insert a row for it — it doesn't have one to insert into.

### 7. Document area

**(a)** `project_documents`
(`vendor/picpeak/backend/migrations/core/125_add_project_documents_and_integration_status.js:66-78`),
scoped by `project_id`, cascade-deleted with the Project. No service reads
or writes it yet (confirmed: no `project_documents` reference anywhere
under `vendor/picpeak/backend/src/routes/` or `src/services/` other than
the draft's `getProjectDocuments` helper, which itself performs
only a `SELECT`).
**(b) ADDRESSABLE only.** The migration's own docstring says so directly:
"Both tables are additive and carry no data of their own yet" (migration
125, lines 55-58) — and unlike item 3's blob-storage prefix, a SQL table
scoped by a NOT NULL foreign key to `projects` has no empty-vs-nonexistent
ambiguity: `SELECT * FROM project_documents WHERE project_id = X` on a real
Project always returns a well-defined, correctly-empty result set with no
marker row required. There is no document at Project-creation time to
attach, so there is nothing to insert.

### 8. Email merge context

**(a)** There is no dedicated "project email merge context" table or
object anywhere in the fork. The nearest existing mechanism is
`queueEmail`'s own `emailData` parameter
(`vendor/picpeak/backend/src/services/emailProcessor.js:959-1007`),
serialized as-is into `email_queue.email_data` (JSON) — see the merge
mechanism answer below for the full path. `customerAccountsService
.createInvitation` already demonstrates the pattern for item 4's
invitation email: it builds `{ invite_link, expires_at }` inline
(`customerAccountsService.js:157-160`) from data already on hand, not from
a separately prepared or stored "context" object.
**(b) ADDRESSABLE only.** "Preparing" a merge context needs no write of
its own, independent of whether any email actually fires: the fields a
Project-related email would merge — project name, phase, venue, the
client's name/email — are already columns on `projects`/`customer_accounts`
the moment items 1 and 2 are written. There is nothing to insert that
items 1 and 2 don't already provide, and no email-context row is ever
created purely to "prepare" it in advance of an actual send.

### 9. Financial integration placeholder

**(a)** `project_integration_status`
(`vendor/picpeak/backend/migrations/core/125_add_project_documents_and_integration_status.js:82-94`),
the same migration as item 7, scoped by `project_id` + `integration_key`,
carrying `status` (`'success' | 'pending' | 'failure'`, app-level
vocabulary per migration 125's own docstring, lines 43-45) and a nullable
`message`.
**(b) CREATES.** PRD 22.3's own word for this item is "placeholder," not
"area" — a placeholder is a thing, and migration 125's docstring names it
as a row "written by later stories (US-41's atomic Project setup...)"
(lines 55-57), explicitly assigning this AC's story the insert. One row,
`integration_key: 'financial_placeholder'`, `status: 'pending'`, naming no
external system, is what "prepares" this item — unlike item 7's sibling
table, there is something real to insert here.

### 10. Activity timeline

**(a)** `activityTimelineService.appendActivityTimelineEntry`
(`vendor/picpeak/backend/src/services/activityTimelineService.js:48-50`),
the single shared append function US-39 AC-39.6.2 already built and wired
into every write route (`adminProjects.js`'s `PUT /:id/phase`,
`PUT /:id/milestones/:key/complete`, `PUT /:id/next-action/override`),
inserting into `project_activity_timeline`
(`vendor/picpeak/backend/migrations/core/128_add_project_activity_timeline.js:45-57`).
**(b) CREATES — but the entry-type constant this item needs does not exist
yet.** `entry_type` is a free `table.string('entry_type', 64)` at the
database level (migration 128, line 49), so nothing at the DB layer stops
any string being written. But the project's own single-authority
convention is `ENTRY_TYPES`
(`vendor/picpeak/backend/src/services/activityTimelineEntry.js:26-30`),
which at the pinned commit holds exactly three members —
`PHASE_CHANGE`, `MILESTONE_COMPLETED`, `NEXT_ACTION_OVERRIDE_SET` — and no
fourth entry for "a Project was created." **This is where the draft is
verified wrong**: `projectSetupService.js:238-241` calls
`activityTimelineService.appendActivityTimelineEntry(..., ENTRY_TYPES
.PROJECT_CREATED, ...)`, but `ENTRY_TYPES.PROJECT_CREATED` does not exist
in the committed `activityTimelineEntry.js` — that expression evaluates to
`undefined` at runtime, which is what would actually get inserted into
`entry_type`, silently, rather than a real value. Whichever AC implements
item 10 for real must first add a fourth `ENTRY_TYPES` member (matching
`activityTimelineEntry.js:23-25`'s own stated reason for the enum: "a
single authority so a typo'd literal string can never silently create a
fourth, unrecognised kind") before calling `appendActivityTimelineEntry`
with it.

## 11. The create route's request and response shape as it stands

Verified directly against `vendor/picpeak/backend/src/routes/adminProjects.js`:

- **Mount + gate:** `router.use(adminAuth)` (`adminProjects.js:19`);
  `POST /` gated on `requirePermission('events.manage')`
  (`adminProjects.js:31-32`).
- **Request body validated:** exactly two fields —
  `body('name').isString().trim().isLength({ min: 1, max: 255 })` and
  `body('customerAccountId').optional({ values: 'falsy' }).isInt({ min: 1 })`
  (`adminProjects.js:33`). Nothing else in the request body is read or
  validated.
- **Handler body** (`adminProjects.js:34-41`): `validateRequest(req)`, then
  `projectService.createProject({ name: req.body.name, customerAccountId:
  req.body.customerAccountId || null }, req.admin.id)`
  (`adminProjects.js:36-39`), then `successResponse(res, { project }, 201,
  'Project created')` (`adminProjects.js:40`).
- **What `createProject` actually does** (`projectService.js:63-74`): one
  `db('projects').insert({ name, customer_account_id, status: 'active',
  created_at, updated_at })`, then re-reads and returns the row via
  `getProjectById` (`projectService.js:54-61`, which also left-joins
  `customer_accounts.email` for display).
- **Response shape:** `{ success: true, message: 'Project created',
  data: { project: { id, name, customerAccountId, customerEmail, status,
  eventCount: undefined, createdAt, updatedAt } } }` (the `transformProject`
  shape, `projectService.js:19-31`, wrapped by `successResponse` — see
  `vendor/picpeak/backend/src/utils/routeHelpers.js` for that helper's own
  envelope, not reproduced here since this AC's scope is the create path
  itself).

**Conclusion, matching this AC's own framing verbatim:** item 1 of the ten
is the whole of what a create does today. None of items 2-10 above are
touched by this route or by `createProject` — `req.admin.id` is accepted as
a parameter but is never used inside `createProject` for anything (no
actor is recorded anywhere; there is no activity-timeline call at all on
this path).

## 12. Which read-back route each live assertion will need, and which are absent

The full route list in `adminProjects.js`, in file order, and what each
would let a live AC-41.1 assertion read back:

| Route | Line | Would read back |
|---|---|---|
| `GET /` | 22 | Project list (not per-item) |
| `POST /` | 31 | item 1 (create itself) |
| `GET /:id` | 45 | item 1 (Project record) |
| `PUT /:id` | 53 | item 2 (client relationship, write only) |
| `POST /:id/events` | 73 | not a setup item |
| `GET /:id/overview` | 84 | rolled-up money docs, not a setup item |
| `GET /email/:emailId/preview` | 96 | one email's rendered body, not item 8's context |
| `GET /:id/next-action` | 119 | **item 6** |
| `PUT /:id/next-action/override` | 147 | not a setup item (US-39 AC-39.5) |
| `PUT /:id/phase` | 205 | item 5's phase half (write only) |
| `PUT /:id/milestones/:key/complete` | 244 | item 5's milestone half (write only) |
| `GET /:id/timeline` | 280 | **item 10** |

`customer.js` adds exactly one more Project-scoped route,
`GET /projects/:id/next-action` (`customer.js:738-767`) — the Project
Room's half of item 6, not a new read.

**Absent — no route of any kind exists for these, confirmed by a
case-sensitive search of both route files for each table/concept name:**

- **item 3 (media folder)** — no `GET` of any kind for a media-folder key
  or `exists()` status. `getStorage` is never required in either route
  file.
- **item 4 (Project Room access record)** — no route reads
  `customer_invitations` or a Project-scoped access state; the nearest
  thing, `customer.js`'s own login/accept-invitation routes, are not
  Project-scoped at all (see the access-record answer below).
- **item 5's milestone list** — `PUT /:id/milestones/:key/complete`
  writes one milestone; nothing reads the full per-Project set back (no
  `GET /:id/milestones`).
- **item 7 (document area)** — no `GET /:id/documents` or equivalent;
  `project_documents` has no route at all.
- **item 9 (financial integration placeholder)** — no
  `GET /:id/integration-status` or equivalent; `project_integration_status`
  has no route at all.

A live AC-41.1 test can assert items 1, 6 and 10 (and item 5's phase half,
indirectly, via item 6's `phase` field) through routes that exist today.
Items 3, 4, 5's-milestone-list, 7 and 9 have no live read-back path at all
without a new route each — a fact this AC records as a finding, not a
defect this AC fixes.

## Three answers that would be wrong if assumed

### A. Which storage backend this deployment is configured for, and whether a zero-byte write succeeds

**This deployment runs `STORAGE_BACKEND: s3`, not local, against Cloudflare
R2** (`docker-compose.yml:101-108`: `STORAGE_BACKEND: s3`,
`STORAGE_S3_BUCKET: ${R2_BUCKET}`, `STORAGE_S3_ENDPOINT: ${R2_ENDPOINT}`,
`STORAGE_S3_PREFIX: backstage`, `STORAGE_S3_FORCE_PATH_STYLE: "true"`),
confirmed against the actually-running container rather than assumed from
the compose file alone:

```
$ docker exec earthandhoney-backstage-backend-1 sh -c "cd /app && node -e \"
const { getStorage } = require('./src/services/storage');
(async () => {
  const s = getStorage();
  console.log('backend kind:', s.kind());
  const key = 'ac41.1.1-probe/.keep';
  await s.put(key, Buffer.alloc(0));
  const exists = await s.exists(key);
  console.log('zero-byte put succeeded, exists:', exists);
  await s.delete(key);
  const existsAfterDelete = await s.exists(key);
  console.log('deleted, exists now:', existsAfterDelete);
})().catch(e => { console.error('PROBE FAILED:', e.message); process.exit(1); });
\""
backend kind: s3
zero-byte put succeeded, exists: true
deleted, exists now: false
```

A zero-byte write through the generic storage abstraction (`getStorage()
.put()`/`.exists()`/`.delete()`) **succeeds cleanly** against the real R2
backend — F6/F7's EACCES finding does **not** reproduce here. The reason
is mechanism, not luck: F6/F7's EACCES comes from Gallery-create's own
folder-creation code, which never calls the storage abstraction at all —
it computes a **local filesystem path** directly and calls raw `fs.mkdir`
on it, unconditionally, regardless of `STORAGE_BACKEND`:

```
adminEvents.js:609   const storagePath = process.env.STORAGE_PATH || path.join(__dirname, '../../../storage');
adminEvents.js:610   const eventPath = path.join(storagePath, 'events/active', slug);
adminEvents.js:611   await fs.mkdir(path.join(eventPath, 'collages'), { recursive: true });
adminEvents.js:612   await fs.mkdir(path.join(eventPath, 'individual'), { recursive: true });
```

Since `STORAGE_S3_*` is set and `STORAGE_PATH` is not
(`docker-compose.yml:101-108` never sets `STORAGE_PATH`), this code falls
back to a path inside the container that is not writable, reproducing
F6/F7's EACCES — a bug in Gallery-create's own bypass of the storage
abstraction, not in the abstraction itself. Item 3's mechanism above
(`getStorage().put()`, matching the one existing precedent at
`watermarkService.js:280`) is provably unaffected, live, right now.

### B. What a "Project Room access record" actually IS at the pinned commit

**There is no dedicated table or row type named or shaped like a
"Project Room access record."** `NEXT_ACTION_CROSS_SURFACE_MAP.md` (AC-39.3.1,
question 2) recorded that *no* customer-side Project route existed at all
at that map's time of writing — true then, but **no longer true now**:
AC-39.3.2 (a later story on this same branch) added exactly one,
`GET /api/customer/projects/:id/next-action` (`customer.js:738-767`). That
route's own scoping is the whole answer to what "access" means here: it
selects `projects` `WHERE id = :id AND customer_account_id = req.customer.id`
(`customer.js:748-752`), returning a non-disclosing `404` (not `403`) for a
Project that exists but isn't the caller's
(`customer.js:729-731` comment, `:753-755` code). There is no separate
per-Project grant, junction row, or ACL entry being checked — ownership
**is** the equality test on the same `customer_account_id` foreign key
item 2 above establishes.

So "Project Room access record" resolves, at this pinned commit, to
**whichever of item 2's own objects lets the client authenticate at all**:
either an existing active `customer_accounts` row (`password_hash` set,
`customerAuth` middleware — `vendor/picpeak/backend/src/middleware/customerAuth.js:19`
— accepts a login against it), or a pending `customer_invitations` row
(`customerAccountsService.createInvitation`, item 4's mechanism) that has
not yet been accepted. Once that login exists, **every** Project scoped to
that `customer_account_id` is reachable through it — access is
per-customer, not per-Project. Assuming a dedicated per-Project access
table exists, or that item 4 creates anything beyond an invitation/account
row already covered by items 2 and 4's own mechanisms, would be wrong.

### C. The Backstage email queue's own merge mechanism

Answered once here, per this AC's own instruction, so AC-41.5 cites this
section rather than re-deriving it. The full path, entry to render:

1. **Entry point:** `queueEmail(eventId, recipientEmail, emailType,
   emailData, options)` (`emailProcessor.js:959-1007`) inserts one
   `email_queue` row with `email_data: JSON.stringify(emailData)`
   (`emailProcessor.js:963-971`) and `status: 'pending'`. `emailData` —
   a flat object of merge variables — **is** the merge context; there is
   no separate "context" object stored anywhere else (confirming item 8's
   answer above).
2. **Processor:** `processEmailQueue` (`emailProcessor.js:785-888`) polls
   `email_queue` for pending rows and, per row, `JSON.parse`s
   `email_data` back into a plain object (`emailProcessor.js:838-840`)
   and calls `sendTemplateEmail(recipient_email, email_type, emailData)`
   (`emailProcessor.js:842-846`).
3. **Template load + merge:** `sendTemplateEmail`
   (`emailProcessor.js:706` onward) loads the template row and calls
   `processTemplate(template, variables, language)`
   (`emailProcessor.js:503-703`), which loads the subject/HTML/text body
   for the resolved language (`email_template_translations`, falling back
   to legacy columns, `emailProcessor.js:513-548`), applies some built-in
   variable transforms (date formatting, password-security placeholder
   text, `welcome_message` HTML formatting — `emailProcessor.js:550-612`),
   then calls the actual merge function on each of subject/HTML/text:
   ```
   emailProcessor.js:614   subject = safeTemplateReplace(subject, processedVariables);
   emailProcessor.js:615   htmlBody = safeTemplateReplace(htmlBody, processedVariables, { escapeHtml: true });
   emailProcessor.js:616   textBody = safeTemplateReplace(textBody, processedVariables);
   ```
4. **The merge primitive itself:** `safeTemplateReplace`
   (`emailProcessor.js:477-500`) — a small, non-Turing-complete string
   substitution: `{{#if var}}…{{/if}}` conditional blocks resolved first,
   then `{{var}}` replaced from the variables map (left as the literal
   `{{var}}` text if the key is absent), with an explicit HTML-escape
   option for HTML bodies (`emailProcessor.js:490-499`) and a
   passthrough allowlist (`HTML_PASSTHROUGH_KEYS`, `emailProcessor.js:450-459`)
   for values that are themselves server-generated HTML/URLs.

**This is the one and only merge mechanism in the fork.** `createInvitation`
(item 4) already exercises the exact same path — `queueEmail(null,
normalisedEmail, 'customer_invitation', { invite_link, expires_at })`
(`customerAccountsService.js:157-160`) — so any Project-setup-triggered
email (the invitation email item 4 sends, or any future Project-created
notification) is required, by AC-41.5's own wording ("no second templating
or merge system may be introduced"), to build its variables object and
pass it through this same `queueEmail` → `processEmailQueue` →
`sendTemplateEmail` → `processTemplate` → `safeTemplateReplace` chain,
never a parallel renderer.

## NOT COVERED

- **Whether the phase/milestone/booking-requirement clone (item 5),
  the financial-placeholder insert (item 9), the media-folder marker
  (item 3), or the activity-timeline entry (item 10, once `ENTRY_TYPES` is
  extended) should be one transaction, several, or atomic at all.** That
  is AC-41.4's question, not this map's; this map records only which
  mechanism does the writing, not what wraps it.
- **Adding the missing `ENTRY_TYPES.PROJECT_CREATED` member.** Item 10's
  finding is recorded, not fixed — `activityTimelineEntry.js` is not
  edited by this AC.
- **Adding any of the five absent read-back routes item 12 names**
  (media-folder status, milestone list, document area, integration
  status, and — separately — a Project Room-side equivalent of any of
  these). Building them is whichever AC actually needs them to prove a
  live create, not this one.
- **The three projectSetupService.js draft files' correctness beyond the
  one claim checked (item 10's `ENTRY_TYPES.PROJECT_CREATED`).** They were
  read as a source of leads, not verified line-by-line, and remain
  untouched by this map and out of its scope — their later, out-of-sequence
  commit to this branch (`e18fb64`) did not constitute AC-41.1 being
  implemented or reviewed, and their subsequent removal from this branch
  does not constitute AC-41.1 being abandoned either: the draft's leads
  remain cited above, and whichever AC implements item 10 for real can
  still consult this map's item 10 finding without needing the file back.
- **Fixing F6/F7 at the source level** (removing Gallery-create's local-fs
  fallback in `adminEvents.js`). Recorded as reproduced and explained
  above; `po-requests.md`'s existing disposition for F6/F7 (schedule fork
  work) is unchanged by this map.
- **The Payload/React frontend rendering of any of this.** Out of scope —
  this map covers only the backend mechanisms a live setup call and its
  read-backs would use.
- **Live command output as evidence, beyond the storage probe.** All ten
  item answers and questions 11-12 are static file:line citations against
  the pinned commit and this branch's own source, per this AC's evidence
  clause. The only command actually run against the live stack while
  producing this document is the storage probe transcribed verbatim
  above.
