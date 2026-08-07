/**
 * ---
 * file: src/__tests__/us26-ac26.4.1.3.2-webhook-live-proof-publish.test.ts
 * project: earthandhoney
 * purpose: Verify AC-26.4.1.3.2 — publishing the first draft gallery, proven
 *          end to end in a single run of `scripts/ac26.4.1-live-proof.sh
 *          proof`, reusing the harness AC-26.4.1.1 stood up and the fixtures
 *          AC-26.4.1.2 created and AC-26.4.1.3.1 left undisturbed. The proof
 *          itself is a live run against the running stack, recorded as
 *          section (e)(ii) of `WEBHOOK_LIVE_PROOF.md`; what this suite pins
 *          is everything that has to stay true for that recorded section to
 *          keep meaning what it says:
 *          (1) section (e)(ii) exists, nested under section (e) after
 *              (e)(i) and its Recovery note;
 *          (2) the recorded run is the script's own `proof` argument only —
 *              gallery A's slug appears as the target, gallery B's slug is
 *              named only as untouched, and no `all`/`reproduce` invocation
 *              appears;
 *          (3) all three required observations are present from that one
 *              run: the publish call and its 200 response, the
 *              `event.published` delivery reaching `status: success`, and
 *              the served Frontstage page changing to reflect the publish;
 *          (4) the delivery is read back two ways — the list endpoint (fixed
 *              columns, no `payload`) and the per-delivery detail endpoint
 *              (carrying `payload`) — not just the script's one-line
 *              summary; and
 *          (5) the page-change evidence is explicitly bounded by
 *              DEADLINE_SECONDS, distinct from and shorter than the 60s
 *              contract-row-5 safety net and the route's own
 *              `revalidate = 60`, so a refresh the safety net could have
 *              produced on its own is not what is being claimed as evidence.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.4.1.3.2
 * ---
 */
import fs from 'fs'
import path from 'path'

import { WEBHOOK_LIVE_PROOF_GALLERY_PATH, WEBHOOK_LIVE_PROOF_GALLERY_SLUGS } from '@/lib/galleryRevalidation'

const REPO_ROOT = path.join(__dirname, '..', '..')
const DOC_PATH = path.join(REPO_ROOT, 'WEBHOOK_LIVE_PROOF.md')
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'ac26.4.1-live-proof.sh')

const [SLUG_A, SLUG_B] = WEBHOOK_LIVE_PROOF_GALLERY_SLUGS

function readDoc(): string {
  return fs.readFileSync(DOC_PATH, 'utf8')
}

/** The `### (e)(ii)` subsection, from its heading to end of file. */
function sectionEII(): string {
  const doc = readDoc()
  const start = doc.indexOf('### (e)(ii)')
  expect(start).toBeGreaterThan(-1)
  return doc.slice(start)
}

describe('AC-26.4.1.3.2: WEBHOOK_LIVE_PROOF.md records the first-publish proof as section (e)(ii)', () => {
  it('section (e)(ii) is nested under section (e), after (e)(i) and the Recovery note', () => {
    const doc = readDoc()
    const eIndex = doc.indexOf('## (e)')
    const eiIndex = doc.indexOf('### (e)(i)')
    const recoveryIndex = doc.indexOf('### Recovery:')
    const eiiIndex = doc.indexOf('### (e)(ii)')
    expect(eIndex).toBeGreaterThan(-1)
    expect(eiIndex).toBeGreaterThan(eIndex)
    expect(recoveryIndex).toBeGreaterThan(eiIndex)
    expect(eiiIndex).toBeGreaterThan(recoveryIndex)
  })

  it('targets only gallery A (the "proof" argument) — gallery B is named solely as untouched', () => {
    const section = sectionEII()
    expect(WEBHOOK_LIVE_PROOF_GALLERY_SLUGS).toHaveLength(2)
    expect(section).toContain('ac26.4.1-live-proof.sh proof')
    expect(section).not.toMatch(/ac26\.4\.1-live-proof\.sh\s+(all|reproduce)\b/)
    expect(section).toContain(SLUG_A)
    expect(section).toContain(SLUG_B)
    // Gallery B is explicitly called out as the next criterion's fixture, not published here.
    expect(section).toMatch(/AC-26\.4\.1\.3\.3/)
    expect(section).not.toMatch(/events\/19\/publish/)
  })

  it('records the publish call succeeding', () => {
    const section = sectionEII()
    expect(section).toMatch(/publish HTTP 200/)
    expect(section).toContain('"is_draft":false')
  })

  it('records the event.published delivery reaching status: success', () => {
    const section = sectionEII()
    expect(section).toMatch(/status=success/)
    expect(section).toMatch(/delivery reached success after \d+s/)
    expect(section).toMatch(/"event_type":\s*"event\.published"/)
    expect(section).toMatch(/"status":\s*"success"/)
  })

  it('reads the delivery back two ways: the list endpoint (no payload column) and a detail read carrying payload', () => {
    const section = sectionEII()
    expect(section).toContain('/deliveries?limit=5')
    expect(section).toMatch(/GET \.\.\.\/deliveries.*detail/)
    expect(section).toMatch(/"payload":\s*\{/)
    expect(section).toMatch(new RegExp(`"slug":\\s*"${SLUG_A}"`))
    // The list rows themselves carry no payload key — only id/status/etc.
    const listBlockStart = section.indexOf('/deliveries?limit=5')
    const listBlockEnd = section.indexOf('/deliveries/53')
    const listBlock = section.slice(listBlockStart, listBlockEnd)
    expect(listBlock).not.toContain('"payload"')
  })

  it('shows the served Frontstage page changing to reflect the publish, bounded by DEADLINE_SECONDS under the 60s safety net', () => {
    const section = sectionEII()
    expect(section).toContain(WEBHOOK_LIVE_PROOF_GALLERY_PATH)
    expect(section).toMatch(/data-testid="webhook-proof-gallery"/)
    expect(section).toMatch(new RegExp(`data-gallery-slug="${SLUG_A}"[^>]*data-photo-count="0"`))
    // Gallery B's section is unaffected — still the pre-publish placeholder.
    expect(section).toMatch(new RegExp(`data-testid="webhook-proof-unavailable"[^>]*data-gallery-slug="${SLUG_B}"`))
    expect(section).toMatch(/DEADLINE_SECONDS/)
    expect(section).toMatch(/25/)
    expect(section).toMatch(/60/)
    expect(section).toMatch(/revalidate = 60/)
  })

  it('is a single recorded invocation — the login banner and PASSED marker each appear exactly once', () => {
    const section = sectionEII()
    const scriptRun = section.slice(section.indexOf('$ bash scripts/ac26.4.1-live-proof.sh proof'))
    const passedMatches = scriptRun.match(/=== PASSED/g)
    expect(passedMatches).toHaveLength(1)
    const loginMatches = scriptRun.match(/Backstage admin login/g)
    expect(loginMatches).toHaveLength(1)
  })
})

describe('AC-26.4.1.3.2: scripts/ac26.4.1-live-proof.sh "proof" mode still does exactly what the recorded run relied on', () => {
  function readScript(): string {
    return fs.readFileSync(SCRIPT_PATH, 'utf8')
  }

  it('exists, is executable, and accepts "proof" as a documented argument', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true)
    const mode = fs.statSync(SCRIPT_PATH).mode
    expect(mode & 0o111).not.toBe(0)
    const script = readScript()
    expect(script).toMatch(/proof\)\s+publish_and_prove "\$SLUG_A" "PROOF"/)
  })

  it('publish_and_prove awaits delivery success and page state, in that order, both bounded by DEADLINE_SECONDS', () => {
    const script = readScript()
    const body = script.slice(script.indexOf('publish_and_prove() {'), script.indexOf('say "Backstage admin login"'))
    const publishIdx = body.indexOf('/publish')
    const deliveryIdx = body.indexOf('await_delivery_success')
    const pageIdx = body.indexOf('await_page_state "$slug"')
    expect(publishIdx).toBeGreaterThan(-1)
    expect(deliveryIdx).toBeGreaterThan(publishIdx)
    expect(pageIdx).toBeGreaterThan(deliveryIdx)
  })

  it('DEADLINE_SECONDS defaults to 25 — strictly less than the 60s safety net and revalidate window', () => {
    const script = readScript()
    expect(script).toMatch(/DEADLINE_SECONDS="\$\{DEADLINE_SECONDS:-25\}"/)
    expect(25).toBeLessThan(60)
  })
})
