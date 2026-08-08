<!--
---
file: scripts/benchmark/results/CANDIDATE_COVERAGE.md
project: earthandhoney
purpose: AC-29.2 — the coverage record for the five candidate delivery paths
         R2_STORAGE_AND_DELIVERY_ADR.md lists. States, per candidate, whether
         it was measured and where its raw evidence lives, or that it was not
         measured and the specific prerequisite that blocks it. No candidate
         is dropped and none is ranked: the ADR forbids ranking by preference,
         the measured numbers are written into the ADR by AC-29.3, and the
         decision itself is AC-29.4's, subject to Product Owner sign-off.
created-by: dev-team
related-story: US-29
related-ac: 29.2
---
-->

# Candidate delivery-path coverage (AC-29.2)

## Coverage table

| # | Candidate (ADR wording) | Status | Evidence, or the specific blocking prerequisite |
|---|---|---|---|
| 1 | Serving through the Backstage | **Measured** | `run-2026-08-08T15-29-04-854Z-backstage-proxy.json`, `run-2026-08-08T15-30-06-730Z-backstage-proxy.json` — two invocations, 3 Lighthouse passes per page per invocation, both representative pages. Every gallery `<img>` fetched `/api/gallery/:slug/hero/:photoId` from the page origin and received a real derivative (~8 kB transferred), never R2 directly. |
| 2 | Direct time-limited links | **Measured** | `run-2026-08-08T15-31-59-072Z-presigned-r2.json`, `run-2026-08-08T15-33-01-345Z-presigned-r2.json` — same two pages, same seeded gallery, same build, differing only in the `<img src>`. Every gallery `<img>` fetched a presigned `https://<account>.r2.cloudflarestorage.com/...?X-Amz-Expires=7200&...` URL straight from R2. Signatures redacted in the committed reports (see "What is redacted" below). |
| 3 | Public delivery through a content-network (CDN) domain | **Unmeasured** | Blocking prerequisite: **a Cloudflare custom domain (or an enabled r2.dev public development URL) on the `earthandhoney` bucket.** Neither exists. `R2_STORAGE_AND_DELIVERY_ADR.md` §5 records the live audit finding: no public bucket URL, `r2.dev` domain or CDN/custom domain is configured anywhere in this project, and no `R2_PUBLIC_URL`/`CDN_URL`/`CUSTOM_DOMAIN`-shaped variable exists in `.env.example`, `docker-compose.yml` or any consumer's source. Without a public origin there is no URL for Lighthouse to request, so no number can be produced. Raised as item 15 in `scrum-master/po-requests.md`. |
| 4 | An edge authorisation layer | **Unmeasured** | Blocking prerequisite: **a deployed Cloudflare Worker in front of the bucket, on a Cloudflare custom domain** (the Worker needs a route, which needs the same domain candidate 3 needs). Neither the Worker nor the domain exists, and no `wrangler` config, Worker source or deploy step exists in this repository. Raised as item 15 in `scrum-master/po-requests.md`. |
| 5 | A hybrid | **Unmeasured** | Blocking prerequisite: **whichever of candidate 3's Cloudflare custom domain or candidate 4's Cloudflare Worker the hybrid composes.** The ADR defines the hybrid as Backstage-mediated serving for private/protected galleries plus CDN or edge delivery for public ones, so it inherits candidate 3's and 4's prerequisite exactly. See "The one hybrid that is measurable today" below for why the 1+2 combination is not a separate measurement. Raised, transitively, as item 15 in `scrum-master/po-requests.md`. |

## How the two measured candidates were made real

Both candidates measure the **same** seeded gallery (Backstage event `21`,
slug `us-25-ac-25.5-placement-demo`, the gallery AC-29.1.1 seeded and proved
renders), on the **same** two pages, from the **same** production build. The
only difference between a candidate-1 run and a candidate-2 run is the `<img>`
URL, swapped by `src/lib/benchmark/deliveryPathImages.ts` at request time from
the `BENCHMARK_DELIVERY_PATH` env var — so a difference in the numbers is a
difference in delivery mechanism, not in page, markup, image set or build.

**Candidate 1** required a fix before it could be measured at all. The
committed pre-AC-29.2 reports (`run-2026-08-08T14-51-01-229Z.json`,
`run-2026-08-08T14-52-16-271Z.json`) recorded three "images" per page, two of
which transferred **83 bytes** each: those were Express's
`{"message":"Route not found"}` JSON body, not photographs. The gallery URLs
Backstage returns (`/api/gallery/:slug/hero/:photoId`) are relative to the
page's own origin, and nothing proxied Next.js's origin through to the
Backstage backend that owns those routes. `next.config.ts` now rewrites the
four binary image routes (`thumbnail`, `hero`, `photo`, `preview`) to
`BACKSTAGE_BACKEND_URL`; after that fix the same request transfers ~8 kB of
real JPEG. This was a live defect on every already-shipped US-25/US-26
placement route, not only on the benchmark pages.

**Candidate 2** uses the pinned fork's own mechanism rather than a
reimplementation: `scripts/benchmark/presign-r2-urls.sh` runs inside the
`backstage-backend` container and calls
`getStorage().signedUrl(relPath, ttl)` — `S3StorageBackend.signedUrl`, the
exact function the ADR names candidate 2 after — against the real,
already-configured R2 bucket. No AWS SDK dependency was added to this repo.

## The one hybrid that is measurable today

A candidate-5 hybrid built only from candidates 1 and 2 would serve each page
entirely through one of the two mechanisms already measured above, so its
per-page numbers would be the per-page numbers already recorded, not a new
measurement. Every hybrid that produces a *different* number requires the CDN
or edge component — which is why candidate 5's blocking prerequisite is
candidate 3's or candidate 4's, and why it is recorded as unmeasured rather
than as measured-by-composition.

## What is redacted in the committed reports

Candidate-2 URLs are live AWS SigV4 links. Before a report is written,
`src/lib/benchmark/redactSignedUrls.ts` replaces the values of
`X-Amz-Credential` (which embeds the R2 access key id) and `X-Amz-Signature`
with `REDACTED`. The R2 host, the object key, `X-Amz-Expires` and
`X-Amz-Algorithm` are preserved, so a committed report still shows that the
fetch went straight to R2 on a time-limited link. The generated URL map itself
(`scripts/benchmark/presign-data/presigned-image-map.json`) is gitignored.

## Reproducing either candidate

With the `backstage` profile up and the AC-29.1.1 gallery seeded:

```
# candidate 1
docker compose --profile benchmark up -d --force-recreate web-benchmark
docker compose --profile benchmark run --rm lighthouse-benchmark

# candidate 2
scripts/benchmark/presign-r2-urls.sh 7200
BENCHMARK_DELIVERY_PATH=presigned-r2 docker compose --profile benchmark up -d --force-recreate web-benchmark
BENCHMARK_DELIVERY_PATH=presigned-r2 docker compose --profile benchmark run --rm lighthouse-benchmark
```

## What this file does not do

It records no comparison, no ranking and no choice. The measured numbers are
written per candidate into `R2_STORAGE_AND_DELIVERY_ADR.md` by AC-29.3
alongside the four targets that document made itself accountable to; the
decision, and the Product Owner sign-off it requires, are AC-29.4's. If no
candidate meets all four targets, AC-29.6 governs what happens next.
