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
 * ---
 */
import { SiteFooter } from './SiteFooter'
import { VerticalMenu } from './VerticalMenu'

export function PublicShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="photobuddy_fl_wrapper_all" data-testid="site-shell">
      <header className="photobuddy_fl_header" data-testid="site-header" />
      <div className="photobuddy_fl_content">
        <VerticalMenu />
        <div className="photobuddy_fl_content_in">{children}</div>
      </div>
      <SiteFooter />
    </div>
  )
}
