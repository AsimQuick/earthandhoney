#!/usr/bin/env bash
# ---
# file: scripts/ac33.6-inquiry-acknowledgement-proof.sh
# project: earthandhoney
# purpose: AC-33.6 — a committed, re-runnable script proving the optional
#          branded acknowledgement to a form submitter both directions the
#          AC's evidence clause names: "the acknowledgement enabled and
#          observed sent exactly once; and with it disabled, observed not
#          sent." Same real-stack technique as
#          scripts/ac33.5.2.2-backstage-token-proof.sh's AC-33.5.2.3
#          section: a REAL submission through the Frontstage route
#          POST /api/inquiries (src/app/(frontend)/api/inquiries/route.ts)
#          — never a hand-rolled call to the Backstage route — with the
#          MailHog capture inbox emptied and asserted at 0 before each run,
#          and the message matched independently in MailHog rather than
#          inferred from any return code (US-17 AC-17.6's pattern).
#
#          Two ephemeral Frontstage containers are started in turn, on the
#          same published port, each carrying a different
#          INQUIRY_ACKNOWLEDGEMENT_ENABLED value — the toggle is read from
#          process.env at request time (src/lib/inquiryAcknowledgement.ts),
#          never baked into a build, so an ephemeral container with the
#          env var set proves the runtime behaviour directly:
#            Run A (enabled=true):  submit a real inquiry whose form
#              carries an `email`-type field -> the submitter's own address
#              must receive exactly one acknowledgement message, matched by
#              a unique per-run marker embedded in the form's publicTitle
#              (and therefore in the rendered subject,
#              "Thank you for reaching out, {{form_title}}" — migration
#              121_add_inquiry_acknowledgement_email_template.js).
#            Run B (enabled unset — the documented default):  submit a
#              second real inquiry, different marker, different submitter
#              address -> after the SAME flush that sent Run A's message,
#              that address must have received nothing, and Backstage's
#              own email_queue must carry no `inquiry_acknowledgement` row
#              for it at all — the toggle stops the request in Frontstage
#              before Backstage's queue is ever reached, not merely before
#              SMTP delivery.
#          Both runs also submit a studio-notification recipient (the
#          Forms document's own `recipients` array) so the flush transition
#          is exercised the ordinary AC-33.5 way in each run; this script
#          asserts on the acknowledgement leg only; AC-33.5.2.3 already
#          proves the studio-notification leg end to end.
#
#          Re-running must not accumulate state: any tokens this script
#          previously minted (matched by name prefix) are revoked first,
#          both ephemeral containers are removed on exit regardless of
#          outcome, and the Forms/Inquiries fixtures each run creates are
#          deleted on exit.
# usage:   scripts/ac33.6-inquiry-acknowledgement-proof.sh
# env:     BACKSTAGE_URL, BACKSTAGE_ADMIN_USERNAME, BACKSTAGE_ADMIN_PASSWORD
#          (same defaults as scripts/ac33.5.2.2-backstage-token-proof.sh),
#          MAILHOG_URL, FRONTSTAGE_PROOF_PORT
# created-by: dev-team
# related-story: US-33
# related-ac: 33.6
# ---
set -euo pipefail

BACKSTAGE="${BACKSTAGE_URL:-http://localhost:3100}"
ADMIN_USER="${BACKSTAGE_ADMIN_USERNAME:-admin}"
ADMIN_PASS="${BACKSTAGE_ADMIN_PASSWORD:-change-me-in-production}"
MAILHOG="${MAILHOG_URL:-http://localhost:8025}"
FRONTSTAGE_PORT="${FRONTSTAGE_PROOF_PORT:-3104}"
FRONTSTAGE="http://localhost:${FRONTSTAGE_PORT}"
FRONTSTAGE_CONTAINER="ac33-6-ack-proof-frontstage"

NAME_PREFIX="ac33.6-ack-proof"
WRITE_TOKEN_NAME="${NAME_PREFIX}-write"

FIXTURE_EMAIL="live-api-fixture@earthandhoney.test"
FIXTURE_PASSWORD='Live-Api-Fixture-Password!23'

COOKIES="$(mktemp)"
AUTH=""
FORM_ID_A=""
INQUIRY_ID_A=""
FORM_ID_B=""
INQUIRY_ID_B=""

say() { printf '\n=== %s\n' "$*"; }

jqpy() {
  python3 -c "import json, sys
$1"
}

cleanup() {
  rm -f "$COOKIES"
  if [ -n "$AUTH" ]; then
    [ -n "$INQUIRY_ID_A" ] && curl -s -o /dev/null -X DELETE -H "Authorization: JWT ${AUTH}" "${FRONTSTAGE}/api/inquiries/${INQUIRY_ID_A}" || true
    [ -n "$INQUIRY_ID_B" ] && curl -s -o /dev/null -X DELETE -H "Authorization: JWT ${AUTH}" "${FRONTSTAGE}/api/inquiries/${INQUIRY_ID_B}" || true
    [ -n "$FORM_ID_A" ] && curl -s -o /dev/null -X DELETE -H "Authorization: JWT ${AUTH}" "${FRONTSTAGE}/api/forms/${FORM_ID_A}" || true
    [ -n "$FORM_ID_B" ] && curl -s -o /dev/null -X DELETE -H "Authorization: JWT ${AUTH}" "${FRONTSTAGE}/api/forms/${FORM_ID_B}" || true
  fi
  docker rm -f "$FRONTSTAGE_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# --- Preflight -------------------------------------------------------------
say "Preflight: Backstage and MailHog reachable"
if ! curl -s -o /dev/null --max-time 5 "${BACKSTAGE}/api/auth/admin/login" 2>/dev/null; then
  echo "FAIL: ${BACKSTAGE} is not reachable. Bring the stack up first: docker compose --profile backstage up -d" >&2
  exit 1
fi
if ! curl -s -o /dev/null --max-time 5 "${MAILHOG}/api/v2/messages" 2>/dev/null; then
  echo "FAIL: ${MAILHOG} is not reachable. Bring the stack up first: docker compose --profile backstage up -d" >&2
  exit 1
fi

# --- Admin login + write-scoped token (own name prefix; revoke-and-remint) -
say "Backstage admin login"
LOGIN_STATUS="$(curl -s -c "$COOKIES" -X POST "${BACKSTAGE}/api/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}" \
  -o /dev/null -w '%{http_code}')"
echo "login HTTP ${LOGIN_STATUS}"
if [ "$LOGIN_STATUS" != "200" ]; then
  echo "FAIL: admin login returned ${LOGIN_STATUS}, expected 200." >&2
  exit 1
fi

say "Revoking any previously-minted token named '${WRITE_TOKEN_NAME}'"
curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/api-tokens" | jqpy "
rows = json.load(sys.stdin)
for r in rows:
    if r.get('name') == '${WRITE_TOKEN_NAME}' and not r.get('revoked_at'):
        print(r['id'])
" | while read -r stale_id; do
  [ -z "$stale_id" ] && continue
  curl -s -b "$COOKIES" -X DELETE "${BACKSTAGE}/api/admin/api-tokens/${stale_id}" -o /dev/null
  echo "revoked stale token id=${stale_id}"
done

say "Minting write-scoped token '${WRITE_TOKEN_NAME}'"
resp="$(curl -s -b "$COOKIES" -w '\n%{http_code}' -X POST "${BACKSTAGE}/api/admin/api-tokens" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"${WRITE_TOKEN_NAME}\",\"scopes\":[\"write\"]}")"
status="$(echo "$resp" | tail -1)"
body="$(echo "$resp" | sed '$d')"
if [ "$status" != "201" ]; then
  echo "FAIL: HTTP ${status} minting '${WRITE_TOKEN_NAME}': ${body}" >&2
  exit 1
fi
WRITE_TOKEN="$(echo "$body" | jqpy "print(json.load(sys.stdin)['token'])")"
echo "write token minted (plaintext held in-memory only)"

# --- Empty MailHog FIRST, so nothing left over can pass ---------------------
say "Emptying the MailHog capture inbox at ${MAILHOG}"
curl -s -X DELETE -o /dev/null -w 'DELETE /api/v1/messages -> HTTP %{http_code}\n' "${MAILHOG}/api/v1/messages"
INBOX_BEFORE="$(curl -s "${MAILHOG}/api/v2/messages" | jqpy "print(json.load(sys.stdin)['total'])")"
echo "inbox total after emptying: ${INBOX_BEFORE} (expect 0)"
if [ "$INBOX_BEFORE" != "0" ]; then
  echo "FAIL: the capture inbox still holds ${INBOX_BEFORE} message(s)." >&2
  exit 1
fi

# --- Shared helpers: start/stop the ephemeral Frontstage, create a Forms ---
# --- fixture, and submit through the real route -----------------------------
start_frontstage() {
  local ack_env="$1"
  docker rm -f "$FRONTSTAGE_CONTAINER" >/dev/null 2>&1 || true
  if [ -n "$ack_env" ]; then
    docker compose run -d --name "$FRONTSTAGE_CONTAINER" \
      -e BACKSTAGE_API_TOKEN="$WRITE_TOKEN" \
      -e INQUIRY_ACKNOWLEDGEMENT_ENABLED="$ack_env" \
      -p "${FRONTSTAGE_PORT}:3000" web npm run dev >/dev/null
  else
    docker compose run -d --name "$FRONTSTAGE_CONTAINER" \
      -e BACKSTAGE_API_TOKEN="$WRITE_TOKEN" \
      -p "${FRONTSTAGE_PORT}:3000" web npm run dev >/dev/null
  fi
  echo -n "waiting for the Frontstage to answer"
  local up=0
  for _ in $(seq 1 60); do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "${FRONTSTAGE}/api/users")" != "000" ]; then
      up=1
      break
    fi
    echo -n "."
    sleep 3
  done
  echo
  if [ "$up" != "1" ]; then
    echo "FAIL: the ephemeral Frontstage never answered on ${FRONTSTAGE}." >&2
    docker logs --tail 40 "$FRONTSTAGE_CONTAINER" >&2 || true
    exit 1
  fi
}

ensure_payload_auth() {
  if [ -n "$AUTH" ]; then return; fi
  curl -s -o /dev/null -X POST "${FRONTSTAGE}/api/users/first-register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${FIXTURE_EMAIL}\",\"password\":\"${FIXTURE_PASSWORD}\"}" || true
  AUTH="$(curl -s -X POST "${FRONTSTAGE}/api/users/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${FIXTURE_EMAIL}\",\"password\":\"${FIXTURE_PASSWORD}\"}" \
    | jqpy "print(json.load(sys.stdin).get('token') or '')")"
  if [ -z "$AUTH" ]; then
    echo "FAIL: could not obtain a Payload JWT for ${FIXTURE_EMAIL}." >&2
    exit 1
  fi
}

# ===========================================================================
# Run A — enabled=true: a real submission must produce exactly one
# acknowledgement, captured independently in MailHog.
# ===========================================================================

say "Run A: INQUIRY_ACKNOWLEDGEMENT_ENABLED=true"
start_frontstage "true"
ensure_payload_auth

MARKER_A="ac33.6-ack-proof-A-$(date +%s)-$$"
STUDIO_EMAIL_A="ac33.6-studio-a@example.test"
SUBMITTER_EMAIL_A="ac33.6-submitter-a@example.test"
FORM_TITLE_A="AC-33.6 proof A ${MARKER_A}"

FORM_BODY_A="$(python3 -c "
import json
print(json.dumps({
    'internalName': 'AC-33.6 proof form A ${MARKER_A}',
    'publicTitle': '${FORM_TITLE_A}',
    'recipients': [{'email': '${STUDIO_EMAIL_A}'}],
    'successMessage': 'Thanks — we will be in touch soon.',
    'fields': [
        {'fieldType': 'shortText', 'name': 'fullName', 'label': 'Full name', 'required': True},
        {'fieldType': 'email', 'name': 'email', 'label': 'Email', 'required': True},
    ],
}))
")"
FORM_ID_A="$(curl -s -X POST "${FRONTSTAGE}/api/forms" \
  -H "Authorization: JWT ${AUTH}" -H 'Content-Type: application/json' \
  -d "$FORM_BODY_A" | jqpy "
body = json.load(sys.stdin)
print((body.get('doc') or body).get('id', ''))
")"
[ -n "$FORM_ID_A" ] || { echo "FAIL: could not create Run A's fixture Forms document." >&2; exit 1; }
echo "Run A Forms document: id=${FORM_ID_A}, publicTitle='${FORM_TITLE_A}'"

SUBMIT_BODY_A="$(python3 -c "
import json
form_id = '${FORM_ID_A}'
print(json.dumps({
    'formId': int(form_id) if form_id.isdigit() else form_id,
    'values': {'fullName': 'AC-33.6 Proof A', 'email': '${SUBMITTER_EMAIL_A}'},
    'sourcePage': '/contact?proof=${MARKER_A}',
}))
")"
resp_a="$(curl -s -w '\n%{http_code}' -X POST "${FRONTSTAGE}/api/inquiries" \
  -H 'Content-Type: application/json' -d "$SUBMIT_BODY_A")"
status_a="$(echo "$resp_a" | tail -1)"
body_a="$(echo "$resp_a" | sed '$d')"
echo "POST /api/inquiries (Run A) -> HTTP ${status_a} (expect 201): ${body_a}"
INQUIRY_ID_A="$(echo "$body_a" | jqpy "print(json.load(sys.stdin).get('id') or '')")"

say "Flushing the Backstage email queue (Run A)"
resp_flush_a="$(curl -s -w '\n%{http_code}' -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/email/flush-queue")"
status_flush_a="$(echo "$resp_flush_a" | tail -1)"
echo "flush (Run A) -> HTTP ${status_flush_a}: $(echo "$resp_flush_a" | sed '$d')"

say "Confirming the acknowledgement independently in MailHog (Run A)"
MATCH_A="$(curl -s "${MAILHOG}/api/v2/messages" | jqpy "
inbox = json.load(sys.stdin)
count = 0
subject = ''
for m in inbox.get('items', []):
    headers = m.get('Content', {}).get('Headers', {})
    to = ' '.join(headers.get('To', []))
    if to.strip() != '${SUBMITTER_EMAIL_A}':
        continue
    count += 1
    subject = ' '.join(headers.get('Subject', [])).strip()
print('%d\t%s' % (count, subject))
")"
COUNT_A="$(printf '%s' "$MATCH_A" | cut -f1)"
SUBJECT_A="$(printf '%s' "$MATCH_A" | cut -f2)"
echo "messages captured for ${SUBMITTER_EMAIL_A}: count=${COUNT_A} subject='${SUBJECT_A}'"

# ===========================================================================
# Run B — enabled unset (the documented default): the same flow must queue
# and send nothing to the submitter's address.
# ===========================================================================

say "Run B: INQUIRY_ACKNOWLEDGEMENT_ENABLED unset (default)"
start_frontstage ""

MARKER_B="ac33.6-ack-proof-B-$(date +%s)-$$"
STUDIO_EMAIL_B="ac33.6-studio-b@example.test"
SUBMITTER_EMAIL_B="ac33.6-submitter-b@example.test"
FORM_TITLE_B="AC-33.6 proof B ${MARKER_B}"

FORM_BODY_B="$(python3 -c "
import json
print(json.dumps({
    'internalName': 'AC-33.6 proof form B ${MARKER_B}',
    'publicTitle': '${FORM_TITLE_B}',
    'recipients': [{'email': '${STUDIO_EMAIL_B}'}],
    'successMessage': 'Thanks — we will be in touch soon.',
    'fields': [
        {'fieldType': 'shortText', 'name': 'fullName', 'label': 'Full name', 'required': True},
        {'fieldType': 'email', 'name': 'email', 'label': 'Email', 'required': True},
    ],
}))
")"
FORM_ID_B="$(curl -s -X POST "${FRONTSTAGE}/api/forms" \
  -H "Authorization: JWT ${AUTH}" -H 'Content-Type: application/json' \
  -d "$FORM_BODY_B" | jqpy "
body = json.load(sys.stdin)
print((body.get('doc') or body).get('id', ''))
")"
[ -n "$FORM_ID_B" ] || { echo "FAIL: could not create Run B's fixture Forms document." >&2; exit 1; }
echo "Run B Forms document: id=${FORM_ID_B}, publicTitle='${FORM_TITLE_B}'"

SUBMIT_BODY_B="$(python3 -c "
import json
form_id = '${FORM_ID_B}'
print(json.dumps({
    'formId': int(form_id) if form_id.isdigit() else form_id,
    'values': {'fullName': 'AC-33.6 Proof B', 'email': '${SUBMITTER_EMAIL_B}'},
    'sourcePage': '/contact?proof=${MARKER_B}',
}))
")"
resp_b="$(curl -s -w '\n%{http_code}' -X POST "${FRONTSTAGE}/api/inquiries" \
  -H 'Content-Type: application/json' -d "$SUBMIT_BODY_B")"
status_b="$(echo "$resp_b" | tail -1)"
body_b="$(echo "$resp_b" | sed '$d')"
echo "POST /api/inquiries (Run B) -> HTTP ${status_b} (expect 201): ${body_b}"
INQUIRY_ID_B="$(echo "$body_b" | jqpy "print(json.load(sys.stdin).get('id') or '')")"

say "Flushing the Backstage email queue (Run B)"
resp_flush_b="$(curl -s -w '\n%{http_code}' -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/email/flush-queue")"
status_flush_b="$(echo "$resp_flush_b" | tail -1)"
echo "flush (Run B) -> HTTP ${status_flush_b}: $(echo "$resp_flush_b" | sed '$d')"

say "Confirming NOTHING was captured for the Run B submitter in MailHog"
MATCH_B="$(curl -s "${MAILHOG}/api/v2/messages" | jqpy "
inbox = json.load(sys.stdin)
count = 0
for m in inbox.get('items', []):
    headers = m.get('Content', {}).get('Headers', {})
    to = ' '.join(headers.get('To', []))
    if to.strip() == '${SUBMITTER_EMAIL_B}':
        count += 1
print(count)
")"
echo "messages captured for ${SUBMITTER_EMAIL_B}: count=${MATCH_B} (expect 0)"

say "Confirming Backstage's own email_queue carries no inquiry_acknowledgement row for the Run B submitter"
ROW_B="$(docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -t -A -c \
  "select count(*) from email_queue where recipient_email = '${SUBMITTER_EMAIL_B}' and email_type = 'inquiry_acknowledgement';")"
ROW_B="$(echo "$ROW_B" | tr -d '[:space:]')"
echo "email_queue rows for ${SUBMITTER_EMAIL_B} (email_type=inquiry_acknowledgement): ${ROW_B} (expect 0)"

# --- Verdict -----------------------------------------------------------------
FAILED=0
[ "$status_a" = "201" ] || { echo "FAIL: Run A submission returned ${status_a}, expected 201" >&2; FAILED=1; }
[ -n "$INQUIRY_ID_A" ] || { echo "FAIL: Run A created no Inquiry" >&2; FAILED=1; }
[ "$status_flush_a" = "200" ] || { echo "FAIL: Run A flush returned ${status_flush_a}, expected 200" >&2; FAILED=1; }
[ "$COUNT_A" = "1" ] || { echo "FAIL: MailHog captured ${COUNT_A} message(s) for the Run A submitter, expected exactly 1" >&2; FAILED=1; }
case "$SUBJECT_A" in
  *"$FORM_TITLE_A"*) : ;;
  *) echo "FAIL: Run A's captured subject '${SUBJECT_A}' did not carry the acknowledgement's form_title" >&2; FAILED=1 ;;
esac

[ "$status_b" = "201" ] || { echo "FAIL: Run B submission returned ${status_b}, expected 201" >&2; FAILED=1; }
[ -n "$INQUIRY_ID_B" ] || { echo "FAIL: Run B created no Inquiry" >&2; FAILED=1; }
[ "$status_flush_b" = "200" ] || { echo "FAIL: Run B flush returned ${status_flush_b}, expected 200" >&2; FAILED=1; }
[ "$MATCH_B" = "0" ] || { echo "FAIL: MailHog captured ${MATCH_B} message(s) for the Run B submitter, expected 0 — the disabled toggle must send nothing" >&2; FAILED=1; }
[ "$ROW_B" = "0" ] || { echo "FAIL: Backstage's email_queue carries ${ROW_B} inquiry_acknowledgement row(s) for the Run B submitter, expected 0" >&2; FAILED=1; }

if [ "$FAILED" != "0" ]; then
  echo "FAIL: AC-33.6 proof did not pass." >&2
  exit 1
fi

say "AC-33.6 PASSED"
echo "Run A (enabled=true): submitter ${SUBMITTER_EMAIL_A} received exactly 1 acknowledgement, subject='${SUBJECT_A}'."
echo "Run B (enabled unset, the default): submitter ${SUBMITTER_EMAIL_B} received 0 messages and Backstage's email_queue carries 0 inquiry_acknowledgement rows for it."
echo "Inbox was emptied and asserted at 0 before Run A; Run B's own submitter address is disjoint from Run A's, so both counts stay independently meaningful."
