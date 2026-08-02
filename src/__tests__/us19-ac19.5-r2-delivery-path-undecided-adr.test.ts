/**
 * ---
 * file: src/__tests__/us19-ac19.5-r2-delivery-path-undecided-adr.test.ts
 * project: earthandhoney
 * purpose: Verify AC-19.5 — R2_STORAGE_AND_DELIVERY_ADR.md opens with the
 *          delivery-path decision explicitly marked UNDECIDED, lists the
 *          five candidate paths to be benchmarked next sprint, the
 *          measurements that will decide between them, and the performance
 *          targets the decision is accountable to, with an explicit
 *          statement that no agent may choose a path by preference before
 *          that benchmark exists.
 * created-by: dev-team
 * related-story: US-19
 * related-ac: 19.5
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const DOC_PATH = 'R2_STORAGE_AND_DELIVERY_ADR.md'

describe('AC-19.5: R2_STORAGE_AND_DELIVERY_ADR.md opens with the delivery-path decision marked UNDECIDED', () => {
  it('R2_STORAGE_AND_DELIVERY_ADR.md exists at the repo root', () => {
    expect(exists(DOC_PATH)).toBe(true)
  })

  const doc = read(DOC_PATH)

  it('carries the structured metadata header naming both AC-19.4 and AC-19.5', () => {
    expect(doc).toMatch(/file:\s*R2_STORAGE_AND_DELIVERY_ADR\.md/)
    expect(doc).toMatch(/related-story:\s*US-19/)
    expect(doc).toMatch(/related-ac:\s*19\.4,\s*19\.5/)
  })

  it('opens with the delivery-path decision section before the AC-19.4 audit section', () => {
    const deliveryIdx = doc.indexOf('## Delivery path decision')
    const auditIdx = doc.indexOf('## AC-19.4')
    expect(deliveryIdx).toBeGreaterThan(-1)
    expect(auditIdx).toBeGreaterThan(-1)
    expect(deliveryIdx).toBeLessThan(auditIdx)
  })

  it('explicitly marks the decision as UNDECIDED', () => {
    expect(doc).toMatch(/\*\*Status:\s*UNDECIDED\.\*\*/)
  })

  it('states no agent may choose a path by preference before the benchmark exists', () => {
    expect(doc).toMatch(/no agent may choose\s*\na path by preference before that benchmark exists/i)
  })

  describe('candidate paths', () => {
    it('lists serving through the Backstage', () => {
      expect(doc).toMatch(/Serving through the Backstage/i)
    })

    it('lists direct time-limited links', () => {
      expect(doc).toMatch(/Direct time-limited links/i)
    })

    it('lists public delivery through a content-network (CDN) domain', () => {
      expect(doc).toMatch(/content-network \(CDN\) domain/i)
    })

    it('lists an edge authorisation layer', () => {
      expect(doc).toMatch(/[Aa]n edge authorisation layer/)
    })

    it('lists a hybrid', () => {
      expect(doc).toMatch(/\*\*A hybrid\*\*/)
    })
  })

  describe('measurements that will decide it', () => {
    it('names Lighthouse mobile-first performance scoring per path', () => {
      expect(doc).toMatch(/Mobile-first Lighthouse performance score/i)
    })

    it('names Cumulative Layout Shift measurement', () => {
      expect(doc).toMatch(/Cumulative Layout Shift \(CLS\)/)
    })

    it('names Largest Contentful Paint under mobile throttling', () => {
      expect(doc).toMatch(/Largest Contentful Paint \(LCP\)/)
      expect(doc).toMatch(/throttling profile/i)
    })

    it('names a network payload audit of requested image resolution', () => {
      expect(doc).toMatch(/Network payload audit/i)
    })
  })

  describe('performance targets the decision is accountable to', () => {
    it('states no image-caused layout shift', () => {
      expect(doc).toMatch(/\*\*No image-caused layout shift\.\*\*/)
    })

    it('states mobile-first performance near ninety', () => {
      expect(doc).toMatch(/\*\*Mobile-first performance near ninety\*\*/)
    })

    it('states LCP around two and a half seconds or better on a realistic mobile profile', () => {
      expect(doc).toMatch(
        /\*\*Largest Contentful Paint around two and a half seconds or better\*\*\s+on\s+a\s+realistic\s+mobile\s+profile/,
      )
    })

    it('states public pages never request full-resolution originals unnecessarily', () => {
      expect(doc).toMatch(/\*\*Public pages never request full-resolution originals unnecessarily\.\*\*/)
    })
  })

  it('does not choose a path: no candidate is marked as selected/chosen/decided', () => {
    const deliverySection = doc.slice(
      doc.indexOf('## Delivery path decision'),
      doc.indexOf('## AC-19.4'),
    )
    expect(deliverySection).not.toMatch(/\bchosen path\b|\bselected path\b|\bwe (will|should) use\b/i)
  })
})
