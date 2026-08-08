# Benchmark harness reproducibility (AC-29.1.3)

Two invocations of the single committed command below, run back to back
against the **same** `web-benchmark` build (no rebuild between them) and the
**same** seeded gallery AC-29.1.1 left in place (Backstage event id 21,
slug `us-25-ac-25.5-placement-demo`, 2 photos). Command, per the
"Benchmark harness" section of `BACKSTAGE_STARTUP.md`:

```
docker compose --profile benchmark run --rm lighthouse-benchmark
```

- Run 1: `run-2026-08-08T14-51-01-229Z.json`
- Run 2: `run-2026-08-08T14-52-16-271Z.json`

Both reports carry `runsPerPage: 3` (the harness's `MIN_RUNS_PER_PAGE`
floor — src/lib/benchmark/runHarness.ts) — each metric below is already a
median across 3 Lighthouse passes taken within its own invocation, per
`aggregateRuns.ts`. The spread recorded here is the difference between
those two per-invocation medians, i.e. run-to-run noise on top of the
within-invocation aggregation, not raw single-sample variance.

## Spread between the two invocations' medians

| Page | Metric | Run 1 median | Run 2 median | Spread |
|---|---|---:|---:|---:|
| portfolio-gallery | mobilePerformanceScore (0-1) | 0.90 | 0.90 | 0.00 |
| portfolio-gallery | clsTotal | 0 | 0 | 0 |
| portfolio-gallery | clsImageAttributable | 0 | 0 | 0 |
| portfolio-gallery | lcpMs | 3535.16 | 3507.33 | 27.83 |
| story-gallery | mobilePerformanceScore (0-1) | 0.92 | 0.97 | 0.05 |
| story-gallery | clsTotal | 0 | 0 | 0 |
| story-gallery | clsImageAttributable | 0 | 0 | 0 |
| story-gallery | lcpMs | 2600.50 | 2522.49 | 78.01 |

## Reading AC-29.3 against this noise floor

AC-29.3 checks the aggregated numbers against the ADR's "performance near
ninety" and "LCP around two and a half seconds" targets. This spread is the
noise floor that check must be read against: a target missed by less than
the spread recorded for that page/metric here is not a miss.

- Performance score: up to **0.05** (5 points on the ADR's 0-100 reading)
  of run-to-run spread observed here, on the story-gallery page.
- LCP: up to **~78ms** of run-to-run spread observed here, on the
  story-gallery page — small next to a ~2.5s target, so an LCP miss has to
  clear roughly this margin before it can be called a real miss rather than
  noise.

CLS was `0` on every run on both pages in this sample — no image-attributable
layout shift was observed, so no spread could be measured for that metric
from this evidence; it is not being claimed as a hard `0` noise floor.

## Withdrawal (AC-29.2.2.1.1)

`run-2026-08-08T14-51-01-229Z.json` and `run-2026-08-08T14-52-16-271Z.json`,
the two runs this reproducibility check is built on, are **withdrawn**, not
deleted quietly: both recorded `transferBytes: 83` for the benchmarked
pages — the length of Express's `{"message":"Route not found"}` body, not a
photograph, so neither run measured what this document claims it measured.
The reproducibility *procedure* documented above (same command, same build,
same seeded gallery, run twice) is still sound and still the process
AC-29.2.2.1.3 must satisfy; only these two runs' numbers are disqualified.
Path 1 is re-run against the AC-29.2.2.1.2 origin fix under AC-29.2.2.3.

**Superseded (AC-29.2.2.3).** That re-run has happened. Every number in the
table above is withdrawn and is not evidence for anything; the surviving
measurements — for both candidate paths, each labelled with the path it
belongs to — are in `MEASURED_PATHS.md` beside this file, generated from the
retained `run-<timestamp>-<deliveryPath>.json` reports rather than typed in
by hand. The unlabelled report file names cited above no longer exist on
disk; nothing named `run-*.json` here lacks a candidate label.
