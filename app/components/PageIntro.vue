<script setup lang="ts">
interface Props {
  description?: string
  title: string
}

defineProps<Props>()
</script>

<template>
  <header data-page-intro class="pb-group border-b border-ink-700">
    <p data-text-reveal="line" class="text-meta text-accent">
      SYSTEM / PAGE
    </p>
    <h1 data-text-reveal="heading" class="text-display-lg text-ink-50 font-display mt-item">
      {{ title }}
    </h1>
    <p v-if="description" data-text-reveal="line" class="text-lead mt-group max-w-prose">
      {{ description }}
    </p>
  </header>
</template>
