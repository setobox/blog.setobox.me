<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  basePath?: string
  currentPage: number
  pageCount: number
}

type PaginationItem = number | `ellipsis-${number}-${number}`

const props = withDefaults(defineProps<Props>(), {
  basePath: '/blog',
})

const visiblePages = computed<PaginationItem[]>(() => {
  const pages = new Set([
    1,
    props.currentPage - 1,
    props.currentPage,
    props.currentPage + 1,
    props.pageCount,
  ])
  const orderedPages = [...pages]
    .filter(page => page >= 1 && page <= props.pageCount)
    .sort((left, right) => left - right)

  const items: PaginationItem[] = []
  for (const page of orderedPages) {
    const previous = items.at(-1)
    if (typeof previous === 'number' && page - previous > 1)
      items.push(`ellipsis-${previous}-${page}`)
    items.push(page)
  }

  return items
})

function pageTarget(page: number) {
  return {
    path: props.basePath,
    query: page === 1 ? {} : { page: String(page) },
  }
}
</script>

<template>
  <nav v-if="pageCount > 1" class="mt-10 flex gap-3 items-center justify-center md:mt-12" aria-label="文章分页">
    <NuxtLink
      v-if="currentPage > 1"
      v-slot="{ href, navigate }"
      custom
      :to="pageTarget(currentPage - 1)"
    >
      <a
        class="blog-page-control text-fg-3 border-fg-7 bg-bg-2 hover:text-fg-1 hover:border-fg-5 hover:-translate-y-0.5"
        :href="href"
        rel="prev"
        aria-label="上一页"
        @click="navigate"
      >
        <span class="i-lucide-chevron-left text-2xl" aria-hidden="true" />
      </a>
    </NuxtLink>
    <span v-else class="blog-page-control text-fg-6 border-fg-8 bg-bg-2 cursor-not-allowed" aria-disabled="true">
      <span class="i-lucide-chevron-left text-2xl" aria-hidden="true" />
    </span>

    <template v-for="item in visiblePages" :key="item">
      <span v-if="typeof item !== 'number'" class="text-fg-5 pb-3 flex h-14 w-6 items-end justify-center" aria-hidden="true">…</span>
      <span
        v-else-if="item === currentPage"
        class="blog-page-control text-bg-1 border-turquoise-2 bg-turquoise-2"
        aria-current="page"
        :aria-label="`第 ${item} 页，当前页`"
      >
        {{ item }}
      </span>
      <NuxtLink
        v-else
        v-slot="{ href, navigate }"
        custom
        :to="pageTarget(item)"
      >
        <a
          class="blog-page-control text-fg-3 border-fg-7 bg-bg-2 hover:text-fg-1 hover:border-fg-5 hover:-translate-y-0.5"
          :href="href"
          :aria-label="`第 ${item} 页`"
          @click="navigate"
        >
          {{ item }}
        </a>
      </NuxtLink>
    </template>

    <NuxtLink
      v-if="currentPage < pageCount"
      v-slot="{ href, navigate }"
      custom
      :to="pageTarget(currentPage + 1)"
    >
      <a
        class="blog-page-control text-fg-3 border-fg-7 bg-bg-2 hover:text-fg-1 hover:border-fg-5 hover:-translate-y-0.5"
        :href="href"
        rel="next"
        aria-label="下一页"
        @click="navigate"
      >
        <span class="i-lucide-chevron-right text-2xl" aria-hidden="true" />
      </a>
    </NuxtLink>
    <span v-else class="blog-page-control text-fg-6 border-fg-8 bg-bg-2 cursor-not-allowed" aria-disabled="true">
      <span class="i-lucide-chevron-right text-2xl" aria-hidden="true" />
    </span>
  </nav>
</template>
