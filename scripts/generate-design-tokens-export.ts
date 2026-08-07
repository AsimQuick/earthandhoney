/**
 * ---
 * file: scripts/generate-design-tokens-export.ts
 * project: earthandhoney
 * purpose: AC-23.6 — CLI entry point (npm run tokens:export) that
 *          regenerates the checked-in plain CSS custom-property export at
 *          exports/design-tokens/tokens.css from the AC-23.1 token source
 *          of truth. The generation logic itself lives in
 *          src/lib/tokenExport.ts so this AC's test can call the same
 *          function directly and diff the result against the checked-in
 *          file without shelling out.
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.6
 * ---
 */
import fs from 'fs'
import path from 'path'
import { generateTokenExportCss, EXPORT_OUTPUT_PATH } from '../src/lib/tokenExport'

const tokensPath = path.join(process.cwd(), 'src/styles/tokens.css')
const outputPath = path.join(process.cwd(), EXPORT_OUTPUT_PATH)

const source = fs.readFileSync(tokensPath, 'utf8')
const output = generateTokenExportCss(source)

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, output)

console.log(`Wrote ${EXPORT_OUTPUT_PATH}`)
