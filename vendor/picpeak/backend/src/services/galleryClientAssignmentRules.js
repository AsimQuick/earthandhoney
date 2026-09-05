/**
 * ---
 * file: vendor/picpeak/backend/src/services/galleryClientAssignmentRules.js
 * project: earthandhoney
 * purpose: US-41 AC-41.2.2 — the one pure shape this AC's assignment path
 *          builds, per GALLERY_CLIENT_ASSIGNMENT_MAP.md's (AC-41.2.1)
 *          answer 4: F2 records that `PUT /api/admin/events/:id` returns
 *          500 when `customer_account_ids` is the only field a request
 *          carries, because the handler deletes that field before its own
 *          events-table `update(updates)` call, and Knex throws
 *          synchronously on an empty update object. `buildGalleryClientAssignmentRequestBody`
 *          always pairs `customer_account_ids` with `event_name` — the
 *          map's own named cleanest single-field, genuine no-op passthrough
 *          — so the 500-triggering bare shape is unreachable by
 *          construction: an object literal with two keys can never equal
 *          one with one key, no retry or defensive check required. No
 *          requires, no database — unit-testable directly, the same split
 *          `projectSetupRules.js` (AC-41.1.2.1) established.
 * created-by: dev-team
 * related-story: US-41
 * related-ac: 41.2.2
 * ---
 */

/**
 * @param {number} customerAccountId
 * @param {string} currentEventName
 * @returns {{customer_account_ids: number[], event_name: string}}
 */
function buildGalleryClientAssignmentRequestBody(customerAccountId, currentEventName) {
  return {
    customer_account_ids: [customerAccountId],
    event_name: currentEventName,
  };
}

module.exports = {
  buildGalleryClientAssignmentRequestBody,
};
