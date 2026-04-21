<script setup lang="ts">
import { appName } from '~/constants'

useHead({
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
