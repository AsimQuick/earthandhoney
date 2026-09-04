<!--
---
file: FORK_CHANGELOG.md
project: earthandhoney
purpose: AC-15.5 — initialised with the pinned baseline; the place every
         deliberate deviation from upstream PicPeak gets recorded, so drift
         from the pinned commit is always traceable to a dated, named
         reason rather than discovered by diffing later.
created-by: dev-team
related-story: US-15
related-ac: 15.5
---
-->

# Fork Changelog

This file is the place every deliberate deviation from upstream gets
recorded, initialised with the pinned baseline from `PICPEAK_UPSTREAM.md`.
It is **not** a record of upstream's own history — that lives in
`PICPEAK_UPSTREAM.md` (the pin) and upstream's own commit log. It is the
record of what *this fork* changed relative to that pin, and why.

Every entry has a date, a type (`baseline` or `deviation`), a summary, and —
for `deviation` entries — the files it touched. This shape is enforced by
`validateChangelogEntry` in `src/lib/forkChangelog.ts`: a `deviation` entry
that names no files is rejected, because an untraceable deviation is
indistinguishable from silent drift from upstream, which is exactly what
this changelog exists to prevent.

New entries are added to the top of the log (most recent first).

A `deviation` entry that exists only to work around an upstream *bug* also
gets an entry in `PICPEAK_UPSTREAM_DEFECTS.md` and is flagged
drop-rather-than-merge in `UPSTREAM_SYNC.md` §4, so it is never mistaken at
sync time for a permanent, project-specific deviation.

---

## 2026-09-05 — `deviation`

**Creating a Project through `POST /api/admin/projects` now runs one shared
setup path for the other nine items PRD 22.3 names, instead of only
inserting the `projects` row.** `PROJECT_SETUP_MECHANISM_MAP.md` (US-41
AC-41.1.1) established, item by item and against this pinned commit, which
existing fork mechanism satisfies each of PRD 22.3's ten automatic-setup
items, and recorded that item 1 — `projectService.createProject`'s own
insert — was the whole of what a create did. AC-41.1.2.1 wires the rest in:
one entry point, `projectSetupService.completeProjectSetup`, that the
create handler calls once, immediately after `createProject` — one create
call, one setup path, not ten call sites that happen to agree, the same
single-authority shape AC-39.3.2 established for the next-action
computation and AC-39.6.2 for the activity timeline.

- **Type:** additive deviation — two new service files, one new
  `ENTRY_TYPES` member, and the existing `POST /` handler extended. No
  migration is added and no already-shipped migration is touched.
- **What changed:**
  1. New `vendor/picpeak/backend/src/services/projectSetupRules.js` — the
     pure half: the deterministic media-area marker key, the shape of a
     cloned milestone row, the shape of the financial-placeholder row, and
     the timeline summary text. It requires nothing, so it is unit-testable
     without Docker, the same pure/DB-backed split `nextActionRules.js` and
     `activityTimelineEntry.js` established. AC-41.1.2.1.
  2. New `vendor/picpeak/backend/src/services/projectSetupService.js` —
     `completeProjectSetup(project, request, actor)`, the one DB- and
     storage-backed entry point, covering the map's items 2 (client
     relationship, through `customerAccountsService` and
     `projectService.updateProject`), 3 (media area, through
     `getStorage().put()` only — never the raw `fs.mkdir` that causes
     F6/F7's EACCES in Gallery-create), 4 (Project Room access, reusing
     `customerAccountsService.createInvitation` including its own duplicate
     guard, and with it item 8's merge context via the email queue's own
     `queueEmail`), 5's milestone half (cloning migration 124's eighteen
     `project_id IS NULL` template rows), 9 (one migration-125
     `project_integration_status` placeholder row naming no external
     system) and 10 (one timeline entry through the shared
     `activityTimelineService`). Items 1, 6, 7 and 8 need no code of their
     own, for the structural reasons the map gives under each.
     AC-41.1.2.1.
  3. `vendor/picpeak/backend/src/services/activityTimelineEntry.js` gains a
     fourth `ENTRY_TYPES` member, `PROJECT_CREATED: 'project_created'`.
     The map's item 10 recorded that the enum held exactly three members,
     so an append call referencing `ENTRY_TYPES.PROJECT_CREATED` would
     evaluate to `undefined` and silently insert that; the member is added
     in that one file, matching its own stated reason for the enum, before
     any call site uses it. AC-41.1.2.1.
  4. `vendor/picpeak/backend/src/routes/adminProjects.js`'s `POST /`
     handler requires the one setup module inline, validates exactly one
     new optional body field (`primaryContactEmail`, alongside the existing
     `name`/`customerAccountId` pair), calls `completeProjectSetup` once
     after `createProject` passing `req.admin` as the actor, and re-reads
     the Project so the 201 response reflects a client relationship setup
     assigned. A create supplying neither `customerAccountId` nor
     `primaryContactEmail` is rejected by the setup path with a
     `ValidationError`, rather than producing a Project that fails item 2.
     The block is deliberately packed to **zero added lines**, and requires
     its service inline, so no line number `PIVOT_AUDIT.md` or the US-17
     suites cite against this pinned file shifts — the same reason
     `GET /:id/next-action` gives for its own inline requires.
     AC-41.1.2.1.
- **Files touched:**
  - `vendor/picpeak/backend/src/services/projectSetupRules.js` — new — the
    pure shapes; requires nothing. AC-41.1.2.1.
  - `vendor/picpeak/backend/src/services/projectSetupService.js` — new —
    the single `completeProjectSetup` entry point. AC-41.1.2.1.
  - `vendor/picpeak/backend/src/services/activityTimelineEntry.js` —
    additive — fourth `ENTRY_TYPES` member, `PROJECT_CREATED`.
    AC-41.1.2.1.
  - `vendor/picpeak/backend/src/routes/adminProjects.js` — additive, zero
    net lines — `POST /` validates `primaryContactEmail` and calls the one
    setup path. AC-41.1.2.1.
  - `src/__tests__/us41-ac41.1.2.1-project-setup-single-path.test.ts` —
    new — drives the pure rules module directly and asserts from source
    that the create handler calls the one setup path exactly once, after
    `createProject`, with `req.admin` as the actor, and that it is that
    function's only call site anywhere under the fork backend's `src/`.
  - `src/__tests__/us39-ac39.6.2-shared-activity-timeline.test.ts` —
    amended — AC-39.6.2's exhaustive `ENTRY_TYPES` assertion now also
    names the fourth member this deviation adds.
  - `TEST_LANE_INVENTORY.json` / `TEST_LANE_CLASSIFICATION.md` — the new
    suite registered as UNIT (259 total, 228 unit).
- **Evidence:** the new test file above. Behaviour against a running stack
  is AC-41.1.3's live lane, not this deviation's; this one is proven
  structurally, because `projectSetupService.js` requires
  `../database/db` and is therefore never `require()`-d in a unit suite,
  matching every other DB-backed service in this fork.

---

## 2026-08-16 — `deviation`

**The fork's backend now has its own read of PRD 23.3's five status states,
sourced from the framework-free design-token export rather than a second,
independent definition.** US-40 AC-40.1 locked the five states (green
complete, amber waiting/pending, blue in progress, red blocked/overdue/
action required, grey upcoming) as `src/lib/statusVocabulary.ts`, the one
Frontstage-side definition. AC-40.5 requires that vocabulary be available to
both surfaces from that one definition, not implemented twice; since the
fork's backend cannot import a TypeScript/Next.js-coupled module directly,
this deviation adds one new file that reads the framework-free export
`exports/design-tokens/status-vocabulary.json` (itself generated from
`statusVocabulary.ts`, following the export path AC-23.6 established for the
design tokens) and re-exports the same five states for future cockpit/
Project Room route handlers (US-43, US-44) to consume without redefining
them.

- **Type:** additive deviation — one new file, no route wired to it yet, no
  vendored route or migration touched.
- **What changed:**
  1. New `vendor/picpeak/backend/src/services/statusVocabulary.js` requires
     `exports/design-tokens/status-vocabulary.json` by relative path and
     re-exports `STATUS_STATES`, `STATUS_STATE_KEYS` and
     `isValidStatusStateKey`. It requires nothing else — no database, no
     other service — so it is unit-testable without Docker. AC-40.5.
  2. New `src/lib/statusVocabularyExport.ts` and
     `scripts/generate-status-vocabulary-export.ts` (`npm run
     status-vocabulary:export`) generate the checked-in export from the one
     definition, the same split `tokenExport.ts` /
     `generate-design-tokens-export.ts` established for AC-23.6. AC-40.5.
- **Files touched:**
  - `vendor/picpeak/backend/src/services/statusVocabulary.js` — new. AC-40.5.
  - `src/lib/statusVocabularyExport.ts` — new — pure export generator.
    AC-40.5.
  - `scripts/generate-status-vocabulary-export.ts` — new — regeneration CLI.
    AC-40.5.
  - `exports/design-tokens/status-vocabulary.json` — new — the generated,
    checked-in framework-free export. AC-40.5.
  - `src/__tests__/us40-ac40.5-status-vocabulary-single-definition.test.ts`
    — new — asserts the export reproduces the live definition (empty
    diff), that both the Frontstage and fork consumers import it from that
    one place rather than redefining it, and repository-scans for a second
    parallel definition of the five states.
- **Evidence:** the above test file. This deviation adds no migration and
  modifies no already-shipped migration or route.

---

## 2026-08-16 — `deviation`

**A Project's phase change, milestone completion and manual next-action
override now each append one entry to that Project's activity timeline,
all three through a single shared service.** PRD 22.3 and 23.4 require
every phase change, milestone completion and manual override to append an
entry to the Project's activity timeline (migration 128, AC-39.6.1.1's
schema-only `project_activity_timeline`). This AC wires that table up:
one append function (`activityTimelineService.appendActivityTimelineEntry`,
taking the Project, the entry type, the actor and what changed) that all
three write handlers require directly and call — never three call-site
inserts that happen to agree, the same single-authority shape AC-39.3.2
established for the next-action computation. A change that changes
nothing (setting the phase to its current value; re-completing an
already-complete milestone) appends no entry: `projectPhaseService.js` and
`projectMilestoneService.js` each detect the no-op via the pure
`projectChangeRules.js` and simply skip calling the timeline service,
rather than the timeline service silently deduplicating after the fact.

- **Type:** additive deviation — one new table now has a writer and a
  reader, two new cockpit write routes, one new cockpit read route, and an
  additive extension of AC-39.5's existing override route. No existing
  route's request/response contract for any prior AC is narrowed.
- **What changed:**
  1. New `PUT /api/admin/projects/:id/phase` (`events.manage`) sets
     `projects.current_phase` via `projectPhaseService.js`, then, only
     when the phase actually changed, the route itself appends one
     `phase_change` entry. AC-39.6.2.
  2. New `PUT /api/admin/projects/:id/milestones/:key/complete`
     (`events.manage`) marks one of a Project's own `project_milestones`
     rows complete via `projectMilestoneService.js`, then, only when it
     was not already complete, the route itself appends one
     `milestone_completed` entry. AC-39.6.2.
  3. `PUT /api/admin/projects/:id/next-action/override` (AC-39.5) now also
     appends one `next_action_override_set` entry after recording the
     override — every call is a deliberate photographer action, so this
     write route carries no no-op case. AC-39.6.2.
  4. New `GET /api/admin/projects/:id/timeline` (`events.view`) returns
     one Project's timeline entries oldest-first (by `id`, migration 128's
     own authoritative ordering column — not `occurred_at` alone, which
     two entries appended in the same request can share). AC-39.6.2.
  5. The shared service is split the same way AC-39.3.2 split
     `nextActionRules.js` from `nextActionService.js`:
     `activityTimelineEntry.js` is a pure module (no requires,
     unit-testable without Docker) shaping the inserted row, the
     read-back entry, and the oldest-first sort;
     `activityTimelineService.js` owns the database insert/select against
     migration 128's table. `projectChangeRules.js` is a second pure
     module deciding both no-op cases and building a real change's
     summary text; `projectPhaseService.js`/`projectMilestoneService.js`
     own the `projects`/`project_milestones` mutations only — neither
     requires or references the timeline service or table, keeping "one
     shared append function" true by construction rather than by
     convention. AC-39.6.2.
- **Files touched:**
  - `vendor/picpeak/backend/src/services/activityTimelineEntry.js` — new
    — pure entry-shape module. AC-39.6.2.
  - `vendor/picpeak/backend/src/services/activityTimelineService.js` —
    new — `appendActivityTimelineEntry`/`getProjectTimeline` against
    migration 128's table. AC-39.6.2.
  - `vendor/picpeak/backend/src/services/projectChangeRules.js` — new —
    pure no-op detection and summary-text module. AC-39.6.2.
  - `vendor/picpeak/backend/src/services/projectPhaseService.js` — new —
    `setProjectPhase`, the database-backed phase mutation. AC-39.6.2.
  - `vendor/picpeak/backend/src/services/projectMilestoneService.js` —
    new — `completeProjectMilestone`, the database-backed milestone
    mutation. AC-39.6.2.
  - `vendor/picpeak/backend/src/routes/adminProjects.js` — additive —
    new `PUT /:id/phase`, new `PUT /:id/milestones/:key/complete`, new
    `GET /:id/timeline`; `PUT /:id/next-action/override`'s handler
    extended to also append a timeline entry. AC-39.6.2.
  - `src/__tests__/us39-ac39.6.2-shared-activity-timeline.test.ts` — new —
    drives the two pure modules directly (entry shape, oldest-first sort,
    both no-op cases, a three-entries-appended-out-of-order-read-back-
    ordered simulation), and asserts from source that each of the three
    write handlers requires `activityTimelineService.js` directly, that
    the literal table name never appears in `adminProjects.js`, and that
    the two new mutation services never reference the timeline service or
    table themselves. It also pins the routes' placement: all four are
    registered after `router.use(adminAuth)` on the router `server.js`
    mounts at `/api/admin/projects`, with no second auth middleware and
    no third permission — the path and credential AC-39.3.1's
    `NEXT_ACTION_CROSS_SURFACE_MAP.md` recorded, and no other.
- **Evidence:** the above test file. This deviation adds no migration and
  modifies no already-shipped migration.

---

## 2026-08-16 — `deviation`

**The `events.manage` permission now exists and is granted to super_admin.**
NEXT_ACTION_CROSS_SURFACE_MAP.md (AC-39.3.1) recorded that every
`events.manage`-gated admin route in `adminProjects.js` — create,
update/relink, attach-event — returns an unconditional 403 for every role,
including super_admin, because no migration in the pinned fork ever seeds a
permission row named `events.manage`: migration 055's permission seed lists
exactly five `events.*` rows (view, create, edit, delete, archive) and never
`events.manage`, and migration 056's super_admin grant is "every row that
exists in `permissions` at migration time", not a fixed list, so super_admin
can only ever hold a permission that was actually seeded. That map deferred
the fix to "whichever AC actually needs the admin write routes to work"
rather than resolving it on AC-39.3.1's own authority. AC-39.6 is that AC —
all three of its writes (phase change, milestone completion, manual
override) go through those gated routes — so this is a deliberate fork
behaviour change: it makes previously-unreachable vendored routes reachable.
New migration 129 seeds the permission and grants it to super_admin,
following migration 090's seed-then-grant pattern. This AC (AC-39.6.1.2) is
the second of AC-39.6's two schema prerequisites and ships the permission
seed only — no route is changed and no gated route is exercised here;
AC-39.6.3 is what proves the gate actually opened.

- **Type:** additive deviation — one new permission row and one new
  role_permissions grant, no existing route, migration 055, or migration 056
  touched.
- **What changed:**
  1. `events.manage` inserted into `permissions` (category `events`) if
     absent, and granted to `super_admin` in `role_permissions`, both guarded
     against re-insertion on a second run. AC-39.6.1.2.
- **Files touched:**
  - `vendor/picpeak/backend/migrations/core/129_seed_events_manage_permission.js`
    — new — seeds `events.manage` and grants it to super_admin. AC-39.6.1.2.
  - `src/lib/picpeakMigrationManifest.ts` — migration `129` recorded as the
    manifest's tenth `origin: 'fork'` entry, with its blob SHA. AC-39.6.1.2.
  - `src/__tests__/us39-ac39.6.1.2-events-manage-permission-migration.test.ts`
    — new — drives migration 129 against a fake knex seeded with 055's and
    056's own rows: the `events.manage` row asserted present after `up()`
    and granted to super_admin, a second `up()` asserted to be a no-op, and
    an assertion that the migration leaves every pre-existing `permissions`
    and `role_permissions` row byte-for-byte unchanged.
  - `src/__tests__/us33-ac33.5.2.1-fork-migration-lane.test.ts` — updated —
    migration 129 added to the later-fork-migration allowlist so the "every
    other manifest entry is still pinned-upstream" invariant still holds.
  - `TEST_LANE_INVENTORY.json` / `TEST_LANE_CLASSIFICATION.md` — updated —
    new suite registered in the UNIT lane (total suites 249→250).
- **Evidence:** the above test file; `src/__tests__/us33-ac33.5.2.1-fork-migration-lane.test.ts`
  stays green. This deviation adds no line to any of migrations 001-128 —
  no already-shipped migration is modified — and
  `src/lib/picpeakMigrationManifest.ts`'s SHA-1 integrity test
  (`us15-ac15.6-picpeak-vendored-fork.test.ts` /
  `us33-ac33.5.2.1-fork-migration-lane.test.ts`) covers migration 129 the
  same way it covers every other fork addition.

---

## 2026-08-16 — `deviation`

**A Project's activity timeline table now exists (schema only).** PRD 22.3
and 23.4 require every phase change, milestone completion and manual
override to append an entry to the Project's activity timeline. New
migration 128 creates `project_activity_timeline`, one append-only row per
entry, with `id` as the authoritative ordering column (two entries appended
within the same request can share a millisecond-resolution `occurred_at`),
`project_id` NOT NULL with `ON DELETE CASCADE`, an `entry_type`, a
human-readable `summary`, the `actor_admin_id`/`actor_name` pairing
migration 127 already established (`SET NULL` on delete, so the "who"
survives an admin account being deleted later), a nullable structured
`metadata` column, and `occurred_at`. This AC (AC-39.6.1.1) is the first of
AC-39.6's two schema prerequisites and ships the table only — no service
writes to it yet and no route reads it; that is later AC-39.6 work.

- **Type:** additive deviation — one new table, no existing route or
  service touched.
- **What changed:**
  1. `project_activity_timeline` created, guarded by `hasTable`, matching
     migrations 122-127's convention. AC-39.6.1.1.
- **Files touched:**
  - `vendor/picpeak/backend/migrations/core/128_add_project_activity_timeline.js`
    — new — creates `project_activity_timeline`. AC-39.6.1.1.
  - `src/lib/picpeakMigrationManifest.ts` — migration `128` recorded as
    the manifest's ninth `origin: 'fork'` entry, with its blob SHA.
    AC-39.6.1.1.
  - `src/__tests__/us39-ac39.6.1.1-activity-timeline-migration.test.ts` —
    new — drives migration 128 against a fake knex: every column asserted
    by name, the `project_id` cascade and `actor_admin_id` set-null
    behaviours asserted, idempotency (a second `up()` call is a no-op), and
    `down()` drops the table.
  - `src/__tests__/us33-ac33.5.2.1-fork-migration-lane.test.ts` — updated
    — migration 128 added to the later-fork-migration allowlist so the
    "every other manifest entry is still pinned-upstream" invariant still
    holds.
- **Evidence:** the above test file; `src/__tests__/us33-ac33.5.2.1-fork-migration-lane.test.ts`
  stays green. This deviation adds no migration line to any of migrations
  001-127 — no already-shipped migration is modified — and
  `src/lib/picpeakMigrationManifest.ts`'s SHA-1 integrity test
  (`us15-ac15.6-picpeak-vendored-fork.test.ts` /
  `us33-ac33.5.2.1-fork-migration-lane.test.ts`) covers migration 128 the
  same way it covers every other fork addition.

---

## 2026-08-16 — `deviation`

**A photographer can now manually override the computed next action, and
the override is presented alongside the computation rather than replacing
it.** PRD 23.4 lists "manual overrides" as one of the photographer
cockpit's nine items. New migration 127 creates
`project_next_action_overrides` (one row per Project — a repeat override
replaces the prior one, it does not accumulate), recording the override
text, the acting admin (`actor_admin_id` + a durable `actor_name`
snapshot), and when it was set (`created_at`/`updated_at`). PRD 23.5's
client Project Room list does not mention overrides, so this AC's write
path is cockpit-only (`adminProjects.js`); the Project Room's own
next-action route (`customer.js`) is untouched.

- **Type:** additive deviation — new table, two new vendored service
  modules, and an additive extension of one existing cockpit route plus
  one new cockpit route. No existing route's request/response contract for
  any prior AC is narrowed.
- **What changed:**
  1. `GET /api/admin/projects/:id/next-action` (AC-39.3.2) now also reads
     this Project's override, if any, and returns `computedNextAction`
     (always the AC-39.3.2 value) alongside `nextAction` (the active
     value — the override's text when one is set, else identical to
     `computedNextAction`) and `override` (`null`, or the override's text,
     actor and timestamp). AC-39.5.
  2. New `PUT /api/admin/projects/:id/next-action/override`
     (`events.manage`) sets or replaces the current override, recording
     `req.admin` as the actor and the write's own timestamp — never a
     caller-supplied actor or time — and echoes the same
     computed-value-plus-override shape the GET returns, so the override
     is visible written-and-read-back in the one response that set it.
     AC-39.5.
  3. The override read/write is split the same way AC-39.3.2 split
     `nextActionRules.js` from `nextActionService.js`: `nextActionOverride.js`
     is a pure presenter (no requires, unit-testable without Docker) that
     decides the active value and the response shape;
     `nextActionOverrideService.js` owns the database read/write against
     migration 127's table. AC-39.5.
- **Files touched:**
  - `vendor/picpeak/backend/migrations/core/127_add_project_next_action_overrides.js` —
    new — creates `project_next_action_overrides`. AC-39.5.
  - `src/lib/picpeakMigrationManifest.ts` — migration `127` recorded as
    the manifest's eighth `origin: 'fork'` entry, with its blob SHA.
    AC-39.5.
  - `vendor/picpeak/backend/src/services/nextActionOverride.js` — new —
    `presentNextAction({ computedNextAction, override })`, the pure
    computed/override merge. AC-39.5.
  - `vendor/picpeak/backend/src/services/nextActionOverrideService.js` —
    new — `getProjectNextActionOverride`/`setProjectNextActionOverride`,
    the database-backed read/upsert against migration 127's table. AC-39.5.
  - `vendor/picpeak/backend/src/routes/adminProjects.js` — additive —
    `GET /:id/next-action`'s handler extended to merge in the override;
    new `PUT /:id/next-action/override` route added after it. AC-39.5.
  - `src/__tests__/us39-ac39.5-next-action-override.test.ts` — new — drives
    migration 127 against a fake knex (schema, idempotency, an
    upsert-not-accumulate write/read-back round trip), table-drives the
    pure `presentNextAction` merge (no override → passthrough; an override
    set → active value is the override's text with the computed value and
    the actor/timestamp still present in the same object), and asserts
    from source that both routes require the one override service/presenter
    pair and that the write route is `events.manage`-gated.
- **Evidence:** the above test file; `src/__tests__/us33-ac33.5.2.1-fork-migration-lane.test.ts`
  (migration 127 added to the later-fork-migration allowlist) stays green.
  This deviation adds no migration line to any of migrations 001-126 — no
  already-shipped migration is modified — and
  `src/lib/picpeakMigrationManifest.ts`'s SHA-1 integrity test
  (`verifyVendoredMigrations`) stays green against this change.

- **Recorded:** 2026-08-16
- **Recorded by:** dev-team (US-39, AC-39.5)

---

## 2026-08-16 — `deviation`

**The Project's "next action" is now computed once, server-side, by one
new service module that both the photographer's cockpit and the client's
Project Room require — the same function reference, not two
implementations that happen to agree.** AC-39.3.1 mapped the two request
paths this depends on (`adminProjects.js` mounted at `/api/admin/projects`;
`customer.js` mounted at `/api/customer`, with no project-scoped route yet)
against the pinned fork. This entry adds the computation and wires both
surfaces to it. `nextActionRules.js` is the pure rule set — PRD 23.1's
phase in, one next-action string out, `booking` phase resolved from
outstanding configured requirements (`project_booking_requirements`,
migration 126) sorted by PRD 23.2's own `sequence_order` so two separately-
fetched HTTP responses render the same ordering rather than depending on
Postgres row-arrival order — and requires nothing, so it is unit-testable
without Docker. `nextActionService.js` does the database reads
(`projects.current_phase`, `project_milestones`, `project_booking_requirements`)
and calls the rules module; `computeProjectNextAction` is the one export
both routes call. `adminProjects.js` gained `GET /:id/next-action`
(`events.view`, the existing read permission). `customer.js` gained
`GET /projects/:id/next-action`, gated by `customerAuth` per-route like
every other route in that file, scoping to the caller's own
`customer_account_id` and returning 404 (not 403) for a Project that
exists but isn't theirs — the same non-disclosing shape the rest of that
router already uses. US-39 AC-39.3.2.

- **Type:** permanent deviation — a genuine, intentional fork addition
  (Fork Discipline: extend via new code, never by rewriting shipped
  upstream logic), not an upstream-bug workaround, so `UPSTREAM_SYNC.md`
  §4 does not apply; it is carried forward on every future merge per §1.
- **What changed:**
  1. `vendor/picpeak/backend/src/services/nextActionRules.js` — new. The
     pure rule set: `resolveNextAction`, plus the exported phase-copy
     constants a source-level guard checks appear nowhere else in the
     backend. US-39 AC-39.3.2.
  2. `vendor/picpeak/backend/src/services/nextActionService.js` — new.
     `computeProjectNextAction(projectId)`, the single DB-backed entry
     point both route handlers require. US-39 AC-39.3.2.
  3. `vendor/picpeak/backend/src/routes/adminProjects.js` — additive:
     requires `nextActionService` and adds `GET /:id/next-action`. US-39
     AC-39.3.2.
  4. `vendor/picpeak/backend/src/routes/customer.js` — additive: requires
     `nextActionService` and adds `GET /projects/:id/next-action`. US-39
     AC-39.3.2.
- **Files touched:** the four files above; see `PICPEAK_PORT_LEDGER.md`
  §11 for the flat list including the evidence suite.
- **Evidence:** `src/__tests__/us39-ac39.3.2-next-action-single-computation.test.ts`
  drives `nextActionRules.js` directly across all seven PRD 23.1 phases and
  representative milestone states (table-driven, one row per phase), plus
  the booking-phase ordering/fallback/complete/unconfigured cases, then
  asserts from source that both route files require the one service by the
  same require path, register the two AC-39.3.1-recorded mount paths,
  never contain `project_milestones`/`project_booking_requirements`, and
  that every next-action phrase exists in exactly one file —
  `nextActionRules.js` — nowhere else in the vendored backend. This AC's
  evidence clause is entirely UNIT lane; the live cross-surface equality
  proof is AC-39.3.3.

- **Recorded:** 2026-08-16
- **Recorded by:** dev-team (US-39, AC-39.3.2)

---

## 2026-08-16 — `deviation`

**PRD 23.2's booking-requirement configuration now exists as data rows, in
a new `project_booking_requirements` table — the booking rule reads which
milestones it requires from this table rather than a hardcoded
three-item check.** PRD 23.2 states "A Project becomes Booked only when its
configured booking requirements are complete" — the word "configured" means
which milestones count toward Booked is data, and the PRD's own
normal-case example (quote approved + contract signed + deposit paid) is
one configuration, not the only legal one. Nothing in the fork carried this
configuration before this migration. Migration
`126_add_project_booking_requirements.js` creates
`project_booking_requirements` (`project_id`, `milestone_key`,
`created_at`) and seeds the normal-case three as canonical template rows
(`project_id IS NULL`), following `project_milestones`' own template-row
pattern (migration 124) exactly: `project_id IS NULL` is the default every
Project uses until it has its own override rows, and a Project with its own
rows uses exactly those instead — a non-default requirement set is simply
more rows with a real `project_id`, never a second code path.
`src/lib/bookingRule.ts`'s `evaluateBookingRule` is the rule itself, a pure
predicate over an already-loaded required-keys set and an already-loaded
completed-keys set (no milestone key literal of its own);
`getBookingRequirements` and `isProjectBooked` are the DB-backed callers.
Sprint 6 note: the milestones this rule reads are completed by a human or
an admin action this sprint — the ledger and Stripe integration are PRD
Phase 6 — so this entry evaluates whatever completion state it is given
and claims no verified payment drove any transition. US-39 AC-39.2.

- **Type:** permanent deviation — a genuine, intentional fork addition
  (Fork Discipline: extend via new code, never by rewriting shipped
  upstream logic; a new migration for any fork-side schema change, never
  an edit to a shipped one), not an upstream-bug workaround, so
  `UPSTREAM_SYNC.md` §4 does not apply; it is carried forward on every
  future merge per §1.
- **What changed:**
  1. `vendor/picpeak/backend/migrations/core/126_add_project_booking_requirements.js`
     — new migration, creates `project_booking_requirements` and seeds the
     three normal-case template rows, guarded so a partial or repeated
     prior run is a safe no-op on re-apply. US-39 AC-39.2.
  2. `src/lib/picpeakMigrationManifest.ts` — migration `126` recorded as a
     seventh `origin: 'fork'` entry, alongside its blob SHA. US-39 AC-39.2.
  3. `src/lib/bookingRule.ts` — new. `evaluateBookingRule` (pure predicate),
     `getBookingRequirements` (reads a Project's override rows, falling
     back to the default template), and `isProjectBooked` (composes both
     against a Project's actual milestone completion state). US-39
     AC-39.2.
- **Files touched:** the three files above; see `PICPEAK_PORT_LEDGER.md`
  §10 for the flat list including the evidence suite.
- **Evidence:** `src/__tests__/us39-ac39.2-booking-rule.test.ts` drives the
  migration module's `up()`/`down()` against a fake knex, queries the
  seeded template rows back, and asserts `evaluateBookingRule` books a
  Project only once every member of a configured requirement set is
  complete — completing each of the three default requirements
  independently (each alone, and two of three, still not Booked), plus a
  non-default two-milestone requirement set that books independently of
  the default three. `getBookingRequirements`/`isProjectBooked` are proven
  against a fake DB: a Project with no override rows uses the default
  template, a Project with override rows uses exactly those (and one
  Project's override never leaks into another's read), and
  `isProjectBooked` flips from `false` to `true` exactly when the last
  configured requirement's fixture milestone is marked complete. A final
  check asserts `src/lib/bookingRule.ts`'s source contains no default
  requirement key literal, proving the module reads configuration rather
  than hardcoding it.

- **Recorded:** 2026-08-16
- **Recorded by:** dev-team (US-39, AC-39.2)

---

## 2026-08-16 — `deviation`

**A per-Project document area and an integration-status record now exist,
in two new tables.** Neither existed in the fork before this migration.
PRD 22.3 lists a "document area" among the ten things automatic Project
setup prepares, and PRD 23.4 requires the photographer's cockpit to show
both "quote, contract, invoice, payment, and receipt references" and
"integration failures" — neither had anywhere to live. Migration
`125_add_project_documents_and_integration_status.js` creates
`project_documents` (`project_id`, `document_type`, `title`,
`storage_key`, `external_reference`, timestamps) as the per-Project
document area, and `project_integration_status` (`project_id`,
`integration_key`, `status`, `message`, `occurred_at`, timestamps) as the
integration-status record. A status row can represent 'success',
'pending', or 'failure', and a 'failure' row carries a `message` and an
`occurred_at` timestamp — what PRD 23.4 requires the cockpit to show and
what US-43 AC-43.3 asserts an induced failure produces there. Both tables
are additive and carry no data of their own yet; rows are written by
later stories (US-41's atomic Project setup, US-43's cockpit, integration
call sites). US-38 AC-38.4.

- **Type:** permanent deviation — a genuine, intentional fork addition
  (Fork Discipline: extend via new code, never by rewriting shipped
  upstream logic; a new migration for any fork-side schema change, never
  an edit to a shipped one), not an upstream-bug workaround, so
  `UPSTREAM_SYNC.md` §4 does not apply; it is carried forward on every
  future merge per §1.
- **What changed:**
  1. `vendor/picpeak/backend/migrations/core/125_add_project_documents_and_integration_status.js`
     — new migration, creates `project_documents` and
     `project_integration_status`, each guarded so a partial or repeated
     prior run is a safe no-op on re-apply. US-38 AC-38.4.
  2. `src/lib/picpeakMigrationManifest.ts` — migration `125` recorded as a
     sixth `origin: 'fork'` entry, alongside its blob SHA. US-38 AC-38.4.
- **Files touched:** the two files above.
- **Evidence:** `src/__tests__/us38-ac38.4-project-documents-integration-status-migration.test.ts`
  drives the migration module's `up()`/`down()` against a fake knex,
  writes and reads back a `project_documents` row, and writes and reads
  back a `project_integration_status` row for each of the 'success',
  'pending', and 'failure' states — the 'failure' row's `message` and
  `occurred_at` asserted non-null and read back unchanged.

- **Recorded:** 2026-08-16
- **Recorded by:** dev-team (US-38, AC-38.4)

---

## 2026-08-16 — `deviation`

**PRD 23.2's eighteen Project milestones exist as data rows, in a new
`project_milestones` table.** Nothing in the fork tracked Project milestones
before this migration — PRD 23.2's eighteen-item list (inquiry reviewed
... project closed) existed only as PRD prose, which would otherwise force
whichever UI shows it (US-43's cockpit, US-44's Project Room) to hardcode
its own copy. Migration `124_add_project_milestones.js` creates
`project_milestones` (`milestone_key`, `name`, `sequence_order`,
`completion_state`, `completed_at`, `completed_by`, timestamps) and seeds
PRD 23.2's eighteen milestones into it as canonical template rows
(`project_id IS NULL`), in PRD order, each starting `completion_state:
'pending'` with `completed_at`/`completed_by` unset. A real Project's own
milestone rows (`project_id` set) are cloned from these templates later, by
US-41's atomic Project-setup path — this migration only establishes the
eighteen as queryable data. US-38 AC-38.3.

- **Type:** permanent deviation — a genuine, intentional fork addition
  (Fork Discipline: extend via new code, never by rewriting shipped
  upstream logic; a new migration for any fork-side schema change, never
  an edit to a shipped one), not an upstream-bug workaround, so
  `UPSTREAM_SYNC.md` §4 does not apply; it is carried forward on every
  future merge per §1.
- **What changed:**
  1. `vendor/picpeak/backend/migrations/core/124_add_project_milestones.js`
     — new migration, creates `project_milestones` and seeds the eighteen
     PRD 23.2 template rows, guarded so a partial or repeated prior run is
     a safe no-op on re-apply. US-38 AC-38.3.
  2. `src/lib/picpeakMigrationManifest.ts` — migration `124` recorded as a
     fifth `origin: 'fork'` entry, alongside its blob SHA. US-38 AC-38.3.
- **Files touched:** the two files above.
- **Evidence:** `src/__tests__/us38-ac38.3-project-milestones-migration.test.ts`
  drives the migration module's `up()`/`down()` against a fake knex,
  queries the seeded template rows back, asserts their names against an
  independently-typed copy of PRD 23.2's list and asserts the count is
  eighteen, and proves `src/lib/projectMilestones.ts`'s
  `getMilestoneDefinitions` reader returns whatever the underlying query
  yields — including a deliberately mutated row set that does not match
  PRD 23.2 at all — rather than a literal list baked into the reader.

- **Recorded:** 2026-08-16
- **Recorded by:** dev-team (US-38, AC-38.3)

---

## 2026-08-16 — `deviation`

**`events` gains the PRD 22.4 event-detail fields it did not yet carry.**
At the pinned commit plus migration 122, `events` already carried four of
PRD 22.4's ten named event-detail items — name/type (`event_name`,
`event_type`), date/time (`event_date`, `event_time_start`,
`event_time_end`), and full-day state (`is_full_day`, added by the pinned
upstream migration `107_crm_consolidated.js`) — but had no representation
for "or TBD" on the date/time item (`event_date` is `NOT NULL`), and none of
venue name, full address, map link, coordinator/contact, coverage notes,
client-visible notes or internal notes existed. Migration
`123_add_event_detail_fields.js` adds ten new columns: `event_date_tbd` (a
real boolean flag for "date not yet set", same pattern as
`projects.first_event_date_tbd`); `venue_name`; `venue_address`;
`venue_map_link`; `coordinator_name`/`_email`/`_phone` (split into three
queryable columns, matching how migration 122 split the secondary contact);
`coverage_notes`; `client_visible_notes`; and `internal_notes` — kept as two
structurally distinct columns (never one field gated by a flag) so US-44
AC-44.2 can assert the internal one is absent from any client-facing payload
by construction. US-38 AC-38.2.

- **Type:** permanent deviation — a genuine, intentional fork addition
  (Fork Discipline: extend via new code, never by rewriting shipped
  upstream logic; a new migration for any fork-side schema change, never
  an edit to a shipped one), not an upstream-bug workaround, so
  `UPSTREAM_SYNC.md` §4 does not apply; it is carried forward on every
  future merge per §1.
- **What changed:**
  1. `vendor/picpeak/backend/migrations/core/123_add_event_detail_fields.js`
     — new migration, adds the ten columns listed above to `events`, each
     guarded individually by `hasColumn` so a partial prior run is a safe
     no-op on re-apply. US-38 AC-38.2.
  2. `src/lib/picpeakMigrationManifest.ts` — migration `123` recorded as a
     fourth `origin: 'fork'` entry, alongside its blob SHA. US-38 AC-38.2.
- **Files touched:** the two files above.
- **Evidence:** `src/__tests__/us38-ac38.2-event-detail-fields-migration.test.ts`
  drives the migration module's `up()`/`down()` against a fake knex schema
  builder, maps each of PRD 22.4's ten named items to the column that
  carries it (the four pre-existing ones plus the six new columns split
  across the migration's ten added columns), and fails if any single one is
  missing. It also asserts `client_visible_notes` and `internal_notes` are
  two distinct column names, never the same field.

- **Recorded:** 2026-08-16

---

## 2026-08-16 — `deviation`

**`projects` gains the PRD 22.2 New Project form fields it did not yet
carry.** At the pinned commit, `117_add_projects.js` created `projects`
with exactly six columns (id, name, customer_account_id, status,
created_at, updated_at) — none of photography type, first event date,
venue/city, lead source, internal note, secondary contact, or current
phase existed. Migration `122_add_project_new_project_fields.js` adds
eleven new columns for those seven PRD fields: `photography_type`;
`first_event_date` + `first_event_date_tbd` (a real boolean flag rather
than an ambiguous NULL/magic-date for "or TBD"); `venue_city` +
`venue_city_tbd` (same TBD pattern); `lead_source`; `internal_note`;
`secondary_contact_name`/`_email`/`_phone` (split into three queryable
columns rather than one JSON blob, matching how the primary contact's own
fields are modelled elsewhere); and `current_phase`, defaulting to `lead`
per PRD 23.1's seven-phase list. US-38 AC-38.1.

- **Type:** permanent deviation — a genuine, intentional fork addition
  (Fork Discipline: extend via new code, never by rewriting shipped
  upstream logic; a new migration for any fork-side schema change, never
  an edit to a shipped one), not an upstream-bug workaround, so
  `UPSTREAM_SYNC.md` §4 does not apply; it is carried forward on every
  future merge per §1.
- **What changed:**
  1. `vendor/picpeak/backend/migrations/core/122_add_project_new_project_fields.js`
     — new migration, adds the eleven columns listed above to `projects`,
     each guarded individually by `hasColumn` so a partial prior run is a
     safe no-op on re-apply. US-38 AC-38.1.
  2. `src/lib/picpeakMigrationManifest.ts` — migration `122` recorded as a
     third `origin: 'fork'` entry, alongside its blob SHA. US-38 AC-38.1.
- **Files touched:** the two files above.
- **Evidence:** `src/__tests__/us38-ac38.1-project-new-fields-migration.test.ts`
  drives the migration module's `up()`/`down()` against a fake knex schema
  builder and names each of the eleven added columns individually — the
  test fails if any one is absent or if an unexpected column sneaks in.
  Applied live against the running `backstage-db` Postgres service in
  Docker: `\d projects` showed exactly the six pinned-baseline columns
  before, and all six plus the eleven new columns afterward, with the
  same six-column result restored after running `down()`. Re-running `up()`
  a second time changed nothing (every column already present).

- **Recorded:** 2026-08-16
- **Recorded by:** dev-team (US-38, AC-38.1)

---

## 2026-08-14 — `deviation`

**Backstage gains a second inquiry-triggered email: the optional branded
acknowledgement to the person who submitted a Frontstage form
(`POST /api/v1/notifications/inquiry-acknowledgement`), off by default and
sent through the same single email queue as the AC-33.5 studio
notification — never a second sending system.** CLAUDE.md's email
pragmatic-default note is explicit that exactly one system sends any given
email type; this entry keeps that true by extending the existing
`vendor/picpeak/backend/src/routes/v1/notifications.js` router (added by
AC-33.5.2.2.2) with a sibling route rather than introducing a new sender.
The route follows AC-33.5.2.2.2's shape exactly: same `apiTokenAuth` +
`requireApiScope('write')` pair, `event_id: null` (an inquiry is not a
gallery event), and delegates to the existing `queueEmail()`
(`emailProcessor.js:959`) with a fixed `template_key:
'inquiry_acknowledgement'` — the row
`121_add_inquiry_acknowledgement_email_template.js` inserts, following
migration `120`'s exact idempotent shape and the same F9-avoidance reason
(`scrum-master/po-requests.md`). Whether the route is ever called for a
given submission is decided entirely by the caller (Frontstage) before the
request is made — "off by default" is enforced by a Frontstage-side toggle
that defaults to unset, not by anything in this route, which queues
unconditionally whenever called. US-33 AC-33.6.

- **Type:** permanent deviation — a genuine, intentional fork addition
  (Fork Discipline: extend via new code, never by rewriting shipped
  upstream logic; a new migration for any fork-side schema/data change,
  never an edit to a shipped one), not an upstream-bug workaround, so
  `UPSTREAM_SYNC.md` §4 does not apply; it is carried forward on every
  future merge per §1. Same additive shape as the two 2026-08-14 entries
  below (AC-33.5.2.2.2's route, AC-33.5.2.1's migration) — precedented,
  not a new argument to have.
- **What changed:**
  1. `vendor/picpeak/backend/migrations/core/121_add_inquiry_acknowledgement_email_template.js`
     — new migration, inserts the `inquiry_acknowledgement`
     `email_templates` row (English and German subject/body, `form_title`/
     `submitted_at` variables), guarded on `template_key` already
     existing. US-33 AC-33.6.
  2. `src/lib/picpeakMigrationManifest.ts` — migration `121` recorded as a
     second `origin: 'fork'` entry, alongside its blob SHA. US-33 AC-33.6.
  3. `vendor/picpeak/backend/src/routes/v1/notifications.js` — new
     `POST /notifications/inquiry-acknowledgement` handler added beside
     the existing `POST /notifications/inquiry` handler in the same file
     (no new router, no new `server.js` mount — the existing
     AC-33.5.2.2.2 mount already carries this route); validates
     `recipient_email`, `form_title` server-side (`express-validator`,
     the same library the sibling route uses); calls
     `queueEmail(null, recipient_email, 'inquiry_acknowledgement',
     emailData)`. US-33 AC-33.6.
  4. `vendor/picpeak/backend/src/routes/v1/__tests__/notifications.inquiryAcknowledgement.test.js`
     — new fork-side Jest suite (7 tests), sibling of
     `notifications.inquiry.test.js`, `queueEmail` and `db` mocked,
     `requireApiScope` exercised for real. Run offline — no Docker, no
     live HTTP call. US-33 AC-33.6.
  5. `PAYLOAD_PICPEAK_API_CONTRACT.md` — new call-catalog row `3b`,
     immediately after row `3a`, recording this boundary crossing. US-33
     AC-33.6.
- **Files touched:** see `PICPEAK_PORT_LEDGER.md` §8 for the flat list.
- **Evidence:** `src/__tests__/us33-ac33.6-inquiry-acknowledgement-route.test.ts`
  pins the route's auth pair, its `queueEmail` call shape, the fixed
  `template_key`, and the changelog/ledger/contract records against the
  pinned fork source directly. The fork-side suite named above proves the
  route's actual request/response behaviour: a valid request queues
  exactly once with `event_id === null` and the fixed `template_key`, an
  invalid body 400s before `queueEmail` is reached, and a read-only-scoped
  token 403s via the real `requireApiScope`. `src/__tests__/us33-ac33.6-inquiry-acknowledgement-client.test.ts`
  proves the Frontstage-side toggle: disabled (unset) never issues a
  request to this route at all — zero `fetch` calls — and enabled issues
  exactly one. `scripts/ac33.6-inquiry-acknowledgement-proof.sh` extends
  the AC-33.5.2.3 live-proof pattern (MailHog emptied and asserted `0`
  before each run) into two live runs against the stack in Docker: enabled
  → the acknowledgement is captured in MailHog exactly once; disabled →
  MailHog stays at `0` for that recipient after the same submission.

- **Recorded:** 2026-08-14
- **Recorded by:** dev-team (US-33, AC-33.6)

---

## 2026-08-14 — `deviation`

**Backstage gains an HTTP way for a service to queue an email:
`POST /api/v1/notifications/inquiry`.** AC-33.5.2.1's go/no-go recorded
that no existing route let Frontstage queue an email — `v1/events.js`'s
own family creates/lists/reads gallery events, uploads photos, and mints
share links, but calls no email path at all. This entry closes that gap
with the minimum addition the go/no-go named: a second router mounted
beside `v1/events.js` under `/api/v1`, behind the same `apiTokenAuth` +
`requireApiScope('write')` pair row 3 of `PAYLOAD_PICPEAK_API_CONTRACT.md`'s
call catalog already documents, delegating to the existing `queueEmail()`
(`emailProcessor.js:959`) with a fixed `template_key: 'inquiry_received'`
— the row `120_add_inquiry_notification_email_template.js` (AC-33.5.2.1)
already inserts — and `event_id: null`, legal because `email_queue.event_id`
is nullable (`db.js`) and the admin queue view `leftJoin`s `events`
(`adminEmail.js`) so a null-`event_id` row still lists. The route accepts
data fields only (`form_title`, `source_page`, `submitted_at`,
`submission_summary` — the migration's own template variables) and renders
no subject or body itself; queueing only inserts a `pending` row for the
existing 60-second background processor to send. US-33 AC-33.5.2.2.2.

- **Type:** permanent deviation — a genuine, intentional fork addition
  (Fork Discipline: extend via new code, never by rewriting shipped
  upstream logic), not an upstream-bug workaround, so `UPSTREAM_SYNC.md` §4
  does not apply; it is carried forward on every future merge per §1. The
  same kind of additive `server.js` change as the US-27 `publicSite`
  deviation recorded above (2026-08-07) — precedented, not a new argument
  to have.
- **What changed:**
  1. `vendor/picpeak/backend/src/routes/v1/notifications.js` — new file.
     `POST /notifications/inquiry` behind `apiTokenAuth` +
     `requireApiScope('write')`; validates `recipient_email`, `form_title`,
     `source_page`, `submission_summary` server-side (`express-validator`,
     the same library `events.js` uses); calls
     `queueEmail(null, recipient_email, 'inquiry_received', emailData)`.
     US-33 AC-33.5.2.2.2.
  2. `vendor/picpeak/backend/server.js` — one new `app.use('/api/v1', ...)`
     line, immediately beside the existing `v1/events` mount
     (`server.js:531`); the existing mount is left byte-identical. US-33
     AC-33.5.2.2.2.
  3. `vendor/picpeak/backend/src/routes/v1/__tests__/notifications.inquiry.test.js`
     — new fork-side Jest suite (9 tests), `queueEmail` and `db` mocked,
     `requireApiScope` exercised for real. Run offline with the fork's own
     local `node_modules` — no Docker, no live HTTP call. US-33
     AC-33.5.2.2.2.
  4. `PAYLOAD_PICPEAK_API_CONTRACT.md` — new call-catalog row `3a`,
     immediately after row 3, recording this boundary crossing; existing
     row numbers 4/5 are left unchanged since this document's own prose
     cites them by number in several other sections. US-33 AC-33.5.2.2.2.
- **Files touched:** see `PICPEAK_PORT_LEDGER.md` §7 for the flat list.
- **Evidence:** `src/__tests__/us33-ac33.5.2.2.2-inquiry-notification-route.test.ts`
  pins the route's auth pair, its `queueEmail` call shape, the fixed
  `template_key`, the minimal additive `server.js` mount, and the
  changelog/ledger/contract records against the pinned fork source
  directly — never against this prose alone. The fork-side suite named
  above proves the route's actual request/response behaviour: a valid
  request queues exactly once with `event_id === null` and the fixed
  `template_key`, an invalid body 400s before `queueEmail` is reached, and
  a read-only-scoped token 403s via the real `requireApiScope`. Live
  behaviour against a real minted `pp_live_` token, and the queued row read
  back from Backstage's own Postgres, is deliberately out of scope here —
  AC-33.5.2.2.3.

- **Recorded:** 2026-08-14
- **Recorded by:** dev-team (US-33, AC-33.5.2.2.2)

---

## 2026-08-14 — `deviation`

**The fork's first extension migration lands: `120_add_inquiry_notification_email_template.js`
inserts the `email_templates` row a Frontstage form submission's studio
notification will render from, and the manifest that fingerprints every
vendored migration file gains an explicit lane for fork-added migrations
like it, distinct from the pinned-upstream fingerprint it already kept.**
Before this entry, `PICPEAK_MIGRATION_MANIFEST` fingerprinted only what
GitHub actually shipped at the pin — appending a fork migration's hash to
that same undifferentiated list would have kept
`us15-ac15.6-picpeak-vendored-fork.test.ts` green while making it false: a
later edit to *our own* migration would read as upstream tampering, and the
drift detector would carry our own addition forward as an approved upstream
baseline on the next sync. `MigrationManifestEntry` now carries an optional
`origin: 'fork'` field (omitted = upstream, the default, so none of the
~130 pre-existing entries needed to change); a fork-origin entry's blob SHA
is still enforced exactly like an upstream entry's, and it carries one
further requirement upstream entries do not: it must be named in this file,
checked by `verifyVendoredMigrations` reading `FORK_CHANGELOG.md` directly.
US-33 AC-33.5.2.1.

The migration itself is additive only — a single `INSERT`, guarded on
`template_key` already existing (the same idempotency convention
`059_add_admin_email_templates.js` uses) — populating the legacy
`subject_en`/`body_html_en`/`body_text_en`/`_de` columns `processTemplate`
falls back to when no `email_template_translations` row exists
(`emailProcessor.js:503, 541-548`). Without this row, every
`inquiry_received` row a later sub-AC queues would sit `pending` and retry
to exhaustion exactly like the two templates finding F9 already named
(`gallery_expired`, `archive_complete`) — `scrum-master/po-requests.md`.

- **Type:** permanent deviation — the migration is a genuine, intentional
  fork addition (Fork Discipline requires a *new* migration for any
  fork-side schema/data change, never an edit to a shipped one), not an
  upstream-bug workaround, so `UPSTREAM_SYNC.md` §4 does not apply; it is
  carried forward on every future merge per §1.
- **What changed:**
  1. `vendor/picpeak/backend/migrations/core/120_add_inquiry_notification_email_template.js`
     — new migration, inserts the `inquiry_received` `email_templates` row
     (English and German subject/body, `form_title`/`source_page`/
     `submitted_at`/`submission_summary` variables). US-33 AC-33.5.2.1.
  2. `src/lib/picpeakMigrationManifest.ts` — `MigrationManifestEntry` gained
     the optional `origin?: 'fork'` field; migration `120` is recorded as
     the manifest's first `origin: 'fork'` entry, alongside its blob SHA.
     US-33 AC-33.5.2.1.
  3. `src/lib/picpeakMigrationIntegrity.ts` — `verifyMigrationsUnmodified`
     gained the `isForkAdditionDocumented` check, consulted only for
     `origin: 'fork'` entries whose blob SHA already matched; a fork
     addition absent from `FORK_CHANGELOG.md` now fails with reason
     `'undocumented'`. `verifyVendoredMigrations` wires this to a real read
     of this file. US-33 AC-33.5.2.1.
  4. `vendor/README.md` — new "The fork-addition lane" section documents
     the `origin` field and the `FORK_CHANGELOG.md` requirement it enforces.
     US-33 AC-33.5.2.1.
  5. `UPSTREAM_SYNC.md` §3 — the claim that "this fork has not added a
     single schema migration of its own" is now out of date; updated with
     a dated note pointing at migration `120` and scoping the still-owed
     AC-16.6 upgrade proof to a future *schema-altering* fork migration
     (this one only inserts a row). US-33 AC-33.5.2.1.
  6. `PICPEAK_PORT_LEDGER.md` — new §6 recording the file paths this entry
     touched, per the same cross-reference convention §5 established for
     US-27 AC-27.5. US-33 AC-33.5.2.1.
- **Files touched:** see `PICPEAK_PORT_LEDGER.md` §6 for the flat list.
- **Evidence:** `src/__tests__/us33-ac33.5.2.1-fork-migration-lane.test.ts`
  proves the lane both directions through `verifyMigrationsUnmodified`'s
  injected `readFile`/`isForkAdditionDocumented` — a fork addition that is
  blob-identical and documented passes, one that is undocumented fails with
  reason `'undocumented'`, and an *upstream* entry with a tampered blob SHA
  still fails with reason `'modified'` exactly as it did before this lane
  existed. `us15-ac15.6-picpeak-vendored-fork.test.ts` stays green against
  the real vendored tree with migration `120` present. Applied live against
  the `backstage-db` Postgres service in Docker
  (`docker compose --profile backstage up -d`): `SELECT * FROM email_templates
  WHERE template_key = 'inquiry_received'` returns exactly one row, and
  re-running the migration is a no-op (the `template_key` guard).

- **Recorded:** 2026-08-14
- **Recorded by:** dev-team (US-33, AC-33.5.2.1)

---

## 2026-08-07 — `deviation`

**Every duplicate Backstage publishing surface AC-18.5 identified is now held
off by its own feature flag, not just a settings default.** A new
`publicSite` flag was added to `KNOWN_FLAGS`/`DEFAULT_FLAGS`, mirroring the
existing `quotes`/`bills` pattern exactly, defaulting to `false`; the raw-HTML
homepage renderer now checks it **before** `app_settings` is read, closing
the gap where a single `PUT /api/admin/settings/general` write could turn
Backstage into a second publisher of the site's `/` route. The equivalent
admin-UI panel is hidden behind the same flag using the fork's existing
`RequireFeature` gate, so the capability is not merely unreachable at the
server — it is not offered. The native quote/invoice/tax-report subsystem's
`quotes`/`bills` defaults were confirmed `false` with a live 403 proof rather
than assumed off, and the static CMS Pages surface was confirmed to stay
**enabled** (a deliberate scoping decision, not an oversight) with a test
that would fail if a future cleanup silently reversed it. US-27 AC-27.1
through AC-27.4.

- **Type:** permanent deviation — new flag keys and gate checks this project
  adds on top of upstream's existing flag mechanism. Not a vendor-defect
  workaround, so §4 of `UPSTREAM_SYNC.md` does not apply; it is carried
  forward on every future merge per §1.
- **What changed:**
  1. `publicSite` added to `KNOWN_FLAGS`/`DEFAULT_FLAGS`
     (`adminFeatureFlags.js`), defaulting to `false`. US-27 AC-27.1.
  2. `handlePublicSiteRequest` in `publicSiteService.js` now checks the
     `publicSite` flag before reading `general_public_site_enabled` from
     `app_settings`; the raw-HTML composition helpers (`composeInlineStyles`,
     `renderBrandHeader`, `renderBrandFooter`, and the rest of the homepage
     template) moved out of `server.js` and into the service alongside that
     check, so the flag gate and the rendering it gates live in one place.
     US-27 AC-27.1.
  3. The admin "Public Site" raw HTML/CSS panel in `CMSPage.tsx` is hidden
     behind the same `publicSite` flag via `RequireFeature`, the way the
     quotes UI already is; `FeatureFlagsContext.tsx` and
     `featureFlags.service.ts` carry the new flag through to the admin UI.
     US-27 AC-27.2.
  4. `publicQuotes.js` gained an explicit `quotes`-flag check on its public
     routes (previously reachable whenever a quote existed, with no flag
     behind it); `adminQuotes.js`, `adminInvoices.js`, `adminTaxReport.js`,
     and `adminBusinessProfile.js` were confirmed to already default `quotes`
     / `bills` to `false` with at least one flag-gated route per flag proven
     to 403 with the flag off. US-27 AC-27.3.
  5. `adminCMS.js` / `publicCMS.js` (the static CMS Pages surface) confirmed
     to stay enabled — no flag added, by design; a pinning test now protects
     that decision. US-27 AC-27.4.
- **Files touched:**
  - `vendor/picpeak/backend/src/routes/adminFeatureFlags.js` — `publicSite`
    flag key.
  - `vendor/picpeak/backend/src/services/publicSiteService.js` — flag check
    moved ahead of the `app_settings` read; HTML-rendering helpers relocated
    in from `server.js`.
  - `vendor/picpeak/backend/server.js` — the relocated helpers removed; the
    route now delegates entirely to `handlePublicSiteRequest`.
  - `vendor/picpeak/backend/src/routes/publicQuotes.js` — new file, `quotes`
    flag check added ahead of the public quote routes.
  - `vendor/picpeak/frontend/src/pages/admin/CMSPage.tsx` — Public Site panel
    wrapped in `RequireFeature('publicSite')`.
  - `vendor/picpeak/frontend/src/contexts/FeatureFlagsContext.tsx` —
    `publicSite` added to the tracked flag set.
  - `vendor/picpeak/frontend/src/services/featureFlags.service.ts` —
    `publicSite` added to the flag-service type/defaults.
  - `vendor/picpeak/backend/src/__tests__/adminFeatureFlags.publicSite.test.js`
    — new pinning suite for the flag default and its gate order.
  - `vendor/picpeak/backend/src/__tests__/publicSiteService.test.js` —
    extended to cover the pre-`app_settings` flag check.
  - `vendor/picpeak/backend/__tests__/routes/cmsStaysEnabled.test.js` — new,
    pins the CMS Pages surface as deliberately not flag-gated.
  - `vendor/picpeak/backend/__tests__/routes/nativeBillingFlags.test.js` —
    new, proves the `quotes`/`bills` defaults and the 403-with-flag-off
    behaviour.
  - `vendor/picpeak/backend/__tests__/routes/publicQuotes.test.js` — new,
    covers the added `quotes` flag check.
  - `src/__tests__/us27-ac27.2-cms-public-site-panel-flag-gated.test.ts` —
    new, mirrors the existing quotes-panel `RequireFeature` test pattern.
  - `src/__tests__/us18-ac18.5-backstage-surfaces-disabled.test.ts` — updated
    now that AC-27.1 closed the gap AC-18.5 originally recorded as open.
- **Evidence:** none of the above are under
  `vendor/picpeak/backend/migrations/` — every change is a new flag key, a
  new check, or a gated panel, never an edit to an already-shipped migration.
  `src/lib/picpeakMigrationManifest.ts`'s SHA-1 integrity test
  (`src/__tests__/us15-ac15.6-picpeak-vendored-fork.test.ts`) stays green
  against this change, re-asserted by
  `src/__tests__/us27-ac27.5-additive-deviation-recorded.test.ts`.

- **Recorded:** 2026-08-07
- **Recorded by:** dev-team (US-27, AC-27.5)

---

## 2026-08-01 — `deviation`

**Single-photo gallery download patched: read through the storage backend,
answer on every failure path, and record the download only once it is
confirmed sent.** Works around upstream defect **UD-1** — see
`PICPEAK_UPSTREAM_DEFECTS.md` for the defect, the upstream report, and the
condition under which this patch is dropped.

- **Type:** vendor-defect workaround, **not** a permanent deviation. It is
  flagged drop-rather-than-merge in `UPSTREAM_SYNC.md` §4: when the pin moves
  to an upstream commit carrying upstream's own fix, this patch is deleted
  rather than merged forward.
- **Upstream location patched:** `backend/src/routes/gallery.js`, the
  `GET /:slug/download/:photoId` route (line 631 at the pinned commit
  `eb263137b98935754155824de2a03848121304b6`).
- **What changed, in three parts** (all three are the same upstream route and
  were fixed together):
  1. Managed photos resolve through `resolvePhotoStorageKey()` +
     `getStorage()` instead of the local-filesystem-only
     `resolvePhotoFilePath()` (which survives only for external/reference
     photos), with `Content-Length` from the storage `stat()`; the watermark
     branch materializes a temp local copy via `withLocalCopy()`. US-17
     AC-17.5.2.
  2. Every failure path answers — `404`/`500` while headers are unsent,
     `res.destroy()` once they are — including the `res.sendFile()` error
     callback that upstream left logging-only, which hung the request. US-17
     AC-17.5.2.
  3. The `download_count` increment (upstream `gallery.js:654`) and the
     `access_logs` insert (upstream `gallery.js:657`) moved out of their
     pre-send position into a single guarded helper fired only on a confirmed
     delivery — the response's `finish` event, and `res.sendFile()`'s success
     branch — never from a failure branch. US-17 AC-17.5.3.
- **Files touched:**
  - `vendor/picpeak/backend/src/routes/gallery.js` — the patched route; every
    changed region carries an in-file `vendor-defect fix: US-17 AC-17.5.2` or
    `AC-17.5.3` comment so the patch stays legible against a future sync.
  - `vendor/picpeak/backend/src/__tests__/galleryDownload.storageBackend.test.js`
    — new pinning suite covering the patched behaviour (14 tests).
- **Evidence:** `PIVOT_AUDIT.md`, sections "AC-17.5.2 — the single-photo
  download route patched to read through the storage backend, proven live"
  and "AC-17.5.3 — the download recorded only on a confirmed delivery, proven
  live from Postgres".

- **Recorded:** 2026-08-01
- **Recorded by:** dev-team (US-17, AC-17.5.3)

---

## 2026-07-31 — `baseline`

**Fork initialised at the pinned upstream commit. No deviations yet.**

- **Upstream:** `https://github.com/PicPeak/picpeak`
- **Pinned commit:** `eb263137b98935754155824de2a03848121304b6` (branch `main`,
  dated 2026-06-06T01:50:55Z upstream — see `PICPEAK_UPSTREAM.md` for the
  full pin record and `PICPEAK_CAPABILITY_AUDIT.md` for why this commit was
  selected)
- **Licence:** MIT, verified in `PICPEAK_LICENCE_VERIFICATION.md`
- **Files touched:** none — this entry records the baseline only. The fork's
  vendored code is not yet present in this repository (tracked separately as
  AC-15.6); no deviation from upstream has been made at this point.

From this baseline forward, every change made to the vendored fork code that
is *not* a straight sync from a newer upstream pin — a bug fix, a
configuration change, a feature added or removed, a dependency bumped ahead
of or independently from upstream — gets its own dated `deviation` entry
below, naming the files it touched.

- **Recorded:** 2026-07-31
- **Recorded by:** dev-team (US-15, AC-15.5)
