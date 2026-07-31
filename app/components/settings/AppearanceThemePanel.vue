<script setup lang="ts">
import type { ThemePreset, ThemePresetOption } from '~/features/appearance/preferences'

interface Props {
  hue: number
  presets: readonly ThemePresetOption[]
  selectedPreset: ThemePreset | null
}

interface Emits {
  reset: []
  selectPreset: [preset: ThemePreset]
  updateHue: [hue: number]
}

defineProps<Props>()

const emit = defineEmits<Emits>()

function handleHueInput(event: Event): void {
  if (!(event.currentTarget instanceof HTMLInputElement))
    return

  emit('updateHue', Number(event.currentTarget.value))
}
</script>

<template>
  <section class="appearance-panel" aria-labelledby="appearance-theme-title">
    <div class="appearance-heading">
      <div>
        <p class="appearance-kicker">
          当前强调色
        </p>
        <h2 id="appearance-theme-title" class="appearance-title">
          主题色相
        </h2>
      </div>
      <div class="appearance-heading-actions">
        <output class="appearance-hue-value" for="appearance-hue">
          {{ hue }}°
        </output>
        <button
          class="appearance-reset"
          type="button"
          aria-label="重置为天蓝色主题"
          title="重置主题色"
          @click="emit('reset')"
        >
          <span class="i-lucide-rotate-ccw" aria-hidden="true" />
        </button>
      </div>
    </div>

    <label class="sr-only" for="appearance-hue">主题色相</label>
    <input
      id="appearance-hue"
      class="appearance-hue"
      type="range"
      min="0"
      max="360"
      step="1"
      :value="hue"
      @input="handleHueInput"
    >

    <div class="appearance-presets">
      <p class="appearance-kicker">
        预设颜色
      </p>
      <div class="appearance-swatches" role="list" aria-label="主题色预设">
        <button
          v-for="preset in presets"
          :key="preset.name"
          class="appearance-swatch"
          :class="{ 'appearance-swatch-active': selectedPreset === preset.name }"
          type="button"
          role="listitem"
          :aria-label="preset.label"
          :aria-pressed="selectedPreset === preset.name"
          :title="preset.label"
          :style="{ backgroundColor: `var(--hex-${preset.name}-1)` }"
          @click="emit('selectPreset', preset.name)"
        >
          <span v-if="selectedPreset === preset.name" class="i-lucide-check" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.appearance-panel {
  display: grid;
  gap: 1.25rem;
}

.appearance-heading,
.appearance-heading-actions {
  display: flex;
  align-items: center;
}

.appearance-heading {
  justify-content: space-between;
  gap: 1rem;
}

.appearance-heading-actions {
  gap: 0.5rem;
}

.appearance-kicker {
  margin: 0 0 0.25rem;
  color: var(--hex-fg-4);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.appearance-title {
  margin: 0;
  color: var(--hex-fg-1);
  font-size: 1.4rem;
  line-height: 1.2;
}

.appearance-hue-value,
.appearance-reset {
  display: inline-flex;
  min-width: 3.25rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--theme-6);
  border-radius: 0.75rem;
  color: var(--theme-1);
  background: var(--theme-8);
  font-family: var(--font-mono);
  font-weight: 700;
}

.appearance-reset {
  min-width: 2.5rem;
  padding: 0;
  cursor: pointer;
  transition:
    color 150ms ease,
    border-color 150ms ease,
    transform 150ms ease;
}

.appearance-reset:hover {
  border-color: var(--theme-3);
  transform: translateY(-1px);
}

.appearance-reset:focus-visible,
.appearance-swatch:focus-visible,
.appearance-hue:focus-visible {
  outline: 2px solid var(--theme-1);
  outline-offset: 3px;
}

.appearance-hue {
  width: 100%;
  height: 2.25rem;
  margin: 0;
  border-radius: 0.65rem;
  appearance: none;
  cursor: pointer;
  background: linear-gradient(
    to right,
    oklch(0.7 0.1 0),
    oklch(0.7 0.1 30),
    oklch(0.7 0.1 60),
    oklch(0.7 0.1 90),
    oklch(0.7 0.1 120),
    oklch(0.7 0.1 150),
    oklch(0.7 0.1 180),
    oklch(0.7 0.1 210),
    oklch(0.7 0.1 240),
    oklch(0.7 0.1 270),
    oklch(0.7 0.1 300),
    oklch(0.7 0.1 330),
    oklch(0.7 0.1 360)
  );
}

.appearance-hue::-webkit-slider-thumb {
  width: 0.875rem;
  height: 1.75rem;
  border: 3px solid var(--hex-fg-1);
  border-radius: 0.25rem;
  appearance: none;
  background: var(--theme-1);
  box-shadow: 0 2px 8px rgb(0 0 0 / 35%);
}

.appearance-hue::-moz-range-thumb {
  width: 0.875rem;
  height: 1.75rem;
  border: 3px solid var(--hex-fg-1);
  border-radius: 0.25rem;
  background: var(--theme-1);
  box-shadow: 0 2px 8px rgb(0 0 0 / 35%);
}

.appearance-presets {
  display: grid;
  gap: 0.65rem;
}

.appearance-swatches {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 0.55rem;
}

.appearance-swatch {
  position: relative;
  display: inline-flex;
  aspect-ratio: 1;
  min-width: 0;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  border-radius: 999px;
  color: var(--hex-bg-1);
  cursor: pointer;
  box-shadow: 0 4px 12px rgb(0 0 0 / 22%);
  transition:
    border-color 150ms ease,
    transform 150ms ease;
}

.appearance-swatch:hover {
  transform: translateY(-2px) scale(1.04);
}

.appearance-swatch-active {
  border-color: var(--hex-fg-1);
}

@media (max-width: 31rem) {
  .appearance-swatches {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
</style>
