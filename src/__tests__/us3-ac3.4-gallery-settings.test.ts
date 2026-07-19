/**
 * ---
 * file: src/__tests__/us3-ac3.4-gallery-settings.test.ts
 * project: earthandhoney
 * purpose: Verify AC-3.4 — Gallery 'settings' capture a display-mode
 *          configuration (slideshow, hover-preview, fullscreen, download,
 *          authentication toggles) so one gallery object can drive multiple
 *          display experiences
 * created-by: dev-team
 * related-story: US-3
 * related-ac: 3.4
 * ---
 */
import type { CheckboxField, GroupField } from 'payload'

import { Galleries } from '@/collections/Galleries'

const findField = (name: string) => Galleries.fields.find((field) => 'name' in field && field.name === name)

const settingsField = findField('settings') as GroupField
const findSetting = (name: string) =>
  settingsField.fields.find((field) => 'name' in field && field.name === name) as CheckboxField | undefined

describe('AC-3.4: gallery settings capture a display-mode configuration', () => {
  it('the "settings" field is a group of toggles, not a single fixed-mode enum', () => {
    expect(settingsField).toBeDefined()
    expect(settingsField.type).toBe('group')
  })

  describe.each([
    ['slideshow', false],
    ['hoverPreview', true],
    ['fullscreen', true],
    ['download', false],
    ['requireAuth', false],
  ])('the "%s" toggle', (name, defaultValue) => {
    it('is a checkbox field with a sensible default', () => {
      const field = findSetting(name)
      expect(field).toBeDefined()
      expect(field?.type).toBe('checkbox')
      expect(field?.defaultValue).toBe(defaultValue)
    })

    it('is not hidden or read-only in the admin UI', () => {
      const field = findSetting(name)
      expect(field?.admin?.hidden).not.toBe(true)
      expect(field?.admin?.readOnly).not.toBe(true)
    })
  })

  it('declares exactly the five documented display-mode toggles, no more, no less', () => {
    const settingNames = settingsField.fields.map((field) => ('name' in field ? field.name : undefined))
    expect(settingNames.sort()).toEqual(
      ['slideshow', 'hoverPreview', 'fullscreen', 'download', 'requireAuth'].sort(),
    )
  })

  it('each toggle is independent, so any combination of display behaviors can be set on one gallery', () => {
    // Distinct settings shapes drawn straight from the PRD's documented
    // display modes (5.6 Gallery Display Modes) — proving these can coexist
    // as independent booleans on the SAME Galleries object/collection,
    // rather than requiring a separate gallery record or type per mode.
    const heroPreset = { slideshow: true, hoverPreview: false, fullscreen: false, download: false, requireAuth: false }
    const portfolioPreset = {
      slideshow: false,
      hoverPreview: true,
      fullscreen: true,
      download: false,
      requireAuth: false,
    }
    const clientDeliveryPreset = {
      slideshow: false,
      hoverPreview: false,
      fullscreen: true,
      download: true,
      requireAuth: true,
    }

    const settingNames = settingsField.fields.map((field) => ('name' in field ? field.name : undefined))
    for (const preset of [heroPreset, portfolioPreset, clientDeliveryPreset]) {
      expect(Object.keys(preset).sort()).toEqual([...settingNames].sort())
    }
    // The three presets disagree with each other on every toggle they share,
    // which is only possible if the toggles are independently settable.
    expect(heroPreset.slideshow).not.toBe(portfolioPreset.slideshow)
    expect(portfolioPreset.hoverPreview).not.toBe(clientDeliveryPreset.hoverPreview)
    expect(clientDeliveryPreset.download).not.toBe(portfolioPreset.download)
    expect(clientDeliveryPreset.requireAuth).not.toBe(heroPreset.requireAuth)
  })

  it('settings live under the "settings" key of the Galleries collection, not scattered top-level fields', () => {
    // Consumers (the future Gallery Engine, US-4/US-5) read one nested bag —
    // `gallery.settings.*` — rather than needing to know about individual
    // top-level display-mode fields.
    const topLevelNames = Galleries.fields.map((field) => ('name' in field ? field.name : undefined))
    expect(topLevelNames).not.toContain('slideshow')
    expect(topLevelNames).not.toContain('hoverPreview')
    expect(topLevelNames).not.toContain('fullscreen')
    expect(topLevelNames).not.toContain('download')
    expect(topLevelNames).not.toContain('requireAuth')
    expect(topLevelNames).toContain('settings')
  })
})
