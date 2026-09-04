/**
 * ---
 * file: vendor/picpeak/backend/src/services/activityTimelineEntry.js
 * project: earthandhoney
 * purpose: US-39 AC-39.6.2 — the pure half of a Project's activity
 *          timeline entry: given a Project, an entry type, an actor and
 *          what changed, shape the row `activityTimelineService.js`
 *          inserts into migration 128's `project_activity_timeline`, the
 *          reverse shape a reader gets back, and the oldest-first
 *          ordering `GET /:id/timeline` returns. Requires nothing, so it
 *          is unit-testable without Docker — the same split
 *          `nextActionRules.js` established for AC-39.3.2, which this
 *          AC's own text calls for verbatim ("the same single-authority
 *          shape AC-39.3.2 proved for the next action").
 *          `activityTimelineService.js` owns the database insert/select
 *          this file's inputs/outputs feed.
 *
 *          US-41 AC-41.1.2.1 adds the fourth `ENTRY_TYPES` member,
 *          `PROJECT_CREATED`, acting on PROJECT_SETUP_MECHANISM_MAP.md's
 *          item 10 finding: automatic Project setup's own timeline entry
 *          has no entry type to append with until this member exists, and
 *          referencing one that does not exist would silently insert
 *          `undefined` into `entry_type`. `projectSetupService.js` is its
 *          only caller.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.6.2
 * updated-by: dev-team
 * related-story: US-41
 * related-ac: 41.1.2.1
 * ---
 */

// Stable machine-readable entry_type values, one per call site AC-39.6.2
// (and, for PROJECT_CREATED, AC-41.1.2.1) wires into the shared append
// function — a single authority so a typo'd literal string can never
// silently create a fifth, unrecognised kind.
const ENTRY_TYPES = {
  PHASE_CHANGE: 'phase_change',
  MILESTONE_COMPLETED: 'milestone_completed',
  NEXT_ACTION_OVERRIDE_SET: 'next_action_override_set',
  PROJECT_CREATED: 'project_created',
};

/**
 * The row `activityTimelineService.appendActivityTimelineEntry` inserts.
 * `occurred_at` is left to the table's own `defaultTo(knex.fn.now())`
 * (migration 128) rather than stamped here, matching
 * `nextActionOverrideService.js`'s `db.fn.now()` convention of trusting
 * the database's own clock over the application server's.
 *
 * @param {{id: number}} project
 * @param {string} entryType — one of ENTRY_TYPES.
 * @param {{adminId: number, name: string}} actor
 * @param {{summary: string, metadata?: object|null}} whatChanged
 * @returns {object} an insertable `project_activity_timeline` row.
 */
function buildTimelineEntryRow(project, entryType, actor, whatChanged) {
  return {
    project_id: project.id,
    entry_type: entryType,
    summary: whatChanged.summary,
    actor_admin_id: actor.adminId,
    actor_name: actor.name,
    metadata: whatChanged.metadata ? JSON.stringify(whatChanged.metadata) : null,
  };
}

/** A `project_activity_timeline` row, as a reader-facing entry object. */
function transformTimelineEntry(row) {
  return {
    id: row.id,
    entryType: row.entry_type,
    summary: row.summary,
    actorAdminId: row.actor_admin_id,
    actorName: row.actor_name,
    metadata: row.metadata
      ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
      : null,
    occurredAt: row.occurred_at,
  };
}

/**
 * Oldest-first by `id`, migration 128's own authoritative ordering column
 * (two entries appended within the same request can share a
 * millisecond-resolution `occurred_at`) — enforced here in code rather
 * than trusted to a database ORDER BY alone, the same defence
 * `nextActionRules.js`'s `orderOutstandingKeys` established for AC-39.3.2.
 */
function sortTimelineEntriesOldestFirst(entries) {
  return [...entries].sort((a, b) => a.id - b.id);
}

module.exports = {
  ENTRY_TYPES,
  buildTimelineEntryRow,
  transformTimelineEntry,
  sortTimelineEntriesOldestFirst,
};
