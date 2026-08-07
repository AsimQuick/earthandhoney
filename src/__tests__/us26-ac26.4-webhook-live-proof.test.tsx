/**
 * ---
 * file: src/__tests__/us26-ac26.4-webhook-live-proof.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-26.4 — the live-reproduction deliverable. The proof
 *          itself is a live run against the running stack (recorded in
 *          PIVOT_AUDIT.md `## AC-26.4`, driven by
 *          scripts/ac26.4-live-proof.sh); what this suite pins is
 *          everything that has to stay true for that recorded proof to keep
 *          meaning what it says:
 *          (1) both proof gallery slugs resolve to the proof route through
 *              the same AC-26.2 lookup the webhook receiver uses, so a
 *              verified delivery for either gallery revalidates the page
 *              the transcript shows changing;
 *          (2) the proof route renders one section per proof gallery,
 *              surfacing the photo count the transcript greps for, and the
 *              unavailable placeholder for a gallery that is still a draft
 *              — the pre-state every run starts from;
 *          (3) the route is cached rather than dynamic (`revalidate`),
 *              since a dynamically-rendered page would show fresh Backstage
 *              data whether or not the webhook ever fired, making the whole
 *              proof vacuous;
 *          (4) the reproduction script exists, is executable, and drives
 *              all three changes through Backstage's supported admin routes
 *              while never revalidating anything itself; and
 *          (5) the recorded transcript covers both runs and all three
 *              events, and names the same slugs the code does — a drifted
 *              slug would leave a proof that no longer describes this code.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.4
 * ---
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import { render, screen } from '@testing-library/react'

import {
  PLACEMENT_DEMO_GALLERY_SLUG,
  WEBHOOK_LIVE_PROOF_GALLERY_PATH,
  WEBHOOK_LIVE_PROOF_GALLERY_SLUGS,
  getGalleryBearingPathsForSlug,
} from '@/lib/galleryRevalidation'

jest.mock('@/lib/backstageGalleryPlacement')

// Imported after jest.mock, matching the convention in
// us25-ac25.6-gallery-placement-failure-handling.test.tsx.
import { resolveGalleryPlacementImages } from '@/lib/backstageGalleryPlacement'
import GalleryWebhookProofPage, {
  revalidate,
} from '@/app/(frontend)/dev/gallery-webhook-proof/page'

const resolveMock = resolveGalleryPlacementImages as jest.MockedFunction<
  typeof resolveGalleryPlacementImages
>

const REPO_ROOT = path.join(__dirname, '..', '..')
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'ac26.4-live-proof.sh')
const AUDIT_PATH = path.join(REPO_ROOT, 'PIVOT_AUDIT.md')

function imagesFor(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `photo-${index + 1}`,
    alt: `photo ${index + 1}`,
    thumbnailUrl: `https://cdn.example/${index + 1}-thumb.jpg`,
    mediumUrl: `https://cdn.example/${index + 1}-medium.jpg`,
    largeUrl: `https://cdn.example/${index + 1}-large.jpg`,
    width: 800,
    height: 600,
  }))
}

/** The `## AC-26.4` section of PIVOT_AUDIT.md, on its own. */
function auditSection(): string {
  const audit = fs.readFileSync(AUDIT_PATH, 'utf8')
  const start = audit.indexOf('## AC-26.4')
  expect(start).toBeGreaterThan(-1)
  const next = audit.indexOf('\n## ', start + 1)
  return next === -1 ? audit.slice(start) : audit.slice(start, next)
}

describe('AC-26.4: the proof galleries are wired to the proof route through the AC-26.2 lookup', () => {
  it('names exactly two proof galleries — one per reproduction run of the publish proof', () => {
    expect(WEBHOOK_LIVE_PROOF_GALLERY_SLUGS).toHaveLength(2)
    expect(new Set(WEBHOOK_LIVE_PROOF_GALLERY_SLUGS).size).toBe(2)
  })

  it.each([...WEBHOOK_LIVE_PROOF_GALLERY_SLUGS])(
    'maps %s to the proof route, so a verified delivery for it revalidates that page',
    (slug) => {
      expect(getGalleryBearingPathsForSlug(slug)).toEqual([WEBHOOK_LIVE_PROOF_GALLERY_PATH])
    },
  )

  it('leaves the AC-25.5 placement demo mapping untouched, and still ignores an unrelated slug', () => {
    expect(getGalleryBearingPathsForSlug(PLACEMENT_DEMO_GALLERY_SLUG)).toEqual([
      '/dev/gallery-placement-demo',
    ])
    expect(getGalleryBearingPathsForSlug('some-other-backstage-gallery')).toEqual([])
    expect(getGalleryBearingPathsForSlug(null)).toEqual([])
  })
})

describe('AC-26.4: the proof route renders the state each step of the live run asserts against', () => {
  afterEach(() => {
    resolveMock.mockReset()
  })

  it('is a cached route, not a dynamic one — otherwise the proof would prove nothing', () => {
    // A dynamically-rendered page re-fetches Backstage on every request, so
    // it would show a published gallery whether or not the webhook fired.
    // 60s is the contract's own safety-net cap (row 5).
    expect(revalidate).toBe(60)
  })

  it('renders the unavailable placeholder for each draft gallery — every run’s pre-state', async () => {
    resolveMock.mockResolvedValue({ status: 'unavailable', reason: 'not_found' })

    render(await GalleryWebhookProofPage())

    const sections = screen.getAllByTestId('webhook-proof-unavailable')
    expect(sections).toHaveLength(WEBHOOK_LIVE_PROOF_GALLERY_SLUGS.length)
    expect(sections.map((section) => section.getAttribute('data-gallery-slug'))).toEqual([
      ...WEBHOOK_LIVE_PROOF_GALLERY_SLUGS,
    ])
    expect(screen.queryByTestId('webhook-proof-gallery')).toBeNull()
  })

  it('surfaces each published gallery’s photo count as the data attribute the transcript greps', async () => {
    resolveMock.mockImplementation(async (slug: string) =>
      slug === WEBHOOK_LIVE_PROOF_GALLERY_SLUGS[0]
        ? { status: 'ok', images: imagesFor(1) }
        : { status: 'unavailable', reason: 'not_found' },
    )

    render(await GalleryWebhookProofPage())

    const gallery = screen.getByTestId('webhook-proof-gallery')
    expect(gallery.getAttribute('data-gallery-slug')).toBe(WEBHOOK_LIVE_PROOF_GALLERY_SLUGS[0])
    expect(gallery.getAttribute('data-photo-count')).toBe('1')
    expect(gallery.getAttribute('data-photo-ids')).toBe('photo-1')
    // The second, still-draft gallery is unaffected by the first's publish.
    expect(screen.getByTestId('webhook-proof-unavailable').getAttribute('data-gallery-slug')).toBe(
      WEBHOOK_LIVE_PROOF_GALLERY_SLUGS[1],
    )
  })

  it('renders a published-but-empty gallery as photos=0, the state a photo delete returns it to', async () => {
    resolveMock.mockResolvedValue({ status: 'ok', images: [] })

    render(await GalleryWebhookProofPage())

    const galleries = screen.getAllByTestId('webhook-proof-gallery')
    expect(galleries).toHaveLength(WEBHOOK_LIVE_PROOF_GALLERY_SLUGS.length)
    expect(galleries.every((gallery) => gallery.getAttribute('data-photo-count') === '0')).toBe(true)
  })

  it('asks Backstage for every proof gallery, once each, through the AC-25.6 chokepoint', async () => {
    resolveMock.mockResolvedValue({ status: 'unavailable', reason: 'not_found' })

    render(await GalleryWebhookProofPage())

    expect(resolveMock).toHaveBeenCalledTimes(WEBHOOK_LIVE_PROOF_GALLERY_SLUGS.length)
    for (const slug of WEBHOOK_LIVE_PROOF_GALLERY_SLUGS) {
      expect(resolveMock).toHaveBeenCalledWith(slug)
    }
  })
})

describe('AC-26.4: the reproduction script makes the proof re-runnable rather than a one-off', () => {
  const script = fs.readFileSync(SCRIPT_PATH, 'utf8')

  it('exists and is executable', () => {
    expect(fs.statSync(SCRIPT_PATH).mode & 0o111).toBeGreaterThan(0)
  })

  it('drives all three changes through Backstage’s supported admin routes', () => {
    expect(script).toContain('/api/admin/events/${EVENT_ID}/publish')
    expect(script).toContain('/api/admin/photos/${EVENT_ID}/upload')
    expect(script).toContain('/api/admin/photos/${EVENT_ID}/photos/${PHOTO_ID}')
  })

  it('reads the served Frontstage page for its evidence and fails when the page does not move', () => {
    expect(script).toContain('${FRONTSTAGE}${PROOF_PATH}')
    expect(script).toContain(WEBHOOK_LIVE_PROOF_GALLERY_PATH)
    expect(script).toMatch(/FAIL: page still/)
  })

  it('never revalidates anything itself — only Backstage’s webhook can move the page', () => {
    expect(script).not.toContain('revalidatePath')
    expect(script).not.toContain('/api/webhooks/picpeak')
  })

  it('waits less than the contract’s 60s safety-net cap, so the safety net cannot be what refreshed the page', () => {
    const deadline = Number(/DEADLINE_SECONDS:-(\d+)/.exec(script)?.[1])
    expect(deadline).toBeGreaterThan(0)
    expect(deadline).toBeLessThan(60)
  })

  it('is syntactically valid shell', () => {
    expect(() => execSync(`bash -n ${JSON.stringify(SCRIPT_PATH)}`)).not.toThrow()
  })
})

describe('AC-26.4: the recorded live proof covers both runs and every event', () => {
  const section = auditSection()

  it('records two runs, per the sprint-3 reproduce-don’t-run-once discipline', () => {
    expect(section).toMatch(/### Run 1/)
    expect(section).toMatch(/### Run 2/)
  })

  it.each(['event.published', 'photo.uploaded', 'photo.deleted'])(
    'records the %s change reaching the Frontstage page',
    (eventType) => {
      expect(section).toContain(eventType)
    },
  )

  it.each([...WEBHOOK_LIVE_PROOF_GALLERY_SLUGS])(
    'is recorded against %s, the same slug the code maps — so the transcript cannot drift from it',
    (slug) => {
      expect(section).toContain(slug)
    },
  )

  it('names the reproduction script, so the proof can be re-run rather than only read', () => {
    expect(section).toContain('scripts/ac26.4-live-proof.sh')
  })
})
