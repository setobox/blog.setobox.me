<script setup lang="ts">
import type { ResourceGroup } from '~/features/resources/types'
import { useTemplateRef } from 'vue'

const pageRoot = useTemplateRef<HTMLElement>('pageRoot')

const {
  data: collectionGroups,
  error,
  refresh,
  status,
} = await useLazyFetch<ResourceGroup[]>('/api/collections', {
  default: () => [],
  key: 'collection-groups',
  server: false,
})

usePageEntrance(pageRoot)
</script>

<template>
  <div ref="pageRoot" class="mx-auto max-w-6xl">
    <PageIntro title="Collections" description="网站、开发资源与在线工具收藏。" />

    <div
      v-if="error"
      class="text-sm text-fg-3 mt-12 p-5 border border-fg-7 md:mt-16"
      role="alert"
    >
      <p class="m-0">
        数据加载失败，请稍后重试。
      </p>
      <button
        class="text-fg-2 font-bold mt-3 p-0 border-0 border-b border-fg-5 bg-transparent cursor-pointer hover:text-fg-1"
        type="button"
        @click="refresh()"
      >
        重新加载
      </button>
    </div>

    <p
      v-else-if="(status === 'idle' || status === 'pending') && !collectionGroups.length"
      class="text-sm text-fg-4 mt-12 md:mt-16"
      aria-live="polite"
    >
      正在加载…
    </p>

    <div
      v-else-if="collectionGroups.length"
      class="mt-12 gap-14 grid md:mt-16 md:gap-18"
    >
      <ResourceSection
        v-for="group in collectionGroups"
        :key="group.title"
        data-page-item
        :group="group"
      />
    </div>

    <p v-else class="text-sm text-fg-4 mt-12 md:mt-16">
      暂无数据。
    </p>
  </div>
</template>
