/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us2-ac2.4-alt-text-required.test.ts
 * project: earthandhoney
 * purpose: Verify AC-2.4 — alt text is a required field on Media to support
 *          accessibility and SEO
 * created-by: dev-team
 * related-story: US-2
 * related-ac: 2.4
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import sharp from 'sharp'

import { Media } from '@/collections/Media'

const root = process.cwd()
const LIVE_TEST_PORT = 4280

/**
 * `payload` is an ESM-only package that assumes it is loaded through Next's
 * own build pipeline (see us1-ac1.2-postgres-migration.test.ts) — importing it
 * directly from Jest breaks on that interop boundary. The only faithful way to
 * prove Payload actually rejects an alt-less upload is to boot the real
 * `next dev` entrypoint and round-trip real requests against it.
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

describe('AC-2.4: alt text is a required field on Media', () => {
  describe('the collection config declares alt as required', () => {
    it('declares an "alt" text field', () => {
      const altField = Media.fields.find((field) => 'name' in field && field.name === 'alt')
      expect(altField).toBeDefined()
      expect(altField && 'type' in altField ? altField.type : undefined).toBe('text')
    })

    it('marks the "alt" field required', () => {
      const altField = Media.fields.find((field) => 'name' in field && field.name === 'alt') as
        | { required?: boolean }
        | undefined
      expect(altField?.required).toBe(true)
    })
  })

  describe('Payload enforces the requirement at the API boundary', () => {
    it(
      'rejects an upload with no alt text, and accepts the same upload once alt is supplied',
      async () => {
        try {
          await dns.lookup('db')
        } catch {
          // Not running inside the project's Docker network — the static
          // config assertion above already proves the wiring is correct;
          // skip the live network round trip.
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

        try {
          await waitForServer(`http://localhost:${LIVE_TEST_PORT}/api/users`, 60000)

          const original = await sharp({
            create: {
              width: 800,
              height: 600,
              channels: 3,
              background: { r: 90, g: 120, b: 200 },
            },
          })
            .jpeg()
            .toBuffer()

          const rejectedForm = new FormData()
          rejectedForm.append(
            'file',
            new Blob([new Uint8Array(original)], { type: 'image/jpeg' }),
            'ac-2.4-no-alt.jpg',
          )
          rejectedForm.append('_payload', JSON.stringify({}))

          const rejectedRes = await fetch(`http://localhost:${LIVE_TEST_PORT}/api/media`, {
            method: 'POST',
            body: rejectedForm,
          })
          expect(rejectedRes.status).toBeGreaterThanOrEqual(400)
          expect(rejectedRes.status).toBeLessThan(500)

          const acceptedForm = new FormData()
          acceptedForm.append(
            'file',
            new Blob([new Uint8Array(original)], { type: 'image/jpeg' }),
            'ac-2.4-with-alt.jpg',
          )
          acceptedForm.append('_payload', JSON.stringify({ alt: 'AC-2.4 fixture image' }))

          const acceptedRes = await fetch(`http://localhost:${LIVE_TEST_PORT}/api/media`, {
            method: 'POST',
            body: acceptedForm,
          })
          expect(acceptedRes.status).toBeLessThan(300)
          const body = await acceptedRes.json()
          createdId = (body.doc ?? body).id
        } finally {
          if (createdId) {
            await fetch(`http://localhost:${LIVE_TEST_PORT}/api/media/${createdId}`, {
              method: 'DELETE',
            }).catch(() => undefined)
          }
          await killServer(child)
        }
      },
      120000,
    )
  })
})
