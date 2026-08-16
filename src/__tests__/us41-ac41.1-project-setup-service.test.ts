/**
 * ---
 * file: src/__tests__/us41-ac41.1-project-setup-service.test.ts
 * project: earthandhoney
 * purpose: Verify AC-41.1 — one Project-create call prepares all ten PRD
 *          22.3 items, not just the bare `projects` row. UNIT lane only,
 *          entirely structural (source-text) assertions:
 *          `projectSetupService.js` requires `../database/db` (via
 *          `customerAccountsService`, `activityTimelineService` and
 *          `./storage`, all themselves DB/storage-backed), so — matching
 *          the established precedent this fork already set for
 *          `nextActionService.js`, `activityTimelineService.js`,
 *          `projectPhaseService.js` and `projectMilestoneService.js`
 *          (see `us39-ac39.6.2-shared-activity-timeline.test.ts`'s own
 *          header) — it is never `require()`-d directly in a UNIT suite.
 *          The live behavioural proof (the ten named assertions against a
 *          running stack) is
 *          `us41-ac41.1-project-setup-live-proof.test.ts`.
 *
 *          What this suite checks, one describe block per PRD 22.3 item:
 *            1. Project record        — projectService.createProject is
 *               still the literal call (US-18 AC-18.4's contract doc
 *               cites it), untouched.
 *            2. operational client relationship — ensureClientRelationship
 *               reuses customerAccountsService.createDirect rather than
 *               inserting into customer_accounts itself.
 *            3. empty project media area/folder — ensureProjectMediaFolder
 *               goes through the generic storage abstraction's put(),
 *               never a raw fs/S3 call of its own (the F6/F7 mistake
 *               AC-41.3 will separately verify against the real backend).
 *            4. Project Room access record — ensureProjectRoomAccess
 *               reuses customerAccountsService.createInvitation rather
 *               than inserting into customer_invitations itself.
 *            5. default phase and milestones — seedProjectMilestones
 *               clones migration 124's `project_id IS NULL` templates.
 *            6. next-action calculation — no code of its own; this file
 *               never mentions nextActionService or nextActionRules,
 *               proving item 6 is left entirely to the already-shipped
 *               single computation (US-39 AC-39.3.2).
 *            7. document area — getProjectDocuments reads
 *               project_documents, scoped by project_id.
 *            8. email merge context — the same createInvitation call as
 *               item 4 hands variables to emailProcessor.queueEmail (the
 *               Backstage queue's own merge mechanism, AC-41.5's
 *               mechanism) — proven by createInvitation's own already-
 *               shipped source, cited here rather than re-implemented.
 *            9. financial integration placeholder —
 *               recordFinancialPlaceholder writes one 'pending' row and
 *               contains no ledger/Stripe call of its own.
 *           10. activity timeline — completeProjectSetup appends one
 *               PROJECT_CREATED entry through the one shared
 *               activityTimelineService.
 *
 *          Plus: the route wiring in adminProjects.js (POST / still calls
 *          projectService.createProject, then
 *          projectSetupService.completeProjectSetup; the four new
 *          events.view read routes this AC adds all sit after
 *          router.use(adminAuth), introducing no second auth middleware).
 * created-by: dev-team
 * related-story: US-41
 * related-ac: 41.1
 * ---
 */
import fs from 'fs'
import path from 'path'

const vendorBackendRoot = path.join(process.cwd(), 'vendor', 'picpeak', 'backend')
const SETUP_SERVICE_PATH = path.join(vendorBackendRoot, 'src/services/projectSetupService.js')
const ADMIN_ROUTE_PATH = path.join(vendorBackendRoot, 'src/routes/adminProjects.js')
const ENTRY_PATH = path.join(vendorBackendRoot, 'src/services/activityTimelineEntry.js')
const CUSTOMER_ACCOUNTS_SERVICE_PATH = path.join(vendorBackendRoot, 'src/services/customerAccountsService.js')
const MIGRATION_124_PATH = path.join(vendorBackendRoot, 'migrations/core/124_add_project_milestones.js')

const read = (absPath: string) => fs.readFileSync(absPath, 'utf-8')

/**
 * Comments stripped, so every negative-space assertion below ("makes no
 * Stripe call", "never mentions nextActionService") is a claim about
 * EXECUTABLE CODE, not about prose. This file's own header legitimately
 * names the things it promises not to call — explaining why a boundary
 * exists is not crossing it — and a guard that cannot tell the two apart
 * is a guard that punishes documentation.
 */
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')

const setupSrc = read(SETUP_SERVICE_PATH)
const setupCode = stripComments(setupSrc)

describe('AC-41.1: projectSetupService.js exists and carries a structured metadata header naming this AC', () => {
  it('is a new file at the expected path', () => {
    expect(fs.existsSync(SETUP_SERVICE_PATH)).toBe(true)
  })

  it('the header names US-41 / 41.1', () => {
    expect(setupSrc).toMatch(/related-story:\s*US-41/)
    expect(setupSrc).toMatch(/related-ac:\s*41\.1/)
  })

  it('exports the orchestration entry point and the four read-back helpers the new routes use', () => {
    expect(setupSrc).toMatch(
      /module\.exports = \{[\s\S]*completeProjectSetup,[\s\S]*getProjectMediaFolderStatus,[\s\S]*getProjectMilestones,[\s\S]*getProjectDocuments,[\s\S]*getProjectIntegrationStatuses,?[\s\S]*\}/,
    )
  })
})

describe('AC-41.1 item 1 — Project record: unchanged, still projectService.createProject', () => {
  it('projectSetupService.js never inserts into the projects table itself except to set customer_account_id', () => {
    const inserts = [...setupCode.matchAll(/db\('projects'\)([\s\S]{0,80})/g)].map((m) => m[0])
    expect(inserts.length).toBeGreaterThan(0)
    for (const call of inserts) {
      expect(call).not.toContain('.insert(')
    }
  })

  it("adminProjects.js's POST / still calls projectService.createProject as its first step (US-18 AC-18.4's cited call)", () => {
    const adminRoute = read(ADMIN_ROUTE_PATH)
    const start = adminRoute.indexOf("router.post('/',")
    const end = adminRoute.indexOf("router.get('/:id'")
    const section = adminRoute.slice(start, end)
    expect(section).toContain('projectService.createProject(')
    expect(section).toContain('projectSetupService.completeProjectSetup(')
  })
})

describe('AC-41.1 item 2 — operational client relationship: reuses customerAccountsService.createDirect, never a duplicate insert', () => {
  it('ensureClientRelationship requires customerAccountsService and calls createDirect', () => {
    expect(setupSrc).toContain("require('./customerAccountsService')")
    expect(setupSrc).toContain('customerAccountsService.createDirect(')
  })

  it('never inserts into customer_accounts directly — that stays customerAccountsService.createDirect\'s job', () => {
    expect(setupCode).not.toMatch(/db\('customer_accounts'\)[\s\S]{0,40}\.insert\(/)
  })

  it('sets projects.customer_account_id after resolving the client', () => {
    expect(setupSrc).toMatch(/db\('projects'\)\.where\(\{ id: project\.id \}\)\.update\(\{\s*customer_account_id: client\.customerAccountId/)
  })

  it('customerAccountsService.createDirect really does exist and create a passive customer_accounts row (the function this file depends on)', () => {
    const src = read(CUSTOMER_ACCOUNTS_SERVICE_PATH)
    expect(src).toMatch(/async function createDirect\(\{ email, prefill, createdByAdminId \}\)/)
    expect(src).toContain("db('customer_accounts').insert(")
  })
})

describe('AC-41.1 item 3 — empty project media area/folder: through the generic storage abstraction only', () => {
  it('projectMediaFolderKey builds a deterministic per-project key', () => {
    expect(setupSrc).toMatch(/function projectMediaFolderKey\(projectId\)\s*\{\s*return `projects\/\$\{projectId\}\/media\/\.keep`/)
  })

  it('ensureProjectMediaFolder writes through getStorage().put(), never a raw fs or S3 call', () => {
    expect(setupSrc).toContain("require('./storage')")
    expect(setupSrc).toContain('getStorage().put(')
    expect(setupCode).not.toMatch(/require\('fs'\)/)
    expect(setupCode).not.toMatch(/require\('fs\/promises'\)/)
    expect(setupCode).not.toMatch(/@aws-sdk/)
  })

  it('writes a zero-byte marker (an empty folder), not a real upload', () => {
    expect(setupSrc).toContain('Buffer.alloc(0)')
  })
})

describe('AC-41.1 item 4 — Project Room access record: reuses customerAccountsService.createInvitation, never a duplicate insert', () => {
  it('ensureProjectRoomAccess calls createInvitation', () => {
    expect(setupSrc).toContain('customerAccountsService.createInvitation({')
  })

  it('never inserts into customer_invitations directly — that stays customerAccountsService.createInvitation\'s job', () => {
    expect(setupCode).not.toMatch(/db\('customer_invitations'\)[\s\S]{0,40}\.insert\(/)
  })

  it('skips issuing a second invitation when the resolved client already has an active login', () => {
    expect(setupSrc).toMatch(/if \(client\.hasAccess\) return null/)
  })

  it("customerAccountsService.createInvitation really does exist, and really does hand merge variables to the email queue (item 8's evidence)", () => {
    const src = read(CUSTOMER_ACCOUNTS_SERVICE_PATH)
    expect(src).toMatch(/async function createInvitation\(\{ email, invitedById, prefill \}\)/)
    expect(src).toContain("require('./emailProcessor')")
    expect(src).toMatch(/queueEmail\(null, normalisedEmail, 'customer_invitation', \{/)
    expect(src).toContain('invite_link:')
    expect(src).toContain('expires_at:')
  })
})

describe('AC-41.1 item 5 — default phase and milestones: seedProjectMilestones clones migration 124\'s templates', () => {
  it('reads the canonical template rows (project_id IS NULL) from project_milestones', () => {
    expect(setupSrc).toMatch(/db\(PROJECT_MILESTONES_TABLE\)\s*\.whereNull\('project_id'\)/)
  })

  it('clones each template onto the new Project with completion_state pending', () => {
    expect(setupSrc).toMatch(/project_id: projectId,/)
    expect(setupSrc).toMatch(/completion_state: 'pending'/)
  })

  it("migration 124's own header already named this file as the future cloner — confirms the design intent, not just this file's own claim", () => {
    const migrationSrc = read(MIGRATION_124_PATH)
    expect(migrationSrc).toMatch(/US-41's atomic Project-setup path/)
  })

  it('the phase default itself is left to migration 122\'s column default — no projects.current_phase write in this file', () => {
    expect(setupCode).not.toContain('current_phase')
  })
})

describe('AC-41.1 item 6 — next-action calculation: no new code, left entirely to the already-shipped single computation', () => {
  it('projectSetupService.js calls neither nextActionService nor nextActionRules', () => {
    expect(setupCode).not.toContain('nextActionService')
    expect(setupCode).not.toContain('nextActionRules')
  })
})

describe('AC-41.1 item 7 — document area: addressable and scoped, nothing inserted at create time', () => {
  it('getProjectDocuments reads project_documents scoped by project_id, and this file never inserts into it', () => {
    expect(setupCode).toMatch(/db\(PROJECT_DOCUMENTS_TABLE\)\s*\.where\(\{ project_id: projectId \}\)/)
    expect(setupCode).not.toMatch(/db\(PROJECT_DOCUMENTS_TABLE\)[\s\S]{0,40}\.insert\(/)
  })
})

describe('AC-41.1 item 9 — financial integration placeholder: provably a placeholder only', () => {
  it('recordFinancialPlaceholder inserts exactly one pending row into project_integration_status', () => {
    expect(setupSrc).toMatch(/db\(PROJECT_INTEGRATION_STATUS_TABLE\)\.insert\(\{/)
    expect(setupSrc).toContain("status: 'pending'")
    expect(setupSrc).toContain("integration_key: FINANCIAL_PLACEHOLDER_INTEGRATION_KEY")
  })

  it('makes no ledger, Stripe or HTTP call of its own', () => {
    expect(setupCode).not.toMatch(/fetch\(/)
    expect(setupCode).not.toMatch(/axios/)
    expect(setupCode).not.toMatch(/stripe/i)
    expect(setupCode).not.toMatch(/invoice.?ninja/i)
    expect(setupCode).not.toMatch(/https?:\/\//)
  })
})

describe('AC-41.1 item 10 — activity timeline: one PROJECT_CREATED entry through the one shared service', () => {
  it('completeProjectSetup requires activityTimelineService and activityTimelineEntry, and appends exactly one entry', () => {
    expect(setupCode).toContain("require('./activityTimelineService')")
    expect(setupCode).toContain("require('./activityTimelineEntry')")
    const appendCalls = setupCode.match(/activityTimelineService\.appendActivityTimelineEntry\(/g) || []
    expect(appendCalls).toHaveLength(1)
    expect(setupCode).toContain('ENTRY_TYPES.PROJECT_CREATED')
  })

  it('never writes to project_activity_timeline directly — only the shared service names that table', () => {
    expect(setupCode).not.toContain('project_activity_timeline')
  })

  it("activityTimelineEntry.js's ENTRY_TYPES now names PROJECT_CREATED as 'project_created'", () => {
    const entrySrc = read(ENTRY_PATH)
    expect(entrySrc).toMatch(/PROJECT_CREATED:\s*'project_created'/)
  })
})

describe('AC-41.1: completeProjectSetup runs every one of items 2-5, 8-10 in one function, in a sensible order', () => {
  it('resolves the client relationship before writing projects.customer_account_id', () => {
    const clientIdx = setupSrc.indexOf('const client = await ensureClientRelationship(')
    const updateIdx = setupSrc.indexOf("db('projects').where({ id: project.id }).update(")
    expect(clientIdx).toBeGreaterThan(-1)
    expect(updateIdx).toBeGreaterThan(clientIdx)
  })

  it('calls the access, milestone, media-folder and financial-placeholder steps, then appends the timeline entry last', () => {
    const order = [
      "ensureProjectRoomAccess(client, adminId)",
      'seedProjectMilestones(project.id)',
      'ensureProjectMediaFolder(project.id)',
      'recordFinancialPlaceholder(project.id)',
      'activityTimelineService.appendActivityTimelineEntry(',
    ]
    let lastIndex = -1
    for (const marker of order) {
      const idx = setupSrc.indexOf(marker)
      expect(idx).toBeGreaterThan(lastIndex)
      lastIndex = idx
    }
  })
})

describe('AC-41.1: adminProjects.js wiring — POST / requires at least one of customerAccountId or primaryContact.email', () => {
  const adminRoute = read(ADMIN_ROUTE_PATH)

  it('validates primaryContact.email as an email when primaryContact is present', () => {
    expect(adminRoute).toMatch(/body\('primaryContact\.email'\)\.optional\(\{ values: 'falsy' \}\)\.isEmail\(\)/)
  })

  it('throws a ValidationError when neither customerAccountId nor primaryContact.email is given', () => {
    const start = adminRoute.indexOf("router.post('/',")
    const end = adminRoute.indexOf("router.get('/:id'")
    const section = adminRoute.slice(start, end)
    expect(section).toMatch(/if \(!req\.body\.customerAccountId && !\(req\.body\.primaryContact && req\.body\.primaryContact\.email\)\)/)
    expect(section).toContain('throw new ValidationError(')
  })

  it("imports ValidationError from utils/errors", () => {
    expect(adminRoute).toContain("const { ValidationError } = require('../utils/errors');")
  })
})

describe('AC-41.1: the four new read routes are events.view-gated, mounted after adminAuth, and add no second auth middleware', () => {
  const adminRoute = read(ADMIN_ROUTE_PATH)
  const authGate = adminRoute.indexOf('router.use(adminAuth)')

  it.each([
    ["/:id/media-folder", 'getProjectMediaFolderStatus'],
    ["/:id/milestones", 'getProjectMilestones'],
    ["/:id/documents", 'getProjectDocuments'],
    ["/:id/integration-status", 'getProjectIntegrationStatuses'],
  ])('registers GET %s as events.view-gated, calling projectSetupService.%s, after router.use(adminAuth)', (routePath, helper) => {
    const marker = `router.get('${routePath}', requirePermission('events.view')`
    const idx = adminRoute.indexOf(marker)
    expect(idx).toBeGreaterThan(authGate)
    const nextRouteStart = adminRoute.indexOf('router.', idx + marker.length)
    const section = adminRoute.slice(idx, nextRouteStart === -1 ? undefined : nextRouteStart)
    expect(section).toContain(`projectSetupService.${helper}(`)
    expect(section).toMatch(/if \(!project\) return res\.status\(404\)/)
  })

  it('introduces no second auth middleware — adminAuth is still the only one this router applies', () => {
    const middlewareRequires = [...adminRoute.matchAll(/require\('\.\.\/middleware\/([^']+)'\)/g)].map((m) => m[1])
    expect(new Set(middlewareRequires)).toEqual(new Set(['auth', 'permissions']))
  })

  it('every permission this router now uses is still only events.view or events.manage', () => {
    const permissionsUsed = new Set([...adminRoute.matchAll(/requirePermission\('([^']+)'\)/g)].map((m) => m[1]))
    expect(permissionsUsed).toEqual(new Set(['events.view', 'events.manage']))
  })
})
