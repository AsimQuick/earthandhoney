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
 * ---
 */
import { MobileMenuProvider } from './MobileMenuContext'
import { MobileMenuTrigger } from './MobileMenuTrigger'
import { SiteFooter } from './SiteFooter'
import { VerticalMenu } from './VerticalMenu'

interface PublicShellProps {
  children: React.ReactNode
  // The studio's business name (StudioProfile, AC-24.4), threaded down to
  // VerticalMenu rather than hard-coded here or in that client component.
  businessName?: string
}

export function PublicShell({ children, businessName }: Readonly<PublicShellProps>) {
  return (
    <div className="photobuddy_fl_wrapper_all" data-testid="site-shell">
      <header className="photobuddy_fl_header" data-testid="site-header" />
      <div className="photobuddy_fl_content">
        <MobileMenuProvider>
          <VerticalMenu businessName={businessName} />
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
