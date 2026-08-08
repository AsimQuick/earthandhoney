/**
 * ---
 * file: src/lib/benchmark/deliveryPathImages.ts
 * project: earthandhoney
 * purpose: AC-29.2 — swaps a resolved gallery's Backstage-proxied image URLs
 *          (candidate path 1, R2_STORAGE_AND_DELIVERY_ADR.md's "Serving
 *          through the Backstage") for direct time-limited presigned R2
 *          links (candidate path 2, the same ADR's `S3StorageBackend.signedUrl`
 *          mechanism), so the benchmark harness can measure both delivery
 *          mechanisms against the exact same seeded gallery and page markup
 *          — nothing else about the page changes between the two measured
 *          runs. Pure logic: no fetch, no fs, no AWS SDK. The presigned URLs
 *          themselves are generated ahead of a measured run by
 *          scripts/benchmark/presign-r2-urls.sh, which calls the pinned
 *          fork's own `S3StorageBackend.signedUrl` — the exact mechanism
 *          candidate 2 names — and this module only ever consumes the
 *          resulting plain map.
 *          AC-29.2.2.2: deliberately does not import `GalleryImage` from
 *          '@/components/gallery/types' — scripts/benchmark/Dockerfile only
 *          COPYs src/lib/benchmark/ and src/lib/benchmarkPages.ts into the
 *          "lighthouse-benchmark" image (by design, to keep the
 *          lighthouse/chrome-launcher dependency tree out of the app's own
 *          node_modules), and run.ts now imports this module's sibling
 *          resolveBenchmarkDeliveryPath.ts at runtime, which pulls in this
 *          file's exported types. A `@/`-aliased import here would fail
 *          module resolution inside that image, where the app's `src/components/`
 *          tree does not exist. `DeliveryPathImage` below is the minimal
 *          structural subset `GalleryImage` already satisfies, so the two
 *          call sites in src/app/(frontend)/dev/benchmark-*-gallery/page.tsx
 *          pass their `GalleryImage[]` straight through with no cast.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.2.2.2
 * ---
 */

export type DeliveryPath = 'backstage-proxy' | 'presigned-r2'

/** The minimal image shape this module reads/writes — see the header note on why this is not `GalleryImage` directly. */
export interface DeliveryPathImage {
  id: string
  url: string
  thumbnailUrl?: string
  mediumUrl?: string
  largeUrl?: string
}

export interface PresignedImageUrls {
  url?: string
  thumbnailUrl?: string
  mediumUrl?: string
  largeUrl?: string
}

export type PresignedImageMap = Record<string, PresignedImageUrls>

/**
 * `'backstage-proxy'` returns `images` untouched — that path's Backstage-
 * issued relative URLs (mediated through next.config.ts's rewrite to the
 * Backstage backend) are already what `resolveGalleryPlacementImages`
 * produces. `'presigned-r2'` swaps each tier present in
 * `presignedByPhotoId` onto the matching image; a photo id absent from the
 * map (or a tier missing within an entry) keeps its Backstage-proxied URL
 * rather than silently disappearing, so a partial presign run degrades to a
 * visibly mixed-path page instead of a broken one.
 */
export function applyDeliveryPath<T extends DeliveryPathImage>(
  images: T[],
  path: DeliveryPath,
  presignedByPhotoId: PresignedImageMap = {},
): T[] {
  if (path === 'backstage-proxy') return images

  return images.map((image) => {
    const presigned = presignedByPhotoId[image.id]
    if (!presigned) return image

    return {
      ...image,
      url: presigned.url ?? image.url,
      thumbnailUrl: presigned.thumbnailUrl ?? image.thumbnailUrl,
      mediumUrl: presigned.mediumUrl ?? image.mediumUrl,
      largeUrl: presigned.largeUrl ?? image.largeUrl,
    }
  })
}
