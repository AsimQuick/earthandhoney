/**
 * ---
 * file: vendor/picpeak/backend/src/services/projectMilestoneService.js
 * project: earthandhoney
 * purpose: US-39 AC-39.6.2 — the database-backed half of a Project's
 *          milestone completion: reads the named milestone row, asks
 *          `projectChangeRules.isMilestoneCompletionNoOp` whether it is
 *          already complete, and — only when it is not — marks it
 *          complete. This module owns the milestone row mutation only;
 *          appending the resulting timeline entry (only when `changed`
 *          is true) is `routes/adminProjects.js`'s own job, via the
 *          shared timeline service — the same "route requires the one
 *          shared service" shape the AC-39.5 override route already
 *          established, so all three AC-39.6.2 write handlers require
 *          that one timeline service directly rather than through a
 *          chain of intermediaries.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.6.2
 * ---
 */

const { db } = require('../database/db');
const { isMilestoneCompletionNoOp } = require('./projectChangeRules');

const PROJECT_MILESTONES_TABLE = 'project_milestones';

function transformMilestone(row) {
  return {
    projectId: row.project_id,
    milestoneKey: row.milestone_key,
    name: row.name,
    completionState: row.completion_state,
  };
}

/**
 * Marks a Project's own milestone row complete. Returns `null` when no
 * such Project/milestone row exists. `changed` is `false`, with no
 * database write, when the milestone is already complete — the caller
 * decides from that whether a timeline entry is warranted.
 *
 * @param {number} projectId
 * @param {string} milestoneKey
 * @param {string} completedBy — the acting admin's username, stored on
 *        the milestone row itself (`project_milestones.completed_by`),
 *        independent of who the timeline entry records as its actor.
 * @returns {Promise<{milestone: object, changed: boolean} | null>}
 */
async function completeProjectMilestone(projectId, milestoneKey, completedBy) {
  const row = await db(PROJECT_MILESTONES_TABLE)
    .where({ project_id: projectId, milestone_key: milestoneKey })
    .select('id', 'project_id', 'milestone_key', 'name', 'completion_state')
    .first();
  if (!row) return null;

  if (isMilestoneCompletionNoOp(row.completion_state)) {
    return { milestone: transformMilestone(row), changed: false };
  }

  await db(PROJECT_MILESTONES_TABLE)
    .where({ id: row.id })
    .update({
      completion_state: 'complete',
      completed_at: db.fn.now(),
      completed_by: completedBy,
      updated_at: db.fn.now(),
    });

  return { milestone: { ...transformMilestone(row), completionState: 'complete' }, changed: true };
}

module.exports = {
  completeProjectMilestone,
};
