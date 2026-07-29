export type ResourceIcon = `i-carbon-${string}` | `i-lucide-${string}`

export interface ResourceLink {
  description: string
  href: string
  icon?: ResourceIcon
  imageUrl?: string
  title: string
}

export interface ResourceGroup {
  description?: string
  items: readonly ResourceLink[]
  title: string
}
