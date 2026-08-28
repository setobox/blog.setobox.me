<script setup lang="ts">
import { computed } from 'vue'
import {
  contentUtcYear,
} from '~/utils/content-date'

definePageMeta({ layout: 'blog' })
const { data: posts } = await useAsyncData('blog-archive', () => baseBlogQuery().select('path', 'title', 'date', 'categories').all())

type ArchivePost = NonNullable<typeof posts.value>[number]
interface YearGroup { posts: ArchivePost[], total: number, year: number }

const grouped = computed<YearGroup[]>(() => {
  const years = new Map<number, ArchivePost[]>()
  for (const post of posts.value ?? []) {
    const year = contentUtcYear(post.date)
    const entries = years.get(year) ?? []
    entries.push(post)
    years.set(year, entries)
  }

  return [...years.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([year, entries]) => ({
      year,
      total: entries.length,
      posts: entries,
    }))
})

usePageSeo({ title: '博客归档', description: '按时间浏览全部文章。' })
</script>

<template>
  <section>
    <h1 class="font-display text-display-lg text-ink-50">
      归档
    </h1>
    <p class="text-lead mt-group">
      共 {{ posts?.length ?? 0 }} 篇文章。
    </p>
    <div v-if="grouped.length" class="archive-timeline mt-block">
      <section
        v-for="group in grouped"
        :key="group.year"
        class="archive-timeline__year"
        :aria-labelledby="`year-${group.year}`"
      >
        <div class="archive-timeline__heading">
          <h2 :id="`year-${group.year}`" class="font-display text-h2 text-ink-50">
            {{ group.year }}
          </h2>
          <span class="text-meta">{{ group.total }} 篇</span>
        </div>
        <ul class="archive-timeline__entries">
          <li v-for="post in group.posts" :key="post.path">
            <NuxtLink :to="post.path" class="archive-timeline__entry focus-ring">
              <span class="archive-timeline__marker" aria-hidden="true" />
              <span>{{ post.title }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
    <p v-else class="text-ink-300 mt-block">
      还没有文章。
    </p>
  </section>
</template>

<style scoped>
.archive-timeline {
  border-left: 1px solid #1d232a;
}

.archive-timeline__year {
  position: relative;
  padding: 0 0 3rem 2rem;
}

.archive-timeline__year:last-child {
  padding-bottom: 0;
}

.archive-timeline__year::before {
  position: absolute;
  top: 0.65rem;
  left: -0.375rem;
  width: 0.6875rem;
  height: 0.6875rem;
  border: 2px solid var(--c-bg);
  border-radius: 9999px;
  background: var(--c-accent);
  content: '';
}

.archive-timeline__heading {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.archive-timeline__entries {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.archive-timeline__entry {
  position: relative;
  display: block;
  padding: 0.5rem 0;
  color: #dde3ea;
  text-decoration: none;
  transition: color 240ms ease;
}

.archive-timeline__entry:hover {
  color: var(--c-accent);
}

.archive-timeline__marker {
  position: absolute;
  top: 1rem;
  left: -2.28rem;
  width: 0.5625rem;
  height: 0.5625rem;
  border-radius: 9999px;
  background: #3d4754;
  transition:
    background-color 240ms ease,
    transform 240ms ease;
}

.archive-timeline__entry:hover .archive-timeline__marker {
  background: var(--c-accent);
  transform: scale(1.25);
}

@media (prefers-reduced-motion: reduce) {
  .archive-timeline__entry,
  .archive-timeline__marker {
    transition: none;
  }
}
</style>
