/**
 * ---
 * file: src/components/gallery/MainImageDisplay.tsx
 * project: earthandhoney
 * purpose: Gallery Engine piece — renders the currently active image via
 *          next/image, sourcing its responsive srcset from the Sharp
 *          thumbnail/medium/large variants (see galleryImageLoader) so the
 *          browser requests an appropriately-sized image per viewport.
 *          Stacks the shared GradientOverlay (AC-4.2) over the image so
 *          every Gallery Engine instantiation gets the same subtle black
 *          CSS gradient treatment.
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.2
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.3
 * ---
 */
import Image from 'next/image'

import { createGalleryImageLoader } from './galleryImageLoader'
import { GradientOverlay } from './GradientOverlay'
import type { GalleryImage } from './types'

export interface MainImageDisplayProps {
  image: GalleryImage
}

export function MainImageDisplay({ image }: MainImageDisplayProps) {
  return (
    <div data-testid="main-image-display" className="main-image-display relative">
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes="100vw"
        loader={createGalleryImageLoader(image)}
        className="object-cover"
      />
      <GradientOverlay />
    </div>
  )
}
