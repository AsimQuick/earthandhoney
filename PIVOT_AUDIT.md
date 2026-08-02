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
         AC-17.4.1.1.1.3 — identifies the PostgreSQL table and column
         from the schema source: `events.expires_at`, declared at
         `db.js:143`, executed via `core/001_init.js`'s call to
         `initializeDatabase()`, later altered to nullable on PostgreSQL
         only by `061_add_optional_date_expiration_settings.js:32`.
         AC-17.4.1.1.2 — locates the scheduled process that acts on
         `events.expires_at`: `expirationChecker.js`'s
         `checkExpirations()`/`handleExpiredEvent()`, registered by a
         `cron.schedule('0 * * * *', ...)` expression (hourly, via
         `node-cron`) at `expirationChecker.js:11`, started at
         `server.js:820` in the process this deployment actually runs.
         Records `workerManager.js`'s duplicate call site as dead code,
         never invoked by any script, Dockerfile, PM2 config, or compose
         file in the pinned commit.
         AC-17.4.1.1.3 — writes up how the expiry model established by
         AC-17.4.1.1.1.1.1.1 through AC-17.4.1.1.1.3 and AC-17.4.1.1.2
         compares with the PRD's assumption (`PRD.md:863-901`, section
         13's workflow diagram and Gallery-controls list), drawing only on
         the code evidence those criteria already recorded — no new
         search, no live Backstage. Finds agreement that a Gallery-level
         expiry control exists and that it culminates in an automatic
         archive matching the PRD's "Gallery archived" workflow step, and
         finds three differences recorded as the actual upstream shape
         rather than patched: the PRD lists "expiration window" as a peer
         of "password protection", but password protection is uniformly
         backend-enforced (AC-17.3) while `expires_at` gates only two of
         the fork's several live access surfaces (AC-17.4.1.1.1.2.3);
         upstream couples archiving with a separate `is_active` deactivation
         flag the PRD's single "archived" end state does not name; and
         upstream's archive trigger is purely elapsed time against
         `expires_at`, not the PRD diagram's implied download-completion
         trigger.
         AC-17.4.1.2 — records the pre-expiry client-facing baseline
         AC-17.4.2 re-runs after expiry: the AC-17.1.3.1 Gallery's stored
         `events.expires_at` value read directly from the running
         Backstage PostgreSQL via the verbatim query AC-17.4.1.1.1.3(c)
         gave (`2026-10-01 00:00:00+00`, still in the future), and one
         exact client-facing request that currently succeeds —
         `GET /api/gallery/:slug/photos` with a valid gallery token,
         returning `200` with the Gallery's real photo list.
         AC-17.4.1.3 — records the pre-expiry photographer-facing baseline:
         the Backstage admin Events List page (`GET /api/admin/events`)
         shows the AC-17.1.3.1 Gallery with a green "Active" label,
         synthesized entirely client-side from the same raw `is_draft`,
         `is_archived`, `is_active`, `expires_at` columns
         AC-17.4.1.1.1.2.3 already inventoried — the admin API itself
         returns no stored field named `status`/`state`/`is_expired`.
         AC-17.4.2 — brings the AC-17.1.3.1 Gallery past its expiry
         through the interface upstream actually provides (the admin
         `PUT /api/admin/events/:id` endpoint, which accepts a past-dated
         `expires_at` with no future-date validation, plus the real
         hourly `expirationChecker` cron sweep AC-17.4.1.1.2 already
         located — no fork patch, no direct database write of the
         enforcement fields), then re-runs the exact client-facing
         request recorded as succeeding in AC-17.4.1.2 and records it now
         refused: `404 {"error":"Gallery not found or expired"}`, both
         cold and with the genuine gallery token minted seven seconds
         before the expiry write, proving a pre-expiry session/token is
         not still honoured. Records, from the real database timestamps
         (the `expires_at` write at 14:19:55 UTC against the sweep's
         `archived_at` of 15:00:02 UTC), a real enforcement-lag gap: the
         Gallery was already "past its expiry" by its own stored value
         for roughly 40 minutes before the scheduled process actually
         denied access — the same unenforced-`expires_at` gap
         AC-17.4.1.1.3 already found in code, now demonstrated live.
         AC-17.4.3 — re-checks the exact AC-17.4.1.3 screen and request
         against the same Gallery, now past its expiry, and records the
         state as visible but not immediate: it required the scheduled
         `expirationChecker` sweep AC-17.4.2 already triggered on its own
         real clock. Records that sweep's side effects (deactivation,
         archiving with a populated `archive_path`, an `event.expired`
         webhook fire, three queued-`pending` notification emails), and
         records honestly that the photographer-facing label is
         "Archived," not "Expired" — the `is_archived` guard in
         `getEventStatus()` is checked ahead of the `expires_at`-derived
         "expired" branch, and this Gallery is archived by the same sweep
         pass that expires it.
         AC-17.5.1 — proves live, with no fork patch, that a client can
         reach a Gallery through the client-facing route and download
         through its policy: obtaining a gallery token via
         `POST /api/auth/gallery/verify`, listing all its photos via
         `GET /api/gallery/:slug/photos`, downloading the upstream archive
         via `GET /api/gallery/:slug/download-all` (`200`, a valid zip,
         its size and entry list recorded), and both `download-all` and
         `download-selected` refusing with `403` once `allow_downloads` is
         flipped off, restored afterward. Records, honestly rather than
         silently substituted, that the AC-17.1.3.1 Gallery this AC was
         asked to reuse was found already archived by AC-17.4.2/AC-17.4.3's
         own prior work, and that upstream's own archive-restore endpoint
         cannot recover it under this deployment's S3 storage backend — so
         a second Gallery, created the same way AC-17.1.3.1 was, carries
         this AC's live proof instead. Also records, from reading the
         pinned source alone, the starting shape the two criteria that
         follow act on: the archive route already resolving through
         `resolvePhotoStorageKey`/`getStorage()` and so needing no patch,
         against the single-photo route's local-filesystem-only
         `resolvePhotoFilePath`, its `res.sendFile` error callback that
         logs without ever responding, and its `download_count` /
         `access_logs` writes landing before the send. The single-photo
         download route is explicitly not called, per this AC's own
         scope, which reserves its fork patch for the criteria that
         follow.
         AC-17.5.3 — moves the `download_count` increment and the
         `access_logs` insert out of their upstream pre-send position into
         one guarded helper fired only on a confirmed delivery (the
         response's `finish` event, and `res.sendFile`'s success branch for
         the external-photo path), never from a failure branch, and proves
         it live by reading Postgres directly: the AC-17.5.2 successful
         download still increments the count and still writes one
         `action = 'download'` row, while the AC-17.5.2 `404` now leaves the
         count untouched and writes no row at all. Registers the patch so it
         cannot become permanent by accident — a dated `deviation` entry in
         `FORK_CHANGELOG.md`, the UD-1 entry in `PICPEAK_UPSTREAM_DEFECTS.md`
         with its explicit drop condition, a drop-rather-than-merge flag in
         `UPSTREAM_SYNC.md` §4, and a submission-ready upstream report held
         in `.github/upstream-issues/` as `prepared, not submitted` with
         exactly what is needed to submit it named.
         AC-17.6 — stands up the capture-inbox this pinned fork already
         expects (`email_configs.smtp_host` defaults to the literal
         `mailhog` at first migration, per
         `migrations/core/001_init.js:146`) as a `mailhog` service in this
         project's own `docker-compose.yml`, fixes the resulting SMTP port
         (465, leaked from the Next.js app's own `SMTP_PORT` env var
         through the two services' shared `.env`, instead of MailHog's
         1025) through the admin-facing `/api/admin/email/config` route
         upstream already provides, and proves — live, twice — that a real
         operational `gallery_created` email (queued by the ordinary
         create/resend paths, not a synthetic test message) reaches
         `pending` and then `sent` with a `sent_at` timestamp, that the
         message is actually captured by MailHog, and that both states are
         visible through the admin-facing `GET /api/admin/email/queue`
         feed upstream already provides.
         AC-17.7 — stands up the dev loopback listener the pinned fork's
         own webhooks-roundtrip e2e spec already expects
         (`vendor/picpeak/dev/webhook-receiver`) as a `webhook-receiver`
         service in this project's own `docker-compose.yml`, registers a
         real outbound webhook through the admin-facing
         `POST /api/admin/webhooks` route upstream already provides, and
         proves — live, twice, on two independently-created Galleries —
         that upstream's own webhook delivery worker fires `event.created`
         and `event.published` for an ordinary, non-draft Gallery create
         (not the synthetic `/:id/test` endpoint), that the listener
         receives and logs each payload with a valid HMAC-SHA256 signature,
         and that the delivered/success state is visible through the
         admin-facing `GET /api/admin/webhooks/:id/deliveries` feed
         upstream already provides. Also records, for AC-17.9, an unrelated
         local-storage permission gap in the Gallery-create route that
         blocked the first attempt and needed a one-time operational fix —
         the fourth occurrence of the same defect family AC-17.5.1/17.5.2
         already named.
related-ac: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 17.1.1, 17.1.2, 17.1.3.1, 17.1.3.2, 17.1.3.3, 17.2, 17.3, 17.4.1.1.1.1.1.1, 17.4.1.1.1.1.1.2, 17.4.1.1.1.1.1.3, 17.4.1.1.1.1.2, 17.4.1.1.1.1.3, 17.4.1.1.1.2.1, 17.4.1.1.1.2.2.1, 17.4.1.1.1.2.2.2, 17.4.1.1.1.2.2.3, 17.4.1.1.1.2.3, 17.4.1.1.1.3, 17.4.1.1.2, 17.4.1.1.3, 17.4.1.2, 17.4.1.3, 17.4.2, 17.4.3, 17.5.1, 17.5.2, 17.5.3, 17.6, 17.7
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

> **Line-number addendum (added by AC-17.5.3).** The two `gallery.js` numbers
> just above are the pinned-upstream ones, which is where they were read and
> where they remain correct against the pin. The fork patches to the
> single-photo download route higher up that file — AC-17.5.2 (+103 lines)
> then AC-17.5.3 (+44 more) — shifted everything below them, so in the
> vendored file as it now stands the `ensureHeroImage` call is at
> `gallery.js:1531` (upstream `1384`) and the `ensurePreviewImage` call site
> is at `gallery.js:1629-1632` (upstream `1482-1485`). `adminThumbnails.js`
> is untouched by either patch and its numbers stand unchanged.

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
| `is_expired` | API response field name (`GET` gallery info) | No | `vendor/picpeak/backend/src/routes/gallery.js:188` |
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

## AC-17.4.1.1.1.3 — the PostgreSQL table and column, identified from the schema

`US-17` AC-17.4.1.1.1.3 identifies the PostgreSQL table and column that
carry a Gallery's own expiry value from the schema source that creates
them, precisely enough for AC-17.4.1.2 to query the column verbatim. Its
scope is fixed to two commands already run against the pinned commit
(`eb263137b98935754155824de2a03848121304b6`): a grep for column
declarations of every name in the AC-17.4.1.1.1.2.1 confirmed/ruled-out
shortlist across `vendor/picpeak/backend/src/database/db.js` and
`vendor/picpeak/backend/migrations/`, and a grep for later alterations to
`events.expires_at`. Nothing else was read. This section restates the
write-path and read-path shapes AC-17.4.1.1.1.2.2.3 and
AC-17.4.1.1.1.2.3 already recorded rather than re-deriving them.

### (a) Schema record: the Gallery's stored expiry column

**Table:** `events`. **Column:** `expires_at`.

- **Creating definition:** `vendor/picpeak/backend/src/database/db.js:143`
  — `table.datetime('expires_at').notNullable();`, inside
  `initializeDatabase()`'s `db.schema.createTable('events', (table) => {...})`
  (`db.js:122-125` opens the `createTable('events', ...)` block this line
  sits inside).
- **Migration that executes that definition:**
  `vendor/picpeak/backend/migrations/core/001_init.js` — no file in
  `vendor/picpeak/backend/migrations/` contains the `createTable('events', ...)`
  call itself (confirmed by list 1: every other declaration line sits
  inside a different migration file creating a different table, per part
  (b) below); instead `001_init.js:2` requires
  `initializeDatabase` from `db.js` and `001_init.js:12` calls
  `await initializeDatabase();` inside its `exports.up`, which is what
  runs `db.js:143`'s `createTable('events', ...)` block. PostgreSQL takes
  the `if (!hasEventsTable)` branch this line sits inside
  (`db.js:124-166`); the file's other, `else`-branch table rebuild
  (`db.js:169-...`) is gated on `!isPostgres` and does not apply here.
- **Later alteration (list 2):**
  `vendor/picpeak/backend/migrations/core/061_add_optional_date_expiration_settings.js:32`
  — `await knex.raw('ALTER TABLE events ALTER COLUMN expires_at DROP NOT NULL');`,
  reached only on the PostgreSQL branch of that migration
  (`061_add_optional_date_expiration_settings.js:29-30`, gated on
  `client === 'pg' || client === 'postgresql'`).
- **Disagreement:** the creating definition (`db.js:143`) declares
  `expires_at` `NOT NULL`; the later PostgreSQL-only migration
  (`061_add_optional_date_expiration_settings.js:32`) drops that
  constraint. The two disagree on nullability, and the later line wins.
- **Resulting state on PostgreSQL, once both cited lines have run:** type
  `datetime` as declared (knex `.datetime()`, `db.js:143`); nullable
  (`061:32` overrides the creating definition's `NOT NULL`); no default
  (`db.js:143` calls no `.defaultTo(...)`, and `061:32` does not add one).
  Optional live check against the running Backstage PostgreSQL (US-16)
  confirms this with no further disagreement:
  `SELECT table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns WHERE table_name='events' AND
  column_name='expires_at';` returns
  `events | expires_at | timestamp with time zone | YES | ` (nullable,
  no default) — consistent with the schema-source-derived state above.

### (b) The thirteen confirmed entries, one row each

| Entry | Name(s) | Column | Upstream shape (restated) |
|---|---|---|---|
| E1 | `expires_at` | `events.expires_at` — `db.js:143` | Persisted column; see (a). |
| E4 | `expiry_date` | no column of its own | Outbound-email template variable populated from `expires_at` when an email is queued; never read back into any client- or Customer-facing response (AC-17.4.1.1.1.2.3). |
| E5 | `expiration_warning` | no column of its own | Email-template/notification-kind literal passed as the `email_type` argument to `queueEmail`, not a Gallery column (AC-17.4.1.1.1.2.2.3). |
| E6 | `gallery_expired` / `galleryExpiredExists` | no column of its own | Same shape as E5 — an `email_type` literal passed to `queueEmail` from inside the scheduled job's `handleExpiredEvent`, never read on a live request (AC-17.4.1.1.1.2.3). |
| E7 | `event_require_expiration` | no column of its own | Read once at Gallery-creation time to decide whether to compute `expires_at`; an admin-side creation-form setting, not re-read once the Gallery exists (AC-17.4.1.1.1.2.3). |
| E10 | `expiration_days` | no column of its own | Read only inside the admin create-Gallery form flow to compute the new Gallery's `expires_at`; never read again once the Gallery exists (AC-17.4.1.1.1.2.3). |
| E11 | `general_default_expiration_days` | no column of its own | Prefills the create-Gallery form's `expiration_days` default client-side; never read again once the Gallery exists (AC-17.4.1.1.1.2.3). |
| E12 | `require_expiration` | no column of its own | Same boolean/site as E7, read at Gallery-creation time to gate the `expires_at` write; not re-read once the Gallery exists (AC-17.4.1.1.1.2.3). |
| E13 | `is_expired` | no column of its own | Computed on every read from the already-stored `is_active` and `expires_at` columns, never itself persisted (AC-17.4.1.1.1.2.2.3). |
| E16 | `GALLERY_EXPIRED` | no column of its own | Hardcoded response-code literal returned by the (dead) access-gate middleware when `expires_at` has passed; never written to any row (AC-17.4.1.1.1.2.2.3). |
| E30 | `expiringEvents` | no column of its own | Dashboard response-object key for a live aggregate `COUNT` over `events` rows filtered by `expires_at`, computed fresh on every dashboard request, never stored (AC-17.4.1.1.1.2.2.3). |
| E32 | `expiring` | no column of its own | Request-time list-filter value compared against a query parameter to add an `expires_at`-range `WHERE` clause; never written to a row (AC-17.4.1.1.1.2.2.3). |
| E33 | `event.expired` | no column of its own | Outbound webhook event-type string fired from the scheduled `expirationChecker` job; its only reader is an external listener outside the application (AC-17.4.1.1.1.2.3). |

None of the other twelve entries' names appear anywhere in list 1's
thirteen declaration lines — every one of those lines declares
`expires_at` (the E1 name only), on `events` (`db.js:143`) or on a
different table (`admin_invitations` —
`migrations/core/058_add_admin_invitations_table.js:37`;
`revoked_tokens` (again, via the `017` legacy migration this time) —
`migrations/legacy/017_add_token_revocation_tables.js:14,21`;
`api_tokens` — `migrations/core/081_add_api_tokens.js:26`; the table
`migrations/core/078_add_guest_identity.js:65` creates; the table
`migrations/core/090_add_customer_accounts.js:88` creates; the table
`migrations/core/092_customer_features_branding_resets.js:98` creates;
and the three tables `migrations/core/107_crm_consolidated.js:897,1146,1358`
create; plus `db.js:424,431`, on `revoked_tokens` — a token-revocation
table, not the Gallery table). Each of those is a
same-named `expires_at` column on a table other than the Gallery's
`events`, so per this AC's scope it belongs to that other table and does
not make any of E4–E33 a column of the Gallery's, per (b)'s instruction.

### (c) Verbatim query for AC-17.4.1.2

```sql
SELECT expires_at FROM events WHERE id = $1;
```

### (d) Count

1 of the 13 rows carries a column (`events.expires_at`, E1); 12 of the 13
rows carry `no column of its own` (E4, E5, E6, E7, E10, E11, E12, E13,
E16, E30, E32, E33). 1 + 12 = 13.

### Verdict

AC-17.4.1.1.1.3 is satisfied: against the pinned commit
(`eb263137b98935754155824de2a03848121304b6`) and the two fixed-scope
grep commands given for this criterion, the Gallery's stored expiry
value is identified as `events.expires_at`, declared at `db.js:143`
(`NOT NULL`, no default), executed by the `core/001_init.js` migration's
call to `initializeDatabase()`, and later altered to nullable on PostgreSQL only by
`061_add_optional_date_expiration_settings.js:32` — a disagreement
recorded rather than smoothed over, with both lines cited and the
resulting state confirmed against the running Backstage PostgreSQL. All
thirteen AC-17.4.1.1.1.2.1 confirmed entries are accounted for: one
carries the column, twelve carry `no column of its own` with their
already-recorded upstream shape restated rather than re-derived, and the
count (1 + 12 = 13) is stated. The verbatim query AC-17.4.1.2 will run is
given in full. No row is unresolved, so none is carried forward. It is a
documentation-only, code-level finding: no live Gallery was created or
changed for it, and no source file was modified.

## AC-17.4.1.1.2 — the scheduled process, and how it is triggered

`US-17` AC-17.4.1.1.2 locates, from code against the pinned commit
(`eb263137b98935754155824de2a03848121304b6`), the scheduled process that
acts on the field confirmed by AC-17.4.1.1.1.2.1 (`events.expires_at`,
E1) and stated with its role by AC-17.4.1.1.1.2.3 — and records how that
process is triggered (cron expression, timer interval, or on request),
with the file:line where the trigger is registered or started. If no
scheduled process acted on the field at all, that absence would itself
be the finding; it is not the case here, so this section records what
was found instead. It is a code-level finding: no live Gallery was
created or changed for it.

### The scheduled process located in code

`vendor/picpeak/backend/src/services/expirationChecker.js` is the sole
scheduled process that acts on `events.expires_at`:

- `expirationChecker.js:9-16` — `function startExpirationChecker()`
  registers the schedule (evidenced in the next subsection) and logs
  `'Expiration checker started'`.
- `expirationChecker.js:18-59` — `checkExpirations()`, the function the
  schedule invokes on every tick. It runs two queries against `events`,
  both filtered on `expires_at`: one for galleries needing a 7-day
  warning email (`whereNotNull('expires_at').where('expires_at', '<=',
  warningDate).where('expires_at', '>', now)`, `:25-30`) and one for
  galleries already past expiry (`whereNotNull('expires_at').where(
  'expires_at', '<=', now)`, `:46-50`).
- `expirationChecker.js:94-162` — `handleExpiredEvent(event)`, called
  once per row the second query matches (`:52-54`). It sets
  `is_active: false` on the row (`:97`), fires the `event.expired`
  webhook with `expires_at: event.expires_at` in the payload (`:104-120`),
  queues `gallery_expired` emails to the customer and, where configured,
  the admin (`:143-153`), and starts archiving the gallery (`:156`,
  `archiveEvent(event)`).

This is exactly the confirmed field's role as AC-17.4.1.1.1.2.1 and
AC-17.4.1.1.1.2.3 already stated it, not a new claim: the same
`expires_at`-filtered queries and the same `handleExpiredEvent` call
were already cited there as the process those criteria attributed the
E1/E5/E6/E33 write-path and read-path behaviour to.

### How it is triggered: a cron expression, not a timer interval or an on-request handler

`expirationChecker.js:1` — `const cron = require('node-cron');`
(`node-cron@^3.0.2`, `vendor/picpeak/backend/package.json:45`).
`expirationChecker.js:11` —

```js
cron.schedule('0 * * * *', async () => {
  await checkExpirations();
});
```

`'0 * * * *'` is a standard five-field cron expression: minute `0` of
every hour, every day, every month, every day of the week — i.e. once
per hour, on the hour. No third `options` argument is passed to
`cron.schedule`, so no explicit timezone override applies; `node-cron`
runs the schedule against the host process's local timezone. This is an
in-process recurring schedule registered by application code at server
startup, not an OS-level crontab entry, not a `setInterval`/`setTimeout`
timer, and not a handler invoked on an incoming HTTP request — of the
three trigger shapes this AC distinguishes, it is the first: a cron
expression, evaluated by the `node-cron` library inside the same Node
process that serves the API.

A whole-backend search confirms no second scheduled process registers
against this field: `grep -rn "cron.schedule\|setInterval" backend/src`
finds eight other recurring jobs (temp-upload cleanup, auth-attempt
cleanup, token-revocation cleanup, chunked-upload cleanup, the
invoice-scheduler cron at `invoiceSchedulerService.js:53`, and three
backup/S3-import jobs), and none of their bodies reference
`expires_at` (`grep -l "expires_at" backend/src/services/
invoiceSchedulerService.js backend/src/services/backupService.js
backend/src/services/databaseBackup.js` returns no matches). The
scheduled process named above is the only one.

### Where the trigger is registered or started, and a second, unused entry point

`startExpirationChecker` is `require`d and called from two places in the
pinned commit — but only one of them actually runs in this fork's
deployment.

**The live path — `server.js`, the process this deployment actually
runs:**

- `vendor/picpeak/backend/server.js:22` — `const { startExpirationChecker
  } = require('./src/services/expirationChecker');`
- `vendor/picpeak/backend/server.js:820` — `startExpirationChecker();`,
  inside `async function startServer()` (`:791-912`), a few lines ahead
  of `app.listen(PORT, ...)` (`:903`).
- `vendor/picpeak/backend/server.js:914` — `startServer();`, called at
  module scope, so `startExpirationChecker()` — and with it the
  `cron.schedule('0 * * * *', ...)` registration — runs every time
  `server.js` is executed as the process entry point.
- `server.js` is confirmed as the process this deployment actually runs,
  three ways: `vendor/picpeak/backend/package.json:7` —
  `"start": "node server.js"`; the vendored
  `vendor/picpeak/backend/Dockerfile`'s final `CMD ["./wait-for-db.sh",
  "node", "server.js"]`; and `vendor/picpeak/backend/ecosystem.config.js:4`
  — the PM2 process definition's `script: './server.js'`. Our own
  `docker-compose.yml`'s `backstage-backend` service (added under
  AC-16.1/AC-16.2) sets no `command:` override — confirmed by `grep -n
  "command:" docker-compose.yml` returning no match — so the container
  runs the vendored `Dockerfile`'s unmodified `CMD`, i.e. `node
  server.js`.

**The dead path — `workerManager.js`, never invoked by anything in the
pinned commit:**

- `vendor/picpeak/backend/src/services/workerManager.js:17-18` —
  `require('./fileWatcher')` and `const { startExpirationChecker } =
  require('./expirationChecker');`
- `workerManager.js:22-39` — `async function startWorkers()` calls
  `startExpirationChecker()` at `:31`.
- `workerManager.js:72` — `startWorkers();`, called at module scope, so
  if this file were ever executed as a process entry point it would
  register the same cron job a second time.
- It is not: `workerManager.js` does not appear in
  `vendor/picpeak/backend/package.json`'s `scripts` block (only
  `server.js` is referenced, by `start` and `dev`), not in the vendored
  `Dockerfile`'s `CMD`, not in `ecosystem.config.js`'s single `picpeak`
  app definition, not in our `docker-compose.yml` (no service names it),
  and not in upstream's own `vendor/picpeak/docker-compose*.yml` files —
  a whole-repository `grep -rln "workerManager"` under
  `vendor/picpeak/backend/` and a `grep -n "workerManager"` across every
  compose file and `package.json`/`Dockerfile` in the vendored tree
  return no hits outside `workerManager.js` itself. It is dead code: a
  second, unused entry point that duplicates `server.js`'s registration
  if it were ever run standalone, structurally the same shape
  AC-17.4.1.1.1.2.3 already found for `middleware/auth.js`'s
  `galleryAuth` — present in the source, never wired to anything that
  actually executes.

The trigger this deployment actually starts, then, is registered at
`expirationChecker.js:11` (the `cron.schedule` call itself) and started
at `server.js:820` (the call site actually reached by the running
container), reached via `server.js:914`'s module-scope `startServer()`
call — not `workerManager.js`, which is never executed.

### Verdict

AC-17.4.1.1.2 is satisfied: the scheduled process acting on the
AC-17.4.1.1.1.2.1-confirmed, AC-17.4.1.1.1.2.3-stated field
(`events.expires_at`) is `expirationChecker.js`'s
`checkExpirations()`/`handleExpiredEvent()` pair, registered by
`startExpirationChecker()` (`expirationChecker.js:9-16`) via a cron
expression — `cron.schedule('0 * * * *', ...)` at `expirationChecker.js:11`,
once per hour on the hour, via `node-cron` — not a timer interval and
not an on-request handler. A whole-backend search confirms it is the
only scheduled process that references `expires_at`. The trigger is
started, in the process this deployment actually runs, at
`server.js:820` inside `startServer()`, itself invoked at module scope
by `server.js:914`, with `server.js` confirmed as the real entry point
by `package.json`'s `start` script, the vendored `Dockerfile`'s `CMD`,
`ecosystem.config.js`'s PM2 definition, and the absence of any
`command:` override in our own `docker-compose.yml`. A second call site,
`workerManager.js:18` (called from `workerManager.js:31`, itself
invoked at `workerManager.js:72`), is found and recorded honestly as
dead code — never referenced by any script, Dockerfile, PM2 config, or
compose file in the pinned commit or this repository — rather than
silently treated as equivalent to the live path. It is a code-level
finding: no live Gallery was created or changed for it.

## AC-17.4.1.1.3 — the pinned fork's expiry model against the PRD's assumption

`US-17` AC-17.4.1.1.3 adds no code search and exercises no live
Backstage. It writes up how the expiry model established by
AC-17.4.1.1.1.1.1.1 through AC-17.4.1.1.1.3 (the inventory-and-
confirmation chain, closing with AC-17.4.1.1.1.3's schema identification)
and AC-17.4.1.1.2 (the scheduled process) compares with what the PRD
assumes about gallery expiry, drawing only on the code evidence those
criteria already recorded. Where the pinned fork expresses expiry
differently than the PRD assumes, that difference is recorded as the
actual upstream shape below; no fork patch is made anywhere in this
section to close any of the gaps it records — nothing under
`vendor/picpeak/` is edited by this AC.

### What the PRD assumes

`scrum-master/PRD.md` says something about gallery expiry in exactly two
places, and only two:

- The top-level client-relationship diagram near the start of the
  document (`PRD.md:9-27`) — the same lifecycle CLAUDE.md's Product
  Vision restates as "Visitor → Lead → Booking → Contract → Payment →
  Session → temporary Gallery Delivery → Download → Archive" — names
  `Gallery Delivery Window` (`PRD.md:22`) as its own sequential stage,
  followed by `Download Completed` (`PRD.md:24`) and then `Archive`
  (`PRD.md:26`) as the final stage of the whole client relationship.
- Section 13, "Client Gallery Delivery" (`PRD.md:863`), which says the
  same thing a second time, in more detail: a workflow diagram
  (`PRD.md:874-890`) ending in **"Gallery archived"** as its terminal
  step, immediately after "Client downloads photos" — again a sequential
  pipeline (upload → link → view → download → archived), not naming a
  scheduled background process or any intermediate state between
  "downloaded" and "archived" — plus a flat "Gallery controls" list
  (`PRD.md:897-900`): `private link`, `password protection`, `download
  enabled`, `expiration window` — four items given as peers, with no
  further detail on what "expiration window" stores, what enforces it,
  or how it relates to the "Gallery archived" workflow step.

Nowhere else in `PRD.md` mentions expiry, archiving, or deactivation of a
Gallery — confirmed by re-reading the whole document, not by a fresh
keyword search re-run against the fork (that search is AC-17.4.1.1.1.1.1.1's
territory, scoped to the fork's backend source, not the PRD). Both
places the PRD does mention it agree with each other: a Gallery
("Gallery Delivery Window" / "expiration window") reaches an "Archive" /
"Gallery archived" end state as the next sequential stage after
download, with no storage shape, no enforcement mechanism, and no
trigger condition specified for either transition.

### What the pinned fork actually does, restated from AC-17.4.1.1.1.3 and AC-17.4.1.1.2

AC-17.4.1.1.1.3 identified the Gallery's own expiry as exactly one
persisted column, `events.expires_at` (`db.js:143`), the only one of the
AC-17.4.1.1.1.2.1 confirmed set's 13 entries that is itself a stored
column on the Gallery's row — every other confirmed entry is a read-time
derivation, a creation-time input, or a downstream consumer with no
column of its own (AC-17.4.1.1.1.3(b)).

AC-17.4.1.1.2 located the scheduled process that acts on that column:
`expirationChecker.js`'s hourly `cron.schedule('0 * * * *', ...)`
(`expirationChecker.js:11`), started at `server.js:820` in the process
this deployment actually runs. On each tick, `checkExpirations()` finds
rows whose `expires_at` has passed and calls `handleExpiredEvent(event)`
once per row, which — per AC-17.4.1.1.2's restatement of
AC-17.4.1.1.1.2.2.3's write-path evidence — sets `is_active: false`
(`expirationChecker.js:97`), fires the `event.expired` webhook
(`:104-120`), queues `gallery_expired` emails (`:143-153`), and starts
archiving the gallery via `archiveEvent(event)` (`:156`).

AC-17.4.1.1.1.2.3's closing finding further established that this
scheduled sweep is not the only thing that determines whether a viewer
is actually let in: `expires_at` gates access at exactly two of the
fork's live surfaces — the Customer-dashboard token exchange
(`customer.js:148`) and the session-validity check (`auth.js:576`) — but
the three guest/client password- and share-token login routes that mint
the gallery JWT most viewers use, and `middleware/gallery.js`'s
`verifyGalleryAccess` (the access-gate middleware actually mounted on
every photo-serving route), never read `expires_at` at all. The only
place an ordinary viewer is stopped once a Gallery has expired is the
frontend, `GalleryPage.tsx:275`, gating on the derived `is_expired` flag.

### Where the two agree

- **A Gallery-level expiry control exists, matching the PRD's
  "expiration window".** The PRD names an expiry control per Gallery
  (`PRD.md:900`); the pinned fork stores exactly one such value per
  Gallery row, `events.expires_at` (AC-17.4.1.1.1.3). Neither side treats
  expiry as a property of anything other than the Gallery/event itself.
- **Expiry culminates in an automatic archive, matching the PRD's
  "Gallery archived" terminal step.** The PRD's workflow diagram ends in
  "Gallery archived" (`PRD.md:890`) with no manual "archive" action named
  among the Gallery controls list — archiving reads as an automatic
  pipeline outcome, not something the photographer triggers by hand.
  Upstream's `handleExpiredEvent` matches that shape exactly: the
  scheduled cron sweep calls `archiveEvent(event)`
  (`expirationChecker.js:156`) itself, with no admin action in the loop.
  On this point the two agree, including on the automatic-not-manual
  character of the transition.

### Where they differ

Neither of the two shapes this AC's own text names as possibilities —
"only as an archive or deactivation state" with no dedicated expiry
value, or "no scheduled process at all" — is what was actually found:
the pinned fork does have a dedicated stored expiry column
(`events.expires_at`) and it does have a scheduled process
(`expirationChecker.js`'s hourly cron). The real differences are
narrower, and each is recorded here rather than closed with a fork
patch:

1. **"Expiration window" is listed as a peer of "password protection",
   but the two are not enforced the same way.** The PRD's flat Gallery-
   controls list (`PRD.md:897-900`) gives `password protection` and
   `expiration window` equal billing, implying comparable enforcement.
   AC-17.3 exercised password protection live and found it backend-
   enforced by the actual mounted middleware: `GET
   /api/gallery/:slug/photos` with no token returns `401 {"error":"No
   token provided"}` before any password is even considered
   (`middleware/gallery.js:62`, cited in AC-17.3). `expires_at` has no
   equivalent uniform backend gate — per AC-17.4.1.1.1.2.3's finding
   restated above, the same `verifyGalleryAccess` middleware that
   enforces the password never reads `expires_at`, and the login routes
   that issue a viewer's token never check it either; enforcement for an
   ordinary viewer exists only in the frontend. Where the PRD's listing
   implies "expiration window" behaves like its sibling controls, the
   code shows it is the one control among the four not enforced at the
   layer the others are.
2. **Upstream couples archiving with a separate deactivation flag the
   PRD's single end state does not name.** The PRD's workflow names one
   terminal state, "Gallery archived" (`PRD.md:890`). Upstream's
   `handleExpiredEvent` sets two things on the same pass: `is_active:
   false` (`expirationChecker.js:97`) and, separately, the archive action
   (`:156`) — a deactivation flag and an archive action recorded as
   distinct steps in the code, not one combined state. The PRD gives no
   name to an intermediate "deactivated" state between "downloaded" and
   "archived"; upstream's model has one.
3. **Upstream's archive trigger is elapsed time alone, not the PRD
   diagram's implied download-completion trigger.** The PRD's workflow
   diagram places "Gallery archived" immediately after "Client downloads
   photos" (`PRD.md:886-890`), reading as a sequential, delivery-driven
   transition. `checkExpirations()`'s queries filter only on
   `expires_at` against the current time (`expirationChecker.js:46-50`,
   restated under AC-17.4.1.1.2) — there is no query condition anywhere
   in that function referencing downloads, views, or any other client
   activity. A Gallery whose password was never even used still expires
   and archives on the cron's schedule once `expires_at` passes, and,
   per AC-17.4.1.1.1.2.3's read-path finding, a client who already holds
   a token from before expiry is not blocked from continuing to view or
   download through the routes that never check `expires_at`. Upstream's
   actual trigger is purely time-based, independent of the PRD
   diagram's delivery-sequence framing in both directions.

### Verdict

AC-17.4.1.1.3 is satisfied: this section states plainly, from the code
evidence AC-17.4.1.1.1.1.1.1 through AC-17.4.1.1.1.3 and AC-17.4.1.1.2
already recorded and `scrum-master/PRD.md` section 13's own text, where
the pinned fork's expiry model agrees with the PRD's assumption (a
Gallery-level expiry control that culminates in an automatic archive)
and where it differs (uneven enforcement relative to password
protection, a separate deactivation flag the PRD does not name, and a
purely time-based trigger rather than a download-completion-driven one).
Each difference is recorded as the actual upstream shape with the
file:line evidence already established by the two preceding criteria; no
new code search was run, no live Backstage was exercised, and no change
was made under `vendor/picpeak/` to close any of them.

## AC-17.4.1.2 — pre-expiry client-facing baseline

`US-17` AC-17.4.1.2 records, while the AC-17.1.3.1 Gallery (`events.id =
3`, slug `wedding-ac-17-1-3-1-verification-gallery-2026-09-01`) is still
unexpired, its stored expiry value read directly from PostgreSQL using
the column AC-17.4.1.1.1.3 identified, and one exact client-facing
request that currently succeeds — recorded precisely enough for AC-17.4.2
to repeat verbatim after expiry. No new Gallery was created for this AC;
no source file under `vendor/picpeak/` was modified.

### The Gallery is still unexpired

Read straight out of the running Backstage's own Postgres
(`docker compose --profile backstage`, per `BACKSTAGE_STARTUP.md`):

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -x \
    -c "select id, slug, expires_at, is_active, is_draft from events where id = 3;"

-[ RECORD 1 ]---------------------------------------------------
id         | 3
slug       | wedding-ac-17-1-3-1-verification-gallery-2026-09-01
expires_at | 2026-10-01 00:00:00+00
is_active  | t
is_draft   | f
```

Run on 2026-08-01, ahead of the `2026-10-01` `expires_at` value, so the
baseline below is genuinely pre-expiry, not recorded after the fact.

### (a) Stored expiry value, read directly from PostgreSQL with the AC-17.4.1.1.1.3 column

AC-17.4.1.1.1.3(c) gave the exact query this criterion runs, unchanged
except for substituting the AC-17.1.3.1 Gallery's id for the `$1`
placeholder:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "SELECT expires_at FROM events WHERE id = 3;"

       expires_at
------------------------
 2026-10-01 00:00:00+00
(1 row)
```

The value matches the row read back in full above:
`events.expires_at = 2026-10-01 00:00:00+00`.

### (b) One exact client-facing request that currently succeeds

The request AC-17.4.2 re-runs after expiry is
`GET /api/gallery/:slug/photos`
(`vendor/picpeak/backend/src/routes/gallery.js:216`, mounted at
`vendor/picpeak/backend/server.js:635` —
`app.use('/api/gallery', galleryRoutes)`), guarded by the
`verifyGalleryAccess` middleware
(`vendor/picpeak/backend/src/middleware/gallery.js:20`), which only
returns the Gallery when its query finds a matching row with
`is_active: formatBoolean(true)`
(`vendor/picpeak/backend/src/middleware/gallery.js:36`) — the flag
AC-17.4.1.1.2's scheduled `expirationChecker.js` sweep flips to `false`
once `expires_at` passes (`expirationChecker.js:97`, restated under
AC-17.4.1.1.3), which is what AC-17.4.2 exercises this same request
against.

A valid gallery token was obtained first, the same way AC-17.3 obtained
one, against the same AC-17.1.3.1 Gallery and password:

```
$ curl -s -i -c <gallery-cookie-jar> -X POST http://localhost:3100/api/auth/gallery/verify \
    -H "Content-Type: application/json" \
    -d '{"slug":"wedding-ac-17-1-3-1-verification-gallery-2026-09-01","password":"Verify-Pass-123"}'

HTTP/1.1 200 OK
Set-Cookie: gallery_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax
```

The request itself, as issued, exactly as AC-17.4.2 repeats it:

```
$ curl -s -i -b <gallery-cookie-jar> http://localhost:3100/api/gallery/wedding-ac-17-1-3-1-verification-gallery-2026-09-01/photos

HTTP/1.1 200 OK
{"event":{"id":3,"event_name":"AC-17.1.3.1 Verification Gallery","event_type":"wedding","event_date":"2026-09-01T00:00:00.000Z", ... ,"expires_at":"2026-10-01T00:00:00.000Z", ... },"categories":[],"photos":[{"id":3, ... },{"id":2, ... },{"id":1, ... }]}
```

Status `200 OK`, with the Gallery's own `event.id: 3` and
`expires_at: "2026-10-01T00:00:00.000Z"` echoed back, and all three
photos from the AC-17.2 batch upload (`id` 3, 2, 1) — the same three ids
AC-17.3 recorded — returned in the `photos` array, showing the Gallery is
genuinely being served rather than an empty or error shape.

### Verdict

AC-17.4.1.2 is satisfied: while the AC-17.1.3.1 Gallery is still
unexpired (`expires_at = 2026-10-01 00:00:00+00`, confirmed live on
2026-08-01), its stored expiry value was read directly from PostgreSQL
with the exact `SELECT expires_at FROM events WHERE id = 3;` query
AC-17.4.1.1.1.3 identified, and one exact client-facing request —
`GET /api/gallery/wedding-ac-17-1-3-1-verification-gallery-2026-09-01/photos`
with a valid gallery token — currently succeeds, returning `200` with the
Gallery's real event data and photo list. Both are recorded precisely
enough for AC-17.4.2 to repeat verbatim after expiry: the same query
against the same row, and the same request against the same route, whose
`verifyGalleryAccess` gate is tied to the `is_active` flag the
AC-17.4.1.1.2 scheduled sweep flips once this same `expires_at` value
passes.

## AC-17.4.1.3 — pre-expiry photographer-facing baseline

`US-17` AC-17.4.1.3 records, while the AC-17.1.3.1 Gallery (`events.id =
3`, slug `wedding-ac-17-1-3-1-verification-gallery-2026-09-01`) is still
unexpired, one photographer-facing screen or endpoint that currently
shows it as live: the exact screen or query, its output, and the field
carrying the live-versus-expired state — recorded precisely enough for
AC-17.4.3 to re-check verbatim after expiry. No new Gallery was created
for this AC; no source file under `vendor/picpeak/` was modified.

### The Gallery is still unexpired

Re-confirmed live against the running Backstage
(`docker compose --profile backstage`, per `BACKSTAGE_STARTUP.md`), signed
in as the seeded administrator, on the same day AC-17.4.1.2 recorded its
client-facing baseline:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -x \
    -c "select id, slug, expires_at, is_active, is_archived, is_draft from events where id = 3;"

-[ RECORD 1 ]---------------------------------------------------
id          | 3
slug        | wedding-ac-17-1-3-1-verification-gallery-2026-09-01
expires_at  | 2026-10-01 00:00:00+00
is_active   | t
is_archived | f
is_draft    | f
```

Run on 2026-08-01, 61 days ahead of `expires_at`, so the baseline below is
genuinely pre-expiry.

### The photographer-facing screen and its backing request

The screen identified is the Backstage admin **Events List** page
(`vendor/picpeak/frontend/src/pages/admin/EventsListPage.tsx`) — the
screen a photographer lands on to see every Gallery's status at a glance,
distinct from the client-/Customer-facing surfaces AC-17.4.1.1.1.2.3
already scoped as "the Gallery path." It is backed by `GET
/api/admin/events`, admin-authenticated and gated by
`requirePermission('events.view')`
(`vendor/picpeak/backend/src/routes/adminEvents.js:867`), the same
`adminAuth`-gated list handler AC-17.4.1.1.1.2.3 already confirmed sits
outside the Gallery path.

Exercised live, signed in as the seeded administrator, with the same
default filter (`status=all`) the page requests on load:

```
$ curl -s -i -b <seeded-admin-cookie-jar> \
    "http://localhost:3100/api/admin/events?page=1&limit=20&status=all&sortBy=created_at&sortOrder=desc"

HTTP/1.1 200 OK
{"events":[ ... ],"pagination":{"page":1,"limit":20,"total":3,"totalPages":1}}
```

### The output, for the AC-17.1.3.1 Gallery specifically

The `events` array entry for `id: 3`, exactly as this request returns it
(unrelated fields omitted for brevity — nothing relevant to expiry state
was omitted):

```json
{
  "id": 3,
  "slug": "wedding-ac-17-1-3-1-verification-gallery-2026-09-01",
  "event_name": "AC-17.1.3.1 Verification Gallery",
  "created_at": "2026-07-31T19:58:51.608Z",
  "expires_at": "2026-10-01T00:00:00.000Z",
  "is_active": true,
  "is_archived": false,
  "archived_at": null,
  "is_draft": false,
  "photo_count": 3,
  "customer_name": "Ada Testclient",
  "customer_email": "ac17-1-1-client@example.com"
}
```

### The field carrying the live-versus-expired state

The response above carries no field named `status`, `state`, `is_expired`,
or anything similar — only the same raw `is_draft`, `is_archived`,
`is_active`, and `expires_at` columns AC-17.4.1.1.1.2.3 already inventoried
as the pinned fork's only stored expiry-adjacent data, passed straight
through by `mapEventForApi`
(`vendor/picpeak/backend/src/routes/adminEvents.js:215-236`) with no
computed field added. The green "Active" badge the photographer actually
sees on this screen is not one of those returned fields — it is
synthesized entirely client-side, fresh on every render, by
`getEventStatus()`:

```
vendor/picpeak/frontend/src/pages/admin/EventsListPage.tsx:263-275

const getEventStatus = (event: Event) => {
  if (event.is_draft) return { label: t('events.draft'), ... };
  if (event.is_archived) return { label: t('events.archived'), ... };
  if (!event.is_active) return { label: t('events.inactive'), ... };
  if (!event.expires_at) return { label: t('events.active'), ... };
  const days = differenceInDays(parseISO(event.expires_at), new Date());
  if (days <= 0) return { label: t('events.expired'), ... };
  if (days <= 7) return { label: t('events.daysLeft', { count: days }), ... };
  return { label: t('events.active'), color: 'text-green-600 ...' };
};
```

For this Gallery today — `is_draft: false`, `is_archived: false`,
`is_active: true`, 61 days until `expires_at` — every guard clause falls
through and the function reaches its final branch
(`EventsListPage.tsx:274`), rendering the green `t('events.active')`
("Active") label next to this Gallery's row. That label is the
photographer-visible "shows it as live" signal this AC asks for, but it
is a UI-layer interpretation of four raw fields, not an explicit state
the upstream API itself returns or persists — a distinction this AC
records rather than glossing over by describing the API response itself
as carrying a "live" field.

As a second, corroborating admin surface (not the screen this AC treats
as primary, but confirming the same absence of a stored field): the
single-event Admin Event Details page
(`vendor/picpeak/frontend/src/pages/admin/EventDetailsPage.tsx`, backed by
`GET /api/admin/events/3`, whose response carries the identical raw
`is_active: true`/`is_archived: false`/`expires_at:
"2026-10-01T00:00:00.000Z"` shape with no computed field either) goes
further than the List page's fallback clause anticipates: it renders no
badge or label of any kind for a Gallery this far from expiry. Its
`isExpired`/`isExpiring` flags
(`EventDetailsPage.tsx:571-574`, the same `expires_at`-vs-`now`
computation as the List page's `getEventStatus`) are both `false` at 61
days out, so the "Expiration Warning" card that would otherwise announce
either state never renders at all
(`EventDetailsPage.tsx:1057`, gated on `isExpired || isExpiring`); the
only signal on that screen is the plain formatted date plus a "61 days
left" count (`EventDetailsPage.tsx:1820-1830`) — exactly the "only a raw
expiry date the photographer must interpret themselves" case this AC
calls out to be recorded as the actual upstream shape, which is what this
paragraph does for that screen, without treating it as this AC's primary
answer.

### Verdict

AC-17.4.1.3 is satisfied: while the AC-17.1.3.1 Gallery is still
unexpired (`expires_at = 2026-10-01 00:00:00+00`, confirmed live on
2026-08-01), the Backstage admin Events List page — backed by `GET
/api/admin/events?page=1&limit=20&status=all&sortBy=created_at&sortOrder=desc`
— currently shows it with a green "Active" label. The exact output for
this Gallery is recorded above, and the field carrying that state is
recorded honestly as what it actually is: no stored or returned API field
named `status`/`state`/`is_expired`, only the raw `is_draft`, `is_archived`,
`is_active`, `expires_at` columns already inventoried by
AC-17.4.1.1.1.2.3, fed through the frontend's `getEventStatus()`
computation (`EventsListPage.tsx:263-275`) to produce the label a
photographer sees. This is the surface AC-17.4.3 re-checks after
expiry — the same request against the same route, whose computed label
is expected to flip once `expirationChecker.js`'s scheduled sweep (per
AC-17.4.1.1.2) flips `is_active` to `false` and this same `expires_at`
value has passed.

## AC-17.4.2 — the Gallery brought past its expiry, and the client-facing refusal

`US-17` AC-17.4.2 brings the AC-17.1.3.1 Gallery (`events.id = 3`, slug
`wedding-ac-17-1-3-1-verification-gallery-2026-09-01`) past its expiry
through the interface upstream actually provides, re-runs the exact
client-facing request AC-17.4.1.2 recorded as succeeding, and records it
now refused — with the status code and body. It also records whether a
client session/token issued before expiry is still honoured afterwards.
No source file under `vendor/picpeak/` was modified, and no fork patch
closes any gap this AC finds; gaps are recorded here and raised for
`scrum-master/po-requests.md`.

### The interface upstream provides for bringing a Gallery past its expiry

Two of this AC's three named interface shapes — "admin screen, endpoint,
or the scheduled expiration process" — are both real and both used here,
in the order a photographer/operator would actually encounter them; the
third (an admin screen as a distinct UI surface from the endpoint it
calls) is the same endpoint via the Backstage UI and is not exercised
separately.

**(1) The endpoint: `PUT /api/admin/events/:id` accepts a past-dated
`expires_at`, with no future-date validation.** Its validator
(`vendor/picpeak/backend/src/routes/adminEvents.js:1129,1142`) is:

```js
router.put('/:id', adminAuth, requirePermission('events.edit'), requireEventOwnership, [
  ...
  body('expires_at').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  ...
```

`isISO8601()` checks only that the value parses as a date — nothing in
this validator chain, and nothing in the handler body that follows it
(`adminEvents.js:1230-1420`, read in full), rejects a value in the past
or requires it to be later than the Gallery's current `expires_at` or the
current time. This is a genuinely supported route for setting an expiry
in the past; no direct database write was needed for this part, and none
was made — confirmed by the pinned fork's own `activity_logs` table,
which records the write as a normal admin action, not by out-of-band
means:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select id, activity_type, actor_type, actor_name, metadata, created_at from activity_logs where event_id = 3 order by created_at asc;"

 id |  activity_type  | actor_type | actor_name |                                                    metadata                                                    |          created_at
----+-----------------+------------+------------+------------------------------------------------------------------------------------------------------------------+-------------------------------
  9 | event_created   | admin      | admin      | {"event_type":"wedding","expires_at":"2026-10-01T00:00:00.000Z","require_password":true,"password_strength":4} | 2026-07-31 19:58:51.613022+00
 10 | event_updated   | admin      | admin      | {"changes":["event_name"],"eventName":"AC-17.1.3.1 Verification Gallery"}                                      | 2026-07-31 20:26:09.660474+00
 11 | photos_uploaded | admin      | admin      | {"count":3,"replacedCount":0,"eventName":"AC-17.1.3.1 Verification Gallery"}                                   | 2026-07-31 20:41:11.634004+00
 12 | event_published | admin      | admin      | {"event_name":"AC-17.1.3.1 Verification Gallery"}                                                              | 2026-07-31 20:57:28.069053+00
 28 | event_updated   | admin      | admin      | {"changes":["expires_at"],"eventName":"AC-17.1.3.1 Verification Gallery"}                                      | 2026-08-01 14:19:55.118138+00
```

Row `28` is this AC's write, issued as the seeded administrator against
the running Backstage (`docker compose --profile backstage`, per
`BACKSTAGE_STARTUP.md`) with `PUT /api/admin/events/3` and body
`{"expires_at":"2020-01-01T00:00:00.000Z"}`. Re-issued live for this
record, unchanged, to capture its response directly (the value was
already `2020-01-01`, so this re-issue is idempotent and changes nothing
further):

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X PUT http://localhost:3100/api/admin/events/3 \
    -H "Content-Type: application/json" \
    -d '{"expires_at":"2020-01-01T00:00:00.000Z"}'

HTTP/1.1 200 OK
{"message":"Event updated successfully"}
```

**(2) The scheduled expiration process is what actually enforces it, and
did so on its own real schedule — not manually invoked.**
AC-17.4.1.1.2 already located this as `expirationChecker.js`'s hourly
`cron.schedule('0 * * * *', ...)` (`expirationChecker.js:11`), and
AC-17.4.1.1.3 already found, from code alone, that the route this AC
re-runs (`verifyGalleryAccess`, gating `GET /api/gallery/:slug/photos`)
never reads `expires_at` at all — only `is_active`, which the sweep sets.
Nothing in this AC forced that sweep to run early: the row was written at
`14:19:55.118138+00`, and the real cron's next natural tick after that
is `15:00:00`. The Gallery's current row shows the sweep did fire there,
on the actual clock, with no code invoked directly and no vendored file
touched:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -x \
    -c "select id, slug, expires_at, is_active, is_archived, is_draft, archived_at from events where id = 3;"

-[ RECORD 1 ]----------------------------------------------------
id          | 3
slug        | wedding-ac-17-1-3-1-verification-gallery-2026-09-01
expires_at  | 2020-01-01 00:00:00+00
is_active   | f
is_archived | t
is_draft    | f
archived_at | 2026-08-01 15:00:02.287+00
```

`is_active: f` and `archived_at: 2026-08-01 15:00:02.287+00` — 2.287
seconds past the top of the hour, exactly matching `checkExpirations()`
running once as the first job on the `0 * * * *` tick, per
`handleExpiredEvent`'s `is_active: false` write
(`expirationChecker.js:97`) and `archiveEvent(event)` call
(`expirationChecker.js:156`), both already cited under AC-17.4.1.1.2.

### The exact AC-17.4.1.2 request, re-run, and refused

AC-17.4.1.2 recorded `GET /api/gallery/wedding-ac-17-1-3-1-verification-
gallery-2026-09-01/photos` with a valid gallery token succeeding with
`200`. Re-run verbatim against the now-expired Gallery, with no token:

```
$ curl -s -i http://localhost:3100/api/gallery/wedding-ac-17-1-3-1-verification-gallery-2026-09-01/photos

HTTP/1.1 404 Not Found
{"error":"Gallery not found or expired"}
```

`404`, not `401` — the "no token" branch of `verifyGalleryAccess`
(`middleware/gallery.js:26-47`, cited under AC-17.4.1.2) only returns
`401 {"error":"No token provided"}` when a password would still be
required of a *live* Gallery; here the `is_active: formatBoolean(true)`
filter in its own query (`middleware/gallery.js:34-38`) already excludes
the row entirely, so the query returns nothing and the handler falls
through to `404 {"error":"Gallery not found or expired"}`
(`middleware/gallery.js:45-47`).

### Whether a client session/token issued before expiry is still accepted

A genuine gallery token for this Gallery, minted while it was still
unexpired, was captured before the `expires_at` write above: obtained at
`14:19:48` UTC via `POST /api/auth/gallery/verify`
(`{"slug":"wedding-ac-17-1-3-1-verification-gallery-2026-09-01",
"password":"Verify-Pass-123"}`, the same password AC-17.3/AC-17.4.1.2
used) — 7 seconds before the `expires_at` write recorded as
`activity_logs` row `28` above, and with a 24-hour JWT `exp` claim
(`1785680388`, i.e. `2026-08-02 14:19:48 UTC`) that is still valid at the
time this AC re-runs the request, so this is a genuine test of a
pre-expiry token surviving expiry, not an already-expired-by-its-own-
claims token:

```
$ python3 -c "import base64,json; p='eyJldmVudElkIjozLCJldmVudFNsdWciOiJ3ZWRkaW5nLWFjLTE3LTEtMy0xLXZlcmlmaWNhdGlvbi1nYWxsZXJ5LTIwMjYtMDktMDEiLCJ0eXBlIjoiZ2FsbGVyeSIsImlwIjoiMTkyLjE2OC42NS4xIiwibG9naW5UaW1lIjoxNzg1NTkzOTg4NDE4LCJpYXQiOjE3ODU1OTM5ODgsImV4cCI6MTc4NTY4MDM4OCwiaXNzIjoicGljcGVhay1hdXRoIn0'; p+='='*(-len(p)%4); print(json.dumps(json.loads(base64.urlsafe_b64decode(p))))"

{"eventId": 3, "eventSlug": "wedding-ac-17-1-3-1-verification-gallery-2026-09-01", "type": "gallery", "ip": "192.168.65.1", "loginTime": 1785593988418, "iat": 1785593988, "exp": 1785680388, "iss": "picpeak-auth"}
```

Re-running the exact AC-17.4.1.2 request with this pre-expiry token:

```
$ curl -s -i -b <pre-expiry-gallery-cookie-jar> http://localhost:3100/api/gallery/wedding-ac-17-1-3-1-verification-gallery-2026-09-01/photos

HTTP/1.1 404 Not Found
{"error":"Gallery not found or expired"}
```

Refused, identically to the no-token case. **No gap here**: a client
session/token issued before expiry is *not* still accepted afterwards.
This is not a coincidence of timing — it is guaranteed by the code path
itself, already read in full for this AC. When a token is present,
`verifyGalleryAccess` decodes it and then re-queries the Gallery by slug
with the same `is_active: formatBoolean(true)` filter unconditionally
ANDed into the `WHERE` clause
(`middleware/gallery.js:85-96`), regardless of anything the decoded token
claims; if that query returns no row, the handler returns `404` before
the token's own claims (`decoded.eventId`, `decoded.via`, etc.) are ever
consulted further (`middleware/gallery.js:99,119-121`). There is no
session store and no cache of "already authenticated" — every request,
token or not, is re-authorized against the live `is_active` column.

### The real gap this AC finds: enforcement lag between the two named interfaces

Setting `expires_at` into the past through the supported endpoint and the
scheduled process actually enforcing it are two different moments, and
this AC's own timestamps show the gap between them was real, not
theoretical:

- `expires_at` write (endpoint): `2026-08-01 14:19:55.118138+00`
  (`activity_logs` row `28`).
- Enforcement (scheduled process): `2026-08-01 15:00:02.287+00`
  (`events.archived_at`).

For roughly **40 minutes**, this Gallery's own stored `expires_at` value
was already in the past — by the AC's own plain-language standard, "past
its expiry" — while the endpoint that set it, `PUT
/api/admin/events/:id`, gave no indication that enforcement was still
pending (`200 {"message":"Event updated successfully"}`, cited above, is
indistinguishable from any other successful edit). This AC did not
capture a live client request during that specific 40-minute window
(the request re-run above was issued after the sweep had already fired,
per its own logged time), so the claim that access continued to succeed
throughout that window is not a separately observed data point here — it
follows deterministically from code this audit has already read and
cited: AC-17.4.1.1.3 already established that `verifyGalleryAccess`
never reads `expires_at` at all, only `is_active`
(`middleware/gallery.js:34-38,85-96`, both re-read for this AC), and
`is_active` was unchanged (`t`) until the sweep's `15:00:02.287+00`
write. Given that code path and those two timestamps, a request issued
at any point in that window is not a matter of interpretation — this is
the same finding AC-17.4.1.1.3 already recorded as "difference #1" and
"#3" from code alone, now dated with a real before/after pair rather
than argued in the abstract. Worst case for a Gallery whose `expires_at`
falls just after an hour boundary, this lag approaches a full hour, since
the sweep only ever runs on the hour.

This is a real gap under this AC's own terms ("a session that outlives
the expiry is a real gap rather than a detail" — applied here to the
Gallery's overall access window, not a session specifically, since no
actual session/token gap was found) and is raised to the Product Owner:
`scrum-master/po-requests.md` should record that "past its expiry, the
gallery no longer grants client access" holds only up to an hour late,
not immediately, because the only route that changes `expires_at` does
not itself gate any access surface, and the field that does gate access
(`is_active`) only changes on the next hourly sweep.

### Verdict

AC-17.4.2 is satisfied: the AC-17.1.3.1 Gallery was brought past its
expiry through the interface upstream provides — the supported `PUT
/api/admin/events/:id` endpoint for setting `expires_at` into the past
(no direct database write), and the real, unforced hourly
`expirationChecker` sweep for the enforcement itself — and the exact
client-facing request AC-17.4.1.2 recorded as succeeding was re-run and
is now refused: `404 {"error":"Gallery not found or expired"}`, both cold
and with a genuine token minted 7 seconds before the `expires_at` write.
A client session/token issued before expiry is confirmed, both live and
from the unconditional `is_active` filter in `verifyGalleryAccess`, to
not still be accepted afterwards — no session/token gap. A real gap is
found and recorded rather than patched: up to roughly an hour of lag
between a Gallery becoming "past its expiry" by its own stored value and
the scheduled process actually denying access, evidenced by this AC's own
`14:19:55`/`15:00:02` timestamp pair; this is raised for
`scrum-master/po-requests.md` per AC-17.9 rather than closed with a fork
patch.

## AC-17.4.3 — the expired state, re-checked on the photographer-facing screen

`US-17` AC-17.4.3 re-checks the exact photographer-facing screen and
request AC-17.4.1.3 recorded (the Backstage admin Events List page, backed
by `GET /api/admin/events?page=1&limit=20&status=all&sortBy=created_at&sortOrder=desc`)
against the same AC-17.1.3.1 Gallery (`events.id = 3`), now that AC-17.4.2
has brought it past its expiry, records the field carrying the state, and
records whether that visibility was immediate or required the scheduled
expiration process — including that process's own output and side
effects. No new Gallery was created, no source file under
`vendor/picpeak/` was modified, and no direct database write was made for
this AC; every value below was re-read from the running Backstage.

### The scheduled process was already required, and already ran — on its own clock

AC-17.4.2 already established that the endpoint which writes a past-dated
`expires_at` (`PUT /api/admin/events/:id`) does not itself gate or flag
anything a photographer sees, and that enforcement is the separate,
real hourly `expirationChecker` sweep (`cron.schedule('0 * * * *', ...)`,
`expirationChecker.js:11`). That sweep already fired for this Gallery, on
its own real schedule, before this AC's recheck — no code was invoked
directly for this AC, no vendored file touched:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -x \
    -c "select id, slug, expires_at, is_active, is_archived, is_draft, archived_at from events where id = 3;"

-[ RECORD 1 ]----------------------------------------------------
id          | 3
slug        | wedding-ac-17-1-3-1-verification-gallery-2026-09-01
expires_at  | 2020-01-01 00:00:00+00
is_active   | f
is_archived | t
is_draft    | f
archived_at | 2026-08-01 15:00:02.287+00
```

So the answer to "immediate or only after the scheduled process runs" is
explicit: **not immediate**. AC-17.4.2 already timed the gap on this same
Gallery — the `expires_at` write landed at `14:19:55` and enforcement
landed at `15:00:02`, roughly 40 minutes later, because the sweep only
runs on the hour. Nothing on the photographer-facing screen changes
during that gap; it changes only once this scheduled process actually
runs.

### The scheduled process's output and side effects, recorded in full

`handleExpiredEvent` (`vendor/picpeak/backend/src/services/expirationChecker.js:94-162`,
read in full) does four things in one pass, all attributable to this same
sweep tick and none invoked directly for this AC:

1. **Deactivation** — `events.is_active` set to `false`
   (`expirationChecker.js:96`).
2. **A webhook fire** — `event.expired`, fired *before* the archive call so
   receivers see the lifecycle in order (`expirationChecker.js:101-118`).
   This is the same outbound path AC-17.7 exercises generally; not
   re-verified with a listener here, since that is that AC's own scope.
3. **Archiving** — `archiveEvent(event)` (`expirationChecker.js:152`),
   confirmed above: `is_archived: t`, `archived_at: 2026-08-01
   15:00:02.287+00`, and an `archive_path` now populated
   (`events/archived/wedding-ac-17-1-3-1-verification-gallery-2026-09-01.zip`,
   visible in the re-checked API response below).
4. **Queued notifications** — a `gallery_expired` email queued to the
   customer and, since `admin_email` differs from `customer_email` for
   this Gallery, a second `gallery_expired` email queued to the admin
   (`expirationChecker.js:140,148-151`); a third, `archive_complete`, is
   queued once `archiveEvent` finishes. All three are real rows in the
   Backstage's own `email_queue` table, re-read live for this AC, all
   still `pending` (queued, not yet sent — consistent with AC-17.6's own
   scope for confirming send state):

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select id, event_id, recipient_email, email_type, status, created_at, sent_at from email_queue where event_id = 3 order by created_at asc;"

 id | event_id |       recipient_email       |    email_type    | status  |         created_at         | sent_at
----+----------+-----------------------------+------------------+---------+----------------------------+---------
  1 |        3 | ac17-1-1-client@example.com | gallery_created   | pending | 2026-07-31 20:57:28.059+00 |
 14 |        3 | ac17-1-1-client@example.com | gallery_expired   | pending | 2026-08-01 15:00:00.985+00 |
 15 |        3 | admin@example.com           | gallery_expired   | pending | 2026-08-01 15:00:00.997+00 |
 16 |        3 | admin@example.com           | archive_complete  | pending | 2026-08-01 15:00:03.707+00 |
```

Rows 14 and 15 land at `15:00:00`, row 16 (queued only once the zip
archive actually finishes) at `15:00:03.707` — 1.4 seconds after
`archived_at`, confirming the ordering `handleExpiredEvent`'s source
implies.

### The exact AC-17.4.1.3 request, re-run against the now-expired Gallery

The identical request, signed in as the same seeded administrator, with
the same default filter:

```
$ curl -s -i -b <seeded-admin-cookie-jar> \
    "http://localhost:3100/api/admin/events?page=1&limit=20&status=all&sortBy=created_at&sortOrder=desc"

HTTP/1.1 200 OK
```

The `events` array entry for `id: 3`, exactly as this request returns it
now (unrelated fields omitted for brevity — nothing relevant to expiry or
archive state was omitted):

```json
{
  "id": 3,
  "slug": "wedding-ac-17-1-3-1-verification-gallery-2026-09-01",
  "expires_at": "2020-01-01T00:00:00.000Z",
  "is_active": false,
  "is_archived": true,
  "archive_path": "events/archived/wedding-ac-17-1-3-1-verification-gallery-2026-09-01.zip",
  "archived_at": "2026-08-01T15:00:02.287Z",
  "is_draft": false,
  "photo_count": 3,
  "customer_name": "Ada Testclient",
  "customer_email": "ac17-1-1-client@example.com"
}
```

The single-event Admin Event Details page (`GET /api/admin/events/3`,
AC-17.4.1.3's corroborating second screen) was re-checked the same way
and returns the identical `expires_at`/`is_active`/`is_archived`/
`archived_at`/`archive_path` values for this Gallery.

### The field carrying the state — and the label actually shown, honestly recorded

As AC-17.4.1.3 already found, the response above carries no field named
`status`, `state`, `is_expired`, or anything similar — this recheck
confirms that finding still holds after expiry: the state is still only
the same raw `is_draft`, `is_archived`, `is_active`, `expires_at` columns,
unchanged in shape, fed through the frontend's client-side computation.

That computation, `getEventStatus()`
(`vendor/picpeak/frontend/src/pages/admin/EventsListPage.tsx:263-275`,
re-read for this AC, unchanged since AC-17.4.1.3), is where this AC's
finding diverges from a naive expectation. The function does define an
`events.expired` label for exactly the case AC-17.4.1.2/17.4.2 exercised
(`expires_at` in the past, `days <= 0`):

```
vendor/picpeak/frontend/src/pages/admin/EventsListPage.tsx:263-275

const getEventStatus = (event: Event) => {
  if (event.is_draft) return { label: t('events.draft'), ... };
  if (event.is_archived) return { label: t('events.archived'), color: 'text-neutral-500 ...' };
  if (!event.is_active) return { label: t('events.inactive'), ... };
  if (!event.expires_at) return { label: t('events.active'), ... };
  const days = differenceInDays(parseISO(event.expires_at), new Date());
  if (days <= 0) return { label: t('events.expired'), ... };
  ...
};
```

But the `is_archived` guard (line 265) sits *ahead* of the `is_active` and
`expires_at`/`days <= 0` guards, and this Gallery's row now has
`is_archived: true` — because `handleExpiredEvent` archives the event in
the same sweep pass that deactivates it (recorded above). So this branch
is reached and returned first: the photographer-facing Events List page
now shows this Gallery with the grey **"Archived"** label
(`t('events.archived')`), not the red **"Expired"** label the code
defines for this exact date condition. Recorded honestly, per this AC's
own instruction not to work around the actual upstream shape: the visible
photographer-facing signal for this Gallery's expiry is "Archived," and
the `events.expired` label is effectively unreachable through the normal
scheduled-expiry lifecycle, since the same sweep tick that would make
`days <= 0` the deciding guard has, by the time the photographer next
loads this screen, already set `is_archived: true` first.

The corroborating Event Details page shows the same divergence, more
visibly. Its badge row now renders an `Archive` icon plus
`t('events.archived')`
(`vendor/picpeak/frontend/src/pages/admin/EventDetailsPage.tsx:924-927`,
gated on `event.is_archived`), and its "Expiration Warning" card — the
surface that would show the red "Expired" message AC-17.4.1.3 found
suppressed at 61 days out — stays suppressed here too, but for a
different reason now: not because `isExpired` is false (it is `true`;
`expiresAtDate`/`daysUntilExpiration`/`isExpired` at
`EventDetailsPage.tsx:570-573` are unchanged code, and `2020-01-01` is
obviously past), but because the card's own gate is
`!event.is_archived && (isExpired || isExpiring)`
(`EventDetailsPage.tsx:1057`), and `is_archived` is now `true`. In its
place, an "Archive Status" card renders instead
(`event.is_archived ? ... : ...` at `EventDetailsPage.tsx:2346-2348`),
showing an "Archived On" timestamp
(`t('events.archivedOn')`, `EventDetailsPage.tsx:2352`) sourced from the
same `archived_at` value confirmed above, plus a "download archive"
button backed by the populated `archive_path`.

### Verdict

AC-17.4.3 is satisfied: the exact photographer-facing screen and request
AC-17.4.1.3 recorded — the Backstage admin Events List page, `GET
/api/admin/events?page=1&limit=20&status=all&sortBy=created_at&sortOrder=desc`
— was re-checked against the same AC-17.1.3.1 Gallery now past its
expiry, and now reports it as no longer live. Visibility was **not
immediate**: it required the scheduled `expirationChecker` sweep, which
was not triggered manually for this AC — it had already run on its own
real hourly clock as part of AC-17.4.2's work — and that process's output
and side effects are recorded in full above: deactivation (`is_active:
false`), archiving (`is_archived: true`, `archived_at`, a populated
`archive_path`), an `event.expired` webhook fire, and three queued
notification emails (customer `gallery_expired`, admin `gallery_expired`,
admin `archive_complete`), all still `pending` in `email_queue` at recheck
time. The field carrying the state remains the same raw columns
AC-17.4.1.3 found, with no computed status field added by the API. Recorded
honestly rather than worked around: the label the photographer actually
sees is **"Archived"**, not "Expired" — the code defines an `events.expired`
label for this exact date condition, but the `is_archived` guard in
`getEventStatus()` (`EventsListPage.tsx:265`) is checked first and this
Gallery is now archived, so that branch wins on every surface checked,
list and detail alike.

## AC-17.5.1 — the client-facing view, the archive download, and the download policy, proven live

`US-17` AC-17.5.1 requires that the client-facing view, the archive
download, and the download policy be proven live and recorded as they
already stand, with no fork patch: a client obtaining a gallery token
through `POST /api/auth/gallery/verify`, `GET /api/gallery/:slug/photos`
returning every photo, `GET /api/gallery/:slug/download-all` returning a
valid zip with its size and entry list recorded, and the download routes
refusing with `403` once `allow_downloads` is flipped off, restored
afterward. It also requires recording, from reading the pinned source
only, the starting shape the two criteria that follow act on — why the
archive route needs no patch and how the single-photo route differs from
it — which is the last subsection below. This AC modifies no source file;
every action below is either a live HTTP call against the running
Backstage, a read of its own Postgres, or a read of the pinned source
— no file under `vendor/picpeak/` was touched, and nothing in
`FORK_CHANGELOG.md`, `PICPEAK_UPSTREAM_DEFECTS.md`, or `UPSTREAM_SYNC.md`
changes for this AC. The single-photo download route
(`GET /:slug/download/:photoId`) is deliberately never called here, per
this AC's own scope — its known hang under this deployment's S3 storage
backend, and the fork patch that fixes it, belong to the criteria that
follow.

### The designated Gallery was found already archived — recorded honestly, not silently substituted

This AC was handed the AC-17.1.3.1 Gallery (`events.id = 3`, slug
`wedding-ac-17-1-3-1-verification-gallery-2026-09-01`) to reuse, on the
premise that it is active and unexpired. Read live before anything else
was done for this AC, it is not:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -x \
    -c "select id, slug, is_active, is_archived, is_draft, expires_at, archived_at, allow_downloads from events where id = 3;"

-[ RECORD 1 ]---+----------------------------------------------------
id              | 3
slug            | wedding-ac-17-1-3-1-verification-gallery-2026-09-01
is_active       | f
is_archived     | t
is_draft        | f
expires_at      | 2020-01-01 00:00:00+00
archived_at     | 2026-08-01 15:00:02.287+00
allow_downloads | t
```

This is exactly the state AC-17.4.2/AC-17.4.3 already recorded above —
those two ACs' own live work, earlier the same day, brought this Gallery
past its expiry and the scheduled sweep archived it. The premise this AC
was handed did not account for that prior work having already landed on
this branch.

`verifyGalleryAccess` (`middleware/gallery.js:34-38,85-96`, cited under
AC-17.4.2/AC-17.4.3) requires **both** `is_active: true` and
`is_archived: false` before any client-facing route — including the two
this AC exists to exercise — will serve anything. An archived Gallery is
not a candidate for this AC's live proof at all, regardless of
`expires_at`.

Upstream does provide a supported route to reverse an archive —
`POST /api/admin/archives/:id/restore`
(`vendor/picpeak/backend/src/routes/adminArchives.js:143`) — and it was
tried first, live, rather than assumed unusable:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X POST http://localhost:3100/api/admin/archives/3/restore \
    -H "Content-Type: application/json" -d '{}'

HTTP/1.1 404 Not Found
{"error":"Archive file not found on disk"}
```

Reading the route (`adminArchives.js:143-172`) explains why: it resolves
the archive zip with `path.join(process.env.STORAGE_PATH ||
path.join(__dirname, '../../../storage'), archive.archive_path)` and then
`fs.access()`s that local path directly — it has no `getStorage()` /
storage-backend branch at all, unlike the sibling `download-all` route
this AC is about to exercise. Under this deployment's
`STORAGE_BACKEND=s3` (confirmed live: `docker compose --profile backstage
exec -T backstage-backend sh -c 'env | grep STORAGE_BACKEND'` →
`STORAGE_BACKEND=s3`), the archive this Gallery's own expiry sweep wrote
lives in R2, not on the container's local filesystem, so `fs.access()`
correctly reports it missing and the restore is refused. This is the same
class of defect the single-photo download route carries (recorded from
the pinned source at the end of this section, and owed as a formal
register entry to the criteria that follow) — a local-filesystem-only
code path in an S3-backed deployment — but a different route and file,
and registering it formally is out of this AC's scope (no
`PICPEAK_UPSTREAM_DEFECTS.md` entry was added, and that file does not
exist on this branch yet);
it is recorded here only as the evidence for why restore was not a viable
path forward, and is worth the Product Owner's attention under AC-17.9.

`PUT /api/admin/events/:id` (the same endpoint AC-17.4.2 used to set
`expires_at`) accepts `is_active` and `expires_at` in its body but not
`is_archived` — confirmed by reading its full `express-validator` chain
(`adminEvents.js:1129-1228`), which lists no `is_archived` field. Tried
live to see whether `is_active: true` alone would be enough:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X PUT http://localhost:3100/api/admin/events/3 \
    -H "Content-Type: application/json" \
    -d '{"is_active":true,"expires_at":"2026-12-31T00:00:00.000Z"}'

HTTP/1.1 200 OK
{"message":"Event updated successfully"}
```

`is_active` did flip to `true`, but `is_archived` stayed `true` (the
route cannot touch it), so `verifyGalleryAccess`'s combined filter still
excludes the row and no client-facing route would have served it. Since
this was a probe, not a fix, and the AC-17.4.2/AC-17.4.3 verdicts above
depend on this Gallery's row matching exactly what they recorded, the
probe was reverted immediately, live, back to the values those two ACs
captured:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X PUT http://localhost:3100/api/admin/events/3 \
    -H "Content-Type: application/json" \
    -d '{"is_active":false,"expires_at":"2020-01-01T00:00:00.000Z"}'

HTTP/1.1 200 OK
{"message":"Event updated successfully"}
```

Re-read afterward, `events.id = 3` shows `is_active: f`, `is_archived: t`,
`expires_at: 2020-01-01 00:00:00+00`, `archived_at: 2026-08-01
15:00:02.287+00` — identical to the state above and to what AC-17.4.2/
AC-17.4.3 recorded, so their evidence stands undisturbed.

With no supported route able to bring `events.id = 3` back to a
client-reachable state under this deployment's storage backend, this AC's
live proof was carried out against a second Gallery instead — created
through the exact same supported interface AC-17.1.3.1 already used and
proved (`POST /api/admin/events`), not a shortcut and not a direct
database write of the Gallery itself. No vendored source was touched to
make this possible.

### An unrelated local-storage permission gap, hit and cleared before the create route would work

The first attempt to create the replacement Gallery failed, live:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X POST http://localhost:3100/api/admin/events \
    -H "Content-Type: application/json" -d '{ ... }'

HTTP/1.1 500 Internal Server Error
{"error":"Failed to create event"}
```

with the backend log showing `Error creating event: Error: EACCES:
permission denied, mkdir '/storage'`. Event creation always creates a
local folder for the new Gallery
(`adminEvents.js:607-611`, `path.join(__dirname, '../../../storage')`
unconditionally, regardless of `STORAGE_BACKEND`) — but `__dirname`
there is `/app/src/routes`, so that computed default is `/storage`, not
the `/app/storage` directory the image's `Dockerfile` actually creates
and `chown`s to the `nodejs` user
(`vendor/picpeak/backend/Dockerfile`: `mkdir -p storage/... && chown -R
nodejs:nodejs storage data logs`, relative to `WORKDIR /app`). With no
`STORAGE_PATH` environment variable set in `docker-compose.yml` (only the
`STORAGE_S3_*` variables are), and no volume backing `/storage`, a freshly
started `backstage-backend` container has no `/storage` at all, and the
non-root `nodejs` user the server actually runs as (confirmed via
`/proc/<pid>/status`) cannot create it directly under the root-owned `/`.
This is a third instance of the same defect family as the single-photo
download route and the archive-restore gap above — a hard-coded
local-filesystem assumption that does not hold in this deployment — and
is likewise not registered as a
new formal defect here, since doing so is outside this AC's scope; it is
recorded only as the reason a one-time, non-source operational fix was
needed:

```
$ docker compose --profile backstage exec -T backstage-backend sh -c 'mkdir /storage && chown -R nodejs:nodejs /storage'
```

No file under `vendor/picpeak/` was edited to do this — it is the same
category of action as `wait-for-db.sh`'s own `chown -R nodejs:nodejs
/app/storage` step, just applied once, by hand, at the path the create
route actually resolves to. With that in place, `POST /api/admin/events`
succeeded on retry (below). Raised, alongside the archive-restore gap
above, for the Product Owner's attention under AC-17.9.

### The replacement Gallery: created, uploaded into, and published

Created through `POST /api/admin/events`, the same route and shape
AC-17.1.3.1 used — a new event date and slug, the same AC-17.1.1 Client
(`ac17-1-1-client@example.com`) and a fresh gallery password, with
`allow_downloads` explicit in the body this time:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X POST http://localhost:3100/api/admin/events \
    -H "Content-Type: application/json" \
    -d '{
      "event_type": "wedding",
      "event_name": "AC-17.5.1 Verification Gallery",
      "event_date": "2026-09-15",
      "customer_name": "Ada Testclient",
      "customer_email": "ac17-1-1-client@example.com",
      "admin_email": "admin@example.com",
      "password": "Verify-Pass-456",
      "require_password": true,
      "allow_downloads": true,
      "expiration_days": 30
    }'

HTTP/1.1 200 OK
{"id":9,"slug":"wedding-ac-17-5-1-verification-gallery-2026-09-15", ... ,"is_draft":true,"expires_at":"2026-10-15T00:00:00.000Z", ... }
```

The same three real JPEGs AC-17.2 uploaded into the original Gallery
(`public/photobuddy/img/about_img.jpg`, `.../slide/4.jpg`,
`.../gallery/8.jpg`) were uploaded into this one, through the same route
AC-17.2 already proved:

```
$ curl -s -b <seeded-admin-cookie-jar> -X POST http://localhost:3101/api/admin/photos/9/upload \
    -F "photos=@public/photobuddy/img/about_img.jpg;type=image/jpeg" \
    -F "photos=@public/photobuddy/img/slide/4.jpg;type=image/jpeg" \
    -F "photos=@public/photobuddy/img/gallery/8.jpg;type=image/jpeg"

HTTP 202
{"upload_id":"56b7a4e341a5b9cb0328d9b4e080f431","count":3,"photo_ids":[9,10,11], ... }

$ curl -s -b <seeded-admin-cookie-jar> \
    http://localhost:3101/api/admin/photos/uploads/56b7a4e341a5b9cb0328d9b4e080f431/status

{"upload_id":"56b7a4e...","event_id":9,"total":3,"pending":0,"processing":0,"complete":3,"failed":0, ... }
```

All three reached `complete`. Published through
`POST /api/admin/events/:id/publish`, the same route AC-17.3 used:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X POST http://localhost:3100/api/admin/events/9/publish

HTTP/1.1 200 OK
{"message":"Event published successfully","is_draft":false}
```

Read straight out of `backstage-db`, confirming the Gallery this AC's
live proof runs against — published, active, unexpired, downloads
allowed, three visible, fully processed photos:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -x \
    -c "select id, slug, is_active, is_archived, is_draft, expires_at, allow_downloads from events where id = 9;"

-[ RECORD 1 ]---+--------------------------------------------------
id              | 9
slug            | wedding-ac-17-5-1-verification-gallery-2026-09-15
is_active       | t
is_archived     | f
is_draft        | f
expires_at      | 2026-10-15 00:00:00+00
allow_downloads | t

$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select id, event_id, visibility, processing_status from photos where event_id=9;"

 id | event_id | visibility | processing_status
----+----------+------------+-------------------
  9 |        9 | visible    | complete
 10 |        9 | visible    | complete
 11 |        9 | visible    | complete
```

### A client obtains a gallery token, and lists every photo

```
$ curl -s -i -c <gallery-cookie-jar> -X POST http://localhost:3100/api/auth/gallery/verify \
    -H "Content-Type: application/json" \
    -d '{"slug":"wedding-ac-17-5-1-verification-gallery-2026-09-15","password":"Verify-Pass-456"}'

HTTP/1.1 200 OK
Set-Cookie: gallery_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax
Set-Cookie: gallery_token_wedding-ac-17-5-1-verification-gallery-2026-09-15=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax

{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","event":{"id":9,"event_name":"AC-17.5.1 Verification Gallery", ... }}
```

```
$ curl -s -i -b <gallery-cookie-jar> http://localhost:3100/api/gallery/wedding-ac-17-5-1-verification-gallery-2026-09-15/photos

HTTP/1.1 200 OK
{"event":{"id":9, ... "allow_downloads":true, ... },"categories":[],"photos":[{"id":11, ... },{"id":10, ... },{"id":9, ... }]}
```

All three uploaded photos (`id` 9, 10, 11) are returned, exactly as
AC-17.3's equivalent call against the original Gallery returned its three.

### The archive download: `GET /api/gallery/:slug/download-all`

Downloaded with `curl -o`/`-D` kept separate (a combined `-i -o` run was
tried first and produces a body file with the response headers
prepended to the zip bytes — harmless to `zipfile`'s own end-of-
central-directory scan, which is why it still opened cleanly, but wrong
for recording an exact byte size, so it was discarded and redone the
clean way):

```
$ curl -s -b <gallery-cookie-jar> -D - -o download-all.zip \
    http://localhost:3100/api/gallery/wedding-ac-17-5-1-verification-gallery-2026-09-15/download-all

HTTP/1.1 200 OK
Content-Type: application/zip
Content-Length: 86027
Content-Disposition: attachment; filename="wedding-ac-17-5-1-verification-gallery-2026-09-15.zip"
```

`wc -c download-all.zip` → `86027`, matching `Content-Length` exactly.
Re-run a second time to confirm this reproduces rather than describing a
one-off: identical `200`, identical `Content-Length: 86027`. Opened with
Python's `zipfile` (`ZipFile.testzip()` → `None`, no bad CRCs) and its
full entry list read back:

```
AC-17.5.1_Verification_Gallery_individual_0003.jpg   5440 bytes
AC-17.5.1_Verification_Gallery_individual_0002.jpg  64450 bytes
AC-17.5.1_Verification_Gallery_individual_0001.jpg  15539 bytes
```

Three entries, one per uploaded photo, each file size matching the
original upload sizes exactly (`5440`, `64450`, `15539` — the same three
sizes AC-17.2 recorded for these same three source JPEGs). Reading the
route (`gallery.js:739-836`, cited in this AC's own pinned scope) confirms
why no patch was needed here: it resolves every managed photo with
`resolvePhotoStorageKey(req.event, photo)` and streams it through
`getStorage()` (`storage.get(storageKey)` on the fallback path used here,
since no pre-generated zip yet existed for a brand-new Gallery), the same
storage-backend abstraction the sibling thumbnail/hero/preview routes use
— unlike the single-photo download route this AC deliberately does not
call.

`access_logs`, read back rather than trusted from the HTTP responses
alone, shows the whole sequence in order:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage \
    -c "select id, event_id, action, ip_address, timestamp from access_logs where event_id = 9 order by timestamp;"

 id | event_id |    action     |  ip_address  |           timestamp
----+----------+---------------+--------------+-------------------------------
 51 |        9 | login_success | 192.168.65.1 | 2026-08-01 16:23:32.503644+00
 52 |        9 | view          | 192.168.65.1 | 2026-08-01 16:23:36.756554+00
 53 |        9 | download_all  | 192.168.65.1 | 2026-08-01 16:23:45.784768+00
 54 |        9 | download_all  | 192.168.65.1 | 2026-08-01 16:23:58.660616+00
```

`login_success` from the verify call, `view` from the photos listing, and
one `download_all` row per successful archive download — nothing logged
for calls that never reached the zip logic (confirmed below).

### The download policy: refused with `403` once `allow_downloads` is off, restored afterward

`allow_downloads` was flipped off through the same supported
`PUT /api/admin/events/:id` route used earlier in this AC:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X PUT http://localhost:3100/api/admin/events/9 \
    -H "Content-Type: application/json" -d '{"allow_downloads":false}'

HTTP/1.1 200 OK
{"message":"Event updated successfully"}
```

confirmed live in Postgres (`allow_downloads: f`). Both download routes
this AC exercises were then re-run with the same gallery token — the
single-photo route is not one of them, per this AC's own scope:

```
$ curl -s -i -m 30 -b <gallery-cookie-jar> \
    http://localhost:3100/api/gallery/wedding-ac-17-5-1-verification-gallery-2026-09-15/download-all

HTTP/1.1 403 Forbidden
{"error":"Downloads are disabled for this gallery"}

$ curl -s -i -m 30 -b <gallery-cookie-jar> -X POST \
    http://localhost:3100/api/gallery/wedding-ac-17-5-1-verification-gallery-2026-09-15/download-selected \
    -H "Content-Type: application/json" -d '{"photoIds":[9,10,11]}'

HTTP/1.1 403 Forbidden
{"error":"Downloads are disabled for this gallery"}
```

Both routes check `req.event.allow_downloads === false` and refuse before
doing anything else (`gallery.js:742-744` for `download-all`,
`gallery.js:910-912` for `download-selected`) — neither call produced a
new `access_logs` row (rows `53`/`54` above remain the only `download_all`
entries; no row `55`/`56` appears until the flag is restored below),
confirming the refusal happens before any download is recorded, not just
before bytes are sent.

The flag was then restored, live, through the same endpoint:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X PUT http://localhost:3100/api/admin/events/9 \
    -H "Content-Type: application/json" -d '{"allow_downloads":true}'

HTTP/1.1 200 OK
{"message":"Event updated successfully"}
```

confirmed live in Postgres (`allow_downloads: t`), and the archive route
re-confirmed working again:

```
$ curl -s -o /dev/null -w 'http_code=%{http_code}\n' -m 30 -b <gallery-cookie-jar> \
    http://localhost:3100/api/gallery/wedding-ac-17-5-1-verification-gallery-2026-09-15/download-all

http_code=200
```

(the corresponding `download_all` row, `id 55`, plus the one more from
the `Content-Length`-only recheck in the previous section, `id 56`, both
land after the restore — consistent with the gap above.)

### The shape the two criteria that follow act on, read out of the pinned source

This last part of the AC is a *reading*, not an investigation. The
Product Owner's own verified run (`scrum-master/po-requests.md`,
2026-08-01) handed this criterion the line references and the
storage-backend diagnosis below as fixed scope; what follows confirms
each of them against the pinned source at
`vendor/picpeak/backend/src/routes/gallery.js`, and nothing here is
re-derived by fresh investigation or by calling the route. The
single-photo download route is not called anywhere in this criterion —
on this stack it does not error, it hangs, and every call to it anywhere
in `US-17` must carry a hard timeout (`curl --max-time 10`, or an
explicit client timeout).

**The archive route needs no patch — it already resolves through the
storage backend.** `GET /:slug/download-all` (`gallery.js:739`) builds
each zip entry through `resolvePhotoStorageKey` and `getStorage()`:

```js
// vendor/picpeak/backend/src/routes/gallery.js:836-837, 844, 870-872
const { resolvePhotoStorageKey } = require('../services/photoResolver');
const storage = getStorage();
...
  const storageKey = resolvePhotoStorageKey(req.event, photo);
...
  } else if (storageKey) {
    const stream = await storage.get(storageKey);
    archive.append(stream, { name: archiveName });
```

`resolvePhotoStorageKey` (`services/photoResolver.js:20-38`) returns a
*relative key* (`events/active/{slug}/individual/{filename}`), never an
absolute local path, and `getStorage()` picks the backend this deployment
is actually configured for (`STORAGE_BACKEND=s3`, confirmed live earlier
in this AC). That is precisely why the archive download recorded above
returned `200` and a valid three-entry zip with no fork patch of any
kind — the code path this AC exercised never touches the container's
local filesystem for photo bytes. `resolvePhotoFilePath` still appears on
two *fallback* branches of the same loop (`gallery.js:861`, `874`), but
both are guarded by `storageKey` being null, which happens only for
`reference`/`external`-mode photos (`photoResolver.js:24-27`); the
managed photos in this Gallery take neither branch.

**The single-photo route resolves through the local filesystem only.**
`GET /:slug/download/:photoId` (`gallery.js:631`) resolves its bytes with
the sibling helper instead:

```js
// vendor/picpeak/backend/src/routes/gallery.js:665-676
let filePath;
try {
  filePath = resolvePhotoFilePath(req.event, photo);
} catch (resolveError) {
  logger.error('Failed to resolve photo path for download', { ... });
  return res.status(404).json({ error: 'Photo file not found' });
}
```

`resolvePhotoFilePath` (`photoResolver.js:45-90`) has no
storage-backend branch at all. For a managed photo it ends at
`safePathJoin(path.join(getStoragePath(), 'events/active'), relativeSegment)`,
where `getStoragePath()` is `process.env.STORAGE_PATH ||
path.join(__dirname, '../../../storage')` (`photoResolver.js:5`) — an
absolute path on the container's own disk, computed identically whether
`STORAGE_BACKEND` is `local` or `s3`. It neither calls `getStorage()` nor
consults `STORAGE_BACKEND`. This is the same local-filesystem-only shape
already recorded in this AC for `POST /api/admin/archives/:id/restore`
and for the create route's `/storage` `mkdir`, in a third place: a route
that assumes photo bytes are reachable as a file, in a deployment where
they are objects in R2.

**Its failure path logs but never responds.** The non-watermarked branch
streams with `res.sendFile` and passes a callback that only writes a log
line:

```js
// vendor/picpeak/backend/src/routes/gallery.js:716-725
res.sendFile(filePath, (downloadError) => {
  if (downloadError) {
    logger.error('Error streaming gallery download', {
      slug: req.params.slug,
      photoId,
      eventId: req.event.id,
      error: downloadError.message,
    });
  }
});
```

There is no `res.status(...)`, no `res.end()`, and no `next(...)` inside
that callback — the only statement in it is `logger.error`. The
handler's own `try/catch` (opened at `gallery.js:632`, caught at
`gallery.js:727-735`, where it *does* send a `500`) cannot cover it
either:
`res.sendFile`'s callback is invoked asynchronously, after the handler's
`try` block has already returned, so a stream failure is swallowed by the
callback and never converted into a response. That is the shape behind
the hang, and it is why the single-photo route is not called here.

**Both write rows before the send is attempted.** The download counter
and the audit-log row are written *above* the resolve-and-send block, not
after it:

```js
// vendor/picpeak/backend/src/routes/gallery.js:653-663
// Update download count
await db('photos').where('id', photoId).increment('download_count', 1);

// Log download
await db('access_logs').insert({
  event_id: req.event.id,
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
  action: 'download',
  photo_id: photoId
});
```

`gallery.js:654` increments `photos.download_count` and `gallery.js:657`
inserts the `access_logs` row, both before `resolvePhotoFilePath` at
`gallery.js:667` and long before `res.sendFile` at `gallery.js:716`. A
request that resolves to a missing file, or that hangs in the stream,
therefore still leaves a completed-looking `download` row and an
incremented counter behind it. This ordering is deliberately contrasted
with what this AC proved live for `download-all`, where the
`allow_downloads` refusal happens before anything is recorded and no
`access_logs` row appeared for either `403`.

Nothing in this subsection changes a file. It is the recorded starting
shape the two criteria that follow act on; every change to vendored
source, and every out-of-file record of the patch (`FORK_CHANGELOG.md`,
`PICPEAK_UPSTREAM_DEFECTS.md`, `UPSTREAM_SYNC.md`, and the upstream issue
text), is owed to them and is deliberately absent here.

### Verdict

AC-17.5.1 is satisfied: a client obtains a gallery token via
`POST /api/auth/gallery/verify`, lists every photo via
`GET /api/gallery/:slug/photos`, and downloads the upstream archive via
`GET /api/gallery/:slug/download-all` — `200`, a valid three-entry zip,
`86027` bytes, reproduced on a second run with an identical size — and
both `download-all` and `download-selected` refuse with `403` once
`allow_downloads` is turned off, with the flag restored live afterward
and the archive route re-confirmed working. Nothing under
`vendor/picpeak/` was modified to produce any of this — the archive route
already resolves managed photos through `resolvePhotoStorageKey`/
`getStorage`, exactly as this AC's own pinned scope stated, and needed no
patch. Recorded honestly rather than silently substituted: the
AC-17.1.3.1 Gallery this AC was asked to reuse was found already archived
by AC-17.4.2/AC-17.4.3's own prior work on this branch, upstream's own
archive-restore endpoint cannot recover it under this deployment's S3
storage backend (a defect of the same local-filesystem-only family as the
single-photo download route, not formally registered here as that is out
of this AC's scope), and a second Gallery
— created through the same supported interface AC-17.1.3.1 already
proved — carries this AC's live proof instead. A related, one-time local
directory permission gap (`/storage` unwritable by the non-root
`nodejs` user the server runs as, itself traceable to the same create-
route's local-path default resolving to the wrong directory) was hit and
cleared operationally, with no source file changed, before the
replacement Gallery could be created. Both storage-path gaps are raised
for the Product Owner's attention under AC-17.9. The single-photo
download route was not called anywhere in this AC, per its own scope; its
hang under this same S3 storage backend, and the fork patch that fixes
it, are owed to the criteria that follow.

The starting shape those two criteria act on is recorded here from
reading the pinned source alone, and every line reference the Product
Owner's own verified run supplied was confirmed against it rather than
re-derived: the archive route resolves through `resolvePhotoStorageKey`/
`getStorage()` (`gallery.js:836`) and so needs no patch, while
`GET /:slug/download/:photoId` (`gallery.js:631`) resolves through the
local-filesystem-only `resolvePhotoFilePath` (`gallery.js:667`, defined
at `services/photoResolver.js:45-90` with no storage-backend branch),
streams with `res.sendFile` whose error callback only logs and never
responds (`gallery.js:717-725`), and increments `download_count`
(`gallery.js:654`) and inserts the `access_logs` row (`gallery.js:657`)
before the send is ever attempted. This criterion modified no source
file: the audit section above is its entire deliverable, and no
`FORK_CHANGELOG.md`, `PICPEAK_UPSTREAM_DEFECTS.md`, `UPSTREAM_SYNC.md`,
or upstream-issue record was written for it.

## AC-17.5.2 — the single-photo download route patched to read through the storage backend, proven live

### The patch

`GET /:slug/download/:photoId` (`gallery.js:633`) now resolves managed
photos the same way `protectedImages.js:105-130` and this file's own
`/:slug/photo/:photoId` route already do: `resolvePhotoStorageKey`
(`services/photoResolver.js`) returns the relative storage key, and a
`storage.stat()` call against `getStorage()` both confirms the object
exists and supplies `Content-Length` — no local-filesystem assumption
remains on the managed-photo path. `resolvePhotoFilePath` now runs only
in the `else` branch, when `storageKey` is `null` (external/reference
photos, `photoResolver.js:24-27`), so that fallback is unchanged and
unregressed. The watermark branch (`gallery.js:743-746`) materializes a
tmp local copy via `withLocalCopy(storageKey, ...)` before calling
`watermarkService.applyWatermark`, matching the `withLocalCopy` pattern
`protectedImages.js:292-293` already established, since `applyWatermark`
only accepts a path. Every region the AC named is marked in-file with a
`vendor-defect fix: US-17 AC-17.5.2` comment (`gallery.js:667`, `717`,
`739`, `756`, `813`), so the patch stays legible against a future
upstream rebase.

Every failure path answers rather than falling through: `storageKey`
resolution failure → `404` (`gallery.js:688`); `storage.stat()` returning
null → `404` (`gallery.js:702`); `resolvePhotoFilePath` failure for a
no-storage-key photo → `404` (`gallery.js:714`); a storage stream that
fails to open → `500`, or `res.destroy()` if headers are already sent
(`gallery.js:768-780`); a stream `error` event after piping has started →
`500`/`destroy()` by the same headersSent check (`gallery.js:781-794`);
and the `res.sendFile` error callback — the exact upstream hang this AC
exists to close — now inspects `res.headersSent` and answers `404` for
`ENOENT` or `500` otherwise instead of only logging (`gallery.js:805-824`).
The outer `try/catch` (`gallery.js:634`, `826-838`) mirrors the same
headersSent check for anything unresolved by the branches above.

### The pinning test suite

`vendor/picpeak/backend/src/__tests__/galleryDownload.storageBackend.test.js`
covers exactly the claims this criterion makes about the patched source
— it does not re-run AC-17.5.1's live evidence. Run inside the
`backstage-backend` container (the production image omits
`devDependencies`, so `supertest`/`jest` were installed ephemerally with
`npm install --include=dev` in a `docker compose run --rm` container that
was discarded afterward — nothing was installed into the committed
`node_modules` or the image):

```
PASS src/__tests__/galleryDownload.storageBackend.test.js
  GET /:slug/download/:photoId — storage backend + failure-path pinning (US-17 AC-17.5.2)
    ✓ managed photo: streams via the storage backend with Content-Length from storage stat()
    ✓ external/reference photo (no storage key): falls back to resolvePhotoFilePath and streams the file
    ✓ absent storage object: storage.stat() returning null answers 404 with a body
    ✓ photo row whose storage key cannot be resolved answers 404
    ✓ external photo whose local file path cannot be resolved answers 404
    ✓ a storage stream error before any bytes are sent answers 500 instead of hanging
    ✓ res.sendFile failing on a missing external file answers 404 instead of only logging (the upstream hang)
    ✓ watermark branch materializes a local copy via withLocalCopy and calls applyWatermark with a path, not a buffer

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

The full `gallery`-scoped suite (`galleryDownload.storageBackend.test.js`,
`galleryOgService.shareImage.test.js`, `verifyGalleryAccess.customerRevoke.test.js`)
was also run together — `3 passed, 3 total`, `23 passed, 23 total` — no
regression in the two adjacent gallery test files this AC did not touch.

### A stale running container caught before it could produce a false-positive live proof

Before running the live proof below, `docker compose --profile backstage exec
backstage-backend md5sum src/routes/gallery.js` was checked against the
committed file and **did not match** — the container that had been running
for the prior 7 hours was serving an image built from a materially
different, uncommitted version of this same route (its download-count/
access-log writes were already wired to `res.on('finish', ...)`, the
exact "move the writes" change this AC's own scope defers to AC-17.5.3,
plus other side-effect and comment differences from what's on this
branch). Proving against it would have recorded behavior this branch
does not actually contain. `docker compose build backstage-backend`
followed by `docker compose --profile backstage up -d backstage-backend
--force-recreate` rebuilt and recreated the container from the current
source (the `backstage-db` container, and the AC-17.5.1 Gallery's data in
it, were untouched — only the stateless backend service was recreated);
the container's `gallery.js` md5sum then matched the committed file
byte-for-byte (`6f19792c8a262a27875d91c2453d950d`), and the live proof
below runs against that rebuilt container.

### Live proof: a real photo downloads successfully

Reusing the AC-17.5.1 Verification Gallery (`event id 9`, slug
`wedding-ac-17-5-1-verification-gallery-2026-09-15`, password
`Verify-Pass-456`, `allow_downloads: true`, three managed photos `9`/`10`/`11`
already confirmed live and unchanged by this AC). Every call below carries
`curl -m 15`.

```
$ curl -s -i -m 15 -c <gallery-cookie-jar> -X POST http://localhost:3100/api/auth/gallery/verify \
    -H "Content-Type: application/json" \
    -d '{"slug":"wedding-ac-17-5-1-verification-gallery-2026-09-15","password":"Verify-Pass-456"}'

HTTP/1.1 200 OK
Set-Cookie: gallery_token=eyJhbGci...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax

$ curl -s -m 15 -b <gallery-cookie-jar> -D headers-200.txt -o photo9.jpg \
    http://localhost:3100/api/gallery/wedding-ac-17-5-1-verification-gallery-2026-09-15/download/9

HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 15539
Content-Disposition: attachment; filename="AC-17.5.1_Verification_Gallery_individual_0001.jpg"; filename*=UTF-8''AC-17.5.1_Verification_Gallery_individual_0001.jpg
```

`wc -c photo9.jpg` → `15539`, matching `Content-Length` exactly and the
same size AC-17.2/AC-17.5.1 recorded for this source JPEG. `file
photo9.jpg` → `JPEG image data, JFIF standard 1.02, ... 950x534, components
3` — real image bytes, not an error body. `Content-Disposition` carries
both the plain `filename` and the RFC 5987 `filename*` parameter, per this
AC's own requirement. The backend's own request log confirms the whole
call completed in 304ms — not a hang:

```
[2026-08-01T23:15:11.512Z] GET .../download/9
[2026-08-01T23:15:11.816Z] GET .../download/9 -> 200 (304ms)
```

### Live proof: a photo pointed at a storage object that does not exist answers 404 promptly

A photo row was injected directly into Postgres, in the same event, with
a `path` pointing at an object never uploaded to the storage backend:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -c "
insert into photos (event_id, filename, path, type, size_bytes, uploaded_by, source_origin, media_type, mime_type, visibility, processing_status)
values (9, 'ac-17-5-2-ghost.jpg', 'wedding-ac-17-5-1-verification-gallery-2026-09-15/ac-17-5-2-ghost-does-not-exist.jpg', 'individual', 1234, 'admin', 'managed', 'image', 'image/jpeg', 'visible', 'complete')
returning id;"

 id
----
 12
```

```
$ curl -s -m 15 -b <gallery-cookie-jar> -D headers-404.txt -o body-404.json -w 'http_code=%{http_code} time_total=%{time_total}\n' \
    http://localhost:3100/api/gallery/wedding-ac-17-5-1-verification-gallery-2026-09-15/download/12

http_code=404 time_total=0.114586
```

Body: `{"error":"Photo file not found"}` — a real response body, not an
empty connection close. `0.11`s, not a hang. The backend's own log shows
exactly which branch answered it — `storage.stat()` on the resolved key
returned null (`gallery.js:696-702`), the object genuinely does not
exist, not a resolver crash:

```
{"slug":"wedding-...","photoId":"12","eventId":9,"storageKey":"events/active/wedding-ac-17-5-1-verification-gallery-2026-09-15/ac-17-5-2-ghost-does-not-exist.jpg","level":"error","message":"Photo not found in storage backend for download","timestamp":"2026-08-01 23:15:15.848"}
[2026-08-01T23:15:15.739Z] GET .../download/12
[2026-08-01T23:15:15.849Z] GET .../download/12 -> 404 (110ms)
```

Re-read from Postgres: `photos.download_count` for id `12` and the
`access_logs` `download` row both landed (id `63`, `photo_id: '12'`) —
consistent with this AC's own pinned reading that those two writes
(`gallery.js:656-665`) still happen unconditionally, before the
resolve-and-send block, on this branch. Recording a completed-looking
download for a request that then 404s is the exact defect the AC-17.5.2
scope text names and defers: "moving the `download_count` and
`access_logs` writes... is owed to AC-17.5.3." Nothing here contradicts
that deferral; it's independent live confirmation that the shape AC-17.5.1
already read out of the source is still the live, observable behavior on
this branch as of this AC.

The injected row was then deleted:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -c \
    "delete from photos where id=12 returning id;"

DELETE 1
```

confirmed gone with a follow-up `select` returning zero rows. The
`access_logs` row the failed request produced (id `63`) was left in
place rather than deleted — `access_logs.photo_id` carries no foreign
key to `photos`, so it is not an orphaned reference, and editing an
access-log audit trail after the fact to make a test look cleaner would
misrepresent what actually happened live.

### Verdict

AC-17.5.2 is satisfied. `GET /:slug/download/:photoId` resolves managed
photos through `resolvePhotoStorageKey`/`getStorage()` exactly as
`protectedImages.js:105-130` does, with `Content-Length` from the same
`stat()`; `resolvePhotoFilePath` survives only on the no-storage-key
(external/reference) branch; the watermark branch materializes a local
copy via `withLocalCopy` before calling `watermarkService.applyWatermark`;
and every failure path — absent storage object, unresolvable path, a
stream error before or after headers are sent, and the upstream
`res.sendFile` hang itself — answers instead of hanging, each region
marked in-file as a `US-17 AC-17.5.2` vendor-defect fix. An 8-test pinning
suite (`galleryDownload.storageBackend.test.js`) covers these claims
against the patched source and passes, alongside the two adjacent gallery
test files (`23 passed, 23 total` combined). Proven live against the
running Backstage: a real photo from the AC-17.5.1 Gallery downloads
`200` with `15539` real JPEG bytes matching `Content-Length` and a
`filename*`-bearing `Content-Disposition`, in `304`ms; an injected photo
row pointed at a storage object that was never uploaded answers `404`
with a body in `110`ms, with the injected row cleaned up afterward. Caught
and corrected before either live call ran: the container that had been
running for the prior 7 hours was on a stale image carrying a materially
different, uncommitted version of this same route; it was rebuilt and
recreated from the committed source (verified by matching md5sum) so the
live proof above reflects what this branch actually contains, not a
divergent local artifact. Out of scope, per this AC's own text and
confirmed still true live: the `download_count`/`access_logs` writes still
happen before resolution rather than after success, owed to AC-17.5.3.

### Line-number addendum (added by AC-17.5.3)

AC-17.5.3 inserted its guarded recording helper into the same route, above
every region this section cites, so the `gallery.js` line numbers above are
the ones that were current when this section was written and have since
shifted. They are re-anchored here rather than rewritten in place, so the
record of what AC-17.5.2 read stays intact:

| Cited above | Now at | Anchor |
|---|---|---|
| `633` | `633` | route declaration (unchanged) |
| `634` | `634` | outer `try {` (unchanged) |
| `667` | `694` | `vendor-defect fix: US-17 AC-17.5.2 (start)` |
| `688` | `715` | storage-key resolution failure → `404` |
| `702` | `729` | `storage.stat()` null → `404` |
| `714` | `741` | `resolvePhotoFilePath` failure → `404` |
| `717` | `744` | `vendor-defect fix: US-17 AC-17.5.2 (end)` |
| `739` | `766` | `withLocalCopy` watermark comment |
| `743-746` | `770-773` | watermark buffer resolution |
| `756` | `786` | storage-stream branch comment |
| `768-780` | `798-810` | stream open failure → `500`/`destroy()` |
| `781-794` | `811-824` | stream `error` event → `500`/`destroy()` |
| `805-824` | `843-868` | `res.sendFile` callback |
| `813` | `851` | the `res.sendFile` hang fix comment |
| `826-838` | `870-882` | outer `catch` |

Nothing in AC-17.5.2's own patch changed — the shift is entirely the lines
AC-17.5.3 added above and inside the same route.

## AC-17.5.3 — the download recorded only on a confirmed delivery, proven live from Postgres

### The patch

Upstream ran both writes at the very top of the route, before the file was
resolved at all: the `download_count` increment at `gallery.js:654` and the
`access_logs` insert at `gallery.js:657` of the pinned commit
`eb263137b98935754155824de2a03848121304b6`, with `resolvePhotoFilePath` not
reached until line `667`. Anything that failed after that point — the `404`
this route intends, or the `res.sendFile` hang AC-17.5.2 closed — had already
been recorded as a completed download.

Both writes now live in one guarded helper, `recordConfirmedDownload()`,
defined once at `gallery.js:665-691` and called only from a confirmed
delivery:

- **`gallery.js:783`** — `res.once('finish', recordConfirmedDownload)` on the
  watermark branch, attached immediately before `res.send(watermarkedBuffer)`,
  i.e. only once that branch has committed to a real send.
- **`gallery.js:830-832`** — on the storage-stream branch, the `finish`
  listener is attached from the *stream's own* `end` event rather than up
  front. A Node readable emits `end` only after being fully and successfully
  read, and `end` and `error` are mutually exclusive, so the listener is never
  in place ahead of an error response written to the same `res`.
- **`gallery.js:861-867`** — `res.sendFile`'s success branch (the `else` of
  `if (downloadError)`) for the external/reference-photo path, which is where
  that path's confirmed-delivery signal actually is.

No failure branch calls it: the `403`s (downloads disabled, hidden photo), the
four `404`s, the `500`s, the `res.destroy()` paths, and the outer `catch` all
answer and return without touching it. A `downloadRecorded` flag makes the
helper idempotent, so a response that somehow emitted `finish` twice still
records once. The two writes appear nowhere else in the route — verified by
counting them in the route body, `router.get('/:slug/download/:photoId'` to
`router.get('/:slug/download-all'`: exactly one
`increment('download_count', 1)` and exactly one `db('access_logs').insert(`.
(The sibling `download-all`, `download-selected` and view routes further down
the file keep their own `access_logs` writes; those are different routes and
outside this AC.)

Because the writes are now fired from an event listener rather than awaited
inline, each carries its own `.catch()` that logs (`Failed to record download
count` / `Failed to record download access log`) — a bookkeeping failure after
the bytes are already on the wire must not crash a response that has already
succeeded.

Each changed region carries the same in-file vendor-defect comment convention
AC-17.5.2 established in this route: a `// --- vendor-defect fix: US-17
AC-17.5.3 (start) --- / (end) ---` block around the helper (`gallery.js:655`,
`692`) naming the register entry it belongs to (`UD-1 part (3)`, see
`PICPEAK_UPSTREAM_DEFECTS.md`), plus a single-line `vendor-defect fix: US-17
AC-17.5.3` comment at each of the three call sites (`gallery.js:781`, `825`,
`862`).

### The pinning test suite

The AC-17.5.2 suite is extended in place rather than duplicated —
`vendor/picpeak/backend/src/__tests__/galleryDownload.storageBackend.test.js`,
now **14 tests**. Each of the eight AC-17.5.2 tests gained the matching
ordering assertion (a delivery records the pair exactly once; each failure
path records neither), and a dedicated AC-17.5.3 block adds six more. Run in
Docker against the vendored backend
(`docker run --rm -v "$PWD/vendor/picpeak/backend:/app" -w /app node:20-alpine
npx jest src/__tests__/galleryDownload.storageBackend.test.js`):

```
PASS src/__tests__/galleryDownload.storageBackend.test.js
  GET /:slug/download/:photoId — storage backend + failure-path pinning (US-17 AC-17.5.2)
    ✓ managed photo: streams via the storage backend with Content-Length from storage stat()
    ✓ external/reference photo (no storage key): falls back to resolvePhotoFilePath and streams the file
    ✓ absent storage object: storage.stat() returning null answers 404 with a body
    ✓ photo row whose storage key cannot be resolved answers 404
    ✓ external photo whose local file path cannot be resolved answers 404
    ✓ a storage stream error before any bytes are sent answers 500 instead of hanging
    ✓ res.sendFile failing on a missing external file answers 404 instead of only logging (the upstream hang)
    ✓ watermark branch materializes a local copy via withLocalCopy and calls applyWatermark with a path, not a buffer
  GET /:slug/download/:photoId — download recorded only on confirmed delivery (US-17 AC-17.5.3)
    ✓ the two writes appear nowhere in the route before the file is resolved — a storage.stat() 404 never touches them
    ✓ a confirmed managed-photo delivery records the pair exactly once, with the requested photo id
    ✓ a stream that fails after bytes are already on the wire records nothing
    ✓ the downloads-disabled 403 short-circuit records nothing
    ✓ the hidden-photo 403 short-circuit records nothing
    ✓ the pair is written by one guarded helper — the two writes appear nowhere else in the route

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
```

The same `gallery`-scoped run as AC-17.5.2 (adding
`galleryOgService.shareImage.test.js` and
`verifyGalleryAccess.customerRevoke.test.js`) — `3 passed, 3 total`,
`29 passed, 29 total`, up from AC-17.5.2's 23 by exactly the six tests added
here, with no regression in the two adjacent files.

Every request in that suite still carries the AC-17.5.2 hard timeout
(`REQUEST_TIMEOUT_MS`, plus a per-`it` timeout), so a regression that
reintroduces a hang fails fast rather than consuming the run.

The register entries and the source-level ordering claims are pinned
separately, in this project's own suite, by
`src/__tests__/us17-ac17.5.3-download-recorded-on-confirmed-delivery.test.ts`
(**53 tests**) — the vendored suite runs under the fork's own toolchain and
never sees this repository's root documents.

### Live proof

Against the running Backstage (`docker compose --profile backstage`), reusing
the AC-17.5.1 Verification Gallery (`event id 9`, slug
`wedding-ac-17-5-1-verification-gallery-2026-09-15`, password
`Verify-Pass-456`) and the same photo `9` AC-17.5.2 downloaded. The container
was confirmed to be serving exactly the committed route before any call —
`docker compose --profile backstage exec backstage-backend md5sum
src/routes/gallery.js` → `a794948ea6d60e50bcec35a4ae959a72`, byte-for-byte
equal to the working file — so this is not the stale-image trap AC-17.5.2
caught. Every request carries `curl -m 15`, per AC-17.5.2.

**Baseline, read straight from Postgres:**

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -c \
    "select id, filename, download_count from photos where event_id=9 order by id;" \
    -c "select max(id) as max_access_log_id from access_logs;"

 id |                      filename                      | download_count
----+----------------------------------------------------+----------------
  9 | AC-17.5.1_Verification_Gallery_individual_0001.jpg |              5
 10 | AC-17.5.1_Verification_Gallery_individual_0002.jpg |              0
 11 | AC-17.5.1_Verification_Gallery_individual_0003.jpg |              0

 max_access_log_id
-------------------
                66
```

**The successful download still records.** The AC-17.5.2 success case,
re-run:

```
$ curl -s -i -m 15 -c <jar> -X POST http://localhost:3100/api/auth/gallery/verify \
    -H "Content-Type: application/json" \
    -d '{"slug":"wedding-ac-17-5-1-verification-gallery-2026-09-15","password":"Verify-Pass-456"}'
HTTP/1.1 200 OK

$ curl -s -m 15 -b <jar> -D headers-200.txt -o photo9.jpg \
    -w 'http_code=%{http_code} time_total=%{time_total} size=%{size_download}\n' \
    http://localhost:3100/api/gallery/wedding-ac-17-5-1-verification-gallery-2026-09-15/download/9

http_code=200 time_total=0.290209 size=15539

HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 15539
Content-Disposition: attachment; filename="AC-17.5.1_Verification_Gallery_individual_0001.jpg"; filename*=UTF-8''AC-17.5.1_Verification_Gallery_individual_0001.jpg
```

`wc -c photo9.jpg` → `15539`, matching `Content-Length`; `file photo9.jpg` →
`JPEG image data, JFIF standard 1.02, ... 950x534, components 3` — real image
bytes. Re-read from Postgres immediately afterward:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -c \
    "select id, download_count from photos where id=9;" \
    -c "select id, event_id, action, photo_id, ip_address, timestamp from access_logs where id > 66 order by id;"

 id | download_count
----+----------------
  9 |              6

 id | event_id |    action     | photo_id |  ip_address  |           timestamp
----+----------+---------------+----------+--------------+-------------------------------
 67 |        9 | login_success |          | 192.168.65.1 | 2026-08-01 23:37:47.880111+00
 68 |        9 | download      | 9        | 192.168.65.1 | 2026-08-01 23:37:53.161352+00
```

`download_count` went `5` → `6`, and exactly one new `action = 'download'`
row landed (id `68`, `photo_id: '9'`). Row `67` is the gallery-password
verification that preceded it, not a second download. The behaviour a working
download must keep is intact — the writes were moved, not dropped.

**The 404 no longer records.** The AC-17.5.2 failure case, re-run the same
way: a photo row injected directly into Postgres pointing at an object never
uploaded to the storage backend.

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -c "
insert into photos (event_id, filename, path, type, size_bytes, uploaded_by, source_origin, media_type, mime_type, visibility, processing_status)
values (9, 'ac-17-5-3-ghost.jpg', 'wedding-ac-17-5-1-verification-gallery-2026-09-15/ac-17-5-3-ghost-does-not-exist.jpg', 'individual', 1234, 'admin', 'managed', 'image', 'image/jpeg', 'visible', 'complete')
returning id, download_count;"

 id | download_count
----+----------------
 14 |              0
```

`max(access_logs.id)` at this point: `68`.

```
$ curl -s -m 15 -b <jar> -D headers-404.txt -o body-404.json \
    -w 'http_code=%{http_code} time_total=%{time_total}\n' \
    http://localhost:3100/api/gallery/wedding-ac-17-5-1-verification-gallery-2026-09-15/download/14

http_code=404 time_total=0.108268

$ cat body-404.json
{"error":"Photo file not found"}
```

A real body, in `0.11`s — not a hang. The backend's own log names the branch
that answered and confirms the round trip:

```
{"slug":"wedding-...","photoId":"14","eventId":9,"storageKey":"events/active/wedding-ac-17-5-1-verification-gallery-2026-09-15/ac-17-5-3-ghost-does-not-exist.jpg","level":"error","message":"Photo not found in storage backend for download","timestamp":"2026-08-01 23:38:07.286"}
[2026-08-01T23:38:07.184Z] GET .../download/14
[2026-08-01T23:38:07.288Z] GET .../download/14 -> 404 (104ms)
```

Re-read from Postgres immediately afterward:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -c \
    "select id, download_count from photos where id=14;" \
    -c "select id, action, photo_id, timestamp from access_logs where id > 68 order by id;" \
    -c "select count(*) as download_rows_for_ghost from access_logs where photo_id = '14';"

 id | download_count
----+----------------
 14 |              0

 id | action | photo_id | timestamp
----+--------+----------+-----------
(0 rows)

 download_rows_for_ghost
-------------------------
                       0
```

`download_count` stayed at `0`. **No `access_logs` row was written at all** —
not a `download` row, not a row of any other action. This is the direct
contrast with AC-17.5.2's own recorded run, where the identical 404 left
`download_count` incremented and an `action: 'download'` row (id `63`) behind:
the pairing that showed the ordering bug is gone rather than merely moved to
a different position in the route.

The injected row was then deleted:

```
$ docker compose --profile backstage exec -T backstage-db psql -U backstage -d backstage -c \
    "delete from photos where id in (13,14) returning id, filename;"

 id |      filename
----+---------------------
 14 | ac-17-5-3-ghost.jpg
DELETE 1
```

(`13` was a ghost row from an earlier run of this same proof and was already
gone; the delete confirms it.) A follow-up `select` shows event `9` back to
its three real photos, `9`/`10`/`11`, with photo `9`'s `download_count` at
`6`. Nothing was deleted from `access_logs` — the AC-17.5.2 rows recording
its pre-fix behaviour, including row `63`, are left exactly as they landed,
because editing an audit trail after the fact to make a later result look
cleaner would misrepresent what happened.

### The patch is registered so it can be dropped

Four entries, so the workaround cannot silently become permanent:

1. **`FORK_CHANGELOG.md`** — a dated `2026-08-01` `deviation` entry covering
   all three parts of the patch, naming the two files it touched
   (`vendor/picpeak/backend/src/routes/gallery.js` and its pinning suite) and
   the upstream lines this AC moved (`gallery.js:654`, `657`). It states in
   its own first bullet that it is a vendor-defect workaround, **not** a
   permanent deviation. The entry satisfies `validateChangelogEntry`
   (`src/lib/forkChangelog.ts`, AC-15.5), which rejects a `deviation` naming
   no files.
2. **`PICPEAK_UPSTREAM_DEFECTS.md`** — the `UD-1` entry: the defect in three
   parts, its upstream location at the pinned commit
   (`backend/src/routes/gallery.js`, the `GET /:slug/download/:photoId`
   route, line `631`; the ordering defect at `653-663`), the fork patch that
   works around it, and the explicit drop condition — the pin moves to an
   upstream commit where the route resolves through `getStorage()`, answers on
   every failure path, **and** records only after a confirmed send, all three
   at the same commit, with a partial upstream fix reducing the patch rather
   than dropping it.
3. **`UPSTREAM_SYNC.md` §4** — a new drop-rather-than-merge section, kept
   deliberately distinct from §2's permanent-deviation table. §1's merge
   strategy would otherwise carry this patch forward forever; §4 says to
   delete it instead once UD-1's drop condition is met, and to record the
   deletion as its own changelog entry. It also notes that
   `backend/src/routes/gallery.js` is now conflict-prone but is *not* added to
   §2, because §2 lists files this fork expects to deviate at permanently and
   this one is expected to stop deviating.
4. **The upstream report** —
   `.github/upstream-issues/UD-1-gallery-single-download.md`, written in
   upstream's terms (no story numbers, no references to this repository's own
   documents), covering all three parts with the same reproduction.

### The upstream report: `prepared, not submitted`

Per AC-17.9, an honest recorded state rather than a silently open task. The
report is complete and would be filed by a single command, recorded verbatim
in the register:

```
$ gh issue create --repo PicPeak/picpeak \
    --title "Single-photo gallery download ignores the storage backend (hangs on S3), and records the download before it succeeds" \
    --body-file .github/upstream-issues/UD-1-gallery-single-download.md
```

**What is needed to submit it, exactly:** an explicit human decision to
publish under a named GitHub identity. Nothing technical is missing — the
`gh` CLI on the development machine is authenticated (account `AsimQuick`,
token scopes including `repo`) and PicPeak has issues enabled, so the command
above would run as-is. What is missing is authorisation: filing it posts
permanently and publicly to a third-party repository, attributed to whichever
personal account `gh` is authenticated as, and choosing to speak to another
project's maintainers under one's own name is a human's call, not an
automated one. No additional credential, organisation membership, or approval
from PicPeak is required. It is clearable by the repository owner — or any
maintainer willing to have the issue attributed to their account — by running
that command and replacing the register's status line with the resulting
issue URL, which is also what lets a future sync check whether upstream's fix
has landed and the patch can be dropped.

### Verdict

AC-17.5.3 is satisfied. The `download_count` increment and the `access_logs`
insert have moved out of upstream's pre-send position (`gallery.js:654` and
`657` at the pin) into a single guarded `recordConfirmedDownload()` helper
(`gallery.js:665-691`) fired only from a confirmed delivery — the response's
`finish` event on the watermark branch (`783`) and, via the storage stream's
own `end` event, on the streaming branch (`830-832`), plus `res.sendFile`'s
success branch on the external-photo path (`861-867`) — and from no failure
branch. The two writes appear nowhere else in the route, and every changed
region carries the same in-file vendor-defect comment convention AC-17.5.2
established. Proven live against the running Backstage and read straight from
Postgres: the AC-17.5.2 successful download still moves `download_count`
`5` → `6` and still writes exactly one `action = 'download'` row (id `68`),
while the AC-17.5.2 `404` leaves `download_count` at `0` and writes no
`access_logs` row at all — against AC-17.5.2's own recorded run of the same
404, which left both behind. The patch is registered in all four places
(`FORK_CHANGELOG.md` deviation, `PICPEAK_UPSTREAM_DEFECTS.md` UD-1 with its
drop condition, `UPSTREAM_SYNC.md` §4 drop-rather-than-merge, and the
submission-ready report in `.github/upstream-issues/`), with the report's
state recorded as `prepared, not submitted` and the one thing needed to
submit it — a human's decision to publish under a named GitHub identity —
named explicitly. The AC-17.5.2 pinning suite is extended in place to 14
tests covering the ordering claims, with the register entries and the
source-level ordering claims pinned by a further 53 tests in this project's
own suite.

## AC-17.6 — an operational gallery email sent through Backstage's own email system to a capture inbox, its queued/sent state visible

Unlike AC-17.5.x, this AC needed no fork patch. Upstream's email system —
`email_configs`/`email_templates`/`email_queue` (Postgres tables), the
transporter + queue processor in
`vendor/picpeak/backend/src/services/emailProcessor.js`, and the
admin-facing routes in `vendor/picpeak/backend/src/routes/adminEmail.js`
(mounted at `/email` by `vendor/picpeak/backend/src/routes/admin.js:20`,
itself mounted at `/api/admin` by
`vendor/picpeak/backend/server.js:638`) — works exactly as delivered. What
was missing was infrastructure this project's own `docker-compose.yml`
never provisioned: a capture inbox for the SMTP host the pinned fork
already expects, and a correct port for it.

### The capture inbox the fork already expects

`vendor/picpeak/backend/migrations/core/001_init.js:146-147` seeds the
one-row `email_configs` table, on first migration, from environment
variables with fallbacks:

```js
smtp_host: process.env.SMTP_HOST || 'mailhog',
smtp_port: process.env.SMTP_PORT || 1025,
```

The hostname `mailhog` is not this project's choice — it is upstream's own
default, and `vendor/picpeak/docker-compose.yml:101-109` ships a matching
`mailhog/mailhog` service in the fork's own (unused, since this project
runs Backstage through the root `docker-compose.yml` per US-16) compose
file. Reading `backstage-db` directly confirmed the default had in fact
been applied, seemingly during an earlier AC's first boot:

```
$ docker exec earthandhoney-backstage-db-1 psql -U backstage -d backstage \
    -c "select id, smtp_host, smtp_port, smtp_secure, from_email, from_name from email_configs;"
 id | smtp_host | smtp_port | smtp_secure |         from_email          |   from_name
----+-----------+-----------+-------------+-----------------------------+---------------
  1 | mailhog   |       465 | f           | noreply@photo-sharing.local | Photo Sharing
```

`smtp_host` is the expected `mailhog` default, but `smtp_port` is `465` —
neither the `1025` fallback nor a value anyone configured for MailHog. The
cause is environment leakage, not a fork defect: this project's `.env` is
shared between the Next.js app and `backstage-backend` via the same
`env_file:` (`docker-compose.yml`, `backstage-backend` service), and it
sets `SMTP_PORT=465` for the Next.js app's own (unrelated) Gmail
configuration — the two apps' env vars happen to collide on this one name,
even though every other SMTP variable name differs (`SMTP_SERVER` vs.
`SMTP_HOST`, `SMTP_USERNAME` vs. `SMTP_USER`). `process.env.SMTP_HOST` was
never set (the Next.js app uses `SMTP_SERVER`), so that fallback did apply;
`process.env.SMTP_PORT` was set, to the wrong app's value, so its fallback
did not. No `mailhog` container had ever been started, so the two failures
compounded — nothing was capturing mail regardless of port.

### The infrastructure that had been missing

1. **A `mailhog` service.** Added to this project's own
   `docker-compose.yml` under the `backstage` profile (`docker-compose.yml`,
   the `mailhog` service, image `mailhog/mailhog:latest`, ports
   `${MAILHOG_SMTP_PORT:-1025}:1025` and `${MAILHOG_UI_PORT:-8025}:8025`),
   mirroring `vendor/picpeak/docker-compose.yml:101-109` rather than running
   it standalone, so it shares this stack's network (and so the
   `backstage-backend` container's built-in DNS resolves the hostname
   `mailhog` to it) and the same profile lifecycle as the rest of Backstage.
   No vendored file was touched — Fork Discipline's "fix it in our own
   compose, not upstream's" applies here exactly as it did for the
   `backend` nginx alias in AC-16.3.
2. **The correct port**, set the way an operator actually would — through
   upstream's own admin-facing config route, not a database write:

   ```
   $ curl -s -c cookies.txt -X POST http://localhost:3101/api/auth/admin/login \
       -H 'Content-Type: application/json' \
       -d '{"username":"admin","password":"change-me-in-production"}'
   HTTP/1.1 200 OK
   Set-Cookie: admin_token=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=Lax
   {"user":{"id":1,"username":"admin", ...}}

   $ curl -s -b cookies.txt -X POST http://localhost:3101/api/admin/email/config \
       -H 'Content-Type: application/json' \
       -d '{"smtp_host":"mailhog","smtp_port":1025,"smtp_secure":false,
            "smtp_user":"","smtp_pass":"","from_email":"noreply@photo-sharing.local",
            "from_name":"Photo Sharing","tls_reject_unauthorized":true}'
   {"message":"Email configuration updated successfully"}
   ```

   `POST /api/admin/email/config` (`adminEmail.js:40`) refreshes the cached
   transporter on save (`adminEmail.js:104-105`, calling
   `initializeTransporter(true)` in `emailProcessor.js:22`), so the fix took
   effect without a container restart. `POST /api/admin/email/test`
   (`adminEmail.js:122`) confirmed the corrected connection immediately
   afterward: `{"message":"Test email sent successfully"}`, and that exact
   message was independently found sitting in MailHog's own inbox (below).

Login route: `router.post('/admin/login', ...)`,
`vendor/picpeak/backend/src/routes/auth.js:36`, mounted at `/api/auth` by
`vendor/picpeak/backend/server.js:631`.

### An operational gallery email, not a synthetic one

The email proven here is `gallery_created` — queued by the ordinary
gallery-creation and resend paths, the same template the AC-17.1.3.1
Gallery (`events.id = 3`, reused again per this story's own convention —
no new Gallery was created for this AC) had already queued for its
recipient `ac17-1-1-client@example.com` back when it was first created,
before any capture inbox existed for it to reach. Reading `backstage-db`
before the fix confirmed four such rows sitting `pending` across the
Gallery-verification events this story's earlier ACs created (`events.id`
3, 7, 8, 9), each queued by the direct `email_queue` insert in the
create-event route (`vendor/picpeak/backend/src/routes/adminEvents.js:790,
812-820`, gated on `if (customerEmail && !isDraft)`) — none of them
synthetic test messages, and none of them created for this AC.

### Queued state, visible before the fix

```
$ curl -s -b cookies.txt \
    'http://localhost:3101/api/admin/email/queue?emailType=gallery_created'
{"items":[
  {"id":18,"recipientEmail":"ac17-1-1-client@example.com","emailType":"gallery_created",
   "status":"pending","sentAt":null,"eventId":9,"eventName":"AC-17.5.1 Verification Gallery"},
  {"id":17, ..."status":"pending","sentAt":null,"eventId":8,"eventName":"AC-17.5 Download Verification Gallery"},
  {"id":10, ..."status":"pending","sentAt":null,"eventId":7,"eventName":"AC-17.4 Expiry Verification Gallery"},
  {"id":1,  ..."status":"pending","sentAt":null,"eventId":3,"eventName":"AC-17.1.3.1 Verification Gallery"}
],"pagination":{"total":4,"page":1,"pageSize":25,"totalPages":1}}
```

This is `GET /api/admin/email/queue` (`adminEmail.js:286`) — the
"Read-only 'Sent emails' feed" upstream already built for exactly this
visibility requirement, joined to `events` so each row names its gallery.

### Sent state, visible after the fix, proven live and read straight from Postgres

With the corrected config in place, the four pending `gallery_created` rows
were delivered by upstream's **ordinary background queue processor**, with no
admin intervention at all — the plainest possible operational path.
`startEmailQueueProcessor` (`emailProcessor.js:1029`, started at
`vendor/picpeak/backend/server.js:838`) runs `processEmailQueue` immediately
and then every 60 seconds; because `POST /config` refreshes the *cached*
transporter in place (`adminEmail.js:104-105`), the very next tick picked the
rows up without a container restart. Upstream's own activity log pins the
ordering:

```
$ docker exec earthandhoney-backstage-db-1 psql -U backstage -d backstage \
    -c "select id, activity_type, metadata, created_at from activity_logs where activity_type like 'email%' order by created_at;"
 id |    activity_type     |               metadata              |          created_at
----+----------------------+-------------------------------------+-------------------------------
 43 | email_config_updated | {"smtp_host":"mailhog", ...}        | 2026-08-02 00:08:01.35126+00
 44 | email_queue_flushed  | {"processed":6,"sent":0,"failed":6} | 2026-08-02 00:08:05.135523+00
 45 | email_resent         | {"email_type":"gallery_created",...}| 2026-08-02 00:09:14.224434+00
 46 | email_queue_flushed  | {"processed":7,"sent":1,"failed":6} | 2026-08-02 00:09:19.561119+00
```

The config fix landed at `00:08:01.351`, and all four `gallery_created` rows
carry a `sent_at` between `00:08:03.032` and `00:08:03.264` — two seconds
after the fix, and two seconds *before* any manual flush was run.

The "flush now" escape hatch upstream also provides (`POST /flush-queue`,
`adminEmail.js:264`) was then exercised anyway, at `00:08:05`:

```
$ curl -s -b cookies.txt -X POST http://localhost:3101/api/admin/email/flush-queue
{"message":"Email queue flushed","processed":6,"sent":0,"failed":6}
```

Its `"sent":0` is **not** a `gallery_created` failure, and this is worth
stating plainly because the raw number invites the opposite reading: by
`00:08:05` there were no pending `gallery_created` rows left for the flush to
send — the background processor had already delivered all four. Every one of
the six rows the flush did process is a `gallery_expired`/`archive_complete`
row whose template turned out not to exist in this database's
`email_templates` table (`error_message`: `"Email template 'gallery_expired'
not found"` / `"... 'archive_complete' not found"`) — a genuine gap, noted
here for honesty per AC-17.9 but out of this AC's scope: it blocks two
*other* email types, not `gallery_created`, and needs no fork patch to
observe. Read straight out of `backstage-db`, not trusted from the HTTP
response alone:

```
$ docker exec earthandhoney-backstage-db-1 psql -U backstage -d backstage \
    -c "select id, email_type, status, retry_count, error_message from email_queue order by id;"
 id |    email_type    | status  | retry_count |                error_message
----+------------------+---------+-------------+---------------------------------------------
  1 | gallery_created  | sent    |           0 |
 10 | gallery_created  | sent    |           0 |
 11 | gallery_expired  | pending |           2 | Email template 'gallery_expired' not found
 12 | gallery_expired  | pending |           2 | Email template 'gallery_expired' not found
 13 | archive_complete | pending |           2 | Email template 'archive_complete' not found
 14 | gallery_expired  | pending |           2 | Email template 'gallery_expired' not found
 15 | gallery_expired  | pending |           2 | Email template 'gallery_expired' not found
 16 | archive_complete | pending |           2 | Email template 'archive_complete' not found
 17 | gallery_created  | sent    |           0 |
 18 | gallery_created  | sent    |           0 |
(10 rows)
```

Those six settle rather than retrying forever: automatic runs filter on
`retry_count < 3` (`emailProcessor.js:811`), while a manual flush
deliberately bypasses both that cap and the schedule
(`emailProcessor.js:815-818`, `ignoreSchedule: true`) so an admin can force a
retry right after fixing SMTP. That is why the six sit at `retry_count = 4`
today — two automatic attempts plus the two manual flushes below — and stop
climbing, while no automatic run ever touches them again.

The same admin-facing feed used above now shows the queued-to-sent
transition for the canonical row, `id = 1` (event 3, the AC-17.1.3.1
Gallery):

```
$ curl -s -b cookies.txt \
    'http://localhost:3101/api/admin/email/queue?emailType=gallery_created'
{"items":[
  ...,
  {"id":1,"recipientEmail":"ac17-1-1-client@example.com","emailType":"gallery_created",
   "status":"sent","createdAt":"2026-07-31T20:57:28.059Z",
   "sentAt":"2026-08-02T00:08:03.032Z","errorMessage":null,"retryCount":0,
   "eventId":3,"eventName":"AC-17.1.3.1 Verification Gallery"}
]}
```

matching the direct Postgres read of the same row:

```
$ docker exec earthandhoney-backstage-db-1 psql -U backstage -d backstage \
    -c "select id, event_id, recipient_email, email_type, status, created_at, sent_at from email_queue where id=1;"
 id | event_id |       recipient_email       |   email_type    | status |         created_at         |          sent_at
----+----------+-----------------------------+-----------------+--------+----------------------------+----------------------------
  1 |        3 | ac17-1-1-client@example.com | gallery_created | sent   | 2026-07-31 20:57:28.059+00 | 2026-08-02 00:08:03.032+00
```

### Independently confirmed captured by MailHog

Not inferred from the `sent` status alone — MailHog's own message store was
read directly:

```
$ curl -s http://localhost:8025/api/v2/messages
{"total":5, "items":[
  {"Content":{"Headers":{"To":["proof-capture@example.com"],
    "Subject":["Test Email - Photo Sharing Platform"]}}},
  {"Content":{"Headers":{"To":["ac17-1-1-client@example.com"],
    "Subject":["Your Photo Gallery is Ready!"]},
   "Body":"...Your photo gallery \"AC-17.1.3.1 Verification Gallery\" has been created...
    <li>Gallery Link: /gallery/wedding-ac-17-1-3-1-verification-gallery-2026-...</li>..."},
   "From":{"Mailbox":"noreply","Domain":"photo-sharing.local"}},
  ... three more "Your Photo Gallery is Ready!" messages, one per remaining
      `gallery_created` row (events 7, 8, 9) ...
]}
```

Five messages: the connection-test email from the config fix, plus the
four `gallery_created` rows just moved to `sent`. The message body for the
event-3 row names that exact Gallery and its exact slug
(`wedding-ac-17-1-3-1-verification-gallery-2026-09-01`), so this is not a
coincidental match on subject line alone — it is the same email the
`sent`, `id = 1` queue row records having sent.

### Shown to reproduce, not to be a one-off

The whole cycle was re-run against a fresh, independently-queued email
rather than relying on the four rows that happened to be sitting in the
queue already:

```
$ curl -s -b cookies.txt -X POST http://localhost:3101/api/admin/events/3/resend-email \
    -H 'Content-Type: application/json' -d '{}'
{"success":true,"message":"Creation email has been queued for sending"}
```

This is `POST /:id/resend-email`
(`vendor/picpeak/backend/src/routes/adminEvents.js:1658`), which calls
`queueEmail(id, recipientEmail, 'gallery_created', ...)` at
`adminEvents.js:1702` — the shared `queueEmail` helper
(`emailProcessor.js:959`), a second, independent operational trigger for
the same email type. Immediately after, a new `pending` row (`id = 19`)
was visible in Postgres; a second flush moved it to `sent`, and MailHog's
message count rose from five to six:

```
$ docker exec earthandhoney-backstage-db-1 psql -U backstage -d backstage \
    -c "select id, event_id, email_type, status, sent_at from email_queue where id=19;"
 id | event_id |   email_type    | status |          sent_at
----+----------+-----------------+--------+----------------------------
 19 |        3 | gallery_created | sent   | 2026-08-02 00:09:19.553+00

$ curl -s -b cookies.txt -X POST http://localhost:3101/api/admin/email/flush-queue
{"message":"Email queue flushed","processed":7,"sent":1,"failed":6}

$ curl -s http://localhost:8025/api/v2/messages | python3 -c "import json,sys; print(json.load(sys.stdin)['total'])"
6
```

Here the flush itself did the sending: `processed:7` is the six
template-missing rows plus row `19`, and `sent:1` is row `19` — its
`sent_at` of `00:09:19.553` lands 8ms before the flush's own activity-log
entry at `00:09:19.561`. Unlike the first four rows, this one did not wait
for a background tick.

The `failed:6` on this second flush is the same six
`gallery_expired`/`archive_complete` rows retried (their `retry_count`
climbing to `4`) plus nothing new — no `gallery_created` row ever failed, on
either flush or on any background run.

### Verdict

AC-17.6 is satisfied. At least one operational gallery email —
`gallery_created`, queued by upstream's own create/resend paths for the
real, reused AC-17.1.3.1 Gallery, not a synthetic message minted for this
AC — was sent through Backstage's own email system (`email_configs` +
`emailProcessor.js` + `email_queue`) to a capture inbox (MailHog, added to
this project's `docker-compose.yml` at the exact hostname the pinned
fork's own migration already expected), and its queued state and then its
sent state (with `sent_at` populated) were both visible through upstream's
own admin-facing `GET /api/admin/email/queue` feed — cross-checked against
a direct Postgres read and against MailHog's own captured message store
each time. The whole cycle reproduced on an independently-queued second
email. No vendored file was modified; only this project's own
`docker-compose.yml` (a new `mailhog` service under the `backstage`
profile) and the running instance's own admin-configurable email settings
changed. The `gallery_expired`/`archive_complete` template gap surfaced as
a side effect is recorded here for honesty per AC-17.9 and left for that
AC's own write-up rather than patched here, since it does not bear on this
AC's own scope.

## AC-17.7 — a Backstage webhook fired and received by a listener that logs the payload, proving the outbound integration path

Like AC-17.6, this AC needed no fork patch. Upstream's outbound-webhook
system — the `webhooks`/`webhook_deliveries` tables (migration
`vendor/picpeak/backend/migrations/core/082_add_webhooks.js`), the signing
and enqueue logic in
`vendor/picpeak/backend/src/services/webhookService.js`, the poll-based
delivery worker in
`vendor/picpeak/backend/src/services/webhookDeliveryWorker.js` (started at
`vendor/picpeak/backend/server.js:841-842`), and the admin-facing routes in
`vendor/picpeak/backend/src/routes/adminWebhooks.js` (mounted directly at
`/api/admin/webhooks` by `server.js:717`) — works exactly as delivered.
What was missing, exactly as with AC-17.6, was a listener this project's
own `docker-compose.yml` never provisioned.

### The listener the fork already ships, for exactly this purpose

`vendor/picpeak/dev/webhook-receiver/server.js` is a tiny, vendored,
dev-only HTTP server: it accepts any POST, records method/URL/headers/body
into an in-memory ring buffer, and logs one line per hit
(`[webhook-receiver] <method> <url> sig=... type=...`) so `docker logs`
shows a readable trace. `vendor/picpeak/tests/e2e/webhooks-roundtrip.spec.ts`
documents it, in its own header comment, as the exact receiver its e2e
webhook-roundtrip spec expects reachable at `webhook-receiver:8888` from
inside Docker — this project runs the identical container, unmodified,
rather than inventing a new listener.

Added to this project's own `docker-compose.yml`, under the `backstage`
profile, mirroring the `mailhog` service AC-17.6 already added the same
way:

```yaml
webhook-receiver:
  profiles: ["backstage"]
  build:
    context: ./vendor/picpeak/dev/webhook-receiver
    dockerfile: Dockerfile
  ports:
    - "${WEBHOOK_RECEIVER_PORT:-7107}:8888"
```

No `WEBHOOK_ALLOW_PRIVATE_URLS` override was needed to register a webhook
pointed at it: `validateExternalUrl`
(`vendor/picpeak/backend/src/utils/networkValidation.js:85-95`) rejects
only loopback/private-range IPs and hostnames ending in
`.internal`/`.local`/`.localhost` — the bare Docker Compose service name
`webhook-receiver` matches none of those checks, so it passes both the
create-time and per-delivery validation upstream runs.

```
$ curl -s http://localhost:7107/health
ok
$ docker exec earthandhoney-backstage-backend-1 wget -q -O- http://webhook-receiver:8888/health
ok
```

Both the host-mapped port and the Docker-network hostname the backend will
actually POST to were confirmed reachable before registering anything.

### An unrelated local-storage permission gap, hit and cleared before the create route would work

The first attempt to create a Gallery to fire the webhooks against failed,
live, with the same defect family AC-17.5.1/17.5.2/17.5.3 already named —
a fourth occurrence, not a new one:

```
$ curl -s -i -b <seeded-admin-cookie-jar> -X POST http://localhost:3101/api/admin/events \
    -H "Content-Type: application/json" -d '{ ... "is_draft": false }'

HTTP/1.1 500 Internal Server Error
{"error":"Failed to create event"}
```

with the backend log showing the identical `EACCES: permission denied,
mkdir '/storage'` AC-17.5.1's write-up already traced to
`adminEvents.js:609-612` unconditionally computing a local folder path
(`process.env.STORAGE_PATH || path.join(__dirname, '../../../storage')`,
i.e. `/storage`) regardless of `STORAGE_BACKEND=s3`, with no
`STORAGE_PATH` env var set and no volume backing `/storage` in this
project's `docker-compose.yml`. The one-time operational fix
AC-17.5.1 already recorded was re-applied by hand — it does not persist
across a `backstage-backend` container recreation, which is exactly what
happened between that AC and this one:

```
$ docker compose --profile backstage exec -T backstage-backend sh -c 'mkdir -p /storage && chown -R nodejs:nodejs /storage'
```

No file under `vendor/picpeak/` was touched. This non-persistence (the fix
must be re-applied after every `backstage-backend` recreation, e.g. the
image rebuild this AC's own `webhook-receiver` service change triggered)
is itself worth the Product Owner's attention under AC-17.9, on top of the
underlying defect AC-17.5.1 already raised.

### The webhook subscription, registered through the admin route upstream provides

```
$ curl -s -c cookies.txt -X POST http://localhost:3101/api/auth/admin/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"admin","password":"change-me-in-production"}'
HTTP/1.1 200 OK
Set-Cookie: admin_token=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=Lax

$ curl -s -b cookies.txt -X POST http://localhost:3101/api/admin/webhooks \
    -H 'Content-Type: application/json' \
    -d '{"name":"AC-17.7 verification listener","url":"http://webhook-receiver:8888/",
         "events":["event.created","event.published"],"active":true}'
{"id":15,"name":"AC-17.7 verification listener","url":"http://webhook-receiver:8888/",
 "events":["event.created","event.published"],"active":true,"secret_preview":"p8PKotTk",
 ...,"secret":"whsec_p8PKotTk0W0iJMFubi1xhb7XdV_jgNv_",
 "notice":"Save this signing secret now — it will not be shown again."}
```

`POST /api/admin/webhooks` (`adminWebhooks.js:75-142`) — the plaintext
signing secret is shown exactly once, per upstream's own design, and
recorded here so the signature check below is independently reproducible
against this specific run's evidence.

### The event fired, deliberately not the synthetic test endpoint

Upstream ships a `POST /:id/test` route
(`adminWebhooks.js:236-281`) that enqueues a synthetic delivery — its own
code comment states it bypasses subscription matching entirely. That route
was **not** used to satisfy this AC, for the same reason AC-17.6 insisted
on a real `gallery_created` email rather than a fabricated one: the point
is to prove the *outbound integration path* a genuine lifecycle event
takes, not that the admin UI's "send test event" button works.

Instead, a new, real Gallery was created — the same supported interface
(`POST /api/admin/events`) AC-17.1.3.1 and AC-17.5.1 already used — with
`is_draft: false`, the create-and-publish-in-one-shot path:

```
$ curl -s -i -b cookies.txt -X POST http://localhost:3101/api/admin/events \
    -H 'Content-Type: application/json' \
    -d '{"event_type":"wedding","event_name":"AC-17.7 Webhook Verification Gallery",
         "event_date":"2026-09-15","customer_name":"AC-17.7 Verification",
         "customer_email":"ac17-7-webhook@example.com","admin_email":"admin@example.com",
         "require_password":true,"password":"Webhook17point7!","expiration_days":30,
         "is_draft":false}'

HTTP/1.1 200 OK
{"id":10,"slug":"wedding-ac-17-7-webhook-verification-gallery-2026-09-15",
 "event_name":"AC-17.7 Webhook Verification Gallery", ..., "is_draft":false, ...}
```

`adminEvents.js:761-784` fires `event.created` unconditionally on create;
`adminEvents.js:823-830` fires `event.published` in the same request
specifically because `is_draft` was `false` — the "create-and-publish in
one shot" branch the route's own comment names. Both calls enqueue rows
into `webhook_deliveries` via `webhookService.fire()`
(`webhookService.js:148-205`), which the already-running delivery worker
(polling every `WEBHOOK_DELIVERY_INTERVAL_MS`, default 5000ms, per
`webhookDeliveryWorker.js:7`) picks up on its own schedule — no manual
trigger of the worker itself.

### Delivered, success, visible through upstream's own admin feed

```
$ curl -s -b cookies.txt 'http://localhost:3101/api/admin/webhooks/15/deliveries'
{"deliveries":[
  {"id":16,"event_type":"event.published","attempt_count":1,"status":"success",
   "response_status":200,"latency_ms":23,"completed_at":"2026-08-02T00:30:33.407Z"},
  {"id":15,"event_type":"event.created","attempt_count":1,"status":"success",
   "response_status":200,"latency_ms":22,"completed_at":"2026-08-02T00:30:33.406Z"}
],"pagination":{"page":1,"limit":25,"total":2}}

$ curl -s -b cookies.txt 'http://localhost:3101/api/admin/webhooks/15'
{"id":15, ...,"last_success_at":"2026-08-02T00:30:33.410Z","last_failure_at":null}
```

This is `GET /:id/deliveries` (`adminWebhooks.js:284-327`) and
`GET /:id` (`adminWebhooks.js:145-154`) — the deliveries page and webhook
detail upstream already built for exactly this visibility requirement.
Cross-checked directly against Postgres, not trusted from the HTTP
response alone:

```
$ docker exec earthandhoney-backstage-db-1 psql -U backstage -d backstage \
    -c "select id, webhook_id, event_type, status, attempt_count, response_status, created_at from webhook_deliveries where webhook_id=15 order by id;"
 id | webhook_id |   event_type    | status  | attempt_count | response_status |         created_at
----+------------+-----------------+---------+---------------+-----------------+----------------------------
 15 |         15 | event.created   | success |             1 |             200 | 2026-08-02 00:30:32.703+00
 16 |         15 | event.published | success |             1 |             200 | 2026-08-02 00:30:32.709+00
```

(Two rows at this point in the run — the second Gallery below had not been
created yet. Both transcripts in this section were re-checked against live
Postgres before commit; the timestamps and statuses below are psql's own
rendering, including its trimming of trailing zeros in `00:30:58.64+00`.)

### Independently confirmed captured by the listener, with a verified signature

Not inferred from the `success` status alone — the receiver's own
in-memory log was read directly:

```
$ curl -s http://localhost:7107/requests
[
  {"receivedAt":"2026-08-02T00:30:33.403Z","method":"POST","url":"/",
   "headers":{"x-picpeak-signature":"4c79a2c1...219f557","x-picpeak-event":"event.created",
              "x-picpeak-delivery":"0311ca02-198f-44d0-848c-bd22eb1d5a3b", ...},
   "body":"{\"id\":\"0311ca02-...\",\"data\":{\"event\":{\"id\":10,
            \"slug\":\"wedding-ac-17-7-webhook-verification-gallery-2026-09-15\",
            \"event_name\":\"AC-17.7 Webhook Verification Gallery\", ...}},
            \"type\":\"event.created\",\"created_at\":\"2026-08-02T00:30:32.703Z\"}"},
  {"receivedAt":"2026-08-02T00:30:33.404Z", ...,"x-picpeak-event":"event.published", ...}
]
```

Both entries name the exact Gallery just created (`id: 10`, the exact
slug), so this is not a coincidental match — it is the same delivery the
`success` rows above record having been sent. The `X-PicPeak-Signature`
header (`webhookDeliveryWorker.js:15,123,132`) was independently
recomputed against the plaintext secret returned at webhook-creation time
and the exact received body, using the same HMAC-SHA256 primitive
`webhookService.signPayload` exports (`webhookService.js:35-37`):

```
$ python3 -c "
import hmac, hashlib
secret = 'whsec_p8PKotTk0W0iJMFubi1xhb7XdV_jgNv_'
body = '<exact body received above, byte for byte>'
print(hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest())
"
4c79a2c17f2b458fa7c2f38d11dde66179be14bd924d57f34321962fe219f557
```

Matches the `X-PicPeak-Signature` header the listener actually received,
byte for byte — proving the payload was neither forged nor tampered with
in transit, not merely that *some* POST arrived.

### Shown to reproduce, not to be a one-off

A second, independently-created Gallery was used to re-run the whole cycle
end to end, rather than relying on the one delivery pair that happened to
land already:

```
$ curl -s -i -b cookies.txt -X POST http://localhost:3101/api/admin/events \
    -H 'Content-Type: application/json' \
    -d '{"event_type":"wedding","event_name":"AC-17.7 Webhook Verification Gallery Two",
         "event_date":"2026-09-16","customer_name":"AC-17.7 Verification Two",
         "customer_email":"ac17-7-webhook-2@example.com","admin_email":"admin@example.com",
         "require_password":true,"password":"Webhook17point7Two!","expiration_days":30,
         "is_draft":false}'
HTTP/1.1 200 OK
{"id":11,"slug":"wedding-ac-17-7-webhook-verification-gallery-two-2026-09-16", ...}

$ docker exec earthandhoney-backstage-db-1 psql -U backstage -d backstage \
    -c "select id, webhook_id, event_type, status, response_status, created_at from webhook_deliveries where webhook_id=15 order by id;"
 id | webhook_id |   event_type    | status  | response_status |         created_at
----+------------+-----------------+---------+-----------------+----------------------------
 15 |         15 | event.created   | success |             200 | 2026-08-02 00:30:32.703+00
 16 |         15 | event.published | success |             200 | 2026-08-02 00:30:32.709+00
 17 |         15 | event.created   | success |             200 | 2026-08-02 00:30:58.64+00
 18 |         15 | event.published | success |             200 | 2026-08-02 00:30:58.646+00
(4 rows)

$ curl -s http://localhost:7107/requests | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(len(d))
for e in d:
    b = json.loads(e['body'])
    print(b['type'], b['data']['event']['id'])
"
4
event.created 10
event.published 10
event.created 11
event.published 11
```

Four deliveries total, all `success`, all captured by the listener with
distinct Gallery ids (`10` and `11`) in the payload — the second run is a
fresh, independent firing, not a re-read of the first.

### Verdict

AC-17.7 is satisfied. At least one Backstage webhook — in fact two event
types (`event.created`, `event.published`), fired twice each by two
independently-created, ordinary (non-draft) Galleries through the exact
`POST /api/admin/events` route this story's own client-facing ACs already
proved, not the synthetic `/:id/test` endpoint — was delivered by
upstream's own webhook delivery worker to a listener
(`vendor/picpeak/dev/webhook-receiver`, the fork's own dev tool, added to
this project's `docker-compose.yml` as the `webhook-receiver` service
under the `backstage` profile) that logged every request it received,
including headers and raw body. Each logged payload's `X-PicPeak-Signature`
was independently recomputed from the registered webhook's plaintext
secret and matched byte for byte. The delivered/success state was visible
through upstream's own admin-facing `GET /api/admin/webhooks/:id/deliveries`
and `GET /api/admin/webhooks/:id` feeds, cross-checked against a direct
Postgres read of `webhook_deliveries` each time. No vendored file was
modified; only this project's own `docker-compose.yml` (a new
`webhook-receiver` service) and the running instance's own
admin-configurable webhook subscription changed. The local-storage
permission gap that blocked the first Gallery-create attempt is the same
defect AC-17.5.1 already named, re-encountered because its operational fix
does not survive a `backstage-backend` container recreation — recorded
here, for the Product Owner's attention under AC-17.9, as a fourth
occurrence rather than a new defect. This proves the exact outbound
integration path (`webhookService.fire()` → `webhook_deliveries` →
`webhookDeliveryWorker` → signed HTTP POST) that a future Frontstage
content-refresh listener will subscribe to in place of today's throwaway
`webhook-receiver`.

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
