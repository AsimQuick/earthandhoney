/**
 * Public v1 API — studio notification emails, queued through the existing
 * Backstage email queue (US-33 AC-33.5.2.2.2).
 *
 * Mounted under /api/v1 alongside events.js — a second router on the same
 * base path rather than folding into events.js, since "queue a studio
 * notification email" has nothing to do with gallery events. Auth mirrors
 * events.js exactly: apiTokenAuth + requireApiScope, the fork's own
 * sanctioned service-to-service pattern (PAYLOAD_PICPEAK_API_CONTRACT.md's
 * call catalog row 3) rather than the admin-cookie routes.
 *
 * Delegates entirely to the existing `queueEmail()` (emailProcessor.js) —
 * the same function `adminEvents.js`'s gallery_created path and CRM
 * split-payment invoices already use. No new sending logic is written here;
 * this route is only a new authenticated entry point onto it. `event_id` is
 * passed as `null`: an inquiry is not a gallery event, and `email_queue`'s
 * `event_id` column is nullable (see `../../database/db.js`). The route
 * accepts data fields only — it renders no subject or body itself, and
 * nothing is sent by this route; queueing only inserts a `pending` row for
 * the existing 60-second background processor (`startEmailQueueProcessor`,
 * server.js) to pick up.
 *
 * `template_key` is fixed at `inquiry_received` — the row
 * `120_add_inquiry_notification_email_template.js` (US-33 AC-33.5.2.1)
 * inserts — not caller-supplied, so this route cannot be used to queue an
 * email against an arbitrary/nonexistent template.
 *
 * A second route, `POST /notifications/inquiry-acknowledgement` (US-33
 * AC-33.6), follows the exact same shape for the optional branded
 * acknowledgement sent to the person who submitted the form: same auth
 * pair, same delegation to `queueEmail()` with `event_id: null`, same
 * fixed (never caller-supplied) `template_key` — this time
 * `inquiry_acknowledgement`, the row
 * `121_add_inquiry_acknowledgement_email_template.js` (US-33 AC-33.6)
 * inserts. Living beside the studio-notification route in this same file
 * keeps every inquiry-triggered email queued through one router, and
 * therefore through the same single Backstage email queue — never a
 * second sending system (CLAUDE.md's email pragmatic-default note: exactly
 * one system sends any given email type). Whether an acknowledgement is
 * sent at all for a given submission is decided by the caller (Frontstage)
 * BEFORE this route is ever called — off by default — so an unreachable
 * route or an unset caller-side toggle both fail exactly the same way: no
 * request, and therefore nothing queued.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { queueEmail } = require('../../services/emailProcessor');
const logger = require('../../utils/logger');
const { apiTokenAuth, requireApiScope } = require('../../middleware/apiTokenAuth');

const router = express.Router();

const TEMPLATE_KEY = 'inquiry_received';
const ACKNOWLEDGEMENT_TEMPLATE_KEY = 'inquiry_acknowledgement';

/**
 * @openapi
 * /notifications/inquiry:
 *   post:
 *     tags: [Notifications]
 *     summary: Queue a studio notification email for a Frontstage form inquiry
 *     description: >
 *       Inserts a pending row into the existing email_queue
 *       (template_key 'inquiry_received', migration
 *       120_add_inquiry_notification_email_template.js) for the ordinary
 *       60-second background processor to send. No event_id — an inquiry
 *       is not a gallery event.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipient_email, form_title, source_page, submission_summary]
 *             properties:
 *               recipient_email: { type: string, format: email }
 *               form_title: { type: string }
 *               source_page: { type: string }
 *               submitted_at: { type: string, format: date-time, nullable: true }
 *               submission_summary: { type: string }
 *     responses:
 *       201: { description: Queued }
 *       400: { description: Validation error }
 *       401: { description: Missing/invalid token }
 *       403: { description: Token lacks write scope }
 */
router.post(
  '/notifications/inquiry',
  apiTokenAuth,
  requireApiScope('write'),
  [
    body('recipient_email').isEmail(),
    body('form_title').isString().trim().notEmpty(),
    body('source_page').isString().trim().notEmpty(),
    body('submission_summary').isString().trim().notEmpty(),
    body('submitted_at').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { recipient_email, form_title, source_page, submission_summary, submitted_at } = req.body;

      await queueEmail(null, recipient_email, TEMPLATE_KEY, {
        form_title,
        source_page,
        submission_summary,
        submitted_at: submitted_at || new Date().toISOString(),
      });

      res.status(201).json({ status: 'queued', email_type: TEMPLATE_KEY });
    } catch (error) {
      logger.error('v1 POST /notifications/inquiry failed', { error: error.message });
      res.status(500).json({ error: 'Failed to queue inquiry notification' });
    }
  }
);

/**
 * @openapi
 * /notifications/inquiry-acknowledgement:
 *   post:
 *     tags: [Notifications]
 *     summary: Queue a branded acknowledgement email to a Frontstage form submitter
 *     description: >
 *       Inserts a pending row into the existing email_queue
 *       (template_key 'inquiry_acknowledgement', migration
 *       121_add_inquiry_acknowledgement_email_template.js) for the ordinary
 *       60-second background processor to send. No event_id — an inquiry
 *       is not a gallery event. The caller decides whether to call this
 *       route at all (US-33 AC-33.6's off-by-default toggle); this route
 *       itself queues unconditionally whenever it is called.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipient_email, form_title]
 *             properties:
 *               recipient_email: { type: string, format: email }
 *               form_title: { type: string }
 *               submitted_at: { type: string, format: date-time, nullable: true }
 *     responses:
 *       201: { description: Queued }
 *       400: { description: Validation error }
 *       401: { description: Missing/invalid token }
 *       403: { description: Token lacks write scope }
 */
router.post(
  '/notifications/inquiry-acknowledgement',
  apiTokenAuth,
  requireApiScope('write'),
  [
    body('recipient_email').isEmail(),
    body('form_title').isString().trim().notEmpty(),
    body('submitted_at').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { recipient_email, form_title, submitted_at } = req.body;

      await queueEmail(null, recipient_email, ACKNOWLEDGEMENT_TEMPLATE_KEY, {
        form_title,
        submitted_at: submitted_at || new Date().toISOString(),
      });

      res.status(201).json({ status: 'queued', email_type: ACKNOWLEDGEMENT_TEMPLATE_KEY });
    } catch (error) {
      logger.error('v1 POST /notifications/inquiry-acknowledgement failed', { error: error.message });
      res.status(500).json({ error: 'Failed to queue inquiry acknowledgement' });
    }
  }
);

module.exports = router;
