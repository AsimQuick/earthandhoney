/**
 * ---
 * file: src/__tests__/us8-ac8.2-global-styling-and-font.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-8.2 — the photobuddy global styling and the Rubik
 *          webfont are ported into the app: Rubik is loaded via
 *          `next/font/google`, the app's base font-family resolves to Rubik
 *          with the same Arial/Helvetica/sans-serif fallback chain as
 *          public/photobuddy/css/style.css:27, the Tailwind theme colors
 *          match the hex values used throughout that file (#333333,
 *          #999999, #000), and the create-next-app placeholder homepage
 *          markup is fully removed.
 * created-by: dev-team
 * related-story: US-8
 * related-ac: 8.2
 * updated-by: dev-team
 * related-story: US-34
 * related-ac: 34.3
 * ---
 */
import { render, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import { HomePageTemplate } from '@/components/page-template/HomePageTemplate'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const LAYOUT_PATH = 'src/app/(frontend)/layout.tsx'
const GLOBALS_CSS_PATH = 'src/app/(frontend)/globals.css'
const PAGE_PATH = 'src/app/(frontend)/page.tsx'
const TEMPLATE_CSS_PATH = 'public/photobuddy/css/style.css'

describe('AC-8.2: Rubik is loaded as a webfont via next/font/google', () => {
  it('imports Rubik from next/font/google in the root layout', () => {
    const src = read(LAYOUT_PATH)

    expect(src).toMatch(/import\s*\{\s*Rubik\s*\}\s*from\s*["']next\/font\/google["']/)
  })

  it('instantiates Rubik with a CSS variable and applies it to the <html> element', () => {
    const src = read(LAYOUT_PATH)

    expect(src).toMatch(/Rubik\(\s*\{[^}]*variable:\s*["']--font-rubik["']/)
    expect(src).toMatch(/className=\{`\$\{rubik\.variable\}/)
  })

  it('no longer loads the create-next-app Geist fonts', () => {
    const src = read(LAYOUT_PATH)

    expect(src).not.toMatch(/Geist/)
  })
})

describe('AC-8.2: the base font-family resolves to Rubik with the template fallback chain', () => {
  it("globals.css sets body's font-family to the Rubik variable, falling back to Arial, Helvetica, sans-serif", () => {
    const src = read(GLOBALS_CSS_PATH)

    expect(src).toMatch(
      /body\s*\{[^}]*font-family:\s*var\(--font-rubik\),\s*Arial,\s*Helvetica,\s*sans-serif;/,
    )
  })

  it('matches the fallback chain of the template rule at style.css:27', () => {
    const template = read(TEMPLATE_CSS_PATH)

    expect(template).toMatch(/font-family:'Rubik',\s*Arial,\s*Helvetica,\s*sans-serif;/)
  })

  it('confirms there is no local @font-face for Rubik in the template (it is loaded via a Google Fonts link, matching the next/font/google mechanism ported here)', () => {
    const cssDir = path.join(root, 'public/photobuddy/css')
    const cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'))
    const rubikFontFace = cssFiles.some((f) => {
      const contents = fs.readFileSync(path.join(cssDir, f), 'utf8')
      return /@font-face\s*\{[^}]*Rubik/i.test(contents)
    })

    expect(rubikFontFace).toBe(false)
  })

  it('exposes the Rubik variable through the Tailwind font-sans theme token', () => {
    const src = read(GLOBALS_CSS_PATH)

    expect(src).toMatch(/--font-sans:\s*var\(--font-rubik\);/)
  })
})

describe('AC-8.2: Tailwind theme colors match the hex values used throughout style.css', () => {
  it('defines theme color tokens for #333333, #999999, and #000', () => {
    const src = read(GLOBALS_CSS_PATH)

    expect(src).toMatch(/--foreground:\s*#333333;/)
    expect(src).toMatch(/--color-muted:\s*#999999;/)
    expect(src).toMatch(/--color-ink:\s*#(000|000000);/)
  })

  it('the referenced hex values actually appear throughout the template stylesheet', () => {
    const template = read(TEMPLATE_CSS_PATH)

    expect(template).toMatch(/#333333/)
    expect(template).toMatch(/#999999/)
    expect(template).toMatch(/#000\b/)
  })

  it('no longer defines the create-next-app dark-mode color override (the template has no dark mode)', () => {
    const src = read(GLOBALS_CSS_PATH)

    expect(src).not.toMatch(/prefers-color-scheme/)
  })
})

describe('AC-8.2: the create-next-app placeholder homepage markup is fully removed', () => {
  it('the homepage no longer imports next/image or references the Next.js/Vercel starter assets', () => {
    const src = read(PAGE_PATH)

    expect(src).not.toMatch(/next\.svg/)
    expect(src).not.toMatch(/vercel\.svg/)
    expect(src).not.toMatch(/vercel\.com\/new/)
    expect(src).not.toMatch(/nextjs\.org\/learn/)
    expect(src).not.toMatch(/Deploy Now/)
    expect(src).not.toMatch(/To get started, edit the page\.tsx file\./)
  })

  it('rendering the homepage template no longer shows the starter copy or starter links', () => {
    // Renders HomePageTemplate directly, not the `page.tsx` route itself —
    // that route is now an async server component that resolves
    // StudioProfile/the hero gallery via `payload` (AC-34.3), and `payload`
    // is an ESM-only package that breaks Jest's interop boundary when
    // imported directly (see src/lib/getStudioProfile.ts's own docblock).
    // HomePageTemplate is exactly what the route delegates its rendering
    // to, so this still proves the rendered homepage carries no starter
    // markup.
    render(<HomePageTemplate heroSlideshowPlacement={<div />} />)

    expect(screen.queryByText(/To get started, edit the page\.tsx file\./)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Deploy Now/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Documentation/i })).not.toBeInTheDocument()
    expect(screen.queryByAltText(/Next\.js logo/i)).not.toBeInTheDocument()
  })
})
