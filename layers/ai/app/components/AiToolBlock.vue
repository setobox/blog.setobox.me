<script setup lang="ts">
import type { AiToolState } from '../features/chat/blocks'
import { computed } from 'vue'

const props = defineProps<{
  name: string
  state: AiToolState
  input?: unknown
  output?: unknown
}>()

const LABELS: Record<string, string> = {
  get_current_page: '识别当前页面',
  get_site_context: '读取站点信息',
  read_article: '阅读文章',
  search_posts: '搜索文章',
}

const label = computed(() => LABELS[props.name] ?? props.name)

const view = computed(() => {
  if (props.state === 'output-error')
    return { icon: 'i-lucide-circle-alert', tone: 'text-layer', text: '失败' }

  if (props.state === 'output-available')
    return { icon: 'i-lucide-circle-check', tone: 'text-accent', text: '完成' }

  return { icon: 'i-lucide-loader-circle animate-spin', tone: 'text-ink-300', text: '调用中' }
})

/** Only the query is worth surfacing; full payloads belong in the model context. */
const detail = computed(() => {
  const input = props.input
  if (!input || typeof input !== 'object')
    return undefined

  const { query, path } = input as { query?: unknown, path?: unknown }

  if (typeof query === 'string' && query)
    return query
  if (typeof path === 'string' && path)
    return path

  return undefined
})
</script>

<template>
  <div
    class="text-xs px-3 py-2 border border-ink-700 rounded-md bg-ink-850/60 inline-flex gap-2 max-w-full items-center"
  >
    <span class="shrink-0" :class="[view.icon, view.tone]" aria-hidden="true" />
    <span class="text-ink-200">{{ label }}</span>
    <span v-if="detail" class="text-ink-400 font-mono truncate">{{ detail }}</span>
    <span class="text-ink-400 ml-auto shrink-0">{{ view.text }}</span>
  </div>
</template>
