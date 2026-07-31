/**
 * ---
 * file: src/__tests__/us15-ac15.2-picpeak-capability-audit.test.ts
 * project: earthandhoney
 * purpose: Verify AC-15.2 — a specific upstream PicPeak commit is identified
 *          that contains all four capabilities the pivot depends on
 *          (Projects grouping above galleries, customer accounts, webhooks,
 *          S3-compatible storage), the evidence for each is recorded, and
 *          the blocking-finding decision logic is exercised in isolation
 *          (both for the all-present case and for a hypothetical gap).
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.2
 * ---
 */
import fs from 'fs'
import path from 'path'
import { auditCapabilities, type CapabilityEvidence } from '@/lib/capabilityAudit'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const CANDIDATE_COMMIT = 'eb263137b98935754155824de2a03848121304b6'

const ACTUAL_EVIDENCE: CapabilityEvidence[] = [
  {
    name: 'Projects grouping above galleries',
    introducedAtCommit: CANDIDATE_COMMIT,
    introducedAt: '2026-06-06T01:50:55Z',
    presentAtCandidate: true,
  },
  {
    name: 'Customer accounts',
    introducedAtCommit: '087ef45942a8a51d09af2cd8ec85aca330f6cf7f',
    introducedAt: '2026-05-10T22:05:20Z',
    presentAtCandidate: true,
  },
  {
    name: 'Webhooks',
    introducedAtCommit: 'c488f481caacf0d63dafc47f509e8de2708bc30f',
    introducedAt: '2026-04-28T08:07:39Z',
    presentAtCandidate: true,
  },
  {
    name: 'S3-compatible storage',
    introducedAtCommit: '1b717ce5ededa343d2fbb7e1c3493b4434743565',
    introducedAt: '2026-04-28T08:06:36Z',
    presentAtCandidate: true,
  },
]

describe('AC-15.2: PicPeak upstream capability audit and pinned-candidate identification', () => {
  describe('auditCapabilities (blocking-finding decision logic)', () => {
    it('reports allPresent and no blocking finding when the candidate commit provides all four capabilities', () => {
      const result = auditCapabilities(ACTUAL_EVIDENCE)
      expect(result.allPresent).toBe(true)
      expect(result.blockingFinding).toBeNull()
    })

    it('identifies the capability introduced most recently as the one that sets the earliest possible candidate commit', () => {
      const result = auditCapabilities(ACTUAL_EVIDENCE)
      expect(result.latestIntroduced.name).toBe('Projects grouping above galleries')
      expect(result.latestIntroduced.introducedAtCommit).toBe(CANDIDATE_COMMIT)
    })

    it('documents a blocking finding naming the missing capability when one is absent at the candidate commit', () => {
      const withGap: CapabilityEvidence[] = ACTUAL_EVIDENCE.map((c) =>
        c.name === 'Webhooks' ? { ...c, presentAtCandidate: false } : c,
      )
      const result = auditCapabilities(withGap)
      expect(result.allPresent).toBe(false)
      expect(result.blockingFinding).toContain('Webhooks')
      expect(result.blockingFinding).toMatch(/no single commit/i)
    })

    it('names every missing capability when more than one is absent at the candidate commit', () => {
      const withGaps: CapabilityEvidence[] = ACTUAL_EVIDENCE.map((c) =>
        c.name === 'Webhooks' || c.name === 'Customer accounts' ? { ...c, presentAtCandidate: false } : c,
      )
      const result = auditCapabilities(withGaps)
      expect(result.blockingFinding).toContain('Webhooks')
      expect(result.blockingFinding).toContain('Customer accounts')
    })

    it('throws rather than silently passing when given no capabilities to audit', () => {
      expect(() => auditCapabilities([])).toThrow()
    })
  })

  describe('PICPEAK_CAPABILITY_AUDIT.md — recorded evidence', () => {
    it('exists at the repo root', () => {
      expect(fs.existsSync(path.join(root, 'PICPEAK_CAPABILITY_AUDIT.md'))).toBe(true)
    })

    const doc = read('PICPEAK_CAPABILITY_AUDIT.md')

    it('identifies a single candidate commit that provides all four capabilities', () => {
      expect(doc).toContain(CANDIDATE_COMMIT)
      expect(doc).toMatch(/Candidate commit/i)
    })

    it('records evidence for Projects grouping above galleries', () => {
      expect(doc).toMatch(/Projects grouping above galleries/i)
      expect(doc).toContain('adminProjects.js')
    })

    it('records evidence for customer accounts', () => {
      expect(doc).toMatch(/Customer accounts/i)
      expect(doc).toContain('customer_accounts')
    })

    it('records evidence for webhooks', () => {
      expect(doc).toMatch(/Webhooks/i)
      expect(doc).toContain('adminWebhooks.js')
    })

    it('records evidence for S3-compatible storage, including Cloudflare R2 compatibility', () => {
      expect(doc).toMatch(/S3-compatible storage/i)
      expect(doc).toContain('S3StorageBackend.js')
      expect(doc).toMatch(/Cloudflare R2/)
    })

    it('confirms the candidate commit is an ancestor of the upstream default branch, not an abandoned branch', () => {
      expect(doc).toMatch(/ancestor/i)
      expect(doc).toMatch(/main/)
    })

    it('states the blocking-finding condition was not triggered, since all four capabilities are provided by a single commit', () => {
      expect(doc).toMatch(/not.*triggered/i)
      expect(doc).toMatch(/single upstream commit/i)
    })
  })
})
