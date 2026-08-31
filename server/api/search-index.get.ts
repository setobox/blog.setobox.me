import type { BlogPostSummary } from '#shared/types/blog'
import type { SearchDoc, SearchIndex } from '#shared/types/search'
import type { ResourceGroup } from '~~/app/features/resources/types'
import { SEARCH_INDEX_VERSION } from '#shared/types/search'
import { queryCollection } from '@nuxt/content/server'
import { aggregateTaxonomy } from '~/utils/blog-taxonomy'

type IndexPost = Pick<
  BlogPostSummary,
  'categories' | 'date' | 'description' | 'id' | 'path' | 'tags' | 'title'
> & { searchBody?: string }

/**
 * Routes that exist as pages rather than content files. Kept alongside the
 * sitemap's static list, but carries the keywords a reader would actually type.
 */
const staticPages: readonly { path: string, title: string, description: string, meta: string[] }[] = [
  { path: '/blog', title: '博客', description: '全部文章列表。', meta: ['blog', '文章', 'posts'] },
  { path: '/blog/archive', title: '归档', description: '按年份浏览全部文章。', meta: ['archive', '归档', '时间线'] },
  { path: '/blog/categories', title: '分类', description: '按分类浏览文章。', meta: ['categories', '分类'] },
  { path: '/blog/tags', title: '标签', description: '按标签浏览文章。', meta: ['tags', '标签'] },
  { path: '/collections', title: '收藏', description: '我收藏的站点与工具。', meta: ['collections', '收藏', '导航', 'bookmarks'] },
  { path: '/use', title: '装备', description: '我在用的软硬件与配置。', meta: ['uses', '装备', '工具'] },
]

function postDocs(posts: readonly IndexPost[]): SearchDoc[] {
  return posts.map(post => ({
    id: `post:${post.id}`,
    kind: 'post',
    title: post.title,
    description: post.description,
    path: post.path,
    meta: [...(post.categories ?? []), ...(post.tags ?? [])].filter(Boolean),
    body: post.searchBody,
    date: post.date,
  }))
}

function taxonomyDocs(posts: readonly IndexPost[]): SearchDoc[] {
  return (['categories', 'tags'] as const).flatMap(kind =>
    aggregateTaxonomy(posts, kind).map((term): SearchDoc => ({
      id: `${kind === 'categories' ? 'category' : 'tag'}:${term.path}`,
      kind: kind === 'categories' ? 'category' : 'tag',
      title: term.name,
      description: `${term.count} 篇文章`,
      path: term.path,
      meta: [kind === 'categories' ? '分类' : '标签'],
    })),
  )
}

function resourceDocs(groups: readonly ResourceGroup[]): SearchDoc[] {
  const docs: SearchDoc[] = []
  const seen = new Set<string>()

  for (const group of groups) {
    for (const item of group.items) {
      // The same link can sit in several boards; first occurrence wins.
      if (seen.has(item.href))
        continue
      seen.add(item.href)

      docs.push({
        id: `resource:${item.href}`,
        kind: 'resource',
        title: item.title,
        description: item.description || undefined,
        path: item.href,
        external: true,
        meta: [group.title].filter(Boolean),
      })
    }
  }

  return docs
}

export default defineCachedEventHandler(
  async (event): Promise<SearchIndex> => {
    const postsQuery = queryCollection(event, 'blog')
      .where('noindex', '=', false)
    if (!import.meta.dev)
      postsQuery.where('draft', '=', false)

    const posts = await postsQuery
      .order('date', 'DESC')
      .select('categories', 'date', 'description', 'id', 'path', 'searchBody', 'tags', 'title')
      .all() as IndexPost[]

    // Collections come from an external board, so a failure there degrades the
    // index to content-only rather than breaking search outright.
    let resources: ResourceGroup[] = []
    try {
      resources = await $fetch<ResourceGroup[]>('/api/collections')
    }
    catch {
      resources = []
    }

    const docs: SearchDoc[] = [
      ...postDocs(posts),
      ...staticPages.map((page): SearchDoc => ({
        id: `page:${page.path}`,
        kind: 'page',
        title: page.title,
        description: page.description,
        path: page.path,
        meta: page.meta,
      })),
      ...taxonomyDocs(posts),
      ...resourceDocs(resources),
    ]

    return {
      version: SEARCH_INDEX_VERSION,
      builtAt: new Date().toISOString(),
      docs,
    }
  },
  {
    getKey: () => 'search-index',
    group: 'api',
    maxAge: 60 * 60,
    name: 'search-index',
    staleMaxAge: 24 * 60 * 60,
    swr: true,
  },
)
