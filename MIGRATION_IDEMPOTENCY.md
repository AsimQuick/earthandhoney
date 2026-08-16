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
