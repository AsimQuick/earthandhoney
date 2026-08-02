<!--
---
file: STRIPE_PORT_REPORT.md
project: earthandhoney
purpose: AC-20.1 — record every file read directly in the reference project
         at /Users/asim/NoIcloud/techno while inspecting its Stripe
         implementation: payment routes, server/client split, templates,
         environment example, and deployment workflow. Later acceptance
         criteria in US-20 (20.2-20.9) add further sections to this same
         report; this section is scoped to AC-20.1 only.
created-by: dev-team
related-story: US-20
related-ac: 20.1
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

## 3. Method

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
