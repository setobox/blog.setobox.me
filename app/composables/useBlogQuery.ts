export function baseBlogQuery() {
  const query = queryCollection('blog')
  if (!import.meta.dev)
    query.where('draft', '=', false)

  return query.order('pin', 'DESC').order('date', 'DESC').order('path', 'ASC')
}

export function blogPostByPath(path: string) {
  // Explicit select: `aiBody` carries untruncated article prose for the AI
  // assistant, and an unfiltered query would ship it in every page payload.
  const query = queryCollection('blog')
  if (!import.meta.dev)
    query.where('draft', '=', false)

  return query
    .path(path)
    .select(
      'body',
      'categories',
      'cover',
      'date',
      'description',
      'id',
      'minutes',
      'noindex',
      'ogImage',
      'path',
      'tags',
      'title',
      'updated',
    )
    .first()
}

export function blogPostSurroundings(path: string) {
  const query = queryCollectionItemSurroundings('blog', path, {
    before: 1,
    after: 1,
    fields: ['description', 'date'],
  })
  if (!import.meta.dev)
    query.where('draft', '=', false)

  return query
    .order('pin', 'DESC')
    .order('date', 'DESC')
    .order('path', 'ASC')
}
