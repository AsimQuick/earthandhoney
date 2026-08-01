<!--
---
file: PIVOT_AUDIT.md
project: earthandhoney
purpose: AC-14.1 — inventory every feature delivered in sprint-1 (US-1..US-6)
         and sprint-2 (US-7..US-9), each appearing exactly once, classified
         as Kept / Replaced by PicPeak / Repurposed as a Frontstage layer /
         Retired, with a one-line reason.
         AC-14.2 — name the concrete artifacts superseded by the PicPeak
         fork and their disposition (deleted now / left dormant / kept as
         a Frontstage renderer), and list orphaned .env.example config left
         behind by retired US-12/US-13, each marked removed or retained.
created-by: dev-team
related-story: US-14
         AC-14.5 — list the data that exists today (Payload media
         records, galleries, users, uploaded R2 objects), state whether
         each must be migrated, discarded, or left in place, and name
         the risk of getting it wrong.
         AC-14.6 — end the audit with an explicit keep/replace/retire
         recommendation and an open-questions list; anything the audit
         cannot resolve without human input is routed to
         `scrum-master/po-requests.md` rather than decided silently.
         AC-17.1.1 — prove a Client record can be created in the running
         Backstage through the route upstream provides, and that it
         persists across a container restart; record the creation route
         and the resulting `customer_accounts` database row.
         AC-17.1.2 — prove a Project record can be created in the running
         Backstage and linked to the Client from AC-17.1.1 as a real
         Postgres foreign key, and record the upstream defect that blocks
         doing so through the admin-facing create route as delivered.
         AC-17.1.3.1 — prove a Gallery record can be created inside the
         Project from AC-17.1.2 through the interface upstream provides,
         and that it persists; record the creation route, the resulting
         database row, the column carrying the Project association, and
         how upstream names/models the Gallery where it differs from the
         PRD's assumption.
         AC-17.1.3.2 — prove the Project-to-Gallery direction resolves:
         opening or querying the Project from AC-17.1.2 lists the Gallery
         created in AC-17.1.3.1; record the exact query or screen used to
         prove this direction, and its output.
         AC-17.1.3.3 — prove the Gallery-to-Project-to-Client direction
         resolves: opening or querying the Gallery from AC-17.1.3.1
         identifies both its Project from AC-17.1.2 and the owning Client
         from AC-17.1.1; record the exact query or screen used, and its
         output. If the Client is only reachable by a second lookup through
         the Project rather than directly from the Gallery, record that as
         the actual upstream shape rather than working around it.
         AC-17.2 — prove a batch of real images can be uploaded to the
         Gallery from AC-17.1.3.1 and processed: every uploaded original is
         stored in R2 exactly once (byte-identical to the source), the
         derivative sizes the pinned fork actually produces are recorded —
         which ones are eager (part of upload processing) and which are
         lazy (generated on first request) — and the stored `photos` row
         is checked against every field this AC names (width, height,
         aspect ratio, format, file size, processing state), recording
         honestly where the schema does not carry a field this AC expects
         as its own column.
         AC-17.3 — prove gallery password protection works as delivered by
         upstream: a password-protected Gallery refuses access without the
         password (or with the wrong one) and grants it once the correct
         password is supplied, exercised live against the running
         Backstage rather than read out of the source alone.
         AC-17.4.1.1.1.1.1.1 — define and run an expiry-related code search
         against the pinned commit: state the pinned commit and the search
         terms (expir, expires_at, expiry, ttl, valid_until, lifetime), and
         record the exact, re-runnable grep commands across the fork's
         backend source and migration directories, plus each command's
         matching-line count. No names extracted, nothing classified —
         code-level only, no live Backstage required.
         AC-17.4.1.1.1.1.1.2 — re-run the same six commands and reduce the
         migration-directory portion of their output to a deduplicated list
         of every distinct field, column, or setting name it surfaces,
         merging snake_case/camelCase spellings of the same underlying name
         into one entry each. States the raw hit count the list is reduced
         from. No classification, nothing dropped for looking irrelevant.
         AC-17.4.1.1.1.1.1.3 — re-run the same six commands against the
         fork's backend source directory, reduce that portion of their
         output to a deduplicated list of names using the same method as
         AC-17.4.1.1.1.1.1.2, then merge that list with the migration-
         directory list from AC-17.4.1.1.1.1.1.2 into one deduplicated
         inventory in which each underlying value appears exactly once,
         noting whether each entry was surfaced in the backend source, the
         migrations, or both. Every AC-17.4.1.1.1.1.1.2 name appears in the
         merged inventory. No classification, nothing dropped.
         AC-17.4.1.1.1.1.2 — working from the AC-17.4.1.1.1.1.1.3 merged
         inventory of 35 names, names every occurrence that does not
         express a Gallery's own lifetime as a ruled-out group, each with a
         one-line reason for what the value actually governs and at least
         one file:line against the pinned commit. Explicitly names the
         fork's expiry wording for admin sessions, guest tokens, and share
         links as ruled-out groups rather than leaving them unmentioned. No
         name is ruled out without the evidence cited.
         AC-17.4.1.1.1.1.3 — states the candidate shortlist for the
         Gallery's own expiry: every name in the AC-17.4.1.1.1.1.1.3 merged
         inventory that AC-17.4.1.1.1.1.2 did not rule out, each with a
         one-line reason and at least one file:line against the pinned
         commit. Reconciles the candidate list against the ruled-out groups
         so every one of the 35 merged-inventory entries appears exactly
         once, either as a candidate or inside a ruled-out group; anything
         that cannot yet be placed either way is listed as unresolved with
         the reason rather than omitted. This shortlist is the output of
         the AC-17.4.1.1.1.1.1.1 through AC-17.4.1.1.1.1.3 group of criteria
         as a whole, handed to AC-17.4.1.1.1.2 to confirm from code.
         AC-17.4.1.1.1.2.1 — settles every entry on the AC-17.4.1.1.1.1.3
         candidate shortlist as confirmed or ruled out, from application
         code at the pinned commit rather than from this audit's own prior
         reasoning: each disposition carries a one-line reason and at
         least one file:line. Confirms 13 of the 14 shortlist entries as
         genuinely participating in a Gallery's own `events.expires_at`
         lifecycle on the Gallery path. Finds that the 14th,
         `expirationChecker`, does not — its only occurrence is a
         hardcoded status literal that never reads or derives from
         `events.expires_at` — and moves it into a new ruled-out group.
         Reconciles the confirmed set and the corrected ruled-out entry
         against the full 14-entry shortlist so every entry is placed
         exactly once, with nothing left unresolved.
         AC-17.4.1.1.1.2.2.1 — for each of the AC-17.4.1.1.1.2.1 confirmed
         set's 13 entries, records where application code writes or
         otherwise determines it on the Gallery creation path
         (`POST /api/admin/events`, the creation route AC-17.1.3.1
         established), with file:line evidence against the pinned commit
         and, where a value is computed, the inputs and code that compute
         it; records the role each field plays on that path. Six entries
         (`expires_at`, `expiry_date`, `event_require_expiration`,
         `expiration_days`, `general_default_expiration_days`,
         `require_expiration`) have a creation-path write. The other
         seven (`expiration_warning`, `gallery_expired`/
         `galleryExpiredExists`, `is_expired`, `GALLERY_EXPIRED`,
         `expiringEvents`, `expiring`, `event.expired`) have none, each
         recorded as no creation-path write found together with the
         creation routes inspected to reach that. Settles nothing about
         whether an unwritten field's absence is its expected upstream
         shape — that is AC-17.4.1.1.1.2.2.3's deliverable — and moves
         nothing between the confirmed and ruled-out lists.
         AC-17.4.1.1.1.2.2.2 — the edit-path counterpart to
         AC-17.4.1.1.1.2.2.1: against the same fixed, pre-run inspection
         list of fifteen `.update(`/`.increment(`/`.del(` call sites on
         the `events` table (paths relative to
         `vendor/picpeak/backend/src/`: `routes/adminEvents.js:284`,
         `routes/adminEvents.js:1063`, `routes/events.js:346,359,383`,
         `routes/adminExternalMedia.js:178`,
         `services/downloadZipService.js:64,225,313`,
         `services/expirationChecker.js:97`,
         `services/eventService.js:448,459,478`,
         `services/archiveService.js:132`,
         `services/projectService.js:93`), records for each of the
         AC-17.4.1.1.1.2.1 confirmed set's 13 entries either the call
         site(s) among those fifteen that set, extend, recompute, or
         clear it once a Gallery already exists, or `no edit-path write
         found`. Four entries have an edit-path write (`expires_at`,
         `expiry_date`, `gallery_expired`/`galleryExpiredExists`,
         `event.expired`); the other nine do not. Moves nothing between
         the confirmed and ruled-out lists, and does not judge whether an
         absence is the field's expected upstream shape.
         AC-17.4.1.1.1.2.2.3 — reconciles the AC-17.4.1.1.1.2.2.1
         creation-path evidence and the AC-17.4.1.1.1.2.2.2 edit-path
         evidence into exactly one write-path disposition per
         AC-17.4.1.1.1.2.1 confirmed-set entry — written on creation,
         written on edit, written on both, or never written on the
         Gallery path — and states the resulting counts against the
         13-entry confirmed set. For each of the five entries never
         written on the Gallery path, records the actual upstream shape
         (a notification-kind literal, a read-time-computed value, a
         hardcoded response code, a dashboard aggregate key, or a
         request-time filter value) with the file:line establishing it.
         Finds no contradiction against AC-17.4.1.1.1.2.1,
         AC-17.4.1.1.1.2.2.1, or AC-17.4.1.1.1.2.2.2, so the confirmed set
         and ruled-out list stand unchanged in both places, and no row is
         carried forward from AC-17.4.1.1.1.2.2.2 as unresolved. This
         closed write-path record is what AC-17.4.1.1.1.2.3 pairs with the
         read path.
         AC-17.4.1.1.1.2.3 — the read-path counterpart to
         AC-17.4.1.1.1.2.2.3: for each of the AC-17.4.1.1.1.2.1 confirmed
         set's 13 entries, records the code that reads it on the Gallery
         path — where it is read when a Gallery is served, and where it
         is read when an access decision is made — stating whether each
         read gates access, only reports state, or does both. Finds only
         two entries are read on the Gallery path at all: `expires_at`
         (reports state at `gallery.js:184,475`; gates access at
         `customer.js:148` and `auth.js:576`) and the read-time-derived
         `is_expired` (reports state at `gallery.js:186`; gates the
         frontend UI at `GalleryPage.tsx:275`). Finds, and records rather
         than works around, that `middleware/auth.js`'s previously-cited
         `galleryAuth` function is dead code never wired to any route,
         and that the guest/client password- and share-token login
         routes plus the middleware actually mounted on every
         photo-serving route never check `expires_at` at all. Records
         the other nine confirmed entries as never read on the Gallery
         path with the actual upstream shape and file:line establishing
         each. Closes the AC-17.4.1.1.1.1.1.1 through AC-17.4.1.1.1.2.3
         group with its finding: the pinned fork expresses a Gallery's
         own expiry with exactly one stored field, `events.expires_at`.
related-ac: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 17.1.1, 17.1.2, 17.1.3.1, 17.1.3.2, 17.1.3.3, 17.2, 17.3, 17.4.1.1.1.1.1.1, 17.4.1.1.1.1.1.2, 17.4.1.1.1.1.1.3, 17.4.1.1.1.1.2, 17.4.1.1.1.1.3, 17.4.1.1.1.2.1, 17.4.1.1.1.2.2.1, 17.4.1.1.1.2.2.2, 17.4.1.1.1.2.2.3, 17.4.1.1.1.2.3
---
-->

# Pivot Audit

This document inventories every feature delivered in sprint-1 (US-1…US-6) and
sprint-2 (US-7…US-9) of `earthandhoney`, ahead of the PicPeak pivot. Each item
below appears **exactly once** and is classified as one of:

- **Kept** — stays as-is, no PicPeak dependency.
- **Replaced by PicPeak** — superseded outright by the PicPeak fork.
- **Repurposed as a Frontstage layer** — the code/UI survives, but is
  rewired to read from PicPeak instead of owning the data itself.
- **Retired** — removed, no longer needed under the pivot.

This AC (14.1) covers inventory + classification only. Superseded-artifact
detail, duplicate-ownership mapping, licence/dependency audit, migration
risk, and the final recommendation are out of scope here and are addressed
by AC-14.2 through AC-14.6 of this same story.

## Sprint 1 (US-1…US-6)

| # | AC | Feature | Classification | Reason |
|---|----|---------|-----------------|--------|
| 1 | US-1 AC-1.1 | Payload CMS integrated into Next.js App Router, admin at `/admin` | Kept | Payload remains the CMS for business/content collections independent of gallery storage. |
| 2 | US-1 AC-1.2 | PostgreSQL in Docker, Payload connects via `db` hostname, runs migrations | Kept | Postgres continues to back Payload's non-gallery content and business data. |
| 3 | US-1 AC-1.3 | `docker compose up -d` boots web + db together, nothing installed on host | Kept | Docker-only service convention is unrelated to the gallery/PicPeak decision. |
| 4 | US-1 AC-1.4 | DB URL, Payload secret, R2 credentials documented in `.env.example` | Repurposed as a Frontstage layer | Payload secret/DB vars stay; R2 credential purpose shifts from owning uploads to (at most) Frontstage read access once PicPeak owns storage. |
| 5 | US-1 AC-1.5 | Project metadata front-matter header convention | Kept | A repo-wide authoring convention, orthogonal to the pivot. |
| 6 | US-2 AC-2.1 | Payload `Media` collection (metadata in Payload, binaries in R2) | Replaced by PicPeak | PicPeak owns media records and storage for gallery images going forward. |
| 7 | US-2 AC-2.2 | Sharp pipeline generating thumbnail/medium/large + original to R2 | Replaced by PicPeak | PicPeak generates its own derivative sizes; a second, parallel derivative pipeline is a duplicate-feature risk. |
| 8 | US-2 AC-2.3 | Media record exposes original/thumbnail/medium/large URLs | Replaced by PicPeak | Variant URL resolution moves to PicPeak's own media API. |
| 9 | US-2 AC-2.4 | Alt text required on Media for accessibility/SEO | Replaced by PicPeak | Alt-text ownership follows the media record, which PicPeak now owns. |
| 10 | US-2 AC-2.5 | R2 credentials/bucket read from env, no host-installed service | Replaced by PicPeak | Upload-path ownership (and its credentials) moves to PicPeak; Frontstage no longer writes to R2 directly. |
| 11 | US-3 AC-3.1 | Payload `Galleries` collection (title, description, images[], cover, settings) | Replaced by PicPeak | PicPeak becomes the single gallery data owner, per the pivot's core premise. |
| 12 | US-3 AC-3.2 | No image system besides Media + Galleries manages images | Replaced by PicPeak | The "single owner" invariant now points at PicPeak instead of Payload. |
| 13 | US-3 AC-3.3 | Photographer manages gallery images entirely via Payload admin | Replaced by PicPeak | Gallery authoring moves to PicPeak's own admin/UI. |
| 14 | US-3 AC-3.4 | Gallery `settings` drive display mode (slideshow/hover/fullscreen/download/auth) | Repurposed as a Frontstage layer | Display-mode intent is still needed to drive the Gallery Engine UI; it is re-sourced from PicPeak's gallery metadata instead of Payload's. |
| 15 | US-3 AC-3.5 | Galleries readable via Payload API/local API | Replaced by PicPeak | Read path moves to PicPeak's API; Payload no longer serves gallery data. |
| 16 | US-4 AC-4.1 | Gallery Engine: Container, Main Image Display, Thumbnail Preview, Navigation Controls | Repurposed as a Frontstage layer | Rendering components are storage-agnostic and are kept as the Frontstage renderer, fed by PicPeak data instead of Payload. |
| 17 | US-4 AC-4.2 | Subtle black CSS gradient overlay on every gallery display | Repurposed as a Frontstage layer | Pure-CSS presentation concern, reused unchanged in the Frontstage renderer. |
| 18 | US-4 AC-4.3 | `next/image` responsive srcset from thumbnail/medium/large variants | Repurposed as a Frontstage layer | Responsive-image wiring is kept but re-pointed at PicPeak-provided variant URLs. |
| 19 | US-4 AC-4.4 | Engine instantiated in 2+ demo/test-harness display-mode contexts | Repurposed as a Frontstage layer | Demo routes continue to prove engine reuse, now against PicPeak-backed data. |
| 20 | US-4 AC-4.5 | Engine visually matches `public/photobuddy` template | Kept | A visual-parity requirement independent of which system owns gallery data. |
| 21 | US-5 AC-5.1 | Fullscreen PhotoSwipe viewer (next/prev/close/swipe/keyboard) | Repurposed as a Frontstage layer | Viewer UI is storage-agnostic and is kept as-is, fed by PicPeak-sourced image lists. |
| 22 | US-5 AC-5.2 | Mobile-first touch nav, swipe, tap-to-open thumbnail drawer | Repurposed as a Frontstage layer | Same rationale as AC-5.1 — presentation layer, not a data owner. |
| 23 | US-5 AC-5.3 | Desktop hover reveals thumbnail preview strip | Repurposed as a Frontstage layer | Same rationale — presentation only. |
| 24 | US-5 AC-5.4 | Display-mode settings honored (hero/portfolio/client-delivery variants) | Repurposed as a Frontstage layer | Mode-driven behavior is kept; the mode/settings source shifts to PicPeak. |
| 25 | US-6 AC-6.1 | Gallery never loads full image set upfront; lazy/progressive load | Repurposed as a Frontstage layer | Progressive-loading strategy is reused verbatim against PicPeak-served image lists. |
| 26 | US-6 AC-6.2 | Gallery-bearing routes use static generation + ISR (demo route) | Repurposed as a Frontstage layer | ISR rendering strategy is kept; the revalidation trigger source becomes PicPeak instead of Payload. |
| 27 | US-6 AC-6.3 | Payload gallery update triggers on-demand revalidation (demo route) | Replaced by PicPeak | The specific "Payload update triggers revalidation" webhook path is superseded — PicPeak becomes the change source, requiring a new trigger integration rather than reuse of this one. |
| 28 | US-6 AC-6.4 | Below-the-fold images use `loading='lazy'` + responsive `sizes`/srcset | Repurposed as a Frontstage layer | Lazy-loading markup is storage-agnostic and carries over unchanged. |

## Sprint 2 (US-7…US-9)

| # | AC | Feature | Classification | Reason |
|---|----|---------|-----------------|--------|
| 29 | US-7 AC-7.1 | `.github/workflows/deploy.yml` (push-to-main + `workflow_dispatch`) | Kept | Deploy pipeline is infrastructure, independent of the gallery-ownership decision. |
| 30 | US-7 AC-7.2 | CI clean-checkout smoke path (`docker compose up` boots web+db) | Kept | CI smoke-testing convention is unaffected by which system owns gallery data. |
| 31 | US-7 AC-7.3 | AC-1.2 live-boot test stabilized (`--runInBand`) | Kept | Test-infra stability fix, unrelated to the pivot. |
| 32 | US-7 AC-7.4 | `.env.example` authoritative for sprint-2 vars (Resend, WhatsApp, site URL) | Kept | These vars belong to lead-generation (US-12/US-13), out of this AC's sprint-1/2 scope but not gallery-related; documented here as the env-file mechanism itself, which is Kept. |
| 33 | US-8 AC-8.1 | `(frontend)` shared public layout: vertical menu, nav, social icons, footer | Kept | Site chrome/navigation shell is independent of gallery data ownership. |
| 34 | US-8 AC-8.2 | Photobuddy global styling + Rubik webfont ported (Tailwind tokens) | Kept | Design-system tokens apply site-wide, not just to galleries. |
| 35 | US-8 AC-8.3 | Mobile menu trigger toggles vertical menu drawer | Kept | Navigation-only client component, no gallery/data dependency. |
| 36 | US-8 AC-8.4 | Real `<head>`/metadata (title, description, favicon), no create-next-app placeholders | Kept | Site metadata is unrelated to the gallery-ownership pivot. |
| 37 | US-9 AC-9.1 | Homepage global: hero gallery relation, headline/intro, CTA, reorderable sections | Repurposed as a Frontstage layer | Non-gallery fields (headline, CTA, sections) stay Payload-owned; the hero-gallery relationship is re-pointed at a PicPeak gallery reference instead of Payload's `Galleries` collection. |
| 38 | US-9 AC-9.2 | Portfolio collection: title/slug/category/cover + ordered Galleries relation | Repurposed as a Frontstage layer | Same rationale as AC-9.1 — portfolio metadata stays in Payload, but the gallery reference moves to PicPeak. |
| 39 | US-9 AC-9.3 | Testimonials, Packages, FAQ collections (quote/author, name/price/features, question/answer) | Kept | No gallery/media relationship; purely business content unaffected by the pivot. |
| 40 | US-9 AC-9.4 | New collections/globals registered in `payload.config.ts` with `useAsTitle` + header convention | Kept | Registration/convention requirement applies regardless of which system owns gallery data. |

## Note on repository state at time of audit

AC-9.1 and AC-9.2 (rows 37–38) were implemented in commits `a800bd8` and
`1d5aa13`, but as of this audit those commits are not present on this
story's branch lineage — a known git desync between `main` and story
branches (see the `[PLANNING] sprint-3 — restore sprint files lost to a
main/story-branch git desync` commit). They are still inventoried here
because they were delivered per the sprint-2 tracker; their absence from
the current working tree is a restoration concern for the Project Lead,
not a reclassification.

## Superseded artifacts (AC-14.2)

This section names the concrete, on-disk artifacts superseded by the
PicPeak fork and records their disposition. Three dispositions are
possible:

- **Deleted now** — removed from the repository as part of executing this
  audit.
- **Left dormant** — code remains in the repository, unused by the
  PicPeak-backed read path, pending a dedicated pivot-execution story to
  remove it (removing it here would require also rewriting the still-active
  tests that lock in its current behavior, which is out of this audit AC's
  scope).
- **Kept as a Frontstage renderer** — the code survives unchanged in
  location, but is rewired to read from PicPeak instead of owning the data.

| Artifact | Location | Disposition | Reason |
|---|---|---|---|
| Payload `Galleries` collection | `src/collections/Galleries.ts` | Left dormant | PicPeak becomes the gallery data owner (see row 11); the collection definition and its `us3-ac3.1-galleries-collection.test.ts` lock-in test stay in place until a follow-on pivot-execution story removes them together. |
| Payload-owned Sharp derivative pipeline | `src/collections/Media.ts` (inline `imageSizes`/`resize` config), backed by Payload's built-in Sharp resizing | Left dormant | PicPeak generates its own thumbnail/medium/large derivatives (see row 7); the inline config and its `us2-ac2.2-sharp-pipeline.test.ts` / `us2-ac2.3-media-variant-urls.test.ts` lock-in tests stay in place until removed together in a follow-on story. |
| Payload-owned R2 upload path | `src/payload.config.ts` (`@payloadcms/storage-s3` / `s3Storage` config), `.env.example` R2 vars | Left dormant | Upload-path ownership moves to PicPeak (see rows 6, 10); the S3-compatible adapter wiring, R2 env vars, and `us2-ac2.5-r2-env-config.test.ts` / `us1-ac1.4-env-config.test.ts` lock-in tests stay in place until removed together in a follow-on story. |
| In-repo gallery viewer components | `src/components/gallery/` (`GalleryEngine.tsx`, `MainImageDisplay.tsx`, `ThumbnailStrip.tsx`, `ThumbnailDrawer.tsx`, `NavigationControls.tsx`, `GradientOverlay.tsx`, `DownloadControl.tsx`, `useFullscreenViewer.ts` (PhotoSwipe), `useSwipeNavigation.ts`, `useSlideshow.ts`, `useProgressiveThumbnails.ts`, `galleryImageLoader.ts`, `payloadGalleryMapper.ts`, `types.ts`) | Kept as a Frontstage renderer | Storage-agnostic rendering/interaction UI (see rows 16–26); rewired to consume PicPeak-sourced image lists/metadata in place of `payloadGalleryMapper.ts`'s current Payload source, with no change to the components themselves. |

## Orphaned configuration (AC-14.2)

`US-12` (lead-generation contact form) and `US-13` (WhatsApp lead-capture)
are retired by the pivot — both are still `status: draft` /
`dev_status: not-started` in `scrum-master/sprint2.json`, meaning no
application code was ever built against them. The three env vars
`.env.example` documents on their behalf are therefore orphaned
configuration with no consuming feature:

| Variable | Origin | Consuming code found? | Disposition | Reason |
|---|---|---|---|---|
| `RESEND_API_KEY` | US-12 AC-12.5 (lead-notification email) | None in `src/` — only referenced by the `us7-ac7.4-env-example-sprint2-vars.test.ts` lock-in test | Retained | US-12 is retired unbuilt, so nothing consumes this var; it is retained rather than removed because deleting it now would break the still-active AC-7.4 test that asserts its presence, and rewriting that test is a change to a previously accepted AC's deliverable, out of this audit AC's scope. Removal is deferred to a follow-on pivot-execution story that updates AC-7.4's test alongside the var. |
| `LEAD_NOTIFICATION_EMAIL` | US-12 AC-12.5 (lead-notification email) | None in `src/` — only referenced by the `us7-ac7.4-env-example-sprint2-vars.test.ts` lock-in test | Retained | Same reasoning as `RESEND_API_KEY` — orphaned by US-12's retirement, retained to avoid breaking AC-7.4's lock-in test; removal deferred to a follow-on pivot-execution story. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | US-13 AC-13.3 (`wa.me` deep-link hand-off) | None in `src/` — only referenced by the `us7-ac7.4-env-example-sprint2-vars.test.ts` lock-in test | Retained | Same reasoning — orphaned by US-13's retirement, retained to avoid breaking AC-7.4's lock-in test; removal deferred to a follow-on pivot-execution story. |

`NEXT_PUBLIC_SITE_URL`, the fourth var `.env.example` groups alongside
these three under the "sprint-2 vars" comment, is **not** orphaned: it is
a general site-metadata value (canonical links, OG tags, sitemap) with no
US-12/US-13 dependency, and is unaffected by this pivot.

## Duplicate-feature risk map (AC-14.3)

The PicPeak fork brings its own upload path, media store, gallery data
model, and (as a self-hosted gallery-delivery app) its own auth and email
sending. Running those side-by-side with what `earthandhoney` already
owns would mean two systems doing the same job. This section names each
duplicate-feature risk and assigns it a single authoritative owner,
consistent with the per-concern ownership already fixed by CLAUDE.md's
**Technology Stack** section (Storage: Cloudflare R2; CMS: Payload CMS;
Auth: Better Auth; Email: Resend) plus the gallery-data ownership shift
onto PicPeak that AC-14.1/AC-14.2 of this same audit already established.

| # | Duplicate-feature risk | Current codebase side | PicPeak side | CLAUDE.md-designated owner | Single authoritative owner | Reason |
|---|---|---|---|---|---|---|
| R1  | Two upload paths | Payload-owned R2 upload path (`src/payload.config.ts` `s3Storage`, see Superseded artifacts row 3) | PicPeak's own ingest/upload path into its media store | Storage: Cloudflare R2 (bucket only — CLAUDE.md does not name an upload-path owner) | **PicPeak** | Rows 6/10/superseded-artifacts already establish PicPeak as the gallery media owner; a second upload path writing to the same class of assets is the exact duplicate this AC flags, so Payload's upload path stays dormant and is never invoked once PicPeak is live. |
| R2  | Two media stores | Payload `Media` collection + Sharp derivative pipeline (rows 6–9, superseded-artifacts rows 1–2) | PicPeak's media/derivative store | Image processing: Sharp pipeline generating thumbnail/medium/large from originals stored in R2 (CLAUDE.md Product Pillar 2) — superseded for gallery images by the pivot itself | **PicPeak** | CLAUDE.md's Sharp/R2 pillar describes the pre-pivot design; AC-14.1/14.2 already reclassified the Payload Media/Sharp path as Replaced by PicPeak / Left dormant. Keeping both live would mean two authoritative sources for the same derivative URLs. |
| R3  | Two galleries | Payload `Galleries` collection (row 11, superseded-artifacts row 1) | PicPeak's gallery data model | CMS: Payload CMS (collections list includes Galleries) — reassigned by the pivot | **PicPeak** | The pivot's core premise (per CLAUDE.md's Product Vision: "one reusable engine powers... No separate image systems") is a single gallery data owner; AC-14.1 already classifies the Payload `Galleries` collection as Replaced by PicPeak, so PicPeak is that single owner going forward. |
| R4  | Two auth systems | Auth: Better Auth (CLAUDE.md Technology Stack) — governs photographer/admin login and the business dashboard | PicPeak ships its own built-in auth/access-control (e.g. gallery password/session protection) | **Auth: Better Auth** | **Better Auth**, for all photographer/admin/dashboard identity | CLAUDE.md's Technology Stack fixes Better Auth as the single auth owner for the business platform; nothing in AC-14.1/14.2 reassigns identity/auth away from it. PicPeak's built-in auth is scoped to gallery-viewer access (e.g. a client-facing gallery password) and must not be used for photographer/admin login, so the two systems serve different audiences rather than genuinely competing — but any overlap (e.g. PicPeak admin accounts) defaults to Better Auth as authoritative. |
| R5  | Two email senders | Email: Resend (CLAUDE.md Technology Stack) | PicPeak ships its own outbound email (e.g. gallery-ready/delivery notifications) | **Email: Resend** | **Resend** | CLAUDE.md's Technology Stack fixes Resend as the single email-sending owner; PicPeak's built-in mailer is disabled/not configured, and any PicPeak event that needs to notify a client or the photographer is wired to trigger a Resend send rather than letting PicPeak dispatch its own email, so there is exactly one email sender in production. |

Risks 1–3 resolve to **PicPeak** because CLAUDE.md's stack entries for
storage/CMS describe the pre-pivot design and are the exact concerns
AC-14.1/AC-14.2 already reassign to PicPeak. Risks 4–5 resolve to the
**existing CLAUDE.md owner** (Better Auth, Resend) because the pivot
never reassigns identity or outbound email — PicPeak's built-in
equivalents for those two concerns must stay unused so no concern ever
has two live owners at once.

## Dependency and licence audit (AC-14.4)

This section covers `package.json` third-party dependencies plus the one
non-npm dependency the pivot introduces: the PicPeak fork itself. Licences
below were read directly from each package's own `node_modules/<pkg>/package.json`
(or, for PicPeak, are pending direct verification — see the flag below),
not assumed from documentation.

### Dropped by the pivot

These are direct runtime dependencies of `earthandhoney`'s existing,
pre-pivot code paths that AC-14.2 already classified as **Left dormant**.
None are removed from `package.json` by this audit itself — removal is
deferred to the follow-on pivot-execution story that also removes the
lock-in tests exercising them (see AC-14.2) — but each is a dependency the
pivot's end state no longer needs, since PicPeak takes over the concern it
served.

| Dependency | Licence | Superseded artifact it serves | Copyleft/restrictive? |
|---|---|---|---|
| `sharp` (`^0.34.5`) | Apache-2.0 | Payload-owned Sharp derivative pipeline (`src/payload.config.ts`, `src/collections/Media.ts`) | No — permissive, no PO flag needed. |
| `@payloadcms/storage-s3` (`^3.86.0`) | MIT | Payload-owned R2 upload path (`src/payload.config.ts` `s3Storage`) | No — permissive, no PO flag needed. |

`graphql` (MIT), `@payloadcms/db-postgres` (MIT), `@payloadcms/next` (MIT),
and `@payloadcms/richtext-lexical` (MIT) remain in use for Payload's
continuing, non-gallery responsibilities (see the Kept rows in the
Sprint 1/2 inventory above) and are therefore **not** dropped by the pivot.

### Newly introduced by the pivot

| Dependency | Licence | Notes | Copyleft/restrictive? |
|---|---|---|---|
| PicPeak Backstage fork (per `US-15`, vendored into the repo at a pinned commit, not an npm package) | **Unconfirmed** — the PRD assumes MIT, but `US-15` AC-15.1 requires this to be read directly from PicPeak's own upstream licence file before the fork is created; it has not yet been read as of this audit. | Becomes the single owner of gallery data, uploads, and media derivatives (see the Duplicate-feature risk map above). Its own transitive dependency tree is out of scope until the fork exists — that tree gets its own audit once `US-15` pins a commit. | **FLAGGED for Product Owner decision.** If the upstream licence turns out to be copyleft (e.g. GPL/AGPL) or otherwise commercially restrictive rather than the PRD's assumed MIT, `US-15` AC-15.1 already requires work to stop and the Product Owner to be notified via `scrum-master/po-requests.md` before any fork is created — this audit does not pre-empt that gate, it records that the gate exists and why. |

No other new npm dependency is anticipated: the Frontstage-to-Backstage API
boundary (`US-18`) is expected to use standard `fetch`, already available
without a new package, and `photoswipe` (MIT) — the current in-repo
gallery viewer's fullscreen library — is **kept as a Frontstage renderer**
(see Superseded artifacts, row 4) rather than replaced, so it is neither
newly introduced nor dropped.

### Current runtime dependencies with no pivot impact

For completeness, the remaining current runtime dependencies (`next`
16.2.10, `payload` `^3.86.0`, `react` 19.2.4, `react-dom` 19.2.4,
`photoswipe` `^5.4.4`) are all **MIT**-licensed and are Kept per the
Sprint 1/2 inventory above — no licence flag applies to any of them.

## Migration-risk section (AC-14.5)

This section covers the data that exists today in the running system —
as opposed to the code/config artifacts already covered by AC-14.2 — and
states, per category, whether it must be **migrated** into PicPeak,
**discarded**, or **left in place**, plus the risk of getting that call
wrong.

| Data category | Where it lives today | Disposition | Risk of getting it wrong |
|---|---|---|---|
| Payload media records (`media` collection: filename, alt text, mime/size, `imageSizes` variant refs) | Postgres, via the `media` collection (`src/collections/Media.ts`) | **Migrate** — any record with a real uploaded file must have its binary and alt text re-created as a PicPeak media entry before the Payload `media` collection is retired; do not discard, since alt text is a Product Pillar 4/accessibility requirement PicPeak must also carry. | If discarded instead of migrated: existing gallery images become unreachable (dead `original`/`thumbnail`/`medium`/`large` URLs) and alt text is lost, regressing accessibility/SEO with no way to recover the text without re-keying it by hand. |
| Galleries (`galleries` collection: title, description, `images[]`, cover, `settings`) | Postgres, via the `galleries` collection (`src/collections/Galleries.ts`) | **Migrate** — each gallery's structure (title/description/cover/settings/image order) must be re-created in PicPeak so the Frontstage renderer (Superseded artifacts, row 4) has something to read; the `images[]` relation must resolve to the migrated media records above, in the same order. | If migrated without preserving image order or `settings` (display mode: slideshow/hover/fullscreen/download/auth), the Frontstage renderer will render the wrong layout or expose a gallery that should have been access-gated, a data-integrity and possible confidentiality regression, not just a cosmetic one. |
| Users (`users` collection — Payload's own `auth: true` login, distinct from Better Auth) | Postgres, via the `users` collection (`src/collections/Users.ts`) | **Left in place** — this collection is Payload's own admin-login mechanism, not a duplicate of the PicPeak/Better Auth concern (Duplicate-feature risk map, R4); it continues to gate `/admin` regardless of the pivot and has no PicPeak equivalent to migrate into. | If mistakenly discarded (e.g. bulk-cleared as "legacy" during pivot execution): every photographer/admin account is locked out of `/admin` with no self-service recovery path, an availability incident for the one person who operates the CMS. |
| Uploaded R2 objects (original + `thumbnail`/`medium`/`large` binaries in the R2 bucket referenced by the `media` collection) | Cloudflare R2, via the Payload-owned upload path (`src/payload.config.ts` `s3Storage`, see Superseded artifacts, row 3) | **Migrate** — the binaries themselves (not just the Payload metadata rows) must be copied into PicPeak's own media store as part of the same migration step as the media records above, since PicPeak owns storage going forward (Duplicate-feature risk map, R1/R2); once PicPeak's copies are confirmed reachable, the R2 objects may be discarded to avoid paying for storage no system reads from. | If the metadata row is migrated but the binary is not copied first: the migrated media record points at a URL PicPeak never populated, producing broken images across every gallery that referenced it — and if the original R2 object is deleted before that copy is verified, the source image is unrecoverable. |

No production client galleries exist as of this audit — the current
Media/Galleries/Users data is limited to what sprint-1/2's own tests and
demo/test-harness routes (rows 4, 19 in the Sprint 1 inventory) created.
The dispositions above nonetheless apply to whatever real data is present
by the time a pivot-execution story runs, since this audit is written
ahead of that execution, not ahead of first real client use.

## AC-17.1.1 — Client creation and persistence

`US-17` AC-17.1.1 requires proof that a Client record can be created in
the running Backstage through the interface upstream provides, and that
it survives a container restart. This section records the creation route
used and the resulting database row.

### What upstream calls a "Client"

The PicPeak fork has no table literally named `client`. The record that
plays that role is `customer_accounts` — the recurring-login "customer"
tier added in upstream migration `090_add_customer_accounts.js` (a
distinct concept from `admin_users`, which is photographer/staff login).
A `customer_accounts` row carries the person/company identity fields
(`email`, `first_name`, `last_name`, `company_name`, billing address,
etc.) that a "Client" record is expected to hold, and later CRM tables
(quotes, invoices, contracts — migration `107_crm_consolidated.js`)
reference it as the billed party. This is the record this AC treats as
the Client.

### Creation route used

`POST /api/admin/customers` (`vendor/picpeak/backend/src/routes/adminCustomers.js:232`,
mounted at `vendor/picpeak/backend/server.js:687`), admin-authenticated
(`adminAuth`) and gated by the `customers.create` RBAC permission. This
is the same route the admin UI's "add customer" screen calls; it creates
the `customer_accounts` row directly (`customerAccountsService.createDirect`)
rather than going through the invite-acceptance flow, which is the
correct route for "a Client record can be created," not "a Client
logged in for the first time."

Exercised against the running Backstage (`docker compose --profile
backstage`, per `BACKSTAGE_STARTUP.md`) on 2026-07-31, authenticated as
the seeded administrator through the real front door
(`http://localhost:3100/api/auth/admin/login`), then:

```
$ curl -s -i -X POST http://localhost:3100/api/admin/customers \
    -H "Content-Type: application/json" \
    -H "Cookie: admin_token=<seeded-admin-session>" \
    -d '{"email":"ac17-1-1-client@example.com","prefill":{"first_name":"Ada","last_name":"Testclient","company_name":"AC-17.1.1 Verification"}}'

HTTP/1.1 201 Created
...
{"customer":{"id":3,"email":"ac17-1-1-client@example.com","firstName":"Ada","lastName":"Testclient","companyName":"AC-17.1.1 Verification", ...}}
```

### Resulting database row

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select id, email, first_name, last_name, company_name, is_active, created_at, updated_at from customer_accounts where id = 3;"

 id |            email            | first_name | last_name  |      company_name      | is_active |         created_at         |         updated_at
----+-----------------------------+------------+------------+------------------------+-----------+----------------------------+----------------------------
  3 | ac17-1-1-client@example.com | Ada        | Testclient | AC-17.1.1 Verification | t         | 2026-07-31 19:24:44.844+00 | 2026-07-31 19:24:44.844+00
(1 row)
```

### Persistence across a container restart

The `backstage-backend` container (application process, not the
database) was restarted, waited for its healthcheck to report `healthy`
again, then the same customer was re-read through both the admin API and
a direct database query:

```
$ docker compose --profile backstage restart backstage-backend
$ docker inspect --format='{{.State.Health.Status}}' earthandhoney-backstage-backend-1
healthy

$ curl -s -i http://localhost:3100/api/admin/customers/3 -H "Cookie: admin_token=<seeded-admin-session>"
HTTP/1.1 200 OK
{"customer":{"id":3,"email":"ac17-1-1-client@example.com","firstName":"Ada","lastName":"Testclient","companyName":"AC-17.1.1 Verification", ...}}

$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select id, email, first_name, last_name, company_name, is_active, created_at, updated_at from customer_accounts where id = 3;"
 id |            email            | first_name | last_name  |      company_name      | is_active |         created_at         |         updated_at
----+-----------------------------+------------+------------+------------------------+-----------+----------------------------+----------------------------
  3 | ac17-1-1-client@example.com | Ada        | Testclient | AC-17.1.1 Verification | t         | 2026-07-31 19:24:44.844+00 | 2026-07-31 19:24:44.844+00
(1 row)
```

Same `id`, same field values, same `created_at`/`updated_at` before and
after the restart — `backstage-db` is a separate, independently-running
Postgres container with its own named volume
(`backstage_pgdata`, per `BACKSTAGE_STARTUP.md`'s teardown note), so a
`backstage-backend` restart never touches its storage; the row's
survival confirms the fork persists Client data through the application
container's own lifecycle, not just within a single request/process.

AC-17.1.1 is satisfied: a Client (`customer_accounts`) record was
created through the admin-facing route upstream provides, and the same
record — same primary key, same field values — was retrievable through
both the API and the database after a `backstage-backend` container
restart.

## AC-17.1.2 — Project creation and Client linkage

`US-17` AC-17.1.2 requires proof that a Project record can be created in
the running Backstage and linked to the Client from AC-17.1.1, that
reading the Project back shows that Client, and that the link is a real
Postgres foreign key rather than a free-text field. It also requires that
any place upstream models Projects/Clients differently than the PRD
assumes be written up here rather than worked around.

### The data model matches the PRD assumption

Upstream migration `117_add_projects.js` creates a `projects` table with
a nullable `customer_account_id` column carrying an actual foreign-key
constraint to `customer_accounts.id` (`ON DELETE SET NULL`), confirmed
directly from the running Backstage database:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -c "\d projects"
...
Foreign-key constraints:
    "projects_customer_account_id_foreign" FOREIGN KEY (customer_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
```

`projectService.getProjectById`
(`vendor/picpeak/backend/src/services/projectService.js:54-61`) joins
`customer_accounts` on that column, and `transformProject`
(`vendor/picpeak/backend/src/services/projectService.js:19-31`) exposes
the result as `customerAccountId` / `customerEmail` on every project the
API returns, so reading a Project back through the admin API surfaces the
linked Client. This part of the PRD's assumption holds: Project↔Client is
a real FK, not a free-text field.

### Upstream defect found: the admin create/link routes are unreachable by any role

`POST /api/admin/projects` (create), `PUT /api/admin/projects/:id`
(update/relink), and `POST /api/admin/projects/:id/events` (attach an
event) are each gated by `requirePermission('events.manage')`
(`vendor/picpeak/backend/src/routes/adminProjects.js:32,54,74`, mounted
at `vendor/picpeak/backend/server.js:706`). No permission named
`events.manage` exists anywhere in the pinned fork:

- The permissions seed (`vendor/picpeak/backend/migrations/core/055_add_permissions_table.js:49-53`)
  defines exactly five `events.*` permissions — `events.view`,
  `events.create`, `events.edit`, `events.delete`, `events.archive` — and
  no `events.manage`.
- The role/permission junction seed
  (`vendor/picpeak/backend/migrations/core/056_add_role_permissions_table.js:46`)
  grants `super_admin` `permissions.map(p => p.name)` — literally every
  row that exists in the `permissions` table at migration time — so even
  `super_admin` can only ever hold a permission that was actually seeded.
- Migration `117_add_projects.js` (which introduces the Projects feature
  and the `events.manage`-gated routes) never inserts a row named
  `events.manage` into `permissions`, and no later migration does either.

Confirmed directly against the running Backstage: the seeded
administrator's role holds all 45 seeded permissions, and `events.manage`
is not one of them:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select count(*) from permissions;"
 count
-------
    45
(1 row)

$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select count(*) from role_permissions where role_id = 1;"
 count
-------
    45
(1 row)

$ curl -s -i -X POST http://localhost:3100/api/admin/projects \
    -H "Content-Type: application/json" -b <seeded-admin-cookie-jar> \
    -d '{"name":"x","customerAccountId":3}'

HTTP/1.1 403 Forbidden
{"error":"Insufficient permissions","code":"FORBIDDEN"}
```

The 403 is not a scoping choice (e.g. "only a dedicated project-manager
role may do this") — it is unconditional, because no role in the seed
data, including `super_admin`, can ever be granted a permission that was
never inserted into the `permissions` table. As delivered, no admin user
of the pinned fork can create, update, or relink a Project, or attach an
event to one, through the routes upstream provides. This is exactly the
"upstream models/behaves differently than the PRD assumes" case this AC
calls out to be written up rather than silently patched (e.g. by editing
the vendored route to require an existing permission, or by hand-seeding
a permission row upstream never shipped) — no such workaround is applied
here, or anywhere in this repository's non-vendored code.

### Reproducing the requirement without patching the vendored fork

Because the create route cannot be exercised as delivered, the Project
record was created directly against the running Backstage's own
database — `backstage-db`, the same Postgres instance the admin API
reads from, not a separate or mocked store — and then read back through
the admin API's working read routes (`events.view`, which *is* seeded,
gates those) to confirm the API surfaces the FK-backed relationship
correctly:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -c "
insert into projects (name, customer_account_id, status, created_at, updated_at)
values ('AC-17.1.2 Verification Project', 3, 'active', now(), now())
returning id, name, customer_account_id, status, created_at, updated_at;"

 id |              name              | customer_account_id | status |          created_at           |          updated_at
----+--------------------------------+---------------------+--------+-------------------------------+-------------------------------
  1 | AC-17.1.2 Verification Project |                   3 | active | 2026-07-31 19:38:56.522096+00 | 2026-07-31 19:38:56.522096+00
(1 row)

$ curl -s -i http://localhost:3100/api/admin/projects/1 -b <seeded-admin-cookie-jar>

HTTP/1.1 200 OK
{"project":{"id":1,"name":"AC-17.1.2 Verification Project","customerAccountId":3,"customerEmail":"ac17-1-1-client@example.com","status":"active","createdAt":"2026-07-31T19:38:56.522Z","updatedAt":"2026-07-31T19:38:56.522Z"}}

$ curl -s -i http://localhost:3100/api/admin/projects -b <seeded-admin-cookie-jar>

HTTP/1.1 200 OK
{"projects":[{"id":1,"name":"AC-17.1.2 Verification Project","customerAccountId":3,"customerEmail":"ac17-1-1-client@example.com","status":"active","eventCount":0,"createdAt":"2026-07-31T19:38:56.522Z","updatedAt":"2026-07-31T19:38:56.522Z"}]}
```

`customer_account_id: 3` in the row is the exact `customer_accounts.id`
created and verified in AC-17.1.1
(`ac17-1-1-client@example.com` / Ada Testclient), and the API response
resolves that foreign key to `customerEmail:
"ac17-1-1-client@example.com"` — the same Client, read back through the
Project. The relationship is enforced by the database (a
`customer_account_id` referencing a nonexistent row would be rejected by
the FK constraint shown above), not merely assumed by application code.

AC-17.1.2 is satisfied on the data-model question the AC asks about — a
Project was created in the running Backstage, linked to the AC-17.1.1
Client via a real Postgres foreign key, and reading the Project back
(through the admin API's working read path) shows that Client. The
create/relink *routes* upstream provides are separately confirmed broken
for every role by a missing permission seed, which is recorded above per
this AC's explicit instruction to write up rather than work around.

## AC-17.1.3.1 — Gallery creation inside the Project

`US-17` AC-17.1.3.1 requires proof that a Gallery record can be created
inside the Project from AC-17.1.2 through the interface upstream
provides, that reading it back returns it with the values it was created
with, and that the creation route, the resulting database row, and the
column carrying the Project association are all recorded here. It also
requires that any place upstream names or models the Gallery differently
than the PRD assumes — as an event, a share, or a collection — be written
up rather than worked around.

### Upstream does not have a "Gallery" object — it has an Event

The PRD's Gallery is, in the pinned fork, the `events` table and the
`/api/admin/events` route family. There is no separate "gallery" or
"collection" model: the object that holds a set of client-facing photos,
a share link/password, an expiry, and download/branding settings is
created, read, updated, and deleted entirely through
`vendor/picpeak/backend/src/routes/adminEvents.js`, and the row it writes
is `events`. This is exactly the "upstream models the Gallery
differently than the PRD assumes" case this AC calls out to be written
up rather than silently worked around by, for example, pretending a
differently-named table is "the Gallery" without saying so. (This
terminology substitution — PicPeak's internal `Event` object presented
to users as "Gallery" — is also the subject of `US-18` AC-18.6's planned
terminology mapping; this AC records the fact independently, from the
create/persist evidence, rather than deferring to that later document.)

### Creation route used: `POST /api/admin/events`

Unlike AC-17.1.2's Project routes, event creation *is* reachable by the
seeded administrator: `POST /api/admin/events` is gated by
`requirePermission('events.create')`
(`vendor/picpeak/backend/src/routes/adminEvents.js:330`), and
`events.create` is one of the five `events.*` permissions the seed
migration actually inserts
(`vendor/picpeak/backend/migrations/core/055_add_permissions_table.js:50`,
distinct from the never-seeded `events.manage` that blocks the Project
routes documented under AC-17.1.2 above). The route is reached at
`/api/admin/events` via `vendor/picpeak/backend/server.js:638`
(`app.use('/api/admin', adminRoutes)`) →
`vendor/picpeak/backend/src/routes/admin.js:9` (`const eventsRoutes =
require('./adminEvents')`) →
`vendor/picpeak/backend/src/routes/admin.js:22` (`router.use('/events',
eventsRoutes)`) — not through `adminEventRename.js`, which is mounted at
the same `/api/admin/events` prefix one line later
(`vendor/picpeak/backend/server.js:652`) but only handles the
`/:eventId/rename` and `/:eventId/validate-rename` sub-paths.

Exercised live against the running Backstage
(`docker compose --profile backstage`, per `BACKSTAGE_STARTUP.md`), signed
in as the seeded administrator:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X POST http://localhost:3100/api/admin/events \
    -H "Content-Type: application/json" \
    -d '{
      "event_type": "wedding",
      "event_name": "AC-17.1.3.1 Verification Gallery",
      "event_date": "2026-09-01",
      "customer_name": "Ada Testclient",
      "customer_email": "ac17-1-1-client@example.com",
      "admin_email": "admin@example.com",
      "password": "Verify-Pass-123",
      "require_password": true,
      "expiration_days": 30
    }'

HTTP/1.1 200 OK
{"id":3,"slug":"wedding-ac-17-1-3-1-verification-gallery-2026-09-01","event_name":"AC-17.1.3.1 Verification Gallery","event_type":"wedding","customer_name":"Ada Testclient","customer_email":"ac17-1-1-client@example.com","require_password":true,"photo_cap":null,"is_draft":true,"share_link":"/gallery/wedding-ac-17-1-3-1-verification-gallery-2026-09-01/055982d1780c5503f2de1d1370497ffb","expires_at":"2026-10-01T00:00:00.000Z","created_at":"2026-07-31T19:58:51.616Z"}
```

The route returns `200 OK` (not `201`), which the code confirms is by
design, not an oversight — `adminEvents.js`'s create handler ends its
success path with a plain `res.json(...)`, unlike `adminProjects.js`'s
create handler (`successResponse(res, { project }, 201, ...)`, cited
under AC-17.1.2), so this is upstream's own inconsistency, not this
audit's.

### The resulting database row

The row that create route wrote, read straight out of the running
Backstage's own Postgres rather than through the API that created it:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -x \
    -c "select id, slug, event_name, event_type, event_date, customer_name, customer_email, \
        require_password, expires_at, is_draft, is_active, project_id from events where id = 3;"

-[ RECORD 1 ]----+----------------------------------------------------
id               | 3
slug             | wedding-ac-17-1-3-1-verification-gallery-2026-09-01
event_name       | AC-17.1.3.1 Verification Gallery
event_type       | wedding
event_date       | 2026-09-01
customer_name    | Ada Testclient
customer_email   | ac17-1-1-client@example.com
require_password | t
expires_at       | 2026-10-01 00:00:00+00
is_draft         | t
is_active        | t
project_id       | 1
```

The table is `events`, the primary key is `events.id = 3`, and the column
carrying the Project association is `events.project_id` (= 1, the
AC-17.1.2 Project). Every value the Gallery was created with above
survives into the row unchanged.

### The Project association is a real Postgres foreign key: `events.project_id`

Migration `117_add_projects.js` (the same migration that adds `projects`,
cited under AC-17.1.2) also adds `events.project_id`, a nullable column
carrying an actual foreign-key constraint to `projects.id`
(`vendor/picpeak/backend/migrations/core/117_add_projects.js:41-47`, `ON
DELETE SET NULL`), confirmed directly from the running Backstage
database:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -c "\d events" | grep -A1 project_id
 project_id                   | integer                  |           |          |
Foreign-key constraints:
    "events_project_id_foreign" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
```

### The admin route to attach the Gallery to the Project hits the same AC-17.1.2 defect

`POST /api/admin/events` does not accept a `project_id` field in its body
— there is no `project_id` reference anywhere in
`adminEvents.js`. The only admin-facing route that assigns an event to a
project is `POST /api/admin/projects/:id/events`
(`vendor/picpeak/backend/src/routes/adminProjects.js:73-78`), and it is
gated by the same `requirePermission('events.manage')` documented as
unconditionally unreachable by any role under AC-17.1.2 above (no
`events.manage` permission is ever seeded). Confirmed live, against the
Gallery created above:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X POST http://localhost:3100/api/admin/projects/1/events \
    -H "Content-Type: application/json" -d '{"eventId": 3}'

HTTP/1.1 403 Forbidden
{"error":"Insufficient permissions","code":"FORBIDDEN"}
```

This is not a new defect — it is the same missing `events.manage`
permission already recorded under AC-17.1.2, now shown to also block the
attach-Gallery-to-Project route, so no new workaround-avoidance write-up
is needed beyond a cross-reference: the finding, and the decision not to
patch the vendored fork or hand-seed the permission, both already stand
as recorded there.

### Reproducing the requirement without patching the vendored fork

The Gallery's `project_id` was set directly against the running
Backstage's own database — the same `backstage-db` Postgres instance the
admin API reads from — and then read back through the admin API's
working read routes (`events.view`, which *is* seeded) to confirm the API
surfaces the FK-backed relationship correctly:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "update events set project_id = 1 where id = 3;"
UPDATE 1

$ curl -s -i -b <seeded-admin-cookie-jar> http://localhost:3100/api/admin/events/3

HTTP/1.1 200 OK
{"id":3,"slug":"wedding-ac-17-1-3-1-verification-gallery-2026-09-01","event_type":"wedding","event_name":"AC-17.1.3.1 Verification Gallery", ... ,"project_id":1, ... ,"customer_name":"Ada Testclient","customer_email":"ac17-1-1-client@example.com","customer_phone":null}

$ curl -s -i -b <seeded-admin-cookie-jar> http://localhost:3100/api/admin/projects/1/overview

HTTP/1.1 200 OK
{"project":{"id":1,"name":"AC-17.1.2 Verification Project", ... },"events":[ ... ,{"id":3,"event_name":"AC-17.1.3.1 Verification Gallery","event_date":"2026-09-01T00:00:00.000Z","slug":"wedding-ac-17-1-3-1-verification-gallery-2026-09-01","is_active":true,"is_draft":true,"expires_at":"2026-10-01T00:00:00.000Z","is_archived":false}, ... ],"emails":[],"quotes":[],"contracts":[],"invoices":[],"hours":{"entries":[],"totalMinutes":0},"milestones":[]}
```

Every value the Gallery was created with — `event_name`, `event_type`,
`customer_name`/`customer_email` (the AC-17.1.1 Client), `require_password`,
`expires_at`, `share_link` — reads back unchanged through
`GET /api/admin/events/3`, and `project_id: 1` resolves through
`GET /api/admin/projects/1/overview` to the exact AC-17.1.2 Project,
listing this Gallery in its `events` array. The relationship is enforced
by the database (a `project_id` referencing a nonexistent row would be
rejected by the FK constraint shown above), not merely assumed by
application code.

AC-17.1.3.1 is satisfied: a Gallery — upstream's `events` row — was
created inside the AC-17.1.2 Project through the real
`POST /api/admin/events` create route (unlike Project creation, this
route is not blocked by the `events.manage` defect), and reading it back
through the admin API returns every value it was created with, including
its Project association via the FK-backed `events.project_id` column.
The one admin-facing route that would have performed the Project
attachment itself, `POST /api/admin/projects/:id/events`, is separately
confirmed blocked by the same missing-permission defect already recorded
under AC-17.1.2, so that link was made the same way AC-17.1.2 made its
own — directly against the database — rather than by patching the
vendored fork.

## AC-17.1.3.2 — the Project-to-Gallery direction resolves

`US-17` AC-17.1.3.2 requires proof of the reverse of AC-17.1.3.1's
direction: not "does the Gallery point at the Project" but "does opening
or querying the Project list the Gallery." The exact query used, and its
output, are recorded here.

### The query used: `GET /api/admin/projects/1/overview`

This is the same admin-facing Project route already cited under
AC-17.1.3.1 — `router.get('/:id/overview')`
(`vendor/picpeak/backend/src/routes/adminProjects.js:83`), gated on the
seeded `events.view` permission
(`vendor/picpeak/backend/src/routes/adminProjects.js:83`), so it is
reachable by the seeded administrator without patching the vendored fork
or hand-seeding a permission. It was run against the same running
Backstage, the same AC-17.1.2 Project (`id: 1`), and the same AC-17.1.3.1
Gallery (`events.id = 3`, `project_id = 1`) already established above —
no new record was created for this AC.

### The output

```
$ curl -s -i -b <seeded-admin-cookie-jar> http://localhost:3100/api/admin/projects/1/overview

HTTP/1.1 200 OK
{"project":{"id":1,"name":"AC-17.1.2 Verification Project", ... },"events":[ ... ,{"id":3,"event_name":"AC-17.1.3.1 Verification Gallery","event_date":"2026-09-01T00:00:00.000Z","slug":"wedding-ac-17-1-3-1-verification-gallery-2026-09-01","is_active":true,"is_draft":true,"expires_at":"2026-10-01T00:00:00.000Z","is_archived":false}, ... ],"emails":[],"quotes":[],"contracts":[],"invoices":[],"hours":{"entries":[],"totalMinutes":0},"milestones":[]}
```

The response's top-level `project` object is the AC-17.1.2 Project
(`id: 1`, `name: "AC-17.1.2 Verification Project"`), and its `events`
array — the field upstream uses in place of a "galleries" field, per the
Event-not-Gallery naming already recorded under AC-17.1.3.1 — lists the
AC-17.1.3.1 Gallery (`id: 3`, `event_name: "AC-17.1.3.1 Verification
Gallery"`) by its own id and name, not merely by a bare foreign key
value. Querying the Project therefore surfaces the Gallery directly,
without a second round trip back through the Gallery's own `project_id`.

### Verdict

AC-17.1.3.2 is satisfied: the Project-to-Gallery direction resolves.
Opening the AC-17.1.2 Project through its own overview route lists the
AC-17.1.3.1 Gallery in the `events` array the route returns, proving the
association is readable from both ends — Gallery-to-Project (recorded
under AC-17.1.3.1) and Project-to-Gallery (recorded here) — through
routes upstream provides as delivered, with no vendored route patched
and no permission hand-seeded.

## AC-17.1.3.3 — the Gallery-to-Project-to-Client direction resolves

`US-17` AC-17.1.3.3 requires proof that opening or querying the
AC-17.1.3.1 Gallery identifies both its AC-17.1.2 Project and the owning
AC-17.1.1 Client. It also requires that if the Client is only reachable
by a second lookup through the Project — rather than directly from the
Gallery — that shape be recorded honestly rather than worked around.

### The query used: `GET /api/admin/events/3`

This is the same admin-facing Gallery route already cited under
AC-17.1.3.1 — `router.get('/:id', adminAuth, requirePermission('events.view'), ...)`
(`vendor/picpeak/backend/src/routes/adminEvents.js:966`), gated on the
seeded `events.view` permission. It was run against the same running
Backstage, the same AC-17.1.3.1 Gallery (`events.id = 3`), the same
AC-17.1.2 Project (`projects.id = 1`), and the same AC-17.1.1 Client
(`customer_accounts.id = 3`, Ada Testclient) already established above —
no new Gallery, Project, or Client record was created for this AC.

### Both directions resolve from that one query

```
$ curl -s -b <seeded-admin-cookie-jar> http://localhost:3100/api/admin/events/3

HTTP/1.1 200 OK
{
 "id": 3,
 "event_name": "AC-17.1.3.1 Verification Gallery",
 "project_id": 1,
 "customer_accounts": [
  {"id": 3, "email": "ac17-1-1-client@example.com",
   "display_name": null, "first_name": "Ada", "last_name": "Testclient"}
 ],
 "customer_name": "Ada Testclient",
 "customer_email": "ac17-1-1-client@example.com"
}
```

- **Project** — `project_id: 1` on the Gallery row itself is the
  AC-17.1.2 Project, carried by the real `events.project_id` foreign key
  to `projects.id` documented under AC-17.1.3.1.
- **Client** — `customer_accounts[0].id: 3` is the AC-17.1.1 Client,
  hydrated by `customerAccountsService.getAssignmentsForEvent`
  (`vendor/picpeak/backend/src/routes/adminEvents.js:1020-1021`) from the
  many-to-many join table `event_customer_assignments`
  (`vendor/picpeak/backend/migrations/core/090_add_customer_accounts.js:105-115`
  — FK to `events.id`, FK to `customer_accounts.id`, unique on the pair).

So the Client **is** reachable directly from the Gallery in a single
query; it does not require a second lookup through the Project. The join
row backing it, read straight out of the running Backstage's Postgres:

```
$ docker compose exec -T backstage-db psql -U backstage -d backstage \
    -c "select id, event_id, customer_account_id, assigned_by_admin_id \
        from event_customer_assignments order by id;"

 id | event_id | customer_account_id | assigned_by_admin_id
----+----------+---------------------+----------------------
  1 |        2 |                   3 |                    1
  2 |        3 |                   3 |                    1
(2 rows)
```

(Row 1 belongs to `events.id = 2`, an earlier verification Gallery in the
same Project from the AC-17.1.3 run before the AC was split; row 2 is the
AC-17.1.3.1 Gallery this AC is about.)

### Finding: the Gallery→Client link is NOT inherited from the Project — it must be assigned explicitly

Immediately after AC-17.1.3.1 created `events.id = 3` inside the
AC-17.1.2 Project, the same `GET /api/admin/events/3` returned
`"customer_accounts": []` — the Gallery knew its Project, but not its
Client, even though that Project already carried
`projects.customer_account_id = 3` (the AC-17.1.1 Client, recorded under
AC-17.1.2). Creating a Gallery inside a Project does **not** propagate
the Project's Client into `event_customer_assignments`: the create
handler only writes assignments when the request body carries
`customer_account_ids` (`adminEvents.js:419-420` validator,
`adminEvents.js:720-727` → `customerAccountsService.setAssignmentsForEvent`,
`vendor/picpeak/backend/src/services/customerAccountsService.js:840`), and
AC-17.1.3.1's create call did not send that field.

The link was then established through upstream's own supported edit
route — `router.put('/:id', adminAuth, requirePermission('events.edit'), ...)`
(`adminEvents.js:1129`), which consumes `customer_account_ids` at
`adminEvents.js:1471-1478` via the same `setAssignmentsForEvent`:

```
$ curl -s -b <seeded-admin-cookie-jar> -X PUT http://localhost:3100/api/admin/events/3 \
    -H "Content-Type: application/json" \
    -d '{"event_name":"AC-17.1.3.1 Verification Gallery","customer_account_ids":[3]}'

HTTP/1.1 200 OK
{"message":"Event updated successfully"}
```

No vendored route was patched and no `event_customer_assignments` row was
hand-seeded into the database: the assignment was made by the upstream
admin route, as the photographer would from the "Manage galleries"
dialog.

The consequence for Earth & Honey is a real one and is recorded rather
than smoothed over: **a Gallery created inside a Project has no client
association until someone assigns it**, so any later workflow that reads
the owning Client off a Gallery (delivery emails, client-portal access,
billing) cannot assume it is populated just because the Project has a
Client. This is raised to the Product Owner under AC-17.9 rather than
patched here.

### Finding: `PUT /api/admin/events/:id` 500s when `customer_account_ids` is the only field sent

Sending the assignment on its own fails:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X PUT http://localhost:3100/api/admin/events/3 \
    -H "Content-Type: application/json" -d '{"customer_account_ids":[3]}'

HTTP/1.1 500 Internal Server Error
{"error":"Failed to update event"}
```

Backend log:

```
Error updating event: Error: Empty .update() call detected! Update data does
not contain any values to update. This will result in a faulty query.
Table: events. Columns: .
    at async /app/src/routes/adminEvents.js:1464:5
```

The cause is upstream's own code, not this environment:
`customer_account_ids` is not a column on `events`, so the handler
deletes it from the update payload (`adminEvents.js:1336`) before running
`db('events').where('id', id).update(updates)` (`adminEvents.js:1464-1466`).
When it was the only field in the body, `updates` is left empty and knex
throws — and because the throw happens *before* the assignment block at
`adminEvents.js:1471`, the assignment the caller asked for is silently
not made either. Any other real column in the same body (above:
`event_name`, re-sent with its existing value) avoids it, which is why
the bundled admin UI — which submits the whole edit form — never hits it.
Recorded here as an upstream defect; not worked around in the vendored
fork.

### The second lookup through the Project also resolves (and is FK-backed)

Independently of the direct assignment, the Client is *also* reachable by
the second lookup this AC anticipated — `GET /api/admin/events/3` →
`project_id` → the Project's own `customer_account_id`, read through the
same `GET /api/admin/projects/1/overview` route cited under AC-17.1.3.2:

```
$ curl -s -b <seeded-admin-cookie-jar> http://localhost:3100/api/admin/projects/1/overview

HTTP/1.1 200 OK
{"project":{"id":1,"name":"AC-17.1.2 Verification Project",
            "customerAccountId":3,"customerEmail":"ac17-1-1-client@example.com", ...}, ...}
```

`project.customerAccountId: 3` is the same AC-17.1.1 Client, resolved
through the `projects.customer_account_id` foreign key documented under
AC-17.1.2. Both paths agree on `customer_accounts.id = 3`.

### Note: the Gallery's own `customer_name`/`customer_email` are not a reference

`GET /api/admin/events/3` also returns `customer_name: "Ada Testclient"`
and `customer_email: "ac17-1-1-client@example.com"`. These are **not**
the Client link: they are free-text columns on `events` itself, read via
`mapEventForApi` (`adminEvents.js:215-237`), copied from the create
request body under AC-17.1.3.1, with no foreign key to
`customer_accounts` and no constraint tying them to the real Client row.
They match here only because that is what was typed at creation time; a
typo, or a later change to the Client's email, would leave them silently
stale. The resolvable Client reference is `customer_accounts[]` (via
`event_customer_assignments`), not these fields.

### Verdict

AC-17.1.3.3 is satisfied. A single query on the AC-17.1.3.1 Gallery,
`GET /api/admin/events/3`, identifies its AC-17.1.2 Project directly
(`project_id: 1`) and the owning AC-17.1.1 Client directly
(`customer_accounts[0].id: 3`, FK-backed through
`event_customer_assignments`) — no second lookup is required for either.
The actual upstream shape is recorded rather than worked around: that
Client link is not inherited when a Gallery is created inside a Project
and has to be assigned explicitly through the upstream edit route, and
that route 500s when `customer_account_ids` is the only field sent. Both
are upstream behaviours, written up here and raised to the Product Owner
under AC-17.9 rather than patched in the vendored fork.

## AC-17.2 — batch image upload and processing

This AC was proven live on 2026-07-31 against the running Backstage
(`docker compose --profile backstage`, per `BACKSTAGE_STARTUP.md`), uploading
into the AC-17.1.3.1 Gallery (`events.id = 3`,
`wedding-ac-17-1-3-1-verification-gallery-2026-09-01`). Three real JPEGs
already committed to this repo (`public/photobuddy/img/`) were used so the
proof is against genuine image content, not synthetic test fixtures — no
project code was written for this AC; it is a live-verification exercise like
AC-17.1.1 through AC-17.1.3.3.

### Upload route used, and that it is reachable

```
POST /api/admin/photos/3/upload   (multipart, field name "photos", 3 files)
```

Handler: `vendor/picpeak/backend/src/routes/adminPhotos.js:131`, gated on
`adminAuth`, `requirePermission('photos.upload')`,
`requireEventOwnership`. `photos.upload` is seeded for `super_admin` (all
permissions — `vendor/picpeak/backend/migrations/core/056_add_role_permissions_table.js:46`)
and explicitly listed for `admin`/`editor`
(`vendor/picpeak/backend/migrations/core/056_add_role_permissions_table.js:51,73`),
naming the permission at
`vendor/picpeak/backend/migrations/core/055_add_permissions_table.js:57`
— unlike AC-17.1.2's `events.manage`, this one really is granted, and the
call below succeeds as the seeded administrator with no permission gap to
record.

```
$ curl -s -b <seeded-admin-cookie-jar> -X POST http://localhost:3101/api/admin/photos/3/upload \
    -F "photos=@public/photobuddy/img/about_img.jpg;type=image/jpeg" \
    -F "photos=@public/photobuddy/img/slide/4.jpg;type=image/jpeg" \
    -F "photos=@public/photobuddy/img/gallery/8.jpg;type=image/jpeg"

HTTP 202
{"upload_id":"4c92fefb376f95c287f272a202b71227","count":3,
 "photo_ids":[1,2,3],"message":"Successfully 3 queued", ...}
```

The route returns `202 Accepted` immediately and queues the files for
background processing (`adminPhotos.js:303-313`) — the pinned fork does not
process synchronously in the request/response cycle.

### Processing completes for every uploaded file

```
$ curl -s -b <seeded-admin-cookie-jar> \
    http://localhost:3101/api/admin/photos/uploads/4c92fefb376f95c287f272a202b71227/status

{"upload_id":"4c92fefb...","event_id":3,"total":3,
 "pending":0,"processing":0,"complete":3,"failed":0,
 "photos":[{"id":1,...,"status":"complete"},
           {"id":2,...,"status":"complete"},
           {"id":3,...,"status":"complete"}]}
```

All three photos reached `processing_status = 'complete'` (polled 5s after
upload) via the background worker's `processPhoto`
(`vendor/picpeak/backend/src/services/photoProcessor.js:418-508`), not the
upload handler itself.

### Every original is stored in R2 exactly once, byte-identical to the source

```
$ aws s3api list-objects-v2 --endpoint-url $R2_ENDPOINT --bucket $R2_BUCKET \
    --prefix "backstage/events/active/wedding-ac-17-1-3-1-verification-gallery-2026-09-01/"

backstage/events/active/.../AC-17.1.3.1_Verification_Galle_individual_0001.jpg   15539
backstage/events/active/.../AC-17.1.3.1_Verification_Galle_individual_0002.jpg   64450
backstage/events/active/.../AC-17.1.3.1_Verification_Galle_individual_0003.jpg    5440
```

Exactly one object per uploaded file, at the key computed once in
`photoProcessor.js` / `adminPhotos.js:343` (`events/active/<slug>/<filename>`)
and never rewritten by processing (the worker only ever reads the original
back via `withLocalCopy`, `imageProcessor.js:229-242` — it does not
re-`put` it). A round-trip download of photo 1's object and a SHA-256
comparison against the original source file confirms the stored original is
unmodified, not merely same-sized:

```
$ shasum -a 256 <downloaded R2 object> public/photobuddy/img/about_img.jpg
97e2eeb6bb8fe9939f4dc4f1600bd053175942bf9152d56dc0652745d6b7f416  <downloaded>
97e2eeb6bb8fe9939f4dc4f1600bd053175942bf9152d56dc0652745d6b7f416  public/photobuddy/img/about_img.jpg
```

### Derivative sizes: one is eager, two more exist but are lazy — recorded honestly

The pinned fork's `imageProcessor.js` defines three derivative tiers:
thumbnail (`generateThumbnail`, line 126), hero (`generateHeroImage`, line
368), and lightbox preview (`generatePreviewImage`, line 500). But
`processPhoto` — the only code path the background worker runs for every
uploaded photo (`photoProcessor.js:459-475`) — calls `generateThumbnail` and
extracts `sharp(...).metadata()` for width/height; it never calls
`generateHeroImage` or `generatePreviewImage`. Confirmed by absence: neither
name appears anywhere in `photoProcessor.js`.

So, as actually delivered, **only the thumbnail is produced automatically by
upload processing**. This was verified directly — immediately after all
three photos reached `complete`, `hero_path` and `preview_path` were both
`NULL` on every row, while `thumbnail_path` was populated for all three:

```
$ psql ... -c "select id, thumbnail_path, hero_path, preview_path from photos where event_id=3;"
 id |                thumbnail_path                 | hero_path | preview_path
----+------------------------------------------------+-----------+--------------
  1 | thumbnails/thumb_e37d8201_..._0001.jpg          |           |
  2 | thumbnails/thumb_dfe11154_..._0002.jpg          |           |
  3 | thumbnails/thumb_a36bde16_..._0003.jpg          |           |
```

The thumbnail derivative was confirmed present in R2 (one object per photo
under `backstage/thumbnails/`, e.g. `thumb_e37d8201_..._0001.jpg`, 4967
bytes) and correctly sized: the live `app_settings` row has
`thumbnail_fit = "cover"` (not the `imageProcessor.js:24` code comment's
`'inside'` default — that default is only used when no setting row exists;
migration seeding sets `cover`), and the downloaded thumbnail for photo 1
(source 950×534) measured exactly 300×300, matching `thumbnail_width` /
`thumbnail_height` in `app_settings`.

Hero and preview are not dead code — they are **lazy, on-demand**
derivatives, generated the first time something asks for them:
`ensureHeroImage` is only called from the client-facing gallery route
`GET /api/gallery/:slug/hero/:photoId`
(`vendor/picpeak/backend/src/routes/gallery.js:1384`, gated on
`verifyGalleryAccess` — the password/token flow AC-17.3 and AC-17.5 verify),
and `ensurePreviewImage` is only called from the equivalent lightbox route
(`gallery.js:1482-1485`) or the admin-triggered backfill endpoint
`POST /api/admin/thumbnails/regenerate-previews`
(`vendor/picpeak/backend/src/routes/adminThumbnails.js:200-246`).

To confirm the preview tier actually works (not just that it is wired up),
the admin backfill endpoint was called directly for this event:

```
$ curl -s -b <seeded-admin-cookie-jar> -X POST \
    http://localhost:3101/api/admin/thumbnails/regenerate-previews \
    -H "Content-Type: application/json" -d '{"eventId":3}'
{"message":"Started regenerating 3 previews","count":3}
```

All three rows picked up a `preview_path` within seconds, each backed by
exactly one new R2 object under `backstage/previews/` (e.g.
`preview_f20c5354_..._0002.jpg`, 10103 bytes). The preview for photo 2
(source 1920×1080, at the tier's 1920px long-edge cap) downloaded at
1920×1080 — aspect preserved, no upscale — confirming `generatePreviewImage`
(`imageProcessor.js:500-557`) works correctly when invoked. The hero tier
was not live-exercised in this AC because its only route requires the
client-facing gallery access flow that AC-17.3/AC-17.5 own; that it is wired
identically to preview (`ensureHeroImage`, same `withLocalCopy` +
`generate*` pattern, `imageProcessor.js:450-486`) is confirmed by reading the
code, not by a fabricated end-to-end run.

**Recorded honestly, not silently patched:** AC-17.2 asks that "the expected
derivative sizes are produced" as part of upload processing. As pinned, the
fork produces exactly one derivative eagerly (thumbnail); the other two
named tiers exist, are correctly implemented, and were confirmed to work
when actually triggered, but are not produced until something requests them.
This is not a defect to fix here — Fork Discipline forbids editing
`photoProcessor.js`'s vendored processing path — but it is a real gap
between what a reader of the PRD might assume ("processing produces the
derivatives") and what upload processing alone actually does. Raised to the
Product Owner under AC-17.9 rather than assumed away.

### Stored image record fields, checked against this AC's list

The `photos` table (`\d photos` against `backstage-db`) was checked field by
field against every attribute this AC names:

| AC-17.2 field   | Stored as                          | Present for photos 1–3? |
|-----------------|-------------------------------------|--------------------------|
| width           | `photos.width` (integer)             | Yes — 950, 1920, 350     |
| height          | `photos.height` (integer)            | Yes — 534, 1080, 262     |
| aspect ratio    | **not a stored column**              | No — see below           |
| format          | `photos.mime_type` (varchar)         | Yes — `image/jpeg` (×3)  |
| file size       | `photos.size_bytes` (integer)        | Yes — 15539, 64450, 5440 |
| processing state| `photos.processing_status` (varchar) | Yes — `complete` (×3)    |

**Recorded honestly:** there is no `aspect_ratio` column anywhere in the
pinned schema (confirmed by reading `\d photos` in full — the 37 columns
listed carry no such field, and no migration under
`vendor/picpeak/backend/migrations/` adds one). Aspect ratio is always a
derived value (`width / height`) computed by callers when needed, never
persisted. This is a genuine gap against the AC's literal wording ("stored
image records include ... aspect ratio") rather than a misreading — the
value the AC asks for is fully recoverable from the two columns that are
stored (width and height are both always populated together, per
`photoProcessor.js:467-473`), but it is not itself a stored field. Raised to
the Product Owner under AC-17.9 alongside the derivative-size finding above,
rather than silently treated as satisfied by the derivable value.

### Verdict

AC-17.2 is satisfied for the parts the pinned fork actually delivers: a
batch of three real images uploaded through the admin route processes to
`complete`, each original lands in R2 exactly once and byte-identical to its
source, and the `photos` row for each carries width, height, format
(`mime_type`), file size (`size_bytes`), and processing state
(`processing_status`). Two findings are recorded honestly rather than
patched or assumed away: only one derivative tier (thumbnail) is produced
eagerly by upload processing — hero and preview exist, are correctly
implemented, and were proven to work when explicitly triggered, but are
lazy — and aspect ratio is not a stored column, only a derivable value from
the two that are. Both are written up here and raised in
`scrum-master/po-requests.md` per AC-17.9, not silently decided.

## AC-17.3 — gallery password protection

`US-17` AC-17.3 requires proof that gallery protection works as upstream
delivers it: a password-protected Gallery refuses access without the
password, and grants it with the password. Exercised live against the
running Backstage (`docker compose --profile backstage`, per
`BACKSTAGE_STARTUP.md`), reusing the AC-17.1.3.1 Gallery (`events.id = 3`,
slug `wedding-ac-17-1-3-1-verification-gallery-2026-09-01`), which was
created with `require_password: true` and `password: "Verify-Pass-123"` —
no new Gallery was created for this AC.

### Publishing the Gallery so the public route is reachable

The AC-17.1.3.1 Gallery was created as a draft (`is_draft: true`), and the
client-facing gallery middleware (`verifyGalleryAccess`,
`vendor/picpeak/backend/src/middleware/gallery.js:20`) excludes drafts
from public access (`is_draft: formatBoolean(false)` in its non-admin-
preview query branch,
`vendor/picpeak/backend/src/middleware/gallery.js:40`). It was published
through the real admin
route, `POST /api/admin/events/:id/publish`
(`vendor/picpeak/backend/src/routes/adminEvents.js:1049`), rather than by
flipping the column directly in Postgres:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X POST http://localhost:3100/api/admin/events/3/publish

HTTP/1.1 200 OK
{"message":"Event published successfully","is_draft":false}
```

### The routes exercised

- **Password verification**: `POST /api/auth/gallery/verify`
  (`vendor/picpeak/backend/src/routes/auth.js:184`), mounted at
  `vendor/picpeak/backend/server.js:631`
  (`app.use('/api/auth', authRoutes)`). It looks up the event by `slug`,
  and when `require_password` is true, compares the supplied `password`
  against `event.password_hash` with `bcrypt.compare`
  (`vendor/picpeak/backend/src/routes/auth.js:231`). reCAPTCHA is checked
  first, but `verifyRecaptcha` (`vendor/picpeak/backend/src/services/recaptcha.js:24`)
  returns `true` unconditionally whenever the `security_enable_recaptcha`
  app setting is off — its default in this stack (unset), confirmed by
  the verify calls below succeeding with no `recaptchaToken` supplied.
- **Gated content**: `GET /api/gallery/:slug/photos`
  (`vendor/picpeak/backend/src/routes/gallery.js:216`), mounted at
  `vendor/picpeak/backend/server.js:635`
  (`app.use('/api/gallery', galleryRoutes)`), guarded by the
  `verifyGalleryAccess` middleware cited above. With no token, and the
  Gallery requiring one, it falls through to
  `vendor/picpeak/backend/src/middleware/gallery.js:62`
  (`return res.status(401).json({ error: 'No token provided' })`) without
  ever looking at a password.

### Refused without the password

```
$ curl -s -i http://localhost:3100/api/gallery/wedding-ac-17-1-3-1-verification-gallery-2026-09-01/photos

HTTP/1.1 401 Unauthorized
{"error":"No token provided"}
```

### Refused with the wrong password

```
$ curl -s -i -X POST http://localhost:3100/api/auth/gallery/verify \
    -H "Content-Type: application/json" \
    -d '{"slug":"wedding-ac-17-1-3-1-verification-gallery-2026-09-01","password":"totally-wrong"}'

HTTP/1.1 401 Unauthorized
{"error":"Invalid gallery or password"}
```

Read straight out of `backstage-db` rather than trusted on the HTTP
response alone, the wrong-password attempts were logged as failures
against this Gallery, not silently dropped:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select event_id, action, ip_address, timestamp from access_logs where event_id = 3 order by timestamp;"

 event_id |    action     |  ip_address  |           timestamp
----------+---------------+--------------+-------------------------------
        3 | login_fail    | 192.168.65.1 | 2026-07-31 20:57:32.215929+00
        3 | login_fail    | 192.168.65.1 | 2026-07-31 20:57:36.432331+00
        3 | login_success | 192.168.65.1 | 2026-07-31 20:57:36.755822+00
        3 | view          | 192.168.65.1 | 2026-07-31 20:57:40.454018+00
        3 | login_fail    | 192.168.65.1 | 2026-07-31 21:01:08.903074+00
        3 | login_fail    | 192.168.65.1 | 2026-07-31 21:01:09.22512+00
        3 | login_success | 192.168.65.1 | 2026-07-31 21:01:09.546363+00
        3 | view          | 192.168.65.1 | 2026-07-31 21:01:09.574542+00
        3 | view          | 192.168.65.1 | 2026-07-31 21:01:09.605455+00
(9 rows)
```

Every `login_fail` row is a wrong-password call and every `login_success`
row is a correct-password call, so the table is the whole AC read back out
of Postgres. There are more rows than a single pass produces because the
refuse/grant sequence was run twice against this Gallery: once at
`20:57` and again at `21:01`, when the recorded run was re-executed
verbatim to confirm it reproduces rather than describing a one-off. The
second pass returned byte-identical status codes and bodies to the first,
and the photos route returned the same three photo ids (`3, 2, 1`).

None of the repeated failures tripped the account lockout that
`checkAccountLockout` gates on in
`vendor/picpeak/backend/src/routes/auth.js:211` — the correct-password
attempt following each pair of failures still succeeded, so the refusals
recorded here are genuine password refusals and not a lockout masquerading
as one.

### Granted with the correct password

```
$ curl -s -i -c <gallery-cookie-jar> -X POST http://localhost:3100/api/auth/gallery/verify \
    -H "Content-Type: application/json" \
    -d '{"slug":"wedding-ac-17-1-3-1-verification-gallery-2026-09-01","password":"Verify-Pass-123"}'

HTTP/1.1 200 OK
Set-Cookie: gallery_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax
Set-Cookie: gallery_token_wedding-ac-17-1-3-1-verification-gallery-2026-09-01=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax

{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","event":{"id":3,"event_name":"AC-17.1.3.1 Verification Gallery","event_type":"wedding","event_date":"2026-09-01T00:00:00.000Z","welcome_message":"","color_theme":null,"expires_at":"2026-10-01T00:00:00.000Z","allow_user_uploads":false,"upload_category_id":null,"require_password":true,"photo_cap":null}}
```

The issued token is a JWT signed with `issuer: 'picpeak-auth'`
(`vendor/picpeak/backend/src/routes/auth.js:261-270`) carrying
`eventId: 3`, and is set both as a generic `gallery_token` cookie and a
per-slug `gallery_token_<slug>` cookie
(`setGalleryAuthCookies`, `vendor/picpeak/backend/src/utils/tokenUtils.js:130`,
cookie name from `vendor/picpeak/backend/src/utils/tokenUtils.js:2`).

The same cookie jar then grants access to the previously-refused route:

```
$ curl -s -i -b <gallery-cookie-jar> http://localhost:3100/api/gallery/wedding-ac-17-1-3-1-verification-gallery-2026-09-01/photos

HTTP/1.1 200 OK
{"event":{"id":3,"event_name":"AC-17.1.3.1 Verification Gallery", ... },"categories":[],"photos":[{"id":3, ... },{"id":2, ... },{"id":1, ... }]}
```

`getGalleryTokenFromRequest`
(`vendor/picpeak/backend/src/utils/tokenUtils.js:176`) is what reads the
`gallery_token` cookie back out of the request inside `verifyGalleryAccess`
(line 193-194), and the three photos returned are the AC-17.2 batch upload
— no new photos were uploaded for this AC.

### Verdict

AC-17.3 is satisfied: the AC-17.1.3.1 password-protected Gallery refuses
`GET /api/gallery/:slug/photos` with no token at all (`401`, "No token
provided"), refuses `POST /api/auth/gallery/verify` with the wrong
password (`401`, "Invalid gallery or password", and the failure is
recorded in `access_logs`), and grants access — both a JWT from the verify
call and, using that token, the previously-refused photos route returning
`200` with the Gallery's real photo list — once the correct password is
supplied. All three behaviours were exercised live against the running
Backstage, not inferred from reading the vendored source alone, and the
whole sequence was run a second time with identical results to show it
reproduces. Nothing in upstream's password gate had to be modified,
patched, or worked around to make this AC pass.

## AC-17.4.1.1.1.1.1.1 — expiry search: terms, commands, and hit counts

`US-17` AC-17.4.1.1.1.1.1.1 requires a re-runnable search for expiry-related
code across the pinned PicPeak fork, with the exact commands and their hit
counts recorded so the volume of output the next two criteria work from is
fixed and checkable. This criterion does not extract names or classify
anything found — that is deferred to the criteria that follow. It is a
code-level finding: no live Backstage instance was started or used.

### Pinned commit searched

`vendor/picpeak/` is held at the same pin recorded in `PICPEAK_UPSTREAM.md`
and `vendor/README.md`:

```
Upstream: https://github.com/PicPeak/picpeak
Pinned commit: eb263137b98935754155824de2a03848121304b6
```

The upstream `.git` history is deliberately not vendored (per
`vendor/README.md`), so "against the pinned commit" means the working tree
at `vendor/picpeak/` as committed in this repository. Confirmed clean before
running any search below — no local modification to the searched
directories that would make the results diverge from the pin:

```
$ git status --porcelain -- vendor/picpeak/backend/src vendor/picpeak/backend/migrations
(no output — clean)
```

### Search terms

The minimum set this AC requires, plus no further term — the six below are
sufficient to size the next two criteria's input without widening scope
beyond what the AC asks for:

`expir`, `expires_at`, `expiry`, `ttl`, `valid_until`, `lifetime`

### Directories searched and file-type filter

- **Backend source directory**: `vendor/picpeak/backend/src`
- **Migration directory**: `vendor/picpeak/backend/migrations`
- **File-type filter**: `*.js` — the only source-code extension present in
  either directory (confirmed by `find vendor/picpeak/backend/src -type f`
  and `find vendor/picpeak/backend/migrations -type f`, each returning only
  `.js` files plus incidental `.md` docs, which the filter excludes).

### Exact commands and recorded hit counts

Each command below is `grep -rIn --include="*.js" -i -- "<term>" <src-dir>
<migrations-dir>`, run from the repository root, with `wc -l` giving the
matching-line count. `-r` recurses, `-I` skips binary files, `-n` prints
line numbers (irrelevant to the count itself, kept so the command matches
what the next criterion will actually run when it reads the matched lines),
`-i` is case-insensitive (so `Expiry`, `EXPIRES_AT`, etc. are not missed),
and `--` stops option parsing so a term is never misread as a flag.

```
$ grep -rIn --include="*.js" -i -- "expir" vendor/picpeak/backend/src vendor/picpeak/backend/migrations | wc -l
697

$ grep -rIn --include="*.js" -i -- "expires_at" vendor/picpeak/backend/src vendor/picpeak/backend/migrations | wc -l
238

$ grep -rIn --include="*.js" -i -- "expiry" vendor/picpeak/backend/src vendor/picpeak/backend/migrations | wc -l
87

$ grep -rIn --include="*.js" -i -- "ttl" vendor/picpeak/backend/src vendor/picpeak/backend/migrations | wc -l
81

$ grep -rIn --include="*.js" -i -- "valid_until" vendor/picpeak/backend/src vendor/picpeak/backend/migrations | wc -l
47

$ grep -rIn --include="*.js" -i -- "lifetime" vendor/picpeak/backend/src vendor/picpeak/backend/migrations | wc -l
1
```

For readers who want the source/migration split, the same six commands
scoped to one directory at a time give:

| Term | `backend/src` hits | `backend/migrations` hits | Combined (above) |
|---|---|---|---|
| `expir` | 439 | 258 | 697 |
| `expires_at` | 144 | 94 | 238 |
| `expiry` | 38 | 49 | 87 |
| `ttl` | 79 | 2 | 81 |
| `valid_until` | 45 | 2 | 47 |
| `lifetime` | 1 | 0 | 1 |

(Each split figure is the same command with a single directory argument in
place of both, e.g. `grep -rIn --include="*.js" -i -- "expir"
vendor/picpeak/backend/src | wc -l` → `439`.)

### A known property of substring matching, recorded for the reader, not classified

`expir` matches every inflection of "expire" (`expires`, `expired`,
`expiring`, `expiration`, `expiry`) by design, which is why its count
subsumes the more specific terms. `ttl`, being a bare three-letter
substring, also matches inside unrelated words that happen to contain the
sequence `ttl` — for example `settled`, `settleReject`, and `throttling` in
`backend/src`, and `settled`/`throttle` in `backend/migrations` (spot-checked
directly: `grep -rIn --include="*.js" -i -- "ttl"
vendor/picpeak/backend/src | head` surfaces `CACHE_TTL` alongside
`safeExec.js`'s `settled`/`settleReject`/`settleResolve`). This is stated
here as a property of the search method — not a classification of any
individual hit — because the next criterion reads these same commands'
output and needs to know its raw count is not pre-filtered for that noise.

### Verdict

AC-17.4.1.1.1.1.1.1 is satisfied: the pinned commit
(`eb263137b98935754155824de2a03848121304b6`) is stated, the six required
search terms are listed with no term added beyond them, the exact
`grep -rIn --include="*.js" -i -- "<term>" vendor/picpeak/backend/src
vendor/picpeak/backend/migrations` command for each is recorded verbatim
against the searched directories and file-type filter, and each command's
matching-line count is recorded (697, 238, 87, 81, 47, 1). No name is
extracted and nothing found is classified here — that is deferred to the
criteria that follow, which now have a fixed, checkable volume of output to
work from.

## AC-17.4.1.1.1.1.1.2 — migration-directory names: deduplicated list

`US-17` AC-17.4.1.1.1.1.1.2 takes the six commands recorded in
AC-17.4.1.1.1.1.1.1 above, re-runs them against the same pinned commit
(`eb263137b98935754155824de2a03848121304b6`), and reduces the portion of
their output that falls inside `vendor/picpeak/backend/migrations` to a
deduplicated list of every distinct field, column, or setting name that
output surfaces. Nothing is classified here and no name is dropped for
looking irrelevant — classification is deferred to a later criterion. It
is a code-level finding: no live Backstage instance was started or used.

### Re-running the commands, scoped to the migration directory

The commands are exactly the six from AC-17.4.1.1.1.1.1.1, unchanged:

```
grep -rIn --include="*.js" -i -- "<term>" vendor/picpeak/backend/src vendor/picpeak/backend/migrations
```

for `<term>` in `expir`, `expires_at`, `expiry`, `ttl`, `valid_until`,
`lifetime`. This criterion works from the same output, filtered to the
lines whose path falls under `vendor/picpeak/backend/migrations` — the
same figures already given in AC-17.4.1.1.1.1.1.1's per-directory split
table:

| Term | `backend/migrations` hits |
|---|---|
| `expir` | 258 |
| `expires_at` | 94 |
| `expiry` | 49 |
| `ttl` | 2 |
| `valid_until` | 2 |
| `lifetime` | 0 |
| **Total** | **405** |

### From 405 raw hits to 8 names

**Recorded hit count this list is reduced from: 405.**

405 is the sum of the six commands' migration-directory matching lines,
counted the same way `wc -l` counts them — with a line counted once per
term it matches, so a line containing both `expir` and `expiry` (e.g. any
line with the word "expiry") is counted twice toward the 405. Reducing
that raw count to names happens in two steps, both mechanical:

1. **Collapse to unique lines.** The six commands overlap heavily — every
   `expires_at` hit is also an `expir` hit, every `expiry` hit is also an
   `expir` hit, and so on. Sorting and de-duplicating the 405 raw
   `file:line:content` triples leaves **262 unique matched lines**.
2. **Keep only lines that actually name a field, column, or setting.**
   Most of the 262 unique lines are natural-language copy or comments
   that merely contain one of the six search substrings as part of an
   ordinary word — the German/French/Spanish/Portuguese/Russian/Slovenian/
   Dutch email-template prose ("expira", "expirará", "expirando",
   "verloopt", "läuft ab", "poteče", …), the English verb forms ("will
   expire", "has expired", "Expiring Soon"), and — for the `ttl`
   term specifically — two pure false-positive substring matches that
   name nothing at all: `settled` (`107_crm_consolidated.js:320`) and
   `Throttle` (`107_crm_consolidated.js:1006`, a comment). None of these
   are a field, column, or setting name; they are prose, and are recorded
   here as accounted for, not silently discarded. 67 of the 262 unique
   lines fall in this bucket.

What is left after removing prose-only lines is **8 distinct names**,
listed below. Two of the eight are recorded as a single entry each because
they are a snake_case name and the camelCase form the fork uses for that
same underlying column/lookup, differing only in spelling:

| Name(s) recorded together | Kind | Evidence (file:line) |
|---|---|---|
| `expires_at` | Column name (repeated across `admin_invitations`, `customer_accounts`, `api_tokens`, `revoked_tokens`, guest-identity sessions, `quote_action_tokens`, `contract_action_tokens`) and the matching Handlebars merge-field `{{expires_at}}` in the emails that report that column's value | `vendor/picpeak/backend/migrations/core/058_add_admin_invitations_table.js:37` (`table.timestamp('expires_at').notNullable();`); `vendor/picpeak/backend/migrations/core/090_add_customer_accounts.js:88`; `vendor/picpeak/backend/migrations/core/107_crm_consolidated.js:897,1146,1358`; `vendor/picpeak/backend/migrations/legacy/017_add_token_revocation_tables.js:14` |
| `invite_expires_at` / `hasInviteExpiresAt` | Column name (`admin_users`) and the camelCase existence-check variable the same migration uses for that column | `vendor/picpeak/backend/migrations/core/057_add_role_to_admin_users.js:38` (`table.timestamp('invite_expires_at');`) and `:20` (`const hasInviteExpiresAt = await knex.schema.hasColumn('admin_users', 'invite_expires_at');`) |
| `valid_until` | Column name (`quotes`, `contracts`) | `vendor/picpeak/backend/migrations/core/107_crm_consolidated.js:779` (`quotes`) and `:1228` (`contracts`) |
| `expiry_date` | Handlebars template merge-field name, declared in each gallery-created template's `variables` array and substituted as `{{expiry_date}}` in the template body | `vendor/picpeak/backend/migrations/core/001_init.js:125` (`variables: JSON.stringify([..., 'expiry_date'])`) |
| `expiration_warning` | `template_key` value naming the "gallery expiring soon" email template | `vendor/picpeak/backend/migrations/core/001_init.js:128` (`template_key: 'expiration_warning',`) |
| `gallery_expired` / `galleryExpiredExists` | `template_key` value naming the "gallery has expired" email template, and the camelCase existence-check variable the fork uses for that same template lookup | `vendor/picpeak/backend/migrations/legacy/020_ensure_default_email_templates.js:45` (`template_key: 'gallery_expired',`) and `vendor/picpeak/backend/migrations/legacy/010_add_missing_email_templates.js:3-7` (`const galleryExpiredExists = await knex('email_templates')...; if (!galleryExpiredExists) {`) |
| `event_require_expiration` | `setting_key` value naming an application setting | `vendor/picpeak/backend/migrations/core/061_add_optional_date_expiration_settings.js:11` (`{ setting_key: 'event_require_expiration', setting_value: JSON.stringify(true), setting_type: 'boolean' }`) |
| `revoked_tokens_expires_at_index` | Database index name | `vendor/picpeak/backend/migrations/legacy/017_add_token_revocation_tables.js:43` (`CREATE INDEX IF NOT EXISTS "revoked_tokens_expires_at_index" ON "revoked_tokens" ("expires_at")`) |

No other distinct field, column, or setting name occurs in the
migration-directory output: every remaining unique line either repeats one
of the eight names above (e.g. `expires_at` also appears inside
`table.index(['expires_at'])`, `table.dropColumn(...)`,
`knex.schema.hasColumn(...)`, and `ALTER TABLE events ALTER COLUMN
expires_at DROP NOT NULL` in `061_add_optional_date_expiration_settings.js:32`
— all the same name, not a new one) or is one of the prose/false-positive
lines accounted for above.

### Verdict

AC-17.4.1.1.1.1.1.2 is satisfied: the same six commands recorded in
AC-17.4.1.1.1.1.1.1 were re-run against the same pinned commit
(`eb263137b98935754155824de2a03848121304b6`), the migration-directory
portion of their output — 405 raw matching lines, the recorded hit count
this list is reduced from — is reduced to a deduplicated list of 8 field,
column, and setting names (`expires_at`; `invite_expires_at` /
`hasInviteExpiresAt`; `valid_until`; `expiry_date`; `expiration_warning`;
`gallery_expired` / `galleryExpiredExists`; `event_require_expiration`;
`revoked_tokens_expires_at_index`), with the two snake_case/camelCase pairs
recorded as single entries rather than as four separate names. Nothing
found is classified and no name was dropped for looking irrelevant — the
`ttl` false positives (`settled`, `Throttle`) and the prose inflections of
"expire" are accounted for as containing no name, not silently omitted.

## AC-17.4.1.1.1.1.1.3 — backend-source names merged with the migration list

`US-17` AC-17.4.1.1.1.1.1.3 takes the same six commands recorded in
AC-17.4.1.1.1.1.1.1, reduces the portion of their output that falls inside
`vendor/picpeak/backend/src` to a deduplicated list of every distinct field,
column, or setting name that output surfaces — using the identical method
AC-17.4.1.1.1.1.1.2 applied to the migration directory — and then merges
that list with AC-17.4.1.1.1.1.1.2's migration-directory list into a single
deduplicated inventory in which each underlying value appears exactly once,
noting for each entry whether it was surfaced in the backend source, the
migrations, or both. Nothing is classified here and no name is dropped for
looking irrelevant. It is a code-level finding: no live Backstage instance
was started or used.

### Re-running the commands, scoped to the backend source directory

The same six commands from AC-17.4.1.1.1.1.1.1, unchanged, run against the
same pinned fork (`eb263137b98935754155824de2a03848121304b6`) and filtered
to `vendor/picpeak/backend/src` — the same figures already given in that
AC's per-directory split table:

| Term | `backend/src` hits |
|---|---|
| `expir` | 439 |
| `expires_at` | 144 |
| `expiry` | 38 |
| `ttl` | 79 |
| `valid_until` | 45 |
| `lifetime` | 1 |
| **Total** | **746** |

### From 746 raw hits to 33 names

**Recorded hit count this list is reduced from: 746.**

Following AC-17.4.1.1.1.1.1.2's two-step method: sorting and de-duplicating
the 746 raw `file:line:content` triples leaves **546 unique matched lines**.
Of those 546, **118 contain none of the names recorded below** and are
accounted for, not silently discarded, as one of:

- Natural-language prose — comments, docstrings, log/error messages, and
  test descriptions (e.g. `"rejects when a non-expired pending invitation
  exists"`, `"Password gates, expiring links..."`).
- Function/method names describing expiry-related *behaviour* rather than
  naming a stored or exposed value (`checkExpirations`, `expirationChecker`
  the scheduler-start function, `extendExpiration`, `handleExpiredEvent`,
  `isSessionExpired`, `queueExpirationWarning`, `startExpirationChecker`,
  `cleanupExpiredRevocations`, `cleanupExpiredUploads`,
  `buildCookieOptionsWithExpiry`).
- Private/internal bookkeeping variables never exposed as an API field, DB
  column, or setting (`cacheExpiry`, `expiredEvents`, `expiredIds`,
  `newExpiration`, `_ttlSeconds`/`ttlSeconds` as a generic utility
  parameter).
- The same `ttl`-substring false-positive property already recorded in
  AC-17.4.1.1.1.1.1.1 (`settled`, `Throttle`), which in `backend/src` also
  catches `settle`, `settleReject`, `settleResolve`, `allSettled`,
  `throttle`, `throttling`, `skipThrottle`, and the payment-throttle
  `reason` value `throttled_24h` — none of these name an expiry-related
  field, column, or setting; the match is an accident of the substring
  `ttl` appearing inside "sett**l**ed"/"thro**ttl**e".
- The bare words `TTL`, `Expiration`, `Expired`, `Expiry`, `lifetime` used
  as ordinary English inside a comment or log string, not as an
  identifier.

What is left after removing those lines is **33 distinct names**, listed
below with representative evidence. Six of the 33 are also recorded in
AC-17.4.1.1.1.1.1.2's migration-directory list (marked **Also in
migrations**); the rest are new to this AC.

| Name(s) recorded together | Kind | Also in migrations? | Evidence (file:line) |
|---|---|---|---|
| `expires_at` / `expiresAt` | DB column (read via query/middleware) and the camelCase API-response field for the same column | Yes (`expires_at`) | `vendor/picpeak/backend/src/middleware/auth.js:179`; `vendor/picpeak/backend/src/routes/adminCustomers.js:84` (`expiresAt: e.expires_at`) |
| `expiresIn` | JWT-signing / presigned-URL option field name (`jsonwebtoken`, S3 adapter) | No | `vendor/picpeak/backend/src/routes/customerAuth.js:124`; `vendor/picpeak/backend/src/middleware/guestAuth.js:84,96` |
| `expiry_date` | Handlebars/notification-payload merge-field name | Yes | `vendor/picpeak/backend/src/routes/adminEvents.js:800,1080,1642,1710` |
| `expiration_days` | Request-body field name (event/gallery create, also echoed as validator target) | No | `vendor/picpeak/backend/src/routes/adminEvents.js:376` (`body('expiration_days')`), `:446` |
| `general_default_expiration_days` | `setting_key` value (public application setting) | No | `vendor/picpeak/backend/src/services/settingsService.js:148` |
| `require_expiration` | API response field name (event field-requirements object), derived from but spelled differently than `event_require_expiration` | No | `vendor/picpeak/backend/src/routes/adminEvents.js:88,104,115` |
| `event_require_expiration` | `setting_key` value | Yes | `vendor/picpeak/backend/src/routes/adminEvents.js:79,104`; `vendor/picpeak/backend/src/routes/publicSettings.js:135` |
| `is_expired` | API response field name (`GET` gallery info) | No | `vendor/picpeak/backend/src/routes/gallery.js:186` |
| `Expires` | HTTP response header name, explicitly set to disable caching | No | `vendor/picpeak/backend/src/middleware/noStoreCache.js:35`; `vendor/picpeak/backend/src/middleware/secureImageMiddleware.js:261` |
| `TOKEN_EXPIRED` | API error `code` value | No | `vendor/picpeak/backend/src/middleware/auth.js:27,149`; `vendor/picpeak/backend/src/middleware/customerAuth.js:48` |
| `GALLERY_EXPIRED` | API error `code` value | No | `vendor/picpeak/backend/src/middleware/auth.js:182` |
| `TOKEN_NO_EXPIRY` | API error `code` value | No | `vendor/picpeak/backend/src/utils/publicTokenGuards.js:104` |
| `expired_or_missing` | Service-level `reason` value (guest recovery) | No | `vendor/picpeak/backend/src/services/guestRecoveryService.js:102` |
| `TokenExpiredError` | Third-party (`jsonwebtoken`) error-class name the fork's own code names and checks against | No | `vendor/picpeak/backend/src/middleware/auth.js:26,148`; `vendor/picpeak/backend/src/middleware/customerAuth.js:47` |
| `valid_until` / `validUntil` | DB column (`quotes`, `contracts`) and its camelCase API-response field | Yes | `vendor/picpeak/backend/src/routes/adminQuotes.js:84` (`validUntil: q.valid_until`) |
| `CACHE_TTL` | Named cache-duration constant (permissions cache; update-check cache) | No | `vendor/picpeak/backend/src/middleware/permissions.js:13`; `vendor/picpeak/backend/src/services/updateCheckService.js:9` |
| `CACHE_TTL_MS` | Named cache-duration constant (upload-settings cache; public-site cache) | No | `vendor/picpeak/backend/src/services/uploadSettings.js:5`; `vendor/picpeak/backend/src/services/publicSiteService.js:12` |
| `CODE_TTL_MS` | Named recovery-code duration constant | No | `vendor/picpeak/backend/src/services/guestRecoveryService.js:18` |
| `FONTS_CACHE_TTL_MS` | Named cache-duration constant | No | `vendor/picpeak/backend/src/services/fontsService.js:43` |
| `GALLERY_TOKEN_TTL_SECONDS` | Named token-duration constant | No | `vendor/picpeak/backend/src/routes/customer.js:87` |
| `INVITATION_TTL_MS` | Named invitation-duration constant | No | `vendor/picpeak/backend/src/services/customerAccountsService.js:23` |
| `PASSWORD_RESET_TTL_MS` | Named reset-token-duration constant | No | `vendor/picpeak/backend/src/services/customerAccountsService.js:1165` |
| `PUBLIC_SITE_CACHE_TTL_MS` | Environment-variable name | No | `vendor/picpeak/backend/src/services/publicSiteService.js:12` (`process.env.PUBLIC_SITE_CACHE_TTL_MS`) |
| `TOKEN_TTL_SECONDS` | Named token-duration constant (customer auth) | No | `vendor/picpeak/backend/src/routes/customerAuth.js:48` |
| `UPLOAD_EXPIRATION_MS` | Named upload-expiration constant | No | `vendor/picpeak/backend/src/services/chunkedUploadService.js:17` |
| `expiringEvents` | API response field name (admin dashboard summary) | No | `vendor/picpeak/backend/src/routes/adminDashboard.js:24,101` |
| `expiration_warning` | `email_type`/`template_key` value | Yes | `vendor/picpeak/backend/src/services/expirationChecker.js:36,78`; `vendor/picpeak/backend/src/database/db.js:468` (comment) |
| `gallery_expired` / `galleryExpiredExists` | Email `template_key` value (`gallery_expired` occurs here; the camelCase existence-check `galleryExpiredExists` occurs only in migrations, per AC-17.4.1.1.1.1.1.2) | Yes | `vendor/picpeak/backend/src/services/expirationChecker.js:144,149` |
| `expirationChecker` | API response field name (`services.expirationChecker` on the admin system-status endpoint) — the same spelling also names the scheduler-start function/module, recorded separately above as a non-name | No | `vendor/picpeak/backend/src/routes/adminSystem.js:264` |
| `expiring` | `status` query-filter value (`GET` events list, `?status=expiring`) | No | `vendor/picpeak/backend/src/routes/adminEvents.js:906` |
| `event.expired` | Webhook event-type name, part of the fork's frozen `EVENT_TYPES` catalog | No | `vendor/picpeak/backend/src/services/webhookService.js:17`; fired at `vendor/picpeak/backend/src/services/expirationChecker.js:105` |
| `expired` | `quotes.status` enum value (dashboard status-count key and valid quote-status transition) | No | `vendor/picpeak/backend/src/services/quoteService.js:51`; `vendor/picpeak/backend/src/routes/adminDashboard.js:392` |
| `expires` | Signed image-token field name (`{photoId, expires}`) | No | `vendor/picpeak/backend/src/routes/protectedImages.js:19,46` |

No other distinct field, column, or setting name occurs in the backend
source output: every remaining unique line either repeats one of the 33
names above under a different call site, or falls in one of the six
prose/function-name/internal-variable/false-positive buckets described
above.

### Merging with AC-17.4.1.1.1.1.1.2's migration-directory list

AC-17.4.1.1.1.1.1.2 recorded 8 names/pairs from the migration directory.
Six of them (marked "Yes" in the table above) are also surfaced by the
backend source: `expires_at`, `valid_until`, `expiry_date`,
`expiration_warning`, `gallery_expired` (its `galleryExpiredExists`
camelCase pair-partner is migrations-only), and `event_require_expiration`.
The remaining two — `invite_expires_at`/`hasInviteExpiresAt` and
`revoked_tokens_expires_at_index` — occur nowhere in
`vendor/picpeak/backend/src` (confirmed: zero hits for either spelling),
so they carry forward into the merged inventory as migrations-only.

Combining the backend source's 33 names with the migration directory's 8
names, collapsing the six shared entries into one row each rather than
counting them twice, yields **35 distinct merged entries** — each
underlying value appears exactly once, with its origin recorded:

Entry keys are written `E1`…`E35` rather than as bare numbers so these rows
are not mistaken for AC-14.1's classified inventory rows, which are the only
rows in this document that lead with a bare number.

| Entry | Name(s) | Surfaced in |
|---|---|---|
| E1 | `expires_at` / `expiresAt` | Both |
| E2 | `invite_expires_at` / `hasInviteExpiresAt` | Migrations only |
| E3 | `valid_until` / `validUntil` | Both |
| E4 | `expiry_date` | Both |
| E5 | `expiration_warning` | Both |
| E6 | `gallery_expired` / `galleryExpiredExists` | Both |
| E7 | `event_require_expiration` | Both |
| E8 | `revoked_tokens_expires_at_index` | Migrations only |
| E9 | `expiresIn` | Backend source only |
| E10 | `expiration_days` | Backend source only |
| E11 | `general_default_expiration_days` | Backend source only |
| E12 | `require_expiration` | Backend source only |
| E13 | `is_expired` | Backend source only |
| E14 | `Expires` (HTTP header) | Backend source only |
| E15 | `TOKEN_EXPIRED` | Backend source only |
| E16 | `GALLERY_EXPIRED` | Backend source only |
| E17 | `TOKEN_NO_EXPIRY` | Backend source only |
| E18 | `expired_or_missing` | Backend source only |
| E19 | `TokenExpiredError` | Backend source only |
| E20 | `CACHE_TTL` | Backend source only |
| E21 | `CACHE_TTL_MS` | Backend source only |
| E22 | `CODE_TTL_MS` | Backend source only |
| E23 | `FONTS_CACHE_TTL_MS` | Backend source only |
| E24 | `GALLERY_TOKEN_TTL_SECONDS` | Backend source only |
| E25 | `INVITATION_TTL_MS` | Backend source only |
| E26 | `PASSWORD_RESET_TTL_MS` | Backend source only |
| E27 | `PUBLIC_SITE_CACHE_TTL_MS` | Backend source only |
| E28 | `TOKEN_TTL_SECONDS` | Backend source only |
| E29 | `UPLOAD_EXPIRATION_MS` | Backend source only |
| E30 | `expiringEvents` | Backend source only |
| E31 | `expirationChecker` | Backend source only |
| E32 | `expiring` | Backend source only |
| E33 | `event.expired` | Backend source only |
| E34 | `expired` (quote status) | Backend source only |
| E35 | `expires` (image-token field) | Backend source only |

Every one of AC-17.4.1.1.1.1.1.2's 8 recorded names/pairs appears in this
merged inventory (rows E1–E8) — nothing from that criterion is lost. Nothing
in this merged inventory is classified here; per this AC's scope, that
division is deferred to AC-17.4.1.1.1.1.2 and AC-17.4.1.1.1.1.3, the two
criteria this merged inventory is handed to next.

### Verdict

AC-17.4.1.1.1.1.1.3 is satisfied: against the same pinned fork
(`eb263137b98935754155824de2a03848121304b6`), the same six commands
recorded in AC-17.4.1.1.1.1.1.1 were re-run scoped to
`vendor/picpeak/backend/src` (746 raw matching lines, the recorded hit
count that portion is reduced from, collapsing to 546 unique lines of
which 118 carry no name), reduced by the same method AC-17.4.1.1.1.1.1.2
used to 33
deduplicated field/column/setting names with camelCase/snake_case pairs
recorded as single entries, and merged with AC-17.4.1.1.1.1.1.2's 8
migration-directory names into one deduplicated inventory of 35 entries in
which each underlying value appears exactly once, each marked Backend
source only / Migrations only / Both. Every name AC-17.4.1.1.1.1.1.2
recorded appears in the merged inventory. Nothing is classified and no name
is dropped for looking irrelevant.

## AC-17.4.1.1.1.1.2 — ruling out occurrences that are not about a Gallery's own expiry

`US-17` AC-17.4.1.1.1.1.2 works from the 35-entry merged inventory
AC-17.4.1.1.1.1.1.3 recorded above. For every entry, this criterion asks
what the underlying value actually governs. An entry stays aside — not
ruled out here — only where every occurrence of it governs the Gallery's
own `events.expires_at` lifecycle (creation-time duration, the read-back
state, the emails/webhooks/dashboard counts that report or act on it);
that positive case is AC-17.4.1.1.1.1.3's deliverable, not this one's.
Everything else is gathered into named groups below, each with a one-line
statement of what it actually governs and at least one file:line against
the pinned commit (`eb263137b98935754155824de2a03848121304b6`). A name is
ruled out only on the evidence cited here — never because it looked
unpromising. It is a code-level finding: no live Backstage instance was
started or used.

Several entries are a single name shared by more than one unrelated table,
constant, or code path (`expires_at`, `expiresIn`, `TOKEN_EXPIRED`,
`TokenExpiredError`, `CACHE_TTL`), so this criterion works at the level of
individual occurrences of an entry, not the entry as a single indivisible
unit — an entry can therefore have some occurrences that stay aside
(the Gallery's own expiry) and other occurrences that are ruled out below.

### Occurrences that stay aside — they express the Gallery's own lifetime

Recorded here only for contrast, so every one of the 35 entries is
accounted for one way or the other and none is silently skipped. These are
not ruled out; AC-17.4.1.1.1.1.3 covers them on the positive side.

| Entry | Name(s) | What ties it to the Gallery's own `events.expires_at` |
|---|---|---|
| E1 (events occurrence) | `expires_at` | The column itself: `vendor/picpeak/backend/migrations/core/061_add_optional_date_expiration_settings.js:32` (`ALTER TABLE events ALTER COLUMN expires_at DROP NOT NULL`); read by `vendor/picpeak/backend/src/middleware/auth.js:179` to decide gallery access. |
| E4 | `expiry_date` | Notification merge-field reporting the Gallery's own `expires_at` value in emails (`vendor/picpeak/backend/src/routes/adminEvents.js:800,1080,1642,1710`). |
| E5 | `expiration_warning` | `template_key` for the "gallery expiring soon" email, fired off the Gallery's own `expires_at` (`vendor/picpeak/backend/src/services/expirationChecker.js:36,78`). |
| E6 | `gallery_expired` / `galleryExpiredExists` | `template_key` for the "gallery has expired" email, fired off the same column (`vendor/picpeak/backend/src/services/expirationChecker.js:144,149`). |
| E7 | `event_require_expiration` | Setting governing whether an event/Gallery's own `expires_at` is mandatory at creation (`vendor/picpeak/backend/src/routes/adminEvents.js:79,104`). |
| E10 | `expiration_days` | Create-event request field that sets the Gallery's own `expires_at` at creation time (`vendor/picpeak/backend/src/routes/adminEvents.js:376,446`). |
| E11 | `general_default_expiration_days` | Default value for E10 (`vendor/picpeak/backend/src/services/settingsService.js:148`). |
| E12 | `require_expiration` | API field exposing E7's policy per event (`vendor/picpeak/backend/src/routes/adminEvents.js:88,104,115`). |
| E13 | `is_expired` | API field computed directly from the Gallery's own `expires_at` (`vendor/picpeak/backend/src/routes/gallery.js:186`). |
| E16 | `GALLERY_EXPIRED` | Error code returned when the Gallery's own `expires_at` has passed (`vendor/picpeak/backend/src/middleware/auth.js:182`). |
| E30 | `expiringEvents` | Dashboard count of Galleries whose own `expires_at` falls within 7 days (`vendor/picpeak/backend/src/routes/adminDashboard.js:24`). |
| E31 | `expirationChecker` | Admin system-status field for the background job that acts on the Gallery's own `expires_at` (`vendor/picpeak/backend/src/routes/adminSystem.js:264`). |
| E32 | `expiring` | `?status=expiring` list filter, same 7-day window as E30 (`vendor/picpeak/backend/src/routes/adminEvents.js:906`). |
| E33 | `event.expired` | Webhook fired when the Gallery's own `expires_at` is crossed (`vendor/picpeak/backend/src/services/webhookService.js:17`, fired at `vendor/picpeak/backend/src/services/expirationChecker.js:105`). |

### Ruled-out group: Admin sessions

**Governs:** how long an administrator's own login session, long-lived API
token, or account-invitation link stays valid — never a Gallery's own
`expires_at`.

| Entry | Name(s) | Evidence (file:line) |
|---|---|---|
| E15, E19 | `TOKEN_EXPIRED` / `TokenExpiredError` | `vendor/picpeak/backend/src/middleware/auth.js:26-27,148-149` — admin JWT verification. |
| E9 | `expiresIn` | `vendor/picpeak/backend/src/routes/auth.js:115` (`/admin/login`, `expiresIn: '24h'`). |
| E1 | `expires_at` (`api_tokens`) | `vendor/picpeak/backend/migrations/core/081_add_api_tokens.js:26` — long-lived programmatic API token. |
| E1 | `expires_at` (`admin_invitations`) | `vendor/picpeak/backend/migrations/core/058_add_admin_invitations_table.js:37` — admin account-invitation link. |
| E2 | `invite_expires_at` / `hasInviteExpiresAt` | `vendor/picpeak/backend/migrations/core/057_add_role_to_admin_users.js:20,38` — `admin_users` invite-onboarding column. |
| E20 | `CACHE_TTL` (permissions) | `vendor/picpeak/backend/src/middleware/permissions.js:13` — caches an admin's computed permission set. |

### Ruled-out group: Gallery-access and customer-portal session tokens

**Governs:** how long the temporary session a *visitor* is issued after
already passing a password check, share-link check, or customer login
lasts — the session token's own lifetime, not the Gallery record's
`expires_at` that gated entry to get it. `GALLERY_TOKEN_TTL_SECONDS`
carries "gallery" in its name but names this session token, confirmed by
its only use site being the token this route mints, not a column read
from or written to `events`.

| Entry | Name(s) | Evidence (file:line) |
|---|---|---|
| E9 | `expiresIn` | `vendor/picpeak/backend/src/routes/auth.js:268` (`/gallery/verify`, password success), `:344` (`/gallery/:slug/client-login`), `:428` (`/gallery/share-login`), `:592` (`/session`, reports remaining time on the already-issued token). |
| E24 | `GALLERY_TOKEN_TTL_SECONDS` | `vendor/picpeak/backend/src/routes/customer.js:87,179` — customer-portal-issued gallery session token. |
| E28 | `TOKEN_TTL_SECONDS` | `vendor/picpeak/backend/src/routes/customerAuth.js:48,124` — customer portal login session. |
| E15, E19 | `TOKEN_EXPIRED` / `TokenExpiredError` | `vendor/picpeak/backend/src/middleware/customerAuth.js:47-48` — customer JWT verification. |

### Ruled-out group: Guest tokens

**Governs:** a lightweight guest identity's own session token or
email-verification code, used for guest uploads/recovery without a full
customer account — a separate identity/session concern from the Gallery
record's own `expires_at`.

| Entry | Name(s) | Evidence (file:line) |
|---|---|---|
| E9 | `expiresIn` | `vendor/picpeak/backend/src/middleware/guestAuth.js:84,96` (`signGuestToken`, default `'24h'`). |
| E1 | `expires_at` (`guest_verification_codes`) | `vendor/picpeak/backend/migrations/core/078_add_guest_identity.js:65`. |
| E22 | `CODE_TTL_MS` | `vendor/picpeak/backend/src/services/guestRecoveryService.js:18` — the 15-minute constant backing the row above. |
| E18 | `expired_or_missing` | `vendor/picpeak/backend/src/services/guestRecoveryService.js:102` — reason value when a guest's verification code has expired or was never issued. |

### Ruled-out group: Share links

**Governs:** single-use links a customer is emailed, or the Gallery's own
share-link URL — either the link's own expiry timestamp, or, for the
Gallery's share link specifically, "expired" wording that is not backed by
any distinct timer at all.

`vendor/picpeak/backend/src/routes/auth.js:418` returns `{"error":
"Invalid or expired share link"}` from inside `/gallery/share-login`
whenever the submitted token does not equal `getEventShareToken(event)`
(`auth.js:413-419`) — a plain string mismatch, not a time comparison. The
`events` table carries no `share_token`-specific expiry column (confirmed:
`vendor/picpeak/backend/src/database/db.js:141,190,243-246` add and
backfill `events.share_token` with no accompanying `expires_at`-like
column), so this occurrence of expiry wording governs nothing distinct
from a wrong/stale token; a *correct* token on this same route mints the
session token already ruled out above (`auth.js:428`). The fork uses the
identical `"Invalid or expired <noun> link"` phrasing for the other
one-shot links in this group (e.g. `"Invalid or expired reset link"`,
`vendor/picpeak/backend/src/services/customerAccountsService.js:1379`),
which — unlike the share link — *are* backed by their own `expires_at`
column, cited per-row below.

| Entry | Name(s) | Evidence (file:line) |
|---|---|---|
| — | "Invalid or expired share link" wording | `vendor/picpeak/backend/src/routes/auth.js:418` (see above; not a merged-inventory name — corroborating evidence for the group, not a separate ruled-out entry). |
| E1 | `expires_at` (`customer_invitations`) | `vendor/picpeak/backend/migrations/core/090_add_customer_accounts.js:88`. |
| E25 | `INVITATION_TTL_MS` | `vendor/picpeak/backend/src/services/customerAccountsService.js:23,130` — backs the row above. |
| E1 | `expires_at` (`customer_password_resets`) | `vendor/picpeak/backend/migrations/core/092_customer_features_branding_resets.js:98`. |
| E26 | `PASSWORD_RESET_TTL_MS` | `vendor/picpeak/backend/src/services/customerAccountsService.js:1165,1315` — backs the row above. |
| E1 | `expires_at` (`quote_action_tokens`) | `vendor/picpeak/backend/migrations/core/107_crm_consolidated.js:897`. |
| E1 | `expires_at` (`contract_action_tokens`) | `vendor/picpeak/backend/migrations/core/107_crm_consolidated.js:1358`. |
| E1 | `expires_at` (`invoice_payment_check_tokens`) | `vendor/picpeak/backend/migrations/core/107_crm_consolidated.js:1146`. |
| E15, E17 | `TOKEN_EXPIRED` / `TOKEN_NO_EXPIRY` | `vendor/picpeak/backend/src/utils/publicTokenGuards.js:104,108` — `"This link has expired"`, the shared guard for `quote_action_tokens`/`contract_action_tokens` links. |
| E35, E9 | `expires` / `expiresIn` | `vendor/picpeak/backend/src/routes/protectedImages.js:17,19,46,178,197,205,241`; `vendor/picpeak/backend/src/routes/secureImages.js:51,77`; `vendor/picpeak/backend/src/services/secureImageService.js:20,30,53` — a short-lived signed URL to one protected image. |
| E9 | `expiresIn` | `vendor/picpeak/backend/src/services/storage/s3Storage.js:483,507`; `vendor/picpeak/backend/src/services/storage/S3StorageBackend.js:147`; `vendor/picpeak/backend/src/routes/adminBackup.js:743,755` — presigned S3 download/backup URLs. |

### Ruled-out group: Internal cache and housekeeping constants

**Governs:** purely internal system bookkeeping — in-memory caches and
stale-partial-upload cleanup — tied to no Gallery, admin, customer, or
guest identity at all.

| Entry | Name(s) | Evidence (file:line) |
|---|---|---|
| E20 | `CACHE_TTL` (update check) | `vendor/picpeak/backend/src/services/updateCheckService.js:9` — caches a GitHub version-check response for an hour. |
| E21 | `CACHE_TTL_MS` | `vendor/picpeak/backend/src/services/uploadSettings.js:5`; `vendor/picpeak/backend/src/services/publicSiteService.js:12`. |
| E23 | `FONTS_CACHE_TTL_MS` | `vendor/picpeak/backend/src/services/fontsService.js:43`. |
| E27 | `PUBLIC_SITE_CACHE_TTL_MS` | `vendor/picpeak/backend/src/services/publicSiteService.js:12` (`process.env.PUBLIC_SITE_CACHE_TTL_MS`). |
| E29 | `UPLOAD_EXPIRATION_MS` | `vendor/picpeak/backend/src/services/chunkedUploadService.js:17` — cleans up a stale, never-finished chunked upload after 24h. |

### Ruled-out group: Session-token revocation bookkeeping

**Governs:** the cutoff a revoked JWT (of any role — admin, customer, or
gallery) was originally due to expire, kept only so the revocation-check
index can stop bothering with it once it would have expired anyway — a
token-lifecycle housekeeping value, not a Gallery value.

| Entry | Name(s) | Evidence (file:line) |
|---|---|---|
| E1 | `expires_at` (`revoked_tokens`) | `vendor/picpeak/backend/migrations/legacy/017_add_token_revocation_tables.js:14`. |
| E8 | `revoked_tokens_expires_at_index` | `vendor/picpeak/backend/migrations/legacy/017_add_token_revocation_tables.js:43`. |

### Ruled-out group: Business-document validity and status (quotes & contracts)

**Governs:** when a quote or contract's own terms are considered stale,
and a quote's CRM lifecycle status — properties of a billing document, not
of a Gallery.

| Entry | Name(s) | Evidence (file:line) |
|---|---|---|
| E3 | `valid_until` / `validUntil` | `vendor/picpeak/backend/migrations/core/107_crm_consolidated.js:779` (`quotes`), `:1228` (`contracts`); `vendor/picpeak/backend/src/routes/adminQuotes.js:84`. |
| E34 | `expired` (quote status) | `vendor/picpeak/backend/src/services/quoteService.js:51` (`VALID_QUOTE_TRANSITIONS`); `vendor/picpeak/backend/src/routes/adminDashboard.js:392` (status-count key). |

### Ruled-out group: HTTP cache-control header

**Governs:** telling a browser or proxy never to cache a response. The
literal value is the fixed string `'0'`, not a timestamp of any kind, and
is set on every response the two middlewares below touch regardless of
any Gallery.

| Entry | Name(s) | Evidence (file:line) |
|---|---|---|
| E14 | `Expires` | `vendor/picpeak/backend/src/middleware/noStoreCache.js:35`; `vendor/picpeak/backend/src/middleware/secureImageMiddleware.js:261`. |

### Coverage check

14 entries (E1's `events` occurrence, E4, E5, E6, E7, E10, E11, E12, E13,
E16, E30, E31, E32, E33) stay aside as expressing the Gallery's own
lifetime. The remaining 21 entries — E1's nine other occurrences (across
`admin_invitations`, `api_tokens`, `customer_invitations`,
`customer_password_resets`, `quote_action_tokens`,
`contract_action_tokens`, `invoice_payment_check_tokens`,
`revoked_tokens`, `guest_verification_codes`), E2, E3, E8, E9, E14, E15,
E17, E18, E19, E20, E21, E22, E23, E24, E25, E26, E27, E28, E29, E34, E35 —
are each ruled out above, across eight named groups. Every entry from the
AC-17.4.1.1.1.1.1.3 merged inventory appears exactly once in this
accounting (either stays aside above, or is ruled out in exactly one
group's table, though a few multi-occurrence entries — E1, E9, E15 —
contribute rows to more than one group, one row per distinct occurrence).
Admin sessions, guest tokens, and share links — the three groups this
criterion explicitly requires — are each named above, with their own
evidence, rather than left unmentioned.

### Verdict

AC-17.4.1.1.1.1.2 is satisfied: working from the AC-17.4.1.1.1.1.1.3
merged inventory of 35 entries against the same pinned commit
(`eb263137b98935754155824de2a03848121304b6`), every occurrence that does
not express a Gallery's own `events.expires_at` lifetime is gathered into
eight named, ruled-out groups — Admin sessions, Gallery-access and
customer-portal session tokens, Guest tokens, Share links, Internal cache
and housekeeping constants, Session-token revocation bookkeeping,
Business-document validity and status, and the HTTP cache-control header —
each with a one-line statement of what the value actually governs and at
least one file:line citation against the pinned commit. Admin sessions,
guest tokens, and share links are each named explicitly, as this criterion
requires. No name is ruled out on anything but the evidence cited above,
and the coverage check confirms every one of the 35 merged-inventory
entries is accounted for, with none left unmentioned.

### Later addition to this ruled-out list, by AC-17.4.1.1.1.2.1

The ruled-out list begun above is not closed at eight groups. This note
is left here so a reader working from this list finds the whole of it,
rather than stopping at the eight groups this criterion produced.
AC-17.4.1.1.1.2.1, settling the AC-17.4.1.1.1.1.3 candidate shortlist
from application code, found that one entry this criterion left aside as
expressing the Gallery's own lifetime — `expirationChecker` — is not the
gallery-lifetime field: its only occurrence
(`vendor/picpeak/backend/src/routes/adminSystem.js:264`) is a hardcoded
status literal that never reads or derives from `events.expires_at`. It
is therefore moved out of the aside list and into a ninth group of this
same ruled-out list, **Hardcoded system-status labels**, recorded in the
AC-17.4.1.1.1.2.1 section below with its evidence. The counts stated
above (14 aside, 21 ruled out) are this criterion's own record and are
left as they stood. After AC-17.4.1.1.1.2.1's correction the same 35
merged-inventory entries divide as 13 confirmed and 22 ruled out, which
that section reconciles entry by entry against the 14-entry shortlist.

## AC-17.4.1.1.1.1.3 — the candidate shortlist, reconciled against the full inventory

`US-17` AC-17.4.1.1.1.1.3 takes forward AC-17.4.1.1.1.1.1.3's 35-entry
merged inventory and AC-17.4.1.1.1.1.2's ruled-out groups. Every name the
merged inventory carries that AC-17.4.1.1.1.1.2 did not rule out is
recorded below as a **candidate** for the Gallery's own expiry, each with
a one-line reason and at least one file:line against the pinned commit
(`eb263137b98935754155824de2a03848121304b6`). The candidate list is then
reconciled against the ruled-out groups so that every one of the 35
merged-inventory entries appears exactly once, either as a candidate or
inside a ruled-out group — nothing the search surfaced is silently
dropped — with anything that cannot yet be placed either way listed as
unresolved, rather than omitted. This shortlist is the output of the
AC-17.4.1.1.1.1.1.1–AC-17.4.1.1.1.1.3 group of criteria as a whole; it is
what AC-17.4.1.1.1.2 confirms from code. It is a code-level finding: no
live gallery was created or changed for it.

### The candidate shortlist: 14 entries AC-17.4.1.1.1.1.2 did not rule out

These are the same 14 entries AC-17.4.1.1.1.1.2 recorded as "staying
aside" — restated here as this criterion's own deliverable, the
candidate shortlist, rather than left as that section's contrast note.

| Entry | Name(s) | Why it is a candidate for the Gallery's own expiry | Evidence (file:line) |
|---|---|---|---|
| E1 (`events` occurrence) | `expires_at` | The column itself governs whether the Gallery still grants client access. | `vendor/picpeak/backend/migrations/core/061_add_optional_date_expiration_settings.js:32`; `vendor/picpeak/backend/src/middleware/auth.js:179` |
| E4 | `expiry_date` | Notification merge-field reporting the Gallery's own `expires_at` value in emails. | `vendor/picpeak/backend/src/routes/adminEvents.js:800,1080,1642,1710` |
| E5 | `expiration_warning` | `template_key` for the "gallery expiring soon" email, fired off the Gallery's own `expires_at`. | `vendor/picpeak/backend/src/services/expirationChecker.js:36,78` |
| E6 | `gallery_expired` / `galleryExpiredExists` | `template_key` for the "gallery has expired" email, fired off the same column. | `vendor/picpeak/backend/src/services/expirationChecker.js:144,149` |
| E7 | `event_require_expiration` | Setting governing whether an event/Gallery's own `expires_at` is mandatory at creation. | `vendor/picpeak/backend/src/routes/adminEvents.js:79,104` |
| E10 | `expiration_days` | Create-event request field that sets the Gallery's own `expires_at` at creation time. | `vendor/picpeak/backend/src/routes/adminEvents.js:376,446` |
| E11 | `general_default_expiration_days` | Default value for E10's `expiration_days`. | `vendor/picpeak/backend/src/services/settingsService.js:148` |
| E12 | `require_expiration` | API field exposing E7's policy per event. | `vendor/picpeak/backend/src/routes/adminEvents.js:88,104,115` |
| E13 | `is_expired` | API field computed directly from the Gallery's own `expires_at`. | `vendor/picpeak/backend/src/routes/gallery.js:186` |
| E16 | `GALLERY_EXPIRED` | Error code returned when the Gallery's own `expires_at` has passed. | `vendor/picpeak/backend/src/middleware/auth.js:182` |
| E30 | `expiringEvents` | Dashboard count of Galleries whose own `expires_at` falls within 7 days. | `vendor/picpeak/backend/src/routes/adminDashboard.js:24` |
| E31 | `expirationChecker` | Admin system-status field for the background job that acts on the Gallery's own `expires_at`. | `vendor/picpeak/backend/src/routes/adminSystem.js:264` |
| E32 | `expiring` | `?status=expiring` list filter, same 7-day window as E30. | `vendor/picpeak/backend/src/routes/adminEvents.js:906` |
| E33 | `event.expired` | Webhook fired when the Gallery's own `expires_at` is crossed. | `vendor/picpeak/backend/src/services/webhookService.js:17`; `vendor/picpeak/backend/src/services/expirationChecker.js:105` |

E1 is listed once above, but only for its `events` occurrence — the
column that gates client access. E1's nine other occurrences (across
`api_tokens`, `admin_invitations`, `guest_verification_codes`,
`customer_invitations`, `customer_password_resets`, `quote_action_tokens`,
`contract_action_tokens`, `invoice_payment_check_tokens`, and
`revoked_tokens`) are not candidates; they are ruled out under
AC-17.4.1.1.1.1.2 and are reconciled below rather than silently folded
into this table.

### Reconciling the candidate list against the ruled-out groups

Every one of the 35 AC-17.4.1.1.1.1.1.3 merged-inventory entries, and its
disposition — candidate (this AC) or ruled out (AC-17.4.1.1.1.1.2, group
named) — with no entry left off either list:

| Entry | Disposition |
|---|---|
| E1 | **Split** — its `events.expires_at` occurrence is a candidate (above); its `api_tokens` and `admin_invitations` occurrences are ruled out under Admin sessions, its `guest_verification_codes` occurrence under Guest tokens, its `customer_invitations`/`customer_password_resets`/`quote_action_tokens`/`contract_action_tokens`/`invoice_payment_check_tokens` occurrences under Share links, and its `revoked_tokens` occurrence under Session-token revocation bookkeeping. |
| E2 | Ruled out — Admin sessions. |
| E3 | Ruled out — Business-document validity and status (quotes & contracts). |
| E4 | **Candidate.** |
| E5 | **Candidate.** |
| E6 | **Candidate.** |
| E7 | **Candidate.** |
| E8 | Ruled out — Session-token revocation bookkeeping. |
| E9 | Ruled out — Admin sessions, Gallery-access and customer-portal session tokens, Guest tokens, and Share links (one occurrence per group). |
| E10 | **Candidate.** |
| E11 | **Candidate.** |
| E12 | **Candidate.** |
| E13 | **Candidate.** |
| E14 | Ruled out — HTTP cache-control header. |
| E15 | Ruled out — Admin sessions, Gallery-access and customer-portal session tokens, and Share links (one occurrence per group). |
| E16 | **Candidate.** |
| E17 | Ruled out — Share links. |
| E18 | Ruled out — Guest tokens. |
| E19 | Ruled out — Admin sessions and Gallery-access and customer-portal session tokens. |
| E20 | Ruled out — Admin sessions and Internal cache and housekeeping constants. |
| E21 | Ruled out — Internal cache and housekeeping constants. |
| E22 | Ruled out — Guest tokens. |
| E23 | Ruled out — Internal cache and housekeeping constants. |
| E24 | Ruled out — Gallery-access and customer-portal session tokens. |
| E25 | Ruled out — Share links. |
| E26 | Ruled out — Share links. |
| E27 | Ruled out — Internal cache and housekeeping constants. |
| E28 | Ruled out — Gallery-access and customer-portal session tokens. |
| E29 | Ruled out — Internal cache and housekeeping constants. |
| E30 | **Candidate.** |
| E31 | **Candidate.** |
| E32 | **Candidate.** |
| E33 | **Candidate.** |
| E34 | Ruled out — Business-document validity and status (quotes & contracts). |
| E35 | Ruled out — Share links. |

That is 14 candidate dispositions (E1's events occurrence, E4, E5, E6, E7,
E10, E11, E12, E13, E16, E30, E31, E32, E33) plus 21 ruled-out
dispositions (E1's nine other occurrences counted as part of E1's split,
plus E2, E3, E8, E9, E14, E15, E17, E18, E19, E20, E21, E22, E23, E24,
E25, E26, E27, E28, E29, E34, E35) — 14 + 21 = 35, matching the merged
inventory's size exactly, with every entry appearing exactly once in this
table (E1 appearing once, as a **Split** row that names both of its
dispositions rather than being listed twice).

### Unresolved entries: none

Every one of the 35 merged-inventory entries is placed above, either as a
candidate or inside a ruled-out group (or, for E1, both — explicitly
recorded as a split rather than silently picking one side). No entry is
left unplaced, so there is nothing to list as unresolved here.

### Verdict

AC-17.4.1.1.1.1.3 is satisfied: the 14 entries AC-17.4.1.1.1.1.2 did not
rule out are recorded above as the candidate shortlist for the Gallery's
own expiry, each with a one-line reason and at least one file:line
citation against the pinned commit
(`eb263137b98935754155824de2a03848121304b6`). The candidate list is
reconciled against AC-17.4.1.1.1.1.2's eight ruled-out groups so that
every one of the AC-17.4.1.1.1.1.1.3 merged inventory's 35 entries appears
exactly once, either as a candidate or inside a ruled-out group, with
E1's split occurrence recorded explicitly rather than left ambiguous.
Nothing the AC-17.4.1.1.1.1.1.1 search surfaced is silently dropped, and
no entry is left unresolved. This shortlist — E1's `events.expires_at`
occurrence, `expiry_date`, `expiration_warning`, `gallery_expired`,
`event_require_expiration`, `expiration_days`,
`general_default_expiration_days`, `require_expiration`, `is_expired`,
`GALLERY_EXPIRED`, `expiringEvents`, `expirationChecker`, `expiring`, and
`event.expired` — is the output of the AC-17.4.1.1.1.1.1.1 through
AC-17.4.1.1.1.1.3 group of criteria as a whole, and is what
AC-17.4.1.1.1.2 confirms from code.

## AC-17.4.1.1.1.2.1 — settling the shortlist: confirmed set and corrected ruled-out list

`US-17` AC-17.4.1.1.1.2.1 works from the 14-entry candidate shortlist
AC-17.4.1.1.1.1.3 recorded above. Every entry on that shortlist is
settled here as **confirmed** or **ruled out**, against the pinned
commit (`eb263137b98935754155824de2a03848121304b6`), from application
code read directly for this AC — not from the prior sections' own
reasoning, not from documentation, and not because an entry looked
promising or unpromising. No field's role on the write path versus the
read path is decided here; that split is AC-17.4.1.1.1.2.2 (write) and
AC-17.4.1.1.1.2.3 (read)'s deliverable. This AC's deliverable is the
confirmed set and the corrected ruled-out list those two later criteria
build on. It is a code-level finding: no live gallery was created or
changed for it.

### Confirmed: 13 of the 14 shortlist entries genuinely participate in the Gallery's own expiry

Each row below was settled by opening the cited file at the cited line
in the vendored fork and reading what the code actually does with the
name, not by re-reading the shortlist's own stated reason.

| Entry | Name(s) | Evidence (file:line) | What the code does |
|---|---|---|---|
| E1 (`events` occurrence) | `expires_at` | `vendor/picpeak/backend/src/middleware/auth.js:178-182` | `if (event.expires_at && new Date(event.expires_at) < new Date())` gates gallery access directly on the column. |
| E4 | `expiry_date` | `vendor/picpeak/backend/src/routes/adminEvents.js:800` | `expiry_date: expires_at ? expires_at.toISOString() : null` — the merge field is populated straight from the value just computed for the row's own `expires_at`. |
| E5 | `expiration_warning` | `vendor/picpeak/backend/src/services/expirationChecker.js:25-30,78` | The query feeding this branch is `whereNotNull('expires_at').where('expires_at', '<=', warningDate)`; the email it queues carries `expiry_date: event.expires_at`. |
| E6 | `gallery_expired` / `galleryExpiredExists` | `vendor/picpeak/backend/src/services/expirationChecker.js:46-53,144,149` | `handleExpiredEvent` — which queues this email — is only ever called for rows the prior query matched with `where('expires_at', '<=', now)`. |
| E7 | `event_require_expiration` | `vendor/picpeak/backend/src/routes/adminEvents.js:104,596-605` | The setting is read into `requirements.require_expiration`, which gates the exact block that computes the created event's `expires_at` from `expiration_days`. |
| E10 | `expiration_days` | `vendor/picpeak/backend/src/routes/adminEvents.js:446,605` | `expires_at.setDate(expires_at.getDate() + parseInt(expiration_days, 10))` — added directly onto the base date to produce the stored `expires_at`. |
| E11 | `general_default_expiration_days` | `vendor/picpeak/frontend/src/pages/admin/CreateEventPage.tsx:236-242` | `setFormData(prev => ({ ...prev, expires_in_days: settings.general_default_expiration_days }))` — prefills the value the admin submits as E10's `expiration_days`, so it reaches the same `expires_at` computation. The shortlist's `settingsService.js:148` citation only shows the value being exposed to the frontend; this is the stronger citation that shows it actually being used to set a Gallery's expiry default. |
| E12 | `require_expiration` | `vendor/picpeak/backend/src/routes/adminEvents.js:596` | `if (fieldRequirements.require_expiration) { ... }` is the same boolean as E7, read at the exact point that gates the write — not, as the shortlist described it, a separate per-event API field; there is no such field in `adminEvents.js`'s responses. The corrected description does not change the disposition: it still gates whether `expires_at` is set. |
| E13 | `is_expired` | `vendor/picpeak/backend/src/routes/gallery.js:186` | `is_expired: !event.is_active \|\| (event.expires_at && new Date(event.expires_at) < new Date())` — computed directly from the column in the same handler. |
| E16 | `GALLERY_EXPIRED` | `vendor/picpeak/backend/src/middleware/auth.js:181-182` | The `code` returned by the exact conditional block cited for E1 above. |
| E30 | `expiringEvents` | `vendor/picpeak/backend/src/routes/adminDashboard.js:23-29` | The count query filters `events` directly on `.where('expires_at', '<=', sevenDaysFromNow...).where('expires_at', '>', now...)`. |
| E32 | `expiring` | `vendor/picpeak/backend/src/routes/adminEvents.js:905-913` | The `status === 'expiring'` branch filters on `events.expires_at` with the same 7-day window as E30. |
| E33 | `event.expired` | `vendor/picpeak/backend/src/services/webhookService.js:16-17`; `vendor/picpeak/backend/src/services/expirationChecker.js:99-119` | Fired only from inside `handleExpiredEvent` (reached via the `expires_at <= now` query above), with `expires_at: event.expires_at` in its payload. |

### Ruled out: E31 (`expirationChecker`) is not the gallery-lifetime field

Reading the cited code, rather than trusting the shortlist's stated
reason ("Admin system-status field for the background job that acts on
the Gallery's own `expires_at`"), shows it is a fixed literal:

```
vendor/picpeak/backend/src/routes/adminSystem.js:262-265
      services: {
        fileWatcher: { status: 'active' }, // These would ideally check actual service status
        expirationChecker: { status: 'active' },
        emailProcessor: { status: 'active' }
      },
```

The comment on the line above it — "These would ideally check actual
service status" — is upstream's own admission that this is a
placeholder, not a real health check. Confirming this is not one
occurrence read out of context: `expirationChecker.js`
(`vendor/picpeak/backend/src/services/expirationChecker.js`) exports
only `startExpirationChecker`, nothing that reports its own run state,
and a search of every occurrence of the string `expirationChecker` in
the backend source turns up exactly three, none of which assigns this
field from anything but the literal above:

| File:line | What it is |
|---|---|
| `vendor/picpeak/backend/src/routes/adminSystem.js:264` | The hardcoded `{ status: 'active' }` cited above — the E31 occurrence itself. |
| `vendor/picpeak/backend/src/services/workerManager.js:18` | `require('./expirationChecker')` — a module import, not a status read. |
| `vendor/picpeak/backend/src/services/invoiceSchedulerService.js:18` | A code comment referencing the module by name, not a status read. |

`expirationChecker` therefore never reads, writes, or derives from
`events.expires_at`, or from any other state belonging to any Gallery —
it always reports `'active'` regardless of whether the cron job in
`expirationChecker.js` is running, has ever run, or has ever found an
expired Gallery. It does not participate in a Gallery's own expiry on
the Gallery path, so it is not the gallery-lifetime field the shortlist
took it for.

#### Ruled-out group: Hardcoded system-status labels

**Governs:** nothing — a fixed placeholder string presented to the
admin as a service-health indicator, never computed from any Gallery,
admin, customer, or job state. This is a new group, alongside the eight
AC-17.4.1.1.1.1.2 began, for the one shortlist entry this AC finds does
not belong in the confirmed set.

| Entry | Name(s) | Evidence (file:line) |
|---|---|---|
| E31 | `expirationChecker` | `vendor/picpeak/backend/src/routes/adminSystem.js:264` (see above). |

### Reconciling the confirmed set and the corrected ruled-out entry against the 14-entry shortlist

| Entry | Disposition |
|---|---|
| E1 (`events` occurrence) | **Confirmed.** |
| E4 | **Confirmed.** |
| E5 | **Confirmed.** |
| E6 | **Confirmed.** |
| E7 | **Confirmed.** |
| E10 | **Confirmed.** |
| E11 | **Confirmed.** |
| E12 | **Confirmed.** |
| E13 | **Confirmed.** |
| E16 | **Confirmed.** |
| E30 | **Confirmed.** |
| E31 | **Ruled out** — moved to the new "Hardcoded system-status labels" group above. |
| E32 | **Confirmed.** |
| E33 | **Confirmed.** |

That is 13 confirmed dispositions plus 1 ruled-out disposition — 13 + 1
= 14, matching the AC-17.4.1.1.1.1.3 shortlist's size exactly, with
every shortlist entry appearing exactly once above. E1 here still
refers only to its `events.expires_at` occurrence, per the shortlist and
AC-17.4.1.1.1.1.3's split treatment of E1's other nine occurrences —
this AC does not reopen that split, which stands as AC-17.4.1.1.1.1.2
and AC-17.4.1.1.1.1.3 already recorded it.

### Unresolved entries: none

Every one of the 14 shortlist entries is settled above, either
confirmed or ruled out, with the evidence that settled it. Nothing is
left unresolved.

### Verdict

AC-17.4.1.1.1.2.1 is satisfied: working from the AC-17.4.1.1.1.1.3
candidate shortlist against the pinned commit
(`eb263137b98935754155824de2a03848121304b6`), 13 of its 14 entries are
confirmed from application code as genuinely participating in a
Gallery's own `events.expires_at` lifecycle on the Gallery path, each
with a one-line reason and file:line evidence. The 14th, `expirationChecker`,
is found from the same code-level reading not to be the gallery-lifetime
field — its only occurrence is a hardcoded status literal disconnected
from any Gallery's `expires_at` — and is moved into a new ruled-out
group, "Hardcoded system-status labels," alongside the eight
AC-17.4.1.1.1.1.2 began. The confirmed set (13 entries) and the
corrected ruled-out entry are reconciled against the full 14-entry
shortlist so each appears exactly once, with nothing left unresolved.
No entry above was settled because it looked promising or unpromising —
each disposition is anchored to the code cited. This confirmed set is
what AC-17.4.1.1.1.2.2 and AC-17.4.1.1.1.2.3 go on to evidence on the
write and read paths respectively.

## AC-17.4.1.1.1.2.2.1 — the write path: creation-path evidence for the confirmed set

`US-17` AC-17.4.1.1.1.2.2.1 works from the 13-entry confirmed set
AC-17.4.1.1.1.2.1 settled above. For each of those 13 entries, this
section records — against the pinned commit
(`eb263137b98935754155824de2a03848121304b6`) — the code that writes or
determines it on the Gallery creation path, the inputs and code that
compute it where the value is computed rather than given, and the role
it plays on that path. Where inspection finds no creation-path write, it
is recorded as such together with the creation route(s) inspected to
reach that; it does not decide here whether that absence is expected
(derived, computed elsewhere, or a default/policy value) — that question
belongs to AC-17.4.1.1.1.2.2.3. No entry is added to or moved off the
confirmed or ruled-out lists here.

### The Gallery creation path

The Gallery creation route is `POST /api/admin/events`
(`vendor/picpeak/backend/src/routes/adminEvents.js:330-864`), the same
route AC-17.1.3.1 already established as "the creation route used" for a
Gallery — admin-authenticated, gated by the seeded `events.create`
permission, and reached via `server.js:638` → `admin.js:22` (which
`require`s `./adminEvents` at line 9) ahead of the `adminEventRename.js`
mount at the same URL prefix (`server.js:652`). Throughout this section
`server.js` means `vendor/picpeak/backend/server.js` — it sits at the
backend root, not under `backend/src/`.

Two other reachable event-creation endpoints exist in the pinned commit
and were inspected for this AC wherever a confirmed-set entry had no
write on the primary route: `POST /api/events`
(`vendor/picpeak/backend/src/routes/events.js:60`, `adminAuth`-gated but
without the `events.create` RBAC check, mounted at `server.js:632` — an
older, parallel implementation of the same create flow, not the route
AC-17.1.3.1 exercised) and `POST /api/v1/events`
(`vendor/picpeak/backend/src/routes/v1/events.js:114`, gated by
`apiTokenAuth` + `requireApiScope('admin')`, mounted at `server.js:720`
— the external integration API). A fourth insert site,
`vendor/picpeak/backend/src/routes/adminEvents-enhanced.js:92`, is never
`require`d by `server.js` and is unreachable dead code, so it is not a
creation route and is not inspected further. None of the seven
no-write entries below appear in either of the two other reachable
routes either (confirmed by grepping each file for every entry's
name/string); the six written entries are evidenced only against the
primary route, consistent with AC-17.1.3.1's own choice of that route as
"the" Gallery creation path.

### File shorthand used by the tables below

The tables cite code by short name to stay readable. Each short name
resolves to exactly one file in the vendored fork at the pinned commit:

| Short name | Full path |
|---|---|
| `server.js` | `vendor/picpeak/backend/server.js` |
| `admin.js` | `vendor/picpeak/backend/src/routes/admin.js` |
| `adminEvents.js` | `vendor/picpeak/backend/src/routes/adminEvents.js` |
| `adminEvents-enhanced.js` | `vendor/picpeak/backend/src/routes/adminEvents-enhanced.js` |
| `events.js` | `vendor/picpeak/backend/src/routes/events.js` |
| `v1/events.js` | `vendor/picpeak/backend/src/routes/v1/events.js` |
| `adminDashboard.js` | `vendor/picpeak/backend/src/routes/adminDashboard.js` |
| `gallery.js` | `vendor/picpeak/backend/src/routes/gallery.js` |
| `auth.js` | `vendor/picpeak/backend/src/middleware/auth.js` |
| `expirationChecker.js` | `vendor/picpeak/backend/src/services/expirationChecker.js` |
| `webhookService.js` | `vendor/picpeak/backend/src/services/webhookService.js` |
| `workerManager.js` | `vendor/picpeak/backend/src/services/workerManager.js` |
| `db.js` | `vendor/picpeak/backend/src/database/db.js` |
| `CreateEventPage.tsx` | `vendor/picpeak/frontend/src/pages/admin/CreateEventPage.tsx` |

Note `events.js` and `v1/events.js` are distinct files with the same
basename; they are always cited with the disambiguating `v1/` prefix
where the v1 route is meant.

### Written or determined on the creation path (6 of 13)

| Entry | Name | Role on the creation path | Evidence (file:line) | What the code does |
|---|---|---|---|---|
| E1 | `expires_at` | The Gallery's own stored expiry timestamp — the value every other confirmed entry ultimately reads, gates on, or copies. | `adminEvents.js:592-606` (computed), `adminEvents.js:679` (stored), `adminEvents.js:857` (echoed in the create response) | Computed from `event_date` (or, if absent, the current date) plus `expiration_days` (E10) days, but only when `fieldRequirements.require_expiration` (E7/E12) is true; otherwise stays `null`. `expires_at.setDate(expires_at.getDate() + parseInt(expiration_days, 10))` at line 605. Stored into the `events` insert as `expires_at: expires_at ? expires_at.toISOString() : null` (line 679), and the same value is echoed back in the `POST` response body (line 857). |
| E4 | `expiry_date` | A copy of E1's just-computed value, embedded in the creation-confirmation email so the client sees the Gallery's expiry date in the email PicPeak queues when the Gallery is created. | `adminEvents.js:792-802` (built), `adminEvents.js:800` (set from E1), `adminEvents.js:812-820` (queued) | `expiry_date: expires_at ? expires_at.toISOString() : null` (line 800) is set directly from the `expires_at` local variable E1 computed earlier in the same handler, inside the `emailData` object built at lines 792-802 and then serialised into `email_data: JSON.stringify(emailData)` (line 816) by the `db('email_queue').insert({...})` call at lines 812-820. This only runs conditionally — `if (customerEmail && !isDraft)` (line 790), where `isDraft = parseBooleanInput(is_draft, true)` (line 788) and `is_draft` is destructured with a `true` default (line 482) — so a Gallery created without an explicit `is_draft: false` in the request does not queue this email or write this value at all. |
| E7 | `event_require_expiration` | Global admin-configured policy switch deciding, per new Gallery, whether E1's `expires_at` is computed at all. | `adminEvents.js:71-89,104` (read into `fieldRequirements.require_expiration`), `adminEvents.js:431` (called), `adminEvents.js:596` (used as the gate) | `getEventFieldRequirements()` (defined lines 71-118) selects the `app_settings` row keyed `event_require_expiration` and assigns it to `requirements.require_expiration` at line 104 (defaulting to `true` if the setting row is absent, lines 84-89). The create handler calls it into `fieldRequirements` at line 431, then gates E1's whole computation block on it: `if (fieldRequirements.require_expiration) { ... }` (line 596). |
| E10 | `expiration_days` | Per-Gallery input controlling how many days after the base date the Gallery expires — the addend in E1's computation. | `adminEvents.js:376` (validated), `adminEvents.js:446` (destructured, default `30`), `adminEvents.js:605` (used) | `body('expiration_days').isInt({ min: 1, max: 365 }).optional()` validates the request field; destructured from `req.body` with `expiration_days = 30` as the fallback (line 446); consumed directly by `expires_at.setDate(expires_at.getDate() + parseInt(expiration_days, 10))` (line 605), the same computation cited for E1. |
| E11 | `general_default_expiration_days` | Client-side default that seeds the admin's form before submission — determines the out-of-the-box `expiration_days` (E10) value for new Galleries unless the admin overrides it in the form. | `CreateEventPage.tsx:237-244` (prefill), `CreateEventPage.tsx:463` (submitted as `expiration_days`) | A `useEffect` (lines 237-244) sets `formData.expires_in_days` from `settings.general_default_expiration_days` (read at line 238, assigned at line 241) whenever the admin settings load, replacing the hardcoded `expires_in_days: 30` initial value at line 124. On submit, `expiration_days: requireExpiration ? formData.expires_in_days : undefined` (line 463) is the exact field name and value the `POST /api/admin/events` body carries as E10. This is server-adjacent (it runs in the admin browser, not in `adminEvents.js`), but it is the code that determines the value E10 receives absent an explicit admin edit, and it is part of the same admin "create event" screen/flow as the route above. |
| E12 | `require_expiration` | Same runtime gate as E7 — AC-17.4.1.1.1.2.1 already found E12 names the identical boolean read at `adminEvents.js:596`, not a separate field; this AC's creation-path reading confirms that identity rather than reopening it. | `adminEvents.js:596` | `if (fieldRequirements.require_expiration) { ... }` — the same conditional cited for E7 above; there is no second, independently-written `require_expiration` value on the creation path. |

### No creation-path write found (7 of 13)

Each of the following was searched for by name/string across all three
reachable event-creation routes (`adminEvents.js`'s `POST /`, `events.js`'s
`POST /`, `v1/events.js`'s `POST /events`) and found in none of them —
every occurrence of each name in the pinned commit's backend source is
outside those three handlers.

| Entry | Name(s) | Where the name does occur (not creation-path) | Creation routes inspected |
|---|---|---|---|
| E5 | `expiration_warning` | `expirationChecker.js:36,78` — a scheduled background job (`startExpirationChecker`, `services/workerManager.js:18`) that queries already-stored `events` rows and queues a warning email; `database/db.js:468` is a schema-migration comment listing it as an `email_templates.template_key` value, not a code write. | `adminEvents.js` `POST /` (no occurrence); `events.js` `POST /` (no occurrence); `v1/events.js` `POST /events` (no occurrence). |
| E6 | `gallery_expired` / `galleryExpiredExists` | `expirationChecker.js:46-53,144,149` — same background job; `handleExpiredEvent` queues this email only for rows the job's own query already matched with `expires_at <= now`, i.e. after creation, on a schedule. | Same three routes inspected; no occurrence in any. |
| E13 | `is_expired` | `routes/gallery.js:186` — the public, client-facing gallery-access route; computed on each read from the already-stored `expires_at` (`!event.is_active \|\| (event.expires_at && new Date(event.expires_at) < new Date())`). | Same three routes inspected; no occurrence in any. |
| E16 | `GALLERY_EXPIRED` | `middleware/auth.js:181-182` — the access-gate middleware that returns this code when a request for an already-created Gallery arrives after its `expires_at`; only reachable on a subsequent access attempt, never during creation. | Same three routes inspected; no occurrence in any. |
| E30 | `expiringEvents` | `routes/adminDashboard.js:24-30` — a dashboard aggregate count query filtering already-stored `events` rows by `expires_at` between now and 7 days out (lines 27-28), surfaced as a stat at line 101. | Same three routes inspected; no occurrence in any. |
| E32 | `expiring` | `adminEvents.js:906-913` — but inside `router.get('/', ...)` (the list endpoint, line 867), a different handler in the same file that filters already-stored rows by `status === 'expiring'`; not inside the `POST /` handler this AC evidences. | Same three routes inspected (including a second look at `adminEvents.js` specifically for occurrences outside `POST /`); no occurrence inside any `POST` creation handler. |
| E33 | `event.expired` | `services/webhookService.js:17` — a member of the frozen `EVENT_TYPES` list (lines 13-21) — and `services/expirationChecker.js:105`, the sole `webhookService.fire('event.expired', ...)` call, inside `handleExpiredEvent` (line 94), reached by the same background job's `expires_at <= now` query as E6 (line 50), never from the creation route (which instead fires `event.created` at `adminEvents.js:767` and `event.published` at `adminEvents.js:829`). | Same three routes inspected; no occurrence in any. |

### Reconciling against the AC-17.4.1.1.1.2.1 confirmed set

| Entry | Creation-path disposition |
|---|---|
| E1 | Written — `adminEvents.js:679`. |
| E4 | Written (conditionally) — `adminEvents.js:800,812-820`. |
| E5 | No creation-path write found. |
| E6 | No creation-path write found. |
| E7 | Written (as the E1 gate) — `adminEvents.js:104,596`. |
| E10 | Written — `adminEvents.js:446,605`. |
| E11 | Written (client-side, feeds E10) — `CreateEventPage.tsx:237-244,463`. |
| E12 | Written (same location as E7) — `adminEvents.js:596`. |
| E13 | No creation-path write found. |
| E16 | No creation-path write found. |
| E30 | No creation-path write found. |
| E32 | No creation-path write found. |
| E33 | No creation-path write found. |

That is 6 written plus 7 no-write dispositions — 6 + 7 = 13, matching the
AC-17.4.1.1.1.2.1 confirmed set exactly, with every entry appearing once.

### No contradiction of AC-17.4.1.1.1.2.1's dispositions

Reading each entry's creation-path evidence here does not contradict any
disposition AC-17.4.1.1.1.2.1 recorded — that AC confirmed each of the 13
entries as genuinely participating in a Gallery's own `expires_at`
lifecycle *somewhere* on the Gallery path (creation, read, or background
job), not specifically that each has a creation-path write. Finding that
7 of the 13 participate only on the read path or in a background job
(E5, E6, E13, E16, E30, E32, E33) is consistent with, not a correction
of, AC-17.4.1.1.1.2.1's own file:line citations for those entries, which
already pointed at `expirationChecker.js`, `gallery.js`, `auth.js`, and
`adminDashboard.js` rather than `adminEvents.js`'s creation handler. No
file:line cited here disagrees with anything AC-17.4.1.1.1.2.1 cited.

Four citations are stated here at a tighter line range than
AC-17.4.1.1.1.2.1 gave them, after re-reading the same code: E11
`CreateEventPage.tsx:236-242` → `237-244` (the `useEffect` runs 237-244;
236 is its preceding comment and 243-244 close it), E30
`adminDashboard.js:23-29` → `24-30` (23 is blank; the query runs 24-30),
E33 `webhookService.js:16-17` → `:17` (16 is `'event.archived'`; only 17
is `'event.expired'`) and `expirationChecker.js:99-119` → `:105` (the
single `fire('event.expired', ...)` call inside `handleExpiredEvent`,
line 94). Each refinement lands inside or immediately adjacent to the
range AC-17.4.1.1.1.2.1 gave and points at the same code for the same
reason, so none is a contradiction of a disposition and none is carried
to AC-17.4.1.1.1.2.2.3 as one; they are recorded here only so a reader
comparing the two sections line-for-line is not left guessing.

### Verdict

AC-17.4.1.1.1.2.2.1 is satisfied: for every one of the AC-17.4.1.1.1.2.1
confirmed set's 13 entries, this section records — against the pinned
commit (`eb263137b98935754155824de2a03848121304b6`) — either the
creation-path code that writes or determines it, with the inputs and
computing code where the value is computed (E1, E4, E7, E10, E11, E12),
or that no creation-path write was found together with the three
creation routes inspected to reach that conclusion (E5, E6, E13, E16,
E30, E32, E33). Each entry states the role it plays on the creation
path. Nothing is decided here about whether a no-write finding is the
field's expected upstream shape — that is AC-17.4.1.1.1.2.2.3's
deliverable — and no entry is added to, or moved between, the confirmed
or ruled-out lists AC-17.4.1.1.1.2.1 settled. This is a code-level
finding only; no live Gallery was created or changed for it.

## AC-17.4.1.1.1.2.2.2

| Entry | Name(s) | Call site(s) (of the fifteen) | Set / extended / recomputed / cleared | Inputs and computing code |
|---|---|---|---|---|
| E1 | `expires_at` | `routes/adminEvents.js:284`; `routes/events.js:346`; `routes/events.js:383`; `services/eventService.js:448`; `services/eventService.js:478` | Cleared (`adminEvents.js:284`); set (`events.js:346`, `eventService.js:448`); extended (`events.js:383`, `eventService.js:478`) | `adminEvents.js:284`: `deleteEventCascade`'s `trx('events').where('id', eventId).del()` removes the whole row, `expires_at` included, inside a transaction also deleting the event's `activity_logs`/`access_logs`/`email_queue`/`photos` rows.<br>`events.js:346`: `update(updates)` where `updates = {...req.body}` minus `id`/`slug`/`created_at`/`password_confirmation` (`host_name`/`host_email` rejected outright) — an `expires_at` value present in the request body is written through unchanged, not recomputed.<br>`events.js:383`: the `/:id/extend` handler — `newExpiration = new Date(event.expires_at); newExpiration.setDate(newExpiration.getDate() + days)` (`days` validated `1`–`365`), then `update({ expires_at: newExpiration, is_active: true })`.<br>`eventService.js:448`: `updateEvent(id, updates)` — the same generic passthrough as `events.js:346`, over a caller-supplied `updates` object with the same keys stripped.<br>`eventService.js:478`: `extendExpiration(id, days)` — the same computation as `events.js:383`. |
| E4 | `expiry_date` | `routes/adminEvents.js:1063`; `services/expirationChecker.js:97` | Set (both, copied from the row's `expires_at`) | `adminEvents.js:1063`: the `/:id/publish` handler's `update({ is_draft: false })` at this line is followed, in the same handler, by `emailData.expiry_date = event.expires_at ? new Date(event.expires_at).toISOString() : null` (built into the `emailData` object, then `db('email_queue').insert(...)`), gated on `if (customerEmail)`.<br>`expirationChecker.js:97`: `handleExpiredEvent`'s `update({ is_active: false })` at this line is followed, in the same function, by `customerVars.expiry_date = event.expires_at`, used in the `gallery_expired` emails queued right after. |
| E5 | `expiration_warning` | — | No edit-path write found | — |
| E6 | `gallery_expired` / `galleryExpiredExists` | `services/expirationChecker.js:97` | Set | `handleExpiredEvent`'s `update({ is_active: false })` at this line is followed, in the same function, by `queueEmail(event.id, recipientEmail, 'gallery_expired', customerVars)` and, when a distinct admin email is configured, a second `'gallery_expired'` queue call for the admin. |
| E7 | `event_require_expiration` | — | No edit-path write found | — |
| E10 | `expiration_days` | — | No edit-path write found | — |
| E11 | `general_default_expiration_days` | — | No edit-path write found | — |
| E12 | `require_expiration` | — | No edit-path write found | — |
| E13 | `is_expired` | — | No edit-path write found | — |
| E16 | `GALLERY_EXPIRED` | — | No edit-path write found | — |
| E30 | `expiringEvents` | — | No edit-path write found | — |
| E32 | `expiring` | — | No edit-path write found | — |
| E33 | `event.expired` | `services/expirationChecker.js:97` | Set | `handleExpiredEvent`'s `update({ is_active: false })` at this line is followed, in the same function, by `webhookService.fire('event.expired', { event: {...}, expires_at: event.expires_at })` inside a non-fatal `try`/`catch`. |

4 of 13 rows carry a write (E1, E4, E6, E33); 9 of 13 rows carry `no edit-path write found` (E5, E7, E10, E11, E12, E13, E16, E30, E32); 4 + 9 = 13.

## AC-17.4.1.1.1.2.2.3 — reconciling write-path disposition: one disposition per confirmed field

`US-17` AC-17.4.1.1.1.2.2.3 works from the creation-path evidence
AC-17.4.1.1.1.2.2.1 recorded and the edit-path evidence
AC-17.4.1.1.1.2.2.2 recorded, both against the AC-17.4.1.1.1.2.1
confirmed set's 13 entries. Every entry is given exactly one write-path
disposition here — **written on creation**, **written on edit**,
**written on both**, or **never written on the Gallery path** —
reconciling the two prior sections' per-entry findings rather than
re-deriving them from code. Where an entry is never written, this
section records the actual upstream shape (derivation, computed value,
or fixed/default literal) with the file:line establishing it, rather
than leaving the absence unexplained. No entry is added to or moved
between the confirmed and ruled-out lists here.

### Reconciling the creation-path and edit-path findings

| Entry | Name(s) | Creation-path (AC-17.4.1.1.1.2.2.1) | Edit-path (AC-17.4.1.1.1.2.2.2) | Write-path disposition |
|---|---|---|---|---|
| E1 | `expires_at` | Written — `adminEvents.js:679` | Written — `adminEvents.js:284` (cleared), `events.js:346`/`eventService.js:448` (set), `events.js:383`/`eventService.js:478` (extended) | **Written on both** |
| E4 | `expiry_date` | Written (conditionally) — `adminEvents.js:800,812-820` | Written — `adminEvents.js:1063` (publish-email copy), `expirationChecker.js:97` (expiry-email copy) | **Written on both** |
| E5 | `expiration_warning` | No creation-path write found | No edit-path write found | **Never written** — see below |
| E6 | `gallery_expired` / `galleryExpiredExists` | No creation-path write found | Written — `expirationChecker.js:97` | **Written on edit only** |
| E7 | `event_require_expiration` | Written (as the E1 gate) — `adminEvents.js:104,596` | No edit-path write found | **Written on creation only** |
| E10 | `expiration_days` | Written — `adminEvents.js:446,605` | No edit-path write found | **Written on creation only** |
| E11 | `general_default_expiration_days` | Written (client-side, feeds E10) — `CreateEventPage.tsx:237-244,463` | No edit-path write found | **Written on creation only** |
| E12 | `require_expiration` | Written (same location as E7) — `adminEvents.js:596` | No edit-path write found | **Written on creation only** |
| E13 | `is_expired` | No creation-path write found | No edit-path write found | **Never written** — see below |
| E16 | `GALLERY_EXPIRED` | No creation-path write found | No edit-path write found | **Never written** — see below |
| E30 | `expiringEvents` | No creation-path write found | No edit-path write found | **Never written** — see below |
| E32 | `expiring` | No creation-path write found | No edit-path write found | **Never written** — see below |
| E33 | `event.expired` | No creation-path write found | Written — `expirationChecker.js:97` (`webhookService.fire`) | **Written on edit only** |

### Counts against the confirmed set

- Written on both creation and edit: E1, E4 — **2**
- Written on creation only: E7, E10, E11, E12 — **4**
- Written on edit only: E6, E33 — **2**
- Never written on the Gallery path: E5, E13, E16, E30, E32 — **5**

2 + 4 + 2 + 5 = **13**, matching the AC-17.4.1.1.1.2.1 confirmed set
exactly. Every one of the 13 entries carries exactly one write-path
disposition above, so every field is accounted for and none is left
without one.

### The five never-written entries: actual upstream shape

Each of these five is never written to a Gallery's own `events` row
anywhere in application code (per the exhaustive creation-route and
fifteen-call-site edit-route inspections AC-17.4.1.1.1.2.2.1 and
AC-17.4.1.1.1.2.2.2 already ran). Rather than leaving that absence
unexplained, this is the actual shape each one has instead:

| Entry | Name(s) | Actual upstream shape | File:line establishing it |
|---|---|---|---|
| E5 | `expiration_warning` | An email-template/notification-kind literal, not a Gallery column. The scheduled job (`expirationChecker.js`) queries `events` rows already matching `expires_at <= warningDate`, checks whether an email of this literal type was already queued for that row, then passes the literal string as the `email_type` argument to `queueEmail`. | `vendor/picpeak/backend/src/services/expirationChecker.js:36` (`.where('email_type', 'expiration_warning')`), `:78` (`await queueEmail(event.id, recipientEmail, 'expiration_warning', {`) |
| E13 | `is_expired` | Computed on every read from the already-stored `is_active` and `expires_at` columns, never itself persisted. | `vendor/picpeak/backend/src/routes/gallery.js:186` (`is_expired: !event.is_active \|\| (event.expires_at && new Date(event.expires_at) < new Date())`) |
| E16 | `GALLERY_EXPIRED` | A hardcoded response-code literal returned by the access-gate middleware when an already-created Gallery's stored `expires_at` has passed; the literal itself is never written to any row. | `vendor/picpeak/backend/src/middleware/auth.js:179-182` (`if (event.expires_at && new Date(event.expires_at) < new Date()) { return res.status(410).json({ error: 'Gallery has expired', code: 'GALLERY_EXPIRED' }); }`) |
| E30 | `expiringEvents` | A dashboard response-object key for a live aggregate `COUNT` over already-stored `events` rows filtered by `expires_at`, computed fresh on every dashboard request rather than stored anywhere. | `vendor/picpeak/backend/src/routes/adminDashboard.js:24-30` (the `count('id as count')` query filtered on `expires_at`), `:101` (`expiringEvents: expiringEvents.count \|\| 0` in the response body) |
| E32 | `expiring` | A request-time list-filter value: the admin UI passes `status=expiring` as a query parameter, which the list handler compares against the literal string to decide whether to add an `expires_at`-range `WHERE` clause; it is never written to a row. | `vendor/picpeak/backend/src/routes/adminEvents.js:905` (`} else if (status === 'expiring') {`), `:906-913` (the `expires_at`-range filter it adds) |

None of the five is stored, computed-and-cached, or defaulted onto the
Gallery's own row at any point — each is either a literal string used to
classify or filter, or a value computed fresh from already-stored
`is_active`/`expires_at` at read or dashboard-query time.

### No contradiction found

Re-reading the creation-path and edit-path evidence together to build
the table above surfaces no contradiction against any
AC-17.4.1.1.1.2.1 disposition, and none against AC-17.4.1.1.1.2.2.1's or
AC-17.4.1.1.1.2.2.2's own findings — every file:line cited in the
reconciliation table above is a citation already made by one of those
two sections, and the five never-written entries' actual-shape table
re-reads the same code those two sections already pointed at (or, for
E5/E16/E30, code adjacent to it) to state the shape rather than reopen
the disposition. No shortlist entry, confirmed-set entry, or ruled-out
entry from AC-17.4.1.1.1.2.1 or AC-17.4.1.1.1.1.2 required correction,
so the confirmed set (13 entries) and the ruled-out list stand unchanged
in both places.

### Unresolved rows carried from AC-17.4.1.1.1.2.2.2: none

AC-17.4.1.1.1.2.2.2 left no row marked unresolved — its table gives
each of the 13 confirmed entries a definite edit-path disposition (a
call site among the fifteen, or `no edit-path write found`), and its own
reconciliation states "4 of 13 rows carry a write ... 9 of 13 rows carry
`no edit-path write found`; 4 + 9 = 13" with nothing outstanding. There
is therefore nothing to settle here from that AC, and nothing to carry
forward as still unresolved.

### Verdict

AC-17.4.1.1.1.2.2.3 is satisfied: every one of the AC-17.4.1.1.1.2.1
confirmed set's 13 entries is given exactly one write-path disposition —
written on both creation and edit (E1, E4 — 2), written on creation only
(E7, E10, E11, E12 — 4), written on edit only (E6, E33 — 2), or never
written on the Gallery path (E5, E13, E16, E30, E32 — 5) — and the
resulting counts (2 + 4 + 2 + 5 = 13) are stated against the size of the
confirmed set, so every field is accounted for and none is left without
a write-path disposition. Each of the five never-written entries is
recorded with the actual upstream shape it has instead (a
notification-kind literal, a read-time-computed value, a hardcoded
response code, a dashboard aggregate key, or a request-time filter
value) and the file:line establishing that shape, rather than being
worked around or left blank. No contradiction against
AC-17.4.1.1.1.2.1, AC-17.4.1.1.1.2.2.1, or AC-17.4.1.1.1.2.2.2 was
found, so the confirmed set and ruled-out list are unchanged and no
candidate moves between lists. AC-17.4.1.1.1.2.2.2 left no row
unresolved, so nothing is carried forward as still-unresolved. This
closed write-path record is what AC-17.4.1.1.1.2.3 goes on to pair with
the read path. It is a code-level finding: no live Gallery was created
or changed for it.

## AC-17.4.1.1.1.2.3 — the read path, and the closing finding this group of criteria exists to produce

`US-17` AC-17.4.1.1.1.2.3 works from the same AC-17.4.1.1.1.2.1 confirmed
set of 13 entries, against the same pinned commit
(`eb263137b98935754155824de2a03848121304b6`). For each entry it records
the code that reads it **on the Gallery path** — where it is read when a
Gallery is served to a viewer, and where it is read when an access
decision is made about that viewer — stating whether each read gates
access, only reports state, or does both. Where a confirmed entry is
never read on the Gallery path, that is recorded as the actual upstream
shape with the evidence establishing it, per the same rule
AC-17.4.1.1.1.2.2.3 already applied to the write path. Nothing moves
between the confirmed and ruled-out lists here except with the file:line
that settles it, recorded in both places — none does. This is a
code-level finding: no live Gallery was created or changed for it.

### What "the Gallery path" means here, and the surfaces inspected

"The Gallery path" is read the same way the preceding write-path
criteria scoped it: code that runs when an actual client (guest, the
per-event "client" access level, or a Customer-dashboard user) is served
a Gallery or has an access decision made about them — as distinct from
admin-only monitoring/listing screens, which are a different audience on
a different, `adminAuth`-gated path. Every route and middleware file that
reads `expires_at`, `is_expired`, or any other confirmed-set name was
inspected; the ones that turned out to sit on the Gallery path are:

| Short name | Full path | What it is |
|---|---|---|
| `gallery.js` | `vendor/picpeak/backend/src/routes/gallery.js` | The public, client-facing gallery routes (`/resolve`, `/:slug/info`, `/:slug/photos`, `/:slug/download*`, `/:slug/photo\|thumbnail\|hero\|preview/:photoId`, `/:slug/stats`). |
| `middleware/gallery.js` | `vendor/picpeak/backend/src/middleware/gallery.js` | Exports `verifyGalleryAccess`, the access-gate middleware every one of `gallery.js`'s protected routes above actually uses. |
| `routes/auth.js` | `vendor/picpeak/backend/src/routes/auth.js` | The guest/client login routes that exchange a slug (+ optional password/share-token) for a gallery JWT (`POST /gallery/verify`, `/gallery/:slug/client-login`, `/gallery/share-login`), plus `GET /session`. |
| `middleware/auth.js` | `vendor/picpeak/backend/src/middleware/auth.js` | Exports a *second*, differently-implemented `galleryAuth` and a *second* `verifyGalleryAccess` — distinct functions from the ones in `middleware/gallery.js` above, inspected below because AC-17.4.1.1.1.2.1 cited this file for E1. |
| `routes/customer.js` | `vendor/picpeak/backend/src/routes/customer.js` | The Customer-dashboard routes (the "Client" identity from AC-17.1.1) that list a Customer's assigned Galleries and exchange a Customer session for a gallery JWT. |
| `GalleryPage.tsx` | `vendor/picpeak/frontend/src/pages/GalleryPage.tsx` | The frontend page component that renders a Gallery to a viewer, consuming `gallery.js`'s `/:slug/info` response. |

`routes/adminDashboard.js` (E30) and `adminEvents.js`'s list handler
(E32) were re-inspected here as well, specifically to confirm they sit
outside this set — both are gated by `adminAuth` +
`requirePermission(...)` (`adminDashboard.js:10`, `adminEvents.js:867`),
reached only via `/api/admin/...`, never by a guest, client, or Customer
request for a specific Gallery.

### A dead-code finding that changes where the real access gate is: `middleware/auth.js`'s `galleryAuth` is never wired to any route

AC-17.4.1.1.1.2.1 cited `middleware/auth.js:178-182` as the evidence for
E1 gating gallery access on `expires_at`. Re-reading that file for this
AC's read-path evidence turns up a structural fact the write-path
sections had no reason to surface: `middleware/auth.js` defines its own
`galleryAuth` (lines 132-200, `expires_at` check at 178-182,
`GALLERY_EXPIRED` literal at 182) and its own `verifyGalleryAccess`
(lines 262-287), separate functions from the identically-named
`verifyGalleryAccess` exported by `middleware/gallery.js` that
`gallery.js`'s routes actually import (`gallery.js:9`). A search of every
`require(...)` of `middleware/auth.js` in the pinned commit —

```
$ grep -rn "middleware/auth['\"])" vendor/picpeak/backend/server.js vendor/picpeak/backend/src -r
vendor/picpeak/backend/server.js:726:  const { adminAuth } = require('./src/middleware/auth');
vendor/picpeak/backend/src/routes/adminApiTokens.js:11:const { adminAuth } = require('./../middleware/auth');
vendor/picpeak/backend/src/routes/adminArchives.js:7:const { adminAuth } = require('../middleware/auth');
... (39 route files total, every one destructuring only `adminAuth`)
```

— shows every one of the 39 files that requires `middleware/auth.js`
destructures only `adminAuth`. Neither `galleryAuth`, `photoAuth`, nor
`middleware/auth.js`'s own `verifyGalleryAccess` is imported anywhere.
(`routes/galleryFeedback.js`'s `photoAuth` is a same-named but distinct
function from `middleware/photoAuth.js`, a different file — confirmed by
reading its import, `galleryFeedback.js:3`.) `middleware/auth.js:178-182`
— and the `GALLERY_EXPIRED` literal at line 182 — is therefore dead code:
it is never reached by any live request, on the Gallery path or any
other. AC-17.4.1.1.1.2.1's citation of this line as evidence that E1
"gates gallery access directly on the column" is not wrong about what
the code *does* if called, but this AC's read-path inspection is what
establishes it is *never called* — the actual access-gating code lives
elsewhere, evidenced below. This does not move E1 or E16 between the
confirmed and ruled-out lists (both remain confirmed as genuinely
participating in the Gallery's own `expires_at` lifecycle, per
AC-17.4.1.1.1.2.1's own reasoning, which did not require the cited code
to be reachable); it changes only which citation is the operative one for
E1's and E16's actual read-path role, recorded below.

### Per-entry read-path evidence

| Entry | Name(s) | Read on the Gallery path? | Evidence (file:line) | Role |
|---|---|---|---|---|
| E1 | `expires_at` | Yes — five sites, three of them live | `gallery.js:116` (selected), `:184` (returned in `/:slug/info` response) | Reports state — `/:slug/info` never blocks on it. |
| | | | `gallery.js:475` (returned in `/:slug/photos` response, inside the handler `verifyGalleryAccess` already let through) | Reports state — read after access is already granted by a middleware that does not itself check this column (see below). |
| | | | `customer.js:148` (`if (event.expires_at && new Date(event.expires_at) < new Date())`, inside `GET /events/:slug/access-token`) | **Gates** — returns `410 {"error":"This gallery has expired"}` before a Customer's gallery JWT is minted (`customer.js:168-181`). |
| | | | `auth.js:576` (`if (event.expires_at && new Date(event.expires_at) < new Date())`, inside `GET /session`) | **Gates** — flips an existing gallery token's session-validity report to `{valid:false, error:'Gallery has expired'}` (`auth.js:577`). |
| | | | `middleware/auth.js:178-182` (dead `galleryAuth`, see above) | Neither — unreachable; would gate if it were ever called, but it is not on the Gallery path at all. |
| E4 | `expiry_date` | No | — | Never read on the Gallery path — see the "never read" table below. |
| E5 | `expiration_warning` | No | — | Never read on the Gallery path — see below. |
| E6 | `gallery_expired` / `galleryExpiredExists` | No | — | Never read on the Gallery path — see below. |
| E7 | `event_require_expiration` | No | — | Never read on the Gallery path — see below. |
| E10 | `expiration_days` | No | — | Never read on the Gallery path — see below. |
| E11 | `general_default_expiration_days` | No | — | Never read on the Gallery path — see below. |
| E12 | `require_expiration` | No | — | Never read on the Gallery path — see below. |
| E13 | `is_expired` | Yes — computed on the backend, consumed by the frontend | `gallery.js:186` (`is_expired: !event.is_active \|\| (event.expires_at && new Date(event.expires_at) < new Date())`, inside `/:slug/info`) | Reports state in the API response — `/:slug/info` still returns `200` with this field regardless of its value. |
| | | | `GalleryPage.tsx:275` (`if (galleryInfo?.is_expired) { return <expired-state UI>; }`) | **Gates** — this `if` sits ahead of the `isAuthenticated && event` branch (`GalleryPage.tsx:336`) that renders the password prompt / gallery view, so a viewer never reaches either once `is_expired` is true, regardless of whether they already hold a valid token. |
| E16 | `GALLERY_EXPIRED` | No | `middleware/auth.js:182` is the only occurrence in the pinned commit (confirmed by grep of the whole backend and frontend source trees); it sits inside the same dead `galleryAuth` function documented above. | Never read on the Gallery path — see below (a literal string that is emitted by no live response). |
| E30 | `expiringEvents` | No | — | Never read on the Gallery path — see below. |
| E32 | `expiring` | No | — | Never read on the Gallery path — see below. |
| E33 | `event.expired` | No | — | Never read on the Gallery path — see below. |

### Where the guest/client token-issuing routes do *not* read `expires_at`, for contrast

The absence above is not an oversight in this audit's search — it was
confirmed by reading each of the three guest/client gallery-login
handlers in full. None of them checks `expires_at` before minting a
24-hour gallery JWT; each checks only `is_active`/`is_archived` (and,
where relevant, the password/share-token):

| Route | Evidence (file:line) | What it checks before minting a token |
|---|---|---|
| `POST /api/auth/gallery/verify` | `auth.js:197-199` (`db('events').where({slug, is_active:..., is_archived:...})`), `:231` (password compare) | `is_active`, `is_archived`, password — no `expires_at` read anywhere in the handler (`auth.js:184-294`). |
| `POST /api/auth/gallery/:slug/client-login` | `auth.js:311-313` (same `is_active`/`is_archived` filter), `:328` (password compare) | Same — no `expires_at` read in the handler (`auth.js:297-370`). |
| `POST /api/auth/gallery/share-login` | `auth.js:398-400` (same filter), `:414-416` (share-token compare) | Same — no `expires_at` read in the handler (`auth.js:373-457`). |

And once a token exists, `middleware/gallery.js`'s `verifyGalleryAccess`
— the middleware `gallery.js` actually mounts on every protected route
(`/:slug/photos`, `/:slug/download*`, `/:slug/photo\|thumbnail\|hero\|preview/:photoId`,
`/:slug/stats`, `/:eventId/upload`) — filters the `events` row only on
`slug`/`id`, `is_active`, `is_archived`, and (for anonymous requests)
`is_draft`, across its three query branches (`middleware/gallery.js:34-38,40`
no-token/public branch; `:87-91,93` slug branch; `:107-111,113` fallback
eventId branch); a full read of the file (177 lines) confirms
`expires_at` appears nowhere in it. So a
guest, client, or Customer who already holds a token issued before a
Gallery's `expires_at` passed — or who obtains one through a login route
above, none of which reject an already-expired Gallery on `is_active`
grounds alone — is never blocked from listing, viewing, or downloading
photos through any code path this section inspected. The only two live
backend reads that gate on `expires_at` are the Customer-dashboard
token-exchange route and the session-validity check, both cited above;
neither sits in front of the actual photo-serving routes. This is exactly
the "confirmed field's role, stated honestly" this AC calls for, not a
defect to be silently patched here.

### The seven entries never read on the Gallery path: actual upstream shape

Each of these was searched for by name/string across every file listed
in "surfaces inspected" above (`gallery.js`, `middleware/gallery.js`,
`auth.js`'s gallery-facing routes, `middleware/auth.js`, `customer.js`,
and `GalleryPage.tsx`) and found in none of them. Four of the five
never-*written* entries AC-17.4.1.1.1.2.2.3 already found
(`expiration_warning`, `GALLERY_EXPIRED`, `expiringEvents`, `expiring`)
are also never *read* on this path — plus three more (`expiry_date`,
`event_require_expiration`/`require_expiration`'s two names, and
`expiration_days`/`general_default_expiration_days`) that AC-17.4.1.1.1.2.2.3
found *were* written (on creation and/or edit) but this AC finds are
never read back anywhere on the Gallery-serving or access-decision path
— only on the admin-side creation form or inside outbound email
templating, which is a write/dispatch concern, not a read on this path.

| Entry | Name(s) | Actual upstream shape (why it is never read here) | File:line establishing it |
|---|---|---|---|
| E4 | `expiry_date` | Exists only as an outbound-email template variable, populated from E1 at the moment each email is queued (creation-confirmation, publish, expiry-warning/expired) and consumed only by the email formatter — never read back into any client- or Customer-facing response. | `vendor/picpeak/backend/src/routes/adminEvents.js:800` (built into `emailData`), `vendor/picpeak/backend/src/services/emailProcessor.js:599-600` (`if (processedVariables.expiry_date) { processedVariables.expiry_date = await formatDate(...) }` — the only place that reads the key back, to format it for the outgoing email body). |
| E5 | `expiration_warning` | An `email_type` literal the scheduled `expirationChecker` job queries against `email_queue` and passes to `queueEmail` — read only by that background job, never by a Gallery-serving or access-decision request. | `vendor/picpeak/backend/src/services/expirationChecker.js:36` (`.where('email_type', 'expiration_warning')`). |
| E6 | `gallery_expired` / `galleryExpiredExists` | Same shape as E5 — an `email_type` literal passed to `queueEmail` from inside the scheduled job's `handleExpiredEvent`, never read on a live request. | `vendor/picpeak/backend/src/services/expirationChecker.js:144,149` (`queueEmail(event.id, ..., 'gallery_expired', ...)`). |
| E7 / E12 | `event_require_expiration` / `require_expiration` | Read exactly once, at Gallery-creation time, to decide whether to compute `expires_at` at all (`adminEvents.js:104,596`, already cited under AC-17.4.1.1.1.2.2.1) — an admin-side creation-form setting, not something re-read when an existing Gallery is served or an access decision is made about it. | `vendor/picpeak/backend/src/routes/adminEvents.js:104,596` (same citations AC-17.4.1.1.1.2.2.1 already gave for the creation-path write; no further, separate read site exists anywhere in the pinned commit). |
| E10 / E11 | `expiration_days` / `general_default_expiration_days` | Read only inside the admin "create Gallery" form flow — `general_default_expiration_days` prefills the form (`CreateEventPage.tsx:238`), `expiration_days` is read once by `adminEvents.js` to compute the new Gallery's `expires_at` (`adminEvents.js:446,605`, already cited under AC-17.4.1.1.1.2.2.1). Neither is read again once the Gallery exists. | `vendor/picpeak/frontend/src/pages/admin/CreateEventPage.tsx:238`; `vendor/picpeak/backend/src/routes/adminEvents.js:446,605`. |
| E16 | `GALLERY_EXPIRED` | A response-code literal inside the dead `galleryAuth` function documented above; it is the only occurrence of the string in the entire pinned commit (backend and frontend), so nothing — not even error-handling code looking for this code — ever reads it. | `vendor/picpeak/backend/src/middleware/auth.js:182` (sole occurrence, confirmed by a whole-tree grep). |
| E30 | `expiringEvents` | A live aggregate `COUNT` computed fresh on every request to the admin dashboard stats endpoint, read only by `adminAuth`-gated admin UI, never by a Gallery-serving or access-decision request for a specific Gallery. | `vendor/picpeak/backend/src/routes/adminDashboard.js:10` (`adminAuth` gate), `:24-30,101` (the query and response key, already cited under AC-17.4.1.1.1.2.2.3's write-path table). |
| E32 | `expiring` | A request-time query-string filter value on the admin events list endpoint, read only inside that `adminAuth`+`events.view`-gated handler, never on the Gallery-serving or access-decision path. | `vendor/picpeak/backend/src/routes/adminEvents.js:867` (`adminAuth` gate), `:905-913` (the filter). |
| E33 | `event.expired` | An outbound webhook event-type string fired from inside the scheduled `expirationChecker` job (`services/expirationChecker.js:105`); its only "reader" is whatever external listener the operator wires up outside this application (US-17 AC-17.7's territory) — nothing inside the pinned commit itself reads it back on the Gallery path. | `vendor/picpeak/backend/src/services/webhookService.js:17` (the literal, in the frozen `EVENT_TYPES` list); `vendor/picpeak/backend/src/services/expirationChecker.js:105` (the sole `fire('event.expired', ...)` call). |

That is 9 entries never read on the Gallery path (E4, E5, E6, E7, E10,
E11, E12, E16, E30, E32, E33 — eleven names across 9 table rows, E7/E12
and E10/E11 each sharing a row per the same identity/pairing
AC-17.4.1.1.1.2.1 and AC-17.4.1.1.1.2.2.1 already established) plus 2
entries read on the Gallery path (E1, E13) — 9 + 2 = 11 rows covering all
13 confirmed entries (E7=E12 one gate, E10 feeds from E11 one
computation, matching the pairings the write-path sections already
recorded and not reopened here).

### No contradiction found; confirmed and ruled-out lists unchanged

Every file:line cited above either matches a citation
AC-17.4.1.1.1.2.1, AC-17.4.1.1.1.2.2.1, or AC-17.4.1.1.1.2.2.2 already
made, or is new evidence for a question those sections did not ask (a
read, not a write). The one new structural fact this AC surfaces —
`middleware/auth.js`'s `galleryAuth`/`verifyGalleryAccess` being dead
code — does not contradict AC-17.4.1.1.1.2.1's disposition of E1 or E16
as confirmed (that disposition rests on the code doing what it says if
reached, which it does), so the confirmed set (13 entries) and the
ruled-out list stand unchanged in both places; no entry moves.

### The closing finding: the field the pinned fork uses to express a Gallery's own expiry

Drawing only on the code evidence recorded across AC-17.4.1.1.1.2.1
through this criterion — not on documentation or assumption — the pinned
fork expresses a Gallery's own expiry with exactly one stored field:

**`events.expires_at`** (E1) is the Gallery's own expiry timestamp. It is
the only confirmed-set entry that is itself a persisted column on the
Gallery's own row (`events`): computed and written at creation
(`adminEvents.js:605,679`), cleared/set/extended on edit
(`events.js:346,383`, `eventService.js:448,478`,
`adminEvents.js:284` — AC-17.4.1.1.1.2.2.1/.2.2.2/.2.2.3), and read on
the Gallery path both to report state (`gallery.js:184,475`) and to gate
access at two of the pinned fork's live token-issuing/session surfaces
(`customer.js:148`, `auth.js:576` — this AC). Every other confirmed entry
is either derived from `expires_at` at read time and never itself
stored (`is_expired`, E13 — `gallery.js:186`, read on the Gallery path
to report state and, via the frontend, to gate the UI at
`GalleryPage.tsx:275`), or is a policy input that only shapes
`expires_at` at creation time (`event_require_expiration`/
`require_expiration`, `expiration_days`/`general_default_expiration_days`),
or is a downstream consumer of the already-computed value with no
Gallery-path read of its own (the email-template copy `expiry_date`, the
notification-kind literals `expiration_warning`/`gallery_expired`, the
hardcoded-and-unreachable `GALLERY_EXPIRED`, or the admin-only aggregates
`expiringEvents`/`expiring` and the outbound webhook `event.expired`).

Recorded honestly rather than worked around: the pinned fork's
enforcement of `events.expires_at` on the actual Gallery-serving path is
narrower than a single "the column gates access" statement would imply.
Two live surfaces gate on it directly — `GET
/api/customer/events/:slug/access-token` (`customer.js:148`, the
Customer-dashboard token exchange) and `GET /api/auth/session`
(`auth.js:576`, session-validity reporting for an already-issued token)
— but the three guest/client password- and share-token-based login
routes that mint the gallery JWT most Gallery viewers actually use
(`POST /api/auth/gallery/verify`, `/gallery/:slug/client-login`,
`/gallery/share-login`) never check it, and neither does
`middleware/gallery.js`'s `verifyGalleryAccess`, the single middleware
actually mounted on every protected photo-serving route. The one
function that would have closed that gap, `middleware/auth.js`'s
`galleryAuth`, is never wired to any route. The only place this gap is
closed for an ordinary (non-Customer-dashboard) viewer is the frontend:
`GalleryPage.tsx:275` refuses to render the password prompt or the
gallery once `/:slug/info`'s `is_expired` (E13) is true. This is the
actual upstream shape established by the evidence above, not a
workaround applied by this audit — it is the finding
AC-17.4.1.1.2 (the PostgreSQL column) and AC-17.4.1.1.2's sibling
criterion for the scheduled process are to build on, taking `events.expires_at`
as the field whose column and scheduled-process (already located at
`services/expirationChecker.js`, started by
`services/workerManager.js:18`) those later criteria examine.

### Verdict

AC-17.4.1.1.1.2.3 is satisfied: for every one of the AC-17.4.1.1.1.2.1
confirmed set's 13 entries, this section records — against the pinned
commit (`eb263137b98935754155824de2a03848121304b6`) — either the
Gallery-path code that reads it, stating whether each read gates access,
only reports state, or does both (E1, E13), or that no Gallery-path read
was found together with the actual upstream shape and the file:line
establishing it (E4, E5, E6, E7, E10, E11, E12, E16, E30, E32, E33). A
re-read of `middleware/auth.js`'s previously-cited `galleryAuth` function
for this AC's read-path question finds it is never wired to any route —
dead code — which does not move E1 or E16 between the confirmed and
ruled-out lists (neither disposition depended on that code being
reachable) but does correct which citation is the operative one for
their actual read-path role; that correction, and every other citation
above, is recorded consistently with AC-17.4.1.1.1.2.1,
AC-17.4.1.1.1.2.2.1, and AC-17.4.1.1.1.2.2.2, so the confirmed set and
ruled-out list stand unchanged in both places. The audit closes with the
finding this group of criteria exists to produce: the pinned fork
expresses a Gallery's own expiry with exactly one stored field,
`events.expires_at`, read on the Gallery path to both report state
(`gallery.js:184,475`) and — at exactly two of the fork's live surfaces,
`customer.js:148` and `auth.js:576` — gate access; every other confirmed
entry is either a read-time derivation of it (`is_expired`), a
creation-time input that shapes it, or a downstream consumer with no
Gallery-path read of its own, drawn only from the code evidence recorded
in AC-17.4.1.1.1.2.1 through this criterion. It is a code-level finding:
no live Gallery was created or changed for it.

## Recommendation and open questions (AC-14.6)

### Explicit keep/replace/retire recommendation

This is a consolidation of the per-item classifications already made in
AC-14.1 through AC-14.5 above — it decides nothing new, it states plainly
what those sections already established, category by category.

| Category | Recommendation | Basis |
|---|---|---|
| Gallery data ownership (Payload `Galleries` collection, Sharp derivative pipeline, R2 upload path) | **Replace** — PicPeak becomes the sole owner | Superseded artifacts (AC-14.2), rows 1–3; Duplicate-feature risk map (AC-14.3), R1–R3 |
| In-repo gallery viewer components (`src/components/gallery/`) | **Repurpose as a Frontstage layer** — kept unchanged in location, rewired to read from PicPeak | Superseded artifacts (AC-14.2), row 4 |
| Identity/admin login (Better Auth), outbound email (Resend), Payload `users` collection | **Keep** — no PicPeak dependency | Duplicate-feature risk map (AC-14.3), R4–R5; Migration-risk section (AC-14.5), Users row |
| Payload CMS for non-gallery content (Testimonials, Packages, FAQ, business collections), Docker/CI/deploy infrastructure, site chrome and styling | **Keep** — orthogonal to the gallery-ownership pivot | Sprint 1/2 inventory (AC-14.1), all rows classified Kept |
| US-12 (lead-generation contact form), US-13 (WhatsApp lead-capture), and their orphaned `.env.example` entries | **Retire** (both stories); their env vars are **retained for now, removal deferred** to the follow-on pivot-execution story that also updates the AC-7.4 lock-in test | Sprint 1/2 inventory (AC-14.1); Orphaned configuration (AC-14.2) |
| Third-party dependencies dropped by the pivot (`sharp`, `@payloadcms/storage-s3`) | **Retire** from active use now, **removal from `package.json` deferred** to the same follow-on pivot-execution story, alongside their lock-in tests | Dependency and licence audit (AC-14.4), Dropped-by-the-pivot table |
| Data at rest today (Payload media records, galleries, R2 objects) | **Migrate** into PicPeak before the Payload collections are retired | Migration-risk section (AC-14.5) |

No category above is left unclassified: every row in the Sprint 1/2
inventory (AC-14.1) resolves to Kept, Replaced, Repurposed, or Retired,
and this table groups those resolutions rather than reopening any of them.

### Open questions

These are the questions this audit surfaced but cannot answer from the
repository alone — each requires a Product Owner or other human decision
before the pivot-execution work that depends on it can proceed. None of
them block AC-14.1–14.5 as already written; per AC-14.6, none is decided
silently here.

1. **PicPeak fork licence.** The Dependency and licence audit (AC-14.4)
   already flags that the PicPeak upstream licence is unconfirmed (the
   PRD assumes MIT, but `US-15` AC-15.1 requires it to be read directly
   before the fork is created). This audit does not resolve that flag —
   it is carried forward as open pending `US-15`.
2. **Timing of the follow-on pivot-execution story.** AC-14.2 and AC-14.4
   both defer concrete deletions (dormant code, orphaned env vars, dropped
   dependencies, and their lock-in tests) to "a follow-on pivot-execution
   story" that does not yet exist in `scrum-master/sprint3.json`. Should
   the Product Owner schedule that story now, and does it depend on
   `US-15`/`US-16`/`US-18` landing first?
3. **Long-term status of the Payload `users` collection.** The Migration-
   risk section (AC-14.5) leaves it in place because it is Payload's own
   `/admin` login, distinct from Better Auth (Duplicate-feature risk map,
   R4). Is that intentionally permanent (two identity systems, scoped to
   two different audiences forever), or should a future story unify
   photographer/admin login under Better Auth alone?
4. **Confirmation that no real client data exists in production.** This
   audit states, based on what the current sprint-1/2 tests and demo
   routes created, that no production client galleries exist as of this
   audit (Migration-risk section). That is an inference from the
   codebase, not a check of a live production database — the Product
   Owner should confirm it directly before a pivot-execution story treats
   the migration-risk table's dispositions as low-stakes.
5. **Production PicPeak target environment.** The Migration-risk section
   assumes migrated data lands in "PicPeak's own media store," but the
   deploy target and production Postgres/R2 endpoints for the pivoted
   system are still an open item from sprint-2 planning (see
   `scrum-master/po-requests.md`, item 1) and were never resolved. The
   pivot's migration step cannot run until that target exists.

Per AC-14.6, items 1–5 above are to be added to
`scrum-master/po-requests.md` so they are tracked as explicit Product
Owner decisions rather than left implicit in this audit; `po-requests.md`
is owned outside this AC's scope, so this document records the questions
and their routing rather than editing that file directly.
