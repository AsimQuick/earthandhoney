# Sprint 3

**Phase:** planning
**Progress:** 0/7 stories | 0/48 ACs
**Last Updated:** 2026-07-30T21:30:00+00:00

## Sprint Goal
De-risk the pivot before any feature is built on it. Produce an approved pivot map for the existing codebase, create a licence-compliant fork of the PicPeak Backstage pinned to a verified commit, prove that fork really delivers the photography flow (project, client, gallery, upload, protection, expiry, download, email, webhook) on PostgreSQL and the existing R2 bucket inside Docker, and settle the four decisions the next sprint cannot start without: system ownership, the Frontstage-to-Backstage API boundary, the media-reuse model, and the R2 delivery path. Separately, extract the proven Stripe environment and key-pairing convention from the reference project so the payment work later cannot repeat a known past failure. No new public pages are built this sprint.

## Reference Documents
- `scrum-master/PRD.md`
- `CLAUDE.md`
- `scrum-master/scrum-master.md`
- `scrum-master/retrospective.md`
- `scrum-master/po-requests.md`
- `scrum-master/PRD-archive.md (historical only — do not build from it)`
- `/Users/asim/NoIcloud/techno (Stripe reference implementation)`

## Definition of Done
- [ ] Every acceptance criterion is closed with recorded evidence, not assertion — a command output, a screenshot, a measured number, or a named file and line
- [ ] Every claim about the forked upstream is verified against the actual pinned code, never against documentation alone
- [ ] No already-shipped upstream migration has been modified
- [ ] All services run in Docker; nothing installed on the host
- [ ] No secret value is committed anywhere; .env.example stays authoritative for every required variable
- [ ] Every decision record names the option chosen, the options rejected, and the reason
- [ ] Anything needing human input is in po-requests.md, not silently decided
- [ ] Existing CI stays green (lint, types, tests, coverage threshold)
- [ ] retrospective.md updated incrementally during the sprint, not at close
- [ ] No critical or major defect remains open against any story in this sprint
- [ ] Coverage threshold met — the existing CI coverage gate is not lowered to pass
- [ ] Every code file created or changed carries its structured metadata header comment (CLAUDE.md convention)

## User Stories

### US-14: Pivot audit: keep / replace / retire map for the existing codebase
**Status:** draft | **Priority:** critical

#### Acceptance Criteria
- [ ] **AC-14.1:** `PIVOT_AUDIT.md` exists at the repo root and inventories every feature currently implemented in this repository, stating for each one whether it is Kept, Replaced by PicPeak, Repurposed as a Frontstage layer, or Retired — with a one-line reason per entry. Every item delivered in sprint-1 (US-1…US-6) and sprint-2 (US-7…US-9) appears exactly once.
- [ ] **AC-14.2:** The audit explicitly names which existing artifacts are superseded by the PicPeak fork — the Payload Galleries collection, the Payload-owned Sharp derivative pipeline, the Payload-owned R2 upload path, and the in-repo gallery viewer components — and records, for each, whether it is deleted now, left dormant, or kept as a Frontstage renderer that reads from PicPeak. The audit must also list orphaned configuration left behind by retired stories — including the `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL` and `NEXT_PUBLIC_WHATSAPP_NUMBER` entries in `.env.example`, which belong to retired US-12 and US-13 — and state for each whether it is removed or retained, so no orphaned environment variables survive the pivot unexplained.
- [ ] **AC-14.3:** The audit lists every duplicate-feature risk between the current codebase and PicPeak (two upload paths, two media stores, two galleries, two auth systems, two email senders) and names the single authoritative owner for each, consistent with the ownership table in `CLAUDE.md`.
- [ ] **AC-14.4:** A dependency and licence audit is included: every third-party dependency that will be newly introduced or dropped by the pivot is listed with its licence, and any copyleft or commercially restrictive licence is flagged for Product Owner decision.
- [ ] **AC-14.5:** A migration-risk section lists the data that exists today (Payload media records, galleries, users, uploaded R2 objects), states whether each must be migrated, discarded, or left in place, and names the risk of getting it wrong.
- [ ] **AC-14.6:** The audit ends with an explicit keep/replace/retire recommendation and an open-questions list. Anything the audit cannot resolve without human input is added to `scrum-master/po-requests.md` rather than being decided silently.

**Dev Team Status:** not-started

**Tester Status:** not-started

---

### US-15: Verify PicPeak upstream and create the pinned fork with licence compliance
**Status:** draft | **Priority:** critical

#### Acceptance Criteria
- [ ] **AC-15.1:** The PicPeak upstream repository is verified to actually exist and to be obtainable, and its licence is confirmed by reading the licence file in the repository rather than trusting documentation. If the licence is not MIT as the PRD assumes, work stops and the Product Owner is notified through `scrum-master/po-requests.md`.
- [ ] **AC-15.2:** A specific upstream commit is identified that contains all four capabilities the pivot depends on — Projects grouping above galleries, customer accounts, webhooks, and S3-compatible storage — and the evidence for each capability at that commit is recorded. If no single commit provides all four, the gap is documented as a blocking finding.
- [ ] **AC-15.3:** `PICPEAK_UPSTREAM.md` exists and records the upstream URL, the exact pinned commit hash, the branch or tag it came from, the date pinned, and the process for evaluating a future upstream update. It states that production must never track a floating upstream branch.
- [ ] **AC-15.4:** `THIRD_PARTY_NOTICES.md` exists and reproduces the upstream licence text and copyright notice in full, alongside notices for any other code copied into this repository.
- [ ] **AC-15.5:** `FORK_CHANGELOG.md` and `UPSTREAM_SYNC.md` exist. The changelog is initialised with the pinned baseline and is the place every deliberate deviation from upstream gets recorded. The sync document states the merge or rebase policy and names the files most likely to conflict on a future update.
- [ ] **AC-15.6:** The forked code is present in this project in a clearly separated location, and no already-shipped upstream database migration has been modified — verifiable by comparing the fork's migration files against the pinned upstream.

**Dependencies:** US-14

**Dev Team Status:** not-started

**Tester Status:** not-started

---

### US-16: Boot the forked Backstage in a production-like Docker environment on PostgreSQL and existing R2 credentials
**Status:** draft | **Priority:** critical

#### Acceptance Criteria
- [ ] **AC-16.1:** The forked Backstage, its database, and any worker or cache component it requires all run as services defined in `docker-compose.yml`. Nothing is installed on the host machine, and services address each other by Docker network hostname rather than localhost.
- [ ] **AC-16.2:** The Backstage runs on PostgreSQL — not on any development-only database the upstream may default to — and its migrations complete cleanly against an empty database.
- [ ] **AC-16.3:** The Backstage is configured to use the project's existing Cloudflare R2 bucket through its S3-compatible storage settings. No new parallel bucket is created. If the existing R2 credentials cannot be obtained, the story is blocked and recorded in `scrum-master/po-requests.md` rather than worked around with a substitute store.
- [ ] **AC-16.4:** `.env.example` documents every environment variable the Backstage needs, with safe placeholder values and a comment for each explaining what it is and where the real value comes from. No real secret is committed.
- [ ] **AC-16.5:** A documented, repeatable start-up procedure exists that takes a clean checkout to a running Backstage with an administrator able to sign in, and it is exercised end to end at least once with the result recorded.
- [ ] **AC-16.6:** Both database paths are proven: a fresh install on an empty database, and an upgrade install that applies our new migrations on top of an already-migrated upstream database. Both results are recorded.

**Dependencies:** US-15

**Dev Team Status:** not-started

**Tester Status:** not-started

---

### US-17: Prove the forked Backstage delivers the real photography flow before we build on it
**Status:** draft | **Priority:** critical

#### Acceptance Criteria
- [ ] **AC-17.1:** A Project, a Client, and a Gallery can be created in the running Backstage, and the Gallery is correctly associated with the Project and the Client.
- [ ] **AC-17.2:** A batch of real images can be uploaded and processed. Every uploaded original is stored in R2 exactly once, the expected derivative sizes are produced, and stored image records include width, height, aspect ratio, format, file size, and processing state.
- [ ] **AC-17.3:** Gallery protection works as delivered by upstream: a password-protected gallery refuses access without the password, and grants it with the password.
- [ ] **AC-17.4:** The expiry mechanism works: a gallery past its expiry no longer grants client access, and the state change is visible to the photographer.
- [ ] **AC-17.5:** A client can view the gallery through its client-facing route and download images where the gallery's download policy permits, including any archive download the upstream provides.
- [ ] **AC-17.6:** At least one operational gallery email is sent through the Backstage email system to a capture inbox or mail catcher, and its queued/sent state is visible.
- [ ] **AC-17.7:** At least one Backstage webhook fires and is received by a listener that logs the payload, proving the outbound integration path we will later use to refresh Frontstage content.
- [ ] **AC-17.8:** The bundled gallery style templates render unmodified, and a copy of each original template file is preserved so future Earth & Honey variants can be diffed against the untouched baseline. `PICPEAK_PORT_LEDGER.md` records every template copied and where it is used.
- [ ] **AC-17.9:** Findings are recorded honestly: anything that does not work as the PRD assumed is written up in `PIVOT_AUDIT.md` and raised to the Product Owner rather than quietly patched.
- [ ] **AC-17.10:** PicPeak's native contract-signing capability is verified against the actual pinned commit, not assumed from documentation or memory: typed name capture, a consent checkbox, a drawn signature, signer IP address and timestamp, a frozen snapshot of the signed contract contents, a SHA-256 integrity hash, and an audit page baked into the delivered PDF. For each element, the evidence (file/line, or a reproduced signing flow) is recorded in `PIVOT_AUDIT.md`. If any element is missing or works differently than assumed, this is written up honestly and raised in `scrum-master/po-requests.md` as reopening the contract-signing decision — no silent workaround, and no quiet fallback to an external e-sign vendor or manual upload.

**Dependencies:** US-16

**Dev Team Status:** not-started

**Tester Status:** not-started

---

### US-18: Document system ownership and the Frontstage-to-Backstage boundary
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-18.1:** `SYSTEM_OWNERSHIP.md` exists and, for every domain in the ownership table in `CLAUDE.md`, names the single authoritative system, what the other systems may cache for display only, and what they are forbidden to write.
- [ ] **AC-18.2:** `PAYLOAD_PICPEAK_API_CONTRACT.md` exists and specifies the boundary between the Frontstage application and the Backstage: which direction each call travels, what each call is for, how it authenticates, what identifiers cross the boundary, what happens on failure or timeout, and what the Frontstage is allowed to cache and for how long.
- [ ] **AC-18.3:** The contract states that the Frontstage never reads the Backstage database directly and that no cross-database join exists anywhere in application code. Cross-system relationships are expressed as stored external identifiers.
- [ ] **AC-18.4:** The contract covers the three flows the next sprint depends on: a Frontstage page displaying a public gallery by referencing its Backstage gallery identifier, a Frontstage inquiry being converted into a Backstage client and project, and a Backstage change triggering a Frontstage content refresh.
- [ ] **AC-18.5:** The document records which Backstage surfaces are to be disabled because they duplicate our chosen architecture — its public landing-page content management, its native quote/invoice/accounting screens, and any page-building capability — and how each will be disabled or hidden.
- [ ] **AC-18.6:** A user-facing terminology mapping is recorded so internal names and the language the photographer sees never drift apart: the internal event concept is called Gallery, the customer account is called Client, the admin area is Backstage, and the customer portal is the Project Room.

**Dependencies:** US-17

**Dev Team Status:** not-started

**Tester Status:** not-started

---

### US-19: Decide and record the media-reuse model, and audit the existing R2 setup
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-19.1:** `MEDIA_REUSE_ADR.md` states, on evidence from the running fork, how tightly an image is currently bound to a single gallery, and whether one stored original can already be referenced by more than one gallery.
- [ ] **AC-19.2:** The decision record chooses exactly one path forward — keep the upstream binding for V1 with a safe promotion workflow, introduce a reusable media-asset and gallery-item layer through new migrations, or an equivalent low-risk model — and states the reasons, the risks, and what would have to be true to revisit the decision.
- [ ] **AC-19.3:** The chosen model guarantees that no original binary is stored twice, that per-gallery ordering and metadata overrides remain possible, that selected client images can be promoted into a public portfolio gallery deliberately, and that promoting one image can never expose the rest of a private gallery.
- [ ] **AC-19.4:** `R2_STORAGE_AND_DELIVERY_ADR.md` records the audit of the existing R2 setup: which bucket is in use, whether its permissions are least-privilege, whether browser upload access is correctly restricted, what lifecycle rules exist, and which paths are public versus private.
- [ ] **AC-19.5:** `R2_STORAGE_AND_DELIVERY_ADR.md` opens with the delivery-path decision explicitly marked UNDECIDED and lists the candidate paths to be benchmarked in the next sprint — serving through the Backstage, direct time-limited links, public delivery through a content-network domain, an edge authorisation layer, and a hybrid — together with the measurements that will decide it and the performance targets the decision is accountable to (no image-caused layout shift, mobile-first performance near ninety on representative public pages, largest-contentful-paint around two and a half seconds or better on a realistic mobile profile, and public pages never requesting full-resolution originals unnecessarily). No agent may choose a path by preference before that benchmark exists.

**Dependencies:** US-17

**Dev Team Status:** not-started

**Tester Status:** not-started

---

### US-20: Extract the proven Stripe key-pairing and environment convention from the reference project
**Status:** draft | **Priority:** high

#### Acceptance Criteria
- [ ] **AC-20.1:** The Stripe implementation in the reference project at `/Users/asim/NoIcloud/techno` is read directly — its payment routes, its server and client split, its templates, its environment example, and its deployment workflow — and `STRIPE_PORT_REPORT.md` lists every file inspected.
- [ ] **AC-20.2:** The report records the reference project's environment-variable convention exactly as found: flat names with no test or live suffix, a secret key, a publishable key, and one identifier per priced item, with the operating mode determined solely by which coherent set of values is loaded.
- [ ] **AC-20.3:** The report states the key-pairing rule in unambiguous terms — the secret key, the publishable key, and every priced-item identifier must all belong to the same Stripe mode — and explains why a mismatched pair fails, since this is the specific mistake made previously on this project.
- [ ] **AC-20.4:** A start-up validation is specified that refuses to start, or fails loudly with an actionable message, when the loaded Stripe values are not all from the same mode or when any required value is missing. The specification says what is checked, when it runs, and what the operator sees.
- [ ] **AC-20.5:** The report records the reference project's secret-handling shape and confirms it will be mirrored here: local values in an uncommitted environment file, deployed values in repository secrets whose names match the environment variable names exactly, and the deployment step writing the environment file on the server. No secret value appears in the report or in any committed file.
- [ ] **AC-20.6:** The report records which behaviours will be preserved when the payment flow is actually built — server-side payment creation, the route layout, webhook signature verification, repeat-event protection, success and cancel handling, and the rule that the authoritative amount is fetched from Stripe rather than trusted from the browser — and which behaviours are deliberately not carried over, with reasons. It is explicit that the reference project is a different language and framework, so faithful means matching logic and required-field structure, not copying lines.
- [ ] **AC-20.7:** The report states plainly that this payment path exists so the studio can charge its photography clients and is not subscription billing for a future software product, and it records the settled payment architecture rather than reopening it: the ported direct flow initiates payment, the ledger's own payment gateway stays disconnected, and the verified webhook reconciles the payment into the ledger and advances the project milestone. It states that exactly one webhook endpoint exists and that it lives in the fork backend where invoice status lives, that a browser redirect is never proof of payment, and that because the reference project is a different language the port crosses a language boundary and must be recorded in `FORK_CHANGELOG.md` as a deliberate deviation.
- [ ] **AC-20.8:** `.env.example` is updated with the placeholder Stripe variable names in the convention taken from the reference project, each with a comment explaining what it is and which mode it must match.
- [ ] **AC-20.9:** The report records the boundary of what "port faithfully" does and does not cover: the reference project is a one-shot checkout flow containing no saved payment method, no off-session charge, and no retry or dunning logic, so none of that is inherited. It states that V1 ships a payment schedule whose installments are each paid manually against a real ledger invoice, that automatic recurring card charges are deferred to V1.1 and must then be built on that same schedule, and that a subscription product must never be used because it would place an authoritative billing schedule outside the ledger.

**Dev Team Status:** not-started

**Tester Status:** not-started

---

---

## Sprint Review

### Dev Team Sprint Notes
_Pending_

### Tester Sprint Notes
_Pending_

### PO Sprint Review Notes
Sprint-3 scope is unchanged by the 2026-07-30 finance revision — no story here touches finance. US-18's AC-18.1 references the ownership table in CLAUDE.md by reference, so it automatically inherits The Ledger Rule rows and the display-only-cache language; no AC edit was needed. AC-14.2 was extended to catch orphaned configuration left by retired sprint-2 stories.

PIPELINE RECOVERY CLOSED (2026-07-30). Both blockers are resolved: the pivot and finance documentation, sprint3.json and sprint3.md are committed (9624a07), and project-state.json has been advanced by the Project Lead to sprint-3 / planning with status active and no current task. Nothing blocks the start of this sprint.

PLAN REVISION (2026-07-30, final planning pass). US-20 was the only story left carrying pre-revision language and has been corrected: AC-20.7 previously told the Dev Team that the payment-initiation choice was still an open decision, which contradicted the settled architecture in PRD §26.3 — it now records the settled position (ported direct flow initiates, ledger gateway disconnected, exactly one webhook endpoint in the fork backend, a browser redirect is never proof of payment, language-boundary port recorded in FORK_CHANGELOG.md). A new AC-20.9 fixes the matching scope gap: the reference project is a one-shot checkout with no saved-card, off-session, or retry logic, so 'port faithfully' does not silently pull that in — V1 is a manual-pay installment schedule and auto-charge is V1.1 built on the same schedule, never a subscription product. Sprint is now 7 stories / 48 acceptance criteria (AC-17.10 added: verify PicPeak's native contract-signing capability). Definition of done carries the three standing project conventions (no open critical/major defects, coverage threshold not lowered, structured metadata headers on all code files).

STILL OUTSTANDING, not blocking this sprint's start: VPS access (po-requests item 2) is needed before US-16 can be called production-like on the real target; Stripe credentials (item 5) are not needed until the finance phase; and open decisions 7, 8 and 9 (contract provider, design-token lock-down, token starting point) need human confirmation before sprint-4 planning closes.

---
_Auto-generated from `sprint3.json` — do not edit directly._
