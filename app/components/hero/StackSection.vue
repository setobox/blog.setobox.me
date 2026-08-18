<script setup lang="ts">
import { LAYER_CONTENT } from '~/features/home/layers'

const { data: bodies } = await useAsyncData('home-layers', () =>
  queryCollection('layers').order('index', 'ASC').all())

const byIndex = computed(() => {
  const map = new Map<number, unknown>()
  for (const doc of bodies.value ?? []) map.set(doc.index, doc)
  return map
})
</script>

<template>
  <section
    class="stack-section"
    aria-labelledby="stack-heading"
  >
    <h2
      id="stack-heading"
      class="sr-only"
    >
      技术栈
    </h2>

    <HeroLayerPanel
      v-for="(layer, index) in LAYER_CONTENT"
      :key="layer.key"
      :layer="layer"
      :body="byIndex.get(index)"
    />
  </section>
</template>

<style scoped>
.stack-section {
  position: relative;
}
</style>
