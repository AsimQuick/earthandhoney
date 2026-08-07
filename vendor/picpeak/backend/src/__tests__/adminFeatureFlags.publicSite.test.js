/**
 * Unit tests for US-27 AC-27.1 — the `publicSite` feature flag.
 *
 * Pins that `publicSite` was added to KNOWN_FLAGS/DEFAULT_FLAGS in
 * backend/src/routes/adminFeatureFlags.js mirroring the existing
 * `quotes`/`bills` default-false pattern exactly: GET returns it as
 * `false` when no DB row exists, and PUT accepts it as a known key
 * (rather than rejecting with "Unknown feature flag").
 */

jest.mock('../middleware/auth', () => ({
  adminAuth: (req, res, next) => {
    req.admin = { id: 1, username: 'tester' };
    next();
  },
}));

jest.mock('../middleware/permissions', () => ({
  requirePermission: () => (req, res, next) => next(),
}));

jest.mock('../database/db', () => {
  const mockDb = jest.fn();
  return { db: mockDb, logActivity: jest.fn() };
});

jest.mock('../utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const { db } = require('../database/db');
const router = require('../routes/adminFeatureFlags');

const app = express();
app.use(express.json());
app.use('/api/admin/feature-flags', router);

describe('publicSite feature flag (US-27 AC-27.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults publicSite to false, mirroring quotes/bills, when no DB row exists', async () => {
    db.mockImplementationOnce(() => ({ select: () => Promise.resolve([]) }));

    const res = await request(app).get('/api/admin/feature-flags').expect(200);

    expect(res.body.publicSite).toBe(false);
    expect(res.body.quotes).toBe(false);
    expect(res.body.bills).toBe(false);
  });

  it('returns publicSite=true when a DB row sets it, same as any other known flag', async () => {
    db.mockImplementationOnce(() => ({
      select: () => Promise.resolve([{ key: 'publicSite', value: true }]),
    }));

    const res = await request(app).get('/api/admin/feature-flags').expect(200);

    expect(res.body.publicSite).toBe(true);
  });

  it('accepts publicSite as a known key on PUT instead of rejecting it', async () => {
    db.mockImplementationOnce(() => ({ select: () => Promise.resolve([]) })); // readAllFlags (before)

    const trx = jest.fn((table) => {
      if (table === 'feature_flags') {
        return {
          where: () => ({ first: () => Promise.resolve(null) }),
          insert: jest.fn().mockResolvedValue(undefined),
        };
      }
      throw new Error(`unexpected trx table ${table}`);
    });
    db.transaction = jest.fn(async (cb) => cb(trx));

    const res = await request(app)
      .put('/api/admin/feature-flags')
      .send({ publicSite: true })
      .expect(200);

    expect(res.body.publicSite).toBe(true);
  });
});
