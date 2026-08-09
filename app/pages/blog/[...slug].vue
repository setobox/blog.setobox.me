<script setup lang="ts">
import Giscus from '@giscus/vue'
import { useDateFormat, usePreferredReducedMotion, useWindowScroll } from '@vueuse/core'
import { computed, useTemplateRef } from 'vue'
import { siteUrl } from '~/constants'

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
const permalink = new URL(route.path, siteUrl).href
const pageRoot = useTemplateRef<HTMLElement>('pageRoot')
const tocLinks = computed(() => article.body?.toc?.links ?? [])
const displayDate = useDateFormat(
  () => article.updated ?? article.date,
  'YYYY-MM-DD',
)
const readingMinutes = computed(() => article.minutes ?? 1)
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
        :title="article.title"
        :links="tocLinks"
      />
    </aside>

    <article class="min-w-0">
      <BlogArticleHeader
        :categories="article.categories"
        :cover="article.cover"
        :date-time="article.updated ?? article.date"
        :display-date="displayDate"
        :minutes="readingMinutes"
        :tags="article.tags"
        :title="article.title"
      />

      <ContentRenderer
        data-page-item
        :value="article"
        class="article-content mt-10 max-w-none prose prose-invert prose-a:text-fg-1 prose-code:text-fg-2 prose-headings:text-fg-1 prose-li:text-fg-3 prose-p:text-fg-3 prose-strong:text-fg-1 md:mt-12 prose-pre:border prose-pre:border-fg-7 prose-pre:bg-bg-2 prose-a:decoration-fg-5 prose-headings:scroll-mt-8"
      />

      <div data-page-item class="mt-12 md:mt-16">
        <ClientOnly>
          <Giscus
            id="comments"
            repo="setobox/giscus.setobox.me"
            repo-id="R_kgDOTr3Vsg"
            category="Announcements"
            category-id="DIC_kwDOTr3Vss4DCi6X"
            mapping="pathname"
            term="Welcome to @giscus/vue component!"
            reactions-enabled="1"
            emit-metadata="0"
            input-position="top"
            theme="gruvbox_dark"
            lang="zh-CN"
            loading="lazy"
          />
        </ClientOnly>
      </div>
    </article>
  </div>
</template>

<style scoped>
:deep(.article-content > :first-child) {
  margin-top: 0;
}
</style>
