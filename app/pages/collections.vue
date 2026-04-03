<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { collectionGroups } from '~/features/resources/data'

const pageRoot = useTemplateRef<HTMLElement>('pageRoot')

usePageEntrance(pageRoot)
</script>

<template>
  <div ref="pageRoot" class="mx-auto max-w-6xl">
    <PageIntro title="Collections" description="网站、开发资源与在线工具收藏。" />

    <div class="mt-12 gap-14 grid md:mt-16 md:gap-18">
      <ResourceSection
        v-for="group in collectionGroups"
        :key="group.title"
        data-page-item
        :group="group"
      />
    </div>
  </div>
</template>
