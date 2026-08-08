#!/usr/bin/env bash
# ---
# file: scripts/ac29.2.2.2-delivery-path-proof.sh
# project: earthandhoney
# purpose: AC-29.2.2.2's closing proof that the delivery-path switch is
#          really wired — that `BENCHMARK_DELIVERY_PATH` changes which
#          mechanism the two benchmark pages actually serve their gallery
#          images through, rather than only changing a label. Runs no
#          Lighthouse and builds no report (that is AC-29.2.3's concern):
#          it fetches each benchmark route's HTML, extracts every gallery
#          image URL the markup can request — the `<img src>` *and* every
#          `srcSet` candidate, because a mixed srcSet is not a measurement
#          of either candidate — checks each one's origin against the
#          expected path, then fetches each individually and records its
#          HTTP status, content type and byte length. So "the presigned
#          path serves real bytes end to end" is demonstrated rather than
#          trusted.
#
#          Expected origins, mirroring
#          src/lib/benchmark/observedDeliveryPath.ts's classifier exactly
#          (this script is the live counterpart of that pure logic):
#            backstage-proxy -> every gallery URL contains '/api/gallery/'
#                               and is served from the page origin
#            presigned-r2    -> every gallery URL is absolute and its host
#                               ends in 'r2.cloudflarestorage.com'
#
#          Credential hygiene: the saved HTML and the JSON transcript both
#          have `X-Amz-Credential` and `X-Amz-Signature` replaced with
#          REDACTED before they are written, the same two parameters
#          src/lib/benchmark/redactSignedUrls.ts removes from every
#          committed run report. Everything else — the R2 host, the object
#          key, X-Amz-Expires — is retained, because that is the part that
#          evidences the request went straight to R2.
#
#          Mirrors scripts/ac29.2.2.1-benchmark-image-origin-proof.sh's
#          convention of retaining the fetched HTML and a summary under
#          scripts/benchmark/results/, and saves its transcripts alongside
#          that AC's.
# usage:   BENCHMARK_DELIVERY_PATH=presigned-r2 scripts/ac29.2.2.2-delivery-path-proof.sh
#          BENCHMARK_DELIVERY_PATH=backstage-proxy scripts/ac29.2.2.2-delivery-path-proof.sh
# env:     BENCHMARK_DELIVERY_PATH (default backstage-proxy) — the path the
#            running "web-benchmark" container was built and recreated with;
#            this script asserts against it, it does not select it.
#          BENCHMARK_URL (default http://localhost:3102, the "web-benchmark"
#            service's published port — see docker-compose.yml)
# needs:   the "backstage" profile up with the AC-29.1.1 gallery seeded
#          (scripts/ac29.1.1-benchmark-render-proof.sh), and for
#          presigned-r2 a freshly generated, un-expired map
#          (scripts/benchmark/presign-r2-urls.sh) with "web-benchmark"
#          rebuilt against it:
#            BENCHMARK_DELIVERY_PATH=<path> docker compose --profile benchmark up -d --build --force-recreate web-benchmark
# created-by: dev-team
# related-story: US-29
# related-ac: 29.2.2.2
# ---
set -euo pipefail

BENCHMARK="${BENCHMARK_URL:-http://localhost:3102}"
DELIVERY_PATH="${BENCHMARK_DELIVERY_PATH:-backstage-proxy}"
RESULTS_DIR="scripts/benchmark/results/ac29.2.2.2-delivery-path-proof"
BODY_FILE="$(mktemp -t ac29.2.2.2-image-body.XXXXXX)"

if [ "$DELIVERY_PATH" != "backstage-proxy" ] && [ "$DELIVERY_PATH" != "presigned-r2" ]; then
  echo "FAIL: BENCHMARK_DELIVERY_PATH must be 'backstage-proxy' or 'presigned-r2', got '${DELIVERY_PATH}'" >&2
  exit 2
fi

say() { printf '\n=== %s\n' "$*"; }

# The one redaction used for every byte this script writes or prints.
redact() { sed -E 's/(X-Amz-Credential|X-Amz-Signature)=[^&"[:space:]]*/\1=REDACTED/g'; }

mkdir -p "$RESULTS_DIR"
trap 'rm -f "$BODY_FILE"' EXIT

PAGE_SUMMARIES=""
OVERALL_STATUS=0

# Extracts every gallery image URL a page's markup can request: each <img>'s
# `src` plus every `srcSet` candidate, HTML-entity-decoded (a presigned URL's
# query string arrives as `&amp;`-separated), with Next.js's own optimizer
# endpoint dropped — the site header's logo goes through /_next/image and
# belongs to neither candidate, the same exclusion isGalleryImageUrl() makes.
extract_gallery_image_urls() {
  python3 - "$1" <<'PY'
import html, re, sys

markup = open(sys.argv[1], encoding='utf-8', errors='replace').read()

urls = []
for tag in re.findall(r'<img\b[^>]*>', markup, flags=re.IGNORECASE):
    for attr in ('src', 'srcSet', 'srcset'):
        m = re.search(r'\b%s="([^"]*)"' % attr, tag)
        if not m:
            continue
        value = html.unescape(m.group(1))
        if attr.lower() == 'srcset':
            candidates = [c.strip().rsplit(' ', 1)[0] for c in value.split(',') if c.strip()]
        else:
            candidates = [value]
        urls.extend(c for c in candidates if c and '/_next/image' not in c)

seen = []
for url in urls:
    if url not in seen:
        seen.append(url)
print('\n'.join(seen))
PY
}

# True when `url` is served by the mechanism `DELIVERY_PATH` names.
url_matches_expected_path() {
  case "$DELIVERY_PATH" in
    backstage-proxy)
      case "$1" in */api/gallery/*|/api/gallery/*) return 0 ;; *) return 1 ;; esac ;;
    presigned-r2)
      case "$1" in https://*.r2.cloudflarestorage.com/*) return 0 ;; *) return 1 ;; esac ;;
  esac
}

fetch_page_images() {
  local route_path="$1" html_file="${DELIVERY_PATH}-$2"
  local target="${RESULTS_DIR}/${html_file}"
  local page_http_code

  page_http_code="$(curl -s -o "${BODY_FILE}" -w '%{http_code}' "${BENCHMARK}${route_path}")"
  # Redacted on the way to disk, never after: a raw copy must not exist in the
  # working tree even briefly.
  redact < "${BODY_FILE}" > "$target"
  echo "${route_path}: page HTTP ${page_http_code} -> ${target}"

  if [ "$page_http_code" != "200" ]; then
    echo "FAIL: ${route_path} did not return HTTP 200" >&2
    OVERALL_STATUS=1
    return
  fi

  # Extracted from the unredacted body — the URLs still have to be fetchable.
  local srcs
  srcs="$(extract_gallery_image_urls "${BODY_FILE}")"

  if [ -z "$srcs" ]; then
    echo "FAIL: ${route_path} rendered no gallery <img> at all" >&2
    OVERALL_STATUS=1
    return
  fi

  local image_summaries=""
  while IFS= read -r src; do
    [ -z "$src" ] && continue

    local matched="true"
    if ! url_matches_expected_path "$src"; then
      matched="false"
      echo "FAIL: $(printf '%s' "$src" | redact) is not a ${DELIVERY_PATH} URL" >&2
      OVERALL_STATUS=1
    fi

    # A relative src (candidate 1) is resolved against the page origin; a
    # presigned URL is already absolute and is fetched exactly as rendered.
    local request_url="$src"
    case "$src" in /*) request_url="${BENCHMARK}${src}" ;; esac

    local headers image_http_code content_type byte_length
    headers="$(curl -s -D - -o "${BODY_FILE}" -w '%{http_code}' "$request_url")"
    image_http_code="${headers##*$'\n'}"
    content_type="$(printf '%s' "$headers" | grep -i '^content-type:' | tr -d '\r' | sed 's/^[Cc]ontent-[Tt]ype: *//' | head -1)"
    byte_length="$(wc -c < "${BODY_FILE}" | tr -d ' ')"

    echo "  $(printf '%s' "$src" | redact): HTTP ${image_http_code}, ${content_type}, ${byte_length} bytes"

    # >83 bytes is AC-29.2.2.1's threshold, kept deliberately: 83 is the exact
    # length of Express's `{"message":"Route not found"}` body, the non-image
    # that the withdrawn pre-fix runs recorded as a successful image fetch.
    if [ "$image_http_code" != "200" ] || ! printf '%s' "$content_type" | grep -qi '^image/' || [ "$byte_length" -le 83 ]; then
      echo "FAIL: $(printf '%s' "$src" | redact) did not resolve to a real image (expected HTTP 200, image/*, >83 bytes)" >&2
      OVERALL_STATUS=1
    fi

    image_summaries="${image_summaries}${image_summaries:+,}{\"url\":\"${src}\",\"matchesDeclaredPath\":${matched},\"httpStatus\":${image_http_code},\"contentType\":\"${content_type}\",\"byteLength\":${byte_length}}"
  done <<< "$srcs"

  local image_count
  image_count="$(printf '%s\n' "$srcs" | sed '/^$/d' | wc -l | tr -d ' ')"

  PAGE_SUMMARIES="${PAGE_SUMMARIES}${PAGE_SUMMARIES:+,}{\"path\":\"${route_path}\",\"savedHtml\":\"${html_file}\",\"galleryImageCount\":${image_count},\"images\":[${image_summaries}]}"
}

say "fetching both benchmark routes as BENCHMARK_DELIVERY_PATH=${DELIVERY_PATH}"
fetch_page_images "/dev/benchmark-portfolio-gallery" "benchmark-portfolio-gallery.html"
fetch_page_images "/dev/benchmark-story-gallery" "benchmark-story-gallery.html"

say "writing the delivery-path proof transcript"
TRANSCRIPT="${RESULTS_DIR}/${DELIVERY_PATH}-proof.json"
cat <<JSON | redact > "$TRANSCRIPT"
{
  "story": "US-29",
  "acceptanceCriterion": "29.2.2.2",
  "deliveryPath": "${DELIVERY_PATH}",
  "capturedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "benchmarkUrl": "${BENCHMARK}",
  "passed": $([ "$OVERALL_STATUS" -eq 0 ] && echo true || echo false),
  "pages": [${PAGE_SUMMARIES}]
}
JSON
cat "$TRANSCRIPT"

if [ "$OVERALL_STATUS" -eq 0 ]; then
  say "PASSED — every gallery image on both benchmark pages was served by the ${DELIVERY_PATH} path and returned real image bytes"
else
  say "FAILED — see the failures logged above"
fi

exit "$OVERALL_STATUS"
