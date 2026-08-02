/**
 * ---
 * file: src/lib/galleryStyleTemplateBaseline.ts
 * project: earthandhoney
 * purpose: AC-17.8 — records where each of the three bundled gallery style
 *          (CSS) templates lives in the pinned upstream source, and where its
 *          byte-identical preserved copy lives under
 *          gallery-style-templates-baseline/. The manifest is the single
 *          source of truth PICPEAK_PORT_LEDGER.md and the AC-17.8 test suite
 *          both read from, so the two can never silently drift apart.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.8
 * ---
 */

export interface GalleryStyleTemplateEntry {
  /** Name stored in the upstream `css_templates.name` column. */
  name: string
  /** Upstream `css_templates.slot_number` this template ships in. */
  slotNumber: number
  /** Path to the pinned migration that seeds this template, relative to vendor/picpeak/. */
  sourceMigrationPath: string
  /** Name the migration exports the template's CSS text under (`module.exports.<name>`). */
  sourceExportName: string
  /** Path to the preserved, byte-identical copy, relative to the repo root. */
  baselineFilePath: string
}

export const GALLERY_STYLE_TEMPLATE_BASELINE: GalleryStyleTemplateEntry[] = [
  {
    name: 'Elegant Dark',
    slotNumber: 1,
    sourceMigrationPath: 'backend/migrations/core/052_add_css_templates.js',
    sourceExportName: 'DEFAULT_CSS_TEMPLATE',
    baselineFilePath: 'gallery-style-templates-baseline/elegant-dark.css',
  },
  {
    name: 'Apple Liquid Glass',
    slotNumber: 2,
    sourceMigrationPath: 'backend/migrations/core/053_add_liquid_glass_templates.js',
    sourceExportName: 'APPLE_LIQUID_GLASS',
    baselineFilePath: 'gallery-style-templates-baseline/apple-liquid-glass.css',
  },
  {
    name: 'Liquid Glass Dark',
    slotNumber: 3,
    sourceMigrationPath: 'backend/migrations/core/053_add_liquid_glass_templates.js',
    sourceExportName: 'LIQUID_GLASS_DARK',
    baselineFilePath: 'gallery-style-templates-baseline/liquid-glass-dark.css',
  },
]
