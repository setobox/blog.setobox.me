<script setup lang="ts">
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { nextTick, shallowRef, useTemplateRef } from 'vue'
import AppearanceThemePanel from './AppearanceThemePanel.vue'
import EffectsSettingsPanel from './EffectsSettingsPanel.vue'

type SettingsTab = 'appearance' | 'effects'

const settingsTabs: readonly {
  icon: `i-lucide-${string}`
  label: string
  value: SettingsTab
}[] = [
  { icon: 'i-lucide-palette', label: '外观', value: 'appearance' },
  { icon: 'i-lucide-sparkles', label: '特效', value: 'effects' },
]

const settingsRoot = useTemplateRef<HTMLElement>('settingsRoot')
const settingsTrigger = useTemplateRef<HTMLButtonElement>('settingsTrigger')
const settingsPanel = useTemplateRef<HTMLElement>('settingsPanel')
const isOpen = shallowRef(false)
const activeTab = shallowRef<SettingsTab>('appearance')

const {
  accentIsDefault,
  articleLayout,
  cardBorders,
  cardThemeTint,
  currentHue,
  resetAccent,
  resetArticleLayout,
  resetCardStyle,
  setArticleLayout,
  setCardBorders,
  setCardThemeTint,
  setHue,
  setVisualFilterEnabled,
  visualFilterEnabled,
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
  const currentIndex = settingsTabs.findIndex(tab => tab.value === currentTab)
  let nextIndex: number | undefined

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
    nextIndex = (currentIndex + 1) % settingsTabs.length
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
    nextIndex = (currentIndex - 1 + settingsTabs.length) % settingsTabs.length
  else if (event.key === 'Home')
    nextIndex = 0
  else if (event.key === 'End')
    nextIndex = settingsTabs.length - 1

  const nextTab = nextIndex === undefined ? undefined : settingsTabs[nextIndex]?.value
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
      class="theme-settings-trigger text-xl text-fg-3 p-0 border-0 bg-transparent inline-flex h-11 w-10 cursor-pointer transition-[color,background-color] duration-150 items-center justify-center hover:text-current-1"
      :class="{ '!rounded-2.5 !bg-[var(--theme-7)] !text-current-1': isOpen }"
      type="button"
      aria-label="外观设置"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      aria-controls="display-setting"
      @click="toggleSettings"
    >
      <span class="i-lucide-palette" aria-hidden="true" />
    </button>

    <section
      id="display-setting"
      ref="settingsPanel"
      class="text-fg-2 border border-[color-mix(in_srgb,var(--hex-fg-1)_10%,transparent)] rounded-xl bg-[color-mix(in_srgb,var(--hex-bg-1)_82%,transparent)] opacity-0 max-h-[min(80vh,28rem)] w-[min(17rem,calc(100vw-1.5rem))] pointer-events-none shadow-[0_0.4rem_1.2rem_rgba(0,0,0,0.26)] origin-top-right translate-y--1 scale-98 transition-[opacity,transform] duration-160 right-0 top-[calc(100%+0.4rem)] absolute z-200 overflow-x-hidden overflow-y-auto backdrop-blur-3 motion-reduce:transition-none"
      :class="{ '!scale-100 !translate-y-0 !opacity-100 !pointer-events-auto': isOpen }"
      role="dialog"
      aria-label="外观设置"
      :aria-hidden="!isOpen"
      :inert="!isOpen"
    >
      <div class="mx-1.5 border-b border-fg-7 flex" role="tablist" aria-label="外观设置分类">
        <button
          v-for="tab in settingsTabs"
          :id="`${tab.value}-settings-tab`"
          :key="tab.value"
          class="theme-settings-tab text-xs text-fg-4 leading-4 font-semibold py-1.5 border-0 bg-transparent inline-flex flex-1 gap-1 min-w-0 cursor-pointer transition-colors duration-150 items-center justify-center relative hover:text-fg-2"
          :class="{ '!text-current-1': activeTab === tab.value }"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.value"
          :aria-controls="`${tab.value}-settings-panel`"
          :tabindex="activeTab === tab.value ? 0 : -1"
          @click="selectTab(tab.value)"
          @keydown="handleTabKeydown($event, tab.value)"
        >
          <span :class="tab.icon" aria-hidden="true" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <div class="px-2 pb-2 pt-1.5">
        <AppearanceThemePanel
          v-show="activeTab === 'appearance'"
          :accent-is-default="accentIsDefault"
          :article-layout="articleLayout"
          :card-borders="cardBorders"
          :card-theme-tint="cardThemeTint"
          :hue="currentHue"
          @reset-accent="resetAccent"
          @reset-article-layout="resetArticleLayout"
          @reset-card-style="resetCardStyle"
          @set-article-layout="setArticleLayout"
          @set-card-borders="setCardBorders"
          @set-card-theme-tint="setCardThemeTint"
          @update-hue="setHue"
        />
        <EffectsSettingsPanel
          v-show="activeTab === 'effects'"
          :enabled="visualFilterEnabled"
          @set-enabled="setVisualFilterEnabled"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.theme-settings-trigger:focus-visible,
.theme-settings-tab:focus-visible {
  outline: 2px solid var(--theme-1);
  outline-offset: 2px;
}
</style>
