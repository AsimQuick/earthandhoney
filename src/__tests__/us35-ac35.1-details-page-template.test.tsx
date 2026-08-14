/**
 * ---
 * file: src/__tests__/us35-ac35.1-details-page-template.test.tsx
 * project: earthandhoney
 * purpose: AC-35.1 — proves DetailsPageTemplate renders the PRD §13.4 order
 *          exactly (minimal H1, optional one-line introduction, full-width
 *          masonry placement, inquiry-form-region slot, footer — the footer
 *          via PublicShell, composed here to prove the full order including
 *          it), that the introduction is optional while the masonry
 *          placement and inquiry-form-region slot are always present, and
 *          that no second nav/footer is rendered by the template itself.
 *          Mirrors us31-ac31.3-standard-page-template.test.tsx and
 *          us34-ac34.1-homepage-template.test.tsx's own structure/order and
 *          style-drift checks.
 * created-by: dev-team
 * related-story: US-35
 * related-ac: 35.1
 * ---
 */
import { render } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import { renderToStaticMarkup } from 'react-dom/server'

import { PublicShell } from '@/components/layout/PublicShell'
import { DetailsPageTemplate } from '@/components/page-template/DetailsPageTemplate'
import { detectStyleDrift } from '@/lib/style-guard/detectStyleDrift'
import { detectNonTokenTailwindClasses } from '@/lib/style-guard/detectNonTokenTailwindClasses'

const ROOT = process.cwd()
const TEMPLATE_PATH = 'src/components/page-template/DetailsPageTemplate.tsx'
const templateSource = fs.readFileSync(path.join(ROOT, TEMPLATE_PATH), 'utf8')

describe('US-35 AC-35.1: DetailsPageTemplate renders the PRD §13.4 order', () => {
  it('renders the H1, introduction, masonry placement and inquiry-form-region slot in that order', () => {
    const { container } = render(
      <DetailsPageTemplate
        heading="Rings and details"
        oneLineIntroduction="The small things, up close."
        masonryPlacement={<div data-testid="masonry-stub">masonry</div>}
        inquiryFormRegion={<div data-testid="inquiry-form-stub">form goes here</div>}
      />,
    )

    const article = container.querySelector('[data-testid="details-page-template"]')
    expect(article).not.toBeNull()

    const testIdsInOrder = Array.from(article!.querySelectorAll('[data-testid]')).map((el) =>
      el.getAttribute('data-testid'),
    )

    const topLevelOrder = testIdsInOrder.filter((id) =>
      [
        'details-heading',
        'details-introduction',
        'details-masonry-placement',
        'details-inquiry-form-region',
      ].includes(id as string),
    )
    expect(topLevelOrder).toEqual([
      'details-heading',
      'details-introduction',
      'details-masonry-placement',
      'details-inquiry-form-region',
    ])
  })

  it('always renders the masonry placement, even with no introduction', () => {
    render(
      <DetailsPageTemplate heading="Rings" masonryPlacement={<div data-testid="masonry-stub">masonry</div>} />,
    )
    expect(document.querySelector('[data-testid="details-masonry-placement"]')?.textContent).toBe('masonry')
  })

  it('omits the introduction region when not provided — it is optional per PRD §13.4', () => {
    render(<DetailsPageTemplate heading="Rings" masonryPlacement={<div />} />)
    expect(document.querySelector('[data-testid="details-introduction"]')).toBeNull()
  })

  it('renders the introduction text when provided', () => {
    render(<DetailsPageTemplate heading="Rings" oneLineIntroduction="Up close." masonryPlacement={<div />} />)
    expect(document.querySelector('[data-testid="details-introduction"]')?.textContent).toBe('Up close.')
  })

  it('renders the minimal H1 heading text', () => {
    render(<DetailsPageTemplate heading="Rings and details" masonryPlacement={<div />} />)
    expect(document.querySelector('[data-testid="details-heading"]')?.textContent).toBe('Rings and details')
  })

  it('always renders the inquiry-form-region slot, even with no content — a slot filled by whatever route uses this template', () => {
    render(<DetailsPageTemplate heading="Rings" masonryPlacement={<div />} />)
    const region = document.querySelector('[data-testid="details-inquiry-form-region"]')
    expect(region).not.toBeNull()
    expect(region?.textContent).toBe('')
  })

  it('renders inquiry-form-region content when the slot is filled', () => {
    render(
      <DetailsPageTemplate
        heading="Rings"
        masonryPlacement={<div />}
        inquiryFormRegion={<span>Contact us</span>}
      />,
    )
    expect(document.querySelector('[data-testid="details-inquiry-form-region"]')?.textContent).toBe(
      'Contact us',
    )
  })

  it('the footer renders after the template — owned once by PublicShell/SiteFooter, not duplicated here', () => {
    const html = renderToStaticMarkup(
      <PublicShell>
        <DetailsPageTemplate heading="Rings" masonryPlacement={<div data-testid="only-placement" />} />
      </PublicShell>,
    )
    const templateIndex = html.indexOf('data-testid="details-page-template"')
    const footerIndex = html.indexOf('data-testid="site-footer"')
    expect(templateIndex).toBeGreaterThan(-1)
    expect(footerIndex).toBeGreaterThan(-1)
    expect(footerIndex).toBeGreaterThan(templateIndex)
  })

  it('does not itself render a <nav> or a second <footer>', () => {
    const html = renderToStaticMarkup(<DetailsPageTemplate heading="Rings" masonryPlacement={<div />} />)
    expect(html).not.toMatch(/<nav/)
    expect(html).not.toMatch(/<footer/)
  })
})

describe('US-35 AC-35.1: no raw hex colour, raw px font-size, or arbitrary Tailwind bracket (reusing US-23 AC-23.7)', () => {
  it('introduces zero hex/px-font-size/arbitrary-bracket violations', () => {
    expect(detectStyleDrift(templateSource)).toEqual([])
  })
})

describe('US-35 AC-35.1: every Tailwind class is token-backed or purely structural (reusing US-31 AC-31.3 guard)', () => {
  it('introduces zero non-token utility classes', () => {
    expect(detectNonTokenTailwindClasses(templateSource)).toEqual([])
  })
})
