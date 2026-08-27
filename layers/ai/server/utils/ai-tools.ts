import type { ToolSet } from 'ai'
import type { AiCitation, PageContext, Retriever } from '../../shared/ai/contracts'
import { tool } from 'ai'
import { z } from 'zod'

/** Keeps a single tool result from crowding out the conversation. */
const MAX_ARTICLE_CHARS = 6_000

export interface AiToolsOptions {
  page?: PageContext
  retriever: Retriever
}

function citations(hits: readonly { path: string, title: string }[]): AiCitation[] {
  return hits.map(hit => ({ path: hit.path, title: hit.title }))
}

/**
 * Built per request so `page` is captured in a closure.
 *
 * Deliberately not module state: Workers reuse an isolate across requests, so a
 * shared mutable `page` would leak one reader's context into another's.
 */
export function aiTools({ page, retriever }: AiToolsOptions): ToolSet {
  return {
    get_current_page: tool({
      description:
        '获取用户当前正在浏览的页面信息（路径、标题、是否文章页）。'
        + '当用户说「这篇」「当前文章」「我现在看的」时，先调用它确定目标，再用 read_article 读正文。',
      inputSchema: z.object({}),
      execute: async () => {
        if (!page)
          return { found: false as const, hint: '无法确定当前页面，请让用户明确说明文章标题。' }

        return { found: true as const, page }
      },
    }),

    read_article: tool({
      description:
        '读取指定路径文章的正文内容。仅在需要具体内容（总结、比较、引用细节）时调用；'
        + '路径需来自 get_current_page 或 search_posts 的返回值。',
      inputSchema: z.object({
        path: z.string().describe('文章路径，例如 /blog/2026/nuxt-guide'),
      }),
      execute: async ({ path }) => {
        const article = await retriever.readArticle(path)

        if (!article)
          return { found: false as const, path }

        const truncated = article.text.length > MAX_ARTICLE_CHARS

        return {
          found: true as const,
          path: article.path,
          title: article.title,
          text: truncated ? `${article.text.slice(0, MAX_ARTICLE_CHARS)}…` : article.text,
          truncated,
          citations: citations([article]),
        }
      },
    }),

    search_posts: tool({
      description:
        '按关键词搜索本站文章，返回标题、路径与摘要片段（不含全文）。'
        + '适用于「你写过哪些 X」「找几篇关于 X 的文章」这类问题。',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(5).default(5).describe('返回条数，最多 5'),
        query: z.string().min(1).describe('搜索关键词，支持中文'),
      }),
      execute: async ({ limit, query }) => {
        const hits = await retriever.search(query, limit)

        return {
          count: hits.length,
          hits,
          citations: citations(hits),
        }
      },
    }),

    get_site_context: tool({
      description: '获取本站的基本信息（站点名、简介、地址）。用于回答「这个博客是谁的」这类问题。',
      inputSchema: z.object({}),
      execute: async () => aiSite(),
    }),
  }
}
