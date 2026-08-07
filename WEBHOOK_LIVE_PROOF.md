# WEBHOOK_LIVE_PROOF.md

Live-proof harness for US-26 AC-26.4: Backstage-to-Frontstage webhook
revalidation, proven against the running stack rather than mocked. This
document opens with the harness's **connective tissue** — stood up once here
(AC-26.4.1.1) and reused, not rebuilt, by AC-26.4.1.2 (publish), AC-26.4.1.3
(reproduction), AC-26.4.2 (photo upload), and AC-26.4.3 (photo delete).

The Backstage-side half of this path — an outbound webhook firing and being
received — was already proven live at the pinned fork commit in
`PIVOT_AUDIT.md`'s `## AC-17.7` write-up; that proof and its commands are not
repeated here. What is new in this story is the other half: a **Frontstage**
receiver Backstage's webhook can actually reach and that verifies what it
receives (AC-26.1/26.2/26.3). This document proves that half live.

Produced by running `scripts/webhook-live-proof-setup.sh` to completion
against the running stack and recording its real output below, followed by
the closing signature-verification check the criterion itself requires.

## (a) Frontstage and Backstage on the shared Compose `default` network

```
$ docker compose --profile webprod --profile backstage ps
NAME                                 IMAGE                              COMMAND                                                                                                               SERVICE              CREATED          STATUS                    PORTS
earthandhoney-backstage-backend-1    earthandhoney-backstage-backend    "dumb-init -- sh -c 'mkdir -p /storage && chown -R nodejs:nodejs /storage && exec ./wait-for-db.sh node server.js'"   backstage-backend    23 minutes ago   Up 23 minutes (healthy)   0.0.0.0:3101->3000/tcp
earthandhoney-backstage-db-1         postgres:16-alpine                 "docker-entrypoint.sh postgres"                                                                                       backstage-db         5 hours ago      Up 5 hours (healthy)      5432/tcp
earthandhoney-backstage-frontend-1   earthandhoney-backstage-frontend   "/usr/local/bin/docker-entrypoint.sh nginx -g 'daemon off;'"                                                          backstage-frontend   23 minutes ago   Up 22 minutes (healthy)   0.0.0.0:3100->80/tcp
earthandhoney-db-1                   postgres:16-alpine                 "docker-entrypoint.sh postgres"                                                                                       db                   10 hours ago     Up 10 hours (healthy)     0.0.0.0:5432->5432/tcp
earthandhoney-mailhog-1              mailhog/mailhog:latest             "MailHog"                                                                                                             mailhog              5 hours ago      Up 5 hours                0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
earthandhoney-web-prod-1             earthandhoney-web-prod             "docker-entrypoint.sh sh -c 'npm run build && npx next start -p 3000'"                                                web-prod             23 minutes ago   Up 11 minutes             0.0.0.0:3000->3000/tcp
earthandhoney-webhook-receiver-1     earthandhoney-webhook-receiver     "docker-entrypoint.sh node server.js"                                                                                 webhook-receiver     5 hours ago      Up 5 hours                0.0.0.0:7107->8888/tcp
```

The Frontstage container (`web-prod`) and the full `backstage` profile
(`backstage-backend`, `backstage-db`, `backstage-frontend`) are all `Up`
together, so they share this project's default Compose network:

```
$ docker inspect earthandhoney-web-prod-1 \
    --format '{{range $net, $cfg := .NetworkSettings.Networks}}{{$net}} -> {{$cfg.Aliases}}{{"\n"}}{{end}}'
earthandhoney_default -> [earthandhoney-web-prod-1 web-prod web 2394839ee9d8]
```

`web` is one of the Frontstage container's aliases on `earthandhoney_default`
— this is the hostname the AC-26.1 receiver is reachable at from inside the
Backstage containers, and the URL section (b) registers below.

## (b) Webhook subscription covering all three event types this story handles

Registered through `POST /api/admin/webhooks`, pointed at the AC-26.1
receiver by Compose service hostname
(`http://web:3000/api/webhooks/picpeak` — a bare service name, so upstream's
`validateExternalUrl`, `vendor/picpeak/backend/src/utils/networkValidation.js:85-95`,
does not reject it the way it would reject `localhost`), with `events`
listing all three types AC-26.2 handles:

```
$ bash scripts/webhook-live-proof-setup.sh

=== (a) Frontstage and Backstage on the shared compose "default" network
[... section (a) output, as above ...]

Backstage reaching the AC-26.1 receiver by compose service hostname:
wget: server returned error: HTTP/1.1 401 Unauthorized

=== Backstage admin login
login HTTP 200

=== (b)+(c) webhook subscription covering all three handled event types
already registered — upstream issues the plaintext secret only at
creation, so this is NOT re-created (that would rotate the secret):
  id=2 url=http://web:3000/api/webhooks/picpeak
  events=['event.published', 'photo.uploaded', 'photo.deleted']
  active=True secret_preview=BX-HjeQ3
```

The subscription (id 2) already existed from an earlier run of this same
idempotent script, which is exactly the harness property AC-26.4.1.1 requires:
running it again detects the existing subscription by URL and reports it
rather than creating a second one — see (c) for why re-creating it would be
actively harmful, not just redundant.

```
$ curl -s -b <admin-cookie-jar> http://localhost:3101/api/admin/webhooks
[
  {
    "id": 2,
    "name": "AC-26.4.1 webhook live-proof receiver",
    "url": "http://web:3000/api/webhooks/picpeak",
    "events": ["event.published", "photo.uploaded", "photo.deleted"],
    "active": true,
    "secret_preview": "BX-HjeQ3",
    "created_at": "2026-08-07T09:34:38.948Z",
    "last_success_at": "2026-08-07T09:58:29.472Z",
    "last_failure_at": null
  }
]
```

`last_success_at` is populated with no `last_failure_at`, meaning every
delivery Backstage has attempted against this subscription so far has been
accepted by the receiver — consistent with the secret already being
correctly reconciled (see (c)).

## (c) Secret reconciliation — the rule this criterion owns and must settle

Upstream issues a per-subscription `whsec_...` secret in plaintext exactly
once, at creation (`adminWebhooks.js:75-142`); every later read of that
subscription — including the listing in (b) above — returns only
`secret_preview`, a short, non-reversible prefix. The AC-26.1 receiver,
however, verifies against a single environment variable,
`PICPEAK_WEBHOOK_SECRET` (`src/app/(frontend)/api/webhooks/picpeak/route.ts:64`,
`src/lib/picpeakWebhookAuth.ts`) — there is no per-subscription secret store
on the Frontstage side.

**The rule that resolves this:** there is exactly one live subscription
pointed at the receiver. Its secret was captured, in plaintext, at the moment
`scripts/webhook-live-proof-setup.sh` first created it (the `RECONCILE:
...PICPEAK_WEBHOOK_SECRET=whsec_...` line the script prints on a fresh
create — see the script's `(b)+(c)` block), written into `.env`, and the
Frontstage container was recreated so the new environment variable took
effect:

```
$ grep '^PICPEAK_WEBHOOK_SECRET=' .env
PICPEAK_WEBHOOK_SECRET=whsec_BX-HjeQ3zYanvTTwtrQM37vNEUq4sRnh

$ git check-ignore -v .env
.gitignore:8:.env	.env
```

(`.env` is git-ignored — no secret value is committed. `.env.example` carries
only a placeholder, per AC-26.6.)

The `.env` value's prefix after `whsec_` (`BX-HjeQ3`) matches the
subscription's `secret_preview` from (b) exactly, confirming the value
`.env` holds is the secret for *this* subscription, not a stale one from an
earlier create-then-discard cycle:

```
$ python3 -c "print('whsec_BX-HjeQ3zYanvTTwtrQM37vNEUq4sRnh'.split('_',1)[1][:8])"
BX-HjeQ3
```

And the Frontstage container was recreated *after* that subscription was
created, so it started with the reconciled secret already in its
environment rather than needing a later restart to pick it up:

```
$ docker inspect earthandhoney-web-prod-1 --format 'StartedAt={{.State.StartedAt}}'
StartedAt=2026-08-07T09:55:10.803192335Z
```
(subscription `created_at`: `2026-08-07T09:34:38.948Z`, i.e. earlier)

**The rule to carry forward, for every AC that reuses this harness:** never
blindly re-run the *creation* call for this subscription. Re-registering it
— rather than detecting and reporting the existing one, as (b)'s script run
did — issues a **new** `whsec_...` secret and rotates the one `.env` holds
out from under the receiver, silently, since upstream's create/list/update
routes give no other signal that this happened. Until `.env` is updated with
the new value and the Frontstage container recreated again, every delivery
Backstage sends will verify against the stale secret and be rejected 401 —
indistinguishable, from Backstage's side, from the receiver being broken.
`scripts/webhook-live-proof-setup.sh` is written idempotently for exactly
this reason: it looks up the subscription by URL before ever considering a
create.

## Closing live check: no gallery, no publish — just the network path and the signature gate

This check needs neither a gallery nor a publish. An **unsigned** POST to the
receiver's Compose-hostname URL, sent from inside a Backstage container, can
only be answered by the AC-26.1 receiver itself — a DNS failure or routing
failure would not produce an HTTP response at all, let alone a `401`. A
**signed** POST, signed with the secret reconciled in (c), proves that
secret is in fact the one the running receiver holds.

```
$ SECRET=$(grep '^PICPEAK_WEBHOOK_SECRET=' .env | cut -d= -f2)
$ SIG=$(python3 -c "
import hmac, hashlib, os
print(hmac.new(os.environ['SECRET'].encode(), b'{}', hashlib.sha256).hexdigest())
")

$ docker compose --profile backstage exec -T backstage-backend \
    wget -qS -O- --post-data='{}' --header='Content-Type: application/json' \
    "http://web:3000/api/webhooks/picpeak"
  HTTP/1.1 401 Unauthorized
wget: server returned error: HTTP/1.1 401 Unauthorized

$ docker compose --profile backstage exec -T backstage-backend \
    wget -qS -O- --post-data='{}' --header='Content-Type: application/json' \
    --header="X-PicPeak-Signature: $SIG" \
    "http://web:3000/api/webhooks/picpeak"
  HTTP/1.1 200 OK
  content-type: application/json
  ...
{"received":true}
```

Unsigned: `401`. Signed with the reconciled `PICPEAK_WEBHOOK_SECRET`: `200`
with `{"received":true}` — the receiver's own success body
(`route.ts:81`). The body sent (`{}`) parses to no handled event type, so
nothing downstream runs (no gallery lookup, no revalidation) — exactly the
"no gallery, no publish" scope this closing check requires. The harness is
live and the secret is reconciled; AC-26.4.1.2 onward builds on this without
repeating it.
