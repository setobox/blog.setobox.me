export const APPEARANCE_STORAGE_KEY = 'setobox:appearance:v1'

export const THEME_PRESETS = [
  { name: 'red', label: '红色', hue: 25 },
  { name: 'corail', label: '珊瑚', hue: 46 },
  { name: 'orange', label: '橙色', hue: 70 },
  { name: 'yellow', label: '黄色', hue: 89 },
  { name: 'citrus', label: '柠檬', hue: 109 },
  { name: 'lime', label: '青柠', hue: 130 },
  { name: 'green', label: '绿色', hue: 137 },
  { name: 'turquoise', label: '青绿', hue: 160 },
  { name: 'cyan', label: '青色', hue: 180 },
  { name: 'sky', label: '天蓝', hue: 203 },
  { name: 'sega', label: '浅蓝', hue: 235 },
  { name: 'king', label: '蓝色', hue: 255 },
  { name: 'indigo', label: '靛蓝', hue: 277 },
  { name: 'lavender', label: '薰衣草', hue: 298 },
  { name: 'purple', label: '紫色', hue: 316 },
  { name: 'magenta', label: '洋红', hue: 341 },
  { name: 'pink', label: '粉色', hue: 11 },
] as const

export const CUSTOM_THEME_MIX_PERCENTAGES = [82, 55, 45, 35, 25, 15, 7] as const

export type ThemePreset = typeof THEME_PRESETS[number]['name']
export type ThemePresetOption = typeof THEME_PRESETS[number]

export interface PresetAccentSelection {
  mode: 'preset'
  preset: ThemePreset
}

export interface CustomAccentSelection {
  hue: number
  mode: 'custom'
}

export type AccentSelection = CustomAccentSelection | PresetAccentSelection

export interface AppearancePreferences {
  accent: AccentSelection
}

const DEFAULT_PRESET: ThemePreset = 'sky'
const DEFAULT_HUE = THEME_PRESETS.find(({ name }) => name === DEFAULT_PRESET)?.hue ?? 298
const themePresetNames = new Set<string>(THEME_PRESETS.map(({ name }) => name))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isThemePreset(value: unknown): value is ThemePreset {
  return typeof value === 'string' && themePresetNames.has(value)
}

export function clampHue(value: unknown): number {
  const hue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(hue))
    return DEFAULT_HUE

  return Math.min(360, Math.max(0, Math.round(hue)))
}

export function createDefaultAppearancePreferences(): AppearancePreferences {
  return {
    accent: {
      mode: 'preset',
      preset: DEFAULT_PRESET,
    },
  }
}

export function sanitizeAppearancePreferences(value: unknown): AppearancePreferences {
  const defaults = createDefaultAppearancePreferences()
  if (!isRecord(value) || !isRecord(value.accent))
    return defaults

  if (value.accent.mode === 'preset' && isThemePreset(value.accent.preset)) {
    return {
      accent: {
        mode: 'preset',
        preset: value.accent.preset,
      },
    }
  }

  if (value.accent.mode === 'custom') {
    return {
      accent: {
        mode: 'custom',
        hue: clampHue(value.accent.hue),
      },
    }
  }

  return defaults
}

export function deserializeAppearancePreferences(raw: string): AppearancePreferences {
  try {
    return sanitizeAppearancePreferences(JSON.parse(raw) as unknown)
  }
  catch {
    return createDefaultAppearancePreferences()
  }
}

export function applyAccentSelection(root: HTMLElement, accent: AccentSelection): void {
  root.dataset.accentMode = accent.mode

  if (accent.mode === 'preset') {
    root.dataset.accentPreset = accent.preset
    root.style.removeProperty('--theme-hue')

    for (let step = 1; step <= 8; step++)
      root.style.setProperty(`--theme-${step}`, `var(--hex-${accent.preset}-${step})`)

    return
  }

  const hue = clampHue(accent.hue)
  delete root.dataset.accentPreset
  root.style.setProperty('--theme-hue', String(hue))
  root.style.setProperty('--theme-1', `oklch(0.7 0.1 ${hue})`)

  CUSTOM_THEME_MIX_PERCENTAGES.forEach((percentage, index) => {
    root.style.setProperty(
      `--theme-${index + 2}`,
      `color-mix(in oklch, var(--theme-1) ${percentage}%, var(--hex-bg-1))`,
    )
  })
}

const bootstrapPresetNames = JSON.stringify(THEME_PRESETS.map(({ name }) => name))
const bootstrapMixPercentages = JSON.stringify(CUSTOM_THEME_MIX_PERCENTAGES)

export const APPEARANCE_BOOTSTRAP_SCRIPT = `(() => {
  const root = document.documentElement
  const presets = new Set(${bootstrapPresetNames})
  const mixes = ${bootstrapMixPercentages}
  const clampHue = value => {
    const hue = Number(value)
    return Number.isFinite(hue) ? Math.min(360, Math.max(0, Math.round(hue))) : 298
  }
  const apply = accent => {
    root.dataset.accentMode = accent.mode
    if (accent.mode === 'preset') {
      root.dataset.accentPreset = accent.preset
      root.style.removeProperty('--theme-hue')
      for (let step = 1; step <= 8; step += 1)
        root.style.setProperty('--theme-' + step, 'var(--hex-' + accent.preset + '-' + step + ')')
      return
    }
    const hue = clampHue(accent.hue)
    delete root.dataset.accentPreset
    root.style.setProperty('--theme-hue', String(hue))
    root.style.setProperty('--theme-1', 'oklch(0.7 0.1 ' + hue + ')')
    mixes.forEach((percentage, index) => {
      root.style.setProperty(
        '--theme-' + (index + 2),
        'color-mix(in oklch, var(--theme-1) ' + percentage + '%, var(--hex-bg-1))',
      )
    })
  }
  let accent = { mode: 'preset', preset: 'sky' }
  try {
    const raw = localStorage.getItem('${APPEARANCE_STORAGE_KEY}')
    const stored = raw ? JSON.parse(raw) : null
    const candidate = stored && stored.accent
    if (candidate && candidate.mode === 'preset' && presets.has(candidate.preset))
      accent = { mode: 'preset', preset: candidate.preset }
    else if (candidate && candidate.mode === 'custom')
      accent = { mode: 'custom', hue: clampHue(candidate.hue) }
  }
  catch {}
  apply(accent)
})()`
