<script setup lang="ts">
import type { ResourceGroup } from '~/features/resources/types'

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

usePageSeo({
  title: 'Collections',
  description: '网站、开发资源与在线工具收藏。',
})
</script>

<template>
  <section class="collections-page container-wide py-block">
    <PageIntro title="Collections" description="网站、开发资源与在线工具收藏。" />

    <div
      v-if="error"
      class="text-sm text-ink-200 mt-block p-group surface"
      role="alert"
    >
      <p class="m-0">
        数据加载失败，请稍后重试。
      </p>
      <button
        class="btn-ghost mt-group"
        type="button"
        @click="refresh()"
      >
        重新加载
      </button>
    </div>

    <p
      v-else-if="(status === 'idle' || status === 'pending') && !collectionGroups.length"
      class="text-sm text-ink-300 mt-block"
      aria-live="polite"
    >
      正在加载…
    </p>

    <div
      v-else-if="collectionGroups.length"
      class="mt-block gap-block grid"
    >
      <ResourceSection
        v-for="group in collectionGroups"
        :key="group.title"
        :group="group"
      />
    </div>

    <p v-else class="text-sm text-ink-300 mt-block">
      暂无数据。
    </p>
  </section>
</template>

<style scoped>
.collections-page {
  max-width: 72rem;
}
</style>
