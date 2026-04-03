<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { onMounted, onUnmounted, useTemplateRef } from 'vue'

const roles = ['开发者', '游戏玩家', '动画爱好者'] as const

const hero = useTemplateRef<HTMLElement>('hero')
const introElement = useTemplateRef<HTMLElement>('intro')
const descriptionElement = useTemplateRef<HTMLElement>('description')
const roleElement = useTemplateRef<HTMLElement>('role')
const dotElement = useTemplateRef<HTMLElement>('dot')

let introSplit: ReturnType<typeof SplitText.create> | undefined
let descriptionSplit: ReturnType<typeof SplitText.create> | undefined
let introTween: ReturnType<typeof gsap.from> | undefined
let descriptionTween: ReturnType<typeof gsap.from> | undefined
let scrollTimeline: ReturnType<typeof gsap.timeline> | undefined
let stopRoleLoop: (() => void) | undefined

function createRoleSplit(target: HTMLElement) {
  return SplitText.create(target, {
    type: 'words, chars',
    tag: 'span',
    wordsClass: 'role-word',
    charsClass: 'role-char',
  })
}

function getStaggeredDuration(itemCount: number, duration: number, each: number) {
  return Math.max(0, (itemCount - 1) * each + duration)
}

function createRoleLoop(target: HTMLElement, dot: HTMLElement) {
  let roleIndex = 0
  let split = createRoleSplit(target)
  let activeTween: ReturnType<typeof gsap.timeline> | undefined
  let activeDelay: ReturnType<typeof gsap.delayedCall> | undefined
  let isActive = true
  const dotColor = getComputedStyle(dot).color
  const activeDotColor = 'red'

  gsap.set(split.chars, {
    opacity: 1,
    scaleX: 1,
    transformOrigin: 'right 0',
  })

  gsap.set(dot, {
    translateX: 0,
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
        translateX: -target.offsetWidth,
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
    split = createRoleSplit(target)

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

        transformOrigin: 'center 0',
      }, 0)
      .to(dot, {
        duration: moveDuration / 2,
        ease: 'circ.out',
        transformOrigin: '0 0',
        translateX: 0,
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

onMounted(() => {
  if (!hero.value || !introElement.value || !descriptionElement.value || !roleElement.value || !dotElement.value)
    return

  gsap.registerPlugin(SplitText, ScrollTrigger)

  introSplit = SplitText.create(introElement.value, { type: 'words, chars' })

  introTween = gsap.from(introSplit.chars, {
    duration: 0.5,
    translateX: 10,
    autoAlpha: 0,
    stagger: 0.05,
  })

  descriptionSplit = SplitText.create(descriptionElement.value, {
    type: 'words, chars',
  })
  descriptionTween = gsap.from(descriptionSplit.chars, {
    duration: 0.5,
    translateX: 10,
    autoAlpha: 0,
    stagger: 0.05,
    delay: 0.5,
  })

  stopRoleLoop = createRoleLoop(roleElement.value, dotElement.value)

  scrollTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: hero.value,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  }).to('.header-link', { y: 1000, autoAlpha: 0 })
})

onUnmounted(() => {
  stopRoleLoop?.()
  introTween?.kill()
  descriptionTween?.kill()
  scrollTimeline?.scrollTrigger?.kill()
  scrollTimeline?.kill()
  introSplit?.revert()
  descriptionSplit?.revert()
})
</script>

<template>
  <section id="hero" ref="hero" w-full>
    <div h="[calc(100vh_-_4rem)]" relative flex="~ col justify-center">
      <div p-4 h-100lvh lg:p-16 class="[@media(min-height:64rem)]:max-h-256">
        <h2 ref="intro" class="intro" mb-4>
          <span text-6xl font-extrabold>Setobox</span>
        </h2>
        <p ref="description" class="description" text-xl inline-flex>
          <span>一个兴趣使然的</span>
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
