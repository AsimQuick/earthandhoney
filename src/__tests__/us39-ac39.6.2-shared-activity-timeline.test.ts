/**
 * ---
 * file: src/__tests__/us39-ac39.6.2-shared-activity-timeline.test.ts
 * project: earthandhoney
 * purpose: Verify AC-39.6.2 — a phase change, a milestone completion and a
 *          manual next-action override each append their timeline entry
 *          through ONE shared timeline service, not three inserts that
 *          happen to agree ("the same single-authority shape AC-39.3.2
 *          proved for the next action"). Entirely UNIT lane, no Docker:
 *
 *          1. `activityTimelineEntry.js` — the pure entry-shape module
 *             (mirrors the `nextActionRules.js` split): the row built for
 *             insert, the row shape a reader gets back, and the
 *             oldest-first ordering `GET /:id/timeline` returns, all
 *             driven directly with no requires and no database.
 *          2. `projectChangeRules.js` — the pure no-op module: both no-op
 *             cases this AC's evidence clause names (setting the phase to
 *             its current value; re-completing an already-complete
 *             milestone) plus the summary text built for a REAL change.
 *          3. Source-level assertions against the real
 *             `routes/adminProjects.js`: each of the three write handlers
 *             (`PUT /:id/phase`, `PUT /:id/milestones/:key/complete`,
 *             `PUT /:id/next-action/override`) requires
 *             `activityTimelineService.js` directly, the new
 *             `GET /:id/timeline` read route is registered and
 *             `events.view`-gated, and — critically — the literal table
 *             name `project_activity_timeline` never appears in the route
 *             file, so no handler can be writing to it directly; only
 *             `activityTimelineService.js` names that table.
 *          4. Structural (not `require()`-d — see file header of each)
 *             assertions on the three new/changed database-backed
 *             services (`activityTimelineService.js`,
 *             `projectPhaseService.js`, `projectMilestoneService.js`):
 *             each requires `../database/db` and therefore cannot itself
 *             be `require()`-d in a UNIT suite without a live database,
 *             the same constraint `nextActionService.js`'s and
 *             `nextActionOverrideService.js`'s own headers already
 *             record.
 *          5. That all four routes sit on the cockpit router at the mount
 *             path (`server.js`'s `/api/admin/projects`) and behind the
 *             `adminAuth` middleware AC-39.3.1's map recorded — each
 *             registered after `router.use(adminAuth)`, and introducing no
 *             second auth middleware of its own, so this AC uses "no path
 *             or credential that map did not record."
 *          6. A pure end-to-end simulation — three entries appended via
 *             the real `buildTimelineEntryRow`, "inserted" into a plain
 *             array with auto-incrementing ids out of arrival order, then
 *             read back via the real `sortTimelineEntriesOldestFirst` —
 *             proving "three changes produce three ordered entries" as a
 *             fact about the shared shape's code, ahead of AC-39.6.3's
 *             live counterpart against a running stack.
 *
 *          Migration 128's schema (columns, FK behaviours, idempotency)
 *          is not re-proven here — AC-39.6.1.1's own suite
 *          (`us39-ac39.6.1.1-activity-timeline-migration.test.ts`) already
 *          covers it directly against the real migration module.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.6.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const vendorBackendRoot = path.join(process.cwd(), 'vendor', 'picpeak', 'backend')
const ADMIN_ROUTE_PATH = path.join(vendorBackendRoot, 'src/routes/adminProjects.js')
const ENTRY_PATH = path.join(vendorBackendRoot, 'src/services/activityTimelineEntry.js')
const TIMELINE_SERVICE_PATH = path.join(vendorBackendRoot, 'src/services/activityTimelineService.js')
const RULES_PATH = path.join(vendorBackendRoot, 'src/services/projectChangeRules.js')
const PHASE_SERVICE_PATH = path.join(vendorBackendRoot, 'src/services/projectPhaseService.js')
const MILESTONE_SERVICE_PATH = path.join(vendorBackendRoot, 'src/services/projectMilestoneService.js')

const read = (absPath: string) => fs.readFileSync(absPath, 'utf-8')

interface TimelineEntry {
  id: number
  entryType: string
  summary: string
  actorAdminId: number | null
  actorName: string
  metadata: object | null
  occurredAt: string
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const entry = require(ENTRY_PATH) as {
  ENTRY_TYPES: { PHASE_CHANGE: string; MILESTONE_COMPLETED: string; NEXT_ACTION_OVERRIDE_SET: string }
  buildTimelineEntryRow: (
    project: { id: number },
    entryType: string,
    actor: { adminId: number; name: string },
    whatChanged: { summary: string; metadata?: object | null },
  ) => Record<string, unknown>
  transformTimelineEntry: (row: Record<string, unknown>) => TimelineEntry
  sortTimelineEntriesOldestFirst: <T extends { id: number }>(entries: T[]) => T[]
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rules = require(RULES_PATH) as {
  isPhaseChangeNoOp: (currentPhase: string, requestedPhase: string) => boolean
  describePhaseChange: (fromPhase: string, toPhase: string) => string
  isMilestoneCompletionNoOp: (currentCompletionState: string) => boolean
  describeMilestoneCompletion: (milestoneName: string) => string
}

describe('AC-39.6.2: activityTimelineEntry.js — the appended entry\'s shape', () => {
  it('ENTRY_TYPES names exactly the three kinds the three call sites use', () => {
    expect(entry.ENTRY_TYPES).toEqual({
      PHASE_CHANGE: 'phase_change',
      MILESTONE_COMPLETED: 'milestone_completed',
      NEXT_ACTION_OVERRIDE_SET: 'next_action_override_set',
    })
  })

  it('buildTimelineEntryRow shapes an insertable row: project_id, entry_type, summary, actor pairing and JSON-stringified metadata', () => {
    const row = entry.buildTimelineEntryRow(
      { id: 42 },
      entry.ENTRY_TYPES.PHASE_CHANGE,
      { adminId: 7, name: 'jane.photographer' },
      { summary: 'Phase changed from "lead" to "booking".', metadata: { from: 'lead', to: 'booking' } },
    )
    expect(row).toEqual({
      project_id: 42,
      entry_type: 'phase_change',
      summary: 'Phase changed from "lead" to "booking".',
      actor_admin_id: 7,
      actor_name: 'jane.photographer',
      metadata: JSON.stringify({ from: 'lead', to: 'booking' }),
    })
  })

  it('buildTimelineEntryRow stores a null metadata column when no metadata is given', () => {
    const row = entry.buildTimelineEntryRow(
      { id: 1 },
      entry.ENTRY_TYPES.NEXT_ACTION_OVERRIDE_SET,
      { adminId: 1, name: 'a' },
      { summary: 'Next action manually overridden: "hold for now".' },
    )
    expect(row.metadata).toBeNull()
  })

  it('transformTimelineEntry maps a DB row back to a reader-facing entry, parsing JSON metadata', () => {
    const result = entry.transformTimelineEntry({
      id: 9,
      entry_type: 'milestone_completed',
      summary: 'Milestone "deposit paid" completed.',
      actor_admin_id: 7,
      actor_name: 'jane.photographer',
      metadata: JSON.stringify({ milestoneKey: 'deposit_paid' }),
      occurred_at: '2026-08-16T11:30:00.000Z',
    })
    expect(result).toEqual({
      id: 9,
      entryType: 'milestone_completed',
      summary: 'Milestone "deposit paid" completed.',
      actorAdminId: 7,
      actorName: 'jane.photographer',
      metadata: { milestoneKey: 'deposit_paid' },
      occurredAt: '2026-08-16T11:30:00.000Z',
    })
  })

  it('transformTimelineEntry tolerates an already-object metadata value (pg json columns may deserialise automatically)', () => {
    const result = entry.transformTimelineEntry({
      id: 1,
      entry_type: 'phase_change',
      summary: 's',
      actor_admin_id: 1,
      actor_name: 'a',
      metadata: { already: 'an object' },
      occurred_at: '2026-08-16T09:00:00.000Z',
    })
    expect(result.metadata).toEqual({ already: 'an object' })
  })

  it('transformTimelineEntry returns null metadata (not undefined, not a parse error) when the row carries none', () => {
    const result = entry.transformTimelineEntry({
      id: 2,
      entry_type: 'phase_change',
      summary: 's',
      actor_admin_id: null,
      actor_name: 'a',
      metadata: null,
      occurred_at: '2026-08-16T09:00:00.000Z',
    })
    expect(result.metadata).toBeNull()
  })
})

describe('AC-39.6.2 Evidence: sortTimelineEntriesOldestFirst — the oldest-first read order', () => {
  it('sorts by id ascending regardless of input order — id, not occurred_at, is the authoritative ordering column', () => {
    const shuffled = [{ id: 5 }, { id: 1 }, { id: 3 }, { id: 2 }, { id: 4 }]
    expect(entry.sortTimelineEntriesOldestFirst(shuffled).map((e) => e.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('does not mutate the input array', () => {
    const input = [{ id: 3 }, { id: 1 }, { id: 2 }]
    const original = [...input]
    entry.sortTimelineEntriesOldestFirst(input)
    expect(input).toEqual(original)
  })

  it('two entries sharing the same occurred_at value still sort deterministically by id', () => {
    const sameTimestamp = [
      { id: 8, occurred_at: '2026-08-16T09:00:00.000Z' },
      { id: 6, occurred_at: '2026-08-16T09:00:00.000Z' },
      { id: 7, occurred_at: '2026-08-16T09:00:00.000Z' },
    ]
    expect(entry.sortTimelineEntriesOldestFirst(sameTimestamp).map((e) => e.id)).toEqual([6, 7, 8])
  })
})

describe('AC-39.6.2 Evidence: three changes appended through the shared shape produce three ordered entries', () => {
  it('a phase change, a milestone completion and an override, appended out of arrival order, read back oldest-first', () => {
    // Simulates what the three route handlers each do: build a row via the
    // one shared shape, "insert" it (here: push to a plain array standing
    // in for the table, assigning ids the way an auto-increment PK would),
    // then read the Project's timeline back through the one shared sort.
    const table: Array<Record<string, unknown>> = []
    let nextId = 1
    const insert = (row: Record<string, unknown>) => {
      table.push({ id: nextId++, ...row, occurred_at: '2026-08-16T09:00:00.000Z' })
    }

    insert(entry.buildTimelineEntryRow(
      { id: 42 }, entry.ENTRY_TYPES.PHASE_CHANGE,
      { adminId: 7, name: 'jane.photographer' },
      { summary: rules.describePhaseChange('lead', 'booking'), metadata: { from: 'lead', to: 'booking' } },
    ))
    insert(entry.buildTimelineEntryRow(
      { id: 42 }, entry.ENTRY_TYPES.MILESTONE_COMPLETED,
      { adminId: 7, name: 'jane.photographer' },
      { summary: rules.describeMilestoneCompletion('deposit paid'), metadata: { milestoneKey: 'deposit_paid' } },
    ))
    insert(entry.buildTimelineEntryRow(
      { id: 42 }, entry.ENTRY_TYPES.NEXT_ACTION_OVERRIDE_SET,
      { adminId: 7, name: 'jane.photographer' },
      { summary: 'Next action manually overridden: "hold for now".', metadata: { overrideText: 'hold for now' } },
    ))

    // Read back exactly the way activityTimelineService.getProjectTimeline
    // does: transform every row, then sort oldest-first.
    const timeline = entry.sortTimelineEntriesOldestFirst(table.map((row) => entry.transformTimelineEntry(row)))

    expect(timeline).toHaveLength(3)
    expect(timeline.map((e) => e.entryType)).toEqual([
      'phase_change',
      'milestone_completed',
      'next_action_override_set',
    ])
    expect(timeline.map((e) => e.id)).toEqual([1, 2, 3])
  })
})

describe('AC-39.6.2 Evidence: projectChangeRules.js — both no-op cases', () => {
  it('setting the phase to its current value is a no-op', () => {
    expect(rules.isPhaseChangeNoOp('booking', 'booking')).toBe(true)
  })

  it('setting the phase to a different value is NOT a no-op', () => {
    expect(rules.isPhaseChangeNoOp('lead', 'booking')).toBe(false)
  })

  it('re-completing an already-complete milestone is a no-op', () => {
    expect(rules.isMilestoneCompletionNoOp('complete')).toBe(true)
  })

  it('completing a pending (or any non-complete) milestone is NOT a no-op', () => {
    expect(rules.isMilestoneCompletionNoOp('pending')).toBe(false)
    expect(rules.isMilestoneCompletionNoOp('in_progress')).toBe(false)
  })

  it('describePhaseChange and describeMilestoneCompletion build the summary text a REAL change appends', () => {
    expect(rules.describePhaseChange('lead', 'booking')).toBe('Phase changed from "lead" to "booking".')
    expect(rules.describeMilestoneCompletion('deposit paid')).toBe('Milestone "deposit paid" completed.')
  })
})

describe('AC-39.6.2 Evidence: each of the three write handlers requires the one shared timeline service, and none writes to project_activity_timeline itself', () => {
  const adminRouteSource = read(ADMIN_ROUTE_PATH)

  it('the literal table name never appears in the route file — only activityTimelineService.js names it', () => {
    expect(adminRouteSource).not.toContain('project_activity_timeline')
  })

  it('registers the new events.manage-gated PUT /:id/phase route', () => {
    expect(adminRouteSource).toMatch(/router\.put\('\/:id\/phase',\s*requirePermission\('events\.manage'\)/)
  })

  it('registers the new events.manage-gated PUT /:id/milestones/:key/complete route', () => {
    expect(adminRouteSource).toMatch(
      /router\.put\('\/:id\/milestones\/:key\/complete',\s*requirePermission\('events\.manage'\)/,
    )
  })

  it('PUT /:id/phase requires activityTimelineService and only calls it when the phase service reports a real change', () => {
    const start = adminRouteSource.indexOf("router.put('/:id/phase'")
    const end = adminRouteSource.indexOf("router.put('/:id/milestones/:key/complete'")
    const section = adminRouteSource.slice(start, end)
    expect(section).toContain("require('../services/activityTimelineService')")
    expect(section).toContain('activityTimelineService.appendActivityTimelineEntry(')
    expect(section).toContain('ENTRY_TYPES.PHASE_CHANGE')
    expect(section).toMatch(/if \(result\.changed\)\s*{[\s\S]*appendActivityTimelineEntry/)
  })

  it('PUT /:id/milestones/:key/complete requires activityTimelineService and only calls it when the milestone service reports a real change', () => {
    const start = adminRouteSource.indexOf("router.put('/:id/milestones/:key/complete'")
    const end = adminRouteSource.indexOf("router.get('/:id/timeline'")
    const section = adminRouteSource.slice(start, end)
    expect(section).toContain("require('../services/activityTimelineService')")
    expect(section).toContain('activityTimelineService.appendActivityTimelineEntry(')
    expect(section).toContain('ENTRY_TYPES.MILESTONE_COMPLETED')
    expect(section).toMatch(/if \(result\.changed\)\s*{[\s\S]*appendActivityTimelineEntry/)
  })

  it('PUT /:id/next-action/override (AC-39.5\'s existing route) also requires activityTimelineService and appends an entry', () => {
    const start = adminRouteSource.indexOf("router.put('/:id/next-action/override'")
    const end = adminRouteSource.indexOf("router.put('/:id/phase'")
    const section = adminRouteSource.slice(start, end)
    expect(section).toContain("require('../services/activityTimelineService')")
    expect(section).toContain('activityTimelineService.appendActivityTimelineEntry(')
    expect(section).toContain('ENTRY_TYPES.NEXT_ACTION_OVERRIDE_SET')
  })

  it('none of the three write handlers records an actor other than req.admin', () => {
    for (const marker of [
      "router.put('/:id/phase'",
      "router.put('/:id/milestones/:key/complete'",
      "router.put('/:id/next-action/override'",
    ]) {
      const start = adminRouteSource.indexOf(marker)
      const nextRouteStart = adminRouteSource.indexOf('router.', start + marker.length)
      const section = adminRouteSource.slice(start, nextRouteStart === -1 ? undefined : nextRouteStart)
      expect(section).toContain('adminId: req.admin.id')
      expect(section).toContain('name: req.admin.username')
    }
  })

  it('registers the new events.view-gated GET /:id/timeline route, requiring activityTimelineService', () => {
    expect(adminRouteSource).toMatch(/router\.get\('\/:id\/timeline',\s*requirePermission\('events\.view'\)/)
    const start = adminRouteSource.indexOf("router.get('/:id/timeline'")
    const section = adminRouteSource.slice(start)
    expect(section).toContain("require('../services/activityTimelineService')")
    expect(section).toContain('activityTimelineService.getProjectTimeline(')
  })

  it('all three write handlers are gated by events.manage and the read route by events.view — no path or credential this AC did not already use elsewhere in the file', () => {
    const permissionsUsed = new Set(
      [...adminRouteSource.matchAll(/requirePermission\('([^']+)'\)/g)].map((m) => m[1]),
    )
    expect(permissionsUsed).toEqual(new Set(['events.view', 'events.manage']))
  })
})

describe('AC-39.6.2 Evidence: the four new/changed routes sit on the cockpit router, at the mount path and behind the middleware AC-39.3.1 recorded', () => {
  const adminRouteSource = read(ADMIN_ROUTE_PATH)
  const serverSource = read(path.join(vendorBackendRoot, 'server.js'))

  it('server.js still mounts this router at /api/admin/projects — the mount path AC-39.3.1 recorded, unchanged by this AC', () => {
    expect(serverSource).toMatch(
      /app\.use\('\/api\/admin\/projects',\s*require\('\.\/src\/routes\/adminProjects'\)\);/,
    )
  })

  it('the router still applies adminAuth for every route below it — the admin middleware AC-39.3.1 recorded', () => {
    expect(adminRouteSource).toMatch(/router\.use\(adminAuth\);/)
    expect(adminRouteSource).toContain("require('../middleware/auth')")
  })

  it('all four AC-39.6.2 routes are registered AFTER router.use(adminAuth), so none of them bypasses it', () => {
    const authGate = adminRouteSource.indexOf('router.use(adminAuth)')
    expect(authGate).toBeGreaterThan(-1)
    for (const marker of [
      "router.put('/:id/phase'",
      "router.put('/:id/milestones/:key/complete'",
      "router.put('/:id/next-action/override'",
      "router.get('/:id/timeline'",
    ]) {
      expect(adminRouteSource.indexOf(marker)).toBeGreaterThan(authGate)
    }
  })

  it('introduces no second auth middleware of its own — adminAuth is the only one this router applies', () => {
    const middlewareRequires = [...adminRouteSource.matchAll(/require\('\.\.\/middleware\/([^']+)'\)/g)].map((m) => m[1])
    expect(new Set(middlewareRequires)).toEqual(new Set(['auth', 'permissions']))
  })
})

describe('AC-39.6.2: the DB-backed services are structurally correct (not require()-d directly — see each file\'s header)', () => {
  it('activityTimelineService.js requires the live database module, names the migration-128 table, and exports append + read', () => {
    const src = read(TIMELINE_SERVICE_PATH)
    expect(src).toContain("require('../database/db')")
    expect(src).toContain("'project_activity_timeline'")
    expect(src).toMatch(/\.insert\(/)
    expect(src).toMatch(/\.orderBy\('id',\s*'asc'\)/)
    expect(src).toMatch(/module\.exports = \{\s*appendActivityTimelineEntry,\s*getProjectTimeline,?\s*\}/)
  })

  it('activityTimelineService.js builds inserted rows and read results through the shared pure module, not ad hoc', () => {
    const src = read(TIMELINE_SERVICE_PATH)
    expect(src).toContain("require('./activityTimelineEntry')")
    expect(src).toContain('buildTimelineEntryRow(')
    expect(src).toContain('sortTimelineEntriesOldestFirst(')
  })

  it('projectPhaseService.js requires the live database module, reads/writes projects.current_phase, and defers to the pure no-op rule', () => {
    const src = read(PHASE_SERVICE_PATH)
    expect(src).toContain("require('../database/db')")
    expect(src).toContain("require('./projectChangeRules')")
    expect(src).toContain('isPhaseChangeNoOp(')
    expect(src).toContain("current_phase")
    expect(src).toMatch(/module\.exports = \{\s*PROJECT_PHASE_KEYS,\s*setProjectPhase,?\s*\}/)
  })

  it('projectPhaseService.js never itself requires or references the timeline service or table — that is the route\'s job', () => {
    const src = read(PHASE_SERVICE_PATH)
    expect(src).not.toContain('activityTimelineService')
    expect(src).not.toContain('project_activity_timeline')
  })

  it('projectMilestoneService.js requires the live database module, reads/writes project_milestones, and defers to the pure no-op rule', () => {
    const src = read(MILESTONE_SERVICE_PATH)
    expect(src).toContain("require('../database/db')")
    expect(src).toContain("require('./projectChangeRules')")
    expect(src).toContain('isMilestoneCompletionNoOp(')
    expect(src).toContain("'project_milestones'")
    expect(src).toMatch(/module\.exports = \{\s*completeProjectMilestone,?\s*\}/)
  })

  it('projectMilestoneService.js never itself requires or references the timeline service or table — that is the route\'s job', () => {
    const src = read(MILESTONE_SERVICE_PATH)
    expect(src).not.toContain('activityTimelineService')
    expect(src).not.toContain('project_activity_timeline')
  })
})
