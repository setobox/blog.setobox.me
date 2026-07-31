import type { Serializer } from '@vueuse/core'
import type { AppearancePreferences, ThemePreset } from '~/features/appearance/preferences'
import { useLocalStorage } from '@vueuse/core'
import { computed, readonly, watch } from 'vue'
import {
  APPEARANCE_STORAGE_KEY,
  applyAccentSelection,
  clampHue,
  createDefaultAppearancePreferences,
  deserializeAppearancePreferences,
  THEME_PRESETS,
} from '~/features/appearance/preferences'

const appearanceSerializer: Serializer<AppearancePreferences> = {
  read: deserializeAppearancePreferences,
  write: value => JSON.stringify(value),
}

export function useAppearancePreferences() {
  const preferences = useState<AppearancePreferences>(
    'appearance-preferences',
    createDefaultAppearancePreferences,
  )

  if (import.meta.client) {
    const storedPreferences = useLocalStorage<AppearancePreferences>(
      APPEARANCE_STORAGE_KEY,
      createDefaultAppearancePreferences(),
      {
        serializer: appearanceSerializer,
        shallow: true,
      },
    )

    preferences.value = storedPreferences.value

    watch(
      preferences,
      (value) => {
        applyAccentSelection(document.documentElement, value.accent)

        if (JSON.stringify(storedPreferences.value) !== JSON.stringify(value))
          storedPreferences.value = value
      },
      { immediate: true },
    )

    watch(storedPreferences, (value) => {
      if (JSON.stringify(preferences.value) !== JSON.stringify(value))
        preferences.value = value
    })
  }

  const currentHue = computed(() => {
    const accent = preferences.value.accent
    if (accent.mode === 'custom')
      return accent.hue

    return THEME_PRESETS.find(({ name }) => name === accent.preset)?.hue ?? 298
  })

  const selectedPreset = computed<ThemePreset | null>(() =>
    preferences.value.accent.mode === 'preset'
      ? preferences.value.accent.preset
      : null,
  )

  function setPreset(preset: ThemePreset): void {
    preferences.value = {
      accent: {
        mode: 'preset',
        preset,
      },
    }
  }

  function setHue(hue: number): void {
    preferences.value = {
      accent: {
        mode: 'custom',
        hue: clampHue(hue),
      },
    }
  }

  function resetAccent(): void {
    preferences.value = createDefaultAppearancePreferences()
  }

  return {
    currentHue,
    preferences: readonly(preferences),
    presets: THEME_PRESETS,
    resetAccent,
    selectedPreset,
    setHue,
    setPreset,
  }
}
