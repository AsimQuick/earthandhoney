# WEBHOOK_LIVE_PROOF.md

Live-proof harness for US-26 AC-26.4: Backstage-to-Frontstage webhook
revalidation, proven against the running stack rather than mocked. This
document opens with the harness's **connective tissue** — stood up once here
(AC-26.4.1.1) and reused, not rebuilt, by AC-26.4.1.2 (publish fixtures),
AC-26.4.1.3 (publish + reproduction), AC-26.4.2 (photo upload), and
AC-26.4.3 (photo delete).

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

## (d) The publish proof's fixtures — two draft galleries and their Payload placements

AC-26.4.1.2's own scope: reusing the harness above without rebuilding it,
create the two draft Backstage galleries the publish proof (AC-26.4.1.3)
transitions, and the matching Payload `gallery-placements` record for each.
Nothing here is published — `is_draft: true` on both, precisely so
AC-26.4.1.3's publish call is a real state transition and not something
this criterion already did for it. This is `scripts/webhook-live-proof-setup.sh`'s
`(d)` block, the same idempotent script (a)-(c) above were captured from.

### Pre-run finding: the fixtures had already been consumed out of order

Before running the harness's `(d)` block, both proof gallery slugs already
existed live — but as **published** galleries (`is_draft: false`), left over
from an earlier session that ran the full downstream reproduction
(`scripts/ac26.4-live-proof.sh`, recorded in `PIVOT_AUDIT.md`'s `## AC-26.4`
section) before this criterion had stood the fixtures up:

```
$ curl -s -b <admin-cookie-jar> 'http://localhost:3101/api/admin/events?limit=200' \
    | python3 -c "import json,sys
d = json.load(sys.stdin)
for e in d.get('events', d):
    if 'ac-26-4-1-webhook-live-proof' in (e.get('slug') or ''):
        print(e['id'], e['slug'], 'is_draft=', e.get('is_draft'))"
7 wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20 is_draft= False
6 wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21 is_draft= False
```

Both already-published, both already carrying an upload/delete history from
that earlier run. The pinned fork's publish route is a one-way
draft→live transition with no un-publish route (`adminEvents.js:1049`), so
there is no supported way to put an already-published gallery back into
draft — the only honest fix is to delete those two galleries outright,
through the same supported admin route the rest of this harness uses, and
let the idempotent `(d)` block recreate them fresh:

```
$ curl -s -b <admin-cookie-jar> -X DELETE 'http://localhost:3101/api/admin/events/6'
{"message":"Event deleted successfully"}
$ curl -s -b <admin-cookie-jar> -X DELETE 'http://localhost:3101/api/admin/events/7'
{"message":"Event deleted successfully"}
```

This does not touch the earlier recorded proof — `PIVOT_AUDIT.md`'s
`## AC-26.4` section is a transcript of a run that already happened and
stays as written. It only clears the live fixtures back to a state
AC-26.4.1.2 can honestly build from, matching the "fix directly through the
supported interface, and record the finding" discipline that section's own
"Pre-run finding" already established for this document family.

### The harness's `(d)` block, re-run clean

```
$ bash scripts/webhook-live-proof-setup.sh

=== (a) Frontstage and Backstage on the shared compose "default" network
[... sections (a)-(c) output, unchanged from above ...]

=== (d) the two draft Backstage galleries the publish proof transitions
{"id":8,"slug":"wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20","event_name":"ac-26-4-1-webhook-live-proof-gallery","event_type":"wedding","customer_name":"AC-26.4.1 Verification","customer_email":"ac26-4-1-webhook@example.com","require_password":false,"photo_cap":null,"is_draft":true,"share_link":"/gallery/wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20/aaa51af369d6b825ee3f20ca0386aeae","expires_at":"2026-10-20T00:00:00.000Z","created_at":"2026-08-07T11:59:48.709Z"}
create gallery HTTP 200
verified created slug wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20: True
{"id":9,"slug":"wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21","event_name":"ac-26-4-1-webhook-live-proof-gallery-two","event_type":"wedding","customer_name":"AC-26.4.1 Verification","customer_email":"ac26-4-1-webhook@example.com","require_password":false,"photo_cap":null,"is_draft":true,"share_link":"/gallery/wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21/bbe95590d81dbefc7d504097619b81ef","expires_at":"2026-10-21T00:00:00.000Z","created_at":"2026-08-07T11:59:49.142Z"}
create gallery HTTP 200
verified created slug wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21: True

=== (d) the matching Payload gallery-placements documents
skip (already exists): wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20 -> placement id 4
skip (already exists): wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21 -> placement id 5

=== HARNESS READY
```

Both galleries created fresh (`is_draft: true`, new ids 8 and 9 — the old
6 and 7 are gone), each read back by slug to confirm upstream's
name+date-derived slug matches what the rest of the harness names, exactly
as the script's own header documents. `POST /api/admin/events` returned
`HTTP 200` on a freshly recreated `backstage-backend` container without the
`EACCES: permission denied, mkdir '/storage'` upstream defect
`PIVOT_AUDIT.md`'s `## AC-17.5.1` / `## AC-17.7` sections record — the
one-time `mkdir -p /storage && chown -R nodejs:nodejs /storage` fix already
recorded there was still in effect, so it did not need re-applying this run.

The Payload `gallery-placements` documents (ids 4 and 5) already existed
from AC-26.4.1.1's own earlier run of this same script and were correctly
detected and skipped rather than duplicated — placement records key on
gallery **slug**, not the underlying Backstage gallery id, so recreating the
galleries above with the same slugs left these placements pointed at the
right fixtures without needing to touch them.

### The named Frontstage page, live, in its pre-publish state

`WEBHOOK_LIVE_PROOF_GALLERY_PATH` (`/dev/gallery-webhook-proof`,
`src/lib/galleryRevalidation.ts`) is cached with `revalidate = 60`
(`src/app/(frontend)/dev/gallery-webhook-proof/page.tsx`), so the request
immediately after recreating the galleries above still served the prior
render; the check below was taken after that 60-second window passed, so it
reflects Backstage's current state rather than a leftover cache entry:

```
$ curl -sD - 'http://localhost:3000/dev/gallery-webhook-proof' -o /tmp/proof-page.html \
    | grep -iE '^(HTTP|content-type|x-nextjs)'
HTTP/1.1 200 OK
x-nextjs-cache: HIT
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
Content-Type: text/html; charset=utf-8

$ grep -oE 'data-testid="webhook-proof-[a-z]+"|data-gallery-slug="[^"]*"' /tmp/proof-page.html
data-testid="webhook-proof-unavailable"
data-gallery-slug="wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20"
data-testid="webhook-proof-unavailable"
data-gallery-slug="wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21"

$ python3 -c "
import re
html = open('/tmp/proof-page.html').read()
for m in re.finditer(r'<section.*?</h2>', html, re.S):
    print(m.group(0))
    print('---')
"
<section aria-label="Live-proof gallery wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20" data-testid="webhook-proof-unavailable" data-gallery-slug="wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20" class="w-full px-8"><h2 class="pb-4 text-2xl font-normal tracking-[3px] uppercase">wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20<!-- --> — unavailable</h2>
---
<section aria-label="Live-proof gallery wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21" data-testid="webhook-proof-unavailable" data-gallery-slug="wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21" class="w-full px-8"><h2 class="pb-4 text-2xl font-normal tracking-[3px] uppercase">wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21<!-- --> — unavailable</h2>
---
```

Both proof galleries render `data-testid="webhook-proof-unavailable"`
(`GalleryUnavailablePlaceholder`, `page.tsx`'s draft branch) — the page's
honest pre-publish state, driven by `resolveGalleryPlacementImages` reading
Backstage's real `is_draft: true` for both galleries, not a mock. Nothing
was published to produce this: no `/publish` call appears anywhere above —
that state transition is AC-26.4.1.3's to make and to prove. AC-26.4.1.3
reuses these two fixtures (ids 8 and 9) without recreating them.
