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
related-ac: 20.1, 20.2, 20.3
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
