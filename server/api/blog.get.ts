import type { BlogPageResponse } from '#shared/types/blog'
import { queryCollection } from '@nuxt/content/server'
import { z } from 'zod'

const BLOG_PAGE_SIZE = 10
const MAX_PAGE = 100_000

const blogPageQuerySchema = z.object({
  page: z.preprocess(
    value => Array.isArray(value) ? Number.NaN : value,
    z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
  ),
}).strict()

const blogListFields = [
  'categories',
  'cover',
  'date',
  'description',
  'id',
  'path',
  'pin',
  'tags',
  'title',
] as const

export default defineEventHandler(async (event): Promise<BlogPageResponse> => {
  const { page: requestedPage } = await getValidatedQuery(
    event,
    query => blogPageQuerySchema.parse(query),
  )

  const total = await queryCollection(event, 'blog').count()
  const pageCount = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE))
  const page = Math.min(requestedPage, pageCount)
  const offset = (page - 1) * BLOG_PAGE_SIZE

  const items = await queryCollection(event, 'blog')
    .order('pin', 'DESC')
    .order('date', 'DESC')
    .order('path', 'ASC')
    .skip(offset)
    .limit(BLOG_PAGE_SIZE)
    .select(...blogListFields)
    .all()

  return {
    items,
    pagination: {
      page,
      pageCount,
      pageSize: BLOG_PAGE_SIZE,
      requestedPage,
      total,
    },
  }
})
