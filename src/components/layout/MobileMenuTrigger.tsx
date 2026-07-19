/**
 * ---
 * file: src/components/layout/MobileMenuTrigger.tsx
 * project: earthandhoney
 * purpose: The mobile hamburger trigger from public/photobuddy/index.html's
 *          `.photobuddy_fl_menu_trigger` block. A client component (needs
 *          onClick + the shared open/closed state from MobileMenuContext)
 *          that toggles the VerticalMenu drawer; hidden at the `lg` desktop
 *          breakpoint, where the vertical menu is always visible rather
 *          than collapsed.
 * created-by: dev-team
 * related-story: US-8
 * related-ac: 8.3
 * ---
 */
'use client'

import { useMobileMenu } from './MobileMenuContext'

export function MobileMenuTrigger() {
  const { isOpen, toggle } = useMobileMenu()

  return (
    <div className="photobuddy_fl_menu_trigger default lg:hidden" data-testid="mobile-menu-trigger">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls="vertical-menu"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        <span className="menu_on">
          <span className="menu_a" />
          <span className="menu_b" />
          <span className="menu_c" />
        </span>
      </button>
    </div>
  )
}
