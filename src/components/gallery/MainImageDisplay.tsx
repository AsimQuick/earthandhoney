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
 *          into and clip a cover-cropped photo against (AC-4.5). When
 *          `onOpenFullscreen` is supplied, the image is wrapped in a button
 *          so clicking or tapping it — or activating it via keyboard —
 *          opens the PhotoSwipe fullscreen viewer (AC-5.1).
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.2
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.3
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.5
 * updated-by: dev-team
 * related-story: US-5
 * related-ac: 5.1
 * ---
 */
import Image from 'next/image'

import { createGalleryImageLoader } from './galleryImageLoader'
import { GradientOverlay } from './GradientOverlay'
import type { GalleryImage } from './types'

export interface MainImageDisplayProps {
  image: GalleryImage
  /** Opens the fullscreen PhotoSwipe viewer on this image (US-5, AC-5.1). Omitted, the image renders without a click/tap trigger. */
  onOpenFullscreen?: () => void
}

export function MainImageDisplay({ image, onOpenFullscreen }: MainImageDisplayProps) {
  const content = (
    <>
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes="100vw"
        loader={createGalleryImageLoader(image)}
        className="object-cover"
      />
      <GradientOverlay />
    </>
  )

  if (!onOpenFullscreen) {
    return (
      <div
        data-testid="main-image-display"
        className="main-image-display relative aspect-[3/2] w-full overflow-hidden sm:aspect-[16/9]"
      >
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      data-testid="main-image-display"
      onClick={onOpenFullscreen}
      aria-label={`Open fullscreen view of ${image.alt}`}
      className="main-image-display relative block aspect-[3/2] w-full cursor-zoom-in overflow-hidden sm:aspect-[16/9]"
    >
      {content}
    </button>
  )
}
