/**
 * ---
 * file: src/__tests__/us15-ac15.1-picpeak-licence-verification.test.ts
 * project: earthandhoney
 * purpose: Verify AC-15.1 — the PicPeak upstream repository is verified to
 *          exist and be obtainable, and its licence is confirmed by reading
 *          the licence file in the repository rather than trusting
 *          documentation, with the stop condition (non-MIT -> Product Owner
 *          notified via scrum-master/po-requests.md) exercised in isolation.
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.1
 * ---
 */
import fs from 'fs'
import path from 'path'
import { classifyLicenceText } from '@/lib/licenceVerification'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const ACTUAL_PICPEAK_LICENCE_TEXT = `MIT License

Copyright (c) 2025 paul

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`

const GPL3_LICENCE_TEXT = `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.`

const APACHE2_LICENCE_TEXT = `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION`

describe('AC-15.1: PicPeak upstream existence and licence verification', () => {
  describe('classifyLicenceText (stop-condition decision logic)', () => {
    it('classifies the actual PicPeak LICENSE file content, read directly from the repository, as MIT', () => {
      const result = classifyLicenceText(ACTUAL_PICPEAK_LICENCE_TEXT)
      expect(result.isMit).toBe(true)
    })

    it('classifies GPL-3.0 licence text as not MIT, triggering the stop condition', () => {
      const result = classifyLicenceText(GPL3_LICENCE_TEXT)
      expect(result.isMit).toBe(false)
      expect(result.reason).toMatch(/stop/i)
      expect(result.reason).toContain('po-requests.md')
    })

    it('classifies Apache-2.0 licence text as not MIT, triggering the stop condition', () => {
      const result = classifyLicenceText(APACHE2_LICENCE_TEXT)
      expect(result.isMit).toBe(false)
      expect(result.reason).toContain('po-requests.md')
    })

    it('does not misclassify a licence that merely mentions MIT in passing (e.g. a dual-licence notice) as MIT', () => {
      const dualLicenceMention = `Proprietary License

This software is proprietary. Portions of the tooling are separately available under the MIT License in another repository.`
      const result = classifyLicenceText(dualLicenceMention)
      expect(result.isMit).toBe(false)
    })

    it('rejects empty or missing licence text rather than defaulting to MIT', () => {
      expect(classifyLicenceText('').isMit).toBe(false)
      expect(classifyLicenceText('   ').isMit).toBe(false)
    })
  })

  describe('PICPEAK_LICENCE_VERIFICATION.md — recorded evidence', () => {
    it('exists at the repo root', () => {
      expect(fs.existsSync(path.join(root, 'PICPEAK_LICENCE_VERIFICATION.md'))).toBe(true)
    })

    const doc = read('PICPEAK_LICENCE_VERIFICATION.md')

    it('records the upstream repository URL', () => {
      expect(doc).toContain('https://github.com/PicPeak/picpeak')
    })

    it('records evidence that the repository is obtainable (not merely that a page exists)', () => {
      expect(doc).toMatch(/ls-remote|clone/i)
      expect(doc).toContain('3bcded78a448f5b099e87a73c7f1e44e859882aa')
    })

    it('states the licence was confirmed by reading the LICENSE file directly, not by trusting documentation', () => {
      expect(doc).toMatch(/LICENSE/)
      expect(doc).toMatch(/not.*(trust|rel(y|ied) on).*documentation|documentation.*not.*trust/i)
    })

    it('quotes the actual licence text read from the repository, including the exact copyright line', () => {
      expect(doc).toContain('MIT License')
      expect(doc).toContain('Copyright (c) 2025 paul')
      expect(doc).toContain('Permission is hereby granted, free of charge')
    })

    it('states the licence is confirmed MIT, matching the PRD assumption', () => {
      expect(doc).toMatch(/Licence confirmed:\s*MIT/i)
      expect(doc).toMatch(/PRD/)
    })

    it('states the stop condition was not triggered and no Product Owner notification was raised', () => {
      expect(doc).toMatch(/not.*triggered/i)
      expect(doc).toContain('po-requests.md')
    })
  })

  describe('scrum-master/po-requests.md — stop condition not triggered', () => {
    it('carries no PicPeak non-MIT licence entry, consistent with the MIT confirmation above', () => {
      const poRequests = read('scrum-master/po-requests.md')
      expect(poRequests).not.toMatch(/PicPeak.*(not MIT|non-MIT|GPL|copyleft)/i)
    })
  })
})
