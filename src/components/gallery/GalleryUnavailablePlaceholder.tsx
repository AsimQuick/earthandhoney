/**
 * ---
 * file: src/components/gallery/GalleryUnavailablePlaceholder.tsx
 * project: earthandhoney
 * purpose: AC-25.6 — the placeholder a placement renders when its Backstage
 *          gallery could not be fetched (unreachable Backstage, timeout, or
 *          a 404 slug), kept deliberately distinct from
 *          GalleryMasonryLayout/GallerySlideshowLayout's own zero-images
 *          empty state ("No images to display."). That empty state means "a
 *          real gallery with zero photos"; this component means "the
 *          gallery could not be reached right now" — the contract
 *          (PAYLOAD_PICPEAK_API_CONTRACT.md rows 1-2) forbids collapsing
 *          those two into one indistinguishable message. `role="status"`
 *          (a polite live region, matching the layouts' own empty state)
 *          rather than `role="alert"` — a visitor landing on the page
 *          mid-outage is not interrupted, just informed.
 * created-by: dev-team
 * related-story: US-25
 * related-ac: 25.6
 * ---
 */

export interface GalleryUnavailablePlaceholderProps {
  /** Optional context appended to the message, e.g. which placement/gallery. */
  heading?: string
}

export function GalleryUnavailablePlaceholder({ heading }: GalleryUnavailablePlaceholderProps) {
  return (
    <div data-testid="gallery-placement-unavailable" className="w-full py-8 text-center">
      <p role="status">
        {heading ? `${heading}: ` : ''}
        This gallery is temporarily unavailable. Please check back shortly.
      </p>
    </div>
  )
}
