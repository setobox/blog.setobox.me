<script setup lang="ts">
import ActionButtonDock from '~/components/ActionButtonDock.vue'

useProvideActionButtons()
</script>

<template>
  <div min-h-100lvh w-full>
    <slot />
    <Footer />

    <ActionButtonDock />
  </div>
</template>
