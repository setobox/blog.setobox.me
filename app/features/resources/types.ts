export type ResourceIcon = `i-carbon-${string}` | `i-lucide-${string}`

export interface ResourceLink {
  description: string
  href: string
  icon: ResourceIcon
  title: string
}

export interface ResourceGroup {
  description?: string
  items: readonly ResourceLink[]
  title: string
}
