/**
 * ---
 * file: src/__tests__/us22-ac22.5-storage-permission-fix.test.ts
 * project: earthandhoney
 * purpose: Verify AC-22.5 — the F7 `/storage` permission fix (previously
 *          reapplied by hand under AC-17.5.1 and again AC-17.7) is made
 *          reproducible in docker-compose.yml, with no vendored PicPeak file
 *          edited, so `docker compose down -v && up` leaves the Gallery-create
 *          route's `/storage` path writable with no manual intervention
 * created-by: dev-team
 * related-story: US-22
 * related-ac: 22.5
 * ---
 */
import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-22.5: the F7 /storage permission fix survives container recreation', () => {
  const compose = parse(read('docker-compose.yml'))
  const backend = compose.services['backstage-backend']

  describe('docker-compose.yml overrides the command to fix /storage on every start', () => {
    it('overrides "command" on "backstage-backend" (rather than editing the vendored Dockerfile/entrypoint)', () => {
      expect(backend.command).toBeDefined()
      expect(Array.isArray(backend.command)).toBe(true)
    })

    it('creates /storage and chowns it to nodejs before anything else runs', () => {
      const shellStep = backend.command[backend.command.length - 1]
      expect(shellStep).toMatch(/mkdir -p \/storage/)
      expect(shellStep).toMatch(/chown -R nodejs:nodejs \/storage/)
      // Order matters: the directory must exist before it is chowned, and
      // both must happen before the original entrypoint chain runs.
      const mkdirIndex = shellStep.indexOf('mkdir -p /storage')
      const chownIndex = shellStep.indexOf('chown -R nodejs:nodejs /storage')
      const execIndex = shellStep.indexOf('exec ./wait-for-db.sh')
      expect(mkdirIndex).toBeGreaterThanOrEqual(0)
      expect(chownIndex).toBeGreaterThan(mkdirIndex)
      expect(execIndex).toBeGreaterThan(chownIndex)
    })

    it('hands off to the image\'s own unmodified wait-for-db.sh entrypoint chain, passing the original "node server.js" args', () => {
      const shellStep = backend.command[backend.command.length - 1]
      expect(shellStep).toMatch(/exec \.\/wait-for-db\.sh node server\.js\s*$/)
    })

    it('does not pin a "user:" override, so the container still starts as root and can create /storage', () => {
      // wait-for-db.sh's own root->nodejs privilege drop (su-exec) depends on
      // the container starting as root (see vendor/picpeak/backend/Dockerfile,
      // no USER directive). A "user:" override here would break both that and
      // this fix's own mkdir/chown step.
      expect(backend.user).toBeUndefined()
    })
  })

  describe('no vendored PicPeak file is edited to deliver this fix (Fork Discipline)', () => {
    it('the vendored Dockerfile keeps its original CMD/ENTRYPOINT untouched', () => {
      const dockerfile = read('vendor/picpeak/backend/Dockerfile')
      expect(dockerfile).toMatch(/ENTRYPOINT \["dumb-init", "--"\]/)
      expect(dockerfile).toMatch(/CMD \["\.\/wait-for-db\.sh", "node", "server\.js"\]/)
    })

    it('the vendored wait-for-db.sh is untouched — it still only manages /app/storage, not /storage', () => {
      const waitForDb = read('vendor/picpeak/backend/wait-for-db.sh')
      expect(waitForDb).toMatch(/chown -R nodejs:nodejs \/app\/storage \/app\/data \/app\/logs/)
      expect(waitForDb).not.toMatch(/chown -R nodejs:nodejs \/storage\b/)
    })
  })

  describe('the fix is documented as durable, not a recurring manual step', () => {
    it('the command override cites AC-22.5 / F7 so its purpose survives a future edit', () => {
      const contents = read('docker-compose.yml')
      expect(contents).toMatch(/AC-22\.5/)
      expect(contents).toMatch(/F7/)
    })
  })
})
