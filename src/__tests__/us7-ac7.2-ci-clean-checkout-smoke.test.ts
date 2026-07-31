/**
 * ---
 * file: src/__tests__/us7-ac7.2-ci-clean-checkout-smoke.test.ts
 * project: earthandhoney
 * purpose: Verify AC-7.2 — `.github/workflows/ci.yml` includes a
 *          clean-checkout smoke path (fresh `actions/checkout` ->
 *          `cp .env.example .env` -> `docker compose up` that boots
 *          `web`+`db`) so latent config gaps (like the sprint-1
 *          `PAYLOAD_SECRET` bug) surface immediately rather than several
 *          ACs later
 * created-by: dev-team
 * related-story: US-7
 * related-ac: 7.2
 * ---
 */
import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'

const root = process.cwd()
const workflowPath = path.join(root, '.github/workflows/ci.yml')
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

type Step = { name?: string; run?: string; uses?: string; if?: string }
type Job = { steps?: Step[] }

describe('AC-7.2: CI includes a clean-checkout smoke path', () => {
  it('ci.yml exists and parses cleanly as YAML', () => {
    expect(fs.existsSync(workflowPath)).toBe(true)
    expect(() => parse(read('.github/workflows/ci.yml'))).not.toThrow()
  })

  const raw = read('.github/workflows/ci.yml')
  const workflow = parse(raw)
  const jobs = workflow.jobs as Record<string, Job>

  it('defines a dedicated smoke job distinct from the lint/typecheck/test job', () => {
    expect(jobs.smoke).toBeDefined()
    expect(jobs.smoke.steps).toBeDefined()
  })

  describe('the smoke job', () => {
    const steps = jobs.smoke.steps ?? []

    it('starts from a fresh actions/checkout', () => {
      expect(steps[0].uses).toMatch(/^actions\/checkout/)
    })

    it('prepares the env file via cp .env.example .env before any docker command', () => {
      const cpIndex = steps.findIndex((s) => /cp\s+\.env\.example\s+\.env/.test(s.run ?? ''))
      const upIndex = steps.findIndex((s) => /docker compose up/.test(s.run ?? ''))
      expect(cpIndex).toBeGreaterThan(-1)
      expect(upIndex).toBeGreaterThan(-1)
      expect(cpIndex).toBeLessThan(upIndex)
    })

    it('boots the stack with `docker compose up` (not just `build`/`run`)', () => {
      const hasUp = steps.some((s) => /docker compose up/.test(s.run ?? ''))
      expect(hasUp).toBe(true)
    })

    it('does not scope `docker compose up` to a single service, so both web and db boot', () => {
      const upStep = steps.find((s) => /docker compose up/.test(s.run ?? ''))
      expect(upStep).toBeDefined()
      // A bare `docker compose up [flags] -d` (no trailing service name) starts every
      // service declared in docker-compose.yml — i.e. both "web" and "db".
      const upLine = (upStep!.run ?? '').split('\n').find((l) => /docker compose up/.test(l))!
      expect(upLine).not.toMatch(/docker compose up\b.*\b(web|db)\s*$/)
    })

    it('verifies the booted app actually serves a request (catches a config-gap 500, not just "container running")', () => {
      const combined = steps.map((s) => s.run ?? '').join('\n')
      expect(combined).toMatch(/curl/)
      expect(combined).toMatch(/500/)
    })

    it('tears the stack down afterwards, even on failure', () => {
      const teardown = steps.find((s) => /docker compose down/.test(s.run ?? ''))
      expect(teardown).toBeDefined()
      expect(teardown!.if).toBe('always()')
    })

    it('does not install any service on the host runner (Docker rules)', () => {
      expect(raw).not.toMatch(/apt(-get)? install|brew install|brew services/)
    })
  })

  it('docker-compose.yml boots exactly the two services the smoke path needs by default', () => {
    // A bare `docker compose up` (no --profile flag) starts only services
    // that declare no `profiles`. US-16 added Backstage services gated
    // behind `profiles: [backstage]` specifically so this smoke path keeps
    // booting just the Next.js app + its database, unchanged.
    const compose = parse(read('docker-compose.yml'))
    const defaultServices = Object.entries(compose.services as Record<string, { profiles?: string[] }>)
      .filter(([, service]) => !service.profiles?.length)
      .map(([name]) => name)
    expect(defaultServices.sort()).toEqual(['db', 'web'])
  })

  it('runs on the same triggers as the rest of CI (push + pull_request), not just deploy', () => {
    expect(workflow.on.push).toBeDefined()
    expect(workflow.on.pull_request).toBeDefined()
  })
})
