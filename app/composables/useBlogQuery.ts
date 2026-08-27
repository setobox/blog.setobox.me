export function baseBlogQuery() {
  return queryCollection('blog').order('pin', 'DESC').order('date', 'DESC').order('path', 'ASC')
}

export function blogPostByPath(path: string) {
  // Explicit select: `aiBody` carries untruncated article prose for the AI
  // assistant, and an unfiltered query would ship it in every page payload.
  return queryCollection('blog')
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
  return queryCollectionItemSurroundings('blog', path, {
    before: 1,
    after: 1,
    fields: ['description', 'date'],
  })
    .order('pin', 'DESC')
    .order('date', 'DESC')
    .order('path', 'ASC')
}
