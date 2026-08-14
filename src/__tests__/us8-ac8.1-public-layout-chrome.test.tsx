/**
 * ---
 * file: src/__tests__/us8-ac8.1-public-layout-chrome.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-8.1 — the (frontend) route group's shared public layout
 *          renders the photobuddy chrome (left vertical menu with logo,
 *          primary nav, social icons, and copyright, plus the footer) in
 *          place of the create-next-app placeholder layout.
 * created-by: dev-team
 * related-story: US-8
 * related-ac: 8.1
 * ---
 */
import { render, screen, within } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import { PublicShell } from '@/components/layout/PublicShell'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { VerticalMenu } from '@/components/layout/VerticalMenu'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const LAYOUT_PATH = 'src/app/(frontend)/layout.tsx'
const SHELL_PATH = 'src/components/layout/PublicShell.tsx'

describe('AC-8.1: VerticalMenu renders the photobuddy left-menu chrome', () => {
  it('renders the logo, linking home', () => {
    render(<VerticalMenu businessName="Earth & Honey Studios" />)

    const menu = within(screen.getByTestId('vertical-menu'))
    const logo = menu.getByRole('img')
    expect(logo).toHaveAttribute('alt', expect.stringContaining('Earth'))
    expect(logo.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders the primary nav from the navItems prop, in the order given (AC-32.1: no hard-coded route list)', () => {
    render(
      <VerticalMenu
        navItems={[
          { href: '/weddings', label: 'weddings' },
          { href: '/engagements', label: 'engagements' },
        ]}
      />,
    )

    const nav = screen.getByTestId('primary-nav')
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['weddings', 'engagements'])
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/weddings', '/engagements'])
  })

  it('exposes the nav under an accessible "Primary" name', () => {
    render(<VerticalMenu />)

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })

  it('renders social icon links from the socialProfiles prop (AC-32.4: no hard-coded placeholder list)', () => {
    render(
      <VerticalMenu
        socialProfiles={[
          { platform: 'instagram', url: 'https://instagram.com/earthandhoney' },
          { platform: 'facebook', url: 'https://facebook.com/earthandhoney' },
        ]}
      />,
    )

    const social = within(screen.getByTestId('social-icons'))
    const links = social.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      'https://instagram.com/earthandhoney',
      'https://facebook.com/earthandhoney',
    ])
  })

  it('renders no social block when no social profiles are configured', () => {
    render(<VerticalMenu />)

    expect(screen.queryByTestId('social-icons')).not.toBeInTheDocument()
  })

  it('renders a copyright notice with the current year', () => {
    render(<VerticalMenu />)

    const menu = within(screen.getByTestId('vertical-menu'))
    expect(menu.getByText(new RegExp(`Copyright ${new Date().getFullYear()}`))).toBeInTheDocument()
  })
})

describe('AC-8.1: SiteFooter renders the photobuddy footer chrome', () => {
  it('renders a footer landmark', () => {
    render(<SiteFooter />)

    expect(screen.getByTestId('site-footer').tagName).toBe('FOOTER')
  })
})

describe("AC-8.1: the (frontend) layout's shell composes the vertical menu, page content, and footer", () => {
  it('renders the vertical menu, the children in the content area, and the footer, all inside the wrapper', () => {
    render(
      <PublicShell>
        <p data-testid="page-content">hello</p>
      </PublicShell>,
    )

    const shell = screen.getByTestId('site-shell')
    expect(within(shell).getByTestId('vertical-menu')).toBeInTheDocument()
    expect(within(shell).getByTestId('page-content')).toBeInTheDocument()
    expect(within(shell).getByTestId('site-footer')).toBeInTheDocument()
  })

  it('places the vertical menu before the page content in document order (left menu)', () => {
    render(
      <PublicShell>
        <p data-testid="page-content">hello</p>
      </PublicShell>,
    )

    const position = screen
      .getByTestId('vertical-menu')
      .compareDocumentPosition(screen.getByTestId('page-content'))
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('no longer renders the create-next-app placeholder layout markup (flex-centered single-child body)', () => {
    const src = read(LAYOUT_PATH)

    expect(src).not.toMatch(/flex flex-col/)
  })

  it('renders the shared PublicShell chrome rather than bare children', () => {
    const src = read(LAYOUT_PATH)

    expect(src).toMatch(/from ["']@\/components\/layout\/PublicShell["']/)
    expect(src).toMatch(
      /<PublicShell\s+businessName=\{studioProfile\.businessName\}[^>]*>\s*\{children\}\s*<\/PublicShell>/,
    )
  })

  it('PublicShell composes the VerticalMenu and SiteFooter chrome components', () => {
    const src = read(SHELL_PATH)

    expect(src).toMatch(/from ['"]\.\/VerticalMenu['"]/)
    expect(src).toMatch(/from ['"]\.\/SiteFooter['"]/)
    expect(src).toMatch(/<VerticalMenu\s+businessName=\{businessName\}[^>]*\/>/)
    expect(src).toMatch(/<SiteFooter\s*\/>/)
  })
})

describe('AC-8.1: chrome markup mirrors the real photobuddy template structure', () => {
  const TEMPLATE_INDEX = 'public/photobuddy/index.html'

  it('the template nav list is exactly home/about/galleries/blog/contact (sanity check against the real template)', () => {
    const template = read(TEMPLATE_INDEX)
    const navBlock = template.match(
      /photobuddy_fl_vertical_menu_nav_list">[\s\S]*?<\/div>/,
    )?.[0]
    expect(navBlock).toBeDefined()
    const labels = [...navBlock!.matchAll(/<span class="line">([^<]+)<\/span>/g)].map((m) => m[1])
    expect(labels).toEqual(['home', 'about', 'galleries', 'blog', 'contact'])
  })

  it('VerticalMenu uses the template class names for the menu, logo, nav list, copyright, and social icons', () => {
    const src = read('src/components/layout/VerticalMenu.tsx')

    expect(src).toContain('photobuddy_fl_vertical_menu')
    expect(src).toContain('photobuddy_fl_logo')
    expect(src).toContain('photobuddy_fl_vertical_menu_nav_list')
    expect(src).toContain('photobuddy_fl_copyright')
    expect(src).toContain('photobuddy_fl_social_icons')
  })

  it('SiteFooter uses the template footer class name', () => {
    const src = read('src/components/layout/SiteFooter.tsx')

    expect(src).toContain('photobuddy_fl_footer')
  })

  it('the shell wraps everything in the template wrapper/content class names', () => {
    const src = read(SHELL_PATH)

    expect(src).toContain('photobuddy_fl_wrapper_all')
    expect(src).toContain('photobuddy_fl_header')
    expect(src).toContain('photobuddy_fl_content')
    expect(src).toContain('photobuddy_fl_content_in')
  })

  it('the referenced logo image exists on disk under public/', () => {
    expect(fs.existsSync(path.join(root, 'public/photobuddy/img/logo.png'))).toBe(true)
  })
})
