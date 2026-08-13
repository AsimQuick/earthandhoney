/**
 * ---
 * file: src/__tests__/us31-ac31.7-page-structural-shell-snapshot.test.tsx
 * project: earthandhoney
 * purpose: AC-31.7 — proves a newly created `Pages` record inherits the
 *          design system with no manual layout work (PRD Phase 4's exit
 *          criterion). Two synthetic `Pages` records are built with
 *          materially different content — a short heading vs. a long one, 1
 *          gallery placement vs. 4, and no structured text sections vs.
 *          three — and both are rendered through the exact same pipeline
 *          the public route uses (PublicShell wrapping StandardPageTemplate,
 *          AC-31.3/AC-31.4). Each page's rendered markup is reduced to a
 *          "structural shell": text content stripped (content differs by
 *          design and isn't the thing under test) and repeated
 *          same-`data-testid` siblings collapsed to one canonical entry
 *          (item *count* is content-driven, not a shell property) — the
 *          same normalize-then-toMatchSnapshot technique
 *          us23-ac23.4-shell-rewired-to-tokens.test.tsx already established
 *          for proving "structure held even though a parameter changed",
 *          applied here in the opposite direction: content varies, and the
 *          two committed snapshots (the "structural snapshot pair" this
 *          AC's evidence names) are checked for equality with each other,
 *          not merely each pinned in isolation. A second, independent check
 *          walks every `data-testid`-bearing element in both renders and
 *          asserts that wherever both pages carry the same `data-testid`
 *          (page-heading, page-gallery-placements, page-gallery-placement,
 *          page-inquiry-form-region, site-header, site-footer, etc.) its tag
 *          and class list are byte-identical between the two pages — the
 *          direct expression of "style drift between an original and a
 *          newly created page is a defect, not a variation". The
 *          long-page-only `page-structured-text-sections` region (PRD
 *          §13.3/AC-31.3 already document it as optional) is pruned before
 *          the full-tree equality check below — its presence is a
 *          content-driven fact about the fixture, not shell drift — and the
 *          per-testid class check separately confirms it introduces no
 *          testid collision with anything the short page renders.
 * created-by: dev-team
 * related-story: US-31
 * related-ac: 31.7
 * ---
 */
import { render } from '@testing-library/react'

import { PublicShell } from '@/components/layout/PublicShell'
import { StandardPageTemplate } from '@/components/page-template/StandardPageTemplate'

// --- Two materially different `Pages` records -----------------------------

const SHORT_PAGE = {
  heading: 'Fall',
  shortIntroduction: 'A quiet fall session in the woods.',
  galleryPlacementCount: 1,
  structuredTextSections: undefined as { heading: string; body: string }[] | undefined,
}

const LONG_PAGE = {
  heading:
    'An Autumn Elopement in the Mountains — A Full Day Documentary Story From First Look to Last Dance',
  shortIntroduction:
    'A sprawling, multi-location wedding weekend documented from sunrise preparations through the final sparkler exit, spanning four distinct venues across two days.',
  galleryPlacementCount: 4,
  structuredTextSections: [
    { heading: 'The Morning', body: 'Getting ready in the mountain cabin.' },
    { heading: 'The Ceremony', body: 'Vows exchanged at the overlook.' },
    { heading: 'The Reception', body: 'Dinner and dancing under string lights.' },
  ],
}

function renderPageShell(fixture: typeof SHORT_PAGE): Element {
  const galleryPlacements = Array.from({ length: fixture.galleryPlacementCount }, (_, index) => (
    <div key={index} data-testid="stub-gallery-content" />
  ))

  const { container } = render(
    <PublicShell businessName="Earth &amp; Honey Studios">
      <StandardPageTemplate
        heading={fixture.heading}
        shortIntroduction={fixture.shortIntroduction}
        galleryPlacements={galleryPlacements}
        structuredTextSections={fixture.structuredTextSections}
      />
    </PublicShell>,
  )

  const root = container.firstElementChild
  if (!root) {
    throw new Error('expected PublicShell to render a root element')
  }
  return root
}

// --- Structural shell: text stripped, repeated siblings collapsed --------

interface ShellNode {
  tag: string
  testid?: string
  class?: string
  ariaLabel?: string
  children: ShellNode[]
}

function serializeShell(el: Element): ShellNode {
  const testid = el.getAttribute('data-testid')
  const cls = el.getAttribute('class')
  const ariaLabel = el.getAttribute('aria-label')

  // Repeated siblings sharing a data-testid (gallery placements, structured
  // text sections) are a content-driven *count*, not a shell property —
  // collapsed to their first occurrence so the shell comparison below
  // reflects "same item shape", not "same item count".
  const collapsedChildren: Element[] = []
  let lastTestid: string | null = null
  for (const child of Array.from(el.children)) {
    const childTestid = child.getAttribute('data-testid')
    if (childTestid && childTestid === lastTestid) continue
    collapsedChildren.push(child)
    lastTestid = childTestid
  }

  const node: ShellNode = { tag: el.tagName.toLowerCase(), children: collapsedChildren.map(serializeShell) }
  if (testid) node.testid = testid
  if (cls) node.class = cls
  if (ariaLabel) node.ariaLabel = ariaLabel
  return node
}

function structuralShell(el: Element): string {
  return JSON.stringify(serializeShell(el), null, 2)
}

// The one region PRD §13.3/AC-31.3 document as content-driven-optional:
// rendered only when the page has structured text sections. Its *presence*
// is a fact about the fixture's content, not a shell property, so it's
// pruned before the cross-page "identical shell" equality check below. The
// per-testid class-list check further down still confirms this region's own
// classes are the plain token-backed ones the template always uses whenever
// it does appear (see us31-ac31.3-standard-page-template.test.tsx).
function pruneOptionalContentDrivenRegions(node: ShellNode): ShellNode {
  return {
    ...node,
    children: node.children
      .filter((child) => child.testid !== 'page-structured-text-sections')
      .map(pruneOptionalContentDrivenRegions),
  }
}

function sharedStructuralShell(el: Element): string {
  return JSON.stringify(pruneOptionalContentDrivenRegions(serializeShell(el)), null, 2)
}

// --- Per-testid tag/class map, for the cross-page drift check ------------

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

describe('US-31 AC-31.7: a newly created page inherits the design system with no manual layout work', () => {
  const shortShellRoot = renderPageShell(SHORT_PAGE)
  const longShellRoot = renderPageShell(LONG_PAGE)

  const shortShell = structuralShell(shortShellRoot)
  const longShell = structuralShell(longShellRoot)

  it('renders a non-trivial shell for both pages (sanity: the probe is not vacuous)', () => {
    expect(shortShell.length).toBeGreaterThan(100)
    expect(longShell.length).toBeGreaterThan(100)
  })

  it('the short page (1 placement, no structured text sections) matches its committed structural snapshot', () => {
    expect(shortShell).toMatchSnapshot()
  })

  it('the long page (4 placements, 3 structured text sections) matches its committed structural snapshot', () => {
    expect(longShell).toMatchSnapshot()
  })

  it('the shared shell is identical once the content-driven structured-text-sections region is set aside', () => {
    // The two fixtures differ in heading length, gallery placement count and
    // structured-text-section presence, per this AC's evidence requirement.
    // Stripping text and collapsing repeated-testid siblings (above) removes
    // the first two; pruning the one region PRD §13.3 documents as
    // content-driven-optional removes the third. What's left — H1, intro,
    // gallery-placements wrapper + item shape, inquiry-form-region, and the
    // whole PublicShell chrome around it — is the actual "structural shell"
    // this AC's evidence requires to be identical, and it is: not a vacuous
    // comparison, since the two fixtures were shown materially different
    // above and the un-pruned per-page snapshots above show real
    // differences (asserted next).
    expect(sharedStructuralShell(shortShellRoot)).toBe(sharedStructuralShell(longShellRoot))
  })

  it('the un-pruned per-page snapshots genuinely differ — the equality above isn\'t hiding a no-op prune', () => {
    expect(shortShell).not.toBe(longShell)
  })

  it('the fixtures really are materially different in the ways this AC names (sanity: the equality above is not vacuous)', () => {
    expect(SHORT_PAGE.heading.length).not.toBe(LONG_PAGE.heading.length)
    expect(SHORT_PAGE.galleryPlacementCount).not.toBe(LONG_PAGE.galleryPlacementCount)
    expect(SHORT_PAGE.structuredTextSections).toBeUndefined()
    expect(LONG_PAGE.structuredTextSections?.length).toBeGreaterThan(0)
  })

  describe('no style drift: every shared data-testid carries the same tag and class list on both pages', () => {
    const shortOccurrences = collectTestidOccurrences(shortShellRoot)
    const longOccurrences = collectTestidOccurrences(longShellRoot)

    it('each testid is styled consistently with itself within a single page (no per-instance drift)', () => {
      for (const occurrences of [shortOccurrences, longOccurrences]) {
        const byTestid = new Map<string, TestidOccurrence>()
        for (const occurrence of occurrences) {
          const existing = byTestid.get(occurrence.testid)
          if (existing) {
            expect(occurrence.tag).toBe(existing.tag)
            expect(occurrence.class).toBe(existing.class)
          } else {
            byTestid.set(occurrence.testid, occurrence)
          }
        }
      }
    })

    it('every data-testid present on both pages has an identical tag and class list on both', () => {
      const shortByTestid = new Map(shortOccurrences.map((o) => [o.testid, o]))
      const longByTestid = new Map(longOccurrences.map((o) => [o.testid, o]))
      const sharedTestids = [...shortByTestid.keys()].filter((testid) => longByTestid.has(testid))

      // Sanity: the pages really do share a substantial common shell, not an
      // empty intersection that would make the loop below vacuously pass.
      expect(sharedTestids.length).toBeGreaterThan(5)

      for (const testid of sharedTestids) {
        const short = shortByTestid.get(testid)!
        const long = longByTestid.get(testid)!
        expect(long.tag).toBe(short.tag)
        expect(long.class).toBe(short.class)
      }
    })

    it('the only testids not shared between the two pages are the content-driven optional regions PRD §13.3 already documents as optional', () => {
      const shortTestids = new Set(shortOccurrences.map((o) => o.testid))
      const longTestids = new Set(longOccurrences.map((o) => o.testid))
      const onlyOnLong = [...longTestids].filter((testid) => !shortTestids.has(testid))
      const onlyOnShort = [...shortTestids].filter((testid) => !longTestids.has(testid))

      expect(onlyOnShort).toEqual([])
      expect(onlyOnLong.sort()).toEqual(['page-structured-text-section', 'page-structured-text-sections'])
    })
  })
})
