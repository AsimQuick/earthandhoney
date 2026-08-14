/**
 * Unit tests for POST /v1/notifications/inquiry-acknowledgement (US-33 AC-33.6).
 *
 * Sibling of notifications.inquiry.test.js, same shape: this route is a
 * thin, validated, scope-gated entry point onto the existing
 * `queueEmail()` — never new sending logic. Three things are pinned:
 *   1. A valid request queues exactly `queueEmail(null, recipient_email,
 *      'inquiry_acknowledgement', <data fields>)` — event_id null and the
 *      template_key fixed, not caller-supplied.
 *   2. Missing/invalid required fields 400 before queueEmail is ever
 *      called.
 *   3. The route is wired with `requireApiScope('write')`, not merely
 *      `apiTokenAuth` alone — a read-only-scoped token 403s, using the
 *      REAL requireApiScope.
 *
 * Run offline with the fork's own local node_modules (no Docker, no live
 * HTTP call — db and queueEmail are both mocked): `npx jest
 * notifications.inquiryAcknowledgement.test.js` from
 * vendor/picpeak/backend.
 */

const request = require('supertest');
const express = require('express');

jest.mock('../../../database/db', () => ({
  db: jest.fn(),
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../services/emailProcessor', () => ({
  queueEmail: jest.fn().mockResolvedValue(undefined),
}));

let mockInjectedScopes = ['write'];
jest.mock('../../../middleware/apiTokenAuth', () => {
  const actual = jest.requireActual('../../../middleware/apiTokenAuth');
  return {
    ...actual,
    apiTokenAuth: (req, _res, next) => {
      req.apiToken = { id: 1, admin_id: 1, scopes: mockInjectedScopes };
      req.admin = { id: 1, username: 'token-admin' };
      next();
    },
  };
});

const { queueEmail } = require('../../../services/emailProcessor');
const notificationsRouter = require('../notifications');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/', notificationsRouter);
  return app;
};

const VALID_BODY = {
  recipient_email: 'submitter@example.test',
  form_title: 'Wedding Inquiry',
};

describe('v1 POST /notifications/inquiry-acknowledgement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInjectedScopes = ['write'];
  });

  it('queues inquiry_acknowledgement with event_id null and the submitted data fields', async () => {
    const response = await request(buildApp())
      .post('/notifications/inquiry-acknowledgement')
      .send({ ...VALID_BODY, submitted_at: '2026-08-14T12:00:00.000Z' })
      .expect(201);

    expect(response.body).toEqual({ status: 'queued', email_type: 'inquiry_acknowledgement' });
    expect(queueEmail).toHaveBeenCalledTimes(1);
    expect(queueEmail).toHaveBeenCalledWith(
      null,
      'submitter@example.test',
      'inquiry_acknowledgement',
      {
        form_title: 'Wedding Inquiry',
        submitted_at: '2026-08-14T12:00:00.000Z',
      }
    );
  });

  it('defaults submitted_at to now when omitted', async () => {
    await request(buildApp())
      .post('/notifications/inquiry-acknowledgement')
      .send(VALID_BODY)
      .expect(201);

    const emailData = queueEmail.mock.calls[0][3];
    expect(emailData.submitted_at).toEqual(expect.any(String));
    expect(() => new Date(emailData.submitted_at).toISOString()).not.toThrow();
  });

  it.each([
    ['recipient_email', { ...VALID_BODY, recipient_email: 'not-an-email' }],
    ['form_title', { ...VALID_BODY, form_title: '' }],
  ])('400s and never queues when %s is invalid', async (_field, body) => {
    await request(buildApp())
      .post('/notifications/inquiry-acknowledgement')
      .send(body)
      .expect(400);

    expect(queueEmail).not.toHaveBeenCalled();
  });

  it('403s a read-only-scoped token via the real requireApiScope', async () => {
    mockInjectedScopes = ['read'];

    const response = await request(buildApp())
      .post('/notifications/inquiry-acknowledgement')
      .send(VALID_BODY)
      .expect(403);

    expect(response.body).toMatchObject({ code: 'INSUFFICIENT_SCOPE', required: 'write' });
    expect(queueEmail).not.toHaveBeenCalled();
  });

  it('accepts an admin-scoped token (admin implies write)', async () => {
    mockInjectedScopes = ['admin'];

    await request(buildApp())
      .post('/notifications/inquiry-acknowledgement')
      .send(VALID_BODY)
      .expect(201);

    expect(queueEmail).toHaveBeenCalledTimes(1);
  });

  it('500s when queueEmail throws, without leaking the error to the response', async () => {
    queueEmail.mockRejectedValueOnce(new Error('db unavailable'));

    const response = await request(buildApp())
      .post('/notifications/inquiry-acknowledgement')
      .send(VALID_BODY)
      .expect(500);

    expect(response.body).toEqual({ error: 'Failed to queue inquiry acknowledgement' });
  });
});
