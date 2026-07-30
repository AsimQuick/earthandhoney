/**
 * ---
 * file: src/__tests__/us6-ac6.2-isr-static-generation.test.ts
 * project: earthandhoney
 * purpose: Verify AC-6.2 — a gallery-bearing route uses static generation with
 *          incremental regeneration (ISR), proven against the internal
 *          demo/test-harness route src/app/(frontend)/dev/gallery-isr-demo. Two
 *          concerns are covered: (1) the route's segment config is genuine ISR
 *          wiring (finite positive `revalidate`, no `force-dynamic`, no
 *          request-scoped dynamic input) rendering a real gallery from the
 *          in-scope Payload Galleries collection via the Local API — and is an
 *          internal route (noindex, not linked from public navigation, not
 *          backed by the out-of-scope Portfolio/Homepage CMS collections); and
 *          (2) the payload-import-free mapping (payloadGalleryMapper) the route
 *          uses to turn that Payload document into the Gallery Engine's
 *          GalleryImage[] shape. The route itself is asserted via source-text
 *          (not import): its page module imports `payload`, an ESM-only package
 *          that breaks Jest's interop boundary when imported directly (see
 *          us3-ac3.5-galleries-api-read.test.ts), so the ISR segment config —
 *          fundamentally a build-time concern — is verified from source, the
 *          same pattern us4-ac4.4 uses for route-config claims.
 * created-by: dev-team
 * related-story: US-6
 * related-ac: 6.2
 * ---
 */
import fs from 'fs'
import path from 'path'

import { mapPayloadGalleryToImages, type PayloadGalleryDoc } from '@/components/gallery/payloadGalleryMapper'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const ISR_PAGE_PATH = 'src/app/(frontend)/dev/gallery-isr-demo/page.tsx'
const ISR_ROUTE_REF = 'dev/gallery-isr-demo'
const ISR_SRC = read(ISR_PAGE_PATH)

describe('AC-6.2: the ISR demo route uses static generation with incremental regeneration', () => {
  it('exports a positive, finite `revalidate` — the segment config that makes Next serve a static page and regenerate it in the background at most this often', () => {
    const match = ISR_SRC.match(/export const revalidate\s*=\s*([^\n]+)/)
    expect(match).not.toBeNull()

    const seconds = Number(match![1].trim())
    expect(Number.isFinite(seconds)).toBe(true)
    expect(seconds).toBeGreaterThan(0)
  })

  it('does not opt out of static generation with `dynamic = "force-dynamic"`', () => {
    // Match the real segment-config export, not the explanatory comment in the
    // page header that names `dynamic = 'force-dynamic'` while explaining why
    // this route deliberately avoids it.
    expect(ISR_SRC).not.toMatch(/export const dynamic\s*=\s*['"]force-dynamic['"]/)
  })

  it('does not disable ISR with `revalidate = false` or `revalidate = 0`', () => {
    expect(ISR_SRC).not.toMatch(/export const revalidate\s*=\s*false\b/)
    expect(ISR_SRC).not.toMatch(/export const revalidate\s*=\s*0\b/)
  })

  it('reads no request-scoped dynamic input that would force per-request dynamic rendering (no next/headers cookies/headers/draftMode, no noStore, no searchParams/params props)', () => {
    // Importing from next/headers (cookies/headers/draftMode) or calling
    // unstable_noStore() opts a route segment out of static generation.
    expect(ISR_SRC).not.toMatch(/from ['"]next\/headers['"]/)
    expect(ISR_SRC).not.toMatch(/\bunstable_noStore\b|\bnoStore\s*\(/)
    // The default page component takes no props, so it can read neither
    // `searchParams` nor `params` — both of which mark a route dynamic. The
    // empty parameter list is the authoritative proof; the header comment does
    // name "searchParams" in prose, so we assert the signature rather than the
    // mere absence of the word.
    expect(ISR_SRC).toMatch(/export default async function \w+\(\s*\)/)
    // No code path destructures props or reads a `.searchParams`/`.params`
    // property off one (the header comment's plain-word mentions don't match).
    expect(ISR_SRC).not.toMatch(/\.(searchParams|params)\b/)
  })
})

describe('AC-6.2: the ISR route renders a real gallery from the in-scope Galleries collection via the Local API', () => {
  it('fetches through Payload\'s Local API (getPayload) using the shared Payload config', () => {
    expect(ISR_SRC).toMatch(/from ['"]payload['"]/)
    expect(ISR_SRC).toMatch(/getPayload\s*\(/)
    expect(ISR_SRC).toMatch(/from ['"]@payload-config['"]/)
  })

  it('queries the in-scope `galleries` collection (US-3), not a per-page image list', () => {
    expect(ISR_SRC).toMatch(/collection:\s*['"]galleries['"]/)
  })

  it('maps the fetched Payload gallery through the shared mapper and renders it via the one reusable Gallery Engine', () => {
    expect(ISR_SRC).toMatch(/from ['"]@\/components\/gallery\/payloadGalleryMapper['"]/)
    expect(ISR_SRC).toMatch(/\bmapPayloadGalleryToImages\s*\(/)
    expect(ISR_SRC).toMatch(/from ['"]@\/components\/gallery\/GalleryEngine['"]/)
    expect(ISR_SRC).toMatch(/<GalleryEngine\b/)
  })
})

describe('AC-6.2: the ISR route is internal — not backed by the Portfolio collection or a Homepage global', () => {
  it('does not import or query a Portfolio or Homepage collection', () => {
    expect(ISR_SRC).not.toMatch(/from ['"].*collections\/(Portfolio|Homepage)['"]/)
    expect(ISR_SRC).not.toMatch(/collection:\s*['"](portfolio|homepage)['"]/i)
  })

  it('src/collections/ contains only the audited Galleries, Media, Portfolio, and Users collections (trip-wire against adding further collections unaudited)', () => {
    const files = fs.readdirSync(path.join(root, 'src/collections')).sort()
    expect(files).toEqual(['Galleries.ts', 'Media.ts', 'Portfolio.ts', 'Users.ts'])
  })
})

describe('AC-6.2: the ISR route is internal — excluded from indexing and not linked from public navigation', () => {
  it('is marked robots noindex so it never enters the public site', () => {
    expect(ISR_SRC).toMatch(/robots:\s*\{[^}]*index:\s*false/)
  })

  it('the public homepage does not link to the ISR demo route', () => {
    expect(read('src/app/(frontend)/page.tsx')).not.toContain(ISR_ROUTE_REF)
  })

  it('the shared frontend layout does not link to the ISR demo route', () => {
    expect(read('src/app/(frontend)/layout.tsx')).not.toContain(ISR_ROUTE_REF)
  })

  it('no file outside the route itself links to it', () => {
    const appDir = path.join(root, 'src/app')
    const offenders: string[] = []

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const relative = path.relative(root, full)
          if (relative === ISR_PAGE_PATH) continue
          if (fs.readFileSync(full, 'utf8').includes(ISR_ROUTE_REF)) offenders.push(relative)
        }
      }
    }
    walk(appDir)

    expect(offenders).toEqual([])
  })
})

describe('AC-6.2: mapPayloadGalleryToImages — the Payload→Gallery Engine data path the ISR route renders', () => {
  it('maps populated Media relations into GalleryImage[], carrying alt/url/sizes/dimensions through', () => {
    const gallery: PayloadGalleryDoc = {
      id: 1,
      title: 'ISR demo gallery',
      images: [
        {
          image: {
            id: 42,
            alt: 'A demo photo',
            url: '/media/original-42.jpg',
            width: 4000,
            height: 3000,
            sizes: {
              thumbnail: { url: '/media/thumb-42.jpg' },
              medium: { url: '/media/medium-42.jpg' },
              large: { url: '/media/large-42.jpg' },
            },
          },
        },
      ],
    }

    expect(mapPayloadGalleryToImages(gallery)).toEqual([
      {
        id: '42',
        url: '/media/original-42.jpg',
        alt: 'A demo photo',
        thumbnailUrl: '/media/thumb-42.jpg',
        mediumUrl: '/media/medium-42.jpg',
        largeUrl: '/media/large-42.jpg',
        width: 4000,
        height: 3000,
      },
    ])
  })

  it('preserves row order across multiple images', () => {
    const gallery: PayloadGalleryDoc = {
      id: 1,
      title: 'ISR demo gallery',
      images: [
        { image: { id: 1, url: '/one.jpg' } },
        { image: { id: 2, url: '/two.jpg' } },
        { image: { id: 3, url: '/three.jpg' } },
      ],
    }

    expect(mapPayloadGalleryToImages(gallery).map((image) => image.id)).toEqual(['1', '2', '3'])
  })

  it('drops rows whose image relation is not populated (still a bare id), instead of crashing', () => {
    const gallery: PayloadGalleryDoc = {
      id: 1,
      title: 'ISR demo gallery',
      images: [
        { image: 99 },
        { image: { id: 42, url: '/media/42.jpg' } },
      ],
    }

    const result = mapPayloadGalleryToImages(gallery)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('42')
  })

  it('falls back to an empty url string (never undefined) when a populated Media doc has no url', () => {
    const gallery: PayloadGalleryDoc = {
      id: 1,
      title: 'ISR demo gallery',
      images: [{ image: { id: 7, alt: 'No url yet' } }],
    }

    expect(mapPayloadGalleryToImages(gallery)[0].url).toBe('')
  })

  it('falls back to the gallery title as alt text when the Media doc has no alt', () => {
    const gallery: PayloadGalleryDoc = {
      id: 1,
      title: 'ISR demo gallery',
      images: [{ image: { id: 1, url: '/one.jpg' } }],
    }

    expect(mapPayloadGalleryToImages(gallery)[0].alt).toBe('ISR demo gallery')
  })

  it('leaves thumbnail/medium/large variant URLs undefined when a Media doc has no sizes', () => {
    const gallery: PayloadGalleryDoc = {
      id: 1,
      title: 'ISR demo gallery',
      images: [{ image: { id: 1, url: '/one.jpg' } }],
    }

    const [image] = mapPayloadGalleryToImages(gallery)
    expect(image.thumbnailUrl).toBeUndefined()
    expect(image.mediumUrl).toBeUndefined()
    expect(image.largeUrl).toBeUndefined()
  })

  it('returns an empty array for a gallery with no images field at all', () => {
    const gallery: PayloadGalleryDoc = { id: 1, title: 'Empty gallery' }
    expect(mapPayloadGalleryToImages(gallery)).toEqual([])
  })

  it('returns an empty array for a gallery with an empty images array', () => {
    const gallery: PayloadGalleryDoc = { id: 1, title: 'Empty gallery', images: [] }
    expect(mapPayloadGalleryToImages(gallery)).toEqual([])
  })
})
