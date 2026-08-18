<script setup lang="ts">
import type { ArticleLayout } from '~/features/article-layout/preferences'
import { ARTICLE_LAYOUTS } from '~/features/article-layout/preferences'

const { layout, setLayout } = useArticleLayoutPreference()

const labels: Record<ArticleLayout, string> = {
  list: '列表视图',
  grid: '网格视图',
}

const icons: Record<ArticleLayout, string> = {
  list: 'i-lucide-list',
  grid: 'i-lucide-layout-grid',
}
</script>

<template>
  <div class="p-1 rounded-sm bg-ink-900 inline-flex gap-1" role="group" aria-label="文章布局">
    <button
      v-for="option in ARTICLE_LAYOUTS"
      :key="option"
      type="button"
      class="text-ink-300 rounded-sm inline-flex h-8 w-8 transition-colors duration-240 items-center justify-center hover:text-ink-50 focus-ring"
      :class="{ 'text-white bg-accent': layout === option }"
      :aria-label="labels[option]"
      :title="labels[option]"
      :aria-pressed="layout === option"
      @click="setLayout(option)"
    >
      <span :class="icons[option]" aria-hidden="true" />
    </button>
  </div>
</template>
