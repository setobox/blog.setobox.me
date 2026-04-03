import type { ResourceGroup } from './types'

export const projectGroups = [
  {
    title: 'Current',
    description: '目前正在维护的项目。',
    items: [
      {
        title: 'setobox.me',
        description: '使用 Nuxt Content 构建的个人网站与博客。',
        href: 'https://setobox.me',
        icon: 'i-lucide-globe-2',
      },
    ],
  },
] as const satisfies readonly ResourceGroup[]

export const collectionGroups = [
  {
    title: 'Development Resources',
    description: '当前项目使用的框架、样式与交互工具。',
    items: [
      {
        title: 'Nuxt',
        description: '基于 Vue 的全栈应用框架。',
        href: 'https://nuxt.com',
        icon: 'i-lucide-box',
      },
      {
        title: 'Vue',
        description: '渐进式 JavaScript 框架。',
        href: 'https://vuejs.org',
        icon: 'i-lucide-layers-3',
      },
      {
        title: 'UnoCSS',
        description: '即时按需的原子化 CSS 引擎。',
        href: 'https://unocss.dev',
        icon: 'i-lucide-wand-sparkles',
      },
      {
        title: 'VueUse',
        description: 'Vue Composition API 工具集。',
        href: 'https://vueuse.org',
        icon: 'i-lucide-braces',
      },
      {
        title: 'GSAP',
        description: '用于精确编排网页动画的工具库。',
        href: 'https://gsap.com',
        icon: 'i-lucide-activity',
      },
    ],
  },
  {
    title: 'Online Tools',
    description: '无需本地安装即可使用的开发工具。',
    items: [
      {
        title: 'StackBlitz',
        description: '浏览器中的即时开发环境。',
        href: 'https://stackblitz.com',
        icon: 'i-lucide-zap',
      },
      {
        title: 'Iconify',
        description: '浏览与检索开源图标集合。',
        href: 'https://icon-sets.iconify.design',
        icon: 'i-lucide-shapes',
      },
    ],
  },
] as const satisfies readonly ResourceGroup[]
