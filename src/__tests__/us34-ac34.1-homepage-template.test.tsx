/**
 * ---
 * file: src/__tests__/us34-ac34.1-homepage-template.test.tsx
 * project: earthandhoney
 * purpose: AC-34.1 — proves HomePageTemplate renders the PRD §13.2 order
 *          exactly (full-width hero slideshow placement, optional short
 *          introduction, selected galleries or stories, primary inquiry
 *          form region — the surrounding navigation/footer via PublicShell,
 *          composed here to prove the full order including both), that the
 *          introduction and selected-galleries content are optional, and
 *          that selection order is preserved. Reuses the US-23 AC-23.7
 *          detector to confirm this new file introduces no raw hex colour,
 *          raw px font-size, or arbitrary Tailwind bracket, mirroring
 *          us31-ac31.3-standard-page-template.test.tsx's own inline check.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.1
 * ---
 */
import { render } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import { renderToStaticMarkup } from 'react-dom/server'

import { PublicShell } from '@/components/layout/PublicShell'
import { HomePageTemplate } from '@/components/page-template/HomePageTemplate'
import { detectStyleDrift } from '@/lib/style-guard/detectStyleDrift'

const ROOT = process.cwd()
const TEMPLATE_PATH = 'src/components/page-template/HomePageTemplate.tsx'
const templateSource = fs.readFileSync(path.join(ROOT, TEMPLATE_PATH), 'utf8')

describe('US-34 AC-34.1: HomePageTemplate renders the PRD §13.2 order', () => {
  it('renders the hero placement, introduction, selected galleries and inquiry-form-region slot in that order', () => {
    const { container } = render(
      <HomePageTemplate
        heroSlideshowPlacement={<div data-testid="hero-stub">hero</div>}
        shortIntroduction="A short introduction to the studio."
        selectedGalleriesOrStories={[
          <div key="a" data-testid="selection-a" />,
          <div key="b" data-testid="selection-b" />,
        ]}
        inquiryFormRegion={<div data-testid="inquiry-form-stub">form goes here</div>}
      />,
    )

    const root = container.querySelector('[data-testid="home-page-template"]')
    expect(root).not.toBeNull()

    const testIdsInOrder = Array.from(root!.querySelectorAll('[data-testid]')).map((el) =>
      el.getAttribute('data-testid'),
    )

    const topLevelOrder = testIdsInOrder.filter((id) =>
      [
        'home-hero-slideshow-placement',
        'home-introduction',
        'home-selected-galleries',
        'home-inquiry-form-region',
      ].includes(id as string),
    )
    expect(topLevelOrder).toEqual([
      'home-hero-slideshow-placement',
      'home-introduction',
      'home-selected-galleries',
      'home-inquiry-form-region',
    ])
  })

  it('always renders the hero slideshow placement, even with no introduction or selections', () => {
    render(<HomePageTemplate heroSlideshowPlacement={<div data-testid="hero-stub">hero</div>} />)
    expect(document.querySelector('[data-testid="home-hero-slideshow-placement"]')?.textContent).toBe(
      'hero',
    )
  })

  it('omits the introduction region when not provided — it is optional per PRD §13.2', () => {
    render(<HomePageTemplate heroSlideshowPlacement={<div />} />)
    expect(document.querySelector('[data-testid="home-introduction"]')).toBeNull()
  })

  it('renders the introduction text when provided', () => {
    render(<HomePageTemplate heroSlideshowPlacement={<div />} shortIntroduction="Hello there." />)
    expect(document.querySelector('[data-testid="home-introduction"]')?.textContent).toBe('Hello there.')
  })

  it('preserves selected-gallery order and renders every selection', () => {
    render(
      <HomePageTemplate
        heroSlideshowPlacement={<div />}
        selectedGalleriesOrStories={[
          <div key="first" data-testid="selection-first" />,
          <div key="second" data-testid="selection-second" />,
          <div key="third" data-testid="selection-third" />,
        ]}
      />,
    )

    const selections = Array.from(document.querySelectorAll('[data-testid="home-selected-gallery"]'))
    expect(selections).toHaveLength(3)
    expect(selections[0].querySelector('[data-testid="selection-first"]')).not.toBeNull()
    expect(selections[1].querySelector('[data-testid="selection-second"]')).not.toBeNull()
    expect(selections[2].querySelector('[data-testid="selection-third"]')).not.toBeNull()
  })

  it('always renders the inquiry-form-region slot, even with no content — a slot filled by whatever route uses this template', () => {
    render(<HomePageTemplate heroSlideshowPlacement={<div />} />)
    const region = document.querySelector('[data-testid="home-inquiry-form-region"]')
    expect(region).not.toBeNull()
    expect(region?.textContent).toBe('')
  })

  it('renders inquiry-form-region content when the slot is filled', () => {
    render(
      <HomePageTemplate heroSlideshowPlacement={<div />} inquiryFormRegion={<span>Contact us</span>} />,
    )
    expect(document.querySelector('[data-testid="home-inquiry-form-region"]')?.textContent).toBe(
      'Contact us',
    )
  })

  it('navigation renders before, and the footer after, the template — both owned once by PublicShell', () => {
    const html = renderToStaticMarkup(
      <PublicShell navItems={[{ label: 'Weddings', href: '/weddings' }]}>
        <HomePageTemplate heroSlideshowPlacement={<div data-testid="hero-stub" />} />
      </PublicShell>,
    )
    const navIndex = html.indexOf('data-testid="primary-nav"')
    const templateIndex = html.indexOf('data-testid="home-page-template"')
    const footerIndex = html.indexOf('data-testid="site-footer"')

    expect(navIndex).toBeGreaterThan(-1)
    expect(templateIndex).toBeGreaterThan(-1)
    expect(footerIndex).toBeGreaterThan(-1)
    expect(navIndex).toBeLessThan(templateIndex)
    expect(footerIndex).toBeGreaterThan(templateIndex)
  })

  it('does not itself render a <nav> or a <footer> — both are PublicShell/SiteFooter/VerticalMenu\'s concern', () => {
    const html = renderToStaticMarkup(<HomePageTemplate heroSlideshowPlacement={<div />} />)
    expect(html).not.toMatch(/<nav/)
    expect(html).not.toMatch(/<footer/)
  })
})

describe('US-34 AC-34.1: no raw hex colour, raw px font-size, or arbitrary Tailwind bracket (reusing US-23 AC-23.7)', () => {
  it('introduces zero hex/px-font-size/arbitrary-bracket violations', () => {
    expect(detectStyleDrift(templateSource)).toEqual([])
  })
})
