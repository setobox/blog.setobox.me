<script setup lang="ts">
import AppGrainOverlay from '~/components/AppGrainOverlay.vue'
import { appName } from '~/constants'
import { APPEARANCE_BOOTSTRAP_SCRIPT } from '~/features/appearance/preferences'

useHead({
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
  <Navbar />
  <div class="app-page-layer">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
  <AppGrainOverlay />
</template>

<style scoped>
.app-page-layer {
  position: relative;
  z-index: 10;
}
</style>
