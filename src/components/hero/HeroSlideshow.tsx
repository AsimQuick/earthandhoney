/**
 * ---
 * file: src/components/hero/HeroSlideshow.tsx
 * project: earthandhoney
 * purpose: AC-34.2 — the homepage's full-width, slideshow-first hero. Two
 *          requirements drive every choice here: (1) the overlay/vignette
 *          layers are the named `--overlay-*`/`--vignette-*` presets US-23
 *          AC-23.7 locked into src/styles/tokens.css, applied via
 *          `var(--...)` inline styles — never the ad hoc, hand-tuned
 *          `linear-gradient(...)` string
 *          src/components/gallery/GradientOverlay.tsx carries (that
 *          component stays as-is for the existing Gallery Engine displays;
 *          this hero is a deliberately separate, token-only overlay so this
 *          new file introduces zero style-drift debt rather than inheriting
 *          GradientOverlay's pre-token-era baselined violation); (2)
 *          aspect-ratio space is reserved by the wrapper's own
 *          `hero-slideshow-frame` CSS class (src/app/(frontend)/globals.css)
 *          BEFORE the image starts loading — `aspect-ratio` is a static CSS
 *          property read at layout time, not something that only takes
 *          effect once the image resolves its intrinsic size, which is what
 *          makes the reserved space zero-CLS. A plain named class rather
 *          than Tailwind's `aspect-[16/9]` arbitrary-bracket syntax (the
 *          pattern src/components/gallery/GallerySlideshowLayout.tsx already
 *          uses and src/lib/style-guard/detectStyleDrift.ts's
 *          arbitraryTailwindBracket category exists to catch) — deliberately
 *          not reused here because that pattern is pre-existing, baselined
 *          debt (see src/lib/style-guard/__fixtures__/us23-ac23.7-style-drift-baseline.ts),
 *          not something a brand-new AC-34.2 file should add to. Resolving a
 *          real Backstage gallery into the `images` prop is AC-34.3's
 *          concern — this component only renders whatever images it is
 *          given, in order, as a single-active-slide-plus-preload-next
 *          slideshow, following the same current+next preload discipline
 *          GallerySlideshowLayout.tsx already established for PRD §15.2.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.2
 * ---
 */
'use client'

import { useState } from 'react'
import Image from 'next/image'

import { createGalleryImageLoader } from '@/components/gallery/galleryImageLoader'
import { useSwipeNavigation } from '@/components/gallery/useSwipeNavigation'
import { NavigationControls } from '@/components/gallery/NavigationControls'
import type { GalleryImage } from '@/components/gallery/types'

export interface HeroSlideshowProps {
  images: GalleryImage[]
  initialIndex?: number
}

export function HeroSlideshow({ images, initialIndex = 0 }: Readonly<HeroSlideshowProps>) {
  const startIndex = images.length ? Math.min(Math.max(initialIndex, 0), images.length - 1) : 0
  const [currentIndex, setCurrentIndex] = useState(startIndex)

  const goToPrevious = () => setCurrentIndex((index) => (index - 1 + images.length) % images.length)
  const goToNext = () => setCurrentIndex((index) => (index + 1) % images.length)
  const swipeHandlers = useSwipeNavigation({ onSwipeLeft: goToNext, onSwipeRight: goToPrevious })

  if (images.length === 0) {
    return (
      <div data-testid="hero-slideshow" className="hero-slideshow-frame relative w-full overflow-hidden">
        <p role="status" className="absolute inset-0 flex items-center justify-center text-ink-tertiary">
          No hero images to display.
        </p>
      </div>
    )
  }

  const nextIndex = (currentIndex + 1) % images.length
  const currentImage = images[currentIndex]
  const nextImage = images[nextIndex]

  return (
    <div
      data-testid="hero-slideshow"
      className="hero-slideshow-frame relative w-full touch-pan-y overflow-hidden"
      {...swipeHandlers}
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

      {/* Controlled overlay + vignette presets (US-23 AC-23.7 tokens) — a
          flat scrim plus a radial vignette, composited as two layers so
          each preset stays independently swappable, never a single
          hand-tuned gradient string. */}
      <div
        data-testid="hero-overlay"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: 'var(--overlay-subtle)' }}
      />
      <div
        data-testid="hero-vignette"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'var(--vignette-soft)' }}
      />

      {currentImage.id !== nextImage.id && (
        <div data-testid="hero-slideshow-preload-next" className="sr-only relative">
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
