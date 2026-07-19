/**
 * ---
 * file: src/components/gallery/useProgressiveThumbnails.ts
 * project: earthandhoney
 * purpose: Windows how many thumbnails ThumbnailStrip mounts at once so a
 *          large gallery never loads its full thumbnail set upfront (PRD §6
 *          "Initial Load — Never load the entire gallery. Only load: visible
 *          images, required thumbnails."). Initially reveals one batch, plus
 *          whichever thumbnail is currently active (so navigating past the
 *          first batch via Next/Previous/swipe/slideshow never hides the
 *          selected thumbnail). The remaining thumbnails stay unmounted — not
 *          just visually hidden — until an IntersectionObserver on a sentinel
 *          element at the end of the strip reports the visitor has scrolled
 *          near it, at which point the next batch is revealed. This is
 *          deliberately DOM-level gating rather than relying solely on
 *          next/image's default `loading="lazy"`: a collapsed/hidden
 *          ThumbnailDrawer panel (AC-5.2/5.3) still lays its children out at
 *          a real position in the page, so a mounted-but-clipped `<img>`
 *          would otherwise still register as viewport-adjacent to the
 *          browser's native lazy-load heuristic and fetch immediately.
 * created-by: dev-team
 * related-story: US-6
 * related-ac: 6.1
 * ---
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// A horizontal strip at the public/photobuddy container width (1130px) with
// ThumbnailStrip's 64px thumbnails + 12px gap fits roughly this many before
// scrolling — a reasonable "required" initial batch that covers what's
// visible without scrolling on most viewports.
const DEFAULT_BATCH_SIZE = 12

export interface UseProgressiveThumbnailsOptions {
  totalCount: number
  /** Currently selected image index — always included in the revealed batch, even beyond the initial window. */
  activeIndex: number
  batchSize?: number
}

export function useProgressiveThumbnails({
  totalCount,
  activeIndex,
  batchSize = DEFAULT_BATCH_SIZE,
}: UseProgressiveThumbnailsOptions) {
  const [revealedCount, setRevealedCount] = useState(() => Math.min(totalCount, batchSize))
  const observerRef = useRef<IntersectionObserver | null>(null)

  const revealMore = useCallback(() => {
    setRevealedCount((count) => Math.min(totalCount, count + batchSize))
  }, [totalCount, batchSize])

  const sentinelRef = useCallback(
    (node: Element | null) => {
      observerRef.current?.disconnect()
      observerRef.current = null

      if (!node || typeof IntersectionObserver === 'undefined') return

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) revealMore()
      })
      observerRef.current.observe(node)
    },
    [revealMore],
  )

  useEffect(() => () => observerRef.current?.disconnect(), [])

  const requiredCount = Math.min(totalCount, Math.max(batchSize, activeIndex + 1))
  const visibleCount = Math.max(revealedCount, requiredCount)

  return { visibleCount, sentinelRef }
}
