<script setup lang="ts">
import type { BlogCollectionItem } from '@nuxt/content'
import { computed, useTemplateRef } from 'vue'

const POSTS_PER_PAGE = 10

const route = useRoute()
const { data: posts } = await useAsyncData('blog', () => queryCollection('blog').all())
const pageRoot = useTemplateRef<HTMLElement>('pageRoot')

const sortedPosts = computed(() => [...(posts.value ?? [])].sort(comparePostsByUpdate))
const pageCount = computed(() => Math.max(1, Math.ceil(sortedPosts.value.length / POSTS_PER_PAGE)))
const currentPage = computed(() => Math.min(readPageNumber(route.query.page), pageCount.value))
const visiblePosts = computed(() => {
  const start = (currentPage.value - 1) * POSTS_PER_PAGE
  return sortedPosts.value.slice(start, start + POSTS_PER_PAGE)
})

usePageEntrance(pageRoot)

useSeoMeta({
  title: 'Blog',
  description: '姬顶盒（Setobox）的博客。',
})

function comparePostsByUpdate(left: BlogCollectionItem, right: BlogCollectionItem): number {
  const pinDifference = getPinWeight(right.pin) - getPinWeight(left.pin)
  if (pinDifference !== 0)
    return pinDifference

  return toTimestamp(right.updated ?? right.date) - toTimestamp(left.updated ?? left.date)
}

function getPinWeight(pin: BlogCollectionItem['pin']): number {
  if (typeof pin === 'number')
    return pin
  return pin ? 1 : 0
}

function readPageNumber(value: null | string | (null | string)[] | undefined): number {
  const rawValue = Array.isArray(value) ? value[0] : value
  const page = Number.parseInt(rawValue ?? '1', 10)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function toTimestamp(value: string): number {
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? 0 : timestamp
}
</script>

<template>
  <div ref="pageRoot" mx-auto max-w-4xl>
    <PageIntro title="Blog" description="记录开发、设计与持续学习中的想法和实践。" />

    <template v-if="visiblePosts.length">
      <div class="gap-6 grid md:mt-12">
        <BlogCard
          v-for="post in visiblePosts"
          :key="post.id"
          data-page-item
          :post="post"
        />
      </div>

      <BlogPagination data-page-item :current-page="currentPage" :page-count="pageCount" />
    </template>
  </div>
</template>
