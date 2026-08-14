<!--
---
file: TEST_LANE_CLASSIFICATION.md
project: earthandhoney
purpose: Human-readable summary of the US-30 AC-30.1 LIVE/UNIT classification
         of every Jest suite under src/__tests__/. The machine-readable
         per-suite manifest this doc summarises is TEST_LANE_INVENTORY.json;
         both are kept in sync by src/__tests__/us30-ac30.1-test-lane-classification.test.ts.
created-by: dev-team
related-story: US-30
related-ac: 30.1
---
-->

# Test lane classification (US-30 AC-30.1)

Every Jest suite under `src/__tests__/` was read in full — not guessed from its filename — and
classified into exactly two lanes:

- **LIVE** — touches the shared Postgres `db` Docker container, spawns a real Next.js/Payload
  server, calls a live Backstage/PicPeak API or a live Cloudflare R2 endpoint, or otherwise
  depends on cross-suite ordering/shared external state.
- **UNIT** — everything else: pure logic, mocked fetch/db, jsdom rendering, or assertions against
  local repository files (markdown, JSON, YAML, vendored source).

The full per-suite mapping lives in [`TEST_LANE_INVENTORY.json`](TEST_LANE_INVENTORY.json).

## Counts

| Lane | Count |
|---|---|
| LIVE | 18 |
| UNIT | 195 |
| **Total** | **213** |

(UNIT includes this classification's own guard suite, `us30-ac30.1-test-lane-classification.test.ts`, AC-30.2's
`us30-ac30.2-unit-lane-parallelism.test.ts` guard, and AC-30.3's `us30-ac30.3-live-lane-serial.test.ts` guard, all of
which read the manifest and local files only.)

The lane split was reached by reading every suite's actual code (imports, `fetch`/`dns.lookup`/
`child_process` usage, whether Postgres/Payload/Backstage/R2 is real or mocked), then
cross-validated with repo-wide greps for `dns.lookup`, `child_process`/`spawn`, `getLiveApiAuthToken`,
and `await fetch(` — the five LIVE suites below are exactly the suites those greps surface as
performing a genuine network round trip; every other match was a string embedded in a markdown/YAML
citation or an in-process `NextRequest` object handed straight to a route handler, not a live call.

Many suites whose filenames suggest live behaviour (`*-webhook-live-proof-*`, `*-r2-storage`,
`*-backstage-*`) are UNIT: this codebase's dominant evidence pattern is "the live proof was run
once by hand against Docker and its result pasted into a committed report/markdown file; the Jest
suite re-verifies the citations in that report against the checked-in source," which is a real but
static assertion, not a live round trip. That distinction is exactly why AC-30.1 requires reading
each suite rather than trusting its name.

## LIVE lane — per-suite reason

| Suite | Reason |
|---|---|
| `src/__tests__/us1-ac1.2-postgres-migration.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process (`child_process.spawn`) and fetches `http://localhost:4278/api/users`, exercising Payload's live schema/connection against the real Postgres `db` container. This is the sprint-1 live-boot suite named in AC-30.3. |
| `src/__tests__/us2-ac2.4-alt-text-required.test.ts` | Gated on `dns.lookup('db')` and a real (non-placeholder) R2 config; spawns a real `next dev` server via `child_process`, calls `getLiveApiAuthToken` (the shared cross-suite fixture identity in `src/test-support/liveApiAuth.ts`) and fetches `http://localhost:4280/api/media`, exercising a live server, live Postgres `db`, and live R2 storage. |
| `src/__tests__/us25-ac25.2-backstage-client-flow-a.test.ts` | A `describe` block gated on `dns.lookup('backstage-backend')` resolving performs real `fetch` calls to `http://backstage-backend:3000` — admin login, gallery search/create/publish, and `fetchPublishedGallery` — against the live Backstage/PicPeak API. |
| `src/__tests__/us29-ac29.5-security-invariants-preserved.test.ts` | A `describe` block gated on `dns.lookup('backstage-backend')` resolving performs real `fetch` calls against `process.env.BACKSTAGE_BACKEND_URL` (default `http://backstage-backend:3000`) to log in, create/publish galleries, and verify auth against the live Backstage/PicPeak API. |
| `src/__tests__/us31-ac31.4-public-page-route.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process via `child_process`, calls `getLiveApiAuthToken` to create three real `Pages` documents (published/draft/noindex) over `http://localhost:4282/api/pages`, and fetches each one's rendered `[slug]` route, exercising Payload's live schema/connection and the live Next.js route against the real Postgres `db` container. |
| `src/__tests__/us31-ac31.5-public-page-gallery-placement.test.ts` | Gated on both `dns.lookup('db')` and `dns.lookup('backstage-backend')` resolving. Self-seeds a real published gallery via live Backstage admin API `fetch()` calls (the same technique `us25-ac25.2-backstage-client-flow-a.test.ts`'s live block uses), spawns a real `next dev` child process, creates real `gallery-placements`/`pages` documents over the live Payload API, and fetches the rendered `[slug]` route for both a page pointing at the real reachable gallery and one pointing at a gallery slug that does not exist, exercising the real Postgres `db` container and the real Backstage stack together. |
| `src/__tests__/us31-ac31.6-live-seo-metadata.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process via `child_process`, calls `getLiveApiAuthToken` to create two real `Pages` documents over `http://localhost:4284/api/pages`, and fetches each one's rendered `[slug]` route to assert the canonical `<link>`, `og:*` `<meta>` tags and heading-level sequence in the real response HTML, exercising Payload's live schema/connection and the live Next.js route against the real Postgres `db` container. |
| `src/__tests__/us32-ac32.2-first-public-navigation.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process via `child_process`, calls `getLiveApiAuthToken` to create three real published `Pages` documents (Weddings, Engagements, Details, per PRD §12.1) over `http://localhost:4286/api/pages`, wires them into the `Navigation` global's ordered `items` array over `http://localhost:4286/api/globals/navigation`, reads them back via a filtered `http://localhost:4286/api/pages` list query, and fetches the rendered `[slug]` route to assert the three labels appear in the nav markup in order, exercising Payload's live schema/connection and the live Next.js route against the real Postgres `db` container. |
| `src/__tests__/us32-ac32.3-navigation-gate-live-toggle.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process via `child_process`, calls `getLiveApiAuthToken` to create a draft (`includeInMenu` true) and a published-but-excluded (`includeInMenu` false) `Pages` document over `http://localhost:4288/api/pages`, wires both into the `Navigation` global over `http://localhost:4288/api/globals/navigation`, fetches the rendered `[slug]` route to assert both labels are absent from the nav markup (before), then `PATCH`es each page's single gating field over `http://localhost:4288/api/pages/:id` and re-fetches the same route to assert both labels now appear (after) — with no code change between the two fetches — exercising Payload's live schema/connection and the live Next.js route against the real Postgres `db` container. |
| `src/__tests__/us33-ac33.2-inquiry-durable-persist-live.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process via `child_process`, calls `getLiveApiAuthToken` to create a real `Forms` document, `POST`s a real submission to `http://localhost:4290/api/inquiries` (whose notification step fails on every call — `sendInquiryNotification` isn't wired to the Backstage email queue until AC-33.5), and reads the created `Inquiries` document back over `http://localhost:4290/api/inquiries/:id`, exercising Payload's live schema/connection against the real Postgres `db` container. |
| `src/__tests__/us33-ac33.3-server-validation-live.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process via `child_process`, calls `getLiveApiAuthToken` to create a real `Forms` document, then sends three direct `POST`s to `http://localhost:4291/api/inquiries` — missing required field, malformed email, over-long field — asserting each is rejected with 400 and reading `http://localhost:4291/api/inquiries?where[form][equals]=:id` back afterwards to prove zero Inquiry documents were written, exercising Payload's live schema/connection against the real Postgres `db` container. |
| `src/__tests__/us33-ac33.4-spam-protection-live.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process via `child_process` three times (one per port — 4292, 4293, 4294 — one per scenario, so each scenario's in-memory rate-limiter state starts fresh), creates a real `Forms` document per scenario, and `POST`s real submissions to `/api/inquiries`: a honeypot-filled one, a submission whose `renderedAt` is inside the timing threshold, and a rapid-fire run of `INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS + 1` submissions from the same source — then reads `/api/inquiries/count?where[form][equals]=:id` back over the live Payload REST API to prove each blocked submission wrote no Inquiry, exercising Payload's live schema/connection against the real Postgres `db` container. |
| `src/__tests__/us34-ac34.1-homepage-order-live.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process via `child_process` and fetches `http://localhost:4295/`, asserting the PRD §13.2 structural markers (`primary-nav`, `home-hero-slideshow-placement`, `home-selected-galleries`, `home-inquiry-form-region`, `site-footer`) appear in the real response HTML in order, exercising the live Next.js route and, transitively, Payload's live schema/connection against the real Postgres `db` container. |
| `src/__tests__/us34-ac34.3-hero-gallery-live.test.ts` | Gated on both `dns.lookup('db')` and `dns.lookup('backstage-backend')` resolving. Self-seeds a real published gallery via live Backstage admin API `fetch()` calls (the same technique `us31-ac31.5-public-page-gallery-placement.test.ts` uses), spawns a real `next dev` child process, `PATCH`es the live `StudioProfile` global's `homeHeroGallerySlug` over `http://localhost:4296/api/globals/studio-profile`, and fetches the rendered homepage route for both the real reachable gallery and a gallery slug that does not exist, exercising the real Postgres `db` container and the real Backstage stack together. |
| `src/__tests__/us34-ac34.4-home-selected-galleries-reorder-live.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process via `child_process`, creates two real published `Pages` documents over `http://localhost:4297/api/pages`, `PATCH`es the live `StudioProfile` global's `homeSelectedGalleriesOrStories` polymorphic array over `http://localhost:4297/api/globals/studio-profile` to `[A, B]`, fetches the rendered homepage and asserts the story-card heading order is `[A, B]`, then `PATCH`es the identical two entries to `[B, A]` and re-fetches the same route to assert the rendered order flipped — with no code change between the two fetches — exercising Payload's live schema/connection and the live Next.js route against the real Postgres `db` container. |
| `src/__tests__/us35-ac35.3-live-details-page-creation.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process via `child_process`, creates two real published `Pages` documents over `http://localhost:4298/api/pages` both with `template: 'details'` (one with no gallery placement, one with a real `gallery-placements` document) plus a third with `template: 'standard'`, and fetches each one's rendered `[slug]` route to assert the Details pages render `data-testid="details-page-template"` and the standard page renders `data-testid="standard-page-template"` — with no code change between the pages — exercising Payload's live schema/connection and the live Next.js route against the real Postgres `db` container. |
| `src/__tests__/us36-ac36.4-story-index-route.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process via `child_process`, calls `getLiveApiAuthToken` to create a real `gallery-placements` document plus a published and a draft `Stories` document over `http://localhost:4299/api/stories`, and fetches the rendered `/stories` route to assert the published story's title is present in the markup and the draft story's title is absent, exercising Payload's live schema/connection and the live Next.js route against the real Postgres `db` container. |
| `src/__tests__/us37-ac37.2-live-seo-metadata.test.ts` | Gated on `dns.lookup('db')` resolving, then spawns a real `next dev` child process via `child_process`, calls `getLiveApiAuthToken` to create two `Pages` documents (one with its own `seoTitle`/`metaDescription`, one without) and two `Stories` documents (one with its own `subtitleIntroduction`, one without) over `http://localhost:4300/api/pages` and `/api/stories`, and fetches each one's rendered `[slug]`/`stories/[slug]` route to assert a real `<title>` element, `<meta name="description">`, `<link rel="canonical">`, `og:*` and `twitter:*` `<meta>` tags in the response HTML, with the two fallback-only records proving the `StudioProfile` default title pattern/meta description land in real markup, exercising Payload's live schema/connection and the live Next.js route against the real Postgres `db` container. |

All eighteen gate their live behaviour on a `dns.lookup()` check for the Docker-network hostname they
depend on (`db` or `backstage-backend`) and return early — i.e. pass trivially — when that hostname
doesn't resolve, so they are also safe to run on a bare host `npm test` outside Docker; they only
become truly LIVE when the Docker network is up.

`src/__tests__/us2-ac2.4-alt-text-required.test.ts` and `src/__tests__/us31-ac31.4-public-page-route.test.ts`
are currently the only suites that import `getLiveApiAuthToken` from `src/test-support/liveApiAuth.ts`.
That helper exists specifically because Payload only honors one `first-register` call per Postgres
volume — every live suite making its own first-register/login calls goes through this one shared
fixture helper (per its own docblock), which is exactly what keeps the AC-6.3 cross-suite race it was
written to fix from reappearing as more LIVE suites are added.

## Mechanism: how a suite is assigned to a lane

Three candidate mechanisms were considered, per AC-30.1: a Jest `projects` entry, a
`testPathIgnorePatterns` pair, or a naming convention enforced by a test.

**Chosen: a Jest `projects` entry**, driven by the one committed manifest
(`TEST_LANE_INVENTORY.json`) as the single source of truth for lane membership. A `projects` array
lets `jest.config.ts` declare two named projects (`unit`, `live`), each with an explicit
`testMatch`/`testPathIgnorePatterns` built from the manifest's LIVE list — no suite's lane is
inferred from its path or name. `jest --selectProjects unit` runs the fast lane, `jest
--selectProjects live --runInBand` runs the serial lane, and a bare `jest` invocation (already
`npm test`) runs both projects, which satisfies AC-30.5's "`npm test` still runs everything and
still fails if either lane fails" without inventing a second command-composition mechanism.

**Rejected: naming convention enforced by a test** (e.g. a `.live.test.ts` suffix). Only 4 of 157
suites are LIVE, and several LIVE-*sounding* filenames (the `webhook-live-proof-*` family,
`backstage-r2-storage`, `backstage-startup-runbook`) are UNIT once actually read — encoding the
lane into the filename would conflate "documents live behaviour" with "is live behaviour," which is
precisely the filename-guessing failure mode AC-30.1 forbids. It would also require renaming files
across git history for no functional gain over an explicit manifest, and nothing stops a future
suite's filename from drifting out of sync with its actual behaviour (the manifest guard test in
this AC checks that; a naming convention self-polices only in the sense that the guard test would
have to duplicate the same read-every-suite logic anyway).

**Rejected: a `testPathIgnorePatterns` pair** (two separate Jest configs/invocations, each ignoring
the other lane's suites). This works, but since the LIVE/UNIT split isn't derivable from a path
pattern (see above), each config would still need its own explicit include/exclude list — duplicating
the same manifest in two places instead of one. Running both lanes from a single `npm test` would
then require chaining two separate `jest --config ... && jest --config ...` invocations rather than
one Jest run with per-project settings, which is more moving parts than a single `projects` config
needs, and makes it easier for the two lists to silently drift out of sync with each other.

This AC records the classification and the mechanism decision only. Actually wiring
`jest.config.ts`'s `projects` array to the two lanes, and the `package.json`/CI script changes that
select and run them, is scoped to AC-30.2 (fast UNIT lane), AC-30.3 (serial LIVE lane), and AC-30.5
(`npm test` still runs and gates on both).
