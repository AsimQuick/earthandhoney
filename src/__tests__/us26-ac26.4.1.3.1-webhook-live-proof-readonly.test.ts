/**
 * ---
 * file: src/__tests__/us26-ac26.4.1.3.1-webhook-live-proof-readonly.test.ts
 * project: earthandhoney
 * purpose: Verify AC-26.4.1.3.1 — the read-only observation machinery
 *          scripts/ac26.4.1-live-proof.sh depends on, proven against the
 *          running stack before the one-way publish it precedes. The proof
 *          itself is a live run, recorded as section (e)/(e)(i) of
 *          WEBHOOK_LIVE_PROOF.md; what this suite pins is everything that
 *          has to stay true for that recorded proof to keep meaning what it
 *          says:
 *          (1) section (e) follows section (d) and records a pre-run
 *              fixture-reset finding through the supported DELETE route,
 *              the same discipline section (d) itself established;
 *          (2) (e)(i) exercises every read-only function the publish script
 *              depends on — subscription_id, event_id_for_slug, page_state,
 *              delivery_line — by name, against both proof slugs;
 *          (3) both proof galleries are shown still is_draft: true and no
 *              `/publish` call appears anywhere in the section — this
 *              criterion publishes nothing;
 *          (4) the served proof page is shown returning `unavailable` for
 *              both slugs through the page_state extraction, together with
 *              the response's x-nextjs cache headers; and
 *          (5) the delivery read-back path is exercised end to end: the
 *              deliveries list (fixed columns, no payload) and at least one
 *              deliveries/:id detail read-back that does carry a `payload`
 *              a gallery slug can be matched inside; and
 *          (6) the fixture-reset recovery procedure is named for the two
 *              criteria after this one to reuse if a publish run fails
 *              partway.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.4.1.3.1
 * ---
 */
import fs from 'fs'
import path from 'path'

import { WEBHOOK_LIVE_PROOF_GALLERY_PATH, WEBHOOK_LIVE_PROOF_GALLERY_SLUGS } from '@/lib/galleryRevalidation'

const REPO_ROOT = path.join(__dirname, '..', '..')
const DOC_PATH = path.join(REPO_ROOT, 'WEBHOOK_LIVE_PROOF.md')
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'ac26.4.1-live-proof.sh')

function readDoc(): string {
  return fs.readFileSync(DOC_PATH, 'utf8')
}

/** The `## (e)` section of WEBHOOK_LIVE_PROOF.md, to end of file. */
function sectionE(): string {
  const doc = readDoc()
  const start = doc.indexOf('## (e)')
  expect(start).toBeGreaterThan(-1)
  return doc.slice(start)
}

/** The `### (e)(i)` subsection, up to the closing "Recovery" subsection. */
function sectionEI(): string {
  const doc = readDoc()
  const start = doc.indexOf('### (e)(i)')
  const end = doc.indexOf('### Recovery:')
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return doc.slice(start, end)
}

describe('AC-26.4.1.3.1: WEBHOOK_LIVE_PROOF.md records the read-only observation machinery as section (e)/(e)(i)', () => {
  it('section (e) follows section (d)', () => {
    const doc = readDoc()
    const dIndex = doc.indexOf('## (d)')
    const eIndex = doc.indexOf('## (e)')
    expect(dIndex).toBeGreaterThan(-1)
    expect(eIndex).toBeGreaterThan(dIndex)
  })

  it('records a pre-run fixture-reset finding through the supported DELETE route before (e)(i)', () => {
    const doc = readDoc()
    const eIndex = doc.indexOf('## (e)')
    const eiIndex = doc.indexOf('### (e)(i)')
    expect(eiIndex).toBeGreaterThan(eIndex)
    const preRun = doc.slice(eIndex, eiIndex)
    expect(preRun).toMatch(/Pre-run finding/)
    expect(preRun).toContain('DELETE')
    expect(preRun).toContain('/api/admin/events/')
    expect(preRun).toMatch(/is_draft=\s*False/)
    expect(preRun).toContain('webhook-live-proof-setup.sh')
  })

  it('(e)(i) exercises every read-only function scripts/ac26.4.1-live-proof.sh depends on, by name', () => {
    const section = sectionEI()
    expect(section).toContain('subscription_id()')
    expect(section).toContain('event_id_for_slug()')
    expect(section).toContain('page_state()')
    expect(section).toContain('delivery_line()')
  })

  it('resolves the subscription id from the receiver URL', () => {
    const section = sectionEI()
    expect(section).toContain('http://web:3000/api/webhooks/picpeak')
    expect(section).toMatch(/subscription_id\(\)[\s\S]*http:\/\/web:3000\/api\/webhooks\/picpeak/)
  })

  it('shows both proof gallery slugs resolved to numeric ids with is_draft still true', () => {
    const section = sectionEI()
    expect(WEBHOOK_LIVE_PROOF_GALLERY_SLUGS).toHaveLength(2)
    for (const slug of WEBHOOK_LIVE_PROOF_GALLERY_SLUGS) {
      expect(section).toContain(slug)
    }
    const draftTrueMatches = section.match(/is_draft=\s*True/g)
    expect(draftTrueMatches?.length).toBeGreaterThanOrEqual(2)
  })

  it('shows the served proof page returning unavailable for both slugs, with x-nextjs cache headers recorded', () => {
    const section = sectionEI()
    expect(section).toContain(WEBHOOK_LIVE_PROOF_GALLERY_PATH)
    expect(section).toMatch(/x-nextjs-cache:\s*HIT/)
    expect(section).toMatch(/x-nextjs-stale-time:\s*300/)
    const unavailableMatches = section.match(/^unavailable$/gm)
    expect(unavailableMatches?.length).toBeGreaterThanOrEqual(2)
  })

  it('exercises the delivery read-back path end to end: list (no payload column), then a detail read carrying payload', () => {
    const section = sectionEI()
    expect(section).toMatch(/GET \/api\/admin\/webhooks\/:id\/deliveries\b/)
    expect(section).toContain('/deliveries?limit=50')
    expect(section).toContain('/deliveries/51')
    expect(section).toContain('/deliveries/52')
    expect(section).toMatch(/none carrying a "payload" key/)
    expect(section).toContain('"payload"')
    for (const slug of WEBHOOK_LIVE_PROOF_GALLERY_SLUGS) {
      expect(section).toMatch(new RegExp(`"slug": "${slug}"`))
    }
  })

  it('publishes nothing — no /publish call appears anywhere in section (e)', () => {
    const section = sectionE()
    expect(section).not.toContain('events/18/publish')
    expect(section).not.toContain('events/19/publish')
    expect(section).not.toMatch(/events\/\d+\/publish/)
  })

  it('records the fixture-reset recovery procedure, named for AC-26.4.1.3 and AC-26.4.2', () => {
    const doc = readDoc()
    const recoveryIndex = doc.indexOf('### Recovery:')
    expect(recoveryIndex).toBeGreaterThan(-1)
    const recovery = doc.slice(recoveryIndex)
    expect(recovery).toContain('DELETE /api/admin/events/:id')
    expect(recovery).toContain('webhook-live-proof-setup.sh')
    expect(recovery).toMatch(/AC-26\.4\.1\.3/)
    expect(recovery).toMatch(/AC-26\.4\.2/)
  })
})

describe('AC-26.4.1.3.1: scripts/ac26.4.1-live-proof.sh still exposes the functions the live run exercised', () => {
  function readScript(): string {
    return fs.readFileSync(SCRIPT_PATH, 'utf8')
  }

  it('exists and is executable', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true)
    const mode = fs.statSync(SCRIPT_PATH).mode
    expect(mode & 0o111).not.toBe(0)
  })

  it('defines subscription_id, event_id_for_slug, page_state, and delivery_line as read-only functions', () => {
    const script = readScript()
    expect(script).toMatch(/^subscription_id\(\)\s*\{/m)
    expect(script).toMatch(/^event_id_for_slug\(\)\s*\{/m)
    expect(script).toMatch(/^page_state\(\)\s*\{/m)
    expect(script).toMatch(/^delivery_line\(\)\s*\{/m)
  })

  it('delivery_line matches by gallery slug found inside the payload, not by numeric id — robust to a fixture reset', () => {
    const script = readScript()
    const deliveryLineBody = script.slice(
      script.indexOf('delivery_line() {'),
      script.indexOf('await_delivery_success() {'),
    )
    expect(deliveryLineBody).toContain("'${slug}' in json.dumps(r.get('payload')")
  })
})
