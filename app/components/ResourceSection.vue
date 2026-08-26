<script setup lang="ts">
import type { ResourceGroup } from '~/features/resources/types'

interface Props {
  group: ResourceGroup
}

defineProps<Props>()

function isExternalLink(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}
</script>

<template>
  <section>
    <header class="pb-group border-b border-ink-700">
      <h2 data-text-reveal="heading" class="font-display text-h2 text-ink-50">
        {{ group.title }}
      </h2>
      <p v-if="group.description" data-text-reveal="line" class="text-sm text-ink-300 leading-relaxed mt-item max-w-prose">
        {{ group.description }}
      </p>
    </header>

    <ul v-if="group.items.length" class="m-0 p-0 list-none gap-x-8 grid md:grid-cols-2 xl:grid-cols-3">
      <li v-for="item in group.items" :key="item.href" class="border-b border-ink-700">
        <NuxtLink
          data-text-reveal="line"
          class="group text-ink-200 py-5 rounded-sm no-underline flex gap-4 min-h-20 transition-colors duration-240 items-start hover:text-ink-50 focus-ring"
          :external="isExternalLink(item.href)"
          :rel="isExternalLink(item.href) ? 'noopener noreferrer' : undefined"
          :target="isExternalLink(item.href) ? '_blank' : undefined"
          :to="item.href"
        >
          <span class="text-accent rounded-sm bg-ink-850 flex shrink-0 h-11 w-11 items-center justify-center overflow-hidden">
            <NuxtImg
              v-if="item.imageUrl"
              class="h-full w-full transition-transform duration-240 object-contain group-hover:scale-110 motion-reduce:transition-none"
              :src="item.imageUrl"
              alt=""
              width="32"
              height="32"
              provider="none"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
            />
            <span
              v-else
              :class="item.icon ?? 'i-lucide-link-2'"
              class="text-2xl"
              aria-hidden="true"
            />
          </span>
          <span class="flex-1 min-w-0 transition-transform duration-150 group-hover:translate-x-0.5">
            <span class="font-bold flex gap-2 items-center">
              <span class="truncate">{{ item.title }}</span>
              <span
                v-if="isExternalLink(item.href)"
                class="i-lucide-arrow-up-right text-sm opacity-0 shrink-0 translate-y-0.5 transition-[opacity,transform] duration-150 group-hover:opacity-100 group-hover:translate-y-0 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </span>
            <span class="text-sm text-ink-300 leading-relaxed mt-1 block">
              {{ item.description }}
            </span>
          </span>
        </NuxtLink>
      </li>
    </ul>

    <p v-else class="text-sm text-ink-300 py-6 border-b border-ink-700">
      暂无条目。
    </p>
  </section>
</template>
