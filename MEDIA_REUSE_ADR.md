<!--
---
file: MEDIA_REUSE_ADR.md
project: earthandhoney
purpose: AC-19.1 — states, on evidence from the running fork, how tightly an
         image is currently bound to a single gallery, and whether one stored
         original can already be referenced by more than one gallery.
         AC-19.2 — building on that evidence, chooses exactly one path
         forward for media reuse and records the reasons, the risks, and
         what would have to be true to revisit the decision. This document
         will grow further to record AC-19.3's guarantees in a later commit.
created-by: dev-team
related-story: US-19
related-ac: 19.1, 19.2
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

## AC-19.2 — Decision: the path forward

### Candidate paths considered

1. **Keep the upstream binding for V1, with a safe promotion workflow.**
   Leave `photos.event_id` exactly as AC-19.1 found it — an exclusive,
   required foreign key with no join table — and add a "promote to
   portfolio" action that copies a client photo's bytes into a second,
   photographer-owned event that acts as the public portfolio.
2. **Introduce a reusable media-asset and gallery-item layer through new
   migrations.** Add fork-owned tables — a `media_assets` table that owns
   one row per stored original (independent of any single event) and a
   `gallery_items` join table that maps a `media_asset` into one or more
   events with its own per-event sort order, caption, and visibility — as
   new, additive migrations on top of the vendored upstream schema.
3. **An equivalent low-risk model** not covered by (1) or (2) — e.g.
   hard-linking files at the storage layer while keeping `photos` rows
   separate, or a database view.

### Decision: option 2 — a reusable `media_assets` / `gallery_items` layer, added as new fork-owned migrations

This ADR commits to **option 2**. `photos`, `photo_categories`, and every
existing upstream route and service keep working exactly as AC-19.1 found
them — nothing already shipped is touched. The new layer is additive:
`media_assets` records one row per stored original, and `gallery_items`
records that a given `media_asset` appears in a given event, with its own
ordering and metadata. A client gallery's photos get a `media_asset` row at
upload time; promoting one photo into the public portfolio means inserting
one new `gallery_items` row that points the existing `media_asset` at the
portfolio event — never re-uploading or re-storing the bytes, and never
touching the client gallery's own event or its other photos.

### Reasons

- **Option 1 cannot satisfy the no-duplicate-original guarantee this
  decision is accountable to.** AC-19.1 already established, at three
  independent layers (schema FK, the `updatePhoto` guard, and the
  event-slug-namespaced storage path with no content-addressing or dedup),
  that there is no supported route to attach an existing `photos` row to a
  second event. A "safe promotion workflow" built on top of that binding
  therefore has only one implementation available: copy the bytes into the
  target event and create a second `photos` row. That is a real second copy
  of the original on disk/in R2 and a second row to keep in sync by hand —
  exactly the outcome AC-19.3 requires this decision to avoid. Working
  around the binding instead (e.g. patching `updatePhoto` to allow
  `event_id` reassignment, or manually reparenting a photo's storage key)
  would mean forking upstream's own invariant, which contradicts Fork
  Discipline and adds a new conflict-prone patch to `UPSTREAM_SYNC.md` §2
  for no benefit over option 2.
- **Option 2 is additive, not a modification of anything already shipped.**
  It only adds new tables via new migration files with higher numbers than
  anything vendored — it does not alter `photos`, `photo_categories`, or any
  already-shipped upstream migration. `UPSTREAM_SYNC.md` §3 already
  anticipates and names this exact situation ("the sprint that introduces
  the first extension migration") as the fork's expected, supported way to
  extend the schema, so this is the intended escape hatch, not a novel risk.
- **Option 2 directly enables the rest of AC-19.3's requirements with no
  further structural change:** per-gallery ordering/metadata overrides live
  on `gallery_items`, not on the shared `media_asset`, so two events can
  show the same image with different captions or positions; a promotion is
  exactly one new `gallery_items` row scoped to one `media_asset` and one
  target event, so it can never expose any other row in the source private
  gallery — there is no bulk or gallery-level share, only a single,
  deliberate, item-level join.
- **Option 3 (hard links / DB views) was rejected** because Cloudflare R2 is
  an S3-compatible object store, not a filesystem — object storage has no
  hard-link primitive, so that variant of option 3 is not implementable
  as stated. A read-only DB view over `photos` cannot express a *new*
  event-to-photo association at all (a view only reshapes existing rows),
  so it cannot support promotion into a different event's gallery in the
  first place. No variant of option 3 was found that both avoids storing
  the original twice and does not simply re-derive option 2's join table
  under a different name.

### Risks

- **Two sources of truth during the transition.** Until every upload path
  writes a `media_asset` row alongside its `photos` row, some photos exist
  only in the old exclusive model. Risk: a photo uploaded before the new
  layer exists cannot be promoted until it is backfilled. Mitigation: the
  migration that introduces `media_assets` must backfill one row per
  existing `photos` row before any promotion feature ships.
- **New schema surface increases future sync risk.** `UPSTREAM_SYNC.md` §2
  already flags "database migration files" as the highest-risk conflict
  category; adding fork-owned tables grows that surface. Mitigation: this
  decision must be logged as a `deviation` entry in `FORK_CHANGELOG.md` when
  the migration lands, and the new migration file added to
  `UPSTREAM_SYNC.md` §2 by name, exactly as that document's own process
  requires.
- **New integration work the simpler option 1 would not need.** The
  Frontstage/Backstage boundary (`PAYLOAD_PICPEAK_API_CONTRACT.md`) and any
  admin UI for promotion need new endpoints to read and write
  `gallery_items`; option 1 could have reused the existing upload endpoint
  with no new API surface. This is accepted as the cost of meeting
  AC-19.3's guarantees, not treated as free.
- **Migration correctness risk is on this fork, not upstream.** Because
  `media_assets`/`gallery_items` are fork-owned, any bug in them (e.g. an
  orphaned `gallery_items` row after a `media_asset` delete) is this
  project's to detect and fix; upstream will never patch it. Mitigation:
  the migration must declare a foreign key with `onDelete('CASCADE')` from
  `gallery_items.media_asset_id` to `media_assets.id`, mirroring the
  cascade discipline AC-19.1 found upstream already uses for
  `photos.event_id`.

### What would have to be true to revisit this decision

- **Upstream ships a native cross-event media-reuse mechanism** that this
  fork later pulls in through `PICPEAK_UPSTREAM.md` §3's update-evaluation
  process. If a future pinned commit gives `photos` its own many-to-many
  join to events, the fork-owned `media_assets`/`gallery_items` layer
  becomes redundant and should be retired in favour of the upstream-native
  one, per `UPSTREAM_SYNC.md` §4's drop-rather-than-merge pattern for
  patches upstream has since obsoleted.
- **Promotion turns out to be needed rarely or never.** This decision
  accepts real migration and integration cost specifically to satisfy
  AC-19.3's no-duplicate-original guarantee. If actual usage shows the
  photographer promotes only a handful of images a year, the storage
  savings option 2 buys may not be worth the added schema and sync-risk
  surface, and a simple, manually-tracked copy (option 1) should be
  reconsidered.
- **The no-duplicate-original guarantee is relaxed or dropped from scope.**
  This decision is chosen *because* AC-19.3 requires no original to be
  stored twice. If that requirement is ever removed or weakened (e.g.
  because storage cost is judged negligible for this project's expected
  photo volume), option 1's simpler copy-on-promote model becomes viable
  again and should be re-evaluated against option 2 on cost/complexity
  alone.
