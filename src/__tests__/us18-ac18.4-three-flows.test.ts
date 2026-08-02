/**
 * ---
 * file: src/__tests__/us18-ac18.4-three-flows.test.ts
 * project: earthandhoney
 * purpose: Verify AC-18.4 — PAYLOAD_PICPEAK_API_CONTRACT.md covers the three
 *          flows the next sprint depends on: (A) a Frontstage page
 *          displaying a public gallery by referencing its Backstage gallery
 *          identifier, (B) a Frontstage inquiry being converted into a
 *          Backstage client and project, and (C) a Backstage change
 *          triggering a Frontstage content refresh. Also cross-checks Flow
 *          B's design decision (extending the pinned fork's v1 API family)
 *          and Flow C's dependency on the existing US-6 revalidation helper
 *          directly against the source they describe, so the document
 *          cannot silently drift from what actually exists.
 * created-by: dev-team
 * related-story: US-18
 * related-ac: 18.4
 * ---
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

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

describe('AC-18.4: the contract covers the three flows the next sprint depends on', () => {
  it('PAYLOAD_PICPEAK_API_CONTRACT.md exists at the repo root', () => {
    expect(exists(DOC_PATH)).toBe(true)
  })

  const doc = read(DOC_PATH)

  it('carries an updated structured metadata header covering AC-18.4', () => {
    expect(doc).toMatch(/file:\s*PAYLOAD_PICPEAK_API_CONTRACT\.md/)
    expect(doc).toMatch(/related-story:\s*US-18/)
    expect(doc).toMatch(/related-ac:\s*18\.2,\s*18\.3,\s*18\.4/)
  })

  it('has a dedicated section naming this AC', () => {
    expect(doc).toMatch(/## The three flows the next sprint depends on \(AC-18\.4\)/)
  })

  const flows = section(doc, '## The three flows the next sprint depends on (AC-18.4)')
  // Markdown hard-wraps prose across lines, so phrase-level assertions match
  // against a whitespace-collapsed copy rather than requiring a literal
  // contiguous substring that word-wrap could silently break.
  const flowsFlat = flows.replace(/\s+/g, ' ')

  describe('Flow A — Frontstage page displays a public gallery by its Backstage gallery identifier', () => {
    it('is named and describes storing the Backstage slug as a stored external identifier', () => {
      expect(flows).toMatch(/Flow A/)
      expect(flows).toMatch(/Backstage gallery `slug`/)
      expect(flows).toMatch(/stored external identifier/i)
    })

    it('references the call-catalog rows it reuses (gallery info + photos)', () => {
      expect(flows).toMatch(/GET \/api\/gallery\/:slug\/info/)
      expect(flows).toMatch(/\/api\/gallery\/:slug\/photos/)
    })

    it('states it introduces no second gallery-rendering system', () => {
      expect(flows).toMatch(/Gallery Engine/)
      expect(flowsFlat).toMatch(/introduces no second gallery-rendering system/)
    })
  })

  describe('Flow B — Frontstage inquiry converted into a Backstage client and project', () => {
    it('is named and explicitly closes the row-4 gap with a design decision, not a done implementation', () => {
      expect(flows).toMatch(/Flow B/)
      expect(flows).toMatch(/row-4 gap/)
      expect(flows).toMatch(/design decision/)
      expect(flowsFlat).toMatch(/not a description of code that already runs/)
    })

    it('chooses to extend the v1 Bearer-token family rather than reusing admin-cookie routes', () => {
      expect(flows).toMatch(/POST \/api\/v1\/customers/)
      expect(flows).toMatch(/POST \/api\/v1\/projects/)
      expect(flows).toMatch(/apiTokenAuth/)
      expect(flows).toMatch(/requireApiScope\('admin'\)/)
    })

    it('delegates to the existing services rather than inventing new business logic', () => {
      expect(flows).toMatch(/customerAccountsService\.createDirect\(\)/)
      expect(flows).toMatch(/projectService\.createProject\(\)/)
    })

    it('states the ids returned are stored as external identifiers, never a cross-database join', () => {
      expect(flows).toMatch(/customer_account\.id/)
      expect(flows).toMatch(/project\.id/)
      expect(flows).toMatch(/stored external identifiers/i)
    })

    it('states failure handling: no idempotency key, so retries must not be automatic/silent', () => {
      expect(flowsFlat).toMatch(/neither call is idempotent/)
      expect(flowsFlat).toMatch(/retry action/)
    })

    it('records the new routes as a Fork Discipline-compliant deviation for FORK_CHANGELOG.md, deferred to the implementing story', () => {
      expect(flows).toMatch(/Fork Discipline/)
      expect(flows).toMatch(/FORK_CHANGELOG\.md/)
    })
  })

  describe('Flow C — Backstage change triggers a Frontstage content refresh', () => {
    it('is named and walks the webhook delivery through to revalidation', () => {
      expect(flows).toMatch(/Flow C/)
      expect(flows).toMatch(/X-PicPeak-Signature/)
      expect(flows).toMatch(/getGalleryBearingPaths\(\)/)
    })

    it('states the receiver must verify the signature before trusting the payload', () => {
      expect(flowsFlat).toMatch(/verif(?:y|ies) the signature before trusting the payload/)
    })

    it('ties staleness back to the same 60-second safety net already committed to, not a new bound', () => {
      expect(flowsFlat).toMatch(/60-second safety-net cap/)
      expect(flowsFlat).toMatch(/does not introduce a new staleness ceiling/)
    })
  })

  describe('each flow states what crosses the boundary and in which direction', () => {
    it('names identifiers crossing for all three flows', () => {
      const crossingMentions = flows.match(/\*\*What crosses the boundary:\*\*/g) || []
      expect(crossingMentions.length).toBeGreaterThanOrEqual(3)
    })
  })
})

describe('AC-18.4: Flow B\'s design decision is cross-checked against the pinned fork it extends', () => {
  const doc = read(DOC_PATH)

  it('the v1 events family really does use apiTokenAuth + requireApiScope, the pattern Flow B extends', () => {
    const v1Events = read('vendor/picpeak/backend/src/routes/v1/events.js')
    expect(v1Events).toMatch(/apiTokenAuth/)
    expect(v1Events).toMatch(/requireApiScope/)
  })

  it('adminCustomers.js\'s direct-create route really is what Flow B\'s v1/customers delegates to', () => {
    const adminCustomers = read('vendor/picpeak/backend/src/routes/adminCustomers.js')
    expect(adminCustomers).toMatch(/customerAccountsService\.createDirect/)
    expect(doc).toMatch(/customerAccountsService\.createDirect\(\)/)
  })

  it('adminProjects.js\'s create route really is what Flow B\'s v1/projects delegates to', () => {
    const adminProjects = read('vendor/picpeak/backend/src/routes/adminProjects.js')
    expect(adminProjects).toMatch(/projectService\.createProject/)
    expect(doc).toMatch(/projectService\.createProject\(\)/)
  })
})

describe('AC-18.4: Flow C\'s dependency on the existing US-6 revalidation helper is real, not invented', () => {
  const doc = read(DOC_PATH)

  it('src/lib/galleryRevalidation.ts exists and exports getGalleryBearingPaths, as the document claims', () => {
    expect(exists('src/lib/galleryRevalidation.ts')).toBe(true)
    const source = read('src/lib/galleryRevalidation.ts')
    expect(source).toMatch(/export function getGalleryBearingPaths/)
  })

  it('states the helper must be re-keyed from Payload gallery title to a Backstage identifier by the implementing story', () => {
    expect(doc).toMatch(/re-keyed by the implementing story/)
  })
})

describe('AC-18.4: does not silently pre-empt this story\'s remaining ACs (18.5, 18.6)', () => {
  const doc = read(DOC_PATH)

  it('still defers surface-disabling (18.5) and terminology mapping (18.6) rather than pre-empting them', () => {
    expect(doc).toMatch(/AC-18\.5/)
    expect(doc).toMatch(/AC-18\.6/)
  })
})

describe('does not silently edit files it is not scoped to change', () => {
  it('does not modify CLAUDE.md, SYSTEM_OWNERSHIP.md, or scrum-master files', () => {
    let gitStatus = ''
    try {
      gitStatus = execSync('git status --porcelain -- CLAUDE.md SYSTEM_OWNERSHIP.md scrum-master/', {
        cwd: root,
        encoding: 'utf8',
      })
    } catch {
      gitStatus = ''
    }
    expect(gitStatus.trim()).toBe('')
  })
})
