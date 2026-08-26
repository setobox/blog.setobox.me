import type { BlogPostSummary } from '#shared/types/blog'
import { escapeXml } from '#shared/utils/xml'
import { queryCollection } from '@nuxt/content/server'
import { appDescription, appName, siteUrl } from '~/constants'

/**
 * Convert date to RFC 822 format (required by RSS 2.0)
 */
function toRFC822(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toUTCString()
}

export default defineEventHandler(async (event) => {
  // Fetch all blog posts sorted by date
  const posts = await queryCollection(event, 'blog')
    .where('noindex', '=', false)
    .order('date', 'DESC')
    .select('title', 'description', 'date', 'path', 'id')
    .all() as BlogPostSummary[]

  // Get the latest post date for lastBuildDate
  const latestPostDate = posts.length > 0 && posts[0]?.date ? posts[0].date : new Date().toISOString()

  // Generate RSS items
  const items = posts.map((post) => {
    const link = `${siteUrl}${post.path}`
    const title = escapeXml(post.title)
    const description = post.description ? escapeXml(post.description) : ''
    const pubDate = toRFC822(post.date)
    const guid = link

    return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      ${description ? `<description>${description}</description>` : ''}
    </item>`
  }).join('\n')

  // Generate RSS XML
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(appName)}</title>
    <link>${siteUrl}/blog</link>
    <description>${escapeXml(appDescription)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${toRFC822(latestPostDate)}</lastBuildDate>
    <atom:link href="${siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  // Set correct content type
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')

  return rss
})
