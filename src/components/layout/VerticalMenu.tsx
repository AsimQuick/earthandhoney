/**
 * ---
 * file: src/components/layout/VerticalMenu.tsx
 * project: earthandhoney
 * purpose: The photobuddy left vertical menu chrome — logo, primary nav
 *          (Home/About/Galleries/Blog/Contact), social icons, and copyright
 *          — shared across every page in the (frontend) route group. Markup
 *          and class names mirror public/photobuddy/index.html's
 *          `.photobuddy_fl_vertical_menu` block (nav labels kept lowercase
 *          to match the template's own markup; its CSS applies the visible
 *          uppercase transform). Below the `lg` breakpoint it is an
 *          off-canvas drawer toggled by MobileMenuTrigger via
 *          MobileMenuContext; at `lg` and above it is always visible,
 *          matching the template's fixed left sidebar.
 * created-by: dev-team
 * related-story: US-8
 * related-ac: 8.1
 * updated-by: dev-team
 * related-story: US-8
 * related-ac: 8.3
 * ---
 */
'use client'

import Image from 'next/image'
import Link from 'next/link'

import { useMobileMenu } from './MobileMenuContext'

const NAV_LINKS = [
  { href: '/', label: 'home' },
  { href: '/about', label: 'about' },
  { href: '/galleries', label: 'galleries' },
  { href: '/blog', label: 'blog' },
  { href: '/contact', label: 'contact' },
]

const SOCIAL_LINKS = [
  { href: '#', name: 'Facebook', icon: 'xcon-facebook' },
  { href: '#', name: 'Twitter', icon: 'xcon-twitter' },
  { href: '#', name: 'Instagram', icon: 'xcon-instagram' },
  { href: '#', name: 'Pinterest', icon: 'xcon-pinterest' },
  { href: '#', name: 'Google+', icon: 'xcon-gplus' },
]

export function VerticalMenu() {
  const { isOpen } = useMobileMenu()

  return (
    <div
      id="vertical-menu"
      data-testid="vertical-menu"
      data-state={isOpen ? 'open' : 'closed'}
      className={`photobuddy_fl_vertical_menu fixed inset-y-0 left-0 z-40 w-72 -translate-x-full overflow-y-auto transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:w-80 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : ''
      }`}
    >
      <div className="photobuddy_fl_vertical_menu_in scrollable">
        <div className="photobuddy_fl_logo">
          <Link href="/">
            <Image
              src="/photobuddy/img/logo.png"
              alt="Earth &amp; Honey Photography"
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
            {NAV_LINKS.map((link) => (
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
            Designed by <span className="autor">Earth &amp; Honey</span>
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
