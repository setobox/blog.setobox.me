import type { SearchDoc, SearchHit } from '#shared/types/search'
import { describe, expect, it } from 'vitest'
import {
  flattenGroups,
  groupHits,
  highlightSegments,
  KIND_ORDER,
  moveIndex,
  prepareGroups,
  rangesFor,
} from './results'

function doc(id: string, kind: SearchDoc['kind'], title = id): SearchDoc {
  return { id, kind, title, path: `/${id}` }
}

function hit(id: string, kind: SearchDoc['kind'], score = 1): SearchHit {
  return { doc: doc(id, kind), score, matches: [] }
}

describe('groupHits', () => {
  it('orders groups by KIND_ORDER, not by input order', () => {
    const groups = groupHits([hit('t', 'tag'), hit('p', 'post'), hit('c', 'category')])

    expect(groups.map(group => group.kind)).toEqual(['post', 'category', 'tag'])
  })

  it('preserves relevance order within a group', () => {
    const groups = groupHits([hit('a', 'post', 9), hit('b', 'post', 5), hit('c', 'post', 1)])

    expect(groups[0]?.hits.map(entry => entry.doc.id)).toEqual(['a', 'b', 'c'])
  })

  it('drops kinds with no hits', () => {
    const groups = groupHits([hit('p', 'post')])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.label).toBe('文章')
  })

  it('returns nothing for no hits', () => {
    expect(groupHits([])).toEqual([])
  })

  it('covers every kind in KIND_ORDER', () => {
    const groups = groupHits(KIND_ORDER.map(kind => hit(kind, kind)))

    expect(groups.map(group => group.kind)).toEqual([...KIND_ORDER])
    expect(groups.every(group => group.label && group.icon)).toBe(true)
  })
})

describe('flattenGroups', () => {
  it('matches the rendered order so an index maps to a visible row', () => {
    const groups = groupHits([hit('t', 'tag'), hit('p1', 'post'), hit('p2', 'post')])

    expect(flattenGroups(groups).map(entry => entry.doc.id)).toEqual(['p1', 'p2', 't'])
  })
})

describe('moveIndex', () => {
  it('lands on the first item moving down from nothing active', () => {
    expect(moveIndex(-1, 1, 3)).toBe(0)
  })

  it('lands on the last item moving up from nothing active', () => {
    expect(moveIndex(-1, -1, 3)).toBe(2)
  })

  it('wraps past the end and before the start', () => {
    expect(moveIndex(2, 1, 3)).toBe(0)
    expect(moveIndex(0, -1, 3)).toBe(2)
  })

  it('stays inactive when there is nothing to move through', () => {
    expect(moveIndex(-1, 1, 0)).toBe(-1)
    expect(moveIndex(0, 1, 0)).toBe(-1)
  })
})

describe('highlightSegments', () => {
  it('splits into plain and matched runs', () => {
    expect(highlightSegments('Vue Vapor Mode', [[4, 9]])).toEqual([
      { text: 'Vue ', match: false },
      { text: 'Vapor', match: true },
      { text: ' Mode', match: false },
    ])
  })

  it('merges overlapping ranges from different query terms', () => {
    // `scoreDoc` concatenates ranges per field across terms, so "vue"/"vu"
    // both matching one word arrives here as overlapping ranges.
    expect(highlightSegments('vuex', [[0, 3], [0, 2]])).toEqual([
      { text: 'vue', match: true },
      { text: 'x', match: false },
    ])
  })

  it('merges ranges that merely touch', () => {
    expect(highlightSegments('abcd', [[0, 2], [2, 4]])).toEqual([
      { text: 'abcd', match: true },
    ])
  })

  it('keeps disjoint ranges separate and sorts unordered input', () => {
    expect(highlightSegments('a-b', [[2, 3], [0, 1]])).toEqual([
      { text: 'a', match: true },
      { text: '-', match: false },
      { text: 'b', match: true },
    ])
  })

  it('highlights a whole-string match without empty segments', () => {
    expect(highlightSegments('vue', [[0, 3]])).toEqual([{ text: 'vue', match: true }])
  })

  it('returns one plain segment when nothing matched', () => {
    expect(highlightSegments('vue', [])).toEqual([{ text: 'vue', match: false }])
  })

  it('ignores out-of-bounds and empty ranges', () => {
    expect(highlightSegments('vue', [[9, 12]])).toEqual([{ text: 'vue', match: false }])
    expect(highlightSegments('vue', [[1, 1]])).toEqual([{ text: 'vue', match: false }])
    expect(highlightSegments('vue', [[2, 99]])).toEqual([
      { text: 'vu', match: false },
      { text: 'e', match: true },
    ])
  })

  it('handles empty text', () => {
    expect(highlightSegments('', [[0, 2]])).toEqual([])
  })

  it('counts CJK by code unit, consistent with scoreDoc offsets', () => {
    expect(highlightSegments('性能优化', [[2, 4]])).toEqual([
      { text: '性能', match: false },
      { text: '优化', match: true },
    ])
  })
})

describe('rangesFor', () => {
  const sample: SearchHit = {
    doc: doc('p', 'post'),
    score: 1,
    matches: [{ field: 'title', ranges: [[0, 3]] }],
  }

  it('returns the ranges of a matched field', () => {
    expect(rangesFor(sample, 'title')).toEqual([[0, 3]])
  })

  it('returns empty for a field that did not match', () => {
    expect(rangesFor(sample, 'description')).toEqual([])
  })
})

describe('prepareGroups', () => {
  it('numbers rows continuously across groups, matching flattenGroups', () => {
    const groups = groupHits([hit('t', 'tag'), hit('p1', 'post'), hit('p2', 'post')])
    const prepared = prepareGroups(groups)

    expect(prepared.flatMap(group => group.rows.map(row => row.index))).toEqual([0, 1, 2])
    expect(prepared.flatMap(group => group.rows.map(row => row.hit.doc.id)))
      .toEqual(flattenGroups(groups).map(entry => entry.doc.id))
  })

  it('segments the title using its match ranges', () => {
    const source: SearchHit = {
      doc: doc('p', 'post', 'Vue Vapor'),
      score: 1,
      matches: [{ field: 'title', ranges: [[4, 9]] }],
    }

    expect(prepareGroups(groupHits([source]))[0]?.rows[0]?.title).toEqual([
      { text: 'Vue ', match: false },
      { text: 'Vapor', match: true },
    ])
  })

  it('leaves description and excerpt empty when the doc has neither', () => {
    const row = prepareGroups(groupHits([hit('p', 'post')]))[0]?.rows[0]

    expect(row?.description).toEqual([])
    expect(row?.excerpt).toEqual([])
  })

  it('builds a body excerpt with rebased highlight ranges', () => {
    const source: SearchHit = {
      doc: { ...doc('p', 'post'), body: 'aaa vapor bbb' },
      score: 1,
      matches: [{ field: 'body', ranges: [[4, 9]] }],
    }

    const excerpt = prepareGroups(groupHits([source]))[0]?.rows[0]?.excerpt

    expect(excerpt?.filter(segment => segment.match).map(segment => segment.text)).toEqual(['vapor'])
    expect(excerpt?.map(segment => segment.text).join('')).toBe('aaa vapor bbb')
  })

  it('returns an unhighlighted description when only the body matched', () => {
    const source: SearchHit = {
      doc: { ...doc('p', 'post'), description: '关于 Vapor' },
      score: 1,
      matches: [{ field: 'body', ranges: [[0, 5]] }],
    }

    expect(prepareGroups(groupHits([source]))[0]?.rows[0]?.description).toEqual([
      { text: '关于 Vapor', match: false },
    ])
  })
})
