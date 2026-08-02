/**
 * ---
 * file: src/__tests__/us18-ac18.6-terminology-mapping.test.ts
 * project: earthandhoney
 * purpose: Verify AC-18.6 — PAYLOAD_PICPEAK_API_CONTRACT.md records a
 *          user-facing terminology mapping so internal names and the
 *          language the photographer sees never drift apart: PicPeak's
 *          internal "Event" object is presented as Gallery, distinct from
 *          this project's own controlled-vocabulary Event (a dated
 *          occasion inside a Project); the customer account is Client, the
 *          admin area is Backstage, and the customer portal is the Project
 *          Room. Also cross-checks the document's cited evidence directly
 *          against the pinned fork's source so the mapping cannot silently
 *          drift from what the vendored code actually says.
 * created-by: dev-team
 * related-story: US-18
 * related-ac: 18.6
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const DOC_PATH = 'PAYLOAD_PICPEAK_API_CONTRACT.md'

function section(doc: string, heading: string): string {
  const start = doc.indexOf(heading)
  expect(start).toBeGreaterThan(-1)
  const nextHeadingMatch = doc.slice(start + heading.length).match(/\n## /)
  const end = nextHeadingMatch ? start + heading.length + nextHeadingMatch.index! : undefined
  return doc.slice(start, end)
}

describe('AC-18.6: a user-facing terminology mapping is recorded', () => {
  it('PAYLOAD_PICPEAK_API_CONTRACT.md exists at the repo root', () => {
    expect(exists(DOC_PATH)).toBe(true)
  })

  const doc = read(DOC_PATH)

  it('carries an updated structured metadata header covering AC-18.6', () => {
    expect(doc).toMatch(/file:\s*PAYLOAD_PICPEAK_API_CONTRACT\.md/)
    expect(doc).toMatch(/related-story:\s*US-18/)
    expect(doc).toMatch(/related-ac:\s*18\.2,\s*18\.3,\s*18\.4,\s*18\.5,\s*18\.6/)
  })

  it('has a dedicated section naming this AC', () => {
    expect(doc).toMatch(/## User-facing terminology mapping \(AC-18\.6\)/)
  })

  it('no longer states that the terminology mapping is deferred to a future AC', () => {
    expect(doc).not.toMatch(/does \*\*not\*\* yet state the user-facing terminology mapping/)
  })

  const mapping = section(doc, '## User-facing terminology mapping (AC-18.6)')
  const flat = mapping.replace(/\s+/g, ' ')

  describe('PicPeak internal Event -> Gallery', () => {
    it('names the internal object and its user-facing word', () => {
      expect(flat).toMatch(/PicPeak's `Event` object[\s\S]*?\*\*Gallery\*\*/)
      expect(mapping).toMatch(/`events` table/)
      expect(mapping).toMatch(/`\/api\/v1\/events`/)
    })

    it('cites concrete evidence for the Event -> Gallery relabelling', () => {
      expect(mapping).toMatch(/EventsListPage\.tsx:572/)
      expect(mapping).toMatch(/events\.viewGallery/)
      expect(mapping).toMatch(/CustomerDashboardPage\.tsx:2,46/)
      expect(mapping).toMatch(/\/gallery\/:slug/)
    })
  })

  describe('this project\'s own Event stays distinct', () => {
    it('names it as a dated occasion inside a Project and does not rename it', () => {
      expect(flat).toMatch(/dated occasion inside a Project/)
      expect(flat).toMatch(/ceremony/)
      expect(flat).toMatch(/deliberately not renamed/)
    })

    it('explicitly warns against confusing it with PicPeak\'s internal Event', () => {
      expect(flat).toMatch(/distinct from, and not to be confused with, PicPeak's internal `Event` object/)
    })
  })

  describe('remaining terminology pairs', () => {
    it('maps the customer account to Client', () => {
      expect(flat).toMatch(/customer_account[\s\S]{0,400}\*\*Client\*\*/)
    })

    it('maps the admin area to Backstage', () => {
      expect(flat).toMatch(/admin UI as a whole[\s\S]{0,400}\*\*Backstage\*\*/)
    })

    it('maps the customer portal to the Project Room', () => {
      expect(flat).toMatch(/customer-facing UI[\s\S]{0,400}\*\*Project Room\*\*/)
      expect(mapping).toMatch(/po-requests\.md/)
    })
  })

  it('states the enforcement rule tying user-facing copy to the mapping table', () => {
    expect(flat).toMatch(/is a defect against this\s*\n?\s*table/)
  })

  describe('cited evidence is verified directly against the pinned fork source', () => {
    const vendorRoot = path.join(root, 'vendor/picpeak/frontend/src')

    it('EventsListPage.tsx labels the gallery-link action with the events.viewGallery key', () => {
      const filePath = path.join(vendorRoot, 'pages/admin/EventsListPage.tsx')
      expect(fs.existsSync(filePath)).toBe(true)
      const lines = fs.readFileSync(filePath, 'utf8').split('\n')
      expect(lines[571]).toMatch(/t\('events\.viewGallery'\)/)
    })

    it("en.json translates events.viewGallery to 'View Gallery'", () => {
      const filePath = path.join(vendorRoot, 'i18n/locales/en.json')
      expect(fs.existsSync(filePath)).toBe(true)
      const en = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      expect(en.events.viewGallery).toBe('View Gallery')
    })

    it('CustomerDashboardPage.tsx frames the Event list as galleries in its own comments', () => {
      const filePath = path.join(vendorRoot, 'pages/customer/CustomerDashboardPage.tsx')
      expect(fs.existsSync(filePath)).toBe(true)
      const lines = fs.readFileSync(filePath, 'utf8').split('\n')
      expect(lines[1]).toMatch(/list of every gallery the admin has granted/)
      expect(lines[45]).toMatch(/which gallery did they upload yesterday/)
      expect(lines[59]).toMatch(/queryKey: \['customer-events'\]/)
    })

    it('no page-building capability section elsewhere in the doc is disturbed by this addition', () => {
      expect(doc).toMatch(/### 3\. Page-building capability — audited, not present/)
    })
  })
})
