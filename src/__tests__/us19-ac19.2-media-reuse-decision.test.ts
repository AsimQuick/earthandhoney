/**
 * ---
 * file: src/__tests__/us19-ac19.2-media-reuse-decision.test.ts
 * project: earthandhoney
 * purpose: Verify AC-19.2 — MEDIA_REUSE_ADR.md's decision record chooses
 *          exactly one path forward for the media-reuse model and states
 *          the reasons, the risks, and what would have to be true to
 *          revisit the decision. Also checks the decision is internally
 *          consistent with the AC-19.1 evidence it builds on and with the
 *          real UPSTREAM_SYNC.md process it cites.
 * created-by: dev-team
 * related-story: US-19
 * related-ac: 19.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const DOC_PATH = 'MEDIA_REUSE_ADR.md'

describe('AC-19.2: MEDIA_REUSE_ADR.md decision record chooses exactly one path forward', () => {
  it('MEDIA_REUSE_ADR.md exists at the repo root', () => {
    expect(exists(DOC_PATH)).toBe(true)
  })

  const doc = read(DOC_PATH)

  it('front matter now covers both 19.1 and 19.2', () => {
    expect(doc).toMatch(/related-ac:\s*19\.1,\s*19\.2/)
  })

  it('has a dedicated AC-19.2 decision heading', () => {
    expect(doc).toMatch(/## AC-19\.2 — Decision: the path forward/)
  })

  describe('names all three candidate paths from the AC text', () => {
    it('candidate 1: keep the upstream binding with a safe promotion workflow', () => {
      expect(doc).toMatch(/keep the upstream binding for V1, with a safe promotion workflow/i)
    })

    it('candidate 2: a reusable media-asset and gallery-item layer via new migrations', () => {
      expect(doc).toMatch(/reusable media-asset and gallery-item layer through new\s*\n?\s*migrations/i)
    })

    it('candidate 3: an equivalent low-risk model', () => {
      expect(doc).toMatch(/equivalent low-risk model/i)
    })
  })

  it('chooses exactly one candidate explicitly, by number', () => {
    const decisionMatches = doc.match(/This ADR commits to \*\*option (\d)\*\*/)
    expect(decisionMatches).not.toBeNull()
    expect(['1', '2', '3']).toContain(decisionMatches![1])
  })

  it('the chosen option is option 2 (media_assets / gallery_items layer)', () => {
    expect(doc).toMatch(/This ADR commits to \*\*option 2\*\*/)
  })

  it('does not simultaneously claim to commit to more than one option', () => {
    const commitCount = (doc.match(/This ADR commits to \*\*option \d\*\*/g) || []).length
    expect(commitCount).toBe(1)
  })

  it('has a Reasons section with substantive content', () => {
    const match = doc.match(/### Reasons\n\n([\s\S]*?)\n### Risks/)
    expect(match).not.toBeNull()
    expect(match![1].length).toBeGreaterThan(200)
  })

  it('has a Risks section with substantive content', () => {
    const match = doc.match(/### Risks\n\n([\s\S]*?)\n### What would have to be true to revisit/)
    expect(match).not.toBeNull()
    expect(match![1].length).toBeGreaterThan(200)
  })

  it('has a "what would have to be true to revisit" section with substantive content', () => {
    const idx = doc.indexOf('### What would have to be true to revisit this decision')
    expect(idx).toBeGreaterThan(-1)
    const tail = doc.slice(idx)
    expect(tail.length).toBeGreaterThan(200)
  })

  describe('the reasoning is grounded in the real AC-19.1 evidence and the real fork-discipline docs it cites', () => {
    it('reasons cite the AC-19.1 evidence (schema FK, updatePhoto guard, storage namespacing) as why option 1 cannot meet the no-duplicate-original guarantee', () => {
      const match = doc.match(/### Reasons\n\n([\s\S]*?)\n### Risks/)
      const reasons = match![1]
      expect(reasons).toMatch(/updatePhoto/)
      expect(reasons).toMatch(/no-duplicate-original/i)
    })

    it('references UPSTREAM_SYNC.md, and that document really names "database migration files" as a conflict-prone category', () => {
      expect(doc).toMatch(/UPSTREAM_SYNC\.md/)
      const sync = read('UPSTREAM_SYNC.md')
      expect(sync).toMatch(/Database migration files/i)
    })

    it('references UPSTREAM_SYNC.md §3\'s deferred-extension-migration language, and that language really exists there', () => {
      expect(doc).toMatch(/the first extension migration/i)
      const sync = read('UPSTREAM_SYNC.md')
      expect(sync).toMatch(/the sprint that introduces this fork's first\s*\nextension migration/i)
    })

    it('references FORK_CHANGELOG.md as where the new migration must be logged as a deviation', () => {
      expect(doc).toMatch(/FORK_CHANGELOG\.md/)
      expect(exists('FORK_CHANGELOG.md')).toBe(true)
    })

    it('references the real PAYLOAD_PICPEAK_API_CONTRACT.md when naming the added integration-work risk', () => {
      expect(doc).toMatch(/PAYLOAD_PICPEAK_API_CONTRACT\.md/)
      expect(exists('PAYLOAD_PICPEAK_API_CONTRACT.md')).toBe(true)
    })
  })

  it('states the promotion mechanism as inserting a new gallery_items row rather than re-uploading bytes', () => {
    expect(doc).toMatch(/never re-uploading or re-storing the bytes/i)
  })

  it('states that a promotion can never expose the rest of a private gallery, per the decision text', () => {
    expect(doc).toMatch(/can never expose any other row in the source private\s+gallery/i)
  })
})
