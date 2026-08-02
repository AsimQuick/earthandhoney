/**
 * ---
 * file: src/__tests__/us17-ac17.8-gallery-style-template-baseline.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.8 — the three bundled gallery style templates
 *          render unmodified from the pinned upstream source, a
 *          byte-identical copy of each is preserved under
 *          gallery-style-templates-baseline/, and PICPEAK_PORT_LEDGER.md
 *          records every template copied and where it is used.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.8
 * ---
 */
import fs from 'fs'
import path from 'path'
import { verifyVendoredMigrations } from '@/lib/picpeakMigrationIntegrity'
import { GALLERY_STYLE_TEMPLATE_BASELINE } from '@/lib/galleryStyleTemplateBaseline'

const root = process.cwd()
const vendorRoot = path.join(root, 'vendor', 'picpeak')

describe('AC-17.8: gallery style template baseline manifest', () => {
  it('records exactly the three templates upstream seeds (slots 1-3)', () => {
    expect(GALLERY_STYLE_TEMPLATE_BASELINE).toHaveLength(3)
    expect(GALLERY_STYLE_TEMPLATE_BASELINE.map((t) => t.slotNumber).sort()).toEqual([1, 2, 3])
    expect(GALLERY_STYLE_TEMPLATE_BASELINE.map((t) => t.name).sort()).toEqual(
      ['Apple Liquid Glass', 'Elegant Dark', 'Liquid Glass Dark'].sort(),
    )
  })

  it.each(GALLERY_STYLE_TEMPLATE_BASELINE)(
    '"$name" (slot $slotNumber): preserved baseline copy is byte-identical to the pinned migration export',
    (entry) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const migrationModule = require(path.join(vendorRoot, entry.sourceMigrationPath))
      const upstreamCss: string = migrationModule[entry.sourceExportName]
      expect(typeof upstreamCss).toBe('string')
      expect(upstreamCss.length).toBeGreaterThan(0)

      const baselinePath = path.join(root, entry.baselineFilePath)
      expect(fs.existsSync(baselinePath)).toBe(true)
      const baselineCss = fs.readFileSync(baselinePath, 'utf8')

      expect(baselineCss).toBe(upstreamCss)
    },
  )

  it('preserves each baseline file with a .css extension under gallery-style-templates-baseline/', () => {
    for (const entry of GALLERY_STYLE_TEMPLATE_BASELINE) {
      expect(entry.baselineFilePath).toMatch(/^gallery-style-templates-baseline\/[a-z0-9-]+\.css$/)
    }
  })

  it('draws every template from a migration confirmed unmodified against PICPEAK_MIGRATION_MANIFEST', () => {
    const result = verifyVendoredMigrations()
    expect(result.ok).toBe(true)

    const sourcePaths = new Set(GALLERY_STYLE_TEMPLATE_BASELINE.map((t) => t.sourceMigrationPath))
    expect(sourcePaths).toEqual(
      new Set([
        'backend/migrations/core/052_add_css_templates.js',
        'backend/migrations/core/053_add_liquid_glass_templates.js',
      ]),
    )
    for (const sourcePath of sourcePaths) {
      expect(fs.existsSync(path.join(vendorRoot, sourcePath))).toBe(true)
    }
  })
})

describe('AC-17.8: PICPEAK_PORT_LEDGER.md', () => {
  const ledger = fs.readFileSync(path.join(root, 'PICPEAK_PORT_LEDGER.md'), 'utf8')

  it('records every template name, its slot, and its baseline copy', () => {
    for (const entry of GALLERY_STYLE_TEMPLATE_BASELINE) {
      expect(ledger).toContain(entry.name)
      expect(ledger).toContain(entry.baselineFilePath)
      expect(ledger).toContain(entry.sourceMigrationPath)
    }
  })

  it('records where the templates are used: storage, public read route, client injection, and admin editor', () => {
    expect(ledger).toContain('css_templates')
    expect(ledger).toContain('css_template_id')
    expect(ledger).toMatch(/GET \/:slug\/css-template/)
    expect(ledger).toContain('useGalleryCustomCss')
    expect(ledger).toContain('GalleryView.tsx')
    expect(ledger).toContain('CssTemplateEditor.tsx')
  })

  it('states the baseline copies are preserved unmodified', () => {
    expect(ledger).toMatch(/not modified in any way|byte-identical|unmodified/i)
  })
})
