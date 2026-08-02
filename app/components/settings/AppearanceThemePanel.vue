<script setup lang="ts">
import type { ArticleLayout } from '~/features/appearance/preferences'
import { computed } from 'vue'

interface Props {
  accentIsDefault: boolean
  articleLayout: ArticleLayout
  cardBorders: boolean
  cardThemeTint: boolean
  hue: number
}

interface Emits {
  resetAccent: []
  resetArticleLayout: []
  resetCardStyle: []
  setArticleLayout: [layout: ArticleLayout]
  setCardBorders: [enabled: boolean]
  setCardThemeTint: [enabled: boolean]
  updateHue: [hue: number]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isDefaultLayout = computed(() => props.articleLayout === 'list')
const isDefaultCardStyle = computed(() => props.cardBorders && !props.cardThemeTint)

const layoutOptions: readonly {
  icon: `i-lucide-${string}`
  label: string
  value: ArticleLayout
}[] = [
  { icon: 'i-lucide-list', label: '列表', value: 'list' },
  { icon: 'i-lucide-layout-grid', label: '网格', value: 'grid' },
]

function handleHueInput(event: Event): void {
  if (!(event.currentTarget instanceof HTMLInputElement))
    return

  emit('updateHue', Number(event.currentTarget.value))
}
</script>

<template>
  <section
    id="appearance-settings-panel"
    class="gap-1.75 grid"
    role="tabpanel"
    aria-labelledby="appearance-settings-tab"
  >
    <div class="gap-1.25 grid">
      <div class="setting-section-title">
        <span class="rounded-full bg-[var(--theme-1)] h-3.5 w-0.75" aria-hidden="true" />
        <h2 class="text-xs leading-5 font-bold m-0">
          主题色相
        </h2>
        <button
          class="setting-reset"
          type="button"
          :disabled="accentIsDefault"
          aria-label="重置主题色相"
          title="重置主题色相"
          @click="emit('resetAccent')"
        >
          <span class="i-lucide-rotate-ccw" aria-hidden="true" />
        </button>
        <output class="text-xs text-current-1 font-bold font-mono ml-auto rounded-1.5 bg-[var(--theme-8)] inline-flex h-5 min-w-9 items-center justify-center" for="appearance-hue">{{ hue }}</output>
      </div>

      <label class="sr-only" for="appearance-hue">主题色相</label>
      <div class="appearance-hue-track px-1 rounded-1.25 flex h-5 items-center">
        <input
          id="appearance-hue"
          class="appearance-hue m-0 appearance-none bg-transparent h-5 w-full cursor-pointer"
          type="range"
          min="0"
          max="360"
          step="1"
          :value="hue"
          @input="handleHueInput"
        >
      </div>
    </div>

    <div class="gap-1.25 grid">
      <div class="setting-section-title">
        <span class="rounded-full bg-[var(--theme-1)] h-3.5 w-0.75" aria-hidden="true" />
        <h2 class="text-xs leading-5 font-bold m-0">
          文章布局
        </h2>
        <button
          class="setting-reset"
          type="button"
          :disabled="isDefaultLayout"
          aria-label="重置文章布局"
          title="重置文章布局"
          @click="emit('resetArticleLayout')"
        >
          <span class="i-lucide-rotate-ccw" aria-hidden="true" />
        </button>
      </div>

      <div class="flex gap-1.5" role="radiogroup" aria-label="文章布局">
        <button
          v-for="option in layoutOptions"
          :key="option.value"
          class="setting-segment"
          :class="{ 'setting-segment--active': articleLayout === option.value }"
          type="button"
          role="radio"
          :aria-checked="articleLayout === option.value"
          @click="emit('setArticleLayout', option.value)"
        >
          <span :class="option.icon" aria-hidden="true" />
          <span>{{ option.label }}</span>
        </button>
      </div>
    </div>

    <div class="gap-1.25 grid">
      <div class="setting-section-title">
        <span class="rounded-full bg-[var(--theme-1)] h-3.5 w-0.75" aria-hidden="true" />
        <h2 class="text-xs leading-5 font-bold m-0">
          卡片样式
        </h2>
        <button
          class="setting-reset"
          type="button"
          :disabled="isDefaultCardStyle"
          aria-label="重置卡片样式"
          title="重置卡片样式"
          @click="emit('resetCardStyle')"
        >
          <span class="i-lucide-rotate-ccw" aria-hidden="true" />
        </button>
      </div>

      <div class="gap-0.75 grid">
        <button
          class="setting-row"
          type="button"
          role="switch"
          :aria-checked="cardBorders"
          @click="emit('setCardBorders', !cardBorders)"
        >
          <span class="i-lucide-square-dashed" aria-hidden="true" />
          <span class="text-xs flex-1">卡片边框和阴影</span>
          <span class="setting-switch" :class="{ 'setting-switch--active': cardBorders }" aria-hidden="true">
            <span class="setting-switch-thumb" />
          </span>
        </button>
        <button
          class="setting-row"
          type="button"
          role="switch"
          :aria-checked="cardThemeTint"
          @click="emit('setCardThemeTint', !cardThemeTint)"
        >
          <span class="i-lucide-palette" aria-hidden="true" />
          <span class="text-xs flex-1">卡片跟随主题色</span>
          <span class="setting-switch" :class="{ 'setting-switch--active': cardThemeTint }" aria-hidden="true">
            <span class="setting-switch-thumb" />
          </span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.setting-section-title {
  display: flex;
  min-height: 1.25rem;
  align-items: center;
  gap: 0.3125rem;
  color: var(--hex-fg-1);
}

.setting-reset:focus-visible,
.setting-segment:focus-visible,
.setting-row:focus-visible,
.appearance-hue:focus-visible {
  outline: 2px solid var(--theme-1);
  outline-offset: 2px;
}

.setting-reset {
  display: inline-flex;
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 0.375rem;
  background: var(--theme-8);
  color: var(--hex-fg-3);
  font-size: 0.75rem;
  line-height: 1rem;
  transition:
    color 150ms,
    opacity 150ms,
    transform 150ms;
}

.setting-reset:hover {
  color: var(--hex-current-1);
  transform: rotate(-20deg);
}

.setting-reset:disabled {
  pointer-events: none;
  opacity: 0;
}

.setting-segment {
  display: inline-flex;
  min-height: 1.75rem;
  flex: 1 1 0%;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border: 0;
  border-radius: 0.375rem;
  background: var(--theme-8);
  color: var(--hex-fg-3);
  font-size: 0.75rem;
  line-height: 1rem;
  opacity: 0.62;
  transition:
    color 150ms,
    background-color 150ms,
    opacity 150ms,
    transform 150ms;
}

.setting-segment:hover,
.setting-segment--active {
  color: var(--hex-fg-1);
  opacity: 1;
}

.setting-segment--active {
  background: var(--theme-7);
}

.setting-row {
  display: flex;
  width: 100%;
  min-height: 2rem;
  cursor: pointer;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3125rem 0.5rem;
  border: 0;
  border-radius: 0.375rem;
  background: var(--theme-8);
  color: var(--hex-fg-3);
  text-align: left;
  transition:
    color 150ms,
    background-color 150ms,
    transform 150ms;
}

.setting-row:hover {
  background: var(--theme-7);
  color: var(--hex-fg-1);
}

.setting-switch {
  position: relative;
  width: 2.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  border-radius: 9999px;
  background: var(--hex-fg-6);
  transition: background-color 150ms;
}

.setting-switch-thumb {
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 0.875rem;
  height: 0.875rem;
  border-radius: 9999px;
  background: var(--hex-fg-1);
  box-shadow: 0 1px 4px rgb(0 0 0 / 35%);
  transition: transform 150ms;
}

.setting-switch--active {
  background: var(--theme-4);
}

.setting-switch--active .setting-switch-thumb {
  transform: translateX(1.0625rem);
}

.appearance-hue-track {
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
  width: 0.5rem;
  height: 0.9rem;
  border: 2px solid var(--hex-fg-1);
  border-radius: 0.2rem;
  appearance: none;
  background: var(--theme-1);
  box-shadow: 0 1px 4px rgb(0 0 0 / 35%);
}

.appearance-hue::-moz-range-thumb {
  width: 0.5rem;
  height: 0.9rem;
  border: 2px solid var(--hex-fg-1);
  border-radius: 0.2rem;
  background: var(--theme-1);
  box-shadow: 0 1px 4px rgb(0 0 0 / 35%);
}
</style>
