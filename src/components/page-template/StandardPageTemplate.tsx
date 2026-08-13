/**
 * ---
 * file: src/components/page-template/StandardPageTemplate.tsx
 * project: earthandhoney
 * purpose: AC-31.3 — the standard page template every `Pages` record
 *          inherits, rendering the PRD §13.3 order exactly: H1, short
 *          introduction, one or more gallery placements, optional
 *          structured text sections, an inquiry-form-region slot, footer.
 *          Built only from src/styles/tokens.css tokens via Tailwind
 *          utilities generated from that file's `@theme` block (verified,
 *          not assumed — see this component's test) plus a small set of
 *          value-free structural utilities; no raw hex colour, px
 *          font-size, or Tailwind arbitrary-value bracket appears anywhere
 *          in this file. The trailing "footer" in the PRD order is
 *          deliberately NOT rendered here: src/components/layout/SiteFooter.tsx
 *          already renders once, after `{children}`, from
 *          src/components/layout/PublicShell.tsx — every route in the
 *          (frontend) group is already wrapped in PublicShell by
 *          src/app/(frontend)/layout.tsx, so a second footer here would
 *          duplicate that single owner (CLAUDE.md Pillar 5). The inquiry
 *          form region is a slot only — its content is US-33's concern —
 *          rendered as an always-present, empty-by-default container so the
 *          template's structural position is fixed before that story lands.
 *          Gallery-placement resolution (Flow A, the no-cross-database rule)
 *          is AC-31.5's concern; this component only renders whatever
 *          already-resolved nodes it is given, in the given order.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.3
 * ---
 */
import type { ReactNode } from 'react'

export interface StructuredTextSection {
  heading: string
  body: string
}

export interface StandardPageTemplateProps {
  /** The page's H1 (PRD §13.1's "Page heading"). */
  heading: string
  /** PRD §13.1's "Short introduction". */
  shortIntroduction?: string
  /** One or more already-resolved gallery placement elements, in display order. */
  galleryPlacements: ReactNode[]
  /** Optional structured text sections, in display order. */
  structuredTextSections?: StructuredTextSection[]
  /** The inquiry-form-region slot. Left empty until US-33 fills it. */
  inquiryFormRegion?: ReactNode
}

export function StandardPageTemplate({
  heading,
  shortIntroduction,
  galleryPlacements,
  structuredTextSections,
  inquiryFormRegion,
}: Readonly<StandardPageTemplateProps>) {
  return (
    <article data-testid="standard-page-template" className="flex flex-col gap-2xl bg-surface p-lg text-ink">
      <h1 data-testid="page-heading" className="font-display text-3xl leading-tight text-ink">
        {heading}
      </h1>

      {shortIntroduction ? (
        <p
          data-testid="page-introduction"
          className="text-lg leading-relaxed text-ink-secondary"
          style={{ maxWidth: 'var(--measure-normal)' }}
        >
          {shortIntroduction}
        </p>
      ) : null}

      <section data-testid="page-gallery-placements" className="flex flex-col gap-lg" aria-label="Galleries">
        {galleryPlacements.map((placement, index) => (
          <div key={index} data-testid="page-gallery-placement">
            {placement}
          </div>
        ))}
      </section>

      {structuredTextSections && structuredTextSections.length > 0 ? (
        <section data-testid="page-structured-text-sections" className="flex flex-col gap-xl">
          {structuredTextSections.map((section) => (
            <div key={section.heading} data-testid="page-structured-text-section" className="flex flex-col gap-sm">
              <h2 className="font-display text-xl leading-snug text-ink">{section.heading}</h2>
              <p
                className="text-base leading-relaxed text-ink-secondary"
                style={{ maxWidth: 'var(--measure-normal)' }}
              >
                {section.body}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      <div data-testid="page-inquiry-form-region" aria-label="Inquiry form">
        {inquiryFormRegion ?? null}
      </div>
    </article>
  )
}
