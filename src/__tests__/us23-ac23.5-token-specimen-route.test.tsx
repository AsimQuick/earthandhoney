/**
 * ---
 * file: src/__tests__/us23-ac23.5-token-specimen-route.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-23.5 — the internal noindex token-specimen route
 *          renders the full US-23 token set for human confirmation: the
 *          type scale at every step in both families, the palette with its
 *          computed contrast ratios, the spacing scale, radii, gallery
 *          gaps, and every overlay/vignette preset over a sample
 *          photograph. Also asserts the route opts out of search indexing
 *          and that its computed contrast ratios match the same algorithm
 *          AC-23.3's WCAG gate uses.
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.5
 * ---
 */
import { render, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import TokenSpecimenPage, { metadata } from '@/app/(frontend)/dev/token-specimen/page'
import { loadTokenSpecimenData } from '@/lib/designTokenSpecimen'

describe('US-23 AC-23.5: internal token-specimen route', () => {
  it('carries the CLAUDE.md structured metadata header', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(frontend)/dev/token-specimen/page.tsx'),
      'utf8',
    )
    const header = source.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/\*\s*related-story:\s*US-23/)
    expect(header).toMatch(/\*\s*related-ac:\s*23\.5/)
  })

  it('opts out of search indexing (noindex)', () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false })
  })

  describe('rendered specimen content', () => {
    const data = loadTokenSpecimenData()

    beforeEach(() => {
      render(<TokenSpecimenPage />)
    })

    it('renders every type-scale step for both the display and sans families', () => {
      expect(data.typeScale.length).toBeGreaterThan(0)
      for (const [name] of data.typeScale) {
        const step = screen.getByTestId(`type-step-${name}`)
        expect(step.textContent).toMatch(/Fraunces/)
        expect(step.textContent).toMatch(/Inter/)
      }
    })

    it('renders a swatch for every palette colour', () => {
      expect(data.colorPalette.length).toBeGreaterThan(0)
      for (const [name] of data.colorPalette) {
        expect(screen.getByTestId(`palette-swatch-${name}`)).toBeInTheDocument()
      }
    })

    it('shows a computed contrast ratio row for every declared usable ink-on-surface pair', () => {
      expect(data.usablePairs.length).toBeGreaterThan(0)
      for (const pair of data.usablePairs) {
        const row = screen.getByTestId(`contrast-row-${pair.inkKey}--on--${pair.surfaceKey}`)
        expect(row.textContent).toContain(`${pair.ratio.toFixed(2)}:1`)
        expect(row.textContent).toContain(pair.passes ? 'AA pass' : 'AA fail')
      }
    })

    it('every shown pair actually clears its own displayed AA minimum (the specimen does not silently show a failing pair as passing)', () => {
      for (const pair of data.usablePairs) {
        expect(pair.ratio).toBeGreaterThanOrEqual(pair.minimum)
        expect(pair.passes).toBe(true)
      }
    })

    it('renders every spacing-scale step', () => {
      expect(data.spacingScale.length).toBeGreaterThan(0)
      for (const [name] of data.spacingScale) {
        expect(screen.getByTestId(`spacing-step-${name}`)).toBeInTheDocument()
      }
    })

    it('renders every radius step', () => {
      expect(data.radii.length).toBeGreaterThan(0)
      for (const [name] of data.radii) {
        expect(screen.getByTestId(`radius-step-${name}`)).toBeInTheDocument()
      }
    })

    it('renders every gallery-gap step', () => {
      expect(data.galleryGaps.length).toBeGreaterThan(0)
      for (const [name] of data.galleryGaps) {
        expect(screen.getByTestId(`gallery-gap-step-${name}`)).toBeInTheDocument()
      }
    })

    it('renders every overlay/vignette preset over a sample photograph', () => {
      expect(data.overlaysAndVignettes.length).toBeGreaterThan(0)
      for (const [name] of data.overlaysAndVignettes) {
        const preset = screen.getByTestId(`overlay-preset-${name}`)
        expect(preset).toBeInTheDocument()
        const img = preset.querySelector('img')
        expect(img).not.toBeNull()
        expect(img?.getAttribute('src')).toMatch(/\.(jpg|jpeg|png|webp)$/i)
      }
    })
  })
})
