import type { MaybeRefOrGetter } from 'vue'
import { onMounted, onUnmounted, readonly, shallowRef, toValue, watch } from 'vue'

export interface ContentTocScrollspyLink {
  children?: ContentTocScrollspyLink[]
  id: string
}

export function useContentTocScrollspy(
  links: MaybeRefOrGetter<ContentTocScrollspyLink[]>,
) {
  const observer = shallowRef<IntersectionObserver>()
  const visibleHeadings = shallowRef<string[]>([])
  const activeHeadings = shallowRef<string[]>([])

  function observerCallback(entries: IntersectionObserverEntry[]): void {
    const visible = new Set(visibleHeadings.value)
    let changed = false

    for (const entry of entries) {
      const id = entry.target.id
      if (!id)
        continue

      if (entry.isIntersecting && !visible.has(id)) {
        visible.add(id)
        changed = true
      }
      else if (!entry.isIntersecting && visible.delete(id)) {
        changed = true
      }
    }

    if (changed)
      visibleHeadings.value = [...visible]
  }

  function updateHeadings(headings: Element[]): void {
    if (!observer.value)
      return

    observer.value.disconnect()
    visibleHeadings.value = []
    for (const heading of headings)
      observer.value.observe(heading)
  }

  function refreshHeadings(): void {
    const flatLinks = flattenLinks(toValue(links))
    if (!flatLinks.length) {
      updateHeadings([])
      activeHeadings.value = []
      return
    }

    const selector = flatLinks.map(link => `#${CSS.escape(link.id)}`).join(', ')
    updateHeadings(Array.from(document.querySelectorAll(selector)))
  }

  watch(visibleHeadings, (value, oldValue) => {
    activeHeadings.value = value.length ? value : oldValue
  })

  onMounted(() => {
    observer.value = new IntersectionObserver(observerCallback)
  })

  onUnmounted(() => observer.value?.disconnect())

  return {
    activeHeadings: readonly(activeHeadings),
    refreshHeadings,
  }
}

function flattenLinks(links: ContentTocScrollspyLink[]): ContentTocScrollspyLink[] {
  return links.flatMap(link => [link, ...flattenLinks(link.children ?? [])])
}
