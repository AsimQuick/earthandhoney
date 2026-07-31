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
