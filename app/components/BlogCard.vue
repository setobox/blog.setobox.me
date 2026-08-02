<script setup lang="ts">
import type { BlogPostSummary } from '#shared/types/blog'
import { useDateFormat } from '@vueuse/core'
import { computed } from 'vue'

interface Props {
  post: BlogPostSummary
}

const props = defineProps<Props>()

const displayDate = useDateFormat(
  () => props.post.date,
  'YYYY-MM-DD',
)

const hasCover = computed(() => Boolean(props.post.cover))
const isPinned = computed(() => Boolean(props.post.pin))
</script>

<template>
  <article
    class="blog-card"
    :class="hasCover ? 'blog-card--with-cover' : 'blog-card--without-cover'"
  >
    <div class="blog-card-body">
      <div class="flex gap-3 min-w-0 items-start">
        <span class="mt-1 rounded-full bg-[var(--theme-1)] shrink-0 h-6 w-1" aria-hidden="true" />
        <h2 class="blog-card-title text-xl leading-tight font-bold m-0 min-w-0">
          <NuxtLink
            class="text-fg-1 no-underline inline-flex gap-2 transition-colors duration-150 items-start hover:text-current-1 focus-visible:outline-2 focus-visible:outline-current-1 focus-visible:outline-offset-2"
            :to="post.path"
          >
            <span v-if="isPinned" class="i-lucide-pin text-corail-1 mt-1 shrink-0" aria-hidden="true" />
            <span v-if="isPinned" class="sr-only">置顶：</span>
            <span>{{ post.title }}</span>
          </NuxtLink>
        </h2>
      </div>

      <div class="blog-card-meta">
        <span class="inline-flex gap-1.5 items-center">
          <span class="i-lucide-calendar-days" aria-hidden="true" />
          <time :datetime="post.date">{{ displayDate }}</time>
        </span>
        <span
          v-for="category in post.categories"
          :key="category"
          class="inline-flex gap-1.5 items-center"
        >
          <span class="i-lucide-folder" aria-hidden="true" />
          <span>{{ category }}</span>
        </span>
      </div>

      <p
        v-if="post.description"
        class="blog-card-description text-sm text-fg-3 leading-6 mb-0 mt-4 line-clamp-2"
      >
        {{ post.description }}
      </p>

      <div v-if="post.tags?.length" class="mt-auto pt-5 flex flex-wrap gap-2" aria-label="文章标签">
        <span v-for="tag in post.tags" :key="tag" class="blog-card-tag">
          #{{ tag }}
        </span>
      </div>
    </div>

    <BlogCardMedia
      :cover="post.cover"
      :path="post.path"
      :title="post.title"
    />
  </article>
</template>

<style scoped>
.blog-card {
  display: grid;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 0.75rem;
  background: var(--hex-bg-2);
  transition:
    transform 200ms,
    box-shadow 200ms,
    background-color 200ms,
    border-color 200ms;
}

.blog-card--with-cover {
  grid-template-columns: minmax(0, 1fr);
}

.blog-card--without-cover {
  grid-template-columns: minmax(0, 1fr) 3.5rem;
}

.blog-card:hover {
  transform: translateY(-0.125rem);
}

.blog-card-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 1.25rem;
}

.blog-card-meta {
  display: flex;
  flex-wrap: wrap;
  margin-top: 0.75rem;
  column-gap: 0.75rem;
  row-gap: 0.5rem;
  color: var(--hex-fg-4);
  font-family: 'DM Mono', monospace;
  font-size: 0.75rem;
  line-height: 1rem;
  font-variant-numeric: tabular-nums;
}

.blog-card-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 0.375rem;
  background: var(--theme-7);
  color: var(--hex-fg-3);
  font-family: 'DM Mono', monospace;
  font-size: 0.75rem;
  line-height: 1rem;
}

:global(html[data-card-borders='true'] .blog-card) {
  border-color: var(--hex-fg-7);
  box-shadow: 0 0.75rem 2.25rem rgb(0 0 0 / 16%);
}

:global(html[data-card-borders='true'] .blog-card:hover) {
  box-shadow: 0 1rem 2.75rem rgb(0 0 0 / 22%);
}

:global(html[data-card-theme-tint='true'] .blog-card) {
  background: color-mix(in oklch, var(--theme-8) 72%, var(--hex-bg-2));
}

:global(html[data-article-layout='grid'] .blog-card-body) {
  height: 100%;
}

@media (min-width: 40rem) {
  .blog-card-body {
    padding: 1.5rem;
  }
}

@media (min-width: 48rem) {
  :global(html[data-article-layout='list'] .blog-card--with-cover) {
    grid-template-columns: minmax(0, 1fr) minmax(14rem, 0.36fr);
  }

  :global(html[data-article-layout='list'] .blog-card-body) {
    min-height: 12rem;
    justify-content: flex-start;
  }

  :global(html[data-article-layout='list'] .blog-card-title) {
    font-size: 1.5rem;
  }

  :global(html[data-article-layout='list'] .blog-card-description) {
    display: -webkit-box;
    overflow: hidden;
    font-size: 1rem;
    line-height: 1.75rem;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blog-card {
    transition: none;
  }

  .blog-card:hover {
    transform: none;
  }
}
</style>
