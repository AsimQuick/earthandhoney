/**
 * ---
 * file: vendor/picpeak/backend/src/services/galleryClientAssignmentService.js
 * project: earthandhoney
 * purpose: US-41 AC-41.2.2 — the one assignment path for the operational
 *          Gallery-to-Client relationship, per upstream finding F1
 *          (a Gallery created inside a Project does not inherit the
 *          Project's Client at the pinned commit, so Backstage assigns it
 *          explicitly) and GALLERY_CLIENT_ASSIGNMENT_MAP.md's (AC-41.2.1)
 *          own answers:
 *
 *          - Answer 4 / F2: the request shape this module builds, via
 *            `galleryClientAssignmentRules.js`'s
 *            `buildGalleryClientAssignmentRequestBody`, always pairs
 *            `customer_account_ids` with `event_name` — never the bare
 *            `customer_account_ids`-only shape that crashes
 *            `PUT /api/admin/events/:id` with a 500 — so that 500 is
 *            avoided by construction, never by a retry.
 *          - Answer 5: this deployment's `customerPortal` feature flag is
 *            off, which silently no-ops the same assignment block on both
 *            of `adminEvents.js`'s own routes (a `200` with nothing
 *            written). This module does not flip that flag — CLAUDE.md's
 *            "there is no fourth surface" rule and SYSTEM_OWNERSHIP.md's
 *            "Client-facing portal | Project Room only" row both govern
 *            that flag, and enabling it is a Product Owner decision the
 *            map already routed. It instead asserts the flag as an
 *            explicit precondition and throws rather than inheriting a
 *            silent success.
 *          - Answer 6: the single mechanism this assignment goes through
 *            is `customerAccountsService.setAssignmentsForEvent`, which
 *            diffs and applies `event_customer_assignments` — this module
 *            never inserts into that table itself.
 *
 *          Scope is this one assignment path and nothing else: no new
 *          route, no new permission, no new mount, no client-facing
 *          surface. Requires `../database/db` (via the `events` lookup),
 *          so — matching every other DB-backed service in this fork
 *          (`projectSetupService.js`, `nextActionService.js`) — it is
 *          proven structurally in the UNIT lane here and is left for a
 *          later AC to prove behaviourally against a running stack.
 * created-by: dev-team
 * related-story: US-41
 * related-ac: 41.2.2
 * ---
 */

const { db } = require('../database/db');
const customerAccountsService = require('./customerAccountsService');
const { AppError, NotFoundError } = require('../utils/errors');
const { buildGalleryClientAssignmentRequestBody } = require('./galleryClientAssignmentRules');

/**
 * Assigns `customerAccountId` as the one Client on the Gallery (`events`
 * row) identified by `eventId`, through `setAssignmentsForEvent` — the map's
 * answer 6 mechanism — and never through a direct insert of its own.
 *
 * @param {number} eventId
 * @param {number} customerAccountId
 * @param {number} adminId
 */
async function assignClientToGallery(eventId, customerAccountId, adminId) {
  const portalEnabled = await customerAccountsService.isCustomerPortalEnabled();
  if (!portalEnabled) {
    throw new AppError(
      'Gallery-to-Client assignment requires the customerPortal feature flag to be enabled on '
      + 'this deployment. Refusing to proceed silently — see GALLERY_CLIENT_ASSIGNMENT_MAP.md '
      + "question 5: the flag is currently off, which would otherwise make this call a silent "
      + 'no-op (a 200 that writes nothing) rather than a visible failure.',
      409,
      'CUSTOMER_PORTAL_DISABLED',
    );
  }

  const event = await db('events').where({ id: eventId }).first();
  if (!event) {
    throw new NotFoundError('Event', eventId);
  }

  const requestBody = buildGalleryClientAssignmentRequestBody(customerAccountId, event.event_name);

  return customerAccountsService.setAssignmentsForEvent(eventId, requestBody.customer_account_ids, adminId);
}

module.exports = {
  assignClientToGallery,
};
