#!/usr/bin/env bash
# ---
# file: scripts/ac26.4.3-live-proof.sh
# project: earthandhoney
# purpose: AC-26.4.3's live proof of the third and last of this story's
#          three changes: deleting a photo from an already-published
#          Backstage gallery reaches the Frontstage placement page through
#          the verified webhook, closing the three-change set the original
#          AC-26.4 stated as one. Assumes the harness
#          scripts/webhook-live-proof-setup.sh stood up (subscription,
#          reconciled secret, two draft galleries, two Payload placements),
#          gallery A was published by AC-26.4.1.3.2
#          (scripts/ac26.4.1-live-proof.sh proof), and AC-26.4.2
#          (scripts/ac26.4.2-live-proof.sh) uploaded the two photos this
#          script deletes — reuses all of it without rebuilding any of it.
#          Deletes through the fork's supported
#          `DELETE /api/admin/photos/:eventId/photos/:photoId` route
#          (`routes/adminPhotos.js:632`), the single-photo delete path.
#          That handler fires `photo.deleted`
#          (`webhookService.fire('photo.deleted', ...)`) itself, at
#          `adminPhotos.js:694`, before responding — unlike the upload
#          route, no background worker claims a pending row first. But
#          `webhookService.fire()` only enqueues a `webhook_deliveries` row
#          (`services/webhookService.js:148-199`); a separate delivery
#          worker still attempts the HTTP call on its own schedule
#          (`WEBHOOK_DELIVERY_INTERVAL_MS`, 5000ms default), so this script
#          polls the delivery rather than assuming it reached the receiver
#          synchronously with the delete route's own response.
#          Deleting is repeatable in the sense this proof needs — two
#          independent photos already exist on gallery A (ids left by
#          AC-26.4.2's proof and reproduce uploads) — so reproduction here
#          re-runs the identical delete sequence against the SAME gallery, a
#          second time, against the photo AC-26.4.2's reproduce run
#          uploaded, rather than needing a second gallery the way
#          ac26.4.1-live-proof.sh's publish proof did. Each run resolves its
#          target photo id dynamically (the lowest-id photo still present on
#          the gallery), never hardcoding AC-26.4.2's recorded ids 19/20, so
#          this script keeps working if that section's ids ever drift.
# usage:   scripts/ac26.4.3-live-proof.sh          # proof, then reproduction
#          scripts/ac26.4.3-live-proof.sh proof    # first delete only
#          scripts/ac26.4.3-live-proof.sh reproduce # second delete only
# env:     BACKSTAGE_URL, FRONTSTAGE_URL, BACKSTAGE_ADMIN_USERNAME,
#          BACKSTAGE_ADMIN_PASSWORD, DEADLINE_SECONDS (see defaults below)
# created-by: dev-team
# related-story: US-26
# related-ac: 26.4.3
# ---
set -euo pipefail

BACKSTAGE="${BACKSTAGE_URL:-http://localhost:3101}"
FRONTSTAGE="${FRONTSTAGE_URL:-http://localhost:3000}"
PROOF_PATH="/dev/gallery-webhook-proof"
ADMIN_USER="${BACKSTAGE_ADMIN_USERNAME:-admin}"
ADMIN_PASS="${BACKSTAGE_ADMIN_PASSWORD:-change-me-in-production}"

# Only gallery A is used — the gallery AC-26.4.1.3.2 published and
# AC-26.4.2 uploaded two photos into. Gallery B is AC-26.4.1.3.3's fixture
# and is not touched here. Kept in sync by hand with
# WEBHOOK_LIVE_PROOF_GALLERY_SLUGS in src/lib/galleryRevalidation.ts and
# with webhook-live-proof-setup.sh / ac26.4.1-live-proof.sh /
# ac26.4.2-live-proof.sh; a drift between them is caught by
# src/__tests__/us26-ac26.4.3-webhook-live-proof-delete.test.ts.
SLUG_A="wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20"

# Deliberately shorter than the contract's 60s safety-net cap (row 5, and
# this route's own `export const revalidate = 60`): anything the safety net
# could have refreshed on its own is not evidence the webhook did it. A
# webhook-driven change lands in seconds — upstream's delivery worker polls
# every WEBHOOK_DELIVERY_INTERVAL_MS (5000ms default).
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
  local slug="$1" want="$2" started elapsed got
  started=$SECONDS
  while :; do
    got="$(page_state "$slug")"
    elapsed=$((SECONDS - started))
    if [ "$got" = "$want" ]; then
      echo "page reflects '${want}' for ${slug} after ${elapsed}s"
      return 0
    fi
    if [ "$elapsed" -ge "$DEADLINE_SECONDS" ]; then
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
    if (s.get('url') or '').startswith('http://web:3000/'):
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

# The lowest-id photo still present on gallery $1's event id $2 — the next
# one this script deletes. Resolved live rather than hardcoding
# AC-26.4.2's recorded ids (19, 20), so a re-run after any fixture reset
# still targets whatever photos actually exist.
oldest_photo_id() {
  local event_id="$1"
  curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/photos/${event_id}/photos" | jqpy "
d = json.load(sys.stdin)
ids = sorted(p['id'] for p in d.get('photos', []))
print(ids[0] if ids else '')
"
}

# One summary line for the newest photo.deleted delivery on subscription $1
# whose payload carries photo id $2, or empty if no such delivery exists
# yet. The list route (adminWebhooks.js:283-325) excludes `payload` from its
# column set, so the match can only be made by reading each candidate
# delivery back individually via the detail route.
delivery_line() {
  local sub="$1" photo_id="$2" ids id detail
  ids="$(curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/webhooks/${sub}/deliveries?limit=50" | jqpy "
d = json.load(sys.stdin)
for r in d.get('deliveries', []):
    if r.get('event_type') == 'photo.deleted':
        print(r['id'])
")"
  for id in $ids; do
    detail="$(curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/webhooks/${sub}/deliveries/${id}" | jqpy "
r = json.load(sys.stdin)
data = (r.get('payload') or {}).get('data', {})
if str(data.get('photo', {}).get('id')) == '${photo_id}':
    print(f\"id={r['id']} event_type={r['event_type']} status={r['status']} \"
          f\"response_status={r.get('response_status')} attempts={r.get('attempt_count')} \"
          f\"latency_ms={r.get('latency_ms')} last_error={r.get('last_error')}\")
")"
    if [ -n "$detail" ]; then echo "$detail"; return 0; fi
  done
}

# Polls that delivery until it reports status 'success'. Upstream's delivery
# worker runs on its own schedule, so there is nothing here to trigger —
# only to wait for.
await_delivery_success() {
  local sub="$1" photo_id="$2" started elapsed row
  started=$SECONDS
  while :; do
    row="$(delivery_line "$sub" "$photo_id")"
    elapsed=$((SECONDS - started))
    if [ -n "$row" ] && echo "$row" | grep -q 'status=success'; then
      echo "$row"
      echo "delivery reached success after ${elapsed}s"
      return 0
    fi
    if [ "$elapsed" -ge "$DEADLINE_SECONDS" ]; then
      echo "FAIL: photo.deleted delivery not success after ${elapsed}s — last seen: ${row:-<none>}" >&2
      return 1
    fi
    sleep 1
  done
}

# Deletes the oldest remaining photo in gallery $1, then proves the
# resulting photo.deleted delivery reaches success and the served
# Frontstage page reflects a photo count of $3.
#
# Sets the global DELETED_PHOTO_ID for the caller to inspect, rather than
# capturing this function's output via command substitution — piping
# through `$(...)` would swallow every `say`/progress line into the
# captured value, silently hiding this leg's own transcript (same reasoning
# scripts/ac26.4.2-live-proof.sh's upload_and_prove already documents).
delete_and_prove() {
  local slug="$1" label="$2" want_count="$3" id sub resp

  id="$(event_id_for_slug "$slug")"
  sub="$(subscription_id)"
  DELETED_PHOTO_ID="$(oldest_photo_id "$id")"
  if [ -z "$DELETED_PHOTO_ID" ]; then
    echo "FAIL: no photos remain on gallery ${id} (${slug}) to delete" >&2
    return 1
  fi

  say "${label}: deleting photo ${DELETED_PHOTO_ID} from gallery ${id} (${slug})"
  resp="$(curl -s -b "$COOKIES" -X DELETE "${BACKSTAGE}/api/admin/photos/${id}/photos/${DELETED_PHOTO_ID}" \
    -w '\ndelete HTTP %{http_code}\n')"
  echo "$resp"

  say "${label}: the delivery Backstage recorded for that delete"
  await_delivery_success "$sub" "$DELETED_PHOTO_ID"

  say "${label}: the served Frontstage placement page reflecting the delete"
  await_page_state "$slug" "photos=${want_count}"
}

say "Backstage admin login"
curl -s -c "$COOKIES" -X POST "${BACKSTAGE}/api/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}" \
  -o /dev/null -w 'login HTTP %{http_code}\n'

case "${1:-all}" in
  proof)     delete_and_prove "$SLUG_A" "PROOF" 1 ;;
  reproduce) delete_and_prove "$SLUG_A" "REPRODUCE" 0 ;;
  all)
    delete_and_prove "$SLUG_A" "PROOF" 1
    delete_and_prove "$SLUG_A" "REPRODUCE" 0
    ;;
  *) echo "usage: $0 [proof|reproduce|all]" >&2; exit 2 ;;
esac

say "PASSED"
