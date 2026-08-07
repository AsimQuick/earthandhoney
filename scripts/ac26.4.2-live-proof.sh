#!/usr/bin/env bash
# ---
# file: scripts/ac26.4.2-live-proof.sh
# project: earthandhoney
# purpose: AC-26.4.2's live proof of the second of this story's three
#          changes: uploading a photo into an already-published Backstage
#          gallery reaches the Frontstage placement page through the
#          verified webhook. Assumes the harness
#          scripts/webhook-live-proof-setup.sh stood up (subscription,
#          reconciled secret, two draft galleries, two Payload placements)
#          and gallery A was published by AC-26.4.1.3.2
#          (scripts/ac26.4.1-live-proof.sh proof) — reuses both without
#          rebuilding either.
#          Uploads through the fork's supported
#          `POST /api/admin/photos/:eventId/upload` route (multipart,
#          field name `photos`), already exercised live in
#          `PIVOT_AUDIT.md` under AC-17.1.3/17.5. That route itself does
#          NOT fire `photo.uploaded` — it inserts a `photos` row with
#          `processing_status='pending'` and returns 202 immediately
#          (adminPhotos.js, the async-processing flow documented at its
#          own comment above the per-file loop). The event fires later,
#          asynchronously, from `services/backgroundProcessor.js`'s
#          worker loop, which polls for pending rows and hands each to
#          `photoProcessor.js`'s `processPhoto(photoId)` — the exact
#          function that calls `webhookService.fire('photo.uploaded', ...)`
#          at photoProcessor.js:494. Of the fork's five
#          `webhookService.fire('photo.uploaded', ...)` call sites
#          (photoProcessor.js:246, photoProcessor.js:494,
#          fileWatcher.js:142, s3AutoImporter.js:144,
#          routes/v1/events.js:595), the admin upload path reaches only
#          the second — photoProcessor.js:246 belongs to
#          `processUploadedPhotos`, which is the chunked-upload-complete
#          route's function (adminPhotos.js:1321), not this one. This
#          script therefore polls the delivery rather than assuming it
#          fired synchronously with the upload route's own 202 response.
#          Unlike publish (a one-way draft->live transition), uploading
#          is repeatable, so reproduction here re-runs the identical
#          upload sequence against the SAME gallery with a second fixture
#          file, rather than needing a second gallery the way
#          ac26.4.1-live-proof.sh's publish proof did.
# usage:   scripts/ac26.4.2-live-proof.sh          # proof, then reproduction
#          scripts/ac26.4.2-live-proof.sh proof    # first upload only
#          scripts/ac26.4.2-live-proof.sh reproduce # second upload only
# env:     BACKSTAGE_URL, FRONTSTAGE_URL, BACKSTAGE_ADMIN_USERNAME,
#          BACKSTAGE_ADMIN_PASSWORD, DEADLINE_SECONDS,
#          FIXTURE_IMAGE_1, FIXTURE_IMAGE_2 (see defaults below)
# created-by: dev-team
# related-story: US-26
# related-ac: 26.4.2
# ---
set -euo pipefail

BACKSTAGE="${BACKSTAGE_URL:-http://localhost:3101}"
FRONTSTAGE="${FRONTSTAGE_URL:-http://localhost:3000}"
PROOF_PATH="/dev/gallery-webhook-proof"
ADMIN_USER="${BACKSTAGE_ADMIN_USERNAME:-admin}"
ADMIN_PASS="${BACKSTAGE_ADMIN_PASSWORD:-change-me-in-production}"

# Two small, real, valid images already vendored for the fork's own backend
# fixtures — reused rather than fabricated here. Distinct files for the
# proof and reproduce runs so each upload is independently identifiable by
# original_filename in addition to the returned photo id.
FIXTURE_IMAGE_1="${FIXTURE_IMAGE_1:-vendor/picpeak/test-assets/img1.png}"
FIXTURE_IMAGE_2="${FIXTURE_IMAGE_2:-vendor/picpeak/test-assets/img2.png}"

# Only gallery A is used — the gallery AC-26.4.1.3.2 left published. Gallery
# B is AC-26.4.1.3.3's fixture and is not touched here. Kept in sync by hand
# with WEBHOOK_LIVE_PROOF_GALLERY_SLUGS in src/lib/galleryRevalidation.ts and
# with webhook-live-proof-setup.sh / ac26.4.1-live-proof.sh; a drift between
# them is caught by src/__tests__/us26-ac26.4.2-webhook-live-proof-upload.test.ts.
SLUG_A="wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20"

# Deliberately shorter than the contract's 60s safety-net cap (row 5, and
# this route's own `export const revalidate = 60`): anything the safety net
# could have refreshed on its own is not evidence the webhook did it. A
# webhook-driven change lands in seconds — upstream's delivery worker polls
# every WEBHOOK_DELIVERY_INTERVAL_MS (5000ms default) and the background
# upload processor every UPLOAD_PROCESSOR_POLL_MS (1000ms default).
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

# One summary line for the newest photo.uploaded delivery on subscription $1
# whose payload carries photo id $2, or empty if no such delivery exists
# yet. The list route (adminWebhooks.js:283-325) excludes `payload` from its
# column set, so the match can only be made by reading each candidate
# delivery back individually via the detail route.
delivery_line() {
  local sub="$1" photo_id="$2" ids id detail
  ids="$(curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/webhooks/${sub}/deliveries?limit=50" | jqpy "
d = json.load(sys.stdin)
for r in d.get('deliveries', []):
    if r.get('event_type') == 'photo.uploaded':
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
# only to wait for. The photo row itself must also clear the background
# processor's own poll before a delivery even exists, so this deadline
# covers both queues.
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
      echo "FAIL: photo.uploaded delivery not success after ${elapsed}s — last seen: ${row:-<none>}" >&2
      return 1
    fi
    sleep 1
  done
}

# Uploads $3 into gallery $1, then proves the resulting photo.uploaded
# delivery reaches success and the served Frontstage page reflects a photo
# count of $4.
#
# Sets the global UPLOADED_PHOTO_ID for the caller to inspect, rather than
# capturing this function's output via command substitution — piping
# through `$(...)` would swallow every `say`/progress line into the
# captured value, silently hiding this leg's own transcript (same reasoning
# scripts/ac26.4-live-proof.sh's upload_leg already documents).
upload_and_prove() {
  local slug="$1" label="$2" fixture="$3" want_count="$4" id sub resp

  id="$(event_id_for_slug "$slug")"
  sub="$(subscription_id)"

  say "${label}: uploading ${fixture} to gallery ${id} (${slug})"
  resp="$(curl -s -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/photos/${id}/upload" \
    -F "photos=@${fixture}" \
    -w '\nupload HTTP %{http_code}\n')"
  echo "$resp"
  UPLOADED_PHOTO_ID="$(echo "$resp" | head -1 | jqpy "
d = json.load(sys.stdin)
ids = d.get('photo_ids') or []
print(ids[0] if ids else '')
")"
  if [ -z "$UPLOADED_PHOTO_ID" ]; then
    echo "FAIL: upload response carried no photo_ids for ${slug}" >&2
    return 1
  fi
  echo "queued photo id: ${UPLOADED_PHOTO_ID}"

  say "${label}: the delivery Backstage recorded once background processing completed"
  await_delivery_success "$sub" "$UPLOADED_PHOTO_ID"

  say "${label}: the served Frontstage placement page reflecting the upload"
  await_page_state "$slug" "photos=${want_count}"
}

say "Backstage admin login"
curl -s -c "$COOKIES" -X POST "${BACKSTAGE}/api/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}" \
  -o /dev/null -w 'login HTTP %{http_code}\n'

case "${1:-all}" in
  proof)     upload_and_prove "$SLUG_A" "PROOF" "$FIXTURE_IMAGE_1" 1 ;;
  reproduce) upload_and_prove "$SLUG_A" "REPRODUCE" "$FIXTURE_IMAGE_2" 2 ;;
  all)
    upload_and_prove "$SLUG_A" "PROOF" "$FIXTURE_IMAGE_1" 1
    upload_and_prove "$SLUG_A" "REPRODUCE" "$FIXTURE_IMAGE_2" 2
    ;;
  *) echo "usage: $0 [proof|reproduce|all]" >&2; exit 2 ;;
esac

say "PASSED"
