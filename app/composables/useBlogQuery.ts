export function baseBlogQuery() {
  return queryCollection('blog')
    .order('pin', 'DESC')
    .order('date', 'DESC')
    .order('path', 'ASC')
}

export function blogPostByPath(path: string) {
  return queryCollection('blog').path(path).first()
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
