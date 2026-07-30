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

const category = computed(() => props.post.categories?.[0] ?? props.post.tags?.[0])
const isPinned = computed(() => Boolean(props.post.pin))
</script>

<template>
  <article class="group blog-card">
    <div class="p-6 flex flex-col min-w-0 justify-center sm:p-7">
      <h2 class="text-2xl leading-tight font-bold m-0 md:text-2xl">
        <NuxtLink class="inline-flex gap-3 transition-colors duration-150 items-start hover:text-turquoise-2 focus-visible:outline-2 focus-visible:outline-fg-3 focus-visible:outline-offset-2" :to="post.path">
          <span v-if="isPinned" class="i-lucide-pin text-corail-1 mt-1 shrink-0" aria-hidden="true" />
          <span>{{ post.title }}</span>
        </NuxtLink>
      </h2>

      <div class="text-xs text-fg-4 font-mono mt-4 flex flex-wrap gap-x-3 gap-y-2 items-center tabular-nums">
        <span class="inline-flex gap-1.5 items-center">
          <span class="i-lucide-calendar-days" aria-hidden="true" />
          <time :datetime="post.date">{{ displayDate }}</time>
        </span>
        <template v-if="category">
          <span aria-hidden="true">/</span>
          <span class="inline-flex gap-1.5 items-center">
            <span class="i-lucide-folder" aria-hidden="true" />
            {{ category }}
          </span>
        </template>
      </div>

      <p class="text-base text-fg-3 leading-7 mb-0 mt-5 line-clamp-3">
        {{ post.description }}
      </p>
    </div>

    <NuxtLink
      class="bg-bg-3 aspect-16/9 order-first relative overflow-hidden focus-visible:outline-2 focus-visible:outline-fg-3 focus-visible:outline-offset--4 sm:aspect-auto sm:order-none"
      :to="post.path"
      :aria-label="`阅读《${post.title}》`"
    >
      <NuxtImg
        v-if="post.cover"
        class="h-full w-full transition-transform duration-500 inset-0 absolute object-cover group-hover:scale-105"
        :src="post.cover"
        :alt="`${post.title} 封面`"
        width="896"
        height="504"
        sizes="100vw sm:42vw lg:380px"
        fit="cover"
        format="webp"
        quality="80"
        loading="lazy"
        decoding="async"
      />
      <div v-else class="flex-center inset-0 absolute">
        <span class="i-lucide-image text-4xl text-fg-5" aria-hidden="true" />
      </div>
      <span class="h-24 pointer-events-none inset-x-0 bottom-0 absolute from-transparent to-bg-2 bg-gradient-to-b sm:hidden" aria-hidden="true" />
      <span class="w-32 hidden pointer-events-none inset-y-0 left-0 absolute from-bg-2 bg-gradient-to-r sm:block" aria-hidden="true" />
    </NuxtLink>
  </article>
</template>
