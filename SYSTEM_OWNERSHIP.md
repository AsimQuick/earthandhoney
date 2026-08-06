<!--
---
file: SYSTEM_OWNERSHIP.md
project: earthandhoney
purpose: AC-18.1 — for every domain in the ownership table in CLAUDE.md,
         name the single authoritative system, what the other systems may
         cache for display only, and what they are forbidden to write.
         AC-21.5 — correct the four rows (Auth, Email, CMS, Payments) that
         were written in sprint-3 against main's stale pre-pivot CLAUDE.md,
         citing the exact restored-CLAUDE.md line each corrected row now
         matches.
created-by: dev-team
related-story: US-18, US-21
related-ac: 18.1, 21.5
---
-->

# System Ownership

## What counts as "the ownership table in CLAUDE.md"

`CLAUDE.md` has no section literally titled "ownership table." The phrase
was already used once before, in AC-14.3, to mean **CLAUDE.md's Technology
Stack section** — the per-concern list (`Storage: ...`, `CMS: ...`,
`Auth: ...`, `Email: ...`, `Payments: ...`, `Contracts: ...`) that assigns
one system per concern. `PIVOT_AUDIT.md` names it in exactly those words:
*"consistent with the per-concern ownership already fixed by CLAUDE.md's
Technology Stack section"* (`PIVOT_AUDIT.md:501–505`), and its
duplicate-feature risk map has a column literally called
**"CLAUDE.md-designated owner"** populated from that section
(`PIVOT_AUDIT.md:506–512`). This document uses the same reading, so it
stays consistent with the one other document that has already interpreted
the phrase.

Not every line of the Technology Stack section is an ownership domain in
the sense this AC means (a single authoritative *system* for a concern
more than one system could plausibly write to). The following lines are
technology choices with no other system in this project ever claiming to
own them, so they are not carried into the table below: **Stack**
(Next.js), **Frontend** framework, **Styling** (Tailwind/shadcn), the
**Database** engine (PostgreSQL — the engine both Payload and PicPeak run
on, not itself a contested domain; the no-cross-database-join rule that
governs how the two use it is AC-18.3's concern), and **Gallery viewer**
(PhotoSwipe — a rendering library, not a data owner). **Image processing**
(Sharp) is not listed as its own row either: ownership of derivative
generation follows whoever owns the underlying gallery/media data, so it
is folded into that domain below rather than duplicated.

## Ownership table

> **Restatement note (2026-08-07).** The Auth, Email — outbound sending, CMS,
> and Payments rows below are **not new decisions**. This document was
> written in sprint-3 against `main`'s stale pre-pivot `CLAUDE.md` (61 lines,
> Gallery-Engine direction) — the root cause of the drift. `CLAUDE.md` has
> since been restored to its post-pivot content (218 lines, under AC-21.2),
> and these four rows are corrected here to match it. Nothing below reflects
> a decision made by this document; each row restates a decision the Product
> Owner already approved on 2026-07-30 (the retirement of Better Auth,
> Resend, and the Testimonials/Packages/FAQ CMS scope; The Ledger Rule for
> Payments) and now cites the exact line of the restored `CLAUDE.md` it
> matches.

| Domain | Single authoritative system | Other systems may cache (display only) | Other systems are forbidden to |
|---|---|---|---|
| CMS — non-gallery business content (Homepage, Portfolio/Blog copy) | Payload CMS (`CLAUDE.md:118`, Technology Stack `CMS:` line) | Nothing — no other system in this stack holds or needs a copy of this content. | Backstage/PicPeak must never create, edit, or store a record for this content; it has no table or route for it and none should be added. Testimonials, Packages, and FAQ are not merely non-owned by other systems — they are retired from product scope entirely (`CLAUDE.md:199`, "Retired From the Old Direction") and must not be built by any system, Payload included. |
| Gallery & media data (galleries, images, thumbnails/derivatives, uploads, access/expiry, delivery) | PicPeak / Backstage | Frontstage/Payload may cache what it is handed across the Frontstage↔Backstage API boundary (AC-18.2) for display only — rendered image URLs, thumbnails, gallery titles/covers, item counts. | Frontstage must never write a gallery or media record directly; the dormant Payload `Galleries` collection and its Sharp derivative pipeline must not be reactivated as a second writer; a Frontstage cache that disagrees with Backstage is never treated as authoritative. |
| Storage — Cloudflare R2 bucket, for gallery/media-class objects | PicPeak / Backstage | Frontstage may read/display R2-served URLs it is handed by PicPeak. | The dormant Payload `s3Storage` upload path must not write gallery/media-class objects to the bucket while PicPeak is live. |
| Auth — photographer/admin/dashboard identity, and gallery-viewer access | PicPeak (PicPeak authentication and authorization; Better Auth is retired — `CLAUDE.md:122`, Technology Stack `Auth:` line) | Nothing — no other system in this stack authenticates a user or issues its own session. | No other system (Payload/Frontstage included) may authenticate a user or issue its own session; Better Auth must not be reintroduced as a second identity system. |
| Email — outbound sending | PicPeak / Backstage email queue (SMTP via the PicPeak email queue; Resend is retired — `CLAUDE.md:123`, Technology Stack `Email:` line) | Nothing — sending is not a display concern. | No other system may dispatch its own client-facing or photographer-facing email; Resend must not be reintroduced as a second sender, per CLAUDE.md's rule that exactly one system sends any given email type. |
| Payments — invoices, receipts, balances, and the actual card charge | Invoice Ninja (invoice/receipt/payment record, headless — API only, no client portal, gateway disconnected — `CLAUDE.md:105-108`, System Ownership table, and `CLAUDE.md:124`, Technology Stack `Ledger:` line) for the ledger; Stripe (the ported direct flow from `techno`) for the actual card charge — `CLAUDE.md:125`, Technology Stack `Payments:` line, and The Ledger Rule (`CLAUDE.md:44-81`), reconciled into Invoice Ninja via webhook | The app may display Invoice Ninja's invoice/receipt/payment status and Stripe's charge confirmation, cached for display only — our stored balances and statuses are display-only caches, never authoritative (The Ledger Rule's Headless guards, `CLAUDE.md:79-80`). | The app must never recreate billing logic or compute an authoritative balance itself; Invoice Ninja's own Stripe gateway must stay disconnected so there is exactly one payment path (`CLAUDE.md:77-78`). |
| Contracts — signing | Open decision — e-sign provider TBD; V1 may ship manual signed-PDF upload with audit entry (per CLAUDE.md Technology Stack, see note below). Presentation is owned by PicPeak / Project Room regardless of which provider is eventually chosen (CLAUDE.md System Ownership table row: "Quote and contract workflow and presentation", owner "PicPeak / Project Room"). | Frontstage/Project Room may display signing status (sent/pending/signed) and the signed-document link/download handed to it by Backstage, once a provider is chosen. | No system may unilaterally lock in an e-sign vendor or the manual-upload fallback as final — that remains an open decision requiring Product Owner sign-off (CLAUDE.md's "Decisions No Agent May Make Alone," item 5); Frontstage must never itself record or stamp a signature. |

## Notes and citations per domain

**Gallery & media data, Storage.** Ownership moved from Payload/R2 to
PicPeak as part of the pivot; this is not a new decision made by this
document; it restates rows R1 ("Two upload paths"), R2 ("Two media
stores") and R3 ("Two galleries") of `PIVOT_AUDIT.md`'s duplicate-feature
risk map, all three resolved to **PicPeak** (`PIVOT_AUDIT.md:508–510`),
and the corresponding superseded-artifacts entries recording the Payload
`Galleries` collection, its Sharp pipeline, and its R2 upload path as
*left dormant*, not deleted (`PIVOT_AUDIT.md:469–471`).

**Auth, Email (AC-21.5 correction).** This document was originally written
in sprint-3 against `main`'s stale pre-pivot `CLAUDE.md`, which still named
Better Auth and Resend as authoritative. `CLAUDE.md`'s Technology Stack now
retires both outright, naming PicPeak's own built-in authentication and
authorization and its own email queue as the respective owners
(`CLAUDE.md:122`: `Auth: PicPeak authentication and authorization (Better
Auth is retired)`; `CLAUDE.md:123`: `Email: SMTP via the PicPeak email
queue as the default owner of all client-facing mail (Resend is
retired)`). This restates rows R4 ("Two auth systems") and R5 ("Two email
senders") of `PIVOT_AUDIT.md`'s duplicate-feature risk map, both resolved
to **PicPeak** (`PIVOT_AUDIT.md` Duplicate-feature risk map, rows R4-R5).
Neither Better Auth nor Resend should be reintroduced as a second
identity or sending system.

**CMS (AC-21.5 correction).** The CMS row previously listed Testimonials,
Packages, and FAQ as content this domain owns. Those collections are not
merely Payload's to own — they are retired from product scope entirely
under the pivot (`CLAUDE.md:199`, "Retired From the Old Direction": *"Testimonials,
Packages, FAQ collections; a standalone Packages page"*). The row is
corrected to drop them and cites `CLAUDE.md:118`'s Technology Stack `CMS:`
line for the remaining, still-owned content (Homepage, Portfolio/Blog
copy).

**Payments (AC-21.5 correction).** The Payments row predated The Ledger
Rule and this document's sprint-3 origin meant it drifted from what
`CLAUDE.md` now says. This restates `CLAUDE.md`'s own Payments line
(`CLAUDE.md:125`: *"Stripe, ported from `/Users/asim/NoIcloud/techno` ...
One payment path: the ported direct flow, reconciled into the ledger"*),
its Ledger line (`CLAUDE.md:124`: *"Invoice Ninja, headless — API only,
portal disabled, gateway disconnected"*), and its System Ownership table
rows for invoicing and card charges (`CLAUDE.md:105-108`), together with
The Ledger Rule section (`CLAUDE.md:44-81`), which is the authoritative
statement of both the payment path (Stripe charges the card) and the
record of truth (Invoice Ninja holds the invoice/receipt/payment record,
headless, API only, portal disabled). The Ledger Rule's Headless guards
state explicitly that "our stored balances and statuses are display-only
caches" (`CLAUDE.md:79-80`) and that "Invoice Ninja's Stripe gateway is
not connected" (`CLAUDE.md:77-78`), so this row avoids wording (e.g.
"Stripe Checkout") that `CLAUDE.md` itself no longer uses.

**Contracts — why this row states an open decision rather than naming a
single system.** `CLAUDE.md`'s Technology Stack line for Contracts
currently reads `open decision — e-sign provider TBD; V1 may ship manual
signed-PDF upload with audit entry (Adobe Sign is no longer locked in)`.
That is `CLAUDE.md`'s own current text, and it is not stale — this
document restates it rather than asserting a single authoritative signing
system, because `CLAUDE.md`'s own "Decisions No Agent May Make Alone"
list keeps the V1 contract-signing provider (or manual fallback) as item
5, requiring a documented spike and Product Owner sign-off before it is
settled. What is already settled, independent of which provider is
chosen, is presentation ownership: `CLAUDE.md`'s own System Ownership
table assigns "Quote and contract workflow and presentation" to "PicPeak
/ Project Room," so that much is stated as decided in the table row
above.

For background, `US-17` AC-17.10 previously verified — against the
pinned PicPeak fork commit, not by assumption — that PicPeak's own native
contract-signing capability, if it were ever chosen as the provider, does
substantially exist: six of the seven assumed elements (typed name
capture, consent checkbox, drawn signature, signer IP + timestamp, a
frozen contract-content snapshot, and a SHA-256 integrity hash) are
confirmed exactly against the pinned commit with file:line evidence
(`PIVOT_AUDIT.md:6183–6421`). The seventh — "an audit page baked into the
delivered PDF" — does not hold as assumed: the pinned fork ships the
audit trail as a separate sibling PDF, attached alongside but never
merged into, the delivered signed-contract PDF
(`PIVOT_AUDIT.md:6322–6427`). That verification is retained here as
background evidence about one candidate option; it does not itself
settle the still-open e-sign-provider decision, which is why the row
above states "open decision" rather than naming PicPeak's native
capability as authoritative. This document does not edit `CLAUDE.md` or
`scrum-master/po-requests.md`: per `CLAUDE.md`'s own Project Conventions,
sprint documentation belongs to the Product Owner, and this finding is
recorded here, with citations, rather than silently patched into either
file.
