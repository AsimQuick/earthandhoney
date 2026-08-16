/**
 * ---
 * file: src/components/status/StatusBadge.tsx
 * project: earthandhoney
 * purpose: AC-40.2 — renders one of US-40 AC-40.1's five locked status
 *          states (src/lib/statusVocabulary.ts) with all three channels PRD
 *          23.3 requires together: colour, text and icon. PRD 35.4 requires
 *          complete/pending/blocked to read clearly "without relying only on
 *          color", so the icon is a distinct inline SVG shape per state
 *          (never the same glyph reused) and the visible label text is
 *          always rendered — colour is never the only channel present.
 *          Colour itself is rendered structurally only: a
 *          `data-status-color` swatch keyed to the state's `colorName`, with
 *          no hardcoded hex value. Which token/hex a `colorName` resolves to
 *          is AC-40.3's decision and is still pending Product Owner routing
 *          (po-requests.md item 18) — this component intentionally does not
 *          anticipate it.
 * created-by: dev-team
 * related-story: US-40
 * related-ac: 40.2
 * ---
 */
import { STATUS_STATES } from '@/lib/statusVocabulary'

// One distinct SVG path per icon identifier named in statusVocabulary.ts.
// Distinctness is what lets the icon channel carry meaning independent of
// colour — reusing a shape across two states would silently defeat that.
const STATUS_ICON_PATHS: Record<string, string> = {
  'check-circle': 'M8 12.5l2.5 2.5L16 9m5 3a9 9 0 11-18 0 9 9 0 0118 0z',
  clock: 'M12 7v5l3.5 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'arrow-right-circle': 'M10 8l4 4-4 4M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'alert-triangle': 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  'circle-dashed':
    'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2',
}

function StatusIcon({ icon }: { icon: string }) {
  const path = STATUS_ICON_PATHS[icon]
  return (
    <svg
      data-status-icon={icon}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  )
}

export interface StatusBadgeProps {
  stateKey: string
}

export function StatusBadge({ stateKey }: StatusBadgeProps) {
  const state = STATUS_STATES.find((candidate) => candidate.key === stateKey)
  if (!state) {
    throw new Error(`StatusBadge: unknown status state key "${stateKey}"`)
  }

  return (
    <span
      className={`status-badge status-badge--${state.colorName}`}
      data-status-key={state.key}
    >
      <span
        className={`status-badge__swatch status-badge__swatch--${state.colorName}`}
        data-status-color={state.colorName}
        aria-hidden="true"
      />
      <StatusIcon icon={state.icon} />
      <span className="status-badge__text" data-status-text="true">
        {state.label}
      </span>
    </span>
  )
}
