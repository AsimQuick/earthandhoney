/**
 * ---
 * file: src/__tests__/us7-ac7.1-deploy-workflow.test.ts
 * project: earthandhoney
 * purpose: Verify AC-7.1 — a valid `.github/workflows/deploy.yml` exists,
 *          triggers on push to `main` and via `workflow_dispatch`, parses
 *          cleanly as YAML, and builds the app inside Docker per the
 *          CLAUDE.md Docker rules
 * created-by: dev-team
 * related-story: US-7
 * related-ac: 7.1
 * ---
 */
import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'

const root = process.cwd()
const workflowPath = path.join(root, '.github/workflows/deploy.yml')
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-7.1: .github/workflows/deploy.yml exists and is valid', () => {
  it('exists at the path GitHub expects deploy workflows to live', () => {
    expect(fs.existsSync(workflowPath)).toBe(true)
  })

  const raw = read('.github/workflows/deploy.yml')

  it('parses cleanly as YAML', () => {
    expect(() => parse(raw)).not.toThrow()
  })

  const workflow = parse(raw)

  it('parses to a non-empty object with jobs defined', () => {
    expect(workflow).toBeTruthy()
    expect(workflow.jobs).toBeDefined()
    expect(Object.keys(workflow.jobs).length).toBeGreaterThan(0)
  })

  describe('triggers', () => {
    it('triggers on push to the main branch', () => {
      expect(workflow.on.push).toBeDefined()
      expect(workflow.on.push.branches).toContain('main')
    })

    it('triggers via workflow_dispatch (manual trigger)', () => {
      // `workflow_dispatch:` with no sub-keys parses to null, so presence is
      // checked via key membership rather than truthiness.
      expect('workflow_dispatch' in workflow.on).toBe(true)
    })
  })

  describe('builds the app inside Docker per the CLAUDE.md Docker rules', () => {
    const steps: Array<{ name?: string; run?: string; uses?: string }> = Object.values(
      workflow.jobs as Record<string, { steps?: Array<{ name?: string; run?: string; uses?: string }> }>,
    ).flatMap((job) => job.steps ?? [])

    it('contains a Docker build step', () => {
      const hasDockerBuildStep = steps.some((step) => /docker (compose )?build/.test(step.run ?? ''))
      expect(hasDockerBuildStep).toBe(true)
    })

    it('checks out the repository before building', () => {
      const hasCheckout = steps.some((step) => (step.uses ?? '').startsWith('actions/checkout'))
      expect(hasCheckout).toBe(true)
    })

    it('does not install any service on the host runner (Docker rules)', () => {
      expect(raw).not.toMatch(/apt(-get)? install|brew install|brew services/)
    })

    it('does not reference localhost in place of Docker network hostnames', () => {
      expect(raw).not.toMatch(/localhost/)
    })
  })
})
