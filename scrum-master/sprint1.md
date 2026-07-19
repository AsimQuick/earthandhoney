# Sprint 1

**Phase:** planning
**Progress:** 6/6 stories | 28/28 ACs
**Last Updated:** 2026-07-19T13:44:56+00:00

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
**Status:** done | **Priority:** high

#### Acceptance Criteria
- [x] **AC-2.1:** A Payload 'Media' collection exists storing original file reference, alt text, and metadata; relationships/metadata live in Payload while binary files live in Cloudflare R2 (not in Postgres or the local filesystem in production).
  - Dev: done
- [x] **AC-2.2:** On upload, a Sharp pipeline generates three derivative sizes — thumbnail, medium, large — plus retains the original, and all four variants are persisted to R2.
  - Dev: done
- [x] **AC-2.3:** Each Media record exposes the URLs/keys for original, thumbnail, medium and large variants so consumers can request the correct size.
  - Dev: done
- [x] **AC-2.4:** Alt text is a required field on Media to support accessibility and SEO.
  - Dev: done
- [x] **AC-2.5:** R2 credentials and bucket configuration are read from environment variables; a local/dev R2-compatible target may be used but no service is installed on the host.
  - Dev: done

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
  AC-2.2 done: Pushed to `feature/US-2-AC-2.2`.
  
  ## Implementation Summary — US-2 AC-2.2
  
  **Finding:** AC-2.1 only established the Media collection (`upload: true`, no derivative sizes) and the R2 storage adapter. No Sharp resize pipeline existed yet — real implementation was required.
  
  **Files changed (commit `52516c7`):**
  - `src/collections/Media.ts` — changed `upload: true` to an object config with `imageSizes: [thumbnail (400×400, cover), medium (1200w), large (2048w)]`, each `withoutEnlargement: true` so undersized originals never silently produce a null variant.
  - `src/payload.config.ts` — imports `sharp` and passes it into `buildConfig({ sharp, ... })`. This is required: Payload's `createImageSizes` internally checks `if (!imageSizes || !sharp) return`, so without wiring the dependency in, `imageSizes` would be silently ignored.
  - `package.json` / `package-lock.json` — added `sharp@^0.34.5` as a direct dependency (previously only a transitive optional dep of `next`, unsafe to import directly from our own code).
  - `src/__tests__/us2-ac2.2-sharp-pipeline.test.ts` (new, 15 tests) — verifies: Media declares exactly the three sizes in ascending width order with enlargement-safety; `payload.conf …
  AC-2.3 done: ## Implementation Summary — US-2 AC-2.3
  
  **Finding:** AC-2.3's deliverable is already produced by Payload's core upload feature combined with the `imageSizes`/`s3Storage` wiring from AC-2.1 and AC-2.2 — no production code change was needed. Verified by reading `node_modules/payload/dist/uploads/getBaseFields.js` and `node_modules/@payloadcms/plugin-cloud-storage/dist/fields/getFields.js`: once a collection declares `upload.imageSizes`, Payload auto-injects a top-level `url`/`filename` (original) and a `sizes` group with `sizes.<name>.url`/`filename` per configured size, and the S3 storage adapter overrides those `url` fields' `afterRead`/`beforeChange` hooks to generate real R2 object URLs instead of local paths. This mechanism was present but had zero test coverage, so this branch adds the missing verification (same pattern as AC-1.2, which added verification-only for already-wired infra).
  
  **Files changed (commit `3e62c0a`):**
  - `src/__tests__/us2-ac2.3-media-variant-urls.test.ts` (new, 8 tests):
    - Config-level checks: `Media.upload.imageSizes` still names exactly `thumbnail`/`medium`/`large`; `Media.fields` doesn't declare a custom `url`/`filename`/`sizes`/`thumbnailURL` field …
  AC-2.4 done: Pushed to `feature/US-2-AC-2.4` (commit `9098804`).
  
  ## Implementation Summary — US-2 AC-2.4
  
  **Finding:** AC-2.1 established the `alt` field on `Media` but deliberately left it optional ("required-ness is AC-2.4's job" per its dev notes). Only `required: true` needed adding.
  
  **Files changed:**
  - `src/collections/Media.ts` — added `required: true` to the `alt` field; extended the front-matter header with a `related-ac: 2.4` entry.
  - `src/__tests__/us2-ac2.4-alt-text-required.test.ts` (new, 3 tests) — verifies the config declares `alt` as a required text field, plus a live round-trip (self-skips outside the Docker `db` network, matching the AC-2.3 pattern) that POSTs an upload with no alt text and asserts Payload rejects it with a 4xx, then confirms the same upload succeeds once `alt` is supplied.
  
  **Verification (via `docker compose run --rm web ...`):**
  - Full suite: 9 test suites, 141 tests, all passing.
  - Coverage (CI's exact threshold command): 100% stmts/branch/funcs/lines — well above the 80% gate.
  - `eslint` and `tsc --noEmit`: clean.
  - Excluded an unrelated `tsconfig.json` reformat that Next's tooling auto-generated as a side effect of running dev/test — reverted before co …
  AC-2.5 done: Pushed to `feature/US-2-AC-2.5`.
  
  ## Implementation Summary — US-2 AC-2.5
  
  **Finding:** The production wiring this AC requires already existed from prior ACs — `src/payload.config.ts` (AC-2.1) reads `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` from `process.env` inside the `s3Storage` plugin config (with `forcePathStyle: true`, which is what makes swapping in a local/dev S3-compatible target viable), and `.env.example` (AC-1.4) documents all 5 R2 vars including `R2_ACCOUNT_ID` as change-me placeholders. No R2-compatible service (MinIO, LocalStack, etc.) is installed anywhere — `Dockerfile` is a plain Next.js container and `docker-compose.yml` only defines `web`/`db`. No production code change was needed, but per this sprint's established pattern (AC-1.2, AC-2.3), a dedicated AC-specific verification test was still missing, so this branch adds it.
  
  **Files changed (commit `a9a73eb`):**
  - `src/__tests__/us2-ac2.5-r2-env-config.test.ts` (new, 18 tests):
    - Asserts the storage adapter's `bucket`/`endpoint`/`accessKeyId`/`secretAccessKey` are each sourced from the corresponding `process.env.R2_*` var (not hardcoded), uses `forcePathStyle: true`, and never hard …

**Tester Status:** approved
**Tester Notes:**
  Independently reviewed: all 5 ACs are objectively verifiable (schema/collection inspection, upload-triggered pipeline test asserting exactly 4 persisted R2 objects — original/thumbnail/medium/large, field-presence checks for URLs/keys, required-field validation test for alt text, env-var/config inspection for R2 credentials with any dev-time R2-compatible target run as a Docker service, not host-installed). No scope issues — Media collection is explicitly in-scope. No edits needed.

---

### US-3: Gallery data model: reusable Galleries collection in Payload
**Status:** done | **Priority:** high

#### Acceptance Criteria
- [x] **AC-3.1:** A Payload 'Galleries' collection exists as an independent, reusable object with fields: id, title, description, ordered images[] (relations to Media), cover image, and settings.
  - Dev: done
- [x] **AC-3.2:** No CMS collection or code path other than Media and Galleries manages, uploads, or displays images — e.g. no per-page/per-post image-upload field or standalone image list duplicates what the Media + Galleries model already provides.
  - Dev: done
- [x] **AC-3.3:** The photographer can upload images to a gallery, reorder them, remove them, and select a cover image entirely through the Payload admin UI without developer assistance.
  - Dev: done
- [x] **AC-3.4:** Gallery 'settings' capture a display-mode configuration (e.g. slideshow, hover-preview, fullscreen, download, authentication toggles) so one gallery object can drive multiple display experiences.
  - Dev: done
- [x] **AC-3.5:** Galleries are readable via Payload's API/local API so the gallery viewer components can consume them.
  - Dev: done

**Dependencies:** US-1, US-2

**Dev Team Status:** not-started
**Dev Team Notes:**
  AC-3.1 done: Pushed successfully to `feature/US-3-AC-3.1`.
  
  ## Implementation Summary — US-3 AC-3.1
  
  **Finding:** No Galleries collection existed yet — US-3 dev_status was `not-started`, confirmed by checking `src/collections/` (only `Media.ts` and `Users.ts` existed). Real implementation was required.
  
  **Files changed (commit `dedda58`):**
  - `src/collections/Galleries.ts` (new) — Payload collection, slug `galleries`, `useAsTitle: 'title'`. Fields: `title` (required text), `description` (textarea), `images` (array field, each row an `image` relationship to `media` — array chosen over a plain `hasMany` relationship so row order is authoritative and the admin UI gets native drag-to-reorder for free, setting up cleanly for AC-3.3), `coverImage` (single relationship to `media`), `settings` (json — intentionally minimal placeholder; its display-mode shape is AC-3.4's job, not bundled here). No hand-declared `id` field — Payload auto-generates it for every collection.
  - `src/payload.config.ts` — imported and registered `Galleries` in the `collections` array alongside `Users`/`Media`, added an `updated-by`/`related-story`/`related-ac` entry to the header.
  - `src/__tests__/us3-ac3.1-galleries-collectio …
  AC-3.2 done: Pushed to `feature/US-3-AC-3.2`.
  
  ## Implementation Summary — US-3 AC-3.2
  
  **Finding:** No production code change was needed — codebase audit confirmed only three collections exist (`Users`, `Media`, `Galleries`); only `Media` declares `upload` capability; only `Galleries` declares a standalone array of Media relations; the `s3Storage` plugin in `payload.config.ts` scopes storage to `media` alone; every `route.ts` under `src/app` is a thin re-export of `@payloadcms/next/routes` handlers (no custom multipart/upload handling); and no image-upload libraries (multer, formidable, busboy, cloudinary, uploadthing, imgix) are dependencies. This matches the sprint's established pattern (AC-1.2, AC-2.3, AC-2.5): production wiring already satisfies the AC, but it had no dedicated verification test, so this branch adds one.
  
  **Files changed (commit `82e5349`):**
  - `src/__tests__/us3-ac3.2-single-image-system.test.ts` (new, 12 tests) — codebase-audit suite:
    - Trip-wire: `src/collections/` contains exactly `Galleries.ts`, `Media.ts`, `Users.ts` (forces explicit re-audit if a new collection is ever added).
    - `payload.config.ts` registers only those three collections.
    - Only `Media` has an ` …
  AC-3.3 done: Pushed to `feature/US-3-AC-3.3`.
  
  ## Implementation Summary — US-3 AC-3.3
  
  **Finding:** No production code change was needed. The Galleries collection built in AC-3.1 already fully satisfies this AC via Payload's default admin-UI behavior:
  - `images` is an `array` field — Payload defaults array rows to `isSortable: true` (drag-to-reorder) and always renders a remove control per row unless `readOnly`, neither of which Galleries sets.
  - Each row's `image` field, and the top-level `coverImage` field, are `relationship` fields targeting `media` — Payload's relationship field defaults `admin.allowCreate: true`, which renders an inline "Create New" drawer with Media's upload dropzone, letting the photographer upload a brand-new image without leaving the gallery.
  - Neither `Galleries` nor `Media` declares custom `access` rules, so any authenticated admin user (the photographer) gets full create/update rights with no developer/deploy step required.
  
  I verified these defaults directly against the installed `payload`/`@payloadcms/ui` source (`RelationshipField admin.allowCreate = true`, `ArrayField admin.isSortable = true`) rather than assuming behavior. This matches the sprint's established …
  AC-3.4 done: ## Implementation Summary — US-3 AC-3.4
  
  **Finding:** AC-3.1 had established `settings` as a bare `json` placeholder field, explicitly deferring its display-mode shape to this AC. Real implementation was required.
  
  **Files changed (commit `6f9dda9`):**
  - `src/collections/Galleries.ts` — replaced the `json` settings field with a `group` field of five independent `checkbox` toggles: `slideshow` (default `false`), `hoverPreview` (default `true`), `fullscreen` (default `true`), `download` (default `false`), `requireAuth` (default `false`) — matching the exact toggles named in AC-3.4's text and PRD §5.6's documented display modes (Hero, Portfolio, Client Delivery). Using independent booleans (not a fixed mode enum) lets one Galleries object represent any combination, e.g. Hero (`slideshow` on, rest off) vs. Client Delivery (`fullscreen`+`download`+`requireAuth` on). Extended the file's front-matter header with a `related-ac: 3.4` entry.
  - `src/__tests__/us3-ac3.4-gallery-settings.test.ts` (new, 14 tests) — verifies: `settings` is a `group` (not an enum); each of the five toggles exists as a `checkbox` with the documented default and isn't hidden/read-only; exactly those five toggles exi …
  AC-3.5 done: Pushed to `feature/US-3-AC-3.5`. Done.
  
  ## Implementation Summary — US-3 AC-3.5
  
  **AC:** "Galleries are readable via Payload's API/local API so the gallery viewer components can consume them."
  
  **Finding:** No production code change was needed. The read path already exists from earlier work:
  - Generic REST catch-all `src/app/(payload)/api/[...slug]/route.ts` and GraphQL `.../api/graphql/route.ts` build their handlers from the shared `@payload-config` (US-1), so every registered collection — including Galleries — is served with no per-collection route.
  - `Galleries` is registered in `src/payload.config.ts`'s `collections` array (AC-3.1).
  - Galleries declares no custom `access`/`endpoints`/`graphQL` overrides, so Payload's default access applies (`read` requires an authenticated user), and the Local API's `find` defaults `overrideAccess: true` — the mechanism server-rendered gallery viewer components (US-4/US-5) will use.
  
  This matches the sprint's established verification-only pattern (AC-1.2, 2.3, 2.5, 3.2, 3.3): the wiring exists but had no dedicated test, so this AC delivers that test.
  
  **Files changed (commit `c4560be`):**
  - `src/__tests__/us3-ac3.5-galleries-api-read.test.ts` ( …

**Tester Status:** approved
**Tester Notes:**
  Independently reviewed: AC-3.1, 3.3, 3.4, 3.5 are clear and testable via schema inspection, admin-UI e2e test, settings-field inspection, and API read test. AC-3.2 is phrased as a concrete, auditable negative check (no CMS collection/code path other than Media+Galleries manages images) rather than a vague design-principle restatement — confirmed this remains verifiable via codebase/schema audit. No scope issues; the Galleries collection is explicitly in-scope. No edits needed.

---

### US-4: Gallery Engine core components: container, main display, thumbnails, navigation, gradient overlay
**Status:** done | **Priority:** high

#### Acceptance Criteria
- [x] **AC-4.1:** A single reusable Gallery Engine component set renders any gallery: Gallery Container, Main Image Display, Thumbnail Preview strip, and Navigation Controls (next/previous).
  - Dev: done
- [x] **AC-4.2:** Every gallery display includes a subtle black CSS gradient overlay implemented purely in CSS (no image processing), applied consistently across displays.
  - Dev: done
- [x] **AC-4.3:** Images render via Next.js Image with responsive srcset drawn from the thumbnail/medium/large variants, choosing an appropriate size per viewport.
  - Dev: done
- [x] **AC-4.4:** The same engine is instantiated in at least two distinct display-mode contexts (e.g. a hero-mode instance and a portfolio-mode instance) on internal demo/test-harness routes — not linked from public navigation, and not backed by the out-of-scope Portfolio/Homepage CMS collections — and not the public marketing pages, which remain out of scope this sprint — driven purely by gallery settings, demonstrating reuse with no duplicated image systems. The real public pages will reuse this same engine unmodified in the later sprint that builds them.
  - Dev: done
- [x] **AC-4.5:** The engine's layout, spacing, typography, and gradient-overlay treatment visually match the public/photobuddy template when compared side-by-side (verified via manual visual QA checklist against the template), and template images are used as placeholder content in the rendered contexts.
  - Dev: done

**Dependencies:** US-3

**Dev Team Status:** not-started
**Dev Team Notes:**
  AC-4.1 done: Pushed to `feature/US-4-AC-4.1`.
  
  ## Implementation Summary — US-4 AC-4.1
  
  **Finding:** US-4 was entirely unstarted — no `src/components/` directory existed yet. Real implementation was required (no reusable Gallery Engine pre-existed on main).
  
  **Files changed (commit `5085665`):**
  - `src/components/gallery/types.ts` — shared `GalleryImage { id, url, alt }` type, the gallery-agnostic shape every engine piece is built against.
  - `src/components/gallery/MainImageDisplay.tsx` — renders the currently active image (plain `<img>`; swapping in `next/image` with responsive srcset is explicitly AC-4.3's job, not bundled here).
  - `src/components/gallery/ThumbnailStrip.tsx` — renders one thumbnail button per image (`role="listbox"`/`option`, `aria-selected`), calls `onSelect(index)` on click.
  - `src/components/gallery/NavigationControls.tsx` — presentational next/previous buttons, calls `onNext`/`onPrevious`.
  - `src/components/gallery/GalleryEngine.tsx` — the container (`'use client'`, owns `currentIndex` state via `useState`), composes the three pieces above around one shared state; next/previous wrap around at the boundaries; degrades gracefully (no crash) for an empty `images` array.
  - `s …
  AC-4.2 done: Pushed to `feature/US-4-AC-4.2`.
  
  ## Implementation Summary — US-4 AC-4.2
  
  **Finding:** AC-4.2 was `not-started` on main — no gradient overlay existed anywhere in the Gallery Engine (`MainImageDisplay` rendered a bare `<img>`).
  
  **Files changed (commit `0dfe856`):**
  - `src/components/gallery/GradientOverlay.tsx` (new) — presentational component rendering a decorative, `aria-hidden`, `pointer-events-none` `<div>` with an inline `linear-gradient` (transparent → `rgba(0,0,0,0.49)`) as its `backgroundImage`. Pure CSS, no background-image asset, no Sharp/image-processing involvement. Gradient stops mirror the subtlety of the `public/photobuddy` template's own hero-slider overlay (transparent through 70%, rising to ~0.49 black by 100%) for later AC-4.5 visual-parity.
  - `src/components/gallery/MainImageDisplay.tsx` (modified) — now composes `<GradientOverlay />` stacked over the `<img>` inside its existing `relative` wrapper. Because every `GalleryEngine` instantiation (hero, portfolio, or any future display mode) renders through this same shared component, the overlay is applied consistently everywhere by construction — no per-context wiring needed. Header's `related-ac` bumped to 4.2.
  - …
  AC-4.3 done: ## Implementation Summary — US-4 AC-4.3
  
  **Finding:** AC-4.1/4.2 explicitly deferred this work — both `MainImageDisplay.tsx` and `ThumbnailStrip.tsx` used plain `<img>` tags with an eslint-disable comment reading "responsive next/image srcset wiring is AC-4.3's job." Real implementation was required.
  
  **Files changed (commit `12404e4`, pushed to `feature/US-4-AC-4.3`):**
  - `src/components/gallery/types.ts` — extended `GalleryImage` with optional `thumbnailUrl`/`mediumUrl`/`largeUrl` fields (mirroring the Sharp variants Payload's `Media` collection already generates), keeping `url` as the original-file fallback.
  - `src/components/gallery/galleryImageLoader.ts` (new) — `resolveGalleryImageSrc(image, width)` picks thumbnail (≤400px) / medium (≤1200px) / large (>1200px), falling back up the chain and ultimately to `url` when a variant is missing. `createGalleryImageLoader(image)` wraps it as a `next/image` custom `loader` bound to one image.
  - `src/components/gallery/MainImageDisplay.tsx` — now renders via `next/image` with `fill sizes="100vw"` and the custom loader, still stacked under `GradientOverlay` (AC-4.2 untouched).
  - `src/components/gallery/ThumbnailStrip.tsx` — renders via `n …
  AC-4.4 done: Pushed successfully to `feature/US-4-AC-4.4` (commit `8a8bf8d`).
  
  ## Implementation Summary — US-4 AC-4.4
  
  **Finding:** No production code change existed for this AC — `GalleryEngine` had no `settings` prop, and no demo/test-harness route existed. Real implementation was required.
  
  **Files changed:**
  - `src/components/gallery/types.ts` — added `GallerySettings` interface mirroring the Payload `Galleries.settings` group (`slideshow`/`hoverPreview`/`fullscreen`/`download`/`requireAuth`).
  - `src/components/gallery/GalleryEngine.tsx` — added an optional `settings` prop (defaulting to the same values a freshly-created Payload gallery record would have), reflected as `data-slideshow`/`data-hover-preview`/`data-fullscreen`/`data-download`/`data-require-auth` attributes on the root element. This is passthrough only — actual behavioral enforcement (auto-advance, hover reveal, fullscreen gating) is explicitly US-5's job, not bundled here.
  - `src/app/(frontend)/dev/gallery-demo/page.tsx` (new) — internal demo/test-harness route, `robots: noindex`, not linked from anywhere. Instantiates the same `GalleryEngine` twice with local mock data (not fetched from Payload, not the out-of-scope Portfoli …
  AC-4.5 done: Pushed to `feature/US-4-AC-4.5`. Stayed on the feature branch throughout; did not touch `main` or `scrum-master/`.
  
  ## Implementation Summary — US-4 AC-4.5
  
  **AC:** The engine's layout, spacing, typography, and gradient-overlay treatment visually match `public/photobuddy` (verified via a manual visual QA checklist), and template images are used as placeholder content in the rendered contexts.
  
  **Finding:** The previous dev agent left uncommitted partial work on the branch (the component/demo-page parity changes), but the two artefacts the AC explicitly requires were missing: the **manual visual QA checklist** (referenced by the demo-page header but never created) and **AC-4.5 unit tests**. Also, `public/photobuddy/` — which the demo route now sources its placeholder images from — was **untracked**, so in a fresh CI checkout the images would 404 and the deliverable wouldn't function. I completed those, verified every header-comment parity claim against the real template CSS, and committed.
  
  **Files committed (`e2aeb80`):**
  - **`public/photobuddy/`** (new, 53 files, 1.1M) — the canonical design template per CLAUDE.md, committed so the demo route's `/photobuddy/img/...` placeholders r …

**Tester Status:** approved
**Tester Notes:**
  Independently re-derived judgment, differing from the prior pass. AC-4.4 as written does NOT require building an out-of-scope public page: it explicitly scopes proof of reuse to internal demo/test-harness routes, expressly excluding the public marketing pages. Instantiating the engine twice (hero-mode, portfolio-mode) on a non-navigable internal route, driven only by gallery settings, requires no out-of-scope CMS collection (Portfolio/Homepage) and no out-of-scope public page — so it is fully testable within sprint-1 scope (render engine twice with different settings; assert a single shared component tree with no duplicated image system). Tightened AC-4.4 wording to explicitly state the demo route must not be linked from public navigation and must not depend on the out-of-scope Portfolio/Homepage CMS collections, closing the residual ambiguity about what 'internal' means. Reclassified from requirements-defect to approved — the prior flag appears to reference an earlier 'homepage hero + portfolio' framing rather than the current, already-scoped AC text; there is no outstanding PO decision required here. AC-4.1, 4.2, 4.3, 4.5 remain clear, testable, and in-scope — no changes.

---

### US-5: Mobile-first interaction: PhotoSwipe fullscreen viewer, thumbnail drawer, swipe & keyboard navigation
**Status:** done | **Priority:** high

#### Acceptance Criteria
- [x] **AC-5.1:** Clicking/tapping any gallery image opens a fullscreen viewer powered by PhotoSwipe supporting next, previous, close, swipe, and keyboard navigation.
  - Dev: done
- [x] **AC-5.2:** The gallery is designed mobile-first: touch navigation and swipe gestures work, and tapping a gallery opens a thumbnail drawer (mobile has no hover).
  - Dev: done
- [x] **AC-5.3:** On desktop, hovering a gallery reveals a thumbnail preview strip for previewing images (hover-preview honored per gallery settings).
  - Dev: done
- [x] **AC-5.4:** Display-mode settings are respected: e.g. hero disables fullscreen/hover and enables slideshow; portfolio enables hover + fullscreen; client-delivery enables download + fullscreen + required auth (auth enforcement may be stubbed this sprint but the setting is wired).
  - Dev: done

**Dependencies:** US-4

**Dev Team Status:** not-started
**Dev Team Notes:**
  AC-5.1 done: Pushed to `feature/US-5-AC-5.1`. All CI gates verified locally against a freshly-rebuilt image.
  
  ## Implementation Summary — US-5 AC-5.1
  
  **AC:** "Clicking/tapping any gallery image opens a fullscreen viewer powered by PhotoSwipe supporting next, previous, close, swipe, and keyboard navigation."
  
  **Finding:** The previous dev agent left substantial, coherent uncommitted work on the branch. I audited it end-to-end, found it correct and complete, fixed the one thing blocking a faithful test run (a stale Docker image), verified all gates, and committed.
  
  **Files changed (commit `39f9718`, pushed to `feature/US-5-AC-5.1`):**
  - `src/components/gallery/useFullscreenViewer.ts` (new) — React hook that creates one `PhotoSwipeLightbox` per gallery from an in-memory `dataSource` (no DOM scanning; images already in React state), exposes an imperative `open(index)`, lazy-loads the PhotoSwipe core via `pswpModule`, and destroys the instance on unmount. Next/prev/close/swipe/keyboard are PhotoSwipe defaults — none disabled.
  - `src/components/gallery/MainImageDisplay.tsx` — renders an accessible `<button>` trigger (keyboard-activatable, `aria-label`) **only** when `onOpenFullscreen` is supplied; o …
  AC-5.2 done: Pushed successfully. No `package-lock.json` changes were needed (no new dependencies added).
  
  ## Implementation Summary — US-5 AC-5.2
  
  **AC:** "The gallery is designed mobile-first: touch navigation and swipe gestures work, and tapping a gallery opens a thumbnail drawer (mobile has no hover)."
  
  **Finding:** No touch/swipe or mobile-drawer behavior existed yet — `ThumbnailStrip` was always rendered inline (AC-4.1's desktop-oriented layout), and the main image had no gesture handling beyond click (AC-5.1). Confirmed via PRD §5.5/§5.7 that "tap gallery → thumbnail drawer opens" is mobile's no-hover equivalent of desktop's future hover-to-reveal (AC-5.3), so this AC only needed to change mobile behavior and leave the `sm:`-and-up desktop layout untouched.
  
  **Files changed (commit `247e8ae`):**
  - `src/components/gallery/useSwipeNavigation.ts` (new) — touch handlers (`onTouchStart`/`onTouchEnd`) that detect a horizontal swipe past a 50px threshold and call `onSwipeLeft`/`onSwipeRight`; ignores gestures that are mostly vertical so normal page scrolling isn't hijacked.
  - `src/components/gallery/ThumbnailDrawer.tsx` (new) — wraps the existing, unmodified `ThumbnailStrip` with a tap toggle ( …
  AC-5.3 done: Pushed successfully to `feature/US-5-AC-5.3`.
  
  ## Implementation Summary — US-5 AC-5.3
  
  **AC:** "On desktop, hovering a gallery reveals a thumbnail preview strip for previewing images (hover-preview honored per gallery settings)."
  
  **Finding:** No hover-reveal behavior existed. The `GallerySettings.hoverPreview` field already existed (wired since AC-3.4, surfaced as `data-hover-preview` on the gallery container since earlier US-4/5 work), but nothing consumed it — the `ThumbnailDrawer` unconditionally force-showed the strip at the `sm` breakpoint and up (`sm:!max-h-none sm:!opacity-100`), regardless of hover state or the setting.
  
  **Files changed (commit `49057de`):**
  - `src/components/gallery/GalleryEngine.tsx` — added `isHovered` state tracked via `onMouseEnter`/`onMouseLeave` on the top-level gallery container (exposed as `data-hovered` for debugging), and passes `hoverPreview`/`isHovered` down to `ThumbnailDrawer`.
  - `src/components/gallery/ThumbnailDrawer.tsx` — computes `revealOnHover = hoverPreview && isHovered`; the desktop (`sm:`) override classes are now conditional on this instead of hardcoded always-visible, and a new `data-hover-visible` attribute exposes the reveal st …
  AC-5.4 done: AC-5.4 is complete, committed, and pushed to `feature/US-5-AC-5.4`.
  
  ## Implementation Summary — US-5 AC-5.4
  
  **AC:** "Display-mode settings are respected: e.g. hero disables fullscreen/hover and enables slideshow; portfolio enables hover + fullscreen; client-delivery enables download + fullscreen + required auth (auth enforcement may be stubbed this sprint but the setting is wired)."
  
  **Finding:** The previous dev agent left coherent, uncommitted work on the branch that fully implements this AC. I audited it end-to-end, reverted an unrelated Next.js-auto-generated `tsconfig.json` reformat (same side effect prior ACs noted and excluded), verified all gates, and committed. The `GallerySettings` toggles were already *wired* to `data-*` attributes since AC-4.4, but nothing *enforced* `slideshow`/`fullscreen`/`download` behaviorally — that enforcement is this AC's deliverable.
  
  **Files changed (commit `4f59ea0`):**
  - `src/components/gallery/GalleryEngine.tsx` (modified) — enforces each per-gallery toggle so hero/portfolio/client-delivery instances differ only by the `settings` object: `settings.fullscreen` gates whether the PhotoSwipe click/tap trigger is passed to `MainImageDisplay`; …

**Tester Status:** approved
**Tester Notes:**
  Independently reviewed: all 4 ACs are testable via component/e2e tests driven by gallery settings values (touch/swipe emulation, hover simulation, keyboard events, per-mode toggle assertions) and can be exercised against any gallery instance, including a test-harness route — no dependency on out-of-scope public pages. AC-5.4's stubbed-auth carve-out is explicit and bounded (setting must be wired and assertable even though enforcement is stubbed), so it remains objectively verifiable. No scope issues. No edits needed.

---

### US-6: Gallery performance: progressive/lazy loading, partial load, and static generation with ISR
**Status:** done | **Priority:** high

#### Acceptance Criteria
- [x] **AC-6.1:** A gallery never loads its full set of images upfront — only visible images and required thumbnails are loaded initially; remaining images load lazily/progressively.
  - Dev: done
- [x] **AC-6.2:** Gallery-bearing routes use static generation with incremental regeneration (ISR), proven this sprint against an internal demo/test-harness route — not linked from public navigation, and not backed by the out-of-scope Portfolio/Homepage CMS collections — rendering a gallery. Real public pages are out of scope this sprint and will re-verify the identical ISR wiring in the sprint that builds them.
  - Dev: done
- [x] **AC-6.3:** Updating a gallery in Payload triggers on-demand revalidation/regeneration of the affected gallery-bearing route(s), demonstrated this sprint against an internal demo/test-harness route — not linked from public navigation, and not backed by out-of-scope CMS collections (real public pages deferred; the same revalidation hook re-verifies against them in the sprint that builds them).
  - Dev: done
- [x] **AC-6.4:** Images below the fold use loading='lazy' and responsive sizes/srcset so only in-viewport images are requested on initial load, reducing initial page payload on a mobile connection (verified via network waterfall / Lighthouse mobile performance check).
  - Dev: done

**Dependencies:** US-4

**Dev Team Status:** not-started
**Dev Team Notes:**
  AC-6.1 done: Pushed to `feature/US-6-AC-6.1` (commit `b34eed5`).
  
  ## Implementation Summary — US-6 AC-6.1
  
  **AC:** "A gallery never loads its full set of images upfront — only visible images and required thumbnails are loaded initially; remaining images load lazily/progressively." (PRD §6 "Initial Load")
  
  **Finding:** Partially satisfied already — `MainImageDisplay` only ever renders the single currently-active image (never the full array), and `next/image` defaults every image to `loading="lazy"`. But `ThumbnailStrip` unconditionally mapped over the **entire** `images` array into the DOM on mount. For a large gallery this mounts hundreds of `<img>` elements upfront; worse, when the mobile drawer / desktop hover strip is collapsed (`max-h-0 overflow-hidden`, AC-5.2/5.3), those hidden thumbnails still occupy a real layout position, so native browser lazy-loading heuristics could still fetch them immediately — silently defeating the "only required thumbnails load initially" requirement. This gap needed real implementation, not just verification.
  
  **Files changed (commit `b34eed5`):**
  - `src/components/gallery/useProgressiveThumbnails.ts` (new) — hook that windows how many thumbnails `ThumbnailStr …
  AC-6.2 done: Pushed to `feature/US-6-AC-6.2` (commit `017ac2b`). All gates verified. Here's the implementation summary for the record.
  
  ---
  
  ## Implementation Summary — US-6 AC-6.2
  
  **AC:** "Gallery-bearing routes use static generation with incremental regeneration (ISR), proven this sprint against an internal demo/test-harness route — not linked from public navigation, and not backed by the out-of-scope Portfolio/Homepage CMS collections — rendering a gallery."
  
  **Finding:** The previous dev agent left coherent uncommitted work: the ISR route + a payload-import-free mapper + mapper unit tests. What was missing was a test proving the AC's *core* claim — the route's ISR/static-generation wiring — plus the internal-route guards (noindex, not-linked, not-out-of-scope). I completed the test coverage, closed a mapper branch gap, verified the route renders end-to-end, and committed.
  
  **Files changed (commit `017ac2b`, 3 files, +409):**
  - `src/app/(frontend)/dev/gallery-isr-demo/page.tsx` (new) — internal demo route. `export const revalidate = 60` (the ISR segment config), fetches the in-scope `galleries` collection (US-3) via Payload's Local API with **no request-scoped input** (so Next statically pr …
  AC-6.3 fixed: Pushed to `feature/US-6-AC-6.3`.
  
  **Summary:** The AC-6.3 feature code was fine — the CI failure was a pre-existing test-design race the Tester correctly identified. `us3-ac3.5` and `us6-ac6.3`'s live round-trip tests each registered their own distinct fixture user against the same shared Postgres `db` container. Payload only allows one `first-register` call per database lifetime, so whichever file's live test ran first won that slot; the other file's fallback login then 401'd trying to log in as a user that was never actually created.
  
  Fix: extracted a single shared fixture identity and auth helper (`src/test-support/liveApiAuth.ts`, deliberately outside `__tests__` since Jest's `testMatch` would otherwise treat it as its own empty test suite) and pointed both live test files at it. Now whichever file wins `first-register` creates the exact user the other's fallback login expects — the race has no losing side.
  
  Verified in Docker: ran both live tests together against a fresh Postgres volume (both passed), ran the full suite (`tsc --noEmit`, `eslint`, full `jest`), and confirmed the two flaky-under-parallel-load timeouts (`us1-ac1.2`, `us6-ac6.3`) are the pre-existing, already-docu …
  AC-6.4 done: Pushed to `feature/US-6-AC-6.4` (commit `444e01e`).
  
  ## Implementation Summary — US-6 AC-6.4
  
  **AC:** "Images below the fold use loading='lazy' and responsive sizes/srcset so only in-viewport images are requested on initial load, reducing initial page payload on a mobile connection (verified via network waterfall / Lighthouse mobile performance check)."
  
  **Finding:** `next/image` already lazy-loads by default (confirmed by reading `next/dist/shared/lib/get-img-props.js`), and AC-4.3 already wired responsive `sizes`/srcset from the Sharp variants. But nothing distinguished an above-the-fold instance from a below-the-fold one — every `MainImageDisplay` silently inherited the implicit lazy default, including a hero gallery's LCP candidate. Next.js itself warns against exactly this ("Please add the `loading=\"eager\"` property if this image is above the fold"), and a real Lighthouse mobile run would flag it. Real implementation was needed to make the above/below-fold split explicit and intentional, not incidental.
  
  **Files changed (commit `444e01e`):**
  - `src/components/gallery/MainImageDisplay.tsx` — added an optional `priority` prop; renders explicit `loading="lazy"` by default, or p …

**Tester Status:** approved
**Tester Notes:**
  AC-6.3 diagnosis: I've reproduced the CI failure locally in Docker and root-caused it. Here's my diagnosis:
  
  ## Diagnosis: Code bug (test infrastructure, not the feature) — Medium severity
  
  **The AC-6.3 feature implementation is correct.** `src/lib/galleryRevalidation.ts`'s title→path mapping and the `Galleries.ts` `afterChange` hook are both proven correct by fast, deterministic tests (title mapping, source-wiring assertions, and a mocked-`next/cache` invocation test) — all 8 of those pass reliably every time.
  
  **The failure is isolated to one test**: `AC-6.3: updating the demo gallery through the real API round-trips...` in `src/__tests__/us6-ac6.3-on-demand-revalidation.test.ts`, which fails with `401` on a login call inside `getAuthToken` (line 101).
  
  **Root cause**: this live test's auth bootstrap does "register as Payload's first user, or fall back to logging in with my own fixture credentials." Payload only ever allows **one** `first-register` call for the lifetime of a Postgres database — every subsequent call fails once any user exists. Five other test files (`us1-ac1.2`, `us2-ac2.3`, `us2-ac2.4`, `us3-ac3.3`, `us3-ac3.5`) already use this exact same pattern, each with its **own distinct fi …

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
