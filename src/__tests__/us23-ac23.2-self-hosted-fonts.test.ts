/**
 * ---
 * file: src/__tests__/us23-ac23.2-self-hosted-fonts.test.ts
 * project: earthandhoney
 * purpose: Verify AC-23.2 — Fraunces (display serif) and Inter (body/UI
 *          sans) are self-hosted from the repository with no external font
 *          request. Asserts no reference to fonts.googleapis.com or
 *          fonts.gstatic.com appears anywhere in the styling/layout source
 *          that ships to the browser, that both families are declared with
 *          font-display: swap, that the primary (400) weight of each
 *          family is preloaded in the root layout, and that every font
 *          file the CSS/preload references actually exists in the repo as
 *          a valid woff2 binary.
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const FONTS_CSS_PATH = 'src/styles/fonts.css'
const TOKENS_CSS_PATH = 'src/styles/tokens.css'
const GLOBALS_CSS_PATH = 'src/app/(frontend)/globals.css'
const LAYOUT_PATH = 'src/app/(frontend)/layout.tsx'

const GOOGLE_FONT_HOSTS = [/fonts\.googleapis\.com/, /fonts\.gstatic\.com/]

describe('AC-23.2: Fraunces and Inter are self-hosted with no external font request', () => {
  describe('no request to Google Fonts hosts anywhere in the shipped styling/layout source', () => {
    const filesToCheck = [FONTS_CSS_PATH, TOKENS_CSS_PATH, GLOBALS_CSS_PATH, LAYOUT_PATH]

    it.each(filesToCheck)('%s contains no fonts.googleapis.com / fonts.gstatic.com reference', (rel) => {
      const src = read(rel)
      for (const host of GOOGLE_FONT_HOSTS) {
        expect(src).not.toMatch(host)
      }
    })
  })

  describe('src/styles/fonts.css — self-hosted @font-face declarations', () => {
    const css = read(FONTS_CSS_PATH)

    const fontFaceBlocks = css.match(/@font-face\s*\{[^}]*\}/g) ?? []

    it('declares at least one @font-face rule', () => {
      expect(fontFaceBlocks.length).toBeGreaterThan(0)
    })

    it('every @font-face rule sources a local /fonts path, never a remote URL', () => {
      for (const block of fontFaceBlocks) {
        expect(block).toMatch(/src:\s*url\(["']\/fonts\//)
        expect(block).not.toMatch(/url\(["']https?:\/\//)
      }
    })

    it('every @font-face rule declares font-display: swap', () => {
      expect(fontFaceBlocks.length).toBeGreaterThan(0)
      for (const block of fontFaceBlocks) {
        expect(block).toMatch(/font-display:\s*swap;/)
      }
    })

    it('declares Fraunces (display serif) with font-display: swap', () => {
      const frauncesBlocks = fontFaceBlocks.filter((b) => /font-family:\s*["']Fraunces["']/.test(b))
      expect(frauncesBlocks.length).toBeGreaterThan(0)
      for (const block of frauncesBlocks) {
        expect(block).toMatch(/font-display:\s*swap;/)
      }
    })

    it('declares Inter (body/UI sans) with font-display: swap', () => {
      const interBlocks = fontFaceBlocks.filter((b) => /font-family:\s*["']Inter["']/.test(b))
      expect(interBlocks.length).toBeGreaterThan(0)
      for (const block of interBlocks) {
        expect(block).toMatch(/font-display:\s*swap;/)
      }
    })

    it('declares the primary (400) weight for both families', () => {
      const primaryFraunces = fontFaceBlocks.some(
        (b) => /font-family:\s*["']Fraunces["']/.test(b) && /font-weight:\s*400;/.test(b),
      )
      const primaryInter = fontFaceBlocks.some(
        (b) => /font-family:\s*["']Inter["']/.test(b) && /font-weight:\s*400;/.test(b),
      )
      expect(primaryFraunces).toBe(true)
      expect(primaryInter).toBe(true)
    })
  })

  describe('src/app/(frontend)/globals.css — fonts.css is wired into the built CSS', () => {
    it('imports src/styles/fonts.css', () => {
      const src = read(GLOBALS_CSS_PATH)
      expect(src).toMatch(/@import\s+["']\.\.\/\.\.\/styles\/fonts\.css["'];/)
    })
  })

  describe('src/app/(frontend)/layout.tsx — primary weights are preloaded', () => {
    const src = read(LAYOUT_PATH)

    it('imports the React 19 resource-preloading API', () => {
      expect(src).toMatch(/import\s*\{\s*preload\s*\}\s*from\s*["']react-dom["']/)
    })

    it('preloads the Fraunces primary weight as a font asset', () => {
      expect(src).toMatch(
        /preload\(\s*["']\/fonts\/fraunces\/fraunces-latin-400-normal\.woff2["'],\s*\{[^}]*as:\s*["']font["'][^}]*\}\s*\)/,
      )
    })

    it('preloads the Inter primary weight as a font asset', () => {
      expect(src).toMatch(
        /preload\(\s*["']\/fonts\/inter\/inter-latin-400-normal\.woff2["'],\s*\{[^}]*as:\s*["']font["'][^}]*\}\s*\)/,
      )
    })

    it('every preload call declares the woff2 MIME type and crossOrigin, matching the @font-face src it primes', () => {
      const preloadCalls = src.match(/preload\(\s*["'][^"']+["'],\s*\{[^}]*\}\s*\)/g) ?? []
      const fontPreloads = preloadCalls.filter((c) => c.includes('/fonts/'))
      expect(fontPreloads.length).toBeGreaterThan(0)
      for (const call of fontPreloads) {
        expect(call).toMatch(/type:\s*["']font\/woff2["']/)
        expect(call).toMatch(/crossOrigin:\s*["']anonymous["']/)
      }
    })

    it('calls the preload function during layout render so the hints reach the document head', () => {
      expect(src).toMatch(/preloadPrimaryFontWeights\(\)/)
    })
  })

  describe('the font files every reference points at actually exist as valid woff2 binaries', () => {
    const referencedFontPaths = [
      'public/fonts/fraunces/fraunces-latin-300-normal.woff2',
      'public/fonts/fraunces/fraunces-latin-400-normal.woff2',
      'public/fonts/fraunces/fraunces-latin-600-normal.woff2',
      'public/fonts/inter/inter-latin-400-normal.woff2',
      'public/fonts/inter/inter-latin-500-normal.woff2',
    ]

    it.each(referencedFontPaths)('%s exists', (rel) => {
      expect(fs.existsSync(path.join(root, rel))).toBe(true)
    })

    it.each(referencedFontPaths)('%s is a valid woff2 binary (starts with the wOF2 signature)', (rel) => {
      const buf = fs.readFileSync(path.join(root, rel))
      expect(buf.subarray(0, 4).toString('ascii')).toBe('wOF2')
    })

    it('every path referenced in fonts.css resolves to an existing public/ file', () => {
      const css = read(FONTS_CSS_PATH)
      const urls = [...css.matchAll(/url\(["'](\/fonts\/[^"')]+)["']\)/g)].map((m) => m[1])
      expect(urls.length).toBeGreaterThan(0)
      for (const url of urls) {
        expect(fs.existsSync(path.join(root, 'public', url))).toBe(true)
      }
    })
  })
})
