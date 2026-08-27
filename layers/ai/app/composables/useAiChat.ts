import type { UIMessage } from 'ai'
import type { AiSummaryData } from '../../shared/ai/contracts'
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import { computed, onMounted, onScopeDispose, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import { AI_CHAT_STORAGE_KEY } from '../../shared/ai/contracts'
import { toPageContext } from '../features/chat/page-context'
import { parsePersistedChat, serialisePersistedChat } from '../features/chat/persist'

/**
 * Chat state and I/O.
 *
 * Holds no rendering logic: block projection lives in `features/chat/blocks.ts`
 * so it stays unit-testable, matching how `useSearch` delegates to
 * `features/search/results.ts`.
 */
export function useAiChat() {
  const route = useRoute()
  const summary = shallowRef<string | undefined>()
  const restored = shallowRef<UIMessage[]>([])

  const chat = new Chat({
    messages: restored.value,
    onData: (part) => {
      // Server → client state sync only. The summary re-enters the model
      // context through `body.summary` below, never as a message part.
      if (part.type === 'data-summary')
        summary.value = (part.data as AiSummaryData).summary
    },
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      // Evaluated at send time, so a route change is picked up without
      // resetting the conversation.
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          page: toPageContext(route.path, document.title),
          summary: summary.value,
        },
      }),
    }),
  })

  const messages = computed(() => chat.messages)
  const status = computed(() => chat.status)
  const error = computed(() => chat.error)
  const busy = computed(() => chat.status === 'submitted' || chat.status === 'streaming')

  function persist(): void {
    if (!import.meta.client)
      return

    try {
      localStorage.setItem(
        AI_CHAT_STORAGE_KEY,
        serialisePersistedChat(chat.messages, summary.value),
      )
    }
    catch {
      // Quota or private mode: history is a convenience, not a requirement.
    }
  }

  // Read after mount so SSR and the client render the same empty shell.
  onMounted(() => {
    const stored = parsePersistedChat(localStorage.getItem(AI_CHAT_STORAGE_KEY))
    if (!stored)
      return

    summary.value = stored.summary
    chat.messages = stored.messages
  })

  onScopeDispose(persist)

  async function send(text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed || busy.value)
      return

    await chat.sendMessage({ text: trimmed })
    persist()
  }

  function clear(): void {
    chat.messages = []
    summary.value = undefined

    if (import.meta.client)
      localStorage.removeItem(AI_CHAT_STORAGE_KEY)
  }

  function stop(): void {
    void chat.stop()
  }

  return { busy, chat, clear, error, messages, send, status, stop, summary }
}
