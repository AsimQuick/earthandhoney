<!--
---
file: R2_STORAGE_AND_DELIVERY_ADR.md
project: earthandhoney
purpose: AC-19.5 — opens this document with the delivery-path decision
         explicitly marked UNDECIDED, listing the candidate paths to be
         benchmarked next sprint, the measurements that will decide between
         them, and the performance targets the decision is accountable to.
         No path is chosen here by preference.
         AC-19.4 — records the audit of the existing Cloudflare R2 setup:
         which bucket is in use, whether its permissions are least-privilege,
         whether browser upload access is correctly restricted, what
         lifecycle rules exist, and which paths are public versus private.
created-by: dev-team
related-story: US-19
related-ac: 19.4, 19.5
updated-by: dev-team
related-story: US-29
related-ac: 29.2.1
updated-by: dev-team
related-story: US-29
related-ac: 29.2.3
updated-by: dev-team
related-story: US-29
related-ac: 29.3
updated-by: dev-team
related-story: US-29
related-ac: 29.4
updated-by: dev-team
related-story: US-29
related-ac: 29.5
---
-->

# R2 Storage and Delivery ADR

## Delivery path decision — UNDECIDED (AC-19.5)

**Status: UNDECIDED.** No delivery path has been chosen. This decision is
deferred to a benchmark planned for the next sprint, and no agent may choose
a path by preference before that benchmark exists — the candidates below are
listed to be measured, not ranked.

### Candidate paths to be benchmarked

1. **Serving through the Backstage** — the PicPeak/Backstage Express app
   proxies every gallery-delivery request itself (as the token-gated
   `protectedImages.js` route already does for protected client galleries),
   R2 is never reached directly by a client.
2. **Direct time-limited links** — the browser is handed a short-TTL
   presigned R2 `getObject` URL (the mechanism `S3StorageBackend.signedUrl`
   already implements for the zip-download and admin-backup flows) and
   fetches the object straight from R2.
3. **Public delivery through a content-network (CDN) domain** — a CDN
   fronts the bucket (or a public/custom domain) for already-public
   portfolio/blog imagery, caching at the edge instead of round-tripping to
   origin per request.
4. **An edge authorisation layer** — a Cloudflare Worker (or equivalent)
   sits in front of R2, performs the authorisation check at the edge, and
   only then serves (or redirects to) the object, combining the caching
   benefit of a CDN path with the access control of an app-mediated one.
5. **A hybrid** — some combination of the above by context, e.g. Backstage-
   mediated serving for private/protected client galleries and CDN or edge
   delivery for already-public portfolio/blog galleries.

### Candidate mechanism map (AC-29.2.1)

**Scope of this subsection.** This is confirmation work, not discovery and not
measurement: no browser is run, no image is built. Every claim below was
checked directly against the pinned fork and this repository's working tree
rather than trusted from the unsplit AC-29.2's premise that "both mechanisms
already exist" — that premise turns out to be only half true, in a more
specific way than expected: it understates candidate 1's readiness problem as
much as candidate 2's.

#### Path 1 — serving through the Backstage

The mechanism exists and is real code. `GET /:slug/photos`
(`vendor/picpeak/backend/src/routes/gallery.js`, mounted at `/api/gallery` —
`vendor/picpeak/backend/server.js:446`) builds `thumbnail_url`, `hero_url` and
`preview_url` per photo (`gallery.js:516`, `518`, `525-528`).
`src/components/gallery/backstageGalleryMapper.ts:61-63` maps those three
fields onto the Gallery Engine's `thumbnailUrl`/`mediumUrl`/`largeUrl` tiers in
that order, and `src/components/gallery/galleryImageLoader.ts`'s
`resolveGalleryImageSrc` (`galleryImageLoader.ts:21-29`) picks among them by
requested width.

This is a **different route** from the one the ADR's own candidate-1 wording
above points at. `protectedImages.js` is mounted separately, at `/api/images`
(`server.js:552`), and issues a single-photo signed application token
(`protectedImages.js:236-237`) served by its own
`GET /:slug/photo/:photoId/signed/:token` route (`protectedImages.js:253`).
The two benchmark pages (`src/app/(frontend)/dev/benchmark-portfolio-gallery`,
`benchmark-story-gallery`) fetch through `resolveGalleryPlacementImages` ->
`backstageGalleryMapper`, i.e. the public `/api/gallery/:slug/photos` path —
**never** `protectedImages.js`. Candidate 1, as actually benchmarked, is the
public photos path, not the token-gated proxy the ADR names it after.

**Whether the already-committed AC-29.1.3 runs may be cited as path 1's
measurement: no, on the evidence in this checkout.** Two separate problems,
found by opening the JSON rather than trusting file names:

1. The two runs AC-29.1.3 actually committed —
   `run-2026-08-08T14-51-01-229Z.json` and `run-2026-08-08T14-52-16-271Z.json`
   — record `transferBytes: 83` for both gallery `<img>` requests on every
   page/run (`/api/gallery/us-25-ac-25.5-placement-demo/hero/22` and `/hero/23`).
   83 bytes is the length of Express's `{"message":"Route not found"}` 404
   body, not a real derivative — these two committed runs measured a missing
   route, not a photograph, and cannot be cited as path-1 evidence as they
   stand.
2. Two further, **uncommitted** files also exist —
   `run-2026-08-08T15-29-04-854Z-backstage-proxy.json` and
   `run-2026-08-08T15-30-06-730Z-backstage-proxy.json` — showing real-looking
   `transferBytes: 8183` and a top-level `"deliveryPath": "backstage-proxy"`
   field. Neither can have been produced by the harness as it exists in this
   checkout: `scripts/benchmark/run.ts:114-119` writes only
   `{generatedAt, baseUrl, runsPerPage, pages}` — no `deliveryPath` key — to a
   file named `run-${timestamp}.json` with no candidate suffix, and
   `run.ts` (checked in full) contains zero references to any delivery-path
   selection logic. Nor does anything else in the working tree implement the
   `/api/gallery/*`-on-the-Next.js-origin -> Backstage-backend proxy those
   bytes would require: `next.config.ts` defines no `rewrites()` at all and is
   byte-identical to the version `git show HEAD:next.config.ts` returns (no
   working-tree edit exists to have been reverted); `docker-compose.yml`'s
   `web-benchmark` (lines 217-241) and `lighthouse-benchmark` (243-257)
   service blocks proxy nothing; and grepping every route under
   `src/app/(frontend)/` for a `gallery`-matching handler or `middleware.ts`
   finds none. These two files cannot be reproduced from anything present in
   this repository and must not be cited as evidence.

**Conclusion: path 1 has no usable measurement on record.** Its own
`/api/gallery/*`-reachability gap is exactly what problem 1 already caught —
so a fresh path-1 run today would 404 the same way the committed AC-29.1.3
runs did, unless that gap is closed first. AC-29.2.2 must both close it and
produce a real run before this ADR's path-1 numbers can be written.

#### Path 2 — direct time-limited presigned R2 links

The signing primitive is real: `S3StorageBackend.signedUrl`
(`vendor/picpeak/backend/src/services/storage/S3StorageBackend.js:146-148`).
But grepping `vendor/picpeak/backend` for every `signedUrl(` call finds
exactly three matches total: the two method definitions
(`S3StorageBackend.js:146`, `LocalFsStorage.js:158`) and **one** call site —
the download-all ZIP branch (`gallery.js:904-916`), gated on
`req.event.allow_presigned_download` (`904`), `storage.kind() === 's3'`
(`906`) and watermarking being off for the event (`905-906`), which
`res.redirect(302, url)`s a single ZIP object (`915`), not a photo. There are
zero other callers, including zero test callers, and **no per-photo
presigned view route exists anywhere in `vendor/picpeak/backend/src/routes/`.**
`LocalFsStorage.signedUrl` throws by design
(`LocalFsStorage.js:158-160`, "Set `STORAGE_BACKEND=s3` to use presigned
URLs"), so any measurement needs `STORAGE_BACKEND=s3`, which
`docker-compose.yml:101-108` already sets for `backstage-backend`.

The fork's own comment at `gallery.js:898-903` records what this branch gives
up: presigned bytes bypass the backend entirely, so no watermark is ever
applied when it fires (`901-902`). It does write one `access_logs` row
(`909-914`, `action: 'download_all_presigned'`) before redirecting — so the
*request that generates* the presigned URL is logged — but nothing logs the
subsequent direct-to-R2 byte fetch itself, since R2 is not in the logging
path once the redirect has happened. That gap is AC-29.5's problem; it is
recorded here only because confirming candidate 2's mechanism is what
surfaced it.

**Smallest change that would make path 2 measurable end-to-end, and its
cost.** The mechanism candidate 2 needs already exists in the fork
(`S3StorageBackend.signedUrl`), so nothing under `vendor/picpeak` needs to
change — this is additive, application-layer only, and carries no
`FORK_CHANGELOG.md` entry. Roughly two-thirds of that application-layer
change already exists, **uncommitted, in this working tree**, left behind by
the unsplit AC-29.2 attempt this AC was carved out to precede:

- `src/lib/benchmark/deliveryPathImages.ts` — pure `applyDeliveryPath()`
  swap of the thumbnail/medium/large tiers.
- `src/lib/benchmark/resolveBenchmarkDeliveryPath.ts` — reads
  `BENCHMARK_DELIVERY_PATH` and a generated URL map off disk.
- `scripts/benchmark/presign-r2-urls.sh` — calls the fork's own
  `getStorage().signedUrl()` inside the `backstage-backend` container (no
  AWS SDK dependency added to this repo) and has already produced
  `scripts/benchmark/presign-data/presigned-image-map.json` once in this
  working tree.
- `src/lib/benchmark/redactSignedUrls.ts`,
  `src/lib/benchmark/observedDeliveryPath.ts` — reporting/safety helpers.

None of it is wired in, though. `src/app/(frontend)/dev/benchmark-portfolio-gallery/page.tsx`
calls only `resolveGalleryPlacementImages` — no call to `applyDeliveryPath` or
`currentBenchmarkDeliveryPath` anywhere on either benchmark page.
`scripts/benchmark/run.ts` has zero references to any of the four modules
above. `docker-compose.yml`'s `web-benchmark` and `lighthouse-benchmark`
blocks define no `BENCHMARK_DELIVERY_PATH` env var and no `presign-data`
volume mount, both of which `resolveBenchmarkDeliveryPath.ts`'s own docblock
assumes already exist. **One-session estimate: yes**, on the condition that
the session budgets for path 1's shared `/api/gallery/*` origin gap too —
both candidates' benchmark pages render through the same placement pipeline,
and an unfixed origin gap would corrupt a path-2 run's non-swapped tiers
exactly as it corrupted path 1's runs above.

**A specific claim not to carry forward.** `scripts/benchmark/results/CANDIDATE_COVERAGE.md`
(also uncommitted) currently marks both candidates "Measured," citing, for
candidate 2, `run-2026-08-08T15-31-59-072Z-presigned-r2.json` and
`run-2026-08-08T15-33-01-345Z-presigned-r2.json`. Neither file exists:
`scripts/benchmark/results/` contains exactly four `run-*.json` files, none
with a `presigned-r2` suffix. Its candidate-1 citation is the same
unreproducible pair addressed above. This file is exactly the kind of
premature "already exists" claim AC-29.2.1 exists to catch before another
session is sent to measure against it.

### Candidate disposition — paths 3, 4 and 5 (AC-29.2.3)

**Scope of this subsection.** Candidates 1 and 2 are measured — the committed numbers live in
`scripts/benchmark/results/MEASURED_PATHS.md` (AC-29.2.2.3) and AC-29.3 restates them in this ADR.
This subsection dispositions the remaining three: **a closed set of exactly three, not an open
survey.** Every one of the five candidates named above under "Candidate paths to be benchmarked"
carries exactly one disposition below, drawn from a closed vocabulary — `measured` or
`unmeasured — prerequisite named` — never left unstated and never estimated from another
candidate's numbers.

| Candidate | Disposition |
| --- | --- |
| 1 — Serving through the Backstage | measured — see `MEASURED_PATHS.md` (AC-29.2.2.3) |
| 2 — Direct time-limited links | measured — see `MEASURED_PATHS.md` (AC-29.2.2.3) |
| 3 — Public delivery through a CDN/custom domain | unmeasured — prerequisite named below |
| 4 — An edge authorisation layer (Worker) | unmeasured — prerequisite named below |
| 5 — A hybrid | unmeasured — prerequisite named below |

#### Candidate 3 — public delivery through a CDN/custom domain

**Disposition: unmeasured.** **Blocking prerequisite:** a Cloudflare custom domain, or a public
bucket binding ("Public Development URL"), configured in front of the `earthandhoney` R2 bucket
AC-19.4 identified above (§"1. Which bucket is in use"). AC-19.4's own audit (§"5. Which paths are
public versus private") found `.env.example`, `docker-compose.yml` and every consumer's source
grepped clean of any `R2_PUBLIC_URL`/`PUBLIC_URL`/`r2.dev`/`CDN_URL`/`CUSTOM_DOMAIN`-shaped
variable, and left as an open item that the dashboard-only public-access toggle itself has not been
confirmed off. Nothing in this project exposes the bucket publicly today, so there is no
CDN/custom-domain edge to measure a candidate-3 page against. Raised as
`scrum-master/po-requests.md` item 15.

#### Candidate 4 — an edge authorisation layer (Cloudflare Worker)

**Disposition: unmeasured.** **Blocking prerequisite:** a deployed Cloudflare Worker implementing
an authorisation rule in front of the `earthandhoney` R2 bucket. No Worker script, `wrangler.toml`,
or Workers binding exists anywhere in this repository. Without a deployed Worker there is no
edge-authorisation mechanism to measure. Raised as `scrum-master/po-requests.md` item 15.

#### Candidate 5 — a hybrid

**Disposition: unmeasured.** **Blocking prerequisite:** both candidate 3's and candidate 4's
prerequisites above, **plus** a decided rule for which galleries take which path (e.g.
Backstage-mediated serving for private/protected client galleries, CDN or edge delivery for
already-public portfolio/blog galleries). That routing rule is itself part of **AC-29.4's**
decision — the decision this ADR exists to make *from* the measurements, not before them — so it
cannot be decided ahead of AC-29.4 and is not a fourth thing to ask of the human now. Only the
infrastructure half of candidate 5's prerequisite (identical to candidates 3 and 4's) is a blocking
item, and it is consolidated into the same `scrum-master/po-requests.md` item 15 rather than
repeated a third time.

No preference is expressed among candidates 3, 4 and 5 by this disposition, consistent with this
document's own standing rule above: the candidates are listed to be measured, not ranked. Recording
three candidates as unmeasured with a named prerequisite is the expected outcome given this
sprint's own `available_configuration` (paths 3 and 4 need infrastructure that does not exist), and
is a pass on AC-29.2.3, not a failure.

### Measurements that will decide it

- Mobile-first Lighthouse performance score on representative public pages
  (a portfolio gallery page and a blog gallery page), per candidate path.
- Cumulative Layout Shift (CLS) attributable to images on those same pages,
  per candidate path.
- Largest Contentful Paint (LCP) under a realistic mobile throttling profile
  (representative mid-tier mobile CPU/network conditions), per candidate
  path.
- Network payload audit of what resolution is actually requested by public
  pages under each candidate path — whether a full-resolution original is
  ever fetched where a thumbnail/medium derivative would do.

### Performance targets the decision is accountable to

- **No image-caused layout shift.**
- **Mobile-first performance near ninety** on representative public pages.
- **Largest Contentful Paint around two and a half seconds or better** on a
  realistic mobile profile.
- **Public pages never request full-resolution originals unnecessarily.**

Whichever candidate path (or hybrid) is chosen next sprint must meet all
four targets above on the measurements above; the choice is made from that
evidence, not from preference recorded here.

### Measured results per candidate path (AC-29.3)

**Source of these numbers.** Every value below is the same number already
committed to `scripts/benchmark/results/MEASURED_PATHS.md` (AC-29.2.2.3),
generated by `npm run benchmark:summarise` from four retained raw harness
reports, two invocations per candidate path:
`run-2026-08-08T20-01-17-206Z-backstage-proxy.json`,
`run-2026-08-08T20-02-23-653Z-backstage-proxy.json`,
`run-2026-08-08T20-06-58-925Z-presigned-r2.json` and
`run-2026-08-08T20-08-00-998Z-presigned-r2.json`, all committed under
`scripts/benchmark/results/`. Nothing here is typed in independent of those
files — re-running `npm run benchmark:summarise` against them re-derives
every number below. `MEASURED_PATHS.md` states numbers only, by its own
declared scope; this subsection is where those numbers meet the four targets
restated above, so pass/fail becomes visible per target per path.

Read against `scripts/benchmark/results/REPRODUCIBILITY.md`'s noise floor: up
to 0.05 (5 points on the 0-100 reading) of run-to-run performance-score
spread, and up to roughly 78ms of run-to-run LCP spread, have been observed
between two invocations of the *same* build and path. A miss narrower than
that spread would not be distinguishable from noise on this evidence; every
miss recorded below is wider than it.

#### Candidate 1 — serving through the Backstage (`backstage-proxy`)

| Target | portfolio-gallery | story-gallery |
| --- | --- | --- |
| **No image-caused layout shift.** | PASS — CLS 0.0000 / 0.0000 | PASS — CLS 0.0000 / 0.0000 |
| **Mobile-first performance near ninety** on representative public pages. | FAIL — 0.87 / 0.87 (87/100, 3 points short of ninety) | PASS — 0.92 / 0.96 (92–96/100) |
| **Largest Contentful Paint around two and a half seconds or better** on a realistic mobile profile. | FAIL — 3585ms / 3581ms (about 1.08–1.09s over the ~2.5s target) | FAIL — 3214ms / 2575ms (up to 714ms over; the closer run is only 75ms over) |
| **Public pages never request full-resolution originals unnecessarily.** | PASS — 0 images flagged oversized by Lighthouse's `image-size-responsive` audit across all passes | PASS — 0 images flagged oversized by Lighthouse's `image-size-responsive` audit across all passes |

#### Candidate 2 — direct time-limited links (`presigned-r2`)

| Target | portfolio-gallery | story-gallery |
| --- | --- | --- |
| **No image-caused layout shift.** | PASS — CLS 0.0000 / 0.0000 | PASS — CLS 0.0000 / 0.0000 |
| **Mobile-first performance near ninety** on representative public pages. | FAIL — 0.87 / 0.87 (87/100, 3 points short of ninety) | PASS — 0.90 / 0.97 (90–97/100) |
| **Largest Contentful Paint around two and a half seconds or better** on a realistic mobile profile. | FAIL — 3839ms / 3847ms (about 1.34–1.35s over the ~2.5s target) | FAIL — 3497ms / 2543ms (up to 997ms over; the closer run is only 43ms over) |
| **Public pages never request full-resolution originals unnecessarily.** | PASS — 0 images flagged oversized by Lighthouse's `image-size-responsive` audit across all passes | PASS — 0 images flagged oversized by Lighthouse's `image-size-responsive` audit across all passes |

#### Reading across both measured candidates

| Target | Path 1 (`backstage-proxy`) | Path 2 (`presigned-r2`) |
| --- | --- | --- |
| No image-caused layout shift | PASS on both pages | PASS on both pages |
| Mobile-first performance near ninety | FAIL on portfolio-gallery, PASS on story-gallery | FAIL on portfolio-gallery, PASS on story-gallery |
| LCP around 2.5s or better | FAIL on both pages | FAIL on both pages |
| Never request full-resolution originals unnecessarily | PASS on both pages | PASS on both pages |

Neither measured candidate clears all four targets on both measured pages —
each fails the same two target rows (performance on `portfolio-gallery`, LCP
on both pages) by a similar margin. What follows from that — whether either
path is nonetheless viable, whether the decision stays open, and what each
target miss costs — is worked out from this evidence in AC-29.4, not decided
by this subsection.

## AC-19.4 — Audit of the existing R2 setup

### Method and evidence basis

Per `SYSTEM_OWNERSHIP.md`, PicPeak/Backstage (`vendor/picpeak/backend`) is
the live, authoritative system for gallery/media storage; Payload's `Media`
collection and its `s3Storage` plugin config (`src/payload.config.ts`) are
dormant per `PIVOT_AUDIT.md`. Both consumers are audited below because both
are wired to the same bucket via the same `R2_*` credentials.

`scrum-master/po-requests.md` (item 1, resolved 2026-07-30) confirms real
R2 credentials — not the `.env.example` placeholders — are present in the
local `.env` and states this AC is where they get security-audited. That
`.env` was used here to run read-only `aws s3api` calls directly against
the live bucket (endpoint `$R2_ENDPOINT`), on 2026-08-02, following the same
evidence-gathering approach `PIVOT_AUDIT.md` already used against this same
bucket (see its "Every original is stored in R2 exactly once" section). No
write or delete call was made against the live bucket; every command below
is a read-only S3 API call (`list-objects-v2`, `list-buckets`,
`get-bucket-lifecycle-configuration`, `get-bucket-cors`).

### 1. Which bucket is in use

A single bucket, `earthandhoney`, read from `process.env.R2_BUCKET` — never
hardcoded:

```ts
// src/payload.config.ts:63
bucket: process.env.R2_BUCKET || '',
```

```yaml
# docker-compose.yml:102,107
STORAGE_S3_BUCKET: ${R2_BUCKET}
STORAGE_S3_PREFIX: backstage
```

A live `ListBuckets` call using the app's own credentials returns exactly
one bucket:

```
$ aws s3api list-buckets --endpoint-url $R2_ENDPOINT
{
    "Buckets": [{ "Name": "earthandhoney", "CreationDate": "2026-07-21T11:11:02.350000+00:00" }],
    "Owner": { "ID": "d86dc0ad4b73b2f4227b56512192850d" }
}
```

confirming there is no second, parallel bucket in play — consistent with
`us16-ac16.3-backstage-r2-storage.test.ts`'s assertion that Backstage
reuses the project's one bucket rather than provisioning its own.

A live top-level `ListObjectsV2` (delimiter `/`) against `earthandhoney`
returns exactly one prefix:

```
$ aws s3api list-objects-v2 --endpoint-url $R2_ENDPOINT --bucket earthandhoney --delimiter /
{ "CommonPrefixes": [{ "Prefix": "backstage/" }] }
```

`backstage/` is the `STORAGE_S3_PREFIX` PicPeak's Backstage service is
configured with above. **Zero objects exist outside that prefix** — so
Payload's parallel `s3Storage` plugin config, while still wired up in
`payload.config.ts`, has never actually written an object to this bucket.
It is dormant in practice, not just dormant by the ownership decision
`SYSTEM_OWNERSHIP.md` already recorded.

### 2. Whether permissions are least-privilege

What the code needs: between the two consumers, the credential set is
exercised for object get/put/delete/list/copy/multipart — `s3Storage.js`
imports `GetObjectCommand`, `PutObjectCommand`, `DeleteObjectCommand`,
`DeleteObjectsCommand`, `ListObjectsV2Command`, `CopyObjectCommand`, and the
multipart-upload command family; `archiveService.js` calls `storage.delete`
(lines 166, 178, 181, 186, 190) as part of expiring an event. No code
anywhere in `vendor/picpeak/` or `src/` calls a bucket-admin operation
(`CreateBucket`, `DeleteBucket`, `PutBucketPolicy`, `PutBucketCors`, etc.) —
grepped across every file in `vendor/picpeak/backend/src/services/storage/`
and found no match. The credential the app needs is therefore "Object Read
& Write" scoped to this one bucket, nothing account- or bucket-admin-level.

What was actually confirmed live: the `ListBuckets` call above — which for
an account-wide/admin-scoped Cloudflare R2 API token would enumerate every
bucket on the account — returned only the one bucket this app actually
uses. That is evidence the token is scoped to "apply to specific bucket(s)
only" in Cloudflare's dashboard, not an account-wide admin token; bucket
scoping is the primary lever R2 offers for least privilege.

What could not be verified from the repo or the S3-compatible API: R2 does
not implement `GetBucketPolicy` or `GetPublicAccessBlock`, so the exact
permission tier (`Object Read & Write` vs `Admin Read & Write`) is not
independently observable through the API used here:

```
$ aws s3api get-bucket-policy --endpoint-url $R2_ENDPOINT --bucket earthandhoney
An error occurred (NotImplemented) when calling the GetBucketPolicy operation: GetBucketPolicy not implemented
```

**Open item (needs human confirmation):** verify the exact permission tier
of the R2 API token in the Cloudflare dashboard's R2 API Tokens page. The
bucket-scoping evidence above is strong but not a substitute for reading
the token's declared permission level directly.

### 3. Whether browser upload access is correctly restricted

Both consumers route uploads through their own authenticated backend —
neither exposes a direct browser-to-R2 path:

- **PicPeak/Backstage**: photo upload is gated by `adminAuth` +
  `requirePermission('photos.upload')` + `requireEventOwnership`, and the
  file is parsed server-side by `multer` before ever reaching storage:

  ```js
  // vendor/picpeak/backend/src/routes/adminPhotos.js:131
  router.post('/:eventId/upload', adminAuth, requirePermission('photos.upload'), requireEventOwnership, uploadTimeout(600000), resolveAllowedTypes, async (req, res, next) => {
  ```

- **Payload**: the `s3Storage()` plugin config in `payload.config.ts` sets
  no `clientUploads` option. That plugin only enables direct-to-bucket
  browser uploads when `clientUploads` is explicitly configured; absent, it
  proxies every upload through Payload's own authenticated server API.

The one place in the codebase capable of generating a presigned *upload*
(`putObject`) URL at all is the generic low-level wrapper:

```js
// vendor/picpeak/backend/src/services/storage/s3Storage.js:487
async getSignedUrl(operation, s3Key, options = {}) {
```

and its only demonstrated `'putObject'` call site is a documentation/example
file that no route or service imports:

```js
// vendor/picpeak/backend/src/services/storage/s3Storage.example.js:100
const uploadUrl = await s3Storage.getSignedUrl('putObject', 'events/wedding-2024/new-photo.jpg', {
```

Grepping every route and service for `getSignedUrl('putObject'` finds only
that one, unused example file. Every real caller of `signedUrl()` /
`getSignedUrl()` requests a **download** (`getObject`), never an upload:

```js
// vendor/picpeak/backend/src/services/storage/S3StorageBackend.js:146
async signedUrl(relPath, ttlSeconds = 300) {
  return this.adapter.getSignedUrl('getObject', this._key(relPath), { expiresIn: ttlSeconds });
```

**Defense in depth beyond the app layer:** the live bucket carries no CORS
configuration at all:

```
$ aws s3api get-bucket-cors --endpoint-url $R2_ENDPOINT --bucket earthandhoney
An error occurred (NoSuchCORSConfiguration) when calling the GetBucketCors operation: The CORS configuration does not exist.
```

Browsers block cross-origin `PUT`/`POST` requests without a matching CORS
policy from the target. So even if a presigned upload URL were issued to a
browser in the future, the app's own frontend origin could not complete the
upload against this bucket as currently configured — there is no CORS grant
to allow it.

**Conclusion: browser upload access is correctly restricted.** No
direct browser-to-R2 upload path exists in either consumer, and the
bucket's own (absent) CORS configuration would block one if it existed.

### 4. What lifecycle rules exist

Live `GetBucketLifecycleConfiguration` returns exactly one rule:

```
$ aws s3api get-bucket-lifecycle-configuration --endpoint-url $R2_ENDPOINT --bucket earthandhoney
{
    "Rules": [{
        "ID": "Default Multipart Abort Rule",
        "Status": "Enabled",
        "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }]
}
```

That is R2's own default housekeeping rule (it aborts stalled multipart
uploads after 7 days) — not a data-retention or expiry rule this project
configured. **No lifecycle rule expires or deletes objects by age.**

The product's "not permanent photo storage" client lifecycle (CLAUDE.md
Product Vision) is implemented entirely in application code instead, with
no bucket-level backstop:

```js
// vendor/picpeak/backend/src/services/expirationChecker.js:11
cron.schedule('0 * * * *', async () => {
  await checkExpirations();
});
```

`checkExpirations` calls `archiveEvent`, which zips an expired event's
originals into an archive object and then deletes the individual originals
from storage:

```js
// vendor/picpeak/backend/src/services/archiveService.js:166,178,181,186,190
await storage.delete(entry.key).catch(...)
await storage.delete(photo.thumbnail_path).catch(() => {});
await storage.delete(photo.hero_path).catch(() => {});
await storage.delete(photo.preview_path).catch(() => {});
await storage.delete(photo.watermark_path).catch(() => {});
```

**Audit finding:** because no bucket-level lifecycle rule enforces
expiry independently, the retention promise depends entirely on the hourly
cron process staying alive. If that worker process is down or crashes, an
expired gallery's original objects are never cleaned up — nothing at the
storage layer enforces it as a backstop. This is a finding to carry into
future lifecycle/reliability work, not a defect this AC fixes.

### 5. Which paths are public versus private

No object is ever written with a public-read ACL. Every storage backend
under `vendor/picpeak/backend/src/services/storage/` was grepped for
`ACL`/`Acl`; none exist, and none of the `PutObjectCommand` call sites set
an ACL param. Cloudflare R2 buckets are private by default unless a public
access method (an `r2.dev` subdomain or a custom domain) is explicitly
enabled for the bucket.

No public bucket URL, `r2.dev` domain, or CDN/custom domain is configured
anywhere in this project — `.env.example`, `docker-compose.yml`, and every
consumer's source were grepped for `R2_PUBLIC_URL`, `PUBLIC_URL`, `r2.dev`,
`CDN_URL`, and `CUSTOM_DOMAIN`-shaped variables; none exist.

Every path a client actually receives is app-issued and time-limited, never
a raw bucket URL:

- `protectedImages.js` issues its own signed application token and route,
  and the backend — not R2 — serves the bytes after validating that token:

  ```js
  // vendor/picpeak/backend/src/routes/protectedImages.js:236-237
  const token = generateImageToken(photoId);
  const signedUrl = `/api/images/${req.params.slug}/photo/${photoId}/signed/${token}`;
  ```

  served by `GET /:slug/photo/:photoId/signed/:token`
  (`protectedImages.js:253`).

- Where a real presigned R2 GET URL is generated, it is short-TTL and
  single-purpose: `S3StorageBackend.signedUrl` defaults to 300 seconds
  (`S3StorageBackend.js:146`), the zip-download flow uses a 5-minute
  presigned URL (`gallery.js:908`, `storage.signedUrl(zipInfo.key, 300)`),
  and the admin backup download flow uses a 1-hour presigned URL
  (`adminBackup.js:743`,
  `s3Adapter.getSignedUrl('getObject', file.key, { expiresIn: 3600 })`).
  Nothing hands out a permanent or unauthenticated link to an object.

The only two sub-prefixes observed on the live bucket — `backstage/events/`
and `backstage/thumbnails/` (from the live `ListObjectsV2` call in §1) —
are therefore private by construction at the application layer: every
object under them is reachable only through an authenticated admin route or
a token-gated public-delivery route, never a bare object URL.

**Open item (needs human confirmation):** Cloudflare R2's own bucket-level
"Public Development URL" / custom-domain toggle is a dashboard-only
setting, not exposed through the S3-compatible API — `GetPublicAccessBlock`
returns the same `NotImplemented` response `GetBucketPolicy` does in §2.
The application-level evidence above shows nothing in this codebase relies
on or requests public access, but confirming that toggle itself is off
requires checking the Cloudflare dashboard directly, same limitation as the
permission-tier check in §2.

### Summary

| Question | Finding |
| --- | --- |
| Bucket in use | Single bucket `earthandhoney`, read from `R2_BUCKET`; confirmed no second bucket exists via a live `ListBuckets` call |
| Least privilege | Object-level operations only needed and used; live evidence the token is bucket-scoped, not account-wide. Exact permission tier needs dashboard confirmation (open item) |
| Browser upload access | Correctly restricted — no direct browser-to-R2 upload path in either consumer; bucket has no CORS config to allow one if it existed |
| Lifecycle rules | Only R2's default multipart-abort rule exists; expiry/retention is enforced entirely by an hourly application cron with no storage-level backstop |
| Public vs private paths | Everything lives under one prefix (`backstage/`), no public bucket URL or CDN domain configured, every client-facing link is app-issued and time-limited. Dashboard public-access toggle needs confirmation (open item) |

### Open items requiring human/dashboard confirmation

1. Confirm the R2 API token's exact permission tier (`Object Read & Write`
   vs `Admin Read & Write`) in the Cloudflare dashboard's R2 API Tokens
   page — the bucket-scoping test in §2 is strong evidence but not a
   substitute for reading the token's declared permission level.
2. Confirm the bucket's "Public Development URL" / custom-domain toggle is
   disabled in the Cloudflare dashboard — nothing in code requests or
   relies on public access, but the toggle itself isn't visible through the
   S3-compatible API (§5).

## Delivery-path decision (AC-29.4)

**Outcome: no path is chosen. This decision stays open.** It is made from the
measurements above, not from preference: "Reading across both measured
candidates" (AC-29.3) already shows neither measured candidate clears all
four targets on both representative pages, and this section draws the only
conclusion that follows from that without picking a least-bad failing
candidate — the outcome AC-29.6 exists to require.

### Rejected — Candidate 1, serving through the Backstage (`backstage-proxy`)

Rejected as a complete delivery path. It fails two of the four targets, each
by more than the run-to-run noise floor `REPRODUCIBILITY.md` establishes:

- **Mobile-first performance near ninety** — FAILS on `portfolio-gallery`:
  measured 0.87 / 0.87 (87/100), 3 points short of ninety. PASSES on
  `story-gallery` (92–96/100).
- **LCP around two and a half seconds or better** — FAILS on both pages:
  `portfolio-gallery` measured 3585ms / 3581ms, about 1.08–1.09s over the
  ~2.5s target; `story-gallery` measured 3214ms / 2575ms, up to 714ms over
  (the closer run is only 75ms over).
- Passes the other two targets on both pages: no image-caused layout shift
  (CLS 0.0000 / 0.0000) and no unnecessary full-resolution originals
  requested (0 images flagged oversized).

### Rejected — Candidate 2, direct time-limited links (`presigned-r2`)

Rejected as a complete delivery path, on the same two targets as candidate 1:

- **Mobile-first performance near ninety** — FAILS on `portfolio-gallery`:
  measured 0.87 / 0.87 (87/100), 3 points short of ninety. PASSES on
  `story-gallery` (90–97/100).
- **LCP around two and a half seconds or better** — FAILS on both pages:
  `portfolio-gallery` measured 3839ms / 3847ms, about 1.34–1.35s over the
  ~2.5s target; `story-gallery` measured 3497ms / 2543ms, up to 997ms over
  (the closer run is only 43ms over).
- Passes the other two targets on both pages: no image-caused layout shift
  (CLS 0.0000 / 0.0000) and no unnecessary full-resolution originals
  requested (0 images flagged oversized).

### Not rejected, not chosen — Candidates 3, 4 and 5

Candidates 3 (public delivery through a CDN/custom domain), 4 (an edge
authorisation Worker) and 5 (a hybrid) remain **unmeasured**, per the
disposition already recorded under "Candidate disposition — paths 3, 4 and 5
(AC-29.2.3)" above, each against its own named blocking prerequisite. They
are not rejected — there is no measurement on record to reject them by — and
they are not chosen either, for the same reason: an unmet infrastructure
prerequisite is not evidence a candidate would fail its targets if it
existed, and treating "unmeasured" as a de facto win over two measured-but-
failing candidates would be exactly the ranking-by-preference this ADR's
standing rule forbids. No candidate among the five is silently dropped from
this decision.

### Why the decision stays open rather than picking the least-bad measured path

Candidates 1 and 2 miss the identical two targets, by a similar margin, on
the identical page (`portfolio-gallery`'s performance score, and LCP on both
pages) — neither candidate's failure is smaller or more tolerable than the
other's. AC-29.6 requires that when no candidate meets all four targets, the
record says so and stays open with a named next step and blocking
prerequisite, rather than choosing the least-bad failing path and recording
its targets as met. Nothing above chooses candidate 1 or candidate 2 as "the"
delivery path.

## PRD §19.3 preservation check (AC-29.5)

**There is no "the chosen path" to certify.** AC-29.4 immediately above
rejected both measured candidates and left the decision open. This section
exists anyway, because either rejected candidate could still be revived by
the pending Product Owner sign-off (§"Product Owner sign-off" below offers
that as option (b)) — so whichever of the two the decision eventually
reaches for needs its PRD §19.3 preservation (access control, logging,
watermarks, revocation) on record now, not discovered after the fact. The
proof is `src/__tests__/us29-ac29.5-security-invariants-preserved.test.ts`:
a live round trip against the running Backstage stack for the access-control
and logging claims, and independently re-verified static citations against
the pinned fork's current source for the watermark and revocation claims the
live run cannot practically exercise (candidate 2's presigned redirect needs
a pre-generated ZIP, which needs uploaded photos and a completed background
job — heavier setup than this AC's proof requires when the code path is
unconditional and already readable directly).

### Access control — both candidates share one gate, live-proven

Candidate 1's only listing route (`GET /:slug/photos`,
`vendor/picpeak/backend/src/routes/gallery.js:218`) and candidate 2's only
real call site (`GET /:slug/download-all`, `gallery.js:886`) are both gated
by the same `verifyGalleryAccess` middleware
(`vendor/picpeak/backend/src/middleware/gallery.js:20-172`) — there is no
separate, weaker gate for either. Live against the running stack, self-seeding
its own galleries (never reusing another AC's fixtures):

- An unauthenticated request to a password-protected, published gallery is
  refused on **both** routes: `401 {"error":"No token provided"}`
  (`middleware/gallery.js:62`).
- An unauthenticated request to a still-**draft** (unreleased) gallery is
  refused on **both** routes: `404 {"error":"Gallery not found or expired"}`
  — the `is_draft` filter on the lookup query
  (`middleware/gallery.js:40`/`93`/`113`) runs before the password check ever
  does, so an unreleased gallery 404s whether or not it also requires a
  password.
- A wrong password against the self-seeded protected gallery is refused
  (`401`, `POST /api/auth/gallery/verify`).
- The correct password grants a token, and the same previously-refused
  `/:slug/photos` route then returns `200` — and the same auth boundary that
  refused unauthenticated `/:slug/download-all` releases it once the token is
  presented (no longer `401`/"No token provided"), proving the boundary
  really is the token and not an incidental block specific to one route.

Neither measured candidate leaks a private gallery's photo to a request that
never authenticates at all — the "faster path that leaks a private gallery"
failure condition this AC names does not occur for either.

### Logging — candidate 1 logs every delivery; candidate 2 logs the grant, not the byte fetch

Candidate 1 logs a delivery on every authorized call: `'view'` on every
`/:slug/photos` listing, **awaited** before the response
(`gallery.js:420-425`) — proven live above via the running stack's
`total_views` counter (`GET /api/admin/events/:id`) incrementing across the
authorized call; and `'download'` on every confirmed single-photo byte send,
recorded exactly once and only after the bytes are actually confirmed sent
(`gallery.js:666-691`).

Candidate 2 logs the presigned-URL **grant** — one `access_logs` row,
`action: 'download_all_presigned'` — immediately before the redirect
(`gallery.js:909-914`), but that insert is fire-and-forget (`.catch(() =>
{})`, never `await`ed), unlike candidate 1's awaited `'view'` insert. More
importantly: once `res.redirect(302, url)` fires, the backend is out of the
loop — nothing logs the actual byte fetch against R2 itself. The request that
*generates* the presigned URL is logged; the request that *uses* it is not.

### Watermarks — candidate 1 always applies them; candidate 2 never does on its fast path

Every candidate-1 route that serves photo bytes calls `watermarkService`
(confirmed for `/:slug/photo/:photoId`, `/:slug/thumbnail/:photoId`,
`/:slug/hero/:photoId`, `/:slug/preview/:photoId`, `/:slug/download/:photoId`,
and the streaming/ZIP branches of `/:slug/download-all`). Candidate 2's
presigned branch (`gallery.js:898-923`) contains **zero** references to
`watermarkService` and is explicitly gated on `!watermarkOnEvent`
(`gallery.js:904-906`) — bytes leaving R2 through this path are never
watermarked by design, exactly the tradeoff the code's own comment records.
The streaming fallback immediately below it (`gallery.js:940-981`), by
contrast, does call `watermarkService.getWatermarkSettings()`.

### Revocation — candidate 1 re-checks on every request; candidate 2 has none once issued

`verifyGalleryAccess` re-queries `is_active`/`is_archived`/`is_draft` fresh
on every request (`middleware/gallery.js:84-93`, `105-113`) — an admin
revoking a gallery takes effect on the very next request even for a holder
of an unexpired 24h JWT. Customer-portal-minted tokens get a further live
check against `event_customer_assignments`
(`middleware/gallery.js:132-149`) — removing that row 403s
(`CUSTOMER_ASSIGNMENT_REVOKED`) the very next request.

Candidate 2 has no equivalent. Grepping the entire backend `src/` tree finds
**exactly one** call site for `.signedUrl(` outside its two method
definitions — `gallery.js:908`, a fixed 300-second (5-minute) TTL. Once
issued, the URL is a bare S3-compatible capability held by Cloudflare R2;
there is no callback to the Backstage database and no way to invalidate that
specific signature. If a gallery is revoked, archived, or expired 10 seconds
after a presigned URL was handed out, that URL remains fully fetchable by
anyone holding it until the TTL naturally lapses. Exposure is bounded (five
minutes, and only reachable at all behind the same initial
`verifyGalleryAccess` gate proven above) but real, and is a materially weaker
guarantee than candidate 1's per-request re-authorization.

### What this means for the still-open decision

Neither candidate fails AC-29.5 outright — the specific failure condition
this AC names ("a faster path that leaks a private gallery") does not occur
for either, since both sit behind the same live-revocable, per-request
`verifyGalleryAccess` gate. But the two candidates are **not** equivalent on
PRD §19.3 once past that gate: candidate 1 fully preserves access control,
logging, watermarks and revocation; candidate 2 preserves the initial gate
and logs the URL grant, but drops watermarking and per-request revocation
entirely on the actual byte fetch, bounded only by a five-minute TTL. This
asymmetry is additional evidence for whoever revisits the still-open AC-29.4
decision — it was not a factor in AC-29.4's rejection (which was on
performance grounds only) and should be weighed alongside it if candidate 2
is ever reconsidered.

### Product Owner sign-off

This is one of the decisions no agent may make alone (PRD §5, Reminder 1).

**Status: PENDING.** Raised in `scrum-master/po-requests.md` for explicit
Product Owner sign-off on: (a) agreement that candidates 1 and 2 are not
adopted, given the target misses recorded above, and (b) whether to invest in
the candidate-3/4 infrastructure prerequisites already itemised in
`po-requests.md` (item 15) toward a fully-measured candidate, or to hold this
decision open on the evidence as it stands.

**Product Owner sign-off:** _______________________________ (name, date)
