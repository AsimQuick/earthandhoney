/**
 * ---
 * file: src/__tests__/us41-ac41.1.2.3-project-setup-read-back-routes.test.ts
 * project: earthandhoney
 * purpose: Verify AC-41.1.2.3 — exactly the read-back routes
 *          PROJECT_SETUP_MECHANISM_MAP.md's (AC-41.1.1) question 12
 *          recorded as absent are added to the cockpit router, and no
 *          others: the map's answer 12 named five of PRD 22.3's ten setup
 *          items (3 media area, 4 Project Room access, 5's milestone
 *          list, 7 document area, 9 integration status) with no
 *          read-back route of any kind at the pinned commit. Entirely
 *          UNIT lane, no Docker, no running stack:
 *
 *          1. All five routes are registered on
 *             `vendor/picpeak/backend/src/routes/adminProjects.js`, each
 *             with its own `param('id').isInt` validation, each
 *             registered after `router.use(adminAuth)`, each gated on the
 *             same `events.view` permission this router's other GETs
 *             already use (no new permission), and each delegating to its
 *             own named function on AC-41.1.2.1's `projectSetupService`
 *             — never a query of the route's own.
 *          2. The router's whole route set is exactly the twelve the
 *             map's answer-12 table listed plus these five, and nothing
 *             else — a closed enumeration, not a spot check.
 *          3. The mount path and gating middleware are read from source
 *             (`server.js`, `adminProjects.js`) rather than assumed —
 *             still `/api/admin/projects`, still `adminAuth`, no new
 *             mount, no customer-side route added.
 *          4. Item 4 is the one item with no table of its own, so its
 *             read-back is the one that could state an access rule no map
 *             recorded: it reads exactly the two objects the map's answer
 *             B names (an active `customer_accounts` login, a not-yet-
 *             accepted `customer_invitations` row) and no third, with
 *             that wording read from the map rather than assumed.
 *
 *          These five routes are what makes AC-41.1.3's ten live
 *          assertions possible at all — five of the ten have no live
 *          read-back without them — so this AC closes before that one
 *          runs.
 * created-by: dev-team
 * related-story: US-41
 * related-ac: 41.1.2.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const vendorBackendRoot = path.join(root, 'vendor', 'picpeak', 'backend')
const BACKEND_SRC = path.join(vendorBackendRoot, 'src')
const ADMIN_ROUTE_PATH = path.join(BACKEND_SRC, 'routes/adminProjects.js')
const SETUP_SERVICE_PATH = path.join(BACKEND_SRC, 'services/projectSetupService.js')
const SERVER_PATH = path.join(vendorBackendRoot, 'server.js')

const read = (absPath: string) => fs.readFileSync(absPath, 'utf-8')

/** The five routes this AC adds, in the order they appear in the file. */
const NEW_READ_BACK_ROUTES = [
  { path: '/:id/media-area', fn: 'getProjectMediaAreaStatus' },
  { path: '/:id/room-access', fn: 'getProjectRoomAccessStatus' },
  { path: '/:id/milestones', fn: 'getProjectMilestones' },
  { path: '/:id/documents', fn: 'getProjectDocuments' },
  { path: '/:id/integration-status', fn: 'getProjectIntegrationStatus' },
]

/**
 * Every `router.<method>('<path>'` registration in the file, in source
 * order, as `{ method, routePath }` — a closed enumeration of the whole
 * route set, not a spot check for the five this AC adds.
 */
function extractRegisteredRoutes(source: string): Array<{ method: string; routePath: string }> {
  const pattern = /router\.(get|post|put|delete)\(\s*'([^']*)'/g
  const routes: Array<{ method: string; routePath: string }> = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source))) {
    routes.push({ method: match[1], routePath: match[2] })
  }
  return routes
}

/** The handler source for one `router.get('<routePath>'` registration, up to the next `router.` call. */
function handlerSourceFor(source: string, routePath: string): string {
  const marker = `router.get('${routePath}'`
  const start = source.indexOf(marker)
  expect(start).toBeGreaterThan(-1)
  const nextRouterCall = source.indexOf('router.', start + marker.length)
  const end = nextRouterCall > -1 ? nextRouterCall : source.indexOf('module.exports', start)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe('AC-41.1.2.3: the five read-back routes are registered on adminProjects.js', () => {
  const adminRouteSource = read(ADMIN_ROUTE_PATH)
  const adminAuthIdx = adminRouteSource.indexOf('router.use(adminAuth)')

  it('router.use(adminAuth) is present (the mount-wide gate every route, old and new, sits behind)', () => {
    expect(adminAuthIdx).toBeGreaterThan(-1)
  })

  it.each(NEW_READ_BACK_ROUTES)('GET $path is registered after router.use(adminAuth)', ({ path: routePath }) => {
    const idx = adminRouteSource.indexOf(`router.get('${routePath}'`)
    expect(idx).toBeGreaterThan(adminAuthIdx)
  })

  it.each(NEW_READ_BACK_ROUTES)('GET $path is gated on events.view — the same read permission this router\'s existing GETs use, no new permission', ({ path: routePath }) => {
    const handlerSource = handlerSourceFor(adminRouteSource, routePath)
    expect(handlerSource).toContain("requirePermission('events.view')")
    expect(handlerSource).not.toMatch(/requirePermission\('events\.manage'\)/)
  })

  it.each(NEW_READ_BACK_ROUTES)('GET $path validates :id with its own param(\'id\').isInt', ({ path: routePath }) => {
    const handlerSource = handlerSourceFor(adminRouteSource, routePath)
    expect(handlerSource).toMatch(/param\('id'\)\.isInt\(\{ min: 1 \}\)/)
    expect(handlerSource).toContain('validateRequest(req)')
  })

  it.each(NEW_READ_BACK_ROUTES)('GET $path delegates to projectSetupService.$fn — never a query of its own', ({ path: routePath, fn }) => {
    const handlerSource = handlerSourceFor(adminRouteSource, routePath)
    expect(handlerSource).toContain("require('../services/projectSetupService')")
    expect(handlerSource).toContain(`projectSetupService.${fn}(`)
    // No route-level query: no direct db(...) call and no other service's
    // table-touching function referenced in the handler body.
    expect(handlerSource).not.toMatch(/\bdb\(/)
  })

  it.each(NEW_READ_BACK_ROUTES)('GET $path 404s when the read-back function returns null (Project not found), and 200s otherwise', ({ path: routePath }) => {
    const handlerSource = handlerSourceFor(adminRouteSource, routePath)
    expect(handlerSource).toMatch(/if \(!(status|result)\) return res\.status\(404\)\.json\(\{ error: 'Project not found' \}\);/)
    expect(handlerSource).toMatch(/return successResponse\(res, (status|result)\);/)
  })
})

describe('AC-41.1.2.3: each read-back route\'s named function actually exists on projectSetupService and is exported', () => {
  const setupServiceSource = read(SETUP_SERVICE_PATH)

  it.each(NEW_READ_BACK_ROUTES)('$fn is a defined async function in projectSetupService.js', ({ fn }) => {
    expect(setupServiceSource).toMatch(new RegExp(`async function ${fn}\\(projectId\\) \\{`))
  })

  it('projectSetupService.js exports completeProjectSetup plus exactly these five read-back functions', () => {
    const exportsBlockStart = setupServiceSource.indexOf('module.exports = {')
    expect(exportsBlockStart).toBeGreaterThan(-1)
    const exportsBlock = setupServiceSource.slice(exportsBlockStart)
    expect(exportsBlock).toContain('completeProjectSetup')
    for (const { fn } of NEW_READ_BACK_ROUTES) {
      expect(exportsBlock).toContain(fn)
    }
  })

  // Item 4 is the one item with no table of its own, so its read-back is
  // the one that could invent an access rule the maps never recorded.
  // PROJECT_SETUP_MECHANISM_MAP.md's answer B resolves "Project Room
  // access record" to item 2's own objects — an active `customer_accounts`
  // login, or a `customer_invitations` row that has not yet been accepted
  // — and this read-back reads exactly those two and states nothing
  // further.
  it('getProjectRoomAccessStatus reads exactly the two objects the map\'s answer B names, and no third access rule', () => {
    const fnStart = setupServiceSource.indexOf('async function getProjectRoomAccessStatus(projectId) {')
    expect(fnStart).toBeGreaterThan(-1)
    const fnBody = setupServiceSource.slice(fnStart, setupServiceSource.indexOf('\n}', fnStart))
    expect(fnBody).toContain('CUSTOMER_ACCOUNTS_TABLE')
    expect(fnBody).toContain('CUSTOMER_INVITATIONS_TABLE')
    expect(fnBody).toContain("whereNull('accepted_at')")
    expect(fnBody).toContain('password_hash')
    const tablesRead = [...fnBody.matchAll(/db\((\w+)\)/g)].map((m) => m[1])
    expect(new Set(tablesRead)).toEqual(new Set(['CUSTOMER_ACCOUNTS_TABLE', 'CUSTOMER_INVITATIONS_TABLE']))
  })

  it('the map\'s answer B really does define access as those two objects — read from the map, not assumed', () => {
    const map = read(path.join(root, 'PROJECT_SETUP_MECHANISM_MAP.md'))
    const answerB = map.slice(map.indexOf('### B. What a "Project Room access record" actually IS'))
    const section = answerB.slice(0, answerB.indexOf('### C.')).replace(/\s+/g, ' ')
    expect(section).toContain('password_hash')
    expect(section).toContain('customer_invitations')
    expect(section).toContain('has not yet been accepted')
  })

  it.each(NEW_READ_BACK_ROUTES)('$fn returns null when the Project itself does not exist, so the route can 404 without a query of its own', ({ fn }) => {
    const fnStart = setupServiceSource.indexOf(`async function ${fn}(projectId) {`)
    expect(fnStart).toBeGreaterThan(-1)
    const fnBody = setupServiceSource.slice(fnStart, setupServiceSource.indexOf('\n}', fnStart))
    expect(fnBody).toMatch(/if \(!project\) return null;/)
  })
})

describe('AC-41.1.2.3: the router\'s whole route set is exactly the twelve the map recorded plus these five — a closed enumeration', () => {
  const adminRouteSource = read(ADMIN_ROUTE_PATH)
  const registered = extractRegisteredRoutes(adminRouteSource)

  // PROJECT_SETUP_MECHANISM_MAP.md's (AC-41.1.1) question 12 table, in
  // file order, as it stood before this AC.
  const MAP_RECORDED_TWELVE = [
    { method: 'get', routePath: '/' },
    { method: 'post', routePath: '/' },
    { method: 'get', routePath: '/:id' },
    { method: 'put', routePath: '/:id' },
    { method: 'post', routePath: '/:id/events' },
    { method: 'get', routePath: '/:id/overview' },
    { method: 'get', routePath: '/email/:emailId/preview' },
    { method: 'get', routePath: '/:id/next-action' },
    { method: 'put', routePath: '/:id/next-action/override' },
    { method: 'put', routePath: '/:id/phase' },
    { method: 'put', routePath: '/:id/milestones/:key/complete' },
    { method: 'get', routePath: '/:id/timeline' },
  ]

  const EXPECTED_SEVENTEEN = [
    ...MAP_RECORDED_TWELVE,
    ...NEW_READ_BACK_ROUTES.map(({ path: routePath }) => ({ method: 'get', routePath })),
  ]

  it('the map\'s own answer-12 table names exactly twelve routes', () => {
    expect(MAP_RECORDED_TWELVE).toHaveLength(12)
  })

  it('the file registers exactly these seventeen routes, no more, no fewer', () => {
    expect(registered).toEqual(EXPECTED_SEVENTEEN)
  })

  it('adds exactly five GETs relative to the map\'s twelve — no write route, no route the map did not call for', () => {
    expect(registered).toHaveLength(MAP_RECORDED_TWELVE.length + 5)
    const added = registered.slice(MAP_RECORDED_TWELVE.length)
    expect(added.every((r) => r.method === 'get')).toBe(true)
  })
})

describe('AC-41.1.2.3: mount path and gate read from source, never assumed', () => {
  it('server.js really does mount adminProjects.js at /api/admin/projects', () => {
    const serverSource = read(SERVER_PATH)
    expect(serverSource).toMatch(
      /app\.use\('\/api\/admin\/projects',\s*require\('\.\/src\/routes\/adminProjects'\)\)/,
    )
  })

  it('no customer-side route is added for any of the five items — customer.js is untouched by this AC', () => {
    const customerRouteSource = read(path.join(BACKEND_SRC, 'routes/customer.js'))
    for (const { path: routePath } of NEW_READ_BACK_ROUTES) {
      expect(customerRouteSource).not.toContain(routePath)
    }
  })

  it('no new permission is introduced — every new route uses the existing events.view constant', () => {
    const adminRouteSource = read(ADMIN_ROUTE_PATH)
    const permissionsUsed = new Set(
      [...adminRouteSource.matchAll(/requirePermission\('([^']+)'\)/g)].map((m) => m[1]),
    )
    expect(permissionsUsed).toEqual(new Set(['events.manage', 'events.view']))
  })
})
