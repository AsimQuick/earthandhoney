/**
 * ---
 * file: src/app/(frontend)/dev/token-specimen/page.tsx
 * project: earthandhoney
 * purpose: AC-23.5 — internal noindex route rendering the full US-23 design
 *          token set (src/styles/tokens.css) for human confirmation: the
 *          type scale at every step in both Fraunces and Inter, the palette
 *          with its computed WCAG contrast ratios, the spacing scale, radii,
 *          gallery gaps, and each overlay/vignette preset over a sample
 *          photograph. The confirmed brief (po-requests.md item 9) is
 *          explicit that this token set is direction, not a locked visual
 *          spec — po-requests.md item 14 already records this route as
 *          awaiting Product Owner sign-off before broad rollout. Not linked
 *          from public navigation.
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.5
 * ---
 */
import type { Metadata } from 'next'

import { loadTokenSpecimenData } from '@/lib/designTokenSpecimen'

// Internal-only: excluded from search indexing, matching the AC-23.5 route's
// own requirement and the existing internal demo-route precedent (AC-4.4).
export const metadata: Metadata = {
  title: 'Design token specimen (internal)',
  robots: { index: false, follow: false },
}

const SAMPLE_PHOTOGRAPH = '/photobuddy/img/gallery/1.jpg'

export default function TokenSpecimenPage() {
  const { typeScale, colorPalette, usablePairs, spacingScale, galleryGaps, radii, overlaysAndVignettes } =
    loadTokenSpecimenData()

  return (
    <main className="flex flex-col gap-[var(--spacing-3xl)] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
      <p role="note">
        Internal token-specimen route for AC-23.5 — renders the live US-23
        design-token set (src/styles/tokens.css) for human sign-off. This is
        direction, not a locked visual spec; see po-requests.md item 14. Not
        linked from public navigation.
      </p>

      <section aria-labelledby="type-scale-heading" data-testid="type-scale-specimen">
        <h2 id="type-scale-heading">Type scale</h2>
        {typeScale.map(([name, value]) => (
          <div key={name} data-testid={`type-step-${name}`}>
            <p style={{ fontSize: `var(--${name})`, fontFamily: 'var(--font-display)' }}>
              --{name} ({value}) — Fraunces
            </p>
            <p style={{ fontSize: `var(--${name})`, fontFamily: 'var(--font-sans)' }}>
              --{name} ({value}) — Inter
            </p>
          </div>
        ))}
      </section>

      <section aria-labelledby="palette-heading" data-testid="palette-specimen">
        <h2 id="palette-heading">Colour palette</h2>
        <ul>
          {colorPalette.map(([name, value]) => (
            <li key={name} data-testid={`palette-swatch-${name}`}>
              <span
                aria-hidden="true"
                style={{ display: 'inline-block', width: '2rem', height: '2rem', background: `var(--${name})` }}
              />
              --{name}: {value}
            </li>
          ))}
        </ul>

        <h3>Computed contrast ratios</h3>
        <table data-testid="contrast-ratio-table">
          <thead>
            <tr>
              <th>Ink</th>
              <th>Surface</th>
              <th>Usage</th>
              <th>Ratio</th>
              <th>Minimum</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {usablePairs.map((pair) => (
              <tr key={`${pair.inkKey}--on--${pair.surfaceKey}`} data-testid={`contrast-row-${pair.inkKey}--on--${pair.surfaceKey}`}>
                <td>
                  --{pair.inkKey} ({pair.inkHex})
                </td>
                <td>
                  --{pair.surfaceKey} ({pair.surfaceHex})
                </td>
                <td>{pair.usage}</td>
                <td>{pair.ratio.toFixed(2)}:1</td>
                <td>{pair.minimum}:1</td>
                <td>{pair.passes ? 'AA pass' : 'AA fail'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="spacing-heading" data-testid="spacing-specimen">
        <h2 id="spacing-heading">Spacing scale</h2>
        {spacingScale.map(([name, value]) => (
          <div key={name} data-testid={`spacing-step-${name}`}>
            <span aria-hidden="true" style={{ display: 'block', width: `var(--${name})`, height: '0.5rem', background: 'var(--color-ink)' }} />
            --{name}: {value}
          </div>
        ))}
      </section>

      <section aria-labelledby="radii-heading" data-testid="radii-specimen">
        <h2 id="radii-heading">Radii</h2>
        {radii.map(([name, value]) => (
          <div key={name} data-testid={`radius-step-${name}`}>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: '3rem',
                height: '3rem',
                background: 'var(--color-surface-muted)',
                border: '1px solid var(--color-border)',
                borderRadius: `var(--${name})`,
              }}
            />
            --{name}: {value}
          </div>
        ))}
      </section>

      <section aria-labelledby="gallery-gap-heading" data-testid="gallery-gap-specimen">
        <h2 id="gallery-gap-heading">Gallery gaps</h2>
        {galleryGaps.map(([name, value]) => (
          <div
            key={name}
            data-testid={`gallery-gap-step-${name}`}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 3rem)', gap: `var(--${name})` }}
          >
            <span aria-hidden="true" style={{ width: '3rem', height: '3rem', background: 'var(--color-surface-muted)' }} />
            <span aria-hidden="true" style={{ width: '3rem', height: '3rem', background: 'var(--color-surface-muted)' }} />
            <span aria-hidden="true" style={{ width: '3rem', height: '3rem', background: 'var(--color-surface-muted)' }} />
            --{name}: {value}
          </div>
        ))}
      </section>

      <section aria-labelledby="overlay-heading" data-testid="overlay-vignette-specimen">
        <h2 id="overlay-heading">Overlay and vignette presets</h2>
        {overlaysAndVignettes.map(([name, value]) => {
          const isOverlay = name.startsWith('overlay-')
          return (
            <figure key={name} data-testid={`overlay-preset-${name}`} style={{ position: 'relative', width: '20rem', height: '13.33rem' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- internal-only specimen route, no next/image optimisation needed for a fixed local sample */}
              <img src={SAMPLE_PHOTOGRAPH} alt="Sample photograph" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: isOverlay ? `var(--${name})` : undefined,
                  backgroundImage: isOverlay ? undefined : `var(--${name})`,
                }}
              />
              <figcaption>
                --{name}: {value}
              </figcaption>
            </figure>
          )
        })}
      </section>
    </main>
  )
}
