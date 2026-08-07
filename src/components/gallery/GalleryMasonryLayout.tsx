/**
 * ---
 * file: src/components/gallery/GalleryMasonryLayout.tsx
 * project: earthandhoney
 * purpose: PRD §15.1's masonry layout — one of the two placement layouts
 *          AC-25.5 proves render the same Backstage-sourced gallery
 *          differently. Every image keeps the aspect ratio it was received
 *          with (each item's wrapper sets an inline `aspect-ratio` computed
 *          from GalleryImage.width/height, the same fields
 *          backstageGalleryMapper.ts already carries through from the
 *          Backstage photo row) and renders in the exact order it was
 *          given — no sort, no reflow. Because the wrapper's aspect ratio is
 *          set synchronously at render, before the image asset has loaded,
 *          the browser never has to reflow surrounding content once it
 *          arrives (PRD §15.1 "reserve aspect-ratio space before load", zero
 *          image-caused layout shift). `object-contain` — never
 *          `object-cover` — is the deliberate, permanent choice here, not a
 *          per-image judgment call: PRD §15.1 forbids ever cropping or
 *          stretching a masonry image, and unlike `object-cover`,
 *          `object-contain` honors that even for the rare item whose
 *          reported width/height turn out to not exactly match its decoded
 *          pixels. CSS multi-column layout (`columns-*` + `break-inside-
 *          avoid`) is what actually produces the masonry packing — one
 *          column on mobile, two on tablet, three/four on larger screens per
 *          PRD §15.1's column-count guidance. A dedicated component, not a
 *          `GalleryEngine` settings mode: the engine's MainImageDisplay is
 *          built around `object-cover`/`fill` cropping and a single active
 *          image (US-4/5/6's hero/portfolio/client-delivery scope), which is
 *          the opposite of masonry's never-crop, show-everything-at-once
 *          requirement.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.5
 * updated-by: dev-team
 * related-story: US-26
 * related-ac: 26.4
 * ---
 */
// `loader={createGalleryImageLoader(image)}` below passes a function prop to
// next/image's `<Image>`, whose implementation is itself a Client Component
// — a Server Component (this file's default, having no directive) cannot
// pass an unserializable function prop across that boundary. Jest's
// `render()` never exercises real RSC serialization, so every unit test
// against this component passed regardless; the failure only surfaced live,
// once AC-26.4's proof rendered a real (non-empty) gallery through the
// actual Next.js server, matching the "Functions cannot be passed directly
// to Client Components" error observed then. GallerySlideshowLayout.tsx
// already carries this exact directive for the identical reason (same
// `createGalleryImageLoader` loader prop) — this brings masonry in line
// with it rather than inventing a new pattern.
'use client'

import Image from 'next/image'

import { createGalleryImageLoader } from './galleryImageLoader'
import type { GalleryImage } from './types'

// Full available width, one column on mobile up to four on larger screens,
// per PRD §15.1.
const MASONRY_COLUMNS_CLASS = 'columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4'

// Mirrors MASONRY_COLUMNS_CLASS's breakpoints so next/image requests a
// variant sized for the column the browser will actually place this item in,
// not the full viewport width.
const MASONRY_SIZES =
  '(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'

/** Falls back to a 1:1 box only when a photo carries no known dimensions — see this file's docblock on why `object-contain` (not `object-cover`) is what keeps that fallback from ever cropping the image. */
function aspectRatioValue(image: GalleryImage): string {
  return image.width && image.height ? `${image.width} / ${image.height}` : '1 / 1'
}

export interface GalleryMasonryLayoutProps {
  images: GalleryImage[]
}

export function GalleryMasonryLayout({ images }: GalleryMasonryLayoutProps) {
  if (images.length === 0) {
    return (
      <div data-testid="gallery-masonry" className={`w-full ${MASONRY_COLUMNS_CLASS}`}>
        <p role="status">No images to display.</p>
      </div>
    )
  }

  return (
    <div data-testid="gallery-masonry" className={`w-full ${MASONRY_COLUMNS_CLASS}`}>
      {images.map((image, index) => (
        <div
          key={image.id}
          data-testid={`masonry-item-${index}`}
          data-image-id={image.id}
          className="relative mb-4 w-full break-inside-avoid"
          style={{ aspectRatio: aspectRatioValue(image) }}
        >
          <Image
            src={image.largeUrl ?? image.url}
            alt={image.alt}
            fill
            sizes={MASONRY_SIZES}
            loader={createGalleryImageLoader(image)}
            loading="lazy"
            className="object-contain"
          />
        </div>
      ))}
    </div>
  )
}
