/**
 * ---
 * file: src/components/gallery/GallerySlideshowLayout.tsx
 * project: earthandhoney
 * purpose: PRD §15.2's slideshow layout — the second of the two placement
 *          layouts AC-25.5 proves render the same Backstage-sourced gallery
 *          differently from GalleryMasonryLayout. Full-width cover imagery
 *          with a single active slide (PRD §15.2 "full-width and visually
 *          immersive", "responsive cover behavior") — the opposite of
 *          masonry's never-crop, show-everything-at-once layout, so
 *          `object-cover` is the correct, deliberate choice here (unlike
 *          GalleryMasonryLayout's `object-contain`). Renders exactly two
 *          `next/image` elements at any time — the current slide and the
 *          next one — never the full gallery, per PRD §15.2 "preload only
 *          the current and next images": advancing `currentIndex` swaps
 *          which two images those are, so a gallery of any size only ever
 *          has two image assets in the DOM to request. The next slide is
 *          rendered visually hidden (`sr-only`, `aria-hidden`) purely so the
 *          browser fetches it ahead of the swipe/click/keyboard advance that
 *          will need it — it never becomes visible on its own. A dedicated
 *          component, not a `GalleryEngine` settings mode: the engine's
 *          slideshow mode (US-5 AC-5.4) pairs its main image with a
 *          ThumbnailDrawer that progressively mounts up to a full batch of
 *          thumbnails (useProgressiveThumbnails, US-6 AC-6.1) — a
 *          deliberately different, larger preload budget than this layout's
 *          strict current+next-only rule.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.5
 * ---
 */
'use client'

import { useState } from 'react'
import Image from 'next/image'

import { createGalleryImageLoader } from './galleryImageLoader'
import { NavigationControls } from './NavigationControls'
import { useSwipeNavigation } from './useSwipeNavigation'
import type { GalleryImage } from './types'

export interface GallerySlideshowLayoutProps {
  images: GalleryImage[]
  initialIndex?: number
}

export function GallerySlideshowLayout({ images, initialIndex = 0 }: GallerySlideshowLayoutProps) {
  const startIndex = images.length ? Math.min(Math.max(initialIndex, 0), images.length - 1) : 0
  const [currentIndex, setCurrentIndex] = useState(startIndex)

  const goToPrevious = () => setCurrentIndex((index) => (index - 1 + images.length) % images.length)
  const goToNext = () => setCurrentIndex((index) => (index + 1) % images.length)
  const swipeHandlers = useSwipeNavigation({ onSwipeLeft: goToNext, onSwipeRight: goToPrevious })

  if (images.length === 0) {
    return (
      <div data-testid="gallery-slideshow" className="w-full">
        <p role="status">No images to display.</p>
      </div>
    )
  }

  // Wraps to the same index (itself) when there's only one image, so the
  // "current and next" invariant still holds — just as one asset, not two.
  const nextIndex = (currentIndex + 1) % images.length
  const currentImage = images[currentIndex]
  const nextImage = images[nextIndex]

  return (
    <div data-testid="gallery-slideshow" className="relative w-full touch-pan-y" {...swipeHandlers}>
      <div
        data-testid="slideshow-current"
        className="relative aspect-[3/2] w-full overflow-hidden sm:aspect-[16/9]"
      >
        <Image
          key={currentImage.id}
          src={currentImage.largeUrl ?? currentImage.url}
          alt={currentImage.alt}
          fill
          sizes="100vw"
          loader={createGalleryImageLoader(currentImage)}
          className="object-cover"
          priority
        />
      </div>
      {currentImage.id !== nextImage.id && (
        // `sr-only` (position: absolute; 1x1px; clipped) keeps this visually
        // and semantically hidden while still giving `fill` a real box to
        // anchor to. `sizes="100vw"` — matching the visible slide above, not
        // this box's actual 1px size — is what makes next/image request the
        // same full-size variant the visible slide would use once this
        // becomes current, not a tiny thumbnail-sized one.
        <div data-testid="slideshow-preload-next" className="sr-only relative">
          <Image
            key={nextImage.id}
            src={nextImage.largeUrl ?? nextImage.url}
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            loading="eager"
            loader={createGalleryImageLoader(nextImage)}
          />
        </div>
      )}
      <NavigationControls onPrevious={goToPrevious} onNext={goToNext} />
    </div>
  )
}
