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
| Auth — photographer/admin/dashboard identity | Better Auth | Nothing — PicPeak's own built-in admin login exists only to authenticate into the Backstage UI itself. | PicPeak's built-in auth/session must never be treated as authoritative for photographer/studio identity outside Backstage's own admin UI. |
| Email — outbound sending | Resend | Nothing — sending is not a display concern. | PicPeak's built-in mailer must stay disabled/unconfigured; no PicPeak-triggered event may dispatch its own email to a client or the photographer. |
| Payments — invoices, receipts, balances | Invoice Ninja (checkout/processing itself is Stripe Checkout's — CLAUDE.md Technology Stack, `Payments:` line) | The app may display Invoice Ninja's invoice/receipt/balance status, cached for display only. | The app must never recreate billing logic or compute an authoritative balance itself. |
| Contracts — signing | PicPeak / Backstage's native contract-signing capability (see note below — this corrects a stale line in CLAUDE.md) | Frontstage/Project Room may display signing status (sent/pending/signed) and the PDF link/download handed to it by Backstage. | No external e-sign vendor (Adobe Sign, DocuSign, Dropbox Sign, SignWell) and no manual-PDF-upload fallback may be (re)introduced; Frontstage must never itself record or stamp a signature. |

## Notes and citations per domain

**Gallery & media data, Storage.** Ownership moved from Payload/R2 to
PicPeak as part of the pivot; this is not a new decision made by this
document; it restates rows R1 ("Two upload paths"), R2 ("Two media
stores") and R3 ("Two galleries") of `PIVOT_AUDIT.md`'s duplicate-feature
risk map, all three resolved to **PicPeak** (`PIVOT_AUDIT.md:508–510`),
and the corresponding superseded-artifacts entries recording the Payload
`Galleries` collection, its Sharp pipeline, and its R2 upload path as
*left dormant*, not deleted (`PIVOT_AUDIT.md:469–471`).

**Auth, Email.** These restate rows R4 ("Two auth systems") and R5 ("Two
email senders"), both resolved to the **pre-existing CLAUDE.md Technology
Stack owner** — Better Auth and Resend respectively — because the pivot
never reassigns identity or outbound email (`PIVOT_AUDIT.md:511–512,
514–519`). `CLAUDE.md` still reads `Auth: Better Auth` and
`Email: Resend`; this document does not change that.

**Payments.** This restates `CLAUDE.md`'s own Payments line verbatim
(*"Stripe Checkout (checkout/processing) + Invoice Ninja (invoices,
receipts, balances — app displays status only, never recreates billing
logic)"*), which already states both the authoritative system and the
display-only-cache language this AC asks for; no other document needed to
be consulted.

**Contracts — why this document departs from CLAUDE.md's literal text.**
`CLAUDE.md`'s Technology Stack section still reads
`Contracts: Adobe Acrobat Sign (webhook-driven signing status, signed PDF
stored)`. That line is stale: `scrum-master/po-requests.md` item 7 confirmed, on
2026-07-30, that V1 uses PicPeak's own native contract-signing capability
instead — "No external e-sign vendor (Adobe Sign, DocuSign, Dropbox Sign,
SignWell) and no manual-upload fallback are carried into V1" — and that
decision was explicitly conditioned on `US-17` AC-17.10 verifying the
capability actually exists at the pinned fork commit. AC-17.10 has since
run and is `done`/approved: six of the seven assumed elements (typed name
capture, consent checkbox, drawn signature, signer IP + timestamp, a
frozen contract-content snapshot, and a SHA-256 integrity hash) are
confirmed exactly against the pinned commit with file:line evidence
(`PIVOT_AUDIT.md:6183–6421`). The seventh — "an audit page baked into the
delivered PDF" — does not hold as assumed: the pinned fork ships the
audit trail as a separate sibling PDF, attached alongside but never
merged into, the delivered signed-contract PDF
(`PIVOT_AUDIT.md:6322–6427`). That one discrepancy is already routed to
`scrum-master/po-requests.md` as reopening part of item 7 by AC-17.10
itself; it does not change which system is authoritative for signing —
the six confirmed elements are the substance of "who signs and records
it," and the sibling-document question is only about how the audit trail
is packaged. This document does not edit `CLAUDE.md` or
`scrum-master/po-requests.md`: per `CLAUDE.md`'s own Project Conventions,
sprint documentation belongs to the Product Owner, and this finding is
recorded here, with citations, rather than silently patched into either
file.
