/**
 * ---
 * file: src/components/gallery/MainImageDisplay.tsx
 * project: earthandhoney
 * purpose: Gallery Engine piece — renders the currently active image. Plain
 *          <img> for now; swapping in next/image with a responsive
 *          thumbnail/medium/large srcset is AC-4.3's job, not this one
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.1
 * ---
 */
import type { GalleryImage } from './types'

export interface MainImageDisplayProps {
  image: GalleryImage
}

export function MainImageDisplay({ image }: MainImageDisplayProps) {
  return (
    <div data-testid="main-image-display" className="main-image-display relative">
      {/* eslint-disable-next-line @next/next/no-img-element -- responsive next/image srcset wiring is AC-4.3's job */}
      <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
    </div>
  )
}
