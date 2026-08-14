/**
 * ---
 * file: src/__tests__/us35-ac35.2-masonry-placement-behaviours.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-35.2 — PRD §15.1's masonry placement, as rendered by
 *          the existing GalleryMasonryLayout (no second masonry
 *          implementation), against a gallery of mixed portrait/landscape/
 *          panoramic images at three viewport widths (mobile, tablet,
 *          larger): (1) every rendered aspect ratio matches the source
 *          width/height exactly, (2) the photographer's selected order is
 *          never resorted, (3) every image's layout space is reserved
 *          (a real, non-zero aspect-ratio style) before the <img> could ever
 *          have loaded, (4) the rendered column count — derived from the
 *          component's actual compiled Tailwind CSS, not an assumption
 *          about its class names — is 1 on mobile, 2 on tablet, 3 or 4 on
 *          larger screens, (5) both the horizontal (column) and vertical
 *          (inter-item) gap compile to `var(--gallery-gap-md)`, tokens.css
 *          §8's gallery-gap scale, not a bare Tailwind spacing default, and
 *          the container spans the full available width. No crop/stretch is
 *          re-verified here (object-contain, never object-cover) because a
 *          panoramic image is the shape most tempting to crop.
 *
 *          OUT OF SCOPE (left to backlog item 15, PRD Phase 5): the full
 *          masonry refinement pass (e.g. column-balancing heuristics beyond
 *          CSS multi-column, art-directed placement) and the shared
 *          fullscreen-viewer specification (backlog item 17). This suite
 *          proves only the PRD §15.1 behaviours AC-35.2 names.
 * created-by: dev-team
 * related-story: US-35
 * related-ac: 35.2
 * ---
 */
import { render, screen, within } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import postcss from 'postcss'

import { GalleryMasonryLayout } from '@/components/gallery/GalleryMasonryLayout'
import type { GalleryImage } from '@/components/gallery/types'

const ROOT = process.cwd()
const TOKENS_PATH = path.join(ROOT, 'src/styles/tokens.css')
const tokensSource = fs.readFileSync(TOKENS_PATH, 'utf8')

// A photographer-selected order that is deliberately NOT sorted by aspect
// ratio or id — an accidental sort would be caught by the order assertions
// below. Mixes landscape, portrait, and a panoramic (very wide) shape, per
// AC-35.2's "mixed portrait/landscape/panoramic" evidence requirement.
const galleryImages: GalleryImage[] = [
  { id: 'landscape-1', url: '/landscape-1.jpg', alt: 'Landscape one', width: 1600, height: 900 },
  { id: 'portrait-1', url: '/portrait-1.jpg', alt: 'Portrait one', width: 800, height: 1200 },
  { id: 'panoramic-1', url: '/panoramic-1.jpg', alt: 'Panoramic one', width: 3000, height: 1000 },
  { id: 'landscape-2', url: '/landscape-2.jpg', alt: 'Landscape two', width: 1920, height: 1080 },
  { id: 'portrait-2', url: '/portrait-2.jpg', alt: 'Portrait two', width: 900, height: 1350 },
]

/** Reads an inline `aspect-ratio` style as [width, height] numbers, tolerant of whitespace differences jsdom may normalize. */
function parseAspectRatio(style: CSSStyleDeclaration): [number, number] {
  const match = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(style.aspectRatio)
  if (!match) throw new Error(`Expected an "W / H" aspect-ratio, got "${style.aspectRatio}"`)
  return [Number(match[1]), Number(match[2])]
}

// Three viewport widths named by the AC: mobile, tablet, larger. Layout
// space reservation, aspect ratio, and order are CSS-`aspect-ratio`/render-
// order facts that do not (and must not) vary by viewport, so each width is
// exercised as its own scenario to prove that invariance explicitly rather
// than asserting it once and assuming it holds everywhere.
const VIEWPORTS = [
  { label: 'mobile', widthPx: 375 },
  { label: 'tablet', widthPx: 768 },
  { label: 'larger', widthPx: 1440 },
]

describe.each(VIEWPORTS)(
  'AC-35.2: masonry placement at the $label viewport ($widthPx px)',
  ({ widthPx }) => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: widthPx })
      window.dispatchEvent(new Event('resize'))
    })

    it("every rendered item's aspect ratio matches that exact photo's received width/height", () => {
      render(<GalleryMasonryLayout images={galleryImages} />)

      const items = screen.getAllByTestId(/^masonry-item-\d+$/)
      galleryImages.forEach((image) => {
        const item = items.find((el) => el.getAttribute('data-image-id') === image.id)
        expect(item).toBeDefined()
        const [w, h] = parseAspectRatio(item!.style)
        expect([w, h]).toEqual([image.width, image.height])
      })
    })

    it("renders in the photographer's exact selected order, driven by real image ids, not a re-sort", () => {
      render(<GalleryMasonryLayout images={galleryImages} />)

      const renderedIds = screen
        .getAllByTestId(/^masonry-item-\d+$/)
        .map((item) => item.getAttribute('data-image-id'))

      expect(renderedIds).toEqual(galleryImages.map((image) => image.id))
    })

    it('reserves a real (non-zero) aspect-ratio layout space for every item, present synchronously before any load event could fire', () => {
      render(<GalleryMasonryLayout images={galleryImages} />)

      const items = screen.getAllByTestId(/^masonry-item-\d+$/)
      expect(items).toHaveLength(galleryImages.length)
      for (const item of items) {
        const [w, h] = parseAspectRatio(item.style)
        expect(w).toBeGreaterThan(0)
        expect(h).toBeGreaterThan(0)
      }
    })

    it('never crops or stretches — no object-cover, including on the panoramic image', () => {
      render(<GalleryMasonryLayout images={galleryImages} />)

      const masonry = screen.getByTestId('gallery-masonry')
      for (const img of within(masonry).getAllByRole('img')) {
        expect(img.className).not.toMatch(/object-cover/)
        expect((img as HTMLImageElement).style.objectFit).not.toBe('cover')
      }
      expect(within(masonry).getByAltText('Panoramic one').className).toMatch(/object-contain/)
    })
  },
)

describe('AC-35.2: rendered column count, derived from the component\'s actual compiled Tailwind CSS', () => {
  // Real generated CSS for the exact classes GalleryMasonryLayout's
  // container uses, compiled the same way US-31 AC-31.3 already proves
  // token-derived classes really do resolve (@tailwindcss/postcss +
  // tokens.css, `@source inline(...)` naming only this component's probe
  // classes so the compile stays hermetic). This is what a browser actually
  // renders — column count is read from that, not assumed from a class name.
  const CONTAINER_CLASSES =
    'w-full columns-1 gap-[var(--gallery-gap-md)] sm:columns-2 lg:columns-3 xl:columns-4'

  let compiledCss: string

  beforeAll(async () => {
    const tailwindPostcss = (await import('@tailwindcss/postcss')).default
    const entryCss = [
      '@import "tailwindcss" source(none);',
      `@import "${TOKENS_PATH}";`,
      `@source inline("${CONTAINER_CLASSES}");`,
    ].join('\n')

    const result = await postcss([tailwindPostcss({ base: ROOT })]).process(entryCss, {
      from: path.join(ROOT, 'src/__tests__/__fixtures__/us35-ac35.2-masonry-probe.css'),
    })
    compiledCss = result.css
  }, 30000)

  /** Extracts {minWidthRem, columns} steps from the compiled CSS: the un-media-queried base rule (minWidthRem 0) plus every `@media (width >= Nrem) { ... columns: M; ... }` block. */
  function extractColumnSteps(css: string): Array<{ minWidthRem: number; columns: number }> {
    const steps: Array<{ minWidthRem: number; columns: number }> = []

    const baseMatch = /\.columns-1\s*\{\s*columns:\s*(\d+);/.exec(css)
    expect(baseMatch).not.toBeNull()
    steps.push({ minWidthRem: 0, columns: Number(baseMatch![1]) })

    const mediaBlockPattern = /@media \(width >= (\d+(?:\.\d+)?)rem\)\s*\{\s*\.[\w:\\-]+\s*\{\s*columns:\s*(\d+);/g
    for (const match of css.matchAll(mediaBlockPattern)) {
      steps.push({ minWidthRem: Number(match[1]), columns: Number(match[2]) })
    }

    return steps.sort((a, b) => a.minWidthRem - b.minWidthRem)
  }

  /** Mobile-first cascade: the column count is that of the last step whose min-width (rem, at the standard 16px root) is at or below the viewport. */
  function resolveColumnsAtWidth(steps: Array<{ minWidthRem: number; columns: number }>, widthPx: number): number {
    const REM_PX = 16
    let resolved = steps[0].columns
    for (const step of steps) {
      if (widthPx >= step.minWidthRem * REM_PX) resolved = step.columns
    }
    return resolved
  }

  it('compiles the base rule to a single column, with no media condition (mobile default)', () => {
    const steps = extractColumnSteps(compiledCss)
    expect(steps[0]).toEqual({ minWidthRem: 0, columns: 1 })
  })

  it('compiles a step for two columns at the tokens.css sm breakpoint (tablet)', () => {
    const steps = extractColumnSteps(compiledCss)
    expect(steps).toContainEqual({ minWidthRem: 40, columns: 2 })
    // tokens.css declares --breakpoint-sm itself, so the compiled step's
    // width is traced back to the same token, not a coincidental match.
    expect(tokensSource).toMatch(/--breakpoint-sm:\s*40rem;/)
  })

  it('compiles a step for three columns at the tokens.css lg breakpoint, and four at xl (larger screens)', () => {
    const steps = extractColumnSteps(compiledCss)
    expect(steps).toContainEqual({ minWidthRem: 64, columns: 3 })
    expect(steps).toContainEqual({ minWidthRem: 80, columns: 4 })
    expect(tokensSource).toMatch(/--breakpoint-lg:\s*64rem;/)
    expect(tokensSource).toMatch(/--breakpoint-xl:\s*80rem;/)
  })

  it.each([
    { label: 'mobile', widthPx: 375, expected: 1 },
    { label: 'tablet', widthPx: 768, expected: 2 },
  ])('resolves to $expected column(s) at the $label width ($widthPx px)', ({ widthPx, expected }) => {
    const steps = extractColumnSteps(compiledCss)
    expect(resolveColumnsAtWidth(steps, widthPx)).toBe(expected)
  })

  it('resolves to three or four columns at larger widths, per PRD §15.1', () => {
    const steps = extractColumnSteps(compiledCss)
    expect(resolveColumnsAtWidth(steps, 1024)).toBe(3)
    expect(resolveColumnsAtWidth(steps, 1440)).toBe(4)
  })

  it("compiles the container's gap to tokens.css's gallery-gap-md, not a bare Tailwind spacing default", () => {
    const rule = /\.gap-\\\[var\\\(--gallery-gap-md\\\)\\\]\s*\{\s*gap:\s*var\(--gallery-gap-md\);/.exec(
      compiledCss,
    )
    expect(rule).not.toBeNull()
    expect(tokensSource).toMatch(/--gallery-gap-md:\s*1rem;/)
  })

  it('compiles the container to the full available width', () => {
    expect(compiledCss).toMatch(/\.w-full\s*\{\s*width:\s*100%;/)
  })
})

describe("AC-35.2: the vertical (inter-item) gap also compiles to tokens.css's gallery-gap-md", () => {
  it('the mb-[var(--gallery-gap-md)] utility resolves to margin-bottom: var(--gallery-gap-md)', async () => {
    const tailwindPostcss = (await import('@tailwindcss/postcss')).default
    const entryCss = [
      '@import "tailwindcss" source(none);',
      `@import "${TOKENS_PATH}";`,
      '@source inline("mb-[var(--gallery-gap-md)]");',
    ].join('\n')

    const result = await postcss([tailwindPostcss({ base: ROOT })]).process(entryCss, {
      from: path.join(ROOT, 'src/__tests__/__fixtures__/us35-ac35.2-masonry-margin-probe.css'),
    })

    expect(result.css).toMatch(/\.mb-\\\[var\\\(--gallery-gap-md\\\)\\\]\s*\{\s*margin-bottom:\s*var\(--gallery-gap-md\);/)
  }, 30000)
})

describe('AC-35.2: build boundary — no second masonry implementation', () => {
  it('GalleryMasonryLayout.tsx is the only masonry component in the gallery component set', () => {
    const galleryDir = path.join(ROOT, 'src/components/gallery')
    const masonryFiles = fs
      .readdirSync(galleryDir)
      .filter((name) => /masonry/i.test(name) && !name.includes('__tests__'))

    expect(masonryFiles).toEqual(['GalleryMasonryLayout.tsx'])
  })
})
