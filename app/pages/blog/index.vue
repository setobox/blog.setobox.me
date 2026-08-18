<script setup lang="ts">
import type { BlogPageResponse } from '#shared/types/blog'
import { computed, watch } from 'vue'

definePageMeta({ layout: 'blog' })

const route = useRoute()
const requestedPage = computed(() => readPageNumber(route.query.page))
const fetchKey = computed(() => `blog-page-${requestedPage.value}`)
const {
  data: blogPage,
  error: blogError,
  refresh,
  status,
} = await useFetch<BlogPageResponse>('/api/blog', {
  key: fetchKey,
  query: { page: requestedPage },
  deep: false,
})

const visiblePosts = computed(() => blogPage.value?.items ?? [])
const currentPage = computed(() => blogPage.value?.pagination.page ?? requestedPage.value)
const pageCount = computed(() => blogPage.value?.pagination.pageCount ?? 1)

await syncCanonicalPage(blogPage.value)
watch(blogPage, page => void syncCanonicalPage(page))

useSeoMeta({
  title: '博客',
  description: '记录开发、设计与持续学习中的想法和实践。',
})

function readPageNumber(value: null | string | (null | string)[] | undefined): number {
  const rawValue = Array.isArray(value) ? value[0] : value
  const page = Number(rawValue ?? 1)
  return Number.isInteger(page) && page > 0 ? page : 1
}

async function syncCanonicalPage(page: BlogPageResponse | null | undefined): Promise<void> {
  if (!page || page.pagination.requestedPage !== requestedPage.value || page.pagination.page === requestedPage.value)
    return

  const query = { ...route.query }
  if (page.pagination.page === 1)
    delete query.page
  else
    query.page = String(page.pagination.page)

  await navigateTo({ path: route.path, query }, { redirectCode: 302, replace: true })
}
</script>

<template>
  <section>
    <header class="flex gap-group items-end justify-between">
      <div>
        <p class="text-meta text-layer-motion">
          BLOG / NOTES
        </p>
        <h1 class="text-display-lg text-ink-50 font-display mt-item">
          全部文章
        </h1>
        <p class="text-lead mt-group max-w-prose">
          记录开发、设计与持续学习中的想法和实践。
        </p>
      </div>
      <BlogLayoutToggle class="shrink-0" />
    </header>

    <div v-if="blogError" class="mt-block p-group surface" role="alert">
      <p class="text-ink-200">
        文章列表加载失败，请稍后重试。
      </p>
      <button type="button" class="btn-ghost mt-group" @click="refresh()">
        重新加载
      </button>
    </div>

    <p v-else-if="status === 'pending' && !visiblePosts.length" class="text-ink-300 mt-block" aria-live="polite">
      正在加载…
    </p>

    <template v-else-if="visiblePosts.length">
      <ul class="blog-index-list m-0 mt-block p-0 list-none gap-group grid">
        <li v-for="post in visiblePosts" :key="post.id">
          <BlogPostCard :post="post" />
        </li>
      </ul>
      <BlogPagination :current-page="currentPage" :page-count="pageCount" />
    </template>

    <p v-else class="text-ink-300 mt-block">
      暂无文章。
    </p>
  </section>
</template>

<style>
.blog-index-list {
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 48rem) {
  html[data-article-layout='grid'] .blog-index-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 80rem) {
  html[data-article-layout='grid'] .blog-index-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
