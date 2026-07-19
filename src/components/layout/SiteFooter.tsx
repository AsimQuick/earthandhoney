/**
 * ---
 * file: src/components/layout/SiteFooter.tsx
 * project: earthandhoney
 * purpose: Shared public footer chrome for the (frontend) route group,
 *          mirroring public/photobuddy/*.html's `<footer class="photobuddy_fl_footer">`
 *          element (empty in the template itself on every page).
 * created-by: dev-team
 * related-story: US-8
 * related-ac: 8.1
 * ---
 */
export function SiteFooter() {
  return <footer className="photobuddy_fl_footer" data-testid="site-footer" />
}
