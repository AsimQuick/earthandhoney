/**
 * ---
 * file: src/__tests__/us35-ac35.3-page-template-dispatch.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-35.3 — a Details page is reachable purely through a
 *          selection on a `Pages` record, not a bespoke hard-coded route.
 *          Two checks: (1) `src/collections/Pages.ts` defines a `template`
 *          select field distinct from the unrelated `photographyType` field,
 *          offering `'standard'`/`'details'`, defaulting to `'standard'`; (2)
 *          the generic `[slug]` route's default export, given two distinct
 *          synthetic `Pages` fixtures (different headings/gallery slugs) that
 *          both carry `template: 'details'`, renders DetailsPageTemplate for
 *          both with no per-page code path — the same
 *          jest.mock('@/lib/getPageBySlug') technique
 *          us31-ac31.6-generate-metadata.test.ts already used for this same
 *          route module (`payload` is ESM-only and breaks Jest's interop
 *          boundary when imported directly). A third fixture carrying
 *          `template: 'standard'` proves the dispatch is genuinely
 *          data-driven — the same route renders StandardPageTemplate instead
 *          — and never both at once. `@/lib/resolveDetailsMasonryPlacement`
 *          and `@/lib/resolvePageGalleryPlacements` are also mocked: neither
 *          performs I/O here, since AC-35.2's real gallery-resolution
 *          behaviour is covered by its own suite, not this one.
 * created-by: dev-team
 * related-story: US-35
 * related-ac: 35.3
 * ---
 */
import { render } from '@testing-library/react'

import type { ResolvedPage } from '@/lib/getPageBySlug'

jest.mock('@/lib/getPageBySlug', () => ({
  getPageBySlug: jest.fn(),
}))
// The route module also statically imports getStudioProfile (for
// generateMetadata, not exercised by this suite) — it imports 'payload' at
// module scope, which is ESM-only and breaks Jest's interop boundary purely
// on import, so it must be mocked too, mirroring
// us31-ac31.6-generate-metadata.test.ts's same requirement on this module.
jest.mock('@/lib/getStudioProfile', () => ({
  getStudioProfile: jest.fn(),
}))
jest.mock('@/lib/resolveDetailsMasonryPlacement', () => ({
  resolveDetailsMasonryPlacement: jest.fn(async () => <div data-testid="stub-masonry-placement" />),
}))
jest.mock('@/lib/resolvePageGalleryPlacements', () => ({
  resolvePageGalleryPlacements: jest.fn(async () => [<div key="stub" data-testid="stub-gallery-placement" />]),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getPageBySlug } = require('@/lib/getPageBySlug') as { getPageBySlug: jest.Mock }
// Imported after the mocks are declared, matching
// us31-ac31.6-generate-metadata.test.ts's ordering — the route must call the
// mocked readers, not the real ones.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RouteModule = require('@/app/(frontend)/[slug]/page')
const PublicPageRoute = RouteModule.default as (props: {
  params: Promise<{ slug: string }>
}) => Promise<React.JSX.Element>

function page(overrides: Partial<ResolvedPage> = {}): ResolvedPage {
  return {
    heading: 'Default Heading',
    shortIntroduction: '',
    seoTitle: '',
    metaDescription: '',
    status: 'published',
    indexing: 'index',
    galleryPlacements: [],
    socialImage: null,
    template: 'standard',
    ...overrides,
  }
}

async function routeFor(slug: string): Promise<Element> {
  const element = await PublicPageRoute({ params: Promise.resolve({ slug }) })
  const { container } = render(element)
  return container
}

describe('US-35 AC-35.3: a Details page is a template selection on a Pages record, not a bespoke route', () => {
  afterEach(() => {
    getPageBySlug.mockReset()
  })

  it("the Pages collection defines a 'template' field, distinct from photographyType, offering standard/details and defaulting to standard", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pages, PAGE_TEMPLATE_OPTIONS } = require('@/collections/Pages') as typeof import('@/collections/Pages')
    type NamedField = Extract<(typeof Pages.fields)[number], { name: string }>
    const templateField = Pages.fields.find(
      (field): field is NamedField => 'name' in field && field.name === 'template',
    )

    expect(templateField).toBeDefined()
    expect(templateField).not.toBe(Pages.fields.find((field) => 'name' in field && field.name === 'photographyType'))
    expect((templateField as { defaultValue?: unknown }).defaultValue).toBe('standard')

    const optionValues = PAGE_TEMPLATE_OPTIONS.map((option) => option.value)
    expect(optionValues).toEqual(expect.arrayContaining(['standard', 'details']))
  })

  it('renders DetailsPageTemplate for a page with template: details, driven purely by the field value', async () => {
    getPageBySlug.mockResolvedValue(
      page({ heading: 'A Ring, A Dress, A Bouquet', template: 'details', galleryPlacements: [] }),
    )

    const container = await routeFor('details-page-a')

    expect(container.querySelector('[data-testid="details-page-template"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="standard-page-template"]')).toBeNull()
    expect(container.textContent).toContain('A Ring, A Dress, A Bouquet')
  })

  it('renders DetailsPageTemplate for a second, materially different Details page, with no code path per page', async () => {
    getPageBySlug.mockResolvedValue(
      page({
        heading: 'Vintage Rings and Handwritten Vows',
        template: 'details',
        galleryPlacements: [{ gallerySlug: 'a-second-details-gallery', layout: 'masonry' }],
      }),
    )

    const container = await routeFor('details-page-b')

    expect(container.querySelector('[data-testid="details-page-template"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="standard-page-template"]')).toBeNull()
    expect(container.textContent).toContain('Vintage Rings and Handwritten Vows')
  })

  it('renders StandardPageTemplate, not DetailsPageTemplate, for a page with template: standard', async () => {
    getPageBySlug.mockResolvedValue(page({ heading: 'A Standard Page', template: 'standard' }))

    const container = await routeFor('standard-page')

    expect(container.querySelector('[data-testid="standard-page-template"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="details-page-template"]')).toBeNull()
  })
})
