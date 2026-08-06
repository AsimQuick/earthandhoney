STATUS: CLEAR

# Product Owner — Requests to the Human

_Rewritten 2026-07-30 for the pivot (see `scrum-master/PRD.md`). Sprint-2's requests are superseded
and archived at the bottom of this file for history._

The new PRD states the VPS exists and the Cloudflare R2 credentials already exist. Sprint 3 cannot
complete without them: **US-16 boots the forked Backstage against the real R2 bucket, and US-17
proves the photography flow through it.** Placeholders are fine for a first boot; they are not
enough to close the sprint.

**Update 2026-07-30 — items 1 and 4 are resolved.** I confirmed against the local uncommitted `.env`
that `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT` and the
full `SMTP_*` / `SENDER_EMAIL` / `EMAIL_USE_SSL` set are all present and populated (values not read or
reproduced anywhere). `REDIS_URL` and `DATABASE_URL` are populated too, which the forked Backstage
will need. **Two caveats carried into sprint 3, not new requests:**
- Sprint-1's hardest-won lesson was that config living only in an uncommitted local `.env` hides
  defects until CI. US-16 AC-16.4 requires every one of these variables to be documented in
  `.env.example` with a placeholder and a comment, and the deployed values to live in repository
  secrets whose names match one-to-one.
- The values exist but have not been *audited*. US-19 AC-19.4 must still confirm the R2 credentials
  are least-privilege, check the bucket's lifecycle rules and public/private strategy, and confirm
  browser upload access is correctly restricted. Having a working key is not the same as having a
  safe one.

**Update 2026-07-31.** The local `.env` this pipeline actually runs against had to be regenerated
after the git incident recorded in `retrospective.md` (the machine's prior `.env` was lost, not the
credentials themselves) — R2 and SMTP are confirmed populated again, no re-audit needed beyond the
US-19 item above. Item 5 (Stripe) below is now resolved the same way: values supplied and populated
locally.

---

## Sprint-4 planning — what I will need from you, and when (2026-08-07)

**Nothing here blocks the start of sprint 4.** US-21 through US-23 can begin immediately. I am
listing these now rather than surfacing them mid-sprint so you can see the whole ask at once. Each
item names the story that will formally raise it.

| # | What I need | Why | Blocks | When it bites |
|---|---|---|---|---|
| 13 | **Contract-signing decision, reopened.** Item 7 below still reads "Confirmed 2026-07-30, conditionally" — and the condition has now **failed**. AC-17.10 verified 6 of 7 elements at the pinned commit; the 7th, *an audit page baked into the delivered PDF*, does not hold — the fork ships the audit trail as a separate sibling PDF. Options: (a) accept the sibling PDF as sufficient, (b) patch the fork to merge the audit page in, (c) adopt an external provider, which the pivot currently forbids. **My recommendation: (a) for V1, (b) scheduled as fork work if a lawyer's review of the contract wording says the merged page matters.** | The decision is one of the seven no agent may make alone. A Project Room story that assumes the capability would inherit a known-false premise. | PRD Phase 3 (Project cockpit / Project Room, backlog items 22–26) — deliberately excluded from sprint 4 for exactly this reason | Sprint 5 planning. US-22 AC-22.1 files the formal reopening. |
| 14 | **Sign-off on the design-token specimen.** US-23 AC-23.5 builds an internal `noindex` route showing the full token set — type scale in Fraunces + Inter, palette with computed contrast ratios, spacing, radii, gallery gaps, overlay/vignette presets over a real photograph. | Your own brief (item 9) says the token direction is "direction, not a locked visual spec — real mockups must be confirmed before broad rollout". Every later Frontstage page and the Project Room templates are built from whatever is locked here. | US-24, US-25 and all of PRD Phase 4 build on the tokens; changing them later is a repaint of every surface | Mid-sprint, once US-23 lands. A quick look at one page. |
| 15 | **Cloudflare custom domain and/or Worker, for R2 delivery candidates 3 and 4.** US-29 benchmarks five candidate delivery paths. Candidates 1 and 2 (Backstage token-gated proxy; presigned R2 links) can be measured today — both mechanisms already exist in the pinned fork. Candidates 3 (CDN / custom-domain public delivery) and 4 (edge authorisation Worker) need infrastructure that **does not exist yet**. | The ADR forbids ranking paths by preference; unmeasured candidates get recorded as unmeasured with the blocking prerequisite named, never silently dropped. | Closing the deferred delivery decision *completely*. US-29 AC-29.6 lets it stay open honestly if no measured candidate meets all four targets. | Mid-sprint. If you would rather not stand up Cloudflare infrastructure now, say so and 3/4 are recorded as unmeasured — that is an acceptable outcome, not a failure. |
| 16 | **A human GitHub identity to publish the upstream defect report** for the single-image download hang (F8 / UD-1). The report is drafted and sitting in the repository, unsubmitted. | Until it is filed, the fork patch registered in `FORK_CHANGELOG.md` as droppable "when upstream fixes it" can never actually be dropped — we carry it forever. | Nothing in sprint 4. It is debt, not a blocker. | Any time. US-22 AC-22.4 surfaces the drafted report's path. |
| 17 | **SPF, DKIM and DMARC records for the sending domain.** Carried from item 4; still outstanding. | Production client-facing email runs through the Backstage email queue. Without these, mail lands in spam. | Production email only — no sprint-4 story sends real mail | Before launch (PRD Phase 8). Listed so it does not get lost. |

_Item 10 (real launch content — galleries, homepage copy, package/pricing, Weddings / Engagements /
Details) stays informational and non-blocking. Sprint 4 builds on placeholder imagery throughout._

---

## ACTION REQUIRED — pipeline recovery (2026-07-30)

The pipeline stalled today and I have cleaned up the backlog, but **one item still needs action outside my
authority before development can safely resume — item B.** Details of the incident are in
`scrum-master/retrospective.md`.

| # | What is needed | Why | Who |
|---|---|---|---|
| A | ~~**Commit the pivot and finance documentation.**~~ **RESOLVED 2026-07-30** — committed in `9624a07`, together with the previously untracked `sprint3.json`, `sprint3.md` and `PRD-archive.md`. The pivot documentation can no longer be destroyed by a branch switch. | It had already been destroyed once that day: the orchestrator's branch switching discarded every uncommitted tracked change, reverting `PRD.md` to the retired Gallery-Engine version while `CLAUDE.md` described the new one. | — |
| B | ~~**`project-state.json` must be advanced by the Project Lead.**~~ **RESOLVED 2026-07-30** — the human directed the state advance: `status: active`, `current_sprint: sprint-3`, `current_phase: planning`, `current_task: null`. sprint-2 recorded as closed (US-7/8/9 done, AC-9.3 retired in place; US-10–US-13 retired), sprint-3 stories loaded into the summary. | That file is owned exclusively by the Project Lead and no agent may modify it unprompted. Until it moved to sprint-3, it would keep re-dispatching retired sprint-2 work. `sprint2.json` is now closed and every retired story is marked, so the Dev Team would have refused anything from it — correctly. | Human, at Project Lead's request |

**Nothing blocks resumption.** The backlog is internally consistent: `sprint2.json` is
closed with US-10…US-13 and AC-9.3 retired in place, `sprint3.json` is coherent with the
post-pivot direction and needs no finance-related change, and `project-state.json` now points at
sprint-3 / planning.

---

## Blocking requests

| # | Request | Why | Blocks | Status |
|---|---------|-----|--------|--------|
| 1 | **Cloudflare R2 credentials + bucket details** — account id, access key id, secret access key, bucket name, S3 endpoint, and the public base URL if one is configured | The Backstage must be pointed at the studio's existing bucket. The PRD forbids provisioning a parallel store, so we cannot work around this. | Sprint 3 · US-16 (AC-16.3), US-17 (AC-17.2), US-19 (AC-19.4) | **RESOLVED 2026-07-30** — present and populated in the local `.env`. Must still be mirrored into `.env.example` as placeholders (US-16) and security-audited (US-19). |
| 2 | **VPS access** — host, SSH user, and where the deploy key/secrets should live | Needed for the production-like environment, and to close the sprint-1 carry-over that the deploy pipeline has no real target. Now also needed for the headless ledger container. | Sprint 3 · US-16 · Sprint 4+ deployment | **RESOLVED 2026-07-30** — confirmed by you: earthandhoney deploys to the same shared VPS already used by other gitops-managed projects (`root@140.82.43.36`, per `gitops/config.json`'s global `vps` block), not a newly-provisioned dedicated box. Verified reachable by SSH (read-only check only — no changes made). `/root/` on that host already runs `solanaBilly`, `solanatrilly`, `litadvisor`, `Pulau`, and a CyberPanel/LiteSpeed stack; the global config's port map (5001/5432/5433/6380/8081) is currently claimed by `solanaBilly`. earthandhoney will deploy to its own `/root/earthandhoney/` per the `project_dir: /root/{project}` convention, with its own non-colliding port set to be finalized at the actual deploy story (sprint 4+), since `gitops/config.json`'s `vps.services` block reflects whichever project last deployed rather than a fixed per-project registry. **Flagging for awareness, not re-litigating:** this means Earth & Honey's production environment shares hardware with an actively-trading crypto system — worth revisiting if that ever becomes a real operational concern (noise-neighbor resource contention, blast radius if the box is ever compromised). `VPS_DEPLOYMENT.md` (backlog #39) should record this topology honestly rather than describe a dedicated box that doesn't exist. |
| 3 | **Invoice Ninja: does an instance already exist, and where?** | Formerly PRD open decision #7. | Finance phase (backlog #27) | **RESOLVED 2026-07-30** — we stand up our **own** instance, in this project's `docker-compose.yml`, on this project's VPS. It runs **headless**: client portal disabled, payment gateway disconnected, reached only by API. `INVOICE_NINJA_BASE_URL` is an internal Docker network address; `INVOICE_NINJA_API_TOKEN` and `INVOICE_NINJA_WEBHOOK_SECRET` are generated at stand-up, not supplied by you. |
| 4 | **SMTP credentials** — server, port, username, password, SSL setting, sender address, support address | Operational email now runs through the Backstage email queue instead of Resend, and by default owns client-facing financial mail too. US-17 needs a real or catcher inbox; production needs the real account plus SPF/DKIM/DMARC records. | Sprint 3 · US-17 (AC-17.6) · Email phase | **RESOLVED 2026-07-30** — the full `SMTP_*`, `SENDER_EMAIL`, and `EMAIL_USE_SSL` set is present and populated in the local `.env`. Still outstanding before production email: SPF, DKIM, and DMARC records for the sending domain. |
| 5 | **Stripe credentials, provisioned as a coherent set** (now the single payment path — see the finance note below) — secret key, publishable key, and one identifier per priced item, all from the **same** Stripe mode | You confirmed you will provision the same shape of credentials as the reference project. US-20 only extracts and documents the convention, so this does not block sprint 3 — but a mismatched set is exactly the failure this story exists to prevent. | Finance phase (backlog #29) | **RESOLVED 2026-07-31 — populated in the local `.env`.** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and three price identifiers are set: `STRIPE_PRICEMAINT_ID` and `STRIPE_PRICEEMAIL_ID` are **subscription** prices, `STRIPE_PRICEDEV_ID` is a **one-time** price — same Stripe mode, per the Stripe Port Rule (values not read or reproduced here). **These are real but mock/test-mode Stripe products** — you explicitly want the integration wired and working now, with the real production product catalog to be specified later. US-20 should extract the convention against these three price shapes (two recurring, one one-time) rather than assume every price is one-time; do not treat the current values as final production pricing. |
| 6 | **Which system initiates payment?** | Formerly PRD open decision #5. | Finance phase (backlog #29) | **RESOLVED 2026-07-30** — **the ported direct Stripe flow**, with the ledger gateway left disconnected and the verified webhook reconciling into the ledger. Exactly one payment path, one Pay button, one webhook endpoint (in the fork backend, where invoice status lives). |

## Finance architecture — settled 2026-07-30

You approved **The Ledger Rule** (see `CLAUDE.md` and PRD §25): Invoice Ninja becomes a **headless**
API-only ledger with no client portal and no client-facing surface; every surface is ours; Stripe
alone moves money. That single decision closed items 3 and 6 above, reduced the "decisions no agent
may make alone" list from eight to seven, and added four permanent constraints to `scrum-master.md`
(tax is never product surface; no automatic recurring charges in V1; standard-case payment gating
only; records-versus-experiences as the boundary test).

Also confirmed by you and now recorded: **installments ship in V1 as a manual-pay schedule**, with
automatic recurring card charges deferred to V1.1; and **no bespoke revocation/relocking behaviour**
is to be specified for an already-released gallery.

## Open decisions awaiting your confirmation

| # | Decision | My recommendation | Status |
|---|----------|-------------------|--------|
| 7 | **Contract / e-signature provider for V1** | An independent Tester research assignment (not the PO's own preference) found manual-upload weaker than it looks — it adds booking-moment friction without buying more legal weight than a cheap in-house checkbox flow, and it breaks the project's own payment-gate discipline (an unverified human "mark signed" toggle vs. the verified-webhook standard the rest of the product holds itself to). | **Confirmed 2026-07-30, conditionally.** V1 uses **PicPeak's own native contract-signing capability** (typed name, consent checkbox, drawn signature, signer IP + timestamp, a frozen snapshot of the signed contract, a SHA-256 integrity hash, and an audit page baked into the delivered PDF) — treated the same as gallery logic under "fork, don't rebuild." Hardened with one-time signing links, mandatory email verification, the signed PDF emailed to both parties, immutable/versioned R2 storage, and no editing after signature. No external e-sign vendor (Adobe Sign, DocuSign, Dropbox Sign, SignWell) and **no manual-upload fallback** are carried into V1 — the manual path is dropped entirely, not kept as an edge case. **This is conditional, not final:** new AC-17.10 requires US-17 to verify the capability genuinely exists at the pinned commit before any Project Room story depends on it; if it doesn't, this decision reopens rather than silently substituting a workaround. Recorded in `CLAUDE.md`, PRD §5/§29, and `retrospective.md`. Contract wording should still get a one-time review by an Ontario lawyer — not legal advice. |
| 8 | **Lock design tokens before building any new Frontstage page?** | **Yes** — make it the first story of sprint 4. | **Confirmed 2026-07-30 — Yes.** |
| 9 | **Starting point for those tokens** | Derive them from the US-8 photobuddy-derived shell already in the repo, then deliberately diverge toward Earth & Honey's own identity. | **Confirmed 2026-07-30 — derive from photobuddy, but modernize deliberately, not verbatim.** Recorded creative brief for the sprint-4 design-token story: photobuddy currently reads dated — replace its typefaces with **Fraunces** (display serif, headlines) paired with **Inter** (body/UI sans), both open-source/self-hostable with no licensing cost. Palette: near-black (not pure `#000`) as the primary ink color, a neutral grey scale for secondary/tertiary content and surfaces, no accent color beyond that near-black/grey range. The token set must be small and disciplined — a limited, named scale (not one-off values), built as small, composable components rather than page-specific styling, and designed with both Frontstage (Payload/Next.js) and Backstage/Project Room (PicPeak fork templates) as consumers from day one, consistent with Pillar 3 (deterministic beauty, no page-level CSS editing). This is direction, not a locked visual spec — the sprint-4 story should still produce real mockups for confirmation before broad rollout. |
| 10 | **Real launch content** | Non-blocking. We can proceed on placeholder imagery and copy. When available, please supply real galleries, homepage copy, package/pricing information, and the Weddings / Engagements / Details content so placeholders are replaced before launch. | **informational** |
| 11 | **Disposition of a verified vendor defect: single-image client download is broken against S3/R2 storage** (detail in the section immediately below) | Non-blocking today — it sits ~14 ACs downstream of the task in flight. It does need a decision before AC-17.5 is dispatched, because AC-17.5 as written cannot pass against this stack. Options and my recommendation are in the section below. | **RESOLVED 2026-08-01 — Project Lead decision: patch the vendored fork (route the single-image download through the storage backend the same way `protectedImages.js` already does; fix the swallowed error path to actually respond; move the `download_count`/`access_logs` writes to after a confirmed send) and report the defect to PicPeak upstream so the patch can eventually be dropped. Recorded directly on AC-17.5 in `sprint3.json` so the Dev Team has the disposition when it's dispatched.** |
| 12 | **The dev-team 40-turn cap, not the requirements, is what has been failing US-17** (detail in the section immediately below) | Raise the per-session turn cap for the Dev Team from 40 to ~80 for audit-shaped criteria, or let a capped session commit its partial work so the next one resumes instead of restarting. This is a Project Lead setting and only you can change it. | **RESOLVED 2026-08-01 — Project Lead decision: raised `agent_max_turns.dev-team` from 40 to 80 in `gitops/config.json` (applies platform-wide). The partial-work-resume mechanism remains a good longer-term idea but was not implemented now.** |

## The real cause of the US-17 stall: a 40-turn session cap (recorded 2026-08-01)

AC-17.4.1.1.1.2.2.2 has now failed on six consecutive dev sessions, across both Sonnet and Opus, and
has been split four times and rewritten once in response. Before rewriting it a second time I read the
session logs in `logs/` rather than the criterion, and they contradict what all five of those earlier
change records assumed.

**Every single failure is the same one:** `"subtype": "error_max_turns"`, `"errors": ["Reached maximum
number of turns (40)"]`. Not a token budget — `project-state.json` shows the session that failed at
02:30 had used 19,434 of its 50,000 tokens. Not a timeout, not a model failing to understand the
requirement, not an ambiguous acceptance criterion. **The sessions run out of tool calls.**

This is not confined to one criterion. **Eleven of the last twelve dev sessions in this story ended at
the turn cap**, at a combined cost of **$31.32 for zero committed work product**. The sessions in this
story that did succeed closed at 19, 29, 34, 38 and 40 turns — the cap sits right on top of where the
work actually lands, so any criterion that spends turns on discovery before it can begin writing
overruns it.

Two properties of this story make it worse:
- **`PIVOT_AUDIT.md` is now 171 KB.** Every fresh session pays to read it before it can add a section.
- **Failed sessions leave nothing behind.** The work product of eleven capped sessions was discarded,
  so each attempt restarted from zero. Several earlier ACs in this story only passed because a *later*
  session found an earlier one's uncommitted draft still in the working tree and finished it — that
  is the pipeline's actual success mechanism, and it stopped working here.

**What I have already done, so nothing is blocked on your answer.** I rewrote AC-17.4.1.1.1.2.2.2 a
second time, attacking tool calls rather than word count: I ran the edit-path grep myself and wrote its
fifteen call sites into the criterion as fixed scope, dropped the `server.js` read, the permission/gate
column and the reachability finding (no downstream criterion consumes any of them), and stated
explicitly that a documentation-only criterion owes no pinning test suite — a Dev Team convention that
has been costing 25–105 tests per audit AC and which the Definition of Done does not require on a
criterion that changes no source file. The criterion is now a read-a-given-list-and-fill-a-13-row-table
task. It should fit inside 40 turns. **The splitting has stopped either way — it was never the problem.**

**Why I am still raising it.** The rewrite fixes one criterion by hand. The same shape is still ahead in
**AC-17.4.1.1.1.2.3** (read path), **AC-17.4.1.1.1.3** (schema/migration) and **AC-17.10** (contract
signing, seven elements each needing file/line evidence) — and I cannot pre-run the search for all of
them without becoming the Dev Team. My recommendation, in order of preference:

1. **Raise the Dev Team turn cap to ~80 for this story.** Smallest change, directly addresses the
   measured cause. At current rates a capped session already costs $2–4, so the cap is not saving money
   — it is spending it on abandoned work.
2. **Make a capped session commit its partial work before exiting.** Restores the resume-from-draft
   mechanism that carried the earlier ACs, and is the more durable fix of the two.
3. If neither is acceptable, tell me and I will keep pre-running searches into criteria by hand — but
   that shifts investigation work into requirements, which is not where it belongs, and it will slow
   sprint 3 down.

## Verified defect — single-image gallery download hangs on S3/R2 storage (recorded 2026-08-01)

I verified AC-17.5 ahead of pipeline order, live against the running Backstage stack (backstage-backend
healthy on 3101, frontend on 3100), reusing the AC-17.3 gallery (`events.id = 3`, slug
`wedding-ac-17-1-3-1-verification-gallery-2026-09-01`, published, `allow_downloads = true`, 3 visible
photos). **This is recorded, not patched** — AC-17.9 requires findings like this to be reported
honestly and raised rather than silently worked around. No sprint file, `PIVOT_AUDIT.md` section, or
vendor source has been changed; AC-17.5 remains `not-started` and its own audit write-up stays the Dev
Team's deliverable when the AC is actually dispatched.

**⚠️ OPERATIONAL WARNING — READ BEFORE TOUCHING AC-17.5. The broken endpoint does not return an
error; it HANGS FOREVER.** Any agent, script, or test that calls
`GET /:slug/download/:photoId` **must** use a hard timeout (`curl --max-time 10`, an explicit HTTP
client timeout, a Jest `testTimeout`). Without one it will sit on a socket that is never closed and
burn its entire token/time budget waiting on a response that never arrives. This is the single most
important practical fact in this entry.

**What works:** client VIEW is fine. `POST /api/auth/gallery/verify` returned HTTP 200 with a token,
and `GET /api/gallery/:slug/photos` returned all 3 photos.

**What is broken:** client single-image DOWNLOAD.

**Verified mechanism** (line numbers confirmed by reading the pinned fork):
- Route `GET /:slug/download/:photoId` — `vendor/picpeak/backend/src/routes/gallery.js:631`.
- It resolves the file via `resolvePhotoFilePath` (`gallery.js:667`), which returns a **local
  filesystem path only** (`vendor/picpeak/backend/src/services/photoResolver.js`, `getStoragePath()`
  → `STORAGE_PATH` or a local directory).
- It streams with `res.sendFile(filePath, cb)` (`gallery.js:717`). The error callback
  (`gallery.js:718-725`) **logs the error and never sends any response** — hence the hang instead of
  a 404.
- This stack runs `STORAGE_BACKEND: s3` (set in `docker-compose.yml` under `backstage-backend`, per
  AC-16.3, pointing at Cloudflare R2). Photos live in R2; `/app/storage/events` inside the container
  contains **zero files** (verified with `find`).
- Empirical proof, from `/app/logs/error.log` in the backend container at `2026-08-01 05:05:09.354`:
  `{"slug":"wedding-ac-17-1-3-1-verification-gallery-2026-09-01","photoId":"1","eventId":3,"error":"ENOENT: no such file or directory, stat '/app/storage/events/active/wedding-ac-17-1-3-1-verification-gallery-2026-09-01/AC-17.1.3.1_Verification_Galle_individual_0001.jpg'","level":"error","message":"Error streaming gallery download"}`

**Aggravating factor 1 — the sibling routes are storage-aware; this one is not.** `download-all`
(`gallery.js:836`) and `download-selected` (`gallery.js:969`) both use `resolvePhotoStorageKey`, and
`vendor/picpeak/backend/src/routes/protectedImages.js` (~line 113) branches on the storage key and
calls `storage.get(storageKey)`. `gallery.js` even imports `getStorage` at line 26 — the single-image
path simply never uses it. This reads as an **upstream gap, not a misconfiguration on our side.**

**Aggravating factor 2 — the side effects commit BEFORE the failure.** `photos.download_count` is
incremented at `gallery.js:654` and an `access_logs` row with `action: 'download'` is inserted at
`gallery.js:657`. Both confirmed in Postgres: photo id 1 went 0 → 1, and `access_logs` id 31 landed at
`05:05:09.342` — 12ms *before* the ENOENT. **A download that delivered zero bytes is recorded as a
successful download**, so neither the download counter nor the access log can be trusted as evidence
of delivery.

**Why this matters beyond one AC.** Client gallery delivery and download are core product, not an
edge case: the PRD lifecycle runs Visitor → … → temporary Gallery Delivery → **Download** → Archive,
and this touches CLAUDE.md Pillar 1 (gallery experience) and Pillar 6 (the session as the central
business object linking contract → payment → gallery). **AC-17.5 cannot pass against this stack until
this is resolved.**

**My recommendation — a recommendation, not a decision; the call is yours:**
1. **Patch the vendored fork** so the single-image route uses the storage backend the way
   `protectedImages.js` already does, and make the error path actually respond. This is the smallest
   change that restores core product behaviour — but it has to be weighed against our fork-discipline
   convention ("fork, don't rebuild"; keep the delta from upstream small and legible), and it puts us
   on the hook for maintaining the patch across rebases.
2. **Report and/or pull upstream** — file it with PicPeak and take their fix. Correct long-term
   hygiene and keeps the delta at zero, but the timing is outside our control and sprint 3 cannot
   wait on it.
3. **Rescope AC-17.5** — e.g. verify download via the storage-aware `download-all` /
   `download-selected` paths for now and carry single-image download as an explicit known gap. Keeps
   the sprint honest and moving, but ships a real hole in client delivery.

I lean **1 + 2 together**: patch the fork now, narrowly and clearly commented as a vendor-defect
patch, and report it upstream so the patch can eventually be dropped. If you would rather hold the
fork pristine, then 3 — with the gap recorded, not quietly closed. Either way the operational warning
above applies to whoever implements AC-17.5.

## Things I verified myself so you do not have to answer them

- **The Stripe reference project is Flask/Python.** I read it. Its convention is flat, mode-agnostic
  environment names — a secret key, a publishable key, and one identifier per priced item — with the
  operating mode decided purely by which coherent set is loaded, secrets kept server-side, the
  publishable key passed to the browser through markup, authoritative amounts fetched from Stripe
  rather than trusted from the client, and deployment writing the environment file on the server from
  repository secrets whose names match the variables one-to-one. That convention is now recorded in
  `CLAUDE.md` and is what US-20 must reproduce. No answer needed from you.
- **PicPeak verification** is scoped as a spike in US-15 rather than an open question to you,
  including a hard stop if the licence is not what the PRD assumes.
- **The stalled pipeline** was diagnosed and the backlog repaired without needing your input — the
  only residue is items A and B above.

---

## Archived — sprint-2 requests (superseded 2026-07-30)

1. **Deploy target for `deploy.yml`** — superseded. The new PRD locks deployment to the project's
   dedicated VPS with Docker Compose and a single reverse proxy, no Kubernetes. Rolled into item 2.
2. **Resend account + notification recipient** — superseded. Resend is retired; operational email
   runs through the Backstage email queue, which by default also owns client-facing financial mail.
   See item 4.
3. **WhatsApp business number** — no longer needed. The WhatsApp lead-capture flow is retired.
4. **Packages page** — resolved 2026-07-19, then made moot: Packages, Testimonials, and FAQ are all
   removed from product scope by the pivot.
5. **Real launch content** — carried forward as item 10.
