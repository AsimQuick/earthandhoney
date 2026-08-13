/**
 * ---
 * file: src/__tests__/us31-ac31.3-standard-page-template.test.tsx
 * project: earthandhoney
 * purpose: AC-31.3 — proves StandardPageTemplate renders the PRD §13.3 order
 *          exactly (H1, short introduction, one or more gallery placements,
 *          optional structured text sections, inquiry-form-region slot,
 *          footer — the footer via PublicShell, composed here to prove the
 *          full order including it), and that the template introduces no
 *          raw colour/spacing/radius/font/breakpoint value: the shared
 *          US-23 AC-23.7 detector (hex / raw px font-size / arbitrary
 *          bracket) plus the new AC-31.3 allowlist guard
 *          (detectNonTokenTailwindClasses) both run against the component's
 *          own source, and a compiled-CSS assertion proves the named
 *          token-derived classes this component actually uses (`gap-lg`,
 *          `text-ink`, `font-display`, etc.) really do resolve to
 *          `var(--...)` token references rather than resting on an
 *          unverified assumption about Tailwind's `@theme` behaviour.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.3
 * ---
 */
import { render } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import postcss from 'postcss'
import { renderToStaticMarkup } from 'react-dom/server'

import { PublicShell } from '@/components/layout/PublicShell'
import { StandardPageTemplate } from '@/components/page-template/StandardPageTemplate'
import { detectStyleDrift } from '@/lib/style-guard/detectStyleDrift'
import { detectNonTokenTailwindClasses } from '@/lib/style-guard/detectNonTokenTailwindClasses'

const ROOT = process.cwd()
const TEMPLATE_PATH = 'src/components/page-template/StandardPageTemplate.tsx'
const templateSource = fs.readFileSync(path.join(ROOT, TEMPLATE_PATH), 'utf8')

describe('US-31 AC-31.3: StandardPageTemplate renders the PRD §13.3 order', () => {
  it('renders H1, introduction, gallery placements, structured text sections and the inquiry-form-region slot in that order', () => {
    const { container } = render(
      <StandardPageTemplate
        heading="A wedding in the hills"
        shortIntroduction="A short introduction to the day."
        galleryPlacements={[<div key="a" data-testid="placement-a" />, <div key="b" data-testid="placement-b" />]}
        structuredTextSections={[
          { heading: 'The morning', body: 'Getting ready.' },
          { heading: 'The ceremony', body: 'Vows exchanged.' },
        ]}
        inquiryFormRegion={<div data-testid="inquiry-form-stub">form goes here</div>}
      />,
    )

    const article = container.querySelector('[data-testid="standard-page-template"]')
    expect(article).not.toBeNull()

    const testIdsInOrder = Array.from(article!.querySelectorAll('[data-testid]')).map((el) =>
      el.getAttribute('data-testid'),
    )

    // Only the top-level slots, in the order PRD §13.3 specifies, ignoring
    // nested testids (individual placements/sections) which are checked for
    // internal order separately below.
    const topLevelOrder = testIdsInOrder.filter((id) =>
      [
        'page-heading',
        'page-introduction',
        'page-gallery-placements',
        'page-structured-text-sections',
        'page-inquiry-form-region',
      ].includes(id as string),
    )
    expect(topLevelOrder).toEqual([
      'page-heading',
      'page-introduction',
      'page-gallery-placements',
      'page-structured-text-sections',
      'page-inquiry-form-region',
    ])
  })

  it('preserves gallery-placement order and renders every placement', () => {
    render(
      <StandardPageTemplate
        heading="Heading"
        galleryPlacements={[
          <div key="first" data-testid="placement-first" />,
          <div key="second" data-testid="placement-second" />,
          <div key="third" data-testid="placement-third" />,
        ]}
      />,
    )

    const placements = Array.from(document.querySelectorAll('[data-testid="page-gallery-placement"]'))
    expect(placements).toHaveLength(3)
    expect(placements[0].querySelector('[data-testid="placement-first"]')).not.toBeNull()
    expect(placements[1].querySelector('[data-testid="placement-second"]')).not.toBeNull()
    expect(placements[2].querySelector('[data-testid="placement-third"]')).not.toBeNull()
  })

  it('renders the H1 heading text', () => {
    render(<StandardPageTemplate heading="A wedding in the hills" galleryPlacements={[<div key="a" />]} />)
    expect(document.querySelector('[data-testid="page-heading"]')?.textContent).toBe('A wedding in the hills')
  })

  it('omits the introduction and structured-text-sections regions when not provided — both are optional per PRD §13.3', () => {
    render(<StandardPageTemplate heading="Heading" galleryPlacements={[<div key="a" />]} />)
    expect(document.querySelector('[data-testid="page-introduction"]')).toBeNull()
    expect(document.querySelector('[data-testid="page-structured-text-sections"]')).toBeNull()
  })

  it('always renders the inquiry-form-region slot, even with no content — it is a slot in this story, filled by US-33', () => {
    render(<StandardPageTemplate heading="Heading" galleryPlacements={[<div key="a" />]} />)
    const region = document.querySelector('[data-testid="page-inquiry-form-region"]')
    expect(region).not.toBeNull()
    expect(region?.textContent).toBe('')
  })

  it('renders inquiry-form-region content when the slot is filled', () => {
    render(
      <StandardPageTemplate
        heading="Heading"
        galleryPlacements={[<div key="a" />]}
        inquiryFormRegion={<span>Contact us</span>}
      />,
    )
    expect(document.querySelector('[data-testid="page-inquiry-form-region"]')?.textContent).toBe('Contact us')
  })

  it('the footer renders after the template — owned once by PublicShell/SiteFooter, not duplicated here', () => {
    const html = renderToStaticMarkup(
      <PublicShell>
        <StandardPageTemplate heading="Heading" galleryPlacements={[<div key="a" data-testid="only-placement" />]} />
      </PublicShell>,
    )
    const templateIndex = html.indexOf('data-testid="standard-page-template"')
    const footerIndex = html.indexOf('data-testid="site-footer"')
    expect(templateIndex).toBeGreaterThan(-1)
    expect(footerIndex).toBeGreaterThan(-1)
    expect(footerIndex).toBeGreaterThan(templateIndex)
  })

  it('does not itself render a second <footer>', () => {
    const html = renderToStaticMarkup(
      <StandardPageTemplate heading="Heading" galleryPlacements={[<div key="a" />]} />,
    )
    expect(html).not.toMatch(/<footer/)
  })
})

describe('US-31 AC-31.3: no raw hex colour, raw px font-size, or arbitrary Tailwind bracket (reusing US-23 AC-23.7)', () => {
  const matches = detectStyleDrift(templateSource)

  it('introduces zero hex/px-font-size/arbitrary-bracket violations', () => {
    expect(matches).toEqual([])
  })
})

describe('US-31 AC-31.3: every Tailwind class is token-backed or purely structural (new style-guard extension)', () => {
  it('introduces zero non-token utility classes', () => {
    expect(detectNonTokenTailwindClasses(templateSource)).toEqual([])
  })

  it('the guard actually catches a non-token escape hatch (not vacuously green)', () => {
    expect(detectNonTokenTailwindClasses('<div className="py-8 rounded-2xl text-6xl">')).toEqual([
      'py-8',
      'rounded-2xl',
      'text-6xl',
    ])
  })

  it('the guard does not flag the token-backed and structural classes this template actually uses', () => {
    const used = [
      'flex',
      'flex-col',
      'gap-2xl',
      'bg-surface',
      'p-lg',
      'text-ink',
      'font-display',
      'text-3xl',
      'leading-tight',
      'text-lg',
      'leading-relaxed',
      'text-ink-secondary',
      'gap-lg',
      'gap-xl',
      'gap-sm',
      'text-xl',
      'leading-snug',
      'text-base',
    ]
    expect(detectNonTokenTailwindClasses(`<div className="${used.join(' ')}">`)).toEqual([])
  })
})

describe('US-31 AC-31.3: the token-derived classes this template uses really do compile to token references', () => {
  it('every class name the template actually uses compiles to a var(--...) declaration, not a bare/default Tailwind value', async () => {
    const tailwindPostcss = (await import('@tailwindcss/postcss')).default
    const tokensPath = path.join(ROOT, 'src/styles/tokens.css')

    // `flex`/`flex-col` are the only purely-structural (value-free)
    // classes this template uses — excluded here because they have no
    // token to compile to by design, not because they're unchecked.
    const STRUCTURAL_ONLY = new Set(['flex', 'flex-col'])
    const probeClasses = Array.from(templateSource.matchAll(/className=(?:"([^"]*)")/g))
      .flatMap((match) => match[1].split(/\s+/))
      .filter(Boolean)
      .filter((cls) => !STRUCTURAL_ONLY.has(cls))
      .filter((cls, index, all) => all.indexOf(cls) === index)

    // Sanity: the template really does use classes worth probing, so this
    // assertion isn't vacuously true against an empty list.
    expect(probeClasses.length).toBeGreaterThan(0)

    // `source(none)` on the tailwindcss import disables automatic
    // file-content scanning (which would otherwise sweep the whole repo
    // tree from `base`) — the only candidates compiled are the ones this
    // test names explicitly via `@source inline(...)`, keeping the probe
    // hermetic while still resolving `tailwindcss`/tokens.css from the real
    // project root.
    const entryCss = [
      '@import "tailwindcss" source(none);',
      `@import "${tokensPath}";`,
      `@source inline("${probeClasses.join(' ')}");`,
    ].join('\n')

    const result = await postcss([tailwindPostcss({ base: ROOT })]).process(entryCss, {
      from: path.join(ROOT, 'src/__tests__/__fixtures__/us31-ac31.3-probe.css'),
    })

    for (const cls of probeClasses) {
      const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const rule = new RegExp(`\\.${escaped}\\s*\\{[^}]*\\}`).exec(result.css)?.[0] ?? ''
      expect(rule).toMatch(/var\(--(color|spacing|radius|text|leading|font)-?[\w-]*\)/)
    }
  }, 30000)
})
