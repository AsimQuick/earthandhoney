/**
 * ---
 * file: src/__tests__/us15-ac15.4-third-party-notices.test.ts
 * project: earthandhoney
 * purpose: Verify AC-15.4 — THIRD_PARTY_NOTICES.md exists and reproduces
 *          the PicPeak upstream licence text and copyright notice in full,
 *          alongside notices for other code already copied into this
 *          repository (the bundled public/photobuddy libraries). Also
 *          exercises the notice-completeness decision logic in isolation.
 * created-by: dev-team
 * related-story: US-15
 * related-ac: 15.4
 * ---
 */
import fs from 'fs'
import path from 'path'
import { checkNoticeCompleteness, type ThirdPartyNoticeEntry } from '@/lib/thirdPartyNotices'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const COMPLETE_ENTRY: ThirdPartyNoticeEntry = {
  component: 'jQuery',
  copyright: '(c) jQuery Foundation',
  licenceText: 'MIT License\n\nPermission is hereby granted, free of charge, to any person obtaining a copy...',
}

describe('AC-15.4: third-party notices', () => {
  describe('checkNoticeCompleteness (notice-completeness decision logic)', () => {
    it('accepts an entry with component, copyright, and full licence text', () => {
      expect(checkNoticeCompleteness(COMPLETE_ENTRY)).toEqual({ complete: true, missing: [] })
    })

    it('rejects an entry missing the component name', () => {
      const result = checkNoticeCompleteness({ ...COMPLETE_ENTRY, component: '' })
      expect(result.complete).toBe(false)
      expect(result.missing).toContain('component')
    })

    it('rejects an entry missing the copyright notice', () => {
      const result = checkNoticeCompleteness({ ...COMPLETE_ENTRY, copyright: '' })
      expect(result.complete).toBe(false)
      expect(result.missing).toContain('copyright')
    })

    it('rejects an entry with empty licence text', () => {
      const result = checkNoticeCompleteness({ ...COMPLETE_ENTRY, licenceText: '' })
      expect(result.complete).toBe(false)
      expect(result.missing).toContain('licenceText')
    })

    it('rejects an entry whose licence text is just a bare name, not the full text', () => {
      const result = checkNoticeCompleteness({ ...COMPLETE_ENTRY, licenceText: 'MIT' })
      expect(result.complete).toBe(false)
      expect(result.missing.some((m) => m.startsWith('licenceText'))).toBe(true)
    })
  })

  describe('THIRD_PARTY_NOTICES.md — recorded notices', () => {
    it('exists at the repo root', () => {
      expect(fs.existsSync(path.join(root, 'THIRD_PARTY_NOTICES.md'))).toBe(true)
    })

    const doc = read('THIRD_PARTY_NOTICES.md')

    it('reproduces the full PicPeak MIT licence text', () => {
      expect(doc).toContain('MIT License')
      expect(doc).toContain('Copyright (c) 2025 paul')
      expect(doc).toContain(
        'Permission is hereby granted, free of charge, to any person obtaining a copy of this software'
      )
      expect(doc).toContain('THE SOFTWARE IS PROVIDED "AS IS"')
    })

    it('references the pinned PicPeak commit and upstream URL', () => {
      expect(doc).toContain('https://github.com/PicPeak/picpeak')
      expect(doc).toContain('eb263137b98935754155824de2a03848121304b6')
    })

    it('includes a notice for every third-party library bundled in public/photobuddy', () => {
      expect(doc).toMatch(/jQuery/i)
      expect(doc).toMatch(/FlexSlider/i)
      expect(doc).toMatch(/Theia Sticky Sidebar/i)
      expect(doc).toMatch(/Themedo/i)
      expect(doc).toMatch(/FriendLab/i)
    })

    it('reproduces the copyright notices found in the copied files, verbatim', () => {
      expect(doc).toContain('(c) jQuery Foundation | jquery.org/license')
      expect(doc).toContain('Copyright 2012 WooThemes')
      expect(doc).toContain('Copyright 2013-2016 WeCodePixels and other contributors')
      expect(doc).toContain('Copyright 2015, Themedo')
      expect(doc).toContain('Designed by FriendLab')
    })

    it('every third-party file path it cites actually exists in the repo', () => {
      const citedPaths = [
        'public/photobuddy/js/jquery.js',
        'public/photobuddy/css/flexslider.css',
        'public/photobuddy/js/flexslider.js',
        'public/photobuddy/js/sticky-sidebar.js',
        'public/photobuddy/css/skeleton.css',
      ]
      for (const p of citedPaths) {
        expect(fs.existsSync(path.join(root, p))).toBe(true)
      }
    })

    it('the cited copyright/licence lines are actually present in the source files it credits (not fabricated)', () => {
      expect(read('public/photobuddy/js/jquery.js').slice(0, 200)).toContain(
        '(c) jQuery Foundation | jquery.org/license'
      )
      expect(read('public/photobuddy/css/flexslider.css')).toContain('Copyright 2012 WooThemes')
      expect(read('public/photobuddy/js/sticky-sidebar.js')).toContain(
        'Copyright 2013-2016 WeCodePixels and other contributors'
      )
      expect(read('public/photobuddy/css/skeleton.css')).toContain('Copyright 2015, Themedo')
      expect(read('public/photobuddy/index.html')).toContain('Designed by')
    })

    it('flags the Skeleton grid file as carrying no stated licence, rather than assuming one', () => {
      expect(doc).toMatch(/not stated in the file/i)
    })

    it('references the notice-completeness logic that backs this document', () => {
      expect(doc).toContain('src/lib/thirdPartyNotices.ts')
      expect(doc).toContain('checkNoticeCompleteness')
    })
  })
})
