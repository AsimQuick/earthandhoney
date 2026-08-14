/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us33-ac33.4-spam-protection-live.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.4's three spam defenses against the real
 *          `/api/inquiries` receiver, each in its own `next dev` process (own
 *          port, own in-memory rate-limiter state, mirrors
 *          us33-ac33.2/us33-ac33.3's live-round-trip technique so the three
 *          scenarios cannot contaminate each other's request counts): (1) a
 *          honeypot-filled submission is accepted with the same 201 shape a
 *          real success gets, but the Payload REST `count` endpoint proves
 *          zero Inquiry documents exist afterwards; (2) a submission whose
 *          `renderedAt` is less than SUBMISSION_MIN_ELAPSED_MS before the
 *          request is rejected the same silent way; (3) a scripted run of
 *          INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS + 1 legitimate-looking
 *          submissions from the same source proves the first
 *          INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS each succeed (201, one real
 *          Inquiry each) and the next one is rejected with 429 and creates
 *          no further Inquiry — the count stays at exactly the max.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.4
 * ---
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import dns from 'dns/promises'
import path from 'path'

import { getLiveApiAuthToken } from '@/test-support/liveApiAuth'
import { INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS, SUBMISSION_MIN_ELAPSED_MS } from '@/lib/spamProtection'

const root = process.cwd()

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

async function withLiveServer(
  port: number,
  run: (ctx: {
    base: string
    authHeaders: { Authorization: string; 'Content-Type': string }
  }) => Promise<void>,
): Promise<void> {
  const child = spawn(path.join(root, 'node_modules/.bin/next'), ['dev', '-p', String(port)], {
    cwd: root,
    env: process.env,
  })
  const base = `http://localhost:${port}`

  try {
    await waitForServer(`${base}/api/users`, 60000)
    const token = await getLiveApiAuthToken(base)
    const authHeaders = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' }

    // Next dev compiles a route on its first hit, which can itself take
    // several seconds — long enough to push a genuinely-fast test request's
    // measured elapsed time past SUBMISSION_MIN_ELAPSED_MS by the time the
    // server actually reads it, independent of how fast the request really
    // was. One throwaway request (rejected at the formId check, before spam
    // protection or the rate limiter ever run) forces that compilation to
    // happen off the clock for every scenario below.
    await fetch(`${base}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    await run({ base, authHeaders })
  } finally {
    await killServer(child)
  }
}

async function createFixtureForm(
  base: string,
  authHeaders: Record<string, string>,
  label: string,
): Promise<string> {
  const formRes = await fetch(`${base}/api/forms`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      internalName: `AC-33.4 fixture form ${label}`,
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
  return (formBody.doc ?? formBody).id as string
}

async function countInquiriesForForm(
  base: string,
  authHeaders: Record<string, string>,
  formId: string,
): Promise<number> {
  const countRes = await fetch(`${base}/api/inquiries/count?where[form][equals]=${formId}`, {
    headers: authHeaders,
  })
  expect(countRes.status).toBe(200)
  const countBody = await countRes.json()
  return countBody.totalDocs as number
}

describe('AC-33.4: spam protection against the real /api/inquiries receiver', () => {
  it(
    'a honeypot-filled submission is silently rejected — no Inquiry is created',
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        return
      }

      await withLiveServer(4292, async ({ base, authHeaders }) => {
        const unique = Date.now()
        const formId = await createFixtureForm(base, authHeaders, `honeypot-${unique}`)

        try {
          const res = await fetch(`${base}/api/inquiries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formId,
              values: { fullName: 'Jordan Casey', email: 'jordan.casey@example.com' },
              sourcePage: `/weddings?ref=${unique}`,
              honeypot: 'I am a bot filling every field I can find',
              renderedAt: Date.now() - SUBMISSION_MIN_ELAPSED_MS * 10,
              utm: {},
            }),
          })

          // Mirrors a real success — nothing in the response distinguishes
          // this from a genuine 201.
          expect(res.status).toBe(201)

          expect(await countInquiriesForForm(base, authHeaders, formId)).toBe(0)
        } finally {
          await fetch(`${base}/api/forms/${formId}`, { method: 'DELETE', headers: authHeaders }).catch(
            () => undefined,
          )
        }
      })
    },
    120000,
  )

  it(
    'a submission completed faster than the timing threshold is silently rejected — no Inquiry is created',
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        return
      }

      await withLiveServer(4293, async ({ base, authHeaders }) => {
        const unique = Date.now()
        const formId = await createFixtureForm(base, authHeaders, `timing-${unique}`)

        try {
          const res = await fetch(`${base}/api/inquiries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formId,
              values: { fullName: 'Jordan Casey', email: 'jordan.casey@example.com' },
              sourcePage: `/weddings?ref=${unique}`,
              // Rendered "now" and submitted immediately — well under
              // SUBMISSION_MIN_ELAPSED_MS.
              renderedAt: Date.now(),
              utm: {},
            }),
          })

          expect(res.status).toBe(201)

          expect(await countInquiriesForForm(base, authHeaders, formId)).toBe(0)
        } finally {
          await fetch(`${base}/api/forms/${formId}`, { method: 'DELETE', headers: authHeaders }).catch(
            () => undefined,
          )
        }
      })
    },
    120000,
  )

  it(
    `a scripted rapid-fire run is rate-limited: the first ${INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS} submissions succeed, the next is rejected with 429 and creates no Inquiry`,
    async () => {
      try {
        await dns.lookup('db')
      } catch {
        return
      }

      await withLiveServer(4294, async ({ base, authHeaders }) => {
        const unique = Date.now()
        const formId = await createFixtureForm(base, authHeaders, `ratelimit-${unique}`)
        const createdInquiryIds: string[] = []

        try {
          const submitOnce = async () =>
            fetch(`${base}/api/inquiries`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                formId,
                values: { fullName: 'Jordan Casey', email: 'jordan.casey@example.com' },
                sourcePage: `/weddings?ref=${unique}`,
                renderedAt: Date.now() - SUBMISSION_MIN_ELAPSED_MS * 10,
                utm: {},
              }),
            })

          for (let i = 0; i < INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS; i += 1) {
            const res = await submitOnce()
            expect(res.status).toBe(201)
            const body = await res.json()
            createdInquiryIds.push(body.id as string)
          }

          expect(await countInquiriesForForm(base, authHeaders, formId)).toBe(
            INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS,
          )

          const blockedRes = await submitOnce()
          expect(blockedRes.status).toBe(429)

          expect(await countInquiriesForForm(base, authHeaders, formId)).toBe(
            INQUIRY_RATE_LIMIT_MAX_SUBMISSIONS,
          )
        } finally {
          for (const id of createdInquiryIds) {
            await fetch(`${base}/api/inquiries/${id}`, { method: 'DELETE', headers: authHeaders }).catch(
              () => undefined,
            )
          }
          await fetch(`${base}/api/forms/${formId}`, { method: 'DELETE', headers: authHeaders }).catch(
            () => undefined,
          )
        }
      })
    },
    120000,
  )
})
