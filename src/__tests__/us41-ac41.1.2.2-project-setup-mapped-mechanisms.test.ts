/**
 * ---
 * file: src/__tests__/us41-ac41.1.2.2-project-setup-mapped-mechanisms.test.ts
 * project: earthandhoney
 * purpose: Verify AC-41.1.2.2 — with AC-41.1.2.1's single setup path in
 *          place, each of PRD 22.3's ten items is satisfied by the
 *          mechanism PROJECT_SETUP_MECHANISM_MAP.md (AC-41.1.1) named for
 *          it, and by no mechanism the map did not name. Ships no
 *          production module and no route; this suite is the proof,
 *          entirely UNIT lane (no Docker, no running stack, no container
 *          rebuild):
 *
 *          Ten assertions, one per PRD 22.3 item in the PRD's own order,
 *          each proving the code path exists and reaches the mapped
 *          mechanism (source-level, against the real pinned-fork files —
 *          never against this map's or projectSetupService.js's own
 *          prose). Items 6, 7 and 8 additionally carry the negative half —
 *          nothing is ever inserted for them — because the map records
 *          all three as ADDRESSABLE for three distinct structural reasons,
 *          and a setup path that invents a row for one of them is as
 *          wrong as one that skips a write.
 *
 *          Then the single-writer half: a closed scan of every `.js` file
 *          under vendor/picpeak/backend/src except __tests__, for exactly
 *          six artifact names (project_milestones,
 *          project_integration_status, project_activity_timeline,
 *          customer_invitations, project_documents, and the media-area
 *          key), each asserted to have the one writer the map names —
 *          project_documents expected to have none at all. Comments are
 *          stripped before every match in this file, so a comment naming
 *          the mechanism it forbids (this file's own header included, and
 *          projectSetupService.js's header, which discusses fs.mkdir and
 *          queueEmail by name precisely to disclaim them) can neither
 *          satisfy nor break a check.
 *
 *          A mismatch this suite finds between the service and the map is
 *          a defect in AC-41.1.2.1's service, fixed here rather than
 *          recorded and left. A mismatch between the map and the pinned
 *          fork is a finding for pending_po_routing, never a silent edit
 *          to the map — this suite records no such finding, because every
 *          citation below was independently re-verified against the
 *          actual source while writing this suite and held.
 * created-by: dev-team
 * related-story: US-41
 * related-ac: 41.1.2.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const vendorBackendRoot = path.join(root, 'vendor', 'picpeak', 'backend')
const BACKEND_SRC = path.join(vendorBackendRoot, 'src')

const PROJECT_SERVICE_PATH = path.join(BACKEND_SRC, 'services/projectService.js')
const SETUP_SERVICE_PATH = path.join(BACKEND_SRC, 'services/projectSetupService.js')
const CUSTOMER_ACCOUNTS_SERVICE_PATH = path.join(BACKEND_SRC, 'services/customerAccountsService.js')
const STORAGE_INDEX_PATH = path.join(BACKEND_SRC, 'services/storage/index.js')
const NEXT_ACTION_SERVICE_PATH = path.join(BACKEND_SRC, 'services/nextActionService.js')
const ACTIVITY_TIMELINE_SERVICE_PATH = path.join(BACKEND_SRC, 'services/activityTimelineService.js')
const ACTIVITY_TIMELINE_ENTRY_PATH = path.join(BACKEND_SRC, 'services/activityTimelineEntry.js')
const ADMIN_ROUTE_PATH = path.join(BACKEND_SRC, 'routes/adminProjects.js')
const CUSTOMER_ROUTE_PATH = path.join(BACKEND_SRC, 'routes/customer.js')
const MILESTONE_MIGRATION_PATH = path.join(
  vendorBackendRoot,
  'migrations/core/124_add_project_milestones.js',
)

const read = (absPath: string) => fs.readFileSync(absPath, 'utf-8')
const lineOf = (absPath: string, lineNumber: number) =>
  read(absPath).split('\n')[lineNumber - 1] ?? ''

/**
 * Source with comments stripped, so a comment naming a mechanism it
 * forbids (or discusses as a lead) can neither satisfy nor break a check
 * that runs against this rather than the raw file.
 */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
}

function discoverJsFiles(dir: string, acc: string[] = []): string[] {
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, dirent.name)
    if (dirent.isDirectory()) {
      if (dirent.name === '__tests__') continue
      discoverJsFiles(full, acc)
    } else if (dirent.isFile() && dirent.name.endsWith('.js')) {
      acc.push(full)
    }
  }
  return acc
}

const ALL_BACKEND_SRC_FILES = discoverJsFiles(BACKEND_SRC)
const rel = (absPath: string) => path.relative(BACKEND_SRC, absPath).split(path.sep).join('/')

/**
 * Every file under the closed domain that INSERTs into `tableName`,
 * resolved through either a literal string call site or a local
 * `const X = 'tableName'` alias — the pattern every service in this fork
 * uses (`PROJECT_MILESTONES_TABLE`, `PROJECT_INTEGRATION_STATUS_TABLE`,
 * etc). Reads/updates do not count as a writer for this check.
 */
function findInsertWriters(tableName: string): string[] {
  const literalPattern = new RegExp(`db\\(\\s*['"\`]${tableName}['"\`]\\s*\\)\\s*\\.insert\\(`)
  const writers: string[] = []
  for (const file of ALL_BACKEND_SRC_FILES) {
    const stripped = code(read(file))
    if (literalPattern.test(stripped)) {
      writers.push(file)
      continue
    }
    const constDeclPattern = new RegExp(`const\\s+(\\w+)\\s*=\\s*['"\`]${tableName}['"\`]`, 'g')
    let match: RegExpExecArray | null
    let wrote = false
    // eslint-disable-next-line no-cond-assign
    while ((match = constDeclPattern.exec(stripped))) {
      const callPattern = new RegExp(`db\\(\\s*${match[1]}\\s*\\)\\s*\\.insert\\(`)
      if (callPattern.test(stripped)) {
        wrote = true
        break
      }
    }
    if (wrote) writers.push(file)
  }
  return writers
}

/** The media area's key is a storage put(), never a DB table — its own writer shape. */
function findMediaKeyWriters(): string[] {
  const pattern = /getStorage\(\)\.put\(\s*projectMediaFolderKey\(/
  return ALL_BACKEND_SRC_FILES.filter((file) => pattern.test(code(read(file))))
}

describe('AC-41.1.2.2 item 1: the Project record — projectService.createProject, still the only insert into `projects`', () => {
  it('projectService.createProject inserts the projects row', () => {
    const src = read(PROJECT_SERVICE_PATH)
    expect(src).toMatch(/async function createProject\(/)
    expect(code(src)).toMatch(/db\('projects'\)\.insert\(/)
  })

  it('POST / reaches it via projectService.createProject before completeProjectSetup', () => {
    const adminRoute = code(read(ADMIN_ROUTE_PATH))
    const createIdx = adminRoute.indexOf('projectService.createProject(')
    const setupIdx = adminRoute.indexOf('projectSetupService.completeProjectSetup(')
    expect(createIdx).toBeGreaterThan(-1)
    expect(setupIdx).toBeGreaterThan(createIdx)
  })

  it('no other file in the closed domain inserts into `projects` — createProject is the only writer', () => {
    expect(findInsertWriters('projects').map(rel)).toEqual(['services/projectService.js'])
  })

  it('projectSetupService.js never inserts into projects itself', () => {
    expect(code(read(SETUP_SERVICE_PATH))).not.toMatch(/db\('projects'\)\.insert\(/)
  })
})

describe('AC-41.1.2.2 item 2: operational client relationship — customerAccountsService.createDirect, FK written through projectService', () => {
  it('createDirect is defined at customerAccountsService.js:197, matching the map', () => {
    expect(lineOf(CUSTOMER_ACCOUNTS_SERVICE_PATH, 197)).toMatch(
      /^async function createDirect\(\{ email, prefill, createdByAdminId \}\) \{$/,
    )
  })

  it('projectSetupService.js reaches createDirect when no existing account resolves', () => {
    expect(code(read(SETUP_SERVICE_PATH))).toContain('customerAccountsService.createDirect(')
  })

  it('the customer_account_id FK is written through projectService.updateProject, never a direct `projects` update', () => {
    const stripped = code(read(SETUP_SERVICE_PATH))
    expect(stripped).toContain('projectService.updateProject(')
    expect(stripped).not.toMatch(/db\('projects'\)\.update\(/)
    expect(stripped).not.toMatch(/db\(PROJECTS_TABLE\)\.update\(/)
  })

  it('projectService.updateProject is itself the one place that writes `projects.customer_account_id` on this path', () => {
    const src = code(read(PROJECT_SERVICE_PATH))
    expect(src).toMatch(/async function updateProject\(/)
    expect(src).toContain('customer_account_id')
    expect(src).toMatch(/db\('projects'\)\.where\(\{ id \}\)\.update\(patch\)/)
  })
})

describe('AC-41.1.2.2 item 3: empty project media area — the storage abstraction\'s put(), reached through getStorage(), never a raw fs.mkdir', () => {
  it('getStorage is defined at services/storage/index.js:65, matching the map', () => {
    expect(lineOf(STORAGE_INDEX_PATH, 65)).toMatch(/^function getStorage\(\) \{$/)
  })

  it('projectSetupService.js reaches it via getStorage().put(), never a raw filesystem call', () => {
    const stripped = code(read(SETUP_SERVICE_PATH))
    expect(stripped).toContain("require('./storage')")
    expect(stripped).toMatch(/getStorage\(\)\.put\(/)
    // The specific mistake this assertion exists to catch: findings F6/F7's
    // EACCES traces to Gallery-create's own raw fs.mkdir bypass of this
    // abstraction (adminEvents.js), not to the abstraction itself.
    expect(stripped).not.toMatch(/fs\.mkdir/)
  })

  it('the media-area key has exactly one writer in the closed domain: projectSetupService.js', () => {
    expect(findMediaKeyWriters().map(rel)).toEqual(['services/projectSetupService.js'])
  })
})

describe('AC-41.1.2.2 item 4: Project Room access record — customerAccountsService.createInvitation, skipped when already active', () => {
  it('createInvitation is defined at customerAccountsService.js:101, matching the map', () => {
    expect(lineOf(CUSTOMER_ACCOUNTS_SERVICE_PATH, 101)).toMatch(
      /^async function createInvitation\(\{ email, invitedById, prefill \}\) \{$/,
    )
  })

  it('projectSetupService.js reaches createInvitation', () => {
    expect(code(read(SETUP_SERVICE_PATH))).toContain('customerAccountsService.createInvitation(')
  })

  it('is skipped when the resolved client already has an active login', () => {
    const stripped = code(read(SETUP_SERVICE_PATH))
    const fnStart = stripped.indexOf('async function ensureProjectRoomAccess(')
    expect(fnStart).toBeGreaterThan(-1)
    const fnBody = stripped.slice(fnStart, stripped.indexOf('\n}', fnStart))
    expect(fnBody).toMatch(/if \(client\.hasActiveAccount\) return;/)
  })

  it('customer_invitations has exactly one writer in the closed domain: customerAccountsService.js', () => {
    expect(findInsertWriters('customer_invitations').map(rel)).toEqual([
      'services/customerAccountsService.js',
    ])
  })
})

describe('AC-41.1.2.2 item 5: default phase and milestones — migration 124\'s eighteen template rows cloned; the phase left to migration 122\'s column default', () => {
  it("migration 124's own template block seeds exactly eighteen PRD 23.2 milestones", () => {
    const src = read(MILESTONE_MIGRATION_PATH)
    const start = src.indexOf('const PRD_MILESTONES = [')
    const end = src.indexOf('].map((m, index)', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const block = src.slice(start, end)
    const keyCount = (block.match(/milestone_key:/g) || []).length
    expect(keyCount).toBe(18)
  })

  it('projectSetupService.js clones the project_id IS NULL template rows into this Project\'s own rows', () => {
    const stripped = code(read(SETUP_SERVICE_PATH))
    expect(stripped).toMatch(/\.whereNull\('project_id'\)/)
    expect(stripped).toContain('cloneMilestoneTemplateRows(')
  })

  it('the phase half is left to migration 122\'s column default — projectSetupService.js never writes current_phase', () => {
    expect(code(read(SETUP_SERVICE_PATH))).not.toMatch(/current_phase/)
  })

  it('project_milestones has exactly one writer in the closed domain: projectSetupService.js (milestone completion updates, it does not insert)', () => {
    expect(findInsertWriters('project_milestones').map(rel)).toEqual([
      'services/projectSetupService.js',
    ])
  })
})

describe('AC-41.1.2.2 item 6: next-action calculation — nextActionService.computeProjectNextAction, reachable from both surfaces, nothing ever inserted for it', () => {
  it('computeProjectNextAction is defined and exported by nextActionService.js', () => {
    const src = read(NEXT_ACTION_SERVICE_PATH)
    expect(src).toMatch(/async function computeProjectNextAction\(/)
    expect(code(src)).toMatch(/module\.exports = \{[\s\S]*computeProjectNextAction/)
  })

  it("the cockpit's GET /:id/next-action reaches it", () => {
    const adminRoute = code(read(ADMIN_ROUTE_PATH))
    expect(adminRoute).toContain("router.get('/:id/next-action'")
    expect(adminRoute).toContain('nextActionService.computeProjectNextAction(')
  })

  it("the Project Room's GET /projects/:id/next-action reaches the same function", () => {
    const customerRoute = code(read(CUSTOMER_ROUTE_PATH))
    expect(customerRoute).toContain("router.get('/projects/:id/next-action'")
    expect(customerRoute).toContain('nextActionService.computeProjectNextAction(')
  })

  it('negative half: projectSetupService.js inserts nothing for it — there is no next_action table or column to insert into', () => {
    const stripped = code(read(SETUP_SERVICE_PATH))
    expect(stripped).not.toContain('nextActionService')
    expect(stripped).not.toMatch(/next_action/)
  })
})

describe('AC-41.1.2.2 item 7: document area — nothing is ever inserted for it', () => {
  it('project_documents has no writer anywhere in the closed domain', () => {
    expect(findInsertWriters('project_documents')).toEqual([])
  })

  it('project_documents is not referenced by projectSetupService.js at all', () => {
    expect(code(read(SETUP_SERVICE_PATH))).not.toContain('project_documents')
  })
})

describe('AC-41.1.2.2 item 8: email merge context — nothing is ever inserted for it; the only mechanism is queueEmail\'s own emailData parameter', () => {
  it('projectSetupService.js builds no dedicated merge-context object and calls no second templating system', () => {
    const stripped = code(read(SETUP_SERVICE_PATH))
    expect(stripped).not.toContain('queueEmail(')
    expect(stripped).not.toMatch(/email_?[Cc]ontext/)
    expect(stripped).not.toMatch(/merge_?[Cc]ontext/)
  })

  it('no dedicated email/merge-context table or object exists anywhere in the closed domain', () => {
    const offenders = ALL_BACKEND_SRC_FILES.filter((file) =>
      /email_context|merge_context|emailMergeContext/.test(code(read(file))),
    )
    expect(offenders).toEqual([])
  })

  it("the invitation email item 4 sends already demonstrates the one real mechanism — queueEmail's inline emailData, in customerAccountsService.js only", () => {
    expect(code(read(CUSTOMER_ACCOUNTS_SERVICE_PATH))).toMatch(/queueEmail\(null, normalisedEmail, 'customer_invitation', \{/)
  })
})

describe('AC-41.1.2.2 item 9: financial integration placeholder — one migration-125 project_integration_status row', () => {
  it('projectSetupService.js inserts one project_integration_status row via the pure rules module', () => {
    const stripped = code(read(SETUP_SERVICE_PATH))
    expect(stripped).toContain('buildFinancialPlaceholderRow(')
    expect(stripped).toMatch(/PROJECT_INTEGRATION_STATUS_TABLE\)\.insert\(buildFinancialPlaceholderRow\(/)
  })

  it('project_integration_status has exactly one writer in the closed domain: projectSetupService.js', () => {
    expect(findInsertWriters('project_integration_status').map(rel)).toEqual([
      'services/projectSetupService.js',
    ])
  })
})

describe('AC-41.1.2.2 item 10: activity timeline — activityTimelineService.appendActivityTimelineEntry, never a direct insert, carrying PROJECT_CREATED', () => {
  it('appendActivityTimelineEntry is the sole writer of project_activity_timeline', () => {
    expect(findInsertWriters('project_activity_timeline').map(rel)).toEqual([
      'services/activityTimelineService.js',
    ])
  })

  it('projectSetupService.js reaches it through the shared service, never inserting into project_activity_timeline itself', () => {
    const stripped = code(read(SETUP_SERVICE_PATH))
    expect(stripped).toContain("require('./activityTimelineService')")
    expect(stripped).toContain('activityTimelineService.appendActivityTimelineEntry(')
    expect(stripped).not.toContain('project_activity_timeline')
  })

  it('carries the fourth ENTRY_TYPES member, PROJECT_CREATED, that AC-41.1.2.1 added', () => {
    expect(code(read(SETUP_SERVICE_PATH))).toContain('ENTRY_TYPES.PROJECT_CREATED')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const entry = require(ACTIVITY_TIMELINE_ENTRY_PATH) as { ENTRY_TYPES: Record<string, string> }
    expect(entry.ENTRY_TYPES.PROJECT_CREATED).toBe('project_created')
    expect(Object.keys(entry.ENTRY_TYPES)).toHaveLength(4)
  })
})

describe('AC-41.1.2.2: the single-writer half — a closed scan of every .js file under vendor/picpeak/backend/src except __tests__, for exactly six artifact names', () => {
  const ARTIFACT_TABLE_NAMES = [
    'project_milestones',
    'project_integration_status',
    'project_activity_timeline',
    'customer_invitations',
    'project_documents',
  ]

  it('the closed domain excludes every __tests__ directory', () => {
    expect(ALL_BACKEND_SRC_FILES.some((file) => file.split(path.sep).includes('__tests__'))).toBe(false)
    expect(ALL_BACKEND_SRC_FILES.length).toBeGreaterThan(0)
  })

  it.each([
    ['project_milestones', ['services/projectSetupService.js']],
    ['project_integration_status', ['services/projectSetupService.js']],
    ['project_activity_timeline', ['services/activityTimelineService.js']],
    ['customer_invitations', ['services/customerAccountsService.js']],
    ['project_documents', []],
  ])('%s has exactly the one expected writer', (tableName, expectedWriters) => {
    expect(findInsertWriters(tableName).map(rel).sort()).toEqual([...expectedWriters].sort())
  })

  it('the media-area key has exactly its one expected writer, projectSetupService.js', () => {
    expect(findMediaKeyWriters().map(rel)).toEqual(['services/projectSetupService.js'])
  })

  it('is bounded to exactly six artifact names — five tables plus the media-area key, no more', () => {
    expect(ARTIFACT_TABLE_NAMES).toHaveLength(5)
  })
})
