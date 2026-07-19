/**
 * ---
 * file: src/components/gallery/ThumbnailDrawer.tsx
 * project: earthandhoney
 * purpose: Mobile thumbnail drawer (AC-5.2, PRD 5.7) — on a touch device
 *          there is no hover, so the thumbnail strip starts collapsed and a
 *          tap on the drawer toggle reveals it, mirroring the desktop
 *          hover-to-reveal experience AC-5.3 adds for pointer devices. Wraps
 *          the existing ThumbnailStrip unchanged; only visibility is
 *          collapsed below the `sm` breakpoint — at `sm` and up the strip
 *          stays shown exactly as it already does (AC-4.1), so this AC only
 *          changes mobile behavior.
 * created-by: dev-team
 * related-story: US-5
 * related-ac: 5.2
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
}

export function ThumbnailDrawer({ images, activeIndex, onSelect, isOpen, onToggle }: ThumbnailDrawerProps) {
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
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out sm:!max-h-none sm:!opacity-100 ${
          isOpen ? 'max-h-24' : 'max-h-0 opacity-0 max-sm:pointer-events-none'
        }`}
      >
        <ThumbnailStrip images={images} activeIndex={activeIndex} onSelect={onSelect} />
      </div>
    </div>
  )
}
