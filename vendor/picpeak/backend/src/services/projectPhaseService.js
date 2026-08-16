/**
 * ---
 * file: vendor/picpeak/backend/src/services/projectPhaseService.js
 * project: earthandhoney
 * purpose: US-39 AC-39.6.2 — the database-backed half of a Project's
 *          phase change: reads the Project's current phase, asks
 *          `projectChangeRules.isPhaseChangeNoOp` whether the requested
 *          phase is actually a change, and — only when it is — updates
 *          `projects.current_phase`. This module owns the `projects` row
 *          mutation only; appending the resulting timeline entry (only
 *          when `changed` is true) is `routes/adminProjects.js`'s own job,
 *          via the shared timeline service — the same "route requires the
 *          one shared service" shape the AC-39.5 override route already
 *          established, so all three AC-39.6.2 write handlers require
 *          that one timeline service directly rather than through a
 *          chain of intermediaries.
 *
 *          `PROJECT_PHASE_KEYS` mirrors `src/lib/projectPhases.ts`'s
 *          AC-39.1 lock-in (seven phases, no eighth) rather than
 *          importing it: this is a CommonJS Express backend and that is a
 *          TS module in the Next.js app, with no shared build step
 *          between the two Node projects — the same cross-runtime
 *          constraint `nextActionService.js`'s header comment already
 *          recorded for `bookingRule.ts`/`projectPhases.ts`.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.6.2
 * ---
 */

const { db } = require('../database/db');
const { isPhaseChangeNoOp } = require('./projectChangeRules');

// PRD 23.1's seven phases, in order — mirrors src/lib/projectPhases.ts's
// PROJECT_PHASE_KEYS (see header comment for why this is a mirror, not an
// import).
const PROJECT_PHASE_KEYS = ['lead', 'booking', 'preparation', 'shoot', 'post_production', 'delivery', 'closed'];

/**
 * Sets a Project's phase. Returns `null` when the Project does not exist.
 * `changed` is `false`, with no database write, when the requested phase
 * is already current — the caller decides from that whether a timeline
 * entry is warranted.
 *
 * @param {number} projectId
 * @param {string} phaseKey — one of PROJECT_PHASE_KEYS.
 * @returns {Promise<{project: {id: number, phase: string}, changed: boolean, previousPhase: string} | null>}
 */
async function setProjectPhase(projectId, phaseKey) {
  const project = await db('projects').where({ id: projectId }).select('id', 'current_phase').first();
  if (!project) return null;

  if (isPhaseChangeNoOp(project.current_phase, phaseKey)) {
    return { project: { id: project.id, phase: project.current_phase }, changed: false, previousPhase: project.current_phase };
  }

  await db('projects').where({ id: projectId }).update({ current_phase: phaseKey, updated_at: db.fn.now() });

  return { project: { id: project.id, phase: phaseKey }, changed: true, previousPhase: project.current_phase };
}

module.exports = {
  PROJECT_PHASE_KEYS,
  setProjectPhase,
};
