/**
 * ---
 * file: src/__tests__/us4-ac4.5-visual-parity.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-4.5 — the Gallery Engine's layout, spacing, typography,
 *          and gradient-overlay treatment match the public/photobuddy
 *          template, and template images are used as placeholder content in
 *          the rendered demo contexts. The subjective "looks the same"
 *          judgement is the job of the manual visual QA checklist
 *          (docs/qa/us4-ac4.5-visual-qa-checklist.md); these tests lock the
 *          concrete design tokens that checklist depends on, cross-referencing
 *          them against the ACTUAL template CSS files (css/style.css,
 *          css/skeleton.css) so the engine can never silently drift away from
 *          the template it is meant to match.
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.5
 * ---
 */
import { render, screen, within } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import { GradientOverlay } from '@/components/gallery/GradientOverlay'
import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import GalleryEngineDemoPage from '@/app/(frontend)/dev/gallery-demo/page'
import type { GalleryImage } from '@/components/gallery/types'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const DEMO_PAGE_PATH = 'src/app/(frontend)/dev/gallery-demo/page.tsx'
const QA_CHECKLIST_PATH = 'docs/qa/us4-ac4.5-visual-qa-checklist.md'
const TEMPLATE_STYLE_CSS = 'public/photobuddy/css/style.css'
const TEMPLATE_SKELETON_CSS = 'public/photobuddy/css/skeleton.css'

// Grab the declaration block `{ ... }` that immediately follows the first
// occurrence of `selector` in a CSS string, so parity checks read from the
// real template rules rather than hand-copied values.
const blockAfter = (css: string, selector: string): string => {
  const at = css.indexOf(selector)
  if (at === -1) throw new Error(`selector not found in template CSS: ${selector}`)
  const open = css.indexOf('{', at)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}

// Normalise a CSS gradient value for comparison: drop ALL whitespace (so
// `rgba(0, 0, 0, .1)` and `rgba(0,0,0,.1)` compare equal) and strip a leading
// direction keyword like `to bottom,` (the template omits it; the default
// direction of linear-gradient is already top→bottom, so they're equivalent).
const normaliseGradient = (value: string): string =>
  value.replace(/\s+/g, '').replace(/^to[a-z]+,/, '')

const demoImageUrls = (): string[] => {
  const src = read(DEMO_PAGE_PATH)
  return [...src.matchAll(/url:\s*'([^']+)'/g)].map((m) => m[1])
}

describe('AC-4.5: template images are the placeholder content in the rendered contexts', () => {
  it('every image the demo route uses is a public/photobuddy template asset', () => {
    const urls = demoImageUrls()

    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(url).toMatch(/^\/photobuddy\//)
    }
  })

  it('each referenced template image actually exists on disk under public/', () => {
    for (const url of demoImageUrls()) {
      expect(fs.existsSync(path.join(root, 'public', url))).toBe(true)
    }
  })

  it('pulls hero placeholders from the template slider and portfolio placeholders from the template gallery', () => {
    const urls = demoImageUrls()

    expect(urls.some((u) => u.startsWith('/photobuddy/img/slide/'))).toBe(true)
    expect(urls.some((u) => u.startsWith('/photobuddy/img/gallery/'))).toBe(true)
  })

  it('never falls back to a third-party / stock / placeholder-service image', () => {
    const src = read(DEMO_PAGE_PATH)

    expect(src).not.toMatch(/https?:\/\//)
    // Domain-style tokens for common stock/placeholder image services (the bare
    // word "placeholder" legitimately appears in this route's explanatory prose).
    expect(src).not.toMatch(/picsum\.photos|images\.unsplash|placehold\.co|via\.placeholder|dummyimage\.com|loremflickr\.com|placekitten/i)
  })

  it('renders the template images into the actual DOM of both display-mode contexts', () => {
    render(<GalleryEngineDemoPage />)

    const heroImg = within(screen.getByTestId('hero-mode-demo')).getAllByRole('img')[0]
    const portfolioImg = within(screen.getByTestId('portfolio-mode-demo')).getAllByRole('img')[0]

    expect(heroImg.getAttribute('src')).toMatch(/^\/photobuddy\/img\/slide\//)
    expect(portfolioImg.getAttribute('src')).toMatch(/^\/photobuddy\/img\/gallery\//)
  })
})

describe('AC-4.5: typography matches the template body type scale', () => {
  const images: GalleryImage[] = [{ id: 't-1', url: '/photobuddy/img/slide/1.jpg', alt: 'One' }]

  it("loads the template's Rubik typeface via next/font and applies it to the engine", () => {
    const src = read('src/components/gallery/GalleryEngine.tsx')

    expect(src).toMatch(/import\s*\{\s*Rubik\s*\}\s*from\s*['"]next\/font\/google['"]/)
    expect(src).toMatch(/Rubik\(\{[^)]*\}\)/)
    expect(src).toMatch(/\$\{rubik\.className\}/)
  })

  it("applies the template body scale (14px / line-height 1.5 / 0.5px tracking) to the engine root", () => {
    render(<GalleryEngine images={images} />)

    const engine = screen.getByTestId('gallery-engine')
    expect(engine).toHaveClass('text-[14px]')
    expect(engine).toHaveClass('leading-[1.5]')
    expect(engine).toHaveClass('tracking-[0.5px]')
  })

  it("those tokens are the template's own — the photobuddy body rule declares exactly Rubik / 14px / 1.5 / 0.5px", () => {
    const body = blockAfter(read(TEMPLATE_STYLE_CSS), 'body{')

    expect(body).toMatch(/font-family:\s*'Rubik'/)
    expect(body).toMatch(/font-size:\s*14px/)
    expect(body).toMatch(/line-height:\s*1\.5/)
    expect(body).toMatch(/letter-spacing:\s*0\.5px/)
  })

  it('keeps the type scale even in the empty-gallery state so text still reads like the template', () => {
    render(<GalleryEngine images={[]} />)

    const engine = screen.getByTestId('gallery-engine')
    expect(engine).toHaveClass('text-[14px]')
    expect(engine).toHaveClass('tracking-[0.5px]')
  })
})

describe('AC-4.5: gradient-overlay treatment matches the template slider overlay', () => {
  it("the engine overlay's gradient stops are byte-for-byte the template's own slider gradient", () => {
    // The template's slider overlay, straight from public/photobuddy/css/style.css.
    const templateRule = read(TEMPLATE_STYLE_CSS).match(
      /background-image:\s*linear-gradient\(([^;]+)\)\s*;/,
    )
    expect(templateRule).not.toBeNull()
    const templateStops = normaliseGradient(templateRule![1])

    render(<GradientOverlay />)
    const rendered = screen.getByTestId('gradient-overlay').style.backgroundImage
    const engineStops = normaliseGradient(rendered.replace(/^linear-gradient\(|\)$/g, ''))

    expect(engineStops).toBe(templateStops)
  })

  it("matches the template's subtlety: fully transparent through 70%, deepening only to a translucent ~0.49 black", () => {
    render(<GradientOverlay />)
    const gradient = screen.getByTestId('gradient-overlay').style.backgroundImage

    expect(gradient).toMatch(/transparent\s+70%/)
    const opacities = [...gradient.matchAll(/rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/g)].map((m) => Number(m[1]))
    expect(Math.max(...opacities)).toBeCloseTo(0.49, 2)
    expect(Math.max(...opacities)).toBeLessThan(0.5)
  })
})

describe('AC-4.5: layout & spacing match the template content container and nav treatment', () => {
  it("constrains the portfolio context to the template's 1130px content container", () => {
    const demo = read(DEMO_PAGE_PATH)
    const containerRule = blockAfter(read(TEMPLATE_SKELETON_CSS), '.container {')

    // The template's .container caps content at 1130px…
    expect(containerRule).toMatch(/max-width:\s*1130px/)
    // …and the demo's portfolio context adopts that exact cap.
    expect(demo).toMatch(/max-w-\[1130px\]/)
  })

  it("styles the nav controls with the template's prev/next treatment (12px, 2px tracking, uppercase)", () => {
    const navSrc = read('src/components/gallery/NavigationControls.tsx')
    const templateNav = blockAfter(
      read(TEMPLATE_STYLE_CSS),
      '.photobuddy_fl_gallery_single_in .img_list span.prev_next{',
    )

    // Template prev/next tokens…
    expect(templateNav).toMatch(/font-size:\s*12px/)
    expect(templateNav).toMatch(/letter-spacing:\s*2px/)
    expect(templateNav).toMatch(/text-transform:\s*uppercase/)
    // …mirrored by the engine's nav controls.
    expect(navSrc).toMatch(/text-\[12px\]/)
    expect(navSrc).toMatch(/tracking-\[2px\]/)
    expect(navSrc).toMatch(/uppercase/)
  })

  it('uses the template .5s ease transition timing for interactive gallery affordances', () => {
    // The template drives nearly every hover/state change on `all .5s ease`.
    expect(read(TEMPLATE_STYLE_CSS)).toMatch(/transition:\s*all\s+\.5s\s+ease/)
    expect(read('src/components/gallery/NavigationControls.tsx')).toMatch(/duration-500/)
    expect(read('src/components/gallery/ThumbnailStrip.tsx')).toMatch(/duration-500/)
  })
})

describe('AC-4.5: the manual visual QA checklist artefact exists and covers the AC dimensions', () => {
  it('the checklist referenced by the demo route exists', () => {
    expect(fs.existsSync(path.join(root, QA_CHECKLIST_PATH))).toBe(true)
  })

  it('covers layout, spacing, typography, gradient-overlay treatment, and template-image placeholder usage', () => {
    const doc = read(QA_CHECKLIST_PATH).toLowerCase()

    expect(doc).toContain('layout')
    expect(doc).toContain('spacing')
    expect(doc).toContain('typography')
    expect(doc).toContain('gradient')
    expect(doc).toContain('template image')
  })

  it('points the reviewer at the demo route and the template pages for a side-by-side comparison', () => {
    const doc = read(QA_CHECKLIST_PATH)

    expect(doc).toContain('/dev/gallery-demo')
    expect(doc).toMatch(/photobuddy/)
  })
})
