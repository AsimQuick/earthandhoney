/**
 * ---
 * file: src/lib/approvedFontPairings.ts
 * project: earthandhoney
 * purpose: Derives the design token set's approved font-pairing names (US-23 AC-23.1's
 *          `--font-combo-*` tokens) from src/styles/tokens.css, so the StudioProfile
 *          branding field's font-pairing dropdown (PRD §12.3) can never list a pairing
 *          the token set doesn't actually define.
 * created-by: dev-team
 * related-story: US-24
 * related-ac: 24.2
 * ---
 */
import { parseCustomProperties, readTokensSource } from './designTokenSpecimen'

export function getApprovedFontPairingNames(): string[] {
  const names = new Set<string>()
  for (const [name] of parseCustomProperties(readTokensSource())) {
    const match = name.match(/^font-combo-([a-z0-9]+)-(?:display|sans)-weight$/)
    if (match) {
      names.add(match[1])
    }
  }
  return [...names].sort()
}

export function getApprovedFontPairingOptions(): Array<{ label: string; value: string }> {
  return getApprovedFontPairingNames().map((name) => ({
    label: name.charAt(0).toUpperCase() + name.slice(1),
    value: name,
  }))
}
