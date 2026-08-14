<!--
---
file: SPAM_PROTECTION_ADR.md
project: earthandhoney
purpose: AC-33.4 — records the spam-protection mechanism chosen for the
         Frontstage /api/inquiries receiver (honeypot field, submission-timing
         check, server-side per-source rate limit), the options rejected at
         each of the three sub-decisions, and the reason (DoD item 6).
created-by: dev-team
related-story: US-33
related-ac: 33.4
---
-->

# Spam protection ADR (US-33 AC-33.4)

AC-33.4 requires spam protection that does **not** depend on a third-party client-side script or an
external service. That constraint alone rules out the two most common off-the-shelf answers before
any other tradeoff is weighed, so they are recorded first.

## Decision 1 — overall approach: honeypot + timing + rate limit, all server-side

### This ADR commits to three server-side signals, evaluated in `src/lib/spamProtection.ts` and
wired into `src/app/(frontend)/api/inquiries/route.ts` ahead of the AC-33.3 Forms lookup/validation:

1. A hidden `honeypot` field a human visitor never fills in.
2. A `renderedAt` timestamp comparison — a submission completed in under
   `SUBMISSION_MIN_ELAPSED_MS` (2000ms) after the form was rendered is rejected.
3. A per-source (request IP) sliding-window rate limit —
   `INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS` (5) submissions per `INQUIRY_RATE_LIMIT_WINDOW_MS`
   (10 minutes).

### Reasons rejected: third-party CAPTCHA (reCAPTCHA / hCaptcha / Turnstile)

- Directly excluded by the AC's own wording: every mainstream CAPTCHA ships a client-side script
  loaded from the vendor's domain, and verifies the response against the vendor's external service —
  exactly the two things AC-33.4 forbids.
- Even setting the wording aside, it would introduce a page-weight and privacy cost (a third-party
  script executing on every visitor's browser, before they've expressed any interest in submitting
  anything), a new external availability dependency for a core conversion path (PRD §20: the
  inquiry form is the site's primary lead-capture surface), and a consent/privacy-notice surface
  CLAUDE.md's tax-invisibility and headless-ledger sections show this project deliberately avoids
  adding for adjacent concerns.

### Reasons rejected: a third-party spam-scoring API (Akismet-style)

- Also directly excluded by the AC's wording — an "external service" the submitted content (a
  visitor's name, email, and message) would have to be sent to before the studio ever sees it.
  Beyond the wording, that is a real PII-sharing decision no story authorized, and CLAUDE.md's
  Decisions No Agent May Make Alone already treats comparable third-party-data-sharing choices as
  requiring Product Owner sign-off — out of proportion to what V1 needs.

### Reasons rejected: a JavaScript-execution challenge (e.g. requiring a client script to compute a
token before submit succeeds)

- Requires the visitor's browser to run bespoke client-side logic to pass at all, which sits in the
  same spirit AC-33.4 rejects a third-party client-side script for: the server should be able to make
  this decision on its own, the same "server is authoritative" principle AC-33.3 already established
  for field validation. A server-only signal set (honeypot + timing + rate limit) needs nothing
  client-side beyond a normal hidden `<input>` and a timestamp captured once at render — no script
  execution is required for the legitimate path to work at all, so nothing breaks for a visitor with
  scripting restricted.

## Decision 2 — rate-limit key: request IP, not `sourcePage` or a client-issued token

### This ADR commits to keying the limiter by the request's IP address (`x-forwarded-for`, falling
back to `x-real-ip`, falling back to a constant `'unknown'` bucket when neither header is present —
this project's deployment sits behind a single reverse proxy, Caddy or Nginx per CLAUDE.md's
Technology Stack, which sets one of these headers in production).

### Reasons rejected: `sourcePage` (the submitted page path already stored on `Inquiries`)

- `sourcePage` is a value the submitting client supplies in the request body. A script sending
  rapid-fire spam can set it to a different value on every request with zero additional cost,
  defeating a `sourcePage`-keyed limit entirely while a real campaign landing page naturally receives
  many legitimate submissions from many different visitors under the *same* `sourcePage` — the two
  failure modes point in opposite directions, so `sourcePage` is the wrong axis for a volume limit
  regardless of spoofing.

### Reasons rejected: a client-issued token (e.g. a cookie or session ID minted on first page load)

- Adds a stateful client-side dependency (cookie storage, a prior request to mint the token) for a
  public, anonymous, one-shot form that has none today, and a scripted client can simply omit
  cookies or mint a fresh token per request just as easily as it can change `sourcePage` — it does
  not raise the cost of abuse over IP-keying, only the implementation cost of the legitimate path.

## Decision 3 — rate-limiter storage: in-memory (per-process), not Redis or a database table

### This ADR commits to an in-memory `Map`-backed sliding window (`createSourceRateLimiter` in
`src/lib/spamProtection.ts`), scoped to the Node process's lifetime.

### Reasons rejected: a Redis-backed distributed limiter

- CLAUDE.md's V1 deployment is one VPS running one `web` service in `docker-compose.yml` — there is
  no second Next.js process for in-memory state to be inconsistent *with*. Adding a Redis service
  purely to coordinate rate-limit counters across a single process would violate the Docker Rules'
  "if you need a new service, add it to docker-compose.yml — do not install it on the host" default
  by adding a service nothing else in V1 needs, for a benefit (multi-process consistency) V1's
  topology doesn't have. If a future horizontally-scaled deployment needs it, that is exactly the
  kind of infrastructure-shape change CLAUDE.md's "Decisions No Agent May Make Alone" §6 (VPS
  capacity) already gates.

### Reasons rejected: a database-backed rate-limit table

- The signal this limiter protects is intentionally ephemeral and non-authoritative (a moving count
  of recent submission attempts, not a business record — contrast the `Inquiries` collection, which
  is durable by design per AC-33.2). Writing every submission attempt, including every spam attempt,
  to Postgres adds write load and migration surface for a value that is correct to lose on a process
  restart; a restart naturally and harmlessly re-opens the window rather than corrupting anything.

## What would have to be true to revisit these decisions

If V1 ever runs more than one `web` process behind a load balancer (a topology change, not this
story's to make), the in-memory limiter in Decision 3 would need to move to a shared store (Redis is
the natural choice at that point) so that two processes don't each independently allow up to the
per-process limit. Decisions 1 and 2 are not deployment-topology-dependent and would not need to
change under that scenario.
