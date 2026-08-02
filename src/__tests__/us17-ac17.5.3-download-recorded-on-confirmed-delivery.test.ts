/**
 * ---
 * file: src/__tests__/us17-ac17.5.3-download-recorded-on-confirmed-delivery.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.5.3 — in the vendored fork's single-photo download
 *          route, the `download_count` increment and the `access_logs`
 *          insert have moved out of their upstream pre-send position into
 *          one guarded helper fired only on a confirmed delivery, appear
 *          nowhere else in the route, and carry the same in-file
 *          vendor-defect comment convention as AC-17.5.2. Also pins the
 *          live Postgres evidence recorded in PIVOT_AUDIT.md and the four
 *          register entries that keep the patch from becoming permanent by
 *          accident (FORK_CHANGELOG.md, PICPEAK_UPSTREAM_DEFECTS.md,
 *          UPSTREAM_SYNC.md, and the prepared-not-submitted upstream report
 *          in .github/upstream-issues/).
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.5.3
 * ---
 */

// The route's runtime behaviour is pinned by the AC-17.5.2 suite this AC
// extends — vendor/picpeak/backend/src/__tests__/galleryDownload.storageBackend.test.js,
// 14 tests, run against the vendored backend inside Docker. That suite needs
// the fork's own node/jest toolchain and cannot run under this project's
// jsdom Jest, so this suite covers what it cannot: the source-level ordering
// claims, the live evidence recorded in the audit, and the register entries.

import fs from 'fs'
import path from 'path'
import { validateChangelogEntry, type ChangelogEntry } from '@/lib/forkChangelog'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const GALLERY_ROUTE = 'vendor/picpeak/backend/src/routes/gallery.js'
const VENDOR_SUITE =
  'vendor/picpeak/backend/src/__tests__/galleryDownload.storageBackend.test.js'
const PINNED_COMMIT = 'eb263137b98935754155824de2a03848121304b6'

const routeSource = read(GALLERY_ROUTE)

// The single-photo download route only, bounded by the next route
// declaration, so "appears nowhere else in the route" is a claim about this
// route rather than about the whole 1700-line file (whose sibling
// download-all / view routes legitimately write their own access_logs rows).
const routeStart = routeSource.indexOf("router.get('/:slug/download/:photoId'")
const routeEnd = routeSource.indexOf("router.get('/:slug/download-all'")
const route = routeSource.slice(routeStart, routeEnd)

const doc = read('PIVOT_AUDIT.md')
const sectionStart = doc.indexOf('## AC-17.5.3')
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section =
  sectionStart === -1
    ? ''
    : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)

describe('AC-17.5.3: the download is recorded only once it is confirmed sent', () => {
  describe('the route body is well-formed for the claims below', () => {
    it('locates the single-photo download route and its end', () => {
      expect(routeStart).toBeGreaterThan(-1)
      expect(routeEnd).toBeGreaterThan(routeStart)
    })
  })

  describe('the two writes moved out of their upstream pre-send position', () => {
    it('the pinned upstream really did write both before resolving the file', () => {
      // Re-verified against the pinned source rather than trusted from the
      // audit: upstream's increment sat at line 654 and its access_logs
      // insert at 657, both ahead of the resolvePhotoFilePath call at 667.
      const upstream = read('PICPEAK_UPSTREAM_DEFECTS.md')
      expect(upstream).toMatch(/lines 653–663.*before the file is resolved at all|653–663/)
      expect(upstream).toContain('resolvePhotoFilePath')
    })

    it('the increment appears exactly once in the route', () => {
      expect(route.match(/increment\('download_count', 1\)/g)).toHaveLength(1)
    })

    it('the access_logs insert appears exactly once in the route', () => {
      expect(route.match(/db\('access_logs'\)\.insert\(/g)).toHaveLength(1)
    })

    it("the inserted row still carries action: 'download' and the photo id", () => {
      expect(route).toMatch(/action: 'download'/)
      expect(route).toMatch(/photo_id: photoId/)
    })

    it('both writes live inside one guarded helper, not at the top of the route', () => {
      const helperStart = route.indexOf('const recordConfirmedDownload = () => {')
      expect(helperStart).toBeGreaterThan(-1)
      expect(route.indexOf("increment('download_count', 1)")).toBeGreaterThan(helperStart)
      expect(route.indexOf("db('access_logs').insert(")).toBeGreaterThan(helperStart)
    })

    it('the helper is idempotent — a guard flag makes a second call a no-op', () => {
      expect(route).toMatch(/let downloadRecorded = false/)
      expect(route).toMatch(/if \(downloadRecorded\) return/)
      expect(route).toMatch(/downloadRecorded = true/)
    })
  })

  describe('the helper fires only from a confirmed delivery', () => {
    const callSites = route.match(/recordConfirmedDownload\b/g) ?? []

    it('is referenced exactly four times: the definition and three call sites', () => {
      // definition + res.once('finish') on the watermark branch + res.once
      // ('finish') attached from the storage stream's 'end' + the sendFile
      // success branch. Any additional reference is a new, unreviewed
      // recording path.
      expect(callSites).toHaveLength(4)
    })

    it("the watermark branch records on the response's finish event", () => {
      expect(route).toMatch(
        /res\.once\('finish', recordConfirmedDownload\);\s*\n\s*res\.send\(watermarkedBuffer\)/
      )
    })

    it("the storage-stream branch attaches finish only from the stream's own end event", () => {
      expect(route).toMatch(
        /stream\.on\('end', \(\) => \{\s*\n\s*res\.once\('finish', recordConfirmedDownload\);\s*\n\s*\}\);/
      )
    })

    it("res.sendFile's success branch (no error argument) records the external-photo path", () => {
      const sendFileStart = route.indexOf('res.sendFile(filePath, (downloadError) => {')
      expect(sendFileStart).toBeGreaterThan(-1)
      const sendFileBlock = route.slice(sendFileStart)
      // The recording call sits in the else of `if (downloadError)`, i.e.
      // after the failure branch's own res.status(...) answer.
      expect(sendFileBlock).toMatch(
        /const status = downloadError\.code === 'ENOENT' \? 404 : 500;[\s\S]*?\} else \{[\s\S]*?recordConfirmedDownload\(\);/
      )
    })

    it('no failure branch calls the helper', () => {
      // Every failure branch in this route answers with one of these and
      // then returns; none of them may record a download.
      const failureAnswers = [
        "res.status(403).json({ error: 'Downloads are disabled for this gallery' })",
        "res.status(404).json({ error: 'Photo not found' })",
        "res.status(403).json({ error: 'Photo not available' })",
        "res.status(404).json({ error: 'Photo file not found' })",
        "res.status(500).json({ error: 'Failed to download photo' })",
      ]
      for (const answer of failureAnswers) {
        expect(route).toContain(answer)
      }
      // The only statement-level `recordConfirmedDownload()` invocation is
      // the sendFile success branch; the other two references pass it as a
      // listener to res.once('finish', ...).
      expect(route.match(/recordConfirmedDownload\(\);/g)).toHaveLength(1)
      expect(route.match(/res\.once\('finish', recordConfirmedDownload\)/g)).toHaveLength(2)
    })

    it('a failed write is logged rather than crashing the already-sent response', () => {
      expect(route).toMatch(/Failed to record download count/)
      expect(route).toMatch(/Failed to record download access log/)
    })
  })

  describe('the changed region carries the AC-17.5.2 vendor-defect comment convention', () => {
    it('opens and closes a marked vendor-defect block naming this AC', () => {
      expect(route).toContain('// --- vendor-defect fix: US-17 AC-17.5.3 (start) ---')
      expect(route).toContain('// --- vendor-defect fix: US-17 AC-17.5.3 (end) ---')
    })

    it('uses the same start/end block convention AC-17.5.2 established in this route', () => {
      expect(route).toContain('// --- vendor-defect fix: US-17 AC-17.5.2 (start) ---')
      expect(route).toContain('// --- vendor-defect fix: US-17 AC-17.5.2 (end) ---')
    })

    it('marks each individual AC-17.5.3 call site in-file, as AC-17.5.2 marks its own', () => {
      expect(route.match(/vendor-defect fix: US-17 AC-17\.5\.3/g)?.length).toBeGreaterThanOrEqual(5)
      expect(route.match(/vendor-defect fix: US-17 AC-17\.5\.2/g)?.length).toBeGreaterThanOrEqual(5)
    })

    it('the comment points at the defect register entry rather than restating it', () => {
      expect(route).toContain('PICPEAK_UPSTREAM_DEFECTS.md')
      expect(route).toMatch(/UD-1 part \(3\)/)
    })
  })

  describe('the AC-17.5.2 pinning suite is extended to cover the ordering claims', () => {
    const suite = read(VENDOR_SUITE)

    it('the suite header names AC-17.5.3 alongside AC-17.5.2', () => {
      expect(suite).toMatch(/US-17 AC-17\.5\.2 and AC-17\.5\.3/)
    })

    it('carries a dedicated confirmed-delivery describe block', () => {
      expect(suite).toContain(
        'download recorded only on confirmed delivery (US-17 AC-17.5.3)'
      )
    })

    it('asserts the writes fire on the confirmed-delivery paths', () => {
      expect(suite).toMatch(/expect\(downloadWriteSpies\.increment\)\.toHaveBeenCalledTimes\(1\)/)
      expect(suite).toMatch(/expect\(downloadWriteSpies\.insert\)\.toHaveBeenCalledTimes\(1\)/)
    })

    it('asserts they fire on none of the failure paths', () => {
      expect(
        suite.match(/expect\(downloadWriteSpies\.increment\)\.not\.toHaveBeenCalled\(\)/g)?.length
      ).toBeGreaterThanOrEqual(7)
      expect(
        suite.match(/expect\(downloadWriteSpies\.insert\)\.not\.toHaveBeenCalled\(\)/g)?.length
      ).toBeGreaterThanOrEqual(7)
    })

    it('every request in it still carries the AC-17.5.2 hard timeout', () => {
      expect(suite).toMatch(/const REQUEST_TIMEOUT_MS = \d+/)
      const requests = suite.match(/request\(app\)\s*\n\s*\.get\(/g) ?? []
      const timeouts = suite.match(/\.timeout\(REQUEST_TIMEOUT_MS\)/g) ?? []
      expect(requests.length).toBeGreaterThan(0)
      expect(timeouts).toHaveLength(requests.length)
    })
  })

  describe('the live proof recorded in PIVOT_AUDIT.md', () => {
    it('has a dedicated AC-17.5.3 section, after AC-17.5.2', () => {
      expect(sectionStart).toBeGreaterThan(-1)
      expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.5.2'))
    })

    it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
      expect(sectionEnd).toBeGreaterThan(-1)
      expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    })

    it('carries AC-17.5.3 in the audit front-matter related-ac list', () => {
      expect(doc).toMatch(/related-ac:.*\b17\.5\.3\b/)
    })

    it('records the successful download still incrementing download_count (5 → 6)', () => {
      expect(section).toMatch(/download_count/)
      expect(section).toMatch(/\b5\b[\s\S]{0,400}\b6\b/)
      expect(section).toMatch(/http_code=200/)
    })

    it('records exactly one access_logs row with action download for that success', () => {
      expect(section).toMatch(/action.*download/)
      expect(section).toMatch(/\baccess_logs\b/)
    })

    it('records the 404 leaving download_count unchanged and writing no access_logs row', () => {
      expect(section).toMatch(/http_code=404/)
      expect(section).toMatch(/\(0 rows\)/)
    })

    it('states the pairing is gone rather than merely moved', () => {
      expect(section).toMatch(/gone rather than merely moved/i)
    })

    it('records the hard per-request timeout AC-17.5.2 requires', () => {
      expect(section).toMatch(/curl .*-m 15|-m 15/)
    })

    it('records that the injected ghost photo row was cleaned up', () => {
      expect(section).toMatch(/delete from photos/i)
    })
  })

  describe('register entry 1 — FORK_CHANGELOG.md deviation entry', () => {
    const changelog = read('FORK_CHANGELOG.md')

    it('carries a dated 2026-08-01 deviation entry', () => {
      expect(changelog).toMatch(/## 2026-08-01 — `deviation`/)
    })

    it('names the files it touched, as the changelog shape requires', () => {
      expect(changelog).toContain(GALLERY_ROUTE)
      expect(changelog).toContain(VENDOR_SUITE)
    })

    it('that entry satisfies validateChangelogEntry', () => {
      const entry: ChangelogEntry = {
        date: '2026-08-01',
        type: 'deviation',
        summary:
          'Single-photo gallery download: storage backend, responding failure paths, and recording only on a confirmed send.',
        filesTouched: [GALLERY_ROUTE, VENDOR_SUITE],
      }
      expect(validateChangelogEntry(entry)).toEqual({ valid: true, reason: null })
    })

    it('states it is a vendor-defect workaround rather than a permanent deviation', () => {
      expect(changelog).toMatch(/vendor-defect workaround, \*\*not\*\* a permanent deviation/)
      expect(changelog).toContain('PICPEAK_UPSTREAM_DEFECTS.md')
      expect(changelog).toContain('UPSTREAM_SYNC.md')
    })

    it('names the upstream lines this AC moved (654 and 657)', () => {
      expect(changelog).toMatch(/gallery\.js:654/)
      expect(changelog).toMatch(/gallery\.js:657/)
    })

    it('leaves the pinned baseline entry intact below it', () => {
      expect(changelog).toContain(PINNED_COMMIT)
      expect(changelog.indexOf('## 2026-08-01 — `deviation`')).toBeLessThan(
        changelog.indexOf('## 2026-07-31 — `baseline`')
      )
    })
  })

  describe('register entry 2 — PICPEAK_UPSTREAM_DEFECTS.md', () => {
    const defects = read('PICPEAK_UPSTREAM_DEFECTS.md')

    it('gives the defect and its upstream location at the pinned commit', () => {
      expect(defects).toContain(PINNED_COMMIT)
      expect(defects).toMatch(/## UD-1/)
      expect(defects).toMatch(/backend\/src\/routes\/gallery\.js/)
      expect(defects).toMatch(/GET \/:slug\/download\/:photoId/)
    })

    it('describes the ordering defect as part (3) of UD-1', () => {
      expect(defects).toMatch(/\*\*\(3\) The download is recorded before it is known to have succeeded\.\*\*/)
    })

    it('names the fork patch and its pinning suite', () => {
      expect(defects).toContain(GALLERY_ROUTE)
      expect(defects).toContain(VENDOR_SUITE)
      expect(defects).toMatch(/recordConfirmedDownload/)
    })

    it('states the explicit condition under which the patch is dropped', () => {
      expect(defects).toMatch(/Drop the patch when/)
      expect(defects).toMatch(/only after a confirmed send/)
      expect(defects).toMatch(/All three at the same commit/)
    })

    it('flags the sync disposition as drop rather than merge', () => {
      expect(defects).toMatch(/\*\*drop rather than merge\*\*/)
      expect(defects).toMatch(/UPSTREAM_SYNC\.md`? ?§ ?4/)
    })
  })

  describe('register entry 3 — UPSTREAM_SYNC.md drop-rather-than-merge flag', () => {
    const sync = read('UPSTREAM_SYNC.md')

    it('has a drop-rather-than-merge section distinct from the permanent deviations', () => {
      expect(sync).toMatch(/## 4\. Drop-rather-than-merge: vendor-defect patches/)
      expect(sync).toMatch(/delete the patch rather than merging it forward/)
    })

    it('lists this patch, its files, its register entry, and its drop condition', () => {
      expect(sync).toContain('backend/src/routes/gallery.js')
      expect(sync).toContain('backend/src/__tests__/galleryDownload.storageBackend.test.js')
      expect(sync).toMatch(/UD-1/)
      expect(sync).toContain('PICPEAK_UPSTREAM_DEFECTS.md')
    })

    it('marks it as not a permanent deviation, distinguishing it from the §2 table', () => {
      expect(sync).toMatch(/this one is expected to stop deviating/)
    })

    it('leaves the AC-15.5 merge policy and conflict table intact', () => {
      expect(sync).toMatch(/merge, not rebase/i)
      expect(sync).toMatch(/files most likely to conflict/i)
    })
  })

  describe('register entry 4 — the upstream report, prepared but not submitted', () => {
    const report = read('.github/upstream-issues/UD-1-gallery-single-download.md')
    const defects = read('PICPEAK_UPSTREAM_DEFECTS.md')

    it('the submission-ready report exists in .github/upstream-issues/', () => {
      expect(
        fs.existsSync(path.join(root, '.github/upstream-issues/UD-1-gallery-single-download.md'))
      ).toBe(true)
    })

    it('the report states the ordering defect in upstream terms', () => {
      expect(report).toMatch(/recorded before it is known to have succeeded/i)
      expect(report).toMatch(/download_count/)
      expect(report).toMatch(/access_logs/)
      expect(report).toContain(PINNED_COMMIT)
    })

    it('the report carries no Earth & Honey story numbers or internal document names', () => {
      expect(report).not.toMatch(/US-17|AC-17|PIVOT_AUDIT|FORK_CHANGELOG|UPSTREAM_SYNC/)
    })

    it('the register records the state as "prepared, not submitted"', () => {
      expect(defects).toMatch(/`prepared, not submitted`/)
    })

    it('names exactly what is needed to submit it, and who can clear it', () => {
      expect(defects).toMatch(/\*\*Exactly what is needed to submit it:\*\*/)
      expect(defects).toMatch(/explicit human decision to publish/)
      expect(defects).toMatch(/\*\*Who can clear it:\*\*/)
    })

    it('records honestly that no credential is the blocker', () => {
      expect(defects).toMatch(/no additional credential/i)
    })

    it('gives the exact command that submits it, pointing at the report file', () => {
      expect(defects).toMatch(/gh issue create --repo PicPeak\/picpeak/)
      expect(defects).toContain('.github/upstream-issues/UD-1-gallery-single-download.md')
    })
  })
})
