<script setup lang="ts">
import { onKeyStroke, useEventListener, useScrollLock } from '@vueuse/core'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { useAiChat } from '../composables/useAiChat'
import AiChatMessage from './AiChatMessage.vue'

const open = defineModel<boolean>({ required: true })

const { busy, clear, error, messages, send, stop } = useAiChat()

const draft = shallowRef('')
const input = useTemplateRef<HTMLTextAreaElement>('input')
const shell = useTemplateRef<HTMLElement>('shell')
const list = useTemplateRef<HTMLElement>('list')

const scrollLocked = useScrollLock(import.meta.client ? document.body : null)

const empty = computed(() => !messages.value.length)

const SUGGESTIONS = [
  '这篇文章主要讲什么？',
  '你写过哪些 Nuxt 相关的文章？',
  '这个博客主要写什么内容？',
]

watch(open, async (isOpen) => {
  scrollLocked.value = isOpen
  if (!isOpen)
    return

  await nextTick()
  input.value?.focus()
})

// Pin to the newest message as the reply streams in.
watch(
  messages,
  async () => {
    await nextTick()
    list.value?.scrollTo({ top: list.value.scrollHeight })
  },
  { deep: true },
)

function close(): void {
  open.value = false
}

async function submit(text?: string): Promise<void> {
  const value = text ?? draft.value
  if (!value.trim())
    return

  draft.value = ''
  await send(value)
}

// Enter sends, Shift+Enter breaks the line.
function onEnter(event: KeyboardEvent): void {
  if (event.shiftKey)
    return

  event.preventDefault()
  void submit()
}

onKeyStroke('Escape', (event) => {
  if (!open.value)
    return
  event.preventDefault()
  close()
})

// Focus containment, matching the search dialog: two sentinels are cheaper and
// less brittle than tracking every focusable node.
useEventListener(shell, 'focusout', (event: FocusEvent) => {
  if (!open.value)
    return
  const next = event.relatedTarget as Node | null
  if (next && shell.value?.contains(next))
    return
  input.value?.focus()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="ai-chat-overlay" @pointerdown.self="close">
        <div
          ref="shell"
          class="ai-chat-shell dialog-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-chat-label"
        >
          <header class="px-4 py-3 border-b border-ink-800 flex shrink-0 gap-2 items-center">
            <span class="i-lucide-sparkles text-accent" aria-hidden="true" />
            <h2 id="ai-chat-label" class="text-sm text-ink-100 font-medium m-0">
              AI 助手
            </h2>

            <button
              v-if="!empty"
              type="button"
              class="text-xs text-ink-400 ml-auto px-2 py-1 border-0 rounded-sm bg-transparent cursor-pointer hover:text-ink-200 focus-ring"
              @click="clear"
            >
              清空
            </button>

            <button
              type="button"
              class="text-ink-400 p-1 border-0 rounded-sm bg-transparent cursor-pointer hover:text-ink-200 focus-ring"
              :class="empty ? 'ml-auto' : ''"
              aria-label="关闭对话"
              @click="close"
            >
              <span class="i-lucide-x" aria-hidden="true" />
            </button>
          </header>

          <div ref="list" class="ai-chat-body">
            <div v-if="empty" class="py-6 flex flex-col gap-3 items-center">
              <p class="text-sm text-ink-400 m-0">
                问我关于这个博客的任何问题。
              </p>
              <div class="flex flex-col gap-2 w-full">
                <button
                  v-for="item in SUGGESTIONS"
                  :key="item"
                  type="button"
                  class="text-sm text-ink-200 px-3 py-2 text-left surface surface-hover rounded-md cursor-pointer focus-ring"
                  @click="submit(item)"
                >
                  {{ item }}
                </button>
              </div>
            </div>

            <AiChatMessage
              v-for="message in messages"
              v-else
              :key="message.id"
              :message="message"
            />

            <p v-if="busy" class="text-xs text-ink-400 flex gap-2 items-center" role="status">
              <span class="i-lucide-loader-circle animate-spin" aria-hidden="true" />
              <span>正在思考…</span>
            </p>

            <p v-if="error" class="text-sm m-0 text-layer" role="alert">
              {{ error.message || "请求失败，请重试。" }}
            </p>
          </div>

          <footer class="p-3 border-t border-ink-800 flex shrink-0 gap-2 items-end">
            <textarea
              ref="input"
              v-model="draft"
              class="ai-chat-input"
              rows="1"
              placeholder="输入问题，Enter 发送"
              autocomplete="off"
              spellcheck="false"
              @keydown.enter="onEnter"
            />

            <button v-if="busy" type="button" class="btn-ghost shrink-0 focus-ring" @click="stop">
              停止
            </button>
            <button
              v-else
              type="button"
              class="btn-primary shrink-0 focus-ring"
              :disabled="!draft.trim()"
              @click="submit()"
            >
              发送
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.ai-chat-overlay {
  position: fixed;
  z-index: 60;
  display: flex;
  padding: 1rem;
  justify-content: center;
  inset: 0;
  backdrop-filter: blur(3px);
  background: rgb(8 9 11 / 72%);
}

@media (min-width: 768px) {
  .ai-chat-overlay {
    padding-top: 6vh;
  }
}

.ai-chat-shell {
  display: flex;
  width: 100%;
  max-width: 42rem;
  max-height: min(40rem, 100%);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--c-ink-700, #2a323c);
  border-radius: 0.75rem;
  background: var(--c-ink-900, #0f1216);
  box-shadow: 0 1.5rem 4rem rgb(0 0 0 / 45%);
}

.ai-chat-body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.ai-chat-input {
  min-width: 0;
  max-height: 8rem;
  flex: 1;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  outline: none;
  resize: none;
}
</style>
