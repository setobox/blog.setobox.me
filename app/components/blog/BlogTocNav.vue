<script setup lang="ts">
import type { Toc, TocLink } from '@nuxt/content'
import { useIntersectionObserver, usePreferredReducedMotion } from '@vueuse/core'
import { computed, nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  compact?: boolean
  toc?: Toc
}>()

const items = computed(() => flattenLinks(props.toc?.links))
const activeId = shallowRef<string>()
const headingElements = shallowRef<HTMLElement[]>([])
const scrollContainer = useTemplateRef<HTMLElement>('scrollContainer')
const preferredMotion = usePreferredReducedMotion()
const visibleIds = new Set<string>()

function flattenLinks(links: TocLink[] | undefined): TocLink[] {
  return (links ?? []).flatMap(link => [link, ...flattenLinks(link.children)])
}

function refreshHeadings(): void {
  if (!import.meta.client)
    return

  visibleIds.clear()
  headingElements.value = items.value
    .map(item => document.getElementById(item.id))
    .filter((heading): heading is HTMLElement => heading !== null)

  activeId.value = resolveActiveId() ?? items.value[0]?.id
}

function resolveActiveId(): string | undefined {
  const visibleItem = items.value.find(item => visibleIds.has(item.id))
  if (visibleItem)
    return visibleItem.id

  const passedHeading = [...headingElements.value]
    .reverse()
    .find(heading => heading.getBoundingClientRect().top <= 96)

  return passedHeading?.id ?? activeId.value
}

useIntersectionObserver(
  headingElements,
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting)
        visibleIds.add(entry.target.id)
      else
        visibleIds.delete(entry.target.id)
    }

    activeId.value = resolveActiveId()
  },
  { rootMargin: '-80px 0px -70% 0px' },
)

watch(items, async () => {
  await nextTick()
  refreshHeadings()
})

watch(activeId, async (id) => {
  if (!props.compact || !id)
    return

  await nextTick()
  const container = scrollContainer.value
  const link = Array.from(container?.querySelectorAll<HTMLElement>('[data-toc-id]') ?? [])
    .find(element => element.dataset.tocId === id)

  if (!container || !link)
    return

  const containerRect = container.getBoundingClientRect()
  const linkRect = link.getBoundingClientRect()
  const topInset = 8
  const bottomInset = 8
  let nextScrollTop: number | undefined

  if (linkRect.top < containerRect.top + topInset)
    nextScrollTop = container.scrollTop + linkRect.top - containerRect.top - topInset
  else if (linkRect.bottom > containerRect.bottom - bottomInset)
    nextScrollTop = container.scrollTop + linkRect.bottom - containerRect.bottom + bottomInset

  if (nextScrollTop === undefined)
    return

  container.scrollTo({
    behavior: preferredMotion.value === 'reduce' ? 'auto' : 'smooth',
    top: Math.max(0, nextScrollTop),
  })
})

onMounted(refreshHeadings)
</script>

<template>
  <nav v-if="items.length" aria-label="文章目录">
    <h2 data-text-reveal="heading" class="text-meta">
      目录
    </h2>
    <div
      ref="scrollContainer"
      class="blog-toc-scroll mt-item"
      :class="{ 'blog-toc-scroll--compact': compact }"
    >
      <ul class="m-0 p-0 list-none border-l border-ink-700 flex flex-col">
        <li v-for="item in items" :key="item.id">
          <a
            :href="`#${encodeURIComponent(item.id)}`"
            data-text-reveal="line"
            :data-toc-id="item.id"
            class="text-sm leading-snug py-1 outline-none border-l-2 block transition-colors duration-240 -ml-px"
            :class="[
              item.depth >= 3 ? 'pl-6 pr-2' : 'pl-3 pr-2',
              activeId === item.id
                ? 'border-accent bg-ink-850 text-ink-50'
                : 'border-transparent text-ink-300 hover:border-ink-600 hover:text-ink-100',
            ]"
            :aria-current="activeId === item.id ? 'location' : undefined"
          >
            {{ item.text }}
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.blog-toc-scroll--compact {
  max-height: min(8.5rem, 24svh);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: #3d4754 transparent;
  scrollbar-width: thin;
}
</style>
