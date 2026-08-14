#!/usr/bin/env bash
# ---
# file: scripts/ac33.5.2.2-backstage-token-proof.sh
# project: earthandhoney
# purpose: AC-33.5.2.2.1 — a committed, re-runnable script that obtains the
#          two Backstage API tokens every later AC-33.5.2.2 sub-AC needs:
#          one scoped ['write'] and one scoped ['read'], minted through the
#          real admin-session + admin-api-tokens flow (no new fork code, no
#          new route). Precedent for the login leg is
#          scripts/ac26.4-live-proof.sh:307-311 (POST
#          /api/auth/admin/login into a cookie jar). Token minting is
#          POST /api/admin/api-tokens
#          (vendor/picpeak/backend/src/routes/adminApiTokens.js:44-56,
#          mounted at server.js:527), which sits behind
#          requirePermission('settings.edit') — this script checks that
#          permission explicitly up front and fails naming it rather than
#          surfacing an opaque 403 from the create call. Both tokens are
#          then proven usable against the EXISTING v1 route GET
#          /api/v1/events (routes/v1/events.js:376-380, apiTokenAuth +
#          requireApiScope('read')) — nothing here depends on route code
#          US-33 has not written yet. The 403 insufficient-scope case is
#          deliberately not proven here (see AC-33.5.2.2.1 text) — it
#          belongs to AC-33.5.2.2.3 against the new route.
#          Re-running must not accumulate state: any tokens this script
#          previously created (matched by name prefix) are revoked before
#          new ones are minted.
#
#          AC-33.5.2.2.3 — added section (this is the same file the AC text
#          requires: "the same file, one added section, not a second
#          script", so the artifact AC-33.5.2.3 later extends end to end
#          stays single). Reuses the write/read tokens minted above and
#          proves the AC-33.5.2.2.2 route POST /api/v1/notifications/inquiry
#          (vendor/picpeak/backend/src/routes/v1/notifications.js) is alive:
#          the write token queues a real row (read straight out of
#          Backstage's Postgres via `docker compose --profile backstage exec
#          backstage-db psql`, the same access BACKSTAGE_STARTUP.md:81
#          uses), a request with no Authorization header 401s
#          (apiTokenAuth.js:45-49), and the read-only token 403s with code
#          INSUFFICIENT_SCOPE (apiTokenAuth.js:102-108) — the case
#          AC-33.5.2.2.1 could not prove against an existing route. The
#          queued row is matched on a unique per-run marker
#          (`ac33.5.2.2.3-proof-<epoch>-<pid>`) carried in the request's
#          submission_summary, so a leftover row from an earlier run can
#          never be mistaken for this run's. Nothing is flushed and nothing
#          is sent: the row is left `pending` — its pending->sent transition
#          belongs to AC-33.5.2.3.
# usage:   scripts/ac33.5.2.2-backstage-token-proof.sh
# env:     BACKSTAGE_URL, BACKSTAGE_ADMIN_USERNAME, BACKSTAGE_ADMIN_PASSWORD
#          (same defaults as scripts/ac26.4-live-proof.sh:47)
# created-by: dev-team
# related-story: US-33
# related-ac: 33.5.2.2.1, 33.5.2.2.3
# ---
set -euo pipefail

BACKSTAGE="${BACKSTAGE_URL:-http://localhost:3100}"
ADMIN_USER="${BACKSTAGE_ADMIN_USERNAME:-admin}"
ADMIN_PASS="${BACKSTAGE_ADMIN_PASSWORD:-change-me-in-production}"

# Fixed name prefix so a re-run can find and revoke what it minted last
# time instead of piling up rows in api_tokens (DoD: no accumulated state).
NAME_PREFIX="ac33.5.2.2.1-token-proof"
WRITE_TOKEN_NAME="${NAME_PREFIX}-write"
READ_TOKEN_NAME="${NAME_PREFIX}-read"

COOKIES="$(mktemp)"
trap 'rm -f "$COOKIES"' EXIT

say() { printf '\n=== %s\n' "$*"; }

jqpy() {
  python3 -c "import json, sys
$1"
}

# --- Preflight: stack up per BACKSTAGE_STARTUP.md ------------------------
say "Preflight: Backstage reachable at ${BACKSTAGE}"
if ! curl -s -o /dev/null -w '' --max-time 5 "${BACKSTAGE}/health" 2>/dev/null \
    && ! curl -s -o /dev/null -w '' --max-time 5 "${BACKSTAGE}/api/auth/admin/login" 2>/dev/null; then
  echo "FAIL: ${BACKSTAGE} is not reachable. Bring the stack up first:" >&2
  echo "  docker compose --profile backstage up -d" >&2
  echo "(see BACKSTAGE_STARTUP.md)" >&2
  exit 1
fi

# --- Leg 1: admin session, exactly the way ac26.4-live-proof.sh does -----
say "Backstage admin login"
LOGIN_STATUS="$(curl -s -c "$COOKIES" -X POST "${BACKSTAGE}/api/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}" \
  -o /dev/null -w '%{http_code}')"
echo "login HTTP ${LOGIN_STATUS}"
if [ "$LOGIN_STATUS" != "200" ]; then
  echo "FAIL: admin login returned ${LOGIN_STATUS}, expected 200. Check BACKSTAGE_ADMIN_USERNAME/BACKSTAGE_ADMIN_PASSWORD against BACKSTAGE_STARTUP.md's seeded admin." >&2
  exit 1
fi

# --- Known unknown, closed here rather than mid-run later: does the -----
# --- seeded admin actually hold settings.edit? ---------------------------
say "Checking the seeded admin holds settings.edit (required by POST /api/admin/api-tokens)"
TOKENS_LIST_STATUS="$(curl -s -b "$COOKIES" -o /dev/null -w '%{http_code}' "${BACKSTAGE}/api/admin/api-tokens")"
echo "GET /api/admin/api-tokens (settings.view probe) HTTP ${TOKENS_LIST_STATUS}"
if [ "$TOKENS_LIST_STATUS" != "200" ]; then
  echo "FAIL: seeded admin cannot even list API tokens (settings.view) — got HTTP ${TOKENS_LIST_STATUS}." >&2
  exit 1
fi

# --- Re-run hygiene: revoke anything this script minted previously -------
say "Revoking any previously-minted tokens named '${WRITE_TOKEN_NAME}' or '${READ_TOKEN_NAME}'"
curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/api-tokens" | jqpy "
rows = json.load(sys.stdin)
for r in rows:
    if r.get('name') in ('${WRITE_TOKEN_NAME}', '${READ_TOKEN_NAME}') and not r.get('revoked_at'):
        print(r['id'])
" | while read -r stale_id; do
  [ -z "$stale_id" ] && continue
  st="$(curl -s -b "$COOKIES" -X DELETE "${BACKSTAGE}/api/admin/api-tokens/${stale_id}" -o /dev/null -w '%{http_code}')"
  echo "revoked stale token id=${stale_id} (HTTP ${st})"
done

# --- Mint the two tokens ---------------------------------------------------
# Names carry the fixed prefix (re-run hygiene, above) so this call is a
# permission-gate probe as much as a mint: a bare create call, with no
# workaround, is what proves settings.edit rather than just settings.view.
#
# Writes ALL progress lines to stderr and ONLY the plaintext token to
# stdout — this function is always called via `X="$(mint_token ...)"`,
# and command substitution captures everything the function writes to
# stdout (not just a final line), so an echo left on stdout here would
# silently corrupt the captured token with extra text.
mint_token() {
  local name="$1" scope="$2" resp status body plaintext preview
  resp="$(curl -s -b "$COOKIES" -w '\n%{http_code}' -X POST "${BACKSTAGE}/api/admin/api-tokens" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"${name}\",\"scopes\":[\"${scope}\"]}")"
  status="$(echo "$resp" | tail -1)"
  body="$(echo "$resp" | sed '$d')"
  echo "POST /api/admin/api-tokens name=${name} scopes=[${scope}] HTTP ${status}" >&2
  if [ "$status" != "201" ]; then
    if [ "$status" = "403" ]; then
      echo "FAIL: HTTP 403 minting '${name}' — the seeded admin (${ADMIN_USER}) lacks the settings.edit permission required by requirePermission('settings.edit') on POST /api/admin/api-tokens (adminApiTokens.js:45)." >&2
    else
      echo "FAIL: unexpected HTTP ${status} minting '${name}': ${body}" >&2
    fi
    exit 1
  fi
  plaintext="$(echo "$body" | jqpy "print(json.load(sys.stdin)['token'])")"
  preview="$(echo "$body" | jqpy "print(json.load(sys.stdin)['preview'])")"
  if [ -z "$plaintext" ] || [ "${plaintext#pp_live_}" = "$plaintext" ]; then
    echo "FAIL: create response for '${name}' carried no usable pp_live_ plaintext." >&2
    exit 1
  fi
  echo "token preview: ${preview}... (plaintext captured in-memory only, never logged or written to a file)" >&2
  printf '%s' "$plaintext"
}

say "Minting write-scoped token"
WRITE_TOKEN="$(mint_token "$WRITE_TOKEN_NAME" "write")"

say "Minting read-scoped token"
READ_TOKEN="$(mint_token "$READ_TOKEN_NAME" "read")"

# --- Prove both tokens usable against the EXISTING v1 route --------------
say "Proving tokens against GET /api/v1/events (existing route, apiTokenAuth + requireApiScope('read'))"

status_write="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer ${WRITE_TOKEN}" "${BACKSTAGE}/api/v1/events")"
echo "write-scoped token -> GET /api/v1/events -> HTTP ${status_write} (expect 200; 'write' implies 'read', apiTokenAuth.js:99-101)"

status_read="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer ${READ_TOKEN}" "${BACKSTAGE}/api/v1/events")"
echo "read-scoped token  -> GET /api/v1/events -> HTTP ${status_read} (expect 200)"

status_missing="$(curl -s -o /dev/null -w '%{http_code}' "${BACKSTAGE}/api/v1/events")"
echo "no Authorization header -> GET /api/v1/events -> HTTP ${status_missing} (expect 401)"

status_malformed="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer not-a-pp-live-token" "${BACKSTAGE}/api/v1/events")"
echo "malformed bearer value -> GET /api/v1/events -> HTTP ${status_malformed} (expect 401)"

FAILED=0
[ "$status_write" = "200" ] || { echo "FAIL: write-scoped token did not get 200" >&2; FAILED=1; }
[ "$status_read" = "200" ] || { echo "FAIL: read-scoped token did not get 200" >&2; FAILED=1; }
[ "$status_missing" = "401" ] || { echo "FAIL: missing-header request did not get 401" >&2; FAILED=1; }
[ "$status_malformed" = "401" ] || { echo "FAIL: malformed-bearer request did not get 401" >&2; FAILED=1; }

if [ "$FAILED" != "0" ]; then
  echo "FAIL: one or more proof calls did not return the expected status." >&2
  exit 1
fi

say "PASSED"
echo "Two Backstage API tokens minted and proven: '${WRITE_TOKEN_NAME}' (write) and '${READ_TOKEN_NAME}' (read)."
echo "Both remain active (not revoked) for later AC-33.5.2.2 sub-ACs to reuse by name; re-running this script revokes and re-mints them."

# ===========================================================================
# AC-33.5.2.2.3 — the route is proven alive: the queued row, and the two
# rejections. Reuses WRITE_TOKEN/READ_TOKEN minted above; mints nothing new.
# ===========================================================================

say "AC-33.5.2.2.3: proving POST /api/v1/notifications/inquiry"

# Unique per-run marker carried in the request's submission_summary, so a
# leftover row from an earlier run of this script can never be mistaken
# for this run's queued row.
MARKER="ac33.5.2.2.3-proof-$(date +%s)-$$"
RECIPIENT_EMAIL="ac33.5.2.2.3-proof@example.test"
INQUIRY_BODY="{\"recipient_email\":\"${RECIPIENT_EMAIL}\",\"form_title\":\"AC-33.5.2.2.3 proof\",\"source_page\":\"/contact\",\"submission_summary\":\"${MARKER}\"}"

say "(a) write token -> POST /api/v1/notifications/inquiry (expect 201)"
resp_notif_write="$(curl -s -w '\n%{http_code}' -X POST "${BACKSTAGE}/api/v1/notifications/inquiry" \
  -H "Authorization: Bearer ${WRITE_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "$INQUIRY_BODY")"
status_notif_write="$(echo "$resp_notif_write" | tail -1)"
body_notif_write="$(echo "$resp_notif_write" | sed '$d')"
echo "write-scoped token -> POST /api/v1/notifications/inquiry -> HTTP ${status_notif_write} (expect 201)"
echo "response body: ${body_notif_write}"

say "(b) no Authorization header -> POST /api/v1/notifications/inquiry (expect 401, apiTokenAuth.js:45-49)"
status_notif_missing="$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BACKSTAGE}/api/v1/notifications/inquiry" \
  -H 'Content-Type: application/json' \
  -d "$INQUIRY_BODY")"
echo "no Authorization header -> POST /api/v1/notifications/inquiry -> HTTP ${status_notif_missing} (expect 401)"

say "(c) read-only token -> POST /api/v1/notifications/inquiry (expect 403 INSUFFICIENT_SCOPE, apiTokenAuth.js:102-108)"
resp_notif_read="$(curl -s -w '\n%{http_code}' -X POST "${BACKSTAGE}/api/v1/notifications/inquiry" \
  -H "Authorization: Bearer ${READ_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "$INQUIRY_BODY")"
status_notif_read="$(echo "$resp_notif_read" | tail -1)"
body_notif_read="$(echo "$resp_notif_read" | sed '$d')"
echo "read-scoped token -> POST /api/v1/notifications/inquiry -> HTTP ${status_notif_read} (expect 403)"
echo "response body: ${body_notif_read}"

say "Reading the queued row straight out of Backstage's Postgres (BACKSTAGE_STARTUP.md:81's access)"
ROW="$(docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -t -A -F'|' -c \
  "select status, event_id, email_type from email_queue where email_data->>'submission_summary' = '${MARKER}';")"
echo "psql row (status|event_id|email_type): ${ROW}"
ROW_STATUS="$(echo "$ROW" | cut -d'|' -f1)"
ROW_EVENT_ID="$(echo "$ROW" | cut -d'|' -f2)"
ROW_EMAIL_TYPE="$(echo "$ROW" | cut -d'|' -f3)"

FAILED_NOTIF=0
[ "$status_notif_write" = "201" ] || { echo "FAIL: write-scoped token did not get 201 from POST /notifications/inquiry" >&2; FAILED_NOTIF=1; }
[ "$status_notif_missing" = "401" ] || { echo "FAIL: missing-header request did not get 401 from POST /notifications/inquiry" >&2; FAILED_NOTIF=1; }
[ "$status_notif_read" = "403" ] || { echo "FAIL: read-scoped token did not get 403 from POST /notifications/inquiry" >&2; FAILED_NOTIF=1; }
echo "$body_notif_read" | grep -q "INSUFFICIENT_SCOPE" || { echo "FAIL: 403 body did not carry code INSUFFICIENT_SCOPE" >&2; FAILED_NOTIF=1; }
[ "$ROW_STATUS" = "pending" ] || { echo "FAIL: queued row status was '${ROW_STATUS}', expected 'pending'" >&2; FAILED_NOTIF=1; }
[ -z "$ROW_EVENT_ID" ] || { echo "FAIL: queued row event_id was '${ROW_EVENT_ID}', expected NULL" >&2; FAILED_NOTIF=1; }
[ "$ROW_EMAIL_TYPE" = "inquiry_received" ] || { echo "FAIL: queued row email_type was '${ROW_EMAIL_TYPE}', expected 'inquiry_received'" >&2; FAILED_NOTIF=1; }

if [ "$FAILED_NOTIF" != "0" ]; then
  echo "FAIL: AC-33.5.2.2.3 proof did not pass." >&2
  exit 1
fi

say "AC-33.5.2.2.3 PASSED"
echo "Queued row confirmed status=pending, event_id=NULL, email_type=inquiry_received for marker ${MARKER}."
echo "Row left pending — its pending->sent transition belongs to AC-33.5.2.3."
