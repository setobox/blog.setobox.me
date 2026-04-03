import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

const PostSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.date(),
  updated: z.date().optional(),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  pin: z.union([z.boolean(), z.number()]).optional(),
})

const UseSchema = z.object({
  title: z.string(),
})

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: PostSchema,
    }),
    use: defineCollection({
      type: 'page',
      source: 'use.md',
      schema: UseSchema,
    }),
  },
})
