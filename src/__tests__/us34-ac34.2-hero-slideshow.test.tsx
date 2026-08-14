/**
 * ---
 * file: src/__tests__/us34-ac34.2-hero-slideshow.test.tsx
 * project: earthandhoney
 * purpose: AC-34.2 — proves HeroSlideshow (1) is slideshow-first and
 *          full-width, (2) composites the controlled `--overlay-*`/
 *          `--vignette-*` presets US-23 locked into src/styles/tokens.css
 *          via `var(--...)` — never an ad hoc gradient string — and (3)
 *          reserves its aspect-ratio box synchronously at first render, via
 *          the static `hero-slideshow-frame` CSS class, before the
 *          `next/image` element has any chance to report a load event —
 *          which is what makes the reserved space zero-CLS rather than a
 *          fix that only takes effect after the image resolves. Also reuses
 *          the US-23 AC-23.7 detector, mirroring
 *          us31-ac31.3-standard-page-template.test.tsx and
 *          us34-ac34.1-homepage-template.test.tsx's own inline check, to
 *          prove this new file introduces no raw hex colour, raw px
 *          font-size, or arbitrary Tailwind bracket — in particular no
 *          `aspect-[...]` bracket, the pre-existing baselined pattern this
 *          component deliberately does not repeat (see the component's own
 *          header comment).
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.2
 * ---
 */
import { fireEvent, render, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import { HeroSlideshow } from '@/components/hero/HeroSlideshow'
import { detectStyleDrift, stripBlockComments } from '@/lib/style-guard/detectStyleDrift'
import type { GalleryImage } from '@/components/gallery/types'

const ROOT = process.cwd()
const COMPONENT_PATH = 'src/components/hero/HeroSlideshow.tsx'
const componentSource = fs.readFileSync(path.join(ROOT, COMPONENT_PATH), 'utf8')

const images: GalleryImage[] = [
  { id: 'a', url: '/photobuddy/img/slide/1.jpg', alt: 'Slide A' },
  { id: 'b', url: '/photobuddy/img/slide/2.jpg', alt: 'Slide B' },
  { id: 'c', url: '/photobuddy/img/slide/3.jpg', alt: 'Slide C' },
]

describe('US-34 AC-34.2: HeroSlideshow is slideshow-first and full-width', () => {
  it('renders exactly one visible <img> for the current slide, full-width', () => {
    render(<HeroSlideshow images={images} />)
    const root = screen.getByTestId('hero-slideshow')
    expect(root.className).toContain('w-full')

    const visibleImg = root.querySelector('img[alt="Slide A"]')
    expect(visibleImg).not.toBeNull()
    expect(visibleImg?.getAttribute('src')).toContain('1.jpg')
  })

  it('preloads only the next slide, not the whole set, mirroring GallerySlideshowLayout', () => {
    render(<HeroSlideshow images={images} />)
    const html = screen.getByTestId('hero-slideshow').innerHTML
    expect(html).toContain('2.jpg')
    expect(html).not.toContain('3.jpg')
  })

  it('advancing to the next slide swaps the visible image', () => {
    render(<HeroSlideshow images={images} />)
    fireEvent.click(screen.getByTestId('nav-next'))
    expect(screen.getByTestId('hero-slideshow').querySelector('img[alt="Slide B"]')).not.toBeNull()
  })

  it('renders a status fallback, not a crash, when given no images', () => {
    render(<HeroSlideshow images={[]} />)
    expect(screen.getByRole('status').textContent).toBe('No hero images to display.')
  })
})

describe('US-34 AC-34.2: the reserved aspect-ratio box exists before any image can load', () => {
  it('the wrapper carries the aspect-ratio-reserving class at first render, synchronously — not applied via an onLoad handler', () => {
    render(<HeroSlideshow images={images} />)
    // Synchronous DOM read straight after render(), with no waitFor/act
    // delay and no image load event fired — jsdom never loads real image
    // bytes, so if this class only appeared after a load callback the
    // assertion below would fail here, before any such callback could run.
    expect(screen.getByTestId('hero-slideshow').className).toContain('hero-slideshow-frame')
  })

  it('the component source declares no arbitrary aspect-ratio bracket (e.g. aspect-[16/9]) outside its own doc comments — the reservation lives in the named CSS class instead', () => {
    expect(stripBlockComments(componentSource)).not.toMatch(/aspect-\[/)
  })

  it('globals.css actually defines hero-slideshow-frame with a static aspect-ratio, reserved for every viewport width (mobile-first, then widened)', () => {
    const globalsCss = fs.readFileSync(
      path.join(ROOT, 'src/app/(frontend)/globals.css'),
      'utf8',
    )
    const mobileRule = /\.hero-slideshow-frame\s*\{[^}]*aspect-ratio:\s*3\s*\/\s*4[^}]*\}/
    const wideRule = /@variant sm\s*\{[^]*?\.hero-slideshow-frame\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/
    expect(globalsCss).toMatch(mobileRule)
    expect(globalsCss).toMatch(wideRule)
  })
})

describe('US-34 AC-34.2: overlay and vignette are the controlled tokens.css presets, not an ad hoc gradient', () => {
  it('the overlay layer reads its color from the --overlay-subtle token, via var(...)', () => {
    render(<HeroSlideshow images={images} />)
    const overlay = screen.getByTestId('hero-overlay')
    expect(overlay.getAttribute('style')).toContain('var(--overlay-subtle)')
  })

  it('the vignette layer reads its background-image from the --vignette-soft token, via var(...)', () => {
    render(<HeroSlideshow images={images} />)
    const vignette = screen.getByTestId('hero-vignette')
    expect(vignette.getAttribute('style')).toContain('var(--vignette-soft)')
  })

  it('the token names actually used, read from the component source (AC-34.2 evidence)', () => {
    const overlayTokenUsed = /var\(--overlay-\w+\)/.exec(componentSource)?.[0]
    const vignetteTokenUsed = /var\(--vignette-\w+\)/.exec(componentSource)?.[0]
    expect(overlayTokenUsed).toBe('var(--overlay-subtle)')
    expect(vignetteTokenUsed).toBe('var(--vignette-soft)')
  })

  it('every --overlay-*/--vignette-* token this component references is actually declared in tokens.css', () => {
    const tokensCss = fs.readFileSync(path.join(ROOT, 'src/styles/tokens.css'), 'utf8')
    const referencedTokens = [...componentSource.matchAll(/var\((--(?:overlay|vignette)-[\w-]+)\)/g)].map(
      (match) => match[1],
    )
    expect(referencedTokens.length).toBeGreaterThan(0)
    for (const token of referencedTokens) {
      expect(tokensCss).toContain(`${token}:`)
    }
  })

  it('introduces no hand-written gradient/rgba string outside its own doc comments — the overlay is a token reference only', () => {
    const codeOnly = stripBlockComments(componentSource)
    expect(codeOnly).not.toMatch(/linear-gradient\(/)
    expect(codeOnly).not.toMatch(/rgba?\(/)
  })
})

describe('US-34 AC-34.2: no raw hex colour, raw px font-size, or arbitrary Tailwind bracket (reusing US-23 AC-23.7)', () => {
  it('introduces zero hex/px-font-size/arbitrary-bracket violations', () => {
    expect(detectStyleDrift(componentSource)).toEqual([])
  })
})
