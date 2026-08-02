/**
 * ---
 * file: src/__tests__/us18-ac18.2-payload-picpeak-api-contract.test.ts
 * project: earthandhoney
 * purpose: Verify AC-18.2 — PAYLOAD_PICPEAK_API_CONTRACT.md exists and
 *          specifies the Frontstage↔Backstage boundary: direction, purpose,
 *          auth, identifiers crossing, failure/timeout behavior, and the
 *          Frontstage's cache allowance, per call. Also cross-checks the
 *          document's specific claims (auth middleware used, webhook event
 *          types, retry/backoff schedule, ISR safety-net TTL) directly
 *          against the pinned PicPeak fork source and this repo's own US-6
 *          ISR convention, so the document cannot silently drift from the
 *          code it describes.
 * created-by: dev-team
 * related-story: US-18
 * related-ac: 18.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const DOC_PATH = 'PAYLOAD_PICPEAK_API_CONTRACT.md'

function tableRows(section: string): string[][] {
  return section
    .split('\n')
    .filter((line) => /^\|/.test(line) && !/^\|\s*---/.test(line))
    .map((line) =>
      line
        .split('|')
        .map((c) => c.trim())
        .filter((_, i, arr) => i > 0 && i < arr.length - 1),
    )
    .filter((cells) => cells[0] !== '#')
}

describe('AC-18.2: PAYLOAD_PICPEAK_API_CONTRACT.md specifies the Frontstage/Backstage boundary', () => {
  it('PAYLOAD_PICPEAK_API_CONTRACT.md exists at the repo root', () => {
    expect(exists(DOC_PATH)).toBe(true)
  })

  const doc = read(DOC_PATH)

  it('carries the structured metadata header required for every code/doc file', () => {
    expect(doc).toMatch(/file:\s*PAYLOAD_PICPEAK_API_CONTRACT\.md/)
    expect(doc).toMatch(/related-story:\s*US-18/)
    expect(doc).toMatch(/related-ac:\s*18\.2/)
  })

  it('defines Frontstage and Backstage consistently with SYSTEM_OWNERSHIP.md rather than inventing new terms', () => {
    expect(doc).toMatch(/SYSTEM_OWNERSHIP\.md/)
    expect(doc).toMatch(/Frontstage/)
    expect(doc).toMatch(/Backstage/)
  })

  it('states which of this story\'s other ACs it defers to, rather than pre-empting them', () => {
    expect(doc).toMatch(/AC-18\.3/)
    expect(doc).toMatch(/AC-18\.4/)
    expect(doc).toMatch(/AC-18\.5/)
    expect(doc).toMatch(/AC-18\.6/)
  })

  const tableStart = doc.indexOf('## Call catalog')
  const tableEnd = doc.indexOf('\n## ', tableStart + 3)
  const tableSection = doc.slice(tableStart, tableEnd === -1 ? undefined : tableEnd)
  const rows = tableRows(tableSection)

  it('has a dedicated call catalog table with one row per call', () => {
    expect(tableStart).toBeGreaterThan(-1)
    expect(rows.length).toBeGreaterThanOrEqual(5)
  })

  it('every row has all eight required columns non-empty: #, direction, call, purpose, auth, identifiers, failure/timeout, cache allowance', () => {
    for (const row of rows) {
      expect(row.length).toBe(8)
      for (const cell of row) {
        expect(cell.length).toBeGreaterThan(0)
      }
    }
  })

  it('covers both directions of travel across the boundary', () => {
    const directions = rows.map((r) => r[1])
    expect(directions.some((d) => /Frontstage\s*→\s*Backstage/.test(d))).toBe(true)
    expect(directions.some((d) => /Backstage\s*→\s*Frontstage/.test(d))).toBe(true)
  })

  const EXPECTED_CALLS: RegExp[] = [
    /GET \/api\/gallery\/:slug\/info/,
    /GET \/api\/gallery\/:slug\/photos/,
    /\/api\/v1\/events/,
    /POST \/api\/admin\/customers/,
    /POST \/api\/admin\/projects/,
    /webhook/i,
  ]

  it.each(EXPECTED_CALLS)('call catalog references %s', (pattern) => {
    expect(tableSection).toMatch(pattern)
  })

  describe('auth mechanisms are specified per call, cross-checked against the pinned fork', () => {
    it('documents the admin session cookie, Bearer API token, and HMAC webhook signature mechanisms', () => {
      expect(doc).toMatch(/admin_token/)
      expect(doc).toMatch(/Bearer/)
      expect(doc).toMatch(/pp_live_/)
      expect(doc).toMatch(/HMAC-SHA256|X-PicPeak-Signature/)
    })

    it('flags that customer/project creation has no Bearer-token path, matching a direct read of the fork', () => {
      const adminCustomers = read('vendor/picpeak/backend/src/routes/adminCustomers.js')
      const adminProjects = read('vendor/picpeak/backend/src/routes/adminProjects.js')
      expect(adminCustomers).toMatch(/adminAuth/)
      expect(adminCustomers).not.toMatch(/apiTokenAuth/)
      expect(adminProjects).toMatch(/adminAuth/)
      expect(adminProjects).not.toMatch(/apiTokenAuth/)
      expect(doc).toMatch(/gap/i)
      expect(doc).toMatch(/no Bearer-token-authenticated path|no server-to-server path exists yet/)
    })

    it('the v1 events API scopes match the pinned fork\'s VALID_SCOPES', () => {
      const apiTokenAuth = read('vendor/picpeak/backend/src/middleware/apiTokenAuth.js')
      const scopeMatch = apiTokenAuth.match(/VALID_SCOPES\s*=\s*\[([^\]]+)\]/)
      expect(scopeMatch).toBeTruthy()
      const scopes = scopeMatch![1].split(',').map((s) => s.replace(/['"\s]/g, ''))
      for (const scope of scopes) {
        expect(doc).toMatch(new RegExp(scope))
      }
    })
  })

  describe('webhook event catalog and retry/backoff behavior match the pinned fork', () => {
    const webhookService = read('vendor/picpeak/backend/src/services/webhookService.js')
    const deliveryWorker = read('vendor/picpeak/backend/src/services/webhookDeliveryWorker.js')

    it('every EVENT_TYPES entry in the fork is named in the document', () => {
      const eventTypesMatch = webhookService.match(/EVENT_TYPES = Object\.freeze\(\[([\s\S]*?)\]\)/)
      expect(eventTypesMatch).toBeTruthy()
      const eventTypes = eventTypesMatch![1]
        .split(',')
        .map((s) => s.trim().replace(/^'|'$/g, ''))
        .filter(Boolean)
      expect(eventTypes.length).toBeGreaterThanOrEqual(6)
      for (const eventType of eventTypes) {
        expect(doc).toMatch(new RegExp(eventType.replace('.', '\\.')))
      }
    })

    it('documents the fork\'s actual HTTP timeout and max attempts for webhook delivery', () => {
      expect(deliveryWorker).toMatch(/WEBHOOK_HTTP_TIMEOUT_MS[^\n]*'10000'/)
      expect(deliveryWorker).toMatch(/WEBHOOK_MAX_ATTEMPTS[^\n]*'5'/)
      expect(doc).toMatch(/10.?s.*timeout|10-second|`10`s/i)
      expect(doc).toMatch(/5.*attempts|`5`\s*attempts/i)
    })

    it('documents that a failed delivery is not retried indefinitely (bounded, not guaranteed, delivery)', () => {
      expect(deliveryWorker).toMatch(/status:\s*'failed'/)
      expect(doc).toMatch(/not retried further|not a guarantee|hint, not a guarantee/i)
    })
  })

  describe('the Frontstage cache allowance ties back to this codebase\'s own established ISR convention', () => {
    it('cites the same 60-second safety-net value US-6 already committed to for gallery-bearing routes', () => {
      const isrDemoPage = read('src/app/(frontend)/dev/gallery-isr-demo/page.tsx')
      expect(isrDemoPage).toMatch(/export const revalidate = 60/)
      expect(doc).toMatch(/60.second|60-second|60 seconds/)
      expect(doc).toMatch(/gallery-isr-demo|US-6/)
    })

    it('states that on-demand invalidation (webhook) takes precedence over the bounded safety net', () => {
      expect(doc).toMatch(/[Ii]mmediate invalidation/)
      expect(doc).toMatch(/safety-net/)
    })

    it('explicitly states nothing from the customer/project gap (row 4) is cacheable under this AC\'s evidence', () => {
      expect(doc).toMatch(/nothing.*(?:Client|Project).*cacheable|nothing from row 4/i)
    })
  })

  describe('does not silently edit files it is not scoped to change', () => {
    it('does not modify CLAUDE.md or scrum-master files', () => {
      const { execSync } = require('child_process')
      let gitStatus = ''
      try {
        gitStatus = execSync('git status --porcelain -- CLAUDE.md scrum-master/', {
          cwd: root,
          encoding: 'utf8',
        })
      } catch {
        gitStatus = ''
      }
      expect(gitStatus.trim()).toBe('')
    })
  })
})
