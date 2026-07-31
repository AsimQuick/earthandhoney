<!--
---
file: MIGRATION_IDEMPOTENCY.md
project: earthandhoney
purpose: AC-16.6 — record the two live proof runs that show the Backstage
         migration path is safe: (a) a fresh install applying the pinned
         upstream migrations cleanly to an empty database, and (b) the same
         migration command re-run against that now-already-migrated
         database completing as a no-op, with the migration-state table
         shown before and after.
created-by: dev-team
related-story: US-16
related-ac: 16.6
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

## Explicitly out of scope: upgrading with our own extension migrations

This AC does not prove an upgrade path that applies *our own* extension
migrations on top of an already-migrated upstream database, because under
Fork Discipline (`FORK_CHANGELOG.md`) no such migration exists yet — this
fork has not added a single schema migration of its own. Inventing a
throwaway migration purely to exercise that path would prove nothing real
about our actual future migrations. That proof is deferred to the sprint
that introduces the first extension migration; the deferral is also
recorded in `UPSTREAM_SYNC.md` so it is not lost.

- **Recorded:** 2026-07-31
- **Recorded by:** dev-team (US-16, AC-16.6)
