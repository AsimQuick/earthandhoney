/**
 * ---
 * file: src/components/gallery/DownloadControl.tsx
 * project: earthandhoney
 * purpose: Download link for the currently displayed image, rendered only
 *          when the per-gallery `settings.download` display-mode toggle is
 *          on (e.g. client delivery, PRD 5.6) — every other mode (hero,
 *          portfolio, blog) never exposes a way to save the original file.
 *          Links straight at `image.url`, the original full-resolution file
 *          (see GalleryImage — Sharp's thumbnail/medium/large variants are
 *          for display only), with the native `download` attribute so the
 *          browser saves rather than navigates.
 * created-by: dev-team
 * related-story: US-5
 * related-ac: 5.4
 * ---
 */
import type { GalleryImage } from './types'

export interface DownloadControlProps {
  image: GalleryImage
}

export function DownloadControl({ image }: DownloadControlProps) {
  return (
    <a
      href={image.url}
      download
      data-testid="download-control"
      aria-label={`Download ${image.alt}`}
      className="pointer-events-auto absolute top-4 right-4 z-20 border-b border-transparent pb-0.5 text-[12px] tracking-[2px] text-white uppercase transition-colors duration-500 ease-in-out hover:border-white sm:top-6 sm:right-6"
    >
      Download
    </a>
  )
}
