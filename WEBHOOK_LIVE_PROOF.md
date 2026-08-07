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

## (e) AC-26.4.1.3.1 — the read-only observation machinery, proven live before the one-way publish

`scripts/ac26.4.1-live-proof.sh` performs its actual publish through
`POST /api/admin/events/:id/publish`, a one-way transition the pinned fork
gives no un-publish route for (`adminEvents.js:1049`). Everything else the
script does to observe the result — resolving the subscription id, resolving
each gallery's numeric id, reading the served proof page, and reading a
webhook delivery back — is read-only and repeatable. This section runs that
read-only half against the running stack and records its real output, so a
parsing or lookup bug in the observation code is found here, before it can
consume a fixture that publish's one-way nature would then require deleting
and recreating.

### Pre-run finding: the proof fixtures were published out of order again

Before this criterion's own read-only run, the two proof galleries AC-26.4.1.2
recorded as fresh drafts (ids 8 and 9) were checked again and found already
**published** — the same out-of-order-consumption pattern section (d)'s own
"Pre-run finding" already hit once, recurring because another live run of the
downstream reproduction happened between that recording and this one:

```
$ curl -s -b <admin-cookie-jar> 'http://localhost:3101/api/admin/events?limit=200' \
    | python3 -c "import json,sys
d = json.load(sys.stdin)
for e in d.get('events', d):
    if 'ac-26-4-1-webhook-live-proof' in (e.get('slug') or ''):
        print(e['id'], e['slug'], 'is_draft=', e.get('is_draft'))"
17 wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21 is_draft= False
16 wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20 is_draft= False
```

(ids had already advanced from 8/9 to 16/17 by the time of this check — an
earlier reset cycle this document does not separately narrate — but the
`is_draft: False` finding is what matters here.) Fixed the same way section
(d) established: delete both through the supported admin route, then re-run
the idempotent setup harness to recreate them fresh.

```
$ curl -s -b <admin-cookie-jar> -X DELETE 'http://localhost:3101/api/admin/events/16'
{"message":"Event deleted successfully"}
$ curl -s -b <admin-cookie-jar> -X DELETE 'http://localhost:3101/api/admin/events/17'
{"message":"Event deleted successfully"}

$ bash scripts/webhook-live-proof-setup.sh
[... sections (a)-(c) output, unchanged from above ...]

=== (d) the two draft Backstage galleries the publish proof transitions
{"id":18,"slug":"wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20", ..., "is_draft":true, ...}
create gallery HTTP 200
verified created slug wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20: True
{"id":19,"slug":"wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21", ..., "is_draft":true, ...}
create gallery HTTP 200
verified created slug wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21: True

=== (d) the matching Payload gallery-placements documents
skip (already exists): wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20 -> placement id 4
skip (already exists): wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21 -> placement id 5

=== HARNESS READY
```

Fresh galleries, ids 18 and 19, `is_draft: true` on both — the state the
read-only run below requires. This is the exact recovery named at the end of
this section, for AC-26.4.1.3 and AC-26.4.2 to reuse if a *publish* run fails
partway rather than a *read-only* one.

### (e)(i) The script's read-only functions, exercised end to end against the running stack

Each command below is the literal body of the named function from
`scripts/ac26.4.1-live-proof.sh`, run under `bash` (its own shebang
interpreter — the functions rely on bash's word-splitting behaviour for
`for id in $ids`, which does not hold under every shell) against the fresh
fixtures ids 18/19 above.

**Backstage admin login:**

```
$ curl -s -c <cookie-jar> -X POST http://localhost:3101/api/auth/admin/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"admin","password":"change-me-in-production"}' \
    -o /dev/null -w 'login HTTP %{http_code}\n'
login HTTP 200
```

**`subscription_id()` — resolved from the receiver URL, not hardcoded:**

```
$ curl -s -b <cookie-jar> http://localhost:3101/api/admin/webhooks | jqpy '
subs = json.load(sys.stdin)
subs = subs.get("webhooks", subs) if isinstance(subs, dict) else subs
for s in subs:
    if s.get("url") == "http://web:3000/api/webhooks/picpeak":
        print(s["id"]); sys.exit(0)
sys.exit(1)'
2
```

**`event_id_for_slug()` — resolved from each proof slug, both still `is_draft: true`:**

```
$ event_id_for_slug "wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20"
18
$ event_id_for_slug "wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21"
19

$ curl -s -b <cookie-jar> 'http://localhost:3101/api/admin/events?limit=200' \
    | python3 -c "import json,sys
d = json.load(sys.stdin)
for e in d.get('events', d):
    if e.get('id') in (18, 19):
        print(e['id'], e['slug'], 'is_draft=', e.get('is_draft'))"
19 wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21 is_draft= True
18 wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20 is_draft= True
```

**`page_state()` — the served `/dev/gallery-webhook-proof` page, read through the
script's own `data-` attribute extraction, with the response's cache headers:**

The very first read after (e)'s fixture recreation above still returned
`photos=0` for both slugs — a leftover render cached under the *same* slugs
from the just-deleted galleries (ids 16/17), `x-nextjs-cache: STALE`. This is
the same caching behaviour section (d) already recorded, so it is expected,
not a defect: the page's own `revalidate = 60` needed to elapse before a
request would trigger a fresh render.

```
$ curl -sD - 'http://localhost:3000/dev/gallery-webhook-proof' -o /dev/null \
    | grep -iE '^(HTTP|content-type|x-nextjs)'
HTTP/1.1 200 OK
x-nextjs-cache: STALE
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
Content-Type: text/html; charset=utf-8

$ page_state "wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20"
photos=0
$ page_state "wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21"
photos=0
```

Polling `page_state` once every 10s, both slugs settled to `unavailable`
after 10s — the route's own background regeneration completing, well inside
the 90s pre-state settle window `publish_and_prove` itself budgets for this
exact situation:

```
$ curl -sD - 'http://localhost:3000/dev/gallery-webhook-proof' -o /dev/null \
    | grep -iE '^(HTTP|content-type|x-nextjs)'
HTTP/1.1 200 OK
x-nextjs-cache: HIT
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
Content-Type: text/html; charset=utf-8

$ page_state "wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20"
unavailable
$ page_state "wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21"
unavailable
```

Both slugs read `unavailable` through the script's own extraction, served
with `x-nextjs-cache: HIT` — the same combination section (d) already
recorded and flagged as worth checking explicitly rather than assumed.

**The delivery read-back path — list, then one row's detail:**

`GET /api/admin/webhooks/:id/deliveries` selects a fixed column set that
excludes `payload` (`adminWebhooks.js:283-325`):

```
$ curl -s -b <cookie-jar> 'http://localhost:3101/api/admin/webhooks/2/deliveries?limit=50' \
    | python3 -m json.tool
{
    "deliveries": [
        {
            "id": 52,
            "event_type": "event.published",
            "attempt_count": 1,
            "status": "success",
            "response_status": 200,
            "latency_ms": 14,
            "next_retry_at": null,
            "created_at": "2026-08-07T12:43:48.468Z",
            "completed_at": "2026-08-07T12:43:52.376Z",
            "last_error": null
        },
        {
            "id": 51,
            "event_type": "event.published",
            ...
        },
        ... (39 rows total, none carrying a "payload" key)
    ]
}
```

Reading two of those rows back individually through
`GET /api/admin/webhooks/:id/deliveries/:deliveryId` does return `payload`,
each containing the gallery slug the script's own `delivery_line()` matches
against — these two rows are historical `event.published` deliveries for the
same slugs from the galleries just deleted in the pre-run finding above (ids
16/17, before they became 18/19), which is exactly why the script matches by
**slug found inside the payload** rather than by the delivery's or gallery's
numeric id: the id churns across a fixture reset, the slug does not.

```
$ curl -s -b <cookie-jar> 'http://localhost:3101/api/admin/webhooks/2/deliveries/51' \
    | python3 -m json.tool
{
    "id": 51,
    "webhook_id": 2,
    "event_type": "event.published",
    "payload": {
        "id": "3980954f-06a8-4202-bd49-eb4a9d3a08f3",
        "data": {
            "event": {
                "id": 16,
                "slug": "wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20",
                ...
            }
        },
        "type": "event.published",
        "created_at": "2026-08-07T12:43:43.220Z"
    },
    "attempt_count": 1,
    "status": "success",
    "response_status": 200,
    "response_body": "{\"received\":true}",
    ...
}

$ curl -s -b <cookie-jar> 'http://localhost:3101/api/admin/webhooks/2/deliveries/52' \
    | python3 -m json.tool
{
    "id": 52,
    "webhook_id": 2,
    "event_type": "event.published",
    "payload": {
        "id": "146e6d2a-c21a-4956-a7f8-8c3a2c6c5a8f",
        "data": {
            "event": {
                "id": 17,
                "slug": "wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21",
                ...
            }
        },
        "type": "event.published",
        ...
    },
    "attempt_count": 1,
    "status": "success",
    "response_status": 200,
    "response_body": "{\"received\":true}",
    ...
}
```

Running the script's own `delivery_line()` function against both slugs
confirms the match logic itself, not just the two raw reads above:

```
$ delivery_line 2 "wedding-ac-26-4-1-webhook-live-proof-gallery-2026-09-20"
id=51 event_type=event.published status=success response_status=200 attempts=1 latency_ms=12 last_error=None
$ delivery_line 2 "wedding-ac-26-4-1-webhook-live-proof-gallery-two-2026-09-21"
id=52 event_type=event.published status=success response_status=200 attempts=1 latency_ms=14 last_error=None
```

Every step above matched what `scripts/ac26.4.1-live-proof.sh` already
expects — `subscription_id()`, `event_id_for_slug()`, `page_state()`, and
`delivery_line()` all ran unmodified and produced the output their own
callers (`publish_and_prove`, `await_page_state`, `await_delivery_success`)
already assume. No script correction was needed. No gallery was published by
this section: both fixtures (ids 18/19) remain `is_draft: true`, undisturbed,
for AC-26.4.1.3 to transition.

### Recovery: the fixture-reset procedure a failed publish run falls back to

The pre-run finding above re-used, verbatim, the procedure AC-26.4.1.2's own
"Pre-run finding" established in section (d). Naming it here once, so
AC-26.4.1.3 and AC-26.4.2 can point back to it instead of re-describing it:
if a publish run against either proof gallery fails partway — publish
succeeds but the delivery never reaches `success`, or the page never settles
— the fixture is left in a state no supported route can undo (no un-publish
route exists). The recovery is:

1. `DELETE /api/admin/events/:id` for both proof galleries (id from
   `event_id_for_slug()`, as above).
2. Re-run `scripts/webhook-live-proof-setup.sh`, which idempotently recreates
   both galleries as fresh drafts (new ids, same slugs) and detects the
   existing Payload `gallery-placements` documents and webhook subscription
   rather than duplicating either.
