#!/usr/bin/env bash
# ---
# file: scripts/benchmark/presign-r2-urls.sh
# project: earthandhoney
# purpose: AC-29.2 — generates the presigned R2 URL map candidate delivery
#          path 2 ("direct time-limited presigned R2 links") measures
#          against, for the same AC-29.1.1-seeded gallery
#          (PLACEMENT_DEMO_GALLERY_SLUG, "us-25-ac-25.5-placement-demo")
#          candidate path 1 already renders. Uses the pinned fork's own
#          mechanism, not a reimplementation: runs inside the
#          `backstage-backend` container and calls
#          `getStorage().signedUrl(relPath, ttl)`
#          (vendor/picpeak/backend/src/services/storage/index.js ->
#          S3StorageBackend.js) — the exact function
#          R2_STORAGE_AND_DELIVERY_ADR.md names candidate 2 after — against
#          the real, already-configured R2 bucket (STORAGE_BACKEND=s3 in
#          docker-compose.yml). Nothing is reimplemented client-side and no
#          new AWS SDK dependency is added anywhere in this repo.
#
#          AC-29.2.2.2 correction: every tier the rendered markup can
#          request is presigned, not just `hero`. Both benchmark pages
#          render their gallery images through next/image with
#          `createGalleryImageLoader` (galleryImageLoader.ts), which emits a
#          full `srcSet` — `thumbnail_path` at the 256w/384w candidates,
#          `preview_path` (when one exists) up to 1200w, `hero_path` above
#          that — so presigning only `hero_path` would leave the small
#          candidates pointing back at the Backstage and make the measured
#          page a *mixed* one. That is precisely the state
#          observedDeliveryPath.ts's classifier reports as `null` and run.ts
#          then refuses to write a report for, so a hero-only map cannot
#          produce a candidate-2 measurement at all. If `hero_path` is empty
#          (never generated — PicPeak's hero route builds it lazily on first
#          request), this script requests it once through the Backstage
#          backend's own hero route first, so the presigned URL points at the
#          same real derivative object candidate 1 serves, not a 404.
#
#          Output: scripts/benchmark/presign-data/presigned-image-map.json,
#          shaped
#          `{ "<photoId>": { "thumbnailUrl": "...", "mediumUrl": "...", "largeUrl": "..." } }`
#          — deliveryPathImages.ts's PresignedImageMap, which omits any tier
#          the photo does not have. Gitignored (a live signed-URL query
#          string has no evidentiary value once its TTL expires, and
#          committing one is unnecessary exposure of a time-boxed R2
#          credential fragment).
# usage:   scripts/benchmark/presign-r2-urls.sh [ttlSeconds]
# needs:   `docker compose --profile backstage up -d` already running, and
#          the AC-29.1.1 seeded gallery already present (idempotent —
#          scripts/ac29.1.1-benchmark-render-proof.sh re-run is a no-op if
#          it already ran).
# created-by: dev-team
# related-story: US-29
# related-ac: 29.2.2.2
# ---
set -euo pipefail

# Kept in sync by hand with PLACEMENT_DEMO_GALLERY_SLUG in
# src/lib/galleryRevalidation.ts — the same duplication convention
# scripts/ac29.1.1-benchmark-render-proof.sh already follows.
SLUG="us-25-ac-25.5-placement-demo"
BACKSTAGE_URL="${BACKSTAGE_URL:-http://localhost:3101}"
# S3StorageBackend.signedUrl's own default is 300s (zip-download flow); this
# script's default is longer because the map must still be valid by the time
# `web-benchmark` finishes `npm run build` and Lighthouse runs 3 passes per
# page against it, a much longer window than a single download click.
TTL_SECONDS="${1:-3600}"
OUT_DIR="scripts/benchmark/presign-data"
OUT_FILE="$OUT_DIR/presigned-image-map.json"

mkdir -p "$OUT_DIR"

echo "Ensuring every photo in \"$SLUG\" has a generated hero derivative..."
PHOTO_IDS=$(docker compose exec -T backstage-db psql -U backstage -d backstage -t -A -c \
  "SELECT p.id FROM photos p JOIN events e ON e.id = p.event_id WHERE e.slug = '${SLUG}' ORDER BY p.id;")

for id in $PHOTO_IDS; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "${BACKSTAGE_URL}/api/gallery/${SLUG}/hero/${id}")
  echo "  hero/${id}: ${status}"
done

echo "Reading storage paths from backstage-db..."
# Every tier the rendered srcSet can request, in galleryImageLoader.ts's own
# order: thumbnail_path -> thumbnailUrl, preview_path -> mediumUrl,
# hero_path -> largeUrl. An absent tier comes back as an empty field and is
# omitted from the map, which applyDeliveryPath already reads as "keep the
# Backstage-proxied URL for that tier".
ROWS_JSON=$(docker compose exec -T backstage-db psql -U backstage -d backstage -t -A -F $'\t' -c \
  "SELECT p.id, COALESCE(p.thumbnail_path,''), COALESCE(p.preview_path,''), COALESCE(p.hero_path,'') FROM photos p JOIN events e ON e.id = p.event_id WHERE e.slug = '${SLUG}' ORDER BY p.id;")

# Builds one JS array literal `[["22","thumbnails/...","","heroes/..."], ...]`
# from the tab-separated psql rows above, passed to the node script below as a
# single argv entry — avoids N separate `docker compose exec` round-trips.
ROWS_JS=$(printf '%s\n' "$ROWS_JSON" | awk -F'\t' 'BEGIN{printf "["} NF==4{printf "%s[\"%s\",\"%s\",\"%s\",\"%s\"]", (NR>1?",":""), $1, $2, $3, $4} END{printf "]"}')

echo "Generating presigned R2 URLs (ttl=${TTL_SECONDS}s) via the fork's own S3StorageBackend.signedUrl..."
docker compose exec -T backstage-backend node -e "
const { getStorage } = require('./src/services/storage');
const rows = ${ROWS_JS};
(async () => {
  const storage = getStorage();
  const map = {};
  for (const [id, thumbnailPath, previewPath, heroPath] of rows) {
    const entry = {};
    if (thumbnailPath) entry.thumbnailUrl = await storage.signedUrl(thumbnailPath, ${TTL_SECONDS});
    if (previewPath) entry.mediumUrl = await storage.signedUrl(previewPath, ${TTL_SECONDS});
    if (heroPath) entry.largeUrl = await storage.signedUrl(heroPath, ${TTL_SECONDS});
    if (Object.keys(entry).length > 0) map[id] = entry;
  }
  process.stdout.write(JSON.stringify(map, null, 2));
})().catch((err) => { console.error(err); process.exit(1); });
" > "$OUT_FILE"

# Printed redacted, never raw: this script's own stdout is routinely pasted
# into a session transcript, and X-Amz-Credential/X-Amz-Signature are exactly
# the two values this AC's credential-hygiene requirement keeps out of the
# repository (src/lib/benchmark/redactSignedUrls.ts redacts the same two on
# every committed run report).
echo "Wrote $OUT_FILE (printed with X-Amz-Credential/X-Amz-Signature redacted):"
sed -E 's/(X-Amz-Credential|X-Amz-Signature)=[^&"]*/\1=REDACTED/g' "$OUT_FILE"
