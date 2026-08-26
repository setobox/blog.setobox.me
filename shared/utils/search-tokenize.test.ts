import { describe, expect, it } from 'vitest'
import { cjkBigrams, isCjk, tokenize, tokenizeQuery } from './search-tokenize'

describe('search tokenizer', () => {
  it('expands CJK runs into overlapping bigrams', () => {
    expect(cjkBigrams('性能优化')).toEqual(['性能', '能优', '优化'])
    expect(cjkBigrams('化')).toEqual(['化'])
    expect(cjkBigrams('')).toEqual([])
  })

  it('keeps latin words whole and lowercases them', () => {
    expect(tokenize('Vue 3.6 Vapor Mode')).toEqual(['vue', '3.6', 'vapor', 'mode'])
  })

  it('keeps technical punctuation inside a token', () => {
    expect(tokenize('C++ Node.js co-located')).toEqual(['c++', 'node.js', 'co-located'])
  })

  it('drops single latin letters but keeps digits', () => {
    expect(tokenize('a 5 ab')).toEqual(['5', 'ab'])
  })

  it('indexes mixed content from both scripts', () => {
    expect(tokenize('Vue 性能优化')).toEqual(['vue', '性能', '能优', '优化'])
  })

  it('keeps query CJK runs whole so long matches can outrank short ones', () => {
    expect(tokenizeQuery('性能优化')).toEqual(['性能优化'])
    expect(tokenizeQuery('Vue 性能')).toEqual(['vue', '性能'])
  })

  it('deduplicates query terms', () => {
    expect(tokenizeQuery('vue vue 性能 性能')).toEqual(['vue', '性能'])
  })

  it('detects CJK text', () => {
    expect(isCjk('性能')).toBe(true)
    expect(isCjk('perf')).toBe(false)
  })

  it('does not leak regex state between calls', () => {
    // A stateful /g regex shared with `matchAll` made the *second* CJK query
    // return nothing, because `lastIndex` was left mid-string.
    expect(isCjk('性能优化')).toBe(true)
    expect(tokenizeQuery('能优')).toEqual(['能优'])
    expect(isCjk('性能优化')).toBe(true)
    expect(tokenize('优化')).toEqual(['优化'])
  })
})
