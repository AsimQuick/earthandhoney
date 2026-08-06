# Sprint 4

**Phase:** planning
**Progress:** 0/9 stories | 0/51 ACs
**Last Updated:** 2026-08-07T00:00:00+00:00

## Sprint Goal
Make the post-pivot direction real on `main`, then lay the Frontstage foundation on top of the fork proven in sprint 3. First restore the authoritative pivot documentation — PRD, CLAUDE.md, the post-pivot product backlog and the closed sprint-2 tracker are all stranded on an unmerged branch, so every agent since the pivot has been reading the retired Gallery-Engine direction — and route the sprint-3 findings that never reached the Product Owner, including reopening the contract-signing decision whose one condition failed. Then complete PRD Phase 2 (ownership boundaries) and start Phase 4 (Frontstage publishing): lock the design tokens before any new page is built, give the studio a single identity record, render a Backstage gallery on a Frontstage page through the agreed API boundary, refresh it on a verified webhook, disable the duplicate Backstage surfaces, retire the superseded Payload gallery artifacts, and close the deferred R2 delivery-path decision with measurements instead of preference.

## Reference Documents
- `scrum-master/PRD.md (authoritative ONLY after US-21 AC-21.1 restores it — the copy currently on `main` is the retired Gallery-Engine PRD)`
- `CLAUDE.md (same caveat — authoritative only after US-21 AC-21.2)`
- `scrum-master/scrum-master.md`
- `scrum-master/retrospective.md`
- `scrum-master/po-requests.md`
- `scrum-master/sprint3.json (sprint-3 outcome and Tester close-out notes)`
- `PAYLOAD_PICPEAK_API_CONTRACT.md (Flows A, B and C; the call catalog; Backstage surfaces to disable)`
- `SYSTEM_OWNERSHIP.md (corrected by US-21 AC-21.5 before it may be relied on)`
- `PIVOT_AUDIT.md (superseded artifacts, orphaned configuration, findings F1–F9)`
- `R2_STORAGE_AND_DELIVERY_ADR.md (the UNDECIDED delivery decision US-29 closes)`
- `MEDIA_REUSE_ADR.md`
- `PICPEAK_UPSTREAM.md, FORK_CHANGELOG.md, UPSTREAM_SYNC.md, PICPEAK_PORT_LEDGER.md, PICPEAK_UPSTREAM_DEFECTS.md`
- `BACKSTAGE_STARTUP.md`
- `scrum-master/PRD-archive.md (historical only — do not build from it)`

## Definition of Done
- [ ] Every acceptance criterion is closed with recorded evidence, not assertion — a command output, a screenshot, a measured number, or a named file and line
- [ ] Every claim about the forked upstream is verified against the actual pinned code, never against documentation alone
- [ ] No already-shipped upstream migration has been modified; the migration-manifest integrity test stays green
- [ ] All services run in Docker; nothing installed on the host
- [ ] No secret value is committed anywhere; .env.example stays authoritative for every required variable
- [ ] Every decision record names the option chosen, the options rejected, and the reason
- [ ] Anything needing human input is in po-requests.md, not silently decided — and a finding that an AC requires to be routed there is not closed until it has actually been written there
- [ ] Existing CI stays green (lint, types, tests, coverage threshold)
- [ ] retrospective.md is updated incrementally during the sprint, not at close — named owner: Product Owner, checkpoint: append after every second story close-out (retrospective action item 2; unmet in both sprint 1 and sprint 3)
- [ ] No critical or major defect remains open against any story in this sprint
- [ ] Coverage threshold met — the existing CI coverage gate is not lowered to pass, including where US-28 removes tests
- [ ] Every code file created or changed carries its structured metadata header comment (CLAUDE.md convention)
- [ ] Any direction change or finding is applied to the sprint JSON and to every artifact an agent may be handed, not to markdown alone (Reminder 15), and is committed (Reminder 16)
- [ ] Before any acceptance criterion is rewritten after a failure, the session exit reason in logs/ is read first (retrospective action item 3)

## User Stories

### US-21: Restore the authoritative post-pivot documentation onto `main` and correct the ownership record
**Status:** draft | **Priority:** critical

#### Acceptance Criteria
- [ ] **AC-21.1:** `scrum-master/PRD.md` on `main` is the post-pivot PRD, not the retired Gallery-Engine PRD it currently holds. Restore it verbatim from commit `9624a07` (reachable on branch `feature/US-9`, path `scrum-master/PRD.md`, 1855 lines) and restore `scrum-master/PRD-archive.md` from the same commit. This is a restore, not a rewrite — no section is re-authored. Evidence: the restored `PRD.md` contains the headings `# 25. The Ledger: Headless Invoice Ninja`, `# 34. Product Owner Pivot Plan` with Phases 0–8, `# 35. V1 Acceptance Criteria` and `# 36. Explicit V1 Non-Goals`; `PRD-archive.md` exists and is marked historical-only. Record in the commit message that `main`'s pre-existing `PRD.md` (937 lines, dated 2026-07-19, Gallery-Engine direction) is the file being replaced.
- [ ] **AC-21.2:** `CLAUDE.md` on `main` is the post-pivot version (218 lines) restored verbatim from `9624a07`, replacing the retired Gallery-Engine version currently on `main` (61 lines, which still names Better Auth, Resend, Adobe Acrobat Sign, `Sessions` as the central business object, and Testimonials/Packages/FAQ). Evidence: the restored file contains the `PIVOT NOTICE (2026-07-30)` block, `## The Three Surfaces`, the eight Product Pillars beginning `Fork, don't rebuild`, `## The Ledger Rule`, `## Stripe Port Rule`, `## Fork Discipline (PicPeak)`, `## Decisions No Agent May Make Alone`, and `## Retired From the Old Direction (do not build)`.
- [ ] **AC-21.3:** `scrum-master/scrum-master.md` carries the post-pivot **Product Backlog** (numbered items 1–42), the sixteen cross-sprint **Reminders**, and the **Required Product Owner deliverables** table — all restored from `9624a07`'s 486-line version — **merged with, not replacing**, the sprint-3 review section already present in the 179-line working-tree file. Evidence: the resulting file contains both `## Product Backlog (post-pivot)` with items 1–42 and `## Sprint-3 Review Summary`, and its front-matter `current-sprint` reads `sprint-4`.
- [ ] **AC-21.4:** `scrum-master/sprint2.json` on `main` is the closed version from `9624a07`: `phase: complete`, US-7/US-8/US-9 `done` (AC-9.3 retired in place with its `[RETIRED — DO NOT IMPLEMENT]` prefix intact), and US-10…US-13 `retired` with their recorded reasons. `main` currently holds `phase: planning` with US-9 `in-progress` and US-10…US-13 still `draft`, so the orchestrator can still be handed retired WhatsApp / Testimonials / Packages / FAQ work — the exact failure Reminder 15 describes and which stalled the pipeline on 2026-07-30. Nothing is deleted; retirement is marked in place. Additionally, reconcile the stale story-level `dev_status: not-started` on all 7 sprint-3 stories in `sprint3.json` to `done`, since every one of their acceptance criteria already reads `dev_status: done` (retrospective action item 6).
- [ ] **AC-21.5:** `SYSTEM_OWNERSHIP.md`'s ownership table is corrected against the restored `CLAUDE.md`. Four rows are wrong because the document was written in sprint-3 against `main`'s stale pre-pivot `CLAUDE.md`: the **Auth** row names Better Auth (retired — PicPeak authentication owns it), the **Email — outbound sending** row names Resend (retired — the Backstage email queue is the default owner of all client-facing mail), the **CMS** row lists Testimonials/Packages/FAQ (retired from product scope), and the **Payments** row predates The Ledger Rule (Invoice Ninja is headless and holds records only, its portal disabled and its gateway disconnected; Stripe alone moves money; our balances are display-only caches). Each corrected row cites the line of the restored `CLAUDE.md` ownership table it now matches. A dated note at the top of the section states that these are restatements of decisions already approved on 2026-07-30, not new decisions, and names the stale-source root cause.
- [ ] **AC-21.6:** A Jest guard test fails if any restored document silently loses its pivot direction again. It asserts: `scrum-master/PRD.md` contains `Headless Invoice Ninja` and `Product Owner Pivot Plan`; `CLAUDE.md` contains `The Three Surfaces`, `The Ledger Rule` and `Fork, don't rebuild`, and does **not** contain the retired strings `Better Auth`, `Resend`, `Adobe Acrobat Sign` outside a `Retired`/`retired` line; `scrum-master/scrum-master.md` contains `Product Backlog (post-pivot)`; and `SYSTEM_OWNERSHIP.md`'s Auth and Email rows do not name Better Auth or Resend as an authoritative system. This is the enforcement Reminder 16 asks for after the direction change was lost twice — once to a branch switch on 2026-07-30, and again by never reaching `main`.

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Requirements review (testability/verifiability pass), no code executed. All 6 ACs are testable as written: each names the exact file(s), the exact restored/removed content, and an evidence method (grep-able string, line-count, or Jest guard test) that resolves unambiguously to pass/fail. No vague wording, no missing test criteria, no scope ambiguity found. AC-21.4 bundles a sprint2.json restore with an unrelated sprint3.json dev_status reconciliation, but both halves are independently and objectively verifiable, so this is a minor scope-organization note, not a defect worth blocking on. No JSON edits required.

---

### US-22: Route the sprint-3 findings to the Product Owner: reopen the contract-signing decision and register F1–F9
**Status:** draft | **Priority:** critical

#### Acceptance Criteria
- [ ] **AC-22.1:** `scrum-master/po-requests.md` item 7 (contract / e-signature provider for V1) is **reopened**. It currently reads "Confirmed 2026-07-30, conditionally" against a condition that has since failed: AC-17.10 verified 6 of 7 contract-signing elements at the pinned commit, and the 7th — *an audit page baked into the delivered PDF* — does **not** hold; the fork ships the audit trail as a separate sibling PDF, never merged into the signed contract. The reopening entry states which element failed, cites the `PIVOT_AUDIT.md` section and the fork file/line that proves it, changes the item's status to `REOPENED — awaiting decision`, and lists the options (accept the sibling-PDF audit trail as sufficient; patch the fork to merge the audit page; adopt an external provider, which the pivot currently forbids) with the Product Owner's recommendation. Sprint-3's own acceptance criterion AC-17.10 required this routing and it never happened.
- [ ] **AC-22.2:** The nine honest upstream findings **F1–F9** recorded in `PIVOT_AUDIT.md` — where the pinned fork behaves differently than the PRD assumed (including F1 a Gallery does not auto-inherit its Project's Client, F4 no `aspect_ratio` column, F5 roughly one hour of expiry-enforcement lag, F7 the `/storage` permission fix not surviving container recreation, F9 missing `gallery_expired`/`archive_complete` email templates) — are added to `po-requests.md` as PO findings. Each carries its finding id, a one-line statement, the PRD section it contradicts, and a proposed disposition: accept as-is, schedule fork work, or raise upstream. AC-17.9 required this routing; `PIVOT_AUDIT.md` states the findings "are to be added" and the addition never happened, because `po-requests.md` is outside an implementing AC's write scope.
- [ ] **AC-22.3:** The reopened contract-signing status is propagated to every artifact an agent may be handed, so nothing in a later sprint inherits a known-false assumption: the restored `CLAUDE.md` Contracts entry and PRD §29 both carry a dated `REOPENED` marker naming the failed element and pointing at `po-requests.md` item 7, and `SYSTEM_OWNERSHIP.md`'s Contracts row is annotated the same way. F1 and F5 receive the same treatment where the PRD's Project/Gallery and expiry language assumes otherwise. This is Reminder 15 applied to a finding rather than to a sprint file.
- [ ] **AC-22.4:** The prepared-but-unsubmitted upstream defect report for the single-image download hang (F8 / UD-1) is surfaced in `po-requests.md` as an explicit human action item: it names the on-disk path of the drafted report, states that publishing it needs a human GitHub identity, and records the consequence of not filing it — the fork patch registered in `FORK_CHANGELOG.md` as droppable "when upstream fixes it" can never actually be dropped. Retrospective action item 9.
- [ ] **AC-22.5:** The F7 `/storage` permission fix survives container recreation, or is recorded as a known manual step. Either the fix is made reproducible in `docker-compose.yml` / an entrypoint so a `docker compose down -v && up` leaves the Backstage storage path writable with no hand intervention — proven by actually recreating the containers and re-running an upload — or, if that is not achievable without editing shipped upstream code, it is documented as a named manual step in `BACKSTAGE_STARTUP.md` with the symptom it produces when skipped. It has already had to be reapplied by hand once (AC-17.5.1 → AC-17.7). Retrospective action item 7.

**Dependencies:** US-21

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Requirements review pass. All 5 ACs are documentation-only (writes to po-requests.md / CLAUDE.md / PRD / SYSTEM_OWNERSHIP.md / BACKSTAGE_STARTUP.md) with content requirements specific enough to grep for (exact status strings, finding-id format, named fields per entry) — no pinning test suite needed, consistent with the sprint's own documentation-only-AC convention. AC-22.5 has a genuine either/or outcome (reproducible fix vs. documented manual step) but both branches carry their own concrete proof requirement, so it stays objectively verifiable rather than becoming a PO judgment call. No JSON edits required.

---

### US-23: Design-token lock-down: the shared token set every Frontstage and Project Room surface is built from
**Status:** draft | **Priority:** critical

#### Acceptance Criteria
- [ ] **AC-23.1:** A single token source of truth exists (CSS custom properties, surfaced to Tailwind through its theme configuration) covering every category PRD §12.2 names before page creation may expand: one display/serif family and one sans/utility family; at most three approved font combinations; colour palette; type scale; line heights; text measures; spacing scale; gallery gaps; radii; overlay and vignette presets; breakpoints; animation timing. Every value is a named step in a limited scale — no one-off values — and the file carries the CLAUDE.md structured metadata header. A test asserts every one of the twelve categories is present and non-empty.
- [ ] **AC-23.2:** The typefaces are **Fraunces** (display serif, headlines) and **Inter** (body/UI sans), per the creative brief confirmed in `po-requests.md` item 9, self-hosted from the repository with no external font request. A test asserts the built CSS and any layout head contain no request to `fonts.googleapis.com` or `fonts.gstatic.com`, that both families are declared with `font-display: swap`, and that the primary weights are preloaded so no font swap causes layout shift.
- [ ] **AC-23.3:** The palette is near-black ink (deliberately not pure `#000`), a neutral grey scale for secondary/tertiary content and surfaces, and **no accent colour** beyond that range — the confirmed brief. A test computes the WCAG contrast ratio from the token values themselves for every ink-on-surface pair the token set declares as a usable combination, and fails any pair below AA (4.5:1 for body text, 3:1 for large text and non-text indicators).
- [ ] **AC-23.4:** The existing US-8 public shell is rewired onto the tokens: `src/components/layout/PublicShell.tsx`, `VerticalMenu.tsx`, `SiteFooter.tsx`, `MobileMenuTrigger.tsx` and `src/app/(frontend)/layout.tsx` use only token references. A test asserts no raw hex colour, no raw `px` font-size, and no arbitrary Tailwind bracket value remains in those five files. Rendered output is unchanged in structure — this is a re-parameterisation, not a redesign — proven by a DOM/structural snapshot of each of the five files' rendered output taken before and after the rewire, asserted identical (class-list token substitutions aside).
- [ ] **AC-23.5:** An internal `noindex` token-specimen route renders the full set for human confirmation: the type scale at every step with both families, the palette with its computed contrast ratios shown, the spacing scale, radii, gallery gaps, and each overlay/vignette preset over a sample photograph. The route is recorded in `po-requests.md` as awaiting human sign-off, because the confirmed brief is explicit that it is direction, not a locked visual spec, and that real mockups must be confirmed before broad rollout.
- [ ] **AC-23.6:** The tokens are exported in a form the Backstage / Project Room templates can consume, so both surfaces are consumers from day one as the brief requires: a generated, checked-in plain CSS custom-property file with no Tailwind or Next.js dependency, plus a short section in the token file's documentation showing how one `gallery-style-templates-baseline` variant would reference it. Generating the export is verified to be reproducible from the source tokens (regenerate and diff — an empty diff is the evidence). The fork's own templates are **not** rewired in this story.
- [ ] **AC-23.7:** A guard prevents style drift from re-entering after this story closes: a lint rule or test fails when a raw hex colour, a raw `px` font-size, or an arbitrary-value Tailwind class is introduced anywhere under `src/components/` or `src/app/` outside the token source file. PRD §12.2's last requirement is "no style drift between original and newly created pages", and Pillar 3 (deterministic beauty) forbids page-level CSS editing — neither survives on convention alone.

**Dependencies:** US-21

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Requirements review pass, 2 minor defects found and fixed directly in this pass (wording/missing test criteria, not scope): AC-23.4 asserted 'rendered output is unchanged in structure' with no stated verification method (only the raw-value lint check had one) — added an explicit before/after structural-snapshot requirement. All other ACs (23.1, 23.2, 23.3, 23.5, 23.6, 23.7) already state an explicit, objective test or reproduction method and were left unchanged. Confirmed AC-23.1's twelve named categories actually enumerate to twelve (font families counts as one category alongside the separate 'font combinations' category) — no miscount. Confirmed AC-23.2/23.3 correctly cite the creative brief already recorded in po-requests.md item 9.

---

### US-24: Studio identity: one `StudioProfile` owning every studio detail and the photographer's bounded branding controls
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-24.1:** A Payload global `StudioProfile` exists carrying exactly the central studio fields PRD §21.1 names: business name, owner name, description, established year (Earth & Honey Studios, since 2006), address, public phone, public email, service areas, social profiles, default social image, default title pattern, and default meta description. Every field is photographer-editable in the admin UI with no developer assistance. The collection file carries its structured metadata header.
- [ ] **AC-24.2:** The photographer's branding controls are bounded to exactly PRD §12.3's list — logo, accent colour from a validated safe input, one approved font pairing chosen from the token set's approved combinations, and site identity/contact details. A test asserts `StudioProfile` exposes **no** field for arbitrary CSS, layout, margin, padding, or component positioning, since Pillar 3 forbids them and a field that exists will eventually be used.
- [ ] **AC-24.3:** The accent-colour input validates contrast before it can be saved: the submitted value is checked against the token ink and surface values, and a value failing WCAG AA is rejected with a clear admin-facing error naming the measured ratio and the required one. A safe input with no validation is not a safe input.
- [ ] **AC-24.4:** No studio detail remains hard-coded in the repository. The US-8 shell, footer, and route metadata read their studio strings from `StudioProfile`, and a test asserts the previously hard-coded studio strings no longer appear as literals anywhere under `src/` outside test fixtures. PRD §21.1's requirement is a single owner, "no studio detail scattered through code".
- [ ] **AC-24.5:** `StudioProfile` populates real output, not just a settings screen: the public route's `<title>` is produced from the default title pattern, its meta description and Open Graph image come from the global, and a JSON-LD `LocalBusiness`/`ProfessionalService` block is emitted from the same fields. A test asserts the rendered head and the structured-data block change when the global changes. No meta-keywords field is created (PRD §21.2).

**Dependencies:** US-21, US-23

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Requirements review pass. All 5 ACs testable: exact field lists (24.1), explicit negative-space test for forbidden field types (24.2), a concrete contrast-validation rejection path with named error content (24.3), a grep-based literal-string test (24.4), and an explicit head/structured-data change assertion (24.5). No vague wording or missing test criteria found. No JSON edits required.

---

### US-25: Gallery Placement: a Frontstage page renders a Backstage gallery through the agreed API boundary
**Status:** draft | **Priority:** critical

#### Acceptance Criteria
- [ ] **AC-25.1:** A Payload `GalleryPlacement` model exists with exactly the fields PRD §14 specifies: the Backstage gallery identifier (the gallery `slug`, stored as a plain external-identifier field), layout (`slideshow` or `masonry`), optional heading, optional description, optional theme/overlay preset drawn from the US-23 token presets, visibility rules, and order within the page or story. A test asserts the model holds **no** foreign key or relation into `backstage-db` — `PAYLOAD_PICPEAK_API_CONTRACT.md`'s "No cross-database access" rule and Reminder 4 both forbid it.
- [ ] **AC-25.2:** A single server-side Backstage client implements Flow A rows 1–2 of `PAYLOAD_PICPEAK_API_CONTRACT.md`: `GET /api/gallery/:slug/info` for display metadata, then the `POST /api/auth/gallery/verify` handshake followed by `GET /api/gallery/:slug/photos` for the photo list — the handshake is coded even for public galleries, because the contract does not let Frontstage assume `requires_password: false` in advance. Every call carries an explicit timeout. Proven live against the running Backstage stack for a published gallery, reproduced rather than run once.
- [ ] **AC-25.3:** The existing gallery components under `src/components/gallery/` render the Backstage-sourced photo list unchanged in location, through a new `backstageGalleryMapper` that takes the place of `payloadGalleryMapper.ts` as the data source. This is the "Kept as a Frontstage renderer" disposition `PIVOT_AUDIT.md`'s superseded-artifact table already records. A test asserts no second gallery-rendering component set is introduced.
- [ ] **AC-25.4:** Caching obeys the contract exactly: the bounded 60-second safety-net cap, display data only, and never a Backstage database row stored Frontstage-side. A test asserts the cached shape contains only the fields the contract's "What the Frontstage is allowed to cache" section permits — rendered image URLs, thumbnails, gallery title/cover, item counts — and that a Frontstage cache is never treated as authoritative.
- [ ] **AC-25.5:** An internal `noindex` route renders one and the same Backstage gallery through two placements — one `masonry`, one `slideshow` — proving PRD §14's core claim that layout is a placement concern and one gallery can appear in different layouts without the underlying gallery changing. Masonry preserves every received aspect ratio and the photographer's order, never crops or stretches, and reserves aspect-ratio space before load (PRD §15.1); slideshow preloads only current and next (PRD §15.2). A test asserts zero image-caused layout shift on the masonry route; a second test asserts the masonry route's rendered image order and each image's rendered aspect ratio match the photo list returned by `GET /api/gallery/:slug/photos` exactly, with no `object-fit: cover`/crop applied; a third test asserts the slideshow route's network requests show only the current and next image's assets loaded, never the full set.
- [ ] **AC-25.6:** Failure behaviour is defined and proven: an unreachable Backstage, a timeout, or a 404 slug renders the page with a placeholder for that placement and a logged error — never a 500 on a public page, and never a partially rendered gallery presented as complete. Tested by pointing a placement at a slug that does not exist and by simulating a Backstage timeout.

**Dependencies:** US-21, US-23

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Requirements review pass, 1 minor defect found and fixed directly (missing test criteria, not scope): AC-25.5 asserted three behavioral claims (aspect-ratio preservation, order preservation, no crop/stretch, bounded slideshow preloading) but stated an explicit test for only one of them (masonry CLS) — added explicit assertions tying the remaining claims to the photo-list response shape and to network-request inspection. AC-25.1 through 25.4 and 25.6 already carry explicit tests or live-reproduction proof and were left unchanged.

---

### US-26: A Backstage change triggers a Frontstage content refresh through a verified webhook
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-26.1:** A Frontstage receiver route accepts the Backstage webhook and recomputes the `X-PicPeak-Signature` HMAC-SHA256 over the raw body **before** trusting any field in it. An absent, malformed, or mismatched signature is rejected with 401 and revalidates nothing. A test proves a forged body with a stale signature is rejected. `PAYLOAD_PICPEAK_API_CONTRACT.md` Flow C step 3 states this rule and it is the whole security basis of the flow.
- [ ] **AC-26.2:** The receiver extracts the changed gallery's `id`/`slug` from the verified payload, maps it to the `GalleryPlacement` records referencing that slug, and calls the existing on-demand revalidation mechanism in `src/lib/galleryRevalidation.ts` — re-keyed from its current Payload-gallery-title lookup (`getGalleryBearingPaths`) to a Backstage slug lookup. The mechanism's role is unchanged; only the source of truth it maps from has changed with the pivot. The fixed event catalog it handles (`event.published`, `photo.uploaded`, `photo.deleted`) is asserted against contract row 5, and an unrecognised event type is accepted with 2xx and ignored, not treated as an error.
- [ ] **AC-26.3:** The receiver returns 2xx promptly after queuing or performing the revalidation, not after Backstage's own work finishes — contract row 5's requirement. A test asserts the response is returned without waiting on the revalidation's completion.
- [ ] **AC-26.4:** Proven live and reproducibly against the running stack: publish a gallery in Backstage, then upload and delete a photo in one already published, and show the Frontstage placement page reflecting each change. Each proof is shown to reproduce, per the sprint-3 evidence discipline.
- [ ] **AC-26.5:** Duplicate and replayed deliveries are idempotent — the same delivery id processed twice produces one revalidation and no error — and a **dropped** delivery is bounded: with the webhook receiver stopped, a changed gallery page is shown to become correct within the 60-second safety-net cap the contract already commits to, so a lost webhook degrades staleness rather than breaking correctness. Contract row 5's five-attempt-then-`failed` retry policy is recorded as the upstream behaviour being relied on.
- [ ] **AC-26.6:** The webhook shared secret and receiver URL are documented in `.env.example` with placeholder values and a per-variable comment, matching the sprint-3 convention, and repository secret names match the variable names one-to-one. No secret value is committed. `.env.example` stays authoritative (Reminder 6).

**Dependencies:** US-25

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Requirements review pass. All 6 ACs testable: explicit forged-signature test (26.1), a named fixed event catalog with an explicit unknown-event pass condition (26.2), an explicit non-blocking-response test (26.3), a named live-reproduction sequence (26.4), explicit idempotency and bounded-staleness proof (26.5), and a concrete .env.example/secret-naming check (26.6). No vague wording or missing test criteria found. No JSON edits required.

---

### US-27: Disable the duplicate Backstage surfaces so every business function has exactly one owner
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-27.1:** A new `publicSite` feature flag is added to the fork's `KNOWN_FLAGS` and `DEFAULT_FLAGS` (`backend/src/routes/adminFeatureFlags.js`) defaulting to `false`, mirroring the existing `quotes`/`bills` pattern exactly, and `handlePublicSiteRequest` checks it **before** the `app_settings` value is read. Today the raw-HTML homepage editor is held off only by a settings default with no server-side flag behind it, so a single `PUT /api/admin/settings/general` write can turn Backstage into a second publisher of the site's `/` route — the duplicate `AC-18.5` identified. A test proves the route stays redirected to admin login even when `general_public_site_enabled` is set true while the flag is false.
- [ ] **AC-27.2:** The "Public Site" raw HTML/CSS panel in `frontend/src/pages/admin/CMSPage.tsx` is hidden behind the same flag using the fork's existing `RequireFeature` gate, the way the quotes UI already is — so the capability is not merely unreachable at the server, it is not offered. Pillar 3 forbids page-level CSS editing and Payload owns Frontstage publishing; an editor that exists will eventually be used. A test asserts `CMSPage.tsx` does not render the Public Site panel when the `publicSite` flag is false, mirroring the existing test pattern that covers the quotes panel's `RequireFeature` gate.
- [ ] **AC-27.3:** The native quote / invoice / tax-report subsystem is confirmed off by default rather than assumed off: `adminQuotes.js`, `publicQuotes.js` (`quotes` flag), `adminInvoices.js`, `adminTaxReport.js` and `adminBusinessProfile.js` (`bills` flag) each have their default asserted `false`, and at least one flag-gated route per flag is shown returning 403 with the flag off. The Ledger Rule puts these records in headless Invoice Ninja; a second native billing surface is a duplicate ledger, and PRD §35.1 requires there be none.
- [ ] **AC-27.4:** The static "CMS Pages" surface (impressum / privacy / terms, `adminCMS.js` + `publicCMS.js`) stays **enabled**, and a test asserts it is *not* disabled. `AC-18.5` recorded this as a deliberate scoping decision — legal/footer copy is not among the content types Payload owns, so it duplicates nothing. Encoding the decision as a test keeps a future cleanup from silently reversing it.
- [ ] **AC-27.5:** Every change is additive — a new flag key, new checks, a gated panel — and no already-shipped upstream migration or migration file is modified; the `src/lib/picpeakMigrationManifest.ts` SHA-1 integrity test stays green. The deviation is recorded in `FORK_CHANGELOG.md` and `PICPEAK_PORT_LEDGER.md` with the file paths touched, and `UPSTREAM_SYNC.md` names the resulting merge-conflict risk on the next upstream sync.

**Dependencies:** US-21

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Requirements review pass, 1 minor defect found and fixed directly (missing test criteria, not scope): AC-27.2 described the intended gating behavior but, unlike its sibling 27.1/27.3/27.4, stated no explicit test assertion — added one mirroring the existing quotes-panel RequireFeature test pattern it's explicitly modeled on. AC-27.1, 27.3, 27.4 and 27.5 already state explicit tests/proofs and were left unchanged.

---

### US-28: Pivot execution: retire the superseded Frontstage gallery artifacts and the orphaned configuration
**Status:** draft | **Priority:** medium

#### Acceptance Criteria
- [ ] **AC-28.1:** The three artifacts `PIVOT_AUDIT.md`'s superseded-artifact table marks **Left dormant** — explicitly "pending a dedicated pivot-execution story", which this is — are removed: the Payload `Galleries` collection (`src/collections/Galleries.ts`), the Payload-owned Sharp derivative pipeline (the inline `imageSizes`/`resize` configuration in `src/collections/Media.ts`), and the Payload-owned R2 upload path (the `@payloadcms/storage-s3` `s3Storage` wiring in `src/payload.config.ts`). The fourth row — the gallery viewer components under `src/components/gallery/` — is **Kept as a Frontstage renderer** and must not be removed; US-25 rewires it. A test asserts the Payload admin no longer exposes a Galleries collection and that no second R2 writer remains.
- [ ] **AC-28.2:** The lock-in tests that pin the removed behaviour are removed in the same change, never left failing and never skipped: `us3-ac3.1-galleries-collection.test.ts`, `us3-ac3.2`, `us3-ac3.3`, `us3-ac3.4`, `us3-ac3.5`, `us2-ac2.2-sharp-pipeline.test.ts`, `us2-ac2.3-media-variant-urls.test.ts`, and any assertion inside `us2-ac2.5-r2-env-config.test.ts` / `us1-ac1.4-env-config.test.ts` that pins the Payload-side upload path. For each removed test the commit records which accepted AC it belonged to and why that AC's intent no longer applies after the pivot — deleting a previously accepted AC's deliverable is a recorded decision, not a cleanup.
- [ ] **AC-28.3:** The three orphaned environment variables `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL` and `NEXT_PUBLIC_WHATSAPP_NUMBER` — belonging to retired US-12/US-13, with no consuming code anywhere in `src/` — are removed from `.env.example`, and `us7-ac7.4-env-example-sprint2-vars.test.ts` is updated in the same change to assert `NEXT_PUBLIC_SITE_URL` only. They were retained in sprint 3 solely because that test forbade removing them. Retrospective action item 8.
- [ ] **AC-28.4:** Nothing the live stack still needs is removed. The `R2_*` variables stay in `.env.example` — the Backstage backend consumes them through `docker-compose.yml`, and only the *Payload-side* consumer is going away — as does `NEXT_PUBLIC_SITE_URL`, which `PIVOT_AUDIT.md` explicitly records as **not** orphaned. Proven by bringing the full stack up from a clean `cp .env.example .env` after the change and completing one Backstage upload.
- [ ] **AC-28.5:** CI stays green and the coverage gate is **not** lowered to absorb the removals. If deleting tests moves global coverage, the shortfall is closed by covering live code, never by editing the threshold — the sprint-3 Definition of Done item 11 rule. The measured before/after coverage numbers are recorded on the story.

**Dependencies:** US-25

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Requirements review pass. All 5 ACs testable: explicit removal targets with a named admin/writer-absence test (28.1), a fully enumerated list of lock-in test files to remove with a per-removal justification requirement (28.2), a named env-var removal plus the exact test file to update (28.3), a concrete clean-checkout stack-up reproduction (28.4), and a measured before/after coverage requirement with an explicit no-lowering rule (28.5). No vague wording or missing test criteria found. No JSON edits required.

---

### US-29: Benchmark the R2 delivery paths and close the deferred delivery decision with evidence
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-29.1:** A repeatable benchmark harness measures the four measurements `R2_STORAGE_AND_DELIVERY_ADR.md` already committed to, on the two representative pages it names (a portfolio-style gallery page and a story/blog gallery page built on the US-25 placement): mobile-first Lighthouse performance score; image-attributable Cumulative Layout Shift; Largest Contentful Paint under a realistic mid-tier mobile CPU/network throttle; and a network payload audit of what resolution each page actually requests. The harness runs in Docker, produces machine-readable output, and is shown to reproduce — a single run is not a measurement.
- [ ] **AC-29.2:** Candidate paths 1 and 2 are measured for real, because both mechanisms already exist in the pinned fork: serving through the Backstage (the `protectedImages.js` token-gated proxy pattern) and direct time-limited presigned R2 links (`S3StorageBackend.signedUrl`). Candidates 3 (CDN/custom-domain public delivery), 4 (edge authorisation worker) and 5 (hybrid) are each either measured or **explicitly recorded as unmeasured** with the specific blocking prerequisite named — e.g. a Cloudflare custom domain or Worker deployment that does not exist yet — and that prerequisite raised in `po-requests.md`. No candidate is silently dropped; the ADR forbids ranking by preference.
- [ ] **AC-29.3:** The measured numbers are written into `R2_STORAGE_AND_DELIVERY_ADR.md` per candidate path, replacing the `Status: UNDECIDED` block, with the raw harness output retained in the repository so the numbers can be re-derived rather than trusted. The four performance targets the ADR made itself accountable to are restated alongside the measurements, so pass/fail is visible per target per path.
- [ ] **AC-29.4:** The delivery-path decision is recorded and is made **from the measurements**: it names the chosen path, every rejected path, and for each rejection which of the four targets it missed and by how much. This is one of the decisions no agent may make alone (PRD §5, Reminder 1), so the record ends with an explicit Product Owner sign-off line and the decision is raised in `po-requests.md` if sign-off is not already recorded.
- [ ] **AC-29.5:** The chosen path is shown to preserve what PRD §19.3 requires of it — access control, logging, watermarks, and revocation where required. Concretely: a password-protected or unreleased gallery's image must not be fetchable without authorisation under the chosen path, proven by an unauthenticated request that is refused; and download/access logging still records a delivery. A faster path that leaks a private gallery fails this criterion outright.
- [ ] **AC-29.6:** If no candidate meets all four targets, the ADR says exactly that and the decision **stays open** with a named next step and its blocking prerequisite — rather than choosing the least-bad path and recording the targets as met. Sprint 3 recorded this decision as honestly UNDECIDED; closing it dishonestly would be worse than leaving it open a second sprint.

**Dependencies:** US-25

**Dev Team Status:** not-started

**Tester Status:** approved
**Tester Notes:**
  Requirements review pass. All 6 ACs testable: a reproducible, machine-readable, dual-run benchmark harness with four named metrics on two named page types (29.1), an explicit measured-or-recorded-unmeasured-with-named-prerequisite rule covering every candidate with no silent drops (29.2), a concrete write-target and reproducibility requirement for the raw data (29.3), a decision record with a named PO sign-off requirement (29.4), a concrete unauthorized-request-refused proof (29.5), and an explicit honest-non-decision path (29.6). No vague wording or missing test criteria found. Note for dev/PO awareness, not a requirements defect: AC-29.4's PO sign-off is inherently a scope/business decision the AC correctly routes to po-requests.md rather than asking dev to decide, consistent with Reminder 1 — this AC is written exactly as it should be to keep that judgment call out of the Dev Team's hands. No JSON edits required.

---

---

## Sprint Review

### Dev Team Sprint Notes
_Pending_

### Tester Sprint Notes
_Pending_

### PO Sprint Review Notes
WHY US-21 IS FIRST AND CRITICAL. Planning this sprint surfaced a documentation-integrity failure that outranks every feature in the backlog. The pivot recovery commit 9624a07 — which restored the post-pivot PRD (1855 lines), the post-pivot CLAUDE.md (218 lines), the post-pivot product backlog in scrum-master.md (486 lines, items 1–42), and the CLOSED sprint2.json with US-10…US-13 marked retired — lives only on branch feature/US-9 and was never merged to `main`. `main` still holds the retired Gallery-Engine PRD (937 lines), the pre-pivot CLAUDE.md (61 lines, naming Better Auth, Resend, Adobe Acrobat Sign, Sessions, Testimonials/Packages/FAQ), a scrum-master.md with no post-pivot backlog, and a sprint2.json reading `phase: planning` with US-10…US-13 still `draft`. Two consequences are already measurable, not hypothetical. First, SYSTEM_OWNERSHIP.md — a sprint-3 deliverable that passed its quality gate — records Better Auth as the auth owner and Resend as the email owner and lists Testimonials/Packages/FAQ as Payload CMS content, because it was written against `main`'s stale CLAUDE.md; all three were retired by the pivot. Second, the orchestrator can still be handed retired sprint-2 work from `main`'s sprint2.json, which is precisely what stalled the pipeline on 2026-07-30. This is Reminder 15 and Reminder 16 failing together, and no sprint-4 story may be dispatched before US-21 closes.

SCOPE SOURCE. There are NO *_SPEC.md feature-specification documents anywhere in this repository — verified by a repo-wide search excluding node_modules and vendor. Remaining scope therefore comes from the post-pivot PRD's phase plan (§34) and the post-pivot product backlog in scrum-master.md, exactly as it did for sprints 1–3. The product is a long way from feature-complete: backlog items 8–42 remain untouched after this sprint, covering Frontstage publishing, the darkroom, the Project cockpit and Project Room, the headless ledger and Stripe, email/contracts/delivery, and hardening/launch.

SCOPE MAPPING. US-23 through US-29 are backlog items 1–7 — the Sprint-4 candidates the Product Owner already recorded as "PRD Phase 2 completion + Phase 4 start": design-token lock-down (1 → US-23), disable duplicate Backstage surfaces (2 → US-27), studio identity (3 → US-24), gallery placement (4 → US-25), retire superseded Payload artifacts (5 → US-28), webhook-driven Frontstage refresh (6 → US-26), R2 delivery benchmark (7 → US-29). US-21 and US-22 are the sprint-3 carry-overs, and they are ordered first because both are prerequisites for trusting anything else in the repository. PRD Phase 3 (Project cockpit and Project Room, backlog items 22–26) is deliberately NOT in this sprint: it depends on the contract-signing capability whose verification failed, which US-22 reopens — building a Project Room on that assumption now would inherit a known-false premise.

DEPENDENCY SHAPE. US-21 is the single root and blocks everything. US-22, US-23 and US-27 fan out from it and can run in parallel. US-24 and US-25 both need the tokens from US-23. US-26, US-28 and US-29 all depend on US-25, since none of them can be proven without a Frontstage page that actually renders a Backstage gallery. The graph is acyclic. US-29 is the sprint's exit item and the most likely to slip; if it does, it slips whole rather than being closed on partial measurements — AC-29.6 exists specifically to make an honest non-decision an acceptable outcome.

AC SIZING, DELIBERATELY. Sprint 3 lost $31.32 and eleven dev sessions to a per-session turn cap on audit-shaped criteria, and split one criterion four times against a cause splitting could not fix. Criteria here are written to bound tool calls, not word count: every file to be read or changed is named in the criterion text (adminFeatureFlags.js, CMSPage.tsx, galleryRevalidation.ts, payloadGalleryMapper.ts, the exact lock-in test filenames US-28 removes), searches are pre-run into the text rather than left as discovery, and documentation-only criteria owe no pinning test suite. The turn cap has since been raised 40 → 80. If a criterion still fails, read logs/ for the exit reason BEFORE rewriting it — retrospective action item 3.

51 acceptance criteria across 9 stories. Every story is `draft`, every criterion unstarted. GitHub issues are not yet filed; `issue` is null on every story and must be populated when they are, regenerated from this file so the tracker cannot disagree with the plan (the drift sprint 3 found twice). Not in scope and not to be inferred into it: anything financial (PRD Phase 6), the Project cockpit or Project Room (Phase 3), contracts and the email matrix (Phase 7), deployment and hardening (Phase 8), the alt-text model benchmark, the form builder, the SEO assistant, and every item on the standing non-goals list — in particular any tax surface, any client-facing ledger surface, automatic recurring card charges, and WhatsApp lead capture.

---
_Auto-generated from `sprint4.json` — do not edit directly._
