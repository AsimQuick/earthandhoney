/**
 * ---
 * file: src/__tests__/us19-ac19.1-media-reuse-adr.test.ts
 * project: earthandhoney
 * purpose: Verify AC-19.1 — MEDIA_REUSE_ADR.md exists and states, on evidence
 *          from the running fork, how tightly an image is bound to a single
 *          gallery and whether one stored original can already be referenced
 *          by more than one gallery. Cross-checks every citation the ADR
 *          makes against the actual vendored PicPeak source so the claims
 *          are evidence, not assertion.
 * created-by: dev-team
 * related-story: US-19
 * related-ac: 19.1
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const DOC_PATH = 'MEDIA_REUSE_ADR.md'

describe('AC-19.1: MEDIA_REUSE_ADR.md documents current image-to-gallery binding tightness', () => {
  it('MEDIA_REUSE_ADR.md exists at the repo root', () => {
    expect(exists(DOC_PATH)).toBe(true)
  })

  const doc = read(DOC_PATH)

  it('carries the structured metadata header required for every code/doc file', () => {
    expect(doc).toMatch(/file:\s*MEDIA_REUSE_ADR\.md/)
    expect(doc).toMatch(/related-story:\s*US-19/)
    expect(doc).toMatch(/related-ac:\s*19\.1/)
  })

  it('grounds the evidence in the running fork (PicPeak/Backstage), citing SYSTEM_OWNERSHIP.md as the reason', () => {
    expect(doc).toMatch(/SYSTEM_OWNERSHIP\.md/)
    expect(doc).toMatch(/vendor\/picpeak\/backend/)
  })

  it('answers the binding-tightness question explicitly', () => {
    expect(doc).toMatch(/tightly and exclusively/i)
  })

  it('answers the reuse question explicitly: no, one original cannot currently be referenced by more than one gallery', () => {
    expect(doc).toMatch(/\*\*No\*\*\s*—\s*one stored original cannot currently be referenced by more than one\s*\ngallery/)
  })

  describe('schema-level citation is real: photos.event_id is a foreign key to events, no join table exists', () => {
    const dbSrc = read('vendor/picpeak/backend/src/database/db.js')

    it('ADR cites db.js for the photos table creation', () => {
      expect(doc).toMatch(/database\/db\.js:277-289/)
    })

    it('photos.event_id is declared as a foreign key referencing events.id', () => {
      expect(dbSrc).toMatch(
        /createTable\('photos'[\s\S]{0,400}table\.integer\('event_id'\)\.references\('id'\)\.inTable\('events'\)\.onDelete\('CASCADE'\)/,
      )
    })

    it('no gallery_photos/photo_events-style many-to-many join table exists in db.js', () => {
      expect(dbSrc).not.toMatch(/gallery_photos|photo_events|photos_events|photo_galleries/)
    })
  })

  describe('application-level citation is real: updatePhoto strips event_id from update payloads', () => {
    const serviceSrc = read('vendor/picpeak/backend/src/services/photoService.js')

    it('ADR cites photoService.js for the update guard', () => {
      expect(doc).toMatch(/photoService\.js:73-78/)
    })

    it('updatePhoto deletes event_id from the updates object before writing', () => {
      expect(serviceSrc).toMatch(/const updatePhoto = async[\s\S]{0,200}delete updates\.event_id;/)
    })
  })

  describe('storage-level citations are real: event-slug-namespaced keys, no CAS/dedup, cascade delete removes the whole folder', () => {
    const resolverSrc = read('vendor/picpeak/backend/src/services/photoResolver.js')
    const localFsSrc = read('vendor/picpeak/backend/src/services/storage/LocalFsStorage.js')
    const adminEventsSrc = read('vendor/picpeak/backend/src/routes/adminEvents.js')
    const photoProcessorSrc = read('vendor/picpeak/backend/src/services/photoProcessor.js')

    it('ADR cites photoResolver.js for the per-event storage key layout', () => {
      expect(doc).toMatch(/photoResolver\.js:13-15, 20-38/)
    })

    it('the storage key is documented and built as events/active/{slug}/...', () => {
      expect(resolverSrc).toMatch(/events\/active\/\{slug\}\/individual\/\{filename\}/)
      expect(resolverSrc).toMatch(/function resolvePhotoStorageKey\(event, photo\)/)
    })

    it('the local storage backend does plain key-based put/get/delete (no content-addressing)', () => {
      expect(localFsSrc).toMatch(/async put\(relPath, body/)
    })

    it('no content-hash/dedup logic exists across the upload pipeline', () => {
      for (const src of [resolverSrc, localFsSrc, photoProcessorSrc, read('vendor/picpeak/backend/src/services/photoService.js')]) {
        expect(src).not.toMatch(/sha256|md5|checksum|content-?hash|dedupe?\(/i)
      }
    })

    it('ADR cites adminEvents.js for the cascade-delete evidence', () => {
      expect(doc).toMatch(/adminEvents\.js:282, 291-293/)
    })

    it('deleteEventCascade deletes photos rows for the event then recursively removes its storage folder', () => {
      expect(adminEventsSrc).toMatch(/trx\('photos'\)\.where\('event_id', eventId\)\.del\(\)/)
      expect(adminEventsSrc).toMatch(/fs\.rm\(eventFolderPath, \{ recursive: true, force: true \}\)/)
    })
  })

  describe('acknowledges the removed Payload model without letting it change the "currently" answer', () => {
    it('ADR notes the Payload Galleries collection was removed (US-28 AC-28.1.1), not merely dormant', () => {
      expect(doc).toMatch(/removed by US-28 AC-28\.1\.1/)
      expect(doc).toMatch(/not the live system/)
    })
  })
})
