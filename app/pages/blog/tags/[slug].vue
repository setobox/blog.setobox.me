<script setup lang="ts">
import type { BlogPostSummary } from '#shared/types/blog'
import { computed } from 'vue'

definePageMeta({ layout: 'blog' })
const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))
const tags = await useBlogTags()
const name = computed(() => taxonomyNameFromSlug(slug.value, tags.value.map(term => term.name)))

if (!name.value)
  throw createError({ statusCode: 404, statusMessage: '标签不存在', fatal: true })

const { data: rows } = await useAsyncData(
  () => `blog-tag-${encodeURIComponent(slug.value)}`,
  () => baseBlogQuery()
    .where('tags', 'LIKE', taxonomyLikePattern(name.value!))
    .select('categories', 'cover', 'date', 'description', 'id', 'path', 'pin', 'tags', 'title')
    .all(),
  { watch: [name] },
)
const posts = computed(() => (rows.value ?? [])
  .filter(post => postHasTaxonomy(post.tags, name.value!)) as BlogPostSummary[])

useSeoMeta({
  title: () => `标签：${name.value}`,
  description: () => `带 ${name.value} 标签的全部文章。`,
})
</script>

<template>
  <section>
    <NuxtLink to="/blog/tags" class="text-meta inline-flex gap-1.5 items-center hover:text-ink-100 focus-ring">
      <span class="i-lucide-arrow-left" aria-hidden="true" />全部标签
    </NuxtLink>
    <h1 class="text-display-lg text-ink-50 font-display mt-item">
      {{ name }}
    </h1>
    <p class="text-lead mt-group">
      {{ posts.length }} 篇文章。
    </p>
    <ul class="m-0 mt-block p-0 list-none flex flex-col gap-group">
      <li v-for="post in posts" :key="post.id">
        <BlogPostCard :post="post" />
      </li>
    </ul>
  </section>
</template>
