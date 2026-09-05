/**
 * ---
 * file: src/__tests__/us41-ac41.2.2-gallery-client-assignment-shape.test.ts
 * project: earthandhoney
 * purpose: Verify AC-41.2.2 — with GALLERY_CLIENT_ASSIGNMENT_MAP.md
 *          (AC-41.2.1) in place, one assignment path explicitly assigns
 *          the operational Client to a Gallery (upstream finding F1),
 *          using the exact request shape the map's answer 4 recorded to
 *          avoid F2's 500 by construction, asserting the map's answer 5
 *          feature-flag precondition explicitly rather than inheriting a
 *          silent 200, and going through the map's answer 6 mechanism —
 *          never a direct insert of its own. Entirely UNIT lane, no
 *          Docker, no running stack:
 *
 *          1. `galleryClientAssignmentRules.js` — the pure request-body
 *             shape, driven directly with no requires and no database:
 *             always exactly `{customer_account_ids, event_name}`, never
 *             the bare `customer_account_ids`-only shape F2 records.
 *          2. Structural assertions on `galleryClientAssignmentService.js`
 *             (never `require()`-d directly here — it requires
 *             `../database/db`, like every other DB-backed service in
 *             this fork): it asserts the `customerPortal` flag explicitly
 *             and throws rather than proceeding when it is off, builds its
 *             request body through the one pure rules module rather than
 *             ad hoc, calls `customerAccountsService.setAssignmentsForEvent`
 *             (the map's answer 6 mechanism), and never references the
 *             `event_customer_assignments` table name itself (no direct
 *             insert of its own).
 *          3. A whole-backend scan proving `setAssignmentsForEvent` gains
 *             exactly one NEW call site anywhere under
 *             `vendor/picpeak/backend/src` — this module — leaving the
 *             pre-existing `adminEvents.js` and vendored
 *             `customerAccountsService.test.js` callers untouched.
 *          4. A guard that neither new file introduces a route, a
 *             permission check, or an Express mount of any kind — no new
 *             route, no new permission, no new mount, no client-facing
 *             surface, per this AC's scope.
 * created-by: dev-team
 * related-story: US-41
 * related-ac: 41.2.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const vendorBackendRoot = path.join(root, 'vendor', 'picpeak', 'backend')
const BACKEND_SRC = path.join(vendorBackendRoot, 'src')
const RULES_PATH = path.join(BACKEND_SRC, 'services/galleryClientAssignmentRules.js')
const SERVICE_PATH = path.join(BACKEND_SRC, 'services/galleryClientAssignmentService.js')
const CUSTOMER_ACCOUNTS_SERVICE_PATH = path.join(BACKEND_SRC, 'services/customerAccountsService.js')
const ADMIN_EVENTS_PATH = path.join(BACKEND_SRC, 'routes/adminEvents.js')
const CUSTOMER_ACCOUNTS_SERVICE_TEST_PATH = path.join(BACKEND_SRC, '__tests__/customerAccountsService.test.js')

const read = (absPath: string) => fs.readFileSync(absPath, 'utf-8')

/**
 * Source with its comments stripped, so a header's own prose (which must
 * name `event_customer_assignments` to explain what it deliberately does
 * NOT touch) can neither satisfy nor break a check that only real code
 * should decide — the same technique
 * `us41-ac41.1.2.1-project-setup-single-path.test.ts` established for its
 * `fs.mkdir` guard.
 */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rules = require(RULES_PATH) as {
  buildGalleryClientAssignmentRequestBody: (
    customerAccountId: number,
    currentEventName: string,
  ) => { customer_account_ids: number[]; event_name: string }
}

describe('AC-41.2.2: galleryClientAssignmentRules.js — the request shape, driven directly', () => {
  it("pairs customer_account_ids with event_name — the map's answer 4 field set, exactly", () => {
    const body = rules.buildGalleryClientAssignmentRequestBody(5, 'Smith Wedding')
    expect(body).toEqual({ customer_account_ids: [5], event_name: 'Smith Wedding' })
  })

  it('carries exactly two keys — no field beyond the map-named set', () => {
    const body = rules.buildGalleryClientAssignmentRequestBody(9, 'Jones Engagement')
    expect(Object.keys(body).sort()).toEqual(['customer_account_ids', 'event_name'])
  })

  it("never produces F2's bare customer_account_ids-only shape, for any input", () => {
    for (const [id, name] of [[1, 'a'], [42, ''], [999, 'Very Long Event Name Indeed']] as const) {
      const body = rules.buildGalleryClientAssignmentRequestBody(id, name)
      expect(body).not.toEqual({ customer_account_ids: [id] })
      expect(Object.keys(body)).toHaveLength(2)
    }
  })

  it('wraps the customer account id in an array, matching the PUT route\'s own validator shape', () => {
    expect(rules.buildGalleryClientAssignmentRequestBody(7, 'x').customer_account_ids).toEqual([7])
  })

  it('requires nothing — no require() of any kind, so it is unit-testable without Docker', () => {
    expect(read(RULES_PATH)).not.toMatch(/require\(/)
  })
})

describe('AC-41.2.2: galleryClientAssignmentService.js is structurally correct (not require()-d directly — it requires ../database/db)', () => {
  const src = read(SERVICE_PATH)

  it('requires the live database module, matching every other DB-backed service in this fork', () => {
    expect(src).toContain("require('../database/db')")
  })

  it('exports exactly assignClientToGallery', () => {
    expect(src).toMatch(/module\.exports = \{\s*assignClientToGallery,?\s*\}/)
  })

  it("asserts the map's answer 5 customerPortal precondition explicitly and throws rather than proceeding when it is off", () => {
    expect(src).toContain("require('./customerAccountsService')")
    expect(src).toContain('customerAccountsService.isCustomerPortalEnabled()')
    expect(src).toMatch(/if \(!portalEnabled\)\s*{\s*throw new AppError\(/)
  })

  it('builds its request body through the one pure rules module, never ad hoc', () => {
    expect(src).toContain("require('./galleryClientAssignmentRules')")
    expect(src).toContain('buildGalleryClientAssignmentRequestBody(')
  })

  it("goes through the map's answer 6 mechanism — customerAccountsService.setAssignmentsForEvent — passing the built request body's own field, never a raw scalar", () => {
    expect(src).toContain('customerAccountsService.setAssignmentsForEvent(')
    expect(src).toContain('requestBody.customer_account_ids')
  })

  it('never references the event_customer_assignments table name in real code — no direct insert of its own', () => {
    expect(code(src)).not.toContain('event_customer_assignments')
  })

  it('never calls req.body — this is a service, not a route; the caller supplies plain arguments only', () => {
    expect(src).not.toMatch(/req\.body/)
  })

  it('looks up the event to 404 cleanly, and to supply the no-op event_name the shape requires', () => {
    expect(src).toContain("require('../utils/errors')")
    expect(src).toContain('NotFoundError')
    expect(src).toMatch(/db\('events'\)\.where\(\{\s*id:\s*eventId\s*\}\)\.first\(\)/)
  })
})

describe('AC-41.2.2: setAssignmentsForEvent gains exactly one NEW call site under vendor/picpeak/backend/src', () => {
  function discoverJsFiles(dir: string, acc: string[] = []): string[] {
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, dirent.name)
      if (dirent.isDirectory()) discoverJsFiles(full, acc)
      else if (dirent.isFile() && dirent.name.endsWith('.js')) acc.push(full)
    }
    return acc
  }

  it('the only file calling setAssignmentsForEvent that predates this AC\'s galleryClientAssignmentService.js is adminEvents.js plus the pre-existing vendored unit test', () => {
    const callers = discoverJsFiles(BACKEND_SRC)
      .filter((file) => file !== CUSTOMER_ACCOUNTS_SERVICE_PATH) // the definition itself, not a call
      .filter((file) => /setAssignmentsForEvent\(/.test(read(file)))
      .sort()
    expect(callers).toEqual(
      [ADMIN_EVENTS_PATH, CUSTOMER_ACCOUNTS_SERVICE_TEST_PATH, SERVICE_PATH].sort(),
    )
  })

  it("galleryClientAssignmentService.js is the one NEW caller — the other two already called it before this AC", () => {
    const preExisting = [ADMIN_EVENTS_PATH, CUSTOMER_ACCOUNTS_SERVICE_TEST_PATH]
    for (const file of preExisting) {
      expect(fs.existsSync(file)).toBe(true)
      expect(read(file)).toMatch(/setAssignmentsForEvent\(/)
    }
    expect(read(SERVICE_PATH)).toContain('customerAccountsService.setAssignmentsForEvent(')
  })
})

describe('AC-41.2.2: no new route, no new permission, no new mount, no client-facing surface', () => {
  it('neither new file registers an Express route or requires the router/permissions middleware', () => {
    for (const filePath of [RULES_PATH, SERVICE_PATH]) {
      const src = read(filePath)
      expect(src).not.toMatch(/router\.(get|post|put|delete|patch)\(/)
      expect(src).not.toContain("require('express')")
      expect(src).not.toContain("require('../middleware/permissions')")
      expect(src).not.toContain('requirePermission(')
    }
  })

  it('server.js gains no new app.use mount for this AC', () => {
    const serverSrc = read(path.join(vendorBackendRoot, 'server.js'))
    expect(serverSrc).not.toContain('galleryClientAssignment')
  })

  it('neither new file touches a customer-facing route file', () => {
    const customerRoutePath = path.join(BACKEND_SRC, 'routes/customer.js')
    const customerRouteSrc = read(customerRoutePath)
    expect(customerRouteSrc).not.toContain('galleryClientAssignment')
  })
})
