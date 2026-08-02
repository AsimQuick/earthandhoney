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
