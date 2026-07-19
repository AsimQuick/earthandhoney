/**
 * ---
 * file: src/app/(frontend)/dev/gallery-demo/page.tsx
 * project: earthandhoney
 * purpose: Internal demo/test-harness route — not linked from public
 *          navigation, not backed by the out-of-scope Portfolio/Homepage CMS
 *          collections, and not a public marketing page. Proves the Gallery
 *          Engine is one reusable component set by instantiating the same
 *          GalleryEngine twice — a hero-mode instance and a portfolio-mode
 *          instance — differing only by the `settings` passed to each,
 *          demonstrating reuse with no duplicated image system. The real
 *          public pages will reuse this same engine unmodified once they're
 *          built in a later sprint.
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.4
 * ---
 */
import type { Metadata } from 'next'

import { GalleryEngine } from '@/components/gallery/GalleryEngine'
import type { GalleryImage, GallerySettings } from '@/components/gallery/types'

// Internal-only: excluded from search indexing since this route is not part
// of the public site.
export const metadata: Metadata = {
  title: 'Gallery Engine demo (internal)',
  robots: { index: false, follow: false },
}

// Local mock data standing in for what the in-scope Payload Galleries
// collection (US-3) would return — deliberately not fetched from Payload at
// all, and deliberately not the out-of-scope Portfolio/Homepage collections.
const heroSettings: GallerySettings = {
  slideshow: true,
  hoverPreview: false,
  fullscreen: false,
  download: false,
  requireAuth: false,
}

const portfolioSettings: GallerySettings = {
  slideshow: false,
  hoverPreview: true,
  fullscreen: true,
  download: false,
  requireAuth: false,
}

const heroImages: GalleryImage[] = [
  { id: 'demo-hero-1', url: '/next.svg', alt: 'Hero demo image one' },
  { id: 'demo-hero-2', url: '/globe.svg', alt: 'Hero demo image two' },
]

const portfolioImages: GalleryImage[] = [
  { id: 'demo-portfolio-1', url: '/vercel.svg', alt: 'Portfolio demo image one' },
  { id: 'demo-portfolio-2', url: '/window.svg', alt: 'Portfolio demo image two' },
  { id: 'demo-portfolio-3', url: '/file.svg', alt: 'Portfolio demo image three' },
]

export default function GalleryEngineDemoPage() {
  return (
    <main className="flex flex-col gap-16 p-8">
      <p role="note">
        Internal demo/test-harness route for AC-4.4 — proves the same Gallery
        Engine renders two distinct display-mode contexts driven purely by
        gallery settings. Not linked from public navigation.
      </p>

      <section aria-labelledby="hero-demo-heading" data-testid="hero-mode-demo">
        <h2 id="hero-demo-heading">Hero mode</h2>
        <GalleryEngine images={heroImages} settings={heroSettings} />
      </section>

      <section aria-labelledby="portfolio-demo-heading" data-testid="portfolio-mode-demo">
        <h2 id="portfolio-demo-heading">Portfolio mode</h2>
        <GalleryEngine images={portfolioImages} settings={portfolioSettings} />
      </section>
    </main>
  )
}
