/**
 * ---
 * file: src/components/gallery/ThumbnailStrip.tsx
 * project: earthandhoney
 * purpose: Gallery Engine piece — renders a thumbnail per image and lets the
 *          viewer jump straight to any image in the gallery
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.1
 * ---
 */
import type { GalleryImage } from './types'

export interface ThumbnailStripProps {
  images: GalleryImage[]
  activeIndex: number
  onSelect: (index: number) => void
}

export function ThumbnailStrip({ images, activeIndex, onSelect }: ThumbnailStripProps) {
  return (
    <div
      data-testid="thumbnail-strip"
      className="thumbnail-strip flex gap-2 overflow-x-auto"
      role="listbox"
      aria-label="Gallery thumbnails"
    >
      {images.map((image, index) => (
        <button
          key={image.id}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          data-testid={`thumbnail-${index}`}
          onClick={() => onSelect(index)}
          className="thumbnail-strip__item shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- responsive next/image srcset wiring is AC-4.3's job */}
          <img src={image.url} alt={image.alt} className="h-16 w-16 object-cover" />
        </button>
      ))}
    </div>
  )
}
