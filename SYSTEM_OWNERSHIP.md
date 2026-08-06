<!--
---
file: SYSTEM_OWNERSHIP.md
project: earthandhoney
purpose: AC-18.1 — for every domain in the ownership table in CLAUDE.md,
         name the single authoritative system, what the other systems may
         cache for display only, and what they are forbidden to write.
created-by: dev-team
related-story: US-18
related-ac: 18.1
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

| Domain | Single authoritative system | Other systems may cache (display only) | Other systems are forbidden to |
|---|---|---|---|
| CMS — non-gallery business content (Testimonials, Packages, FAQ, Homepage, Portfolio/Blog copy) | Payload CMS | Nothing — no other system in this stack holds or needs a copy of this content. | Backstage/PicPeak must never create, edit, or store a record for this content; it has no table or route for it and none should be added. |
| Gallery & media data (galleries, images, thumbnails/derivatives, uploads, access/expiry, delivery) | PicPeak / Backstage | Frontstage/Payload may cache what it is handed across the Frontstage↔Backstage API boundary (AC-18.2) for display only — rendered image URLs, thumbnails, gallery titles/covers, item counts. | Frontstage must never write a gallery or media record directly; the dormant Payload `Galleries` collection and its Sharp derivative pipeline must not be reactivated as a second writer; a Frontstage cache that disagrees with Backstage is never treated as authoritative. |
| Storage — Cloudflare R2 bucket, for gallery/media-class objects | PicPeak / Backstage | Frontstage may read/display R2-served URLs it is handed by PicPeak. | The dormant Payload `s3Storage` upload path must not write gallery/media-class objects to the bucket while PicPeak is live. |
| Auth — photographer/admin/dashboard identity, and gallery-viewer access | PicPeak (PicPeak authentication and authorization; Better Auth is retired per CLAUDE.md Technology Stack) | Nothing — no other system in this stack authenticates a user or issues its own session. | No other system (Payload/Frontstage included) may authenticate a user or issue its own session; Better Auth must not be reintroduced as a second identity system. |
| Email — outbound sending | PicPeak / Backstage email queue (SMTP via the PicPeak email queue; Resend is retired per CLAUDE.md Technology Stack) | Nothing — sending is not a display concern. | No other system may dispatch its own client-facing or photographer-facing email; Resend must not be reintroduced as a second sender, per CLAUDE.md's rule that exactly one system sends any given email type. |
| Payments — invoices, receipts, balances, and the actual card charge | Invoice Ninja (invoice/receipt/payment record, headless — API only, no client portal) for the ledger; Stripe (the ported direct flow from `techno`) for the actual card charge — CLAUDE.md Technology Stack `Payments:` line and The Ledger Rule, reconciled into Invoice Ninja via webhook | The app may display Invoice Ninja's invoice/receipt/payment status and Stripe's charge confirmation, cached for display only. | The app must never recreate billing logic or compute an authoritative balance itself; Invoice Ninja's own Stripe gateway must stay disconnected so there is exactly one payment path. |
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

**Auth, Email.** `CLAUDE.md`'s Technology Stack now retires both Better
Auth and Resend outright, naming PicPeak's own built-in authentication
and authorization and its own email queue as the respective owners
(`CLAUDE.md` Technology Stack: `Auth: PicPeak authentication and
authorization (Better Auth is retired)`; `Email: SMTP via the PicPeak
email queue as the default owner of all client-facing mail (Resend is
retired)`). This restates rows R4 ("Two auth systems") and R5 ("Two email
senders") of `PIVOT_AUDIT.md`'s duplicate-feature risk map, both resolved
to **PicPeak** (`PIVOT_AUDIT.md` Duplicate-feature risk map, rows R4-R5).
Neither Better Auth nor Resend should be reintroduced as a second
identity or sending system.

**Payments.** This restates `CLAUDE.md`'s own Payments line (*"Stripe,
ported from `/Users/asim/NoIcloud/techno` ... One payment path: the
ported direct flow, reconciled into the ledger"*) together with The
Ledger Rule section, which is the authoritative statement of both the
payment path (Stripe charges the card) and the record of truth (Invoice
Ninja holds the invoice/receipt/payment record, headless, API only). The
Ledger Rule states explicitly that "our stored balances and statuses are
display-only caches" and that "Invoice Ninja's Stripe gateway is not
connected," so this row avoids wording (e.g. "Stripe Checkout") that
`CLAUDE.md` itself no longer uses.

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
