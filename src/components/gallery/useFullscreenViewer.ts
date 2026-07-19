/**
 * ---
 * file: src/components/gallery/useFullscreenViewer.ts
 * project: earthandhoney
 * purpose: Wires the Gallery Engine to a PhotoSwipe fullscreen viewer.
 *          Initializes one PhotoSwipeLightbox instance per gallery from an
 *          in-memory dataSource (no DOM-anchor scanning — the images are
 *          already in React state), and exposes an imperative `open(index)`
 *          so clicking/tapping the currently displayed image opens
 *          PhotoSwipe on that exact slide. Next/previous, close, swipe, and
 *          keyboard navigation are PhotoSwipe's own default behavior (see
 *          `defaultOptions` in the photoswipe package: `arrowKeys: true`,
 *          `escKey: true`, `bgClickAction: 'close'`, swipe/pinch gestures
 *          always on) — none of them are disabled here (AC-5.1).
 * created-by: dev-team
 * related-story: US-5
 * related-ac: 5.1
 * ---
 */
'use client'

import { useEffect, useRef } from 'react'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'

import type { GalleryImage } from './types'

// PhotoSwipe needs a width/height per slide to lay out and calculate zoom
// levels before the full-size image has loaded. Sharp's "large" variant (see
// src/collections/Media.ts imageSizes) is generated at a fixed 2048px width
// with height derived from the original's aspect ratio, so a 3:2 landscape
// estimate is the best static fallback until per-image dimensions are wired
// from Payload's captured upload metadata.
const FALLBACK_WIDTH = 2048
const FALLBACK_HEIGHT = 1365

export function useFullscreenViewer(images: GalleryImage[]) {
  const lightboxRef = useRef<PhotoSwipeLightbox | null>(null)

  useEffect(() => {
    const lightbox = new PhotoSwipeLightbox({
      dataSource: images.map((image) => ({
        src: image.largeUrl ?? image.url,
        width: image.width ?? FALLBACK_WIDTH,
        height: image.height ?? FALLBACK_HEIGHT,
        alt: image.alt,
      })),
      pswpModule: () => import('photoswipe'),
      bgOpacity: 0.9,
    })
    lightbox.init()
    lightboxRef.current = lightbox

    return () => {
      lightbox.destroy()
      lightboxRef.current = null
    }
  }, [images])

  return (index: number) => {
    lightboxRef.current?.loadAndOpen(index)
  }
}
