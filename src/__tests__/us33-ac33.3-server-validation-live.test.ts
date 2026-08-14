/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us33-ac33.3-server-validation-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.3 — the server is authoritative even when a
 *          submission is crafted to bypass the browser entirely. Boots the
 *          real `next dev` entrypoint against the live "db" Postgres
 *          service (mirrors us33-ac33.2-inquiry-durable-persist-live.test.ts'
 *          technique), creates a real `Forms` document, then sends three
 *          direct POSTs to `/api/inquiries` that a browser-side form could
 *          never produce if its own validation ran: one missing the
 *          required `fullName`, one with a malformed `email`, and one whose
 *          `fullName` exceeds INQUIRY_FIELD_MAX_LENGTH.shortText. Asserts
 *          each is rejected with 400 and a body naming the failed field,
 *          and — the AC's "no record written" clause — that the Inquiries
 *          collection contains zero documents for this form afterwards,
 *          read back over the live Payload REST API rather than inferred
 *          from the response code alone.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.3
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'
import { INQUIRY_FIELD_MAX_LENGTH } from '@/lib/validateInquirySubmission'

const root = process.cwd()
const LIVE_TEST_PORT = 4291

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

describe('AC-33.3: the server rejects a submission crafted to bypass the browser, with no record written', () => {
  it(
    'rejects a missing required field, a malformed email, and an over-long field — each with 400 and zero Inquiries persisted',
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        // Not running inside the project's Docker network — skip the live
        // network round trip.
        return
      }

      const child = spawn(
        path.join(root, 'node_modules/.bin/next'),
        ['dev', '-p', String(LIVE_TEST_PORT)],
        { cwd: root, env: process.env },
      )

      const base = `http://localhost:${LIVE_TEST_PORT}`
      let authHeaders: { Authorization: string; 'Content-Type': string } | undefined
      let formId: string | undefined

      try {
        await waitForServer(`${base}/api/users`, 60000)

        const token = await getLiveApiAuthToken(base)
        authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }

        const unique = Date.now()

        const formRes = await fetch(`${base}/api/forms`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            internalName: `AC-33.3 fixture form ${unique}`,
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

        const sourcePage = `/weddings?ref=${unique}`

        // 1. Missing required field.
        const missingFieldRes = await fetch(`${base}/api/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId,
            values: { email: 'jordan.casey@example.com' },
            sourcePage,
            utm: {},
          }),
        })
        expect(missingFieldRes.status).toBe(400)
        const missingFieldBody = await missingFieldRes.json()
        expect(JSON.stringify(missingFieldBody)).toContain('fullName')

        // 2. Malformed email.
        const malformedEmailRes = await fetch(`${base}/api/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId,
            values: { fullName: 'Jordan Casey', email: 'not-an-email' },
            sourcePage,
            utm: {},
          }),
        })
        expect(malformedEmailRes.status).toBe(400)
        const malformedEmailBody = await malformedEmailRes.json()
        expect(JSON.stringify(malformedEmailBody)).toContain('email')

        // 3. Over-long field.
        const overLongRes = await fetch(`${base}/api/inquiries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId,
            values: {
              fullName: 'a'.repeat(INQUIRY_FIELD_MAX_LENGTH.shortText + 1),
              email: 'jordan.casey@example.com',
            },
            sourcePage,
            utm: {},
          }),
        })
        expect(overLongRes.status).toBe(400)
        const overLongBody = await overLongRes.json()
        expect(JSON.stringify(overLongBody)).toContain('fullName')

        // No Inquiry record exists for this form despite three POSTs. Uses
        // the Payload REST `count` endpoint (`/api/inquiries/count`) rather
        // than the plain list endpoint (`/api/inquiries`) because that
        // exact path is also where this app's own POST-only
        // src/app/(frontend)/api/inquiries/route.ts lives — a GET to that
        // same static path returns 405 rather than falling through to
        // Payload's `[...slug]` catch-all, while `/api/inquiries/count` is
        // a distinct path the catch-all owns outright.
        const countRes = await fetch(
          `${base}/api/inquiries/count?where[form][equals]=${formId}`,
          { headers: authHeaders },
        )
        expect(countRes.status).toBe(200)
        const countBody = await countRes.json()
        expect(countBody.totalDocs).toBe(0)
      } finally {
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
