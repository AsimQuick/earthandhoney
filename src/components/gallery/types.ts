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
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.4
 * updated-by: dev-team
 * related-story: US-5
 * related-ac: 5.1
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
  /** Original file's pixel width, if known — lets the PhotoSwipe fullscreen viewer (US-5) lay out/zoom correctly before the full-size image loads. */
  width?: number
  /** Original file's pixel height, if known. */
  height?: number
}

/**
 * Mirrors the `settings` group on the Payload Galleries collection (see
 * src/collections/Galleries.ts) — the display-mode toggles that let one
 * Gallery Engine instance drive a hero, portfolio, blog, or client-delivery
 * experience without a separate component tree per context.
 */
export interface GallerySettings {
  slideshow: boolean
  hoverPreview: boolean
  fullscreen: boolean
  download: boolean
  requireAuth: boolean
}
