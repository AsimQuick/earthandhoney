/**
 * ---
 * file: src/__tests__/us34-ac34.5-homepage-shell-structural-drift.test.tsx
 * project: earthandhoney
 * purpose: AC-34.5 — the style-drift check HOMEPAGE_TEMPLATE_ADR.md's
 *          "documented singleton" decision names as its evidence, in the
 *          spirit of AC-31.7's structural-shell comparison
 *          (us31-ac31.7-page-structural-shell-snapshot.test.tsx), but across
 *          templates rather than within one: it renders the homepage
 *          (PublicShell + HomePageTemplate, the exact pipeline
 *          src/app/(frontend)/page.tsx uses) and a synthetic standard page
 *          (PublicShell + StandardPageTemplate, the exact pipeline a
 *          `Pages`-backed [slug] route uses) through the identical
 *          PublicShell props, and proves three things: (1) every
 *          `data-testid` genuinely shared between the two renders — the
 *          shell chrome itself (site-shell, site-header, vertical-menu,
 *          primary-nav, site-footer) — carries an identical tag and class
 *          list on both, i.e. no route-specific override sneaks into the one
 *          shell every route shares; (2) both page templates mount at the
 *          identical position inside that shell (the same parent testid/tag/
 *          class chain from the shell root down to the template root), i.e.
 *          the homepage is not wrapped in some extra one-off container; and
 *          (3) the shell markup surrounding each template — with the
 *          template's own content-specific subtree redacted — is
 *          byte-for-byte identical between the homepage and a standard page.
 *          Together these are the direct rendered proof that "the homepage
 *          shell is structurally the same shell as a standard page" this
 *          AC's evidence requirement names.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.5
 * ---
 */
import { render } from '@testing-library/react'

import { PublicShell } from '@/components/layout/PublicShell'
import { HomePageTemplate } from '@/components/page-template/HomePageTemplate'
import { StandardPageTemplate } from '@/components/page-template/StandardPageTemplate'

// Identical PublicShell props for both renders: the shell's own props are
// route-agnostic (nav/business identity/social links), so the point under
// test is "same shell regardless of which template it wraps", not "same
// shell because it happened to get the same nav data".
const SHARED_SHELL_PROPS = {
  businessName: 'Earth & Honey Studios',
  navItems: [
    { href: '/weddings', label: 'Weddings' },
    { href: '/engagements', label: 'Engagements' },
  ],
  socialProfiles: [{ platform: 'instagram', url: 'https://instagram.com/earthandhoney' }],
}

function renderHomeShell(): Element {
  const { container } = render(
    <PublicShell {...SHARED_SHELL_PROPS}>
      <HomePageTemplate
        heroSlideshowPlacement={<div data-testid="stub-hero" />}
        shortIntroduction="A quiet documentary-style studio."
        selectedGalleriesOrStories={[
          <div key="a" data-testid="stub-selection" />,
          <div key="b" data-testid="stub-selection" />,
        ]}
        inquiryFormRegion={<div data-testid="stub-inquiry-form" />}
      />
    </PublicShell>,
  )
  const root = container.firstElementChild
  if (!root) throw new Error('expected PublicShell to render a root element')
  return root
}

function renderStandardShell(): Element {
  const { container } = render(
    <PublicShell {...SHARED_SHELL_PROPS}>
      <StandardPageTemplate
        heading="An Autumn Elopement in the Mountains"
        shortIntroduction="A full-day documentary story from first look to last dance."
        galleryPlacements={[
          <div key="a" data-testid="stub-gallery-placement" />,
          <div key="b" data-testid="stub-gallery-placement" />,
          <div key="c" data-testid="stub-gallery-placement" />,
        ]}
        structuredTextSections={[{ heading: 'The Morning', body: 'Getting ready in the cabin.' }]}
      />
    </PublicShell>,
  )
  const root = container.firstElementChild
  if (!root) throw new Error('expected PublicShell to render a root element')
  return root
}

// --- Per-testid tag/class map, mirroring AC-31.7's own drift check --------

interface TestidOccurrence {
  testid: string
  tag: string
  class: string
}

function collectTestidOccurrences(el: Element, acc: TestidOccurrence[] = []): TestidOccurrence[] {
  const testid = el.getAttribute('data-testid')
  if (testid) {
    acc.push({ testid, tag: el.tagName.toLowerCase(), class: el.getAttribute('class') ?? '' })
  }
  for (const child of Array.from(el.children)) collectTestidOccurrences(child, acc)
  return acc
}

// --- Parent chain from the shell root down to (excluding) a given testid --

function parentChain(root: Element, targetTestid: string): TestidOccurrence[] {
  const target = root.querySelector(`[data-testid="${targetTestid}"]`)
  if (!target) throw new Error(`expected to find [data-testid="${targetTestid}"]`)

  const chain: TestidOccurrence[] = []
  let node: Element | null = target.parentElement
  while (node) {
    chain.unshift({
      testid: node.getAttribute('data-testid') ?? '',
      tag: node.tagName.toLowerCase(),
      class: node.getAttribute('class') ?? '',
    })
    node = node.parentElement
  }
  return chain
}

// --- Shell markup with the template's own subtree redacted ----------------

function shellMarkupWithTemplateRedacted(root: Element, templateTestid: string): string {
  const clone = root.cloneNode(true) as Element
  const templateRoot = clone.querySelector(`[data-testid="${templateTestid}"]`)
  if (!templateRoot) throw new Error(`expected to find [data-testid="${templateTestid}"]`)

  const placeholder = clone.ownerDocument.createElement('div')
  placeholder.setAttribute('data-testid', 'template-content-redacted')
  templateRoot.replaceWith(placeholder)
  return clone.outerHTML
}

describe('US-34 AC-34.5: the homepage shell is structurally the same shell as a standard page', () => {
  const homeRoot = renderHomeShell()
  const standardRoot = renderStandardShell()

  it('renders a non-trivial shell for both pages (sanity: the probe is not vacuous)', () => {
    expect(homeRoot.outerHTML.length).toBeGreaterThan(100)
    expect(standardRoot.outerHTML.length).toBeGreaterThan(100)
  })

  it('the two fixtures really are different pages (sanity: the equality checks below are not vacuous)', () => {
    expect(homeRoot.querySelector('[data-testid="home-page-template"]')).not.toBeNull()
    expect(homeRoot.querySelector('[data-testid="standard-page-template"]')).toBeNull()
    expect(standardRoot.querySelector('[data-testid="standard-page-template"]')).not.toBeNull()
    expect(standardRoot.querySelector('[data-testid="home-page-template"]')).toBeNull()
  })

  describe('no style drift on the shell chrome shared by both pages', () => {
    const homeOccurrences = collectTestidOccurrences(homeRoot)
    const standardOccurrences = collectTestidOccurrences(standardRoot)

    it('every data-testid present on both pages has an identical tag and class list on both', () => {
      const homeByTestid = new Map(homeOccurrences.map((o) => [o.testid, o]))
      const standardByTestid = new Map(standardOccurrences.map((o) => [o.testid, o]))
      const sharedTestids = [...homeByTestid.keys()].filter((testid) => standardByTestid.has(testid))

      // Sanity: the pages really do share a substantial common shell (the
      // PublicShell chrome), not an empty intersection that would make the
      // loop below vacuously pass.
      expect(sharedTestids.length).toBeGreaterThanOrEqual(4)
      expect(sharedTestids).toEqual(
        expect.arrayContaining(['site-shell', 'site-header', 'vertical-menu', 'primary-nav', 'site-footer']),
      )

      for (const testid of sharedTestids) {
        const home = homeByTestid.get(testid)!
        const standard = standardByTestid.get(testid)!
        expect(standard.tag).toBe(home.tag)
        expect(standard.class).toBe(home.class)
      }
    })

    it('the only testids not shared between the two pages are each page\'s own template-owned content regions', () => {
      const homeTestids = new Set(homeOccurrences.map((o) => o.testid))
      const standardTestids = new Set(standardOccurrences.map((o) => o.testid))
      const onlyOnHome = [...homeTestids].filter((testid) => !standardTestids.has(testid))
      const onlyOnStandard = [...standardTestids].filter((testid) => !homeTestids.has(testid))

      // Every home-only testid is either the home template root or one of
      // its own home-* content regions/stubs; likewise for standard.
      for (const testid of onlyOnHome) {
        expect(testid === 'home-page-template' || testid.startsWith('home-') || testid.startsWith('stub-')).toBe(
          true,
        )
      }
      for (const testid of onlyOnStandard) {
        expect(
          testid === 'standard-page-template' || testid.startsWith('page-') || testid.startsWith('stub-'),
        ).toBe(true)
      }
    })
  })

  it('both templates mount at the identical position inside the shell (the same parent chain)', () => {
    const homeChain = parentChain(homeRoot, 'home-page-template')
    const standardChain = parentChain(standardRoot, 'standard-page-template')
    expect(standardChain).toEqual(homeChain)
  })

  it('the shell markup outside each template is byte-for-byte identical once the template content is redacted', () => {
    const homeShellMarkup = shellMarkupWithTemplateRedacted(homeRoot, 'home-page-template')
    const standardShellMarkup = shellMarkupWithTemplateRedacted(standardRoot, 'standard-page-template')
    expect(standardShellMarkup).toBe(homeShellMarkup)
  })

  it('the un-redacted markup genuinely differs — the equality above isn\'t hiding a no-op redaction', () => {
    expect(homeRoot.outerHTML).not.toBe(standardRoot.outerHTML)
  })
})
