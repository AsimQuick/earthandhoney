/**
 * ---
 * file: src/components/gallery/ThumbnailStrip.tsx
 * project: earthandhoney
 * purpose: Gallery Engine piece — renders a thumbnail per image and lets the
 *          viewer jump straight to any image in the gallery. Each thumbnail
 *          renders via next/image so it requests the small Sharp thumbnail
 *          variant (see galleryImageLoader) instead of a full-size image.
 *          The opacity/underline treatment on hover and on the active
 *          thumbnail mirrors public/photobuddy's recurring accent-underline
 *          motif (e.g. `.title_holder h2 span:after`) and its `.5s ease`
 *          transition timing used throughout the template (AC-4.5). Only
 *          mounts a windowed batch of thumbnails at a time (plus whichever
 *          is active) via useProgressiveThumbnails, so a large gallery never
 *          loads its full thumbnail set upfront (AC-6.1) — the rest reveal
 *          progressively as a sentinel element at the end of the strip
 *          scrolls into view.
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.1
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.3
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.5
 * updated-by: dev-team
 * related-story: US-6
 * related-ac: 6.1
 * ---
 */
import Image from 'next/image'

import { createGalleryImageLoader } from './galleryImageLoader'
import { useProgressiveThumbnails } from './useProgressiveThumbnails'
import type { GalleryImage } from './types'

const THUMBNAIL_DISPLAY_SIZE = 64

export interface ThumbnailStripProps {
  images: GalleryImage[]
  activeIndex: number
  onSelect: (index: number) => void
}

export function ThumbnailStrip({ images, activeIndex, onSelect }: ThumbnailStripProps) {
  const { visibleCount, sentinelRef } = useProgressiveThumbnails({
    totalCount: images.length,
    activeIndex,
  })
  const visibleImages = images.slice(0, visibleCount)

  return (
    <div
      data-testid="thumbnail-strip"
      className="thumbnail-strip flex gap-3 overflow-x-auto"
      role="listbox"
      aria-label="Gallery thumbnails"
    >
      {visibleImages.map((image, index) => {
        const isActive = index === activeIndex
        return (
          <button
            key={image.id}
            type="button"
            role="option"
            aria-selected={isActive}
            data-testid={`thumbnail-${index}`}
            onClick={() => onSelect(index)}
            className={`thumbnail-strip__item shrink-0 border-b-2 pb-1 transition-[opacity,border-color] duration-500 ease-in-out ${
              isActive ? 'border-black opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Image
              src={image.url}
              alt={image.alt}
              width={THUMBNAIL_DISPLAY_SIZE}
              height={THUMBNAIL_DISPLAY_SIZE}
              loader={createGalleryImageLoader(image)}
              className="h-16 w-16 object-cover"
            />
          </button>
        )
      })}
      {visibleCount < images.length && (
        <div
          ref={sentinelRef}
          data-testid="thumbnail-strip-sentinel"
          aria-hidden="true"
          className="w-px shrink-0"
        />
      )}
    </div>
  )
}
