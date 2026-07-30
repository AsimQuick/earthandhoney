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
related-ac: 14.1, 14.2, 14.3, 14.4
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
