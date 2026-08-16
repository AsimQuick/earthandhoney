/**
 * ---
 * file: vendor/picpeak/backend/src/services/activityTimelineService.js
 * project: earthandhoney
 * purpose: US-39 AC-39.6.2 — the single shared timeline service PRD 22.3
 *          and 23.4 require: one append function, taking the Project, the
 *          entry type, the actor and what changed, that every write to a
 *          Project's activity timeline goes through — never three
 *          call-site-local inserts that happen to agree. Required by
 *          `routes/adminProjects.js`'s three write handlers
 *          (`PUT /:id/phase`, `PUT /:id/milestones/:key/complete`, and
 *          AC-39.5's `PUT /:id/next-action/override`) and by its own
 *          `GET /:id/timeline` read route. This file owns the database
 *          access only; the entry's shape and the oldest-first ordering
 *          are `activityTimelineEntry.js`'s job, split out the same way
 *          `nextActionRules.js` was split from `nextActionService.js` for
 *          AC-39.3.2 — this AC's own text calls for that exact split
 *          ("the same single-authority shape AC-39.3.2 proved for the
 *          next action").
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.6.2
 * ---
 */

const { db } = require('../database/db');
const {
  buildTimelineEntryRow,
  transformTimelineEntry,
  sortTimelineEntriesOldestFirst,
} = require('./activityTimelineEntry');

const PROJECT_ACTIVITY_TIMELINE_TABLE = 'project_activity_timeline';

/**
 * Appends one entry to a Project's activity timeline. The one function
 * every write path (phase change, milestone completion, next-action
 * override) calls. A caller that determines nothing actually changed
 * simply does not call this — so a change that changes nothing appends no
 * entry, and the timeline stays a history of real changes rather than of
 * requests.
 *
 * @param {{id: number}} project
 * @param {string} entryType
 * @param {{adminId: number, name: string}} actor
 * @param {{summary: string, metadata?: object|null}} whatChanged
 */
async function appendActivityTimelineEntry(project, entryType, actor, whatChanged) {
  await db(PROJECT_ACTIVITY_TIMELINE_TABLE).insert(buildTimelineEntryRow(project, entryType, actor, whatChanged));
}

/** One Project's activity timeline entries, oldest first. */
async function getProjectTimeline(projectId) {
  const rows = await db(PROJECT_ACTIVITY_TIMELINE_TABLE)
    .where({ project_id: projectId })
    .orderBy('id', 'asc')
    .select('id', 'entry_type', 'summary', 'actor_admin_id', 'actor_name', 'metadata', 'occurred_at');
  return sortTimelineEntriesOldestFirst(rows.map(transformTimelineEntry));
}

module.exports = {
  appendActivityTimelineEntry,
  getProjectTimeline,
};
