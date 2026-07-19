/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us3-ac3.5-galleries-api-read.test.ts
 * project: earthandhoney
 * purpose: Verify AC-3.5 — galleries are readable via Payload's API/local API
 *          so the gallery viewer components (built in US-4/US-5) can consume
 *          them
 * created-by: dev-team
 * related-story: US-3
 * related-ac: 3.5
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import fs from 'fs'
import path from 'path'

import { Galleries } from '@/collections/Galleries'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const PAYLOAD_CONFIG = 'src/payload.config.ts'
const REST_ROUTE = 'src/app/(payload)/api/[...slug]/route.ts'
const GRAPHQL_ROUTE = 'src/app/(payload)/api/graphql/route.ts'
const LOCAL_API_FIND = 'node_modules/payload/dist/collections/operations/local/find.js'

const LIVE_TEST_PORT = 4282
const FIXTURE_EMAIL = 'ac3.5-fixture@earthandhoney.test'
const FIXTURE_PASSWORD = 'ac3.5-Fixture-Password!23'

/**
 * `payload` is an ESM-only package that assumes it is loaded through Next's
 * own build pipeline (see us1-ac1.2-postgres-migration.test.ts) — importing it
 * directly from Jest breaks on that interop boundary. The only faithful way to
 * prove galleries are readable via the real REST API is to boot the real
 * `next dev` entrypoint and round-trip real requests against it. Creating a
 * gallery touches only Postgres (no Media upload), so — unlike the AC-2.3/2.4/
 * 3.3 live tests — this round trip needs no real R2 credentials and can run
 * wherever `db` is reachable, matching the AC-1.2 pattern.
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

/** Obtain a JWT for the fixture user, registering it as the first user if none exists yet. */
async function getAuthToken(base: string): Promise<string> {
  const registerRes = await fetch(`${base}/api/users/first-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: FIXTURE_EMAIL, password: FIXTURE_PASSWORD }),
  })
  if (registerRes.status < 300) {
    const body = await registerRes.json()
    return body.token as string
  }

  // A user already exists (e.g. a prior run against the same Postgres volume)
  // — fall back to logging in with the same fixture credentials.
  const loginRes = await fetch(`${base}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: FIXTURE_EMAIL, password: FIXTURE_PASSWORD }),
  })
  expect(loginRes.status).toBeLessThan(300)
  const body = await loginRes.json()
  return body.token as string
}

describe('AC-3.5: galleries are readable via Payload REST/GraphQL API and the Local API', () => {
  describe('no access-control override blocks reading galleries', () => {
    it('declares no custom "access" rules — default Payload access control applies', () => {
      expect(Galleries.access).toBeUndefined()
    })

    it('does not disable the collection\'s REST endpoints', () => {
      expect(Galleries.endpoints).not.toBe(false)
    })

    it('does not disable GraphQL queries for the collection', () => {
      expect(Galleries.graphQL).not.toBe(false)
      expect((Galleries.graphQL as { disableQueries?: true } | undefined)?.disableQueries).not.toBe(true)
    })
  })

  describe('the generic REST/GraphQL API routes (wired in US-1) serve galleries with no gallery-specific route needed', () => {
    it('the REST catch-all route builds its handlers from the shared Payload config, not a per-collection allowlist', () => {
      const src = read(REST_ROUTE)
      expect(REST_ROUTE).toMatch(/\[\.\.\.slug\]/)
      expect(src).toMatch(/from ['"]@payload-config['"]/)
      expect(src).toMatch(/export const GET = REST_GET\(config\)/)
    })

    it('the GraphQL route builds its handler from the same shared Payload config', () => {
      const src = read(GRAPHQL_ROUTE)
      expect(src).toMatch(/from ['"]@payload-config['"]/)
      expect(src).toMatch(/export const POST = GRAPHQL_POST\(config\)/)
    })

    it('Galleries is registered in the shared Payload config these routes read from', () => {
      const src = read(PAYLOAD_CONFIG)
      expect(src).toMatch(/from ['"]\.\/collections\/Galleries['"]/)
      expect(src).toMatch(/collections:\s*\[[^\]]*Galleries/)
    })
  })

  describe('the Local API (the mechanism server-rendered gallery viewer components use) reads without needing an authenticated request', () => {
    it('Payload\'s local `find` operation defaults `overrideAccess` to true', () => {
      const src = read(LOCAL_API_FIND)
      expect(src).toMatch(/overrideAccess\s*=\s*true/)
    })
  })

  describe('a real gallery, created via the REST API, can be read back via the REST API', () => {
    it(
      'an authenticated client can create, then list and fetch, a gallery; an unauthenticated client cannot read it',
      async () => {
        try {
          await dns.lookup('db')
        } catch {
          // Not running inside the project's Docker network — the static
          // assertions above already prove the wiring is correct; skip the
          // live network round trip.
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

        const base = `http://localhost:${LIVE_TEST_PORT}`
        let galleryId: number | string | undefined

        try {
          await waitForServer(`${base}/api/users`, 60000)

          const token = await getAuthToken(base)
          const authHeaders = {
            'Content-Type': 'application/json',
            Authorization: `JWT ${token}`,
          }

          const createRes = await fetch(`${base}/api/galleries`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              title: 'AC-3.5 fixture gallery',
              description: 'Created to verify galleries are readable via the API',
              images: [],
            }),
          })
          expect(createRes.status).toBeLessThan(300)
          const created = await createRes.json()
          const gallery = created.doc ?? created
          galleryId = gallery.id
          // Payload's Postgres adapter issues numeric (serial) IDs by default,
          // so assert the created doc has *an* id of the adapter's own type
          // rather than assuming a string.
          expect(galleryId).toBeDefined()
          expect(['string', 'number']).toContain(typeof galleryId)

          const getRes = await fetch(`${base}/api/galleries/${galleryId}`, {
            headers: authHeaders,
          })
          expect(getRes.status).toBe(200)
          const fetched = await getRes.json()
          expect(fetched.title).toBe('AC-3.5 fixture gallery')
          expect(fetched.description).toBe('Created to verify galleries are readable via the API')

          const listRes = await fetch(`${base}/api/galleries`, { headers: authHeaders })
          expect(listRes.status).toBe(200)
          const list = await listRes.json()
          expect(list.docs.map((doc: { id: number | string }) => doc.id)).toContain(galleryId)

          // Default Payload access control requires an authenticated request —
          // proving reads are gated, not silently open to anyone.
          const anonymousRes = await fetch(`${base}/api/galleries/${galleryId}`)
          expect([401, 403]).toContain(anonymousRes.status)
        } finally {
          if (galleryId) {
            await fetch(`${base}/api/galleries/${galleryId}`, { method: 'DELETE' }).catch(() => undefined)
          }
          await killServer(child)
        }
      },
      120000,
    )
  })
})
