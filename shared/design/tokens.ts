/** Runtime-independent visual tokens shared by UnoCSS and Nuxt. */

const ink = {
  950: '#08090B',
  900: '#0B0D10',
  850: '#0F1216',
  800: '#14181D',
  700: '#1D232A',
  600: '#2A323C',
  500: '#3D4754',
  400: '#5A6674',
  300: '#8A96A4',
  200: '#B8C2CE',
  100: '#DDE3EA',
  50: '#F2F5F8',
} as const

const layer = {
  foundation: '#F2A93B',
  framework: '#00DC82',
  style: '#4FC3F7',
  motion: '#FF5A7A',
  render: '#A78BFA',
  core: '#FFFFFF',
} as const

const beat = {
  's0': '#08090B',
  's1': '#0B0D10',
  's2': '#0C1014',
  's3-l0': '#14100A',
  's3-l1': '#08120E',
  's3-l2': '#0A1014',
  's3-l3': '#140A0E',
  's3-l4': '#0F0A16',
  's4': '#0B0D10',
  's5': '#0B0D10',
  's6': '#08090B',
} as const

const fontFamilies = {
  base: 'AaZongYiYuan',
  mono: 'Monaspace Krypton',
} as const

export const designTokens = {
  colors: {
    ink,
    layer,
    accent: layer.motion,
    state: {
      success: layer.framework,
      error: '#FF5A5A',
      warn: layer.foundation,
    },
    beat,
  },
  typography: {
    families: fontFamilies,
    sizes: {
      'display-2xl': { fontSize: 'clamp(3rem, 9vw, 8rem)', lineHeight: '0.95', letterSpacing: '-0.03em' },
      'display-xl': { fontSize: 'clamp(2.25rem, 5.5vw, 4.5rem)', lineHeight: '0.98', letterSpacing: '-0.03em' },
      'display-lg': { fontSize: 'clamp(1.75rem, 3.5vw, 3rem)', lineHeight: '1.05', letterSpacing: '-0.02em' },
      'h2': { fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', lineHeight: '1.2' },
      'h3': { fontSize: 'clamp(1.25rem, 1.8vw, 1.5rem)', lineHeight: '1.3' },
      'h4': { fontSize: '1.125rem', lineHeight: '1.4' },
      'body-lg': { fontSize: '1.125rem', lineHeight: '1.75' },
      'body': { fontSize: '1rem', lineHeight: '1.5' },
      'sm': { fontSize: '0.875rem', lineHeight: '1.5' },
      'xs': { fontSize: '0.75rem', lineHeight: '1.4', letterSpacing: '0.08em' },
    },
  },
  spacing: {
    section: 'clamp(5rem, 10vw, 10rem)',
    block: 'clamp(2.5rem, 5vw, 4rem)',
    group: '1.5rem',
    item: '0.75rem',
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '16px',
  },
  containers: {
    prose: '80ch',
    content: '1500px',
    wide: '1500px',
    blogSidebar: '280px',
  },
  zIndex: {
    canvas: 0,
    content: 10,
    callout: 20,
    header: 40,
    overlay: 60,
    preloader: 90,
    toast: 100,
  },
  motion: {
    ease: {
      enter: 'power3.out',
      exit: 'power2.in',
      emphasis: 'expo.out',
      smooth: 'power2.inOut',
      mech: 'power4.inOut',
      spring: 'elastic.out(1, 0.6)',
      back: 'back.out(1.7)',
      linear: 'none',
    },
    duration: {
      instant: 0.12,
      fast: 0.24,
      base: 0.4,
      slow: 0.7,
      xslow: 1.2,
    },
    stagger: {
      tight: 0.02,
      base: 0.045,
      loose: 0.09,
      grid: { amount: 0.8, from: 'center', grid: 'auto' },
    },
  },
} as const

export type LayerKey = keyof typeof designTokens.colors.layer
export type BeatKey = keyof typeof designTokens.colors.beat

export const layerKeys = Object.freeze(
  Object.keys(designTokens.colors.layer) as LayerKey[],
)

export const layerEntries = Object.freeze(
  layerKeys.map(key => [key, designTokens.colors.layer[key]] as const),
)

/** Theme fragment consumed directly by uno.config.ts. */
export const unoTheme = {
  colors: designTokens.colors,
  text: designTokens.typography.sizes,
  spacing: {
    ...designTokens.spacing,
    'sidebar-blog': designTokens.containers.blogSidebar,
  },
  container: {
    prose: designTokens.containers.prose,
    content: designTokens.containers.content,
    wide: designTokens.containers.wide,
  },
  radius: designTokens.radii,
} as const

/** Critical CSS variables emitted from the same values as the utility theme. */
export const runtimeCssVars = {
  '--c-bg': designTokens.colors.beat.s1,
  '--c-layer': designTokens.colors.layer.motion,
  '--c-accent': designTokens.colors.accent,
  '--c-text': designTokens.colors.ink[100],
  '--motion-instant': `${designTokens.motion.duration.instant * 1000}ms`,
  '--motion-fast': `${designTokens.motion.duration.fast * 1000}ms`,
  '--motion-base': `${designTokens.motion.duration.base * 1000}ms`,
  '--motion-slow': `${designTokens.motion.duration.slow * 1000}ms`,
} as const

export function renderRuntimeCssVars(): string {
  const declarations = Object.entries(runtimeCssVars)
    .map(([name, value]) => `${name}:${value}`)
    .join(';')
  return `:root{${declarations}}`
}

// Only the mono face is preloaded: it renders above the fold in every
// `text-meta` chip and is 445KB. The base face (AaZongYiYuan) is a 3.7MB CJK
// font -- preloading it would starve LCP, so it stays on `font-display: swap`
// until it is subset.
export const fontPreloads = [{
  rel: 'preload',
  href: '/fonts/monaspace-krypton-var.woff2',
  as: 'font',
  type: 'font/woff2',
  crossorigin: '',
}] as const
