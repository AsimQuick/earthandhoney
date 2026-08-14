/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us37-ac37.5-robots-and-dev-routes-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.5's evidence bar against a real running stack: the
 *          fetched `/robots.txt`, and each of the six internal dev
 *          demo/specimen routes (`/dev/token-specimen`,
 *          `/dev/gallery-placement-demo`, `/dev/gallery-demo`,
 *          `/dev/gallery-webhook-proof`, `/dev/benchmark-portfolio-gallery`,
 *          `/dev/benchmark-story-gallery`) proven absent from the real
 *          `/sitemap.xml` and carrying its noindex directive in its own
 *          rendered HTML — not asserted against an in-code metadata object
 *          (the same rendered-HTML bar AC-37.2 and AC-31.4 already hold).
 *          Boots a real `next dev` the same way every other AC-37 live suite
 *          does (us37-ac37.4.1/37.4.2/37.4.3-*-live.test.ts); no Payload
 *          fixtures are created here since neither `/robots.txt` nor the six
 *          dev routes read from the database — `getSitemapEntries` (the sole
 *          sitemap source, AC-37.4.1) only ever queries `pages`/`stories`, so
 *          the dev routes are structurally unreachable from the sitemap
 *          without a page/story row naming their slug, and none exists.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.5
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

const root = process.cwd()
const LIVE_TEST_PORT = 4305

const DEV_ROUTES = [
  '/dev/token-specimen',
  '/dev/gallery-placement-demo',
  '/dev/gallery-demo',
  '/dev/gallery-webhook-proof',
  '/dev/benchmark-portfolio-gallery',
  '/dev/benchmark-story-gallery',
]

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

describe('AC-37.5: robots.txt is correct, and every internal dev route stays out of the sitemap and non-indexable', () => {
  it(
    'serves a correct /robots.txt, keeps every dev route out of /sitemap.xml, and every dev route still carries its noindex directive in rendered HTML',
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        // Not running inside the project's Docker network — skip the live round trip.
        return
      }

      const base = `http://localhost:${LIVE_TEST_PORT}`
      const child = spawn(path.join(root, 'node_modules/.bin/next'), ['dev', '-p', String(LIVE_TEST_PORT)], {
        cwd: root,
        env: { ...process.env, NEXT_PUBLIC_SITE_URL: base },
      })

      try {
        await waitForServer(`${base}/api/users`, 60000)

        // --- robots.txt ---
        const robotsRes = await fetch(`${base}/robots.txt`)
        expect(robotsRes.status).toBe(200)
        const robotsBody = await robotsRes.text()
        expect(robotsBody).toMatch(/User-Agent:\s*\*/i)
        expect(robotsBody).toMatch(/Allow:\s*\//i)
        expect(robotsBody).toMatch(/Disallow:\s*\/dev\//i)
        expect(robotsBody).toContain(`Sitemap: ${base}/sitemap.xml`)

        // --- sitemap.xml: none of the six dev routes ever appear ---
        const sitemapRes = await fetch(`${base}/sitemap.xml`)
        expect(sitemapRes.status).toBe(200)
        const sitemapBody = await sitemapRes.text()
        for (const route of DEV_ROUTES) {
          expect(sitemapBody).not.toContain(route)
        }

        // --- each dev route: 200, and a real noindex directive in its own rendered HTML ---
        for (const route of DEV_ROUTES) {
          const res = await fetch(`${base}${route}`)
          expect(res.status).toBe(200)
          const html = await res.text()
          expect(html).toMatch(/<meta[^>]+name="robots"[^>]+content="[^"]*noindex[^"]*"/i)
        }
      } finally {
        await killServer(child)
      }
    },
    180000,
  )
})
