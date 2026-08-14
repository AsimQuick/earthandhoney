/**
 * ---
 * file: src/__tests__/us36-ac36.3-heading-hierarchy.test.tsx
 * project: earthandhoney
 * purpose: AC-36.3 evidence — asserts the heading hierarchy StoryPageTemplate
 *          (src/components/page-template/StoryPageTemplate.tsx, AC-36.1)
 *          produces in real rendered HTML is generated automatically and
 *          correctly regardless of section count: exactly one `<h1>` (the
 *          story title), every section heading at `<h2>`, and no skipped
 *          heading level, checked against both a one-section story and a
 *          five-section story — the two counts AC-36.3 names explicitly.
 *          Mirrors us31-ac31.6-live-seo-metadata.test.ts's heading-level
 *          parsing technique, applied here at the component-render level
 *          (renderToStaticMarkup) rather than a live server boot, matching
 *          AC-36.1/AC-36.2's established UNIT-lane evidence pattern for this
 *          template.
 * created-by: dev-team
 * related-story: US-36
 * related-ac: 36.3
 * ---
 */
import { renderToStaticMarkup } from 'react-dom/server'

import { StoryPageTemplate, type StoryPageTemplateSection } from '@/components/page-template/StoryPageTemplate'

/** Every `<h1>`-`<h6>` opening-tag level, in document order. */
function headingLevels(html: string): number[] {
  return Array.from(html.matchAll(/<h([1-6])[ >]/g)).map((match) => Number(match[1]))
}

/** True when no heading level jumps more than one deeper than the deepest level seen so far. */
function hasNoSkippedHeadingLevel(levels: number[]): boolean {
  let deepestSeen = 0
  for (const level of levels) {
    if (level > deepestSeen + 1) {
      return false
    }
    deepestSeen = Math.max(deepestSeen, level)
  }
  return true
}

function makeSection(index: number): StoryPageTemplateSection {
  return {
    sectionHeading: `Section heading ${index + 1}`,
    shortText: `Short text for section ${index + 1}.`,
    galleryPlacement: <div data-testid={`section-${index + 1}-gallery`}>gallery {index + 1}</div>,
  }
}

const ONE_SECTION_STORY = {
  title: 'A single-section story',
  subtitleIntroduction: 'One section, one gallery.',
  sections: [makeSection(0)],
}

const FIVE_SECTION_STORY = {
  title: 'A five-section story',
  subtitleIntroduction: 'Five sections, five galleries.',
  sections: Array.from({ length: 5 }, (_, index) => makeSection(index)),
}

describe('US-36 AC-36.3: heading hierarchy is generated correctly and automatically', () => {
  it('a one-section story renders exactly one h1 and exactly one h2, with no skipped level', () => {
    const html = renderToStaticMarkup(<StoryPageTemplate {...ONE_SECTION_STORY} />)
    const levels = headingLevels(html)

    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    expect(levels.filter((level) => level === 2)).toHaveLength(1)
    expect(levels.filter((level) => level > 2)).toHaveLength(0)
    expect(hasNoSkippedHeadingLevel(levels)).toBe(true)
  })

  it('a five-section story renders exactly one h1 and exactly five h2s, with no skipped level', () => {
    const html = renderToStaticMarkup(<StoryPageTemplate {...FIVE_SECTION_STORY} />)
    const levels = headingLevels(html)

    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    expect(levels.filter((level) => level === 2)).toHaveLength(5)
    expect(levels.filter((level) => level > 2)).toHaveLength(0)
    expect(hasNoSkippedHeadingLevel(levels)).toBe(true)
  })

  it('the h1 is the story title and precedes every section h2, in both the one- and five-section case', () => {
    for (const story of [ONE_SECTION_STORY, FIVE_SECTION_STORY]) {
      const html = renderToStaticMarkup(<StoryPageTemplate {...story} />)
      const h1Match = /<h1[^>]*>([^<]*)<\/h1>/.exec(html)
      expect(h1Match?.[1]).toBe(story.title)

      const h1Index = html.indexOf('<h1')
      const h2Indices = Array.from(html.matchAll(/<h2[ >]/g)).map((match) => match.index ?? -1)
      expect(h2Indices).toHaveLength(story.sections.length)
      h2Indices.forEach((h2Index) => expect(h2Index).toBeGreaterThan(h1Index))
    }
  })

  it('each section heading is rendered as its own h2, matching its authored text, regardless of section count', () => {
    for (const story of [ONE_SECTION_STORY, FIVE_SECTION_STORY]) {
      const html = renderToStaticMarkup(<StoryPageTemplate {...story} />)
      const h2Texts = Array.from(html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)).map((match) => match[1])
      expect(h2Texts).toEqual(story.sections.map((section) => section.sectionHeading))
    }
  })
})
