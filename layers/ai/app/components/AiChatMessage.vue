<script setup lang="ts">
import type { UIMessage } from 'ai'
import { computed } from 'vue'
import { partsToBlocks } from '../features/chat/blocks'
import AiToolBlock from './AiToolBlock.vue'

const props = defineProps<{ message: UIMessage }>()

const blocks = computed(() => partsToBlocks(props.message))
const isUser = computed(() => props.message.role === 'user')
</script>

<template>
  <div class="flex flex-col gap-2" :class="isUser ? 'items-end' : 'items-start'">
    <template v-for="(block, index) in blocks" :key="index">
      <p
        v-if="block.type === 'text'"
        class="text-sm leading-relaxed px-3.5 py-2.5 rounded-lg max-w-[85%] whitespace-pre-wrap"
        :class="isUser ? 'bg-accent text-ink-950' : 'bg-ink-800 text-ink-100'"
      >
        {{ block.text }}
      </p>

      <AiToolBlock
        v-else-if="block.type === 'tool'"
        :name="block.name"
        :state="block.state"
        :input="block.input"
        :output="block.output"
      />

      <div v-else-if="block.type === 'citations'" class="flex flex-col gap-1.5 w-full">
        <p class="text-meta">
          参考文章
        </p>
        <NuxtLink
          v-for="item in block.items"
          :key="item.path"
          :to="item.path"
          class="text-sm text-ink-100 px-3 py-2 surface surface-hover rounded-md flex gap-2 items-center focus-ring"
        >
          <span class="i-lucide-file-text text-ink-400 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ item.title }}</span>
        </NuxtLink>
      </div>

      <p
        v-else-if="block.type === 'error'"
        class="text-sm px-3.5 py-2.5 border border-ink-700 rounded-lg text-layer"
      >
        {{ block.message }}
      </p>
    </template>
  </div>
</template>
