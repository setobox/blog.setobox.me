import type { SearchDocKind, SearchHit } from '#shared/types/search'
import { bodyExcerpt } from '#shared/utils/search-score'

/**
 * Presentation and keyboard-navigation logic for the search dialog.
 *
 * Kept out of the component because index-based navigation over *grouped*
 * results is where the bugs live: the visible list is nested, but the active
 * item is a single flat index, and the two have to agree.
 */

export const KIND_ORDER: readonly SearchDocKind[] = [
  'post',
  'page',
  'category',
  'tag',
  'resource',
]

export const KIND_LABELS: Record<SearchDocKind, string> = {
  post: '文章',
  page: '页面',
  category: '分类',
  tag: '标签',
  resource: '收藏',
}

export const KIND_ICONS: Record<SearchDocKind, string> = {
  post: 'i-lucide-file-text',
  page: 'i-lucide-layout-panel-left',
  category: 'i-lucide-folder',
  tag: 'i-lucide-hash',
  resource: 'i-lucide-bookmark',
}

export interface SearchGroup {
  kind: SearchDocKind
  label: string
  icon: string
  hits: SearchHit[]
}

/**
 * Bucket hits by kind in a stable display order, preserving relevance order
 * within each bucket. Empty kinds are dropped.
 */
export function groupHits(hits: readonly SearchHit[]): SearchGroup[] {
  const buckets = new Map<SearchDocKind, SearchHit[]>()

  for (const hit of hits) {
    const bucket = buckets.get(hit.doc.kind)
    if (bucket)
      bucket.push(hit)
    else
      buckets.set(hit.doc.kind, [hit])
  }

  return KIND_ORDER.flatMap((kind) => {
    const bucket = buckets.get(kind)
    if (!bucket?.length)
      return []
    return [{ kind, label: KIND_LABELS[kind], icon: KIND_ICONS[kind], hits: bucket }]
  })
}

/**
 * The flat, keyboard-navigable order -- exactly the order the grouped list
 * renders in, so an active index maps to what the reader sees.
 */
export function flattenGroups(groups: readonly SearchGroup[]): SearchHit[] {
  return groups.flatMap(group => group.hits)
}

/**
 * Wrapping cursor movement. Wraps because a 3-item result list is faster to
 * traverse in whichever direction is closer, and arrow keys are cheap.
 */
export function moveIndex(current: number, delta: number, length: number): number {
  if (length <= 0)
    return -1
  // A fresh query leaves no active item; the first move should land on an end.
  if (current < 0)
    return delta > 0 ? 0 : length - 1
  return (((current + delta) % length) + length) % length
}

export interface HighlightSegment {
  text: string
  match: boolean
}

/**
 * Split text into alternating plain/matched segments so the template can render
 * highlights without `v-html` -- the query is user input, and index text is
 * authored content, so neither belongs in raw HTML.
 *
 * Overlapping ranges are merged; ranges outside the text are ignored.
 */
export function highlightSegments(
  text: string,
  ranges: readonly [number, number][],
): HighlightSegment[] {
  if (!text)
    return []

  const clamped = ranges
    .map(([from, to]): [number, number] => [
      Math.max(0, Math.min(from, text.length)),
      Math.max(0, Math.min(to, text.length)),
    ])
    .filter(([from, to]) => to > from)
    .sort((left, right) => left[0] - right[0])

  if (!clamped.length)
    return [{ text, match: false }]

  const merged: [number, number][] = []
  for (const [from, to] of clamped) {
    const last = merged.at(-1)
    if (last && from <= last[1])
      last[1] = Math.max(last[1], to)
    else
      merged.push([from, to])
  }

  const segments: HighlightSegment[] = []
  let cursor = 0

  for (const [from, to] of merged) {
    if (from > cursor)
      segments.push({ text: text.slice(cursor, from), match: false })
    segments.push({ text: text.slice(from, to), match: true })
    cursor = to
  }

  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), match: false })

  return segments
}

/** Ranges for one field of a hit, or an empty list when that field did not match. */
export function rangesFor(hit: SearchHit, field: 'title' | 'description' | 'meta'): [number, number][] {
  return hit.matches.find(match => match.field === field)?.ranges ?? []
}

export interface SearchRow {
  /** Position in the flat keyboard order; also the option element id suffix. */
  index: number
  hit: SearchHit
  title: HighlightSegment[]
  description: HighlightSegment[]
  excerpt: HighlightSegment[]
}

export interface SearchRowGroup extends Omit<SearchGroup, 'hits'> {
  rows: SearchRow[]
}

/**
 * Resolve everything the template needs in one pass: highlight segments, and a
 * flat index per row. Done here so the template neither recomputes excerpts per
 * binding nor scans the flat list to find out where a row sits.
 */
export function prepareGroups(groups: readonly SearchGroup[]): SearchRowGroup[] {
  let index = 0

  return groups.map(group => ({
    kind: group.kind,
    label: group.label,
    icon: group.icon,
    rows: group.hits.map((hit) => {
      const excerpt = bodyExcerpt(hit)
      return {
        index: index++,
        hit,
        title: highlightSegments(hit.doc.title, rangesFor(hit, 'title')),
        description: hit.doc.description
          ? highlightSegments(hit.doc.description, rangesFor(hit, 'description'))
          : [],
        excerpt: excerpt ? highlightSegments(excerpt.text, excerpt.ranges) : [],
      }
    }),
  }))
}
