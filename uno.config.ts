import type { Rule } from 'unocss'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import {
  designTokens,
  renderRuntimeCssVars,
  unoTheme,
} from './shared/design/tokens'

const semanticZIndexRules = Object.entries(designTokens.zIndex).map<Rule>(
  ([name, value]) => [`z-${name}`, { 'z-index': value }],
)

export default defineConfig({
  presets: [
    presetWind4(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
    }),
    presetTypography({
      cssExtend: {
        'code::before': { content: '""' },
        'code::after': { content: '""' },
      },
    }),
    presetWebFonts({
      provider: 'none',
      fonts: {
        base: ['AaZongYiYuan', 'sans-serif'],
        mono: ['Monaspace Krypton', 'ui-monospace', 'monospace'],
      },
    }),
  ],

  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],

  preflights: [
    { getCSS: renderRuntimeCssVars },
  ],

  theme: {
    colors: {
      ...unoTheme.colors,
    },
    text: unoTheme.text,
    spacing: unoTheme.spacing,
    container: unoTheme.container,
    radius: unoTheme.radius,
  },

  shortcuts: [
    ['container-content', 'mx-auto w-full max-w-content px-4 lg:px-6'],
    ['container-wide', 'mx-auto w-full max-w-wide px-4 lg:px-6'],
    ['container-prose', 'mx-auto w-full max-w-prose px-4 lg:px-6'],
    ['surface', 'bg-ink-800 border border-ink-700 rounded-md'],
    ['surface-hover', 'transition-colors duration-240 hover:border-ink-600'],
    ['text-meta', 'font-mono text-xs uppercase text-ink-300'],
    ['text-lead', 'text-body-lg text-ink-200'],
    ['focus-ring', 'outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'],
    ['link', 'text-accent underline-offset-4 hover:underline focus-ring'],
    ['btn', 'inline-flex items-center gap-2 px-4 py-2.5 rounded-sm font-medium transition-all duration-240 outline-none'],
    ['btn-primary', 'btn bg-accent text-ink-950 hover:brightness-110'],
    ['btn-ghost', 'btn border border-ink-700 text-ink-100 hover:border-ink-600 hover:bg-ink-850'],
    ['callout-label', 'font-mono text-xs uppercase px-2 py-1 rounded-sm border bg-ink-950/80 backdrop-blur-sm'],
  ],

  rules: [
    ...semanticZIndexRules,
    ['text-layer', { color: 'var(--c-layer)' }],
    ['border-layer', { 'border-color': 'var(--c-layer)' }],
    ['bg-layer', { 'background-color': 'var(--c-layer)' }],
    ['glow-layer', { 'box-shadow': '0 0 24px -4px var(--c-layer)' }],
  ],
  content: {
    pipeline: {
      include: [/\.(vue|[jt]sx?|md)($|\?)/],
    },
  },
})
