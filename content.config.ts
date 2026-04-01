import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

const PostSchema = z.object({
  title: z.string(),
  date: z.date(),
  updated: z.date().optional(),
  cover: z.string().optional(),
})

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: PostSchema,
    }),
  },
})
