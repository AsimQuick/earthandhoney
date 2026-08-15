/**
 * ---
 * file: src/__tests__/us37-ac37.6.2.1-no-meta-keywords-guard.test.ts
 * project: earthandhoney
 * purpose: AC-37.6.2.1's standing guard — the repo-wide sweep across the SEO
 *          Assistant's own output that us37-ac37.6.1-no-meta-keywords-guard.test.ts's
 *          header explicitly deferred to this AC "once that surface exists".
 *          That suite already covers `Pages`/`Stories`' authored field trees;
 *          this suite covers the NEW surface AC-37.6.2.1 adds —
 *          src/lib/seoAssistant.ts and its computed output — plus a
 *          source-text sweep over every non-test file under `src/`, so a
 *          `keywords` identifier, object key or `<meta name="keywords">` tag
 *          introduced ANYWHERE in the tree (not only in this AC's own files)
 *          is caught, including by whichever later sub-AC adds the SEO
 *          Assistant's rendering (AC-37.6.2.2) and its Payload wiring
 *          (AC-37.6.2.3) — the sweep is source-directory-wide, so neither of
 *          those files needs to be named here to already be covered once it
 *          exists. Also proves the second half of the PRD §21.2 rule: `tags`
 *          stays an internal relationship only — `seoAssistant.ts` never
 *          reads or exposes it. Each guard carries a self-test proving it
 *          actually detects a planted violation, so the standing assertions
 *          are not vacuously green (the same technique
 *          us36-ac36.5-no-blog-chrome.test.tsx uses).
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.2.1
 * ---
 */
import fs from 'fs'
import path from 'path'

import { buildSeoAssistantSnapshot, type SeoAssistantInput } from '@/lib/seoAssistant'

const root = process.cwd()

/** Removes block and line comments so prose describing the prohibition is never mistaken for an implementation of it. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Test sources are excluded deliberately: this suite and its
      // neighbours must be free to *name* the prohibited field in order to
      // assert its absence. Product surface is what the guard covers.
      if (entry.name === '__tests__' || entry.name === '__fixtures__' || entry.name === 'test-support') continue
      collectSourceFiles(full, out)
    } else if (['.ts', '.tsx'].includes(path.extname(entry.name))) {
      out.push(path.relative(root, full))
    }
  }
  return out
}

const sourceFiles = collectSourceFiles(path.join(root, 'src'))
/** The only SEO Assistant surface AC-37.6.2.1 itself builds — the panel (37.6.2.2) and its Payload wiring (37.6.2.3) are covered by the source-directory-wide sweep above once they exist, without needing to be named here. */
const SEO_ASSISTANT_SOURCES = ['src/lib/seoAssistant.ts']

describe('US-37 AC-37.6.2.1: no source file emits a meta-keywords surface', () => {
  it('finds source files to scan (sanity check for the walker itself)', () => {
    expect(sourceFiles.length).toBeGreaterThan(20)
  })

  it.each(sourceFiles)('%s contains no keywords key, identifier or <meta name="keywords"> tag', (rel) => {
    const code = stripComments(fs.readFileSync(path.join(root, rel), 'utf8'))
    expect(code).not.toMatch(/keywords/i)
  })

  it('self-test: the scanner catches each planted spelling, proving the guard is not vacuous', () => {
    const planted = [
      `export const metadata = { keywords: ['wedding'] }`,
      `<meta name="keywords" content="wedding" />`,
      `const metaKeywords = tags.join(',')`,
    ]
    for (const source of planted) {
      expect(stripComments(source)).toMatch(/keywords/i)
    }
  })

  it('self-test: the scanner ignores a comment describing the prohibition, so prose cannot trip it', () => {
    expect(stripComments('// No `keywords` field is set here — PRD §21.2 forbids one.\nconst a = 1')).not.toMatch(
      /keywords/i,
    )
  })
})

describe('US-37 AC-37.6.2.1: the seoAssistant.ts module exists and was actually scanned above', () => {
  it.each(SEO_ASSISTANT_SOURCES)('%s exists on disk, so the sweep above is not vacuously scanning zero seoAssistant.ts source file', (rel) => {
    expect(fs.existsSync(path.join(root, rel))).toBe(true)
    expect(sourceFiles).toContain(rel)
  })
})

describe('US-37 AC-37.6.2.1: the computed snapshot itself never introduces a keywords or tags surface', () => {
  const INPUT: SeoAssistantInput = {
    kind: 'page',
    h1: 'Wedding Photography',
    path: '/weddings',
    resolvedTitleSegment: 'Wedding Photography',
    resolvedDescription: 'Documentary wedding photography across Dubai and the UAE.',
    titlePattern: '%s | Earth & Honey Studios',
    photographyType: 'wedding',
    cityRegion: 'Dubai',
    schemaPreview: {},
    images: [],
    candidates: [],
  }

  it('the snapshot exposes exactly the six DERIVED controls plus its document kind — no keywords, no tags', () => {
    const snapshot = buildSeoAssistantSnapshot(INPUT)
    expect(Object.keys(snapshot).sort()).toEqual(
      ['kind', 'searchResultPreview', 'canonicalUrl', 'h1Preview', 'schemaPreview', 'missingAltText', 'internalLinkSuggestions'].sort(),
    )
    expect(snapshot).not.toHaveProperty('keywords')
    expect(snapshot).not.toHaveProperty('tags')
  })
})

describe('US-37 AC-37.6.2.1: tags remain internal relationships only', () => {
  it.each(SEO_ASSISTANT_SOURCES)('%s never reads tags into the SEO Assistant', (rel) => {
    const code = stripComments(fs.readFileSync(path.join(root, rel), 'utf8'))
    expect(code).not.toMatch(/\btags\b/)
  })
})
