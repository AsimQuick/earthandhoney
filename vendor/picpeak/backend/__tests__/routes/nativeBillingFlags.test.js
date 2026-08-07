/**
 * US-27 AC-27.3 — the native quote / invoice / tax-report subsystem is
 * confirmed off by default rather than assumed off.
 *
 * The Ledger Rule (CLAUDE.md) puts quote/invoice/tax records in headless
 * Invoice Ninja; PicPeak's own quote/invoice/tax-report surface is a
 * second, unauthoritative ledger and PRD §35.1 requires there be none
 * reachable. Two things are pinned here on a FRESH install (no admin has
 * ever touched Settings → Features, so `feature_flags` holds whatever
 * migrations 088/107 seeded):
 *
 *   1. The `quotes` and `bills` flags read `false` — not merely by
 *      convention in adminFeatureFlags.js's DEFAULT_FLAGS map, but as
 *      the actual seeded DB state a real install boots with.
 *   2. At least one flag-gated route per flag returns 403 with the flag
 *      off, even for a super-admin — proving the gate lives in the
 *      route layer (defence in depth) and isn't merely a permissions
 *      check that a privileged account could route around.
 *
 * adminBusinessProfile.js is deliberately NOT asserted here: its own
 * docstring and server.js's mount-point comment both record that it is
 * gated by the general `settings.edit`/`settings.view` permissions
 * rather than the `bills` flag — it holds company-profile fields (admin
 * calendar timezone, business hours, the scheduled-email floor switch)
 * that are unrelated to billing and must stay editable regardless of
 * whether the native Bills surface is enabled. Folding it behind `bills`
 * would be a regression, not a fix.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'picpeak-nativebilling-test-'));
process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_PATH = path.join(tmpDir, 'db.sqlite');
process.env.STORAGE_PATH = path.join(tmpDir, 'storage');
fs.mkdirSync(process.env.STORAGE_PATH, { recursive: true });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'crm-route-test-secret';

const request = require('supertest');
const {
  bootCrmDb, seedMinimal, assignAdminRole, mintAdminToken, buildRouteApp,
} = require('../integration/helpers/crmDb');

describe('native quote/invoice/tax-report subsystem — off by default (US-27 AC-27.3)', () => {
  let db;
  let cleanup;
  let adminId;
  let superAdminToken;

  beforeAll(async () => {
    ({ db, cleanup } = await bootCrmDb());
    ({ adminId } = await seedMinimal(db));
    await assignAdminRole(db, adminId, 'super_admin');
    superAdminToken = mintAdminToken(adminId);
    // Deliberately no `feature_flags` writes here — the point of this
    // suite is the state a fresh install actually boots with.
  }, 60000);

  afterAll(async () => {
    if (cleanup) await cleanup();
  });

  describe('defaults', () => {
    it('seeds quotes=false and bills=false in feature_flags on a fresh install', async () => {
      const rows = await db('feature_flags').whereIn('key', ['quotes', 'bills']).select('key', 'value');
      const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
      expect(Boolean(byKey.quotes)).toBe(false);
      expect(Boolean(byKey.bills)).toBe(false);
    });

    it('GET /api/admin/feature-flags reports quotes=false and bills=false', async () => {
      const app = buildRouteApp('/api/admin/feature-flags', require('../../src/routes/adminFeatureFlags'));
      const res = await request(app)
        .get('/api/admin/feature-flags')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.quotes).toBe(false);
      expect(res.body.bills).toBe(false);
    });
  });

  describe('quotes flag — at least one gated route returns 403 off', () => {
    it('GET /api/admin/quotes/ returns 403 QUOTES_DISABLED for a super-admin when quotes is off', async () => {
      const app = buildRouteApp('/api/admin/quotes', require('../../src/routes/adminQuotes'));
      const res = await request(app)
        .get('/api/admin/quotes/')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('QUOTES_DISABLED');
    });
  });

  describe('bills flag — at least one gated route returns 403 off', () => {
    it('GET /api/admin/invoices/ returns 403 BILLS_DISABLED for a super-admin when bills is off', async () => {
      const app = buildRouteApp('/api/admin/invoices', require('../../src/routes/adminInvoices'));
      const res = await request(app)
        .get('/api/admin/invoices/')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('BILLS_DISABLED');
    });

    it('GET /api/admin/tax-report/ returns 403 BILLS_DISABLED for a super-admin when bills is off', async () => {
      const app = buildRouteApp('/api/admin/tax-report', require('../../src/routes/adminTaxReport'));
      const res = await request(app)
        .get('/api/admin/tax-report/?from=2026-01-01&to=2026-12-31&currency=CHF')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('BILLS_DISABLED');
    });
  });
});
