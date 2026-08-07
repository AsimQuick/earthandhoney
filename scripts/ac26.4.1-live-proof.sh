#!/usr/bin/env bash
# ---
# file: scripts/ac26.4.1-live-proof.sh
# project: earthandhoney
# purpose: AC-26.4.1's live proof of the first of this story's three changes:
#          publishing a gallery in Backstage reaches the Frontstage placement
#          page through a verified webhook. Assumes the harness
#          scripts/webhook-live-proof-setup.sh stood up (subscription,
#          reconciled secret, two draft galleries, two Payload placements)
#          and reuses it rather than rebuilding it — AC-26.4.2 and AC-26.4.3
#          reuse the same harness in turn.
#          One run publishes one gallery through the fork's supported
#          `POST /api/admin/events/:id/publish` route, then shows two
#          independent things about that publish: the delivery Backstage
#          recorded for it reaching `success` via
#          `GET /api/admin/webhooks/:id/deliveries`, and the served
#          Frontstage page at /dev/gallery-webhook-proof changing to match.
#          Nothing here revalidates anything itself: the only thing that can
#          move that page inside the deadline is the AC-26.1 receiver's own
#          revalidatePath call, so a page that never changes fails the run
#          rather than passing quietly.
#          Invoked with no argument it runs the full criterion — the proof
#          against gallery A, then the identical sequence re-run against
#          gallery B to show it reproduces. Two galleries rather than one
#          re-published twice because the pinned fork's publish route is a
#          one-way draft->live transition (adminEvents.js:1049,1058-60 400s
#          "Event is already published" on a second call) and ships no
#          un-publish route, so reproducing through the supported interface
#          needs a second, independently-created gallery rather than a
#          database edit underneath the first.
# usage:   scripts/ac26.4.1-live-proof.sh          # proof, then reproduction
#          scripts/ac26.4.1-live-proof.sh proof    # gallery A only
#          scripts/ac26.4.1-live-proof.sh reproduce # gallery B only
# env:     BACKSTAGE_URL, FRONTSTAGE_URL, BACKSTAGE_ADMIN_USERNAME,
#          BACKSTAGE_ADMIN_PASSWORD, DEADLINE_SECONDS (see defaults below)
# created-by: dev-team
# related-story: US-26
# related-ac: 26.4.1
# ---
set -euo pipefail

BACKSTAGE="${BACKSTAGE_URL:-http://localhost:3101}"
FRONTSTAGE="${FRONTSTAGE_URL:-http://localhost:3000}"
PROOF_PATH="/dev/gallery-webhook-proof"
ADMIN_USER="${BACKSTAGE_ADMIN_USERNAME:-admin}"
ADMIN_PASS="${BACKSTAGE_ADMIN_PASSWORD:-change-me-in-production}"
RECEIVER_URL="http://web:3000/api/webhooks/picpeak"

# Kept in sync by hand with WEBHOOK_LIVE_PROOF_GALLERY_SLUGS in
# src/lib/galleryRevalidation.ts and with webhook-live-proof-setup.sh; a
# drift between them is caught by
# src/__tests__/us26-ac26.4.1-webhook-live-proof.test.tsx.
SLUG_A="wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20"
SLUG_B="wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21"

# Deliberately shorter than the contract's 60s safety-net cap (row 5, and
# this route's own `export const revalidate = 60`): anything the safety net
# could have refreshed on its own is not evidence the webhook did it. A
# webhook-driven change lands in seconds — upstream's delivery worker polls
# every WEBHOOK_DELIVERY_INTERVAL_MS, 5000ms by default
# (webhookDeliveryWorker.js:7).
DEADLINE_SECONDS="${DEADLINE_SECONDS:-25}"

COOKIES="$(mktemp)"
trap 'rm -f "$COOKIES"' EXIT

say() { printf '\n=== %s\n' "$*"; }

jqpy() {
  python3 -c "import json, sys
$1"
}

# The rendered state of one gallery section on the proof page: either
# "unavailable" or "photos=<n>". Read straight out of the served HTML's
# data- attributes, so nothing here trusts an API — it reads what a visitor
# would actually be served.
page_state() {
  local slug="$1"
  curl -s "${FRONTSTAGE}${PROOF_PATH}" \
    | tr '<' '\n' \
    | grep -F "data-gallery-slug=\"${slug}\"" \
    | sed -e 's/.*data-testid="webhook-proof-unavailable".*/unavailable/' \
          -e 's/.*data-photo-count="\([0-9]*\)".*/photos=\1/' \
    | head -1
}

# Polls the served page until it reaches $2 for gallery $1, or fails the run
# at the deadline. Prints how long the webhook-driven refresh actually took.
await_page_state() {
  await_page_state_with "$1" "$2" "$DEADLINE_SECONDS"
}

await_page_state_with() {
  local slug="$1" want="$2" deadline="$3" started elapsed got
  started=$SECONDS
  while :; do
    got="$(page_state "$slug")"
    elapsed=$((SECONDS - started))
    if [ "$got" = "$want" ]; then
      echo "page reflects '${want}' for ${slug} after ${elapsed}s"
      return 0
    fi
    if [ "$elapsed" -ge "$deadline" ]; then
      echo "FAIL: page still '${got}' for ${slug}, wanted '${want}', after ${elapsed}s" >&2
      return 1
    fi
    sleep 1
  done
}

# The subscription id is resolved from its URL rather than hardcoded, so a
# reseeded Backstage database never leaves this script pointed at a stale id.
subscription_id() {
  curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/webhooks" | jqpy "
subs = json.load(sys.stdin)
subs = subs.get('webhooks', subs) if isinstance(subs, dict) else subs
for s in subs:
    if s.get('url') == '${RECEIVER_URL}':
        print(s['id']); sys.exit(0)
sys.exit(1)
"
}

# Same reasoning: resolve the gallery's numeric Backstage id from its slug
# rather than hardcode a database auto-increment id.
event_id_for_slug() {
  local slug="$1"
  curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/events?limit=200" | jqpy "
d = json.load(sys.stdin)
for e in (d.get('events', d) if isinstance(d, dict) else d):
    if e.get('slug') == '${slug}':
        print(e['id']); sys.exit(0)
sys.exit(1)
"
}

# The event.published delivery this subscription recorded for this gallery,
# as one summary line, or empty if Backstage has not enqueued one yet. The
# list route (adminWebhooks.js:283-325) selects a fixed column set that
# excludes `payload`, so the gallery a delivery belongs to is only knowable
# from the detail route (`GET /:id/deliveries/:deliveryId`) — hence list,
# then read back the newest event.published rows one at a time.
delivery_line() {
  local sub="$1" slug="$2" ids id detail
  ids="$(curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/webhooks/${sub}/deliveries?limit=50" | jqpy "
d = json.load(sys.stdin)
for r in d.get('deliveries', []):
    if r.get('event_type') == 'event.published':
        print(r['id'])
")"
  for id in $ids; do
    detail="$(curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/webhooks/${sub}/deliveries/${id}" | jqpy "
r = json.load(sys.stdin)
if '${slug}' in json.dumps(r.get('payload') or {}):
    print(f\"id={r['id']} event_type={r['event_type']} status={r['status']} \"
          f\"response_status={r.get('response_status')} attempts={r.get('attempt_count')} \"
          f\"latency_ms={r.get('latency_ms')} last_error={r.get('last_error')}\")
")"
    if [ -n "$detail" ]; then echo "$detail"; return 0; fi
  done
}

# Polls that delivery until it reports status 'success'. Upstream's delivery
# worker runs on its own schedule, every WEBHOOK_DELIVERY_INTERVAL_MS, so
# there is nothing here to trigger — only to wait for.
await_delivery_success() {
  local sub="$1" slug="$2" started elapsed row
  started=$SECONDS
  while :; do
    row="$(delivery_line "$sub" "$slug")"
    elapsed=$((SECONDS - started))
    if [ -n "$row" ] && echo "$row" | grep -q 'status=success'; then
      echo "$row"
      echo "delivery reached success after ${elapsed}s"
      return 0
    fi
    if [ "$elapsed" -ge "$DEADLINE_SECONDS" ]; then
      echo "FAIL: delivery not success after ${elapsed}s — last seen: ${row:-<none>}" >&2
      return 1
    fi
    sleep 1
  done
}

publish_and_prove() {
  local slug="$1" label="$2" id sub
  id="$(event_id_for_slug "$slug")"
  sub="$(subscription_id)"

  say "${label}: pre-state — gallery ${id} (${slug}) is still a draft"
  # The page may still be serving a cached render from before this gallery
  # existed, so settle the pre-state first, giving the route's own 60s safety
  # net room to expire. Using the safety net to establish the *starting*
  # state is sound; what must not be attributable to it is the change after
  # the publish, and that is what DEADLINE_SECONDS (< 60) bounds.
  await_page_state_with "$slug" "unavailable" 90

  say "${label}: publish the gallery in Backstage (fires event.published)"
  curl -s -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/events/${id}/publish" \
    -w '\npublish HTTP %{http_code}\n'

  say "${label}: the delivery Backstage recorded for that publish"
  await_delivery_success "$sub" "$slug"

  say "${label}: the served Frontstage placement page reflecting the publish"
  await_page_state "$slug" "photos=0"
}

say "Backstage admin login"
curl -s -c "$COOKIES" -X POST "${BACKSTAGE}/api/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}" \
  -o /dev/null -w 'login HTTP %{http_code}\n'

case "${1:-all}" in
  proof)     publish_and_prove "$SLUG_A" "PROOF" ;;
  reproduce) publish_and_prove "$SLUG_B" "REPRODUCE" ;;
  all)
    publish_and_prove "$SLUG_A" "PROOF"
    publish_and_prove "$SLUG_B" "REPRODUCE"
    ;;
  *) echo "usage: $0 [proof|reproduce|all]" >&2; exit 2 ;;
esac

say "PASSED"
