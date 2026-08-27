import type { PageContext } from '../../../shared/ai/contracts'

/**
 * Route → page context.
 *
 * Pure so the article-path rule stays testable; it is resolved at send time,
 * never persisted, so a stale snapshot can't shadow the current route.
 */

/** Article routes are `/blog/<year>/<slug>`; `/blog`, `/blog/tags/x` are not. */
const ARTICLE_ROUTE_RE = /^\/blog\/\d{4}\//

export function toPageContext(path: string, title?: string): PageContext {
  return {
    path,
    title: title?.trim() || undefined,
    type: ARTICLE_ROUTE_RE.test(path) ? 'article' : 'page',
  }
}
