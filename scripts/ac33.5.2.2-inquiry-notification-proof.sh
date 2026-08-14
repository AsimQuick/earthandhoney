#!/usr/bin/env bash
# ---
# file: scripts/ac33.5.2.2-inquiry-notification-proof.sh
# project: earthandhoney
# purpose: AC-33.5.2.2's live proof that Backstage now has an HTTP way for a
#          service to queue a studio-notification email — the capability
#          AC-33.5.1's go/no-go said it lacked. Mints its own scoped API
#          tokens (no committed script had done this before this AC — see
#          adminApiTokens.js:44-56, plaintext returned exactly once), then
#          proves, against the real running Backstage stack rather than by
#          inspecting the route's source:
#            (a) a call to POST /api/v1/notifications/inquiry with NO
#                Authorization header 401s (apiTokenAuth.js:43-89) — auth is
#                present, not merely assumed;
#            (b) a call with a read-only-scoped token 403s
#                (requireApiScope('write'), apiTokenAuth.js:96-113) — the
#                scope gate is real, not just declared in the route;
#            (c) a call with a write-scoped token 201s, and the resulting
#                email_queue row is read straight out of Backstage's own
#                Postgres (docker exec psql — not the admin API, so the
#                queued row is verified independently of the route that
#                wrote it) showing status = 'pending' and event_id IS NULL
#                (an inquiry is not a gallery event; email_queue.event_id is
#                nullable — db.js:330).
#          Nothing is sent by this script: it queues a row for the ordinary
#          60-second background processor to pick up, but never flushes or
#          waits for it — AC-33.5.2.2 is scoped to "queue", not "send".
#          Idempotent by design: every run mints its own tokens (a plaintext
#          token cannot be reused across runs) but revokes both at the end
#          via a trap, so no run leaves a live credential behind, and running
#          this script twice in a row is safe.
# usage:   scripts/ac33.5.2.2-inquiry-notification-proof.sh
# env:     BACKSTAGE_URL (default http://localhost:3101),
#          BACKSTAGE_ADMIN_USERNAME, BACKSTAGE_ADMIN_PASSWORD (see defaults
#          below, matching .env.example)
# needs:   the "backstage" profile up (BACKSTAGE_STARTUP.md) with migration
#          120_add_inquiry_notification_email_template.js applied (US-33
#          AC-33.5.2.1) and this AC's route mounted in server.js.
# created-by: dev-team
# related-story: US-33
# related-ac: 33.5.2.2
# ---
set -euo pipefail

BACKSTAGE="${BACKSTAGE_URL:-http://localhost:3101}"
ADMIN_USER="${BACKSTAGE_ADMIN_USERNAME:-admin}"
ADMIN_PASS="${BACKSTAGE_ADMIN_PASSWORD:-change-me-in-production}"

COOKIES="$(mktemp)"
WRITE_TOKEN_ID=""
READ_TOKEN_ID=""
OVERALL_STATUS=0

say() { printf '\n=== %s\n' "$*"; }

jqpy() {
  python3 -c "import json, sys
$1"
}

cleanup() {
  # Revoke whatever tokens this run minted, so a re-run never accumulates
  # live credentials. Best-effort — cleanup must not mask a real failure.
  if [ -n "$WRITE_TOKEN_ID" ]; then
    curl -s -b "$COOKIES" -X DELETE "${BACKSTAGE}/api/admin/api-tokens/${WRITE_TOKEN_ID}" -o /dev/null || true
  fi
  if [ -n "$READ_TOKEN_ID" ]; then
    curl -s -b "$COOKIES" -X DELETE "${BACKSTAGE}/api/admin/api-tokens/${READ_TOKEN_ID}" -o /dev/null || true
  fi
  rm -f "$COOKIES"
}
trap cleanup EXIT

expect_status() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "PASS: ${label} -> HTTP ${actual}"
  else
    echo "FAIL: ${label} -> expected HTTP ${expected}, got HTTP ${actual}" >&2
    OVERALL_STATUS=1
  fi
}

say "Backstage admin login"
LOGIN_STATUS=$(curl -s -c "$COOKIES" -X POST "${BACKSTAGE}/api/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}" \
  -o /dev/null -w '%{http_code}')
expect_status "admin login" 200 "$LOGIN_STATUS"

say "(a) POST /api/v1/notifications/inquiry with no Authorization header"
NO_TOKEN_BODY="$(mktemp)"
NO_TOKEN_STATUS=$(curl -s -o "$NO_TOKEN_BODY" -w '%{http_code}' \
  -X POST "${BACKSTAGE}/api/v1/notifications/inquiry" \
  -H 'Content-Type: application/json' \
  -d '{"recipient_email":"studio@earthandhoney.test","form_title":"AC-33.5.2.2 proof","source_page":"/contact","submission_summary":"no-token case"}')
cat "$NO_TOKEN_BODY"; echo
expect_status "no token" 401 "$NO_TOKEN_STATUS"
rm -f "$NO_TOKEN_BODY"

say "Mint a read-only-scoped API token (proves the 403 case, not just the 401 case)"
READ_TOKEN_RESP=$(curl -s -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/api-tokens" \
  -H 'Content-Type: application/json' \
  -d '{"name":"AC-33.5.2.2 live proof (read-only)","scopes":["read"]}')
READ_TOKEN_ID=$(echo "$READ_TOKEN_RESP" | jqpy "print(json.load(sys.stdin)['id'])")
READ_TOKEN=$(echo "$READ_TOKEN_RESP" | jqpy "print(json.load(sys.stdin)['token'])")
echo "minted read-only token id=${READ_TOKEN_ID} preview=$(echo "$READ_TOKEN_RESP" | jqpy "print(json.load(sys.stdin)['preview'])")"

say "(b) POST /api/v1/notifications/inquiry with the read-only token"
READ_BODY="$(mktemp)"
READ_STATUS=$(curl -s -o "$READ_BODY" -w '%{http_code}' \
  -X POST "${BACKSTAGE}/api/v1/notifications/inquiry" \
  -H "Authorization: Bearer ${READ_TOKEN}" -H 'Content-Type: application/json' \
  -d '{"recipient_email":"studio@earthandhoney.test","form_title":"AC-33.5.2.2 proof","source_page":"/contact","submission_summary":"read-only-scope case"}')
cat "$READ_BODY"; echo
expect_status "read-only token" 403 "$READ_STATUS"
rm -f "$READ_BODY"

say "Mint a write-scoped API token"
WRITE_TOKEN_RESP=$(curl -s -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/api-tokens" \
  -H 'Content-Type: application/json' \
  -d '{"name":"AC-33.5.2.2 live proof (write)","scopes":["write"]}')
WRITE_TOKEN_ID=$(echo "$WRITE_TOKEN_RESP" | jqpy "print(json.load(sys.stdin)['id'])")
WRITE_TOKEN=$(echo "$WRITE_TOKEN_RESP" | jqpy "print(json.load(sys.stdin)['token'])")
echo "minted write token id=${WRITE_TOKEN_ID} preview=$(echo "$WRITE_TOKEN_RESP" | jqpy "print(json.load(sys.stdin)['preview'])")"

say "(c) POST /api/v1/notifications/inquiry with the write token"
MARKER="AC-33.5.2.2 live proof $(date -u +%Y%m%dT%H%M%SZ 2>/dev/null || echo run)"
WRITE_BODY="$(mktemp)"
WRITE_STATUS=$(curl -s -o "$WRITE_BODY" -w '%{http_code}' \
  -X POST "${BACKSTAGE}/api/v1/notifications/inquiry" \
  -H "Authorization: Bearer ${WRITE_TOKEN}" -H 'Content-Type: application/json' \
  -d "{\"recipient_email\":\"studio@earthandhoney.test\",\"form_title\":\"${MARKER}\",\"source_page\":\"/contact\",\"submission_summary\":\"write-scope happy path\"}")
cat "$WRITE_BODY"; echo
expect_status "write token" 201 "$WRITE_STATUS"
rm -f "$WRITE_BODY"

say "Reading the queued row straight out of Backstage's own Postgres"
QUEUE_ROW=$(docker compose --profile backstage exec -T backstage-db \
  psql -U "${BACKSTAGE_DB_USER:-backstage}" -d "${BACKSTAGE_DB_NAME:-backstage}" -t -A -F'|' -c \
  "SELECT id, event_id, status, email_type, recipient_email FROM email_queue WHERE email_type = 'inquiry_received' AND email_data::text LIKE '%${MARKER}%' ORDER BY id DESC LIMIT 1;")
echo "email_queue row: ${QUEUE_ROW}"

if [ -z "$QUEUE_ROW" ]; then
  echo "FAIL: no email_queue row found for this run's marker" >&2
  OVERALL_STATUS=1
else
  ROW_EVENT_ID=$(echo "$QUEUE_ROW" | cut -d'|' -f2)
  ROW_STATUS=$(echo "$QUEUE_ROW" | cut -d'|' -f3)
  ROW_TYPE=$(echo "$QUEUE_ROW" | cut -d'|' -f4)

  if [ -z "$ROW_EVENT_ID" ]; then
    echo "PASS: event_id IS NULL"
  else
    echo "FAIL: expected event_id NULL, got '${ROW_EVENT_ID}'" >&2
    OVERALL_STATUS=1
  fi
  if [ "$ROW_STATUS" = "pending" ]; then
    echo "PASS: status = 'pending'"
  else
    echo "FAIL: expected status 'pending', got '${ROW_STATUS}'" >&2
    OVERALL_STATUS=1
  fi
  if [ "$ROW_TYPE" = "inquiry_received" ]; then
    echo "PASS: email_type = 'inquiry_received'"
  else
    echo "FAIL: expected email_type 'inquiry_received', got '${ROW_TYPE}'" >&2
    OVERALL_STATUS=1
  fi
fi

say "Result"
if [ "$OVERALL_STATUS" -eq 0 ]; then
  echo "ALL CHECKS PASSED"
else
  echo "ONE OR MORE CHECKS FAILED" >&2
fi
exit "$OVERALL_STATUS"
