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
  <div ref="settingsRoot" class="relative">
    <button
      ref="settingsTrigger"
      class="text-fg-3 font-bold border-0 bg-transparent inline-flex gap-2 h-11 w-10 cursor-pointer transition-colors duration-150 items-center justify-center hover:text-current-1 md:px-1 focus-visible:outline-2 focus-visible:outline-current-1 focus-visible:outline-offset-2 md:w-auto"
      :class="{ 'text-current-1': isOpen }"
      type="button"
      aria-label="外观设置"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      aria-controls="theme-settings-panel"
      @click="toggleSettings"
    >
      <span class="i-lucide-palette text-xl" aria-hidden="true" />
    </button>

    <section
      v-if="isOpen"
      id="theme-settings-panel"
      ref="settingsPanel"
      class="text-fg-1 border border-fg-7 rounded-3xl bg-bg-1 w-[min(26rem,calc(100vw-2rem))] shadow-[0_24px_70px_rgba(0,0,0,0.46)] [background:linear-gradient(145deg,rgb(255_255_255_/_3%),transparent_45%),color-mix(in_oklch,var(--hex-bg-1)_93%,black)] right-0 top-[calc(100%+0.65rem)] absolute z-200 overflow-hidden"
      role="dialog"
      aria-label="外观设置"
    >
      <header class="pr-3 border-b border-fg-7 flex items-center justify-between">
        <div class="flex min-w-0 self-stretch" role="tablist" aria-label="外观设置分类">
          <button
            id="appearance-settings-tab"
            class="text-fg-4 font-bold px-5 py-4 border-0 bg-transparent inline-flex gap-[0.55rem] cursor-pointer transition-colors duration-150 items-center relative hover:text-fg-2 focus-visible:outline-2 focus-visible:outline-current-1 focus-visible:outline-offset-2"
            :class="{ 'text-current-1': activeTab === 'appearance' }"
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
            <span
              v-if="activeTab === 'appearance'"
              class="rounded-t-full bg-current-1 h-0.5 left-5 right-5 absolute -bottom-px"
              aria-hidden="true"
            />
          </button>
          <button
            id="effects-settings-tab"
            class="text-fg-4 font-bold px-5 py-4 border-0 bg-transparent inline-flex gap-[0.55rem] cursor-pointer transition-colors duration-150 items-center relative hover:text-fg-2 focus-visible:outline-2 focus-visible:outline-current-1 focus-visible:outline-offset-2"
            :class="{ 'text-current-1': activeTab === 'effects' }"
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
            <span
              v-if="activeTab === 'effects'"
              class="rounded-t-full bg-current-1 h-0.5 left-5 right-5 absolute -bottom-px"
              aria-hidden="true"
            />
          </button>
        </div>
        <button
          class="text-fg-3 border-0 rounded-full bg-transparent inline-flex h-9 w-9 cursor-pointer transition-[color,background-color] duration-150 items-center justify-center hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-current-1 focus-visible:outline-offset-2 hover:bg-bg-4"
          type="button"
          aria-label="关闭外观设置"
          @click="closeSettings(true)"
        >
          <span class="i-lucide-x" aria-hidden="true" />
        </button>
      </header>

      <div class="p-5">
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
