/**
 * ---
 * file: src/components/layout/VerticalMenu.tsx
 * project: earthandhoney
 * purpose: The photobuddy left vertical menu chrome — logo, primary nav,
 *          social icons, and copyright — shared across every page in the
 *          (frontend) route group. Markup and class names mirror
 *          public/photobuddy/index.html's `.photobuddy_fl_vertical_menu`
 *          block (nav labels kept lowercase to match the template's own
 *          markup; its CSS applies the visible uppercase transform). Below
 *          the `lg` breakpoint it is an off-canvas drawer toggled by
 *          MobileMenuTrigger via MobileMenuContext; at `lg` and above it is
 *          always visible, matching the template's fixed left sidebar. The
 *          drawer's open/close transition timing (AC-23.4) is set by the
 *          .photobuddy_fl_vertical_menu rule in globals.css, which reads
 *          the animation-timing tokens from src/styles/tokens.css, rather
 *          than Tailwind's built-in transition-duration/easing scale. The
 *          primary nav carries no route list of its own (AC-32.1) — it
 *          renders whichever `navItems` its caller passes down, sourced
 *          from src/lib/getNavItems.ts.
 * created-by: dev-team
 * related-story: US-8
 * related-ac: 8.1
 * updated-by: dev-team
 * related-story: US-8
 * related-ac: 8.3
 * updated-by: dev-team
 * related-story: US-23
 * related-ac: 23.4
 * updated-by: dev-team
 * related-story: US-24
 * related-ac: 24.4
 * updated-by: dev-team
 * related-story: US-32
 * related-ac: 32.1
 * ---
 */
'use client'

import Image from 'next/image'
import Link from 'next/link'

import { useMobileMenu } from './MobileMenuContext'

// A generic, non-brand-specific fallback for when no `businessName` prop is
// supplied (e.g. this component rendered standalone) — the studio's actual
// name is a StudioProfile detail (AC-24.4), never hard-coded here.
const FALLBACK_BUSINESS_NAME = 'the studio'

// The primary nav's content: no route list lives in this component (AC-32.1)
// — it renders whatever src/lib/getNavItems.ts resolves from the Payload
// `Navigation` global, threaded down via PublicShell.
export interface NavItem {
  href: string
  label: string
}

interface VerticalMenuProps {
  businessName?: string
  navItems?: NavItem[]
}

const SOCIAL_LINKS = [
  { href: '#', name: 'Facebook', icon: 'xcon-facebook' },
  { href: '#', name: 'Twitter', icon: 'xcon-twitter' },
  { href: '#', name: 'Instagram', icon: 'xcon-instagram' },
  { href: '#', name: 'Pinterest', icon: 'xcon-pinterest' },
  { href: '#', name: 'Google+', icon: 'xcon-gplus' },
]

export function VerticalMenu({
  businessName = FALLBACK_BUSINESS_NAME,
  navItems = [],
}: Readonly<VerticalMenuProps>) {
  const { isOpen } = useMobileMenu()

  return (
    <div
      id="vertical-menu"
      data-testid="vertical-menu"
      data-state={isOpen ? 'open' : 'closed'}
      className={`photobuddy_fl_vertical_menu fixed inset-y-0 left-0 z-40 w-72 -translate-x-full overflow-y-auto transition-transform lg:static lg:z-auto lg:w-80 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : ''
      }`}
    >
      <div className="photobuddy_fl_vertical_menu_in scrollable">
        <div className="photobuddy_fl_logo">
          <Link href="/">
            <Image
              src="/photobuddy/img/logo.png"
              alt={`${businessName} logo`}
              width={179}
              height={33}
              priority
            />
          </Link>
        </div>
        <nav
          className="photobuddy_fl_vertical_menu_nav_list"
          aria-label="Primary"
          data-testid="primary-nav"
        >
          <ul>
            {navItems.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>
                  <span className="line">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="photobuddy_fl_copyright">
          <span className="cright">
            &copy; Copyright {new Date().getFullYear()}.
            <br />
            Designed by <span className="autor">{businessName}</span>
          </span>
        </div>
        <div className="photobuddy_fl_social_icons" data-testid="social-icons">
          <ul>
            {SOCIAL_LINKS.map((social) => (
              <li key={social.icon}>
                <a href={social.href} aria-label={social.name}>
                  <i className={social.icon} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
