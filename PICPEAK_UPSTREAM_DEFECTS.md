<!--
---
file: PICPEAK_UPSTREAM_DEFECTS.md
project: earthandhoney
purpose: AC-17.5 — the register of defects found in the pinned PicPeak
         upstream and reported back to it. Every fork patch that exists
         only to work around an upstream bug (as opposed to a deliberate
         project-specific deviation) gets an entry here, carrying the
         submission-ready report and its upstream status, so the patch can
         be dropped once upstream fixes it rather than being carried
         forever by accident.
created-by: dev-team
related-story: US-17
related-ac: 17.5
---
-->

# PicPeak Upstream Defect Register

`FORK_CHANGELOG.md` records *what this fork changed* relative to the pin.
This file records *why a change should eventually stop existing*: each
entry is an upstream bug we hit, the patch we carry because of it, and the
state of the report filed with upstream.

The distinction matters for `UPSTREAM_SYNC.md`. A deliberate deviation
(pointing storage at our R2 bucket, say) is permanent and must survive
every future sync. A vendor-defect patch is temporary — the moment the pin
moves to an upstream commit carrying upstream's own fix, the patch should
be dropped rather than merged forward. Without this register, the two are
indistinguishable at sync time and workaround code accumulates silently.

**Pinned upstream at time of writing:**
`eb263137b98935754155824de2a03848121304b6`
(`https://github.com/PicPeak/picpeak`, branch `main` — see
`PICPEAK_UPSTREAM.md` for the full pin record).

Every entry states: the defect, where it is upstream, the fork patch that
works around it, the upstream report and its status, and the condition
under which the patch gets dropped.

---

## UD-1 — single-photo download ignores the storage backend, and its error path never responds

- **Status:** patch carried in this fork (all three parts); upstream report
  **prepared, not submitted** (see "Upstream report" below)
- **Found:** 2026-08-01, US-17 AC-17.5
- **Upstream location:** `backend/src/routes/gallery.js`, the
  `GET /:slug/download/:photoId` route (line 631 at the pinned commit)
- **Fork patch:** `vendor/picpeak/backend/src/routes/gallery.js` — see the
  `vendor-defect fix: US-17 AC-17.5.2` / `AC-17.5.3` comment blocks in that
  route, pinned by
  `vendor/picpeak/backend/src/__tests__/galleryDownload.storageBackend.test.js`,
  and recorded as the `2026-08-01` `deviation` entry in `FORK_CHANGELOG.md`
- **Sync disposition:** **drop rather than merge** — flagged in
  `UPSTREAM_SYNC.md` §4. This is a workaround for an upstream bug, not a
  deliberate project deviation, so it must not be carried forward once
  upstream fixes it.
- **Drop the patch when:** the pin moves to an upstream commit in which this
  route (1) resolves managed photos through `getStorage()` rather than
  `resolvePhotoFilePath()`, (2) sends a response on every failure path, *and*
  (3) performs the `download_count` increment and the `access_logs` insert
  only after a confirmed send. All three at the same commit. A partial
  upstream fix reduces the patch to the parts still missing — it does not
  drop it. Until then the patch must survive every sync.

### The defect, in three parts

All three are in the same route and are best fixed together.

**(1) The route resolves bytes with a local-filesystem-only lookup.**

At the pinned commit, line 667:

```js
filePath = resolvePhotoFilePath(req.event, photo);
```

`resolvePhotoFilePath()` joins `STORAGE_PATH` with the photo's relative
path and returns a path on the local disk. It is correct only under
`STORAGE_BACKEND=local`. Under `STORAGE_BACKEND=s3` the managed photo lives
in the bucket and was never written to the container's filesystem, so the
path names a file that does not exist.

This is inconsistent with the rest of the very same file. The sibling
`download-all` (line 739 at the pin) and `download-selected` (line 907)
routes, and the `thumbnail` / `hero` / `preview` routes below them, all
resolve managed photos with `resolvePhotoStorageKey()` + `getStorage()` and
stream through the storage abstraction. `backend/src/routes/protectedImages.js`
does the same. Only the single-photo download route was left on the local
path — it reads as an S3 migration that missed one call site rather than a
deliberate choice.

**(2) The `res.sendFile()` error path never sends a response.**

At the pinned commit, lines 716–725:

```js
res.sendFile(filePath, (downloadError) => {
  if (downloadError) {
    logger.error('Error streaming gallery download', { /* ... */ });
  }
});
```

The callback logs and returns. It never calls `res.status()`, `res.end()`,
`res.json()`, or `next(downloadError)`, so no response is ever sent and the
request is left open. The client does not receive an error — it hangs until
its own timeout. Because `sendFile`'s callback consumes the error, Express's
default error handler never runs either.

Combined with (1) this is what an S3-backed deployment actually experiences:
every single-photo download hangs, with a bare `ENOENT` in the server log
and nothing at all on the wire. That is a substantially worse failure mode
than the honest 404 the route intends, and it is why (1) and (2) want fixing
together.

**(3) The download is recorded before it is known to have succeeded.**

At the pinned commit, lines 653–663, *before* the file is resolved at all:

```js
// Update download count
await db('photos').where('id', photoId).increment('download_count', 1);

// Log download
await db('access_logs').insert({ /* ..., action: 'download', ... */ });
```

Both writes are committed ahead of any attempt to read or send the file. A
request that then 404s — or, per (2), hangs having sent nothing — is still
counted in `photos.download_count` and still gets an `action: 'download'`
row in `access_logs`. The gallery's download statistics therefore count
failures as successes, and the access log asserts a delivery that never
happened. Under (1)+(2) *every* failed download inflates the count, so in an
S3 deployment the statistic is not merely imprecise, it is inverted.

This is independent of the storage backend: the same ordering miscounts a
local-mode download whose file is missing, or one the client aborts.

*Fork patch for this part (US-17 AC-17.5.3):* both writes moved into a single
guarded `recordConfirmedDownload()` helper defined once in the route and
called only from a confirmed delivery — the response's `finish` event (the
watermark and storage-stream branches, the latter attaching the listener only
from the storage stream's own `end` event, which is mutually exclusive with
`error`) and `res.sendFile()`'s success branch (the external-photo branch).
It is called from no failure branch, and a `downloadRecorded` flag makes it
idempotent per request. The two writes appear nowhere else in the route — a
claim pinned by source inspection in the test suite named above, so a later
edit cannot quietly reintroduce a second unguarded write.

### Reproduction

Against a Backstage configured with `STORAGE_BACKEND=s3` (any S3-compatible
service; this project uses Cloudflare R2), with an active, unexpired event
whose `allow_downloads` is true and which has at least one uploaded photo:

```
$ curl -m 30 -b <gallery-cookie-jar> \
    http://<host>/api/gallery/<slug>/download/<photoId>
```

Observed at the pinned commit: no response; curl exits on its own timeout.
Server log shows the `ENOENT` for a path under `STORAGE_PATH` that does not
exist. `photos.download_count` for `<photoId>` has nevertheless been
incremented, and a new `action: 'download'` row is present in `access_logs`.

Expected: the photo's bytes, streamed from the bucket. Or, if the object
genuinely is absent, a `404` — and no increment and no access-log row.

### Suggested fix

Mirror what the sibling routes in the same file already do:

1. Resolve with `resolvePhotoStorageKey(req.event, photo)`. A `null` key
   means an external/reference photo, which legitimately lives on a local
   mount — keep `resolvePhotoFilePath()` for exactly that case.
2. For a managed photo, `stat()` the key through `getStorage()`; a `null`
   stat is the honest `404`. Otherwise set `Content-Length` from the stat
   and pipe `storage.get(key)` to the response — the same shape as the
   thumbnail route at line 1341 of the pinned file.
3. Watermarking needs a real path, so wrap it in `withLocalCopy()` as the
   thumbnail/hero/preview routes already do — a no-op in local mode, a
   temp-file materialisation in S3 mode.
4. Give every failure path a response: `res.status(...).json(...)` when
   headers have not been sent, and `res.destroy(err)` once they have (the
   response is already partly written and cannot be turned into an error
   document).
5. Move the `download_count` increment and the `access_logs` insert behind a
   confirmed send — the response's `finish` event, and `res.sendFile()`'s
   success callback — guarded so they run at most once.

### Upstream report

**State: `prepared, not submitted`.** (Per AC-17.9: an honest recorded state,
not a silently open task.)

The report is written and ready to submit as a GitHub issue against
`https://github.com/PicPeak/picpeak` (issues are enabled). It has **not** been
submitted, and the reason is not a technical gap — the `gh` CLI on the
development machine is authenticated (account `AsimQuick`, token scopes
including `repo`), so the command below would run.

**Exactly what is needed to submit it:** an explicit human decision to publish
under a named GitHub identity. Filing the issue posts permanently and
publicly to a third-party repository, attributed to whichever personal account
`gh` is authenticated as; choosing to speak to another project's maintainers
under one's own name is a human's call, not an automated one. Nothing else is
missing: no additional credential, no organisation membership, no approval
from PicPeak.

**Who can clear it:** the repository owner (or any maintainer of this project
willing to have the issue attributed to their GitHub account), by running the
command below and then updating this entry's status line with the resulting
issue URL.

To submit it, from a checkout of this repository:

```
$ gh issue create --repo PicPeak/picpeak \
    --title "Single-photo gallery download ignores the storage backend (hangs on S3), and records the download before it succeeds" \
    --body-file .github/upstream-issues/UD-1-gallery-single-download.md
```

The body is `.github/upstream-issues/UD-1-gallery-single-download.md` in
this repository, which restates this entry in upstream's terms (no Earth &
Honey story numbers, no references to our own documents).

Once submitted, replace the status line at the top of this entry with the
issue URL and its state, so a future sync can check whether the fix has
landed and the fork patch can be dropped.

- **Recorded:** 2026-08-01
- **Recorded by:** dev-team (US-17, AC-17.5)
