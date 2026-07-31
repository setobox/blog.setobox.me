<script setup lang="ts">
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { nextTick, shallowRef, useTemplateRef } from 'vue'
import AppearanceThemePanel from './AppearanceThemePanel.vue'

const settingsRoot = useTemplateRef<HTMLElement>('settingsRoot')
const settingsTrigger = useTemplateRef<HTMLButtonElement>('settingsTrigger')
const settingsPanel = useTemplateRef<HTMLElement>('settingsPanel')
const isOpen = shallowRef(false)

const {
  currentHue,
  presets,
  resetAccent,
  selectedPreset,
  setHue,
  setPreset,
} = useAppearancePreferences()

function closeSettings(restoreFocus = false): void {
  if (!isOpen.value)
    return

  isOpen.value = false
  if (restoreFocus)
    void nextTick(() => settingsTrigger.value?.focus())
}

function openSettings(): void {
  isOpen.value = true
  void nextTick(() => {
    settingsPanel.value
      ?.querySelector<HTMLElement>('input, button')
      ?.focus()
  })
}

function toggleSettings(): void {
  if (isOpen.value)
    closeSettings()
  else
    openSettings()
}

onClickOutside(settingsRoot, () => closeSettings())
onKeyStroke('Escape', (event) => {
  if (!isOpen.value)
    return

  event.preventDefault()
  closeSettings(true)
})
</script>

<template>
  <div ref="settingsRoot" class="theme-settings">
    <button
      ref="settingsTrigger"
      class="theme-settings-trigger"
      :class="{ 'theme-settings-trigger-active': isOpen }"
      type="button"
      aria-label="外观设置"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      aria-controls="theme-settings-panel"
      @click="toggleSettings"
    >
      <span class="i-lucide-palette text-xl" aria-hidden="true" />
      <span class="sr-only md:not-sr-only">外观</span>
    </button>

    <section
      v-if="isOpen"
      id="theme-settings-panel"
      ref="settingsPanel"
      class="theme-settings-popover"
      role="dialog"
      aria-label="外观设置"
    >
      <header class="theme-settings-header">
        <div class="theme-settings-heading">
          <span class="i-lucide-palette" aria-hidden="true" />
          <span>外观</span>
        </div>
        <button
          class="theme-settings-close"
          type="button"
          aria-label="关闭外观设置"
          @click="closeSettings(true)"
        >
          <span class="i-lucide-x" aria-hidden="true" />
        </button>
      </header>

      <div class="theme-settings-content">
        <AppearanceThemePanel
          :hue="currentHue"
          :presets="presets"
          :selected-preset="selectedPreset"
          @reset="resetAccent"
          @select-preset="setPreset"
          @update-hue="setHue"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.theme-settings {
  position: relative;
}

.theme-settings-trigger {
  display: inline-flex;
  width: 2.5rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 0;
  color: var(--hex-fg-3);
  background: transparent;
  font-weight: 700;
  cursor: pointer;
  transition: color 150ms ease;
}

.theme-settings-trigger:hover,
.theme-settings-trigger-active {
  color: var(--theme-1);
}

.theme-settings-trigger:focus-visible,
.theme-settings-close:focus-visible {
  outline: 2px solid var(--theme-1);
  outline-offset: 2px;
}

.theme-settings-popover {
  position: absolute;
  z-index: 200;
  top: calc(100% + 0.65rem);
  right: 0;
  width: min(30rem, calc(100vw - 2rem));
  overflow: hidden;
  border: 1px solid var(--hex-fg-7);
  border-radius: 1.5rem;
  color: var(--hex-fg-1);
  background:
    linear-gradient(145deg, rgb(255 255 255 / 3%), transparent 45%), color-mix(in oklch, var(--hex-bg-1) 93%, black);
  box-shadow: 0 24px 70px rgb(0 0 0 / 46%);
}

.theme-settings-header {
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--hex-fg-7);
  padding: 0.75rem 1rem 0.75rem 1.25rem;
}

.theme-settings-heading {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--theme-1);
  font-weight: 700;
}

.theme-settings-close {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  color: var(--hex-fg-3);
  background: transparent;
  cursor: pointer;
  transition:
    color 150ms ease,
    background-color 150ms ease;
}

.theme-settings-close:hover {
  color: var(--hex-fg-1);
  background: var(--hex-bg-4);
}

.theme-settings-content {
  padding: 1.25rem;
}

@media (min-width: 768px) {
  .theme-settings-trigger {
    width: auto;
    padding-inline: 0.25rem;
  }
}
</style>
