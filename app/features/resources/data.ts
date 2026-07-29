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
