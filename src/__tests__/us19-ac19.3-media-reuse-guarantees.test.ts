/**
 * ---
 * file: src/__tests__/us19-ac19.3-media-reuse-guarantees.test.ts
 * project: earthandhoney
 * purpose: Verify AC-19.3 — MEDIA_REUSE_ADR.md specifies, at schema and
 *          mechanism level, how the chosen media_assets/gallery_items model
 *          guarantees no original binary is stored twice, that per-gallery
 *          ordering and metadata overrides remain possible, that selected
 *          client images can be promoted into a public portfolio gallery
 *          deliberately, and that promoting one image can never expose the
 *          rest of a private gallery. Also cross-checks the cited evidence
 *          (require_password, password_hash, share_token columns) against
 *          the real vendored fork source.
 * created-by: dev-team
 * related-story: US-19
 * related-ac: 19.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const DOC_PATH = 'MEDIA_REUSE_ADR.md'
const EVENT_SERVICE_PATH = 'vendor/picpeak/backend/src/services/eventService.js'
const DB_PATH = 'vendor/picpeak/backend/src/database/db.js'

describe('AC-19.3: MEDIA_REUSE_ADR.md specifies how the chosen model provides its four guarantees', () => {
  it('MEDIA_REUSE_ADR.md exists at the repo root', () => {
    expect(exists(DOC_PATH)).toBe(true)
  })

  const doc = read(DOC_PATH)

  it('front matter now covers 19.1, 19.2, and 19.3', () => {
    expect(doc).toMatch(/related-ac:\s*19\.1,\s*19\.2,\s*19\.3/)
  })

  it('has a dedicated AC-19.3 guarantees heading', () => {
    expect(doc).toMatch(/## AC-19\.3 — Guarantees the chosen model must provide/)
  })

  const section = (() => {
    const idx = doc.indexOf('## AC-19.3 — Guarantees the chosen model must provide')
    expect(idx).toBeGreaterThan(-1)
    return doc.slice(idx)
  })()

  describe('schema-level table specification', () => {
    it('defines media_assets with a unique storage_key and unique checksum', () => {
      expect(section).toMatch(/media_assets/)
      expect(section).toMatch(/storage_key\s+TEXT UNIQUE NOT NULL/)
      expect(section).toMatch(/checksum\s+TEXT UNIQUE NOT NULL/)
    })

    it('defines gallery_items with a foreign key to media_assets and to events, each cascading on delete', () => {
      expect(section).toMatch(/gallery_items/)
      expect(section).toMatch(/media_asset_id\s+FK -> media_assets\.id/)
      expect(section).toMatch(/ON DELETE CASCADE/)
      expect(section).toMatch(/event_id\s+FK -> events\.id/)
    })

    it('gallery_items declares a UNIQUE constraint on (media_asset_id, event_id)', () => {
      expect(section).toMatch(/UNIQUE \(media_asset_id, event_id\)/)
    })

    it('gallery_items carries its own sort_order, caption, title, and is_hero columns', () => {
      expect(section).toMatch(/sort_order\s+INTEGER NOT NULL/)
      expect(section).toMatch(/caption\s+TEXT/)
      expect(section).toMatch(/title\s+TEXT/)
      expect(section).toMatch(/is_hero\s+BOOLEAN/)
    })

    it('states no migration is written yet, deferring to the sprint that introduces the first extension migration', () => {
      expect(section).toMatch(/No migration is written yet/i)
      expect(section).toMatch(/first extension migration/i)
      expect(section).toMatch(/FORK_CHANGELOG\.md/)
    })
  })

  describe('Guarantee 1 — no original binary is stored twice', () => {
    it('has a dedicated heading', () => {
      expect(section).toMatch(/### Guarantee 1 — no original binary is stored twice/)
    })

    it('ties the guarantee to the checksum/storage_key UNIQUE constraints and a lookup-before-write upload path', () => {
      const g1 = section.match(/### Guarantee 1[\s\S]*?(?=### Guarantee 2)/)![0]
      expect(g1).toMatch(/UNIQUE NOT NULL/)
      expect(g1).toMatch(/look up `?media_assets`? by checksum/i)
    })

    it('states promotion never writes to storage or media_assets, only to gallery_items', () => {
      const g1 = section.match(/### Guarantee 1[\s\S]*?(?=### Guarantee 2)/)![0]
      expect(g1).toMatch(/INSERT.*gallery_items|only write is one `INSERT` into `gallery_items`/i)
    })

    it('grounds the gap being closed in the real AC-19.1 finding of no content-addressing or dedup', () => {
      const g1 = section.match(/### Guarantee 1[\s\S]*?(?=### Guarantee 2)/)![0]
      expect(g1).toMatch(/no content-addressable storage/i)
    })
  })

  describe('Guarantee 2 — per-gallery ordering and metadata overrides remain possible', () => {
    it('has a dedicated heading', () => {
      expect(section).toMatch(/### Guarantee 2 — per-gallery ordering and metadata overrides remain possible/)
    })

    it('states the override fields live on gallery_items, not on media_assets', () => {
      const g2 = section.match(/### Guarantee 2[\s\S]*?(?=### Guarantee 3)/)![0]
      expect(g2).toMatch(/gallery_items[\s\S]{0,40}not\s*\non `?media_assets`?/i)
    })

    it('explains the same media_asset can carry independent order/caption per event via the uniqueness constraint', () => {
      const g2 = section.match(/### Guarantee 2[\s\S]*?(?=### Guarantee 3)/)![0]
      expect(g2).toMatch(/UNIQUE \(media_asset_id, event_id\)/)
    })
  })

  describe('Guarantee 3 — selected client images can be promoted into a public portfolio gallery, deliberately', () => {
    it('has a dedicated heading', () => {
      expect(section).toMatch(/### Guarantee 3 — selected client images can be promoted into a public portfolio gallery, deliberately/)
    })

    it('names a single explicit promotion action, not a bulk or automatic mechanism', () => {
      const g3 = section.match(/### Guarantee 3[\s\S]*?(?=### Guarantee 4)/)![0]
      expect(g3).toMatch(/promotePhoto\(mediaAssetId, portfolioEventId\)/)
      expect(g3).toMatch(/no bulk "promote gallery" call/i)
      expect(g3).toMatch(/no default that flips visibility automatically/i)
    })

    it('references the real PAYLOAD_PICPEAK_API_CONTRACT.md v1 admin API precedent from AC-18.4', () => {
      const g3 = section.match(/### Guarantee 3[\s\S]*?(?=### Guarantee 4)/)![0]
      expect(g3).toMatch(/PAYLOAD_PICPEAK_API_CONTRACT\.md/)
      expect(exists('PAYLOAD_PICPEAK_API_CONTRACT.md')).toBe(true)
    })

    it('ties the public portfolio event to require_password = false, distinct from client events', () => {
      const g3 = section.match(/### Guarantee 3[\s\S]*?(?=### Guarantee 4)/)![0]
      expect(g3).toMatch(/require_password\s*=\s*false/)
      expect(g3).toMatch(/require_password\s*=\s*true/)
    })
  })

  describe('Guarantee 4 — promoting one image can never expose the rest of a private gallery', () => {
    it('has a dedicated heading', () => {
      expect(section).toMatch(/### Guarantee 4 — promoting one image can never expose the rest of a private gallery/)
    })

    it('states access is gated per-event via password_hash/require_password/share_token, never via a property of the shared asset', () => {
      const g4 = section.match(/### Guarantee 4[\s\S]*$/)![0]
      expect(g4).toMatch(/password_hash/)
      expect(g4).toMatch(/require_password/)
      expect(g4).toMatch(/share_token/)
    })

    it('states a promotion cannot read, copy, or reference any other gallery_items row in the source event', () => {
      const g4 = section.match(/### Guarantee 4[\s\S]*$/)![0]
      expect(g4).toMatch(/does not read, copy, or reference any\s*\nother `?gallery_items`? row/i)
    })

    it('states a promotion cannot alter the source event\'s access-control columns', () => {
      const g4 = section.match(/### Guarantee 4[\s\S]*$/)![0]
      expect(g4).toMatch(/cannot alter the source event's `?password_hash`?/)
    })
  })

  describe('cited evidence is real, not asserted', () => {
    it('eventService.js really declares require_password with a default of true and normalises it via parseBooleanInput/formatBoolean', () => {
      expect(exists(EVENT_SERVICE_PATH)).toBe(true)
      const svc = read(EVENT_SERVICE_PATH)
      expect(svc).toMatch(/require_password\s*=\s*true/)
      expect(svc).toMatch(/parseBooleanInput\(require_password, true\)/)
      expect(svc).toMatch(/require_password:\s*formatBoolean\(requirePassword\)/)
    })

    it('db.js really declares password_hash, share_token, and require_password columns on the events table', () => {
      expect(exists(DB_PATH)).toBe(true)
      const dbFile = read(DB_PATH)
      expect(dbFile).toMatch(/table\.string\('password_hash'\)\.notNullable\(\)/)
      expect(dbFile).toMatch(/table\.string\('share_token'\)\.unique\(\)/)
      expect(dbFile).toMatch(/table\.boolean\('require_password'\)\.defaultTo\(true\)/)
    })
  })

  it('all four guarantees from the AC text are addressed in heading order', () => {
    const headings = [...section.matchAll(/### Guarantee \d — [^\n]+/g)].map((m) => m[0])
    expect(headings.length).toBe(4)
    expect(headings[0]).toMatch(/no original binary is stored twice/)
    expect(headings[1]).toMatch(/per-gallery ordering and metadata overrides remain possible/)
    expect(headings[2]).toMatch(/promoted into a public portfolio gallery, deliberately/)
    expect(headings[3]).toMatch(/can never expose the rest of a private gallery/)
  })
})
