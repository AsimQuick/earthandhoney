/**
 * ---
 * file: src/components/page-template/DetailsPageTemplate.tsx
 * project: earthandhoney
 * purpose: AC-35.1 — the Details template, rendering the PRD §13.4 order
 *          exactly: minimal H1, optional one-line introduction, full-width
 *          masonry placement, inquiry-form-region slot, footer. Navigation
 *          and footer are deliberately NOT rendered here —
 *          src/components/layout/PublicShell.tsx already renders the
 *          vertical menu before, and SiteFooter after, every route in the
 *          (frontend) group (src/app/(frontend)/layout.tsx wraps all
 *          children in PublicShell), so a second nav/footer here would
 *          duplicate that single owner (CLAUDE.md Pillar 5) — the same
 *          reasoning src/components/page-template/StandardPageTemplate.tsx
 *          and src/components/page-template/HomePageTemplate.tsx already
 *          document. The masonry placement is a single always-present slot
 *          (PRD §13.4 names one "full-width masonry placement", not a list
 *          of galleries like §13.3's standard page) — resolving it into a
 *          real gallery over the Flow A boundary, and building/adapting
 *          GalleryMasonryLayout itself, are AC-35.2/AC-35.3's concern; this
 *          component only renders whatever already-resolved node it is
 *          given. Copy restraint (PRD §13.4's "Do not over-explain in
 *          copy") is enforced structurally by this file's prop list alone
 *          offering an optional one-line introduction string and no
 *          rich-text/long-form body field — AC-35.4's concern to test for.
 *          The inquiry form region is a slot only, exactly as the other two
 *          templates leave it, filled by whatever route places this
 *          template.
 * created-by: dev-team
 * related-story: US-35
 * related-ac: 35.1
 * ---
 */
import type { ReactNode } from 'react'

export interface DetailsPageTemplateProps {
  /** The page's minimal H1 (PRD §13.4's "Minimal H1"). */
  heading: string
  /** PRD §13.4's "Optional one-line introduction". */
  oneLineIntroduction?: string
  /** The already-resolved full-width masonry placement node (PRD §13.4's "Full-width masonry placement"). */
  masonryPlacement: ReactNode
  /** The inquiry-form-region slot. Left empty until filled by the route. */
  inquiryFormRegion?: ReactNode
}

export function DetailsPageTemplate({
  heading,
  oneLineIntroduction,
  masonryPlacement,
  inquiryFormRegion,
}: Readonly<DetailsPageTemplateProps>) {
  return (
    <article data-testid="details-page-template" className="flex flex-col gap-2xl bg-surface p-lg text-ink">
      <h1 data-testid="details-heading" className="font-display text-3xl leading-tight text-ink">
        {heading}
      </h1>

      {oneLineIntroduction ? (
        <p
          data-testid="details-introduction"
          className="text-lg leading-relaxed text-ink-secondary"
          style={{ maxWidth: 'var(--measure-normal)' }}
        >
          {oneLineIntroduction}
        </p>
      ) : null}

      <div data-testid="details-masonry-placement" className="w-full">
        {masonryPlacement}
      </div>

      <div data-testid="details-inquiry-form-region" aria-label="Inquiry form">
        {inquiryFormRegion ?? null}
      </div>
    </article>
  )
}
