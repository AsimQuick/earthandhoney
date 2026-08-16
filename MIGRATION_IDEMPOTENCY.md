<!--
---
file: MIGRATION_IDEMPOTENCY.md
project: earthandhoney
purpose: AC-16.6 — record the two live proof runs that show the Backstage
         migration path is safe: (a) a fresh install applying the pinned
         upstream migrations cleanly to an empty database, and (b) the same
         migration command re-run against that now-already-migrated
         database completing as a no-op, with the migration-state table
         shown before and after. Extended by AC-38.5 to repeat the same
         proof shape for this fork's first schema-altering extension
         migrations (122-125), closing the deferral this doc originally
         recorded under "Explicitly out of scope" below.
created-by: dev-team
related-story: US-16, US-38
related-ac: 16.6, 38.5
---
-->

# Migration path safety proof

This records two live runs against the forked Backstage (`vendor/picpeak`)
proving its migration path is safe as far as it can be proven at this point
in the sprint (US-16, AC-16.6). Both runs used the exact same command the
vendored entrypoint runs on every container start (`npm run migrate:safe`,
i.e. `vendor/picpeak/backend/migrations/run-migrations-safe.js`) — no
substitute or simplified command was used.

Executed 2026-07-31. `docker compose --profile backstage down -v` was run
first, so no `backstage_pgdata` volume existed before run (a).

## (a) Fresh install against an empty database

```
$ docker compose --profile backstage up -d --build backstage-db backstage-backend
...
 Volume "earthandhoney_backstage_pgdata"  Created
 Container earthandhoney-backstage-db-1  Started
 Container earthandhoney-backstage-db-1  Healthy
 Container earthandhoney-backstage-backend-1  Started
```

`backstage-backend` reported `healthy` on its Docker healthcheck 9 checks
(~27s) after start. The vendored entrypoint (`wait-for-db.sh`) ran
`migrate:safe` before the server started listening, producing:

```
Migration Summary:
- Applied: 96 migration(s)
- Skipped: 0 migration(s) (already applied)
- Total: 96 migration(s)

All migrations completed successfully
```

**Migration-state table immediately after run (a):**

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select count(*), min(id), max(id) from migrations;"
 count | min | max
-------+-----+-----
    96 |   1 |  96
(1 row)
```

No error, no fallback to SQLite, no partial application — this is the same
proof already locked by AC-16.2's live run and Jest suite, repeated here as
the "before" state for run (b).

## (b) Re-run of the same migration command against the already-migrated database

The identical command (`npm run migrate:safe`) was run again inside the
running `backstage-backend` container, against the database run (a) had
just migrated — no volume was dropped, no container was recreated between
(a) and (b).

**First re-run:**

```
$ docker compose --profile backstage exec -T backstage-backend npm run migrate:safe
Starting production-safe database migrations...
Database connection verified
Detecting existing schema...
Marked migration 004_add_categories_and_cms.js as applied
Marked migration 006_add_photo_counter_to_categories.js as applied
... (26 filenames total)
Existing deployment detected - checking all migrations

Migration Summary:
- Applied: 0 migration(s)
- Skipped: 122 migration(s) (already applied)
- Total: 122 migration(s)

All migrations completed successfully
```

`Applied: 0` proves no migration SQL was re-executed. The 26 "Marked ...
as applied" lines are the safe runner's own schema-detection step
book-keeping migration files whose tables it found already present from
run (a)'s consolidated initial-schema migrations, but that had not yet
been individually recorded in the `migrations` table — it marks the row,
it does not re-run the migration's SQL (which would error with
`relation already exists` if it had). This is the vendored runner's
documented "production-safe" behaviour (see
`vendor/picpeak/backend/migrations/run-migrations-safe.js`,
"Detecting existing schema") and is not modified by this fork.

**Migration-state table immediately after the first re-run:**

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select count(*), min(id), max(id) from migrations;"
 count | min | max
-------+-----+-----
   122 |   1 | 122
(1 row)
```

No duplicate filenames were created (`group by filename having count(*) > 1`
returned zero rows), the original 96 rows kept their original `applied_at`
timestamps unchanged (verified for `119_add_rendered_html_to_email_queue.js`,
still `2026-07-31 08:52:03`), the public schema still holds exactly 70
tables (unchanged from AC-16.2's baseline), and `admin_users` still holds
exactly the one seeded administrator — no data loss.

**Second re-run — steady-state no-op**, run again with no schema-detection
work left to do, to prove the runner is idempotent on repeat, not just on
its first encounter with a pre-existing schema:

```
$ docker compose --profile backstage exec -T backstage-backend npm run migrate:safe
Starting production-safe database migrations...
Database connection verified
Detecting existing schema...
Existing deployment detected - checking all migrations

Migration Summary:
- Applied: 0 migration(s)
- Skipped: 122 migration(s) (already applied)
- Total: 122 migration(s)

All migrations completed successfully
```

No "Marked ... as applied" lines this time, `Applied: 0`, migration row
count unchanged at 122, no error, exit code 0.

## Result

Both runs are recorded above with real command output. Run (a) proves a
fresh install applies the pinned upstream migrations cleanly to an empty
database. Run (b), run twice, proves the same migration command is safe to
re-run against an already-migrated database: it never re-applies a
migration's SQL, never errors, and never loses data — the second re-run in
particular shows the runner converges to a true no-op once its
schema-detection bookkeeping is settled.

## Explicitly out of scope (at the time): upgrading with our own extension migrations

This AC did not prove an upgrade path that applies *our own* extension
migrations on top of an already-migrated upstream database, because under
Fork Discipline (`FORK_CHANGELOG.md`) no such migration exists yet — this
fork had not added a single schema migration of its own. Inventing a
throwaway migration purely to exercise that path would prove nothing real
about our actual future migrations. That proof was deferred to the
sprint that introduces the first extension migration; the deferral was also
recorded in `UPSTREAM_SYNC.md` so it would not be lost.

**This deferral is closed by the proof below (US-38, AC-38.5).**

- **Recorded:** 2026-07-31
- **Recorded by:** dev-team (US-16, AC-16.6)

## Extension migrations proof (US-38, AC-38.5)

This section repeats the AC-16.6 proof shape for this fork's first
**schema-altering** extension migrations — `122_add_project_new_project_fields.js`,
`123_add_event_detail_fields.js`, `124_add_project_milestones.js` and
`125_add_project_documents_and_integration_status.js` (US-38, ACs 38.1-38.4)
— closing the deferral recorded above and in `UPSTREAM_SYNC.md` §3. Migration
`120` (US-33, AC-33.5.2.1) was the first fork-origin migration but only
inserted one row and altered no schema, so it did not carry the same
upgrade-ordering risk an `ALTER TABLE`/`CREATE TABLE` migration does; `122`
-`125` are the first fork migrations that do.

Executed 2026-08-16, against the local Docker Compose stack. Same command
convention as AC-16.6: the vendored entrypoint's `npm run migrate:safe`
(`vendor/picpeak/backend/migrations/run-migrations-safe.js`), no substitute.

### (a) Fresh install against an empty database

```
$ docker compose --profile backstage down -v
$ docker compose --profile backstage up -d --build backstage-db backstage-backend
...
 Volume "earthandhoney_backstage_pgdata"  Created
 Container earthandhoney-backstage-db-1  Started
 Container earthandhoney-backstage-db-1  Healthy
 Container earthandhoney-backstage-backend-1  Started
```

`backstage-backend` reported `healthy` on its Docker healthcheck. The
vendored entrypoint ran `migrate:safe` before the server started listening,
producing (excerpted from the full log around the new migrations):

```
Running migration: core/121_add_inquiry_acknowledgement_email_template.js
Migration core/121_add_inquiry_acknowledgement_email_template.js completed successfully
Running migration: core/122_add_project_new_project_fields.js
Migration core/122_add_project_new_project_fields.js completed successfully
Running migration: core/123_add_event_detail_fields.js
Migration core/123_add_event_detail_fields.js completed successfully
Running migration: core/124_add_project_milestones.js
Migration core/124_add_project_milestones.js completed successfully
Running migration: core/125_add_project_documents_and_integration_status.js
Migration core/125_add_project_documents_and_integration_status.js completed successfully

Migration Summary:
- Applied: 102 migration(s)
- Skipped: 0 migration(s) (already applied)
- Total: 102 migration(s)

All migrations completed successfully
```

`Skipped: 0` on a completely empty database confirms every one of the 122
core migration files — including the four new ones — runs clean, in order,
with no error, on a fresh install. Exit code of the container health check
sequence: `0` (container reached `healthy`).

**Migration-state table immediately after run (a):**

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select count(*), min(id), max(id) from migrations;"
 count | min | max
-------+-----+-----
   102 |   1 | 102
(1 row)
```

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select filename from migrations where filename like '%12%' order by filename;"
...
 112_add_customer_skonto_disabled.js
 120_add_inquiry_notification_email_template.js
 121_add_inquiry_acknowledgement_email_template.js
 122_add_project_new_project_fields.js
 123_add_event_detail_fields.js
 124_add_project_milestones.js
 125_add_project_documents_and_integration_status.js
(7 rows)
```

All four new migrations are recorded. `\d projects` confirms the AC-38.1
columns (`photography_type`, `first_event_date`, `first_event_date_tbd`,
`venue_city`, `venue_city_tbd`, `lead_source`, `internal_note`,
`secondary_contact_name`, `secondary_contact_email`,
`secondary_contact_phone`, `current_phase`) exist on the live table.

### (b) Re-run of the same migration command against the already-migrated database

The identical command (`npm run migrate:safe`) was run twice inside the
running `backstage-backend` container, against the database run (a) had
just migrated — no volume was dropped, no container was recreated between
(a) and (b).

**First re-run:**

```
$ docker compose --profile backstage exec -T backstage-backend npm run migrate:safe
Starting production-safe database migrations...
Database connection verified
Detecting existing schema...
Marked migration 004_add_categories_and_cms.js as applied
... (26 filenames total, the same legacy-schema bookkeeping AC-16.6 recorded)
Existing deployment detected - checking all migrations

Migration Summary:
- Applied: 0 migration(s)
- Skipped: 128 migration(s) (already applied)
- Total: 128 migration(s)

All migrations completed successfully
$ echo "EXIT CODE: $?"
EXIT CODE: 0
```

`Applied: 0` proves none of the four new migrations' SQL (or any other
migration's) was re-executed — in particular, migration `122`'s
`ALTER TABLE ... ADD COLUMN` and `124`/`125`'s `CREATE TABLE` did not
re-run, which would otherwise error with `column already exists` /
`relation already exists`.

**Migration-state table immediately after the first re-run:**

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select count(*), min(id), max(id) from migrations;"
 count | min | max
-------+-----+-----
   128 |   1 | 128
(1 row)
```

**Second re-run — steady-state no-op**, run again with no schema-detection
work left to do, to prove convergence, not just a first-encounter fix-up:

```
$ docker compose --profile backstage exec -T backstage-backend npm run migrate:safe
Starting production-safe database migrations...
Database connection verified
Detecting existing schema...
Existing deployment detected - checking all migrations

Migration Summary:
- Applied: 0 migration(s)
- Skipped: 128 migration(s) (already applied)
- Total: 128 migration(s)

All migrations completed successfully
$ echo "EXIT CODE: $?"
EXIT CODE: 0
```

No "Marked ... as applied" lines this time, `Applied: 0`, exit code `0`,
migration row count unchanged at 128:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select count(*), min(id), max(id) from migrations;"
 count | min | max
-------+-----+-----
   128 |   1 | 128
(1 row)

$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select filename, count(*) from migrations group by filename having count(*) > 1;"
 filename | count
----------+-------
(0 rows)
```

Zero duplicate filenames after two re-runs.

### Result

Run (a) proves all four new migrations (`122`-`125`) apply cleanly, in
order, with zero errors, on a fresh empty database. Run (b), run twice,
proves the same migration command is safe to re-run against a database that
already carries them: `Applied: 0` both times, no duplicate rows, no error,
exit code `0` on every invocation — the schema-altering extension-migration
upgrade proof `UPSTREAM_SYNC.md` §3 deferred is now recorded.

- **Recorded:** 2026-08-16
- **Recorded by:** dev-team (US-38, AC-38.5)

## Extension migrations proof (US-39, AC-39.6.1.3)

This section repeats the same proof shape for AC-39.6's two schema
prerequisites — `128_add_project_activity_timeline.js` (AC-39.6.1.1, the
Project's append-only activity timeline table) and
`129_seed_events_manage_permission.js` (AC-39.6.1.2, seeding the
`events.manage` permission and granting it to `super_admin`) — the first
extension migrations added since AC-38.5's proof of `122`-`125`. Unlike
AC-38.5, this AC also proves an **up-down-up** cycle: both new migrations
rolled back and re-applied, not just re-run forward.

Executed 2026-08-16, against the local Docker Compose stack.
`backstage-backend` was rebuilt (`--build`) before this run: AC-39.3.1's
request-path map had recorded a stale running container serving code that no
longer existed in source, and the two new migration files are baked into the
image at build time, so a stale image would not have shown them at all. Same
command convention as AC-16.6/AC-38.5: the vendored entrypoint's
`npm run migrate:safe` (`vendor/picpeak/backend/migrations/run-migrations-safe.js`),
no substitute.

### (a) Fresh install against an empty database

```
$ docker compose --profile backstage down -v
$ docker compose --profile backstage up -d --build backstage-db backstage-backend
...
 Volume "earthandhoney_backstage_pgdata"  Created
 Container earthandhoney-backstage-db-1  Created
 Container earthandhoney-backstage-backend-1  Created
 Container earthandhoney-backstage-db-1  Started
 Container earthandhoney-backstage-db-1  Healthy
 Container earthandhoney-backstage-backend-1  Started
```

`backstage-backend` reported `healthy` on its Docker healthcheck (13 checks,
~26s). The vendored entrypoint ran `migrate:safe` before the server started
listening, producing (excerpted from the full log around the new
migrations):

```
Running migration: core/126_add_project_booking_requirements.js
Migration core/126_add_project_booking_requirements.js completed successfully
Running migration: core/127_add_project_next_action_overrides.js
Migration core/127_add_project_next_action_overrides.js completed successfully
Running migration: core/128_add_project_activity_timeline.js
Migration core/128_add_project_activity_timeline.js completed successfully
Running migration: core/129_seed_events_manage_permission.js
Migration core/129_seed_events_manage_permission.js completed successfully

Migration Summary:
- Applied: 106 migration(s)
- Skipped: 0 migration(s) (already applied)
- Total: 106 migration(s)

All migrations completed successfully
```

`Skipped: 0` on a completely empty database confirms every one of the 106
core migration files — including the two new ones — runs clean, in order,
with no error, on a fresh install.

**Migration-state table immediately after run (a):**

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select count(*), min(id), max(id) from migrations;"
 count | min | max
-------+-----+-----
   106 |   1 | 106
(1 row)
```

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select filename from migrations where filename like '%12%' order by filename;"
...
 126_add_project_booking_requirements.js
 127_add_project_next_action_overrides.js
 128_add_project_activity_timeline.js
 129_seed_events_manage_permission.js
(11 rows)
```

Both new migrations are recorded. `\d project_activity_timeline` confirms
the AC-39.6.1.1 table (`id`, `project_id`, `entry_type`, `summary`,
`actor_admin_id`, `actor_name`, `metadata`, `occurred_at`) exists on the live
database, with `project_id` a `NOT NULL` foreign key to `projects.id`
`ON DELETE CASCADE` and `actor_admin_id` a nullable foreign key to
`admin_users.id` `ON DELETE SET NULL`. A live query confirms the
`events.manage` permission row exists and is granted to `super_admin`.

### (b) Up-down-up: both new migrations rolled back and re-applied

Run inside the same running `backstage-backend` container, against the
database run (a) had just migrated — no volume dropped, no container
recreated. Because the vendored entrypoint ships no rollback command (only
`migrate`/`migrate:safe`), this drove the two migration modules' own
`down()`/`up()` functions directly against the real database connection
(`src/database/db`), using the identical transactional
insert/delete-from-`migrations` convention `run-migrations-safe.js`'s own
`runMigrationSafely()` uses, so the tracking table is left exactly as a real
runner would leave it. Rolled back in reverse creation order (`129` then
`128`, since `129`'s permission seed has no dependency on `128`'s table);
re-applied in forward order (`128` then `129`).

```
Database connection verified

--- DOWN phase (reverse order: 129, then 128) ---
DOWN ok: 129_seed_events_manage_permission.js
DOWN ok: 128_add_project_activity_timeline.js
Rows remaining for 128/129 after DOWN: 0
project_activity_timeline table exists after DOWN: false
events.manage permission row exists after DOWN: false

--- UP phase (forward order: 128, then 129) ---
UP ok: 128_add_project_activity_timeline.js
UP ok: 129_seed_events_manage_permission.js
Rows present for 128/129 after UP: 128_add_project_activity_timeline.js, 129_seed_events_manage_permission.js
project_activity_timeline table exists after UP: true
events.manage permission row exists after UP: true
events.manage granted to super_admin after UP: true
$ echo "EXIT CODE: $?"
EXIT CODE: 0
```

`down()` dropped `project_activity_timeline` and deleted the `events.manage`
permission row (its `role_permissions` grant went with it via the `056`
`ON DELETE CASCADE`); `up()` recreated both from a clean slate. Migration
row count unchanged at `106` after the cycle (two deleted, two re-inserted):

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select count(*), min(id), max(id) from migrations;"
 count | min | max
-------+-----+-----
   106 |   1 | 108
(1 row)
```

(`max` moved from `106` to `108` because the delete-then-reinsert bumped the
tracking table's own auto-increment sequence — expected and harmless; it is
not a migration-numbering column.) No duplicate filenames:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select filename, count(*) from migrations group by filename having count(*) > 1;"
 filename | count
----------+-------
(0 rows)
```

### (c) Re-run of the vendored entrypoint's own migration command, twice

The identical command (`npm run migrate:safe`) was run twice inside the
running `backstage-backend` container, against the database (b) had just
returned to a fully-migrated state.

**First re-run:**

```
$ docker compose --profile backstage exec -T backstage-backend npm run migrate:safe
Starting production-safe database migrations...
Database connection verified
Detecting existing schema...
Marked migration 004_add_categories_and_cms.js as applied
... (26 filenames total, the same legacy-schema bookkeeping AC-16.6/AC-38.5 recorded)
Existing deployment detected - checking all migrations

Migration Summary:
- Applied: 0 migration(s)
- Skipped: 132 migration(s) (already applied)
- Total: 132 migration(s)

All migrations completed successfully
$ echo "EXIT CODE: $?"
EXIT CODE: 0
```

`Applied: 0` proves neither new migration's SQL was re-executed — in
particular, `128`'s `CREATE TABLE` and `129`'s permission/grant inserts did
not re-run, which would otherwise error with `relation already exists` /
insert a duplicate row.

**Second re-run — steady-state no-op:**

```
$ docker compose --profile backstage exec -T backstage-backend npm run migrate:safe
Starting production-safe database migrations...
Database connection verified
Detecting existing schema...
Existing deployment detected - checking all migrations

Migration Summary:
- Applied: 0 migration(s)
- Skipped: 132 migration(s) (already applied)
- Total: 132 migration(s)

All migrations completed successfully
$ echo "EXIT CODE: $?"
EXIT CODE: 0
```

No "Marked ... as applied" lines this time, `Applied: 0`, exit code `0`,
migration row count unchanged at `132`, zero duplicate filenames, no data
loss (`admin_users` still holds exactly the one seeded administrator; the
public schema holds 76 tables):

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select count(*), min(id), max(id) from migrations;"
 count | min | max
-------+-----+-----
   132 |   1 | 134
(1 row)

$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select filename, count(*) from migrations group by filename having count(*) > 1;"
 filename | count
----------+-------
(0 rows)
```

### Result

Run (a) proves both new migrations (`128`, `129`) apply cleanly, in order,
with zero skips, on a fresh empty database. Run (b) proves an up-down-up
cycle: both migrations' `down()` cleanly removes what their `up()` created
(the timeline table, the permission row and its grant), and re-running
`up()` recreates them from a clean slate, exit code `0` throughout. Run (c),
run twice against the database that cycle left behind, proves the same
vendored migration command is safe to re-run: `Applied: 0` and exit `0` both
times, with the second run a true steady-state no-op (no schema-detection
bookkeeping left to do) and zero duplicate migration filenames — the
AC-39.6.1.3 live idempotency proof.

- **Recorded:** 2026-08-16
- **Recorded by:** dev-team (US-39, AC-39.6.1.3)
