/**
 * ---
 * file: src/__tests__/us16-ac16.5-backstage-startup-runbook.test.ts
 * project: earthandhoney
 * purpose: Verify AC-16.5 — a documented, repeatable start-up procedure
 *          exists that takes a clean checkout to a running Backstage with
 *          an administrator able to sign in, and that the procedure's
 *          result from being exercised end to end is recorded
 * created-by: dev-team
 * related-story: US-16
 * related-ac: 16.5
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-16.5: Backstage start-up runbook is documented and its execution is recorded', () => {
  const runbookPath = path.join(root, 'BACKSTAGE_STARTUP.md')

  it('BACKSTAGE_STARTUP.md exists and is tracked at the repo root', () => {
    expect(fs.existsSync(runbookPath)).toBe(true)
  })

  const runbook = read('BACKSTAGE_STARTUP.md')

  describe('the procedure covers clean checkout to a running Backstage', () => {
    it('starts from copying .env.example, not a pre-existing .env', () => {
      expect(runbook).toMatch(/cp \.env\.example \.env/)
    })

    it('documents the docker compose command that brings up the Backstage services', () => {
      expect(runbook).toMatch(/docker compose --profile backstage up -d --build/)
      expect(runbook).toMatch(/backstage-db/)
      expect(runbook).toMatch(/backstage-backend/)
      expect(runbook).toMatch(/backstage-frontend/)
    })

    it('documents waiting for the backend health check before signing in', () => {
      expect(runbook).toMatch(/Health\.Status/)
      expect(runbook).toMatch(/healthy/)
    })

    it('documents signing in as the administrator through the frontend, not a direct backend call', () => {
      expect(runbook).toMatch(/localhost:3100\/api\/auth\/admin\/login/)
    })
  })

  describe('the procedure was exercised end to end and the result is recorded', () => {
    it('records a "Recorded run" section documenting a real execution', () => {
      expect(runbook).toMatch(/## Recorded run/)
    })

    it('records the migrations having applied cleanly on a first boot', () => {
      expect(runbook).toMatch(/Applied: 96 migration\(s\)/)
      expect(runbook).toMatch(/All migrations completed successfully/)
    })

    it('records the backend health check actually returning healthy', () => {
      expect(runbook).toMatch(/\$ docker inspect --format='\{\{\.State\.Health\.Status\}\}'/)
    })

    it('records a successful admin sign-in response with an issued session cookie', () => {
      expect(runbook).toMatch(/HTTP\/1\.1 200 OK/)
      expect(runbook).toMatch(/Set-Cookie: admin_token=/)
      expect(runbook).toMatch(/"username":"admin"/)
    })

    it('states an explicit pass/fail result for the recorded run', () => {
      expect(runbook).toMatch(/Result: \*\*PASS\*\*/)
    })

    it('the recorded sign-in used only the defaults documented in .env.example, proving the procedure needs no undocumented setup', () => {
      const envExample = read('.env.example')
      expect(envExample).toMatch(/BACKSTAGE_ADMIN_USERNAME=admin/)
      expect(envExample).toMatch(/BACKSTAGE_ADMIN_PASSWORD=change-me-in-production/)
      expect(runbook).toMatch(/"username":"admin","password":"change-me-in-production"/)
    })
  })

  describe('teardown for re-running the procedure from a clean state is documented', () => {
    it('documents removing the Backstage database volume', () => {
      expect(runbook).toMatch(/docker compose --profile backstage down -v/)
    })
  })
})
