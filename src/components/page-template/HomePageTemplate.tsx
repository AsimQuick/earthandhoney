/**
 * ---
 * file: src/components/page-template/HomePageTemplate.tsx
 * project: earthandhoney
 * purpose: AC-34.1 — the homepage template, rendering the PRD §13.2 order
 *          exactly: full-width hero slideshow placement, optional short
 *          introduction, selected galleries or stories, primary inquiry
 *          form. Navigation and footer are deliberately NOT rendered here —
 *          src/components/layout/PublicShell.tsx already renders the
 *          vertical menu before, and SiteFooter after, every route in the
 *          (frontend) group (src/app/(frontend)/layout.tsx wraps all
 *          children in PublicShell), so a second nav/footer here would
 *          duplicate that single owner (CLAUDE.md Pillar 5) — the same
 *          reasoning src/components/page-template/StandardPageTemplate.tsx
 *          already documents for the PRD §13.3 standard page template. Every
 *          slot here is a structural region only: resolving a real hero
 *          gallery over the Flow A boundary is AC-34.3's concern, the
 *          curated/ordered selection model is AC-34.4's, and wiring real
 *          content into the inquiry-form-region slot is left to whatever
 *          route places this template, exactly as StandardPageTemplate's own
 *          inquiryFormRegion slot was left empty until US-33.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.1
 * ---
 */
import type { ReactNode } from 'react'

export interface HomePageTemplateProps {
  /** PRD §13.2's "Full-width hero slideshow placement" — always present. */
  heroSlideshowPlacement: ReactNode
  /** PRD §13.2's "Optional short introduction". */
  shortIntroduction?: string
  /** PRD §13.2's "Selected galleries or stories" — already-resolved nodes, in display order. */
  selectedGalleriesOrStories?: ReactNode[]
  /** PRD §13.2's "Primary inquiry form" slot. Left empty until wired by the route. */
  inquiryFormRegion?: ReactNode
}

export function HomePageTemplate({
  heroSlideshowPlacement,
  shortIntroduction,
  selectedGalleriesOrStories = [],
  inquiryFormRegion,
}: Readonly<HomePageTemplateProps>) {
  return (
    <div data-testid="home-page-template" className="flex flex-col gap-2xl">
      <div data-testid="home-hero-slideshow-placement" className="w-full">
        {heroSlideshowPlacement}
      </div>

      {shortIntroduction ? (
        <p
          data-testid="home-introduction"
          className="text-lg leading-relaxed text-ink-secondary"
          style={{ maxWidth: 'var(--measure-normal)' }}
        >
          {shortIntroduction}
        </p>
      ) : null}

      <section
        data-testid="home-selected-galleries"
        className="flex flex-col gap-lg"
        aria-label="Selected galleries and stories"
      >
        {selectedGalleriesOrStories.map((selection, index) => (
          <div key={index} data-testid="home-selected-gallery">
            {selection}
          </div>
        ))}
      </section>

      <div data-testid="home-inquiry-form-region" aria-label="Inquiry form">
        {inquiryFormRegion ?? null}
      </div>
    </div>
  )
}
