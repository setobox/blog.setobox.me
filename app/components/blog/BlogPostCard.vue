<script setup lang="ts">
import type { BlogPostSummary } from '#shared/types/blog'
import { computed } from 'vue'
import { isoContentDate } from '~/utils/content-date'

const props = defineProps<{
  post: BlogPostSummary
}>()

const hasCover = computed(() => Boolean(props.post.cover))
const isPinned = computed(() => Boolean(props.post.pin))
const displayDate = computed(() => isoContentDate(props.post.date))
</script>

<template>
  <article
    class="blog-post-card"
    :class="hasCover ? 'blog-post-card--with-cover' : 'blog-post-card--without-cover'"
  >
    <div class="blog-post-card__body">
      <div class="flex gap-3 min-w-0 items-start">
        <span class="blog-post-card__accent" aria-hidden="true" />
        <h2 class="blog-post-card__title">
          <NuxtLink class="blog-post-card__title-link focus-ring" :to="post.path">
            <span v-if="isPinned" class="i-lucide-pin text-accent mt-1 shrink-0" aria-hidden="true" />
            <span v-if="isPinned" class="sr-only">置顶：</span>
            <span>{{ post.title }}</span>
          </NuxtLink>
        </h2>
      </div>

      <div class="blog-post-card__meta">
        <span class="inline-flex gap-1.5 items-center">
          <span class="i-lucide-calendar-days" aria-hidden="true" />
          <time :datetime="displayDate">{{ displayDate }}</time>
        </span>
        <NuxtLink
          v-for="category in post.categories"
          :key="category"
          :to="`/blog/categories/${encodeURIComponent(slugifyTaxonomy(category))}`"
          class="inline-flex gap-1.5 items-center hover:text-ink-100 focus-ring"
        >
          <span class="i-lucide-folder" aria-hidden="true" />
          <span>{{ category }}</span>
        </NuxtLink>
      </div>

      <p v-if="post.description" class="blog-post-card__description">
        {{ post.description }}
      </p>

      <div v-if="post.tags?.length" class="blog-post-card__tags" aria-label="文章标签">
        <NuxtLink
          v-for="tag in post.tags"
          :key="tag"
          :to="`/blog/tags/${encodeURIComponent(slugifyTaxonomy(tag))}`"
          class="blog-post-card__tag focus-ring"
        >
          #{{ tag }}
        </NuxtLink>
      </div>
    </div>

    <BlogPostMedia
      :cover="post.cover"
      :path="post.path"
      :title="post.title"
    />
  </article>
</template>

<style>
.blog-post-card {
  display: grid;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 0.75rem;
  background: #14181d;
  transition:
    transform var(--motion-fast),
    border-color var(--motion-fast);
}

.blog-post-card--with-cover {
  grid-template-columns: minmax(0, 1fr);
}

.blog-post-card--without-cover {
  grid-template-columns: minmax(0, 1fr) 3.5rem;
}

.blog-post-card:hover {
  transform: translateY(-0.125rem);
  border-color: #2a323c;
  box-shadow: 0 1rem 2.75rem rgb(0 0 0 / 22%);
}

.blog-post-card__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 1.25rem;
}

.blog-post-card__accent {
  width: 0.25rem;
  height: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.25rem;
  border-radius: 9999px;
  background: var(--c-accent);
}

.blog-post-card__title {
  min-width: 0;
  margin: 0;
  color: #f2f5f8;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.25;
}

.blog-post-card__title-link {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.5rem;
  text-decoration: none;
  transition: color 150ms;
}

.blog-post-card__title-link:hover {
  color: var(--c-accent);
}

.blog-post-card__meta {
  display: flex;
  flex-wrap: wrap;
  margin-top: 0.75rem;
  column-gap: 0.75rem;
  row-gap: 0.5rem;
  color: #8a96a4;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  line-height: 1rem;
}

.blog-post-card__description {
  display: -webkit-box;
  overflow: hidden;
  margin: 1rem 0 0;
  color: #b8c2ce;
  font-size: 0.875rem;
  line-height: 1.5rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.blog-post-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 1.25rem;
}

.blog-post-card__tag {
  display: inline-flex;
  align-items: center;
  border-radius: 0.375rem;
  background: color-mix(in oklab, var(--c-accent) 12%, #0f1216);
  padding: 0.25rem 0.625rem;
  color: #b8c2ce;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  line-height: 1rem;
}

.blog-post-card__tag:hover {
  color: #f2f5f8;
}

html[data-article-layout='grid'] .blog-post-card__body {
  height: 100%;
}

@media (min-width: 48rem) {
  .blog-post-card__body {
    padding: 1.5rem;
  }

  html[data-article-layout='list'] .blog-post-card--with-cover {
    grid-template-columns: minmax(0, 1fr) minmax(14rem, 0.36fr);
  }

  html[data-article-layout='list'] .blog-post-card__body {
    min-height: 12rem;
    justify-content: flex-start;
  }

  html[data-article-layout='list'] .blog-post-card__title {
    font-size: 1.5rem;
  }

  html[data-article-layout='list'] .blog-post-card__description {
    font-size: 1rem;
    line-height: 1.75rem;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blog-post-card:hover {
    transform: none;
  }
}
</style>
