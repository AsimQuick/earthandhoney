/**
 * ---
 * file: src/components/gallery/backstageGalleryMapper.ts
 * project: earthandhoney
 * purpose: Pure mapping from a Backstage `GET /api/gallery/:slug/photos`
 *          response (PAYLOAD_PICPEAK_API_CONTRACT.md Flow A row 2, fetched
 *          via src/lib/backstageClient.ts) to the Gallery Engine's
 *          GalleryImage[] shape — the same shape payloadGalleryMapper.ts
 *          already produces. This is PIVOT_AUDIT.md's "Kept as a Frontstage
 *          renderer" disposition for src/components/gallery/: the engine and
 *          every other component in this directory stays unchanged, only the
 *          data source feeding it moves from Payload to Backstage. thumbnail_
 *          url/preview_url/hero_url are PicPeak's own three delivery tiers
 *          (vendor/picpeak/backend/src/routes/gallery.js) and map onto
 *          GalleryImage's thumbnail/medium/large tiers in that order. PicPeak
 *          photos carry no accessibility alt text (no such field exists on
 *          the fork's photo row), so `alt` falls back to the photo's
 *          filename, then the gallery's `event_name`, mirroring
 *          payloadGalleryMapper's `media.alt || gallery.title` fallback
 *          shape with the nearest fields Backstage actually returns.
 *          Deliberately free of any `payload` import, same reasoning as
 *          payloadGalleryMapper.ts's docblock, so it stays directly
 *          unit-testable.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.3
 * ---
 */
import type { GalleryPhoto, GalleryPhotosResponse } from '@/lib/backstageClient'
import type { GalleryImage } from './types'

interface BackstagePhoto extends GalleryPhoto {
  original_filename?: string | null
  preview_url?: string | null
  hero_url?: string | null
  width?: number | null
  height?: number | null
}

function galleryEventName(response: GalleryPhotosResponse): string {
  const name = response.event?.event_name
  return typeof name === 'string' ? name : ''
}

/**
 * Rows with a missing/non-string `url` fall back to an empty string rather
 * than being dropped — every Flow A photo row is expected to carry one, so
 * unlike payloadGalleryMapper's unpopulated-relation case this is not a
 * normal shape to defend against, only a defensive default.
 */
export function mapBackstageGalleryToImages(response: GalleryPhotosResponse): GalleryImage[] {
  const photos = Array.isArray(response.photos) ? response.photos : []
  const fallbackAlt = galleryEventName(response)

  return photos.map((raw) => {
    const photo = raw as BackstagePhoto
    return {
      id: String(photo.id),
      url: photo.url ?? '',
      alt: photo.original_filename || photo.filename || fallbackAlt || '',
      thumbnailUrl: photo.thumbnail_url ?? undefined,
      mediumUrl: photo.preview_url ?? undefined,
      largeUrl: photo.hero_url ?? undefined,
      width: photo.width ?? undefined,
      height: photo.height ?? undefined,
    }
  })
}
