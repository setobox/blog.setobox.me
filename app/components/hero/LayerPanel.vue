<script setup lang="ts">
import type { LayerContent } from '~/features/home/layers'

const props = defineProps<{
  layer: LayerContent
  body?: unknown
}>()

const layerStyle = computed(() => ({ '--c-layer': props.layer.accent }))
</script>

<template>
  <article
    class="layer-panel container-content"
    :style="layerStyle"
    data-layer-scene
  >
    <div class="layer-panel__mask">
      <div class="layer-panel__content" data-layer-content>
        <span class="text-meta text-layer">L{{ layer.name }}</span>
        <h3 class="layer-panel__title text-display-lg text-ink-50 font-display mt-1">
          {{ layer.label }}
        </h3>

        <p class="layer-panel__summary text-lead mt-item">
          {{ layer.items.join(' · ') }}
        </p>

        <div v-if="body" class="layer-panel__body mt-group">
          <ContentRenderer :value="body" />
        </div>
      </div>
    </div>

    <div class="layer-panel__space" aria-hidden="true" />

    <div
      class="layer-panel__placeholder surface"
      data-layer-placeholder
      aria-hidden="true"
    />
  </article>
</template>

<style scoped>
.layer-panel {
  display: grid;
  grid-template-columns: minmax(0, 28rem) minmax(12vw, 1fr) minmax(12rem, 20rem);
  align-items: end;
  gap: clamp(1.5rem, 4vw, 5rem);
  min-height: 100svh;
  padding-top: 6rem;
  padding-bottom: clamp(3rem, 8vh, 7rem);
}

.layer-panel__mask {
  overflow: hidden;
  padding-left: 1.25rem;
  border-left: 2px solid var(--c-layer);
}

.layer-panel__title {
  line-height: 1.05;
}

.layer-panel__summary {
  max-inline-size: 38ch;
}

.layer-panel__body {
  max-inline-size: 46ch;
  color: #b8c2ce;
  font-size: 0.875rem;
  line-height: 1.7;
}

.layer-panel__body :deep(p) {
  margin: 0;
}

.layer-panel__body :deep(p + p) {
  margin-top: 0.625rem;
}

.layer-panel__body :deep(code) {
  border-radius: 4px;
  background: #14181d;
  padding: 0.1em 0.35em;
  color: #dde3ea;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.9em;
}

.layer-panel__placeholder {
  min-height: clamp(6rem, 12vh, 9rem);
  border-color: color-mix(in oklab, var(--c-layer) 38%, #1d232a);
  background: color-mix(in oklab, var(--c-layer) 6%, #14181d);
}

@media (width < 48rem) {
  .layer-panel {
    grid-template-columns: 1fr;
    align-content: end;
    gap: 2rem;
  }

  .layer-panel__space {
    display: none;
  }

  .layer-panel__placeholder {
    justify-self: end;
    width: min(70vw, 18rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .layer-panel {
    min-height: auto;
    padding-block: clamp(3rem, 8vw, 6rem);
  }
}
</style>
