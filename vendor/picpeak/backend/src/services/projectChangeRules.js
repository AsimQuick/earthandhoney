/**
 * ---
 * file: vendor/picpeak/backend/src/services/projectChangeRules.js
 * project: earthandhoney
 * purpose: US-39 AC-39.6.2 — the pure rules deciding whether a requested
 *          phase change or milestone completion is a real change or a
 *          no-op (setting the phase to its current value; re-completing
 *          an already-complete milestone), and the human-readable summary
 *          an appended timeline entry carries when it IS a real change.
 *          Requires nothing, so it is unit-testable without Docker — the
 *          same split `nextActionRules.js` established for AC-39.3.2.
 *          `projectPhaseService.js` and `projectMilestoneService.js` are
 *          the database-backed callers: each reads current state, asks
 *          this module whether the requested change is a no-op, and only
 *          calls `activityTimelineService.appendActivityTimelineEntry`
 *          when it is not — so "a change that changes nothing appends no
 *          entry" is a property of this pure module's return value, not
 *          of a database side effect a test would need Docker to observe.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.6.2
 * ---
 */

/** True when the requested phase is already the Project's current phase. */
function isPhaseChangeNoOp(currentPhase, requestedPhase) {
  return currentPhase === requestedPhase;
}

/** The timeline summary for a real (non-no-op) phase change. */
function describePhaseChange(fromPhase, toPhase) {
  return `Phase changed from "${fromPhase}" to "${toPhase}".`;
}

/** True when a milestone is already complete — re-completing it is a no-op. */
function isMilestoneCompletionNoOp(currentCompletionState) {
  return currentCompletionState === 'complete';
}

/** The timeline summary for a real (non-no-op) milestone completion. */
function describeMilestoneCompletion(milestoneName) {
  return `Milestone "${milestoneName}" completed.`;
}

module.exports = {
  isPhaseChangeNoOp,
  describePhaseChange,
  isMilestoneCompletionNoOp,
  describeMilestoneCompletion,
};
