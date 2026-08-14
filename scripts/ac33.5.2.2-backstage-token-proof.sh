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
#
#          AC-33.5.2.3 — added section (again the same file, one added
#          section, so the end-to-end artifact stays single). This is the one
#          run that goes all the way through: a REAL inquiry submitted
#          through the Frontstage route POST /api/inquiries
#          (src/app/(frontend)/api/inquiries/route.ts) — not a hand-rolled
#          call to the Backstage route — produces the `email_queue` row, read
#          straight out of Backstage's Postgres while still `pending`. That
#          pending row is the proof Frontstage handed the work over rather
#          than sending anything itself: src/lib/inquiryNotification.ts opens
#          no SMTP connection and holds no SMTP credential, so at the moment
#          the Frontstage request has already returned, nothing has been
#          sent. The row is then flushed with the admin
#          POST /api/admin/email/flush-queue
#          (vendor/picpeak/backend/src/routes/adminEmail.js:264-277) rather
#          than waiting on the ordinary 60-second processor loop
#          (emailProcessor.js:1029-1050) — the AC accepts either, and the
#          flush makes the run deterministic instead of adding a minute of
#          polling — and read back as `sent` with a `sent_at` timestamp.
#          Finally the message itself is confirmed independently in the
#          MailHog capture inbox (docker-compose.yml's `mailhog` service,
#          under the same `backstage` profile), the way US-17 AC-17.6 did:
#          nothing is inferred from a return code. The Frontstage route
#          swallows a notification failure by design (submitInquiry.ts —
#          AC-33.2's create-before-notify ordering), so its 201 says nothing
#          at all about the email; only the queue row and the captured
#          message do.
#          Two hygiene rules make the MailHog leg real evidence: the inbox is
#          emptied before the run (DELETE /api/v1/messages, asserted back to
#          zero), and the message is matched on a unique per-run marker
#          (`ac33.5.2.3-proof-<epoch>-<pid>`) carried in the Forms document's
#          publicTitle and therefore in the rendered subject — so no leftover
#          from an earlier session can pass. Note the flush drains the whole
#          queue (`limit: 1000`), including the row the AC-33.5.2.2.3 section
#          above deliberately left pending; that section makes its own
#          assertions before this one runs, so nothing it proves is disturbed.
#          The Frontstage that submits is an EPHEMERAL container started here
#          (`docker compose run` on the `web` service, published on
#          FRONTSTAGE_PROOF_PORT) with BACKSTAGE_API_TOKEN set to the write
#          token minted above, never the long-running "web" service on :3000
#          — that one holds whatever token .env last carried, and this script
#          revokes and re-mints its named tokens on every run, so pointing at
#          it would prove nothing repeatable. The ephemeral container is
#          removed on exit, and the Forms/Inquiries fixtures it created are
#          deleted, so a re-run accumulates no state.
# usage:   scripts/ac33.5.2.2-backstage-token-proof.sh
# env:     BACKSTAGE_URL, BACKSTAGE_ADMIN_USERNAME, BACKSTAGE_ADMIN_PASSWORD
#          (same defaults as scripts/ac26.4-live-proof.sh:47),
#          MAILHOG_URL, FRONTSTAGE_PROOF_PORT
# created-by: dev-team
# related-story: US-33
# related-ac: 33.5.2.2.1, 33.5.2.2.3, 33.5.2.3
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

# ===========================================================================
# AC-33.5.2.3 — one end-to-end run: a real Frontstage submission -> the
# pending email_queue row -> flush -> the same row sent -> the message itself
# in MailHog. Reuses WRITE_TOKEN minted above; mints nothing new.
# ===========================================================================

MAILHOG="${MAILHOG_URL:-http://localhost:8025}"
FRONTSTAGE_PORT="${FRONTSTAGE_PROOF_PORT:-3103}"
FRONTSTAGE="http://localhost:${FRONTSTAGE_PORT}"
FRONTSTAGE_CONTAINER="ac33-5-2-3-proof-frontstage"

# Unique per-run marker. Carried in the Forms document's publicTitle, which
# the route hands over as `form_title`, which the `inquiry_received` template
# renders into the subject ("New inquiry: {{form_title}}",
# migrations/core/120_add_inquiry_notification_email_template.js) — so the
# same marker identifies this run's queue row in Postgres AND this run's
# captured message in MailHog.
E2E_MARKER="ac33.5.2.3-proof-$(date +%s)-$$"
E2E_RECIPIENT="ac33.5.2.3-proof@example.test"
E2E_FORM_TITLE="AC-33.5.2.3 proof ${E2E_MARKER}"

# The shared live-test fixture identity from src/test-support/liveApiAuth.ts —
# deliberately the same one, for the same reason that file gives: Payload
# honors `first-register` exactly once per database, so a second identity
# here could never authenticate against a database a live test already
# claimed.
FIXTURE_EMAIL="live-api-fixture@earthandhoney.test"
FIXTURE_PASSWORD='Live-Api-Fixture-Password!23'

E2E_FORM_ID=""
E2E_INQUIRY_ID=""
E2E_AUTH=""

# Replaces the COOKIES-only trap set at the top of this script: from here on
# the ephemeral Frontstage container and the Payload fixtures it created must
# also come down, on success and on failure alike (DoD: no accumulated state).
e2e_cleanup() {
  rm -f "$COOKIES"
  if [ -n "$E2E_AUTH" ]; then
    [ -n "$E2E_INQUIRY_ID" ] && curl -s -o /dev/null -X DELETE \
      -H "Authorization: JWT ${E2E_AUTH}" "${FRONTSTAGE}/api/inquiries/${E2E_INQUIRY_ID}" || true
    [ -n "$E2E_FORM_ID" ] && curl -s -o /dev/null -X DELETE \
      -H "Authorization: JWT ${E2E_AUTH}" "${FRONTSTAGE}/api/forms/${E2E_FORM_ID}" || true
  fi
  docker rm -f "$FRONTSTAGE_CONTAINER" >/dev/null 2>&1 || true
}
trap e2e_cleanup EXIT

say "AC-33.5.2.3: end-to-end — Frontstage submission -> pending row -> flush -> sent -> MailHog"

# --- (1) Empty the capture inbox FIRST, so nothing left over can pass ------
say "(1) Emptying the MailHog capture inbox at ${MAILHOG}"
if ! curl -s -o /dev/null --max-time 5 "${MAILHOG}/api/v2/messages"; then
  echo "FAIL: MailHog is not reachable at ${MAILHOG}. Bring the stack up first:" >&2
  echo "  docker compose --profile backstage up -d" >&2
  exit 1
fi
curl -s -X DELETE -o /dev/null -w 'DELETE /api/v1/messages -> HTTP %{http_code}\n' "${MAILHOG}/api/v1/messages"
INBOX_BEFORE="$(curl -s "${MAILHOG}/api/v2/messages" | jqpy "print(json.load(sys.stdin)['total'])")"
echo "inbox total after emptying: ${INBOX_BEFORE} (expect 0)"
if [ "$INBOX_BEFORE" != "0" ]; then
  echo "FAIL: the capture inbox still holds ${INBOX_BEFORE} message(s) — a leftover could be mistaken for this run's." >&2
  exit 1
fi

# --- (2) An ephemeral Frontstage holding the freshly minted write token ----
say "(2) Starting an ephemeral Frontstage container on :${FRONTSTAGE_PORT} with BACKSTAGE_API_TOKEN set"
docker rm -f "$FRONTSTAGE_CONTAINER" >/dev/null 2>&1 || true
docker compose run -d --name "$FRONTSTAGE_CONTAINER" \
  -e BACKSTAGE_API_TOKEN="$WRITE_TOKEN" \
  -p "${FRONTSTAGE_PORT}:3000" web npm run dev >/dev/null
echo "container ${FRONTSTAGE_CONTAINER} started (token passed in-memory via -e; never written to .env or a file)"

echo -n "waiting for the Frontstage to answer"
FRONTSTAGE_UP=0
for _ in $(seq 1 60); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "${FRONTSTAGE}/api/users")" != "000" ]; then
    FRONTSTAGE_UP=1
    break
  fi
  echo -n "."
  sleep 3
done
echo
if [ "$FRONTSTAGE_UP" != "1" ]; then
  echo "FAIL: the ephemeral Frontstage never answered on ${FRONTSTAGE}." >&2
  docker logs --tail 40 "$FRONTSTAGE_CONTAINER" >&2 || true
  exit 1
fi

# --- (3) A real Forms document, created through the real admin API --------
say "(3) Authenticating against Payload and creating the fixture Forms document"
curl -s -o /dev/null -X POST "${FRONTSTAGE}/api/users/first-register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${FIXTURE_EMAIL}\",\"password\":\"${FIXTURE_PASSWORD}\"}" || true
E2E_AUTH="$(curl -s -X POST "${FRONTSTAGE}/api/users/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${FIXTURE_EMAIL}\",\"password\":\"${FIXTURE_PASSWORD}\"}" \
  | jqpy "print(json.load(sys.stdin).get('token') or '')")"
if [ -z "$E2E_AUTH" ]; then
  echo "FAIL: could not obtain a Payload JWT for ${FIXTURE_EMAIL}." >&2
  exit 1
fi
echo "Payload JWT obtained for ${FIXTURE_EMAIL}"

FORM_BODY="$(python3 -c "
import json
print(json.dumps({
    'internalName': 'AC-33.5.2.3 proof form ${E2E_MARKER}',
    'publicTitle': '${E2E_FORM_TITLE}',
    'recipients': [{'email': '${E2E_RECIPIENT}'}],
    'successMessage': 'Thanks — we will be in touch soon.',
    'fields': [
        {'fieldType': 'shortText', 'name': 'fullName', 'label': 'Full name', 'required': True},
        {'fieldType': 'email', 'name': 'email', 'label': 'Email', 'required': True},
        {'fieldType': 'longText', 'name': 'notes', 'label': 'Anything else?', 'required': False},
    ],
}))
")"
E2E_FORM_ID="$(curl -s -X POST "${FRONTSTAGE}/api/forms" \
  -H "Authorization: JWT ${E2E_AUTH}" -H 'Content-Type: application/json' \
  -d "$FORM_BODY" | jqpy "
body = json.load(sys.stdin)
print((body.get('doc') or body).get('id', ''))
")"
if [ -z "$E2E_FORM_ID" ]; then
  echo "FAIL: could not create the fixture Forms document." >&2
  exit 1
fi
echo "Forms document created: id=${E2E_FORM_ID}, publicTitle='${E2E_FORM_TITLE}', recipient=${E2E_RECIPIENT}"

# --- (4) The real submission, through the real Frontstage route -----------
say "(4) POST ${FRONTSTAGE}/api/inquiries (the real Frontstage route, no Backstage call hand-rolled here)"
# `formId` is emitted with the id's native JSON type, not quoted: Payload's
# Postgres adapter gives Forms numeric ids, and the `inquiries.form`
# relationship rejects the string "94" where it accepts 94 ("The following
# field is invalid: Form"). The AC-33.2 live test never hits this because it
# reuses the number it read straight out of the create response's JSON.
SUBMIT_BODY="$(python3 -c "
import json
form_id = '${E2E_FORM_ID}'
print(json.dumps({
    'formId': int(form_id) if form_id.isdigit() else form_id,
    'values': {
        'fullName': 'AC-33.5.2.3 Proof',
        'email': 'proof-sender@example.test',
        'notes': 'marker ${E2E_MARKER}',
    },
    'sourcePage': '/contact?proof=${E2E_MARKER}',
}))
")"
resp_submit="$(curl -s -w '\n%{http_code}' -X POST "${FRONTSTAGE}/api/inquiries" \
  -H 'Content-Type: application/json' -d "$SUBMIT_BODY")"
status_submit="$(echo "$resp_submit" | tail -1)"
body_submit="$(echo "$resp_submit" | sed '$d')"
echo "POST /api/inquiries -> HTTP ${status_submit} (expect 201)"
echo "response body: ${body_submit}"
E2E_INQUIRY_ID="$(echo "$body_submit" | jqpy "print(json.load(sys.stdin).get('id') or '')")"

# --- (5) The pending row, read straight out of Backstage's Postgres -------
# Read immediately, before anything is flushed: a row sitting `pending` at
# this instant is exactly the proof that the Frontstage request handed the
# work over rather than sending anything itself.
say "(5) Reading the queued row out of Backstage's Postgres while it is still pending"
E2E_SELECT="select status, coalesce(sent_at::text,''), recipient_email, email_type, coalesce(event_id::text,'') from email_queue where email_data->>'form_title' = '${E2E_FORM_TITLE}';"
ROW_PENDING="$(docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -t -A -F'|' -c "$E2E_SELECT")"
echo "psql row (status|sent_at|recipient|type|event_id): ${ROW_PENDING}"
P_STATUS="$(echo "$ROW_PENDING" | cut -d'|' -f1)"
P_SENT_AT="$(echo "$ROW_PENDING" | cut -d'|' -f2)"
P_RECIPIENT="$(echo "$ROW_PENDING" | cut -d'|' -f3)"
P_TYPE="$(echo "$ROW_PENDING" | cut -d'|' -f4)"

# --- (6) Flush, then read the SAME row back as sent -----------------------
say "(6) Admin POST /api/admin/email/flush-queue (adminEmail.js:264-277) — the alternative to waiting out the 60s processor loop"
resp_flush="$(curl -s -w '\n%{http_code}' -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/email/flush-queue")"
status_flush="$(echo "$resp_flush" | tail -1)"
body_flush="$(echo "$resp_flush" | sed '$d')"
echo "flush -> HTTP ${status_flush}: ${body_flush}"

ROW_SENT="$(docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -t -A -F'|' -c "$E2E_SELECT")"
echo "psql row after flush (status|sent_at|recipient|type|event_id): ${ROW_SENT}"
S_STATUS="$(echo "$ROW_SENT" | cut -d'|' -f1)"
S_SENT_AT="$(echo "$ROW_SENT" | cut -d'|' -f2)"

# --- (7) The message itself, confirmed independently in MailHog -----------
say "(7) Confirming the message in the MailHog capture inbox (US-17 AC-17.6's technique), matched on the run marker"
MAIL_MATCH="$(curl -s "${MAILHOG}/api/v2/messages" | jqpy "
inbox = json.load(sys.stdin)
for m in inbox.get('items', []):
    headers = m.get('Content', {}).get('Headers', {})
    subject = ' '.join(headers.get('Subject', []))
    if '${E2E_MARKER}' not in subject:
        continue
    to = ' '.join(headers.get('To', []))
    print('%s\t%s' % (to.strip(), subject.strip()))
    break
")"
echo "matched MailHog message (To<TAB>Subject): ${MAIL_MATCH:-<none>}"
MAIL_TO="$(printf '%s' "$MAIL_MATCH" | cut -f1)"
MAIL_SUBJECT="$(printf '%s' "$MAIL_MATCH" | cut -f2)"

# --- Verdict ---------------------------------------------------------------
FAILED_E2E=0
[ "$status_submit" = "201" ] || { echo "FAIL: the Frontstage submission returned ${status_submit}, expected 201" >&2; FAILED_E2E=1; }
[ -n "$E2E_INQUIRY_ID" ] || { echo "FAIL: the submission created no Inquiry (id was null — a spam-drop or a failed create)" >&2; FAILED_E2E=1; }
[ "$P_STATUS" = "pending" ] || { echo "FAIL: the queued row read '${P_STATUS}' before the flush, expected 'pending' — Frontstage must hand the work over, not send it" >&2; FAILED_E2E=1; }
[ -z "$P_SENT_AT" ] || { echo "FAIL: the queued row already carried sent_at='${P_SENT_AT}' before the flush" >&2; FAILED_E2E=1; }
[ "$P_RECIPIENT" = "$E2E_RECIPIENT" ] || { echo "FAIL: the queued row's recipient was '${P_RECIPIENT}', expected '${E2E_RECIPIENT}' (the Forms document's configured recipient)" >&2; FAILED_E2E=1; }
[ "$P_TYPE" = "inquiry_received" ] || { echo "FAIL: the queued row's email_type was '${P_TYPE}', expected 'inquiry_received'" >&2; FAILED_E2E=1; }
[ "$status_flush" = "200" ] || { echo "FAIL: flush-queue returned ${status_flush}, expected 200" >&2; FAILED_E2E=1; }
[ "$S_STATUS" = "sent" ] || { echo "FAIL: after the flush the same row read '${S_STATUS}', expected 'sent'" >&2; FAILED_E2E=1; }
[ -n "$S_SENT_AT" ] || { echo "FAIL: after the flush the same row still carried no sent_at timestamp" >&2; FAILED_E2E=1; }
[ -n "$MAIL_MATCH" ] || { echo "FAIL: no message carrying marker ${E2E_MARKER} was captured in MailHog — the send was not independently confirmed" >&2; FAILED_E2E=1; }
[ "$MAIL_TO" = "$E2E_RECIPIENT" ] || { echo "FAIL: the captured message was addressed to '${MAIL_TO}', expected '${E2E_RECIPIENT}'" >&2; FAILED_E2E=1; }

if [ "$FAILED_E2E" != "0" ]; then
  echo "FAIL: AC-33.5.2.3 end-to-end proof did not pass." >&2
  exit 1
fi

say "AC-33.5.2.3 PASSED"
echo "A real submission through ${FRONTSTAGE}/api/inquiries queued email_queue row"
echo "  recipient=${P_RECIPIENT} type=${P_TYPE} status=pending (read from Backstage's Postgres before any flush),"
echo "then, after POST /api/admin/email/flush-queue, the SAME row read status=${S_STATUS} sent_at=${S_SENT_AT},"
echo "and the message itself was captured in MailHog: To=${MAIL_TO} Subject='${MAIL_SUBJECT}'."
echo "Marker for this run: ${E2E_MARKER} (inbox was emptied and asserted at 0 before the run)."
