/** Bump when `SearchDoc` changes shape, so stale client caches are discarded. */
export const SEARCH_INDEX_VERSION = 1

export type SearchDocKind = 'post' | 'page' | 'resource' | 'category' | 'tag'

export interface SearchDoc {
  /** Stable identity, also the dedupe key across index sources. */
  id: string
  kind: SearchDocKind
  title: string
  description?: string
  path: string
  /** Absolute destinations open in a new tab. */
  external?: boolean
  /** Frontmatter terms, surfaced as result chips. */
  meta?: string[]
  /** Body text, already stripped of markdown. Absent for non-article docs. */
  body?: string
  date?: string
}

export interface SearchIndex {
  /** Bumped when the doc shape changes so stale caches are not reused. */
  version: number
  builtAt: string
  docs: SearchDoc[]
}

export interface SearchHitField {
  field: 'title' | 'description' | 'meta' | 'body'
  /** Character offsets into that field, for highlighting. */
  ranges: [number, number][]
}

export interface SearchHit {
  doc: SearchDoc
  score: number
  matches: SearchHitField[]
}
