/**
 * ---
 * file: src/__tests__/us33-ac33.5.2.3-end-to-end-proof-script.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.5.2.3's evidence artifact — the committed
 *          scripts/ac33.5.2.2-backstage-token-proof.sh, extended (the same
 *          file, one added section, not a second script) into one end-to-end
 *          run. Guards the properties that make the run evidence rather than
 *          a return code: the submission goes through the REAL Frontstage
 *          route `/api/inquiries` (not a hand-rolled call to Backstage's
 *          route), the `email_queue` row is read out of Backstage's Postgres
 *          while still `pending` BEFORE anything is flushed, the same row is
 *          read back `sent` with a `sent_at` timestamp after the admin
 *          flush-queue call, the MailHog capture inbox is emptied and
 *          asserted at zero before the run, and the captured message is
 *          matched on a unique per-run marker. Same technique as
 *          src/__tests__/us26-ac26.4-webhook-live-proof.test.tsx, which
 *          guards its own live-proof script's contract by reading the
 *          committed script back: nothing here runs Docker or the network.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.5.2.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const SCRIPT_PATH = 'scripts/ac33.5.2.2-backstage-token-proof.sh'

describe('AC-33.5.2.3: the committed end-to-end proof script', () => {
  const script = fs.readFileSync(path.join(process.cwd(), SCRIPT_PATH), 'utf8')
  const section = script.slice(script.indexOf('# AC-33.5.2.3 — one end-to-end run'))

  it('extends the AC-33.5.2.2 script rather than adding a second script', () => {
    expect(fs.existsSync(path.join(process.cwd(), SCRIPT_PATH))).toBe(true)
    expect(script).toMatch(/related-ac:.*33\.5\.2\.3/)
    expect(section.length).toBeGreaterThan(0)
    // The earlier sub-ACs' sections are still there — this is an extension.
    expect(script).toContain('AC-33.5.2.2.3: proving POST /api/v1/notifications/inquiry')
  })

  it('submits through the real Frontstage route, not by calling the Backstage route directly', () => {
    expect(section).toMatch(/POST "\$\{FRONTSTAGE\}\/api\/inquiries"/)
    expect(section).not.toContain('/api/v1/notifications/inquiry')
  })

  it('empties the MailHog capture inbox and asserts it back to zero before the run', () => {
    const emptyIdx = section.indexOf('DELETE')
    const submitIdx = section.indexOf('/api/inquiries')
    expect(emptyIdx).toBeGreaterThan(-1)
    expect(emptyIdx).toBeLessThan(submitIdx)
    expect(section).toMatch(/-X DELETE .*\$\{MAILHOG\}\/api\/v1\/messages/)
    expect(section).toContain('if [ "$INBOX_BEFORE" != "0" ]; then')
  })

  it('reads the email_queue row out of Backstage\'s Postgres while still pending, before any flush', () => {
    const pendingReadIdx = section.indexOf('ROW_PENDING=')
    const flushIdx = section.indexOf('flush-queue')
    expect(pendingReadIdx).toBeGreaterThan(-1)
    expect(flushIdx).toBeGreaterThan(pendingReadIdx)
    expect(section).toMatch(/docker compose --profile backstage exec -T backstage-db psql/)
    expect(section).toContain('[ "$P_STATUS" = "pending" ]')
    expect(section).toContain('[ -z "$P_SENT_AT" ]')
  })

  it('reads the SAME row back as sent with a sent_at timestamp after the admin flush', () => {
    expect(section).toMatch(/\$\{BACKSTAGE\}\/api\/admin\/email\/flush-queue/)
    // Both reads use the one $E2E_SELECT statement — the same row, not a
    // second query that could match something else.
    expect(section).toContain('ROW_PENDING="$(docker compose --profile backstage exec -T backstage-db psql')
    expect(section).toContain('ROW_SENT="$(docker compose --profile backstage exec -T backstage-db psql')
    expect((section.match(/-c "\$E2E_SELECT"/g) ?? []).length).toBe(2)
    expect(section).toContain('[ "$S_STATUS" = "sent" ]')
    expect(section).toContain('[ -n "$S_SENT_AT" ]')
  })

  it('confirms the message itself in MailHog, matched on a unique per-run marker', () => {
    expect(section).toMatch(/E2E_MARKER="ac33\.5\.2\.3-proof-\$\(date \+%s\)-\$\$"/)
    expect(section).toMatch(/\$\{MAILHOG\}\/api\/v2\/messages/)
    expect(section).toContain("if '${E2E_MARKER}' not in subject:")
    expect(section).toContain('[ -n "$MAIL_MATCH" ]')
    expect(section).toContain('[ "$MAIL_TO" = "$E2E_RECIPIENT" ]')
  })

  it('never infers success from the Frontstage return code alone', () => {
    // The 201 is asserted, but it is only one of several checks — the queue
    // row and the captured message are what prove the send.
    expect(section).toContain('[ "$status_submit" = "201" ]')
    expect(section).toContain('[ -n "$E2E_INQUIRY_ID" ]')
  })

  it('runs the Frontstage with BACKSTAGE_API_TOKEN supplied in memory, never written to .env or a file', () => {
    expect(section).toMatch(/-e BACKSTAGE_API_TOKEN="\$WRITE_TOKEN"/)
    expect(section).not.toMatch(/>>?\s*\.env/)
  })

  it('accumulates no state: the ephemeral container and the Payload fixtures come down on exit', () => {
    expect(section).toContain('trap e2e_cleanup EXIT')
    expect(section).toMatch(/docker rm -f "\$FRONTSTAGE_CONTAINER"/)
    expect(section).toMatch(/-X DELETE[\s\S]{0,120}\/api\/inquiries\/\$\{E2E_INQUIRY_ID\}/)
    expect(section).toMatch(/-X DELETE[\s\S]{0,120}\/api\/forms\/\$\{E2E_FORM_ID\}/)
  })
})
