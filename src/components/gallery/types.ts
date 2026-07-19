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
 * ---
 */

export interface GalleryImage {
  id: string
  url: string
  alt: string
}
