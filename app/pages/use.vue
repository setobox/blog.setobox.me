<script setup lang="ts">
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

usePageSeo({
  title: contentPage.title,
  description: contentPage.description ?? '我在用的硬件、软件与开发工具。',
})
</script>

<template>
  <article class="container-prose py-block">
    <PageIntro :title="contentPage.title" :description="contentPage.description" />

    <div data-page-item class="mt-block">
      <ContentRenderer
        :value="contentPage"
        class="max-w-none prose"
      />
    </div>
  </article>
</template>
