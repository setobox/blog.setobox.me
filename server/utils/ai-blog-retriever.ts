import type { SearchDoc } from '#shared/types/search'
import type { H3Event } from 'h3'
import type { Retriever } from '../../layers/ai/shared/ai/contracts'
import { bodyExcerpt, searchDocs } from '#shared/utils/search-score'
import { queryCollection } from '@nuxt/content/server'

/**
 * The host app's half of the AI layer's `Retriever` contract.
 *
 * Deliberately lives here rather than in `layers/ai`: it is the only place that
 * knows about `@nuxt/content` and the site's search utilities, which keeps the
 * layer itself extractable.
 */

interface AiPost {
  aiBody?: string
  date?: string
  description?: string
  id: string
  path: string
  searchBody?: string
  title: string
}

export function createBlogRetriever(event: H3Event): Retriever {
  return {
    async search(query, limit) {
      const posts = (await queryCollection(event, 'blog')
        .where('noindex', '=', false)
        .order('date', 'DESC')
        .select('date', 'description', 'id', 'path', 'searchBody', 'title')
        .all()) as AiPost[]

      // Reuses the same scorer as site search, so the assistant ranks results
      // the way the search dialog does — including CJK bigram matching.
      const docs: SearchDoc[] = posts.map(post => ({
        body: post.searchBody,
        date: post.date,
        description: post.description,
        id: post.id,
        kind: 'post',
        path: post.path,
        title: post.title,
      }))

      return searchDocs(docs, query, { limit }).map(hit => ({
        date: hit.doc.date,
        excerpt: bodyExcerpt(hit)?.text ?? hit.doc.description,
        path: hit.doc.path,
        title: hit.doc.title,
      }))
    },

    async readArticle(path) {
      const post = (await queryCollection(event, 'blog')
        .where('noindex', '=', false)
        .path(path)
        .select('aiBody', 'path', 'searchBody', 'title')
        .first()) as AiPost | undefined

      if (!post)
        return undefined

      // `aiBody` is the untruncated prose derived at parse time; `searchBody`
      // is a 1200-char snippet and only a fallback.
      const text = post.aiBody ?? post.searchBody

      if (!text)
        return undefined

      return { path: post.path, title: post.title, text }
    },
  }
}
