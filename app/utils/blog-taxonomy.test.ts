import { describe, expect, it } from 'vitest'
import {
  aggregateTaxonomy,
  postHasTaxonomy,
  slugifyTaxonomy,
  taxonomyLikePattern,
  taxonomyNameFromSlug,
} from './blog-taxonomy'

describe('blog taxonomy', () => {
  it('normalizes unicode slugs and resolves original names', () => {
    expect(slugifyTaxonomy(' Vue 3.6 / 性能优化 ')).toBe('vue-3-6-性能优化')
    expect(taxonomyNameFromSlug('性能优化', ['前端', '性能优化'])).toBe('性能优化')
    expect(taxonomyNameFromSlug('%zz', ['前端'])).toBeUndefined()
  })

  it('deduplicates each post and sorts by count then code point', () => {
    const terms = aggregateTaxonomy([
      { tags: ['Vue', 'Vue', 'CSS'] },
      { tags: ['Vue', 'TypeScript'] },
    ], 'tags')

    expect(terms.map(term => [term.name, term.count])).toEqual([
      ['Vue', 2],
      ['CSS', 1],
      ['TypeScript', 1],
    ])
  })

  it('uses SQL only as a superset and keeps exact array matching', () => {
    expect(taxonomyLikePattern('CSS')).toBe('%\"CSS\"%')
    expect(postHasTaxonomy(['UnoCSS'], 'CSS')).toBe(false)
    expect(postHasTaxonomy(['CSS'], 'CSS')).toBe(true)
  })
})
