#!/usr/bin/env bash
# ---
# file: scripts/ac29.2.2.1-benchmark-image-origin-proof.sh
# project: earthandhoney
# purpose: AC-29.2.2.1's live proof that next.config.ts's rewrite fix
#          actually closes AC-29.2.1's blocker — every gallery `<img>` on
#          the two benchmark pages 404'd against the Next.js origin because
#          nothing proxied `/api/gallery/:slug/:kind/:photoId` through to
#          the Backstage backend that owns those routes, which is why the
#          withdrawn pre-fix runs recorded `transferBytes: 83`, the length
#          of Express's own `{"message":"Route not found"}` body. Runs no
#          Lighthouse and builds no report — it fetches each benchmark
#          route's HTML, extracts every gallery `<img src>` from it, fetches
#          each one individually, and records its HTTP status, content type
#          and byte length, so a real photograph landing on the wire is
#          demonstrated rather than trusted. Mirrors
#          scripts/ac29.1.1-benchmark-render-proof.sh's convention of
#          retaining the fetched HTML and a summary under
#          scripts/benchmark/results/.
# usage:   scripts/ac29.2.2.1-benchmark-image-origin-proof.sh
# env:     BENCHMARK_URL (default http://localhost:3102, the "web-benchmark"
#          service's published port — see docker-compose.yml)
# needs:   the "backstage" profile up with the AC-29.1.1 gallery seeded
#          (scripts/ac29.1.1-benchmark-render-proof.sh) and the "benchmark"
#          profile's "web-benchmark" built from this fix and running:
#            docker compose --profile benchmark up -d --build --force-recreate web-benchmark
#          Run with no BENCHMARK_DELIVERY_PATH override, so this measures
#          the default candidate-1 (Backstage-proxy) path this AC fixes —
#          delivery-path switching is AC-29.2.2.2's concern, not this one's.
# created-by: dev-team
# related-story: US-29
# related-ac: 29.2.2.1
# ---
set -euo pipefail

BENCHMARK="${BENCHMARK_URL:-http://localhost:3102}"
RESULTS_DIR="scripts/benchmark/results/ac29.2.2.1-image-origin-proof"

say() { printf '\n=== %s\n' "$*"; }

mkdir -p "$RESULTS_DIR"

jqpy() {
  python3 -c "import json, sys
$1"
}

PAGE_SUMMARIES=""
OVERALL_STATUS=0

fetch_page_images() {
  local route_path="$1" html_file="$2"
  local target="${RESULTS_DIR}/${html_file}"
  local page_http_code

  page_http_code="$(curl -s -o "$target" -w '%{http_code}' "${BENCHMARK}${route_path}")"
  echo "${route_path}: page HTTP ${page_http_code} -> ${target}"

  if [ "$page_http_code" != "200" ]; then
    echo "FAIL: ${route_path} did not return HTTP 200" >&2
    OVERALL_STATUS=1
    return
  fi

  # Only <img> tags served by the Backstage gallery route for the seeded
  # slug count — same reasoning as ac29.1.1-benchmark-render-proof.sh: the
  # shared site header's logo <img> is not evidence of anything this AC
  # measures.
  local srcs
  srcs="$(grep -o '<img[^>]*src="[^"]*"' "$target" | grep -o 'src="[^"]*"' | sed 's/^src="//;s/"$//' | grep '/api/gallery/' | sed 's/&amp;/\&/g' | sort -u)"

  if [ -z "$srcs" ]; then
    echo "FAIL: ${route_path} rendered no gallery <img> at all" >&2
    OVERALL_STATUS=1
    return
  fi

  local image_summaries=""
  while IFS= read -r src; do
    [ -z "$src" ] && continue
    local headers image_http_code content_type byte_length
    headers="$(curl -s -D - -o /tmp/ac29.2.2.1-image-body -w '%{http_code}' "${BENCHMARK}${src}")"
    image_http_code="${headers##*$'\n'}"
    content_type="$(printf '%s' "$headers" | grep -i '^content-type:' | tr -d '\r' | sed 's/^[Cc]ontent-[Tt]ype: *//' | head -1)"
    byte_length="$(wc -c < /tmp/ac29.2.2.1-image-body | tr -d ' ')"

    echo "  ${src}: HTTP ${image_http_code}, ${content_type}, ${byte_length} bytes"

    if [ "$image_http_code" != "200" ] || ! printf '%s' "$content_type" | grep -qi '^image/' || [ "$byte_length" -le 83 ]; then
      echo "FAIL: ${src} did not resolve to a real image (expected HTTP 200, image/*, >83 bytes)" >&2
      OVERALL_STATUS=1
    fi

    image_summaries="${image_summaries}${image_summaries:+,}{\"url\":\"${src}\",\"httpStatus\":${image_http_code},\"contentType\":\"${content_type}\",\"byteLength\":${byte_length}}"
  done <<< "$srcs"
  rm -f /tmp/ac29.2.2.1-image-body

  local image_count
  image_count="$(printf '%s\n' "$srcs" | sed '/^$/d' | wc -l | tr -d ' ')"

  PAGE_SUMMARIES="${PAGE_SUMMARIES}${PAGE_SUMMARIES:+,}{\"path\":\"${route_path}\",\"savedHtml\":\"${html_file}\",\"galleryImageCount\":${image_count},\"images\":[${image_summaries}]}"
}

say "fetching both benchmark routes and every gallery image they render"
fetch_page_images "/dev/benchmark-portfolio-gallery" "benchmark-portfolio-gallery.html"
fetch_page_images "/dev/benchmark-story-gallery" "benchmark-story-gallery.html"

say "writing the image-origin proof transcript"
cat > "${RESULTS_DIR}/image-origin-proof.json" <<JSON
{
  "story": "US-29",
  "acceptanceCriterion": "29.2.2.1",
  "capturedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "benchmarkUrl": "${BENCHMARK}",
  "pages": [${PAGE_SUMMARIES}]
}
JSON
cat "${RESULTS_DIR}/image-origin-proof.json"

if [ "$OVERALL_STATUS" -eq 0 ]; then
  say "PASSED — every gallery <img> on both benchmark pages resolved to a real image from the page origin"
else
  say "FAILED — see the failures logged above"
fi

exit "$OVERALL_STATUS"
