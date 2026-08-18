<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'

const route = useRoute()
const pageRoot = useTemplateRef<HTMLElement>('pageRoot')
const isCompactRevealPage = computed(() => {
  const path = route.path
  return path === '/blog/archive'
    || path === '/blog/categories'
    || path.startsWith('/blog/categories/')
    || path === '/blog/tags'
    || path.startsWith('/blog/tags/')
})

usePageEntrance(pageRoot, {
  headingEffect: () => 'hero',
  revealInterval: () => isCompactRevealPage.value ? 0.035 : 0.07,
  revealMaxSpan: () => isCompactRevealPage.value ? 0.35 : Number.POSITIVE_INFINITY,
})
</script>

<template>
  <main id="main-content" ref="pageRoot" class="container-wide pb-block pt-20 md:pt-24">
    <div class="lg:flex lg:gap-block">
      <div class="blog-mobile-nav mb-group p-item surface lg:hidden">
        <BlogSidebar orientation="horizontal" />
      </div>

      <aside class="hidden lg:shrink-0 lg:w-sidebar-blog lg:block">
        <div class="blog-sidebar-sticky pr-2 overflow-y-auto">
          <BlogSidebar />
        </div>
      </aside>

      <div class="min-w-0 lg:flex-1">
        <slot />
      </div>
    </div>
  </main>
</template>

<style scoped>
.blog-mobile-nav {
  position: sticky;
  z-index: 10;
  top: 3.5rem;
  background: rgb(20 24 29 / 94%);
  box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 24%);
  backdrop-filter: blur(12px);
}

.blog-sidebar-sticky {
  position: sticky;
  top: 5rem;
}

@media (min-width: 48rem) and (max-width: 63.999rem) {
  .blog-mobile-nav {
    top: 4rem;
  }
}
</style>
