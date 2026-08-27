import type { ModelMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import {
  mergeSummary,
  SUMMARY_ACK,
  SUMMARY_PREFIX,
  summaryMessages,
  transcriptFor,
} from './compress'

describe('summaryMessages', () => {
  it('returns nothing for a blank summary', () => {
    expect(summaryMessages('')).toEqual([])
    expect(summaryMessages('   ')).toEqual([])
  })

  it('injects the summary plus a primed assistant turn', () => {
    const messages = summaryMessages('用户在了解 Nuxt 4 的 layer 机制。')

    expect(messages).toHaveLength(2)
    expect(messages[0]?.role).toBe('user')
    expect(messages[0]?.content).toContain(SUMMARY_PREFIX.trim())
    expect(messages[1]).toEqual({ role: 'assistant', content: SUMMARY_ACK })
  })

  it('preserves strict user/assistant alternation', () => {
    const roles = summaryMessages('摘要内容').map(message => message.role)

    expect(roles).toEqual(['user', 'assistant'])
  })
})

describe('transcriptFor', () => {
  it('labels each line with its role', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: '你好' },
      { role: 'assistant', content: '你好，有什么可以帮你' },
    ]

    expect(transcriptFor(messages)).toBe('user: 你好\nassistant: 你好，有什么可以帮你')
  })

  it('skips messages with no readable text', () => {
    const messages = [
      { role: 'user', content: '有内容' },
      { role: 'assistant', content: '' },
    ] as ModelMessage[]

    expect(transcriptFor(messages)).toBe('user: 有内容')
  })

  it('flattens array content parts', () => {
    const messages = [
      {
        role: 'assistant',
        content: [
          { type: 'text', text: '分段一' },
          { type: 'text', text: '分段二' },
        ],
      },
    ] as ModelMessage[]

    expect(transcriptFor(messages)).toBe('assistant: 分段一 分段二')
  })
})

describe('mergeSummary', () => {
  it('returns the new summary when there is no previous one', () => {
    expect(mergeSummary(undefined, '新摘要')).toBe('新摘要')
  })

  it('keeps the previous summary when the new one is blank', () => {
    expect(mergeSummary('旧摘要', '   ')).toBe('旧摘要')
  })

  it('accumulates rather than overwriting', () => {
    expect(mergeSummary('旧摘要', '新摘要')).toBe('旧摘要\n新摘要')
  })
})
