import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import { parsePersistedChat, serialisePersistedChat } from './persist'

const message = { id: 'm1', role: 'user', parts: [{ type: 'text', text: '你好' }] } as UIMessage

describe('parsePersistedChat', () => {
  it('returns undefined for absent or blank input', () => {
    expect(parsePersistedChat(null)).toBeUndefined()
    expect(parsePersistedChat(undefined)).toBeUndefined()
    expect(parsePersistedChat('')).toBeUndefined()
  })

  it('returns undefined rather than throwing on malformed JSON', () => {
    expect(parsePersistedChat('{ not json')).toBeUndefined()
    expect(parsePersistedChat('"a string"')).toBeUndefined()
    expect(parsePersistedChat('null')).toBeUndefined()
  })

  it('discards state written by a different version', () => {
    expect(parsePersistedChat(JSON.stringify({ version: 99, messages: [] }))).toBeUndefined()
  })

  it('discards state whose messages are not an array', () => {
    expect(parsePersistedChat(JSON.stringify({ version: 1, messages: 'nope' }))).toBeUndefined()
  })

  it('round-trips through serialise', () => {
    const restored = parsePersistedChat(serialisePersistedChat([message], '摘要'))

    expect(restored?.messages).toHaveLength(1)
    expect(restored?.summary).toBe('摘要')
  })

  it('normalises an empty summary to undefined', () => {
    expect(parsePersistedChat(serialisePersistedChat([message], ''))?.summary).toBeUndefined()
  })
})

describe('serialisePersistedChat', () => {
  it('caps stored history to the newest messages', () => {
    const many = Array.from({ length: 150 }, (_, index) => ({
      ...message,
      id: `m${index}`,
    })) as UIMessage[]

    const restored = parsePersistedChat(serialisePersistedChat(many))

    expect(restored?.messages).toHaveLength(100)
    expect(restored?.messages.at(-1)?.id).toBe('m149')
  })
})
