/**
 * ---
 * file: src/lib/sitemapImagePath.ts
 * project: earthandhoney
 * purpose: AC-37.4.3 — the single rule deciding which site-relative path a
 *          placed Backstage photo contributes to the image sitemap. The AC
 *          fixes that path to the Backstage-relative
 *          `/api/gallery/:slug/(thumbnail|hero|photo|preview)/:photoId` shape
 *          built by vendor/picpeak/backend/src/routes/gallery.js and mapped by
 *          src/components/gallery/backstageGalleryMapper.ts, because exactly
 *          that shape — and only that shape — is already public on the
 *          Frontstage origin through the next.config.ts rewrite added in
 *          AC-29.2.2.1. No new delivery path, proxy or storage URL may be
 *          introduced by the sitemap.
 *
 *          A `GalleryImage.url` is NOT unconditionally that shape.
 *          gallery.js's `/:slug/photos` handler only emits the
 *          `/api/gallery/.../photo/...` form when the event's
 *          `protection_level` is `basic` or `standard` (its default); at
 *          `enhanced`/`maximum` it emits the
 *          `/api/secure-images/:slug/secure/:photoId/{{token}}` *template*
 *          instead — an unexpanded placeholder, on a route the rewrite does
 *          not proxy. Emitting that verbatim would put a literal `{{token}}`
 *          into the sitemap XML and point Google at a URL that cannot resolve.
 *          So each candidate tier is checked against the public shape and the
 *          first match wins: the full `photo` tier when it is public, else the
 *          `hero`/`preview`/`thumbnail` tiers, which gallery.js builds as
 *          gallery paths regardless of protection level. A photo with no
 *          public tier at all contributes nothing rather than a broken
 *          reference — the same "never present a half-complete result"
 *          reasoning src/lib/backstageGalleryPlacement.ts already applies to a
 *          failed Flow A fetch.
 *
 *          Import-free at runtime (the one import is type-only and erased), so
 *          a Jest test exercises it directly rather than through the
 *          `payload` ESM boundary that keeps src/lib/getSitemapEntries.ts
 *          untestable by direct import (see us3-ac3.5-galleries-api-read.test.ts)
 *          — the same reasoning src/lib/absoluteSiteUrl.ts follows.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.4.3
 * ---
 */
import type { GalleryImage } from '@/components/gallery/types'

/**
 * The one publicly-served Backstage image path shape: the four binary tiers
 * `next.config.ts`'s AC-29.2.2.1 rewrite proxies, optionally carrying
 * gallery.js's `?wm=…` watermark cache-busting query.
 */
export const PUBLIC_BACKSTAGE_IMAGE_PATH =
  /^\/api\/gallery\/[^/?#]+\/(?:thumbnail|hero|photo|preview)\/[^/?#]+(?:\?[^#]*)?$/

/**
 * The photo's site-relative path for an `<image:loc>`, or `undefined` when
 * none of its tiers is publicly resolvable on the Frontstage origin.
 *
 * Ordered widest-first: the full `photo` tier is the best image-sitemap
 * subject, with the `hero`, `preview` and `thumbnail` tiers as fallbacks for a
 * protection level under which gallery.js withholds the full tier.
 */
export function sitemapImagePath(image: GalleryImage): string | undefined {
  return [image.url, image.largeUrl, image.mediumUrl, image.thumbnailUrl].find(
    (candidate): candidate is string =>
      typeof candidate === 'string' && PUBLIC_BACKSTAGE_IMAGE_PATH.test(candidate),
  )
}
