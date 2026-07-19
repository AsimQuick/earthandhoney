/**
 * ---
 * file: src/components/gallery/galleryImageLoader.ts
 * project: earthandhoney
 * purpose: Picks the Sharp-generated variant (thumbnail/medium/large,
 *          falling back to the original) closest to the width next/image
 *          requests for a given viewport/device-pixel-ratio, and exposes it
 *          as a next/image `loader` bound to one GalleryImage
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.3
 * ---
 */
import type { GalleryImage } from './types'

// Mirrors the Sharp-generated widths declared in src/collections/Media.ts —
// keep these two in sync if that collection's imageSizes ever change.
const THUMBNAIL_MAX_WIDTH = 400
const MEDIUM_MAX_WIDTH = 1200

export function resolveGalleryImageSrc(image: GalleryImage, requestedWidth: number): string {
  if (requestedWidth <= THUMBNAIL_MAX_WIDTH) {
    return image.thumbnailUrl ?? image.mediumUrl ?? image.largeUrl ?? image.url
  }
  if (requestedWidth <= MEDIUM_MAX_WIDTH) {
    return image.mediumUrl ?? image.largeUrl ?? image.thumbnailUrl ?? image.url
  }
  return image.largeUrl ?? image.mediumUrl ?? image.thumbnailUrl ?? image.url
}

export function createGalleryImageLoader(image: GalleryImage) {
  return ({ width }: { width: number }) => resolveGalleryImageSrc(image, width)
}
