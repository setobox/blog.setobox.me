<script setup lang="ts">
interface Props {
  cover?: string
  path: string
  title: string
}

defineProps<Props>()
</script>

<template>
  <NuxtLink
    v-if="cover"
    class="blog-card-media group bg-bg-3 min-h-0 aspect-video order-[-1] relative overflow-hidden focus-visible:outline-2 focus-visible:outline-current-1 focus-visible:outline-offset--4"
    :to="path"
    :aria-label="`阅读《${title}》`"
  >
    <NuxtImg
      class="h-full w-full transition-transform duration-500 inset-0 absolute object-cover group-focus-visible:scale-105 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-focus-visible:scale-100 motion-reduce:group-hover:scale-100"
      :src="cover"
      :alt="`${title} 封面`"
      width="896"
      height="504"
      sizes="100vw md:50vw xl:33vw"
      fit="cover"
      format="webp"
      quality="80"
      loading="lazy"
      decoding="async"
    />
    <span
      class="bg-black/55 bg-#0008 opacity-0 transition-opacity duration-300 inset-0 absolute group-focus-visible:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
      aria-hidden="true"
    />
    <span
      class="border-white/65 bg-black/30 text-white text-2xl border rounded-full opacity-0 flex-center h-12 w-12 translate-x--1/2 translate-y--1/2 scale-90 transition-[opacity,transform] duration-300 left-1/2 top-1/2 absolute backdrop-blur-1 group-focus-visible:opacity-100 group-hover:opacity-100 group-focus-visible:scale-100 group-hover:scale-100 motion-reduce:transition-none"
      aria-hidden="true"
    >
      <span class="i-lucide-arrow-up-right" />
    </span>
  </NuxtLink>
</template>

<style scoped>
@media (min-width: 48rem) {
  :global(html[data-article-layout='list'] .blog-card-media) {
    order: 0;
    aspect-ratio: auto;
  }
}
</style>
