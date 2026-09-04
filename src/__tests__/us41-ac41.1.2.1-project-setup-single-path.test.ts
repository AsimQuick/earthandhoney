/**
 * ---
 * file: src/__tests__/us41-ac41.1.2.1-project-setup-single-path.test.ts
 * project: earthandhoney
 * purpose: Verify AC-41.1.2.1 — with AC-41.1.1's mechanism map in place,
 *          ONE shared `projectSetupService` performs the setup for all
 *          ten items PRD 22.3 names and `POST /api/admin/projects` calls
 *          it: one create call, one setup path, not ten call sites that
 *          happen to agree — the same single-authority shape AC-39.3.2
 *          proved for the next action and AC-39.6.2 for the timeline.
 *          Entirely UNIT lane, no Docker, no container rebuild:
 *
 *          1. `projectSetupRules.js` — the pure shapes that carry logic
 *             of their own (the media-area marker key, the cloned
 *             milestone row, the financial-placeholder row, the timeline
 *             summary text), driven directly with no requires and no
 *             database — and a check that the file itself requires
 *             nothing.
 *          2. `activityTimelineEntry.js`'s `ENTRY_TYPES` now carries a
 *             fourth member, `PROJECT_CREATED`, the source edit item 10
 *             of the mechanism map required before any append call could
 *             use it.
 *          3. Structural assertions on `projectSetupService.js` (never
 *             `require()`-d directly here — it requires `../database/db`,
 *             like every other DB-backed service in this fork): it
 *             exports exactly `completeProjectSetup`, never inserts into
 *             `projects` itself, builds every write through the pure
 *             rules module, appends the timeline entry through the one
 *             shared service using the new entry type, writes the media
 *             marker through the storage abstraction (never a raw
 *             `fs.mkdir`), and rejects a caller supplying neither
 *             `customerAccountId` nor `primaryContactEmail` with a
 *             `ValidationError`.
 *          4. Source-level assertions against the real
 *             `routes/adminProjects.js`: `POST /` validates the one new
 *             `primaryContactEmail` field, requires
 *             `projectSetupService.js` and calls `completeProjectSetup`
 *             exactly once, after `projectService.createProject`,
 *             passing `req.admin` as the actor, then re-reads the Project
 *             so the 201 body reflects a client relationship setup
 *             assigned rather than the pre-setup snapshot — and that call
 *             is `completeProjectSetup`'s only call site anywhere under
 *             `vendor/picpeak/backend/src`.
 *          5. A guard that neither new module contains any of
 *             AC-17.4.1.1.1.1.1.3's six recorded grep terms, so that
 *             suite's 746-hit backend-source count is untouched.
 *
 *          "One create call prepares all ten" is proven here as a fact
 *          about the code; AC-41.1.3 proves it as a fact about a running
 *          stack.
 * created-by: dev-team
 * related-story: US-41
 * related-ac: 41.1.2.1
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const vendorBackendRoot = path.join(root, 'vendor', 'picpeak', 'backend')
const BACKEND_SRC = path.join(vendorBackendRoot, 'src')
const ADMIN_ROUTE_PATH = path.join(BACKEND_SRC, 'routes/adminProjects.js')
const SETUP_SERVICE_PATH = path.join(BACKEND_SRC, 'services/projectSetupService.js')
const SETUP_RULES_PATH = path.join(BACKEND_SRC, 'services/projectSetupRules.js')
const ENTRY_PATH = path.join(BACKEND_SRC, 'services/activityTimelineEntry.js')

const read = (absPath: string) => fs.readFileSync(absPath, 'utf-8')

/**
 * Source with its comments stripped. The "never uses raw fs.mkdir" check
 * below runs against this rather than the raw file, so this file's own
 * header prose — which names `fs.mkdir` precisely to say it is NOT used,
 * mirroring PROJECT_SETUP_MECHANISM_MAP.md's item 3 finding — can neither
 * satisfy nor break the check; only real code can.
 */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rules = require(SETUP_RULES_PATH) as {
  FINANCIAL_PLACEHOLDER_INTEGRATION_KEY: string
  FINANCIAL_PLACEHOLDER_STATUS: string
  MILESTONE_PENDING_STATE: string
  projectMediaFolderKey: (projectId: number) => string
  cloneMilestoneTemplateRows: (
    templates: Array<{ milestone_key: string; name: string; sequence_order: number }>,
    projectId: number,
    now: Date,
  ) => Array<Record<string, unknown>>
  buildFinancialPlaceholderRow: (projectId: number, now: Date) => Record<string, unknown>
  describeProjectCreated: (projectName: string) => string
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const entry = require(ENTRY_PATH) as { ENTRY_TYPES: Record<string, string> }

describe('AC-41.1.2.1: projectSetupRules.js — the pure shapes, driven directly', () => {
  it('projectMediaFolderKey is a deterministic zero-byte marker key, not a directory', () => {
    expect(rules.projectMediaFolderKey(42)).toBe('projects/42/media/.keep')
    expect(rules.projectMediaFolderKey(1)).toBe('projects/1/media/.keep')
  })

  it("cloneMilestoneTemplateRows shapes migration 124's template rows into this Project's own insertable rows, sharing one `now`", () => {
    const now = new Date('2026-09-05T10:00:00.000Z')
    const templates = [
      { milestone_key: 'inquiry_reviewed', name: 'inquiry reviewed', sequence_order: 1 },
      { milestone_key: 'quote_sent', name: 'quote sent', sequence_order: 3 },
    ]
    expect(rules.cloneMilestoneTemplateRows(templates, 7, now)).toEqual([
      {
        project_id: 7, milestone_key: 'inquiry_reviewed', name: 'inquiry reviewed', sequence_order: 1,
        completion_state: 'pending', completed_at: null, completed_by: null, created_at: now, updated_at: now,
      },
      {
        project_id: 7, milestone_key: 'quote_sent', name: 'quote sent', sequence_order: 3,
        completion_state: 'pending', completed_at: null, completed_by: null, created_at: now, updated_at: now,
      },
    ])
  })

  it('cloneMilestoneTemplateRows on zero templates returns an empty array (not an error)', () => {
    expect(rules.cloneMilestoneTemplateRows([], 7, new Date())).toEqual([])
  })

  it("buildFinancialPlaceholderRow is one 'pending' row naming no external system", () => {
    const now = new Date('2026-09-05T10:00:00.000Z')
    const row = rules.buildFinancialPlaceholderRow(3, now)
    expect(row).toMatchObject({
      project_id: 3,
      integration_key: 'financial_placeholder',
      status: 'pending',
      occurred_at: now,
      created_at: now,
      updated_at: now,
    })
    expect(String(row.message)).not.toMatch(/stripe|invoice\s*ninja/i)
  })

  it('describeProjectCreated builds the activity-timeline summary text', () => {
    expect(rules.describeProjectCreated('Smith Wedding')).toBe('Project "Smith Wedding" created.')
  })

  it('requires nothing — no require() of any kind, so it is unit-testable without Docker', () => {
    expect(read(SETUP_RULES_PATH)).not.toMatch(/require\(/)
  })
})

describe("AC-41.1.2.1: activityTimelineEntry.js gains the fourth ENTRY_TYPES member item 10 needed", () => {
  it('ENTRY_TYPES carries PROJECT_CREATED alongside AC-39.6.2\'s three existing members', () => {
    expect(entry.ENTRY_TYPES).toEqual({
      PHASE_CHANGE: 'phase_change',
      MILESTONE_COMPLETED: 'milestone_completed',
      NEXT_ACTION_OVERRIDE_SET: 'next_action_override_set',
      PROJECT_CREATED: 'project_created',
    })
  })
})

describe('AC-41.1.2.1: projectSetupService.js is structurally correct (not require()-d directly — it requires ../database/db)', () => {
  const src = read(SETUP_SERVICE_PATH)

  it('requires the live database module, matching every other DB-backed service in this fork', () => {
    expect(src).toContain("require('../database/db')")
  })

  it('exports exactly one entry point, completeProjectSetup — no read-back function (that is AC-41.1.2.3\'s scope)', () => {
    expect(src).toMatch(/module\.exports = \{\s*completeProjectSetup,?\s*\}/)
    expect(src).not.toContain('getProjectMediaAreaStatus')
    expect(src).not.toContain('getProjectRoomAccessStatus')
    expect(src).not.toContain('getProjectMilestones')
    expect(src).not.toContain('getProjectDocuments')
    expect(src).not.toContain('getProjectIntegrationStatuses')
  })

  it('never inserts into projects itself — item 1 stays projectService.createProject\'s own insert', () => {
    expect(src).not.toMatch(/db\('projects'\)\.insert/)
    expect(src).toContain('projectService.updateProject(')
  })

  it('builds every write through the pure projectSetupRules.js shapes, never ad hoc', () => {
    expect(src).toContain("require('./projectSetupRules')")
    expect(src).toContain('cloneMilestoneTemplateRows(')
    expect(src).toContain('buildFinancialPlaceholderRow(')
    expect(src).toContain('projectMediaFolderKey(')
    expect(src).toContain('describeProjectCreated(')
  })

  it('appends the activity-timeline entry through the one shared service, using the new PROJECT_CREATED entry type', () => {
    expect(src).toContain("require('./activityTimelineService')")
    expect(src).toContain("require('./activityTimelineEntry')")
    expect(src).toContain('activityTimelineService.appendActivityTimelineEntry(')
    expect(src).toContain('ENTRY_TYPES.PROJECT_CREATED')
  })

  it('writes the empty media area through the storage abstraction only — never a raw fs.mkdir', () => {
    expect(src).toContain("require('./storage')")
    expect(src).toContain('getStorage().put(')
    expect(code(src)).not.toMatch(/fs\.mkdir/)
  })

  it('rejects a caller supplying neither customerAccountId nor primaryContactEmail with a ValidationError', () => {
    expect(src).toContain("require('../utils/errors')")
    expect(src).toContain('ValidationError')
    expect(src).toMatch(/throw new ValidationError\(/)
  })

  it("reuses customerAccountsService.createInvitation's own duplicate guard (ConflictError) rather than reimplementing it", () => {
    expect(src).toContain('ConflictError')
    expect(src).toContain('customerAccountsService.createInvitation(')
    expect(src).toContain('customerAccountsService.createDirect(')
  })
})

describe('AC-41.1.2.1: POST / calls the one setup path exactly once, immediately after createProject', () => {
  const adminRouteSource = read(ADMIN_ROUTE_PATH)

  const createHandlerSource = (() => {
    const start = adminRouteSource.indexOf("router.post('/',")
    const end = adminRouteSource.indexOf("router.get('/:id'", start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    return adminRouteSource.slice(start, end)
  })()

  it('validates the one new optional primaryContactEmail field alongside the existing name/customerAccountId pair', () => {
    expect(createHandlerSource).toMatch(/body\('name'\)/)
    expect(createHandlerSource).toMatch(/body\('customerAccountId'\)\.optional\(\{ values: 'falsy' \}\)\.isInt\(/)
    expect(createHandlerSource).toMatch(/body\('primaryContactEmail'\)\.optional\(\{ values: 'falsy' \}\)\.isEmail\(\)/)
  })

  it('requires projectSetupService and calls completeProjectSetup exactly once', () => {
    expect(createHandlerSource).toContain("require('../services/projectSetupService')")
    const calls = createHandlerSource.match(/projectSetupService\.completeProjectSetup\(/g) ?? []
    expect(calls).toHaveLength(1)
  })

  it('calls projectService.createProject before completeProjectSetup — item 1 happens first, setup never creates the Project itself', () => {
    const createIdx = createHandlerSource.indexOf('projectService.createProject(')
    const setupIdx = createHandlerSource.indexOf('projectSetupService.completeProjectSetup(')
    expect(createIdx).toBeGreaterThan(-1)
    expect(setupIdx).toBeGreaterThan(createIdx)
  })

  it('passes req.admin as the actor — never a caller-supplied actor', () => {
    const setupIdx = createHandlerSource.indexOf('projectSetupService.completeProjectSetup(')
    const callSection = createHandlerSource.slice(setupIdx)
    expect(callSection).toContain('adminId: req.admin.id')
    expect(callSection).toContain('adminName: req.admin.username')
  })

  it("passes the created project and the request's customerAccountId/primaryContactEmail through to setup", () => {
    const setupIdx = createHandlerSource.indexOf('projectSetupService.completeProjectSetup(')
    const closeIdx = createHandlerSource.indexOf(');', setupIdx)
    const callSection = createHandlerSource.slice(setupIdx, closeIdx)
    expect(callSection).toContain('project,')
    expect(callSection).toContain('customerAccountId: req.body.customerAccountId || null')
    expect(callSection).toContain('primaryContactEmail: req.body.primaryContactEmail || null')
  })

  it('re-reads the project after setup, so the response reflects setup\'s own writes (e.g. an assigned customerAccountId)', () => {
    const setupIdx = createHandlerSource.indexOf('projectSetupService.completeProjectSetup(')
    const afterSetup = createHandlerSource.slice(setupIdx)
    expect(afterSetup).toContain('projectService.getProjectById(project.id)')
    expect(afterSetup).toMatch(/successResponse\(res,\s*\{\s*project:\s*created\s*\},\s*201,\s*'Project created'\)/)
  })
})

describe("AC-41.1.2.1: completeProjectSetup has exactly one call site in the whole fork backend", () => {
  function discoverJsFiles(dir: string, acc: string[] = []): string[] {
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, dirent.name)
      if (dirent.isDirectory()) discoverJsFiles(full, acc)
      else if (dirent.isFile() && dirent.name.endsWith('.js')) acc.push(full)
    }
    return acc
  }

  it('is called (not merely defined) in exactly one file: routes/adminProjects.js', () => {
    const callers = discoverJsFiles(BACKEND_SRC).filter((file) => {
      if (file === SETUP_SERVICE_PATH) return false // the definition/export itself, not a call
      return /completeProjectSetup\(/.test(read(file))
    })
    expect(callers).toEqual([ADMIN_ROUTE_PATH])
  })
})

describe("AC-41.1.2.1: neither new module touches AC-17.4.1.1.1.1.1.3's six recorded grep terms", () => {
  const TERMS = ['expir', 'expires_at', 'expiry', 'ttl', 'valid_until', 'lifetime']

  it.each([
    ['projectSetupService.js', SETUP_SERVICE_PATH],
    ['projectSetupRules.js', SETUP_RULES_PATH],
  ])('%s contains none of the six terms, case-insensitive', (_label, filePath) => {
    const lower = read(filePath).toLowerCase()
    for (const term of TERMS) {
      expect(lower).not.toContain(term)
    }
  })
})
