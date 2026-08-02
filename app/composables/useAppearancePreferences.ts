import type {
  AppearancePreferences,
  ArticleLayout,
} from '~/features/appearance/preferences'
import { useEventListener } from '@vueuse/core'
import { computed, onMounted, readonly, shallowRef, watch } from 'vue'
import {
  APPEARANCE_STORAGE_KEY,
  applyAppearancePreferences,
  clampHue,
  createDefaultAppearancePreferences,
  deserializeAppearancePreferences,
  isArticleLayout,
  isThemePreset,
  THEME_PRESETS,
} from '~/features/appearance/preferences'

export function useAppearancePreferences() {
  const preferences = shallowRef<AppearancePreferences>(
    createDefaultAppearancePreferences(),
  )

  if (import.meta.client) {
    const isClientReady = shallowRef(false)

    onMounted(() => {
      const root = document.documentElement
      const persistedPreferences = deserializeAppearancePreferences(
        window.localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? '',
      )
      const accentMode = root.dataset.accentMode
      const accentPreset = root.dataset.accentPreset
      const articleLayout = root.dataset.articleLayout
      let accent = persistedPreferences.accent

      if (accentMode === 'preset' && isThemePreset(accentPreset)) {
        accent = { mode: 'preset', preset: accentPreset }
      }
      else if (accentMode === 'custom') {
        accent = {
          mode: 'custom',
          hue: clampHue(root.style.getPropertyValue('--theme-hue')),
        }
      }

      preferences.value = {
        ...persistedPreferences,
        accent,
        articleLayout: isArticleLayout(articleLayout)
          ? articleLayout
          : persistedPreferences.articleLayout,
        cardBorders: root.dataset.cardBorders === 'true',
        cardThemeTint: root.dataset.cardThemeTint === 'true',
        visualFilterEnabled: root.dataset.visualFilterEnabled === 'true',
      }
      isClientReady.value = true
    })

    watch(
      preferences,
      (value) => {
        if (!isClientReady.value)
          return

        applyAppearancePreferences(document.documentElement, value)
        window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(value))
      },
    )

    useEventListener(window, 'storage', (event) => {
      if (!isClientReady.value || event.key !== APPEARANCE_STORAGE_KEY)
        return

      preferences.value = deserializeAppearancePreferences(event.newValue ?? '')
    })
  }

  const currentHue = computed(() => {
    const accent = preferences.value.accent
    if (accent.mode === 'custom')
      return accent.hue

    return THEME_PRESETS.find(({ name }) => name === accent.preset)?.hue ?? 298
  })

  const defaultAccent = createDefaultAppearancePreferences().accent
  const accentIsDefault = computed(() => {
    const accent = preferences.value.accent
    return accent.mode === 'preset'
      && defaultAccent.mode === 'preset'
      && accent.preset === defaultAccent.preset
  })
  const visualFilterEnabled = computed(() => preferences.value.visualFilterEnabled)
  const articleLayout = computed(() => preferences.value.articleLayout)
  const cardBorders = computed(() => preferences.value.cardBorders)
  const cardThemeTint = computed(() => preferences.value.cardThemeTint)

  function setHue(hue: number): void {
    preferences.value = {
      ...preferences.value,
      accent: {
        mode: 'custom',
        hue: clampHue(hue),
      },
    }
  }

  function resetAccent(): void {
    preferences.value = {
      ...preferences.value,
      accent: createDefaultAppearancePreferences().accent,
    }
  }

  function setArticleLayout(articleLayout: ArticleLayout): void {
    preferences.value = {
      ...preferences.value,
      articleLayout,
    }
  }

  function resetArticleLayout(): void {
    setArticleLayout(createDefaultAppearancePreferences().articleLayout)
  }

  function setCardBorders(cardBorders: boolean): void {
    preferences.value = {
      ...preferences.value,
      cardBorders,
    }
  }

  function setCardThemeTint(cardThemeTint: boolean): void {
    preferences.value = {
      ...preferences.value,
      cardThemeTint,
    }
  }

  function resetCardStyle(): void {
    const defaults = createDefaultAppearancePreferences()
    preferences.value = {
      ...preferences.value,
      cardBorders: defaults.cardBorders,
      cardThemeTint: defaults.cardThemeTint,
    }
  }

  function setVisualFilterEnabled(enabled: boolean): void {
    preferences.value = {
      ...preferences.value,
      visualFilterEnabled: enabled,
    }
  }

  return {
    accentIsDefault,
    articleLayout,
    cardBorders,
    cardThemeTint,
    currentHue,
    preferences: readonly(preferences),
    resetAccent,
    resetArticleLayout,
    resetCardStyle,
    setArticleLayout,
    setCardBorders,
    setCardThemeTint,
    setHue,
    setVisualFilterEnabled,
    visualFilterEnabled,
  }
}
