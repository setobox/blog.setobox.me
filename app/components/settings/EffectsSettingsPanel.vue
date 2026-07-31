<script setup lang="ts">
import type { GrainLayer } from '~/features/appearance/preferences'
import { GRAIN_LAYERS } from '~/features/appearance/preferences'

interface Props {
  enabled: boolean
  layer: GrainLayer
}

interface Emits {
  setEnabled: [enabled: boolean]
  setLayer: [layer: GrainLayer]
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const layerOptions: readonly {
  description: string
  icon: `i-lucide-${string}`
  label: string
  value: GrainLayer
}[] = [
  {
    description: '位于卡片与页面内容下方',
    icon: 'i-lucide-panels-top-left',
    label: '背景层',
    value: 'background',
  },
  {
    description: '覆盖内容，保留导航与面板清晰',
    icon: 'i-lucide-layers-2',
    label: '内容层',
    value: 'content',
  },
  {
    description: '覆盖页面、导航、面板与 Loading',
    icon: 'i-lucide-scan',
    label: '全站顶层',
    value: 'top',
  },
]

function handleLayerKeydown(event: KeyboardEvent, currentLayer: GrainLayer): void {
  const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown'
    ? 1
    : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
      ? -1
      : 0

  if (direction === 0)
    return

  event.preventDefault()
  const currentIndex = GRAIN_LAYERS.indexOf(currentLayer)
  const nextIndex = (currentIndex + direction + GRAIN_LAYERS.length) % GRAIN_LAYERS.length
  const nextLayer = GRAIN_LAYERS[nextIndex] ?? currentLayer

  emit('setLayer', nextLayer)
  const group = (event.currentTarget as HTMLElement).parentElement
  group
    ?.querySelector<HTMLElement>(`[data-grain-option="${nextLayer}"]`)
    ?.focus()
}
</script>

<template>
  <section
    id="effects-settings-panel"
    class="effects-panel"
    role="tabpanel"
    aria-labelledby="effects-settings-tab"
  >
    <div class="effects-heading">
      <div>
        <p class="effects-kicker">
          视觉质感
        </p>
        <h2 class="effects-title">
          轻微纸张颗粒
        </h2>
      </div>
      <button
        class="effects-switch"
        :class="{ 'effects-switch-active': enabled }"
        type="button"
        role="switch"
        :aria-checked="enabled"
        aria-label="纸张颗粒"
        @click="emit('setEnabled', !enabled)"
      >
        <span class="effects-switch-thumb" aria-hidden="true" />
      </button>
    </div>

    <p class="effects-description">
      使用低透明度分形噪声叠加纸张纹理，不改变页面本身的渲染与交互。
    </p>

    <fieldset class="effects-layers" :disabled="!enabled">
      <legend class="effects-kicker">
        纹理层级
      </legend>
      <div class="effects-layer-options" role="radiogroup" aria-label="纸张颗粒层级">
        <button
          v-for="option in layerOptions"
          :key="option.value"
          class="effects-layer-option"
          :class="{ 'effects-layer-option-active': layer === option.value }"
          type="button"
          role="radio"
          :aria-checked="layer === option.value"
          :data-grain-option="option.value"
          :tabindex="layer === option.value ? 0 : -1"
          @click="emit('setLayer', option.value)"
          @keydown="handleLayerKeydown($event, option.value)"
        >
          <span :class="option.icon" class="effects-layer-icon" aria-hidden="true" />
          <span>
            <strong>{{ option.label }}</strong>
            <small>{{ option.description }}</small>
          </span>
        </button>
      </div>
    </fieldset>
  </section>
</template>

<style scoped>
.effects-panel,
.effects-layers,
.effects-layer-options {
  display: grid;
}

.effects-panel {
  gap: 1rem;
}

.effects-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.effects-kicker {
  margin: 0 0 0.25rem;
  color: var(--hex-fg-4);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.effects-title {
  margin: 0;
  color: var(--hex-fg-1);
  font-size: 1.4rem;
  line-height: 1.2;
}

.effects-description {
  margin: 0;
  color: var(--hex-fg-3);
  font-size: 0.875rem;
  line-height: 1.65;
}

.effects-switch {
  position: relative;
  width: 3.25rem;
  height: 1.875rem;
  flex: 0 0 auto;
  border: 1px solid var(--hex-fg-6);
  border-radius: 999px;
  padding: 0;
  background: var(--hex-bg-4);
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background-color 150ms ease;
}

.effects-switch-thumb {
  position: absolute;
  top: 0.1875rem;
  left: 0.1875rem;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 999px;
  background: var(--hex-fg-2);
  box-shadow: 0 2px 8px rgb(0 0 0 / 35%);
  transition:
    background-color 150ms ease,
    transform 150ms ease;
}

.effects-switch-active {
  border-color: var(--theme-3);
  background: var(--theme-5);
}

.effects-switch-active .effects-switch-thumb {
  background: var(--theme-1);
  transform: translateX(1.375rem);
}

.effects-layers {
  min-width: 0;
  gap: 0.65rem;
  border: 0;
  margin: 0;
  padding: 0;
}

.effects-layers:disabled {
  opacity: 0.48;
}

.effects-layer-options {
  gap: 0.5rem;
}

.effects-layer-option {
  display: grid;
  grid-template-columns: 2rem 1fr;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--hex-fg-7);
  border-radius: 0.875rem;
  padding: 0.75rem;
  color: var(--hex-fg-3);
  text-align: left;
  background: var(--hex-bg-2);
  cursor: pointer;
  transition:
    border-color 150ms ease,
    color 150ms ease,
    transform 150ms ease;
}

.effects-layer-option:hover {
  color: var(--hex-fg-1);
  transform: translateY(-1px);
}

.effects-layer-option-active {
  border-color: var(--theme-4);
  color: var(--theme-1);
  background: var(--theme-8);
}

.effects-layer-icon {
  font-size: 1.25rem;
}

.effects-layer-option strong,
.effects-layer-option small {
  display: block;
}

.effects-layer-option strong {
  font-size: 0.875rem;
}

.effects-layer-option small {
  margin-top: 0.15rem;
  color: var(--hex-fg-4);
  font-size: 0.6875rem;
  line-height: 1.35;
}

.effects-switch:focus-visible,
.effects-layer-option:focus-visible {
  outline: 2px solid var(--theme-1);
  outline-offset: 2px;
}
</style>
