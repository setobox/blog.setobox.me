<script setup lang="ts">
import { appName } from '~/constants'

useHead({
  title: appName,
})
</script>

<template>
  <VitePwaManifest />
  <!-- <NuxtRouteAnnouncer /> -->
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
html,
body,
#__nuxt {
  min-height: 100dvh;
  margin: 0;
  padding: 0;
}

html.dark {
  color-scheme: dark;
}
</style>
