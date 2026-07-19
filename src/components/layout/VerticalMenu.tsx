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
 *          uppercase transform).
 * created-by: dev-team
 * related-story: US-8
 * related-ac: 8.1
 * ---
 */
import Image from 'next/image'
import Link from 'next/link'

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
  return (
    <div className="photobuddy_fl_vertical_menu" data-testid="vertical-menu">
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
