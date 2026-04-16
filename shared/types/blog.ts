export interface BlogPostSummary {
  categories?: string[]
  cover?: string
  date: string
  description?: string
  id: string
  path: string
  pin?: boolean | number
  tags?: string[]
  title: string
}

export interface BlogPagination {
  page: number
  pageCount: number
  pageSize: number
  requestedPage: number
  total: number
}

export interface BlogPageResponse {
  items: BlogPostSummary[]
  pagination: BlogPagination
}
