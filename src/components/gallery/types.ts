/**
 * ---
 * file: src/components/gallery/types.ts
 * project: earthandhoney
 * purpose: Shared types for the Gallery Engine component set — the single
 *          gallery-agnostic shape every engine piece (container, main
 *          display, thumbnail strip, navigation controls) is built against
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.1
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.3
 * ---
 */

export interface GalleryImage {
  id: string
  /** Original, full-resolution file — the last-resort fallback when no Sharp variant is available. */
  url: string
  alt: string
  /** Sharp-generated 400px variant (see src/collections/Media.ts imageSizes). */
  thumbnailUrl?: string
  /** Sharp-generated 1200px variant. */
  mediumUrl?: string
  /** Sharp-generated 2048px variant. */
  largeUrl?: string
}
