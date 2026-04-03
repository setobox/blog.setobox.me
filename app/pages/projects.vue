<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { projectGroups } from '~/features/resources/data'

const pageRoot = useTemplateRef<HTMLElement>('pageRoot')

usePageEntrance(pageRoot)
</script>

<template>
  <div ref="pageRoot" class="mx-auto max-w-6xl">
    <PageIntro title="Projects" description="" />

    <div class="mt-12 gap-14 grid md:mt-16">
      <ResourceSection
        v-for="group in projectGroups"
        :key="group.title"
        data-page-item
        :group="group"
      />
    </div>
  </div>
</template>
