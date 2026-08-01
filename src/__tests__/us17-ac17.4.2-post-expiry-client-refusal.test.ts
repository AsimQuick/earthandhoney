/**
 * ---
 * file: src/__tests__/us17-ac17.4.2-post-expiry-client-refusal.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.2 — PIVOT_AUDIT.md records the AC-17.1.3.1
 *          Gallery brought past its expiry through the interface upstream
 *          actually provides (the `PUT /api/admin/events/:id` endpoint for
 *          setting `expires_at` into the past, plus the real hourly
 *          `expirationChecker` sweep for enforcement), the exact
 *          AC-17.4.1.2 client-facing request re-run and now refused with
 *          its status code and body, whether a pre-expiry session/token is
 *          still honoured (it is not), and the real enforcement-lag gap
 *          this AC found between the two. Pins the recorded evidence and
 *          independently re-verifies every file/line claim it makes
 *          against the pinned vendored fork.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.2
 * ---
 */

// The proof itself was exercised live on 2026-08-01 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md`):
// `PUT /api/admin/events/3` set `expires_at` into the past as the seeded
// administrator, the real hourly `expirationChecker` cron swept it at the
// next natural tick, and `GET /api/gallery/:slug/photos` was re-run both
// without a token and with a genuine pre-expiry gallery token. That run
// needs a Docker daemon and a live Backstage, so it is not repeatable
// inside Jest — this suite pins the recorded evidence so it cannot
// silently rot out of the audit, and independently re-verifies every
// file/line claim the audit makes about the vendored fork.

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.4.2 section only, bounded at the next top-level heading so a
// match cannot be satisfied by unrelated text elsewhere in this multi-story
// audit document, and so the AC-14.6 recommendation/open-questions block can
// stay the document's final section.
const sectionStart = doc.indexOf('## AC-17.4.2')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.4.2: the Gallery is brought past its expiry, and the client-facing request is refused', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.2 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.2\b/)
    })

    it('has a dedicated AC-17.4.2 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.4.1.3 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.3'))
    })

    it('names the AC-17.1.3.1 Gallery by id and slug, not a new Gallery', () => {
      expect(section).toMatch(/events\.id = 3/)
      expect(section).toMatch(/wedding-ac-17-1-3-1-verification-gallery-2026-09-01/)
    })

    it('states no vendored file was modified and no fork patch closes any gap', () => {
      expect(section).toMatch(/No source file under `vendor\/picpeak\/` was modified/)
      expect(section).toMatch(/no fork patch\s*\ncloses any gap this AC finds/)
    })
  })

  describe('(1) the endpoint: PUT /api/admin/events/:id accepts a past-dated expires_at', () => {
    it('cites the route and its expires_at validator', () => {
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/routes\/adminEvents\.js:1129,1142/)
      expect(section).toMatch(
        /body\('expires_at'\)\.optional\(\{ nullable: true, checkFalsy: true \}\)\.isISO8601\(\)/
      )
    })

    it('those cited lines really are the PUT route and the expires_at validator, with no future-date check', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminEvents.js').split('\n')
      expect(lines[1128]).toContain("router.put('/:id'")
      expect(lines[1128]).toContain('adminAuth')
      expect(lines[1128]).toContain("requirePermission('events.edit')")
      expect(lines[1141]).toContain("body('expires_at')")
      expect(lines[1141]).toContain('isISO8601()')
      // No future-date / isAfter constraint anywhere in the validator chain.
      const validatorBlock = lines.slice(1128, 1229).join('\n')
      expect(validatorBlock).not.toMatch(/isAfter/)
    })

    it('states the write was made through the endpoint, not a direct database write, evidenced by activity_logs', () => {
      expect(section).toMatch(/no direct database write was needed for this part, and none\s*\nwas made/)
      expect(section).toMatch(/activity_logs/)
      expect(section).toMatch(/28 \| event_updated {3}\| admin {6}\| admin {6}\| \{"changes":\["expires_at"\]/)
      expect(section).toMatch(/2026-08-01 14:19:55\.118138\+00/)
    })

    it('records the live re-issued PUT and its 200 response', () => {
      expect(section).toMatch(
        /curl -s -i -b <seeded-admin-cookie-jar> -X PUT http:\/\/localhost:3100\/api\/admin\/events\/3/
      )
      expect(section).toMatch(/"expires_at":"2020-01-01T00:00:00\.000Z"/)
      expect(section).toMatch(/HTTP\/1\.1 200 OK/)
      expect(section).toMatch(/\{"message":"Event updated successfully"\}/)
    })
  })

  describe('(2) the scheduled expiration process actually enforces it, on its own real schedule', () => {
    it('cites the cron registration and states it was not manually invoked', () => {
      expect(section).toMatch(/expirationChecker\.js:11/)
      expect(section).toMatch(
        /Nothing in this AC forced that sweep to run early/
      )
    })

    it('that cited line really is the cron.schedule registration', () => {
      const lines = read('vendor/picpeak/backend/src/services/expirationChecker.js').split('\n')
      expect(lines[10]).toContain("cron.schedule('0 * * * *'")
    })

    it('cites is_active:false and archiveEvent as the sweep\'s effect, already established under AC-17.4.1.1.2', () => {
      expect(section).toMatch(/expirationChecker\.js:97/)
      expect(section).toMatch(/expirationChecker\.js:156/)
    })

    it('those cited lines really set is_active false and call archiveEvent', () => {
      const lines = read('vendor/picpeak/backend/src/services/expirationChecker.js').split('\n')
      expect(lines[96]).toContain('is_active: formatBoolean(false)')
      expect(lines[155]).toContain('await archiveEvent(event)')
    })

    it('records the post-sweep row: is_active false, archived, archived_at seconds after the hour', () => {
      expect(section).toMatch(/is_active {3}\| f/)
      expect(section).toMatch(/is_archived \| t/)
      expect(section).toMatch(/archived_at \| 2026-08-01 15:00:02\.287\+00/)
    })

    it('states the timing relationship between the expires_at write and the sweep', () => {
      expect(section).toMatch(
        /2\.287\s*\nseconds past the top of the hour, exactly matching `checkExpirations\(\)`/
      )
    })
  })

  describe('the exact AC-17.4.1.2 request, re-run cold, and refused', () => {
    it('records the exact request re-issued with no token', () => {
      expect(section).toMatch(
        /curl -s -i http:\/\/localhost:3100\/api\/gallery\/wedding-ac-17-1-3-1-verification-gallery-2026-09-01\/photos/
      )
    })

    it('records the refusal: 404, not 401, with the exact body', () => {
      expect(section).toMatch(/HTTP\/1\.1 404 Not Found/)
      expect(section).toMatch(/\{"error":"Gallery not found or expired"\}/)
      expect(section).toMatch(/`404`, not `401`/)
    })

    it('cites the no-token branch and its is_active filter and 404 return', () => {
      expect(section).toMatch(/middleware\/gallery\.js:26-47/)
      expect(section).toMatch(/middleware\/gallery\.js:34-38/)
      expect(section).toMatch(/middleware\/gallery\.js:45-47/)
    })

    it('those cited ranges really are the no-token branch, its is_active filter, and its 404 return', () => {
      const lines = read('vendor/picpeak/backend/src/middleware/gallery.js').split('\n')
      expect(lines[25]).toContain('if (!token)')
      expect(lines[27]).toContain("res.status(401).json({ error: 'No token provided' })")
      expect(lines[32]).toContain("db('events')")
      expect(lines[35]).toContain('is_active: formatBoolean(true)')
      expect(lines[44]).toContain('if (!event)')
      expect(lines[45]).toContain("res.status(404).json({ error: 'Gallery not found or expired' })")
    })
  })

  describe('whether a pre-expiry client session/token is still accepted afterwards', () => {
    it('records the pre-expiry token was minted 7 seconds before the expires_at write, with a still-valid JWT exp', () => {
      expect(section).toMatch(/14:19:48` UTC/)
      expect(section).toMatch(/7 seconds before the `expires_at` write/)
      expect(section).toMatch(/2026-08-02 14:19:48 UTC/)
      expect(section).toMatch(/"eventId": 3/)
      expect(section).toMatch(/"iat": 1785593988, "exp": 1785680388/)
    })

    it('records the same request re-run with that pre-expiry token, also refused', () => {
      expect(section).toMatch(
        /curl -s -i -b <pre-expiry-gallery-cookie-jar> http:\/\/localhost:3100\/api\/gallery\/wedding-ac-17-1-3-1-verification-gallery-2026-09-01\/photos/
      )
      expect(section).toMatch(/Refused, identically to the no-token case/)
      expect(section).toMatch(/\*\*No gap here\*\*/)
    })

    it('cites the with-token branch\'s unconditional is_active filter as the reason no gap exists', () => {
      expect(section).toMatch(/middleware\/gallery\.js:85-96/)
      expect(section).toMatch(/middleware\/gallery\.js:99,119-121/)
    })

    it('those cited ranges really are the with-token query (is_active filter) and its downstream checks', () => {
      const lines = read('vendor/picpeak/backend/src/middleware/gallery.js').split('\n')
      expect(lines[84]).toContain('event = await withRetry')
      const withTokenBlock = lines.slice(84, 96).join('\n')
      expect(withTokenBlock).toContain('is_active: formatBoolean(true)')
      expect(lines[98]).toContain('event.id !== decoded.eventId')
      expect(lines[118]).toContain('if (!event)')
      expect(lines[120]).toContain("res.status(404).json({ error: 'Gallery not found or expired' })")
    })
  })

  describe('the real gap this AC finds: enforcement lag between the endpoint and the scheduled process', () => {
    it('states the roughly 40-minute lag between the expires_at write and enforcement', () => {
      expect(section).toMatch(/roughly \*\*40 minutes\*\*/)
      expect(section).toMatch(/14:19:55\.118138\+00/)
      expect(section).toMatch(/15:00:02\.287\+00/)
    })

    it('is explicit that the 40-minute window itself was not separately observed live, only derived from code + timestamps', () => {
      expect(section).toMatch(
        /This AC did not\s*\ncapture a live client request during that specific 40-minute window/
      )
      expect(section).toMatch(/follows deterministically from code this audit has already read and\s*\ncited/)
    })

    it('ties the finding back to AC-17.4.1.1.3\'s code-only differences #1 and #3', () => {
      expect(section).toMatch(/AC-17\.4\.1\.1\.3 already recorded as "difference #1" and\s*\n"#3"/)
    })

    it('states the worst case approaches a full hour', () => {
      expect(section).toMatch(/this lag approaches a full hour/)
    })

    it('raises the gap for scrum-master\/po-requests.md per AC-17.9, not a fork patch', () => {
      expect(section).toMatch(/is raised to the Product Owner/)
      expect(section).toMatch(/scrum-master\/po-requests\.md/)
      expect(section).toMatch(/per AC-17\.9/)
    })
  })

  it('closes the AC with an explicit verdict naming the interface, the refusal, the no-gap finding, and the raised gap', () => {
    expect(section).toMatch(/AC-17\.4\.2 is satisfied/)
    expect(section).toMatch(/PUT\s*\n\/api\/admin\/events\/:id` endpoint/)
    expect(section).toMatch(/404 \{"error":"Gallery not found or expired"\}/)
    expect(section).toMatch(/no session\/token gap/)
    expect(section).toMatch(/rather than closed with a fork\s*\npatch/)
  })
})
