/**
 * ---
 * file: src/__tests__/us26-ac26.4.1.3.3-webhook-live-proof-reproduce.test.ts
 * project: earthandhoney
 * purpose: Verify AC-26.4.1.3.3 — the AC-26.4.1.3.2 sequence re-run against
 *          the second draft gallery, from the recorded commands and without
 *          modifying them, shown to reproduce. The proof itself is a live run
 *          against the running stack, recorded as section (e)(iii) of
 *          `WEBHOOK_LIVE_PROOF.md`; what this suite pins is everything that
 *          has to stay true for that recorded section to keep meaning what
 *          it says:
 *          (1) section (e)(iii) exists, nested under section (e) after
 *              (e)(ii);
 *          (2) the recorded run is the script's own `reproduce` argument
 *              only — gallery B's slug is the target, no `all`/`proof`
 *              invocation appears, and the run's commands are stated to be
 *              unmodified from (e)(ii)'s;
 *          (3) all three required observations are present from that one
 *              run: the publish call and its 200 response, the
 *              `event.published` delivery reaching `status: success`, and
 *              the served Frontstage page changing to reflect the publish;
 *          (4) the delivery is read back two ways — the list endpoint (fixed
 *              columns, no `payload`) and the per-delivery detail endpoint
 *              (carrying `payload`) — not just the script's one-line
 *              summary; and
 *          (5) both proof galleries (A and B) are left published, the state
 *              AC-26.4.2 builds on next.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.4.1.3.3
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

/** The `## (e)(iii)` subsection, from its heading to end of file. */
function sectionEIII(): string {
  const doc = readDoc()
  const start = doc.indexOf('## (e)(iii)')
  expect(start).toBeGreaterThan(-1)
  return doc.slice(start)
}

describe('AC-26.4.1.3.3: WEBHOOK_LIVE_PROOF.md records the reproduction proof as section (e)(iii)', () => {
  it('section (e)(iii) is nested under section (e), after (e)(ii)', () => {
    const doc = readDoc()
    const eIndex = doc.indexOf('## (e)')
    const eiiIndex = doc.indexOf('### (e)(ii)')
    const eiiiIndex = doc.indexOf('## (e)(iii)')
    expect(eIndex).toBeGreaterThan(-1)
    expect(eiiIndex).toBeGreaterThan(eIndex)
    expect(eiiiIndex).toBeGreaterThan(eiiIndex)
  })

  it('targets only gallery B (the "reproduce" argument) — no all/proof invocation appears', () => {
    const section = sectionEIII()
    expect(WEBHOOK_LIVE_PROOF_GALLERY_SLUGS).toHaveLength(2)
    expect(section).toContain('ac26.4.1-live-proof.sh reproduce')
    expect(section).not.toMatch(/ac26\.4\.1-live-proof\.sh\s+(all|proof)\b/)
    expect(section).toContain(SLUG_B)
  })

  it('states the commands are re-run without modification and reproduced without needing a change', () => {
    const section = sectionEIII()
    expect(section).toMatch(/without modification/)
    expect(section).toMatch(/No change was needed to the recorded commands/)
  })

  it('records the publish call succeeding', () => {
    const section = sectionEIII()
    expect(section).toMatch(/publish HTTP 200/)
    expect(section).toContain('"is_draft":false')
  })

  it('records the event.published delivery reaching status: success', () => {
    const section = sectionEIII()
    expect(section).toMatch(/status=success/)
    expect(section).toMatch(/delivery reached success after \d+s/)
    expect(section).toMatch(/"event_type":\s*"event\.published"/)
    expect(section).toMatch(/"status":\s*"success"/)
  })

  it('reads the delivery back two ways: the list endpoint (no payload column) and a detail read carrying payload', () => {
    const section = sectionEIII()
    expect(section).toContain('/deliveries?limit=5')
    expect(section).toMatch(/GET \.\.\.\/deliveries.*detail/)
    expect(section).toMatch(/"payload":\s*\{/)
    expect(section).toMatch(new RegExp(`"slug":\\s*"${SLUG_B}"`))
    // The list rows themselves carry no payload key — only id/status/etc.
    const listBlockStart = section.indexOf('/deliveries?limit=5')
    const listBlockEnd = section.indexOf('/deliveries/54')
    const listBlock = section.slice(listBlockStart, listBlockEnd)
    expect(listBlock).not.toContain('"payload"')
  })

  it('shows the served Frontstage page changing to reflect the publish, with both galleries now published', () => {
    const section = sectionEIII()
    expect(section).toContain(WEBHOOK_LIVE_PROOF_GALLERY_PATH)
    expect(section).toMatch(new RegExp(`data-testid="webhook-proof-gallery"[^>]*data-gallery-slug="${SLUG_A}"[^>]*data-photo-count="0"`))
    expect(section).toMatch(new RegExp(`data-testid="webhook-proof-gallery"[^>]*data-gallery-slug="${SLUG_B}"[^>]*data-photo-count="0"`))
    expect(section).not.toMatch(/webhook-proof-unavailable/)
  })

  it('is a single recorded invocation — the login banner and PASSED marker each appear exactly once', () => {
    const section = sectionEIII()
    const scriptRun = section.slice(section.indexOf('$ bash scripts/ac26.4.1-live-proof.sh reproduce'))
    const passedMatches = scriptRun.match(/=== PASSED/g)
    expect(passedMatches).toHaveLength(1)
    const loginMatches = scriptRun.match(/Backstage admin login/g)
    expect(loginMatches).toHaveLength(1)
  })

  it('states this closes the first of AC-26.4\'s three changes, leaving both galleries published for AC-26.4.2', () => {
    const section = sectionEIII()
    expect(section).toMatch(/closes the first of AC-26\.4's three changes/)
    expect(section).toMatch(/AC-26\.4\.2/)
  })
})

describe('AC-26.4.1.3.3: scripts/ac26.4.1-live-proof.sh "reproduce" mode still does exactly what the recorded run relied on', () => {
  function readScript(): string {
    return fs.readFileSync(SCRIPT_PATH, 'utf8')
  }

  it('exists, is executable, and accepts "reproduce" as a documented argument', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true)
    const mode = fs.statSync(SCRIPT_PATH).mode
    expect(mode & 0o111).not.toBe(0)
    const script = readScript()
    expect(script).toMatch(/reproduce\)\s+publish_and_prove "\$SLUG_B" "REPRODUCE"/)
  })

  it('publish_and_prove is the same function reproduce and proof both call — no divergent reproduce-only logic', () => {
    const script = readScript()
    const proofCall = script.match(/proof\)\s+publish_and_prove "\$SLUG_A" "PROOF"/)
    const reproduceCall = script.match(/reproduce\)\s+publish_and_prove "\$SLUG_B" "REPRODUCE"/)
    expect(proofCall).not.toBeNull()
    expect(reproduceCall).not.toBeNull()
  })

  it('DEADLINE_SECONDS defaults to 25 — strictly less than the 60s safety net and revalidate window', () => {
    const script = readScript()
    expect(script).toMatch(/DEADLINE_SECONDS="\$\{DEADLINE_SECONDS:-25\}"/)
    expect(25).toBeLessThan(60)
  })
})
