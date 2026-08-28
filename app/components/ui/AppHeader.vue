<script setup lang="ts">
import { onKeyStroke, useMediaQuery } from '@vueuse/core'
import { nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import UiSearchDialog from '~/components/ui/SearchDialog.vue'
import { primaryNavigation } from '~/features/shell/navigation'

const route = useRoute()
const open = shallowRef(false)
const searchOpen = shallowRef(false)
const isDesktop = useMediaQuery('(min-width: 80rem)')
const drawer = useTemplateRef<HTMLElement>('drawer')
const toggle = useTemplateRef<HTMLButtonElement>('toggle')

watch(() => route.fullPath, () => {
  open.value = false
})

watch(isDesktop, (desktop) => {
  if (desktop)
    open.value = false
})

onKeyStroke('Escape', (event) => {
  // The search dialog owns Escape while it is open.
  if (!open.value || searchOpen.value)
    return

  event.preventDefault()
  open.value = false
})

onKeyStroke('k', (event) => {
  if (!event.metaKey && !event.ctrlKey)
    return

  event.preventDefault()
  open.value = false
  searchOpen.value = true
})

watch(open, async (isOpen) => {
  await nextTick()
  if (isOpen)
    drawer.value?.querySelector<HTMLAnchorElement>('a')?.focus()
  else if (!isDesktop.value)
    toggle.value?.focus()
})
</script>

<template>
  <header class="border-b border-ink-800 bg-ink-950/70 inset-x-0 top-0 fixed backdrop-blur-md z-header">
    <a
      href="#main-content"
      class="sr-only focus:text-sm focus:text-ink-950 focus:px-3 focus:py-2 focus:rounded-sm focus:bg-accent focus:left-4 focus:top-4 focus:absolute focus:not-sr-only focus:z-overlay"
    >
      跳到主内容
    </a>

    <div class="container-wide flex h-14 items-center justify-between md:h-16">
      <NuxtLink
        to="/blog"
        class="outline-none rounded-full inline-flex h-11 w-11 items-center justify-center"
        aria-label="返回博客首页"
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
          type="button"
          class="text-ink-200 text-ink-400 ml-4 outline-none rounded-sm flex h-10 w-10 cursor-pointer transition-colors duration-240 items-center justify-center hover:text-ink-50 hover:text-ink-50 xl:px-2.5 xl:border xl:border-ink-700 xl:gap-2 xl:h-9 xl:w-40 xl:hover:border-ink-500"
          aria-label="搜索文章"
          aria-keyshortcuts="Meta+K Control+K"
          @click="searchOpen = true"
        >
          <span class="i-lucide-search text-sm" aria-hidden="true" />
          <span class="text-sm hidden xl:inline">Search</span>
          <kbd class="text-xs font-mono hidden xl:inline">⌘+K</kbd>
        </button>

        <button
          ref="toggle"
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

  <UiSearchDialog v-model="searchOpen" />

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
  transition: opacity var(--motion-fast) ease;
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
</style>
