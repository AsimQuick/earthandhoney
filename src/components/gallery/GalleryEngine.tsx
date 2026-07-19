/**
 * ---
 * file: src/components/gallery/GalleryEngine.tsx
 * project: earthandhoney
 * purpose: Gallery Engine container — the single reusable component that
 *          renders any gallery (homepage hero, portfolio, blog, client
 *          delivery) by composing Main Image Display, Thumbnail Preview
 *          strip, and Navigation Controls around one shared "current image"
 *          state. No separate image system per context. Tracks pointer
 *          hover over the whole gallery so ThumbnailDrawer can reveal its
 *          strip on desktop hover per `settings.hoverPreview` (AC-5.3, PRD
 *          5.7) without disturbing the independent mobile tap-drawer state
 *          from AC-5.2. Loads the same 'Rubik' typeface public/photobuddy
 *          declares
 *          (`body { font-family:'Rubik', Arial, Helvetica, sans-serif; }`)
 *          and applies its base body type scale (14px / line-height 1.5 /
 *          0.5px letter-spacing) so every engine instance's typography
 *          matches the template (AC-4.5). Every other display-mode toggle
 *          (`settings.fullscreen`, `settings.slideshow`, `settings.download`)
 *          is enforced here too, so hero/portfolio/client-delivery
 *          instances differ only by the settings object passed in (AC-5.4).
 *          `settings.requireAuth` has no enforcement yet (stubbed this
 *          sprint per AC-5.4) but is still exposed via `data-require-auth`
 *          for downstream wiring. Accepts an optional `priority` passthrough
 *          (AC-6.4) for the one above-the-fold instance per page (e.g. a
 *          hero gallery) so its main image loads eagerly; every other
 *          instance defaults to MainImageDisplay's explicit
 *          `loading="lazy"`, so a page stacking multiple galleries never
 *          requests more than the single in-viewport main image upfront.
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.1
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.4
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.5
 * updated-by: dev-team
 * related-story: US-5
 * related-ac: 5.1
 * updated-by: dev-team
 * related-story: US-5
 * related-ac: 5.2
 * updated-by: dev-team
 * related-story: US-5
 * related-ac: 5.3
 * updated-by: dev-team
 * related-story: US-5
 * related-ac: 5.4
 * updated-by: dev-team
 * related-story: US-6
 * related-ac: 6.4
 * ---
 */
'use client'

import { useState } from 'react'
import { Rubik } from 'next/font/google'

import { DownloadControl } from './DownloadControl'
import { MainImageDisplay } from './MainImageDisplay'
import { NavigationControls } from './NavigationControls'
import { ThumbnailDrawer } from './ThumbnailDrawer'
import { useFullscreenViewer } from './useFullscreenViewer'
import { useSlideshow } from './useSlideshow'
import { useSwipeNavigation } from './useSwipeNavigation'
import type { GalleryImage, GallerySettings } from './types'

// Mirrors public/photobuddy/index.html's Google Fonts <link> ("Rubik:300,300i,
// 400,400i,500,500i,700,700i,900,900i") — only the weights the template's own
// CSS actually uses (400 for body/headings) are loaded here.
const rubik = Rubik({ subsets: ['latin'], weight: ['400'] })

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
  /** Marks this instance's main image as the page's above-the-fold LCP candidate (AC-6.4) — pass on at most one instance per page (e.g. a hero gallery at the top). Every other instance should leave this unset so its main image stays on the explicit lazy path. */
  priority?: boolean
}

export function GalleryEngine({
  images,
  initialIndex = 0,
  settings = DEFAULT_SETTINGS,
  priority = false,
}: GalleryEngineProps) {
  const startIndex = images.length
    ? Math.min(Math.max(initialIndex, 0), images.length - 1)
    : 0
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const openFullscreen = useFullscreenViewer(images)
  const goToPrevious = () => setCurrentIndex((index) => (index - 1 + images.length) % images.length)
  const goToNext = () => setCurrentIndex((index) => (index + 1) % images.length)
  const swipeHandlers = useSwipeNavigation({ onSwipeLeft: goToNext, onSwipeRight: goToPrevious })
  useSlideshow({ enabled: settings.slideshow, imageCount: images.length, onAdvance: goToNext })

  if (images.length === 0) {
    return (
      <div data-testid="gallery-engine" className={`gallery-engine ${rubik.className} text-[14px] leading-[1.5] tracking-[0.5px]`}>
        <p role="status">No images to display.</p>
      </div>
    )
  }

  return (
    <div
      data-testid="gallery-engine"
      className={`gallery-engine ${rubik.className} flex flex-col gap-6 text-[14px] leading-[1.5] tracking-[0.5px]`}
      data-slideshow={settings.slideshow}
      data-hover-preview={settings.hoverPreview}
      data-fullscreen={settings.fullscreen}
      data-download={settings.download}
      data-require-auth={settings.requireAuth}
      data-hovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative touch-pan-y" {...swipeHandlers}>
        <MainImageDisplay
          image={images[currentIndex]}
          onOpenFullscreen={settings.fullscreen ? () => openFullscreen(currentIndex) : undefined}
          priority={priority}
        />
        <NavigationControls onPrevious={goToPrevious} onNext={goToNext} />
        {settings.download && <DownloadControl image={images[currentIndex]} />}
      </div>
      <ThumbnailDrawer
        images={images}
        activeIndex={currentIndex}
        onSelect={setCurrentIndex}
        isOpen={isDrawerOpen}
        onToggle={() => setIsDrawerOpen((open) => !open)}
        hoverPreview={settings.hoverPreview}
        isHovered={isHovered}
      />
    </div>
  )
}
