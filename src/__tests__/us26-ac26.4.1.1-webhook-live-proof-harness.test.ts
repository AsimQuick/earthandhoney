/**
 * ---
 * file: src/__tests__/us26-ac26.4.1.1-webhook-live-proof-harness.test.ts
 * project: earthandhoney
 * purpose: Verify AC-26.4.1.1 — the live-proof harness's connective tissue.
 *          The proof itself is a live run against the running stack,
 *          recorded in WEBHOOK_LIVE_PROOF.md; what this suite pins is
 *          everything that has to stay true for that recorded proof to keep
 *          meaning what it says:
 *          (1) WEBHOOK_LIVE_PROOF.md exists and opens with sections (a)-(c)
 *              plus the closing no-gallery/no-publish signature check, each
 *              carrying the specific facts the criterion requires (the
 *              receiver URL, all three handled event types, the
 *              PICPEAK_WEBHOOK_SECRET reconciliation rule, and both the 401
 *              and 200 responses);
 *          (2) scripts/webhook-live-proof-setup.sh — the harness the
 *              document's (a)-(c) output was captured from — targets the
 *              same receiver URL and event catalog the doc claims, and is
 *              idempotent by construction: it looks the subscription up by
 *              URL before ever considering a create, so re-running it can
 *              never silently rotate the secret the receiver was reconciled
 *              against; and
 *          (3) the event catalog named in both the script and the document
 *              matches PICPEAK_WEBHOOK_HANDLED_EVENT_TYPES, the actual
 *              source of truth the AC-26.1 receiver acts on — a drifted
 *              catalog would leave a harness that no longer proves what the
 *              receiver does.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.4.1.1
 * ---
 */
import fs from 'fs'
import path from 'path'

import { PICPEAK_WEBHOOK_HANDLED_EVENT_TYPES } from '@/lib/picpeakWebhookEvent'

const REPO_ROOT = path.join(__dirname, '..', '..')
const DOC_PATH = path.join(REPO_ROOT, 'WEBHOOK_LIVE_PROOF.md')
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'webhook-live-proof-setup.sh')
const RECEIVER_URL = 'http://web:3000/api/webhooks/picpeak'

function readDoc(): string {
  return fs.readFileSync(DOC_PATH, 'utf8')
}

function readScript(): string {
  return fs.readFileSync(SCRIPT_PATH, 'utf8')
}

describe('AC-26.4.1.1: WEBHOOK_LIVE_PROOF.md records the harness in sprint-3 evidence style', () => {
  it('exists at the repository root', () => {
    expect(fs.existsSync(DOC_PATH)).toBe(true)
  })

  it('opens with sections (a), (b), and (c) in order', () => {
    const doc = readDoc()
    const aIndex = doc.indexOf('## (a)')
    const bIndex = doc.indexOf('## (b)')
    const cIndex = doc.indexOf('## (c)')
    expect(aIndex).toBeGreaterThan(-1)
    expect(bIndex).toBeGreaterThan(aIndex)
    expect(cIndex).toBeGreaterThan(bIndex)
  })

  it('section (a) shows the compose ps command and the Frontstage network aliases', () => {
    const doc = readDoc()
    expect(doc).toContain('docker compose --profile webprod --profile backstage ps')
    expect(doc).toContain('docker inspect earthandhoney-web-prod-1')
    expect(doc).toMatch(/earthandhoney_default -> \[.*\bweb\b.*\]/)
  })

  it('section (b) registers the subscription at the Compose-hostname receiver URL with all three handled events', () => {
    const doc = readDoc()
    const bSection = doc.slice(doc.indexOf('## (b)'), doc.indexOf('## (c)'))
    expect(bSection).toContain('POST /api/admin/webhooks')
    expect(bSection).toContain(RECEIVER_URL)
    for (const eventType of PICPEAK_WEBHOOK_HANDLED_EVENT_TYPES) {
      expect(bSection).toContain(eventType)
    }
  })

  it('section (c) records the PICPEAK_WEBHOOK_SECRET reconciliation rule and the re-registration hazard', () => {
    const doc = readDoc()
    const cSection = doc.slice(
      doc.indexOf('## (c)'),
      doc.indexOf('## Closing live check'),
    )
    expect(cSection).toContain('PICPEAK_WEBHOOK_SECRET')
    expect(cSection).toMatch(/secret_preview/)
    expect(cSection).toMatch(/never\s+blindly\s+re-run|never blindly re-create/i)
    expect(cSection).toMatch(/rotat/i)
  })

  it('the closing check needs no gallery and no publish, and records both the 401 and the 200', () => {
    const doc = readDoc()
    const closing = doc.slice(doc.indexOf('## Closing live check'))
    expect(closing).toContain('backstage-backend')
    expect(closing).toContain(RECEIVER_URL)
    expect(closing).toContain('X-PicPeak-Signature')
    expect(closing).toMatch(/401 Unauthorized/)
    expect(closing).toMatch(/200 OK/)
    expect(closing).toContain('{"received":true}')
  })
})

describe('AC-26.4.1.1: scripts/webhook-live-proof-setup.sh matches the receiver it targets', () => {
  it('exists and is executable', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true)
    const mode = fs.statSync(SCRIPT_PATH).mode
    // eslint-disable-next-line no-bitwise
    expect(mode & 0o111).not.toBe(0)
  })

  it('targets the AC-26.1 receiver by Compose service hostname, not localhost', () => {
    const script = readScript()
    expect(script).toContain(`RECEIVER_URL="${RECEIVER_URL}"`)
  })

  it('registers exactly the handled event catalog PICPEAK_WEBHOOK_HANDLED_EVENT_TYPES names', () => {
    const script = readScript()
    // The array sits inside a shell-quoted JSON string, so its quotes are
    // backslash-escaped (`\"events\":[\"event.published\",...]`).
    const eventsLine = script.match(/events\\?":\[([^\]]*)\]/)
    expect(eventsLine).not.toBeNull()
    const registered = eventsLine![1]
      .split(',')
      .map((entry) => entry.replace(/\\?"/g, '').trim())
    expect(new Set(registered)).toEqual(new Set(PICPEAK_WEBHOOK_HANDLED_EVENT_TYPES))
  })

  it('looks the subscription up by URL before ever considering a create, so a re-run cannot silently rotate the secret', () => {
    const script = readScript()
    const existingCheckIndex = script.indexOf("s.get('url') == '${RECEIVER_URL}'")
    const createCallIndex = script.indexOf('POST "${BACKSTAGE}/api/admin/webhooks"')
    expect(existingCheckIndex).toBeGreaterThan(-1)
    expect(createCallIndex).toBeGreaterThan(existingCheckIndex)
  })

  it('never re-creates a subscription it already found — the create call sits behind the not-found branch', () => {
    const script = readScript()
    expect(script).toMatch(/if \[ -n "\$EXISTING" \]; then[\s\S]*else[\s\S]*curl[\s\S]*-X POST "\$\{BACKSTAGE\}\/api\/admin\/webhooks"/)
  })
})
