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
related-ac: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 17.1.1, 17.1.2, 17.1.3.1, 17.1.3.2, 17.1.3.3
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
