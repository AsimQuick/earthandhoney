/**
 * ---
 * file: vendor/picpeak/backend/src/services/nextActionService.js
 * project: earthandhoney
 * purpose: US-39 AC-39.3.2 — the single server-side computation of a
 *          Project's "next action", from `projects.current_phase`
 *          (migration 122) and that Project's own milestone completion
 *          state (`project_milestones`, migration 124) plus its configured
 *          booking requirements (`project_booking_requirements`, migration
 *          126, the same table `src/lib/bookingRule.ts` reads for AC-39.2).
 *          `computeProjectNextAction` is required by BOTH
 *          `routes/adminProjects.js` (the photographer cockpit, mounted at
 *          `/api/admin/projects` per AC-39.3.1's map) and
 *          `routes/customer.js` (the Project Room, mounted at
 *          `/api/customer`) — the same function reference, not two
 *          independent implementations — so "both surfaces read that
 *          single value" is a fact about the code, not an assertion. This
 *          file owns the database reads only; the rules that turn that
 *          state into a string live in `nextActionRules.js`, which
 *          requires nothing and is therefore unit-testable outside Docker.
 *
 *          `src/lib/bookingRule.ts`/`projectPhases.ts` are TS modules in
 *          the Next.js app and cannot be required from this CommonJS
 *          Express backend at runtime (no shared build step exists between
 *          the two Node projects), so the booking-requirement read pattern
 *          (own override rows, else the `project_id IS NULL` template) is
 *          mirrored here rather than imported — the same convention
 *          migrations 124/126's own seed data already follows, which also
 *          has no single cross-runtime source.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.3.2
 * ---
 */

const { db } = require('../database/db');
const { resolveNextAction } = require('./nextActionRules');

const PROJECT_MILESTONES_TABLE = 'project_milestones';
const PROJECT_BOOKING_REQUIREMENTS_TABLE = 'project_booking_requirements';

/** A Project's own booking-requirement override, or the default template. */
async function getRequiredMilestoneKeys(projectId) {
  const ownRows = await db(PROJECT_BOOKING_REQUIREMENTS_TABLE)
    .where('project_id', projectId)
    .orderBy('id')
    .select('milestone_key');
  if (ownRows.length > 0) return ownRows.map((row) => row.milestone_key);

  const templateRows = await db(PROJECT_BOOKING_REQUIREMENTS_TABLE)
    .whereNull('project_id')
    .orderBy('id')
    .select('milestone_key');
  return templateRows.map((row) => row.milestone_key);
}

/** Which of a Project's own milestone rows are complete. */
async function getCompletedMilestoneKeys(projectId) {
  const rows = await db(PROJECT_MILESTONES_TABLE)
    .where({ project_id: projectId, completion_state: 'complete' })
    .select('milestone_key');
  return rows.map((row) => row.milestone_key);
}

/**
 * PRD 23.2's own name and list position per milestone key, read from
 * migration 124's canonical template rows (`project_id IS NULL`) so the
 * wording a client reads is the PRD's, not a second copy kept in code.
 */
async function getMilestoneMeta(milestoneKeys) {
  if (milestoneKeys.length === 0) return new Map();
  const rows = await db(PROJECT_MILESTONES_TABLE)
    .whereNull('project_id')
    .whereIn('milestone_key', milestoneKeys)
    .select('milestone_key', 'name', 'sequence_order');
  return new Map(rows.map((row) => [
    row.milestone_key,
    { name: row.name, sequenceOrder: Number(row.sequence_order) },
  ]));
}

/**
 * The next action for a Project, computed once from its current phase and
 * milestone state. Returns null when the Project does not exist — callers
 * decide the 404 shape for their own surface.
 */
async function computeProjectNextAction(projectId) {
  const project = await db('projects').where({ id: projectId }).select('id', 'current_phase').first();
  if (!project) return null;

  const [requiredMilestoneKeys, completedMilestoneKeys] = await Promise.all([
    getRequiredMilestoneKeys(projectId),
    getCompletedMilestoneKeys(projectId),
  ]);
  const milestoneMetaByKey = await getMilestoneMeta(requiredMilestoneKeys);

  return {
    projectId: project.id,
    phase: project.current_phase,
    nextAction: resolveNextAction({
      phase: project.current_phase,
      requiredMilestoneKeys,
      completedMilestoneKeys,
      milestoneMetaByKey,
    }),
  };
}

module.exports = {
  computeProjectNextAction,
};
