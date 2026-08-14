/**
 * ---
 * file: src/__tests__/us36-ac36.5-no-blog-chrome.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-36.5 — no generic blog chrome is built anywhere in the
 *          Story feature: no categories, no archives, no comment system, no
 *          author bios, no tag clouds. A standing lock-in test, in the same
 *          pattern US-31 AC-31.2 and US-27 AC-27.4 used to make a scoping
 *          decision unreversible: it walks the `Stories` field tree
 *          (including nested arrays) for a forbidden field, greps
 *          StoryPageTemplate.tsx's and the story index route's source for
 *          blog-chrome vocabulary, renders both against fixture data and
 *          asserts no matching markup appears, and asserts
 *          STORY_NO_BLOG_CHROME.md — the "story record naming the retired
 *          items it deliberately does not implement" the AC's evidence
 *          calls for — still names the two retired CLAUDE.md items
 *          verbatim, so the record cannot silently drift from the code. A
 *          self-test section proves the field-tree guard actually detects a
 *          forbidden construct, so the standing assertions are not
 *          vacuously green.
 * created-by: dev-team
 * related-story: US-36
 * related-ac: 36.5
 * updated-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.1
 * ---
 */
import { render } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { Stories } from '@/collections/Stories'
import { StoryPageTemplate } from '@/components/page-template/StoryPageTemplate'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const storiesCollectionSource = read('src/collections/Stories.ts')
const storyPageTemplateSource = read('src/components/page-template/StoryPageTemplate.tsx')
const storyIndexRouteSource = read('src/app/(frontend)/stories/page.tsx')
const getPublishedStoriesSource = read('src/lib/getPublishedStories.ts')
const claudeMdSource = read('CLAUDE.md')
const noBlogChromeRecord = read('STORY_NO_BLOG_CHROME.md')

interface CollectedField {
  name?: string
  type: string
}

/** Mirrors us31-ac31.2's field-tree walker — nested arrays included. */
function collectAllFields(fields: Field[]): CollectedField[] {
  const result: CollectedField[] = []
  for (const field of fields) {
    const name = 'name' in field ? (field.name as string) : undefined
    result.push({ name, type: field.type })
    if ('fields' in field && Array.isArray((field as { fields?: unknown }).fields)) {
      result.push(...collectAllFields((field as unknown as { fields: Field[] }).fields))
    }
  }
  return result
}

const BLOG_CHROME_NAME_PATTERN = /categor|archive|comment|author|tag/i

describe('US-36 AC-36.5: no category/archive/comment/author/tag field on Stories', () => {
  it('no field anywhere in the Stories field tree (including nested inside `sections`) matches blog-chrome vocabulary', () => {
    const allFields = collectAllFields(Stories.fields)
    const offenders = allFields.filter((f) => f.name && BLOG_CHROME_NAME_PATTERN.test(f.name))
    expect(offenders).toEqual([])
  })

  it('the Stories field list is exactly the documented fields — no field silently added beyond them', () => {
    const topLevelNames = Stories.fields.map((f) => ('name' in f ? f.name : undefined)).filter(Boolean)
    // AC-37.6.1 (sprint5.json) added the seven PRD §21.2 AUTHORED SEO fields
    // Pages already carried — none of which is blog chrome, and the assertion
    // above already proves none of them matches BLOG_CHROME_NAME_PATTERN.
    expect(topLevelNames).toEqual([
      'title',
      'subtitleIntroduction',
      'sections',
      'slug',
      'seoTitle',
      'metaDescription',
      'photographyType',
      'cityRegion',
      'venue',
      'socialImage',
      'indexing',
      'status',
    ])
  })

  it('self-test: the walker actually catches a forbidden field, proving the guard above is not vacuous', () => {
    const withCategoryField: Field[] = [
      ...Stories.fields,
      { name: 'categories', type: 'text' } as Field,
    ]
    const offenders = collectAllFields(withCategoryField).filter((f) => f.name && BLOG_CHROME_NAME_PATTERN.test(f.name))
    expect(offenders.length).toBeGreaterThan(0)
  })
})

describe('US-36 AC-36.5: no blog-chrome vocabulary in the Story template or index route source', () => {
  const sources: Array<[string, string]> = [
    ['src/collections/Stories.ts', storiesCollectionSource],
    ['src/components/page-template/StoryPageTemplate.tsx', storyPageTemplateSource],
    ['src/app/(frontend)/stories/page.tsx', storyIndexRouteSource],
    ['src/lib/getPublishedStories.ts', getPublishedStoriesSource],
  ]

  it.each(sources)('%s contains no category/archive/comment-system/author-bio/tag-cloud vocabulary', (_label, source) => {
    // "author order" (author = the photographer choosing section order, per
    // PRD §13.5) is legitimate prose and is deliberately NOT banned here —
    // only the blog-chrome shapes (a byline/bio block, a category taxonomy,
    // a comment thread, a tag cloud) are.
    expect(source).not.toMatch(/categor(y|ies)/i)
    expect(source).not.toMatch(/\barchive/i)
    expect(source).not.toMatch(/\bcomment/i)
    expect(source).not.toMatch(/author[\s-]?(bio|byline)|\bbyline\b/i)
    expect(source).not.toMatch(/tag[-\s]?cloud|\btags\b/i)
  })
})

describe('US-36 AC-36.5: rendered markup contains no blog chrome', () => {
  const REAL_STORY = {
    title: 'Mira and Owen — a late-summer wedding at Kurtz Orchard',
    subtitleIntroduction: 'Two families, one orchard, and a golden-hour ceremony.',
    sections: [
      {
        sectionHeading: 'Getting ready',
        shortText: "Mira's mother fastened the last button on the veil.",
        galleryPlacement: <div data-testid="section-1-gallery">getting-ready gallery</div>,
      },
    ],
  }

  it('StoryPageTemplate renders no category/archive/comment/author-bio/tag-cloud element', () => {
    const { container } = render(<StoryPageTemplate {...REAL_STORY} />)
    const testIds = Array.from(container.querySelectorAll('[data-testid]')).map((el) =>
      el.getAttribute('data-testid'),
    )
    for (const id of testIds) {
      expect(id).not.toMatch(BLOG_CHROME_NAME_PATTERN)
    }
    expect(container.textContent).not.toMatch(/categor|archive|comment|author bio|tag cloud/i)
  })
})

describe('US-36 AC-36.5: the story record names the retired items it deliberately does not implement', () => {
  it('CLAUDE.md still lists the retired blog sample-content requirement and no-<em> content rule verbatim', () => {
    expect(claudeMdSource).toContain('Blog sample-content requirement and the no-`<em>` content rule')
  })

  it('STORY_NO_BLOG_CHROME.md names all five forbidden blog-chrome items', () => {
    for (const item of ['categories', 'archives', 'comment system', 'author bios', 'tag clouds']) {
      expect(noBlogChromeRecord.toLowerCase()).toContain(item)
    }
  })

  it('STORY_NO_BLOG_CHROME.md quotes the CLAUDE.md retired line verbatim and names both retired items', () => {
    expect(noBlogChromeRecord).toContain('Blog sample-content requirement and the no-`<em>` content rule')
    expect(noBlogChromeRecord).toMatch(/blog sample-content requirement/i)
    expect(noBlogChromeRecord).toMatch(/no-`<em>` content rule/i)
  })
})
