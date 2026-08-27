import type { ModelMessage } from 'ai'

/**
 * Context budgeting.
 *
 * Pure and dependency-free so it can be unit tested in bare node, matching how
 * `shared/utils/search-*.ts` is structured in the host app.
 */

const CJK_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu

/** CJK packs ~1.5 characters per token; latin text ~4. Rounds up, so it over- rather than under-estimates. */
export function estimateTokens(text: string): number {
  if (!text)
    return 0

  const cjk = text.match(CJK_RE)?.length ?? 0
  const rest = text.length - cjk

  return Math.ceil(cjk / 1.5 + rest / 4)
}

function partText(part: unknown): string {
  if (typeof part === 'string')
    return part

  if (!part || typeof part !== 'object')
    return ''

  const record = part as Record<string, unknown>

  if (typeof record.text === 'string')
    return record.text

  // Tool calls and results carry their payload as structured JSON.
  for (const key of ['input', 'output', 'result'] as const) {
    if (record[key] !== undefined) {
      try {
        return JSON.stringify(record[key])
      }
      catch {
        return ''
      }
    }
  }

  return ''
}

export function messageTokens(message: ModelMessage): number {
  const { content } = message
  const text
    = typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map(partText).join(' ')
        : ''

  // Constant covers role framing the provider adds around every message.
  return estimateTokens(text) + 4
}

export function totalTokens(messages: readonly ModelMessage[]): number {
  return messages.reduce((sum, message) => sum + messageTokens(message), 0)
}

/**
 * True when a message depends on an earlier one and cannot start a window.
 *
 * A `tool` result whose originating `assistant` tool-call has been dropped is
 * rejected by the provider, so the window boundary must never split that pair.
 */
function isDependentOnPrevious(message: ModelMessage): boolean {
  if (message.role === 'tool')
    return true

  // An assistant turn that only issues tool calls is answered by the `tool`
  // message after it; starting a window there would orphan that answer.
  if (message.role === 'assistant' && Array.isArray(message.content)) {
    return message.content.some(
      part => typeof part === 'object' && part !== null && 'toolCallId' in part,
    )
  }

  return false
}

export interface SlidingWindowResult {
  /** Messages that fit, oldest first. */
  kept: ModelMessage[]
  /** Messages that fell out of the window, oldest first. */
  dropped: ModelMessage[]
}

/**
 * Keeps the most recent messages that fit inside `budget`.
 *
 * Walks backwards, then advances the cut forward past any message that would be
 * orphaned by it. The most recent message is always kept, even when it alone
 * exceeds the budget — dropping it would leave nothing to answer.
 */
export function slidingWindow(
  messages: readonly ModelMessage[],
  budget: number,
): SlidingWindowResult {
  if (!messages.length)
    return { kept: [], dropped: [] }

  let used = 0
  let cut = messages.length

  for (let index = messages.length - 1; index >= 0; index--) {
    const cost = messageTokens(messages[index]!)

    if (used + cost > budget && index < messages.length - 1)
      break

    used += cost
    cut = index
  }

  while (cut < messages.length - 1 && isDependentOnPrevious(messages[cut]!)) cut++

  return {
    kept: messages.slice(cut),
    dropped: messages.slice(0, cut),
  }
}
