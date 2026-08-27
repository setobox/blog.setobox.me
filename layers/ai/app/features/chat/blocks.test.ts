import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import { partsToBlocks } from './blocks'

function message(parts: unknown[]): UIMessage {
  return { id: 'm1', role: 'assistant', parts } as UIMessage
}

describe('partsToBlocks', () => {
  it('returns nothing for a message with no parts', () => {
    expect(partsToBlocks({ id: 'm', role: 'user' } as UIMessage)).toEqual([])
  })

  it('merges consecutive text parts into one block', () => {
    const blocks = partsToBlocks(
      message([
        { type: 'text', text: '你好' },
        { type: 'text', text: '，世界' },
      ]),
    )

    expect(blocks).toEqual([{ type: 'text', text: '你好，世界' }])
  })

  it('maps each tool lifecycle state', () => {
    for (const state of [
      'input-streaming',
      'input-available',
      'output-available',
      'output-error',
    ]) {
      const blocks = partsToBlocks(
        message([{ type: 'tool-search_posts', state, input: { query: 'nuxt' } }]),
      )

      expect(blocks[0]).toMatchObject({ type: 'tool', name: 'search_posts', state })
    }
  })

  it('falls back to a pending state for an unknown state', () => {
    const blocks = partsToBlocks(message([{ type: 'tool-read_article', state: 'weird' }]))

    expect(blocks[0]).toMatchObject({ state: 'input-streaming' })
  })

  it('surfaces errorText as the output when the tool failed', () => {
    const blocks = partsToBlocks(
      message([{ type: 'tool-read_article', state: 'output-error', errorText: '找不到文章' }]),
    )

    expect(blocks[0]).toMatchObject({ output: '找不到文章' })
  })

  it('collects citations into a trailing block', () => {
    const blocks = partsToBlocks(
      message([
        { type: 'text', text: '找到了' },
        {
          type: 'tool-search_posts',
          state: 'output-available',
          output: { citations: [{ path: '/blog/a', title: 'A' }] },
        },
      ]),
    )

    expect(blocks.at(-1)).toEqual({
      type: 'citations',
      items: [{ path: '/blog/a', title: 'A' }],
    })
  })

  it('dedupes citations repeated across tool calls', () => {
    const blocks = partsToBlocks(
      message([
        {
          type: 'tool-search_posts',
          state: 'output-available',
          output: { citations: [{ path: '/blog/a', title: 'A' }] },
        },
        {
          type: 'tool-read_article',
          state: 'output-available',
          output: { citations: [{ path: '/blog/a', title: 'A' }] },
        },
      ]),
    )

    const citations = blocks.find(block => block.type === 'citations')
    expect(citations).toEqual({ type: 'citations', items: [{ path: '/blog/a', title: 'A' }] })
  })

  it('ignores malformed citation entries', () => {
    const blocks = partsToBlocks(
      message([
        {
          type: 'tool-search_posts',
          state: 'output-available',
          output: { citations: [{ path: 123 }, null, { path: '/blog/b', title: 'B' }] },
        },
      ]),
    )

    expect(blocks.find(block => block.type === 'citations')).toEqual({
      type: 'citations',
      items: [{ path: '/blog/b', title: 'B' }],
    })
  })

  it('omits the citations block when nothing was cited', () => {
    const blocks = partsToBlocks(message([{ type: 'text', text: '你好' }]))

    expect(blocks.some(block => block.type === 'citations')).toBe(false)
  })
})
