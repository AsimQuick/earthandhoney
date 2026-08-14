/**
 * ---
 * file: src/lib/style-guard/__fixtures__/us23-ac23.7-style-drift-baseline.ts
 * project: earthandhoney
 * purpose: Frozen ratchet baseline for the AC-23.7 style-drift guard — the
 *          raw hex colour / raw px font-size / arbitrary Tailwind bracket
 *          counts that already existed under src/components/ and src/app/
 *          before this guard was introduced (pre-token-lockdown gallery
 *          components from earlier stories, the noindex dev demo/specimen
 *          routes, and globals.css's legacy --background/--foreground
 *          fallback). The guard test asserts current counts never exceed
 *          these per file, and that no un-listed file gains any violation —
 *          so this file may only shrink (as future stories migrate these
 *          files onto tokens) or gain new entries with a matching commit
 *          that adds new pre-existing debt, never grow silently.
 *          AC-25.5 added two entries this way: GallerySlideshowLayout.tsx's
 *          `aspect-[3/2]`/`aspect-[16/9]` mirror MainImageDisplay.tsx's
 *          already-baselined slide aspect ratio, and
 *          dev/gallery-placement-demo/page.tsx's `tracking-[3px]` headings
 *          mirror dev/gallery-demo/page.tsx's already-baselined heading
 *          style — reused idioms, not new debt shapes. AC-26.4 added
 *          dev/gallery-webhook-proof/page.tsx's two `tracking-[3px]`
 *          headings the same way, mirroring the same heading idiom. AC-35.2
 *          added GalleryMasonryLayout.tsx's `gap-[var(--gallery-gap-md)]`/
 *          `mb-[var(--gallery-gap-md)]` — both reference a tokens.css custom
 *          property via Tailwind's arbitrary-value syntax (the same
 *          token-reference-through-brackets idiom already baselined for
 *          MainImageDisplay.tsx/GallerySlideshowLayout.tsx's aspect-ratio
 *          brackets); the detector's regex can't distinguish a bracket
 *          holding a `var(--token)` from one holding a raw literal, so it
 *          still counts as debt here even though it isn't a raw value.
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.7
 * ---
 */

export type StyleDriftViolationCounts = {
  hex: number
  rawPxFontSize: number
  arbitraryTailwindBracket: number
}

export const STYLE_DRIFT_BASELINE: Record<string, StyleDriftViolationCounts> = {
  'src/app/(frontend)/globals.css': { hex: 4, rawPxFontSize: 0, arbitraryTailwindBracket: 0 },
  'src/app/(frontend)/dev/gallery-demo/page.tsx': {
    hex: 0,
    rawPxFontSize: 0,
    arbitraryTailwindBracket: 3,
  },
  'src/app/(frontend)/dev/gallery-isr-demo/page.tsx': {
    hex: 0,
    rawPxFontSize: 0,
    arbitraryTailwindBracket: 1,
  },
  'src/app/(frontend)/dev/token-specimen/page.tsx': {
    hex: 0,
    rawPxFontSize: 0,
    arbitraryTailwindBracket: 3,
  },
  'src/components/gallery/DownloadControl.tsx': {
    hex: 0,
    rawPxFontSize: 1,
    arbitraryTailwindBracket: 2,
  },
  'src/components/gallery/GalleryEngine.tsx': {
    hex: 0,
    rawPxFontSize: 2,
    arbitraryTailwindBracket: 6,
  },
  'src/components/gallery/MainImageDisplay.tsx': {
    hex: 0,
    rawPxFontSize: 0,
    arbitraryTailwindBracket: 4,
  },
  'src/components/gallery/NavigationControls.tsx': {
    hex: 0,
    rawPxFontSize: 1,
    arbitraryTailwindBracket: 2,
  },
  'src/components/gallery/ThumbnailDrawer.tsx': {
    hex: 0,
    rawPxFontSize: 1,
    arbitraryTailwindBracket: 3,
  },
  'src/components/gallery/ThumbnailStrip.tsx': {
    hex: 0,
    rawPxFontSize: 0,
    arbitraryTailwindBracket: 1,
  },
  'src/components/gallery/GallerySlideshowLayout.tsx': {
    hex: 0,
    rawPxFontSize: 0,
    arbitraryTailwindBracket: 2,
  },
  'src/app/(frontend)/dev/gallery-placement-demo/page.tsx': {
    hex: 0,
    rawPxFontSize: 0,
    arbitraryTailwindBracket: 2,
  },
  'src/app/(frontend)/dev/gallery-webhook-proof/page.tsx': {
    hex: 0,
    rawPxFontSize: 0,
    arbitraryTailwindBracket: 2,
  },
  'src/components/gallery/GalleryMasonryLayout.tsx': {
    hex: 0,
    rawPxFontSize: 0,
    arbitraryTailwindBracket: 2,
  },
}
