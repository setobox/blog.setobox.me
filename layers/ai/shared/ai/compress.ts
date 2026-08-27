import type { ModelMessage } from 'ai'

/**
 * Summary recycling.
 *
 * When the window drops older turns, their gist is folded into a summary that
 * is re-injected as a primed exchange. The primed assistant reply is not
 * decoration: it keeps strict user/assistant alternation and makes the model
 * treat the summary as established context rather than a question to answer.
 */

export const SUMMARY_PREFIX = '以下是之前对话的上下文摘要（请基于此继续对话）：\n'
export const SUMMARY_ACK = '好的，我已了解之前的对话上下文，可以继续讨论。'

export function summaryMessages(summary: string): ModelMessage[] {
  if (!summary.trim())
    return []

  return [
    { role: 'user', content: `${SUMMARY_PREFIX}${summary.trim()}` },
    { role: 'assistant', content: SUMMARY_ACK },
  ]
}

/** Flattens messages into the transcript handed to the summarising call. */
export function transcriptFor(messages: readonly ModelMessage[]): string {
  return messages
    .map((message) => {
      const { content } = message
      const text
        = typeof content === 'string'
          ? content
          : Array.isArray(content)
            ? content
                .map((part) => {
                  if (typeof part === 'string')
                    return part
                  if (part && typeof part === 'object' && 'text' in part)
                    return String((part as { text: unknown }).text)
                  return ''
                })
                .filter(Boolean)
                .join(' ')
            : ''

      return text.trim() ? `${message.role}: ${text.trim()}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

export const SUMMARY_INSTRUCTION
  = '用中文简洁总结以下对话的关键信息：用户的目标、已确认的结论、待解决的问题。'
    + '只输出摘要正文，不要开场白，不超过 300 字。'

/**
 * Merges a fresh summary with the one carried over from earlier compressions,
 * so context accumulates instead of each round overwriting the last.
 */
export function mergeSummary(previous: string | undefined, next: string): string {
  const before = previous?.trim()
  const after = next.trim()

  if (!before)
    return after
  if (!after)
    return before

  return `${before}\n${after}`
}
