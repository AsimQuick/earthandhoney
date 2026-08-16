/**
 * ---
 * file: vendor/picpeak/backend/src/services/nextActionRules.js
 * project: earthandhoney
 * purpose: US-39 AC-39.3.2 — the pure rules half of the Project "next
 *          action" computation: phase + milestone state in, one string
 *          out. Split from `nextActionService.js` (which does the
 *          database reads and calls this) for one reason:
 *          `nextActionService.js` requires `../database/db`, which builds
 *          a knex instance at module load, so it cannot be required from
 *          a Jest unit suite without a live database. This file requires
 *          nothing at all, so the rules themselves are driven directly by
 *          `src/__tests__/us39-ac39.3.2-next-action-single-computation.test.ts`
 *          across all seven PRD 23.1 phases and representative milestone
 *          states, without Docker.
 *
 *          AC-39.3 was split into three ACs (AC-39.3.1 mapped the two
 *          request paths against the pinned fork; this AC wires the
 *          single computation into both; AC-39.3.3 proves the two live
 *          responses are identical strings). This file and its sibling
 *          `nextActionService.js` are AC-39.3.2's deliverable.
 *
 *          Ordering matters here and is not cosmetic. The `booking`
 *          phase's string names the outstanding requirements, and both
 *          surfaces fetch it in two separate HTTP requests. Postgres
 *          returns rows in no guaranteed order without an ORDER BY, so an
 *          unordered list would let the cockpit and the Project Room
 *          render the same state as two differently-ordered strings —
 *          AC-39.3.3's "identical strings" would then hold only by luck.
 *          Outstanding requirements are therefore sorted by PRD 23.2's own
 *          `sequence_order`, with the milestone key as a stable tiebreak
 *          for any key that carries no template row.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.3.2
 * ---
 */

// Guidance for every phase whose next action does not depend on milestone
// state. 'booking' is deliberately absent — its next action is always
// computed from the configured booking requirements below.
const PHASE_NEXT_ACTIONS = {
  lead: 'Review the inquiry and send a quote.',
  preparation: 'Confirm dates, venues and shoot-day details with the client.',
  shoot: 'Complete the shoot and begin image production.',
  post_production: 'Finish image production and prepare the gallery for delivery.',
  delivery: 'Deliver the gallery and confirm the client has received their images.',
  closed: 'No further action — the project is closed.',
};

// Used when `current_phase` holds a value this module has no rule for.
// `projects.current_phase` is a plain varchar with a 'lead' default
// (migration 122), not an enum, so an unrecognised value is reachable
// through a direct database write even though no product path writes one.
const UNKNOWN_PHASE_NEXT_ACTION = 'Review the project and determine the next step.';

const BOOKING_NOT_CONFIGURED = 'Booking requirements are not configured for this project.';
const BOOKING_COMPLETE = 'All booking requirements are complete — confirm the booking.';

/**
 * Outstanding requirement keys in PRD 23.2 order.
 *
 * @param {string[]} requiredMilestoneKeys
 * @param {string[]} completedMilestoneKeys
 * @param {Map<string, {name: string, sequenceOrder: number}>} milestoneMetaByKey
 * @returns {string[]}
 */
function orderOutstandingKeys(requiredMilestoneKeys, completedMilestoneKeys, milestoneMetaByKey) {
  const completed = new Set(completedMilestoneKeys);
  return requiredMilestoneKeys
    .filter((key) => !completed.has(key))
    .sort((a, b) => {
      // A key with no template row sorts last rather than colliding with
      // sequence_order 1 — Number.MAX_SAFE_INTEGER, then the key itself,
      // so the order is total and never depends on row arrival order.
      const orderA = milestoneMetaByKey.get(a)?.sequenceOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = milestoneMetaByKey.get(b)?.sequenceOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a < b ? -1 : a > b ? 1 : 0;
    });
}

/**
 * The one next-action rule set. Never returns an empty string.
 *
 * @param {object} state
 * @param {string} state.phase — `projects.current_phase`.
 * @param {string[]} [state.requiredMilestoneKeys] — this Project's configured
 *        booking requirements (its own override rows, else the default
 *        template), read by the caller.
 * @param {string[]} [state.completedMilestoneKeys] — this Project's own
 *        milestone rows whose completion_state is 'complete'.
 * @param {Map<string, {name: string, sequenceOrder: number}>} [state.milestoneMetaByKey]
 *        — PRD 23.2 name and sequence_order per milestone key.
 * @returns {string}
 */
function resolveNextAction({
  phase,
  requiredMilestoneKeys = [],
  completedMilestoneKeys = [],
  milestoneMetaByKey = new Map(),
} = {}) {
  if (phase !== 'booking') {
    return PHASE_NEXT_ACTIONS[phase] || UNKNOWN_PHASE_NEXT_ACTION;
  }

  if (requiredMilestoneKeys.length === 0) return BOOKING_NOT_CONFIGURED;

  const outstanding = orderOutstandingKeys(requiredMilestoneKeys, completedMilestoneKeys, milestoneMetaByKey);
  if (outstanding.length === 0) return BOOKING_COMPLETE;

  const labels = outstanding.map((key) => milestoneMetaByKey.get(key)?.name || key);
  return `Awaiting: ${labels.join(', ')}.`;
}

module.exports = {
  resolveNextAction,
  PHASE_NEXT_ACTIONS,
  UNKNOWN_PHASE_NEXT_ACTION,
  BOOKING_NOT_CONFIGURED,
  BOOKING_COMPLETE,
};
