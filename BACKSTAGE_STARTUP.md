# ---
# file: BACKSTAGE_STARTUP.md
# project: earthandhoney
# purpose: AC-16.5 — documented, repeatable start-up procedure from a clean
#          checkout to a running Backstage with an administrator able to
#          sign in, plus the recorded result of exercising it end to end
# created-by: dev-team
# related-story: US-16
# related-ac: 16.5
# ---

# Backstage start-up runbook

Backstage is the forked PicPeak admin app vendored at `vendor/picpeak` (see
US-15/US-16). It runs behind the `backstage` Docker Compose profile so a
plain `docker compose up` — used by the AC-7.2 CI smoke job for the Next.js
app — is unaffected.

## Procedure (clean checkout → signed-in administrator)

1. `git clone` the repo (or start from a checkout with no Backstage
   volumes/containers yet) and `cd` into it.
2. `cp .env.example .env`. Every `BACKSTAGE_*` variable has a working
   built-in default in `docker-compose.yml` (see AC-16.4), so Backstage
   boots from this copy with no edits. Only change the placeholders before
   any non-local/shared deployment.
3. Build and start the Backstage services:
   ```
   docker compose --profile backstage up -d --build backstage-db backstage-backend backstage-frontend
   ```
4. Wait for `backstage-backend` to report healthy:
   ```
   docker inspect --format='{{.State.Health.Status}}' <project>-backstage-backend-1
   ```
   On first boot the vendored entrypoint runs `migrate:safe` against the
   empty `backstage-db` database before the server starts listening (see
   AC-16.2) — this is what the healthcheck is waiting on.
5. Sign in as the seeded administrator through the real front door — the
   nginx-served frontend on port 3100, not a direct backend call:
   ```
   curl -i -X POST http://localhost:3100/api/auth/admin/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"change-me-in-production"}'
   ```
   (or open `http://localhost:3100` in a browser and sign in with the
   `BACKSTAGE_ADMIN_USERNAME` / `BACKSTAGE_ADMIN_PASSWORD` values from
   `.env`). A `200 OK` with a `Set-Cookie: admin_token=...` response proves
   the administrator can sign in.

To tear down (including the Backstage database volume, for re-running this
procedure from a clean state): `docker compose --profile backstage down -v`.

## Recorded run (exercised end to end)

Executed 2026-07-31 from a clean state — `docker compose --profile backstage down -v`
was run first so no `backstage_pgdata` volume existed before this run.

**Step 3 — build and start**, migrations ran automatically on first boot:

```
$ docker compose --profile backstage up -d --build backstage-db backstage-backend
...
Migration Summary:
- Applied: 96 migration(s)
- Skipped: 0 migration(s) (already applied)
- Total: 96 migration(s)

All migrations completed successfully
```

**Step 4 — health check**:

```
$ docker inspect --format='{{.State.Health.Status}}' earthandhoney-backstage-backend-1
healthy
```

Confirmed the seeded administrator exists in Postgres, not a fallback store:

```
$ docker compose --profile backstage exec backstage-db psql -U backstage -d backstage -c "select count(*) from admin_users;"
 count
-------
     1
(1 row)
```

**Step 5 — sign in through the frontend (port 3100), using the `.env.example`
defaults unmodified**:

```
$ curl -i -X POST http://localhost:3100/api/auth/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"change-me-in-production"}'

HTTP/1.1 200 OK
Server: nginx
...
Set-Cookie: admin_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax
...
```

Body: `{"user":{"id":1,"username":"admin","email":"admin@example.com","mustChangePassword":true,"role":{"name":"super_admin","displayName":"Super Admin"}}}`

Result: **PASS** — a clean checkout reached a running Backstage with the
administrator able to sign in, end to end, through the real nginx front
door, using only the defaults documented in `.env.example`.
