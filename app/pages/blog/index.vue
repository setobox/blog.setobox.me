<script setup lang="ts">
import type { BlogPageResponse } from '#shared/types/blog'
import { computed, useTemplateRef, watch } from 'vue'

const route = useRoute()
const pageRoot = useTemplateRef<HTMLElement>('pageRoot')

const requestedPage = computed(() => readPageNumber(route.query.page))
const fetchKey = computed(() => `blog-page-${requestedPage.value}`)
const {
  data: blogPage,
  error: blogError,
  refresh,
  status,
} = await useFetch<BlogPageResponse>('/api/blog', {
  key: fetchKey,
  query: {
    page: requestedPage,
  },
  deep: false,
})
const visiblePosts = computed(() => blogPage.value?.items ?? [])
const currentPage = computed(() => blogPage.value?.pagination.page ?? requestedPage.value)
const pageCount = computed(() => blogPage.value?.pagination.pageCount ?? 1)

await syncCanonicalPage(blogPage.value)
watch(blogPage, page => void syncCanonicalPage(page))

usePageEntrance(pageRoot)

useSeoMeta({
  title: 'Blog',
  description: '姬顶盒（Setobox）的博客。',
})

function readPageNumber(value: null | string | (null | string)[] | undefined): number {
  const rawValue = Array.isArray(value) ? value[0] : value
  const page = Number(rawValue ?? 1)
  return Number.isInteger(page) && page > 0 ? page : 1
}

async function syncCanonicalPage(page: BlogPageResponse | null | undefined): Promise<void> {
  if (
    !page
    || page.pagination.requestedPage !== requestedPage.value
    || page.pagination.page === requestedPage.value
  ) {
    return
  }

  const query = { ...route.query }
  if (page.pagination.page === 1)
    delete query.page
  else
    query.page = String(page.pagination.page)

  await navigateTo(
    { path: route.path, query },
    { redirectCode: 302, replace: true },
  )
}
</script>

<template>
  <div ref="pageRoot" class="mx-auto px-4 max-w-6xl w-full md:px-6">
    <PageIntro title="Blog" description="记录开发、设计与持续学习中的想法和实践。" />

    <div
      v-if="blogError"
      class="text-sm text-fg-3 mt-12 p-5 border border-fg-7"
      role="alert"
    >
      <p class="m-0">
        文章列表加载失败，请稍后重试。
      </p>
      <button
        class="text-fg-2 font-bold mt-3 p-0 border-0 border-b border-fg-5 bg-transparent cursor-pointer hover:text-fg-1"
        type="button"
        @click="refresh()"
      >
        重新加载
      </button>
    </div>

    <p
      v-else-if="status === 'pending' && !visiblePosts.length"
      class="text-sm text-fg-4 mt-12"
      aria-live="polite"
    >
      正在加载…
    </p>

    <template v-else-if="visiblePosts.length">
      <div class="blog-list mt-8 gap-6 grid grid-cols-1 md:mt-12">
        <BlogCard
          v-for="post in visiblePosts"
          :key="post.id"
          data-page-item
          :post="post"
        />
      </div>

      <BlogPagination data-page-item :current-page="currentPage" :page-count="pageCount" />
    </template>

    <p v-else class="text-sm text-fg-4 mt-12">
      暂无文章。
    </p>
  </div>
</template>

<style scoped>
@media (min-width: 48rem) {
  :global(html[data-article-layout='grid'] .blog-list) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 80rem) {
  :global(html[data-article-layout='grid'] .blog-list) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
