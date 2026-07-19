/**
 * ---
 * file: src/components/gallery/useSlideshow.ts
 * project: earthandhoney
 * purpose: Auto-advance timer for the Gallery Engine's main image, gated by
 *          the per-gallery `settings.slideshow` display-mode toggle (e.g.
 *          the homepage hero, PRD 5.6) so the same engine that requires an
 *          explicit next/prev/swipe/thumbnail interaction in every other
 *          mode can instead cycle through images unattended. Restarts the
 *          interval whenever the image count changes so a shrinking/growing
 *          gallery never advances past its bounds, and always cleans up on
 *          unmount or when the setting flips off.
 * created-by: dev-team
 * related-story: US-5
 * related-ac: 5.4
 * ---
 */
'use client'

import { useEffect } from 'react'

// PRD 5.6 documents the hero as an unattended, ambient slideshow rather than
// a fast-cycling carousel — 5s matches public/photobuddy's own flexslider
// homepage hero timing.
const SLIDESHOW_INTERVAL_MS = 5000

export interface UseSlideshowOptions {
  enabled: boolean
  imageCount: number
  onAdvance: () => void
}

export function useSlideshow({ enabled, imageCount, onAdvance }: UseSlideshowOptions) {
  useEffect(() => {
    if (!enabled || imageCount < 2) return

    const intervalId = setInterval(onAdvance, SLIDESHOW_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [enabled, imageCount, onAdvance])
}
