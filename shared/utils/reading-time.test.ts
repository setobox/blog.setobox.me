import { describe, expect, it } from 'vitest'
import { estimateReadingMinutes, resolveReadingMinutes } from './reading-time'

describe('reading time', () => {
  it('returns one minute for empty content', () => {
    expect(estimateReadingMinutes('')).toBe(1)
  })

  it('counts Chinese characters at 300 characters per minute', () => {
    expect(estimateReadingMinutes('文'.repeat(301))).toBe(2)
  })

  it('counts English and numeric words at 200 words per minute', () => {
    expect(estimateReadingMinutes(Array.from({ length: 201 }).fill('word1').join(' '))).toBe(2)
  })

  it('combines Chinese and English reading time', () => {
    const markdown = `${'文'.repeat(300)} ${Array.from({ length: 200 }).fill('word').join(' ')}`

    expect(estimateReadingMinutes(markdown)).toBe(2)
  })

  it('includes fenced code blocks and ignores frontmatter', () => {
    const code = Array.from({ length: 201 }).fill('const value = 1').join('\n')
    const markdown = `---\ntitle: Test\n---\n\n\`\`\`ts\n${code}\n\`\`\``

    expect(estimateReadingMinutes(markdown)).toBe(4)
  })

  it('uses a valid manual minutes value as an override', () => {
    expect(resolveReadingMinutes('')).toBe(1)
    expect(resolveReadingMinutes('', 12)).toBe(12)
  })
})
