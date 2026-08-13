/**
 * ---
 * file: src/__tests__/us32-ac32.4-social-links-from-studio-profile.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-32.4 — social profile links in the site chrome come
 *          from `StudioProfile.socialProfiles` (US-24) instead of the
 *          hard-coded placeholder list that used to live in
 *          VerticalMenu.tsx, and a studio with no social profiles
 *          configured renders no social block at all rather than dead '#'
 *          links.
 * created-by: dev-team
 * related-story: US-32
 * related-ac: 32.4
 * ---
 */
import { render, screen, within } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

import { VerticalMenu } from '@/components/layout/VerticalMenu'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const VERTICAL_MENU_PATH = 'src/components/layout/VerticalMenu.tsx'
const PUBLIC_SHELL_PATH = 'src/components/layout/PublicShell.tsx'
const LAYOUT_PATH = 'src/app/(frontend)/layout.tsx'

describe('AC-32.4: the hard-coded placeholder social list is gone from VerticalMenu.tsx', () => {
  const src = read(VERTICAL_MENU_PATH)

  it('carries no SOCIAL_LINKS constant or any other literal social array', () => {
    expect(src).not.toMatch(/SOCIAL_LINKS/)
    expect(src).not.toMatch(/href:\s*['"]#['"]/)
    expect(src).not.toMatch(/name:\s*['"]Twitter['"]/)
    expect(src).not.toMatch(/name:\s*['"]Google\+['"]/)
  })

  it('accepts a socialProfiles prop instead', () => {
    expect(src).toMatch(/socialProfiles\s*\??:\s*StudioSocialProfile\[\]/)
    expect(src).toMatch(/socialProfiles\.map\(/)
  })
})

describe('AC-32.4: VerticalMenu renders social links from the socialProfiles prop it is given', () => {
  it('renders exactly the profiles passed, in order, with real hrefs and accessible labels', () => {
    render(
      <VerticalMenu
        socialProfiles={[
          { platform: 'instagram', url: 'https://instagram.com/earthandhoney' },
          { platform: 'facebook', url: 'https://facebook.com/earthandhoney' },
          { platform: 'pinterest', url: 'https://pinterest.com/earthandhoney' },
        ]}
      />,
    )

    const social = within(screen.getByTestId('social-icons'))
    const links = social.getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      'https://instagram.com/earthandhoney',
      'https://facebook.com/earthandhoney',
      'https://pinterest.com/earthandhoney',
    ])
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual(['Instagram', 'Facebook', 'Pinterest'])
  })

  it('renders a known platform with no dedicated icon glyph (tiktok) with its proper label', () => {
    render(<VerticalMenu socialProfiles={[{ platform: 'tiktok', url: 'https://tiktok.com/@earthandhoney' }]} />)

    const social = within(screen.getByTestId('social-icons'))
    const link = social.getByRole('link')
    expect(link).toHaveAttribute('aria-label', 'TikTok')
    expect(link).toHaveAttribute('href', 'https://tiktok.com/@earthandhoney')
  })

  it('falls back to a capitalised label for an unrecognised platform value (e.g. "other")', () => {
    render(<VerticalMenu socialProfiles={[{ platform: 'other', url: 'https://example.com/earthandhoney' }]} />)

    const social = within(screen.getByTestId('social-icons'))
    const link = social.getByRole('link')
    expect(link).toHaveAttribute('aria-label', 'Other')
    expect(link).toHaveAttribute('href', 'https://example.com/earthandhoney')
  })

  it('renders no social block at all when no social profiles are configured (not dead "#" links)', () => {
    render(<VerticalMenu />)

    expect(screen.queryByTestId('social-icons')).not.toBeInTheDocument()
  })

  it('renders no social block when socialProfiles is an explicit empty array', () => {
    render(<VerticalMenu socialProfiles={[]} />)

    expect(screen.queryByTestId('social-icons')).not.toBeInTheDocument()
  })
})

describe('AC-32.4: the social data flows from the root layout, through PublicShell, into VerticalMenu', () => {
  it('PublicShell accepts a socialProfiles prop and forwards it to VerticalMenu', () => {
    const src = read(PUBLIC_SHELL_PATH)
    expect(src).toMatch(/socialProfiles/)
    expect(src).toMatch(/<VerticalMenu[^]*?socialProfiles=\{socialProfiles\}/)
  })

  it('the root layout reads StudioProfile.socialProfiles via src/lib/getStudioProfile.ts and passes it into PublicShell', () => {
    const src = read(LAYOUT_PATH)
    expect(src).toMatch(/from ["']@\/lib\/getStudioProfile["']/)
    expect(src).toMatch(/await getStudioProfile\(\)/)
    expect(src).toMatch(/<PublicShell[^]*?socialProfiles=\{studioProfile\.socialProfiles\}/)
  })
})
