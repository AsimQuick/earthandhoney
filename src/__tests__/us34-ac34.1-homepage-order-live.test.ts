/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us34-ac34.1-homepage-order-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-34.1 against real rendered HTML, not an in-process
 *          component render: boots the real `next dev` entrypoint against
 *          the live "db" Postgres service (mirrors
 *          us31-ac31.4-public-page-route.test.ts's technique), fetches the
 *          actual homepage response ('/'), and asserts the PRD §13.2
 *          structural markers appear in the response markup in the exact
 *          order the PRD specifies: navigation (`primary-nav`, rendered by
 *          PublicShell/VerticalMenu), the full-width hero slideshow
 *          placement (`home-hero-slideshow-placement`), the selected
 *          galleries or stories region (`home-selected-galleries`), the
 *          primary inquiry form region (`home-inquiry-form-region`), and the
 *          footer (`site-footer`). The optional short-introduction region is
 *          intentionally not asserted present here — PRD §13.2 marks it
 *          optional and the homepage route does not currently supply one
 *          (AC-34.1 fixes structural position only; content wiring for the
 *          hero/selections/introduction is AC-34.2/34.3/34.4's concern) — so
 *          this test proves the five markers that are always present, in
 *          order, against a running stack.
 * created-by: dev-team
 * related-story: US-34
 * related-ac: 34.1
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

const root = process.cwd()
const LIVE_TEST_PORT = 4295

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

describe('AC-34.1: the homepage renders the PRD §13.2 order exactly, against a running stack', () => {
  it(
    'renders navigation, hero placement, selected galleries, inquiry form region and footer in that order',
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        // Not running inside the project's Docker network (e.g. a bare
        // `npm test` on the host) — skip the live network round trip.
        return
      }

      const child = spawn(
        path.join(root, 'node_modules/.bin/next'),
        ['dev', '-p', String(LIVE_TEST_PORT)],
        { cwd: root, env: process.env },
      )

      const base = `http://localhost:${LIVE_TEST_PORT}`

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const res = await fetch(`${base}/`)
        expect(res.status).toBe(200)
        const html = await res.text()

        const MARKERS = [
          'data-testid="primary-nav"',
          'data-testid="home-hero-slideshow-placement"',
          'data-testid="home-selected-galleries"',
          'data-testid="home-inquiry-form-region"',
          'data-testid="site-footer"',
        ]

        for (const marker of MARKERS) {
          expect(html).toContain(marker)
        }

        const indices = MARKERS.map((marker) => html.indexOf(marker))
        const sortedIndices = [...indices].sort((a, b) => a - b)
        expect(indices).toEqual(sortedIndices)
      } finally {
        await killServer(child)
      }
    },
    120000,
  )
})
