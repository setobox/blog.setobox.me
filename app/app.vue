<script setup lang="ts">
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
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
