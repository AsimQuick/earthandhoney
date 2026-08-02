/**
 * ---
 * file: src/__tests__/us20-ac20.5-stripe-port-report-secret-handling.test.ts
 * project: earthandhoney
 * purpose: Verify AC-20.5 — STRIPE_PORT_REPORT.md records the reference
 *          project's secret-handling shape (local values in an uncommitted
 *          environment file, deployed values in repository secrets whose
 *          names match the environment-variable names exactly, and the
 *          deployment step writing the environment file on the server) and
 *          confirms it will be mirrored here, with no secret value appearing
 *          in the report or in any committed file.
 * created-by: dev-team
 * related-story: US-20
 * related-ac: 20.5
 * ---
 */
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

// The `git` binary itself is not present in the `web` Docker container (the
// Dockerfile is `node:20-alpine` with no `git` package installed), so a
// check that shells out to it can only run where `git` is actually
// reachable — otherwise it fails not because `.env` is tracked, but because
// the environment can't run `git` at all. Mirrors the itIfReachable gate
// used for the reference-project path checks in AC-20.1.
let gitAvailable = true
try {
  execFileSync('git', ['--version'])
} catch {
  gitAvailable = false
}
const itIfGitAvailable = gitAvailable ? it : it.skip

describe('AC-20.5: Stripe port report — secret-handling shape', () => {
  let report: string

  beforeAll(() => {
    report = read('STRIPE_PORT_REPORT.md')
  })

  it('has a secret-handling shape section', () => {
    expect(report).toMatch(/##\s*10\.\s*Secret-handling shape \(AC-20\.5\)/i)
  })

  describe('as found in the reference project', () => {
    it('states local values live in an uncommitted environment file', () => {
      expect(report).toMatch(/uncommitted environment file/i)
      expect(report).toMatch(/`\.gitignore`\s+lists\s+`\.env`\s+explicitly/i)
    })

    it('states deployed values live in repository secrets named to match exactly', () => {
      expect(report).toMatch(/repository secrets, named to\s*\n?\s*match\s+exactly/i)
      expect(report).toMatch(/character-for-character the same/i)
    })

    it('states the deployment step writes the environment file on the server', () => {
      expect(report).toMatch(/deployment step writes the environment file on the\s*\n?\s*server/i)
      expect(report).toMatch(/cat > \.env << EOF/)
    })
  })

  describe('confirmation it will be mirrored here', () => {
    it('confirms this project already gitignores its local env files', () => {
      expect(report).toMatch(/Confirmed: this shape will be mirrored here/i)
      expect(report).toMatch(/\.gitignore.*already lists\s*\n?\s*`\.env`, `\.env\.local`, and\s*\n?\s*`\.env\.\*\.local`/i)
    })

    it('confirms deployed Stripe secrets must be named to match the env var names exactly', () => {
      expect(report).toMatch(/stored as a GitHub Actions\s*\n?\s*repository secret under that exact same name/i)
      expect(report).toMatch(/no renaming or\s*\n?\s*prefixing/i)
    })

    it('names the resolved production deploy target', () => {
      expect(report).toMatch(/root@140\.82\.43\.36/)
      expect(report).toMatch(/\/root\/earthandhoney\//)
    })

    it('is explicit that the production deploy step does not yet exist, without overclaiming', () => {
      expect(report).toMatch(/does not yet do this/i)
      expect(report).toMatch(/it does not claim the\s*\n?\s*step already exists/i)
    })
  })

  it('states plainly that no secret value appears in the report or any committed file', () => {
    expect(report).toMatch(
      /No secret value appears in this report or in any committed file/i
    )
  })

  it('has a Method section for AC-20.5', () => {
    expect(report).toMatch(/##\s*11\.\s*Method \(AC-20\.5\)/i)
  })

  it('carries the required structured metadata header including AC-20.5', () => {
    expect(report).toMatch(/related-ac:\s*20\.1,\s*20\.2,\s*20\.3,\s*20\.4,\s*20\.5/)
  })

  describe('no secret value leakage across the whole report', () => {
    it('never contains a live or test Stripe secret-key literal', () => {
      expect(report).not.toMatch(/sk_(test|live)_[A-Za-z0-9]{10,}/)
    })

    it('never contains a live or test Stripe publishable-key literal', () => {
      expect(report).not.toMatch(/pk_(test|live)_[A-Za-z0-9]{10,}/)
    })
  })

  describe('no secret value leakage in this project\'s own committed files', () => {
    it('this project\'s .gitignore still excludes .env from version control', () => {
      const gitignore = read('.gitignore')
      expect(gitignore).toMatch(/^\.env$/m)
    })

    itIfGitAvailable('this project\'s .env is not itself tracked/committed', () => {
      const tracked = execFileSync('git', ['ls-files', '.env'], {
        cwd: root,
        encoding: 'utf8',
      }).trim()
      expect(tracked).toBe('')
    })
  })
})
