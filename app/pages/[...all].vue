<script setup lang="ts">
import { useTemplateRef } from 'vue'

const event = useRequestEvent()

if (event) {
  setResponseStatus(event, 404, 'Page Not Found')
}

const pageRoot = useTemplateRef<HTMLElement>('pageRoot')

usePageEntrance(pageRoot)
</script>

<template>
  <section ref="pageRoot" class="mx-auto py-8 max-w-3xl md:py-16">
    <PageIntro title="404" description="这个页面不存在，或者已经被移动。" />

    <div data-page-item class="text-fg-3 mt-10 p-5 border border-fg-7 bg-bg-2 flex gap-4 items-center">
      <span class="i-lucide-circle-alert text-2xl shrink-0" aria-hidden="true" />
      <p class="leading-relaxed m-0">
        你可以返回首页，或从顶部导航继续浏览。
      </p>
    </div>

    <NuxtLink
      data-page-item
      class="text-sm text-fg-2 font-mono mt-6 px-4 py-3 border border-fg-7 no-underline inline-flex gap-2 transition-colors duration-150 items-center hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-3 focus-visible:outline-offset-2 hover:border-fg-5"
      to="/"
    >
      <span class="i-lucide-arrow-left" aria-hidden="true" />
      返回首页
    </NuxtLink>
  </section>
</template>
