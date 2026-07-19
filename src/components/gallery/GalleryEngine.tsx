/**
 * ---
 * file: src/components/gallery/GalleryEngine.tsx
 * project: earthandhoney
 * purpose: Gallery Engine container — the single reusable component that
 *          renders any gallery (homepage hero, portfolio, blog, client
 *          delivery) by composing Main Image Display, Thumbnail Preview
 *          strip, and Navigation Controls around one shared "current image"
 *          state. No separate image system per context.
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.1
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.4
 * ---
 */
'use client'

import { useState } from 'react'

import { MainImageDisplay } from './MainImageDisplay'
import { NavigationControls } from './NavigationControls'
import { ThumbnailStrip } from './ThumbnailStrip'
import type { GalleryImage, GallerySettings } from './types'

// Mirrors the defaultValue of each toggle on the Payload Galleries
// `settings` group (see src/collections/Galleries.ts) so an engine instance
// with no explicit settings (e.g. existing AC-4.1/4.2/4.3 callers) behaves
// exactly as a freshly-created gallery record would.
const DEFAULT_SETTINGS: GallerySettings = {
  slideshow: false,
  hoverPreview: true,
  fullscreen: true,
  download: false,
  requireAuth: false,
}

export interface GalleryEngineProps {
  images: GalleryImage[]
  initialIndex?: number
  /** Display-mode configuration — the only thing that should differ between a hero-mode and a portfolio-mode instance of this same engine. */
  settings?: GallerySettings
}

export function GalleryEngine({ images, initialIndex = 0, settings = DEFAULT_SETTINGS }: GalleryEngineProps) {
  const startIndex = images.length
    ? Math.min(Math.max(initialIndex, 0), images.length - 1)
    : 0
  const [currentIndex, setCurrentIndex] = useState(startIndex)

  if (images.length === 0) {
    return (
      <div data-testid="gallery-engine" className="gallery-engine">
        <p role="status">No images to display.</p>
      </div>
    )
  }

  const goToPrevious = () => setCurrentIndex((index) => (index - 1 + images.length) % images.length)
  const goToNext = () => setCurrentIndex((index) => (index + 1) % images.length)

  return (
    <div
      data-testid="gallery-engine"
      className="gallery-engine flex flex-col gap-4"
      data-slideshow={settings.slideshow}
      data-hover-preview={settings.hoverPreview}
      data-fullscreen={settings.fullscreen}
      data-download={settings.download}
      data-require-auth={settings.requireAuth}
    >
      <div className="relative">
        <MainImageDisplay image={images[currentIndex]} />
        <NavigationControls onPrevious={goToPrevious} onNext={goToNext} />
      </div>
      <ThumbnailStrip images={images} activeIndex={currentIndex} onSelect={setCurrentIndex} />
    </div>
  )
}
