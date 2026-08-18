<script setup lang="ts">
import gsap from 'gsap'

const props = defineProps<{
  ready: boolean
}>()

const emit = defineEmits<{
  complete: []
}>()

const DESKTOP_COLUMNS = 20
const MOBILE_COLUMNS = 12
const CELL_COUNT = DESKTOP_COLUMNS ** 2
const MIN_DISPLAY_MS = 320
const MAX_WAIT_MS = 700

const visible = shallowRef(true)
const percent = shallowRef(0)
const root = useTemplateRef<HTMLElement>('root')
const grid = useTemplateRef<HTMLElement>('grid')
const stage = useTemplateRef<HTMLElement>('stage')
const wash = useTemplateRef<HTMLElement>('wash')

let timeline: gsap.core.Timeline | null = null
let progressTween: gsap.core.Tween | null = null
let resolvePageReady: (() => void) | null = null
let stopReadyWatcher: (() => void) | null = null
let disposed = false

useHead({
  noscript: [{ innerHTML: '<style>.led-preloader{display:none}</style>' }],
})

onMounted(async () => {
  document.documentElement.classList.add('is-preloading')

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const cells = Array.from(grid.value?.querySelectorAll<HTMLElement>('.led-cell') ?? [])
  const columns = window.innerWidth < 768 ? MOBILE_COLUMNS : DESKTOP_COLUMNS
  const ordered = centerOutOrder(cells, columns)
  const progress = { value: 0 }
  let litCellCount = 0
  let renderedPercent = -1

  function renderProgress() {
    const nextPercent = Math.round(progress.value * 100)
    if (nextPercent !== renderedPercent) {
      renderedPercent = nextPercent
      percent.value = nextPercent
    }

    const nextLitCellCount = Math.round(progress.value * ordered.length)
    while (litCellCount < nextLitCellCount) {
      ordered[litCellCount]?.classList.add('is-lit')
      litCellCount += 1
    }
  }

  if (!reduceMotion) {
    progressTween = gsap.to(progress, {
      value: 0.9,
      duration: MIN_DISPLAY_MS / 1000,
      ease: 'power2.out',
      onUpdate: renderProgress,
    })
  }

  await Promise.all([
    wait(MIN_DISPLAY_MS),
    Promise.race([document.fonts.ready, wait(MAX_WAIT_MS)]),
    waitForPageReady(),
  ])

  if (disposed)
    return

  if (reduceMotion) {
    exit(true)
  }
  else {
    progressTween?.kill()
    progressTween = gsap.to(progress, {
      value: 1,
      duration: 0.1,
      ease: 'power2.out',
      onUpdate: renderProgress,
      onComplete: () => exit(false),
    })
  }
})

onBeforeUnmount(teardown)

function centerOutOrder(cells: HTMLElement[], columns: number): HTMLElement[] {
  const center = (columns - 1) / 2
  return cells
    .slice(0, columns ** 2)
    .map((element, index) => ({
      element,
      index,
      distance: Math.hypot(Math.floor(index / columns) - center, (index % columns) - center),
    }))
    .sort((a, b) => a.distance - b.distance || a.index - b.index)
    .map(item => item.element)
}

function exit(reduceMotion: boolean) {
  timeline = gsap.timeline({
    defaults: { overwrite: 'auto' },
    onComplete: finish,
  })
    .to(stage.value, {
      scale: reduceMotion ? 1 : 0.9,
      autoAlpha: 0,
      duration: reduceMotion ? 0.1 : 0.26,
      ease: reduceMotion ? 'none' : 'power2.inOut',
    }, 0)
    .to(wash.value, {
      autoAlpha: 1,
      duration: reduceMotion ? 0.12 : 0.34,
      ease: reduceMotion ? 'none' : 'power2.inOut',
    }, 0)
}

function finish() {
  if (disposed)
    return

  teardown()
  visible.value = false
  emit('complete')
}

function waitForPageReady(): Promise<void> {
  if (props.ready)
    return Promise.resolve()

  return new Promise((resolve) => {
    resolvePageReady = resolve
    stopReadyWatcher = watch(() => props.ready, (ready) => {
      if (!ready)
        return

      stopReadyWatcher?.()
      stopReadyWatcher = null
      resolvePageReady = null
      resolve()
    })
  })
}

function handleBailout(event: AnimationEvent) {
  if (event.animationName === 'led-bail')
    finish()
}

function teardown() {
  disposed = true
  stopReadyWatcher?.()
  resolvePageReady?.()
  progressTween?.kill()
  timeline?.kill()
  stopReadyWatcher = null
  resolvePageReady = null
  progressTween = null
  timeline = null
  document.documentElement.classList.remove('is-preloading')
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
</script>

<template>
  <div
    v-if="visible"
    ref="root"
    class="led-preloader"
    role="status"
    aria-live="polite"
    @animationend="handleBailout"
  >
    <span class="sr-only">页面加载中</span>

    <div ref="wash" class="led-preloader__wash" aria-hidden="true" />

    <div ref="stage" class="led-stage">
      <div ref="grid" class="led-grid" aria-hidden="true">
        <i v-for="cell in CELL_COUNT" :key="cell" class="led-cell" />
      </div>

      <p class="led-name" aria-hidden="true">
        Setobox
      </p>
      <p class="led-percent" aria-hidden="true">
        {{ percent }}%
      </p>
    </div>
  </div>
</template>

<style>
html.is-preloading {
  overflow: hidden;
  scrollbar-gutter: stable;
}

.led-preloader {
  position: fixed;
  z-index: 90;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #000;
  isolation: isolate;
  animation: led-bail 0.2s linear 5s forwards;
}

@keyframes led-bail {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

.led-preloader__wash {
  position: absolute;
  z-index: 0;
  inset: 0;
  background: var(--c-bg, #0b0d10);
  opacity: 0;
  visibility: hidden;
  will-change: opacity;
}

.led-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: center;
  will-change: transform, opacity;
}

.led-grid {
  display: grid;
  grid-template-columns: repeat(12, 10px);
  gap: 5px;
}

.led-cell {
  width: 10px;
  height: 10px;
  background: #14181d;
}

.led-cell:nth-child(n + 145) {
  display: none;
}

.led-cell.is-lit {
  background: var(--c-accent, #ff5a7a);
  box-shadow: 0 0 8px var(--c-accent, #ff5a7a);
}

.led-name {
  margin-top: 32px;
  --at-apply: font-display text-h4 font-bold;
  color: #f2f5f8;
}

.led-percent {
  margin-top: 4px;
  --at-apply: font-mono text-xs uppercase;
  color: #8a96a4;
}

@media (min-width: 48rem) {
  .led-grid {
    grid-template-columns: repeat(20, 8px);
    gap: 4px;
  }

  .led-cell {
    width: 8px;
    height: 8px;
  }

  .led-cell:nth-child(n + 145) {
    display: block;
  }
}

@media (prefers-reduced-motion: reduce) {
  .led-grid,
  .led-percent {
    display: none;
  }

  .led-name {
    margin-top: 0;
  }
}
</style>
