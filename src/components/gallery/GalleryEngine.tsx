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
 * ---
 */
'use client'

import { useState } from 'react'

import { MainImageDisplay } from './MainImageDisplay'
import { NavigationControls } from './NavigationControls'
import { ThumbnailStrip } from './ThumbnailStrip'
import type { GalleryImage } from './types'

export interface GalleryEngineProps {
  images: GalleryImage[]
  initialIndex?: number
}

export function GalleryEngine({ images, initialIndex = 0 }: GalleryEngineProps) {
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
    <div data-testid="gallery-engine" className="gallery-engine flex flex-col gap-4">
      <div className="relative">
        <MainImageDisplay image={images[currentIndex]} />
        <NavigationControls onPrevious={goToPrevious} onNext={goToNext} />
      </div>
      <ThumbnailStrip images={images} activeIndex={currentIndex} onSelect={setCurrentIndex} />
    </div>
  )
}
