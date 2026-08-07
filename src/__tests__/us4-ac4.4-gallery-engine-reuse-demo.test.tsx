/**
 * ---
 * file: src/__tests__/us4-ac4.4-gallery-engine-reuse-demo.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-4.4 — the same Gallery Engine is instantiated in at
 *          least two distinct display-mode contexts (hero-mode, portfolio-
 *          mode) on an internal demo/test-harness route, driven purely by
 *          gallery settings, with no duplicated image system; and that the
 *          demo route is not linked from public navigation and is not
 *          backed by the out-of-scope Portfolio/Homepage CMS collections.
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.4
 * ---
 */
import { render, screen, within } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import type { GalleryImage, GallerySettings } from '@/components/gallery/types'
import GalleryEngineDemoPage from '@/app/(frontend)/dev/gallery-demo/page'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const DEMO_PAGE_PATH = 'src/app/(frontend)/dev/gallery-demo/page.tsx'

describe('AC-4.4: GalleryEngine accepts display-mode settings driving its render', () => {
  const images: GalleryImage[] = [
    { id: 'settings-1', url: '/a.jpg', alt: 'Settings image one' },
    { id: 'settings-2', url: '/b.jpg', alt: 'Settings image two' },
  ]

  it('defaults settings to the same values a freshly-created Payload gallery record would have', () => {
    render(<GalleryEngine images={images} />)

    const engine = screen.getByTestId('gallery-engine')
    expect(engine).toHaveAttribute('data-slideshow', 'false')
    expect(engine).toHaveAttribute('data-hover-preview', 'true')
    expect(engine).toHaveAttribute('data-fullscreen', 'true')
    expect(engine).toHaveAttribute('data-download', 'false')
    expect(engine).toHaveAttribute('data-require-auth', 'false')
  })

  it('reflects a hero-mode settings object', () => {
    const heroSettings: GallerySettings = {
      slideshow: true,
      hoverPreview: false,
      fullscreen: false,
      download: false,
      requireAuth: false,
    }
    render(<GalleryEngine images={images} settings={heroSettings} />)

    const engine = screen.getByTestId('gallery-engine')
    expect(engine).toHaveAttribute('data-slideshow', 'true')
    expect(engine).toHaveAttribute('data-hover-preview', 'false')
    expect(engine).toHaveAttribute('data-fullscreen', 'false')
  })

  it('reflects a portfolio-mode settings object — same component, different settings, different render', () => {
    const portfolioSettings: GallerySettings = {
      slideshow: false,
      hoverPreview: true,
      fullscreen: true,
      download: false,
      requireAuth: false,
    }
    render(<GalleryEngine images={images} settings={portfolioSettings} />)

    const engine = screen.getByTestId('gallery-engine')
    expect(engine).toHaveAttribute('data-slideshow', 'false')
    expect(engine).toHaveAttribute('data-hover-preview', 'true')
    expect(engine).toHaveAttribute('data-fullscreen', 'true')
  })
})

describe('AC-4.4: the internal demo route instantiates the same engine in two distinct display-mode contexts', () => {
  it('renders exactly two Gallery Engine instances', () => {
    render(<GalleryEngineDemoPage />)

    expect(screen.getAllByTestId('gallery-engine')).toHaveLength(2)
  })

  it('the hero-mode instance is driven by hero-shaped settings (slideshow on, hover/fullscreen off)', () => {
    render(<GalleryEngineDemoPage />)

    const heroSection = within(screen.getByTestId('hero-mode-demo'))
    const heroEngine = heroSection.getByTestId('gallery-engine')
    expect(heroEngine).toHaveAttribute('data-slideshow', 'true')
    expect(heroEngine).toHaveAttribute('data-hover-preview', 'false')
    expect(heroEngine).toHaveAttribute('data-fullscreen', 'false')
  })

  it('the portfolio-mode instance is driven by portfolio-shaped settings (hover + fullscreen on, slideshow off)', () => {
    render(<GalleryEngineDemoPage />)

    const portfolioSection = within(screen.getByTestId('portfolio-mode-demo'))
    const portfolioEngine = portfolioSection.getByTestId('gallery-engine')
    expect(portfolioEngine).toHaveAttribute('data-slideshow', 'false')
    expect(portfolioEngine).toHaveAttribute('data-hover-preview', 'true')
    expect(portfolioEngine).toHaveAttribute('data-fullscreen', 'true')
  })

  it('the two instances render distinct, non-overlapping image sets with no shared state leaking between them', () => {
    render(<GalleryEngineDemoPage />)

    const heroSection = within(screen.getByTestId('hero-mode-demo'))
    const portfolioSection = within(screen.getByTestId('portfolio-mode-demo'))

    expect(heroSection.getAllByAltText('Photography Emotion').length).toBeGreaterThan(0)
    expect(portfolioSection.getAllByAltText('Photography Emotion — image 1').length).toBeGreaterThan(0)
    expect(portfolioSection.queryByAltText('Photography Emotion')).not.toBeInTheDocument()
    expect(heroSection.queryByAltText('Photography Emotion — image 1')).not.toBeInTheDocument()
  })

  it('both instances still get the shared gradient overlay treatment (AC-4.2), proving one shared component tree, not a duplicated image system', () => {
    render(<GalleryEngineDemoPage />)

    const heroSection = within(screen.getByTestId('hero-mode-demo'))
    const portfolioSection = within(screen.getByTestId('portfolio-mode-demo'))

    expect(heroSection.getByTestId('gradient-overlay')).toBeInTheDocument()
    expect(portfolioSection.getByTestId('gradient-overlay')).toBeInTheDocument()
  })
})

describe('AC-4.4: the demo route source only ever imports one GalleryEngine — no duplicated image system', () => {
  it('imports GalleryEngine exactly once, and does not define its own gallery-rendering component', () => {
    const src = read(DEMO_PAGE_PATH)

    const importMatches = [...src.matchAll(/import\s*\{\s*GalleryEngine\s*\}\s*from\s*['"]@\/components\/gallery\/GalleryEngine['"]/g)]
    expect(importMatches).toHaveLength(1)

    const usageMatches = [...src.matchAll(/<GalleryEngine\b/g)]
    expect(usageMatches).toHaveLength(2)
  })
})

describe('AC-4.4: the demo route is internal — not backed by out-of-scope CMS collections, not fetched from Payload', () => {
  it('does not import Payload, the Payload config, or any collection', () => {
    const src = read(DEMO_PAGE_PATH)

    expect(src).not.toMatch(/from ['"]payload['"]/)
    expect(src).not.toMatch(/from ['"]@payload-config['"]/)
    expect(src).not.toMatch(/from ['"]@\/payload\.config['"]/)
    expect(src).not.toMatch(/from ['"]@\/collections\//)
  })

  it('does not import or use a Portfolio or Homepage collection (mentioning them in explanatory comments is fine)', () => {
    const src = read(DEMO_PAGE_PATH)

    expect(src).not.toMatch(/from ['"].*collections\/Portfolio['"]/)
    expect(src).not.toMatch(/from ['"].*collections\/Homepage['"]/)
    expect(src).not.toMatch(/relationTo:\s*['"](portfolio|homepage)['"]/)
  })

  it('src/collections/ still excludes the out-of-scope Portfolio/Homepage collections (trip-wire against adding them this sprint)', () => {
    const files = fs.readdirSync(path.join(root, 'src/collections')).sort()
    expect(files).toEqual(expect.arrayContaining(['Galleries.ts', 'Media.ts', 'Users.ts']))
    expect(files).not.toEqual(expect.arrayContaining(['Portfolio.ts', 'Homepage.ts']))
  })
})

describe('AC-4.4: the demo route is not linked from public navigation', () => {
  it('the public homepage does not link to the demo route', () => {
    const src = read('src/app/(frontend)/page.tsx')
    expect(src).not.toMatch(/dev\/gallery-demo/)
  })

  it('the shared frontend layout does not link to the demo route', () => {
    const src = read('src/app/(frontend)/layout.tsx')
    expect(src).not.toMatch(/dev\/gallery-demo/)
  })

  it('no file outside the demo route itself links to it', () => {
    const appDir = path.join(root, 'src/app')
    const offenders: string[] = []

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const relative = path.relative(root, full)
          if (relative === DEMO_PAGE_PATH) continue
          const src = fs.readFileSync(full, 'utf8')
          if (src.includes('dev/gallery-demo')) offenders.push(relative)
        }
      }
    }
    walk(appDir)

    expect(offenders).toEqual([])
  })
})
