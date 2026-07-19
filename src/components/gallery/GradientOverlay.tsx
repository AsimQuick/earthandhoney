/**
 * ---
 * file: src/components/gallery/GradientOverlay.tsx
 * project: earthandhoney
 * purpose: Subtle black gradient overlay shared by every Gallery Engine
 *          display — implemented purely in CSS (no image processing) via an
 *          inline linear-gradient, so it renders identically no matter which
 *          display mode (hero, portfolio, blog, client delivery) composes it
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.2
 * ---
 */

const BLACK_GRADIENT =
  'linear-gradient(to bottom, transparent 0%, transparent 70%, rgba(0,0,0,0.1) 76%, rgba(0,0,0,0.4) 93%, rgba(0,0,0,0.49) 100%)'

export function GradientOverlay() {
  return (
    <div
      data-testid="gradient-overlay"
      aria-hidden="true"
      className="gradient-overlay pointer-events-none absolute inset-0"
      style={{ backgroundImage: BLACK_GRADIENT }}
    />
  )
}
