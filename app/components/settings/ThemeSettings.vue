<script setup lang="ts">
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { nextTick, shallowRef, useTemplateRef } from 'vue'
import AppearanceThemePanel from './AppearanceThemePanel.vue'
import EffectsSettingsPanel from './EffectsSettingsPanel.vue'

type SettingsTab = 'appearance' | 'effects'

const settingsRoot = useTemplateRef<HTMLElement>('settingsRoot')
const settingsTrigger = useTemplateRef<HTMLButtonElement>('settingsTrigger')
const settingsPanel = useTemplateRef<HTMLElement>('settingsPanel')
const isOpen = shallowRef(false)
const activeTab = shallowRef<SettingsTab>('appearance')

const {
  currentHue,
  grainEnabled,
  grainLayer,
  presets,
  resetAccent,
  selectedPreset,
  setGrainEnabled,
  setGrainLayer,
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
      ?.querySelector<HTMLElement>('[role="tab"][tabindex="0"]')
      ?.focus()
  })
}

function toggleSettings(): void {
  if (isOpen.value)
    closeSettings()
  else
    openSettings()
}

function selectTab(tab: SettingsTab, focus = false): void {
  activeTab.value = tab

  if (focus) {
    void nextTick(() => {
      settingsPanel.value
        ?.querySelector<HTMLElement>(`#${tab}-settings-tab`)
        ?.focus()
    })
  }
}

function handleTabKeydown(event: KeyboardEvent, currentTab: SettingsTab): void {
  let nextTab: SettingsTab | undefined

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
    nextTab = currentTab === 'appearance' ? 'effects' : 'appearance'
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
    nextTab = currentTab === 'appearance' ? 'effects' : 'appearance'
  else if (event.key === 'Home')
    nextTab = 'appearance'
  else if (event.key === 'End')
    nextTab = 'effects'

  if (!nextTab)
    return

  event.preventDefault()
  selectTab(nextTab, true)
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
        <div class="theme-settings-tabs" role="tablist" aria-label="外观设置分类">
          <button
            id="appearance-settings-tab"
            class="theme-settings-tab"
            :class="{ 'theme-settings-tab-active': activeTab === 'appearance' }"
            type="button"
            role="tab"
            :aria-selected="activeTab === 'appearance'"
            aria-controls="appearance-settings-panel"
            :tabindex="activeTab === 'appearance' ? 0 : -1"
            @click="selectTab('appearance')"
            @keydown="handleTabKeydown($event, 'appearance')"
          >
            <span class="i-lucide-palette" aria-hidden="true" />
            <span>外观</span>
          </button>
          <button
            id="effects-settings-tab"
            class="theme-settings-tab"
            :class="{ 'theme-settings-tab-active': activeTab === 'effects' }"
            type="button"
            role="tab"
            :aria-selected="activeTab === 'effects'"
            aria-controls="effects-settings-panel"
            :tabindex="activeTab === 'effects' ? 0 : -1"
            @click="selectTab('effects')"
            @keydown="handleTabKeydown($event, 'effects')"
          >
            <span class="i-lucide-sparkles" aria-hidden="true" />
            <span>特效</span>
          </button>
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
        <div
          v-show="activeTab === 'appearance'"
          id="appearance-settings-panel"
          role="tabpanel"
          aria-labelledby="appearance-settings-tab"
        >
          <AppearanceThemePanel
            :hue="currentHue"
            :presets="presets"
            :selected-preset="selectedPreset"
            @reset="resetAccent"
            @select-preset="setPreset"
            @update-hue="setHue"
          />
        </div>
        <EffectsSettingsPanel
          v-show="activeTab === 'effects'"
          :enabled="grainEnabled"
          :layer="grainLayer"
          @set-enabled="setGrainEnabled"
          @set-layer="setGrainLayer"
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
.theme-settings-close:focus-visible,
.theme-settings-tab:focus-visible {
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
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--hex-fg-7);
  padding-right: 0.75rem;
}

.theme-settings-tabs {
  display: flex;
  min-width: 0;
  align-self: stretch;
}

.theme-settings-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  border: 0;
  padding: 1rem 1.25rem;
  color: var(--hex-fg-4);
  background: transparent;
  font-weight: 700;
  cursor: pointer;
  transition: color 150ms ease;
}

.theme-settings-tab::after {
  position: absolute;
  right: 1.25rem;
  bottom: -1px;
  left: 1.25rem;
  height: 2px;
  border-radius: 999px 999px 0 0;
  background: transparent;
  content: '';
}

.theme-settings-tab:hover {
  color: var(--hex-fg-2);
}

.theme-settings-tab-active {
  color: var(--theme-1);
}

.theme-settings-tab-active::after {
  background: var(--theme-1);
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
