/**
 * Public v1 API — studio notification emails, queued through the existing
 * Backstage email queue (US-33 AC-33.5).
 *
 * Mounted under /api/v1 alongside events.js — a second router on the same
 * base path rather than folding into events.js, since "queue a studio
 * notification email" has nothing to do with gallery events. Auth mirrors
 * events.js exactly: apiTokenAuth + requireApiScope, the fork's own
 * sanctioned service-to-service pattern (PAYLOAD_PICPEAK_API_CONTRACT.md's
 * Flow B rationale) rather than the admin-cookie routes.
 *
 * Delegates entirely to the existing `queueEmail()` (emailProcessor.js) —
 * the same function `adminEvents.js`'s gallery_created path and CRM
 * split-payment invoices already use. No new sending logic is written here;
 * this route is only a new authenticated entry point onto it. `event_id` is
 * passed as `null`: an inquiry is not a gallery event, and `email_queue`'s
 * `event_id` column is nullable (see `../../database/db.js`).
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { queueEmail } = require('../../services/emailProcessor');
const logger = require('../../utils/logger');
const { apiTokenAuth, requireApiScope } = require('../../middleware/apiTokenAuth');

const router = express.Router();

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

      await queueEmail(null, recipient_email, 'inquiry_received', {
        form_title,
        source_page,
        submission_summary,
        submitted_at: submitted_at || new Date().toISOString(),
      });

      res.status(201).json({ status: 'queued', email_type: 'inquiry_received' });
    } catch (error) {
      logger.error('v1 POST /notifications/inquiry failed', { error: error.message });
      res.status(500).json({ error: 'Failed to queue inquiry notification' });
    }
  }
);

module.exports = router;
