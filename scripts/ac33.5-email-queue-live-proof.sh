#!/usr/bin/env bash
# ---
# file: scripts/ac33.5-email-queue-live-proof.sh
# project: earthandhoney
# purpose: AC-33.5's live proof — the studio notification for a Frontstage
#          form submission is *queued* through the Backstage email queue and
#          then *sent* by Backstage's own processor, confirmed independently
#          in the MailHog capture inbox rather than inferred from a return
#          code, the way US-17 AC-17.6 did. Five legs:
#            1. mint a scoped Backstage API token through the fork's own
#               admin route (no hand-written DB row);
#            2. empty MailHog so anything found afterwards is this run's;
#            3. call the REAL src/lib/inquiryNotification.ts inside the web
#               container (scripts/ac33.5-email-queue-live-proof.ts) — the
#               deliverable code path, not a curl imitation of it;
#            4. read the resulting email_queue row straight out of Postgres
#               while it is still `pending`, then flush the queue and read
#               it back as `sent` with a sent_at timestamp;
#            5. read MailHog's own message API and require the run's unique
#               marker to appear in the delivered message body.
#          A run that cannot see its marker in MailHog fails, so a queued
#          row that never actually left Backstage can never pass.
# usage:   scripts/ac33.5-email-queue-live-proof.sh
# env:     BACKSTAGE_URL, MAILHOG_URL, BACKSTAGE_ADMIN_USERNAME,
#          BACKSTAGE_ADMIN_PASSWORD (see defaults below)
# requires: docker compose --profile backstage up -d  (per BACKSTAGE_STARTUP.md)
# created-by: dev-team
# related-story: US-33
# related-ac: 33.5
# ---
set -euo pipefail

BACKSTAGE="${BACKSTAGE_URL:-http://localhost:3101}"
MAILHOG="${MAILHOG_URL:-http://localhost:8025}"
ADMIN_USER="${BACKSTAGE_ADMIN_USERNAME:-admin}"
ADMIN_PASS="${BACKSTAGE_ADMIN_PASSWORD:-change-me-in-production}"
RECIPIENT="${PROOF_RECIPIENT:-studio@earthandhoney.test}"
MARKER="${PROOF_MARKER:-ac33-5-$(date +%s)}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
JAR="$WORK/cookies.txt"

say() { printf '\n=== %s ===\n' "$1"; }

say "1. mint a scoped Backstage API token (fork's own POST /api/admin/api-tokens)"
curl -sS -c "$JAR" -X POST "$BACKSTAGE/api/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" > "$WORK/login.json"
API_TOKEN="$(curl -sS -b "$JAR" -X POST "$BACKSTAGE/api/admin/api-tokens" \
  -H 'Content-Type: application/json' \
  -d '{"name":"ac33.5-live-proof","scopes":["write"]}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')"
echo "minted a write-scoped token (${#API_TOKEN} chars, value not printed)"

say "2. empty the MailHog capture inbox"
curl -sS -X DELETE "$MAILHOG/api/v1/messages"
echo "messages now: $(curl -sS "$MAILHOG/api/v2/messages?limit=1" | python3 -c 'import sys,json; print(json.load(sys.stdin)["total"])')"

say "3. call the real src/lib/inquiryNotification.ts inside the web container"
echo "marker: $MARKER   recipient: $RECIPIENT"
docker compose run --rm --no-deps \
  -e BACKSTAGE_API_TOKEN="$API_TOKEN" \
  -e BACKSTAGE_BACKEND_URL="http://backstage-backend:3000" \
  -e PROOF_RECIPIENT="$RECIPIENT" \
  -e PROOF_MARKER="$MARKER" \
  web npx ts-node --compiler-options '{"module":"commonjs"}' scripts/ac33.5-email-queue-live-proof.ts

say "4a. the queued row, read straight out of Backstage's Postgres while pending"
docker compose exec -T backstage-db psql -U backstage -d backstage \
  -c "select id, event_id, recipient_email, email_type, status, sent_at from email_queue where email_type='inquiry_received' and email_data::text like '%$MARKER%';"

say "4b. flush the queue (the same processor the 60s loop runs), then read it back"
curl -sS -b "$JAR" -X POST "$BACKSTAGE/api/admin/email/flush-queue" -H 'Content-Type: application/json' -d '{}'
echo
for _ in $(seq 1 20); do
  STATUS="$(docker compose exec -T backstage-db psql -U backstage -d backstage -tAc \
    "select status from email_queue where email_type='inquiry_received' and email_data::text like '%$MARKER%' limit 1;" | tr -d '[:space:]')"
  [ "$STATUS" = "sent" ] && break
  sleep 3
done
docker compose exec -T backstage-db psql -U backstage -d backstage \
  -c "select id, recipient_email, email_type, status, sent_at, error_message, retry_count from email_queue where email_type='inquiry_received' and email_data::text like '%$MARKER%';"
[ "${STATUS:-}" = "sent" ] || { echo "FAIL: queue row never reached status=sent (last: ${STATUS:-none})"; exit 1; }

say "5. independent confirmation in the MailHog capture inbox"
curl -sS "$MAILHOG/api/v2/messages" > "$WORK/mailhog.json"
python3 - "$WORK/mailhog.json" "$MARKER" "$RECIPIENT" <<'PY'
import sys, json, quopri
msgs = json.load(open(sys.argv[1]))["items"]
marker, recipient = sys.argv[2], sys.argv[3]
for m in msgs:
    to = ["%s@%s" % (h["Mailbox"], h["Domain"]) for h in m["To"]]
    frm = "%s@%s" % (m["From"]["Mailbox"], m["From"]["Domain"])
    body = m["Content"]["Body"]
    try:
        body = quopri.decodestring(body).decode("utf-8", "replace")
    except Exception:
        pass
    if marker in body and recipient in to:
        print("MailHog message id:", m["ID"])
        print("From:", frm)
        print("To:", to)
        print("Subject:", m["Content"]["Headers"].get("Subject"))
        print("Date:", m["Content"]["Headers"].get("Date"))
        print("--- body excerpt ---")
        for line in body.splitlines():
            if any(k in line for k in (marker, "Wedding enquiry", "/weddings", "Wedding date", "agree to be contacted")):
                print(line.strip())
        sys.exit(0)
print("FAIL: no MailHog message carrying marker %r addressed to %s (inbox holds %d)" % (marker, recipient, len(msgs)))
sys.exit(1)
PY

say "RESULT: PASS — queued through the Backstage email queue, sent by Backstage, seen in the mail catcher"
