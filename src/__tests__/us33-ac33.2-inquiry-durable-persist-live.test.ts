/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us33-ac33.2-inquiry-durable-persist-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.2 — a form submission is durably persisted as an
 *          `Inquiries` document even when the studio notification path
 *          fails. Boots the real `next dev` entrypoint against the live
 *          "db" Postgres service (mirrors us31-ac31.4/us32-ac32.2's
 *          live-round-trip technique). Creates a real `Forms` document,
 *          POSTs a real submission to `/api/inquiries` — the notification
 *          path is forced to fail simply by exercising the real, current
 *          server: since AC-33.5.2.3, src/lib/inquiryNotification.ts's
 *          `sendInquiryNotification` is a real client of Backstage's
 *          `POST /api/v1/notifications/inquiry`, and it is failed here the
 *          way a real deployment would fail — by pointing the spawned
 *          server's `BACKSTAGE_BACKEND_URL` at an unreachable host, so the
 *          module's own `fetch` genuinely cannot reach Backstage. No test
 *          hook exists in the product code any more (the AC-33.2 stub that
 *          unconditionally rejected is gone), and nothing here depends on
 *          whether the `backstage` compose profile happens to be up: with
 *          Backstage running and a valid `BACKSTAGE_API_TOKEN` in `.env`,
 *          the notification would otherwise succeed and this suite would
 *          stop proving anything about a failing notification at all.
 *          The suite then reads the created Inquiry back over
 *          the live Payload REST API and asserts the submitted field
 *          values, source page, and utm_* parameters are all present on the
 *          stored record, proving persistence never depended on the
 *          notification succeeding.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.2
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'

const root = process.cwd()
const LIVE_TEST_PORT = 4290

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

describe('AC-33.2: a submission persists as a durable Inquiry even when notification fails', () => {
  it(
    'the Inquiry exists and is readable via the admin API, with submitted values, source page, and utm_* all present, after a forced notification failure',
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
        {
          cwd: root,
          env: {
            ...process.env,
            // The real cause of the notification failure this AC needs, set
            // where a deployment would set it rather than in product code:
            // ".invalid" is reserved by RFC 2606 and never resolves, so
            // sendInquiryNotification()'s own fetch fails on an unreachable
            // Backstage on every run, whether or not the "backstage" compose
            // profile is up.
            BACKSTAGE_BACKEND_URL: 'http://backstage-backend.invalid:3000',
          },
        },
      )

      const base = `http://localhost:${LIVE_TEST_PORT}`
      let authHeaders: { Authorization: string; 'Content-Type': string } | undefined
      let formId: string | undefined
      let inquiryId: string | undefined

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }

        const unique = Date.now()

        const formRes = await fetch(`${base}/api/forms`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            internalName: `AC-33.2 fixture form ${unique}`,
            publicTitle: 'Get in touch',
            recipients: [{ email: 'studio@earthandhoney.test' }],
            successMessage: 'Thanks — we will be in touch soon.',
            fields: [
              { fieldType: 'shortText', name: 'fullName', label: 'Full name', required: true },
              { fieldType: 'email', name: 'email', label: 'Email', required: true },
            ],
          }),
        })
        expect(formRes.status).toBeLessThan(300)
        const formBody = await formRes.json()
        formId = (formBody.doc ?? formBody).id as string

        const submission = {
          formId,
          values: { fullName: 'Jordan Casey', email: 'jordan.casey@example.com' },
          sourcePage: `/weddings?ref=${unique}`,
          utm: {
            source: 'instagram',
            medium: 'social',
            campaign: `ac33-2-${unique}`,
            term: 'wedding-photographer',
            content: 'bio-link',
          },
        }

        // The notification path fails here with no test-only hook in the
        // product code: the spawned server's BACKSTAGE_BACKEND_URL points at
        // an unresolvable host (see the spawn above), so the real
        // sendInquiryNotification() call this real POST triggers fails on an
        // unreachable Backstage — a real cause, not a stub.
        const submitRes = await fetch(`${base}/api/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission),
        })
        expect(submitRes.status).toBe(201)
        const submitBody = await submitRes.json()
        inquiryId = submitBody.id as string
        expect(inquiryId).toBeTruthy()

        // Read the Inquiry back the way the admin panel would — a plain
        // authenticated GET, not an in-process assumption.
        const readRes = await fetch(`${base}/api/inquiries/${inquiryId}`, { headers: authHeaders })
        expect(readRes.status).toBe(200)
        const inquiry = await readRes.json()

        expect(inquiry.values).toEqual({ fullName: 'Jordan Casey', email: 'jordan.casey@example.com' })
        expect(inquiry.sourcePage).toBe(`/weddings?ref=${unique}`)
        expect(inquiry.utm).toEqual({
          source: 'instagram',
          medium: 'social',
          campaign: `ac33-2-${unique}`,
          term: 'wedding-photographer',
          content: 'bio-link',
        })
      } finally {
        if (inquiryId) {
          await fetch(`${base}/api/inquiries/${inquiryId}`, { method: 'DELETE', headers: authHeaders }).catch(
            () => undefined,
          )
        }
        if (formId) {
          await fetch(`${base}/api/forms/${formId}`, { method: 'DELETE', headers: authHeaders }).catch(
            () => undefined,
          )
        }
        await killServer(child)
      }
    },
    120000,
  )
})
