/**
 * ---
 * file: src/lib/benchmarkPages.ts
 * project: earthandhoney
 * purpose: AC-29.1/29.1.1 — the two representative page identities
 *          R2_STORAGE_AND_DELIVERY_ADR.md's benchmark section names ("a
 *          portfolio gallery page and a blog gallery page"). Kept as a
 *          single source of truth, the same way
 *          src/lib/galleryRevalidation.ts's PLACEMENT_DEMO_GALLERY_SLUG/PATH
 *          pair is, so the page routes, the harness config
 *          (scripts/benchmark/run.ts), and their tests can never drift on
 *          the path string. Both routes reuse
 *          galleryRevalidation.ts's PLACEMENT_DEMO_GALLERY_SLUG — the same
 *          real, seeded Backstage gallery US-25's own demo route already
 *          renders — rather than inventing a second fixture gallery.
 * created-by: dev-team
 * related-story: US-29
 * related-ac: 29.1.1
 * ---
 */

export const BENCHMARK_PORTFOLIO_GALLERY_PATH = '/dev/benchmark-portfolio-gallery'
export const BENCHMARK_STORY_GALLERY_PATH = '/dev/benchmark-story-gallery'
