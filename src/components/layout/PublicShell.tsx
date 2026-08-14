/**
 * ---
 * file: src/components/layout/PublicShell.tsx
 * project: earthandhoney
 * purpose: The photobuddy chrome shell shared by every (frontend) page —
 *          wraps page content with the left vertical menu and the footer,
 *          mirroring public/photobuddy/index.html's
 *          `.photobuddy_fl_wrapper_all` > header + `.photobuddy_fl_content`
 *          (vertical menu + `.photobuddy_fl_content_in`) + footer structure.
 *          Kept separate from the root layout.tsx (which owns the
 *          <html>/<body> tags) so this chrome can be unit-tested directly
 *          without nesting a document inside React Testing Library's own
 *          container.
 * created-by: dev-team
 * related-story: US-8
 * related-ac: 8.1
 * updated-by: dev-team
 * related-story: US-8
 * related-ac: 8.3
 * updated-by: dev-team
 * related-story: US-24
 * related-ac: 24.4
 * updated-by: dev-team
 * related-story: US-32
 * related-ac: 32.1
 * updated-by: dev-team
 * related-story: US-32
 * related-ac: 32.4
 * ---
 */
import type { StudioSocialProfile } from '@/lib/getStudioProfile'

import { MobileMenuProvider } from './MobileMenuContext'
import { MobileMenuTrigger } from './MobileMenuTrigger'
import { SiteFooter } from './SiteFooter'
import type { NavItem } from './VerticalMenu'
import { VerticalMenu } from './VerticalMenu'

interface PublicShellProps {
  children: React.ReactNode
  // The studio's business name (StudioProfile, AC-24.4), threaded down to
  // VerticalMenu rather than hard-coded here or in that client component.
  businessName?: string
  // The resolved primary nav (Payload `Navigation` global, AC-32.1),
  // threaded down to VerticalMenu rather than hard-coded here or there.
  navItems?: NavItem[]
  // StudioProfile.socialProfiles (AC-32.4), threaded down to VerticalMenu
  // rather than hard-coded here or there.
  socialProfiles?: StudioSocialProfile[]
}

export function PublicShell({
  children,
  businessName,
  navItems,
  socialProfiles,
}: Readonly<PublicShellProps>) {
  return (
    <div className="photobuddy_fl_wrapper_all" data-testid="site-shell">
      <header className="photobuddy_fl_header" data-testid="site-header" />
      <div className="photobuddy_fl_content">
        <MobileMenuProvider>
          <VerticalMenu businessName={businessName} navItems={navItems} socialProfiles={socialProfiles} />
          <div className="photobuddy_fl_content_in">
            <MobileMenuTrigger />
            {children}
          </div>
        </MobileMenuProvider>
      </div>
      <SiteFooter />
    </div>
  )
}
