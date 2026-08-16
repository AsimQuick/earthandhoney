/**
 * ---
 * file: vendor/picpeak/backend/src/services/statusVocabulary.js
 * project: earthandhoney
 * purpose: US-40 AC-40.5 — the fork's own read of PRD 23.3's five status
 *          states, sourced from the framework-free export
 *          exports/design-tokens/status-vocabulary.json — itself generated
 *          from the single definition, src/lib/statusVocabulary.ts — rather
 *          than a second, independent copy. Requires nothing but that JSON
 *          file, so it is unit-testable without Docker, the same split
 *          nextActionRules.js established for AC-39.3.2. No route wires
 *          this in yet: rendering status in the cockpit or the Project Room
 *          is US-43/US-44's concern, and which colour token a `colorName`
 *          resolves to is still AC-40.3's pending Product Owner decision —
 *          this module only makes the vocabulary reachable, structurally
 *          identical to the one definition, from the fork's own code.
 * created-by: dev-team
 * related-story: US-40
 * related-ac: 40.5
 * ---
 */
const path = require('path');

const STATUS_VOCABULARY_EXPORT_PATH = path.join(
  __dirname,
  '../../../../../exports/design-tokens/status-vocabulary.json',
);

const statusVocabularyExport = require(STATUS_VOCABULARY_EXPORT_PATH);

const STATUS_STATES = statusVocabularyExport.states;

const STATUS_STATE_KEYS = STATUS_STATES.map((state) => state.key);

function isValidStatusStateKey(key) {
  return STATUS_STATE_KEYS.includes(key);
}

module.exports = {
  STATUS_VOCABULARY_EXPORT_PATH,
  STATUS_STATES,
  STATUS_STATE_KEYS,
  isValidStatusStateKey,
};
