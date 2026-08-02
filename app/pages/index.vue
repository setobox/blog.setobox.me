<script setup lang="ts">
definePageMeta({
  layout: 'home',
})
</script>

<template>
  <div id="page" flex="~ col justify-start items-center w-full min-h-100dvh">
    <main id="main-content" container>
      <Hero />
    </main>

    <div id="magic-box" h-100lvh w-full top-0 fixed>
      <!--  -->
      <div id="renderer">
        <!--  -->
      </div>
      <div id="css-renderer">
        <!--  -->
      </div>
      <div id="label-renderer">
        <!--  -->
      </div>
    </div>
  </div>
</template>
