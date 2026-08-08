<!--
---
file: scripts/benchmark/results/MEASURED_PATHS.md
project: earthandhoney
purpose: AC-29.2.2.3 — the measured numbers for the candidate delivery paths
         AC-29.2.1 bounded AC-29.2.2 to (1 and 2), each labelled with the
         candidate it belongs to and stated with the spread between the
         harness invocations AC-29.1.3 requires, since AC-29.3 reads
         pass/fail against that spread as its noise floor. Generated, not
         hand-written: `npm run benchmark:summarise` re-renders it from the
         retained raw run reports beside it, and the AC-29.2.2.3 test suite
         fails if this file and those reports ever disagree.
created-by: dev-team
related-story: US-29
related-ac: 29.2.2.3
---
-->

# Measured candidate delivery paths (AC-29.2.2.3)

Both paths measure the **same** seeded gallery on the **same** two
representative pages from the **same** production build; the only
difference between a candidate-1 and a candidate-2 run is the `<img>` URL,
swapped at request time by `src/lib/benchmark/deliveryPathImages.ts` from
the `BENCHMARK_DELIVERY_PATH` env var. Each report's label is not trusted:
`scripts/benchmark/run.ts` refuses to write a report whose observed image
URLs contradict the declared path (`observedDeliveryPath.ts`).

This file records numbers only. It states no target, no pass/fail, no
ranking and no comparison between paths — AC-29.3 owns the ADR write-up
and the per-target verdict. Candidates 3, 4 and 5 are out of this AC's
bounded scope; AC-29.2 records whether each is measured or unmeasured with
its blocking prerequisite.

## Coverage of the two candidates in this AC's scope

Each candidate below is stated by name. A candidate with no measurement is
stated as unmeasured with the prerequisite blocking it; it is never
estimated, never extrapolated from the other candidate, and never left out
of this table.

| Candidate | Delivery path | Status | Committed harness invocations |
|---|---|---|---|
| 1 — Serving through the Backstage | `backstage-proxy` | measured | 2 |
| 2 — Direct time-limited links | `presigned-r2` | measured | 2 |

## Candidate 1 — Serving through the Backstage (`backstage-proxy`)

Mechanism measured: every gallery `<img>` requests `/api/gallery/:slug/hero/:photoId` on the page origin, which `next.config.ts` rewrites to the Backstage backend that owns the route.

Retained raw output, one file per harness invocation (2 invocations):

1. `run-2026-08-08T20-01-17-206Z-backstage-proxy.json`
2. `run-2026-08-08T20-02-23-653Z-backstage-proxy.json`

### Page `portfolio-gallery`

2 invocations × 3 Lighthouse passes per invocation.

| Metric | Per-invocation median | Spread between invocations | Widest single-pass envelope |
|---|---|---|---|
| Mobile Lighthouse performance score | 0.87 / 0.87 | **0.00** | 0.86–0.89 |
| Image-attributable CLS | 0.0000 / 0.0000 | **0.0000** | 0.0000–0.0000 |
| LCP (mobile throttle) | 3585ms / 3581ms | **4ms** | 3529ms–3643ms |

Network payload audit: 2 gallery image requests per pass, transferred 8183 bytes; 0 image(s) flagged oversized by Lighthouse's `image-size-responsive` audit across all passes.

### Page `story-gallery`

2 invocations × 3 Lighthouse passes per invocation.

| Metric | Per-invocation median | Spread between invocations | Widest single-pass envelope |
|---|---|---|---|
| Mobile Lighthouse performance score | 0.92 / 0.96 | **0.04** | 0.90–0.99 |
| Image-attributable CLS | 0.0000 / 0.0000 | **0.0000** | 0.0000–0.0000 |
| LCP (mobile throttle) | 3214ms / 2575ms | **640ms** | 1989ms–3295ms |

Network payload audit: 2 gallery image requests per pass, transferred 8183 bytes; 0 image(s) flagged oversized by Lighthouse's `image-size-responsive` audit across all passes.

## Candidate 2 — Direct time-limited links (`presigned-r2`)

Mechanism measured: every gallery `<img>` requests a presigned `r2.cloudflarestorage.com` URL directly, signed by the pinned fork's own `S3StorageBackend.signedUrl`.

Retained raw output, one file per harness invocation (2 invocations):

1. `run-2026-08-08T20-06-58-925Z-presigned-r2.json`
2. `run-2026-08-08T20-08-00-998Z-presigned-r2.json`

### Page `portfolio-gallery`

2 invocations × 3 Lighthouse passes per invocation.

| Metric | Per-invocation median | Spread between invocations | Widest single-pass envelope |
|---|---|---|---|
| Mobile Lighthouse performance score | 0.87 / 0.87 | **0.00** | 0.85–0.88 |
| Image-attributable CLS | 0.0000 / 0.0000 | **0.0000** | 0.0000–0.0000 |
| LCP (mobile throttle) | 3839ms / 3847ms | **8ms** | 3728ms–3847ms |

Network payload audit: 2 gallery image requests per pass, transferred 7424 bytes; 0 image(s) flagged oversized by Lighthouse's `image-size-responsive` audit across all passes.

### Page `story-gallery`

2 invocations × 3 Lighthouse passes per invocation.

| Metric | Per-invocation median | Spread between invocations | Widest single-pass envelope |
|---|---|---|---|
| Mobile Lighthouse performance score | 0.90 / 0.97 | **0.07** | 0.87–0.97 |
| Image-attributable CLS | 0.0000 / 0.0000 | **0.0000** | 0.0000–0.0000 |
| LCP (mobile throttle) | 3497ms / 2543ms | **955ms** | 2495ms–3760ms |

Network payload audit: 2 gallery image requests per pass, transferred 7424 bytes; 0 image(s) flagged oversized by Lighthouse's `image-size-responsive` audit across all passes.

## Reproducing these numbers

With the `backstage` profile up and the AC-29.1.1 gallery seeded:

```
# candidate 1 — serving through the Backstage
BENCHMARK_DELIVERY_PATH=backstage-proxy docker compose --profile benchmark up -d --build --force-recreate web-benchmark
BENCHMARK_DELIVERY_PATH=backstage-proxy docker compose --profile benchmark run --rm lighthouse-benchmark

# candidate 2 — direct time-limited presigned R2 links
scripts/benchmark/presign-r2-urls.sh
BENCHMARK_DELIVERY_PATH=presigned-r2 docker compose --profile benchmark up -d --build --force-recreate web-benchmark
BENCHMARK_DELIVERY_PATH=presigned-r2 docker compose --profile benchmark run --rm lighthouse-benchmark

# then re-render this file from whatever raw reports now exist
npm run benchmark:summarise
```
