/**
 * ---
 * file: src/components/gallery/payloadGalleryMapper.ts
 * project: earthandhoney
 * purpose: Pure mapping from a Payload Galleries Local API document (with
 *          populated Media relations) to the Gallery Engine's GalleryImage[]
 *          shape. Deliberately free of any `payload` import — importing
 *          `payload` (or anything that transitively does, e.g. @payload-
 *          config) breaks Jest's ESM interop (see
 *          us3-ac3.5-galleries-api-read.test.ts), so keeping this mapping
 *          logic payload-import-free is what makes it directly unit-testable
 *          instead of only verifiable via source-text assertions or a live
 *          next build/start round trip.
 * created-by: dev-team
 * related-story: US-6
 * related-ac: 6.2
 * ---
 */
import type { GalleryImage, GallerySettings } from './types'

export interface PayloadMediaDoc {
  id: string | number
  alt?: string
  url?: string | null
  width?: number | null
  height?: number | null
  sizes?: {
    thumbnail?: { url?: string | null }
    medium?: { url?: string | null }
    large?: { url?: string | null }
  }
}

export interface PayloadGalleryDoc {
  id: string | number
  title: string
  images?: { image: PayloadMediaDoc | string | number }[]
  settings?: GallerySettings
}

function isPopulatedMediaDoc(value: PayloadMediaDoc | string | number): value is PayloadMediaDoc {
  return typeof value === 'object'
}

/**
 * Rows whose `image` relation wasn't populated (still a bare id — e.g. a
 * shallow `depth: 0` fetch) are dropped rather than crashing, so a
 * misconfigured fetch degrades to fewer images instead of a 500.
 */
export function mapPayloadGalleryToImages(gallery: PayloadGalleryDoc): GalleryImage[] {
  const rows = Array.isArray(gallery.images) ? gallery.images : []
  return rows
    .map((row) => row.image)
    .filter(isPopulatedMediaDoc)
    .map((media) => ({
      id: String(media.id),
      url: media.url ?? '',
      alt: media.alt || gallery.title,
      thumbnailUrl: media.sizes?.thumbnail?.url ?? undefined,
      mediumUrl: media.sizes?.medium?.url ?? undefined,
      largeUrl: media.sizes?.large?.url ?? undefined,
      width: media.width ?? undefined,
      height: media.height ?? undefined,
    }))
}
