#!/usr/bin/env bash
# ---
# file: scripts/ac34.6-homepage-hero-benchmark-seed.sh
# project: earthandhoney
# purpose: AC-34.6 — reproduces the exact live setup the recorded
#          performance measurement (scripts/benchmark/results/
#          AC-34.6-HOMEPAGE-PERFORMANCE.md) was taken against: a real,
#          published Backstage gallery with photos, wired into the running
#          "web-benchmark" production build (docker-compose.yml, the same
#          "benchmark" profile BACKSTAGE_STARTUP.md's "Benchmark harness"
#          section documents) via
#          StudioProfile.homeHeroGallerySlug (AC-34.3's Flow A field), so the
#          homepage hero actually renders through
#          "/api/gallery/:slug/hero/:photoId" — the same `backstage-proxy`
#          delivery mechanism (candidate 1) R2_STORAGE_AND_DELIVERY_ADR.md's
#          AC-29.3 measurements already cover — rather than
#          GalleryUnavailablePlaceholder's fallback markup, which carries no
#          photograph for Largest Contentful Paint to measure.
#          Idempotent: every step checks for what it would create/set before
#          creating/setting it, mirroring
#          scripts/ac29.1.1-benchmark-render-proof.sh's own convention.
#          Does not itself run the Lighthouse pass or write the report --
#          see AC-34.6-HOMEPAGE-PERFORMANCE.md for the exact follow-up
#          command and the recorded numbers.
# usage:   scripts/ac34.6-homepage-hero-benchmark-seed.sh
# env:     BACKSTAGE_URL (default http://localhost:3101),
#          FRONTSTAGE_URL (default http://localhost:3102, "web-benchmark"'s
#          published host port), BACKSTAGE_ADMIN_USERNAME,
#          BACKSTAGE_ADMIN_PASSWORD
# needs:   `docker compose --profile backstage up -d` and
#          `docker compose --profile benchmark up -d --build web-benchmark`
#          already running (BACKSTAGE_STARTUP.md's "Benchmark harness"
#          prerequisites) — this script starts neither, mirroring
#          ac29.1.1-benchmark-render-proof.sh's own scope boundary.
# created-by: dev-team
# related-story: US-34
# related-ac: 34.6
# ---
set -euo pipefail

BACKSTAGE="${BACKSTAGE_URL:-http://localhost:3101}"
FRONTSTAGE="${FRONTSTAGE_URL:-http://localhost:3102}"
ADMIN_USER="${BACKSTAGE_ADMIN_USERNAME:-admin}"
ADMIN_PASS="${BACKSTAGE_ADMIN_PASSWORD:-change-me-in-production}"

EVENT_NAME="US-34 AC-34.6 homepage performance measurement gallery"
LIVE_FIXTURE_EMAIL="live-api-fixture@earthandhoney.test"
LIVE_FIXTURE_PASSWORD='Live-Api-Fixture-Password!23'

COOKIES="$(mktemp)"
trap 'rm -f "$COOKIES"' EXIT

say() { printf '\n=== %s\n' "$*"; }

jqpy() {
  python3 -c "import json, sys
$1"
}

say "Backstage admin login"
curl -s -c "$COOKIES" -X POST "${BACKSTAGE}/api/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}" \
  -o /dev/null -w 'login HTTP %{http_code}\n'

say "the seeded benchmark gallery (\"${EVENT_NAME}\")"
EVENT_ID="$(curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/events?search=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "${EVENT_NAME}")" | jqpy "
d = json.load(sys.stdin)
for e in (d.get('events', d) if isinstance(d, dict) else d):
    if e.get('event_name') == '${EVENT_NAME}':
        print(e['id']); sys.exit(0)
")"

if [ -n "$EVENT_ID" ]; then
  echo "skip (already exists): event id ${EVENT_ID}"
else
  CREATE_RESP="$(curl -s -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/events" \
    -H 'Content-Type: application/json' \
    -d "{\"event_type\":\"wedding\",\"event_name\":\"${EVENT_NAME}\",\"event_date\":\"2026-09-01\",\"require_password\":false,\"customer_name\":\"AC-34.6 Benchmark Seed\",\"customer_email\":\"ac34-6-benchmark@example.com\",\"admin_email\":\"ac34-6-benchmark@example.com\",\"expiration_days\":365,\"is_draft\":false}")"
  echo "$CREATE_RESP"
  EVENT_ID="$(echo "$CREATE_RESP" | jqpy "print(json.load(sys.stdin)['id'])")"
fi
SLUG="$(curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/events/${EVENT_ID}" | jqpy "print(json.load(sys.stdin)['slug'])")"
echo "EVENT_ID=${EVENT_ID} SLUG=${SLUG}"

say "photos on the seeded gallery"
count_photos() {
  curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/photos/${EVENT_ID}/photos" | jqpy "
d = json.load(sys.stdin)
print(len(d.get('photos', [])))
"
}
PHOTO_COUNT="$(count_photos)"
if [ "$PHOTO_COUNT" -ge 2 ]; then
  echo "skip (already has ${PHOTO_COUNT} photos)"
else
  curl -s -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/photos/${EVENT_ID}/upload" \
    -F "photos=@vendor/picpeak/test-assets/img1.png" \
    -F "photos=@vendor/picpeak/test-assets/img2.png" \
    -w '\nupload HTTP %{http_code}\n'
  PHOTO_COUNT="$(count_photos)"
  echo "seeded — gallery now has ${PHOTO_COUNT} photos"
fi

say "authenticating against the Frontstage Payload API (shared live fixture user)"
TOKEN="$(curl -s -X POST "${FRONTSTAGE}/api/users/first-register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${LIVE_FIXTURE_EMAIL}\",\"password\":\"${LIVE_FIXTURE_PASSWORD}\"}" \
  | jqpy "
d = json.load(sys.stdin)
print(d.get('token', ''))
" 2>/dev/null || true)"
if [ -z "$TOKEN" ]; then
  TOKEN="$(curl -s -X POST "${FRONTSTAGE}/api/users/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${LIVE_FIXTURE_EMAIL}\",\"password\":\"${LIVE_FIXTURE_PASSWORD}\"}" \
    | jqpy "print(json.load(sys.stdin)['token'])")"
fi

say "pointing StudioProfile.homeHeroGallerySlug at the seeded gallery"
curl -s -X POST "${FRONTSTAGE}/api/globals/studio-profile" \
  -H "Authorization: JWT ${TOKEN}" -H 'Content-Type: application/json' \
  -d "{\"homeHeroGallerySlug\":\"${SLUG}\"}" -o /dev/null -w 'update HTTP %{http_code}\n'

say "rebuilding \"web-benchmark\" so the statically-generated homepage bakes in the new hero (StudioProfile is read at build time, not per-request)"
docker compose --profile benchmark up -d --build --force-recreate web-benchmark

say "verifying the homepage now renders real gallery imagery, not the placeholder"
HTML="$(curl -s "${FRONTSTAGE}/")"
GALLERY_IMG_COUNT="$(echo "$HTML" | grep -o "src=\"/api/gallery/${SLUG}/[^\"]*\"" | wc -l | tr -d ' ')"
if echo "$HTML" | grep -q 'gallery-placement-unavailable' || [ "$GALLERY_IMG_COUNT" -lt 1 ]; then
  echo "FAIL: homepage did not render real hero gallery imagery" >&2
  exit 1
fi
echo "PASSED — homepage hero renders ${GALLERY_IMG_COUNT} real gallery <img> request(s) via ${SLUG}"
echo ""
echo "Next: docker compose --profile benchmark run --rm --entrypoint 'npx ts-node --compiler-options \"{\\\"module\\\":\\\"commonjs\\\",\\\"moduleResolution\\\":\\\"node\\\"}\" ac34.2-hero-cls-measurement.ts' lighthouse-benchmark"
echo "Then restore StudioProfile.homeHeroGallerySlug to its prior value (null, in this checkout) via the same /api/globals/studio-profile route."
