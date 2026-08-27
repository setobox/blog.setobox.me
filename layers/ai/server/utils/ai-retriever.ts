import type { H3Event } from 'h3'
import type { Retriever } from '../../shared/ai/contracts'

/**
 * Content access is injected rather than imported, so this layer never depends
 * on `@nuxt/content` or on the host app's search utilities.
 *
 * The registry holds a *factory*, not a retriever: content queries need the
 * request event to reach the D1 binding, and caching one instance across
 * requests would bind every reader to whichever event registered first.
 * The factory itself is written once at startup and read-only afterwards.
 */
export type RetrieverFactory = (event: H3Event) => Retriever

let factory: RetrieverFactory | undefined

export function registerAiRetriever(next: RetrieverFactory): void {
  factory = next
}

export function getAiRetriever(event: H3Event): Retriever {
  if (!factory) {
    throw createError({
      statusCode: 503,
      statusMessage: 'AI retriever is not registered.',
    })
  }

  return factory(event)
}
