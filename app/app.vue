<script setup lang="ts">
import AppGrainOverlay from '~/components/AppGrainOverlay.vue'
import HomeLoadingOverlay from '~/components/HomeLoadingOverlay.vue'
import { appName } from '~/constants'
import { APPEARANCE_BOOTSTRAP_SCRIPT } from '~/features/appearance/preferences'

const { targetIsHome } = useHomeLoading()

useHead({
  noscript: [{
    innerHTML: '<style>[data-home-loading-overlay]{display:none!important}</style>',
  }],
  script: [{
    id: 'appearance-preferences',
    innerHTML: APPEARANCE_BOOTSTRAP_SCRIPT,
    tagPosition: 'head',
  }],
  title: appName,
})
</script>

<template>
  <!-- <NuxtRouteAnnouncer /> -->
  <NuxtLoadingIndicator
    v-if="!targetIsHome"
    color="var(--theme-1)"
    :height="3"
    :throttle="200"
  />
  <Navbar />
  <div class="relative z-10">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
  <HomeLoadingOverlay />
  <AppGrainOverlay />
</template>
