/**
 * The layer's public contract.
 *
 * Nothing here may import from the host application: the layer is meant to be
 * extractable into a standalone module, so content access arrives through
 * `Retriever` and site metadata through `runtimeConfig.ai.public.site`.
 */

/** Where the reader currently is, sent fresh on every request. */
export interface PageContext {
  type: 'article' | 'page'
  path: string
  title?: string
}

/** A search result, already trimmed to what the model should see. */
export interface RetrievedHit {
  path: string
  title: string
  excerpt?: string
  date?: string
}

/** Full article prose, derived at build time rather than parsed per request. */
export interface RetrievedArticle {
  path: string
  title: string
  text: string
}

/**
 * Content access, injected by the host app in a Nitro plugin.
 *
 * Written once at startup and read-only afterwards — unlike per-request state
 * such as `PageContext`, which is passed explicitly through closures.
 */
export interface Retriever {
  search: (query: string, limit: number) => Promise<RetrievedHit[]>
  readArticle: (path: string) => Promise<RetrievedArticle | undefined>
}

export interface AiSiteConfig {
  name: string
  description: string
  url: string
}

/** A source the assistant leaned on, rendered as a card rather than a link. */
export interface AiCitation {
  path: string
  title: string
}

/** Server → client conversation-state sync. Never fed back into the model. */
export interface AiSummaryData {
  summary: string
  droppedMessages: number
}

export const AI_CHAT_STORAGE_KEY = 'setobox:ai-chat:v1'
export const AI_CHAT_STATE_VERSION = 1
