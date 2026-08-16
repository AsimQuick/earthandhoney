/**
 * ---
 * file: src/lib/statusVocabularyExport.ts
 * project: earthandhoney
 * purpose: AC-40.5 — generate the framework-free export of US-40 AC-40.1's
 *          single status-vocabulary definition (src/lib/statusVocabulary.ts)
 *          through the export path US-23 AC-23.6 established
 *          (exports/design-tokens/), so a consumer with no TypeScript/
 *          Next.js dependency — the fork's own backend — reads PRD 23.3's
 *          five status states without a second, independent definition.
 *          Pure function, reused by both
 *          scripts/generate-status-vocabulary-export.ts (the regeneration
 *          CLI) and this AC's test (which regenerates from the live source
 *          and diffs against the checked-in file to prove reproducibility —
 *          the same proof src/lib/tokenExport.ts established for AC-23.6).
 * created-by: dev-team
 * related-story: US-40
 * related-ac: 40.5
 * ---
 */
import type { StatusStateDefinition } from './statusVocabulary'

export const EXPORT_OUTPUT_PATH = 'exports/design-tokens/status-vocabulary.json'
export const SOURCE_OF_TRUTH_PATH = 'src/lib/statusVocabulary.ts'

export interface StatusVocabularyExport {
  _meta: {
    file: string
    project: string
    purpose: string
    createdBy: string
    relatedStory: string
    relatedAc: string
    generatedFile: true
    sourceOfTruth: string
    regenerateWith: string
  }
  states: readonly StatusStateDefinition[]
}

export function generateStatusVocabularyExport(
  states: readonly StatusStateDefinition[],
): StatusVocabularyExport {
  return {
    _meta: {
      file: EXPORT_OUTPUT_PATH,
      project: 'earthandhoney',
      purpose:
        "AC-40.5 — framework-free export of the single status-vocabulary definition (src/lib/statusVocabulary.ts), so the fork's backend and any other non-TypeScript/non-Next.js consumer reads PRD 23.3's five status states without a second, independent definition. GENERATED FILE — do not edit by hand.",
      createdBy: 'dev-team',
      relatedStory: 'US-40',
      relatedAc: '40.5',
      generatedFile: true,
      sourceOfTruth: SOURCE_OF_TRUTH_PATH,
      regenerateWith: 'npm run status-vocabulary:export',
    },
    states,
  }
}

/** JSON text form, trailing newline included, for a deterministic checked-in diff. */
export function generateStatusVocabularyExportJson(states: readonly StatusStateDefinition[]): string {
  return `${JSON.stringify(generateStatusVocabularyExport(states), null, 2)}\n`
}
