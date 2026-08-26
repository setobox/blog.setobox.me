import type { BlogPostSummary } from '#shared/types/blog'
import { escapeXml } from '#shared/utils/xml'
import { queryCollection } from '@nuxt/content/server'
import { siteUrl } from '~/constants'
import { aggregateTaxonomy } from '~/utils/blog-taxonomy'

/**
 * Sitemaps use W3C datetime; date-only is valid and avoids implying a
 * precision the frontmatter does not have.
 */
function toW3CDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().slice(0, 10)
}

interface SitemapEntry {
  loc: string
  lastmod?: string
  changefreq: string
  priority: string
}

type SitemapPost = Pick<BlogPostSummary, 'categories' | 'date' | 'path' | 'tags' | 'updated'>

/**
 * Routes that exist as pages rather than content files, so they cannot be
 * discovered through `queryCollection`.
 */
const staticEntries: readonly Omit<SitemapEntry, 'lastmod'>[] = [
  { loc: '/blog', changefreq: 'daily', priority: '1.0' },
  { loc: '/blog/archive', changefreq: 'weekly', priority: '0.6' },
  { loc: '/blog/categories', changefreq: 'weekly', priority: '0.5' },
  { loc: '/blog/tags', changefreq: 'weekly', priority: '0.5' },
  { loc: '/collections', changefreq: 'weekly', priority: '0.6' },
  { loc: '/use', changefreq: 'monthly', priority: '0.6' },
]

export default defineEventHandler(async (event) => {
  const posts = await queryCollection(event, 'blog')
    .where('noindex', '=', false)
    .order('date', 'DESC')
    .select('categories', 'date', 'path', 'tags', 'updated')
    .all() as SitemapPost[]

  // Taxonomy pages are derived from frontmatter, so they follow the posts that
  // are actually indexed rather than a hand-kept list.
  const taxonomyEntries: SitemapEntry[] = (['categories', 'tags'] as const)
    .flatMap(kind => aggregateTaxonomy(posts, kind))
    .map(term => ({ loc: term.path, changefreq: 'weekly', priority: '0.4' }))

  const entries: SitemapEntry[] = [
    ...staticEntries,
    ...posts.map(post => ({
      loc: post.path,
      lastmod: toW3CDate(post.updated ?? post.date),
      changefreq: 'monthly',
      priority: '0.8',
    })),
    ...taxonomyEntries,
  ]

  const urls = entries.map((entry) => {
    const loc = escapeXml(`${siteUrl}${entry.loc}`)
    return `  <url>
    <loc>${loc}</loc>${entry.lastmod
      ? `
    <lastmod>${entry.lastmod}</lastmod>`
      : ''}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  }).join('\n')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')

  return sitemap
})
