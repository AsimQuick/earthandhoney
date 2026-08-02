<!--
---
file: MEDIA_REUSE_ADR.md
project: earthandhoney
purpose: AC-19.1 — states, on evidence from the running fork, how tightly an
         image is currently bound to a single gallery, and whether one stored
         original can already be referenced by more than one gallery. This
         document will grow to record the rest of US-19's media-reuse
         decision (AC-19.2/19.3) in later commits; this entry answers only
         AC-19.1's evidence question.
created-by: dev-team
related-story: US-19
related-ac: 19.1
---
-->

# Media Reuse ADR

## AC-19.1 — Current binding: how tightly is an image bound to a single gallery?

### Which running system this evidence is against

Per `SYSTEM_OWNERSHIP.md`'s ownership table, PicPeak/Backstage — not the
dormant Payload `Media`/`Galleries` collections — is the single
authoritative system for "Gallery & media data (galleries, images,
thumbnails/derivatives, uploads, access/expiry, delivery)." The evidence
below is therefore drawn from the running fork at `vendor/picpeak/backend`,
the live system, using the terminology mapping `PIVOT_AUDIT.md` already
established: the PRD's "Gallery" is upstream's `events` table (see
`PIVOT_AUDIT.md`'s AC-17.1.3.1 section, "Upstream does not have a 'Gallery'
object — it has an Event").

For completeness: the dormant Payload `Galleries` collection
(`src/collections/Galleries.ts:66-75`) models its `images` field as an
`array` of `relationship` rows pointing at `media`, which is structurally
capable of letting the same `media` document be listed inside more than one
`galleries` document — but that collection is not the live system per
`SYSTEM_OWNERSHIP.md`, so it does not change the answer for "currently."
This ADR answers the question against the fork that is actually running.

### Schema level: a photo row belongs to exactly one event, enforced by a foreign key

`photos.event_id` is declared as a direct foreign key to `events.id`, with
cascading delete, when the `photos` table is created:

```js
// vendor/picpeak/backend/src/database/db.js:277-289
await db.schema.createTable('photos', (table) => {
  table.increments('id').primary();
  table.integer('event_id').references('id').inTable('events').onDelete('CASCADE');
  table.string('filename').notNullable();
  table.string('path').notNullable();
  ...
});
```

There is no join table between photos and events (no `gallery_photos`,
`photo_events`, or equivalent many-to-many table anywhere in
`vendor/picpeak/backend/src/database/db.js` or
`vendor/picpeak/backend/migrations/`). Every other place a photo is scoped
in the schema — `photo_categories.event_id`
(`vendor/picpeak/backend/src/database/db.js:537`) and
`access_logs.event_id` (`vendor/picpeak/backend/src/database/db.js:316`) —
is itself scoped to a single event, not a mechanism for cross-event sharing.
Structurally, one `photos` row can only ever belong to one `events` row.

### Application level: the update API refuses to move a photo between events

`photoService.updatePhoto` explicitly strips `event_id` out of any update
payload before writing it, so there is no supported route — not even an
internal one — that can reassign an existing photo row to a different
event:

```js
// vendor/picpeak/backend/src/services/photoService.js:73-78
const updatePhoto = async (photoId, updates) => {
  // Don't allow updating certain fields
  delete updates.id;
  delete updates.event_id;
  delete updates.file_path;
  delete updates.created_at;
  ...
```

### Storage level: the physical file lives under a path namespaced to one event, with no content-addressing or dedup

The storage key for every managed photo is built from the owning event's
slug, documented explicitly in the resolver that computes it:

```js
// vendor/picpeak/backend/src/services/photoResolver.js:13-15, 20-38
// Storage layout (relative to STORAGE_PATH or S3 bucket prefix):
//   events/active/{slug}/individual/{filename}
//   events/active/{slug}/collages/{filename}
function resolvePhotoStorageKey(event, photo) { ... }
```

Both the local-filesystem and S3-compatible storage backends
(`vendor/picpeak/backend/src/services/storage/LocalFsStorage.js:47-72`) do
plain key-based `put`/`get`/`delete` on that literal path — there is no
content-addressable storage (CAS) layer, and no hash/checksum-based
deduplication anywhere in the upload pipeline (`photoProcessor.js`,
`photoService.js`, `photoResolver.js`, and the storage backends were
grepped for `sha256`/`md5`/`checksum`/`dedup`; the only hash-shaped hit is
an unrelated `crypto.randomBytes` call generating an upload batch id at
`vendor/picpeak/backend/src/services/photoProcessor.js:318`). Uploading
identical bytes to two different events produces two distinct files at two
distinct storage keys and two distinct `photos` rows — never one shared
original.

Deleting an event confirms the same exclusive-ownership design from the
other direction: `deleteEventCascade` deletes every `photos` row scoped to
that event, then recursively removes the event's *entire* storage folder:

```js
// vendor/picpeak/backend/src/routes/adminEvents.js:282, 291-293
await trx('photos').where('event_id', eventId).del();
...
const eventFolderPath = path.join(storagePath, 'events', 'active', event.folder_path);
await fs.rm(eventFolderPath, { recursive: true, force: true });
```

If a stored original could belong to more than one gallery, this recursive
delete would silently destroy another gallery's images too. It doesn't
guard against that case at all, because the running fork's storage model
never puts it in that position — every file directory is exclusive to one
event.

### Conclusion

An image is bound **tightly and exclusively** to a single gallery in the
running fork, enforced independently at three layers that all agree:

1. **Schema** — `photos.event_id` is a required foreign key to one `events`
   row; no join table exists to model a many-to-many relationship.
2. **Application** — the only update path for a photo (`updatePhoto`)
   actively discards any attempt to change `event_id`.
3. **Storage** — each photo's file lives at a path namespaced under its
   owning event's slug, with no content-addressing or hash-based dedup, and
   an event's storage folder is deleted wholesale when the event is
   deleted.

**No** — one stored original cannot currently be referenced by more than one
gallery. Reusing an image across two galleries today would require
uploading and storing the bytes a second time as a wholly separate `photos`
row and a wholly separate file, under the second gallery's own event.
