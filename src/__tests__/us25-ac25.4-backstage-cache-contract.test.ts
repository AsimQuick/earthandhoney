/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us25-ac25.4-backstage-cache-contract.test.ts
 * project: earthandhoney
 * purpose: Verify AC-25.4 — src/lib/backstageGalleryCache.ts obeys
 *          PAYLOAD_PICPEAK_API_CONTRACT.md's caching contract exactly: the
 *          cached shape contains only the fields the contract's "What the
 *          Frontstage is allowed to cache" section permits (rendered image
 *          URLs, thumbnails, gallery title/cover, item counts), the bounded
 *          60-second safety-net cap is enforced on every read, and nothing
 *          about the cache lets a caller treat it as authoritative past
 *          that bound or in place of a raw Backstage database row.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.4
 * ---
 */
import {
  CACHE_TTL_MS,
  getCached,
  invalidateCached,
  setCached,
  toCachedGalleryDisplay,
  __resetCacheForTests,
  type CachedGalleryDisplay,
} from '@/lib/backstageGalleryCache'
import type { FlowAOutcome } from '@/lib/backstageClient'

const PERMITTED_FIELDS = ['title', 'cover', 'imageUrls', 'thumbnailUrls', 'itemCount'].sort()

// A full, realistic Flow A success outcome — deliberately carries every
// extra field the real Backstage API returns (event_type, expires_at,
// is_active, is_expired, requires_password, color_theme, allow_downloads,
// allow_user_uploads, photo id/filename, the raw `event` object) so the
// mapping test can prove they're dropped, not merely unused.
function rawFlowAOutcome(): Extract<FlowAOutcome, { ok: true }> {
  return {
    ok: true,
    info: {
      event_name: 'Jane & Sam',
      event_type: 'wedding',
      event_date: '2026-09-01',
      expires_at: '2026-12-01T00:00:00.000Z',
      is_active: true,
      is_expired: false,
      requires_password: false,
      color_theme: 'default',
      allow_downloads: true,
      allow_user_uploads: false,
    },
    photos: {
      event: { id: 42, name: 'Jane & Sam', secret_internal_note: 'never cache me' },
      photos: [
        { id: 1, filename: 'a.jpg', url: 'https://cdn.example/a.jpg', thumbnail_url: 'https://cdn.example/a-thumb.jpg' },
        { id: 2, filename: 'b.jpg', url: 'https://cdn.example/b.jpg', thumbnail_url: 'https://cdn.example/b-thumb.jpg' },
        { id: 3, filename: 'c.jpg', url: 'https://cdn.example/c.jpg', thumbnail_url: null },
      ],
    },
  }
}

describe('AC-25.4: toCachedGalleryDisplay — narrows a Flow A outcome to display-only data', () => {
  it('maps title/cover/imageUrls/thumbnailUrls/itemCount from the outcome', () => {
    const cached = toCachedGalleryDisplay(rawFlowAOutcome())

    expect(cached).toEqual({
      title: 'Jane & Sam',
      cover: 'https://cdn.example/a.jpg',
      imageUrls: ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg', 'https://cdn.example/c.jpg'],
      thumbnailUrls: ['https://cdn.example/a-thumb.jpg', 'https://cdn.example/b-thumb.jpg'],
      itemCount: 3,
    })
  })

  it('produces a cached shape with exactly the contract-permitted fields — nothing else', () => {
    const cached = toCachedGalleryDisplay(rawFlowAOutcome())
    expect(Object.keys(cached).sort()).toEqual(PERMITTED_FIELDS)
  })

  it('drops every field a raw Backstage database row carries: event_type, expires_at, is_active, is_expired, requires_password, color_theme, allow_downloads, allow_user_uploads, the raw event object, and per-photo id/filename', () => {
    const cached = toCachedGalleryDisplay(rawFlowAOutcome()) as unknown as Record<string, unknown>

    const forbidden = [
      'event_type',
      'expires_at',
      'is_active',
      'is_expired',
      'requires_password',
      'color_theme',
      'allow_downloads',
      'allow_user_uploads',
      'event',
      'id',
      'filename',
      'secret_internal_note',
    ]
    for (const field of forbidden) {
      expect(cached).not.toHaveProperty(field)
    }
    expect(JSON.stringify(cached)).not.toContain('secret_internal_note')
  })

  it('sets cover to null for a gallery with no photos, never fabricating one', () => {
    const empty = rawFlowAOutcome()
    empty.photos.photos = []
    const cached = toCachedGalleryDisplay(empty)
    expect(cached.cover).toBeNull()
    expect(cached.itemCount).toBe(0)
  })
})

describe('AC-25.4: getCached/setCached — the bounded 60-second safety-net cap', () => {
  beforeEach(() => {
    __resetCacheForTests()
  })

  it('the TTL constant is exactly 60 seconds, the same bound the ISR routes already commit to', () => {
    expect(CACHE_TTL_MS).toBe(60_000)
  })

  it('returns the cached entry when read before the TTL elapses', () => {
    const display = toCachedGalleryDisplay(rawFlowAOutcome())
    setCached('a-gallery', display, 1_000_000)

    expect(getCached('a-gallery', 1_000_000 + CACHE_TTL_MS - 1)).toEqual(display)
  })

  it('returns null once the 60-second bound is reached — never stale-forever', () => {
    const display = toCachedGalleryDisplay(rawFlowAOutcome())
    setCached('a-gallery', display, 1_000_000)

    expect(getCached('a-gallery', 1_000_000 + CACHE_TTL_MS)).toBeNull()
  });

  it('returns null for a slug that was never cached', () => {
    expect(getCached('never-seen')).toBeNull()
  })

  it('invalidateCached clears an entry immediately, independent of the TTL — the webhook-driven path', () => {
    const display = toCachedGalleryDisplay(rawFlowAOutcome())
    setCached('a-gallery', display, 1_000_000)
    expect(getCached('a-gallery', 1_000_000)).not.toBeNull()

    invalidateCached('a-gallery')

    expect(getCached('a-gallery', 1_000_000)).toBeNull()
  })

  it('a caller mutating a returned entry cannot corrupt a later, still-valid read', () => {
    const display = toCachedGalleryDisplay(rawFlowAOutcome())
    setCached('a-gallery', display, 1_000_000)

    const first = getCached('a-gallery', 1_000_000) as CachedGalleryDisplay
    first.imageUrls.push('https://evil.example/injected.jpg')
    first.title = 'tampered'

    const second = getCached('a-gallery', 1_000_000)
    expect(second?.title).toBe('Jane & Sam')
    expect(second?.imageUrls).toEqual(display.imageUrls)
  })
})

describe('AC-25.4: a Frontstage cache is never treated as authoritative', () => {
  beforeEach(() => {
    __resetCacheForTests()
  })

  it('a miss and an expired entry are indistinguishable — both are null, so a caller cannot special-case "expired but still usable"', () => {
    setCached('a-gallery', toCachedGalleryDisplay(rawFlowAOutcome()), 1_000_000)

    const expired = getCached('a-gallery', 1_000_000 + CACHE_TTL_MS)
    const neverCached = getCached('some-other-gallery', 1_000_000 + CACHE_TTL_MS)

    expect(expired).toBeNull()
    expect(neverCached).toBeNull()
    expect(expired).toBe(neverCached)
  })

  it('setCached only accepts the narrow CachedGalleryDisplay shape, never a raw Flow A outcome or Backstage response body', () => {
    const outcome = rawFlowAOutcome()

    function attemptToCacheRawOutcome() {
      // @ts-expect-error — a raw Flow A outcome must not type-check as
      // cacheable data; only the narrowed shape toCachedGalleryDisplay
      // produces may be passed to setCached. This is a compile-time
      // guarantee (enforced by `tsc --noEmit` in CI), not a runtime one —
      // this function is declared but deliberately never called, so the
      // test exercises the type error without the runtime crash that
      // forcing a mismatched shape past `setCached` would otherwise cause.
      setCached('a-gallery', outcome)
    }
    expect(typeof attemptToCacheRawOutcome).toBe('function')
  })

  it('an expired read deletes the stale entry rather than leaving it retrievable by any other function in this module', () => {
    setCached('a-gallery', toCachedGalleryDisplay(rawFlowAOutcome()), 1_000_000)

    getCached('a-gallery', 1_000_000 + CACHE_TTL_MS) // triggers expiry + delete

    // Re-reading even at the original, still-plausible timestamp confirms
    // the entry is gone, not just hidden by the TTL check — nothing brings
    // expired data back to life.
    expect(getCached('a-gallery', 1_000_000)).toBeNull()
  })
})
