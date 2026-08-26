<script setup lang="ts">
import { useTemplateRef } from 'vue'

const route = useRoute()
const pageRoot = useTemplateRef<HTMLElement>('pageRoot')
const ARTICLE_ROUTE_RE = /^\/blog\/\d{4}\//

usePageEntrance(pageRoot, {
  animateInitial: () => !ARTICLE_ROUTE_RE.test(route.path),
})
</script>

<template>
  <main id="main-content" ref="pageRoot" class="pt-14 min-h-100lvh w-full md:pt-16">
    <slot />
  </main>
</template>
