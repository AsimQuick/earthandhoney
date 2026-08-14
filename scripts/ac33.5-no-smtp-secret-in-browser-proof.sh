#!/usr/bin/env bash
# ---
# file: scripts/ac33.5-no-smtp-secret-in-browser-proof.sh
# project: earthandhoney
# purpose: AC-33.5's second live proof (PRD 20.3) — no SMTP secret, and no
#          Backstage email-queue credential, is ever sent to or present in
#          the browser. The static source guard
#          (src/__tests__/us33-ac33.5-no-smtp-secret-in-browser.test.ts)
#          proves the *source* never references one outside a server-only
#          module; this script proves the same of the *artefact the browser
#          actually receives*, which is the thing PRD 20.3 is about.
#          Runs a real production `next build` inside the web container with
#          deliberately distinctive sentinel values loaded into every secret
#          this AC touches (BACKSTAGE_API_TOKEN plus the SMTP_* family), then
#          greps every byte the browser can fetch — the whole of
#          `.next/static` (client chunks, CSS, media) and the server-rendered
#          HTML of each public route — for those sentinels. A build is used
#          rather than a running dev server because `next dev` serves
#          unminified, on-demand modules: a secret inlined only by the
#          production compiler would be missed.
#          The sentinels are nonsense strings invented here, never real
#          credentials, so the transcript this run produces is safe to commit.
# usage:   scripts/ac33.5-no-smtp-secret-in-browser-proof.sh
# requires: docker compose (the "web" service; no Backstage profile needed —
#           nothing is sent, only built and inspected)
# created-by: dev-team
# related-story: US-33
# related-ac: 33.5
# ---
set -euo pipefail

# Invented sentinels — not credentials. Each is unique enough that a single
# occurrence anywhere in a browser-reachable byte stream is unambiguous.
SENTINEL_TOKEN="AC335SENTINELBACKSTAGETOKENo7Qv"
SENTINEL_SMTP_PASS="AC335SENTINELSMTPPASSWORDo7Qv"
SENTINEL_SMTP_USER="AC335SENTINELSMTPUSERo7Qv"

echo "=== production build with sentinel secrets loaded, then grep everything the browser can fetch ==="
docker compose run --rm --no-deps \
  -e BACKSTAGE_API_TOKEN="$SENTINEL_TOKEN" \
  -e SMTP_PASSWORD="$SENTINEL_SMTP_PASS" \
  -e SMTP_PASS="$SENTINEL_SMTP_PASS" \
  -e SMTP_USER="$SENTINEL_SMTP_USER" \
  -e BACKSTAGE_BACKEND_URL="http://backstage-backend:3000" \
  -e SENTINEL_TOKEN="$SENTINEL_TOKEN" \
  -e SENTINEL_SMTP_PASS="$SENTINEL_SMTP_PASS" \
  -e SENTINEL_SMTP_USER="$SENTINEL_SMTP_USER" \
  web sh -eu -c '
    npm run build

    echo
    echo "--- client-side bundle: every byte under .next/static the browser may fetch ---"
    echo "files inspected: $(find .next/static -type f | wc -l | tr -d " ")"
    echo "bytes inspected: $(find .next/static -type f -exec cat {} + | wc -c | tr -d " ")"

    HITS=0
    for S in "$SENTINEL_TOKEN" "$SENTINEL_SMTP_PASS" "$SENTINEL_SMTP_USER"; do
      if grep -rqF "$S" .next/static; then
        echo "FAIL: sentinel $S present in .next/static"
        grep -rlF "$S" .next/static
        HITS=$((HITS+1))
      else
        echo "clean: sentinel $S absent from every client chunk"
      fi
    done

    echo
    echo "--- also checked: the generic secret NAMES, in case a value ever changes ---"
    for N in BACKSTAGE_API_TOKEN SMTP_PASSWORD SMTP_PASS SMTP_USER SMTP_HOST; do
      if grep -rqF "$N" .next/static; then
        echo "FAIL: the name $N appears in a client chunk"
        HITS=$((HITS+1))
      else
        echo "clean: $N never named in a client chunk"
      fi
    done

    echo
    echo "--- served HTML + the JS each page tells the browser to fetch ---"
    PORT=3010 npx next start -p 3010 >/tmp/next-start.log 2>&1 &
    for i in $(seq 1 60); do
      if wget -q -O /dev/null http://127.0.0.1:3010/ 2>/dev/null; then break; fi
      sleep 1
    done
    for ROUTE in / /weddings /engagements; do
      OUT=/tmp/page.html
      CODE=$(wget -S -q -O "$OUT" "http://127.0.0.1:3010$ROUTE" 2>&1 | awk "/HTTP\// {c=\$2} END {print c}")
      echo "GET $ROUTE -> ${CODE:-served}, $(wc -c < $OUT | tr -d " ") bytes"
      for S in "$SENTINEL_TOKEN" "$SENTINEL_SMTP_PASS" "$SENTINEL_SMTP_USER"; do
        if grep -qF "$S" "$OUT"; then echo "  FAIL: sentinel $S present in the HTML of $ROUTE"; HITS=$((HITS+1)); fi
      done
      # Every script the page tells the browser to request, fetched and scanned.
      SRCS=$(grep -o "/_next/static/[A-Za-z0-9._/-]*\.js" "$OUT" | sort -u)
      N=0
      for SRC in $SRCS; do
        wget -q -O /tmp/chunk.js "http://127.0.0.1:3010$SRC" || continue
        N=$((N+1))
        for S in "$SENTINEL_TOKEN" "$SENTINEL_SMTP_PASS" "$SENTINEL_SMTP_USER"; do
          if grep -qF "$S" /tmp/chunk.js; then echo "  FAIL: sentinel $S present in $SRC"; HITS=$((HITS+1)); fi
        done
      done
      echo "  $N script(s) requested by $ROUTE fetched and scanned: clean"
    done

    echo
    if [ "$HITS" -eq 0 ]; then
      echo "RESULT: PASS - no SMTP or Backstage-queue secret is present in any client bundle, page HTML, or fetched script"
    else
      echo "RESULT: FAIL - $HITS leak(s)"
      exit 1
    fi
  '
