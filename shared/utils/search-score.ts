import type { SearchDoc, SearchHit, SearchHitField } from '#shared/types/search'
import { isCjk, tokenizeQuery } from './search-tokenize'

/**
 * Field weights. Title dominates because a query naming an article should put
 * that article first even when a longer body elsewhere mentions the term more.
 */
const FIELD_WEIGHTS = {
  title: 12,
  meta: 6,
  description: 4,
  body: 1,
} as const

/** Kind weights break ties: an article outranks its own taxonomy term. */
const KIND_WEIGHTS: Record<SearchDoc['kind'], number> = {
  post: 1,
  page: 0.9,
  resource: 0.8,
  category: 0.7,
  tag: 0.65,
}

const WORD_BOUNDARY_BONUS = 2.5
/**
 * A Latin term sitting inside a longer word ("ts" in "Fonts") is a coincidence,
 * not a match. Keep it for recall, but damp it far below a real hit -- at full
 * weight a title coincidence outranks a genuine body match. CJK is exempt:
 * bigram recall depends on matching mid-run.
 */
const NON_BOUNDARY_FACTOR = 0.15
const FULL_FIELD_BONUS = 3
/** Beyond this, more occurrences of one term stop adding signal. */
const MAX_OCCURRENCES = 6
const BODY_SNIPPET_RADIUS = 60

interface FieldSource {
  field: SearchHitField['field']
  text: string
}

function collectRanges(haystack: string, rawNeedle: string): [number, number][] {
  const ranges: [number, number][] = []
  const lower = haystack.toLowerCase()
  // Lowercased here rather than assumed: `scoreDoc` is callable directly, not
  // only through `tokenizeQuery`.
  const needle = rawNeedle.toLowerCase()
  let from = 0

  while (ranges.length < MAX_OCCURRENCES) {
    const at = lower.indexOf(needle, from)
    if (at === -1)
      break
    ranges.push([at, at + needle.length])
    from = at + needle.length
  }

  return ranges
}

const WORD_CHAR_RE = /[a-z0-9]/i

function isWordBoundary(text: string, at: number): boolean {
  if (at === 0)
    return true
  return !WORD_CHAR_RE.test(text[at - 1] ?? '')
}

function fieldSources(doc: SearchDoc): FieldSource[] {
  const sources: FieldSource[] = [{ field: 'title', text: doc.title }]

  if (doc.meta?.length)
    sources.push({ field: 'meta', text: doc.meta.join(' ') })
  if (doc.description)
    sources.push({ field: 'description', text: doc.description })
  if (doc.body)
    sources.push({ field: 'body', text: doc.body })

  return sources
}

/**
 * Score one doc against pre-tokenized query terms.
 *
 * Every term must appear somewhere in the doc (AND semantics) -- with bigram
 * recall an OR would surface almost the whole corpus on a two-word query.
 * Returns undefined when the doc does not match.
 */
export function scoreDoc(doc: SearchDoc, terms: string[]): SearchHit | undefined {
  if (!terms.length)
    return undefined

  const sources = fieldSources(doc)
  const matches = new Map<SearchHitField['field'], [number, number][]>()
  let score = 0

  for (const term of terms) {
    const needle = term.toLowerCase()
    let termScore = 0

    for (const { field, text } of sources) {
      const ranges = collectRanges(text, term)
      if (!ranges.length)
        continue

      const weight = FIELD_WEIGHTS[field]
      const counted = isCjk(term)
        ? ranges.length
        : ranges.reduce(
            (sum, [start]) => sum + (isWordBoundary(text, start) ? 1 : NON_BOUNDARY_FACTOR),
            0,
          )
      // Longer matched runs are stronger evidence than single characters.
      let fieldScore = counted * weight * Math.sqrt(term.length)

      if (ranges.some(([start]) => isWordBoundary(text, start)))
        fieldScore += WORD_BOUNDARY_BONUS * weight
      if (text.toLowerCase() === needle)
        fieldScore += FULL_FIELD_BONUS * weight

      termScore += fieldScore

      const existing = matches.get(field)
      if (existing)
        existing.push(...ranges)
      else
        matches.set(field, [...ranges])
    }

    // AND across terms.
    if (termScore === 0)
      return undefined

    score += termScore
  }

  return {
    doc,
    score: score * KIND_WEIGHTS[doc.kind],
    matches: Array.from(matches, ([field, ranges]) => ({
      field,
      ranges: ranges.sort((left, right) => left[0] - right[0]),
    })),
  }
}

export interface SearchOptions {
  limit?: number
}

export function searchDocs(
  docs: readonly SearchDoc[],
  query: string,
  options: SearchOptions = {},
): SearchHit[] {
  const terms = tokenizeQuery(query)
  if (!terms.length)
    return []

  const hits: SearchHit[] = []
  for (const doc of docs) {
    const hit = scoreDoc(doc, terms)
    if (hit)
      hits.push(hit)
  }

  hits.sort((left, right) =>
    right.score - left.score
    || (left.doc.title < right.doc.title ? -1 : left.doc.title > right.doc.title ? 1 : 0),
  )

  return options.limit ? hits.slice(0, options.limit) : hits
}

/**
 * A body excerpt centred on the first match, with offsets rebased onto the
 * excerpt so the same highlight ranges still apply.
 */
export function bodyExcerpt(
  hit: SearchHit,
): { text: string, ranges: [number, number][] } | undefined {
  const bodyMatch = hit.matches.find(match => match.field === 'body')
  const body = hit.doc.body
  if (!bodyMatch || !body)
    return undefined

  const first = bodyMatch.ranges[0]
  if (!first)
    return undefined

  const start = Math.max(0, first[0] - BODY_SNIPPET_RADIUS)
  const end = Math.min(body.length, first[1] + BODY_SNIPPET_RADIUS)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < body.length ? '…' : ''
  const offset = start - prefix.length

  const ranges = bodyMatch.ranges
    .filter(([from, to]) => from >= start && to <= end)
    .map(([from, to]): [number, number] => [from - offset, to - offset])

  return { text: `${prefix}${body.slice(start, end)}${suffix}`, ranges }
}
