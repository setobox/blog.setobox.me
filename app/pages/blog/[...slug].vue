<script setup lang="ts">
import { useDateFormat, usePreferredReducedMotion, useWindowScroll } from '@vueuse/core'
import { computed, useTemplateRef } from 'vue'

const route = useRoute()
const slugParam = route.params.slug
const slug = Array.isArray(slugParam) ? slugParam.join('/') : slugParam

if (!slug) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Article not found',
  })
}

const { data: post } = await useAsyncData(`blog-${slug}`, () => {
  return queryCollection('blog').path(`/blog/${slug}`).first()
})

if (!post.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Article not found',
  })
}

const article = post.value
const pageRoot = useTemplateRef<HTMLElement>('pageRoot')
const tocLinks = computed(() => article.body?.toc?.links ?? [])
const displayDate = useDateFormat(
  () => article.updated ?? article.date,
  'YYYY-MM-DD',
)
const { y } = useWindowScroll({
  window: import.meta.client ? window : undefined,
})
const preferredMotion = usePreferredReducedMotion()
const showTopAction = computed(() => y.value > 0)

useActionButton({
  id: 'article-home',
  icon: 'i-lucide-house',
  label: '返回博客列表',
  order: 0,
  async onClick() {
    await navigateTo('/blog')
  },
})

useActionButton({
  id: 'article-top',
  icon: 'i-lucide-chevron-up',
  label: '回到页面顶部',
  order: 1,
  visible: showTopAction,
  onClick() {
    if (!import.meta.client)
      return

    window.scrollTo({
      top: 0,
      behavior: preferredMotion.value === 'reduce' ? 'auto' : 'smooth',
    })
  },
})

usePageEntrance(pageRoot)
</script>

<template>
  <div
    ref="pageRoot"
    class="container px-4 lg:px-6 lg:gap-x-8 xl:gap-x-12 lg:grid lg:grid-cols-[13rem_minmax(0,56rem)] xl:grid-cols-[15rem_minmax(0,56rem)]"
  >
    <aside data-page-item class="mb-8 lg:mb-0">
      <ContentToc
        highlight
        highlight-variant="circuit"
        :links="tocLinks"
      />
    </aside>

    <article class="min-w-0">
      <NuxtLink
        data-page-item
        class="text-sm text-fg-3 font-mono mb-8 no-underline inline-flex gap-2 transition-colors duration-150 items-center hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-3 focus-visible:outline-offset-2"
        to="/blog"
      >
        <span class="i-lucide-arrow-left" aria-hidden="true" />
        Blog
      </NuxtLink>

      <PageIntro :title="article.title" :description="article.description" />

      <div data-page-item class="text-xs text-fg-4 font-mono mt-5 flex flex-wrap gap-x-5 gap-y-2 tabular-nums">
        <time :datetime="article.updated ?? article.date">
          UPDATED {{ displayDate }}
        </time>
      </div>

      <div data-page-item class="mt-10 pt-10 border-t border-fg-7 md:mt-12 md:pt-12">
        <ContentRenderer
          :value="article"
          class="max-w-none prose prose-invert prose-a:text-fg-1 prose-code:text-fg-2 prose-headings:text-fg-1 prose-li:text-fg-3 prose-p:text-fg-3 prose-strong:text-fg-1 prose-pre:border prose-pre:border-fg-7 prose-pre:bg-bg-2 prose-a:decoration-fg-5 prose-headings:scroll-mt-8"
        />
      </div>

      <NuxtLink
        data-page-item
        class="text-sm text-fg-2 font-mono mt-12 px-4 py-3 border border-fg-7 no-underline inline-flex gap-2 transition-colors duration-150 items-center hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-3 focus-visible:outline-offset-2 hover:border-fg-5"
        to="/blog"
      >
        <span class="i-lucide-arrow-left" aria-hidden="true" />
        返回文章列表
      </NuxtLink>
    </article>
  </div>
</template>
