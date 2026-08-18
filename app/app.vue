<script setup lang="ts">
import ActionButtonDock from '~/components/ActionButtonDock.vue'
import UiAppFooter from '~/components/ui/AppFooter.vue'
import UiAppHeader from '~/components/ui/AppHeader.vue'
import { useProvideActionButtons } from '~/composables/useActionButtons'
import { appName } from '~/constants'
import { ARTICLE_LAYOUT_BOOTSTRAP_SCRIPT } from '~/features/article-layout/preferences'
import { createHomeAnimationContext, HOME_ANIMATION_CONTEXT_KEY } from '~/features/home/animation'

const route = useRoute()
const router = useRouter()
const nuxtApp = useNuxtApp()
const landedOnHome = route.path === '/'
const onHome = computed(() => route.path === '/')
const homeAnimation = createHomeAnimationContext(landedOnHome)
const homePageReady = shallowRef(landedOnHome)
const homePreloaderRun = shallowRef(landedOnHome ? 1 : 0)
const showHomePreloader = shallowRef(landedOnHome)

let removeAfterEachHook: (() => void) | null = null
let removeBeforeEachHook: (() => void) | null = null
let removePageFinishHook: (() => void) | null = null

provide(HOME_ANIMATION_CONTEXT_KEY, homeAnimation)

function handleHomePreloaderComplete() {
  showHomePreloader.value = false
  if (router.currentRoute.value.path === '/')
    homeAnimation.startHero()
}

onMounted(() => {
  removePageFinishHook = nuxtApp.hook('page:finish', () => {
    if (router.currentRoute.value.path === '/')
      homePageReady.value = true
  })

  removeBeforeEachHook = router.beforeEach((to) => {
    if (to.path === '/') {
      homeAnimation.startPreloading()
      homePageReady.value = false
      homePreloaderRun.value += 1
      showHomePreloader.value = true
      return
    }

    if (to.path !== '/') {
      homeAnimation.deactivate()
      showHomePreloader.value = false
    }
  })

  removeAfterEachHook = router.afterEach((to, _from, failure) => {
    if (failure) {
      showHomePreloader.value = false
      homePageReady.value = false
      if (router.currentRoute.value.path === '/')
        homeAnimation.startHero()
      else
        homeAnimation.deactivate()
    }
  })
})

onBeforeUnmount(() => {
  removeAfterEachHook?.()
  removeBeforeEachHook?.()
  removePageFinishHook?.()
})

useProvideActionButtons()

useHead({
  script: [{
    id: 'article-layout-preference',
    innerHTML: ARTICLE_LAYOUT_BOOTSTRAP_SCRIPT,
    tagPosition: 'head',
  }],
  title: appName,
})
</script>

<template>
  <!-- <NuxtRouteAnnouncer /> -->
  <NuxtLoadingIndicator
    v-if="!onHome"
    color="var(--c-accent)"
    :height="3"
    :throttle="200"
  />

  <UiAppHeader />
  <HeroLedPreloader
    v-if="showHomePreloader"
    :key="homePreloaderRun"
    :ready="homePageReady"
    @complete="handleHomePreloaderComplete"
  />

  <div id="smooth-wrapper">
    <div id="smooth-content" tabindex="-1">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <UiAppFooter />
    </div>
  </div>

  <ActionButtonDock />
</template>
