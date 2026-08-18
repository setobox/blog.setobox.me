<script setup lang="ts">
import type { GSAP } from '#shared/types/gsap'
import { onKeyStroke, useMediaQuery } from '@vueuse/core'
import { nextTick, onMounted, onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import { HOME_ANIMATION_CONTEXT_KEY } from '~/features/home/animation'
import { primaryNavigation } from '~/features/shell/navigation'

const route = useRoute()
const { gsap } = useGsap()
const homeAnimation = inject(HOME_ANIMATION_CONTEXT_KEY)
const open = shallowRef(false)
const isDesktop = useMediaQuery('(min-width: 80rem)')
const header = useTemplateRef<HTMLElement>('header')
const drawer = useTemplateRef<HTMLElement>('drawer')
const toggle = useTemplateRef<HTMLButtonElement>('toggle')
let headerContext: ReturnType<GSAP['context']> | null = null

watch(() => route.fullPath, () => {
  open.value = false
})

watch(isDesktop, (desktop) => {
  if (desktop)
    open.value = false
})

onKeyStroke('Escape', (event) => {
  if (!open.value)
    return

  event.preventDefault()
  open.value = false
})

watch(open, async (isOpen) => {
  await nextTick()
  if (isOpen)
    drawer.value?.querySelector<HTMLAnchorElement>('a')?.focus()
  else if (!isDesktop.value)
    toggle.value?.focus()
})

function clearHomeEntrance(): void {
  headerContext?.revert()
  headerContext = null
  const targets = header.value?.querySelectorAll<HTMLElement>('[data-home-header-target]')
  if (header.value)
    gsap?.set([header.value, ...(targets ? [...targets] : [])], { clearProps: 'all' })
}

function syncHomeEntrance(): void {
  const root = header.value
  if (!root || !gsap || !homeAnimation)
    return

  const phase = homeAnimation.phase.value
  if (route.path !== '/' || phase === 'inactive' || phase === 'complete') {
    clearHomeEntrance()
    return
  }

  if (phase === 'preloading' || phase === 'hero') {
    headerContext?.revert()
    headerContext = null
    gsap.set(root, { autoAlpha: 0 })
    return
  }

  if (phase !== 'header')
    return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    clearHomeEntrance()
    homeAnimation.finish()
    return
  }

  headerContext?.revert()
  headerContext = gsap.context(() => {
    const logo = root.querySelector<HTMLElement>('[data-home-header-target="logo"]')
    const navItems = root.querySelectorAll<HTMLElement>('[data-home-header-target="nav-item"]')
    const menuButton = root.querySelector<HTMLElement>('[data-home-header-target="menu"]')
    const targets = [logo, ...navItems, menuButton].filter((target): target is HTMLElement => Boolean(target))
    const timeline = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: homeAnimation.finish,
    })

    timeline.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.16, ease: 'power1.out' }, 0)

    if (logo) {
      timeline.fromTo(
        logo,
        { clipPath: 'inset(0 0 100% 0)' },
        { clipPath: 'inset(0 0 0% 0)', duration: 0.5, ease: 'power3.out' },
        0.05,
      )
    }

    if (navItems.length) {
      timeline.fromTo(
        navItems,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, duration: 0.4, ease: 'power2.out', stagger: 0.06, y: 0 },
        0.16,
      )
    }

    if (menuButton) {
      timeline.fromTo(
        menuButton,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, duration: 0.4, ease: 'power2.out', y: 0 },
        0.16,
      )
    }

    timeline.set(targets, { clearProps: 'transform,opacity,visibility,clipPath' })
  }, root)
}

onMounted(() => {
  watch(
    [() => route.path, () => homeAnimation?.phase.value],
    syncHomeEntrance,
    { immediate: true },
  )
})

onScopeDispose(clearHomeEntrance)
</script>

<template>
  <header ref="header" class="border-b border-ink-800 bg-ink-950/70 inset-x-0 top-0 fixed backdrop-blur-md z-header">
    <a
      href="#smooth-content"
      class="sr-only focus:text-sm focus:text-ink-950 focus:px-3 focus:py-2 focus:rounded-sm focus:bg-accent focus:left-4 focus:top-4 focus:absolute focus:not-sr-only focus:z-overlay"
    >
      跳到主内容
    </a>

    <div class="container-wide flex h-14 items-center justify-between md:h-16">
      <NuxtLink
        to="/"
        data-home-header-target="logo"
        class="outline-none rounded-full inline-flex h-11 w-11 items-center justify-center"
        aria-label="返回首页"
      >
        <NuxtImg
          class="rounded-full h-10 w-10"
          src="/avatar.jpg"
          alt="Setobox"
          width="40"
          height="40"
          densities="x1 x2"
          format="webp"
          quality="80"
          preload
        />
      </NuxtLink>

      <div class="flex gap-1 items-center">
        <nav class="gap-3 hidden items-center xl:flex" aria-label="主导航">
          <NuxtLink
            v-for="item in primaryNavigation"
            :key="item.to"
            :to="item.to"
            data-home-header-target="nav-item"
            class="text-sm text-ink-200 font-medium px-2 py-2 outline-none rounded-sm inline-flex gap-2 transition-colors duration-240 items-center hover:text-ink-50"
            active-class="text-ink-50"
            :target="item.external ? '_blank' : undefined"
            :rel="item.external ? 'noopener noreferrer' : undefined"
          >
            <span :class="item.icon" class="text-xl" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <button
          ref="toggle"
          data-home-header-target="menu"
          type="button"
          class="text-ink-100 outline-none rounded-sm flex h-10 w-10 items-center justify-center xl:hidden"
          :aria-expanded="open"
          aria-controls="nav-drawer"
          :aria-label="open ? '关闭导航' : '打开导航'"
          @click="open = !open"
        >
          <svg
            class="menu-icon"
            :class="{ 'menu-icon--open': open }"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            aria-hidden="true"
          >
            <path class="menu-icon__line menu-icon__line--top" d="M4 6h16" />
            <path class="menu-icon__line menu-icon__line--middle" d="M4 12h16" />
            <path class="menu-icon__line menu-icon__line--bottom" d="M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  </header>

  <Transition name="nav-drawer" :duration="{ enter: 520, leave: 240 }">
    <div v-if="open" class="nav-drawer-shell xl:hidden">
      <button
        type="button"
        class="nav-drawer-backdrop"
        aria-label="关闭导航"
        @click="open = false"
      />
      <aside
        id="nav-drawer"
        ref="drawer"
        class="nav-drawer-panel"
        aria-label="站点导航抽屉"
      >
        <div class="px-4 py-group border-b border-ink-800 lg:px-6">
          <p class="text-meta">
            NAVIGATION
          </p>
        </div>
        <nav class="p-4 flex flex-col lg:p-6" aria-label="移动导航">
          <NuxtLink
            v-for="item in primaryNavigation"
            :key="item.to"
            :to="item.to"
            class="text-body-lg text-ink-200 px-3 py-3 outline-none rounded-sm inline-flex gap-3 transition-colors duration-240 items-center hover:text-ink-50 hover:bg-ink-850"
            active-class="text-ink-50 bg-ink-850"
            :target="item.external ? '_blank' : undefined"
            :rel="item.external ? 'noopener noreferrer' : undefined"
            @click="open = false"
          >
            <span :class="item.icon" class="text-xl" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </aside>
    </div>
  </Transition>
</template>

<style scoped>
.menu-icon__line {
  stroke: currentcolor;
  stroke-width: 1.75;
  stroke-linecap: round;
  transform-box: fill-box;
  transform-origin: center;
  transition:
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms ease;
}

.menu-icon--open .menu-icon__line--top {
  transform: translateY(6px) rotate(45deg);
}

.menu-icon--open .menu-icon__line--middle {
  opacity: 0;
  transform: scaleX(0.3);
}

.menu-icon--open .menu-icon__line--bottom {
  transform: translateY(-6px) rotate(-45deg);
}

.nav-drawer-shell {
  position: fixed;
  z-index: 60;
  inset: 3.5rem 0 0;
  display: flex;
  justify-content: flex-end;
}

.nav-drawer-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(8 9 11 / 62%);
  cursor: default;
  outline: none;
  backdrop-filter: blur(2px);
}

.nav-drawer-panel {
  position: relative;
  width: min(26rem, 100vw);
  height: 100%;
  overflow-y: auto;
  border-left: 1px solid #1d232a;
  background: #0b0d10;
  box-shadow: -1.5rem 0 4rem rgb(0 0 0 / 35%);
}

.nav-drawer-enter-active,
.nav-drawer-leave-active {
  transition: opacity 240ms ease;
}

.nav-drawer-enter-active .nav-drawer-panel {
  transition: transform 520ms cubic-bezier(0.16, 1.18, 0.3, 1);
}

.nav-drawer-leave-active .nav-drawer-panel {
  transition: transform 240ms cubic-bezier(0.55, 0, 1, 0.45);
}

.nav-drawer-enter-from,
.nav-drawer-leave-to {
  opacity: 0;
}

.nav-drawer-enter-from .nav-drawer-panel,
.nav-drawer-leave-to .nav-drawer-panel {
  transform: translateX(100%);
}

@media (min-width: 48rem) {
  .nav-drawer-shell {
    inset-block-start: 4rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .menu-icon__line,
  .nav-drawer-enter-active,
  .nav-drawer-leave-active,
  .nav-drawer-enter-active .nav-drawer-panel,
  .nav-drawer-leave-active .nav-drawer-panel {
    transition-duration: 1ms;
  }
}
</style>
