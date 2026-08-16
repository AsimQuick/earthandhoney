/**
 * ---
 * file: src/__tests__/us37-ac37.6-no-meta-keywords-guard.test.ts
 * project: earthandhoney
 * purpose: AC-37.6's standing guard — fails if a meta-keywords field is ever
 *          added anywhere. PRD §21.2 forbids one, so this suite checks the
 *          two places one could appear: (1) the authored field tree of every
 *          Payload collection and global (walked recursively, so a `keywords`
 *          field nested inside an array/group/tab/row is caught too), and
 *          (2) the emitted output — every non-test source file under `src/`,
 *          comments stripped, may never carry a `keywords` identifier, key or
 *          `<meta name="keywords">` tag. It also holds the second half of
 *          AC-37.6's rule: tags stay internal relationships — `Pages.tags`
 *          exists (PRD §13.1) but is never read by the SEO Assistant nor
 *          emitted by a public route. Complements, rather than duplicates,
 *          us24-ac24.5-studio-profile-seo-output.test.tsx, which asserts the
 *          same prohibition for `StudioProfile` and the root layout only —
 *          this suite is repo-wide and outlives US-37. Each guard carries a
 *          self-test proving it actually detects a planted violation, so the
 *          standing assertions are not vacuously green (the same technique
 *          us36-ac36.5-no-blog-chrome.test.tsx uses).
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6
 * ---
 */
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { Forms } from '@/collections/Forms'
import { GalleryPlacements } from '@/collections/GalleryPlacements'
import { Inquiries } from '@/collections/Inquiries'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { Stories } from '@/collections/Stories'
import { Users } from '@/collections/Users'
import { Navigation } from '@/globals/Navigation'
import { StudioProfile } from '@/globals/StudioProfile'
import { buildSeoAssistantSnapshot, type SeoAssistantInput } from '@/lib/seoAssistant'

const root = process.cwd()

/** Every authored field-name spelling of a meta-keywords surface this guard rejects. */
const FORBIDDEN_FIELD_NAME = /^(meta[-_]?)?keywords$|^seo[-_]?keywords$/i

const FIELD_OWNERS: Array<{ label: string; fields: Field[] }> = [
  { label: 'Users', fields: Users.fields },
  { label: 'Media', fields: Media.fields },
  { label: 'GalleryPlacements', fields: GalleryPlacements.fields },
  { label: 'Pages', fields: Pages.fields },
  { label: 'Stories', fields: Stories.fields },
  { label: 'Forms', fields: Forms.fields },
  { label: 'Inquiries', fields: Inquiries.fields },
  { label: 'StudioProfile', fields: StudioProfile.fields },
  { label: 'Navigation', fields: Navigation.fields },
]

/** Collects every field name in a field tree, descending through arrays, groups, rows, collapsibles and tabs. */
function collectFieldNames(fields: Field[], out: string[] = []): string[] {
  for (const field of fields) {
    if ('name' in field && typeof field.name === 'string') {
      out.push(field.name)
    }
    if ('fields' in field && Array.isArray(field.fields)) {
      collectFieldNames(field.fields as Field[], out)
    }
    if ('tabs' in field && Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        collectFieldNames(tab.fields as Field[], out)
      }
    }
  }
  return out
}

function keywordFieldOffenders(fields: Field[]): string[] {
  return collectFieldNames(fields).filter((name) => FORBIDDEN_FIELD_NAME.test(name))
}

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

describe('US-37 AC-37.6: no meta-keywords field exists in any Payload collection or global', () => {
  it('walks a non-trivial number of fields, so the walker itself is not silently empty', () => {
    const total = FIELD_OWNERS.reduce((count, owner) => count + collectFieldNames(owner.fields).length, 0)
    expect(total).toBeGreaterThan(40)
  })

  it.each(FIELD_OWNERS.map((owner) => [owner.label, owner.fields] as const))(
    '%s carries no keywords/metaKeywords/seoKeywords field, at any nesting depth',
    (_label, fields) => {
      expect(keywordFieldOffenders(fields)).toEqual([])
    },
  )

  it('self-test: the walker actually catches a planted keywords field, proving the guard is not vacuous', () => {
    const planted: Field[] = [
      { name: 'heading', type: 'text' },
      {
        name: 'seo',
        type: 'group',
        fields: [{ name: 'metaKeywords', type: 'text' }],
      },
    ]
    expect(keywordFieldOffenders(planted)).toEqual(['metaKeywords'])
  })
})

describe('US-37 AC-37.6: no source file emits a meta-keywords surface', () => {
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

describe('US-37 AC-37.6: the SEO Assistant itself never introduces one', () => {
  const INPUT: SeoAssistantInput = {
    kind: 'page',
    h1: 'Wedding Photography',
    seoTitle: '',
    slug: 'weddings',
    path: '/weddings',
    metaDescription: '',
    photographyType: 'wedding',
    cityRegion: 'Dubai',
    venue: '',
    indexing: 'index',
    openGraphImageUrl: null,
    titlePattern: '%s | Earth & Honey Studios',
    defaultMetaDescription: 'Earth & Honey Studios.',
    schemaPreview: {},
    images: [],
    candidates: [],
  }

  it('the snapshot exposes exactly the fourteen PRD §21.2 controls plus its document kind — no keywords, no tags', () => {
    const snapshot = buildSeoAssistantSnapshot(INPUT)
    expect(Object.keys(snapshot).sort()).toEqual(
      [
        'kind',
        'searchResultPreview',
        'seoTitle',
        'slug',
        'metaDescription',
        'canonicalUrl',
        'h1Preview',
        'photographyType',
        'cityRegion',
        'venue',
        'openGraphImageUrl',
        'indexing',
        'schemaPreview',
        'missingAltText',
        'internalLinkSuggestions',
      ].sort(),
    )
    expect(snapshot).not.toHaveProperty('keywords')
    expect(snapshot).not.toHaveProperty('tags')
  })
})

describe('US-37 AC-37.6: tags remain internal relationships only', () => {
  const PUBLIC_SOURCES = [
    'src/app/(frontend)/layout.tsx',
    'src/app/(frontend)/[slug]/page.tsx',
    'src/app/(frontend)/stories/[slug]/page.tsx',
    'src/lib/studioStructuredData.ts',
    'src/lib/seoAssistant.ts',
    'src/components/admin/SeoAssistant/SeoAssistantPanel.tsx',
    'src/components/admin/SeoAssistant/SeoAssistantField.tsx',
  ]

  it('Pages still carries the PRD §13.1 internal tags field — this guard constrains its use, it does not delete it', () => {
    const tags = Pages.fields.find((field) => 'name' in field && field.name === 'tags')
    expect(tags?.type).toBe('array')
  })

  it.each(PUBLIC_SOURCES)('%s never reads tags into public output or the SEO Assistant', (rel) => {
    const code = stripComments(fs.readFileSync(path.join(root, rel), 'utf8'))
    expect(code).not.toMatch(/\btags\b/)
  })
})
