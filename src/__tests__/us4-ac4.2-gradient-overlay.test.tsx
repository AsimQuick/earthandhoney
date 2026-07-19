/**
 * ---
 * file: src/__tests__/us4-ac4.2-gradient-overlay.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-4.2 — every gallery display includes a subtle black CSS
 *          gradient overlay implemented purely in CSS (no image processing),
 *          applied consistently across displays
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.2
 * ---
 */
import { fireEvent, render, screen, within } from '@testing-library/react'

import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import { GradientOverlay } from '@/components/gallery/GradientOverlay'
import { MainImageDisplay } from '@/components/gallery/MainImageDisplay'
import type { GalleryImage } from '@/components/gallery/types'

const heroImages: GalleryImage[] = [
  { id: 'hero-1', url: '/hero-1.jpg', alt: 'Hero image one' },
  { id: 'hero-2', url: '/hero-2.jpg', alt: 'Hero image two' },
]

const portfolioImages: GalleryImage[] = [
  { id: 'portfolio-1', url: '/portfolio-1.jpg', alt: 'Portfolio image one' },
]

describe('AC-4.2: GradientOverlay is a pure-CSS black gradient', () => {
  it('renders a decorative overlay element', () => {
    render(<GradientOverlay />)

    const overlay = screen.getByTestId('gradient-overlay')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveAttribute('aria-hidden', 'true')
  })

  it('is implemented purely via a CSS linear-gradient, not a background image asset', () => {
    render(<GradientOverlay />)

    const overlay = screen.getByTestId('gradient-overlay')
    expect(overlay.style.backgroundImage).toMatch(/^linear-gradient\(/)
    expect(overlay.style.backgroundImage).not.toMatch(/url\(/)
  })

  it('is black-toned and subtle: rgba black stops rising in opacity, never solid/opaque black', () => {
    render(<GradientOverlay />)

    const overlay = screen.getByTestId('gradient-overlay')
    const gradient = overlay.style.backgroundImage
    const opacities = [...gradient.matchAll(/rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/g)].map((match) =>
      Number(match[1]),
    )

    expect(opacities.length).toBeGreaterThan(0)
    for (const opacity of opacities) {
      expect(opacity).toBeGreaterThan(0)
      expect(opacity).toBeLessThan(0.6)
    }
  })

  it('does not capture pointer events, so it never blocks navigation/thumbnail interaction', () => {
    render(<GradientOverlay />)

    expect(screen.getByTestId('gradient-overlay')).toHaveClass('pointer-events-none')
  })
})

describe('AC-4.2: the overlay is applied consistently across every gallery display', () => {
  it('the Main Image Display always stacks the gradient overlay over the active image', () => {
    render(<MainImageDisplay image={heroImages[0]} />)

    const display = within(screen.getByTestId('main-image-display'))
    expect(display.getByTestId('gradient-overlay')).toBeInTheDocument()
  })

  it('the overlay persists as the Gallery Engine navigates between images', () => {
    render(<GalleryEngine images={heroImages} />)

    expect(screen.getByTestId('gradient-overlay')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('nav-next'))

    expect(screen.getByTestId('gradient-overlay')).toBeInTheDocument()
  })

  it('a second, differently-configured Gallery Engine instance (e.g. portfolio mode) gets the same overlay treatment', () => {
    render(<GalleryEngine images={portfolioImages} />)

    expect(screen.getByTestId('gradient-overlay')).toBeInTheDocument()
  })

  it('does not render an overlay when there are no images to display', () => {
    render(<GalleryEngine images={[]} />)

    expect(screen.queryByTestId('gradient-overlay')).not.toBeInTheDocument()
  })
})
