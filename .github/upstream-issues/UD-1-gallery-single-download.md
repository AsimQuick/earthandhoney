## Summary

`GET /api/gallery/:slug/download/:photoId` in
`backend/src/routes/gallery.js` has three related problems:

1. It resolves the photo's bytes with `resolvePhotoFilePath()`, a
   local-filesystem-only lookup, so it is broken under
   `STORAGE_BACKEND=s3`.
2. Its `res.sendFile()` error callback logs the failure but never sends a
   response, so the request hangs instead of erroring.
3. It increments `photos.download_count` and inserts the `access_logs`
   row *before* the file is resolved or sent, so failed downloads are
   recorded as successful ones.

Together, (1) and (2) mean that on an S3-backed deployment **every
single-photo download hangs**, while (3) means each of those hangs is
still counted as a successful download.

Observed on `main` at `eb263137b98935754155824de2a03848121304b6`.

## 1. The route ignores the storage backend

```js
// backend/src/routes/gallery.js:667
filePath = resolvePhotoFilePath(req.event, photo);
```

`resolvePhotoFilePath()` joins `STORAGE_PATH` with the photo's relative
path and returns a local disk path. That is correct only under
`STORAGE_BACKEND=local`. With `STORAGE_BACKEND=s3` the managed photo is in
the bucket and was never written to the container's filesystem, so this
names a file that does not exist.

This looks like a missed call site rather than an intentional difference,
because the rest of the same file already does the right thing. The sibling
`download-all` (line 739) and `download-selected` (line 907) routes, and
the `thumbnail` / `hero` / `preview` routes below them, all resolve managed
photos via `resolvePhotoStorageKey()` + `getStorage()` and stream through
the storage abstraction. `backend/src/routes/protectedImages.js` does the
same. Only the single-photo download route was left on the local path.

## 2. The `res.sendFile()` error path never responds

```js
// backend/src/routes/gallery.js:716-725
res.sendFile(filePath, (downloadError) => {
  if (downloadError) {
    logger.error('Error streaming gallery download', {
      slug: req.params.slug,
      photoId,
      eventId: req.event.id,
      error: downloadError.message,
    });
  }
});
```

The callback logs and returns. It never calls `res.status()`, `res.end()`,
`res.json()`, or `next(downloadError)`, so no response is ever sent and the
request stays open until the client times out. Because the callback
consumes the error, Express's default error handler does not run either.

So the failure surfaces to the user as a hang rather than as the `404` the
route clearly intends a few lines earlier. This is worth fixing on its own
even with `STORAGE_BACKEND=local`, since any unreadable or deleted file
reaches the same path.

## 3. The download is recorded before it is known to have succeeded

```js
// backend/src/routes/gallery.js:653-663 — before the file is resolved
await db('photos').where('id', photoId).increment('download_count', 1);

await db('access_logs').insert({
  event_id: req.event.id,
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
  action: 'download',
  photo_id: photoId
});
```

Both writes commit ahead of any attempt to read or send the file. A request
that subsequently 404s — or, per (2), hangs having sent nothing — is still
counted in `photos.download_count` and still produces an
`action: 'download'` row in `access_logs`. Download statistics count
failures as successes, and the access log asserts a delivery that did not
happen.

This is backend-independent: the same ordering miscounts a local-mode
download whose file is missing, or one the client aborts mid-transfer. But
combined with (1) and (2), an S3 deployment inflates the counter on *every*
download, so the statistic is not merely imprecise — it is inverted.

## Reproduction

With `STORAGE_BACKEND=s3` configured (any S3-compatible service), and an
active, unexpired event with `allow_downloads` true and at least one
uploaded photo:

```
$ curl -m 30 -b <gallery-cookie-jar> \
    http://<host>/api/gallery/<slug>/download/<photoId>
```

**Observed:** no response; curl exits on its own timeout. The server log
shows an `ENOENT` for a path under `STORAGE_PATH` that does not exist.
`photos.download_count` for that photo has been incremented anyway, and a
new `action: 'download'` row is present in `access_logs`.

**Expected:** the photo's bytes streamed from the bucket; or, if the object
really is missing, a `404` — with no increment and no access-log row.

The `download-all` route on the same gallery succeeds, which is a useful
contrast: it is the same storage, same event, same credentials, and it
works because it goes through the storage abstraction.

## Suggested fix

Mirroring what the sibling routes in the same file already do:

1. Resolve with `resolvePhotoStorageKey(req.event, photo)`. A `null` key
   means an external/reference photo, which does legitimately live on a
   local mount — keep `resolvePhotoFilePath()` for that case only.
2. For a managed photo, `stat()` the key through `getStorage()`; a `null`
   stat is the honest `404`. Otherwise set `Content-Length` from the stat
   and pipe `storage.get(key)` to the response — the same shape as the
   thumbnail route at line 1341.
3. Watermarking needs a real path, so wrap it in `withLocalCopy()` the way
   the thumbnail/hero/preview routes do — a no-op under local storage, a
   temp-file materialisation under S3.
4. Give every failure path a response: `res.status(...).json(...)` while
   headers have not been sent, and `res.destroy(err)` once they have.
5. Move the `download_count` increment and the `access_logs` insert behind
   a confirmed send — the response's `finish` event, plus `res.sendFile()`'s
   success callback — guarded so the pair runs at most once.

Happy to open a PR along these lines if that would help.
