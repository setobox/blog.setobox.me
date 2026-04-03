<script setup lang="ts">
interface Props {
  description?: string
  title: string
}

defineProps<Props>()
</script>

<template>
  <header data-page-intro class="pb-8 border-b border-fg-7 md:pb-10">
    <h1 class="text-4xl tracking-tight font-bold m-0 md:text-5xl">
      {{ title }}
    </h1>
    <p v-if="description" class="text-base text-fg-3 leading-relaxed mb-0 mt-3 max-w-2xl md:text-lg">
      {{ description }}
    </p>
  </header>
</template>
