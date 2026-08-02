<!--
---
file: STRIPE_PORT_REPORT.md
project: earthandhoney
purpose: AC-20.1 records every file read directly in the reference project
         at /Users/asim/NoIcloud/techno while inspecting its Stripe
         implementation: payment routes, server/client split, templates,
         environment example, and deployment workflow. AC-20.2 adds the
         section recording the reference project's environment-variable
         convention exactly as found. Later acceptance criteria in US-20
         (20.3-20.9) add further sections to this same report.
created-by: dev-team
related-story: US-20
related-ac: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7
---
-->

# Stripe Port Report

## 1. Reference project

Read directly, on disk, at `/Users/asim/NoIcloud/techno` — a Flask (Python)
application, not Next.js/TypeScript. It is the proven Stripe reference this
story extracts the environment and key-pairing convention from; it is not
being copied line-for-line (see AC-20.6/AC-20.9 for the faithfulness
boundary, out of scope for this AC).

## 2. Files inspected (AC-20.1)

Every file below was opened and read in full (or, where noted, grepped and
then read at the matching line ranges) as part of this inspection. Each row
states which of the AC's five required areas — payment routes, server/client
split, templates, environment example, deployment workflow — the file
belongs to.

| # | File (relative to `/Users/asim/NoIcloud/techno`) | Area | What was found |
|---|---|---|---|
| 1 | `main.py` | Payment routes; server side of the split | Flask app. Stripe SDK is configured once at module load (`stripe.api_key`, publishable key, three price-id env vars, lines 38-43). Five Stripe-touching routes: `GET /checkout` (renders the payment page with the publishable key and price IDs), `POST /create-payment-intent` (creates a Stripe `PaymentIntent` for the one-time fee, priced by re-reading `stripe.Price.retrieve` rather than trusting the client), `POST /update-payment-intent` (stashes the email-addon choice in the server session before confirmation), `GET /success` (retrieves the `PaymentIntent` by id from the query string, creates/reuses a Stripe `Customer`, creates the maintenance and optional email-addon `Subscription`s, then sends an activation email), and `POST /account/cancel-subscription` (login-required; lists and deletes the customer's active subscriptions). |
| 2 | `templates/checkout.html` | Client side of the split; templates | Server-rendered Jinja2 template for the `/checkout` route. Loads `https://js.stripe.com/v3/` directly, and passes the publishable key from the server into the page via a `data-stripe-key` attribute on `#payment-form` — the key never appears in a `<script>` block or inline JS literal. |
| 3 | `templates/success.html` | Templates | Server-rendered landing page for the `/success` route. Contains no Stripe JS; all Stripe work for this step (retrieving the PaymentIntent, creating subscriptions) happens server-side in `main.py` before this template is rendered. |
| 4 | `templates/account.html` | Templates | Contains the subscription-management UI: a "Cancel subscription" button and confirm modal that submit a plain HTML form (`#cancel-form`, `action="{{ url_for('cancel_subscription') }}"`) to the server route — no client-side Stripe.js call is made for cancellation. |
| 5 | `static/scripts.js` | Client side of the split | Vanilla JS, no bundler/framework. The Stripe-specific block (`DOMContentLoaded` handler starting "Stripe Checkout Functionality") reads the publishable key off the form's `data-stripe-key` attribute, calls `Stripe(key)`, fetches a client secret from `/create-payment-intent`, mounts a Stripe Payment Element, and on submit calls `/update-payment-intent` followed by `stripe.confirmPayment()` with a `return_url` back to `/success`. The secret key never reaches this file or the browser. |
| 6 | `.env.example` | Environment example | Flat, uncommented variable list. Stripe-relevant entries: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICEMAINT_ID`, `STRIPE_PRICEEMAIL_ID` — no `_TEST`/`_LIVE` suffix on any of them. Also documents `SECRET_KEY`, email/SMTP variables, and the deployment variables `VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY`, `PROJECT_PATH`, `SYSTEMD_SERVICE_NAME`. Note: `STRIPE_PRICEDEV_ID` is read by `main.py` (line 41) and is written by the deploy workflow (row 7 below) but is **not** listed in this file — recorded here as an as-found gap, not corrected, since AC-20.1 is a read-only inspection. |
| 7 | `.github/workflows/main.yml` | Deployment workflow | GitHub Actions workflow, triggered on push to `main`. SSHes into the VPS (`appleboy/ssh-action`), `git pull`s, then writes a fresh `.env` file on the server from a heredoc whose values are GitHub Actions repository secrets — one secret per environment variable, secret names matching the variable names exactly (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICEMAINT_ID`, `STRIPE_PRICEEMAIL_ID`, `STRIPE_PRICEDEV_ID`, plus the non-Stripe vars), then runs `docker compose up -d --build` and prunes old images. No secret value is present in the workflow file itself — only `${{ secrets.* }}` references. |
| 8 | `docker-compose.yml` | Deployment workflow | Single `web` service built from the local `Dockerfile`, `env_file: .env`, port `4000:4000`, and a volume mounting `./instance` so the SQLite database survives container rebuilds. |
| 9 | `Dockerfile` | Deployment workflow | `python:3.11-slim` base image; installs `requirements.txt`; runs the app in production via `gunicorn --bind 0.0.0.0:4000 --workers 2 main:app` (not the Flask dev server). |
| 10 | `requirements.txt` | Deployment workflow (dependency pin) | Pins `stripe==14.1.0` alongside `Flask==3.1.2`, `Flask-Login`, `Flask-SQLAlchemy`, and `gunicorn`. |
| 11 | `README.md` | Payment routes; deployment workflow | Documents a "Stripe Dashboard Configuration" section (create the three products, copy each Price ID into `.env`), a route table listing `/checkout`, `/create-payment-intent`, `/success` etc., and a "Production Deployment" checklist that includes "Use production Stripe API keys" and "Configure Stripe webhooks for production URL" as manual, not-yet-implemented steps. |
| 12 | `email_functions_sprint3.py` | Inspected, ruled out | Read in full to check whether it participates in the payment flow. It does not reference Stripe at all — it sends an unrelated onboarding-form confirmation email and a deployment-notification email, triggered from routes outside the payment path. Listed here for completeness since AC-20.1 requires recording what was inspected, not only what was Stripe-relevant. |

## 3. Method (AC-20.1)

File contents were read directly from the reference project's working tree
(no documentation, README summaries, or memory of the project were relied
upon in place of the source). `grep -in stripe` across the reference
project's tracked file types (`*.py .html .js .yml .yaml`) was used first to
find every candidate file, then each candidate — plus `email_functions_sprint3.py`,
which the grep excluded but which was read anyway to confirm it has no
payment involvement — was opened and read in full or at the matching line
ranges (`main.py` lines 1-60 and 540-1030 cover every Stripe-touching
statement in that file, confirmed against the full `grep -n stripe -i`
line listing for the file).

## 4. Environment-variable convention (AC-20.2)

The reference project's `.env.example` and `main.py` were read again with a
single question in mind: how does the running application decide whether it
is talking to Stripe in test mode or live mode? The answer is that it does
not decide — there is no mode switch anywhere in the code or the
environment file. The convention, exactly as found:

- **Flat names, no test/live suffix.** Every Stripe variable is a plain,
  unqualified name — `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_PRICEMAINT_ID`, `STRIPE_PRICEEMAIL_ID`, `STRIPE_PRICEDEV_ID`. None
  of them carries a `_TEST`, `_LIVE`, `_SANDBOX`, or similar suffix, and
  there is no second, parallel set of variables for the other mode. `.env`
  holds exactly one value per variable at any time.
- **One secret key.** `STRIPE_SECRET_KEY` (`main.py` line 38, `stripe.api_key
  = os.getenv('STRIPE_SECRET_KEY')`) — server-side only, never sent to the
  browser.
- **One publishable key.** `STRIPE_PUBLISHABLE_KEY` (`main.py` line 39) —
  read on the server, then handed to the client via the
  `data-stripe-key` attribute described in AC-20.1's row 2, so the browser
  only ever sees the publishable key, not the secret key.
- **One identifier per priced item.** Three separate price-ID variables,
  one per product the reference project sells: `STRIPE_PRICEDEV_ID`
  (`main.py` line 40), `STRIPE_PRICEMAINT_ID` (line 41), and
  `STRIPE_PRICEEMAIL_ID` (line 42). Each is a distinct Stripe Price object
  ID for a distinct priced item — there is no shared or reused ID across
  products. (As already noted in AC-20.1 row 6, `.env.example` only lists
  `STRIPE_PRICEMAINT_ID` and `STRIPE_PRICEEMAIL_ID`; `STRIPE_PRICEDEV_ID` is
  read by `main.py` and written by the deploy workflow but missing from the
  example file. That gap is restated here, not corrected, since this AC
  records the convention as found.)
- **Mode is a property of the values, not a variable.** No line of code, no
  environment variable, and no config file records "this is test" or "this
  is live." A Stripe secret key's own prefix (`sk_test_...` vs
  `sk_live_...`) and a Price ID's own mode (Price IDs are created inside
  either Stripe's Test or Live dashboard and only work against the matching
  key) are the only place the mode exists. Whichever single, coherent set of
  values — one secret key, one publishable key, and the price IDs created
  to match that key's mode — is loaded into `.env` at a given time
  *is* the mode the running application operates in. Swapping the whole set
  swaps the mode; there is no flag to flip separately.

## 5. Method (AC-20.2)

Section 2's inspection already covers the files this section draws from.
The environment-variable convention above (section 4) was confirmed
directly against `main.py` lines 38-42 (the five `os.getenv(...)` calls
that define the Stripe configuration) and `.env.example`'s Stripe-prefixed
lines, with no reliance on the README's description of the Stripe setup in
place of the source.

## 6. The key-pairing rule (AC-20.3)

Section 4 already established that a Stripe secret key, its publishable
key, and each priced-item identifier each carry a mode of their own
(`sk_test_...`/`sk_live_...`, `pk_test_...`/`pk_live_...`, and a Price ID
created inside one or the other dashboard) rather than the application
selecting a mode itself. This section states the rule that follows from
that, in unambiguous terms, and explains why breaking it fails.

**The rule.** The secret key, the publishable key, and every priced-item
identifier loaded together at runtime must all belong to the same Stripe
mode — all test, or all live. There is no partially-mixed combination that
is valid. A secret key from one mode paired with a publishable key or a
price ID from the other mode is a mismatched pair, regardless of which two
of the three agree with each other.

**Why a mismatched pair fails.** Stripe Test mode and Live mode are two
completely separate, isolated data partitions under the same account —
not a single catalog with a flag on each object. A `PaymentMethod`,
`Product`, or `Price` created in one mode simply does not exist as a
record in the other mode's partition; it is not a permissions restriction,
it is a lookup that finds nothing. That produces two distinct, concrete
failure paths for this project's flow (section 2, row 1 / row 5):

- **Publishable key mode ≠ secret key mode.** `static/scripts.js` initialises
  `Stripe(key)` in the browser using whichever publishable key was handed
  down from the server (section 2, rows 2 and 5), and the Payment Element
  it mounts creates its `PaymentMethod` in that key's mode. `main.py`'s
  `POST /create-payment-intent` and `POST /update-payment-intent` routes
  then act on that `PaymentIntent`/`PaymentMethod` using the server's
  secret key. If the secret key is the other mode, the API call to
  confirm or retrieve that object returns a Stripe "No such
  PaymentMethod" / "No such PaymentIntent" resource-not-found error — the
  object the browser just created is invisible to a secret key from the
  other mode's partition. The customer's card details have already been
  entered before this fails.
- **Price-ID mode ≠ secret key mode.** `main.py`'s `GET /checkout` route
  passes the price IDs (`STRIPE_PRICEMAINT_ID`, `STRIPE_PRICEEMAIL_ID`,
  `STRIPE_PRICEDEV_ID`) to Stripe, and `POST /success` uses the secret key
  to create the maintenance and email-addon `Subscription`s against those
  same IDs. A Price object created in the Test dashboard has no
  corresponding record in Live mode's catalog (and vice versa), so a
  secret key from the non-matching mode calling `stripe.Price.retrieve`
  or creating a `Subscription` against that ID returns a Stripe "No such
  price" error.

Both failures surface as a runtime API rejection, not a build-time or
config-parse error — nothing about a `.env` file with a mismatched set of
values is malformed by itself; every individual value is a real, valid
Stripe identifier. The failure is only visible the moment two
differently-moded values are asked to work together against Stripe's API,
which is exactly what makes this mistake easy to introduce unnoticed (the
application still starts, the checkout page still renders) and why
AC-20.4 specifies a start-up check that catches the mismatch before a
customer reaches it.

## 7. Method (AC-20.3)

The rule and failure mechanism above were derived from the same
`main.py` routes and `static/scripts.js` block already read for AC-20.1
(section 2, rows 1 and 5) — no new files were inspected. The failure
modes are stated in terms of Stripe's documented behaviour that Test and
Live mode data (customers, payment methods, products, and prices) are
kept in fully separate partitions per account, which is why an object
created in one mode is unreachable from a key belonging to the other,
rather than merely rejected on a permissions check.

## 8. Start-up validation specification (AC-20.4)

The reference project has no such check at all (section 2, row 1 — the
five Stripe variables are read with a bare `os.getenv()` and used
wherever they are needed; a missing or mismatched value is only ever
discovered the moment a Stripe API call touching it fails, which per
section 6 can be after a customer has already entered card details).
This section specifies, for this project, the check the reference
project is missing — a design specification only; building it is part of
implementing the payment flow itself (AC-20.6), not this port-and-record
story.

**What is checked.** A single validation routine runs three checks, in
order, against the loaded environment:

1. **Presence.** Every Stripe variable this project requires — the
   secret key, the publishable key, and one identifier per priced item
   this project sells (section 4's convention, carried over unchanged
   from the reference project) — is present and non-empty. Any missing
   or empty variable fails this check immediately; the remaining checks
   do not run against a value that is not there.
2. **Key-pair mode agreement.** The secret key and the publishable key
   each carry their mode as a literal string prefix — `sk_test_`/
   `sk_live_` on the secret key, `pk_test_`/`pk_live_` on the publishable
   key (section 4). The two prefixes are compared directly, with no
   Stripe API call needed: `sk_test_*` must pair with `pk_test_*`, and
   `sk_live_*` must pair with `pk_live_*`. Any other combination fails.
3. **Price-ID mode agreement.** A Price ID (`price_...`) carries no mode
   marker in the string itself (unlike the two keys), so this check
   cannot be done by string inspection. Instead, for each configured
   priced-item identifier, the routine calls Stripe's price-retrieval
   API using the loaded secret key. Per section 6, Stripe Test and Live
   data are isolated partitions, so this call succeeding is itself the
   proof that the price ID belongs to the secret key's mode; the call
   failing with Stripe's "No such price" resource-missing error is the
   proof that it does not (or that the ID is simply wrong — either way,
   this project cannot safely charge against it, so both causes fail the
   check identically). This is the only one of the three checks that
   calls Stripe rather than inspecting local values.

**When it runs.** Once, synchronously, at server start-up, before the
process accepts its first request — not lazily on the first checkout
attempt, and not repeated per-request. Concretely, this project is
Next.js, so the check belongs in the `register()` function of an
`instrumentation.ts` file at the project root: Next.js calls `register()`
exactly once per server process, before any route, page, or Server
Action can run, in both `next dev` and a production `next start`/deployed
build, under the Node.js runtime (the same runtime the Stripe SDK
requires — the check is skipped when `register()` runs under the Edge
runtime, since Stripe is never loaded there). The check runs on every
server boot, so a redeploy with a freshly-written `.env` (section 7 of
this report, AC-20.5) is re-validated automatically without any extra
step.

**What the operator sees.**

- **All three checks pass.** Start-up proceeds silently past this point
  (at most a single confirmation line in the boot log, e.g. "Stripe
  config OK: <mode> mode"); the operator sees nothing beyond the normal
  server-ready output. No behaviour changes for the success path.
- **Any check fails.** `register()` throws an `Error` synchronously.
  Next.js treats an exception from `register()` as a boot failure: the
  process does not finish starting and exits non-zero rather than coming
  up in a half-configured state and silently accepting traffic that will
  later fail against Stripe. The operator sees this as a crash on
  deploy or on `next dev` start, not as a warning buried in later logs.
  The thrown message is written to be actionable without needing to read
  this report or the source again:
  - **Presence failure** names every missing variable by its exact
    environment-variable name (e.g. "`STRIPE_PUBLISHABLE_KEY` is not
    set") and nothing else — never a value, since a variable that is
    present but empty and a variable that is absent are reported the
    same way.
  - **Key-pair mismatch** names both variables involved and the mode
    word (`test`/`live`) each one resolved to, e.g. "`STRIPE_SECRET_KEY`
    is in live mode but `STRIPE_PUBLISHABLE_KEY` is in test mode — every
    Stripe value must come from the same Dashboard mode," directly
    instructing the fix rather than just naming the symptom.
  - **Price-ID mismatch** names the failing variable and states that
    Stripe rejected it as belonging to a different mode than the secret
    key (or does not exist), e.g. "`STRIPE_PRICEMAINT_ID` was rejected
    by Stripe as not found for the configured secret key's mode — it
    must be a Price ID created in the same Dashboard mode (test or
    live) as `STRIPE_SECRET_KEY`."
  - In every case, the message never prints a secret value itself — only
    variable names and the derived mode word — matching the DoD
    requirement that no secret value is committed or surfaced anywhere.

## 9. Method (AC-20.4)

The specification above is grounded in section 4's convention (which
values exist and how mode is encoded — or, for Price IDs, not encoded —
in each) and section 6's isolated-partition failure mechanism (why an
API call, not a string check, is the only reliable way to verify a Price
ID's mode, and why a mismatch is a runtime rejection rather than a
malformed value). No new files were inspected in the reference project
for this AC: the reference project was already established in section 8
to have no start-up validation of any kind, so there is nothing further
to read there — this section specifies new behaviour for this project
rather than recording existing behaviour from the reference project.

## 10. Secret-handling shape (AC-20.5)

**As found in the reference project.** Section 2 (rows 6-7) already
established the two files this shape comes from. Read again with only
the secret-handling question in mind, the reference project's shape has
three parts:

1. **Local values live in an uncommitted environment file.** The
   reference project's `.env` holds the real secret key, publishable
   key, and price IDs on disk, and its `.gitignore` lists `.env`
   explicitly — the file exists on every developer's and the server's
   machine, but never enters the repository's history. `.env.example`
   (section 2, row 6) is the committed, values-free counterpart that
   documents which variables exist.
2. **Deployed values live in repository secrets, named to match
   exactly.** Section 2 row 7's `.github/workflows/main.yml` reads
   every Stripe (and non-Stripe) value it needs as `${{ secrets.<NAME>
   }}`, and in every case `<NAME>` is character-for-character the same
   as the environment-variable name the application reads with
   `os.getenv(...)` — `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
   `STRIPE_PRICEMAINT_ID`, `STRIPE_PRICEEMAIL_ID`, `STRIPE_PRICEDEV_ID`.
   There is no renaming, prefixing, or indirection between a GitHub
   Actions secret name and the variable name the running application
   looks up.
3. **The deployment step writes the environment file on the server.**
   The same workflow step SSHes into the VPS and, before the container
   is rebuilt, runs `cat > .env << EOF … EOF` with every line reading
   one `${{ secrets.* }}` reference (section 2 row 7, lines 29-46 of
   `main.py`'s companion workflow file) — the `.env` file on the
   server is generated fresh on every deploy from GitHub's secret
   store, not hand-edited or carried over between releases, and
   `docker-compose.yml`'s `env_file: .env` (section 2, row 8) is what
   makes the container read it.

**Confirmed: this shape will be mirrored here.** All three parts
already exist, or are already decided, for this project, independent of
this AC:

1. **Local values in an uncommitted environment file.** This project's
   own `.gitignore` already lists `.env`, `.env.local`, and
   `.env.*.local` (verified directly in the file, lines 8-10) —
   the same uncommitted-local-file shape, already in place, not
   something this AC needs to add. `.env.example` — updated with the
   Stripe placeholder names in AC-20.8 — remains this project's
   committed, values-free counterpart, exactly as in the reference
   project.
2. **Deployed values in repository secrets whose names match the
   environment-variable names exactly.** When the Stripe payment flow
   is built and deployed, each Stripe variable this project's
   `.env.example` documents (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
   and one price-ID variable per priced item this project sells, per
   section 4's convention) must be stored as a GitHub Actions
   repository secret under that exact same name — no renaming or
   prefixing — so the deploy step can reference it as
   `${{ secrets.<EXACT_ENV_VAR_NAME> }}`, identical to row 7's pattern.
3. **The deployment step writes the environment file on the server.**
   This project's production deploy target is the shared VPS resolved
   in `scrum-master/po-requests.md` item 2 (`root@140.82.43.36`,
   `/root/earthandhoney/`). The production deploy workflow — built
   later, when the payment flow itself ships, not by this report-only
   story — must write a fresh `.env` file on that server from the
   repository secrets on every deploy, the same way section 2 row 7's
   workflow does, so the running containers there read Stripe
   configuration the same way `docker-compose.yml`'s `env_file: .env`
   already does in the reference project. This project's current
   `.github/workflows/deploy.yml` does not yet do this — today it only
   builds the app inside CI via `cp .env.example .env` (a placeholder
   file for the build step, not a production deploy) — because the
   production deploy step has not been built yet; this section records
   the shape that step must follow when it is, it does not claim the
   step already exists.

**No secret value appears in this report or in any committed file.**
Every value named above — in this section and throughout this report —
is a variable name, a file path, a mode-prefix pattern (`sk_test_`,
`pk_live_`, etc.), or a description of *where* a value lives, never a
value itself. This report was written without opening the reference
project's actual `.env` (only its `.gitignore` and `.env.example`, per
row 6, were read), and this project's own `.env` (also `.gitignore`-d,
per point 1 above) was not created or altered by this AC.

## 11. Method (AC-20.5)

The reference-project half of this section draws only on files already
read for AC-20.1 (section 2, rows 6-8: `.env.example`,
`.github/workflows/main.yml`, `docker-compose.yml`) plus that project's
`.gitignore`, opened for the first time for this AC to confirm `.env`
is listed there. The this-project half draws on this project's own
`.gitignore` and `.github/workflows/deploy.yml`, both opened for the
first time for this AC, and on the already-resolved VPS decision in
`scrum-master/po-requests.md` item 2. No secret value was read from, or
copied out of, any `.env` file in either project.

## 12. Behaviours preserved and dropped when the payment flow is built (AC-20.6)

This section states, for each of the six behaviours this AC names, what
"preserved" concretely means for this project, grounded either in what
section 2's file-by-file inspection actually found in the reference
project or — where the reference project turns out not to have the
behaviour at all — in Stripe's own documented SDK contract and this
project's already-settled architecture (AC-20.7). It then lists the
behaviours deliberately not carried over, with the reason each was
dropped, and closes with the language/framework boundary that governs
how "faithful" is read throughout this whole report.

### Preserved

1. **Server-side payment creation.** Section 2, row 1's `POST
   /create-payment-intent` builds the Stripe `PaymentIntent` entirely
   in `main.py` — amount, currency, and metadata are all set by server
   code (lines 586-608, re-read for this AC); the client's JSON body
   supplies only `email` and `email_addon`, never an amount or a
   Stripe-object shape to create. Preserved unchanged: this project's
   payment-creation route must construct the Stripe object representing
   the charge entirely on the server. The client only ever triggers the
   request and later confirms the client secret it is handed back —
   it never assembles or sends the parameters Stripe uses to create the
   charge.
2. **The route layout.** Section 2, row 1 shows a payment flow split
   across distinct, single-purpose routes: one that creates the payable
   object (`/create-payment-intent`), one that finalises and reconciles
   after the redirect back (`/success`), and one that manages an
   existing paid state (`/account/cancel-subscription`) — not one
   handler doing all three. Preserved as that same separation of
   concerns, translated to this project's own routing mechanism (Next.js
   Route Handlers and/or Server Actions under the App Router, not Flask
   `@app.route` decorators or Jinja2-rendered pages) rather than as
   identical URL paths.
3. **Webhook signature verification.** Re-checked directly for this AC:
   `main.py`'s full route table (every `@app.route` decorator, 14
   matches) contains no webhook endpoint, and `grep -rn -i
   "webhook|construct_event|stripe-signature|idempot"` across the
   reference project's tracked source (`.py`, `.html`, `.js`, `.yml`,
   `.md`, excluding the `.venv` dependency tree) turns up no
   implementation — only `README.md` lines 135-137 and 237 listing
   "Configure Webhooks (Optional but recommended)" and "Configure Stripe
   webhooks for production URL" as manual, never-built setup steps.
   The reference project does not verify a webhook signature anywhere,
   so this behaviour is not being read out of its code. It is preserved
   because it is Stripe's own documented SDK contract — every webhook
   request must have its signature checked against the raw request body
   and the webhook signing secret (the Node SDK's
   `stripe.webhooks.constructEvent`, the same guarantee Python's
   `stripe.Webhook.construct_event` gives, which the reference project
   simply never called) — combined with this project's already-settled
   architecture (AC-20.7): the webhook is the verified source that
   reconciles payment into the ledger, so an unverified request must
   never be trusted as if it were one.
4. **Repeat-event protection.** Also absent from the reference project
   for the same reason as item 3 — there is no webhook handler to
   protect. Preserved because Stripe documents webhook delivery as
   at-least-once, not exactly-once: the same event can arrive more than
   once. Per AC-20.7's settled architecture, the webhook is what
   advances the ledger and the project milestone, so processing one
   Stripe event twice must not reconcile the same payment twice. The
   required mechanism is recording each processed event's `id` and
   skipping any event whose `id` has already been handled, before
   whatever reconciliation work that event triggers runs a second time.
5. **Success and cancel handling.** Section 2, row 1 and the direct
   re-read of `main.py` lines 655-759 for this AC show `GET /success`
   does real work, not a trusting redirect: it takes the
   `payment_intent` id off the query string, calls
   `stripe.PaymentIntent.retrieve` to re-fetch the object from Stripe,
   and only proceeds to create subscriptions and send the activation
   email after checking `intent.status == 'succeeded'` on that
   server-fetched object (line 680) — the redirect itself is never
   treated as proof. That half is preserved unchanged: this project's
   success handling must likewise re-fetch and re-check payment state
   from Stripe before treating anything as paid, matching the "a browser
   redirect is never proof of payment" rule this report's AC-20.7
   section restates. The other half is not something to copy, because
   it does not exist to copy: the reference project has no pre-payment
   cancel/abandon path at all — its only "cancel" is
   `/account/cancel-subscription` (section 2, row 1), a
   post-purchase self-service Subscription cancellation, which is a
   different event entirely from a customer backing out of checkout
   before paying. This AC's own text still requires cancel handling for
   this project's build, so that half is preserved as a requirement
   stated by the AC, not as reference-project logic — a customer who
   leaves without completing payment must land on a distinct, explicit
   non-paid outcome, the same way `/success` already lands on a
   distinct, explicit paid outcome.
6. **The authoritative amount is fetched from Stripe, never trusted from
   the browser.** `main.py` lines 586-588 (re-read for this AC): `dev_price
   = stripe.Price.retrieve(STRIPE_PRICEDEV_ID)` then `dev_amount =
   dev_price.unit_amount` — the amount handed to
   `stripe.PaymentIntent.create` comes from a server-side Stripe lookup
   of the configured Price object, not from anything in `data =
   request.get_json()` (which supplies only `email` and `email_addon`,
   confirmed by the same read). Preserved unchanged, and already
   restated as the key-pairing-relevant fact in section 6: this
   project's payment-creation route must derive the charge amount the
   same way — a server-side Stripe lookup of the configured priced-item
   identifier — and must never accept a numeric amount field from the
   request body.

### Deliberately not carried over

- **Recurring `Subscription` creation in `POST /success`** (the
  maintenance and email-addon subscriptions, `billing_cycle_anchor`
  30-day delay, `proration_behavior='none'`, section 2 row 1, lines
  700-731). Not carried over: AC-20.9 already settles that this
  project's V1 ships a payment schedule paid manually against a real
  ledger invoice, not Stripe `Subscription` objects, and that a
  subscription product must never be used here because it would place
  an authoritative billing schedule outside the ledger.
- **`/account/cancel-subscription` and its `stripe.Subscription.delete`
  flow** (section 2, row 1, lines 972-1024). Not carried over, for the
  same reason as above: with no Stripe Subscriptions in this project's
  flow, there is nothing of that kind to let a client self-service
  cancel.
- **Session-stashed email-addon choice via `POST
  /update-payment-intent`** (`session['pending_email_addon']`, section
  2 row 1, lines 629-652). Not carried over: this mechanism exists only
  to carry techno's specific second product (an optional email add-on
  subscription) across the confirmation step. This project's pricing
  and packages are a different, already-modelled domain (the Packages
  collection named in `CLAUDE.md`'s CMS pillar), so there is no
  equivalent add-on choice to stash.
- **Flask-Login accounts, password update, and the `/activate` /
  `/account` pages built around the payment** (section 2, row 1's route
  table; `/activate`, `/account`, `/account/update-password`,
  `/logout`). Not carried over: this is techno's own customer-account
  system layered on top of the payment, not Stripe integration
  behaviour, and this project's client/session identity model is
  decided elsewhere, not reintroduced from this reference here.
- **SQLite persistence and the `gunicorn`/systemd single-process
  deployment shape** (section 2, rows 8-9). Not carried over: this is
  application-hosting shape, not payment logic, and this project's own
  Docker/VPS deployment convention is already recorded in sections 10-11
  (AC-20.5) independently of the Stripe port.
- **The `data-stripe-key` Jinja2 template attribute mechanism** for
  handing the publishable key to the browser (section 2, row 2). Not a
  dropped behaviour so much as a mechanism with no counterpart to carry
  over literally: Next.js has no server-rendered Jinja2 template layer.
  The equivalent — reading the publishable key on the server and
  passing it into a Client Component — is the faithful translation of
  the same underlying rule (the secret key never reaches the browser;
  only the publishable key does), covered under the language/framework
  boundary below, not listed as a drop.

### The language/framework boundary

The reference project is a Flask (Python 3.11) application rendering
Jinja2 templates with vanilla JavaScript (section 1, section 2 rows 1-5,
10). This project is Next.js/TypeScript on the App Router (`CLAUDE.md`'s
technology stack). Nothing in section 1's reference-project code can be
copied line-for-line into this project and run — different language,
different framework, different routing and templating model entirely.
"Port faithfully," in this report and in the payment flow this report
specifies, therefore means: preserve each behaviour's *logic* (what is
checked, in what order, against what server-fetched source of truth) and
its *required-field structure* (which Stripe fields are read, which are
validated, which are re-verified before being trusted) — not its Python
syntax, its Flask route decorators, or its Jinja2 markup. Where a
preserved behaviour (webhook signature verification, repeat-event
protection, the cancel half of success/cancel handling) has no working
precedent in the reference project's own code, as items 3-5 above make
explicit, this project's requirement for it is grounded in Stripe's own
documented SDK contract and this project's already-settled architecture
(AC-20.7), not in anything read out of `techno`.

## 13. Method (AC-20.6)

`main.py`'s full set of `@app.route` decorators (14 matches) was
re-enumerated to confirm none is a webhook endpoint, and `grep -rn -i
"webhook|construct_event|stripe-signature|idempot"` was run across the
reference project's tracked source (`*.py .html .js .yml .md`,
`.venv` excluded) to confirm no signature-verification or
duplicate-event-handling code exists anywhere in the project, not only
in `main.py` — the only matches were `README.md`'s two mentions of an
optional, never-built webhook setup step (lines 135-137, 237), already
covered by section 2, row 11. `main.py` lines 575-628
(`create-payment-intent`) and 655-759 (`success`) were re-read in full
to confirm, directly against the code, which fields the client actually
sends (`email`, `email_addon` — never an amount), how the charge amount
is derived (`stripe.Price.retrieve(...).unit_amount`), and that
`/success` re-fetches and re-checks `intent.status` from Stripe before
finalising anything. No files beyond those already listed in section 2
were opened for this AC.

## 14. This payment path's purpose, and the settled payment architecture, restated not reopened (AC-20.7)

Sections 6, 8, and 12 have already leaned on "this project's already-settled
architecture" without spelling it out. This section states it plainly, once,
so every earlier cross-reference has somewhere to point. Nothing here is a
new decision — every item below was already resolved in
`scrum-master/po-requests.md` (items 3, 5, and 6, and the "Finance
architecture — settled 2026-07-30" section) before this story existed. This
section records that settlement; it does not reopen it, and building it is
not part of this report-only story (same boundary as section 8's start-up
check and section 10's deploy-workflow shape: specified here, built later).

**What this payment path is for.** This payment path exists so the studio
can charge its own photography clients — the fee for a booked session or
package in the client lifecycle `CLAUDE.md` defines (Visitor → Lead →
Booking → Contract → **Payment** → Session → Gallery Delivery). It is **not**
subscription billing for a future software product. That distinction matters
because the reference project's own two recurring `Subscription` objects
(section 2, row 1; section 12's "Deliberately not carried over" list) *are*
subscription billing — techno bills its own users for **its own SaaS
maintenance and email-addon service**. Porting that mechanism here would
misread what is being sold: this project has one photography client paying
for one photography engagement, not a software vendor billing recurring
seats. That is also why section 12 already declined to carry the
`Subscription`-creation behaviour forward, and why AC-20.9 (out of scope
here) fixes V1's shape as a manually-paid installment schedule against a real
ledger invoice instead.

**The settled architecture, restated.** `scrum-master/po-requests.md` item 6
resolved "which system initiates payment" as: *"the ported direct Stripe
flow, with the ledger gateway left disconnected and the verified webhook
reconciling into the ledger. Exactly one payment path, one Pay button, one
webhook endpoint (in the fork backend, where invoice status lives)."* Broken
into its three parts:

1. **The ported direct flow initiates payment.** The Stripe
   payment-creation route this story ports from `main.py`'s
   `POST /create-payment-intent` (section 2, row 1; section 12, item 1) is
   the *only* place a charge is started. There is no second entry point:
   one payment path, one Pay button, matching the reference project's own
   shape of a single `/checkout` page driving a single creation route.
2. **The ledger's own payment gateway stays disconnected.**
   `scrum-master/po-requests.md` item 3 resolved that this project's Invoice
   Ninja instance "runs **headless**: client portal disabled, **payment
   gateway disconnected**, reached only by API." Invoice Ninja is the ledger
   (`CLAUDE.md`'s technology stack: "Invoice Ninja (invoices, receipts,
   balances — app displays status only, never recreates billing logic)");
   it never talks to Stripe, never mounts its own checkout, and never
   moves money itself. Money moves through Stripe alone, exactly as the
   "Finance architecture — settled 2026-07-30" section of
   `po-requests.md` puts it: *"Invoice Ninja becomes a headless API-only
   ledger with no client portal and no client-facing surface; every
   surface is ours; Stripe alone moves money."*
3. **The verified webhook reconciles the payment into the ledger and
   advances the project milestone.** Section 12, items 3-4 already require
   this project's webhook handler to verify Stripe's signature
   (`stripe.webhooks.constructEvent`/`stripe.Webhook.construct_event`'s
   guarantee, never built in the reference project — section 2, row 11)
   and to protect against Stripe's at-least-once redelivery before doing
   anything else. What that verified event then does is write the paid
   state into the ledger: the fork backend's `invoices` table tracks
   payment state in its own `status` column (`vendor/picpeak/backend/src/
   services/invoiceService.js` line 9, `"Statuses (invoices.status):"`,
   and its use throughout, e.g. lines 437-438, 1928-1929), moving an
   invoice out of `scheduled`/`sent`/`overdue` once payment is confirmed.
   That same `invoices` row is what the fork's project cockpit reads to
   build its milestone timeline: `getProjectOverview` in
   `vendor/picpeak/backend/src/services/projectService.js` (lines 124-129,
   165-172) pushes an `{ kind: 'invoice', label, date }` entry onto the
   project's `milestones` array once the project has an invoice row to
   read — the verified webhook writing a payment result into that same
   `invoices` table is what "advances the project milestone" means
   concretely: the ledger row the milestone timeline is built from moves
   forward because the webhook, not a client action, wrote to it.

**Exactly one webhook endpoint, and where it lives.**
`scrum-master/po-requests.md` item 6's "one webhook endpoint (in the fork
backend, where invoice status lives)" is a single, specific claim: the
Stripe reconciliation webhook this project needs is not a Next.js API route
alongside the payment-creation route from item 1 above — it is a route
inside `vendor/picpeak/backend`, the same backend that owns the `invoices`
table (`invoiceService.js`, confirmed above), because reconciling a payment
means writing directly to the ledger row the webhook is confirming, not
relaying that write across a second network hop. This is one endpoint,
singular: `vendor/picpeak/backend` already has its own, unrelated webhook
system — `vendor/picpeak/backend/src/routes/adminWebhooks.js`, backed by
`webhookService.js` (its event catalogue: `event.created`, `event.published`,
`event.expired`, and others, `webhookService.js` lines 13-19) and
`webhookDeliveryWorker.js` — but that system is **outbound**: it delivers
PicPeak's own gallery-lifecycle notifications *to* external subscribers. It
is a different mechanism serving a different direction of traffic and is not
counted against, nor to be confused with, the one **inbound** Stripe
reconciliation webhook this section specifies. No inbound Stripe webhook
route exists in `vendor/picpeak/backend` yet (confirmed by the same search
that found no Stripe code there at all, section 2's method note below); this
section specifies where the one that gets built belongs, not a route already
present.

**A browser redirect is never proof of payment.** Section 12, item 5
already states this as the reason `/success` re-fetches and re-checks
`intent.status` from Stripe rather than trusting that the customer's browser
arrived at a success URL. It is restated here as its own explicit rule,
independent of that behavioural item, because it is the reason the verified
webhook — not the redirect — is the thing that reconciles payment into the
ledger in point 3 above: a customer's browser landing on `/success` proves
only that a redirect happened, which can be forged, replayed, or simply
never followed (closed tab, lost connection) after a real payment succeeded.
The webhook, arriving directly from Stripe and signature-verified, is the
only event this architecture treats as proof a payment occurred; the
redirect is UX only.

**The language boundary this port crosses, and where that gets recorded.**
The reference project is Flask/Python (section 1). The one webhook endpoint
this section places "in the fork backend" is `vendor/picpeak/backend` — a
Node.js/Express application, not Next.js/TypeScript and not Flask. Building
that endpoint therefore ports the reference project's payment-creation and
webhook logic across *two* language boundaries at once: Python → TypeScript
for the Next.js side (already covered by section 12's "language/framework
boundary"), and Python → JavaScript for the fork-backend side. Because the
fork backend is vendored code tracked against an upstream pin (`FORK_
CHANGELOG.md`, `PICPEAK_UPSTREAM.md`), adding Stripe payment-creation and
webhook-reconciliation logic there is new functionality with no upstream
counterpart — upstream PicPeak has no Stripe integration at all (confirmed
by this section's own `grep -i stripe` across `vendor/picpeak/backend/src`,
zero matches). That makes it a deviation from upstream in exactly the sense
`FORK_CHANGELOG.md` exists to track, not merely an addition internal to this
repository's own `src/` tree. When that work is actually built, it **must**
be recorded in `FORK_CHANGELOG.md` as a `deviation` entry — dated, naming
every file it touches inside `vendor/picpeak/backend` — the same mechanism
already used for the AC-17.5 download-route patch and enforced by
`validateChangelogEntry` in `src/lib/forkChangelog.ts` (a `deviation` entry
that names no files is rejected). This report records that obligation; it
does not discharge it, since the endpoint itself is not built by this
report-only story.

## 15. Method (AC-20.7)

This section draws on `scrum-master/po-requests.md` — items 3, 5, and 6, and
the "Finance architecture — settled 2026-07-30" section — read in full for
this AC to confirm the payment architecture it restates was already settled
before this story, not decided here. Three files inside
`vendor/picpeak/backend` were opened for the first time in this report for
this AC, to ground "the fork backend, where invoice status lives" and "one
webhook endpoint" in the fork's actual code rather than in the requests
document's own wording alone: `src/services/invoiceService.js` (confirming
`invoices.status` is where payment/invoice state is tracked), `src/services/
projectService.js` (confirming the `milestones` timeline the cockpit builds,
and that an `invoice`-kind milestone is sourced from that same `invoices`
data), and `src/routes/adminWebhooks.js` together with `src/services/
webhookService.js` (confirming the fork's existing webhook system is an
outbound gallery-lifecycle notifier, unrelated to and not double-counted
against the one inbound Stripe webhook this section specifies). A
repository-wide `grep -i stripe` across `vendor/picpeak/backend/src`
returned no matches, confirming no Stripe code exists in the fork yet — this
section specifies where it belongs when built, the same not-yet-built
boundary already established for the start-up check in section 8.
