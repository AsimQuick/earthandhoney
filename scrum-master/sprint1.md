# Sprint 1

**Phase:** planning
**Progress:** 1/6 stories | 6/28 ACs
**Last Updated:** 2026-07-19T07:01:21+00:00

## Sprint Goal
Establish the project foundation (Payload CMS + PostgreSQL + Cloudflare R2, all in Docker) and deliver the core Gallery Engine IP — the reusable gallery data model, Sharp image pipeline, and mobile-first gallery viewer components (container, main display, thumbnail preview, PhotoSwipe fullscreen, mobile drawer, gradient overlay) with instant performance — before any public website pages are built.

## Reference Documents
- `scrum-master/PRD.md`
- `CLAUDE.md`

## Definition of Done
- [ ] All ACs verified by CI
- [ ] No critical defects
- [ ] Coverage threshold met
- [ ] Code file headers include metadata
- [ ] All services run in Docker
- [ ] retrospective.md updated

## User Stories

### US-1: Project foundation: Payload CMS + PostgreSQL running in Docker
**Status:** done | **Priority:** high

#### Acceptance Criteria
- [x] **AC-1.1:** Payload CMS is integrated into the Next.js App Router project and its admin panel is reachable at /admin when the stack is running.
  - Dev: done
- [x] **AC-1.2:** PostgreSQL runs as a service in docker-compose.yml; Payload connects to it via the Docker network hostname 'db' (not localhost) and runs its initial schema migration successfully.
  - Dev: done
- [x] **AC-1.3:** The web app and database start together via `docker compose up -d`; no database or service is installed on the host machine.
  - Dev: done
- [x] **AC-1.4:** All required config (database URL, Payload secret, R2 credentials) is read from environment variables and documented in .env.example with placeholder values.
  - Dev: done
- [x] **AC-1.5:** Every new code file includes the project metadata front-matter header comment.
  - Dev: done

**Dev Team Status:** not-started
**Dev Team Notes:**
  AC-1.1 fixed: Fixed and pushed. Root cause: `.github/workflows/ci.yml` never created a `.env` file before `docker compose` commands ran, so every step failed with "env file not found" on a clean CI checkout. Added a `Prepare env file` step (`cp .env.example .env`) before the "Build containers" step. `.env.example` already comments out empty-value secrets, so Pattern 6 doesn't apply here. Left the unrelated pre-existing `docker-compose.yml` change (PORT override) untouched, as it wasn't part of this CI failure. Commit `c135762` pushed to `feature/US-1-AC-1.1`.
  AC-1.2 done: Committed and pushed to `feature/US-1-AC-1.2`.
  
  ## Implementation Summary — US-1 AC-1.2
  
  **Finding:** The AC-1.2 *production wiring* already existed on `main` from the AC-1.1 scaffold:
  - `docker-compose.yml` → `db` service (`postgres:16-alpine`, healthcheck, named `pgdata` volume)
  - `src/payload.config.ts` → `postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL } })`
  - `.env.example` → `DATABASE_URL=postgresql://postgres:postgres@db:5432/earthandhoney` (the `db` Docker-network hostname, not localhost)
  
  So no production code needed inventing. This branch delivers the **verification** for the AC, which had none.
  
  **Files changed (committed `3268b97`):**
  - `src/__tests__/us1-ac1.2-postgres-migration.test.ts` (new) — 8 tests: compose `db` service shape (image/healthcheck/named volume), Payload reads `DATABASE_URL`, env template resolves to hostname `db` and rejects `localhost`/`127.0.0.1`, web service doesn't override to localhost, plus a live test that (inside the compose network) boots the real Next/Payload entrypoint and asserts a Payload-backed route returns non-500 — proving the initial schema migration ran. Live portion self-skips on a bare host where `db` doesn't …
  AC-1.3 fixed: ## Summary
  
  **Root cause:** `.env.example` never defined `PAYLOAD_SECRET`, only a developer's local, uncommitted `.env` had one. Payload boots with an empty secret and fails with `500 "missing secret key"` on every request. This bug was invisible before AC-1.3 because the AC-1.2 live-migration test skips its real check (`dns.lookup('db')` fails) unless `db` is actually started as a dependency — and before AC-1.3, `web` had no `depends_on: db`. AC-1.3 correctly added `depends_on: db (condition: service_healthy)`, which for the first time let that test's `db` lookup succeed and actually exercise the live boot path — surfacing the latent misconfiguration in CI's clean checkout.
  
  **How I found it:** cloned `HEAD` into a scratch directory to exactly match CI's `actions/checkout@v4` (no stray local `.env`, no `public/photobuddy/`), ran `cp .env.example .env` + `docker compose down -v` for a genuinely fresh Postgres volume, then ran the CI steps. Lint/typecheck passed but the test suite failed on AC-1.2's live check with a 500. Booting `next dev` manually and inspecting server logs showed `Error: missing secret key. A secret key is needed to secure Payload.`
  
  **Fix:** added `PAYLOAD_SECRE …
  AC-1.4 done: Committed and pushed to `feature/US-1-AC-1.4`.
  
  ## Implementation Summary — US-1 AC-1.4
  
  **Finding:** `DATABASE_URL` and `PAYLOAD_SECRET` were already documented in `.env.example` and read from `process.env` in `src/payload.config.ts` (established during AC-1.1/1.2/1.3). The only gap: **R2 credentials were entirely undocumented** — no `.env.example` entries, no `.env` entries, not referenced anywhere in the codebase (expected, since the Media/storage collection is US-2, not yet started).
  
  **Files changed (commit `70aa5c6`):**
  - `.env.example` — added a `Cloudflare R2` section with placeholder values (`change-me-in-production`, consistent with existing `PAYLOAD_SECRET`/`SECRET_KEY` convention) for `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`.
  - `.env` (local, gitignored, not committed) — mirrored the same block for dev parity.
  - `src/__tests__/us1-ac1.4-env-config.test.ts` (new, 15 tests) — verifies: all 7 required vars (`DATABASE_URL`, `PAYLOAD_SECRET`, 5 R2 vars) are documented in `.env.example` with non-empty placeholders; `DATABASE_URL` targets the Docker hostname `db`; `payload.config.ts` reads `DATABASE_URL`/`PAYLOAD_SECRET` via `proc …
  AC-1.5 done: Pushed to `feature/US-1-AC-1.5`.
  
  ## Implementation Summary — US-1 AC-1.5
  
  **Finding:** The front-matter header convention (`/** --- file / project / purpose / created-by / related-story / related-ac --- */`) was already established and applied consistently across `src/`, `src/collections/`, `next.config.ts`, and existing test files during prior ACs. Auditing every tracked code file (`.ts`/`.tsx`/`.js`/`.mjs`) against that convention found 4 gaps: `jest.config.ts`, `jest.setup.ts`, `eslint.config.mjs`, `postcss.config.mjs` — scaffolded before the convention existed and never retrofitted (`next-env.d.ts` is intentionally excluded: it's auto-regenerated by Next.js and carries its own "should not be edited" notice, consistent with it already being excluded from eslint's ignore list).
  
  **Files changed (commit `8bbe183`):**
  - `jest.config.ts`, `jest.setup.ts`, `eslint.config.mjs`, `postcss.config.mjs` — added the standard header (`created-by: dev-team`, `related-story: US-1`, `related-ac: 1.5`).
  - `src/__tests__/us1-ac1.5-code-file-headers.test.ts` (new, 3 test blocks generating ~30 assertions via `it.each` over every scanned code file) — walks the repo for code files, excluding the sam …

**Tester Status:** approved
**Tester Notes:**
  AC-1.3 diagnosis: (no summary reported)

---

### US-2: Media system: Sharp image pipeline with Cloudflare R2 storage
**Status:** in-progress | **Priority:** high

#### Acceptance Criteria
- [x] **AC-2.1:** A Payload 'Media' collection exists storing original file reference, alt text, and metadata; relationships/metadata live in Payload while binary files live in Cloudflare R2 (not in Postgres or the local filesystem in production).
  - Dev: done
- [ ] **AC-2.2:** On upload, a Sharp pipeline generates three derivative sizes — thumbnail, medium, large — plus retains the original, and all four variants are persisted to R2.
- [ ] **AC-2.3:** Each Media record exposes the URLs/keys for original, thumbnail, medium and large variants so consumers can request the correct size.
- [ ] **AC-2.4:** Alt text is a required field on Media to support accessibility and SEO.
- [ ] **AC-2.5:** R2 credentials and bucket configuration are read from environment variables; a local/dev R2-compatible target may be used but no service is installed on the host.

**Dependencies:** US-1

**Dev Team Status:** not-started
**Dev Team Notes:**
  AC-2.1 done: Pushed to `feature/US-2-AC-2.1` (commit `d679207`).
  
  ## Implementation Summary — US-2 AC-2.1
  
  **Finding:** No Media collection existed yet — US-1 only established Users/Postgres/R2 env-var documentation. AC-2.1 required real implementation.
  
  **Files changed:**
  - `src/collections/Media.ts` (new) — Payload upload collection, slug `media`, `useAsTitle: 'alt'`, one `alt` text field (not required — required-ness is AC-2.4's job). `upload: true` makes Payload auto-capture filename/mimeType/filesize/width/height metadata alongside the file reference.
  - `src/payload.config.ts` — registered `Media` in `collections`, added the `@payloadcms/storage-s3` plugin (`s3Storage`) scoped to the `media` collection, configured against R2's S3-compatible endpoint using `process.env.R2_BUCKET/R2_ENDPOINT/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY` (already documented in `.env.example` from AC-1.4), `region: 'auto'`, `forcePathStyle: true`. The plugin defaults `disableLocalStorage: true`, so binaries never touch Postgres or the local filesystem.
  - `package.json` / `package-lock.json` — added `@payloadcms/storage-s3@^3.86.0` (exact version match to installed `payload@3.86.0`; pulls in `@aws-sdk/client-s3` trans …

**Tester Status:** approved
**Tester Notes:**
  Independently reviewed: all 5 ACs are objectively verifiable (schema/collection inspection, upload-triggered pipeline test asserting exactly 4 persisted R2 objects — original/thumbnail/medium/large, field-presence checks for URLs/keys, required-field validation test for alt text, env-var/config inspection for R2 credentials with any dev-time R2-compatible target run as a Docker service, not host-installed). No scope issues — Media collection is explicitly in-scope. No edits needed.

---

### US-3: Gallery data model: reusable Galleries collection in Payload
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-3.1:** A Payload 'Galleries' collection exists as an independent, reusable object with fields: id, title, description, ordered images[] (relations to Media), cover image, and settings.
- [ ] **AC-3.2:** No CMS collection or code path other than Media and Galleries manages, uploads, or displays images — e.g. no per-page/per-post image-upload field or standalone image list duplicates what the Media + Galleries model already provides.
- [ ] **AC-3.3:** The photographer can upload images to a gallery, reorder them, remove them, and select a cover image entirely through the Payload admin UI without developer assistance.
- [ ] **AC-3.4:** Gallery 'settings' capture a display-mode configuration (e.g. slideshow, hover-preview, fullscreen, download, authentication toggles) so one gallery object can drive multiple display experiences.
- [ ] **AC-3.5:** Galleries are readable via Payload's API/local API so the gallery viewer components can consume them.

**Dependencies:** US-1, US-2

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Independently reviewed: AC-3.1, 3.3, 3.4, 3.5 are clear and testable via schema inspection, admin-UI e2e test, settings-field inspection, and API read test. AC-3.2 is phrased as a concrete, auditable negative check (no CMS collection/code path other than Media+Galleries manages images) rather than a vague design-principle restatement — confirmed this remains verifiable via codebase/schema audit. No scope issues; the Galleries collection is explicitly in-scope. No edits needed.

---

### US-4: Gallery Engine core components: container, main display, thumbnails, navigation, gradient overlay
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-4.1:** A single reusable Gallery Engine component set renders any gallery: Gallery Container, Main Image Display, Thumbnail Preview strip, and Navigation Controls (next/previous).
- [ ] **AC-4.2:** Every gallery display includes a subtle black CSS gradient overlay implemented purely in CSS (no image processing), applied consistently across displays.
- [ ] **AC-4.3:** Images render via Next.js Image with responsive srcset drawn from the thumbnail/medium/large variants, choosing an appropriate size per viewport.
- [ ] **AC-4.4:** The same engine is instantiated in at least two distinct display-mode contexts (e.g. a hero-mode instance and a portfolio-mode instance) on internal demo/test-harness routes — not linked from public navigation, and not backed by the out-of-scope Portfolio/Homepage CMS collections — and not the public marketing pages, which remain out of scope this sprint — driven purely by gallery settings, demonstrating reuse with no duplicated image systems. The real public pages will reuse this same engine unmodified in the later sprint that builds them.
- [ ] **AC-4.5:** The engine's layout, spacing, typography, and gradient-overlay treatment visually match the public/photobuddy template when compared side-by-side (verified via manual visual QA checklist against the template), and template images are used as placeholder content in the rendered contexts.

**Dependencies:** US-3

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Independently re-derived judgment, differing from the prior pass. AC-4.4 as written does NOT require building an out-of-scope public page: it explicitly scopes proof of reuse to internal demo/test-harness routes, expressly excluding the public marketing pages. Instantiating the engine twice (hero-mode, portfolio-mode) on a non-navigable internal route, driven only by gallery settings, requires no out-of-scope CMS collection (Portfolio/Homepage) and no out-of-scope public page — so it is fully testable within sprint-1 scope (render engine twice with different settings; assert a single shared component tree with no duplicated image system). Tightened AC-4.4 wording to explicitly state the demo route must not be linked from public navigation and must not depend on the out-of-scope Portfolio/Homepage CMS collections, closing the residual ambiguity about what 'internal' means. Reclassified from requirements-defect to approved — the prior flag appears to reference an earlier 'homepage hero + portfolio' framing rather than the current, already-scoped AC text; there is no outstanding PO decision required here. AC-4.1, 4.2, 4.3, 4.5 remain clear, testable, and in-scope — no changes.

---

### US-5: Mobile-first interaction: PhotoSwipe fullscreen viewer, thumbnail drawer, swipe & keyboard navigation
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-5.1:** Clicking/tapping any gallery image opens a fullscreen viewer powered by PhotoSwipe supporting next, previous, close, swipe, and keyboard navigation.
- [ ] **AC-5.2:** The gallery is designed mobile-first: touch navigation and swipe gestures work, and tapping a gallery opens a thumbnail drawer (mobile has no hover).
- [ ] **AC-5.3:** On desktop, hovering a gallery reveals a thumbnail preview strip for previewing images (hover-preview honored per gallery settings).
- [ ] **AC-5.4:** Display-mode settings are respected: e.g. hero disables fullscreen/hover and enables slideshow; portfolio enables hover + fullscreen; client-delivery enables download + fullscreen + required auth (auth enforcement may be stubbed this sprint but the setting is wired).

**Dependencies:** US-4

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Independently reviewed: all 4 ACs are testable via component/e2e tests driven by gallery settings values (touch/swipe emulation, hover simulation, keyboard events, per-mode toggle assertions) and can be exercised against any gallery instance, including a test-harness route — no dependency on out-of-scope public pages. AC-5.4's stubbed-auth carve-out is explicit and bounded (setting must be wired and assertable even though enforcement is stubbed), so it remains objectively verifiable. No scope issues. No edits needed.

---

### US-6: Gallery performance: progressive/lazy loading, partial load, and static generation with ISR
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-6.1:** A gallery never loads its full set of images upfront — only visible images and required thumbnails are loaded initially; remaining images load lazily/progressively.
- [ ] **AC-6.2:** Gallery-bearing routes use static generation with incremental regeneration (ISR), proven this sprint against an internal demo/test-harness route — not linked from public navigation, and not backed by the out-of-scope Portfolio/Homepage CMS collections — rendering a gallery. Real public pages are out of scope this sprint and will re-verify the identical ISR wiring in the sprint that builds them.
- [ ] **AC-6.3:** Updating a gallery in Payload triggers on-demand revalidation/regeneration of the affected gallery-bearing route(s), demonstrated this sprint against an internal demo/test-harness route — not linked from public navigation, and not backed by out-of-scope CMS collections (real public pages deferred; the same revalidation hook re-verifies against them in the sprint that builds them).
- [ ] **AC-6.4:** Images below the fold use loading='lazy' and responsive sizes/srcset so only in-viewport images are requested on initial load, reducing initial page payload on a mobile connection (verified via network waterfall / Lighthouse mobile performance check).

**Dependencies:** US-4

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Independently re-derived judgment, differing from the prior pass. AC-6.2 and AC-6.3 as written already scope ISR/revalidation proof to an internal demo/test-harness route, expressly excluding public pages ('Real public pages are out of scope this sprint...' / 'real public pages deferred...'). This requires nothing on the out-of-scope list (no Home/Portfolio/Blog/Packages/About/Contact page, no Portfolio/Homepage CMS collection) and is objectively verifiable: inspect the demo route for a revalidate/ISR config and confirm static generation, then trigger a Payload gallery update and assert the demo route's cached output regenerates via the revalidation hook (timestamp/ETag diff). Tightened both ACs' wording to state the demo route must not be linked from public navigation and must not depend on out-of-scope CMS collections, closing the ambiguity gap. Reclassified from requirements-defect to approved — the prior flag appears to reference an earlier 'public gallery-bearing pages' framing rather than the current, already-scoped AC text; there is no outstanding PO decision required here. AC-6.1 and AC-6.4 remain clear and testable (network-request-count assertion; Lighthouse mobile / network waterfall check) — no changes.

---

---

## Sprint Review

### Dev Team Sprint Notes
_Pending_

### Tester Sprint Notes
_Pending_

### PO Sprint Review Notes
_Pending_

---
_Auto-generated from `sprint1.json` — do not edit directly._
