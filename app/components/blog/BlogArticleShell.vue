<script setup lang="ts">
import type { Toc } from '@nuxt/content'

defineProps<{
  toc?: Toc
}>()
</script>

<template>
  <div class="container-wide py-block">
    <section class="blog-article-mobile-nav mb-group p-item surface lg:hidden" aria-label="文章导航">
      <BlogSidebar orientation="horizontal" />
      <div v-if="toc?.links?.length" class="mt-item pt-item border-t border-ink-700">
        <BlogTocNav compact :toc="toc" />
      </div>
    </section>

    <div class="blog-article-shell">
      <aside class="blog-article-shell__left">
        <div class="blog-article-shell__sticky">
          <BlogSidebar />
          <div v-if="toc?.links?.length" class="blog-article-shell__left-toc">
            <BlogTocNav :toc="toc" />
          </div>
        </div>
      </aside>

      <div class="blog-article-shell__content">
        <slot />
      </div>

      <aside v-if="toc?.links?.length" class="blog-article-shell__right">
        <div class="blog-article-shell__sticky">
          <BlogTocNav :toc="toc" />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.blog-article-shell {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr);
}

.blog-article-mobile-nav {
  position: sticky;
  z-index: 10;
  top: 3.5rem;
  background: rgb(20 24 29 / 94%);
  box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 24%);
  backdrop-filter: blur(12px);
}

.blog-article-shell__left,
.blog-article-shell__right {
  display: none;
}

.blog-article-shell__content {
  min-width: 0;
}

.blog-article-shell__sticky {
  position: sticky;
  top: 5rem;
  max-height: calc(100vh - 7rem);
  overflow-y: auto;
  padding-right: 0.5rem;
}

.blog-article-shell__left-toc {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #1d232a;
}

@media (min-width: 64rem) {
  .blog-article-shell {
    grid-template-columns: 17.5rem minmax(0, 1fr);
    gap: 1.5rem;
  }

  .blog-article-shell__left {
    display: block;
    min-width: 0;
  }
}

@media (min-width: 48rem) and (max-width: 63.999rem) {
  .blog-article-mobile-nav {
    top: 4rem;
  }
}

@media (min-width: 80rem) {
  .blog-article-shell {
    grid-template-columns: 17.5rem minmax(0, 1fr) 14rem;
    gap: 2rem;
  }

  .blog-article-shell__left-toc {
    display: none;
  }

  .blog-article-shell__right {
    display: block;
    min-width: 0;
  }
}
</style>
