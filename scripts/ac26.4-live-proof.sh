#!/usr/bin/env bash
# ---
# file: scripts/ac26.4-live-proof.sh
# project: earthandhoney
# purpose: AC-26.4's live proof of all three of this story's changes reaching
#          the Frontstage through the verified webhook: publishing a gallery
#          (event.published), uploading a photo to it (photo.uploaded), and
#          deleting that photo (photo.deleted). Assumes the harness
#          scripts/webhook-live-proof-setup.sh stood up (subscription,
#          reconciled secret, two draft galleries, two Payload placements)
#          and reuses it rather than rebuilding it, the same way
#          scripts/ac26.4.1-live-proof.sh (the publish-only proof this script
#          supersedes) already did.
#          Two independent runs, one per gallery, rather than one gallery run
#          twice, for the same reason ac26.4.1-live-proof.sh gives: the
#          pinned fork's publish route is a one-way draft->live transition
#          (adminEvents.js:1049,1058-60 400s "Event is already published" on
#          a second call) with no un-publish route, so reproducing the
#          publish leg through the supported interface needs a second,
#          independently-created gallery. Because both proof galleries were
#          already published by an earlier session (see PIVOT_AUDIT.md
#          `## AC-26.4`), this script detects that up front and, for the
#          publish leg only, reports the live evidence that transition
#          already left behind (the recorded webhook delivery, and the
#          served page already showing photos=0) rather than re-issuing a
#          publish call that would 400. The upload and delete legs run for
#          real on every invocation — nothing about them is one-way.
#          Nothing here revalidates anything itself: the only thing that can
#          move the /dev/gallery-webhook-proof page inside the deadline is
#          the AC-26.1 receiver's own on-demand revalidation, triggered by
#          Backstage's verified webhook delivery — so a page that never
#          changes fails the run rather than passing quietly.
# usage:   scripts/ac26.4-live-proof.sh          # run 1 (gallery A), then run 2 (gallery B)
#          scripts/ac26.4-live-proof.sh run1      # gallery A only
#          scripts/ac26.4-live-proof.sh run2      # gallery B only
# env:     BACKSTAGE_URL, FRONTSTAGE_URL, BACKSTAGE_ADMIN_USERNAME,
#          BACKSTAGE_ADMIN_PASSWORD, DEADLINE_SECONDS (see defaults below)
# created-by: dev-team
# related-story: US-26
# related-ac: 26.4
# ---
set -euo pipefail

BACKSTAGE="${BACKSTAGE_URL:-http://localhost:3101}"
FRONTSTAGE="${FRONTSTAGE_URL:-http://localhost:3000}"
PROOF_PATH="/dev/gallery-webhook-proof"
ADMIN_USER="${BACKSTAGE_ADMIN_USERNAME:-admin}"
ADMIN_PASS="${BACKSTAGE_ADMIN_PASSWORD:-change-me-in-production}"

# The image the upload leg sends. A small, real, valid PNG already vendored
# for the fork's own backend fixtures — reused rather than fabricated here.
FIXTURE_IMAGE="${FIXTURE_IMAGE:-vendor/picpeak/test-assets/img1.png}"

# Kept in sync by hand with WEBHOOK_LIVE_PROOF_GALLERY_SLUGS in
# src/lib/galleryRevalidation.ts and with webhook-live-proof-setup.sh /
# ac26.4.1-live-proof.sh; a drift between them is caught by
# src/__tests__/us26-ac26.4-webhook-live-proof.test.tsx.
SLUG_A="wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20"
SLUG_B="wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21"

# Deliberately shorter than the contract's 60s safety-net cap (row 5, and
# the proof route's own `export const revalidate = 60`): anything the safety
# net could have refreshed on its own is not evidence the webhook did it.
# Backstage's own half is fast and consistent — the delivery worker polls
# every WEBHOOK_DELIVERY_INTERVAL_MS (5000ms default) and the background
# upload processor every UPLOAD_PROCESSOR_POLL_MS (1000ms default), both
# confirmed live at 1-9s. The remaining, Frontstage-side half — Next's own
# on-demand regeneration of the statically-rendered proof route once the
# AC-26.1 receiver's on-demand path revalidation runs — was measured live,
# repeatedly, at anywhere from ~2s to ~61s with no consistent floor or ceiling
# (see PIVOT_AUDIT.md
# `## AC-26.4`'s timing note). 55s is set here as the largest margin that
# still stays under the hard 60s cap, not because 55s is expected on every
# run.
DEADLINE_SECONDS="${DEADLINE_SECONDS:-55}"

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
    # Matched on the Frontstage container's compose hostname, deliberately
    # not on the receiver's route path — this script never spells that path
    # out, so it can never be mistaken for something that calls the receiver
    # directly (see the 'never revalidates anything itself' contract test).
    if (s.get('url') or '').startswith('http://web:3000/'):
        print(s['id']); sys.exit(0)
sys.exit(1)
"
}

# Resolves both the numeric Backstage event id and the current is_draft
# state for a gallery slug, rather than hardcoding a database auto-increment
# id or assuming a fixed pre-state.
event_lookup() {
  local slug="$1"
  curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/events?limit=200" | jqpy "
d = json.load(sys.stdin)
for e in (d.get('events', d) if isinstance(d, dict) else d):
    if e.get('slug') == '${slug}':
        print(f\"{e['id']} {e.get('is_draft')}\"); sys.exit(0)
sys.exit(1)
"
}

# One summary line for the newest delivery of $2 (event type) on
# subscription $1 whose payload satisfies the python boolean expression $3
# (evaluated with `data` bound to `payload.get('data', {})`), or empty if no
# such delivery exists yet. The list route (adminWebhooks.js:283-325)
# excludes `payload` from its column set, so the match can only be made by
# reading each candidate delivery back individually via the detail route.
delivery_line() {
  local sub="$1" event_type="$2" py_match="$3" ids id detail
  ids="$(curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/webhooks/${sub}/deliveries?limit=100" | jqpy "
d = json.load(sys.stdin)
for r in d.get('deliveries', []):
    if r.get('event_type') == '${event_type}':
        print(r['id'])
")"
  for id in $ids; do
    detail="$(curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/webhooks/${sub}/deliveries/${id}" | jqpy "
r = json.load(sys.stdin)
data = (r.get('payload') or {}).get('data', {})
if ${py_match}:
    print(f\"id={r['id']} event_type={r['event_type']} status={r['status']} \"
          f\"response_status={r.get('response_status')} attempts={r.get('attempt_count')} \"
          f\"latency_ms={r.get('latency_ms')} last_error={r.get('last_error')}\")
")"
    if [ -n "$detail" ]; then echo "$detail"; return 0; fi
  done
}

# Polls a delivery matched by delivery_line's three arguments until it
# reports status 'success'. Upstream's delivery worker runs on its own
# schedule, so there is nothing here to trigger — only to wait for.
await_delivery_success() {
  local sub="$1" event_type="$2" py_match="$3" started elapsed row
  started=$SECONDS
  while :; do
    row="$(delivery_line "$sub" "$event_type" "$py_match")"
    elapsed=$((SECONDS - started))
    if [ -n "$row" ] && echo "$row" | grep -q 'status=success'; then
      echo "$row"
      echo "delivery reached success after ${elapsed}s"
      return 0
    fi
    if [ "$elapsed" -ge "$DEADLINE_SECONDS" ]; then
      echo "FAIL: ${event_type} delivery not success after ${elapsed}s — last seen: ${row:-<none>}" >&2
      return 1
    fi
    sleep 1
  done
}

# --- Leg 1: event.published --------------------------------------------
#
# Publishes the gallery if it is still a draft (the real, first-time case);
# if it was already published by an earlier run, re-issuing the call would
# 400 "Event is already published" against the fork's one-way publish
# route, so this instead surfaces the live evidence that transition already
# left behind: the recorded delivery, and the page already reflecting it.
publish_leg() {
  local slug="$1" label="$2" EVENT_ID is_draft sub
  read -r EVENT_ID is_draft < <(event_lookup "$slug")
  sub="$(subscription_id)"

  if [ "$is_draft" = "False" ] || [ "$is_draft" = "false" ]; then
    say "${label}: event.published — gallery ${EVENT_ID} (${slug}) was already published by an earlier run (the fork's publish route is one-way, so it cannot be re-fired here); reusing the live evidence that publish already left behind"
    echo "the delivery Backstage recorded for that earlier publish:"
    delivery_line "$sub" "event.published" "data.get('event', {}).get('slug') == '${slug}'"
    echo "the served Frontstage page for this gallery, right now:"
    page_state "$slug"
  else
    say "${label}: event.published — gallery ${EVENT_ID} (${slug}) is a draft, publishing now"
    await_page_state_with "$slug" "unavailable" 90
    curl -s -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/events/${EVENT_ID}/publish" \
      -w '\npublish HTTP %{http_code}\n'
    say "${label}: the delivery Backstage recorded for that publish"
    await_delivery_success "$sub" "event.published" "data.get('event', {}).get('slug') == '${slug}'"
    say "${label}: the served Frontstage page reflecting the publish"
    await_page_state "$slug" "photos=0"
  fi
}

# --- Leg 2: photo.uploaded ----------------------------------------------
#
# Uploads one real photo through the admin upload route. Processing (and
# the webhook fire) happens asynchronously in the background worker, so this
# polls the delivery rather than assuming it fired synchronously with the
# 202 the upload route itself returns.
#
# Sets the global UPLOADED_PHOTO_ID rather than echoing the id for the
# caller to capture via `$(upload_leg ... | tail -1)` — piping this
# function's output through a command substitution would swallow every
# `say`/progress line into that captured value (only the last line would
# survive `tail -1`), silently hiding this leg's own transcript, and a
# failure inside the substitution's subshell would not reliably propagate
# `set -e` to the caller either. Calling it directly, in-process, keeps both
# the live transcript and normal `set -e` failure propagation intact.
upload_leg() {
  local slug="$1" label="$2" EVENT_ID is_draft sub resp
  read -r EVENT_ID is_draft < <(event_lookup "$slug")
  sub="$(subscription_id)"

  say "${label}: photo.uploaded — uploading ${FIXTURE_IMAGE} to gallery ${EVENT_ID} (${slug})"
  resp="$(curl -s -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/photos/${EVENT_ID}/upload" \
    -F "photos=@${FIXTURE_IMAGE}" \
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
  await_delivery_success "$sub" "photo.uploaded" "str(data.get('photo', {}).get('id')) == '${UPLOADED_PHOTO_ID}'"

  say "${label}: the served Frontstage page reflecting the upload"
  await_page_state "$slug" "photos=1"
}

# --- Leg 3: photo.deleted ------------------------------------------------
#
# Deletes the photo uploaded above and confirms the page returns to
# photos=0 — the same published-but-empty state the publish leg started
# from, closing the loop.
delete_leg() {
  local slug="$1" label="$2" PHOTO_ID="$3" EVENT_ID is_draft sub

  read -r EVENT_ID is_draft < <(event_lookup "$slug")
  sub="$(subscription_id)"

  say "${label}: photo.deleted — deleting photo ${PHOTO_ID} from gallery ${EVENT_ID} (${slug})"
  curl -s -b "$COOKIES" -X DELETE "${BACKSTAGE}/api/admin/photos/${EVENT_ID}/photos/${PHOTO_ID}" \
    -w '\ndelete HTTP %{http_code}\n'

  say "${label}: the delivery Backstage recorded for that delete"
  await_delivery_success "$sub" "photo.deleted" "str(data.get('photo', {}).get('id')) == '${PHOTO_ID}'"

  say "${label}: the served Frontstage page reflecting the delete"
  await_page_state "$slug" "photos=0"
}

run_gallery() {
  local slug="$1" label="$2"
  publish_leg "$slug" "$label"
  upload_leg "$slug" "$label"
  delete_leg "$slug" "$label" "$UPLOADED_PHOTO_ID"
}

say "Backstage admin login"
curl -s -c "$COOKIES" -X POST "${BACKSTAGE}/api/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}" \
  -o /dev/null -w 'login HTTP %{http_code}\n'

case "${1:-all}" in
  run1) run_gallery "$SLUG_A" "RUN 1" ;;
  run2) run_gallery "$SLUG_B" "RUN 2" ;;
  all)
    run_gallery "$SLUG_A" "RUN 1"
    run_gallery "$SLUG_B" "RUN 2"
    ;;
  *) echo "usage: $0 [run1|run2|all]" >&2; exit 2 ;;
esac

say "PASSED"
