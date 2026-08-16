<!--
---
file: PROJECT_DATA_MODEL_ADR.md
project: earthandhoney
purpose: AC-38.7 — records the option chosen, the options rejected, and the
         reason, for two decisions: (a) extending the fork's own
         `projects`/`events` tables versus creating a parallel Earth &
         Honey project table, and (b) where the Project-to-Inquiry and
         Project-to-ledger cross-system identifiers live, per Reminder 4's
         "stored external identifiers, resolved over an API, no
         cross-database join" rule. States plainly that the financial
         identifier is a placeholder in this sprint — PRD Phase 6 owns the
         ledger — so this document never implies a live ledger integration
         exists.
created-by: dev-team
related-story: US-38
related-ac: 38.7
---
-->

# Project Data Model ADR

## Decision (a): extend the fork's own `projects`/`events` tables, or create a parallel Earth & Honey project table?

### Options considered

1. **Extend `projects` and `events` in place**, via new, additive,
   fork-owned migrations — new columns via `ALTER TABLE` for scalar,
   one-per-Project/one-per-Event attributes, and new child tables
   (foreign-keyed onto `projects.id`/kept scoped to one Project) for
   one-to-many data — while `projects.id` and `events.id` stay the one and
   only identity for a Project and its Events. This is what AC-38.1–38.4
   already built: migrations `122_add_project_new_project_fields.js` and
   `123_add_event_detail_fields.js` add columns via `ALTER TABLE` guarded
   by `hasColumn`; `124_add_project_milestones.js` and
   `125_add_project_documents_and_integration_status.js` add new tables
   (`project_milestones`, `project_documents`,
   `project_integration_status`) foreign-keyed onto `projects.id` with
   `onDelete('CASCADE')`.
2. **Create a new, parallel Earth & Honey project table** (e.g.
   `earth_and_honey_projects`) that mints its own identity and holds every
   field PRD 22.2/22.4/23.x need, linked to the fork's `projects` row only
   by a stored `backstage_project_id` pointer — leaving `projects` and
   `events` completely untouched.
3. **Duplicate the whole Project object** into a second, wholly
   independent table with its own primary key and its own read/write
   paths, not linked back to the fork's `projects` row at all.

### Decision: Option 1 — extend `projects`/`events` in place, as new fork-owned migrations

Already implemented on this branch: migrations `122`–`125` (US-38
AC-38.1–AC-38.4), each guarded for idempotency per
`MIGRATION_IDEMPOTENCY.md`, each registered in the `origin: 'fork'` lane of
`src/lib/picpeakMigrationManifest.ts`, and each recorded in
`FORK_CHANGELOG.md`, `PICPEAK_PORT_LEDGER.md` and `UPSTREAM_SYNC.md` (US-38
AC-38.6). `projects.id` and `events.id` remain the single identity for a
Project and its Events — nothing added by these migrations mints a second
identity space.

### Reasons

- **A Project is one business object with one owner; every field AC-38.1
  and AC-38.2 added is a scalar attribute of exactly one existing
  `projects` row or exactly one existing `events` row** (e.g.
  `photography_type`, `current_phase`, `venue_name`, `coordinator_email`).
  That is a one-to-one augmentation, which `ALTER TABLE ADD COLUMN` is the
  direct, idiomatic tool for — not a new relationship type that would
  justify a satellite table. Contrast `MEDIA_REUSE_ADR.md`'s AC-19.2
  decision, which added new tables (`media_assets`/`gallery_items`)
  specifically because that need *was* a genuinely new many-to-many
  relationship (one image usable across more than one gallery) with no
  existing column to extend. No analogous new relationship type exists
  here for the New Project form fields or the event detail fields — a
  satellite table for them would just be a join required on every single
  read of "a Project," for zero structural benefit over a column.
- **This is the fork's own established, idiomatic migration pattern, not
  a deviation.** PicPeak's own upstream migrations already use exactly
  this `ALTER TABLE ADD COLUMN` shape to extend an existing table with new
  attributes — e.g. `098_add_email_template_category.js` (adds `category`/
  `subcategory` columns to `email_templates` via `knex.schema.alterTable`)
  and `112_add_customer_skonto_disabled.js` (adds `skonto_disabled` to
  `customer_accounts` the same way). Migrations `122`/`123` follow that
  same convention (`hasColumn`-guarded `alterTable`), and `124`/`125`
  follow the sibling convention `MEDIA_REUSE_ADR.md` already used for
  genuinely new one-to-many data (`hasTable`-guarded `createTable`,
  cascade-deleted off `projects.id`). Fork Discipline's rule is "never
  edit an already-shipped migration; add new numbered migrations for our
  extensions" (`CLAUDE.md`, Reminder 2) — satisfied here because 122–125
  are new files that only ever call `ALTER TABLE`/`CREATE TABLE`, and
  migrations `001`–`121` are untouched (proven by AC-38.6's
  `git log --name-only` evidence and the manifest integrity test).
- **Option 2 (a parallel Earth & Honey project table) was rejected**
  because it would create two owners for one Project — the fork's
  `projects` row still holds `status`/`customer_account_id`/every
  upstream-native field that drives upstream logic (invoicing hooks,
  `events.project_id`, the admin UI's own project screens), while the new
  parallel table would hold everything this sprint added. Every future
  read of "the current state of a Project" (the cockpit, US-43; the
  Project Room, US-44) would then need a join across two tables holding
  one logical object, and every write that touches both a shipped field
  and an extension field would need to stay transactionally consistent
  across two tables with no single owner enforcing that — exactly the
  duplicate-ownership defect CLAUDE.md's Pillar 5 ("One owner per business
  function — duplicate ownership is a defect") names directly. It buys
  nothing option 1 does not already provide, since the parallel table
  would still live in the same `backstage-db` Postgres instance — this
  is a same-database modelling question, not the separate-database
  question Reminder 4 governs (that question is decision (b), below).
- **Option 3 (a wholly independent, unlinked duplicate) was rejected**
  even more strongly than option 2, for the same reason plus one more: it
  would sever the FK graph entirely (`events.project_id`,
  `hour_entries.project_id` from migration 118, `customer_accounts`)
  that the rest of the fork already depends on, forcing every consumer —
  upstream and new — to resolve two ids for what is conceptually one
  Project. No requirement in PRD 22 or 23 calls for a Project identity
  independent of the fork's own `projects.id`.

## Decision (b): where do the Project-to-Inquiry and Project-to-ledger cross-system identifiers live?

Reminder 4 (`scrum-master/scrum-master.md`): **"One Postgres server,
separate logical databases, no cross-database joins. Cross-system
relationships are stored external identifiers, resolved over an API."**
Both relationships below cross a real database boundary — Frontstage's
Payload database and Backstage's `backstage-db` are two separate Postgres
*instances* (`PAYLOAD_PICPEAK_API_CONTRACT.md`'s "No cross-database
access" section), and the ledger (Invoice Ninja) is a third, external
system entirely — so both must be stored external identifiers, resolved
over an API call, never a foreign key or a join. This section states,
for each relationship, which side stores the pointer.

### (b-i) Project-to-Inquiry identifier

**Options considered:**

1. Backstage's `projects` row stores a pointer back to the originating
   Frontstage `inquiries` document (e.g. a new `projects.source_inquiry_id`
   column holding a Payload document id).
2. Frontstage's Inquiry/Lead record stores the Backstage-issued
   `customer_account.id` and `project.id` once a Project is created from
   it.
3. A third, dedicated identifier-mapping table or service, outside both
   databases.

**Decision: option 2 — Frontstage stores the Backstage-issued ids.**

This is not a new decision manufactured here — it is already committed to
in `PAYLOAD_PICPEAK_API_CONTRACT.md`'s Flow B (US-18 AC-18.4), which
states explicitly: *"Both ids are written onto the Frontstage Lead/Client
record as stored external identifiers — never a foreign key into
`backstage-db`, consistent with 'No cross-database access'."* AC-38.7's
job is to confirm this Project extension stays consistent with that
already-shipped contract, not to re-litigate it: no column resembling
`source_inquiry_id`, `inquiry_id`, or `lead_id` was added to `projects` by
migrations 122–125 (grepped clean across every file in
`vendor/picpeak/backend/migrations/core/`), and `projectService.createProject`
accepts only `{ name, customerAccountId }`
(`vendor/picpeak/backend/src/services/projectService.js:63`,
`vendor/picpeak/backend/src/routes/adminProjects.js:33-37`) — no inquiry
identifier parameter exists on the Backstage side to receive one.

**Reasons:**

- **Directionally, the Backstage Project is created *from* the Frontstage
  Inquiry**, not the other way around: Flow B's own sequence is Frontstage
  calls `POST /api/v1/customers`, then `POST /api/v1/projects`, and
  *receives back* the two Backstage ids. The side that must remember "what
  this came from" is whichever record already exists and is being
  extended with a result — that is the Frontstage Inquiry/Lead, not a
  Backstage `projects` row that, under option 1, would need a *second*,
  after-the-fact `UPDATE` to learn about a Frontstage document it has no
  other reason to know about. Option 2 needs no such second write; the
  identifiers are captured directly in the same request/response cycle
  that creates them.
- **One relationship, one owner.** Storing the pointer on both sides (a
  Backstage `source_inquiry_id` *and* a Frontstage-held Backstage
  `project.id`) would duplicate the same relationship in two places that
  could drift — Pillar 5's "one owner per business function" applies to a
  relationship between two records exactly as it does to a record itself.
  Option 2 keeps exactly one place this relationship is recorded.
- **A Project does not always come from an Inquiry.** PRD 22.1 names two
  entry paths — converting an Inquiry, or creating a Project manually —
  so any pointer stored *on the Backstage side* would have to be nullable
  and would sit unpopulated for every manually-created Project, adding
  schema surface with no consistent reader. Frontstage-side storage has no
  such gap: an Inquiry that was never converted simply carries no Backstage
  ids yet, which is already the Inquiry's natural, always-valid state.
- **Option 1 was rejected** for the reasons above: it duplicates an
  already-shipped mechanism, needs an extra post-creation write Flow B
  does not otherwise require, and is unpopulated for the manual-entry
  path.
- **Option 3 was rejected** because no identifier-mapping infrastructure
  exists anywhere in this project (`CLAUDE.md`'s Docker Rules enumerate
  every service that runs; there is no generic mapping service among
  them), and introducing one here would only relocate the two-owner risk
  option 1 already has into a third place, while adding an API surface
  neither system currently calls.

### (b-ii) Project-to-ledger identifier

**Options considered:**

1. Backstage stores the ledger's identifiers against the owning Project —
   the already-shipped `project_documents.external_reference` column and
   `project_integration_status.integration_key` row (migration 125, US-38
   AC-38.4).
2. Invoice Ninja stores the Backstage `project.id` in its own custom-field
   mechanism, with Backstage looking it up by querying Invoice Ninja.
3. A dedicated mapping table, in either Backstage or Frontstage, keyed on
   both sides' ids.

**Decision: option 1 — Backstage stores the ledger's identifier, on
`project_documents.external_reference` (and `project_integration_status`
for status observations).**

`125_add_project_documents_and_integration_status.js`'s own migration
comment already names exactly this column for exactly this purpose and
explicitly defers the ownership-direction question to this document:
*"`external_reference` — nullable; a stored external identifier (per
Reminder 4 — resolved over the owning system's API, never a
cross-database join) for a document whose record of truth lives in
another system, e.g. the ledger. Which system owns which identifier is a
PROJECT_DATA_MODEL_ADR.md decision (US-38 AC-38.7); this migration only
gives the column somewhere to be stored."* This section closes that
deferred question: Backstage's `project_documents` row is the side that
stores the ledger's issued reference (e.g. an Invoice Ninja invoice
number, once PRD Phase 6 wires the call that writes it), resolved by
calling Invoice Ninja's API when Backstage needs the document itself —
never a join.

**Reasons:**

- **The side that displays the reference is the side that must be able to
  resolve it without a second system's help to know *what* to resolve.**
  `SYSTEM_OWNERSHIP.md` already names PicPeak/Backstage as authoritative
  for "Operational client identity + Photography Project," and PRD 23.4
  requires the photographer's cockpit — a Backstage-owned surface — to
  show "quote, contract, invoice, payment, and receipt references" and
  integration failures. Backstage already knows which Project it is
  rendering; storing the ledger reference on that Project's own
  `project_documents` row means the cockpit's read is "fetch this
  Project's documents," not "ask a third-party ledger which of its
  invoices, across every client it has ever billed, happens to belong to
  this Project."
- **Consistent with The Ledger Rule.** "Invoice Ninja holds records, never
  surfaces" (`CLAUDE.md`) — the *record* (the invoice, its number, its PDF)
  lives in Invoice Ninja and stays the source of truth for its own
  content, but nothing about that rule requires Invoice Ninja to also hold
  the *relationship* back to our Project. `project_documents` is exactly
  the "display-only cache" pattern `CLAUDE.md`'s headless guards already
  describe for balances and statuses, extended to references.
- **Option 2 was rejected** because Invoice Ninja is headless and
  API-only; its own admin configuration (including any custom-field setup)
  is explicitly out of product scope ("that configuration is not product
  surface," `CLAUDE.md`). Depending on a third-party system's custom
  field as the *source* of a pointer back to us would also invert the
  natural query direction: the cockpit always starts from "this Project,"
  never from "scan every Invoice Ninja invoice for one tagged with our
  project id."
- **Option 3 was rejected** for the same reason as (b-i)'s option 3 — no
  mapping-table infrastructure exists in this project, and one already-
  shipped column (`project_documents.external_reference`, plus
  `project_integration_status` for status/failure observations) already
  satisfies Reminder 4's "stored external identifier, resolved over an
  API" requirement without new schema surface beyond what AC-38.4 already
  built.

### The financial identifier is a placeholder in this sprint

**The financial identifier is a placeholder in this sprint - PRD Phase 6 owns the ledger.**

No Invoice Ninja integration exists anywhere in this
codebase today: nothing calls Invoice Ninja's API, and
`project_documents.external_reference` /
`project_integration_status.integration_key = 'financial_placeholder'`
(migration 125, AC-38.4) exist only as empty, queryable schema with
nothing yet writing to them for a real invoice. Sprint 6's own
`available_configuration` states this directly: *"NO SPRINT-6 STORY
TOUCHES STRIPE OR INVOICE NINJA - finance is PRD Phase 6, and US-41
AC-41.6 tests that the financial integration placeholder makes no call to
either."* This decision records **where** a ledger-issued identifier will
be stored once PRD Phase 6 builds the headless ledger adapter (backlog
item 28, "cross-system identifier mapping, verified"); it does not claim
that adapter, or any live call to Invoice Ninja, exists in this sprint.
