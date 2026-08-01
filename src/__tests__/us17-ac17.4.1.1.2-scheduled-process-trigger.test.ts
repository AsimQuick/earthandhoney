/**
 * ---
 * file: src/__tests__/us17-ac17.4.1.1.2-scheduled-process-trigger.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.4.1.1.2 — PIVOT_AUDIT.md locates the scheduled
 *          process that acts on the AC-17.4.1.1.1.2.1-confirmed,
 *          AC-17.4.1.1.1.2.3-stated field (`events.expires_at`), records
 *          how it is triggered (cron expression, timer interval, or on
 *          request) with the file:line where the trigger is registered
 *          or started, and records the one other call site
 *          (`workerManager.js`) as dead code rather than a second live
 *          trigger. This suite confirms: the section exists in the
 *          right place; every citation exists in the vendored fork and
 *          genuinely contains what is claimed for it; the cron
 *          registration and its hourly expression are reproduced
 *          directly from source; `server.js` is independently confirmed
 *          as the real process entry point (package.json, Dockerfile,
 *          PM2 config, and our own docker-compose.yml); and
 *          `workerManager.js` is independently confirmed unreferenced by
 *          any of those same surfaces.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.4.1.1.2
 * ---
 */

import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const lines = (rel: string) => read(rel).split('\n')
/** 1-indexed line lookup, matching how the audit cites code. */
const lineAt = (rel: string, n: number) => lines(rel)[n - 1] ?? ''

const doc = read('PIVOT_AUDIT.md')

const PINNED_COMMIT = 'eb263137b98935754155824de2a03848121304b6'

const sectionStart = doc.indexOf('## AC-17.4.1.1.2 ')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1 ? '' : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

// Whitespace-collapsed, for asserting on prose the document hard-wraps.
const flat = section.replace(/\s+/g, ' ')

const EXPIRATION_CHECKER = 'vendor/picpeak/backend/src/services/expirationChecker.js'
const WORKER_MANAGER = 'vendor/picpeak/backend/src/services/workerManager.js'
const SERVER = 'vendor/picpeak/backend/server.js'
const BACKEND_PACKAGE_JSON = 'vendor/picpeak/backend/package.json'
const BACKEND_DOCKERFILE = 'vendor/picpeak/backend/Dockerfile'
const ECOSYSTEM_CONFIG = 'vendor/picpeak/backend/ecosystem.config.js'
const OUR_COMPOSE = 'docker-compose.yml'

describe('AC-17.4.1.1.2: the scheduled process, and how it is triggered', () => {
  describe('the audit records this AC at all', () => {
    it('PIVOT_AUDIT.md carries AC-17.4.1.1.2 in its front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.4\.1\.1\.2\b/)
    })

    it('has a dedicated AC-17.4.1.1.2 section', () => {
      expect(sectionStart).toBeGreaterThan(-1)
    })

    it('sits after the AC-17.4.1.1.1.3 section it builds on', () => {
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.4.1.1.1.3 '))
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('states the same pinned commit as the rest of this AC-17.4 chain', () => {
      expect(section).toMatch(new RegExp(PINNED_COMMIT))
    })

    it('states this is code-level only, no live gallery created or changed', () => {
      expect(flat).toMatch(/no live Gallery was created or changed/i)
    })

    it('names the confirmed field it builds on: events.expires_at', () => {
      expect(flat).toMatch(/events\.expires_at/)
      expect(flat).toMatch(/AC-17\.4\.1\.1\.1\.2\.1/)
      expect(flat).toMatch(/AC-17\.4\.1\.1\.1\.2\.3/)
    })
  })

  describe('the scheduled process is located precisely', () => {
    it('names expirationChecker.js as the scheduled process', () => {
      expect(section).toContain('`vendor/picpeak/backend/src/services/expirationChecker.js`')
    })

    it('startExpirationChecker is genuinely defined at the cited lines', () => {
      expect(section).toContain('`expirationChecker.js:9-16`')
      expect(lineAt(EXPIRATION_CHECKER, 9)).toMatch(/function startExpirationChecker\(\)/)
      expect(lineAt(EXPIRATION_CHECKER, 15)).toMatch(/Expiration checker started/)
    })

    it('checkExpirations queries events on expires_at for warnings and expiry', () => {
      expect(lineAt(EXPIRATION_CHECKER, 25)).toMatch(/db\('events'\)/)
      expect(lineAt(EXPIRATION_CHECKER, 28)).toMatch(/whereNotNull\('expires_at'\)/)
      expect(lineAt(EXPIRATION_CHECKER, 29)).toMatch(/expires_at.*<=.*warningDate/)
      expect(lineAt(EXPIRATION_CHECKER, 49)).toMatch(/whereNotNull\('expires_at'\)/)
      expect(lineAt(EXPIRATION_CHECKER, 50)).toMatch(/expires_at.*<=.*now/)
    })

    it('handleExpiredEvent does what the section claims', () => {
      expect(lineAt(EXPIRATION_CHECKER, 94)).toMatch(/async function handleExpiredEvent\(event\)/)
      expect(lineAt(EXPIRATION_CHECKER, 97)).toMatch(/is_active: formatBoolean\(false\)/)
      expect(lineAt(EXPIRATION_CHECKER, 105)).toMatch(/webhookService\.fire\('event\.expired'/)
      expect(lineAt(EXPIRATION_CHECKER, 144)).toContain("'gallery_expired'")
      expect(lineAt(EXPIRATION_CHECKER, 156)).toMatch(/archiveEvent\(event\)/)
    })

    it('the second query -> handleExpiredEvent call chain is real', () => {
      expect(lineAt(EXPIRATION_CHECKER, 52)).toMatch(/for \(const event of expiredEvents\)/)
      expect(lineAt(EXPIRATION_CHECKER, 53)).toMatch(/await handleExpiredEvent\(event\)/)
    })
  })

  describe('the trigger is a cron expression, reproduced directly from source', () => {
    it('imports node-cron', () => {
      expect(lineAt(EXPIRATION_CHECKER, 1)).toMatch(/const cron = require\('node-cron'\)/)
      expect(read(BACKEND_PACKAGE_JSON)).toMatch(/"node-cron":\s*"\^?3\.\d+\.\d+"/)
    })

    it('registers the cron job with the exact hourly expression at the cited line', () => {
      expect(section).toContain('`expirationChecker.js:11`')
      expect(lineAt(EXPIRATION_CHECKER, 11)).toMatch(/cron\.schedule\('0 \* \* \* \*',\s*async/)
    })

    it('the cron callback invokes checkExpirations, not some other function', () => {
      expect(lineAt(EXPIRATION_CHECKER, 12)).toMatch(/await checkExpirations\(\)/)
    })

    it('states the expression means hourly-on-the-hour, not a timer interval or on-request handler', () => {
      expect(flat).toMatch(/once per hour, on the hour/i)
      expect(flat).toMatch(/not.*OS-level crontab entry/i)
      expect(flat).toMatch(/not.*setInterval.*setTimeout.*timer/i)
      expect(flat).toMatch(/not a handler invoked on an incoming HTTP request/i)
    })

    it('no options/timezone argument is passed to cron.schedule', () => {
      // Exactly two arguments: the expression and the callback, terminated by `);` on its own line.
      const call = section.match(/cron\.schedule\('0 \* \* \* \*',\s*async \(\) => \{\n\s*await checkExpirations\(\);\n\}\);/)
      expect(call).not.toBeNull()
    })
  })

  describe('no other scheduled process acts on events.expires_at', () => {
    it('names the other recurring jobs inspected and clears them', () => {
      expect(flat).toMatch(/invoiceSchedulerService\.js:53/)
      const otherJobFiles = [
        'vendor/picpeak/backend/src/services/invoiceSchedulerService.js',
        'vendor/picpeak/backend/src/services/backupService.js',
        'vendor/picpeak/backend/src/services/databaseBackup.js',
      ]
      for (const f of otherJobFiles) {
        expect(read(f)).not.toMatch(/expires_at/)
      }
    })

    it('every cron.schedule/setInterval registration in backend/src is accounted for', () => {
      const backendSrc = path.join(root, 'vendor/picpeak/backend/src')
      const hits: string[] = []
      const walk = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name)
          if (e.isDirectory()) walk(full)
          else if (e.isFile() && e.name.endsWith('.js') && !full.includes('__tests__')) {
            const src = fs.readFileSync(full, 'utf8')
            if (/cron\.schedule\(|setInterval\(/.test(src) && /expires_at/.test(src)) {
              hits.push(path.relative(root, full))
            }
          }
        }
      }
      walk(backendSrc)
      // Other files mention `expires_at` as a same-named column on a
      // different table (tokenRevocation.js's `revoked_tokens.expires_at`)
      // or as an outbound email-template variable copied from the events
      // row (emailProcessor.js), not as a query filter against the
      // Gallery's own `events` table — same distinction AC-17.4.1.1.1.3
      // already drew for other tables sharing the column name.
      expect(hits.sort()).toEqual(
        [
          'vendor/picpeak/backend/src/services/expirationChecker.js',
          'vendor/picpeak/backend/src/services/emailProcessor.js',
          'vendor/picpeak/backend/src/utils/tokenRevocation.js',
        ].sort()
      )
    })

    it("the two extra hits' scheduled jobs never query the events table's expires_at", () => {
      const tokenRevocation = read('vendor/picpeak/backend/src/utils/tokenRevocation.js')
      expect(tokenRevocation).toMatch(/db\('revoked_tokens'\)\s*\n\s*\.where\('expires_at'/)
      expect(tokenRevocation).not.toMatch(/db\('events'\)/)

      const emailProcessor = read('vendor/picpeak/backend/src/services/emailProcessor.js')
      expect(emailProcessor).toMatch(/processedVariables\.expires_at/)
      expect(emailProcessor).not.toMatch(/db\('events'\)[\s\S]{0,200}expires_at/)
    })
  })

  describe('the trigger registration/start site: server.js is the live path', () => {
    it('server.js requires and calls startExpirationChecker at the cited lines', () => {
      expect(section).toContain('`vendor/picpeak/backend/server.js:22`')
      expect(section).toContain('`vendor/picpeak/backend/server.js:820`')
      expect(lineAt(SERVER, 22)).toMatch(
        /const \{ startExpirationChecker \} = require\('\.\/src\/services\/expirationChecker'\)/
      )
      expect(lineAt(SERVER, 820)).toMatch(/startExpirationChecker\(\)/)
    })

    it('the call at server.js:820 sits inside startServer(), ahead of app.listen', () => {
      expect(lineAt(SERVER, 791)).toMatch(/async function startServer\(\)/)
      const listenLine = lines(SERVER).findIndex((l) => l.includes('app.listen(PORT'))
      expect(listenLine).toBeGreaterThan(819) // 0-indexed > (820-1)
    })

    it('startServer() is invoked at module scope, at the cited line', () => {
      expect(section).toContain('`server.js:914`')
      expect(lineAt(SERVER, 914)).toMatch(/^startServer\(\);$/)
    })

    it('package.json start script runs server.js', () => {
      expect(section).toContain('`vendor/picpeak/backend/package.json:7`')
      expect(lineAt(BACKEND_PACKAGE_JSON, 7)).toMatch(/"start":\s*"node server\.js"/)
    })

    it("the vendored Dockerfile's CMD runs server.js", () => {
      expect(read(BACKEND_DOCKERFILE)).toMatch(/CMD \["\.\/wait-for-db\.sh", "node", "server\.js"\]/)
    })

    it("ecosystem.config.js's PM2 definition points at server.js", () => {
      expect(section).toContain('`vendor/picpeak/backend/ecosystem.config.js:4`')
      expect(lineAt(ECOSYSTEM_CONFIG, 4)).toMatch(/script:\s*'\.\/server\.js'/)
    })

    it('our docker-compose.yml sets no command: override for backstage-backend', () => {
      const composeLines = lines(OUR_COMPOSE)
      const svcStart = composeLines.findIndex((l) => l.trim() === 'backstage-backend:')
      expect(svcStart).toBeGreaterThan(-1)
      let svcEnd = composeLines.length
      for (let i = svcStart + 1; i < composeLines.length; i++) {
        if (/^\s{2}\S/.test(composeLines[i])) {
          svcEnd = i
          break
        }
      }
      const svcBlock = composeLines.slice(svcStart, svcEnd).join('\n')
      expect(svcBlock).not.toMatch(/^\s*command:/m)
    })
  })

  describe('the second call site, workerManager.js, is genuinely dead code', () => {
    it('workerManager.js requires and calls startExpirationChecker at the cited lines', () => {
      expect(section).toContain('`vendor/picpeak/backend/src/services/workerManager.js:17-18`')
      expect(section).toContain('`workerManager.js:22-39`')
      expect(section).toContain('`workerManager.js:72`')
      expect(lineAt(WORKER_MANAGER, 18)).toMatch(/startExpirationChecker/)
      expect(lineAt(WORKER_MANAGER, 22)).toMatch(/async function startWorkers\(\)/)
      expect(lineAt(WORKER_MANAGER, 31)).toMatch(/startExpirationChecker\(\)/)
      expect(lineAt(WORKER_MANAGER, 72)).toMatch(/^startWorkers\(\);$/)
    })

    it('workerManager.js is not referenced by package.json scripts', () => {
      const pkg = JSON.parse(read(BACKEND_PACKAGE_JSON))
      const scriptValues = Object.values(pkg.scripts ?? {}).join(' ')
      expect(scriptValues).not.toMatch(/workerManager/)
    })

    it('workerManager.js is not referenced by the vendored Dockerfile or ecosystem.config.js', () => {
      expect(read(BACKEND_DOCKERFILE)).not.toMatch(/workerManager/)
      expect(read(ECOSYSTEM_CONFIG)).not.toMatch(/workerManager/)
    })

    it('workerManager.js is not referenced by our docker-compose.yml or upstream vendored compose files', () => {
      expect(read(OUR_COMPOSE)).not.toMatch(/workerManager/)
      const vendorRoot = path.join(root, 'vendor/picpeak')
      const composeFiles = fs
        .readdirSync(vendorRoot)
        .filter((f) => f.includes('docker-compose'))
      expect(composeFiles.length).toBeGreaterThan(0)
      for (const f of composeFiles) {
        expect(read(`vendor/picpeak/${f}`)).not.toMatch(/workerManager/)
      }
    })

    it('no file in the vendored backend other than workerManager.js itself mentions it', () => {
      const backendRoot = path.join(root, 'vendor/picpeak/backend')
      const referrers: string[] = []
      const walk = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name)
          if (e.name === 'node_modules') continue
          if (e.isDirectory()) walk(full)
          else if (e.isFile() && !full.endsWith('workerManager.js')) {
            const src = fs.readFileSync(full, 'utf8')
            if (src.includes('workerManager')) referrers.push(path.relative(root, full))
          }
        }
      }
      walk(backendRoot)
      expect(referrers).toEqual([])
    })

    it('states the dead-code finding explicitly, and compares it to the AC-17.4.1.1.1.2.3 dead-code shape', () => {
      expect(flat).toMatch(/dead code/i)
      expect(flat).toMatch(/never wired to anything that\s*actually executes|never wired to any route/i)
      expect(flat).toMatch(/AC-17\.4\.1\.1\.1\.2\.3/)
    })
  })

  describe('verdict', () => {
    it('has a verdict subsection', () => {
      expect(section).toContain('### Verdict')
    })

    it('the verdict claims the criterion satisfied and names the cron expression, hourly cadence, and both call sites', () => {
      const verdict = section.slice(section.indexOf('### Verdict')).replace(/\s+/g, ' ')
      expect(verdict).toMatch(/AC-17\.4\.1\.1\.2 is satisfied/)
      expect(verdict).toMatch(/cron\.schedule\('0 \* \* \* \*', \.\.\.\)/)
      expect(verdict).toMatch(/once per hour/)
      expect(verdict).toMatch(/server\.js:820/)
      expect(verdict).toMatch(/workerManager\.js:18/)
      expect(verdict).toMatch(/dead code/i)
    })
  })
})
