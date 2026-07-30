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

---

## ACTION REQUIRED — pipeline recovery (2026-07-30)

The pipeline stalled today and I have cleaned up the backlog, but **two items need action outside my
authority before development can safely resume.** Details of the incident are in
`scrum-master/retrospective.md`.

| # | What is needed | Why | Who |
|---|---|---|---|
| A | **Commit the pivot and finance documentation.** `PRD.md`, `scrum-master.md`, `po-requests.md`, `retrospective.md`, `CLAUDE.md`, plus the untracked `sprint3.json`, `sprint3.md` and `PRD-archive.md`. | This documentation was **already destroyed once today** — the orchestrator's branch switching discarded every uncommitted tracked change, reverting `PRD.md` to the retired Gallery-Engine version while `CLAUDE.md` described the new one. I restored it, but it is one `git checkout` from being lost again. I have not committed it myself because you have not asked me to. | You (or tell me to commit) |
| B | **`project-state.json` must be advanced by the Project Lead.** It currently reads `current_sprint: sprint-2`, `current_phase: development`, `current_task: US-9 / AC-9.3`, `status: error`. | That file is owned exclusively by the Project Lead and no agent may modify it. Until it moves to sprint-3, it will keep re-dispatching retired sprint-2 work. `sprint2.json` is now closed and every retired story is marked, so the Dev Team will refuse anything from it — correctly. | Project Lead |

**Nothing else blocks resumption.** The backlog is now internally consistent: `sprint2.json` is
closed with US-10…US-13 and AC-9.3 retired in place, and `sprint3.json` is coherent with the
post-pivot direction and needs no finance-related change.

---

## Blocking requests

| # | Request | Why | Blocks | Status |
|---|---------|-----|--------|--------|
| 1 | **Cloudflare R2 credentials + bucket details** — account id, access key id, secret access key, bucket name, S3 endpoint, and the public base URL if one is configured | The Backstage must be pointed at the studio's existing bucket. The PRD forbids provisioning a parallel store, so we cannot work around this. | Sprint 3 · US-16 (AC-16.3), US-17 (AC-17.2), US-19 (AC-19.4) | **RESOLVED 2026-07-30** — present and populated in the local `.env`. Must still be mirrored into `.env.example` as placeholders (US-16) and security-audited (US-19). |
| 2 | **VPS access** — host, SSH user, and where the deploy key/secrets should live | Needed for the production-like environment, and to close the sprint-1 carry-over that the deploy pipeline has no real target. Now also needed for the headless ledger container. | Sprint 3 · US-16 · Sprint 4+ deployment | **pending** |
| 3 | **Invoice Ninja: does an instance already exist, and where?** | Formerly PRD open decision #7. | Finance phase (backlog #27) | **RESOLVED 2026-07-30** — we stand up our **own** instance, in this project's `docker-compose.yml`, on this project's VPS. It runs **headless**: client portal disabled, payment gateway disconnected, reached only by API. `INVOICE_NINJA_BASE_URL` is an internal Docker network address; `INVOICE_NINJA_API_TOKEN` and `INVOICE_NINJA_WEBHOOK_SECRET` are generated at stand-up, not supplied by you. |
| 4 | **SMTP credentials** — server, port, username, password, SSL setting, sender address, support address | Operational email now runs through the Backstage email queue instead of Resend, and by default owns client-facing financial mail too. US-17 needs a real or catcher inbox; production needs the real account plus SPF/DKIM/DMARC records. | Sprint 3 · US-17 (AC-17.6) · Email phase | **RESOLVED 2026-07-30** — the full `SMTP_*`, `SENDER_EMAIL`, and `EMAIL_USE_SSL` set is present and populated in the local `.env`. Still outstanding before production email: SPF, DKIM, and DMARC records for the sending domain. |
| 5 | **Stripe credentials, provisioned as a coherent set** (now the single payment path — see the finance note below) — secret key, publishable key, and one identifier per priced item, all from the **same** Stripe mode | You confirmed you will provision the same shape of credentials as the reference project. US-20 only extracts and documents the convention, so this does not block sprint 3 — but a mismatched set is exactly the failure this story exists to prevent. | Finance phase (backlog #29) | **pending** |
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
| 7 | **Contract / e-signature provider for V1** | Ship V1 with the **manual signed-PDF upload plus mark-signed audit entry** that the PRD already permits, and defer an e-sign integration until the Project cockpit is real. It removes a vendor decision, a cost, and a webhook surface from the critical path, and the PRD explicitly allows the manual fallback. Say the word if you would rather pick a provider (Adobe Sign, Dropbox Sign, DocuSign, SignWell) and I will schedule the integration instead. | **suggestion — pending your confirmation** |
| 8 | **Lock design tokens before building any new Frontstage page?** | **Yes** — make it the first story of sprint 4. The PRD requires shared tokens before page creation expands, and the pivot explicitly demotes `public/photobuddy/` from "the design authority" to "inspiration and reusable code". Be aware of the trade-off: that sprint starts with work that produces no new visible pages. My view is that it is cheaper than retrofitting consistency across pages later, and the US-8 shell gives us a real starting point rather than a blank page. | **suggestion — pending your confirmation** |
| 9 | **Starting point for those tokens** | Derive them from the US-8 photobuddy-derived shell already in the repo, then deliberately diverge toward Earth & Honey's own identity — rather than starting a fresh visual direction from nothing. Tell me if you want a clean-sheet visual direction instead; it is a larger, more subjective piece of work and I would want your input on it directly. | **suggestion — pending your confirmation** |
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
