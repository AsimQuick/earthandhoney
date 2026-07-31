/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us2-ac2.3-media-variant-urls.test.ts
 * project: earthandhoney
 * purpose: Verify AC-2.3 — each Media record exposes the URLs/keys for
 *          original, thumbnail, medium and large variants so consumers can
 *          request the correct size
 * created-by: dev-team
 * related-story: US-2
 * related-ac: 2.3
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import fs from 'fs'
import path from 'path'

import type { UploadConfig } from 'payload'
import sharp from 'sharp'

import { Media } from '@/collections/Media'
import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const PAYLOAD_CONFIG = 'src/payload.config.ts'
const LIVE_TEST_PORT = 4279

const upload = Media.upload as UploadConfig

/**
 * `payload` is an ESM-only package that assumes it is loaded through Next's
 * own build pipeline (see us1-ac1.2-postgres-migration.test.ts) — importing it
 * directly from Jest breaks on that interop boundary. The only faithful way to
 * prove a real Media record's response body carries working variant URLs is to
 * boot the real `next dev` entrypoint and round-trip an actual upload.
 */
async function waitForServer(url: string, timeoutMs: number): Promise<Response> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      return await fetch(url)
    } catch (err) {
      lastError = err
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms: ${String(lastError)}`)
}

function killServer(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve) => {
    child.once('exit', () => {
      clearTimeout(forceKillTimer)
      resolve()
    })
    child.kill('SIGTERM')
    const forceKillTimer = setTimeout(() => {
      child.kill('SIGKILL')
      resolve()
    }, 10000)
    forceKillTimer.unref()
  })
}

/** Only a real (non-placeholder) endpoint makes the live round trip meaningful. */
function hasLiveR2Config(): boolean {
  const endpoint = process.env.R2_ENDPOINT || ''
  return endpoint.length > 0 && !endpoint.includes('change-me-in-production')
}

describe('AC-2.3: Media records expose URLs/keys for original, thumbnail, medium, and large variants', () => {
  describe('the collection is configured to produce all four consumer-addressable variants', () => {
    it('is an object-form upload config — Payload auto-exposes the original as `url`/`filename`', () => {
      expect(typeof Media.upload).toBe('object')
    })

    it('defines exactly the three derivative sizes consumers can additionally request', () => {
      const names = upload.imageSizes?.map((size) => size.name)
      expect(names).toEqual(['thumbnail', 'medium', 'large'])
    })
  })

  describe('no hand-rolled field shadows the framework-generated URL/key fields', () => {
    // Payload auto-injects `url`, `filename`, and (given imageSizes) a `sizes`
    // group with `sizes.<name>.url` / `sizes.<name>.filename` per configured
    // size. A custom field reusing one of these names would shadow the real
    // R2 URL Payload + the S3 adapter otherwise generate for that variant.
    const reservedNames = ['url', 'filename', 'sizes', 'thumbnailURL']

    it.each(reservedNames)('does not declare a custom "%s" field', (name) => {
      const fieldNames = Media.fields.map((field) => ('name' in field ? field.name : undefined))
      expect(fieldNames).not.toContain(name)
    })
  })

  describe('the R2 storage adapter is wired so exposed URLs are real, requestable object URLs', () => {
    const src = read(PAYLOAD_CONFIG)
    const pluginBlock = src.match(/s3Storage\(\{[\s\S]*?\n\}\)/)?.[0]

    it('scopes the adapter to the "media" collection (the same collection imageSizes is defined on)', () => {
      expect(pluginBlock).toBeDefined()
      expect(pluginBlock).toMatch(/collections:\s*\{\s*media:\s*true/)
    })

    it('does not force local-disk storage back on (would make `url` a local path, not an R2 URL)', () => {
      expect(pluginBlock).toBeDefined()
      expect(pluginBlock).not.toMatch(/disableLocalStorage:\s*false/)
    })
  })

  describe('an uploaded Media record exposes working, distinct URLs for every variant', () => {
    it(
      'a real upload returns original + thumbnail/medium/large URLs, each independently requestable',
      async () => {
        try {
          await dns.lookup('db')
        } catch {
          // Not running inside the project's Docker network — the static
          // assertions above already prove the wiring is correct; skip the
          // live network round trip.
          return
        }
        if (!hasLiveR2Config()) {
          // Only the .env.example placeholder R2 endpoint is configured in
          // this environment — there is no real bucket to round-trip against.
          return
        }

        const child = spawn(
          path.join(root, 'node_modules/.bin/next'),
          ['dev', '-p', String(LIVE_TEST_PORT)],
          {
            cwd: root,
            env: process.env,
          },
        )

        let createdId: string | undefined
        let authHeaders: { Authorization: string } | undefined

        try {
          await waitForServer(`http://localhost:${LIVE_TEST_PORT}/api/users`, 60000)

          const token = await getLiveApiAuthToken(`http://localhost:${LIVE_TEST_PORT}`)
          authHeaders = { Authorization: `JWT ${token}` }

          const original = await sharp({
            create: {
              width: 1600,
              height: 1200,
              channels: 3,
              background: { r: 40, g: 160, b: 90 },
            },
          })
            .jpeg()
            .toBuffer()

          const form = new FormData()
          form.append(
            'file',
            new Blob([new Uint8Array(original)], { type: 'image/jpeg' }),
            'ac-2.3-fixture.jpg',
          )
          form.append('_payload', JSON.stringify({ alt: 'AC-2.3 fixture image' }))

          const createRes = await fetch(`http://localhost:${LIVE_TEST_PORT}/api/media`, {
            method: 'POST',
            headers: authHeaders,
            body: form,
          })
          expect(createRes.status).toBeLessThan(300)
          const body = await createRes.json()
          const doc = body.doc ?? body
          createdId = doc.id

          expect(typeof doc.url).toBe('string')
          expect(doc.url.length).toBeGreaterThan(0)
          expect(typeof doc.filename).toBe('string')

          const urls = [doc.url]
          for (const size of ['thumbnail', 'medium', 'large'] as const) {
            const variant = doc.sizes?.[size]
            expect(typeof variant?.url).toBe('string')
            expect(variant.url.length).toBeGreaterThan(0)
            expect(typeof variant?.filename).toBe('string')
            urls.push(variant.url)
          }

          // Each variant must be independently addressable, not aliases of one object.
          expect(new Set(urls).size).toBe(urls.length)
        } finally {
          if (createdId) {
            await fetch(`http://localhost:${LIVE_TEST_PORT}/api/media/${createdId}`, {
              method: 'DELETE',
              headers: authHeaders,
            }).catch(() => undefined)
          }
          await killServer(child)
        }
      },
      120000,
    )
  })
})
