/**
 * ---
 * file: src/__tests__/us31-ac31.2-pages-no-layout-builder-lock-in.test.ts
 * project: earthandhoney
 * purpose: Verify AC-31.2 — a standing lock-in test, in the same pattern
 *          US-27 AC-27.4 used to make a scoping decision unreversible
 *          (`vendor/picpeak/backend/__tests__/routes/cmsStaysEnabled.test.js`),
 *          that fails the moment a `blocks` field, a free-text CSS/style
 *          field, or a margin/padding/position control is added anywhere on
 *          the Payload `Pages` collection — including nested inside a
 *          group, array, tab or block. This protects CLAUDE.md Pillar 3
 *          (deterministic beauty) and its explicitly retired non-goal:
 *          "No drag-and-drop page builder". A self-test section proves the
 *          guard actually detects each forbidden construct, so the standing
 *          assertions are not vacuously green.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.2
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { Pages } from '@/collections/Pages'

const FILE_PATH = path.join(process.cwd(), 'src/collections/Pages.ts')
const fileSource = fs.readFileSync(FILE_PATH, 'utf8')
const CLAUDE_MD_PATH = path.join(process.cwd(), 'CLAUDE.md')
const claudeMdSource = fs.readFileSync(CLAUDE_MD_PATH, 'utf8')

interface CollectedField {
  name?: string
  type: string
}

/**
 * Walks a Payload field tree — including nested `fields` (group/array),
 * `tabs[].fields` and `blocks[].fields` — so a forbidden construct hidden
 * inside a nested structure is caught, not just a top-level field.
 */
function collectAllFields(fields: Field[]): CollectedField[] {
  const result: CollectedField[] = []
  for (const field of fields) {
    const name = 'name' in field ? (field.name as string) : undefined
    result.push({ name, type: field.type })

    if ('fields' in field && Array.isArray((field as { fields?: unknown }).fields)) {
      result.push(...collectAllFields((field as unknown as { fields: Field[] }).fields))
    }
    if ('tabs' in field && Array.isArray((field as { tabs?: unknown }).tabs)) {
      for (const tab of (field as unknown as { tabs: Array<{ fields?: Field[] }> }).tabs) {
        if (Array.isArray(tab.fields)) result.push(...collectAllFields(tab.fields))
      }
    }
    if ('blocks' in field && Array.isArray((field as { blocks?: unknown }).blocks)) {
      for (const block of (field as unknown as { blocks: Array<{ fields?: Field[] }> }).blocks) {
        if (Array.isArray(block.fields)) result.push(...collectAllFields(block.fields))
      }
    }
  }
  return result
}

const CSS_STYLE_NAME_PATTERN = /css|style/i
const MARGIN_PADDING_POSITION_PATTERN = /margin|padding|position|z-?index/i

interface LayoutBuilderViolations {
  blocksTypeFields: CollectedField[]
  cssStyleFields: CollectedField[]
  marginPaddingPositionFields: CollectedField[]
}

/**
 * The AC-31.2 guard itself: a `blocks` field is Payload's drag-and-drop
 * layout-canvas primitive; a `code` field or a css/style-named field is a
 * free-text CSS/style escape hatch; a margin/padding/position/z-index-named
 * field is arbitrary positioning control. Any one of the three reintroduces
 * the retired "drag-and-drop page builder" non-goal.
 */
function findLayoutBuilderViolations(fields: Field[]): LayoutBuilderViolations {
  const all = collectAllFields(fields)
  return {
    blocksTypeFields: all.filter((f) => f.type === 'blocks'),
    cssStyleFields: all.filter((f) => f.type === 'code' || (f.name && CSS_STYLE_NAME_PATTERN.test(f.name))),
    marginPaddingPositionFields: all.filter((f) => f.name && MARGIN_PADDING_POSITION_PATTERN.test(f.name)),
  }
}

describe('US-31 AC-31.2: Pages has no drag-and-drop layout-builder construct', () => {
  const violations = findLayoutBuilderViolations(Pages.fields)

  it('has no `blocks` / layout-canvas field anywhere, including nested', () => {
    expect(violations.blocksTypeFields).toEqual([])
  })

  it('has no free-text CSS/style field anywhere, including nested', () => {
    expect(violations.cssStyleFields).toEqual([])
  })

  it('has no margin/padding/position/z-index control anywhere, including nested', () => {
    expect(violations.marginPaddingPositionFields).toEqual([])
  })

  it('names the retired non-goal it protects, in its own file header', () => {
    // Strip each line's leading `*` comment marker, then collapse whitespace,
    // so the assertion survives the header's own line wrapping.
    const normalizedSource = fileSource
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
    expect(normalizedSource).toMatch(/drag-and-drop page builder/i)
  })

  it('CLAUDE.md still states the retired non-goal this test locks in', () => {
    expect(claudeMdSource).toContain('No drag-and-drop page builder')
  })
})

describe('US-31 AC-31.2: the guard actually detects each forbidden construct (self-test)', () => {
  it('flags a top-level `blocks` field', () => {
    const mutated: Field[] = [...Pages.fields, { name: 'sections', type: 'blocks', blocks: [] } as unknown as Field]
    const violations = findLayoutBuilderViolations(mutated)
    expect(violations.blocksTypeFields).toEqual([{ name: 'sections', type: 'blocks' }])
  })

  it('flags a free-text CSS `code` field', () => {
    const mutated: Field[] = [...Pages.fields, { name: 'customCss', type: 'code' } as unknown as Field]
    const violations = findLayoutBuilderViolations(mutated)
    expect(violations.cssStyleFields).toEqual([{ name: 'customCss', type: 'code' }])
  })

  it('flags a css/style-named text field even if its type is not `code`', () => {
    const mutated: Field[] = [...Pages.fields, { name: 'inlineStyle', type: 'text' } as unknown as Field]
    const violations = findLayoutBuilderViolations(mutated)
    expect(violations.cssStyleFields).toEqual([{ name: 'inlineStyle', type: 'text' }])
  })

  it('flags a margin/padding/position-named control', () => {
    const mutated: Field[] = [...Pages.fields, { name: 'marginTop', type: 'number' } as unknown as Field]
    const violations = findLayoutBuilderViolations(mutated)
    expect(violations.marginPaddingPositionFields).toEqual([{ name: 'marginTop', type: 'number' }])
  })

  it('flags a forbidden field nested inside a group, not just at the top level', () => {
    const mutated: Field[] = [
      ...Pages.fields,
      {
        name: 'layout',
        type: 'group',
        fields: [{ name: 'position', type: 'text' }],
      } as unknown as Field,
    ]
    const violations = findLayoutBuilderViolations(mutated)
    expect(violations.marginPaddingPositionFields).toEqual([{ name: 'position', type: 'text' }])
  })

  it('flags a forbidden field nested inside a block definition', () => {
    const mutated: Field[] = [
      ...Pages.fields,
      {
        name: 'sections',
        type: 'blocks',
        blocks: [
          {
            slug: 'freeform',
            fields: [{ name: 'padding', type: 'number' }],
          },
        ],
      } as unknown as Field,
    ]
    const violations = findLayoutBuilderViolations(mutated)
    // Both the blocks field itself and the nested padding control are caught.
    expect(violations.blocksTypeFields).toEqual([{ name: 'sections', type: 'blocks' }])
    expect(violations.marginPaddingPositionFields).toEqual([{ name: 'padding', type: 'number' }])
  })
})
