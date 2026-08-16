/**
 * ---
 * file: vendor/picpeak/backend/src/services/nextActionOverrideService.js
 * project: earthandhoney
 * purpose: US-39 AC-39.5 — reads and writes a Project's manual next-action
 *          override (PRD 23.4, "manual overrides"), backed by migration
 *          127's `project_next_action_overrides` table (one row per
 *          Project, upserted on every set — never an accumulating
 *          history). This file owns the database access only; deciding
 *          how an override and the AC-39.3.2 computed value combine into
 *          one response is `nextActionOverride.js`'s job, split out the
 *          same way `nextActionRules.js` was split from
 *          `nextActionService.js`. Required by `routes/adminProjects.js`
 *          only: PRD 23.4 lists "manual overrides" as a photographer
 *          cockpit item and PRD 23.5's client Project Room list does not
 *          mention them, so this AC's write path is cockpit-only.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.5
 * ---
 */

const { db } = require('../database/db');

const PROJECT_NEXT_ACTION_OVERRIDES_TABLE = 'project_next_action_overrides';

/** This Project's current manual next-action override, or null if none is set. */
async function getProjectNextActionOverride(projectId) {
  const row = await db(PROJECT_NEXT_ACTION_OVERRIDES_TABLE)
    .where({ project_id: projectId })
    .select('override_text', 'actor_admin_id', 'actor_name', 'updated_at')
    .first();
  if (!row) return null;

  return {
    text: row.override_text,
    actorAdminId: row.actor_admin_id,
    actorName: row.actor_name,
    setAt: row.updated_at,
  };
}

/**
 * Sets (or replaces) a Project's manual next-action override. One row per
 * Project — a repeat call upserts rather than accumulating a history, so
 * "the override" this AC's evidence reads back is always the single
 * current one; `actor_admin_id`/`actor_name`/`updated_at` always reflect
 * the most recent call, never the caller-supplied body.
 */
async function setProjectNextActionOverride(projectId, { overrideText, actorAdminId, actorName }) {
  const existing = await db(PROJECT_NEXT_ACTION_OVERRIDES_TABLE)
    .where({ project_id: projectId })
    .select('id')
    .first();

  if (existing) {
    await db(PROJECT_NEXT_ACTION_OVERRIDES_TABLE)
      .where({ project_id: projectId })
      .update({
        override_text: overrideText,
        actor_admin_id: actorAdminId,
        actor_name: actorName,
        updated_at: db.fn.now(),
      });
  } else {
    await db(PROJECT_NEXT_ACTION_OVERRIDES_TABLE).insert({
      project_id: projectId,
      override_text: overrideText,
      actor_admin_id: actorAdminId,
      actor_name: actorName,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
  }

  return getProjectNextActionOverride(projectId);
}

module.exports = {
  getProjectNextActionOverride,
  setProjectNextActionOverride,
};
