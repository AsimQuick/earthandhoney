#!/usr/bin/env bash
# ---
# file: scripts/ac33.5.3-no-secret-in-browser-build-proof.sh
# project: earthandhoney
# purpose: AC-33.5.3(b) — the committed, re-runnable half of the two bounded
#          checks over the closed list of named secrets AC-33.5.3 names:
#          BACKSTAGE_API_TOKEN, SMTP_HOST, SMTP_USER, SMTP_PASS,
#          SMTP_PASSWORD. src/__tests__/us33-ac33.5.3-no-secret-in-browser-static.test.ts
#          (AC-33.5.3(a)) proves the source invariants; this script proves
#          the *compiled* invariant a static source check cannot: that a
#          REAL production `next build` — not `next dev`, which serves
#          unminified on-demand modules and would miss a secret the
#          production compiler alone inlines — never emits any of these
#          five values, or their five bare names (the leg that keeps working
#          after a value rotates), into anything the browser can fetch.
#
#          Invented, never-real sentinel values (unique per run via
#          `$(date +%s)-$$`) are loaded into all five env vars for an
#          ephemeral Frontstage container that runs `npm run build && npm
#          run start` — this is what makes the transcript safe to commit
#          (DoD item 5): no real credential is ever loaded. The named
#          container is NOT started with `--rm` and its build output is NOT
#          copied out until after the scan, because docker removes a `run
#          --rm` container's anonymous volumes (this repo's `web` service
#          mounts `/app/.next` as one, docker-compose.yml) on exit — losing
#          exactly the artifact this script has to inspect.
#
#          What is scanned, byte for byte: (1) the whole of `.next/static`,
#          copied out of the container via `docker cp` — every client chunk
#          the production build emitted, regardless of which page currently
#          references it; (2) the served HTML of the inquiry-bearing page —
#          a real published `Pages` (US-31) document, created through the
#          real Payload REST API the same way
#          scripts/ac33.5.2.2-backstage-token-proof.sh does, then fetched
#          from the running `next start` server (StandardPageTemplate's
#          `page-inquiry-form-region` slot, US-31 AC-31.3, is the region
#          US-33 is building this flow for); (3) every same-origin
#          `<script src>` that HTML tells the browser to fetch, fetched for
#          real from the running server rather than assumed identical to the
#          `.next/static` copy.
#
#          Both a sentinel-value hit and a bare-name hit fail the run — a
#          bare-name hit is checked even though today's application code
#          (src/lib/inquiryNotification.ts) never sends a secret NAME to a
#          client, precisely so the check keeps working after a refactor
#          that couldn't affect the value channel this run's sentinels
#          exercise.
#
#          The Payload `Pages` fixture, the ephemeral container, and the
#          scan tempdir are all removed on exit (success or failure) so a
#          re-run accumulates no state — the same discipline
#          ac33.5.2.2-backstage-token-proof.sh uses for its own fixtures.
# usage:   scripts/ac33.5.3-no-secret-in-browser-build-proof.sh
# env:     FRONTSTAGE_BUILD_PROOF_PORT (default 3104)
# created-by: dev-team
# related-story: US-33
# related-ac: 33.5.3
# ---
set -euo pipefail

PORT="${FRONTSTAGE_BUILD_PROOF_PORT:-3104}"
BASE="http://localhost:${PORT}"
CONTAINER="ac33-5-3-proof-frontstage-build"
MARKER="ac33.5.3-proof-$(date +%s)-$$"

# The five named secrets, exactly the closed list AC-33.5.3 gives — the
# script fails on either a sentinel-value hit or a bare-name hit for any of
# them, so the two arrays below are searched together, not separately.
SECRET_NAMES=(BACKSTAGE_API_TOKEN SMTP_HOST SMTP_USER SMTP_PASS SMTP_PASSWORD)
SENTINEL_BACKSTAGE_API_TOKEN="sentinel-${MARKER}-backstage-api-token"
SENTINEL_SMTP_HOST="sentinel-${MARKER}-smtp-host.invalid"
SENTINEL_SMTP_USER="sentinel-${MARKER}-smtp-user"
SENTINEL_SMTP_PASS="sentinel-${MARKER}-smtp-pass"
SENTINEL_SMTP_PASSWORD="sentinel-${MARKER}-smtp-password"

# Same shared live-test fixture identity as
# scripts/ac33.5.2.2-backstage-token-proof.sh and
# src/test-support/liveApiAuth.ts — Payload honors `first-register` exactly
# once per database, so a second identity here could never authenticate
# against a database a live test already claimed.
FIXTURE_EMAIL="live-api-fixture@earthandhoney.test"
FIXTURE_PASSWORD='Live-Api-Fixture-Password!23'

say() { printf '\n=== %s\n' "$*"; }

jqpy() {
  python3 -c "import json, sys
$1"
}

SCANDIR="$(mktemp -d)"
PAGE_ID=""
AUTH=""

cleanup() {
  if [ -n "$AUTH" ] && [ -n "$PAGE_ID" ]; then
    curl -s -o /dev/null -X DELETE -H "Authorization: JWT ${AUTH}" "${BASE}/api/pages/${PAGE_ID}" || true
  fi
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$SCANDIR"
}
trap cleanup EXIT

# --- (1) Build + start a production server with sentinel values loaded ----
say "(1) docker compose run -d ${CONTAINER}: npm run build && npm run start (sentinel env, port ${PORT})"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker compose run -d --name "$CONTAINER" \
  -e BACKSTAGE_API_TOKEN="$SENTINEL_BACKSTAGE_API_TOKEN" \
  -e SMTP_HOST="$SENTINEL_SMTP_HOST" \
  -e SMTP_USER="$SENTINEL_SMTP_USER" \
  -e SMTP_PASS="$SENTINEL_SMTP_PASS" \
  -e SMTP_PASSWORD="$SENTINEL_SMTP_PASSWORD" \
  -p "${PORT}:3000" web sh -c 'npm run build && npm run start' >/dev/null
echo "container ${CONTAINER} started — sentinel values passed in-memory via -e, never written to .env or a file"

echo -n "waiting for the production server to answer"
UP=0
for _ in $(seq 1 100); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "${BASE}/api/users")" != "000" ]; then
    UP=1
    break
  fi
  echo -n "."
  sleep 3
done
echo
if [ "$UP" != "1" ]; then
  echo "FAIL: the production server never answered on ${BASE} (build/start log follows)." >&2
  docker logs --tail 80 "$CONTAINER" >&2 || true
  exit 1
fi
echo "server answering on ${BASE} (production build, npm run start)"

# --- (2) A real published Pages document, via the real Payload REST API ---
say "(2) Authenticating against Payload and creating the inquiry-bearing page fixture"
curl -s -o /dev/null -X POST "${BASE}/api/users/first-register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${FIXTURE_EMAIL}\",\"password\":\"${FIXTURE_PASSWORD}\"}" || true
AUTH="$(curl -s -X POST "${BASE}/api/users/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${FIXTURE_EMAIL}\",\"password\":\"${FIXTURE_PASSWORD}\"}" \
  | jqpy "print(json.load(sys.stdin).get('token') or '')")"
if [ -z "$AUTH" ]; then
  echo "FAIL: could not obtain a Payload JWT for ${FIXTURE_EMAIL}." >&2
  exit 1
fi
echo "Payload JWT obtained for ${FIXTURE_EMAIL}"

SLUG="ac33-5-3-proof-$(date +%s)-$$"
PAGE_BODY="$(python3 -c "
import json
print(json.dumps({
    'internalName': 'AC-33.5.3 proof page ${MARKER}',
    'heading': 'AC-33.5.3 proof heading ${MARKER}',
    'slug': '${SLUG}',
    'status': 'published',
    'indexing': 'index',
}))
")"
PAGE_RES="$(curl -s -X POST "${BASE}/api/pages" \
  -H "Authorization: JWT ${AUTH}" -H 'Content-Type: application/json' \
  -d "$PAGE_BODY")"
PAGE_ID="$(printf '%s' "$PAGE_RES" | jqpy "d=json.load(sys.stdin); print((d.get('doc') or d).get('id') or '')")"
if [ -z "$PAGE_ID" ]; then
  echo "FAIL: could not create the Pages fixture. Response: ${PAGE_RES}" >&2
  exit 1
fi
echo "Pages fixture created: id=${PAGE_ID} slug=${SLUG}"

# --- (3) Fetch the served HTML, and every same-origin script it names -----
say "(3) Fetching the served page HTML and its same-origin <script src> set"
PAGE_HTML="${SCANDIR}/page.html"
curl -s "${BASE}/${SLUG}" -o "$PAGE_HTML"
if ! grep -q "AC-33.5.3 proof heading ${MARKER}" "$PAGE_HTML"; then
  echo "FAIL: the served page did not render the expected heading — fixture didn't actually publish." >&2
  exit 1
fi
echo "page HTML saved: $(wc -c < "$PAGE_HTML") bytes"

mkdir -p "${SCANDIR}/scripts"
SCRIPT_PATHS="$(grep -oE '<script[^>]+src="/[^"]+"' "$PAGE_HTML" | grep -oE '"/[^"]+"' | tr -d '"' | sort -u || true)"
SCRIPT_COUNT=0
while IFS= read -r SRC; do
  [ -z "$SRC" ] && continue
  SCRIPT_COUNT=$((SCRIPT_COUNT + 1))
  OUT="${SCANDIR}/scripts/script-${SCRIPT_COUNT}.js"
  curl -s "${BASE}${SRC}" -o "$OUT"
done <<< "$SCRIPT_PATHS"
echo "fetched ${SCRIPT_COUNT} same-origin <script src> file(s) the page tells the browser to fetch"

# --- (4) Copy out the whole of .next/static — every client chunk built ----
say "(4) docker cp ${CONTAINER}:/app/.next/static -> scan tempdir"
docker cp "${CONTAINER}:/app/.next/static" "${SCANDIR}/next-static" >/dev/null
echo "$(find "${SCANDIR}/next-static" -type f | wc -l | tr -d ' ') files copied out of .next/static"

# --- (5) Scan every byte for a sentinel value or a bare secret name -------
say "(5) Scanning every byte fetched for a sentinel value or a bare secret name"
SCAN_STATUS=0
python3 - "$SCANDIR" "$MARKER" <<'PYEOF' || SCAN_STATUS=$?
import os
import sys

scandir, marker = sys.argv[1], sys.argv[2]

sentinels = {
    "BACKSTAGE_API_TOKEN sentinel": f"sentinel-{marker}-backstage-api-token",
    "SMTP_HOST sentinel": f"sentinel-{marker}-smtp-host.invalid",
    "SMTP_USER sentinel": f"sentinel-{marker}-smtp-user",
    "SMTP_PASS sentinel": f"sentinel-{marker}-smtp-pass",
    "SMTP_PASSWORD sentinel": f"sentinel-{marker}-smtp-password",
}
bare_names = {
    "BACKSTAGE_API_TOKEN name": "BACKSTAGE_API_TOKEN",
    "SMTP_HOST name": "SMTP_HOST",
    "SMTP_USER name": "SMTP_USER",
    "SMTP_PASS name": "SMTP_PASS",
    "SMTP_PASSWORD name": "SMTP_PASSWORD",
}
patterns = {**sentinels, **bare_names}

file_count = 0
byte_count = 0
hits = []

for root, _dirs, files in os.walk(scandir):
    for name in files:
        path = os.path.join(root, name)
        with open(path, "rb") as f:
            data = f.read()
        file_count += 1
        byte_count += len(data)
        for label, needle in patterns.items():
            if needle.encode("utf-8") in data:
                hits.append((path, label, needle))

print(f"scanned {file_count} files, {byte_count} bytes, {len(patterns)} patterns ({len(sentinels)} sentinel values + {len(bare_names)} bare names)")

if hits:
    print("FAIL: found the following in browser-reachable bytes:", file=sys.stderr)
    for path, label, needle in hits:
        print(f"  {path}: {label} ({needle!r})", file=sys.stderr)
    sys.exit(1)

print("PASS: no sentinel value and no bare secret name found in any scanned byte")
PYEOF

if [ "$SCAN_STATUS" != "0" ]; then
  echo "FAIL: AC-33.5.3(b) did not pass." >&2
  exit 1
fi

say "AC-33.5.3(b) PASSED"
echo "Marker ${MARKER}. Production build + served HTML + same-origin scripts + .next/static all clean."
