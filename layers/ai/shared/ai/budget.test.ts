import type { ModelMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import { estimateTokens, messageTokens, slidingWindow, totalTokens } from './budget'

function user(text: string): ModelMessage {
  return { role: 'user', content: text }
}

function assistant(text: string): ModelMessage {
  return { role: 'assistant', content: text }
}

function toolCall(id: string, name: string): ModelMessage {
  return {
    role: 'assistant',
    content: [{ type: 'tool-call', toolCallId: id, toolName: name, input: {} }],
  } as ModelMessage
}

function toolResult(id: string, name: string): ModelMessage {
  return {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId: id,
        toolName: name,
        output: { type: 'json', value: { ok: true } },
      },
    ],
  } as ModelMessage
}

describe('estimateTokens', () => {
  it('returns zero for empty input', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('charges CJK more per character than latin', () => {
    const cjk = estimateTokens('性能优化实践指南对照')
    const latin = estimateTokens('performance guide')

    expect(cjk).toBeGreaterThan(latin)
  })

  it('scales with length', () => {
    expect(estimateTokens('检索增强生成检索增强生成')).toBeGreaterThan(estimateTokens('检索增强'))
  })

  it('counts mixed CJK and latin', () => {
    expect(estimateTokens('用 Nuxt 4 构建博客')).toBeGreaterThan(0)
  })
})

describe('messageTokens', () => {
  it('covers array content parts', () => {
    expect(messageTokens(toolCall('call_1', 'search_posts'))).toBeGreaterThan(0)
  })

  it('adds role framing overhead', () => {
    expect(messageTokens(user(''))).toBeGreaterThan(0)
  })
})

describe('slidingWindow', () => {
  it('keeps everything when the budget is ample', () => {
    const messages = [user('你好'), assistant('你好')]
    const { kept, dropped } = slidingWindow(messages, 10_000)

    expect(kept).toHaveLength(2)
    expect(dropped).toHaveLength(0)
  })

  it('handles an empty conversation', () => {
    expect(slidingWindow([], 100)).toEqual({ kept: [], dropped: [] })
  })

  it('drops the oldest turns first', () => {
    const messages = [user('第一轮问题'), assistant('第一轮回答'), user('第二轮问题')]
    const { kept, dropped } = slidingWindow(messages, totalTokens(messages) - 1)

    expect(dropped.length).toBeGreaterThan(0)
    expect(kept.at(-1)).toBe(messages.at(-1))
  })

  it('never starts a window on an orphaned tool result', () => {
    const messages = [
      user('搜索一下'),
      toolCall('call_1', 'search_posts'),
      toolResult('call_1', 'search_posts'),
      assistant('找到了'),
    ]

    // A budget that would otherwise cut between the call and its result.
    for (let budget = 1; budget < totalTokens(messages); budget++) {
      const { kept } = slidingWindow(messages, budget)
      expect(kept[0]?.role).not.toBe('tool')
    }
  })

  it('keeps the newest message even when it alone exceeds the budget', () => {
    const messages = [user('旧问题'), user('这是一个非常长的新问题'.repeat(20))]
    const { kept } = slidingWindow(messages, 1)

    expect(kept).toHaveLength(1)
    expect(kept[0]).toBe(messages[1])
  })
})
