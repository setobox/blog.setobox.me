<script setup lang="ts">
const event = useRequestEvent()

if (event) {
  setResponseStatus(event, 404, 'Page Not Found')
}
</script>

<template>
  <section class="container-content py-block min-h-[70vh]">
    <PageIntro title="404" description="这个页面不存在，或者已经被移动。" />

    <div data-page-item class="text-ink-200 mt-block p-group surface flex gap-4 items-center">
      <span class="i-lucide-circle-alert text-2xl text-layer-motion shrink-0" aria-hidden="true" />
      <p class="leading-relaxed m-0">
        你可以返回首页，或从顶部导航继续浏览。
      </p>
    </div>

    <NuxtLink
      data-page-item
      class="btn-ghost mt-group"
      to="/"
    >
      <span class="i-lucide-arrow-left" aria-hidden="true" />
      返回首页
    </NuxtLink>
  </section>
</template>
