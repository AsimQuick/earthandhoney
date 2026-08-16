/**
 * ---
 * file: src/__tests__/us39-ac39.3-next-action-single-computation.test.ts
 * project: earthandhoney
 * purpose: The UNIT-lane half of AC-39.3's evidence. AC-39.3's own evidence
 *          clause is a live cross-surface round trip, and that lives in
 *          `us39-ac39.3-next-action-cross-surface-live.test.ts` — but that
 *          suite gates itself on `dns.lookup('backstage-backend')`, so it
 *          no-ops wherever Backstage is not running. This suite carries the
 *          part that must hold with or without Docker:
 *
 *          1. the computation itself, driven directly against the real
 *             vendored `nextActionRules.js` (required by absolute path, the
 *             same technique AC-39.2's suite uses on migration 126), and
 *          2. the "computed ONCE" half of the AC — that the cockpit route
 *             and the Project Room route both delegate to the one
 *             `nextActionService`, and that no next-action wording exists
 *             anywhere in the backend outside the single rules module.
 *             Two routes returning equal strings from two copies of the
 *             same table would satisfy a live equality assertion while
 *             failing the AC; this is what rules that out.
 *
 *          The ordering assertions are load-bearing rather than cosmetic:
 *          the booking-phase string lists outstanding requirements, and the
 *          two surfaces fetch it in two separate HTTP requests whose row
 *          order Postgres does not guarantee. Sorting by PRD 23.2's
 *          `sequence_order` is what makes "identical strings" a property of
 *          the computation instead of a coincidence.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import { PROJECT_PHASE_KEYS } from '@/lib/projectPhases'

const vendorBackendRoot = path.join(process.cwd(), 'vendor', 'picpeak', 'backend')
const RULES_PATH = path.join(vendorBackendRoot, 'src/services/nextActionRules.js')
const SERVICE_PATH = path.join(vendorBackendRoot, 'src/services/nextActionService.js')
const ADMIN_ROUTE_PATH = path.join(vendorBackendRoot, 'src/routes/adminProjects.js')
const CUSTOMER_ROUTE_PATH = path.join(vendorBackendRoot, 'src/routes/customer.js')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rules = require(RULES_PATH) as {
  resolveNextAction: (state: {
    phase: string
    requiredMilestoneKeys?: string[]
    completedMilestoneKeys?: string[]
    milestoneMetaByKey?: Map<string, { name: string; sequenceOrder: number }>
  }) => string
  PHASE_NEXT_ACTIONS: Record<string, string>
  UNKNOWN_PHASE_NEXT_ACTION: string
  BOOKING_NOT_CONFIGURED: string
  BOOKING_COMPLETE: string
}

const { resolveNextAction } = rules

// PRD 23.2's normal-case booking requirements with their list positions,
// written out here independently rather than imported from the migration,
// so this suite checks the computation against the PRD's own ordering.
const META = new Map([
  ['quote_approved', { name: 'quote approved', sequenceOrder: 4 }],
  ['contract_signed', { name: 'contract signed', sequenceOrder: 6 }],
  ['deposit_paid', { name: 'deposit paid', sequenceOrder: 8 }],
])

const read = (absPath: string) => fs.readFileSync(absPath, 'utf-8')

describe('AC-39.3: the next-action computation itself', () => {
  it('returns a non-empty string for every one of PRD 23.1\'s seven phases', () => {
    for (const phase of PROJECT_PHASE_KEYS) {
      const nextAction = resolveNextAction({
        phase,
        requiredMilestoneKeys: [...META.keys()],
        milestoneMetaByKey: META,
      })
      expect(typeof nextAction).toBe('string')
      expect(nextAction.trim().length).toBeGreaterThan(0)
    }
  })

  it('names the outstanding booking requirements when the booking phase is incomplete', () => {
    const nextAction = resolveNextAction({
      phase: 'booking',
      requiredMilestoneKeys: ['quote_approved', 'contract_signed', 'deposit_paid'],
      completedMilestoneKeys: ['quote_approved'],
      milestoneMetaByKey: META,
    })
    expect(nextAction).toBe('Awaiting: contract signed, deposit paid.')
  })

  it('orders outstanding requirements by PRD 23.2 sequence, not by the order the rows arrived in', () => {
    // The same state, presented in three different row orders — as two
    // unordered Postgres reads on two separate HTTP requests could.
    const orderings = [
      ['quote_approved', 'contract_signed', 'deposit_paid'],
      ['deposit_paid', 'quote_approved', 'contract_signed'],
      ['contract_signed', 'deposit_paid', 'quote_approved'],
    ]
    const results = orderings.map((requiredMilestoneKeys) =>
      resolveNextAction({ phase: 'booking', requiredMilestoneKeys, milestoneMetaByKey: META }),
    )
    expect(new Set(results).size).toBe(1)
    expect(results[0]).toBe('Awaiting: quote approved, contract signed, deposit paid.')
  })

  it('falls back to the milestone key, sorted last, when a required key has no template row', () => {
    const nextAction = resolveNextAction({
      phase: 'booking',
      requiredMilestoneKeys: ['venue_walkthrough', 'quote_approved'],
      milestoneMetaByKey: META,
    })
    expect(nextAction).toBe('Awaiting: quote approved, venue_walkthrough.')
  })

  it('reports the booking phase complete only once every configured requirement is complete', () => {
    const requiredMilestoneKeys = ['quote_approved', 'contract_signed', 'deposit_paid']
    const partial = resolveNextAction({
      phase: 'booking',
      requiredMilestoneKeys,
      completedMilestoneKeys: ['quote_approved', 'contract_signed'],
      milestoneMetaByKey: META,
    })
    expect(partial).toBe('Awaiting: deposit paid.')

    const complete = resolveNextAction({
      phase: 'booking',
      requiredMilestoneKeys,
      completedMilestoneKeys: requiredMilestoneKeys,
      milestoneMetaByKey: META,
    })
    expect(complete).toBe(rules.BOOKING_COMPLETE)
  })

  it('says so plainly when a Project in the booking phase has no configured requirements at all', () => {
    expect(resolveNextAction({ phase: 'booking', requiredMilestoneKeys: [] })).toBe(rules.BOOKING_NOT_CONFIGURED)
  })

  it('falls back rather than returning nothing for a phase value it has no rule for', () => {
    // `projects.current_phase` is a plain varchar (migration 122), so an
    // unrecognised value is reachable through a direct database write.
    expect(resolveNextAction({ phase: 'not_a_phase' })).toBe(rules.UNKNOWN_PHASE_NEXT_ACTION)
  })
})

describe('AC-39.3: the computation exists exactly once, and both surfaces read it', () => {
  const adminRouteSource = read(ADMIN_ROUTE_PATH)
  const customerRouteSource = read(CUSTOMER_ROUTE_PATH)
  const serviceSource = read(SERVICE_PATH)

  it('exposes one next-action entry point from the service, shared by both routes', () => {
    expect(serviceSource).toMatch(/module\.exports = \{\s*computeProjectNextAction,?\s*\}/)
    for (const source of [adminRouteSource, customerRouteSource]) {
      expect(source).toContain("require('../services/nextActionService')")
      expect(source).toContain('nextActionService.computeProjectNextAction(')
    }
  })

  it('registers the cockpit route and the Project Room route on the same computation', () => {
    expect(adminRouteSource).toContain("router.get('/:id/next-action'")
    expect(customerRouteSource).toContain("router.get('/projects/:id/next-action'")
  })

  it('keeps the service the only reader of the phase/milestone tables for this computation', () => {
    expect(serviceSource).toContain("require('./nextActionRules')")
    // The routes fetch state through the service, never by querying the
    // milestone tables themselves — that is what makes it ONE computation.
    for (const source of [adminRouteSource, customerRouteSource]) {
      expect(source).not.toContain('project_booking_requirements')
      expect(source).not.toContain('project_milestones')
    }
  })

  it('carries no next-action wording anywhere in the backend outside the one rules module', () => {
    const phrases = [
      ...Object.values(rules.PHASE_NEXT_ACTIONS),
      rules.UNKNOWN_PHASE_NEXT_ACTION,
      rules.BOOKING_NOT_CONFIGURED,
      rules.BOOKING_COMPLETE,
      'Awaiting: ',
    ]

    const jsFiles: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules') continue
          walk(full)
        } else if (entry.name.endsWith('.js')) {
          jsFiles.push(full)
        }
      }
    }
    walk(path.join(vendorBackendRoot, 'src'))
    expect(jsFiles.length).toBeGreaterThan(50)

    for (const phrase of phrases) {
      const owners = jsFiles.filter((file) => read(file).includes(phrase))
      expect([phrase, owners.map((f) => path.relative(vendorBackendRoot, f))]).toEqual([phrase, ['src/services/nextActionRules.js']])
    }
  })
})
