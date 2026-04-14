<script setup lang="ts">
import { gsap } from 'gsap'
import { onMounted, onScopeDispose, useTemplateRef } from 'vue'

interface NavItem {
  external?: boolean
  icon: `i-carbon-${string}` | `i-lucide-${string}`
  name: string
  path: string
}

const header = useTemplateRef<HTMLElement>('header')

let tween: gsap.core.Tween | undefined

const isHome = useRoute().path === '/'

onMounted(() => {
  if (!header.value)
    return

  tween = gsap.from(header.value, {
    duration: 0.4,
    autoAlpha: 0,
    delay: isHome ? 1 : 0,
  })
})

onScopeDispose(() => tween?.kill())

const navList: readonly NavItem[] = [
  { name: '文章', path: '/blog', icon: 'i-carbon-container-image' },
  // { name: 'Projects', path: '/projects', icon: 'i-lucide-code' },
  { name: '导航', path: '/collections', icon: 'i-lucide-bookmark' },
  { name: 'Use', path: '/use', icon: 'i-carbon-tools-alt' },
  { name: '', path: 'https://github.com/setobox', icon: 'i-carbon-logo-github' },
]
</script>

<template>
  <header ref="header" class="font-mono container px-4 lg:px-6">
    <div class="flex h-20 items-center md:h-18">
      <h1 class="mr-auto">
        <NuxtLink class="inline-flex h-11 w-11 items-center justify-center" to="/" aria-label="Home">
          <img class="rounded-full h-10 w-10" src="/avatar.jpg" alt="Setobox">
        </NuxtLink>
      </h1>
      <nav aria-label="Primary navigation">
        <ul class="flex gap-1 md:gap-4 sm:gap-2">
          <li v-for="nav in navList" :key="nav.name">
            <NuxtLink
              class="text-fg-3 font-bold inline-flex gap-2 h-11 w-10 transition-colors duration-150 items-center justify-center hover:text-fg-1 md:px-1 focus-visible:outline-2 focus-visible:outline-fg-3 focus-visible:outline-offset-2 md:w-auto"
              active-class="text-fg-1"
              :aria-label="nav.name"
              :rel="nav.external ? 'noopener noreferrer' : undefined"
              :target="nav.external ? nav.path.startsWith('http') ? '_blank' : undefined : undefined"
              :to="nav.path"
            >
              <span :class="nav.icon" class="text-xl" aria-hidden="true" />
              <span class="sr-only md:not-sr-only">
                {{ nav.name }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>
