#!/usr/bin/env bash
# ---
# file: scripts/webhook-live-proof-setup.sh
# project: earthandhoney
# purpose: AC-26.4.1's live-proof *harness*, stood up once so the two
#          criteria that follow (AC-26.4.2 photo upload, AC-26.4.3 photo
#          delete) reuse it instead of rebuilding it. Idempotent by design —
#          every step checks for what it would create before creating it, so
#          re-running this after a container rebuild reports what already
#          exists rather than duplicating it. Covers, in order, the four
#          things WEBHOOK_LIVE_PROOF.md records:
#            (a) reports the compose `default` network membership of the
#                Frontstage container and the Backstage stack, and proves
#                Backstage can actually reach the AC-26.1 receiver at the
#                `web` service hostname;
#            (b) registers the webhook subscription through
#                `POST /api/admin/webhooks`, whose `events` array covers all
#                three types this story handles;
#            (c) prints the per-subscription `whsec_...` secret upstream
#                issues exactly once at creation (adminWebhooks.js:75-142) —
#                the one and only moment it is ever recoverable — so it can
#                be reconciled into the receiver's single
#                PICPEAK_WEBHOOK_SECRET (see the RECONCILE note it prints);
#            (d) creates the two draft Backstage galleries the proof
#                publishes, and the matching Payload `gallery-placements`
#                documents without which the receiver's
#                `hasGalleryPlacementForSlug` check finds nothing to
#                revalidate.
#          Two galleries, not one: the pinned fork's publish route is a
#          one-way draft->live transition (adminEvents.js:1049 400s "Event is
#          already published" on a second call) and ships no un-publish
#          route, so re-running the publish proof needs a second,
#          independently-created draft gallery rather than a database edit
#          underneath the first.
#          Backstage galleries are created with `is_draft: true` precisely so
#          the publish under proof is a real state transition — the same
#          route with `is_draft: false` would fire event.published inside the
#          create call (adminEvents.js:823-830), collapsing the thing being
#          proven into setup.
# usage:   scripts/webhook-live-proof-setup.sh
# env:     BACKSTAGE_URL, FRONTSTAGE_URL, BACKSTAGE_ADMIN_USERNAME,
#          BACKSTAGE_ADMIN_PASSWORD (see defaults below)
# created-by: dev-team
# related-story: US-26
# related-ac: 26.4.1
# ---
set -euo pipefail

BACKSTAGE="${BACKSTAGE_URL:-http://localhost:3101}"
FRONTSTAGE="${FRONTSTAGE_URL:-http://localhost:3000}"
ADMIN_USER="${BACKSTAGE_ADMIN_USERNAME:-admin}"
ADMIN_PASS="${BACKSTAGE_ADMIN_PASSWORD:-change-me-in-production}"
RECEIVER_URL="http://web:3000/api/webhooks/picpeak"
SUBSCRIPTION_NAME="AC-26.4.1 webhook live-proof receiver"

# The shared live-test fixture identity from src/test-support/liveApiAuth.ts —
# reused rather than a second identity invented here, for the same
# once-per-database-lifetime `first-register` reason recorded in that file.
PAYLOAD_EMAIL='live-api-fixture@earthandhoney.test'
PAYLOAD_PASSWORD='Live-Api-Fixture-Password!23'

# Kept in sync by hand with WEBHOOK_LIVE_PROOF_GALLERY_SLUGS in
# src/lib/galleryRevalidation.ts, the same route-side constant duplication
# convention PLACEMENT_DEMO_GALLERY_SLUG already follows. A drift between the
# two is caught by src/__tests__/us26-ac26.4.1-webhook-live-proof.test.tsx.
SLUG_A="wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20"
SLUG_B="wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21"

COOKIES="$(mktemp)"
trap 'rm -f "$COOKIES"' EXIT

say() { printf '\n=== %s\n' "$*"; }

jqpy() {
  python3 -c "import json, sys
$1"
}

say '(a) Frontstage and Backstage on the shared compose "default" network'
docker compose --profile webprod --profile backstage ps \
  --format 'table {{.Service}}\t{{.Name}}\t{{.Status}}'
echo
echo "network aliases of the Frontstage container:"
docker inspect earthandhoney-web-prod-1 \
  --format '{{range $net, $cfg := .NetworkSettings.Networks}}{{$net}} -> {{$cfg.Aliases}}{{"\n"}}{{end}}'
echo "Backstage reaching the AC-26.1 receiver by compose service hostname:"
# An unsigned body: a 401 here is the *correct* answer and the proof of
# reachability — it is the AC-26.1 receiver rejecting an unverified payload,
# which only it can produce. A DNS or routing failure looks nothing like it.
docker compose --profile backstage exec -T backstage-backend \
  wget -qO- --post-data='{}' --header='Content-Type: application/json' \
  "$RECEIVER_URL" 2>&1 | tail -1 || true

say "Backstage admin login"
curl -s -c "$COOKIES" -X POST "${BACKSTAGE}/api/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}" \
  -o /dev/null -w 'login HTTP %{http_code}\n'

say '(b)+(c) webhook subscription covering all three handled event types'
EXISTING="$(curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/webhooks" | jqpy "
subs = json.load(sys.stdin)
subs = subs.get('webhooks', subs) if isinstance(subs, dict) else subs
for s in subs:
    if s.get('url') == '${RECEIVER_URL}':
        print(json.dumps(s)); break
")"

if [ -n "$EXISTING" ]; then
  echo "already registered — upstream issues the plaintext secret only at"
  echo "creation, so this is NOT re-created (that would rotate the secret):"
  echo "$EXISTING" | jqpy "
s = json.load(sys.stdin)
print(f\"  id={s['id']} url={s['url']}\")
print(f\"  events={s['events']}\")
print(f\"  active={s['active']} secret_preview={s['secret_preview']}\")
"
else
  curl -s -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/webhooks" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"${SUBSCRIPTION_NAME}\",\"url\":\"${RECEIVER_URL}\",\"events\":[\"event.published\",\"photo.uploaded\",\"photo.deleted\"],\"active\":true}" \
    | jqpy "
body = json.load(sys.stdin)
s = body.get('webhook', body)
print(f\"  id={s['id']} url={s['url']}\")
print(f\"  events={s['events']}\")
print()
print('  RECONCILE: upstream issues this per-subscription secret exactly once,')
print('  here, and never again (adminWebhooks.js:75-142 returns it on create')
print('  only; every later read returns secret_preview). The AC-26.1 receiver')
print('  verifies against a single PICPEAK_WEBHOOK_SECRET, so copy the value')
print('  below into .env as PICPEAK_WEBHOOK_SECRET and recreate web-prod:')
print(f\"      PICPEAK_WEBHOOK_SECRET={s.get('secret')}\")
"
fi

say "(d) the two draft Backstage galleries the publish proof transitions"
for slug in "$SLUG_A" "$SLUG_B"; do
  found="$(curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/events?limit=200" | jqpy "
d = json.load(sys.stdin)
for e in (d.get('events', d) if isinstance(d, dict) else d):
    if e.get('slug') == '${slug}':
        print(f\"id={e['id']} is_draft={e.get('is_draft')}\"); break
")"
  if [ -n "$found" ]; then
    echo "skip (already exists): ${slug} -> ${found}"
  else
    # event_name/event_date are what upstream derives the slug from
    # (adminEvents.js), so the slug is not settable directly — the names
    # below are chosen to produce exactly SLUG_A / SLUG_B.
    name="${slug#wedding-}"; name="${name%-*-*-*}"
    date="$(echo "$slug" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}$')"
    curl -s -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/events" \
      -H 'Content-Type: application/json' \
      -d "{\"event_type\":\"wedding\",\"event_name\":\"${name}\",\"event_date\":\"${date}\",\"require_password\":false,\"customer_name\":\"AC-26.4.1 Verification\",\"customer_email\":\"ac26-4-1-webhook@example.com\",\"admin_email\":\"ac26-4-1-webhook@example.com\",\"expiration_days\":30,\"is_draft\":true}" \
      -w '\ncreate gallery HTTP %{http_code}\n'

    # Upstream derives the slug from event_name + event_date, so it can't be
    # set directly — the only honest check that this created the gallery the
    # rest of the harness names is to read it back by slug.
    curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/events?limit=200" | jqpy "
d = json.load(sys.stdin)
ok = any(e.get('slug') == '${slug}' for e in (d.get('events', d) if isinstance(d, dict) else d))
print(f\"verified created slug ${slug}: {ok}\")
sys.exit(0 if ok else 1)
"
  fi
done

say "(d) the matching Payload gallery-placements documents"
TOKEN="$(curl -s -X POST "${FRONTSTAGE}/api/users/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${PAYLOAD_EMAIL}\",\"password\":\"${PAYLOAD_PASSWORD}\"}" \
  | jqpy "print(json.load(sys.stdin)['token'])")"

for slug in "$SLUG_A" "$SLUG_B"; do
  existing="$(curl -s -G "${FRONTSTAGE}/api/gallery-placements" \
    -H "Authorization: JWT ${TOKEN}" \
    --data-urlencode "where[gallerySlug][equals]=${slug}" \
    | jqpy "
d = json.load(sys.stdin)
docs = d.get('docs', [])
print(docs[0]['id'] if docs else '')
")"
  if [ -n "$existing" ]; then
    echo "skip (already exists): ${slug} -> placement id ${existing}"
  else
    curl -s -X POST "${FRONTSTAGE}/api/gallery-placements" \
      -H 'Content-Type: application/json' \
      -H "Authorization: JWT ${TOKEN}" \
      -d "{\"gallerySlug\":\"${slug}\",\"layout\":\"masonry\",\"heading\":\"AC-26.4.1 webhook live-proof gallery\",\"visibility\":\"public\",\"order\":0}" \
      | jqpy "
d = json.load(sys.stdin)
print(f\"created: {d['doc']['gallerySlug']} -> placement id {d['doc']['id']}\")
"
  fi
done

say "HARNESS READY"
