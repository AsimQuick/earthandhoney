/**
 * ---
 * file: src/components/gallery/useSwipeNavigation.ts
 * project: earthandhoney
 * purpose: Touch-swipe navigation for the Gallery Engine's main image
 *          viewport (AC-5.2) — a horizontal swipe past a small threshold
 *          advances/reverses the current image, mirroring the
 *          next/previous behavior NavigationControls already exposes for
 *          mouse/keyboard. Ignores gestures that are mostly vertical so it
 *          does not hijack normal page scrolling on a touch device.
 * created-by: dev-team
 * related-story: US-5
 * related-ac: 5.2
 * ---
 */
'use client'

import { useRef } from 'react'
import type { TouchEvent } from 'react'

// Below this horizontal distance (px), a touch is treated as a tap/scroll,
// not an intentional swipe.
const SWIPE_THRESHOLD_PX = 50

export interface UseSwipeNavigationOptions {
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

export function useSwipeNavigation({ onSwipeLeft, onSwipeRight }: UseSwipeNavigationOptions) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null

    const touch = event.changedTouches[0]
    if (!start || !touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return
    }

    if (deltaX < 0) {
      onSwipeLeft()
    } else {
      onSwipeRight()
    }
  }

  return { onTouchStart, onTouchEnd }
}
