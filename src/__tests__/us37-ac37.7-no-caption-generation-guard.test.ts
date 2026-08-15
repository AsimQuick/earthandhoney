/**
 * ---
 * file: src/__tests__/us37-ac37.7-no-caption-generation-guard.test.ts
 * project: earthandhoney
 * purpose: AC-37.7's standing guard. AC-37.6.2's missing-alt-text audit
 *          (src/lib/seoAssistant.ts's `auditMissingAltText`, rendered by
 *          src/components/admin/SeoAssistant/SeoAssistantPanel.tsx) already
 *          only REPORTS which placed images lack authored alt text — it never
 *          generates one. This suite makes that boundary a standing,
 *          self-testing assertion rather than a fact that only lives in
 *          those two files' header comments, so a later change cannot quietly
 *          wire in a caption model without failing a test:
 *          (1) no source file under `src/` (product code, not this guard
 *          itself) mentions Florence, a caption-generation identifier, or a
 *          known self-hosted/paid vision-captioning SDK name — the same
 *          repo-wide sweep technique us37-ac37.6.2.1-no-meta-keywords-guard.test.ts
 *          already uses for the meta-keywords prohibition;
 *          (2) `package.json` declares no dependency on any such SDK — the
 *          backlog-item-21/PRD-§21.3 self-hosted caption-suggestion model
 *          (Florence-2 as first candidate) is out of scope until it is
 *          benchmarked for quality, speed, memory and licence, and no
 *          external paid LLM is introduced in the meantime;
 *          (3) `auditMissingAltText`'s output shape (`MissingAltTextEntry`)
 *          carries no generated/suggested-caption field, and calling
 *          `buildSeoAssistantSnapshot` performs no asynchronous work — it is
 *          a plain synchronous function, so there is no network round trip
 *          for it to make.
 *          Each guard carries a self-test proving it actually detects a
 *          planted violation, so the standing assertions are not vacuously
 *          green (the same technique us37-ac37.6.2.1's guard and
 *          us36-ac36.5-no-blog-chrome.test.tsx already use.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.7
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
      // neighbours must be free to *name* the prohibited terms in order to
      // assert their absence. Product surface is what the guard covers.
      if (entry.name === '__tests__' || entry.name === '__fixtures__' || entry.name === 'test-support') continue
      collectSourceFiles(full, out)
    } else if (['.ts', '.tsx'].includes(path.extname(entry.name))) {
      out.push(path.relative(root, full))
    }
  }
  return out
}

const sourceFiles = collectSourceFiles(path.join(root, 'src'))

// Backlog item 21 / PRD §21.3 names Florence-2 as the first benchmarking
// candidate; the rest are the other identifiers a caption-generation
// integration would plausibly introduce — a self-hosted vision-captioning
// runtime or a paid external LLM/vision API.
const FORBIDDEN_CAPTION_TERMS = [
  /florence/i,
  /generat(e|ed|ing)caption/i,
  /suggest(ed)?caption/i,
  /caption(suggestion|model)/i,
  /\bopenai\b/i,
  /@anthropic-ai/i,
  /\bhuggingface\b/i,
  /\breplicate\b/i,
  /\bonnxruntime\b/i,
  /@xenova\/transformers/i,
]

describe('US-37 AC-37.7: no source file wires in caption generation', () => {
  it('finds source files to scan (sanity check for the walker itself)', () => {
    expect(sourceFiles.length).toBeGreaterThan(20)
  })

  it.each(sourceFiles)('%s introduces no caption-generation identifier or SDK reference', (rel) => {
    const code = stripComments(fs.readFileSync(path.join(root, rel), 'utf8'))
    for (const term of FORBIDDEN_CAPTION_TERMS) {
      expect(code).not.toMatch(term)
    }
  })

  it('self-test: the scanner catches each planted spelling, proving the guard is not vacuous', () => {
    const planted = [
      `import { Florence2Model } from 'some-vision-lib'`,
      `async function generateCaption(image) { return callModel(image) }`,
      `const suggestedCaption = await suggestCaption(image)`,
      `import OpenAI from 'openai'`,
      `import Anthropic from '@anthropic-ai/sdk'`,
      `const client = new HuggingFace()`,
      `import Replicate from 'replicate'`,
      `import * as ort from 'onnxruntime-node'`,
      `import { pipeline } from '@xenova/transformers'`,
    ]
    for (const source of planted) {
      const stripped = stripComments(source)
      const matchedAny = FORBIDDEN_CAPTION_TERMS.some((term) => term.test(stripped))
      expect(matchedAny).toBe(true)
    }
  })

  it('self-test: the scanner ignores a comment describing the prohibition, so prose cannot trip it', () => {
    const commentedOut = stripComments(
      '// No Florence-2/caption-generation call is made here — AC-37.7 keeps it out of scope.\nconst a = 1',
    )
    for (const term of FORBIDDEN_CAPTION_TERMS) {
      expect(commentedOut).not.toMatch(term)
    }
  })
})

describe('US-37 AC-37.7: no caption-generation dependency is declared', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  const declaredPackages = [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ]

  it('declares at least one dependency (sanity check that package.json was actually read)', () => {
    expect(declaredPackages.length).toBeGreaterThan(5)
  })

  it.each(declaredPackages)('%s is not a caption-generation/vision-model SDK', (name) => {
    for (const term of FORBIDDEN_CAPTION_TERMS) {
      expect(name).not.toMatch(term)
    }
  })
})

describe('US-37 AC-37.7: the missing-alt-text audit reports only, never generates', () => {
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
    images: [
      { id: 'img-1', alt: 'DSC_0001.jpg' },
      { id: 'img-2', alt: 'US-37 AC-37.4.3 sitemap image reference live verification gallery' },
    ],
    candidates: [],
  }

  it('is a plain synchronous function — it makes no network/model call to compute the audit', () => {
    const result = buildSeoAssistantSnapshot(INPUT)
    // A Promise would mean buildSeoAssistantSnapshot is async; it is not —
    // calling it returns the snapshot object directly, with no `await` and
    // no pending network round trip to a caption model.
    expect(result).not.toBeInstanceOf(Promise)
    expect(result.missingAltText).toHaveLength(2)
  })

  it('every reported entry carries only the fallback that already exists — no generated/suggested-caption field', () => {
    const { missingAltText } = buildSeoAssistantSnapshot(INPUT)
    for (const entry of missingAltText) {
      expect(Object.keys(entry).sort()).toEqual(['fallbackAlt', 'imageId', 'thumbnailUrl'].sort())
      expect(entry).not.toHaveProperty('suggestedCaption')
      expect(entry).not.toHaveProperty('generatedCaption')
      expect(entry).not.toHaveProperty('aiCaption')
    }
    // The fallback text reported is exactly the input's own `alt` value,
    // never a rewritten/model-produced string.
    expect(missingAltText.map((entry) => entry.fallbackAlt)).toEqual(INPUT.images.map((image) => image.alt))
  })

  it('reports every resolved image (PicPeak carries no alt column at all), not a filtered guess at which ones "look" auto-generated', () => {
    const { missingAltText } = buildSeoAssistantSnapshot(INPUT)
    expect(missingAltText.map((entry) => entry.imageId)).toEqual(INPUT.images.map((image) => image.id))
  })
})
