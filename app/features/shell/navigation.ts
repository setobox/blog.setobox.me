export interface SiteNavigationItem {
  external?: boolean
  icon: `i-carbon-${string}` | `i-lucide-${string}`
  label: string
  to: string
}

export const primaryNavigation: readonly SiteNavigationItem[] = [
  { to: '/blog', label: '文章', icon: 'i-carbon-container-image' },
  { to: '/collections', label: '导航', icon: 'i-lucide-bookmark' },
  { to: '/use', label: 'Use', icon: 'i-carbon-tools-alt' },
  {
    to: 'https://github.com/setobox',
    label: 'GitHub',
    icon: 'i-carbon-logo-github',
    external: true,
  },
]

export const footerNavigation: readonly SiteNavigationItem[] = [
  { to: '/blog', label: '博客', icon: 'i-carbon-container-image' },
  { to: '/collections', label: '收藏', icon: 'i-lucide-bookmark' },
  { to: '/use', label: 'Use', icon: 'i-carbon-tools-alt' },
  {
    to: 'https://github.com/setobox',
    label: 'GitHub',
    icon: 'i-carbon-logo-github',
    external: true,
  },
]

export const requiredDiscoverableRoutes = [
  '/blog',
  '/collections',
  '/use',
] as const
