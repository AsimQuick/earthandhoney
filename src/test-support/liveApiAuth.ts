/**
 * ---
 * file: src/test-support/liveApiAuth.ts
 * project: earthandhoney
 * purpose: Shared auth bootstrap for the live-round-trip tests that boot a
 *          real `next dev` server against the live "db" Postgres service
 *          (us3-ac3.5, us6-ac6.3, and any future test in this family).
 *          Payload only ever honors one `first-register` call for the
 *          lifetime of a Postgres database/volume — every subsequent call
 *          fails once any user exists. All live-round-trip test files share
 *          that one Postgres container for the whole CI run, so per-file
 *          fixture credentials race: whichever file's live block executes
 *          first wins the one-time first-user slot, and every other file's
 *          fallback login (with a *different*, never-registered email) then
 *          401s. Centralizing on one fixture identity, shared by every
 *          caller, means whichever file wins first-register creates the
 *          exact user every other file's fallback login expects — the race
 *          no longer has a losing side.
 *          Deliberately placed outside src/__tests__: Jest's default
 *          testMatch treats every file under __tests__ as its own test
 *          suite, and a helper with no `it(...)` blocks would fail as
 *          "must contain at least one test".
 * created-by: dev-team
 * related-story: US-6
 * related-ac: 6.3
 * ---
 */

const LIVE_FIXTURE_EMAIL = 'live-api-fixture@earthandhoney.test'
const LIVE_FIXTURE_PASSWORD = 'Live-Api-Fixture-Password!23'

/**
 * Obtains a JWT for the shared live-test fixture user against a running
 * `next dev` server, registering it as Payload's first user if none exists
 * yet, or logging in with the same shared credentials otherwise.
 */
export async function getLiveApiAuthToken(base: string): Promise<string> {
  const registerRes = await fetch(`${base}/api/users/first-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LIVE_FIXTURE_EMAIL, password: LIVE_FIXTURE_PASSWORD }),
  })
  if (registerRes.status < 300) {
    const body = await registerRes.json()
    return body.token as string
  }

  // A user already exists (e.g. another live-round-trip test file won the
  // first-register race, or a prior run against the same Postgres volume) —
  // fall back to logging in with the same shared fixture credentials.
  const loginRes = await fetch(`${base}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LIVE_FIXTURE_EMAIL, password: LIVE_FIXTURE_PASSWORD }),
  })
  expect(loginRes.status).toBeLessThan(300)
  const body = await loginRes.json()
  return body.token as string
}
