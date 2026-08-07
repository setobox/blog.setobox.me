<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  categories?: string[]
  cover?: string
  dateTime: Date | string
  displayDate: string
  minutes: number
  tags?: string[]
  title: string
}

const props = defineProps<Props>()

const categoryText = computed(() => {
  const categories = props.categories?.filter(Boolean) ?? []
  return categories.length ? categories.join(' · ') : undefined
})

const hasCover = computed(() => Boolean(props.cover?.trim()))
const dateTimeValue = computed(() => {
  return props.dateTime instanceof Date
    ? props.dateTime.toISOString()
    : props.dateTime
})
const visibleTags = computed(() => props.tags?.filter(Boolean) ?? [])
</script>

<template>
  <header data-page-item class="article-header">
    <p
      v-if="categoryText"
      class="text-sm text-current-1 leading-5 font-mono m-0"
    >
      {{ categoryText }}
    </p>

    <h1
      class="text-4xl leading-tight tracking-tight font-bold m-0 md:text-5xl"
      :class="categoryText && 'mt-4'"
    >
      {{ title }}
    </h1>

    <div
      class="text-xs text-fg-4 leading-5 font-mono mt-6 flex flex-wrap gap-x-5 gap-y-2 tabular-nums"
      aria-label="文章元信息"
    >
      <span class="inline-flex gap-1.5 items-center">
        <span class="i-lucide-calendar-days" aria-hidden="true" />
        <time :datetime="dateTimeValue">{{ displayDate }}</time>
      </span>

      <span class="inline-flex gap-1.5 items-center">
        <span class="i-lucide-clock-3" aria-hidden="true" />
        <span>{{ minutes }} 分钟阅读</span>
      </span>

      <span
        v-for="tag in visibleTags"
        :key="tag"
        class="inline-flex gap-1.5 items-center"
      >
        <span class="i-lucide-tag" aria-hidden="true" />
        <span>{{ tag }}</span>
      </span>
    </div>

    <figure v-if="hasCover" class="m-0 mt-8 md:mt-10">
      <NuxtImg
        class="rounded-xl h-auto max-w-full w-full block"
        :src="cover"
        :alt="`${title} 封面`"
        width="896"
        sizes="100vw lg:896px"
        format="webp"
        quality="80"
        loading="eager"
        decoding="async"
        fetchpriority="high"
      />
    </figure>
  </header>
</template>
