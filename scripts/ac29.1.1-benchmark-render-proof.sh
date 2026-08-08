#!/usr/bin/env bash
# ---
# file: scripts/ac29.1.1-benchmark-render-proof.sh
# project: earthandhoney
# purpose: AC-29.1.1's live proof that the two benchmark pages
#          (src/app/(frontend)/dev/benchmark-portfolio-gallery/page.tsx and
#          .../benchmark-story-gallery/page.tsx) render real Backstage
#          gallery imagery through resolveGalleryPlacementImages rather than
#          silently falling back to GalleryUnavailablePlaceholder — the
#          exact false-green scripts/benchmark/results/run-2026-08-08T13-2*.json
#          recorded (imageRequestCount: 1 on both pages, the site logo
#          alone, because PLACEMENT_DEMO_GALLERY_SLUG had never actually
#          been seeded in Backstage). Idempotent: every step checks for what
#          it would create before creating it, so re-running this after a
#          container restart reports what already exists.
#          Seeds the exact slug src/lib/galleryRevalidation.ts's
#          PLACEMENT_DEMO_GALLERY_SLUG names
#          ("us-25-ac-25.5-placement-demo"). That slug contains a literal
#          "." in "25.5", which the pinned fork's own slug generator
#          (vendor/picpeak/backend/src/utils/slug.js) can never produce
#          (its `[^a-z0-9]+` regex strips periods) — no admin API call can
#          create this exact string, so after creating the event/gallery
#          through the supported `POST /api/admin/events` route, this
#          script corrects the slug with one direct `UPDATE events SET
#          slug = ...` against backstage-db. The lookup routes
#          (`GET /api/gallery/:slug/info` etc.) do a plain `WHERE slug = ?`
#          with no re-validation, so this is safe.
#          Then fetches both benchmark routes and writes the resulting HTML
#          plus a summary into
#          scripts/benchmark/results/ac29.1.1-render-proof/, so the render
#          proof is retained in the repository rather than trusted.
# usage:   scripts/ac29.1.1-benchmark-render-proof.sh
# env:     BACKSTAGE_URL, FRONTSTAGE_URL, BACKSTAGE_ADMIN_USERNAME,
#          BACKSTAGE_ADMIN_PASSWORD (see defaults below)
# needs:   the Backstage stack up (`docker compose --profile backstage up -d`)
#          and *something* serving Frontstage at FRONTSTAGE_URL. This script
#          deliberately starts neither: AC-29.1.1 builds no Docker image, and
#          the render proof is a claim about what the pages resolve, not about
#          how they were served. AC-29.1's own Docker harness service is what
#          pins the served build for the measurements that follow.
# created-by: dev-team
# related-story: US-29
# related-ac: 29.1.1
# ---
set -euo pipefail

BACKSTAGE="${BACKSTAGE_URL:-http://localhost:3101}"
FRONTSTAGE="${FRONTSTAGE_URL:-http://localhost:3000}"
ADMIN_USER="${BACKSTAGE_ADMIN_USERNAME:-admin}"
ADMIN_PASS="${BACKSTAGE_ADMIN_PASSWORD:-change-me-in-production}"

# Kept in sync by hand with PLACEMENT_DEMO_GALLERY_SLUG in
# src/lib/galleryRevalidation.ts, the same route-side constant duplication
# convention scripts/webhook-live-proof-setup.sh already follows for its own
# slugs.
SLUG="us-25-ac-25.5-placement-demo"
EVENT_NAME="25 ac 25 5 placement demo"
EVENT_DATE="2026-09-01"

RESULTS_DIR="scripts/benchmark/results/ac29.1.1-render-proof"

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

say "the seeded demo gallery (\"${SLUG}\")"
EVENT_ID="$(curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/events?limit=200" | jqpy "
d = json.load(sys.stdin)
for e in (d.get('events', d) if isinstance(d, dict) else d):
    if e.get('slug') == '${SLUG}':
        print(e['id']); sys.exit(0)
")"

if [ -n "$EVENT_ID" ]; then
  echo "skip (already exists): ${SLUG} -> event id ${EVENT_ID}"
else
  CREATE_RESP="$(curl -s -b "$COOKIES" -X POST "${BACKSTAGE}/api/admin/events" \
    -H 'Content-Type: application/json' \
    -d "{\"event_type\":\"wedding\",\"event_name\":\"${EVENT_NAME}\",\"event_date\":\"${EVENT_DATE}\",\"require_password\":false,\"customer_name\":\"AC-29.1.1 Benchmark Seed\",\"customer_email\":\"ac29-1-1-benchmark@example.com\",\"admin_email\":\"ac29-1-1-benchmark@example.com\",\"expiration_days\":365,\"is_draft\":false}")"
  echo "$CREATE_RESP"
  EVENT_ID="$(echo "$CREATE_RESP" | jqpy "print(json.load(sys.stdin)['id'])")"

  echo "correcting the generated slug to the exact PLACEMENT_DEMO_GALLERY_SLUG"
  docker compose --profile backstage exec -T backstage-db \
    psql -U backstage -d backstage \
    -c "UPDATE events SET slug = '${SLUG}' WHERE id = ${EVENT_ID};"
fi

say "photos on the seeded gallery"
count_photos() {
  curl -s -b "$COOKIES" "${BACKSTAGE}/api/admin/photos/${EVENT_ID}/photos" | jqpy "
d = json.load(sys.stdin)
print(len(d.get('photos', [])))
"
}

PHOTO_COUNT="$(count_photos)"

# Two is the floor AC-29.1.1 states ("more than one gallery <img>"), and it is
# also the floor that makes the two pages measure *differently*:
# GallerySlideshowLayout only mounts a preload sibling when there is a next
# image distinct from the current one, so a one-photo gallery would collapse
# the story page's loading shape onto the portfolio page's.
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

say "fetching both benchmark routes and saving the render proof"
mkdir -p "$RESULTS_DIR"

ROUTE_SUMMARIES=""

fetch_and_check() {
  local path="$1" out_file="$2"
  local target="${RESULTS_DIR}/${out_file}"
  local http_code img_count gallery_img_count placeholder_count

  http_code="$(curl -s -o "$target" -w '%{http_code}' "${FRONTSTAGE}${path}")"

  # `|| true`: under `set -o pipefail`, grep's own "no match" exit status (1)
  # would otherwise fail the whole pipeline even though `wc -l` still
  # produced the correct "0" count.
  img_count="$(grep -o '<img[^>]*>' "$target" | wc -l | tr -d ' ' || true)"
  # Only <img> tags actually served by the Backstage gallery route for the
  # seeded slug count as proof. Counting every <img> is precisely how the
  # false green got through: the shared site header carries a logo <img>, so
  # "the page has an image" stayed true on a page rendering nothing but
  # GalleryUnavailablePlaceholder — which is what
  # scripts/benchmark/results/run-2026-08-08T13-2*.json's
  # `imageRequestCount: 1` was recording on both pages.
  gallery_img_count="$(grep -o "<img[^>]*src=\"[^\"]*/api/gallery/${SLUG}/[^\"]*\"" "$target" | wc -l | tr -d ' ' || true)"
  placeholder_count="$(grep -o 'gallery-placement-unavailable' "$target" | wc -l | tr -d ' ' || true)"

  echo "${path}: HTTP ${http_code}, ${img_count} <img> tags of which ${gallery_img_count} are gallery images, ${placeholder_count} placeholder occurrences -> ${target}"

  ROUTE_SUMMARIES="${ROUTE_SUMMARIES}${ROUTE_SUMMARIES:+,}{\"path\":\"${path}\",\"savedHtml\":\"${out_file}\",\"httpStatus\":${http_code},\"totalImageTags\":${img_count},\"galleryImageCount\":${gallery_img_count},\"placeholderOccurrences\":${placeholder_count}}"

  if [ "$http_code" != "200" ] || [ "$gallery_img_count" -le 1 ] || [ "$placeholder_count" != "0" ]; then
    echo "FAIL: ${path} did not render real gallery imagery" >&2
    return 1
  fi
}

fetch_and_check "/dev/benchmark-portfolio-gallery" "benchmark-portfolio-gallery.html"
fetch_and_check "/dev/benchmark-story-gallery" "benchmark-story-gallery.html"

say "writing the render-proof summary"
# AC-29.1.1 asks for the fetched HTML *and the seeding command used* to be
# retained, so the proof can be re-derived rather than trusted. Written last,
# so a summary file only ever exists for a run where both routes passed.
cat > "${RESULTS_DIR}/render-proof-summary.json" <<JSON
{
  "story": "US-29",
  "acceptanceCriterion": "29.1.1",
  "capturedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "seedingCommand": "scripts/ac29.1.1-benchmark-render-proof.sh",
  "gallerySlug": "${SLUG}",
  "backstageEventId": ${EVENT_ID},
  "seededPhotoCount": ${PHOTO_COUNT},
  "backstageUrl": "${BACKSTAGE}",
  "frontstageUrl": "${FRONTSTAGE}",
  "routes": [${ROUTE_SUMMARIES}]
}
JSON
cat "${RESULTS_DIR}/render-proof-summary.json"

say "PASSED — both benchmark pages rendered real gallery imagery, no placeholder fallback"
