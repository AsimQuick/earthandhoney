/**
 * ---
 * file: src/__tests__/us37-ac37.6.1-no-meta-keywords-guard.test.ts
 * project: earthandhoney
 * purpose: AC-37.6.1's standing guard: a repo-wide-reading test that fails if
 *          a meta-keywords or `keywords` field is ever added to `Pages` or
 *          `Stories` — PRD §21.2 forbids one, and this AC is the one adding
 *          seven new fields to `Stories`, so it is the right place to lock
 *          the prohibition in for both collections at once. Walks each
 *          collection's authored field tree recursively (array/group/row/
 *          tabs), so a `keywords` field nested inside e.g. `Stories.sections`
 *          would be caught too. Carries a self-test proving the walker
 *          actually detects a planted violation, so the standing assertion
 *          is not vacuously green (the same technique
 *          us36-ac36.5-no-blog-chrome.test.tsx uses). The standing
 *          assertions were additionally shown non-vacuous against the real
 *          collections during this AC's run: `keywords` was temporarily added
 *          to `Stories` and `metaKeywords` to `Pages`, both were caught by the
 *          `%s carries no keywords/...` cases below, and both were reverted
 *          inside the same run. This suite intentionally covers only
 *          `Pages` and `Stories` — "either collection" per AC-37.6.1's own
 *          wording — not every collection/global in the repo; a repo-wide
 *          sweep across the SEO Assistant's own output belongs to AC-37.6.2,
 *          once that surface exists.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.1
 * ---
 */
import type { Field } from 'payload'

import { Pages } from '@/collections/Pages'
import { Stories } from '@/collections/Stories'

/** Every authored field-name spelling of a meta-keywords surface this guard rejects. */
const FORBIDDEN_FIELD_NAME = /^(meta[-_]?)?keywords$|^seo[-_]?keywords$/i

const FIELD_OWNERS: Array<{ label: string; fields: Field[] }> = [
  { label: 'Pages', fields: Pages.fields },
  { label: 'Stories', fields: Stories.fields },
]

/** Collects every field name in a field tree, descending through arrays, groups, rows, collapsibles and tabs. */
function collectFieldNames(fields: Field[], out: string[] = []): string[] {
  for (const field of fields) {
    if ('name' in field && typeof field.name === 'string') {
      out.push(field.name)
    }
    if ('fields' in field && Array.isArray(field.fields)) {
      collectFieldNames(field.fields as Field[], out)
    }
    if ('tabs' in field && Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        collectFieldNames(tab.fields as Field[], out)
      }
    }
  }
  return out
}

function keywordFieldOffenders(fields: Field[]): string[] {
  return collectFieldNames(fields).filter((name) => FORBIDDEN_FIELD_NAME.test(name))
}

describe('AC-37.6.1: no meta-keywords field exists on Pages or Stories', () => {
  it('walks a non-trivial number of fields, so the walker itself is not silently empty', () => {
    const total = FIELD_OWNERS.reduce((count, owner) => count + collectFieldNames(owner.fields).length, 0)
    expect(total).toBeGreaterThan(15)
  })

  it.each(FIELD_OWNERS.map((owner) => [owner.label, owner.fields] as const))(
    '%s carries no keywords/metaKeywords/seoKeywords field, at any nesting depth',
    (_label, fields) => {
      expect(keywordFieldOffenders(fields)).toEqual([])
    },
  )

  it('self-test: the walker actually catches a planted keywords field on a Stories-shaped nested array, proving the guard is not vacuous', () => {
    const planted: Field[] = [
      { name: 'title', type: 'text' },
      {
        name: 'sections',
        type: 'array',
        fields: [
          { name: 'sectionHeading', type: 'text' },
          { name: 'metaKeywords', type: 'text' },
        ],
      },
    ]
    expect(keywordFieldOffenders(planted)).toEqual(['metaKeywords'])
  })

  it('self-test: catches the bare `keywords` spelling too, not only `metaKeywords`', () => {
    const planted: Field[] = [{ name: 'keywords', type: 'text' }]
    expect(keywordFieldOffenders(planted)).toEqual(['keywords'])
  })
})
