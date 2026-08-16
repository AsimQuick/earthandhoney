/**
 * ---
 * file: src/__tests__/us39-ac39.3.2-next-action-single-computation.test.ts
 * project: earthandhoney
 * purpose: Verify AC-39.3.2 — the Project's next action is computed once,
 *          server-side, from the Project's phase and milestone state, by
 *          one module (`vendor/picpeak/backend/src/services/nextActionService.js`)
 *          that both surface handlers call — the same function reference,
 *          not two implementations that happen to agree. Entirely UNIT
 *          lane, so none of it needs a running stack:
 *
 *          1. the computation itself, driven directly against the real
 *             vendored `nextActionRules.js` (required by absolute path, the
 *             same technique AC-39.2's suite uses on migration 126) across
 *             all seven of PRD 23.1's phases and representative milestone
 *             states, and
 *          2. a source-level assertion that the cockpit route
 *             (`adminProjects.js`, `GET /:id/next-action`) and the Project
 *             Room route (`customer.js`, `GET /projects/:id/next-action` —
 *             the mount paths and middleware AC-39.3.1's
 *             NEXT_ACTION_CROSS_SURFACE_MAP.md recorded) each require that
 *             one service, and that neither contains next-action wording of
 *             its own nor reads `project_milestones`/
 *             `project_booking_requirements` itself. Two routes each
 *             returning an equal string from two independently-copied
 *             tables would satisfy a live equality assertion (AC-39.3.3)
 *             while failing this AC; this is what rules that out as a fact
 *             about the code, ahead of the live proof.
 *
 *          The ordering assertions are load-bearing rather than cosmetic:
 *          the booking-phase string lists outstanding requirements, and the
 *          two surfaces (AC-39.3.3) fetch it in two separate HTTP requests
 *          whose row order Postgres does not guarantee. Sorting by PRD
 *          23.2's `sequence_order` is what makes "identical strings" a
 *          property of the computation instead of a coincidence.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.3.2
 * ---
 */
import fs from 'fs'
import path from 'path'

import { PROJECT_PHASES, PROJECT_PHASE_KEYS } from '@/lib/projectPhases'

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

describe('AC-39.3.2: the rules module, table-driven across all seven phases and representative milestone states', () => {
  // One row per PRD 23.1 phase, each carrying a milestone state that phase
  // would actually be seen in, so the table exercises real state per phase
  // rather than the same fixture seven times over.
  const ROWS: Array<{
    phase: string
    requiredMilestoneKeys?: string[]
    completedMilestoneKeys?: string[]
    milestoneMetaByKey?: Map<string, { name: string; sequenceOrder: number }>
    expected: string
  }> = [
    { phase: 'lead', completedMilestoneKeys: [], expected: rules.PHASE_NEXT_ACTIONS.lead },
    {
      phase: 'booking',
      requiredMilestoneKeys: ['quote_approved', 'contract_signed', 'deposit_paid'],
      completedMilestoneKeys: ['quote_approved'],
      milestoneMetaByKey: META,
      expected: 'Awaiting: contract signed, deposit paid.',
    },
    { phase: 'preparation', completedMilestoneKeys: ['quote_approved', 'contract_signed', 'deposit_paid'], expected: rules.PHASE_NEXT_ACTIONS.preparation },
    { phase: 'shoot', completedMilestoneKeys: ['dates_venues_confirmed'], expected: rules.PHASE_NEXT_ACTIONS.shoot },
    { phase: 'post_production', completedMilestoneKeys: ['shoot_completed'], expected: rules.PHASE_NEXT_ACTIONS.post_production },
    { phase: 'delivery', completedMilestoneKeys: ['gallery_ready', 'final_balance_paid'], expected: rules.PHASE_NEXT_ACTIONS.delivery },
    { phase: 'closed', completedMilestoneKeys: ['gallery_released', 'downloads_completed', 'project_closed'], expected: rules.PHASE_NEXT_ACTIONS.closed },
  ]

  it('names all seven PRD 23.1 phases, and no eighth, in this table', () => {
    expect(ROWS.map((r) => r.phase).sort()).toEqual([...PROJECT_PHASE_KEYS].sort())
    expect(ROWS).toHaveLength(7)
    expect(PROJECT_PHASES).toHaveLength(7)
  })

  it.each(ROWS)('phase "$phase" resolves to a specific, non-empty next action', ({ phase, expected, ...state }) => {
    const nextAction = resolveNextAction({ phase, ...state })
    expect(typeof nextAction).toBe('string')
    expect(nextAction.trim().length).toBeGreaterThan(0)
    expect(nextAction).toBe(expected)
  })

  it('orders outstanding booking requirements by PRD 23.2 sequence, not by the order the rows arrived in', () => {
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

describe('AC-39.3.2: the computation exists exactly once, and both surface handlers read it', () => {
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

  it('registers the cockpit route and the Project Room route at AC-39.3.1\'s recorded mount paths', () => {
    // Cockpit: adminProjects.js, mounted /api/admin/projects (AC-39.3.1
    // map, question 1). Project Room: customer.js, mounted /api/customer
    // (question 2/3), gated per-route by customerAuth rather than a
    // blanket router.use, matching every other route in that file.
    expect(adminRouteSource).toContain("router.get('/:id/next-action'")
    expect(customerRouteSource).toContain("router.get('/projects/:id/next-action'")
    expect(customerRouteSource).toMatch(/router\.get\('\/projects\/:id\/next-action',\s*\[\s*customerAuth/)
  })

  it('keeps the service the only reader of the phase/milestone tables for this computation', () => {
    expect(serviceSource).toContain("require('./nextActionRules')")
    // The routes fetch state through the service, never by querying the
    // milestone/booking-requirement tables themselves — that is what makes
    // it ONE computation rather than two that happen to agree. The
    // customer route's own `projects` read is scoped to `id` only, for
    // ownership — never `current_phase` — and is asserted separately below.
    for (const source of [adminRouteSource, customerRouteSource]) {
      expect(source).not.toContain('project_booking_requirements')
      expect(source).not.toContain('project_milestones')
    }
  })

  it("the Project Room's own `projects` read is an ownership check only — it never selects current_phase", () => {
    const nextActionSection = customerRouteSource.slice(customerRouteSource.indexOf("router.get('/projects/:id/next-action'"))
    const nextActionSectionEnd = nextActionSection.indexOf('\n});') + 4
    const handlerBody = nextActionSection.slice(0, nextActionSectionEnd)
    expect(handlerBody).toContain(".select('id')")
    expect(handlerBody).not.toContain('current_phase')
  })

  it('carries no next-action wording anywhere in the vendored backend outside the one rules module', () => {
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
