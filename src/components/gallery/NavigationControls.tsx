/**
 * ---
 * file: src/components/gallery/NavigationControls.tsx
 * project: earthandhoney
 * purpose: Gallery Engine piece — next/previous controls for advancing the
 *          currently displayed image. Styled to match public/photobuddy's
 *          own prev/next link treatment
 *          (`.photobuddy_fl_gallery_single_in .img_list span.prev_next a`:
 *          12px, uppercase, 2px letter-spacing, hover underline on a .5s
 *          ease transition) — recolored white and positioned over the
 *          image/gradient, mirroring the template's `.title_holder a` white
 *          overlay text (AC-4.5).
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.1
 * updated-by: dev-team
 * related-story: US-4
 * related-ac: 4.5
 * ---
 */

export interface NavigationControlsProps {
  onPrevious: () => void
  onNext: () => void
}

const NAV_BUTTON_CLASSES =
  'pointer-events-auto border-b border-transparent pb-0.5 text-white transition-colors duration-500 ease-in-out hover:border-white'

export function NavigationControls({ onPrevious, onNext }: NavigationControlsProps) {
  return (
    <div
      data-testid="navigation-controls"
      className="navigation-controls pointer-events-none absolute inset-x-0 bottom-4 z-20 flex items-center justify-between px-4 text-[12px] tracking-[2px] uppercase sm:bottom-6 sm:px-6"
    >
      <button
        type="button"
        aria-label="Previous image"
        data-testid="nav-previous"
        onClick={onPrevious}
        className={NAV_BUTTON_CLASSES}
      >
        Prev
      </button>
      <button
        type="button"
        aria-label="Next image"
        data-testid="nav-next"
        onClick={onNext}
        className={NAV_BUTTON_CLASSES}
      >
        Next
      </button>
    </div>
  )
}
