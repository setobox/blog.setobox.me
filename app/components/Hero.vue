<script setup lang="ts">
import type {
  GSAP,
  GSAPDelayedCall,
  GSAPSplitText,
  GSAPTimeline,
} from '#shared/types/gsap'
import { until } from '@vueuse/core'
import { nextTick, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { GSAP_PLUGIN_GROUPS } from '~/utils/gsap-plugins'

const roles = ['开发者', '游戏玩家', '动画爱好者'] as const

const hero = useTemplateRef<HTMLElement>('hero')
const introElement = useTemplateRef<HTMLElement>('intro')
const descriptionIntroElement = useTemplateRef<HTMLElement>('descriptionIntro')
const roleElement = useTemplateRef<HTMLElement>('role')
const dotElement = useTemplateRef<HTMLElement>('dot')
const route = useRoute()
const { loadPlugins } = useGsap()
const {
  active: homeLoadingActive,
  targetIsHome,
} = useHomeLoading()

let disposed = false
let stopAnimations: (() => void) | undefined

function createRoleSplit(splitText: GSAPSplitText, target: HTMLElement) {
  return splitText.create(target, {
    type: 'words, chars',
    tag: 'span',
    wordsClass: 'role-word',
    charsClass: 'role-char',
  })
}

function getStaggeredDuration(itemCount: number, duration: number, each: number) {
  return Math.max(0, (itemCount - 1) * each + duration)
}

function createRoleLoop(gsap: GSAP, splitText: GSAPSplitText, target: HTMLElement, dot: HTMLElement) {
  let roleIndex = 0
  let split = createRoleSplit(splitText, target)
  let activeTween: GSAPTimeline | undefined
  let activeDelay: GSAPDelayedCall | undefined
  let isActive = true
  const dotColor = 'white'
  const activeDotColor = 'var(--theme-1)'

  gsap.set(split.chars, {
    opacity: 1,
    scaleX: 1,
    transformOrigin: 'right 0',
  })

  gsap.set(dot, {
    x: 0,
    scaleX: 1,
    transformOrigin: 'left 0',
  })

  function scheduleNextRole() {
    if (!isActive)
      return

    activeDelay = gsap.delayedCall(2.4, hideCurrentRole)
  }

  function hideCurrentRole() {
    if (!isActive)
      return

    const charDuration = split.chars.length * 0.03
    const staggerEach = 0.03
    const moveDuration = getStaggeredDuration(split.chars.length, charDuration, staggerEach)

    activeTween = gsap.timeline({ onComplete: showNextRole })
      .to(split.chars, {
        duration: charDuration,
        ease: 'circ.out',
        opacity: 0,
        scaleX: 0,
        transformOrigin: '0 0',
        stagger: {
          each: staggerEach,
          from: 'end',
        },
      }, 0)
      .to(dot, {
        duration: moveDuration,
        ease: 'circ.out',
        color: dotColor,
        x: -target.offsetWidth,
      }, 0)
      .to(dot, {
        duration: moveDuration / 2,
        ease: 'circ.out',
        scaleX: 5,
        transformOrigin: '100% 0',
        color: activeDotColor,
      }, 0)
      .to(dot, {
        duration: moveDuration / 2,
        ease: 'circ.out',
        scaleX: 1,
        color: dotColor,
      }, `-=${moveDuration / 2}`)
  }

  function showNextRole() {
    if (!isActive)
      return

    split.revert()
    roleIndex = (roleIndex + 1) % roles.length
    target.textContent = roles[roleIndex] ?? roles[0]
    split = createRoleSplit(splitText, target)

    gsap.set(split.chars, {
      opacity: 0,
      scaleX: 0,
      transformOrigin: '0 0',
    })

    const charDuration = split.chars.length * 0.04
    const staggerEach = 0.04
    const moveDuration = getStaggeredDuration(split.chars.length, charDuration, staggerEach)

    gsap.set(dot, {
      x: -target.offsetWidth,
      scaleX: 1,
    })

    activeTween = gsap.timeline({
      delay: 0.2,
      onComplete: scheduleNextRole,
    })
      .to(split.chars, {
        duration: charDuration,
        ease: 'circ.out',
        opacity: 1,
        scaleX: 1,
        transformOrigin: '0 0',
        stagger: {
          each: staggerEach,
          from: 'start',
        },
      }, 0)
      .to(dot, {
        duration: moveDuration,
        ease: 'circ.out',
        // x: 0,
        color: dotColor,
        transformOrigin: 'center 0',
      }, 0)
      .to(dot, {
        duration: moveDuration / 2,
        ease: 'circ.out',
        transformOrigin: '0 0',
        x: 0,
        scaleX: 5,
        color: activeDotColor,
      }, 0)
      .to(dot, {
        duration: moveDuration / 2,
        ease: 'circ.out',
        transformOrigin: '0 0',
        scaleX: 1,
        color: dotColor,
      }, moveDuration / 2)
  }

  scheduleNextRole()

  return () => {
    isActive = false
    activeDelay?.kill()
    activeTween?.kill()
    split.revert()
  }
}

async function waitForHomeLoadingExit(): Promise<boolean> {
  while (true) {
    if (disposed)
      return false

    await until(
      () => route.path !== '/'
        || (targetIsHome.value && !homeLoadingActive.value),
    ).toBe(true)
    await nextTick()

    if (disposed || route.path !== '/')
      return false

    if (targetIsHome.value && !homeLoadingActive.value)
      return true
  }
}

onMounted(async () => {
  const readyToAnimate = await waitForHomeLoadingExit()
  if (!readyToAnimate)
    return

  const runtime = await loadPlugins(GSAP_PLUGIN_GROUPS.hero)
  if (
    disposed
    || !runtime
    || route.path !== '/'
    || !targetIsHome.value
    || homeLoadingActive.value
    || !hero.value
    || !introElement.value
    || !descriptionIntroElement.value
    || !roleElement.value
    || !dotElement.value
  ) {
    return
  }

  const heroElement = hero.value
  const intro = introElement.value
  const descriptionIntro = descriptionIntroElement.value
  const role = roleElement.value
  const dot = dotElement.value
  const { gsap, SplitText } = runtime
  const media = gsap.matchMedia()
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const introSplit = SplitText.create(intro, { type: 'words, chars' })
    const descriptionSplit = SplitText.create(descriptionIntro, {
      type: 'words, chars',
    })
    gsap.timeline({
      defaults: {
        duration: 0.5,
        ease: 'power1.out',
      },
    })
      .from(introSplit.chars, {
        x: 10,
        autoAlpha: 0,
        stagger: 0.05,
      })
      .from(descriptionSplit.chars, {
        x: 10,
        autoAlpha: 0,
        stagger: 0.05,
      }, 0.5)

    const stopRoleLoop = createRoleLoop(
      gsap,
      SplitText,
      role,
      dot,
    )

    gsap.timeline({
      scrollTrigger: {
        trigger: heroElement,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    }).to('.header-link', { y: 1000, autoAlpha: 0, ease: 'none' })

    return stopRoleLoop
  }, heroElement)
  stopAnimations = () => media.revert()
})

onUnmounted(() => {
  disposed = true
  stopAnimations?.()
})
</script>

<template>
  <section id="hero" ref="hero" w-full>
    <div h="[calc(100vh_-_4rem)]" relative flex="~ col justify-center">
      <div p-4 h-100lvh lg:p-16 class="[@media(min-height:64rem)]:max-h-256">
        <h2 ref="intro" class="intro" mb-4>
          <span text-6xl font-extrabold>Setobox</span>
        </h2>
        <p class="description" text-xl inline-flex>
          <span ref="descriptionIntro">一个兴趣使然的</span>
          <span ref="role" class="role">开发者</span>
          <span ref="dot" class="dot" text-xl ml-0.5>.</span>
        </p>
      </div>

      <div class="header-link" p="x-4 b-4 lg:x-12 b-12" container bottom-0 left-0 right-0 fixed>
        <div flex justify-between>
          <button
            text="fg-4 center hover:fg-3" border="1px solid fg-5 rounded-1 hover:fg-3"
            leading-12 font-bold px-4 flex-center gap-1 h-12 cursor-pointer
          >
            了解更多 <span i-carbon:arrow-down w-4 />
          </button>
        </div>
      </div>
    </div>

    <div class="scroll-space" h-100lvh w-full />
    <div class="scroll-space" h-100lvh w-full />
  </section>
</template>

<style scoped>
</style>
