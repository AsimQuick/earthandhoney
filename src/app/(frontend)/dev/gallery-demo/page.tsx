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
 *          built in a later sprint. Placeholder images and layout are drawn
 *          from public/photobuddy — the hero section uses the same
 *          img/slide/*.jpg files as the template's homepage flexslider, and
 *          the portfolio section uses the same img/gallery/*.jpg files as
 *          the template's gallery.html, wrapped in a max-width container
 *          matching photobuddy's own `.container` (max-width: 1130px), for
 *          side-by-side manual visual QA against the template (AC-4.5). See
 *          docs/qa/us4-ac4.5-visual-qa-checklist.md.
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.4
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.5
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

// public/photobuddy/img/slide/*.jpg — the same files the template's own
// homepage flexslider (index.html) uses as its hero backgrounds.
const heroImages: GalleryImage[] = [
  { id: 'demo-hero-1', url: '/photobuddy/img/slide/1.jpg', alt: 'Photography Emotion' },
  { id: 'demo-hero-2', url: '/photobuddy/img/slide/2.jpg', alt: 'Big City Night' },
  { id: 'demo-hero-3', url: '/photobuddy/img/slide/3.jpg', alt: 'Beautiful Lakes' },
]

// public/photobuddy/img/gallery/*.jpg — the same files the template's own
// gallery grid (gallery.html) uses for its "Photography Emotion" gallery.
const portfolioImages: GalleryImage[] = [
  { id: 'demo-portfolio-1', url: '/photobuddy/img/gallery/1.jpg', alt: 'Photography Emotion — image 1' },
  { id: 'demo-portfolio-2', url: '/photobuddy/img/gallery/2.jpg', alt: 'Photography Emotion — image 2' },
  { id: 'demo-portfolio-3', url: '/photobuddy/img/gallery/3.jpg', alt: 'Photography Emotion — image 3' },
]

export default function GalleryEngineDemoPage() {
  return (
    <main className="flex flex-col gap-16 py-8">
      <p role="note" className="px-8">
        Internal demo/test-harness route for AC-4.4/AC-4.5 — proves the same
        Gallery Engine renders two distinct display-mode contexts driven
        purely by gallery settings, using public/photobuddy template images
        as placeholder content for side-by-side visual QA against the
        template. Not linked from public navigation.
      </p>

      <section aria-labelledby="hero-demo-heading" data-testid="hero-mode-demo" className="w-full">
        <h2 id="hero-demo-heading" className="px-8 pb-4 text-2xl font-normal tracking-[3px] uppercase">
          Hero mode
        </h2>
        <GalleryEngine images={heroImages} settings={heroSettings} />
      </section>

      <section aria-labelledby="portfolio-demo-heading" data-testid="portfolio-mode-demo" className="mx-auto w-full max-w-[1130px] px-10">
        <h2 id="portfolio-demo-heading" className="pb-4 text-2xl font-normal tracking-[3px] uppercase">
          Portfolio mode
        </h2>
        <GalleryEngine images={portfolioImages} settings={portfolioSettings} />
      </section>
    </main>
  )
}
