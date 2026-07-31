<script setup lang="ts">
import type { GSAP, GSAPTimeline, GSAPTween } from '#shared/types/gsap'
import type { RouteLocationNormalizedGeneric } from 'vue-router'
import { usePreferredReducedMotion, useScrollLock } from '@vueuse/core'
import {
  nextTick,
  onMounted,
  onScopeDispose,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'

import { isNavigationFailure, NavigationFailureType } from 'vue-router'

type ReadyTask = 'page' | 'images' | 'fonts' | 'gsap'

interface LoadingRun {
  abortController: AbortController
  aborted: Promise<void>
  cancelled: boolean
  exitTimeline?: GSAPTimeline
  fillTween?: GSAPTween
  gsap: GSAP | null
  id: number
  pageReady: Promise<void>
  progressFrozen: boolean
  resolveExit?: () => void
  resolvePageReady: () => void
  settledTasks: Set<ReadyTask>
  timers: Map<number, () => void>
}

interface PendingNavigation {
  generation: number
  startedRunId?: number
}

const MINIMUM_DURATION = 1200
const MAXIMUM_DURATION = 8000

const overlay = useTemplateRef<HTMLElement>('overlay')
const fill = useTemplateRef<HTMLElement>('fill')
const scrollTarget = shallowRef<HTMLElement | null>(null)
const reducedMotion = usePreferredReducedMotion()
const scrollLocked = useScrollLock(scrollTarget)
const router = useRouter()
const route = useRoute()
const nuxtApp = useNuxtApp()

const {
  active,
  begin,
  cancel,
  finish,
  progress,
  runId,
  setProgress,
  setTargetIsHome,
} = useHomeLoading()

let currentRun: LoadingRun | undefined
let cancelledHomeRunDebt = false
let navigationGeneration = 0
let latestNavigationGeneration = 0
const pendingNavigations
  = new WeakMap<RouteLocationNormalizedGeneric, PendingNavigation>()
let removeBeforeGuard: (() => void) | undefined
let removeAfterHook: (() => void) | undefined
let removePageFinishHook: (() => void) | undefined
let removeRouterErrorHook: (() => void) | undefined

function createRun(id: number): LoadingRun {
  const abortController = new AbortController()
  const aborted = new Promise<void>((resolve) => {
    abortController.signal.addEventListener('abort', () => resolve(), { once: true })
  })
  let resolvePageReady = () => {}
  const pageReady = new Promise<void>((resolve) => {
    resolvePageReady = resolve
  })

  return {
    abortController,
    aborted,
    cancelled: false,
    gsap: null,
    id,
    pageReady,
    progressFrozen: false,
    resolvePageReady,
    settledTasks: new Set(),
    timers: new Map(),
  }
}

function isCurrent(run: LoadingRun): boolean {
  return currentRun === run && !run.cancelled && runId.value === run.id
}

function delay(run: LoadingRun, milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      run.timers.delete(timer)
      resolve()
    }, milliseconds)

    run.timers.set(timer, resolve)
  })
}

function clearTimers(run: LoadingRun): void {
  for (const [timer, resolve] of run.timers) {
    window.clearTimeout(timer)
    resolve()
  }
  run.timers.clear()
}

function renderProgress(
  run: LoadingRun,
  targetProgress: number,
  force = false,
): void {
  if (!isCurrent(run) || (run.progressFrozen && !force))
    return

  const nextProgress = Math.max(progress.value, targetProgress)
  setProgress(run.id, nextProgress)

  const fillElement = fill.value
  if (!fillElement)
    return

  const scale = Math.min(1, Math.max(0, nextProgress / 100))
  run.fillTween?.kill()

  if (reducedMotion.value === 'reduce' || !run.gsap) {
    fillElement.style.transform = `scaleX(${scale})`
    return
  }

  fillElement.style.transition = 'none'
  run.fillTween = run.gsap.to(fillElement, {
    duration: 0.32,
    ease: 'power2.out',
    overwrite: 'auto',
    scaleX: scale,
    transformOrigin: 'left center',
  })
}

async function trackTask(
  run: LoadingRun,
  taskName: ReadyTask,
  task: Promise<unknown>,
): Promise<void> {
  try {
    await task
  }
  catch {
    // A failed resource is settled so the overlay can never block the page forever.
  }

  if (!isCurrent(run) || run.settledTasks.has(taskName))
    return

  run.settledTasks.add(taskName)
  renderProgress(run, run.settledTasks.size * 25)
}

function waitForImage(image: HTMLImageElement, signal: AbortSignal): Promise<void> {
  if (image.complete || signal.aborted)
    return Promise.resolve()

  return new Promise((resolve) => {
    function settle(): void {
      image.removeEventListener('load', settle)
      image.removeEventListener('error', settle)
      signal.removeEventListener('abort', settle)
      resolve()
    }

    image.addEventListener('load', settle, { once: true })
    image.addEventListener('error', settle, { once: true })
    signal.addEventListener('abort', settle, { once: true })
  })
}

async function waitForCriticalImages(run: LoadingRun): Promise<void> {
  await Promise.race([run.pageReady, run.aborted])
  if (!isCurrent(run) || run.abortController.signal.aborted)
    return

  await nextTick()
  if (!isCurrent(run) || run.abortController.signal.aborted)
    return

  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>('img[data-image-loaded]'),
  )

  await Promise.all(images.map(async (image) => {
    await waitForImage(image, run.abortController.signal)
    if (run.abortController.signal.aborted)
      return

    try {
      await Promise.race([image.decode(), run.aborted])
    }
    catch {
      // Decode and network failures both count as settled.
    }
  }))
}

async function finishVisualRun(run: LoadingRun): Promise<void> {
  if (!isCurrent(run))
    return

  renderProgress(run, 100, true)
  await nextTick()
  if (!isCurrent(run))
    return

  const overlayElement = overlay.value
  const fillElement = fill.value

  if (!overlayElement || !fillElement) {
    currentRun = undefined
    run.abortController.abort()
    clearTimers(run)
    finish(run.id)
    return
  }

  if (reducedMotion.value === 'reduce') {
    fillElement.style.transition = 'none'
    fillElement.style.transform = 'scaleX(1)'
    overlayElement.style.transition = 'none'
    overlayElement.style.opacity = '0'
    overlayElement.style.visibility = 'hidden'
  }
  else if (run.gsap) {
    run.fillTween?.kill()
    await new Promise<void>((resolve) => {
      run.resolveExit = resolve
      run.exitTimeline = run.gsap?.timeline({
        onComplete: () => {
          run.resolveExit = undefined
          resolve()
        },
      })
        .to(fillElement, {
          duration: 0.24,
          ease: 'power2.out',
          scaleX: 1,
          transformOrigin: 'left center',
        })
        .to(overlayElement, {
          autoAlpha: 0,
          duration: 0.4,
          ease: 'power1.out',
        })
    })
  }
  else {
    fillElement.style.transform = 'scaleX(1)'
    await delay(run, 240)
    if (!isCurrent(run))
      return

    overlayElement.style.opacity = '0'
    overlayElement.style.visibility = 'hidden'
    await delay(run, 400)
  }

  if (!isCurrent(run))
    return

  currentRun = undefined
  run.abortController.abort()
  clearTimers(run)
  finish(run.id)
}

async function settleRun(run: LoadingRun): Promise<void> {
  const pluginsReady = Promise.race([
    loadGsapWithPlugins(),
    run.aborted,
  ])
  const fontsReady = Promise.race([run.pageReady, run.aborted]).then(async () => {
    if (run.abortController.signal.aborted)
      return

    await nextTick()
    if (run.abortController.signal.aborted)
      return

    if ('fonts' in document)
      await Promise.race([document.fonts.ready, run.aborted])
  })

  const trackedTasks = [
    trackTask(run, 'page', run.pageReady),
    trackTask(run, 'images', waitForCriticalImages(run)),
    trackTask(run, 'fonts', fontsReady),
    trackTask(run, 'gsap', pluginsReady),
  ]

  void Promise.race([
    loadGsap(),
    run.aborted.then(() => null),
  ]).then((gsap) => {
    if (!isCurrent(run) || !gsap)
      return

    run.gsap = gsap
    renderProgress(run, progress.value)
  })

  const allTasks = Promise.all(trackedTasks)
  const minimumElapsed = delay(run, MINIMUM_DURATION)
  const maximumElapsed = delay(run, MAXIMUM_DURATION)

  const result = await Promise.race([
    Promise.all([allTasks, minimumElapsed]).then(() => 'ready' as const),
    maximumElapsed.then(() => 'timeout' as const),
  ])

  if (!isCurrent(run))
    return

  run.progressFrozen = true
  if (result === 'timeout') {
    run.resolvePageReady()
    run.abortController.abort()
  }

  clearTimers(run)
  await finishVisualRun(run)
}

function prepareRun(run: LoadingRun): void {
  void nextTick(() => {
    if (!isCurrent(run))
      return

    if (overlay.value) {
      overlay.value.style.opacity = '1'
      overlay.value.style.visibility = 'visible'
    }
    if (fill.value) {
      fill.value.style.transition = ''
      fill.value.style.transform = 'scaleX(0)'
    }

    renderProgress(run, progress.value)
  })
}

function startRun(initial = false, pageAlreadyReady = initial): number {
  if (currentRun)
    cancelCurrentRun()

  cancelledHomeRunDebt = false
  const id = initial ? runId.value : begin()
  const run = createRun(id)
  currentRun = run
  scrollLocked.value = true
  prepareRun(run)
  void settleRun(run)

  if (pageAlreadyReady)
    run.resolvePageReady()

  return id
}

function cancelCurrentRun(): void {
  const run = currentRun
  if (!run)
    return

  run.cancelled = true
  run.abortController.abort()
  run.resolvePageReady()
  run.fillTween?.kill()
  run.exitTimeline?.kill()
  run.resolveExit?.()
  clearTimers(run)
  currentRun = undefined
  scrollLocked.value = false
  cancel(run.id)
}

function reconcileCurrentRoute(): void {
  const remainsOnHome = router.currentRoute.value.path === '/'

  if (!remainsOnHome) {
    cancelCurrentRun()
    cancelledHomeRunDebt = false
    setTargetIsHome(false)
    return
  }

  if (cancelledHomeRunDebt && !active.value) {
    startRun(false, true)
    return
  }

  setTargetIsHome(true)
}

function settleNavigation(
  to: RouteLocationNormalizedGeneric,
  failed: boolean,
): void {
  const navigation = pendingNavigations.get(to)
  pendingNavigations.delete(to)

  if (!navigation)
    return

  if (
    failed
    && navigation.startedRunId !== undefined
    && currentRun?.id === navigation.startedRunId
  ) {
    cancelCurrentRun()
  }

  if (navigation.generation !== latestNavigationGeneration)
    return

  reconcileCurrentRoute()
}

watch(active, value => scrollLocked.value = value)

onMounted(() => {
  scrollTarget.value = document.documentElement
  scrollLocked.value = active.value

  removePageFinishHook = nuxtApp.hook('page:finish', () => {
    if (router.currentRoute.value.path === '/')
      currentRun?.resolvePageReady()
  })

  removeBeforeGuard = router.beforeEach((to, from) => {
    const targetIsHome = to.path === '/'
    const navigation: PendingNavigation = {
      generation: ++navigationGeneration,
    }
    latestNavigationGeneration = navigation.generation
    pendingNavigations.set(to, navigation)
    setTargetIsHome(targetIsHome)

    if (!targetIsHome) {
      if (currentRun)
        cancelledHomeRunDebt = true
      cancelCurrentRun()
      return
    }

    if (from.path !== '/')
      navigation.startedRunId = startRun()
  })

  removeAfterHook = router.afterEach((to, _from, failure) => {
    if (
      !pendingNavigations.has(to)
      && failure
      && isNavigationFailure(failure, NavigationFailureType.duplicated)
    ) {
      latestNavigationGeneration = ++navigationGeneration
      reconcileCurrentRoute()
      return
    }

    settleNavigation(to, Boolean(failure))
  })

  removeRouterErrorHook = router.onError((_error, to) => {
    settleNavigation(to, true)
  })

  if (route.path === '/' && active.value)
    startRun(true)
})

onScopeDispose(() => {
  removeBeforeGuard?.()
  removeAfterHook?.()
  removePageFinishHook?.()
  removeRouterErrorHook?.()
  cancelCurrentRun()
  scrollLocked.value = false
})
</script>

<template>
  <div
    v-if="active"
    ref="overlay"
    class="p-6 bg-bg-1 opacity-100 grid visible transition-[opacity,visibility] duration-[400ms] [background:radial-gradient(circle_at_50%_45%,var(--hex-bg-3),transparent_42%),var(--hex-bg-1)] inset-0 place-items-center fixed z-1000 motion-reduce:transition-none"
    data-home-loading-overlay
    role="status"
    aria-label="首页正在加载"
  >
    <div class="p-[clamp(0.3rem,0.7vw,0.625rem)] border-[#e8ddc3] rounded-full border-solid bg-[#181918] w-[min(88vw,32rem)] shadow-[0_0.85rem_0_rgba(0,0,0,0.24),0_1.25rem_2.5rem_rgba(0,0,0,0.28)] [border-width:clamp(0.35rem,0.8vw,0.75rem)] sm:w-[min(78vw,68rem)]">
      <div
        class="rounded-full bg-[#e2d4b8] h-[clamp(1.5rem,0.6vw,4rem)] overflow-hidden"
        role="progressbar"
        aria-label="首页加载进度"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progress"
      >
        <span
          ref="fill"
          class="will-change-transform rounded-l-full bg-current-1 h-full w-full block origin-left scale-x-0 transition-transform duration-[320ms] ease-out motion-reduce:transition-none"
        />
      </div>
    </div>
  </div>
</template>
