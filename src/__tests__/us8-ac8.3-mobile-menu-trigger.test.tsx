/**
 * ---
 * file: src/__tests__/us8-ac8.3-mobile-menu-trigger.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-8.3 — a mobile menu trigger (client component) toggles
 *          the vertical menu drawer, delivering mobile-first navigation
 *          (the menu collapses on small viewports and opens on tap).
 * created-by: dev-team
 * related-story: US-8
 * related-ac: 8.3
 * ---
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import { MobileMenuProvider } from '@/components/layout/MobileMenuContext'
import { MobileMenuTrigger } from '@/components/layout/MobileMenuTrigger'
import { PublicShell } from '@/components/layout/PublicShell'
import { VerticalMenu } from '@/components/layout/VerticalMenu'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const TRIGGER_PATH = 'src/components/layout/MobileMenuTrigger.tsx'
const CONTEXT_PATH = 'src/components/layout/MobileMenuContext.tsx'
const VERTICAL_MENU_PATH = 'src/components/layout/VerticalMenu.tsx'
const SHELL_PATH = 'src/components/layout/PublicShell.tsx'

function renderWithProvider(children: React.ReactNode) {
  return render(<MobileMenuProvider>{children}</MobileMenuProvider>)
}

describe('AC-8.3: MobileMenuTrigger is a client component', () => {
  it("MobileMenuTrigger.tsx starts with a 'use client' directive", () => {
    const src = read(TRIGGER_PATH)
    expect(src).toMatch(/^\/\*\*[\s\S]*?\*\/\s*['"]use client['"]/)
  })

  it("MobileMenuContext.tsx (the shared toggle state) also starts with 'use client'", () => {
    const src = read(CONTEXT_PATH)
    expect(src).toMatch(/^\/\*\*[\s\S]*?\*\/\s*['"]use client['"]/)
  })
})

describe('AC-8.3: the trigger toggles the vertical menu drawer', () => {
  it('the vertical menu starts closed', () => {
    renderWithProvider(
      <>
        <VerticalMenu />
        <MobileMenuTrigger />
      </>,
    )

    expect(screen.getByTestId('vertical-menu')).toHaveAttribute('data-state', 'closed')
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('tapping the trigger opens the drawer', () => {
    renderWithProvider(
      <>
        <VerticalMenu />
        <MobileMenuTrigger />
      </>,
    )

    fireEvent.click(screen.getByTestId('mobile-menu-trigger').querySelector('button')!)

    expect(screen.getByTestId('vertical-menu')).toHaveAttribute('data-state', 'open')
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('tapping the trigger again closes the drawer', () => {
    renderWithProvider(
      <>
        <VerticalMenu />
        <MobileMenuTrigger />
      </>,
    )

    const button = screen.getByTestId('mobile-menu-trigger').querySelector('button')!
    fireEvent.click(button)
    fireEvent.click(button)

    expect(screen.getByTestId('vertical-menu')).toHaveAttribute('data-state', 'closed')
  })

  it("the trigger button references the drawer it controls via aria-controls", () => {
    renderWithProvider(
      <>
        <VerticalMenu />
        <MobileMenuTrigger />
      </>,
    )

    const button = within(screen.getByTestId('mobile-menu-trigger')).getByRole('button')
    expect(button).toHaveAttribute('aria-controls', 'vertical-menu')
    expect(screen.getByTestId('vertical-menu')).toHaveAttribute('id', 'vertical-menu')
  })
})

describe('AC-8.3: VerticalMenu still renders standalone (no provider) for AC-8.1 compatibility', () => {
  it('defaults to closed when rendered without a MobileMenuProvider', () => {
    render(<VerticalMenu />)

    expect(screen.getByTestId('vertical-menu')).toHaveAttribute('data-state', 'closed')
  })
})

describe('AC-8.3: mobile-first collapse/reveal styling', () => {
  it('the drawer is off-canvas by default and only translated into view at the lg breakpoint', () => {
    render(<VerticalMenu />)

    const menu = screen.getByTestId('vertical-menu')
    expect(menu.className).toMatch(/-translate-x-full/)
    expect(menu.className).toMatch(/lg:translate-x-0/)
  })

  it('opening the drawer overrides the off-canvas transform below the lg breakpoint', () => {
    renderWithProvider(
      <>
        <VerticalMenu />
        <MobileMenuTrigger />
      </>,
    )

    fireEvent.click(screen.getByTestId('mobile-menu-trigger').querySelector('button')!)

    const classes = screen.getByTestId('vertical-menu').className.split(/\s+/)
    expect(classes).toContain('translate-x-0')
  })

  it('the trigger itself is hidden at the lg desktop breakpoint', () => {
    renderWithProvider(<MobileMenuTrigger />)

    expect(screen.getByTestId('mobile-menu-trigger').className).toMatch(/lg:hidden/)
  })
})

describe('AC-8.3: PublicShell composes the trigger and provider into the shared shell', () => {
  it('imports and renders MobileMenuProvider and MobileMenuTrigger', () => {
    const src = read(SHELL_PATH)

    expect(src).toMatch(/from ['"]\.\/MobileMenuContext['"]/)
    expect(src).toMatch(/from ['"]\.\/MobileMenuTrigger['"]/)
    expect(src).toMatch(/<MobileMenuProvider>/)
    expect(src).toMatch(/<MobileMenuTrigger\s*\/>/)
  })

  it('rendering PublicShell exposes both the drawer and its trigger', () => {
    render(
      <PublicShell>
        <p data-testid="page-content">hello</p>
      </PublicShell>,
    )

    const shell = screen.getByTestId('site-shell')
    expect(within(shell).getByTestId('vertical-menu')).toBeInTheDocument()
    expect(within(shell).getByTestId('mobile-menu-trigger')).toBeInTheDocument()
  })

  it('tapping the trigger inside the full shell opens the same drawer it renders', () => {
    render(
      <PublicShell>
        <p data-testid="page-content">hello</p>
      </PublicShell>,
    )

    fireEvent.click(screen.getByTestId('mobile-menu-trigger').querySelector('button')!)

    expect(screen.getByTestId('vertical-menu')).toHaveAttribute('data-state', 'open')
  })
})

describe('AC-8.3: chrome markup mirrors the template menu-trigger structure', () => {
  it('the template menu trigger uses the photobuddy_fl_menu_trigger + menu_on/menu_a/menu_b/menu_c classes (sanity check against the real template)', () => {
    const template = read('public/photobuddy/index.html')

    expect(template).toContain('photobuddy_fl_menu_trigger')
    expect(template).toContain('menu_on')
    expect(template).toContain('menu_a')
    expect(template).toContain('menu_b')
    expect(template).toContain('menu_c')
  })

  it('MobileMenuTrigger reuses those template class names', () => {
    const src = read(TRIGGER_PATH)

    expect(src).toContain('photobuddy_fl_menu_trigger')
    expect(src).toContain('menu_on')
    expect(src).toContain('menu_a')
    expect(src).toContain('menu_b')
    expect(src).toContain('menu_c')
  })

  it('VerticalMenu keeps its template class name and id used by aria-controls', () => {
    const src = read(VERTICAL_MENU_PATH)

    expect(src).toContain('photobuddy_fl_vertical_menu')
    expect(src).toMatch(/id=["']vertical-menu["']/)
  })
})
