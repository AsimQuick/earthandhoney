/**
 * ---
 * file: src/__tests__/us17-ac17.7-webhook-fired-and-received.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.7 — PIVOT_AUDIT.md records proof that at least one
 *          Backstage webhook (`event.created` / `event.published`, fired by
 *          upstream's own webhook delivery worker for an ordinary, non-draft
 *          Gallery create) is received by a listener (the pinned fork's own
 *          `vendor/picpeak/dev/webhook-receiver`) that logs the payload, and
 *          that the delivered/success state is visible through upstream's
 *          admin-facing webhook deliveries feed. Pins the exact evidence
 *          recorded in the audit, and independently re-verifies every
 *          file/line claim it makes against the pinned vendored fork and
 *          this project's own docker-compose.yml.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.7
 * ---
 */

// The proof itself was exercised live on 2026-08-02 against the running
// Backstage (`docker compose --profile backstage`, per BACKSTAGE_STARTUP.md)
// plus a newly-added `webhook-receiver` service: a webhook was registered
// through POST /api/admin/webhooks, two ordinary (non-draft) Galleries were
// created through POST /api/admin/events (the create-and-publish-in-one-shot
// path, not the synthetic /:id/test endpoint), and the resulting deliveries
// were read back through GET /api/admin/webhooks/:id/deliveries, direct
// Postgres reads, and the receiver's own /requests log — with the received
// HMAC-SHA256 signature independently recomputed and matched. That run needs
// a Docker daemon and a live Backstage plus webhook-receiver container, so
// it is not repeatable inside Jest — this suite pins the recorded evidence
// so it cannot silently rot out of the audit, and independently re-verifies
// every file/line claim the audit makes about the vendored fork and this
// project's own compose file.

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const doc = read('PIVOT_AUDIT.md')

// The AC-17.7 section only, bounded at the next top-level heading so a match
// cannot be satisfied by unrelated text elsewhere in this multi-story audit
// document, and so the AC-14.6 recommendation/open-questions block can stay
// the document's final section.
const sectionStart = doc.indexOf('## AC-17.7')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.7: a Backstage webhook fires and is received by a listener that logs the payload', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.7 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.7\b/)
    })

    it('has a dedicated AC-17.7 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('sits after the AC-17.6 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.6'))
    })
  })

  describe('no fork patch was needed — upstream\'s webhook system as delivered', () => {
    it('names the schema migration, service, worker, and admin routes with their mount points', () => {
      expect(section).toMatch(
        /vendor\/picpeak\/backend\/migrations\/core\/082_add_webhooks\.js/
      )
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/services\/webhookService\.js/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/services\/webhookDeliveryWorker\.js/)
      expect(section).toMatch(/vendor\/picpeak\/backend\/src\/routes\/adminWebhooks\.js/)
      expect(section).toMatch(/`\/api\/admin\/webhooks`\s*\n?by\s*\n?`server\.js:528`/)
      expect(section).toMatch(/`vendor\/picpeak\/backend\/server\.js:652-653`/)
    })

    it('those cited lines really do mount the routes and start the worker', () => {
      const server = read('vendor/picpeak/backend/server.js').split('\n')
      expect(server[527]).toContain("app.use('/api/admin/webhooks', require('./src/routes/adminWebhooks'))")
      expect(server[651]).toContain("const { startWebhookDeliveryWorker } = require('./src/services/webhookDeliveryWorker')")
      expect(server[652]).toContain('startWebhookDeliveryWorker()')
    })

    it('the migration really does create the webhooks and webhook_deliveries tables', () => {
      const migration = read('vendor/picpeak/backend/migrations/core/082_add_webhooks.js')
      expect(migration).toMatch(/hasTable\('webhooks'\)/)
      expect(migration).toMatch(/createTable\('webhooks'/)
      expect(migration).toMatch(/table\.jsonb\('events'\)\.notNullable\(\)\.defaultTo\('\[\]'\)/)
    })
  })

  describe('the listener the fork already ships, mirrored into this project\'s compose', () => {
    it('names the vendored dev receiver and cites the e2e spec that already expects it', () => {
      expect(section).toMatch(/vendor\/picpeak\/dev\/webhook-receiver\/server\.js/)
      expect(section).toMatch(
        /vendor\/picpeak\/tests\/e2e\/webhooks-roundtrip\.spec\.ts/
      )
      expect(section).toMatch(/webhook-receiver:8888/)
    })

    it('that receiver really is a tiny logging HTTP server, and the e2e spec really does target it', () => {
      const receiver = read('vendor/picpeak/dev/webhook-receiver/server.js')
      expect(receiver).toMatch(/const ring = \[\]/)
      expect(receiver).toMatch(/ring\.push\(entry\)/)
      expect(receiver).toMatch(/\[webhook-receiver\]/)

      const spec = read('vendor/picpeak/tests/e2e/webhooks-roundtrip.spec.ts')
      expect(spec).toMatch(/webhook-receiver:8888/)
    })

    it('names the webhook-receiver service added to docker-compose.yml, under the backstage profile', () => {
      expect(section).toMatch(/`webhook-receiver` service/)
      expect(section).toMatch(/WEBHOOK_RECEIVER_PORT:-7107/)
    })

    it('that service really exists in docker-compose.yml, building the vendored dev receiver', () => {
      const compose = read('docker-compose.yml')
      const idx = compose.indexOf('\n  webhook-receiver:')
      expect(idx).toBeGreaterThan(-1)
      const block = compose.slice(idx, idx + 300)
      expect(block).toMatch(/profiles:\s*\["backstage"\]/)
      expect(block).toMatch(/context:\s*\.\/vendor\/picpeak\/dev\/webhook-receiver/)
      expect(block).toMatch(/WEBHOOK_RECEIVER_PORT:-7107/)
      expect(block).toMatch(/:8888/)
    })

    it('cites the SSRF guard and explains why the bare service hostname passes it without an override', () => {
      expect(section).toMatch(
        /`vendor\/picpeak\/backend\/src\/utils\/networkValidation\.js:85-95`/
      )
      expect(section).toMatch(/WEBHOOK_ALLOW_PRIVATE_URLS/)
      expect(section).toMatch(/\.internal`\/`\.local`\/`\.localhost`/)
    })

    it('that cited validateExternalUrl really only blocks private IPs and .internal/.local/.localhost hostnames', () => {
      const lines = read('vendor/picpeak/backend/src/utils/networkValidation.js').split('\n')
      const fn = lines.slice(84, 95).join('\n')
      expect(fn).toContain('function validateExternalUrl(urlString)')
      expect(fn).toContain('isPrivateIP(parsed.hostname)')
      const isPrivate = read('vendor/picpeak/backend/src/utils/networkValidation.js')
      expect(isPrivate).toMatch(/endsWith\('\.internal'\) \|\| lower\.endsWith\('\.local'\) \|\| lower\.endsWith\('\.localhost'\)/)
      // The literal hostname this AC registers a webhook against does not
      // trip any of the blocked patterns.
      expect('webhook-receiver'.endsWith('.internal')).toBe(false)
      expect('webhook-receiver'.endsWith('.local')).toBe(false)
      expect('webhook-receiver'.endsWith('.localhost')).toBe(false)
    })
  })

  describe('an unrelated local-storage permission gap, recorded honestly for AC-17.9', () => {
    it('names it as a fourth occurrence of the defect family AC-17.5.1/17.5.2/17.5.3 already named, not a new one', () => {
      expect(section).toMatch(/AC-17\.5\.1\/17\.5\.2\/17\.5\.3 already named/)
      expect(section).toMatch(/a fourth occurrence, not a new one/)
    })

    it('cites the same adminEvents.js lines AC-17.5.1 traced the EACCES to', () => {
      expect(section).toMatch(/`adminEvents\.js:609-612`/)
      expect(section).toMatch(/EACCES: permission denied,\s*\n?mkdir '\/storage'/)
    })

    it('that cited block really does compute an unconditional local storage path ignoring STORAGE_BACKEND', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminEvents.js').split('\n')
      const block = lines.slice(608, 612).join('\n')
      expect(block).toContain(
        "const storagePath = process.env.STORAGE_PATH || path.join(__dirname, '../../../storage')"
      )
      expect(block).toContain("await fs.mkdir(path.join(eventPath, 'collages')")
    })

    it('records the one-time operational fix re-applied by hand, and states it does not persist across container recreation', () => {
      expect(section).toMatch(
        /mkdir -p \/storage && chown -R nodejs:nodejs \/storage/
      )
      expect(section).toMatch(/does not persist\s*\n?across a `backstage-backend` container recreation/)
      expect(section).toMatch(/No file under `vendor\/picpeak\/` was touched/)
    })
  })

  describe('the webhook subscription, registered through the admin route upstream provides', () => {
    it('cites the create route and its line range', () => {
      expect(section).toMatch(/`POST \/api\/admin\/webhooks`\s*\n?\(`adminWebhooks\.js:75-142`\)/)
    })

    it('that cited range really is the create-webhook route, returning the plaintext secret once', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminWebhooks.js').split('\n')
      expect(lines[74]).toContain('router.post(')
      const block = lines.slice(74, 142).join('\n')
      expect(block).toContain("requirePermission('settings.edit')")
      expect(block).toContain('generateSecret()')
      expect(block).toContain('Save this signing secret now')
    })

    it('records the created webhook id, url, subscribed events, and the one-time-shown secret', () => {
      expect(section).toMatch(/"id":15,"name":"AC-17\.7 verification listener"/)
      expect(section).toMatch(/"url":"http:\/\/webhook-receiver:8888\/"/)
      expect(section).toMatch(/"events":\["event\.created","event\.published"\]/)
      expect(section).toMatch(/"secret":"whsec_p8PKotTk0W0iJMFubi1xhb7XdV_jgNv_"/)
    })
  })

  describe('the event fired: a real Gallery create, not the synthetic test endpoint', () => {
    it('names the synthetic /:id/test route and explicitly states it was not used', () => {
      expect(section).toMatch(/`POST \/:id\/test` route\s*\n?\(`adminWebhooks\.js:236-281`\)/)
      expect(section).toMatch(/bypasses subscription matching entirely/)
      expect(section).toMatch(/was \*\*not\*\* used to satisfy this AC/)
    })

    it('that cited range really is the synthetic test-fire route, bypassing the webhooks table', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminWebhooks.js').split('\n')
      expect(lines[235]).toContain('router.post(')
      expect(lines[236]).toContain("'/:id/test'")
      const block = lines.slice(235, 281).join('\n')
      expect(block).toContain('WITHOUT writing to webhooks table')
    })

    it('cites the create-and-publish-in-one-shot webhook fire sites in adminEvents.js', () => {
      expect(section).toMatch(/`adminEvents\.js:761-784`/)
      expect(section).toMatch(/`adminEvents\.js:823-830`/)
      expect(section).toMatch(/create-and-publish in\s*\n?one shot/)
    })

    it('those cited ranges really do fire event.created unconditionally and event.published when !isDraft', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminEvents.js').split('\n')
      const createdBlock = lines.slice(760, 784).join('\n')
      expect(createdBlock).toContain("await webhookService.fire('event.created'")
      const publishedBlock = lines.slice(822, 830).join('\n')
      expect(publishedBlock).toContain('if (!isDraft)')
      expect(publishedBlock).toContain("await webhookService.fire('event.published'")
    })

    it('cites webhookService.fire() and the delivery worker poll interval', () => {
      expect(section).toMatch(/`webhookService\.js:148-205`/)
      expect(section).toMatch(/`webhookDeliveryWorker\.js:7`/)
      expect(section).toMatch(/default 5000ms/)
    })

    it('records the created gallery (id=10, is_draft:false)', () => {
      expect(section).toMatch(
        /"id":10,"slug":"wedding-ac-17-7-webhook-verification-gallery-2026-09-15"/
      )
      expect(section).toMatch(/"is_draft":false/)
    })
  })

  describe('delivered, success, visible through the admin deliveries feed', () => {
    it('cites the deliveries-list and webhook-detail routes', () => {
      expect(section).toMatch(/`GET \/:id\/deliveries`\s*\n?\(`adminWebhooks\.js:284-327`\)/)
      expect(section).toMatch(/`GET \/:id`\s*\n?\(`adminWebhooks\.js:145-154`\)/)
    })

    it('those cited ranges really are the deliveries-list and detail routes', () => {
      const lines = read('vendor/picpeak/backend/src/routes/adminWebhooks.js').split('\n')
      expect(lines[283]).toContain("router.get(")
      expect(lines.slice(283, 290).join('\n')).toContain("'/:id/deliveries'")
      expect(lines[144]).toContain("router.get('/:id'")
    })

    it('records both deliveries as status=success with response_status 200', () => {
      expect(section).toMatch(/"event_type":"event\.published","attempt_count":1,"status":"success"/)
      expect(section).toMatch(/"event_type":"event\.created","attempt_count":1,"status":"success"/)
      expect(section).toMatch(/"response_status":200,"latency_ms":23/)
      expect(section).toMatch(/"response_status":200,"latency_ms":22/)
    })

    it('records the direct Postgres cross-check of both delivery rows', () => {
      expect(section).toMatch(
        /15 \|\s*15 \| event\.created\s*\| success \|\s*1 \|\s*200 \| 2026-08-02 00:30:32\.703\+00/
      )
      expect(section).toMatch(
        /16 \|\s*15 \| event\.published \| success \|\s*1 \|\s*200 \| 2026-08-02 00:30:32\.709\+00/
      )
    })
  })

  describe('independently confirmed captured by the listener, with a verified signature', () => {
    it('records the receiver /requests log showing both entries, headers and body', () => {
      expect(section).toMatch(/http:\/\/localhost:7107\/requests/)
      expect(section).toMatch(/"x-picpeak-event":"event\.created"/)
      expect(section).toMatch(/"x-picpeak-event":"event\.published"/)
      expect(section).toMatch(/"id":10/)
    })

    it('cites the signature header constant and the signing primitive, and records the matching recomputed signature', () => {
      expect(section).toMatch(/`webhookDeliveryWorker\.js:15,123,132`/)
      expect(section).toMatch(/`webhookService\.signPayload`.*\n?exports\s*\n?\(`webhookService\.js:35-37`\)/)
      expect(section).toMatch(
        /4c79a2c17f2b458fa7c2f38d11dde66179be14bd924d57f34321962fe219f557/
      )
    })

    it('that cited signature really was computed with the recorded secret over the recorded event.created body', () => {
      const secret = 'whsec_p8PKotTk0W0iJMFubi1xhb7XdV_jgNv_'
      const body =
        '{"id":"0311ca02-198f-44d0-848c-bd22eb1d5a3b","data":{"event":{"id":10,' +
        '"slug":"wedding-ac-17-7-webhook-verification-gallery-2026-09-15",' +
        '"is_draft":false,' +
        '"share_url":"/gallery/wedding-ac-17-7-webhook-verification-gallery-2026-09-15/f5359fc7776c478d39cc4ede7c42cbd9",' +
        '"event_date":"2026-09-15",' +
        '"event_name":"AC-17.7 Webhook Verification Gallery",' +
        '"event_type":"wedding",' +
        '"share_token":"f5359fc7776c478d39cc4ede7c42cbd9",' +
        '"customer_name":"AC-17.7 Verification",' +
        '"customer_email":"ac17-7-webhook@example.com",' +
        '"customer_phone":null}},' +
        '"type":"event.created","created_at":"2026-08-02T00:30:32.703Z"}'
      const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
      expect(expected).toBe(
        '4c79a2c17f2b458fa7c2f38d11dde66179be14bd924d57f34321962fe219f557'
      )
    })

    it('those cited lines really are the signature header constant and the HMAC-SHA256 signing function', () => {
      const worker = read('vendor/picpeak/backend/src/services/webhookDeliveryWorker.js').split('\n')
      expect(worker[14]).toContain("const SIGNATURE_HEADER = 'X-PicPeak-Signature'")
      expect(worker[122]).toContain('const signature = signPayload(webhook.secret, rawBody)')
      expect(worker[131]).toContain('[SIGNATURE_HEADER]: signature')

      const service = read('vendor/picpeak/backend/src/services/webhookService.js').split('\n')
      expect(service[34]).toContain('function signPayload(secret, rawBody)')
      expect(service[35]).toContain("crypto.createHmac('sha256', secret).update(rawBody).digest('hex')")
    })
  })

  describe('the run is shown to reproduce, not to be a one-off', () => {
    it('records a second, independently-created gallery (id=11) and a fourth delivery pair', () => {
      expect(section).toMatch(
        /"id":11,"slug":"wedding-ac-17-7-webhook-verification-gallery-two-2026-09-16"/
      )
      expect(section).toMatch(
        /17 \|\s*15 \| event\.created\s*\| success \|\s*200 \| 2026-08-02 00:30:58\.64\+00/
      )
      expect(section).toMatch(
        /18 \|\s*15 \| event\.published \| success \|\s*200 \| 2026-08-02 00:30:58\.646\+00/
      )
      // psql's own row-count footer, kept so the block stays a verbatim
      // paste rather than a hand-retyped table.
      expect(section).toMatch(/\n\(4 rows\)\n/)
    })

    it('preserves psql\'s own rendering rather than a tidied-up retype', () => {
      // psql trims trailing zeros in timestamps: the row-17 value really is
      // rendered `00:30:58.64+00`, not `00:30:58.640+00`. Pinning this stops
      // the transcript being "cleaned up" into something psql never printed.
      expect(section).toMatch(/00:30:58\.64\+00/)
      expect(section).not.toMatch(/00:30:58\.640\+00/)
      expect(section).toMatch(
        /Both transcripts in this section were re-checked against live\s*\nPostgres before commit/
      )
    })

    it('records the receiver ending with four total logged requests across both galleries', () => {
      expect(section).toMatch(/\n4\nevent\.created 10\nevent\.published 10\nevent\.created 11\nevent\.published 11\n/)
    })

    it('states the second run is a fresh, independent firing, not a re-read of the first', () => {
      expect(section).toMatch(
        /the second run is a\s*\n?fresh, independent firing, not a re-read of the first/
      )
    })
  })

  it('closes the AC with an explicit verdict naming the events, the listener, the signature check, and both visible states', () => {
    expect(section).toMatch(/AC-17\.7 is satisfied/)
    expect(section).toMatch(/event\.created[\s\S]{0,80}event\.published/)
    expect(section).toMatch(/not the synthetic `\/:id\/test` endpoint/)
    expect(section).toMatch(/matched byte for byte/)
    expect(section).toMatch(/No vendored file was\s*\n?modified/)
    expect(section).toMatch(/a fourth\s*\n?occurrence rather than a new defect/)
  })
})
