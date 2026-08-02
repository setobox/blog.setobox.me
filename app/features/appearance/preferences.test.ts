import { describe, expect, it } from 'vitest'
import {
  createDefaultAppearancePreferences,
  sanitizeAppearancePreferences,
} from './preferences'

describe('appearance preference migration', () => {
  it('keeps the visual filter disabled by default', () => {
    expect(createDefaultAppearancePreferences().visualFilterEnabled).toBe(false)
    expect(sanitizeAppearancePreferences(null).visualFilterEnabled).toBe(false)
  })

  it('reads the current visual filter field', () => {
    const preferences = sanitizeAppearancePreferences({
      grainEnabled: false,
      visualFilterEnabled: true,
    })

    expect(preferences.visualFilterEnabled).toBe(true)
  })

  it('falls back to the legacy grain toggle', () => {
    const preferences = sanitizeAppearancePreferences({
      grainEnabled: true,
      grainLayer: 'background',
    })

    expect(preferences.visualFilterEnabled).toBe(true)
    expect(preferences).not.toHaveProperty('grainEnabled')
    expect(preferences).not.toHaveProperty('grainLayer')
  })

  it('rejects invalid current and legacy values', () => {
    expect(sanitizeAppearancePreferences({
      grainEnabled: 'true',
      visualFilterEnabled: 1,
    }).visualFilterEnabled).toBe(false)
  })
})
