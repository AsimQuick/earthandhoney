# ---
# file: scripts/benchmark/Dockerfile
# project: earthandhoney
# purpose: AC-29.1 — the Docker image the "lighthouse-benchmark" service
#          (docker-compose.yml) builds. Separate from the app's own
#          Dockerfile, with its own isolated package.json/package-lock.json
#          (scripts/benchmark/package.json) — lighthouse + chrome-launcher
#          pull in a large Puppeteer/Chrome-DevTools-Protocol dependency
#          tree that has no business in the production Next.js image's
#          node_modules or its package-lock.json. Built from the repo root
#          (build context ".") only so it can COPY the pure,
#          dependency-free orchestration/extraction logic
#          (src/lib/benchmark/, src/lib/benchmarkPages.ts) that
#          scripts/benchmark/run.ts imports by relative path — nothing else
#          from the app is copied in.
# created-by: dev-team
# related-story: US-29
# related-ac: 29.1.3
# ---

# node:22, not this repo's usual node:20 (see the app's own Dockerfile) —
# lighthouse@13's package.json declares engines.node >=22.19, and this image
# has no other Node-version dependency to keep in sync with the app image.
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium fonts-liberation ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app

COPY src/lib/benchmark ./src/lib/benchmark
COPY src/lib/benchmarkPages.ts ./src/lib/benchmarkPages.ts
COPY scripts/benchmark ./scripts/benchmark

WORKDIR /app/scripts/benchmark
RUN npm ci

ENTRYPOINT ["npx", "ts-node", "--compiler-options", "{\"module\":\"commonjs\",\"moduleResolution\":\"node\"}", "run.ts"]
