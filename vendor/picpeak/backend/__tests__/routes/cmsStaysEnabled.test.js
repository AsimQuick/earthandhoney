/**
 * US-27 AC-27.4 — the static "CMS Pages" surface (impressum / privacy /
 * terms, adminCMS.js + publicCMS.js) stays ENABLED, and this suite proves
 * it is *not* disabled.
 *
 * AC-18.5 recorded scoping CMS Pages out of the disable list as a
 * deliberate decision: legal/footer copy (impressum, datenschutz, the
 * customisable error pages) is not among the content types Payload owns,
 * so a native editor for it duplicates nothing. AC-27.1/27.3 added
 * feature-flag gates (`publicSite`, `quotes`, `bills`) to the surfaces
 * that DO duplicate Payload/Invoice Ninja; CMS Pages must not be swept up
 * in the same pattern by a future cleanup that doesn't know about the
 * scoping decision. This suite pins the opposite of nativeBillingFlags's
 * 403-when-off assertions:
 *
 *   1. No `cms` key exists in KNOWN_FLAGS/DEFAULT_FLAGS (adminFeatureFlags.js)
 *      — there is nothing to disable it with.
 *   2. adminCMS.js and publicCMS.js contain no feature-flag gate of any
 *      kind (no requireFeatureFlag/requireQuotesFlag/requireBillsFlag-style
 *      middleware) — only adminCMS.js's existing RBAC permission checks.
 *   3. On a fresh install (no admin has ever touched Settings → Features),
 *      GET /api/admin/cms/pages and GET /api/public/pages/impressum both
 *      succeed (200), proving the surface is actually reachable end to
 *      end — not merely undocumented as disabled.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'picpeak-cms-enabled-test-'));
process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_PATH = path.join(tmpDir, 'db.sqlite');
process.env.STORAGE_PATH = path.join(tmpDir, 'storage');
fs.mkdirSync(process.env.STORAGE_PATH, { recursive: true });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'crm-route-test-secret';

const request = require('supertest');
const {
  bootCrmDb, seedMinimal, assignAdminRole, mintAdminToken, buildRouteApp,
} = require('../integration/helpers/crmDb');

const root = path.resolve(__dirname, '..', '..', '..', '..', '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('CMS Pages surface stays enabled — static source assertions (US-27 AC-27.4)', () => {
  it('adminFeatureFlags.js has no `cms` entry in KNOWN_FLAGS or DEFAULT_FLAGS', () => {
    const flags = read('vendor/picpeak/backend/src/routes/adminFeatureFlags.js');
    const knownFlagsMatch = flags.match(/const KNOWN_FLAGS = \[([\s\S]*?)\];/);
    expect(knownFlagsMatch).toBeTruthy();
    expect(knownFlagsMatch[1]).not.toMatch(/'cms'/);

    const defaultFlagsMatch = flags.match(/const DEFAULT_FLAGS = \{([\s\S]*?)\};/);
    expect(defaultFlagsMatch).toBeTruthy();
    expect(defaultFlagsMatch[1]).not.toMatch(/\bcms:/);
  });

  it('adminCMS.js is gated only by RBAC permissions, not a feature flag', () => {
    const adminCMS = read('vendor/picpeak/backend/src/routes/adminCMS.js');
    expect(adminCMS).toMatch(/requirePermission\('cms\.view'\)/);
    expect(adminCMS).toMatch(/requirePermission\('cms\.edit'\)/);
    expect(adminCMS).not.toMatch(/requireFeatureFlag|requireQuotesFlag|requireBillsFlag|requirePublicSiteFlag/);
    expect(adminCMS).not.toMatch(/router\.use\(require[A-Za-z]*Flag\)/);
  });

  it('publicCMS.js has no auth guard and no feature-flag gate at all', () => {
    const publicCMS = read('vendor/picpeak/backend/src/routes/publicCMS.js');
    expect(publicCMS).not.toMatch(/adminAuth|requirePermission|requireFeatureFlag|requireQuotesFlag|requireBillsFlag/);
  });

  it("admin.js mounts adminCMS.js at '/cms' with no flag middleware in between", () => {
    const admin = read('vendor/picpeak/backend/src/routes/admin.js');
    expect(admin).toMatch(/router\.use\('\/cms',\s*cmsRoutes\)/);
  });
});

describe('CMS Pages surface stays enabled — live routes on a fresh install (US-27 AC-27.4)', () => {
  let db;
  let cleanup;
  let adminId;
  let superAdminToken;

  beforeAll(async () => {
    ({ db, cleanup } = await bootCrmDb());
    ({ adminId } = await seedMinimal(db));
    await assignAdminRole(db, adminId, 'super_admin');
    superAdminToken = mintAdminToken(adminId);
    // Deliberately no `feature_flags` writes and no `cms` key inserted —
    // this is the state a fresh install actually boots with.

    // initializeDatabase() (invoked by 001_init's core migration) seeds
    // the cms_pages table itself; the test-only migration runner used by
    // bootCrmDb replays migrations/core/*.js directly, so seed a page
    // defensively in case that seeding step isn't reached in this path.
    const existing = await db('cms_pages').where('slug', 'impressum').first();
    if (!existing) {
      await db('cms_pages').insert({
        slug: 'impressum',
        title_en: 'Legal Notice',
        title_de: 'Impressum',
        content_en: '<h2>Legal Notice</h2>',
        content_de: '<h2>Impressum</h2>',
        updated_at: new Date(),
      });
    }
  }, 60000);

  afterAll(async () => {
    if (cleanup) await cleanup();
  });

  it('GET /api/admin/cms/pages returns 200 for a super-admin with no feature flags set', async () => {
    const app = buildRouteApp('/api/admin/cms', require('../../src/routes/adminCMS'));
    const res = await request(app)
      .get('/api/admin/cms/pages')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((p) => p.slug === 'impressum')).toBe(true);
  });

  it('GET /api/public/pages/impressum returns 200 unauthenticated, with no feature flags set', async () => {
    const app = buildRouteApp('/api/public', require('../../src/routes/publicCMS'));
    const res = await request(app).get('/api/public/pages/impressum');

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('impressum');
  });
});
