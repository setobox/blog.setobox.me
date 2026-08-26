import type { SearchDoc } from '#shared/types/search'
import { describe, expect, it } from 'vitest'
import { bodyExcerpt, scoreDoc, searchDocs } from './search-score'

function post(id: string, title: string, extra: Partial<SearchDoc> = {}): SearchDoc {
  return { id, kind: 'post', title, path: `/blog/${id}`, ...extra }
}

const docs: SearchDoc[] = [
  post('perf', 'Vue 性能优化实践', {
    description: '记录一次真实的性能调优',
    meta: ['Vue', '性能'],
    body: '首屏加载慢的根因是重复请求，改造后 LCP 从 3.2s 降到 1.1s。',
  }),
  post('vapor', 'Vue Vapor Mode 是什么', { meta: ['Vue'] }),
  { id: 'tag-vue', kind: 'tag', title: 'Vue', path: '/blog/tags/vue' },
]

describe('search scoring', () => {
  it('finds CJK substrings that FTS5 prefix matching would miss', () => {
    expect(searchDocs(docs, '能优').map(hit => hit.doc.id)).toEqual(['perf'])
  })

  it('ranks a title match above a body-only match', () => {
    const hits = searchDocs(docs, 'Vue')
    expect(hits[0]?.doc.kind).toBe('post')
    expect(hits.at(-1)?.doc.id).toBe('tag-vue')
  })

  it('ranks a real word match above a mid-word coincidence', () => {
    const hits = searchDocs([
      post('fonts', 'Google Fonts'),
      post('ts-guide', 'TypeScript 变体', { body: 'ts 的类型推断在这里最容易踩坑。' }),
    ], 'ts')
    expect(hits.map(hit => hit.doc.id)).toEqual(['ts-guide', 'fonts'])
  })

  it('still matches a Latin term inside a longer word', () => {
    expect(searchDocs([post('fonts', 'Google Fonts')], 'ts').map(h => h.doc.id)).toEqual(['fonts'])
  })

  it('requires every term to match', () => {
    expect(searchDocs(docs, 'Vue 性能').map(hit => hit.doc.id)).toEqual(['perf'])
    expect(searchDocs(docs, 'Vue 不存在的词')).toEqual([])
  })

  it('is case insensitive', () => {
    expect(searchDocs(docs, 'vue vapor').map(hit => hit.doc.id)).toEqual(['vapor'])
  })

  it('returns nothing for a blank or punctuation-only query', () => {
    expect(searchDocs(docs, '   ')).toEqual([])
    expect(searchDocs(docs, '!!!')).toEqual([])
  })

  it('honours the limit', () => {
    expect(searchDocs(docs, 'Vue', { limit: 2 })).toHaveLength(2)
  })

  it('reports ranges for highlighting', () => {
    const hit = scoreDoc(docs[0]!, ['性能'])
    const title = hit?.matches.find(match => match.field === 'title')
    expect(title?.ranges).toEqual([[4, 6]])
  })

  it('scores an exact full-title match above a partial one', () => {
    const exact = scoreDoc({ id: 'a', kind: 'tag', title: 'Vue', path: '/a' }, ['vue'])!
    const partial = scoreDoc({ id: 'b', kind: 'tag', title: 'Vue Router', path: '/b' }, ['vue'])!
    expect(exact.score).toBeGreaterThan(partial.score)
  })

  it('centres the body excerpt on the match and rebases ranges', () => {
    const hit = scoreDoc(docs[0]!, ['LCP'])!
    const excerpt = bodyExcerpt(hit)!
    const [from, to] = excerpt.ranges[0]!
    expect(excerpt.text.slice(from, to)).toBe('LCP')
  })

  it('has no body excerpt when the match was in the title', () => {
    expect(bodyExcerpt(scoreDoc(docs[1]!, ['vapor'])!)).toBeUndefined()
  })
})
