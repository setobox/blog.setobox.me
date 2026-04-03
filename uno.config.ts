import { createLocalFontProcessor } from '@unocss/preset-web-fonts/local'
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

const paletteNames = [
  'black',
  'white',
  'red',
  'corail',
  'orange',
  'yellow',
  'citrus',
  'lime',
  'green',
  'turquoise',
  'cyan',
  'sky',
  'sega',
  'king',
  'indigo',
  'lavender',
  'purple',
  'magenta',
  'pink',
  'fg',
] as const

function createColorScale(name: string, steps = 8) {
  return Object.fromEntries(
    Array.from({ length: steps }, (_, index) => {
      const step = index + 1
      return [step, `var(--hex-${name}-${step})`]
    }),
  )
}

const paletteColors = Object.fromEntries(
  paletteNames.map(name => [name, createColorScale(name)]),
)

export default defineConfig({
  shortcuts: [
    ['bg-base', 'bg-ui-bg'],
    ['bg-secondary', 'bg-ui-surface'],
    ['border-base', 'border-ui-border'],
    ['btn-action', 'inline-flex min-h-12 items-center justify-center gap-2 border border-current px-5 py-3 font-mono text-sm font-bold no-underline transition-colors duration-150'],
    ['color-base', 'text-ui-text'],
    ['color-soft', 'text-ui-text-soft'],
    ['flex-center', 'flex items-center justify-center'],
    ['home-container', 'mx-auto w-full max-w-1500px px-4 md:px-8 lg:px-16'],
    ['blog-card', 'grid overflow-hidden rounded-xl bg-bg-2 shadow-[0_12px_36px_rgba(0,0,0,0.16)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(0,0,0,0.22)] sm:grid-cols-[minmax(0,1.15fr)_minmax(15rem,0.85fr)]'],
    ['blog-page-control', 'inline-flex h-14 w-14 items-center justify-center rounded-xl border font-mono text-lg no-underline tabular-nums shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition-[border-color,background-color,color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-fg-3 focus-visible:outline-offset-2'],
    ['section-label', 'm-0 font-mono text-11px tracking-0.16em text-ui-text-mute'],
    ['text-link', 'cursor-pointer transition-colors duration-150 ease-in-out'],
    ['container', 'mx-auto max-w-1500px w-full'],
    ['btn', 'px-4 py-1 rounded inline-block bg-teal-600 text-fg-1 cursor-pointer hover:bg-teal-700 disabled:cursor-default disabled:bg-gray-600 disabled:opacity-50'],
    ['icon-btn', 'inline-flex h-11 w-11 cursor-pointer select-none items-center justify-center border border-ui-border bg-transparent text-ui-text-soft transition-colors duration-150 hover:text-ui-text'],
  ],
  theme: {
    colors: {
      ...paletteColors,
      'bg': createColorScale('bg', 7),
      'current': createColorScale('current'),
      'ui-bg': 'var(--ui-bg)',
      'ui-border': 'var(--ui-border)',
      'ui-surface': 'var(--ui-surface)',
      'ui-text': 'var(--ui-text)',
      'ui-text-mute': 'var(--ui-text-mute)',
      'ui-text-soft': 'var(--ui-text-soft)',
    },
  },
  presets: [
    presetWind4(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
    }),
    presetTypography(),
    presetWebFonts({
      fonts: {
        sans: 'DM Sans',
        serif: 'DM Serif Display',
        mono: 'DM Mono',
      },
      processors: createLocalFontProcessor(),
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
