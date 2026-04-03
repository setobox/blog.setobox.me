<script setup lang="ts">
import { useDateFormat } from '@vueuse/core'
import { useTemplateRef } from 'vue'

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
const displayDate = useDateFormat(
  () => article.updated ?? article.date,
  'YYYY-MM-DD',
)

usePageEntrance(pageRoot)
</script>

<template>
  <article ref="pageRoot" class="mx-auto max-w-4xl">
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
        class="max-w-none prose prose-invert prose-a:text-fg-1 prose-code:text-fg-2 prose-headings:text-fg-1 prose-li:text-fg-3 prose-p:text-fg-3 prose-strong:text-fg-1 prose-pre:border prose-pre:border-fg-7 prose-pre:bg-bg-2 prose-a:decoration-fg-5"
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
</template>
