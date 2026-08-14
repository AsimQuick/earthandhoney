/**
 * ---
 * file: src/__tests__/us37-ac37.6.2.3-seo-assistant-field-source-guard.test.ts
 * project: earthandhoney
 * purpose: Verify AC-37.6.2.3's structural rules by static source inspection
 *          — the parts a live admin round trip can't pin as directly, in the
 *          established shape of
 *          us37-ac37.4.3-sitemap-image-source-guard.test.ts.
 *          `src/components/admin/SeoAssistant/SeoAssistantField.tsx` resolves
 *          placed-gallery images through the SAME Flow A boundary the public
 *          routes and sitemap already use — `resolveGalleryPlacementImages`
 *          (src/lib/backstageGalleryPlacement.ts) — never a second Backstage
 *          client (no direct `@/lib/backstageClient` import, no `fetch` call
 *          of its own) and never a query against anything Backstage-owned
 *          (Reminder 4): the only Payload collections this file ever queries
 *          by name are `pages` and `stories`. It performs no
 *          create/update/delete anywhere — this mount is read-only, matching
 *          SeoAssistantPanel's own no-input-rendered contract
 *          (us37-ac37.6.2-seo-assistant-panel.test.tsx). And it is the ONLY
 *          file under src/components/admin/SeoAssistant/ and
 *          src/lib/seoAssistant.ts that imports `payload` — `SeoAssistantPanel`
 *          and `buildSeoAssistantSnapshot` stay payload-import-free pure
 *          functions, so there is never a second place a document gets
 *          resolved for this feature. Finally, both `src/collections/Pages.ts`
 *          and `src/collections/Stories.ts` are checked to actually register
 *          the field as a Payload `ui` field pointing at this component, and
 *          the committed import map (src/app/(payload)/admin/importMap.js) is
 *          checked to resolve that exact `path#exportName` key — a Payload 3
 *          mount is only half done without the map entry, since the admin
 *          renders nothing for a component it cannot resolve however correct
 *          the registration itself looks. Each
 *          guard carries a self-test proving it actually detects a planted
 *          violation, the same technique
 *          us37-ac37.6.2.1-no-meta-keywords-guard.test.ts uses. `payload` is
 *          an ESM-only package that breaks Jest's interop boundary when
 *          imported directly (see us3-ac3.5-galleries-api-read.test.ts), so
 *          this suite reads source text rather than importing
 *          SeoAssistantField.tsx — a real render against the actual admin is
 *          AC-37.6.3's evidence, not this suite's.
 * created-by: dev-team
 * related-story: US-37
 * related-ac: 37.6.2.3
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const SEO_ASSISTANT_DIR = 'src/components/admin/SeoAssistant'
const FIELD_PATH = `${SEO_ASSISTANT_DIR}/SeoAssistantField.tsx`
const PANEL_PATH = `${SEO_ASSISTANT_DIR}/SeoAssistantPanel.tsx`
const SNAPSHOT_LIB_PATH = 'src/lib/seoAssistant.ts'
const PAGES_COLLECTION_PATH = 'src/collections/Pages.ts'
const STORIES_COLLECTION_PATH = 'src/collections/Stories.ts'
const IMPORT_MAP_PATH = 'src/app/(payload)/admin/importMap.js'

/** The `path#exportName` key Payload resolves this field's component through. */
const FIELD_COMPONENT_KEY = '@/components/admin/SeoAssistant/SeoAssistantField#SeoAssistantField'

/**
 * Every file this AC's "only payload importer" rule scopes over — enumerated
 * from the directory rather than listed by hand, so a NEW file dropped under
 * src/components/admin/SeoAssistant/ is covered the moment it exists instead
 * of only once someone remembers to add it here.
 */
const SCOPED_FILES = [
  ...fs
    .readdirSync(path.join(root, SEO_ASSISTANT_DIR))
    .filter((entry) => /\.tsx?$/.test(entry))
    .map((entry) => `${SEO_ASSISTANT_DIR}/${entry}`)
    .sort(),
  SNAPSHOT_LIB_PATH,
]

/** Removes block and line comments so prose describing a rule is never mistaken for violating it. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('AC-37.6.2.3: SeoAssistantField resolves images solely through the Flow A boundary, never a second one', () => {
  it('imports resolveGalleryPlacementImages from backstageGalleryPlacement — the same module the public routes and sitemap use', () => {
    const src = read(FIELD_PATH)
    expect(src).toMatch(
      /import\s*\{\s*resolveGalleryPlacementImages\s*\}\s*from\s*['"]@\/lib\/backstageGalleryPlacement['"]/,
    )
    expect(src).toMatch(/resolveGalleryPlacementImages\(/)
  })

  it('never imports backstageClient directly and makes no fetch call of its own — no second Backstage client', () => {
    const src = stripComments(read(FIELD_PATH))
    expect(src).not.toMatch(/from\s*['"]@\/lib\/backstageClient['"]/)
    expect(src).not.toMatch(/\bfetch\(/)
  })

  it('a placement resolution failure yields no images rather than throwing — no unguarded rejection of resolveGalleryPlacementImages', () => {
    const src = read(FIELD_PATH)
    expect(src).toMatch(/result\.status\s*===\s*['"]ok['"]/)
  })

  it('self-test: a planted second Backstage client would be caught by the checks above', () => {
    const planted = stripComments(`
      import { fetchPublishedGallery } from '@/lib/backstageClient'
      const res = await fetch('https://backstage.internal/api/v1/galleries')
    `)
    expect(planted).toMatch(/from\s*['"]@\/lib\/backstageClient['"]/)
    expect(planted).toMatch(/\bfetch\(/)
  })
})

describe('AC-37.6.2.3: SeoAssistantField queries only the pages/stories Payload collections — no cross-database read of anything Backstage-owned (Reminder 4)', () => {
  it('every literal `collection:` argument is pages or stories', () => {
    const src = read(FIELD_PATH)
    const collectionMatches = Array.from(src.matchAll(/collection:\s*['"]([^'"]+)['"]/g)).map((m) => m[1])
    expect(collectionMatches.length).toBeGreaterThan(0)
    for (const collection of collectionMatches) {
      expect(['pages', 'stories']).toContain(collection)
    }
  })

  it('the one non-literal `collection:` argument (findByID) is the narrowed pages/stories `kind` variable, not an unrestricted string', () => {
    const src = read(FIELD_PATH)
    expect(src).toMatch(/findByID\(\{\s*collection:\s*kind\s*,/)
    expect(src).toMatch(/type SupportedCollection = 'pages' \| 'stories'/)
  })

  it('never queries or names the gallery-placements collection directly — placement data is read only via depth-population', () => {
    const src = read(FIELD_PATH)
    expect(src).not.toMatch(/collection:\s*['"]gallery-placements['"]/)
  })

  it('self-test: a planted Backstage-owned collection query would be caught by the checks above', () => {
    const planted = `payload.find({ collection: 'events', where: {} })`
    const collectionMatches = Array.from(planted.matchAll(/collection:\s*['"]([^'"]+)['"]/g)).map((m) => m[1])
    expect(collectionMatches).toEqual(['events'])
    expect(['pages', 'stories']).not.toContain('events')
  })
})

describe('AC-37.6.2.3: the mount is read-only — no create/update/delete anywhere in the SEO Assistant surface', () => {
  it.each(SCOPED_FILES)('%s performs no payload.create/update/delete call', (rel) => {
    const src = stripComments(read(rel))
    expect(src).not.toMatch(/\.create\(/)
    expect(src).not.toMatch(/\.update\(/)
    expect(src).not.toMatch(/\.delete\(/)
  })

  it('self-test: a planted write call would be caught by the check above', () => {
    const planted = stripComments(`await payload.update({ collection: 'pages', id, data: {} })`)
    expect(planted).toMatch(/\.update\(/)
  })
})

describe('AC-37.6.2.3: SeoAssistantField is the ONLY file under SeoAssistant/ and seoAssistant.ts that imports payload', () => {
  it('finds the files in scope (sanity check for the enumerated file list itself)', () => {
    for (const rel of SCOPED_FILES) {
      expect(fs.existsSync(path.join(root, rel))).toBe(true)
    }
    // A rename that emptied the directory scan would otherwise leave every
    // rule below trivially satisfied over an empty list.
    expect(SCOPED_FILES).toContain(FIELD_PATH)
    expect(SCOPED_FILES).toContain(PANEL_PATH)
  })

  it('exactly one scoped file imports from "payload", and it is SeoAssistantField.tsx', () => {
    const importers = SCOPED_FILES.filter((rel) => /from\s*['"]payload['"]/.test(read(rel)))
    expect(importers).toEqual([FIELD_PATH])
  })

  it('SeoAssistantPanel and seoAssistant.ts stay payload-import-free — pure functions taking already-resolved input', () => {
    for (const rel of [PANEL_PATH, SNAPSHOT_LIB_PATH]) {
      expect(read(rel)).not.toMatch(/from\s*['"]payload['"]/)
    }
  })

  it('self-test: a planted payload import in the panel would be caught by the check above', () => {
    expect(`import { getPayload } from 'payload'`).toMatch(/from\s*['"]payload['"]/)
  })
})

describe('AC-37.6.2.3: the field is registered as a Payload ui field on both pages and stories', () => {
  it.each([
    ['pages', PAGES_COLLECTION_PATH],
    ['stories', STORIES_COLLECTION_PATH],
  ])('%s registers the seoAssistant ui field pointing at SeoAssistantField, at a named line', (_collection, rel) => {
    const src = read(rel)
    const lines = src.split('\n')
    const fieldNameLine = lines.findIndex((line) => /name:\s*'seoAssistant'/.test(line))
    expect(fieldNameLine).toBeGreaterThan(-1)

    // The registration block: name -> type: 'ui' -> components.Field pointing
    // at this exact module#export, within a small window after the name line.
    const block = lines.slice(fieldNameLine, fieldNameLine + 8).join('\n')
    expect(block).toMatch(/type:\s*'ui'/)
    expect(block).toMatch(
      /Field:\s*'@\/components\/admin\/SeoAssistant\/SeoAssistantField#SeoAssistantField'/,
    )
  })

  it('self-test: a planted field missing the ui type would be caught by the block check above', () => {
    const planted = [`name: 'seoAssistant'`, `type: 'text'`].join('\n')
    expect(planted).not.toMatch(/type:\s*'ui'/)
  })

  // Registering the field on a collection is only half a Payload 3 mount: the
  // admin resolves `admin.components.Field` through the generated import map
  // (src/app/(payload)/admin/importMap.js, a committed artifact — see
  // node_modules/payload/dist/bin/generateImportMap/), so a registration whose
  // component is absent from that map renders nothing at all in the real
  // admin. This guard is what keeps the two halves in step.
  it('the generated import map resolves the component both collections point at', () => {
    const importMap = read(IMPORT_MAP_PATH)
    expect(importMap).toMatch(
      /import\s*\{\s*SeoAssistantField\s+as\s+(SeoAssistantField_[0-9a-f]{32})\s*\}\s*from\s*'@\/components\/admin\/SeoAssistant\/SeoAssistantField'/,
    )
    const identifier = importMap.match(/import\s*\{\s*SeoAssistantField\s+as\s+(SeoAssistantField_[0-9a-f]{32})\s*\}/)?.[1]
    expect(importMap).toContain(`"${FIELD_COMPONENT_KEY}": ${identifier}`)
  })

  it.each([
    ['pages', PAGES_COLLECTION_PATH],
    ['stories', STORIES_COLLECTION_PATH],
  ])('%s points at exactly the import map key, character for character', (_collection, rel) => {
    expect(read(rel)).toContain(`Field: '${FIELD_COMPONENT_KEY}'`)
  })

  it('self-test: a component key absent from the import map would be caught by the check above', () => {
    expect(read(IMPORT_MAP_PATH)).not.toContain('@/components/admin/SeoAssistant/NotMounted#NotMounted')
  })
})

describe('AC-37.6.2.3: every file carries the CLAUDE.md structured metadata header naming US-37 / AC-37.6.2.3', () => {
  it.each([FIELD_PATH, PAGES_COLLECTION_PATH, STORIES_COLLECTION_PATH])(
    '%s names related-story US-37 and related-ac 37.6.2.3',
    (rel) => {
      const src = read(rel)
      expect(src).toMatch(/related-story:\s*US-37/)
      expect(src).toMatch(/related-ac:\s*37\.6\.2\.3/)
    },
  )
})
