/**
 * ---
 * file: src/__tests__/us40-ac40.2-status-renders-text-icon-color.test.tsx
 * project: earthandhoney
 * purpose: Verify AC-40.2 — every one of US-40 AC-40.1's five locked status
 *          states renders text and an icon in addition to colour (PRD 23.3:
 *          "Color must always be paired with text and icons"; PRD 35.4:
 *          complete/pending/blocked must be clear "without relying only on
 *          color"). Renders `StatusBadge` for each of the five states and
 *          asserts all three channels — a visible text label, a distinct
 *          icon identifier, and a colour-swatch element — are present and
 *          match the vocabulary. The channel-detection guard
 *          (`renderChannels`/`carriesAllThreeChannels`) is then proven
 *          non-vacuous the same way US-40 AC-40.1 and US-36 AC-36.5 proved
 *          their own lock-in guards: against deliberately broken fixtures
 *          that render colour alone, colour+icon only, and colour+text only,
 *          each of which the guard must reject. Also asserts the five icon
 *          identifiers are mutually distinct (a repeated icon shape would
 *          defeat the "not relying only on color" requirement just as surely
 *          as no icon at all), and that StatusBadge renders no raw hex
 *          colour value, since resolving `colorName` to an actual token/hex
 *          is AC-40.3's still-pending decision, not this AC's.
 * created-by: dev-team
 * related-story: US-40
 * related-ac: 40.2
 * ---
 */
import { render } from '@testing-library/react'

import { STATUS_STATES } from '@/lib/statusVocabulary'
import { StatusBadge } from '@/components/status/StatusBadge'

interface RenderChannels {
  hasVisibleText: boolean
  hasIcon: boolean
  hasColor: boolean
}

/** The AC-40.2 guard itself: does the rendered markup carry all three channels? */
function renderChannels(container: HTMLElement): RenderChannels {
  return {
    hasVisibleText: (container.textContent ?? '').trim().length > 0,
    hasIcon: container.querySelector('[data-status-icon]') !== null,
    hasColor: container.querySelector('[data-status-color]') !== null,
  }
}

function carriesAllThreeChannels(channels: RenderChannels): boolean {
  return channels.hasVisibleText && channels.hasIcon && channels.hasColor
}

describe('US-40 AC-40.2: each of the five states renders colour, text and an icon together', () => {
  it.each(STATUS_STATES.map((state) => [state.key, state] as const))(
    'state "%s" carries all three channels',
    (_key, state) => {
      const { container } = render(<StatusBadge stateKey={state.key} />)
      const channels = renderChannels(container)

      expect(channels.hasVisibleText).toBe(true)
      expect(channels.hasIcon).toBe(true)
      expect(channels.hasColor).toBe(true)
      expect(carriesAllThreeChannels(channels)).toBe(true)

      // Text channel: the vocabulary's own label is visible.
      expect(container.textContent).toContain(state.label)

      // Icon channel: the icon rendered is the one this state's vocabulary
      // entry names — not a placeholder and not another state's icon.
      const iconElement = container.querySelector('[data-status-icon]')
      expect(iconElement?.getAttribute('data-status-icon')).toBe(state.icon)

      // Colour channel: present and keyed to the vocabulary's colorName —
      // never absent, and never the only channel present (proven below).
      const colorElement = container.querySelector('[data-status-color]')
      expect(colorElement?.getAttribute('data-status-color')).toBe(state.colorName)
    },
  )

  it('renders no raw hex colour value — resolving colorName to a token stays AC-40.3’s pending decision', () => {
    for (const state of STATUS_STATES) {
      const { container } = render(<StatusBadge stateKey={state.key} />)
      expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
  })

  it('the five icon identifiers are mutually distinct — no state reuses another state’s icon shape', () => {
    const icons = STATUS_STATES.map((state) => state.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })

  it('StatusBadge throws rather than silently rendering an unknown state with no text, icon or colour', () => {
    expect(() => render(<StatusBadge stateKey="archived" />)).toThrow(/unknown status state key/i)
  })
})

describe('US-40 AC-40.2: negative case — the channel guard fails a state that can render colour alone', () => {
  it('rejects a fixture that renders colour only, with no text and no icon', () => {
    const { container } = render(
      <span data-status-color="red" style={{ backgroundColor: 'red' }} />,
    )
    const channels = renderChannels(container)

    expect(channels.hasColor).toBe(true)
    expect(channels.hasVisibleText).toBe(false)
    expect(channels.hasIcon).toBe(false)
    expect(carriesAllThreeChannels(channels)).toBe(false)
  })

  it('rejects a fixture that renders colour and an icon but no visible text', () => {
    const { container } = render(
      <span data-status-color="red" style={{ backgroundColor: 'red' }}>
        <svg data-status-icon="alert-triangle" aria-hidden="true" />
      </span>,
    )
    const channels = renderChannels(container)

    expect(channels.hasColor).toBe(true)
    expect(channels.hasIcon).toBe(true)
    expect(channels.hasVisibleText).toBe(false)
    expect(carriesAllThreeChannels(channels)).toBe(false)
  })

  it('rejects a fixture that renders colour and text but no icon', () => {
    const { container } = render(
      <span data-status-color="red" style={{ backgroundColor: 'red' }}>
        blocked/overdue/action required
      </span>,
    )
    const channels = renderChannels(container)

    expect(channels.hasColor).toBe(true)
    expect(channels.hasVisibleText).toBe(true)
    expect(channels.hasIcon).toBe(false)
    expect(carriesAllThreeChannels(channels)).toBe(false)
  })

  it('self-test: the guard passes only once all three channels are present, proving it is not vacuously true or false', () => {
    const { container } = render(
      <span data-status-color="red" style={{ backgroundColor: 'red' }}>
        <svg data-status-icon="alert-triangle" aria-hidden="true" />
        blocked/overdue/action required
      </span>,
    )
    expect(carriesAllThreeChannels(renderChannels(container))).toBe(true)
  })
})
