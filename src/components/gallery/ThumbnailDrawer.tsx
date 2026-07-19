/**
 * ---
 * file: src/components/gallery/ThumbnailDrawer.tsx
 * project: earthandhoney
 * purpose: Thumbnail reveal wrapper for both device classes (PRD 5.7). On a
 *          touch device there is no hover, so below the `sm` breakpoint the
 *          strip starts collapsed and a tap on the drawer toggle reveals it
 *          (AC-5.2). At `sm` and up the toggle hides and the strip instead
 *          starts collapsed and reveals on pointer hover over the gallery,
 *          gated by `hoverPreview` — the same per-gallery setting Payload's
 *          Galleries collection exposes (src/collections/Galleries.ts) —
 *          so a hover-preview-disabled gallery (e.g. the hero mode, PRD 5.6)
 *          never reveals the strip on desktop (AC-5.3). The two reveal
 *          mechanisms are independent state (`isOpen` vs `isHovered`) so
 *          neither breakpoint's behavior leaks into the other. Wraps the
 *          existing ThumbnailStrip unchanged.
 * created-by: dev-team
 * related-story: US-5
 * related-ac: 5.2
 * updated-by: dev-team
 * related-story: US-5
 * related-ac: 5.3
 * ---
 */
import { ThumbnailStrip } from './ThumbnailStrip'
import type { GalleryImage } from './types'

const PANEL_ID = 'thumbnail-drawer-panel'

export interface ThumbnailDrawerProps {
  images: GalleryImage[]
  activeIndex: number
  onSelect: (index: number) => void
  isOpen: boolean
  onToggle: () => void
  /** Per-gallery `settings.hoverPreview` toggle (AC-5.3) — desktop hover only reveals the strip when this is true. */
  hoverPreview: boolean
  /** Whether the pointer is currently over the gallery (GalleryEngine's mouseenter/mouseleave). */
  isHovered: boolean
}

export function ThumbnailDrawer({
  images,
  activeIndex,
  onSelect,
  isOpen,
  onToggle,
  hoverPreview,
  isHovered,
}: ThumbnailDrawerProps) {
  const revealOnHover = hoverPreview && isHovered

  return (
    <div className="thumbnail-drawer">
      <button
        type="button"
        data-testid="thumbnail-drawer-toggle"
        aria-expanded={isOpen}
        aria-controls={PANEL_ID}
        onClick={onToggle}
        className="mb-2 text-[12px] tracking-[2px] uppercase text-black/70 transition-colors duration-500 ease-in-out hover:text-black sm:hidden"
      >
        {isOpen ? 'Hide thumbnails' : `Show thumbnails (${images.length})`}
      </button>
      <div
        id={PANEL_ID}
        data-testid="thumbnail-drawer"
        data-open={isOpen}
        data-hover-visible={revealOnHover}
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
          isOpen ? 'max-h-24' : 'max-h-0 opacity-0 max-sm:pointer-events-none'
        } ${revealOnHover ? 'sm:!max-h-24 sm:!opacity-100' : 'sm:!max-h-0 sm:!opacity-0 sm:!pointer-events-none'}`}
      >
        <ThumbnailStrip images={images} activeIndex={activeIndex} onSelect={onSelect} />
      </div>
    </div>
  )
}
