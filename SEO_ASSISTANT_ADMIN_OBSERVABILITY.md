<!--
---
file: SEO_ASSISTANT_ADMIN_OBSERVABILITY.md
project: earthandhoney
purpose: AC-37.6.3.1's harness-first connective tissue — recorded once so
         AC-37.6.3.2 and AC-37.6.3.3 reuse it instead of rediscovering it, the
         same shape US-26 used for WEBHOOK_LIVE_PROOF.md (AC-26.4.1.1). Maps
         how Payload's admin edit view authenticates over HTTP (no prior live
         suite in this repository had ever fetched an admin page — every one
         talks to `/api/*` or a public route with an `Authorization: JWT`
         header) and names, for each of the fourteen PRD §21.2 SEO Assistant
         controls, exactly one way to read that control's value out of the
         fetched response. Produced by running
         src/__tests__/us37-ac37.6.3.1-seo-assistant-admin-observability-live.test.ts
         to a real pass against the running stack; the excerpts below are
         copied verbatim from that suite's own real output, captured with an
         identical, throwaway ad-hoc script run the same way
         (`docker compose run --rm web node <script>`) so the transcript
         could be inspected without instrumenting the committed test with
         permanent logging — no other committed live suite in this project
         logs to stdout, and this one does not either.
created-by: dev-team
related-story: US-37
related-ac: 37.6.3.1
---
-->

# SEO Assistant admin observability (US-37 AC-37.6.3.1)

This document is the harness-first connective tissue AC-37.6.3.1 exists to produce: it maps how
the real Payload admin authenticates a fetch of a document's edit view over plain HTTP, and it
records exactly one way to read each of the fourteen PRD §21.2 SEO Assistant controls out of that
response. AC-37.6.3.2 and AC-37.6.3.3 reuse the recipes below rather than rediscovering them.

Scope is deliberately **one document**: a single real `pages` row carrying all eight AC-37.6.1
authored fields it is possible to set without pulling in seeding this AC's scope forbids (see
[§NOT COVERED](#not-covered) for `socialImage`), created and deleted by one run of
`src/__tests__/us37-ac37.6.3.1-seo-assistant-admin-observability-live.test.ts` against the real
stack. That suite is the source of truth this document records — every recipe below is checked by
one of its assertions on every run, in the project's LIVE Jest lane
(`TEST_LANE_INVENTORY.json`), never the fast lane.

## (a) The authenticated fetch

Payload's own login endpoint issues the session cookie the admin panel's cookie-auth strategy
reads. Confirmed live rather than assumed: `POST /api/users/login` against the shared
`src/test-support/liveApiAuth.ts` fixture identity sets a `payload-token=<jwt>` cookie (the
`<cookiePrefix>-token` shape `node_modules/payload/dist/auth/cookies.js`'s
`generatePayloadCookie` always produces, keyed off `payload.config.ts`'s default
`cookiePrefix: 'payload'`, which this project never overrides):

```
$ POST /api/users/login
  body: {"email":"live-api-fixture@earthandhoney.test","password":"Live-Api-Fixture-Password!23"}

status: 200
set-cookie header (redacted token): payload-token=<jwt-redacted>; Expires=Sat, 15 Aug 2026 02:05:44 GMT; Path=/; HttpOnly=true; SameSite=Lax
response body keys: [ 'message', 'exp', 'token', 'user' ]
```

That same JWT, sent as the `payload-token` cookie value against a real page's admin edit view,
returns the real edit view:

```
$ GET /admin/collections/pages/1336
  headers: Cookie: payload-token=<jwt>

status: 200
content-length: 177838
contains data-testid="seo-assistant-panel": true
contains id="field-seoTitle": true
excerpt — seoTitle <input> tag:
  <input data-rtl="false" disabled="" id="field-seoTitle" type="text" name="seoTitle"
    value="AC-37.6.3.1 Transcript SEO Title 1786752344222"
excerpt — metaDescription <textarea> value:
  AC-37.6.3.1 Transcript Meta Description 1786752344222
```

The identical URL, with no cookie at all, does **not** return that edit view — the cookie is
doing real work, this is not an open admin:

```
$ GET /admin/collections/pages/1336
  (no Cookie header)

status: 200
contains data-testid="seo-assistant-panel": false
contains the page's seoTitle value: false
response content-length: 56124
```

(Both requests return HTTP 200 — Payload's admin app shell renders either way; what differs is the
*content* of that 200: the authenticated response is 3.2× larger and carries the document's real
field values and the SEO Assistant panel, the unauthenticated one carries neither. "Not returning
the edit view" is therefore checked by content, not status code — see the recipe table's own
assertions, which is exactly what
`src/__tests__/us37-ac37.6.3.1-seo-assistant-admin-observability-live.test.ts` does.)

## (b) The fourteen-control observation recipe

One row per PRD §21.2 control. "Mechanism" is how the value is read out of the fetched
`/admin/collections/pages/:id` HTML; "Observed" is what this AC's one seeded page actually showed,
copied from the live transcript.

### The eight AUTHORED controls (AC-37.6.1)

| # | Control | Mechanism | Observed |
|---|---|---|---|
| 1 | SEO title | Plain SSR input: regex `<input[^>]*id="field-seoTitle"[^>]*\svalue="([^"]*)"` | `AC-37.6.3.1 Transcript SEO Title 1786752344222` — the page's own value |
| 2 | Slug | Plain SSR input: regex `<input[^>]*id="field-slug"[^>]*\svalue="([^"]*)"` | The page's own slug |
| 3 | Meta description | Plain SSR textarea: regex `<textarea[^>]*id="field-metaDescription"[^>]*>([\s\S]*?)</textarea>` | `AC-37.6.3.1 Transcript Meta Description 1786752344222` |
| 4 | City/region | Plain SSR input: regex `<input[^>]*id="field-cityRegion"[^>]*\svalue="([^"]*)"` | The page's own city/region |
| 5 | Venue | Plain SSR input: regex `<input[^>]*id="field-venue"[^>]*\svalue="([^"]*)"` | The page's own venue |
| 6 | Photography type | **Hydration-deferred.** The `select` widget's field wrapper (`id="field-photographyType"`) contains no option text in the initial SSR HTML — only a `shimmer-effect` placeholder (excerpt below). Read from the form-state hydration payload instead: regex `\"photographyType\":\{\"value\":(.*?),\"initialValue\"` | `"wedding"` |
| 7 | Open Graph image (`socialImage`) | **Hydration-deferred**, same mechanism as row 6 (Payload's `upload` widget also emits a shimmer placeholder, not a filename, in the initial HTML): regex `\"socialImage\":\{\"value\":(.*?),\"initialValue\"` | `null` — this AC's scope uploads no `media` (see §NOT COVERED), so the mechanism is confirmed but the value is a genuine absence, not an unset recipe |
| 8 | Index/noindex | **Hydration-deferred**, same mechanism as row 6: regex `\"indexing\":\{\"value\":(.*?),\"initialValue\"` | `"noindex"` |

Row 6's SSR excerpt, proving the placeholder claim rather than asserting it:

```
<div class="field-type select read-only" id="field-photographyType" style="flex:1 1 auto">
  <label class="field-label" for="field-photographyType">Photography Type</label>
  <div class="field-type__wrap">
    <div class="shimmer-effect" style="height:calc(var(--base) * 2 + 2px);width:100%">
      <div class="shimmer-effect__shine" style="animation-delay:0m...
```

No `>Wedding<` (or any other option label) appears anywhere in that fetch — confirmed by a
negative assertion in the committed suite, not merely absent from this excerpt.

### The six DERIVED controls (AC-37.6.2), each scoped to its own `data-testid` section

| # | Control | Mechanism | Observed |
|---|---|---|---|
| 9 | Search-result preview | Section `data-testid="seo-assistant-search-preview"`; three `<p data-testid="seo-assistant-search-preview-{title,url,description}">` | title: `AC-37.6.3.1 Transcript SEO Title 1786752344222 \| Earth &amp; Honey Studios` (composed through StudioProfile's live `%s` pattern); url: `http://localhost:4309/ac-37-6-3-1-transcript-1786752344222`; description: the page's `metaDescription` |
| 10 | Canonical URL | Section `data-testid="seo-assistant-canonical-url"`; single unlabelled `<p>` | `http://localhost:4309/ac-37-6-3-1-transcript-1786752344222` |
| 11 | H1 preview | Section `data-testid="seo-assistant-h1-preview"`; single unlabelled `<p>` | `AC-37.6.3.1 Transcript Heading 1786752344222` |
| 12 | Schema preview | Section `data-testid="seo-assistant-schema-preview"`; `<pre data-testid="seo-assistant-schema-preview-json">` carries the HTML-entity-escaped `JSON.stringify` of the real AC-37.3 structured-data object | Real JSON-LD carrying `"@type":["LocalBusiness","ProfessionalService"]` and this page's own `"url"` |
| 13 | Missing-alt-text audit | Section `data-testid="seo-assistant-missing-alt-audit"`; non-empty state is `<li data-testid="seo-assistant-missing-alt-audit-item">`, empty state is `<p data-testid="seo-assistant-missing-alt-audit-empty">` | Empty state — this AC seeds no gallery placement, so `<p data-testid="seo-assistant-missing-alt-audit-empty">No placed images to audit.</p>` is the page's own **real** value, not a placeholder |
| 14 | Internal-link suggestions | Section `data-testid="seo-assistant-internal-link-suggestions"`; non-empty state is one or more `<li data-testid="seo-assistant-internal-link-suggestion-item">`, empty state is `<p data-testid="seo-assistant-internal-link-suggestions-empty">` | **Content-dependent, not guaranteed by this AC's scope.** Observed non-empty in this run — real other published pages already in the database surfaced as suggestions (see excerpt below) — because this control ranks *every* other published `pages`/`stories` document, not only ones this suite creates. The committed recipe/assertion accepts either real render branch; it does not depend on which one is live at run time |

Row 12's excerpt:

```
<pre data-testid="seo-assistant-schema-preview-json">{
  "@context": "https://schema.org",
  "@type": [
    "LocalBusiness",
    "ProfessionalService"
  ],
  "name": "Earth & Honey Studios",
  "url": "http://localhost:4309/ac-37-6-3-1-transcript-1786752344222",
  "areaServed": [
    "AC-37.6.3.1 Transcript City 178675234422...
```
(HTML-entity-escaped in the real response; unescaped here for readability.)

Row 14's excerpt (real other content already published in this database at run time):

```
<ul>
  <li data-testid="seo-assistant-internal-link-suggestion-item">
    <a href="/probe-page-1786734580820">Probe Heading 1786734580820</a> (same-photography-type)
  </li>
  <li data-testid="seo-assistant-internal-link-suggestion-item">
    <a href="/ac31-5-reachable-1786683711053">AC-31.5 Reachable Heading 1786683711053</a> (other-published-content)
  </li>
  ...
</ul>
```

## Not covered

This harness deliberately does not exercise:

- **The `stories` collection's own admin edit view.** `SeoAssistantField`/`SeoAssistantPanel` mount
  identically on `stories` (AC-37.6.2.3), and every recipe above applies unchanged to
  `/admin/collections/stories/:id` — but this AC fetches `pages` only. Confirming the recipes
  reproduce on a real `stories` document is AC-37.6.3.2's or AC-37.6.3.3's evidence.
- **A real, non-null Open Graph image value.** This AC uploads no `media` document (out of
  scope), so row 7's mechanism is confirmed but its observed value is `null` on every run rather
  than a real image ID.
- **A real, non-empty missing-alt-text audit.** This AC seeds no Backstage gallery and creates no
  `gallery-placements` row, so row 13 is always observed in its empty state. Confirming the
  non-empty item-list markup against a real placed photo is AC-37.6.3.2's/AC-37.6.3.3's evidence,
  the same seeding technique `us37-ac37.4.3-sitemap-image-references-live.test.ts` already
  establishes.
- **A deterministic internal-link-suggestions value.** Row 14's content depends on whatever else
  is published in the shared live database at run time; this AC does not create a second document
  to guarantee a specific suggestion, so only the mechanism (which of the two real render
  branches) is proven here, not a specific value.
- **Multi-document cross-checking** — proving one document's edit view never leaks another
  document's values, the way the original un-split AC-37.6.3 attempted with a page/story pair.
  That comparison needs a second seeded document and belongs to whichever of AC-37.6.3.2/.3 seeds
  one.
- **Browser-side behaviour.** Every fetch here is a raw non-browser HTTP request (Node's `fetch`),
  the same as every other live suite in this project. React hydration, client-side interactivity,
  and anything that only exists after the browser executes the admin's JS bundle are out of scope
  — the form-state recipes above read what the *server* sends down, not what a browser renders
  after hydrating it.
- **Session lifecycle edge cases** — cookie expiry, refresh, logout, or concurrent sessions. Only
  "a valid session cookie authenticates; no cookie does not" is proven.
