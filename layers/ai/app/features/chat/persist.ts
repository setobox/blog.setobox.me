import type { UIMessage } from 'ai'
import { AI_CHAT_STATE_VERSION } from '../../../shared/ai/contracts'

/**
 * Conversation persistence.
 *
 * Storage-agnostic on purpose: these take and return raw strings so they can be
 * tested without a DOM, matching `app/features/article-layout/preferences.ts`.
 */

export interface PersistedAiChat {
  version: number
  messages: UIMessage[]
  summary?: string
}

/** Caps stored history; the model context is budgeted separately server-side. */
const MAX_STORED_MESSAGES = 100

export function parsePersistedChat(raw: string | null | undefined): PersistedAiChat | undefined {
  if (!raw)
    return undefined

  try {
    const parsed = JSON.parse(raw) as unknown

    if (!parsed || typeof parsed !== 'object')
      return undefined

    const { version, messages, summary } = parsed as Partial<PersistedAiChat>

    // No migration path yet: a version bump discards rather than mis-renders.
    if (version !== AI_CHAT_STATE_VERSION || !Array.isArray(messages))
      return undefined

    return {
      version: AI_CHAT_STATE_VERSION,
      messages: messages.slice(-MAX_STORED_MESSAGES),
      summary: typeof summary === 'string' && summary ? summary : undefined,
    }
  }
  catch {
    return undefined
  }
}

export function serialisePersistedChat(messages: readonly UIMessage[], summary?: string): string {
  return JSON.stringify({
    version: AI_CHAT_STATE_VERSION,
    messages: messages.slice(-MAX_STORED_MESSAGES),
    summary: summary || undefined,
  } satisfies PersistedAiChat)
}
