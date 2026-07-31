/**
 * ---
 * file: src/lib/thirdPartyNotices.ts
 * project: earthandhoney
 * purpose: Pure logic for AC-15.4 — decide whether a single third-party
 *          notice entry is complete enough to satisfy "reproduces the
 *          upstream licence text and copyright notice in full". Used to
 *          check both the PicPeak upstream notice and the notices for
 *          other code already copied into this repository (the bundled
 *          `public/photobuddy` template assets) before they are recorded
 *          in `THIRD_PARTY_NOTICES.md`.
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.4
 * ---
 */

export interface ThirdPartyNoticeEntry {
  component: string
  copyright: string
  licenceText: string
}

export interface NoticeCompleteness {
  complete: boolean
  missing: string[]
}

/**
 * A notice is complete only if every field is present and the licence text
 * is not a bare reference (e.g. just "MIT") — AC-15.4 requires the licence
 * text reproduced in full, not merely named.
 */
export function checkNoticeCompleteness(entry: ThirdPartyNoticeEntry): NoticeCompleteness {
  const missing: string[] = []

  if (!entry.component.trim()) missing.push('component')
  if (!entry.copyright.trim()) missing.push('copyright')

  const licenceText = entry.licenceText.trim()
  if (!licenceText) {
    missing.push('licenceText')
  } else if (licenceText.length < 40) {
    missing.push('licenceText (too short to be the full licence text, not just a name)')
  }

  return { complete: missing.length === 0, missing }
}
