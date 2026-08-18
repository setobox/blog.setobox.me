<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
}>(), {
  orientation: 'vertical',
})

const sectionNavigation = [
  { label: '全部文章', to: '/blog' },
  { label: '分类', to: '/blog/categories' },
  { label: '标签', to: '/blog/tags' },
  { label: '归档', to: '/blog/archive' },
] as const

const ARTICLE_PATH_RE = /^\/blog\/\d{4}\//

const route = useRoute()

const listClasses = computed(() => props.orientation === 'horizontal'
  ? 'grid grid-cols-4 gap-2'
  : 'flex flex-col gap-1')

const linkClasses = computed(() => props.orientation === 'horizontal'
  ? 'min-h-11 min-w-0 px-2 border border-ink-700 bg-ink-850 inline-flex items-center justify-center text-center whitespace-nowrap hover:border-ink-600'
  : 'px-3 py-2 block')

function sectionIsActive(path: string): boolean {
  if (path === '/blog')
    return route.path === '/blog' || ARTICLE_PATH_RE.test(route.path)
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <nav data-text-reveal-ignore aria-label="博客导航">
    <ul class="m-0 p-0 list-none" :class="listClasses">
      <li v-for="entry in sectionNavigation" :key="entry.to">
        <NuxtLink
          :to="entry.to"
          data-text-reveal="line"
          class="text-sm outline-none rounded-sm w-full transition-colors duration-240 touch-manipulation"
          :class="[
            linkClasses,
            sectionIsActive(entry.to)
              ? 'bg-ink-800 text-ink-50 font-medium'
              : 'text-ink-300 hover:text-ink-100 hover:bg-ink-850',
          ]"
          :aria-current="sectionIsActive(entry.to) ? 'page' : undefined"
        >
          {{ entry.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
