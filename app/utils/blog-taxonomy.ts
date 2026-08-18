export type BlogTaxonomyKind = 'categories' | 'tags'

export interface BlogFacetRow {
  categories?: string[]
  tags?: string[]
}

export interface BlogTaxonomyTerm {
  count: number
  name: string
  path: string
}

const NON_SLUG_CHARACTERS_RE = /[^\p{L}\p{N}]+/gu
const EDGE_HYPHENS_RE = /^-+|-+$/g

export function slugifyTaxonomy(raw: string): string {
  return raw
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(NON_SLUG_CHARACTERS_RE, '-')
    .replace(EDGE_HYPHENS_RE, '')
}

export function taxonomyNameFromSlug(
  slug: string,
  names: Iterable<string>,
): string | undefined {
  let decoded = slug
  try {
    decoded = decodeURIComponent(slug)
  }
  catch {
    // Malformed input should become a normal not-found result.
  }

  const target = slugifyTaxonomy(decoded)
  if (!target)
    return undefined

  for (const name of names) {
    if (slugifyTaxonomy(name) === target)
      return name
  }
}

export function taxonomyLikePattern(name: string): string {
  return `%\"${name}\"%`
}

export function postHasTaxonomy(
  values: string[] | undefined,
  name: string,
): boolean {
  return Array.isArray(values) && values.includes(name)
}

export function aggregateTaxonomy(
  rows: readonly BlogFacetRow[],
  kind: BlogTaxonomyKind,
): BlogTaxonomyTerm[] {
  const counts = new Map<string, number>()

  for (const row of rows) {
    const values = new Set(
      (row[kind] ?? [])
        .map(value => value.trim())
        .filter(Boolean),
    )

    for (const name of values)
      counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  const base = kind === 'categories' ? '/blog/categories' : '/blog/tags'
  const terms: BlogTaxonomyTerm[] = []

  for (const [name, count] of counts) {
    const slug = slugifyTaxonomy(name)
    if (!slug)
      continue
    terms.push({ count, name, path: `${base}/${encodeURIComponent(slug)}` })
  }

  return terms.sort((left, right) =>
    right.count - left.count
    || (left.name < right.name ? -1 : left.name > right.name ? 1 : 0),
  )
}
