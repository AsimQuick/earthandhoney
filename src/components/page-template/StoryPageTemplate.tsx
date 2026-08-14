/**
 * ---
 * file: src/components/page-template/StoryPageTemplate.tsx
 * project: earthandhoney
 * purpose: AC-36.1 — the Story template, rendering the PRD §13.5 order
 *          exactly: title, subtitle/introduction, then the repeating
 *          (section heading + short text + gallery placement) group in
 *          author order, then an inquiry-form-region slot. Navigation and
 *          footer are deliberately NOT rendered here — the same reasoning
 *          src/components/page-template/StandardPageTemplate.tsx and
 *          src/components/page-template/DetailsPageTemplate.tsx already
 *          document: src/components/layout/PublicShell.tsx already renders
 *          the vertical menu before, and SiteFooter after, every route in
 *          the (frontend) group, so a second nav/footer here would
 *          duplicate that single owner (CLAUDE.md Pillar 5). Each section's
 *          gallery placement is rendered as an already-resolved node this
 *          component is given — resolving it over the Flow A boundary is
 *          AC-36.2's concern, not this component's. The inquiry form region
 *          is a slot only, exactly as the other two templates leave it,
 *          filled by whatever route places this template.
 * created-by: dev-team
 * related-story: US-36
 * related-ac: 36.1
 * ---
 */
import type { ReactNode } from 'react'

export interface StoryPageTemplateSection {
  sectionHeading: string
  shortText: string
  galleryPlacement: ReactNode
}

export interface StoryPageTemplateProps {
  /** The story's H1 (PRD §13.5's "Title"). */
  title: string
  /** PRD §13.5's "Subtitle / introduction". */
  subtitleIntroduction?: string
  /** The repeating (section heading + short text + gallery placement) group, in author order. */
  sections: StoryPageTemplateSection[]
  /** The inquiry-form-region slot. Left empty until filled by the route. */
  inquiryFormRegion?: ReactNode
}

export function StoryPageTemplate({
  title,
  subtitleIntroduction,
  sections,
  inquiryFormRegion,
}: Readonly<StoryPageTemplateProps>) {
  return (
    <article data-testid="story-page-template" className="flex flex-col gap-2xl bg-surface p-lg text-ink">
      <h1 data-testid="story-title" className="font-display text-3xl leading-tight text-ink">
        {title}
      </h1>

      {subtitleIntroduction ? (
        <p
          data-testid="story-subtitle-introduction"
          className="text-lg leading-relaxed text-ink-secondary"
          style={{ maxWidth: 'var(--measure-normal)' }}
        >
          {subtitleIntroduction}
        </p>
      ) : null}

      <section data-testid="story-sections" className="flex flex-col gap-xl">
        {sections.map((section, index) => (
          <div key={index} data-testid="story-section" className="flex flex-col gap-sm">
            <h2 data-testid="story-section-heading" className="font-display text-xl leading-snug text-ink">
              {section.sectionHeading}
            </h2>
            <p
              data-testid="story-section-short-text"
              className="text-base leading-relaxed text-ink-secondary"
              style={{ maxWidth: 'var(--measure-normal)' }}
            >
              {section.shortText}
            </p>
            <div data-testid="story-section-gallery-placement" className="w-full">
              {section.galleryPlacement}
            </div>
          </div>
        ))}
      </section>

      <div data-testid="story-inquiry-form-region" aria-label="Inquiry form">
        {inquiryFormRegion ?? null}
      </div>
    </article>
  )
}
