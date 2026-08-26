import { describe, expect, it } from 'vitest'
import { buildSearchBody, markdownToSearchText, truncateSearchText } from './search-text'

describe('markdown to search text', () => {
  it('drops frontmatter', () => {
    expect(markdownToSearchText('---\ntitle: 标题\n---\n正文内容')).toBe('正文内容')
  })

  it('drops fenced code but keeps prose around it', () => {
    const md = '前言\n\n```ts\nconst hidden = 1\n```\n\n后记'
    const text = markdownToSearchText(md)
    expect(text).toContain('前言')
    expect(text).toContain('后记')
    expect(text).not.toContain('hidden')
  })

  it('does not parse markdown inside a code block', () => {
    expect(markdownToSearchText('```md\n# 不是标题\n```')).toBe('')
  })

  it('keeps link text and drops the url', () => {
    const text = markdownToSearchText('见 [Nuxt 文档](https://nuxt.com/docs)')
    expect(text).toBe('见 Nuxt 文档')
  })

  it('drops images entirely', () => {
    expect(markdownToSearchText('![封面图](/cover.png) 正文')).toBe('正文')
  })

  it('strips heading, list, and quote markers', () => {
    expect(markdownToSearchText('## 标题\n- 一项\n> 引用')).toBe('标题 一项 引用')
  })

  it('unwraps emphasis and inline code', () => {
    expect(markdownToSearchText('**重要**的 `useFetch` 用法')).toBe('重要的 useFetch 用法')
  })

  it('strips MDC block components and attributes', () => {
    const text = markdownToSearchText('::alert\n提示内容\n::\n\n段落{.text-lg}')
    expect(text).toContain('提示内容')
    expect(text).not.toContain('::')
    expect(text).not.toContain('text-lg')
  })

  it('drops tilde-fenced code', () => {
    const text = markdownToSearchText('前言\n\n~~~ts\nconst hidden = 1\n~~~\n\n后记')
    expect(text).toBe('前言 后记')
  })

  it('drops an unterminated fence to the end of input', () => {
    expect(markdownToSearchText('前言\n\n```ts\nconst hidden = 1')).toBe('前言')
  })

  it('drops reference definitions but keeps the referencing prose', () => {
    const text = markdownToSearchText('见文档说明。\n\n[docs]: https://example.com "标题"')
    expect(text).toBe('见文档说明。')
  })

  it('keeps a pipe-only row that is not a divider', () => {
    expect(markdownToSearchText('| 名称 |\n| 说明 |')).toBe('名称 说明')
  })

  it('flattens tables into words', () => {
    const text = markdownToSearchText('| 名称 | 说明 |\n| --- | --- |\n| LCP | 最大内容绘制 |')
    expect(text).toBe('名称 说明 LCP 最大内容绘制')
  })

  it('truncates without cutting a latin word in half', () => {
    expect(truncateSearchText('alpha beta gamma delta', 14)).toBe('alpha beta')
  })

  it('leaves short text untouched', () => {
    expect(truncateSearchText('短文本', 100)).toBe('短文本')
  })

  it('builds a bounded body', () => {
    expect(buildSearchBody('正文'.repeat(2000)).length).toBeLessThanOrEqual(1200)
  })
})
