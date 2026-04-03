<script setup lang="ts">
import { useTemplateRef } from 'vue'

const { data: page } = await useAsyncData('use-page', () => {
  return queryCollection('use').path('/use').first()
})

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Use page not found',
  })
}

const contentPage = page.value
const pageRoot = useTemplateRef<HTMLElement>('pageRoot')

usePageEntrance(pageRoot)
</script>

<template>
  <article ref="pageRoot" class="mx-auto max-w-4xl">
    <PageIntro :title="contentPage.title" :description="contentPage.description" />

    <div data-page-item mt-10 md:mt-12>
      <ContentRenderer
        :value="contentPage"
        max-w-none
        class="prose prose-invert prose-a:text-fg-1 prose-code:text-fg-2 prose-h2:text-fg-1 prose-h3:text-fg-2 prose-li:text-fg-3 prose-p:text-fg-3 prose-strong:text-fg-1 prose-h2:mt-8 prose-h3:mt-2 prose-a:decoration-fg-5 prose-a:decoration-none"
      />
    </div>
  </article>
</template>
