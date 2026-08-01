<script lang="ts">
import type { Component, CSSProperties, VNode } from 'vue'
</script>

<script setup lang="ts" generic="T extends ContentTocLink">
import { createReusableTemplate, useScroll } from '@vueuse/core'
import { computed, nextTick, onMounted, onUnmounted, shallowRef, useId, useTemplateRef, watch } from 'vue'

export type ContentTocClass
  = | string
    | Record<string, boolean | undefined>
    | ContentTocClass[]
    | false
    | null
    | undefined

export type ContentTocColor
  = | 'primary'
    | 'secondary'
    | 'success'
    | 'info'
    | 'warning'
    | 'error'
    | 'neutral'
    | string

export type ContentTocHighlightVariant = 'straight' | 'circuit'

export type ContentTocUiSlot
  = | 'root'
    | 'container'
    | 'top'
    | 'bottom'
    | 'trigger'
    | 'title'
    | 'trailing'
    | 'trailingIcon'
    | 'content'
    | 'list'
    | 'listWithChildren'
    | 'item'
    | 'itemWithChildren'
    | 'link'
    | 'linkText'
    | 'indicator'
    | 'indicatorLine'
    | 'indicatorActive'

export type ContentTocUi = Partial<Record<ContentTocUiSlot, ContentTocClass>>
export type ContentTocResolvedUi = Record<ContentTocUiSlot, ContentTocClass>

export interface ContentTocLink {
  children?: ContentTocLink[]
  class?: ContentTocClass
  depth?: number
  id: string
  text: string
  ui?: Pick<ContentTocUi, 'item' | 'itemWithChildren' | 'link' | 'linkText'>
}

export interface ContentTocProps<T extends ContentTocLink = ContentTocLink> {
  as?: string | Component
  class?: ContentTocClass
  color?: ContentTocColor
  defaultOpen?: boolean
  highlight?: boolean
  highlightColor?: ContentTocColor
  highlightVariant?: ContentTocHighlightVariant
  links?: T[]
  open?: boolean
  title?: string
  trailingIcon?: string
  ui?: ContentTocUi
}

export interface ContentTocEmits {
  'move': [id: string]
  'update:open': [value: boolean]
}

export interface ContentTocSlots<T extends ContentTocLink = ContentTocLink> {
  leading?: (props: { open: boolean, ui: ContentTocResolvedUi }) => VNode[]
  default?: (props: { open: boolean }) => VNode[]
  trailing?: (props: { open: boolean, ui: ContentTocResolvedUi }) => VNode[]
  content?: (props: { links: T[] }) => VNode[]
  link?: (props: { link: T }) => VNode[]
  top?: (props: { links?: T[] }) => VNode[]
  bottom?: (props: { links?: T[] }) => VNode[]
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<ContentTocProps<T>>(), {
  as: 'nav',
  color: 'primary',
  defaultOpen: false,
  highlight: false,
  highlightVariant: 'straight',
  open: undefined,
  title: '目录',
  trailingIcon: 'i-lucide-chevron-down',
})

const emit = defineEmits<ContentTocEmits>()
const slots = defineSlots<ContentTocSlots<T>>()

const router = useRouter()
const nuxtApp = useNuxtApp()
const contentId = `content-toc-${useId()}`
const contentRef = useTemplateRef<HTMLElement>('content')
const internalOpen = shallowRef(props.open ?? props.defaultOpen)
const links = computed(() => props.links ?? [])
const isOpen = computed(() => props.open ?? internalOpen.value)
const flatLinks = computed(() => flattenLinks(links.value))
const { activeHeadings, refreshHeadings } = useContentTocScrollspy(links)
const { arrivedState } = useScroll(contentRef)

const [DefineList, ReuseList] = createReusableTemplate<{
  level: number
  links: T[]
}>()
const [DefineTrigger, ReuseTrigger] = createReusableTemplate<{ open: boolean }>()
const [DefineContent, ReuseContent] = createReusableTemplate()

const linkHeight = 1.75

const activeIndex = computed(() => {
  if (!activeHeadings.value.length)
    return -1

  return flatLinks.value.findIndex(link => activeHeadings.value.includes(link.id))
})

const listStyle = computed(() => ({
  '--list-height': `${flatLinks.value.length * linkHeight}rem`,
}))

const indicatorStyle = computed(() => {
  if (!activeHeadings.value.length)
    return undefined

  return {
    '--indicator-position': activeIndex.value >= 0 ? `${activeIndex.value * linkHeight}rem` : '0rem',
    '--indicator-size': `${linkHeight * activeHeadings.value.length}rem`,
  }
})

const circuitMaskStyle = computed<CSSProperties | undefined>(() => {
  if (!props.highlight || props.highlightVariant !== 'circuit' || !links.value.length)
    return undefined

  const flattenedLinks = flattenLinksWithLevel(links.value)
  const svgUnit = 16
  const svgLinkHeight = linkHeight * svgUnit
  const svgHeight = flattenedLinks.length * svgLinkHeight
  const rootX = 0.5
  const childX = 10.5
  let path = ''
  let currentX = rootX
  let y = 0

  flattenedLinks.forEach((item, index) => {
    const targetX = item.level > 0 ? childX : rootX
    const nextY = y + svgLinkHeight

    if (index === 0) {
      path += `M${targetX} ${y}`
      currentX = targetX
    }

    if (targetX !== currentX) {
      path += ` L${targetX} ${y + 6}`
      currentX = targetX
    }

    const changesLevel = index < flattenedLinks.length - 1
      && flattenedLinks[index + 1]?.level !== item.level
    path += ` L${currentX} ${nextY - (changesLevel ? 6 : 0)}`
    y = nextY
  })

  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 ${svgHeight}'><path d='${path}' stroke='black' stroke-width='1' fill='none'/></svg>`,
  )
  const maskImage = `url("data:image/svg+xml,${svg}")`

  return {
    height: `${flattenedLinks.length * linkHeight}rem`,
    maskImage,
    WebkitMaskImage: maskImage,
    width: '0.75rem',
  }
})

const rootStyle = computed(() => ({
  '--content-toc-active-color': resolveColor(props.color),
  '--content-toc-highlight-color': resolveColor(props.highlightColor ?? props.color),
}))

const scrollShadowStyle = computed<CSSProperties | undefined>(() => {
  void (arrivedState.top, arrivedState.bottom)
  const element = contentRef.value
  if (!element || element.scrollHeight <= element.clientHeight)
    return undefined

  const showTop = !arrivedState.top
  const showBottom = !arrivedState.bottom
  if (!showTop && !showBottom)
    return undefined

  if (showTop && showBottom) {
    return {
      maskImage: 'linear-gradient(180deg, transparent, #000 24px, #000 calc(100% - 24px), transparent)',
    }
  }

  return {
    maskImage: showTop
      ? 'linear-gradient(180deg, transparent, #000 24px)'
      : 'linear-gradient(180deg, #000, #000 calc(100% - 24px), transparent)',
  }
})

const resolvedUi = computed<ContentTocResolvedUi>(() => {
  const straight = props.highlight && props.highlightVariant === 'straight'
  const circuit = props.highlight && props.highlightVariant === 'circuit'

  return {
    root: [
      'sticky top-0 z-10 w-full bg-bg-1 lg:top-8 lg:z-auto lg:bg-transparent',
      props.ui?.root,
    ],
    container: [
      'flex flex-col border-b border-dashed border-fg-7 pb-3 pt-3 lg:min-h-0 lg:border-0 lg:py-0',
      props.ui?.container,
    ],
    top: ['lg:shrink-0', props.ui?.top],
    bottom: ['hidden flex-col gap-6 lg:flex lg:shrink-0', props.ui?.bottom],
    trigger: [
      'group flex min-h-11 flex-1 items-center gap-1.5 rounded-sm py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-fg-3 focus-visible:outline-offset-2 lg:shrink-0',
      props.ui?.trigger,
    ],
    title: ['truncate', props.ui?.title],
    trailing: ['ml-auto inline-flex items-center gap-1.5', props.ui?.trailing],
    trailingIcon: [
      'size-5 shrink-0 transform transition-transform duration-200 ease-out lg:hidden',
      isOpen.value && 'rotate-180',
      props.ui?.trailingIcon,
    ],
    content: [
      'relative focus:outline-none lg:min-h-[min(var(--list-height,8rem),8rem)] lg:overflow-y-auto',
      props.ui?.content,
    ],
    list: [
      'min-w-0 list-none m-0 p-0',
      straight && 'ml-2.5 border-l border-fg-7 pl-4',
      circuit && 'pl-6.5',
      props.ui?.list,
    ],
    listWithChildren: ['ml-3 list-none m-0 p-0', props.ui?.listWithChildren],
    item: ['min-w-0', straight && '-ml-px', props.ui?.item],
    itemWithChildren: [circuit && 'pl-px', props.ui?.itemWithChildren],
    link: [
      'relative flex min-h-7 items-center rounded-sm py-1 text-sm text-fg-4 leading-5 no-underline outline-current-1/25 transition-colors hover:text-fg-2 focus-visible:outline-2',
      props.ui?.link,
    ],
    linkText: ['truncate', props.ui?.linkText],
    indicator: [
      straight && 'absolute ml-2.5 h-[var(--indicator-size)] w-px translate-y-[var(--indicator-position)] rounded-full transition-[translate,height] duration-200 ease-out motion-reduce:transition-none',
      circuit && 'absolute left-0 top-0 ml-2.5',
      props.ui?.indicator,
    ],
    indicatorLine: [
      straight && 'hidden',
      circuit && 'absolute inset-0 bg-fg-7',
      props.ui?.indicatorLine,
    ],
    indicatorActive: [
      straight && 'h-full w-full',
      circuit && 'absolute h-[var(--indicator-size)] w-full translate-y-[var(--indicator-position)] transition-[translate,height] duration-200 ease-out motion-reduce:transition-none',
      props.ui?.indicatorActive,
    ],
  }
})

function flattenLinks(items: T[]): T[] {
  return items.flatMap(link => [
    link,
    ...flattenLinks((link.children ?? []) as T[]),
  ])
}

function flattenLinksWithLevel(items: T[], level = 0): { level: number, link: T }[] {
  return items.flatMap(link => [
    { level, link },
    ...flattenLinksWithLevel((link.children ?? []) as T[], level + 1),
  ])
}

function resolveColor(color: ContentTocColor | undefined): string {
  const semanticColors: Record<string, string> = {
    error: 'var(--hex-red-1)',
    info: 'var(--hex-sky-1)',
    neutral: 'var(--hex-fg-1)',
    primary: 'var(--hex-current-1)',
    secondary: 'var(--hex-current-2)',
    success: 'var(--hex-green-1)',
    warning: 'var(--hex-yellow-1)',
  }
  const paletteColors = new Set([
    'black',
    'white',
    'red',
    'corail',
    'orange',
    'yellow',
    'citrus',
    'lime',
    'green',
    'turquoise',
    'cyan',
    'sky',
    'sega',
    'king',
    'indigo',
    'lavender',
    'purple',
    'magenta',
    'pink',
    'fg',
    'current',
  ])

  if (!color)
    return semanticColors.primary!
  if (semanticColors[color])
    return semanticColors[color]
  if (paletteColors.has(color))
    return `var(--hex-${color}-1)`
  return color
}

function setOpen(value: boolean): void {
  if (props.open === undefined)
    internalOpen.value = value
  emit('update:open', value)
}

function scrollToHeading(id: string): void {
  void router.push(`#${encodeURIComponent(id)}`)
  emit('move', id)
}

watch(activeIndex, async (index) => {
  if (index < 0)
    return

  await nextTick()
  const container = contentRef.value
  const activeLink = container?.querySelectorAll<HTMLElement>('a[data-slot="link"]')[index]
  if (!container || !activeLink)
    return

  const containerRect = container.getBoundingClientRect()
  const linkRect = activeLink.getBoundingClientRect()
  const linkOffset = linkRect.top - containerRect.top + container.scrollTop
  container.scrollTo({
    behavior: 'smooth',
    top: linkOffset - container.clientHeight / 2 + linkRect.height / 2,
  })
})

watch(
  links,
  async () => {
    await nextTick()
    refreshHeadings()
  },
  { deep: true },
)

async function refreshAfterRender(): Promise<void> {
  await nextTick()
  refreshHeadings()
}

const offPageFinish = nuxtApp.hooks.hook('page:finish', refreshAfterRender)
const offLoadingEnd = nuxtApp.hooks.hook('page:loading:end', refreshAfterRender)
const offTransitionFinish = nuxtApp.hooks.hook('page:transition:finish', refreshAfterRender)

onMounted(refreshAfterRender)

onUnmounted(() => {
  offPageFinish()
  offLoadingEnd()
  offTransitionFinish()
})
</script>

<template>
  <DefineList v-slot="{ links: items, level }">
    <ul :class="level > 0 ? resolvedUi.listWithChildren : resolvedUi.list">
      <li
        v-for="link in items"
        :key="link.id"
        :class="[
          link.children?.length ? resolvedUi.itemWithChildren : resolvedUi.item,
          link.children?.length ? link.ui?.itemWithChildren : link.ui?.item,
        ]"
      >
        <a
          :href="`#${encodeURIComponent(link.id)}`"
          data-slot="link"
          :class="[resolvedUi.link, link.ui?.link, link.class]"
          :style="activeHeadings.includes(link.id) ? { color: 'var(--content-toc-active-color)' } : undefined"
          :aria-current="activeHeadings.includes(link.id) ? 'location' : undefined"
          @click.prevent="scrollToHeading(link.id)"
        >
          <slot name="link" :link="link">
            <span data-slot="linkText" :class="[resolvedUi.linkText, link.ui?.linkText]">
              {{ link.text }}
            </span>
          </slot>
        </a>

        <ReuseList
          v-if="link.children?.length"
          :links="(link.children as T[])"
          :level="level + 1"
        />
      </li>
    </ul>
  </DefineList>

  <DefineTrigger v-slot="{ open: expanded }">
    <slot name="leading" :open="expanded" :ui="resolvedUi" />

    <span data-slot="title" :class="resolvedUi.title">
      <slot :open="expanded">{{ props.title }}</slot>
    </span>

    <span data-slot="trailing" :class="resolvedUi.trailing">
      <slot name="trailing" :open="expanded" :ui="resolvedUi">
        <span
          data-slot="trailingIcon"
          :class="[props.trailingIcon, resolvedUi.trailingIcon]"
          aria-hidden="true"
        />
      </slot>
    </span>
  </DefineTrigger>

  <DefineContent>
    <div
      v-if="props.highlight"
      data-slot="indicator"
      :class="resolvedUi.indicator"
      :style="[indicatorStyle, circuitMaskStyle]"
      aria-hidden="true"
    >
      <div data-slot="indicatorLine" :class="resolvedUi.indicatorLine" />
      <div
        v-if="indicatorStyle"
        data-slot="indicatorActive"
        :class="resolvedUi.indicatorActive"
        :style="{ backgroundColor: 'var(--content-toc-highlight-color)' }"
      />
    </div>

    <slot name="content" :links="links">
      <ReuseList :links="links" :level="0" />
    </slot>
  </DefineContent>

  <component
    :is="props.as"
    v-bind="$attrs"
    data-slot="root"
    :class="[resolvedUi.root, props.class]"
    :style="rootStyle"
    :aria-label="$attrs['aria-label'] as string || '文章目录'"
  >
    <div data-slot="container" :class="resolvedUi.container">
      <div v-if="slots.top" data-slot="top" :class="resolvedUi.top">
        <slot name="top" :links="props.links" />
      </div>

      <template v-if="links.length">
        <button
          data-slot="trigger"
          type="button"
          class="lg:hidden" :class="[resolvedUi.trigger]"
          :aria-controls="contentId"
          :aria-expanded="isOpen"
          @click="setOpen(!isOpen)"
        >
          <ReuseTrigger :open="isOpen" />
        </button>

        <div
          v-show="isOpen"
          :id="contentId"
          data-slot="content"
          class="pb-3 max-h-80 overflow-y-auto lg:hidden" :class="[resolvedUi.content]"
          :data-state="isOpen ? 'open' : 'closed'"
        >
          <ReuseContent />
        </div>

        <p data-slot="trigger" class="m-0 hidden lg:flex" :class="[resolvedUi.trigger]">
          <ReuseTrigger :open="isOpen" />
        </p>

        <div
          ref="content"
          data-slot="content"
          class="overscroll-contain max-h-[calc(100vh-7rem)] hidden lg:flex lg:flex-col" :class="[resolvedUi.content]"
          :style="[listStyle, scrollShadowStyle]"
        >
          <ReuseContent />
        </div>
      </template>

      <div
        v-if="slots.bottom"
        data-slot="bottom"
        :class="[resolvedUi.bottom, (slots.top || links.length) && 'mt-6']"
      >
        <slot name="bottom" :links="props.links" />
      </div>
    </div>
  </component>
</template>
