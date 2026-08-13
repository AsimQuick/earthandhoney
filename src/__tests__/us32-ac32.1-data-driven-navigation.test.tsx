/**
 * ---
 * file: src/__tests__/us32-ac32.1-data-driven-navigation.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-32.1 — site navigation is data-driven through the
 *          Payload `Navigation` global (NAVIGATION_ADR.md's chosen option),
 *          the hard-coded photobuddy link array is gone from
 *          VerticalMenu.tsx, and the menu renders from data threaded down
 *          from the (frontend) root layout through PublicShell.
 * created-by: dev-team
 * related-story: US-32
 * related-ac: 32.1
 * ---
 */
import { render, screen, within } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import type { Field } from 'payload'

import { VerticalMenu } from '@/components/layout/VerticalMenu'
import { Navigation } from '@/globals/Navigation'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const VERTICAL_MENU_PATH = 'src/components/layout/VerticalMenu.tsx'
const PUBLIC_SHELL_PATH = 'src/components/layout/PublicShell.tsx'
const LAYOUT_PATH = 'src/app/(frontend)/layout.tsx'
const GET_NAV_ITEMS_PATH = 'src/lib/getNavItems.ts'
const PAYLOAD_CONFIG_PATH = 'src/payload.config.ts'
const NAVIGATION_GLOBAL_PATH = 'src/globals/Navigation.ts'
const ADR_PATH = 'NAVIGATION_ADR.md'

function fieldByName(fields: Field[], name: string): Field | undefined {
  return fields.find((field) => 'name' in field && field.name === name)
}

describe('AC-32.1: the hard-coded photobuddy link array is gone from VerticalMenu.tsx', () => {
  const src = read(VERTICAL_MENU_PATH)

  it('carries no NAV_LINKS constant or any other literal route array', () => {
    expect(src).not.toMatch(/NAV_LINKS/)
    expect(src).not.toMatch(/href:\s*['"]\/about['"]/)
    expect(src).not.toMatch(/href:\s*['"]\/galleries['"]/)
    expect(src).not.toMatch(/href:\s*['"]\/blog['"]/)
    expect(src).not.toMatch(/href:\s*['"]\/contact['"]/)
    expect(src).not.toMatch(/label:\s*['"]home['"]/)
  })

  it('accepts a navItems prop instead', () => {
    expect(src).toMatch(/navItems\s*\??:\s*NavItem\[\]/)
    expect(src).toMatch(/navItems\.map\(/)
  })
})

describe('AC-32.1: VerticalMenu renders the primary nav from the navItems prop it is given', () => {
  it('renders exactly the items passed, in the order given, with real hrefs/labels', () => {
    render(
      <VerticalMenu
        navItems={[
          { href: '/weddings', label: 'weddings' },
          { href: '/engagements', label: 'engagements' },
          { href: '/details', label: 'details' },
        ]}
      />,
    )

    const nav = screen.getByTestId('primary-nav')
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['weddings', 'engagements', 'details'])
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/weddings', '/engagements', '/details'])
  })

  it('renders no nav links when given no navItems (a page that is draft/excluded simply drops out — AC-32.3 groundwork)', () => {
    render(<VerticalMenu />)

    const nav = screen.getByTestId('primary-nav')
    expect(within(nav).queryAllByRole('link')).toHaveLength(0)
  })

  it('the accessible "Primary" nav landmark still exists (AC-32.5 groundwork)', () => {
    render(<VerticalMenu navItems={[{ href: '/weddings', label: 'weddings' }]} />)

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })
})

describe('AC-32.1: the nav data flows from the root layout, through PublicShell, into VerticalMenu', () => {
  it('PublicShell accepts a navItems prop and forwards it to VerticalMenu', () => {
    const src = read(PUBLIC_SHELL_PATH)
    expect(src).toMatch(/navItems/)
    expect(src).toMatch(/<VerticalMenu\s+businessName=\{businessName\}\s+navItems=\{navItems\}/)
  })

  it('the root layout fetches nav items via src/lib/getNavItems.ts and passes them into PublicShell', () => {
    const src = read(LAYOUT_PATH)
    expect(src).toMatch(/from ["']@\/lib\/getNavItems["']/)
    expect(src).toMatch(/await getNavItems\(\)/)
    expect(src).toMatch(/<PublicShell\s+businessName=\{studioProfile\.businessName\}\s+navItems=\{navItems\}/)
  })
})

describe('AC-32.1: src/lib/getNavItems.ts reads the Payload Navigation global via the Local API', () => {
  const src = read(GET_NAV_ITEMS_PATH)

  it('exists and carries the CLAUDE.md structured metadata header naming AC-32.1', () => {
    expect(exists(GET_NAV_ITEMS_PATH)).toBe(true)
    const header = src.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/\*\s*related-story:\s*US-32/)
    expect(header).toMatch(/\*\s*related-ac:\s*32\.1/)
  })

  it('reads the navigation global via the Payload Local API', () => {
    expect(src).toMatch(/from ['"]payload['"]/)
    expect(src).toMatch(/getPayload\s*\(/)
    expect(src).toMatch(/findGlobal\s*\(\s*\{\s*slug:\s*['"]navigation['"]/)
  })

  it('filters resolved pages to published and included-in-menu before returning', () => {
    expect(src).toMatch(/status\s*===\s*['"]published['"]/)
    expect(src).toMatch(/includeInMenu\s*!==\s*false/)
  })

  it('never imports directly by a Jest test (follows the repo\'s Payload ESM-boundary convention)', () => {
    // Sanity check on the convention itself, not the file under test: this
    // suite reaches getNavItems.ts only through source reads (`read`), never
    // a runtime `import`, matching src/lib/getPageBySlug.ts and
    // src/lib/getStudioProfile.ts.
    const thisTestSource = read('src/__tests__/us32-ac32.1-data-driven-navigation.test.tsx')
    expect(thisTestSource).not.toMatch(/from ['"]@\/lib\/getNavItems['"]/)
  })
})

describe('AC-32.1: the Payload Navigation global — the chosen data-driven mechanism', () => {
  it('is a global with the expected slug', () => {
    expect(Navigation.slug).toBe('navigation')
  })

  it('is registered on the Payload config', () => {
    const configSource = read(PAYLOAD_CONFIG_PATH)
    expect(configSource).toMatch(/import\s*\{\s*Navigation\s*\}\s*from\s*['"]\.\/globals\/Navigation['"]/)
    expect(configSource).toMatch(/globals:\s*\[[^\]]*Navigation[^\]]*\]/)
  })

  it('carries an ordered `items` array of relationships into the pages collection', () => {
    const itemsField = fieldByName(Navigation.fields, 'items')
    expect(itemsField?.type).toBe('array')
    const subFields = ('fields' in itemsField! ? (itemsField.fields as Field[]) : []) ?? []
    const pageField = fieldByName(subFields, 'page')
    expect(pageField?.type).toBe('relationship')
    expect(pageField && 'relationTo' in pageField ? pageField.relationTo : undefined).toBe('pages')
    expect(pageField && 'required' in pageField ? pageField.required : undefined).toBe(true)
  })

  it('carries the CLAUDE.md structured metadata header naming AC-32.1', () => {
    const src = read(NAVIGATION_GLOBAL_PATH)
    const header = src.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? ''
    expect(header).toMatch(/\*\s*related-story:\s*US-32/)
    expect(header).toMatch(/\*\s*related-ac:\s*32\.1/)
  })
})

describe('AC-32.1: NAVIGATION_ADR.md records the option chosen, the option rejected, and the reason (DoD item 6)', () => {
  it('exists at the repo root', () => {
    expect(exists(ADR_PATH)).toBe(true)
  })

  const doc = read(ADR_PATH)

  it('names both candidates: the Navigation global and Pages-field derivation', () => {
    expect(doc).toMatch(/Payload `Navigation` global/)
    expect(doc).toMatch(/[Dd]erivation from each page's own fields/)
  })

  it('commits to exactly one option, the Navigation global (option 1)', () => {
    const commitMatches = doc.match(/This ADR commits to \*\*option (\d)\*\*/g) || []
    expect(commitMatches).toHaveLength(1)
    expect(doc).toMatch(/This ADR commits to \*\*option 1\*\* \(a Payload `Navigation` global\)/)
  })

  it('states the reason the rejected option (Pages-field derivation) cannot work: AC-31.1 already closed the Pages field set', () => {
    const match = doc.match(/### Reasons rejected: Pages-field derivation \(option 2\)\n\n([\s\S]*?)\n\n###/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/AC-31\.1/)
  })

  it('grounds the reasoning in the real, passing AC-31.1 field-count test', () => {
    expect(doc).toMatch(/us31-ac31\.1-pages-field-set\.test\.ts/)
    expect(exists('src/__tests__/us31-ac31.1-pages-field-set.test.ts')).toBe(true)
  })

  it('has a "what would have to be true to revisit" section', () => {
    const idx = doc.indexOf('### What would have to be true to revisit this decision')
    expect(idx).toBeGreaterThan(-1)
    expect(doc.slice(idx).length).toBeGreaterThan(100)
  })
})
