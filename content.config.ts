import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

const SeoFields = {
  ogImage: z.string().optional(),
  noindex: z.boolean().default(false),
}

const PostSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.date(),
  updated: z.date().optional(),
  cover: z.string().optional(),
  minutes: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  pin: z.union([z.boolean(), z.number()]).optional(),
  ...SeoFields,
})

const UseSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
})

const PageSchema = z.object({
  title: z.string(),
  description: z.string(),
  ...SeoFields,
})

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: PostSchema,
      indexes: [
        {
          name: 'idx_blog_pagination',
          columns: ['pin', 'date'],
        },
      ],
    }),
    use: defineCollection({
      type: 'page',
      source: 'use.md',
      schema: UseSchema,
    }),
    pages: defineCollection({
      type: 'page',
      source: {
        include: 'pages/**/*.md',
        prefix: '/',
      },
      schema: PageSchema,
    }),
  },
})
