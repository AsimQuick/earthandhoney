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
 *          transition timing used throughout the template (AC-4.5).
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.1
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.3
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.5
 * ---
 */
import Image from 'next/image'

import { createGalleryImageLoader } from './galleryImageLoader'
import type { GalleryImage } from './types'

const THUMBNAIL_DISPLAY_SIZE = 64

export interface ThumbnailStripProps {
  images: GalleryImage[]
  activeIndex: number
  onSelect: (index: number) => void
}

export function ThumbnailStrip({ images, activeIndex, onSelect }: ThumbnailStripProps) {
  return (
    <div
      data-testid="thumbnail-strip"
      className="thumbnail-strip flex gap-3 overflow-x-auto"
      role="listbox"
      aria-label="Gallery thumbnails"
    >
      {images.map((image, index) => {
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
    </div>
  )
}
