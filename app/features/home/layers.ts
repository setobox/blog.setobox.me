import type { LayerKey } from '#shared/design/tokens'
import { designTokens } from '#shared/design/tokens'

export interface LayerContent {
  key: Exclude<LayerKey, 'core'>
  label: string
  name: string
  accent: string
  items: readonly string[]
}

export const LAYER_CONTENT: readonly LayerContent[] = [
  {
    key: 'foundation',
    name: 'Foundation',
    label: '工程基座',
    accent: designTokens.colors.layer.foundation,
    items: ['TypeScript 5.9', 'Vite', 'pnpm', 'ESLint flat config'],
  },
  {
    key: 'framework',
    name: 'Framework',
    label: '框架层',
    accent: designTokens.colors.layer.framework,
    items: ['Vue 3 组合式 API', 'Nuxt 4', 'Nitro server routes'],
  },
  {
    key: 'style',
    name: 'Style',
    label: '样式层',
    accent: designTokens.colors.layer.style,
    items: ['UnoCSS 原子化', 'Design Tokens', '响应式断点'],
  },
  {
    key: 'motion',
    name: 'Motion',
    label: '动效层',
    accent: designTokens.colors.layer.motion,
    items: ['GSAP timeline', 'ScrollTrigger', 'Reduced Motion'],
  },
  {
    key: 'render',
    name: 'Render',
    label: '渲染层',
    accent: designTokens.colors.layer.render,
    items: ['Nuxt Content', 'SSR', 'Semantic DOM'],
  },
] as const
