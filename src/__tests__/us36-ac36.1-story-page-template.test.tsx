/**
 * ---
 * file: src/__tests__/us36-ac36.1-story-page-template.test.tsx
 * project: earthandhoney
 * purpose: AC-36.1 evidence — proves StoryPageTemplate renders the PRD
 *          §13.5 order exactly (title, subtitle/introduction, the
 *          repeating section group in author order, inquiry-form-region
 *          slot, footer via PublicShell), by rendering one real story (a
 *          three-section wedding story with realistic copy) end to end.
 *          Mirrors us35-ac35.1-details-page-template.test.tsx's structure
 *          and style-drift checks.
 * created-by: dev-team
 * related-story: US-36
 * related-ac: 36.1
 * ---
 */
import { render } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import { renderToStaticMarkup } from 'react-dom/server'

import { PublicShell } from '@/components/layout/PublicShell'
import { StoryPageTemplate } from '@/components/page-template/StoryPageTemplate'
import { detectNonTokenTailwindClasses } from '@/lib/style-guard/detectNonTokenTailwindClasses'
import { detectStyleDrift } from '@/lib/style-guard/detectStyleDrift'

const ROOT = process.cwd()
const TEMPLATE_PATH = 'src/components/page-template/StoryPageTemplate.tsx'
const templateSource = fs.readFileSync(path.join(ROOT, TEMPLATE_PATH), 'utf8')

// AC-36.1's "one real story rendered" evidence — a real wedding story, not
// synthetic placeholder copy, per PRD §13.5's "Stories should be based on
// real weddings, venues, cultural details, suppliers, and experiences."
const REAL_STORY = {
  title: 'Mira and Owen — a late-summer wedding at Kurtz Orchard',
  subtitleIntroduction:
    'Two families, one orchard, and a golden-hour ceremony under the pear trees at Kurtz Orchard, Niagara-on-the-Lake.',
  sections: [
    {
      sectionHeading: 'Getting ready',
      shortText: "Mira's mother fastened the last button on the veil in the same room her own mother once did.",
      galleryPlacement: <div data-testid="section-1-gallery">getting-ready gallery</div>,
    },
    {
      sectionHeading: 'The ceremony',
      shortText: 'Vows were exchanged beneath the pear trees as the light dropped low across the rows.',
      galleryPlacement: <div data-testid="section-2-gallery">ceremony gallery</div>,
    },
    {
      sectionHeading: 'The reception',
      shortText: 'Long tables ran the length of the barn, lit end to end with candlelight.',
      galleryPlacement: <div data-testid="section-3-gallery">reception gallery</div>,
    },
  ],
}

describe('US-36 AC-36.1: StoryPageTemplate renders the PRD §13.5 order for a real story', () => {
  it('renders the title, subtitle/introduction, sections, and inquiry-form-region slot in that order', () => {
    const { container } = render(
      <StoryPageTemplate
        {...REAL_STORY}
        inquiryFormRegion={<div data-testid="inquiry-form-stub">form goes here</div>}
      />,
    )

    const article = container.querySelector('[data-testid="story-page-template"]')
    expect(article).not.toBeNull()

    const testIdsInOrder = Array.from(article!.querySelectorAll('[data-testid]')).map((el) =>
      el.getAttribute('data-testid'),
    )

    const topLevelOrder = testIdsInOrder.filter((id) =>
      ['story-title', 'story-subtitle-introduction', 'story-sections', 'story-inquiry-form-region'].includes(
        id as string,
      ),
    )
    expect(topLevelOrder).toEqual([
      'story-title',
      'story-subtitle-introduction',
      'story-sections',
      'story-inquiry-form-region',
    ])
  })

  it('renders the title text', () => {
    render(<StoryPageTemplate {...REAL_STORY} />)
    expect(document.querySelector('[data-testid="story-title"]')?.textContent).toBe(REAL_STORY.title)
  })

  it('renders the subtitle/introduction text', () => {
    render(<StoryPageTemplate {...REAL_STORY} />)
    expect(document.querySelector('[data-testid="story-subtitle-introduction"]')?.textContent).toBe(
      REAL_STORY.subtitleIntroduction,
    )
  })

  it('omits the subtitle/introduction region when not provided — optional per PRD §13.5', () => {
    render(<StoryPageTemplate title="A story" sections={REAL_STORY.sections} />)
    expect(document.querySelector('[data-testid="story-subtitle-introduction"]')).toBeNull()
  })

  it('renders all three real sections, each with heading, short text, and a gallery placement, in author order', () => {
    render(<StoryPageTemplate {...REAL_STORY} />)
    const sectionEls = document.querySelectorAll('[data-testid="story-section"]')
    expect(sectionEls).toHaveLength(3)

    sectionEls.forEach((sectionEl, index) => {
      const expected = REAL_STORY.sections[index]
      expect(sectionEl.querySelector('[data-testid="story-section-heading"]')?.textContent).toBe(
        expected.sectionHeading,
      )
      expect(sectionEl.querySelector('[data-testid="story-section-short-text"]')?.textContent).toBe(
        expected.shortText,
      )
      expect(sectionEl.querySelector('[data-testid="story-section-gallery-placement"]')?.textContent).toContain(
        (expected.galleryPlacement as { props: { children: string } }).props.children,
      )
    })
  })

  it('always renders the inquiry-form-region slot, even with no content — a slot filled by whatever route uses this template', () => {
    render(<StoryPageTemplate {...REAL_STORY} />)
    const region = document.querySelector('[data-testid="story-inquiry-form-region"]')
    expect(region).not.toBeNull()
    expect(region?.textContent).toBe('')
  })

  it('renders inquiry-form-region content when the slot is filled', () => {
    render(<StoryPageTemplate {...REAL_STORY} inquiryFormRegion={<span>Contact us</span>} />)
    expect(document.querySelector('[data-testid="story-inquiry-form-region"]')?.textContent).toBe('Contact us')
  })

  it('the footer renders after the template — owned once by PublicShell/SiteFooter, not duplicated here', () => {
    const html = renderToStaticMarkup(
      <PublicShell>
        <StoryPageTemplate {...REAL_STORY} />
      </PublicShell>,
    )
    const templateIndex = html.indexOf('data-testid="story-page-template"')
    const footerIndex = html.indexOf('data-testid="site-footer"')
    expect(templateIndex).toBeGreaterThan(-1)
    expect(footerIndex).toBeGreaterThan(-1)
    expect(footerIndex).toBeGreaterThan(templateIndex)
  })

  it('does not itself render a <nav> or a second <footer>', () => {
    const html = renderToStaticMarkup(<StoryPageTemplate {...REAL_STORY} />)
    expect(html).not.toMatch(/<nav/)
    expect(html).not.toMatch(/<footer/)
  })
})

describe('US-36 AC-36.1: no raw hex colour, raw px font-size, or arbitrary Tailwind bracket (reusing US-23 AC-23.7)', () => {
  it('introduces zero hex/px-font-size/arbitrary-bracket violations', () => {
    expect(detectStyleDrift(templateSource)).toEqual([])
  })
})

describe('US-36 AC-36.1: every Tailwind class is token-backed or purely structural (reusing US-31 AC-31.3 guard)', () => {
  it('introduces zero non-token utility classes', () => {
    expect(detectNonTokenTailwindClasses(templateSource)).toEqual([])
  })
})
