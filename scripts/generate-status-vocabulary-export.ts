/**
 * ---
 * file: scripts/generate-status-vocabulary-export.ts
 * project: earthandhoney
 * purpose: AC-40.5 — CLI entry point (npm run status-vocabulary:export) that
 *          regenerates the checked-in framework-free export at
 *          exports/design-tokens/status-vocabulary.json from the AC-40.1
 *          status-vocabulary source of truth (src/lib/statusVocabulary.ts).
 *          The generation logic lives in src/lib/statusVocabularyExport.ts
 *          so this AC's test can call the same function directly and diff
 *          the result against the checked-in file without shelling out —
 *          the same split scripts/generate-design-tokens-export.ts
 *          established for AC-23.6.
 * created-by: dev-team
 * related-story: US-40
 * related-ac: 40.5
 * ---
 */
import fs from 'fs'
import path from 'path'
import { STATUS_STATES } from '../src/lib/statusVocabulary'
import { generateStatusVocabularyExportJson, EXPORT_OUTPUT_PATH } from '../src/lib/statusVocabularyExport'

const outputPath = path.join(process.cwd(), EXPORT_OUTPUT_PATH)

const output = generateStatusVocabularyExportJson(STATUS_STATES)

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, output)

console.log(`Wrote ${EXPORT_OUTPUT_PATH}`)
