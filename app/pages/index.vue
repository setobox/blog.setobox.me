<script setup lang="ts">
import { HOME_ANIMATION_CONTEXT_KEY } from '~/features/home/animation'

useSeoMeta({ title: '首页' })

const root = useTemplateRef<HTMLElement>('root')
const homeAnimation = inject(HOME_ANIMATION_CONTEXT_KEY)

if (!homeAnimation)
  throw new Error('Home animation context was not provided')

let timeline: HeroTimelineHandle | null = null
let stopReadyWatcher: (() => void) | null = null

onMounted(() => {
  stopReadyWatcher = watch(homeAnimation.phase, async (phase) => {
    if (phase === 'inactive' || phase === 'preloading') {
      timeline?.dispose()
      timeline = null
      return
    }

    if (phase !== 'hero' || !root.value || timeline)
      return

    const nextTimeline = await useHeroTimeline(root.value, {
      onTextComplete: homeAnimation.startHeader,
    })

    if (homeAnimation.phase.value !== 'hero') {
      nextTimeline.dispose()
      return
    }

    timeline = nextTimeline
  }, { immediate: true })
})

onBeforeUnmount(() => {
  stopReadyWatcher?.()
  timeline?.dispose()
})
</script>

<template>
  <main ref="root">
    <section class="hero-lead container-content">
      <h1
        class="text-display-xl text-ink-50 font-display"
        data-entry="title"
      >
        Setobox
      </h1>

      <p class="hero-lead__sub text-lead mt-group" data-entry="subtitle">
        往下滚，看看构成这个站点的工程、框架、样式、动效与渲染方式。
      </p>

      <NuxtLink to="/blog" class="btn-ghost mt-section" data-entry="cta">
        读博客
      </NuxtLink>
    </section>

    <HeroStackSection />
  </main>
</template>

<style scoped>
.hero-lead {
  position: relative;
  display: flex;
  min-height: 100svh;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding-top: 4rem;
  padding-bottom: 5rem;
}

.hero-lead__sub {
  max-inline-size: 46ch;
}

@media (prefers-reduced-motion: reduce) {
  .hero-lead__hint {
    translate: none;
  }
}
</style>
