/**
 * ---
 * file: src/__tests__/us32-ac32.5-mobile-menu-accessibility-survives.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-32.5 — the US-8 mobile menu behaviour
 *          (MobileMenuContext.tsx, MobileMenuTrigger.tsx) and the
 *          primary-navigation landmark survive US-32's data-driven
 *          navigation change, the menu is operable by keyboard alone, and
 *          focus order is correct. Structural survival is proven against
 *          git, not against a description of the old behaviour: the two
 *          mobile-menu files are read from the commit US-32 branched from
 *          (`git merge-base HEAD main`, the "before") and diffed byte-for-
 *          byte against the current working tree (the "after"); the one
 *          file that did change, VerticalMenu.tsx, is checked for its
 *          landmark attributes specifically, with the actual difference
 *          (hard-coded links -> a navItems prop) explained rather than
 *          asserted away. Keyboard operability is exercised with real
 *          Tab/Enter/Space key events via @testing-library/user-event
 *          (fireEvent.keyDown alone does not trigger a native button's
 *          click, so it can't stand in for this). The off-canvas drawer's
 *          focus-order fix (visibility:hidden while closed, so its
 *          off-screen links drop out of the tab order — see globals.css)
 *          is a real CSS cascade that jsdom's unstyled DOM can't observe
 *          directly, so it's verified by compiling globals.css through the
 *          project's real Tailwind pipeline and asserting on the output,
 *          the same technique us31-ac31.3-standard-page-template.test.tsx
 *          uses for token compilation.
 * created-by: dev-team
 * related-story: US-32
 * related-ac: 32.5
 * ---
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import { MobileMenuProvider } from '@/components/layout/MobileMenuContext'
import { MobileMenuTrigger } from '@/components/layout/MobileMenuTrigger'
import { PublicShell } from '@/components/layout/PublicShell'
import { VerticalMenu } from '@/components/layout/VerticalMenu'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const CONTEXT_PATH = 'src/components/layout/MobileMenuContext.tsx'
const TRIGGER_PATH = 'src/components/layout/MobileMenuTrigger.tsx'
const VERTICAL_MENU_PATH = 'src/components/layout/VerticalMenu.tsx'
const GLOBALS_CSS_PATH = 'src/app/(frontend)/globals.css'

// The commit US-32 branched from — the "before" side of the structural
// snapshot. Computed rather than hard-coded so it keeps pointing at the
// right commit even if this suite runs again after main advances further.
const BASE_COMMIT = execFileSync('git', ['merge-base', 'HEAD', 'main'], { cwd: root })
  .toString()
  .trim()

function readAtBase(rel: string): string {
  return execFileSync('git', ['show', `${BASE_COMMIT}:${rel}`], { cwd: root }).toString()
}

describe('AC-32.5: structural snapshot — before (US-32 branch point) vs after (this change)', () => {
  it('MobileMenuContext.tsx is byte-for-byte unchanged: the US-8 open/close state survives untouched', () => {
    expect(read(CONTEXT_PATH)).toBe(readAtBase(CONTEXT_PATH))
  })

  it('MobileMenuTrigger.tsx is byte-for-byte unchanged: the US-8 hamburger trigger survives untouched', () => {
    expect(read(TRIGGER_PATH)).toBe(readAtBase(TRIGGER_PATH))
  })

  it('VerticalMenu.tsx did change (AC-32.1/32.4), but its landmark structure — the part AC-32.5 cares about — did not', () => {
    const before = readAtBase(VERTICAL_MENU_PATH)
    const after = read(VERTICAL_MENU_PATH)

    // The file as a whole is not identical — AC-32.1/32.4 changed how the
    // nav/social content is sourced. Confirms this test isn't vacuously
    // comparing two copies of the same string.
    expect(after).not.toBe(before)

    // What must NOT have changed: the drawer's id (aria-controls target),
    // and the primary nav's accessible name + test hook.
    const landmarkPattern = {
      drawerId: /id=["']vertical-menu["']/,
      navAriaLabel: /aria-label=["']Primary["']/,
      navTestId: /data-testid=["']primary-nav["']/,
    }
    for (const pattern of Object.values(landmarkPattern)) {
      const beforeMatch = before.match(pattern)?.[0]
      const afterMatch = after.match(pattern)?.[0]
      expect(beforeMatch).toBeTruthy()
      expect(afterMatch).toBe(beforeMatch)
    }

    // What DID change, named explicitly: the hard-coded link array is gone
    // and a navItems prop drives the nav instead (AC-32.1's own change).
    expect(before).toMatch(/NAV_LINKS/)
    expect(after).not.toMatch(/NAV_LINKS/)
    expect(after).toMatch(/navItems\.map\(/)
  })
})

describe('AC-32.5: the primary-navigation landmark is reachable through the full shell, not just in isolation', () => {
  it('PublicShell exposes a single "Primary" navigation landmark containing the data-driven links', () => {
    render(
      <PublicShell
        navItems={[
          { href: '/weddings', label: 'weddings' },
          { href: '/engagements', label: 'engagements' },
          { href: '/details', label: 'details' },
        ]}
      >
        <p>page content</p>
      </PublicShell>,
    )

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual([
      'weddings',
      'engagements',
      'details',
    ])
  })
})

describe('AC-32.5: the menu is operable by keyboard alone', () => {
  it('the trigger is reachable by Tab and toggles the drawer on Enter and on Space — real key events, not a mocked click', async () => {
    const user = userEvent.setup()
    render(
      <MobileMenuProvider>
        <VerticalMenu navItems={[{ href: '/weddings', label: 'weddings' }]} />
        <MobileMenuTrigger />
      </MobileMenuProvider>,
    )

    const button = screen.getByRole('button', { name: /open menu/i })
    button.focus()
    expect(document.activeElement).toBe(button)

    await user.keyboard('{Enter}')
    expect(screen.getByTestId('vertical-menu')).toHaveAttribute('data-state', 'open')
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard(' ')
    expect(screen.getByTestId('vertical-menu')).toHaveAttribute('data-state', 'closed')
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute('aria-expanded', 'false')
  })

  it('Tab reaches every interactive element in the shell — logo, nav links, social links, trigger — with no keyboard trap', async () => {
    const user = userEvent.setup()
    render(
      <PublicShell
        businessName="Earth & Honey"
        navItems={[
          { href: '/weddings', label: 'weddings' },
          { href: '/engagements', label: 'engagements' },
        ]}
        socialProfiles={[{ platform: 'instagram', url: 'https://instagram.com/earthandhoney' }]}
      >
        <p>page content</p>
      </PublicShell>,
    )

    const focusableCount = document.querySelectorAll('a[href], button').length

    const visited: Element[] = []
    for (let i = 0; i < focusableCount; i++) {
      await user.tab()
      visited.push(document.activeElement as Element)
    }

    // Every real interactive element in the shell is reachable by Tab
    // alone, and none of them is visited twice before the rest have been
    // — i.e. focus doesn't get stuck looping on a subset of the shell.
    expect(new Set(visited).size).toBe(focusableCount)
    expect(visited).toEqual(Array.from(document.querySelectorAll('a[href], button')))
  })

  it('no interactive element in the mobile-menu chrome uses a positive tabIndex to hand-order focus', () => {
    const src = [read(VERTICAL_MENU_PATH), read(TRIGGER_PATH)].join('\n')
    expect(src).not.toMatch(/tabIndex=\{?["']?[1-9]/)
  })
})

describe('AC-32.5: focus order is correct — the closed off-canvas drawer drops out of the tab order', () => {
  // jsdom never loads globals.css, so it can't observe this cascade
  // directly (the two tests above render an unstyled DOM where every
  // link is "tabbable" regardless of the drawer's open/closed state —
  // exactly the bug this rule fixes in a real browser). Compiling the real
  // stylesheet through the project's own Tailwind pipeline and asserting
  // on the output is the only way to verify the fix without a browser.
  it('globals.css hides the closed drawer from the tab order below `lg`, without breaking the AC-23.4 slide animation', async () => {
    const tailwindPostcss = (await import('@tailwindcss/postcss')).default
    const postcss = (await import('postcss')).default

    const css = read(GLOBALS_CSS_PATH)
    const result = await postcss([tailwindPostcss({ base: root })]).process(css, {
      from: path.join(root, GLOBALS_CSS_PATH),
    })
    const compiled = result.css

    const closedRule = compiled.match(
      /\.photobuddy_fl_vertical_menu\[data-state=['"]closed['"]\]\s*\{([^}]*)\}/,
    )?.[1]
    expect(closedRule).toBeTruthy()
    expect(closedRule).toMatch(/visibility:\s*hidden/)
    // The visibility switch is delayed until the slide-out transform
    // finishes, so the AC-23.4 close animation still plays in full instead
    // of being cut off the instant `isOpen` flips to false.
    expect(closedRule).toMatch(/transition-delay:\s*0s\s*,\s*var\(--motion-duration-base\)/)

    const openRule = compiled.match(
      /\.photobuddy_fl_vertical_menu\[data-state=['"]open['"]\]\s*\{([^}]*)\}/,
    )?.[1]
    expect(openRule).toBeTruthy()
    expect(openRule).toMatch(/visibility:\s*visible/)

    // At `lg` and above the drawer is always visible (VerticalMenu ignores
    // isOpen there), so both data-state values must be forced back to
    // visible inside the desktop media query — otherwise a desktop user,
    // whose drawer starts in the default "closed" state, would tab into an
    // invisible primary nav.
    const desktopOverrideMatch = compiled.match(
      /@media \(width >= 64rem\)\s*\{\s*\.photobuddy_fl_vertical_menu\[data-state=['"]closed['"]\],\s*\.photobuddy_fl_vertical_menu\[data-state=['"]open['"]\]\s*\{([^}]*)\}\s*\}/,
    )
    expect(desktopOverrideMatch).toBeTruthy()
    expect(desktopOverrideMatch?.[1]).toMatch(/visibility:\s*visible/)
  }, 30000)
})
