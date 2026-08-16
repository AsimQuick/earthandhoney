/**
 * ---
 * file: vendor/picpeak/backend/src/services/nextActionOverride.js
 * project: earthandhoney
 * purpose: US-39 AC-39.5 — the pure half of a photographer's manual
 *          next-action override (PRD 23.4, "manual overrides"): given the
 *          AC-39.3.2 computed value and an optional override row, decide
 *          the active next-action string and shape a response that
 *          presents the override AS an override rather than silently
 *          replacing the computation — the computed value stays present
 *          and retrievable alongside it, satisfying this AC's "both
 *          values visible in the same response" evidence clause. Requires
 *          nothing, so it is unit-testable without Docker — the same split
 *          `nextActionRules.js` established for AC-39.3.2.
 *          `nextActionOverrideService.js` owns the database read/write
 *          this file's `override` argument comes from.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.5
 * ---
 */

/**
 * @param {object} state
 * @param {string} state.computedNextAction — the AC-39.3.2 computed value.
 * @param {{text: string, actorName: string, setAt: string} | null} state.override
 *        — this Project's current manual override, or null if none is set.
 * @returns {{
 *   nextAction: string,
 *   computedNextAction: string,
 *   override: {text: string, actorName: string, setAt: string} | null,
 * }}
 */
function presentNextAction({ computedNextAction, override }) {
  if (!override) {
    return { nextAction: computedNextAction, computedNextAction, override: null };
  }

  return {
    nextAction: override.text,
    computedNextAction,
    override: {
      text: override.text,
      actorName: override.actorName,
      setAt: override.setAt,
    },
  };
}

module.exports = {
  presentNextAction,
};
