/**
 * ---
 * file: vendor/picpeak/backend/src/services/projectSetupRules.js
 * project: earthandhoney
 * purpose: US-41 AC-41.1.2.1 — the pure half of automatic Project setup:
 *          the deterministic media-area marker key, the shape of a
 *          cloned milestone row, the shape of the financial-placeholder
 *          row, and the activity-timeline summary text for a newly
 *          created Project. Requires nothing, so it is unit-testable
 *          without Docker — the same split `nextActionRules.js`
 *          established for `nextActionService.js` and
 *          `activityTimelineEntry.js` established for
 *          `activityTimelineService.js`, which this AC's own text calls
 *          for verbatim ("the same single-authority shape AC-39.3.2
 *          proved for the next action and AC-39.6.2 for the timeline").
 *          `projectSetupService.js` owns every database and storage call
 *          these shapes feed.
 * created-by: dev-team
 * related-story: US-41
 * related-ac: 41.1.2.1
 * ---
 */

// PRD Phase 6 owns the real ledger integration (Invoice Ninja/Stripe) —
// this key only ever backs a placeholder row (AC-41.6). It names no
// external system and is never used as a call site of its own.
const FINANCIAL_PLACEHOLDER_INTEGRATION_KEY = 'financial_placeholder';

// Migration 125's own app-level status vocabulary for
// `project_integration_status.status` ('success' | 'pending' | 'failure').
// A placeholder is, by definition, the 'pending' one.
const FINANCIAL_PLACEHOLDER_STATUS = 'pending';

// Migration 124's own default for a milestone that has not been reached.
const MILESTONE_PENDING_STATE = 'pending';

/**
 * The deterministic storage key for a Project's empty media-area marker.
 *
 * A zero-byte object, not a directory: PROJECT_SETUP_MECHANISM_MAP.md's
 * item 3 records that an S3-compatible store has no directory concept, so
 * listing a prefix with nothing under it cannot distinguish "prepared and
 * empty" from "never prepared". Only a written object makes the prefix
 * observably exist.
 */
function projectMediaFolderKey(projectId) {
  return `projects/${projectId}/media/.keep`;
}

/**
 * Shapes migration 124's `project_id IS NULL` template rows into this
 * Project's own insertable rows — the clone that migration's own header
 * comment names this setup path as performing. Takes `now` from the
 * caller so every row cloned in the same setup call shares one instant.
 */
function cloneMilestoneTemplateRows(templates, projectId, now) {
  return templates.map((template) => ({
    project_id: projectId,
    milestone_key: template.milestone_key,
    name: template.name,
    sequence_order: template.sequence_order,
    completion_state: MILESTONE_PENDING_STATE,
    completed_at: null,
    completed_by: null,
    created_at: now,
    updated_at: now,
  }));
}

/**
 * The one `project_integration_status` row Project setup writes.
 * AC-41.6: a placeholder and provably nothing more — no external system
 * is named, and no Invoice Ninja/Stripe call is ever made from here.
 */
function buildFinancialPlaceholderRow(projectId, now) {
  return {
    project_id: projectId,
    integration_key: FINANCIAL_PLACEHOLDER_INTEGRATION_KEY,
    status: FINANCIAL_PLACEHOLDER_STATUS,
    message:
      'Placeholder only — the real financial integration is a later PRD '
      + 'phase; Project setup makes no external call of its own.',
    occurred_at: now,
    created_at: now,
    updated_at: now,
  };
}

/** The activity-timeline summary text for a newly created Project. */
function describeProjectCreated(projectName) {
  return `Project "${projectName}" created.`;
}

module.exports = {
  FINANCIAL_PLACEHOLDER_INTEGRATION_KEY,
  FINANCIAL_PLACEHOLDER_STATUS,
  MILESTONE_PENDING_STATE,
  projectMediaFolderKey,
  cloneMilestoneTemplateRows,
  buildFinancialPlaceholderRow,
  describeProjectCreated,
};
