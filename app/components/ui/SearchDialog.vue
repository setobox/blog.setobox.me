<script setup lang="ts">
import type { SearchHit } from '#shared/types/search'
import { onKeyStroke, useEventListener, useScrollLock } from '@vueuse/core'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { useSearch } from '~/composables/useSearch'
import { moveIndex, prepareGroups } from '~/features/search/results'

const open = defineModel<boolean>({ required: true })

const router = useRouter()
const { query, pending, failed, groups, flatHits, empty, load, reset } = useSearch()

const active = shallowRef(-1)
const input = useTemplateRef<HTMLInputElement>('input')
const list = useTemplateRef<HTMLElement>('list')

const scrollLocked = useScrollLock(import.meta.client ? document.body : null)

const rowGroups = computed(() => prepareGroups(groups.value))

const activeId = computed(() =>
  active.value >= 0 && flatHits.value[active.value]
    ? `search-option-${active.value}`
    : undefined,
)

watch(open, async (isOpen) => {
  scrollLocked.value = isOpen

  if (!isOpen) {
    reset()
    active.value = -1
    return
  }

  void load()
  await nextTick()
  input.value?.focus()
})

// A new query invalidates the old cursor: keep the first result preselected so
// Enter always has an obvious target.
watch(flatHits, (hits) => {
  active.value = hits.length ? 0 : -1
})

// Keep the active row in view when arrowing past the visible edge.
watch(active, async (index) => {
  if (index < 0)
    return
  await nextTick()
  list.value
    ?.querySelector(`#search-option-${index}`)
    ?.scrollIntoView({ block: 'nearest' })
})

function close() {
  open.value = false
}

function go(hit: SearchHit | undefined) {
  if (!hit)
    return

  if (hit.doc.external) {
    window.open(hit.doc.path, '_blank', 'noopener,noreferrer')
    close()
    return
  }

  close()
  void router.push(hit.doc.path)
}

function move(delta: number, event: KeyboardEvent) {
  if (!flatHits.value.length)
    return
  event.preventDefault()
  active.value = moveIndex(active.value, delta, flatHits.value.length)
}

onKeyStroke('ArrowDown', event => open.value && move(1, event))
onKeyStroke('ArrowUp', event => open.value && move(-1, event))

onKeyStroke('Escape', (event) => {
  if (!open.value)
    return
  event.preventDefault()
  close()
})

onKeyStroke('Enter', (event) => {
  if (!open.value || active.value < 0)
    return
  event.preventDefault()
  go(flatHits.value[active.value])
})

// Focus containment: the dialog is modal, so Tab must not reach the page behind
// it. Two sentinels are cheaper and less brittle than tracking every focusable.
const shell = useTemplateRef<HTMLElement>('shell')

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
    <Transition name="search">
      <div v-if="open" class="search-overlay" @pointerdown.self="close">
        <div
          ref="shell"
          class="search-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-dialog-label"
        >
          <h2 id="search-dialog-label" class="sr-only">
            站内搜索
          </h2>

          <div class="search-field">
            <span class="i-lucide-search text-ink-300 shrink-0" aria-hidden="true" />
            <input
              ref="input"
              v-model="query"
              type="search"
              class="search-input"
              placeholder="搜索文章、分类、标签、收藏…"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              role="combobox"
              aria-expanded="true"
              aria-controls="search-results"
              :aria-activedescendant="activeId"
              aria-describedby="search-hint"
            >
            <button type="button" class="search-dismiss focus-ring" @click="close">
              <span class="sr-only">关闭搜索</span>
              <kbd aria-hidden="true">Esc</kbd>
            </button>
          </div>

          <div
            v-if="pending && !groups.length"
            class="search-state"
            role="status"
          >
            <span class="i-lucide-loader-circle animate-spin" aria-hidden="true" />
            <span>正在加载索引…</span>
          </div>

          <div v-else-if="failed" class="search-state" role="alert">
            <span class="i-lucide-circle-alert text-layer-motion" aria-hidden="true" />
            <span>索引加载失败。</span>
            <button type="button" class="search-retry focus-ring" @click="load()">
              重试
            </button>
          </div>

          <p v-else-if="empty" class="search-state" role="status">
            <span class="i-lucide-search-x" aria-hidden="true" />
            <span>没有匹配的结果。</span>
          </p>

          <p v-else-if="!groups.length" class="search-state text-ink-400">
            <span class="i-lucide-corner-down-left" aria-hidden="true" />
            <span>输入关键词开始搜索。</span>
          </p>

          <div v-else id="search-results" ref="list" class="search-results" role="listbox">
            <section v-for="group in rowGroups" :key="group.kind" class="search-group">
              <h3 class="search-group__label">
                <span :class="group.icon" aria-hidden="true" />
                <span>{{ group.label }}</span>
                <span class="search-group__count">{{ group.rows.length }}</span>
              </h3>

              <NuxtLink
                v-for="row in group.rows"
                :id="`search-option-${row.index}`"
                :key="row.hit.doc.id"
                :to="row.hit.doc.path"
                :target="row.hit.doc.external ? '_blank' : undefined"
                :rel="row.hit.doc.external ? 'noopener noreferrer' : undefined"
                class="search-hit"
                :class="{ 'search-hit--active': row.index === active }"
                role="option"
                :aria-selected="row.index === active"
                @pointermove="active = row.index"
                @click="close"
              >
                <span class="search-hit__title">
                  <span
                    v-for="(segment, index) in row.title"
                    :key="index"
                    :class="segment.match ? 'search-mark' : undefined"
                  >{{ segment.text }}</span>
                  <span
                    v-if="row.hit.doc.external"
                    class="i-lucide-arrow-up-right text-ink-400 shrink-0"
                    aria-hidden="true"
                  />
                </span>

                <span v-if="row.description.length" class="search-hit__meta">
                  <span
                    v-for="(segment, index) in row.description"
                    :key="index"
                    :class="segment.match ? 'search-mark' : undefined"
                  >{{ segment.text }}</span>
                </span>

                <span v-if="row.excerpt.length" class="search-hit__excerpt">
                  <span
                    v-for="(segment, index) in row.excerpt"
                    :key="index"
                    :class="segment.match ? 'search-mark' : undefined"
                  >{{ segment.text }}</span>
                </span>
              </NuxtLink>
            </section>
          </div>

          <p id="search-hint" class="search-hint">
            <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
            <span><kbd>Enter</kbd> 打开</span>
            <span><kbd>Esc</kbd> 关闭</span>
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.search-overlay {
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
  .search-overlay {
    padding-top: 8vh;
  }
}

.search-shell {
  display: flex;
  width: 100%;
  max-width: 40rem;
  max-height: min(32rem, 100%);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #2a323c;
  border-radius: 0.75rem;
  background: #0f1216;
  box-shadow: 0 1.5rem 4rem rgb(0 0 0 / 45%);
}

.search-field {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #1d232a;
}

.search-input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  color: #f2f5f8;
  font-size: 1rem;
  outline: none;
}

.search-input::placeholder {
  color: #5a6674;
}

/* The UA search-cancel button collides with our own Esc affordance. */
.search-input::-webkit-search-cancel-button {
  appearance: none;
}

.search-dismiss {
  flex-shrink: 0;
  border: 0;
  border-radius: 0.25rem;
  background: transparent;
  cursor: pointer;
}

.search-field kbd,
.search-hint kbd {
  padding: 0.125rem 0.375rem;
  border: 1px solid #2a323c;
  border-radius: 0.25rem;
  background: #14181d;
  color: #8a96a4;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  line-height: 1.4;
}

.search-dismiss:hover kbd {
  border-color: #3d4754;
  color: #b8c2ce;
}

.search-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0;
  padding: 2.5rem 1rem;
  color: #8a96a4;
  font-size: 0.875rem;
}

.search-retry {
  border: 0;
  background: transparent;
  color: var(--c-accent);
  cursor: pointer;
  font-size: inherit;
  text-underline-offset: 4px;
}

.search-retry:hover {
  text-decoration: underline;
}

.search-results {
  min-height: 0;
  flex: 1;
  padding: 0.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.search-group + .search-group {
  margin-top: 0.5rem;
}

.search-group__label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
  padding: 0.5rem 0.625rem 0.375rem;
  color: #5a6674;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.search-group__count {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.search-hit {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  padding: 0.5rem 0.625rem;
  border-left: 2px solid transparent;
  border-radius: 0.375rem;
  color: inherit;
  text-decoration: none;
}

.search-hit--active {
  border-left-color: var(--c-accent);
  background: #14181d;
}

.search-hit__title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: #f2f5f8;
  font-size: 0.9375rem;
  line-height: 1.4;
}

.search-hit__meta,
.search-hit__excerpt {
  overflow: hidden;
  color: #8a96a4;
  font-size: 0.8125rem;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-hit__excerpt {
  color: #5a6674;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
}

.search-mark {
  border-radius: 0.125rem;
  background: rgb(255 90 122 / 18%);
  color: #f2f5f8;
  font-weight: 500;
}

.search-hint {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 0.875rem;
  margin: 0;
  padding: 0.625rem 1rem;
  border-top: 1px solid #1d232a;
  color: #5a6674;
  font-size: 0.75rem;
}

.search-hint span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.search-enter-active,
.search-leave-active {
  transition: opacity 160ms ease;
}

.search-enter-active .search-shell,
.search-leave-active .search-shell {
  transition:
    transform 160ms ease,
    opacity 160ms ease;
}

.search-enter-from,
.search-leave-to {
  opacity: 0;
}

.search-enter-from .search-shell,
.search-leave-to .search-shell {
  transform: translateY(-0.5rem) scale(0.99);
}

@media (prefers-reduced-motion: reduce) {
  .search-enter-active,
  .search-leave-active,
  .search-enter-active .search-shell,
  .search-leave-active .search-shell {
    transition-duration: 1ms;
  }

  .search-enter-from .search-shell,
  .search-leave-to .search-shell {
    transform: none;
  }
}
</style>
