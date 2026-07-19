/**
 * ---
 * file: src/components/gallery/NavigationControls.tsx
 * project: earthandhoney
 * purpose: Gallery Engine piece — next/previous controls for advancing the
 *          currently displayed image
 * created-by: dev-team
 * related-story: US-4
 * related-ac: 4.1
 * ---
 */

export interface NavigationControlsProps {
  onPrevious: () => void
  onNext: () => void
}

export function NavigationControls({ onPrevious, onNext }: NavigationControlsProps) {
  return (
    <div data-testid="navigation-controls" className="navigation-controls">
      <button type="button" aria-label="Previous image" data-testid="nav-previous" onClick={onPrevious}>
        Prev
      </button>
      <button type="button" aria-label="Next image" data-testid="nav-next" onClick={onNext}>
        Next
      </button>
    </div>
  )
}
