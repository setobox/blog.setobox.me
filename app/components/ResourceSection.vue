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
    <header class="pb-4 border-b border-fg-7">
      <h2 class="text-2xl font-bold m-0 md:text-3xl">
        {{ group.title }}
      </h2>
      <p v-if="group.description" class="text-sm text-fg-4 leading-relaxed mb-0 mt-2 max-w-2xl">
        {{ group.description }}
      </p>
    </header>

    <ul v-if="group.items.length" class="m-0 p-0 list-none gap-x-8 grid md:grid-cols-2 xl:grid-cols-3">
      <li v-for="item in group.items" :key="item.href" class="border-b border-fg-7">
        <NuxtLink
          class="group text-fg-2 py-5 no-underline flex gap-4 min-h-20 transition-colors duration-150 items-start hover:text-fg-1 focus-visible:outline-2 focus-visible:outline-fg-3 focus-visible:outline-offset-2"
          :external="isExternalLink(item.href)"
          :rel="isExternalLink(item.href) ? 'noopener noreferrer' : undefined"
          :target="isExternalLink(item.href) ? '_blank' : undefined"
          :to="item.href"
        >
          <span class="text-fg-3 flex shrink-0 h-11 w-11 transition-colors duration-150 items-center justify-center group-hover:text-fg-1">
            <img
              v-if="item.imageUrl"
              class="h-8 w-8 object-contain"
              :src="item.imageUrl"
              alt=""
              loading="lazy"
              referrerpolicy="no-referrer"
            >
            <span
              v-else
              :class="item.icon ?? 'i-lucide-link-2'"
              class="text-xl"
              aria-hidden="true"
            />
          </span>
          <span class="flex-1 min-w-0 transition-transform duration-150 group-hover:translate-x-0.5">
            <span class="font-bold flex gap-2 items-center">
              <span class="truncate">{{ item.title }}</span>
              <span v-if="isExternalLink(item.href)" class="i-lucide-arrow-up-right text-sm shrink-0" aria-hidden="true" />
            </span>
            <span class="text-sm text-fg-4 leading-relaxed mt-1 block">
              {{ item.description }}
            </span>
          </span>
        </NuxtLink>
      </li>
    </ul>

    <p v-else class="text-sm text-fg-4 my-0 py-6 border-b border-fg-7">
      暂无条目。
    </p>
  </section>
</template>
