/**
 * ---
 * file: src/lib/licenceVerification.ts
 * project: earthandhoney
 * purpose: Pure classification logic for AC-15.1 — decide, from the literal
 *          text of a LICENCE file (not from documentation, README claims, or
 *          a hosting platform's inferred licence badge), whether an upstream
 *          repository is MIT-licensed. Used to gate the PicPeak pivot: a
 *          non-MIT result means work stops and the Product Owner is notified
 *          through `scrum-master/po-requests.md` rather than the pivot
 *          silently proceeding on an unverified assumption.
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.1
 * ---
 */

export interface LicenceClassification {
  isMit: boolean
  reason: string
}

/**
 * Classifies raw LICENCE file text as MIT or not. Requires both the "MIT
 * License" heading and the canonical MIT permission grant so that a licence
 * merely mentioning MIT in passing (e.g. a dual-licence notice) isn't
 * misclassified as MIT.
 */
export function classifyLicenceText(licenceText: string): LicenceClassification {
  const text = licenceText.trim()
  const hasMitHeading = /^MIT License/i.test(text)
  const hasMitGrant = /permission is hereby granted, free of charge/i.test(text)

  if (hasMitHeading && hasMitGrant) {
    return { isMit: true, reason: 'Licence text matches the standard MIT License heading and permission grant.' }
  }

  return {
    isMit: false,
    reason:
      'Licence text does not match the standard MIT License heading and permission grant — work must stop and the Product Owner must be notified through scrum-master/po-requests.md.',
  }
}
