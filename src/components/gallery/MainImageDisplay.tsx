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
 *          CSS gradient treatment. The `relative`/`overflow-hidden`/aspect
 *          box mirrors public/photobuddy's own image containers
 *          (`.photobuddy_fl_slider ul li`, `.img_list_nth`), which are the
 *          only thing giving `fill`-mode next/image a real box to paint
 *          into and clip a cover-cropped photo against (AC-4.5).
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.2
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
import { GradientOverlay } from './GradientOverlay'
import type { GalleryImage } from './types'

export interface MainImageDisplayProps {
  image: GalleryImage
}

export function MainImageDisplay({ image }: MainImageDisplayProps) {
  return (
    <div
      data-testid="main-image-display"
      className="main-image-display relative aspect-[3/2] w-full overflow-hidden sm:aspect-[16/9]"
    >
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
