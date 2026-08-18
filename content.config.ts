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
})

const UseSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
})

const LayerSchema = z.object({
  title: z.string(),
  index: z.number().int().min(0).max(4),
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
    layers: defineCollection({
      type: 'page',
      source: 'home/layers/**/*.md',
      schema: LayerSchema,
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
