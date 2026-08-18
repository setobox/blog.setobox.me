<script setup lang="ts">
defineProps<{
  cover?: string
  path: string
  title: string
}>()
</script>

<template>
  <NuxtLink
    v-if="cover"
    class="blog-post-media"
    :to="path"
    :aria-label="`阅读《${title}》`"
  >
    <NuxtImg
      class="blog-post-media__image"
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
    <span class="blog-post-media__overlay" aria-hidden="true" />
    <span class="blog-post-media__action" aria-hidden="true">
      <span class="i-lucide-arrow-up-right" />
    </span>
  </NuxtLink>
</template>

<style>
.blog-post-media {
  position: relative;
  order: -1;
  min-height: 0;
  overflow: hidden;
  background: #0f1216;
  aspect-ratio: 16 / 9;
}

.blog-post-media:focus-visible {
  outline: 2px solid var(--c-accent);
  outline-offset: -4px;
}

.blog-post-media__image,
.blog-post-media__overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.blog-post-media__image {
  object-fit: cover;
  transition: transform 500ms;
}

.blog-post-media__overlay {
  background: rgb(0 0 0 / 55%);
  opacity: 0;
  transition: opacity 300ms;
}

.blog-post-media__action {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  width: 3rem;
  height: 3rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9999px;
  background: rgb(0 0 0 / 30%);
  color: white;
  font-size: 1.5rem;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.9);
  transition:
    opacity 300ms,
    transform 300ms;
  backdrop-filter: blur(4px);
}

.blog-post-media:hover .blog-post-media__image,
.blog-post-media:focus-visible .blog-post-media__image {
  transform: scale(1.05);
}

.blog-post-media:hover .blog-post-media__overlay,
.blog-post-media:focus-visible .blog-post-media__overlay,
.blog-post-media:hover .blog-post-media__action,
.blog-post-media:focus-visible .blog-post-media__action {
  opacity: 1;
}

.blog-post-media:hover .blog-post-media__action,
.blog-post-media:focus-visible .blog-post-media__action {
  transform: translate(-50%, -50%) scale(1);
}

@media (min-width: 48rem) {
  html[data-article-layout='list'] .blog-post-media {
    order: 0;
    aspect-ratio: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blog-post-media__image,
  .blog-post-media__overlay,
  .blog-post-media__action {
    transition: none;
  }

  .blog-post-media:hover .blog-post-media__image,
  .blog-post-media:focus-visible .blog-post-media__image {
    transform: none;
  }
}
</style>
