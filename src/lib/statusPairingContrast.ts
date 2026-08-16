/**
 * ---
 * file: src/lib/statusPairingContrast.ts
 * project: earthandhoney
 * purpose: AC-40.4 — computes, from the locked token values themselves
 *          (never asserted), the WCAG AA contrast ratio for every status
 *          pairing PRD 23.3's five states (src/lib/statusVocabulary.ts)
 *          actually render today, on both backgrounds the vocabulary must
 *          stay legible against: the photographer's cockpit and the client
 *          Project Room. AC-40.3 found that no semantic status hue exists in
 *          the locked token set and is still pending Product Owner routing
 *          (po-requests.md item 18) — StatusBadge.tsx's `colorName` resolves
 *          to no colour value yet, so a hue-on-background pairing does not
 *          exist to compute. What IS locked and renders today is the text
 *          label and icon PRD 35.4 requires to carry each state "without
 *          relying only on color" (AC-40.2's structural guarantee) — both
 *          render in the ink colour. This module checks exactly that
 *          guaranteed pairing against the WCAG AA minimum for its usage
 *          class (body 4.5:1 for the text label, large/non-text-indicator
 *          3:1 for the icon, the same two classes src/styles/tokens.css
 *          already names), reusing the token-parsing/contrast-ratio
 *          implementation AC-23.3/AC-23.5 already validate
 *          (src/lib/designTokenSpecimen.ts) so the number reported here is
 *          the same number the token gate computes elsewhere. It has
 *          nothing to say about a status hue's own contrast — that pairing
 *          is AC-40.3's still-open decision, not this AC's to invent.
 *
 *          Background mapping: the locked token set declares exactly two
 *          surface tokens, `--color-surface` and `--color-surface-muted`.
 *          Every Frontstage/Project Room page template already renders on
 *          `--color-surface` (src/components/page-template/*.tsx all use
 *          `bg-surface`), so this module treats `--color-surface` as the
 *          Project Room background. The cockpit has no shipped UI yet
 *          (US-43 is still ahead in this sprint) so nothing fixes its
 *          background either way; this module assigns it the token set's
 *          other declared surface, `--color-surface-muted` — the
 *          "secondary/tertiary content and surfaces" shade AC-23.1 already
 *          reserves for exactly this kind of secondary/utility surface.
 *          Both are existing locked tokens; no new colour value is
 *          introduced, so this is a test-scoped convenience mapping, not
 *          the kind of decision CLAUDE.md routes to the Product Owner.
 * created-by: dev-team
 * related-story: US-40
 * related-ac: 40.4
 * ---
 */
import { AA_THRESHOLD, contrastRatio, parseCustomProperties, readTokensSource } from './designTokenSpecimen'
import { STATUS_STATES } from './statusVocabulary'

export const COCKPIT_BACKGROUND_TOKEN = 'surface-muted'
export const PROJECT_ROOM_BACKGROUND_TOKEN = 'surface'

type SurfaceContext = 'cockpit' | 'project-room'
type Channel = 'text' | 'icon'
type Usage = 'body' | 'large'

const BACKGROUNDS: ReadonlyArray<{ surface: SurfaceContext; tokenName: string }> = [
  { surface: 'cockpit', tokenName: COCKPIT_BACKGROUND_TOKEN },
  { surface: 'project-room', tokenName: PROJECT_ROOM_BACKGROUND_TOKEN },
]

// The text label is body copy; the icon is a non-text indicator (WCAG
// 1.4.11) — src/styles/tokens.css's own "body"/"large" usage classes
// already draw exactly this distinction.
const CHANNELS: ReadonlyArray<{ channel: Channel; usage: Usage }> = [
  { channel: 'text', usage: 'body' },
  { channel: 'icon', usage: 'large' },
]

function tokenColor(name: string): string {
  const match = parseCustomProperties(readTokensSource()).find(([tokenName]) => tokenName === `color-${name}`)
  if (!match) {
    throw new Error(`Design token "--color-${name}" is not declared in src/styles/tokens.css`)
  }
  return match[1]
}

export interface StatusPairingCheck {
  stateKey: string
  stateLabel: string
  surface: SurfaceContext
  backgroundToken: string
  channel: Channel
  usage: Usage
  inkHex: string
  surfaceHex: string
  ratio: number
  minimum: number
  passes: boolean
}

/** Computes one check per (status state x background x channel), live from tokens.css. */
export function checkStatusPairingContrast(): StatusPairingCheck[] {
  const inkHex = tokenColor('ink')
  const checks: StatusPairingCheck[] = []

  for (const state of STATUS_STATES) {
    for (const background of BACKGROUNDS) {
      const surfaceHex = tokenColor(background.tokenName)
      const ratio = contrastRatio(inkHex, surfaceHex)
      for (const { channel, usage } of CHANNELS) {
        const minimum = AA_THRESHOLD[usage]
        checks.push({
          stateKey: state.key,
          stateLabel: state.label,
          surface: background.surface,
          backgroundToken: background.tokenName,
          channel,
          usage,
          inkHex,
          surfaceHex,
          ratio,
          minimum,
          passes: ratio >= minimum,
        })
      }
    }
  }

  return checks
}
