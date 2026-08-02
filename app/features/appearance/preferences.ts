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
export const ARTICLE_LAYOUTS = ['list', 'grid'] as const

export type ThemePreset = typeof THEME_PRESETS[number]['name']
export type ThemePresetOption = typeof THEME_PRESETS[number]
export type ArticleLayout = typeof ARTICLE_LAYOUTS[number]

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
  articleLayout: ArticleLayout
  cardBorders: boolean
  cardThemeTint: boolean
  visualFilterEnabled: boolean
}

const DEFAULT_PRESET: ThemePreset = 'sky'
const DEFAULT_HUE = THEME_PRESETS.find(({ name }) => name === DEFAULT_PRESET)?.hue ?? 298
const themePresetNames = new Set<string>(THEME_PRESETS.map(({ name }) => name))
const articleLayouts = new Set<string>(ARTICLE_LAYOUTS)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isThemePreset(value: unknown): value is ThemePreset {
  return typeof value === 'string' && themePresetNames.has(value)
}

export function isArticleLayout(value: unknown): value is ArticleLayout {
  return typeof value === 'string' && articleLayouts.has(value)
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
    articleLayout: 'list',
    cardBorders: true,
    cardThemeTint: false,
    visualFilterEnabled: false,
  }
}

export function sanitizeAppearancePreferences(value: unknown): AppearancePreferences {
  const defaults = createDefaultAppearancePreferences()
  if (!isRecord(value))
    return defaults

  let accent = defaults.accent

  if (isRecord(value.accent)) {
    if (value.accent.mode === 'preset' && isThemePreset(value.accent.preset)) {
      accent = {
        mode: 'preset',
        preset: value.accent.preset,
      }
    }
    else if (value.accent.mode === 'custom') {
      accent = {
        mode: 'custom',
        hue: clampHue(value.accent.hue),
      }
    }
  }

  return {
    accent,
    articleLayout: isArticleLayout(value.articleLayout)
      ? value.articleLayout
      : defaults.articleLayout,
    cardBorders: typeof value.cardBorders === 'boolean'
      ? value.cardBorders
      : defaults.cardBorders,
    cardThemeTint: typeof value.cardThemeTint === 'boolean'
      ? value.cardThemeTint
      : defaults.cardThemeTint,
    visualFilterEnabled: typeof value.visualFilterEnabled === 'boolean'
      ? value.visualFilterEnabled
      : typeof value.grainEnabled === 'boolean'
        ? value.grainEnabled
        : defaults.visualFilterEnabled,
  }
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

export function applyAppearancePreferences(
  root: HTMLElement,
  preferences: AppearancePreferences,
): void {
  applyAccentSelection(root, preferences.accent)
  root.dataset.articleLayout = preferences.articleLayout
  root.dataset.cardBorders = String(preferences.cardBorders)
  root.dataset.cardThemeTint = String(preferences.cardThemeTint)
  root.dataset.visualFilterEnabled = String(preferences.visualFilterEnabled)
  delete root.dataset.grainEnabled
  delete root.dataset.grainLayer
}

const bootstrapPresetNames = JSON.stringify(THEME_PRESETS.map(({ name }) => name))
const bootstrapMixPercentages = JSON.stringify(CUSTOM_THEME_MIX_PERCENTAGES)
const bootstrapArticleLayouts = JSON.stringify(ARTICLE_LAYOUTS)

export const APPEARANCE_BOOTSTRAP_SCRIPT = `(() => {
  const root = document.documentElement
  const presets = new Set(${bootstrapPresetNames})
  const mixes = ${bootstrapMixPercentages}
  const articleLayouts = new Set(${bootstrapArticleLayouts})
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
  let preferences = {
    accent: { mode: 'preset', preset: 'sky' },
    articleLayout: 'list',
    cardBorders: true,
    cardThemeTint: false,
    visualFilterEnabled: false,
  }
  try {
    const raw = localStorage.getItem('${APPEARANCE_STORAGE_KEY}')
    const stored = raw ? JSON.parse(raw) : null
    const candidate = stored && stored.accent
    if (candidate && candidate.mode === 'preset' && presets.has(candidate.preset))
      preferences.accent = { mode: 'preset', preset: candidate.preset }
    else if (candidate && candidate.mode === 'custom')
      preferences.accent = { mode: 'custom', hue: clampHue(candidate.hue) }
    if (stored && articleLayouts.has(stored.articleLayout))
      preferences.articleLayout = stored.articleLayout
    if (stored && typeof stored.cardBorders === 'boolean')
      preferences.cardBorders = stored.cardBorders
    if (stored && typeof stored.cardThemeTint === 'boolean')
      preferences.cardThemeTint = stored.cardThemeTint
    if (stored && typeof stored.visualFilterEnabled === 'boolean')
      preferences.visualFilterEnabled = stored.visualFilterEnabled
    else if (stored && typeof stored.grainEnabled === 'boolean')
      preferences.visualFilterEnabled = stored.grainEnabled
  }
  catch {}
  apply(preferences.accent)
  root.dataset.articleLayout = preferences.articleLayout
  root.dataset.cardBorders = String(preferences.cardBorders)
  root.dataset.cardThemeTint = String(preferences.cardThemeTint)
  root.dataset.visualFilterEnabled = String(preferences.visualFilterEnabled)
  delete root.dataset.grainEnabled
  delete root.dataset.grainLayer
})()`
