import type {
  GSAP,
  GSAPAnimation,
  GSAPScrollTrigger,
  GSAPSplitText,
  GSAPSplitTextInstance,
} from '#shared/types/gsap'
import type { Ref } from 'vue'
import { nextTick, onMounted, onScopeDispose, toValue, watch } from 'vue'

type HeadingEffect = 'hero' | 'standard'

interface UsePageEntranceOptions {
  animateInitial?: () => boolean
  enabled?: () => boolean
  headingEffect?: () => HeadingEffect
  revealInterval?: () => number
  revealMaxSpan?: () => number
}

type RevealKind = 'heading' | 'item' | 'line'
type RevealAnimation = 'chars' | 'lines' | 'block'

interface RevealTarget {
  animation: RevealAnimation
  element: HTMLElement
  kind: RevealKind
}

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [data-text-reveal="heading"]'
const ITEM_SELECTOR = '[data-page-item]'
const LINE_SELECTOR = [
  '[data-text-reveal="line"]',
  'p',
  'dt',
  'dd',
  'figcaption',
  '.prose li',
  '.prose blockquote',
  '.prose th',
  '.prose td',
].join(', ')
const IGNORE_SELECTOR = '[data-text-reveal-ignore], pre, code, script, style, svg, [aria-hidden="true"], .sr-only'

/** Registers one-shot, viewport-driven text reveals for the current layout subtree. */
export function usePageEntrance(
  target: Readonly<Ref<HTMLElement | null>>,
  options: UsePageEntranceOptions = {},
): void {
  const route = useRoute()
  const { gsap, loadPlugins } = useGsap()
  let disposeCurrent: (() => void) | null = null
  let runId = 0
  let stopRouteWatcher: (() => void) | null = null

  async function start(): Promise<void> {
    const currentRun = ++runId
    disposeCurrent?.()
    disposeCurrent = null

    if (!toValue(options.enabled ?? (() => true)))
      return

    await nextTick()
    await document.fonts.ready
    if (currentRun !== runId || !gsap || !target.value || !toValue(options.enabled ?? (() => true)))
      return

    const plugins = await loadPlugins(['ScrollTrigger', 'SplitText'] as const)
    if (currentRun !== runId || !plugins || !target.value)
      return

    disposeCurrent = createPageReveal(
      gsap,
      plugins.ScrollTrigger,
      plugins.SplitText,
      target.value,
      toValue(options.animateInitial ?? (() => true)),
      toValue(options.headingEffect ?? (() => 'standard')),
      toValue(options.revealInterval ?? (() => 0.07)),
      toValue(options.revealMaxSpan ?? (() => Number.POSITIVE_INFINITY)),
    )
  }

  onMounted(() => {
    stopRouteWatcher = watch(
      () => route.fullPath,
      () => void start(),
      { flush: 'post', immediate: true },
    )
  })

  onScopeDispose(() => {
    runId += 1
    stopRouteWatcher?.()
    stopRouteWatcher = null
    disposeCurrent?.()
    disposeCurrent = null
  })
}

function createPageReveal(
  gsap: GSAP,
  ScrollTrigger: GSAPScrollTrigger,
  SplitText: GSAPSplitText,
  root: HTMLElement,
  animateInitial: boolean,
  headingEffect: HeadingEffect,
  revealInterval: number,
  revealMaxSpan: number,
): () => void {
  const media = gsap.matchMedia()
  const registered = new WeakSet<HTMLElement>()
  const activeSplits = new Set<GSAPSplitTextInstance>()
  const activeAnimations = new Set<GSAPAnimation>()
  const triggers: { kill: () => void }[] = []
  let observer: MutationObserver | null = null
  let queued = false
  let initialRevealFrame: number | null = null
  const pendingInitialTargets = new Set<HTMLElement>()

  function clearElement(element: HTMLElement): void {
    gsap.set(element, { clearProps: 'transform,opacity,visibility,willChange,perspective' })
  }

  function revealBatch(elements: HTMLElement[]): void {
    const boundedRevealInterval = elements.length > 1
      ? Math.min(revealInterval, revealMaxSpan / (elements.length - 1))
      : 0
    const splits: Array<{ split: GSAPSplitTextInstance, target: RevealTarget }> = []
    const blockTargets: RevealTarget[] = []
    const timeline = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => {
        for (const { split, target } of splits) {
          split.revert()
          activeSplits.delete(split)
          clearElement(target.element)
        }
        for (const target of blockTargets) clearElement(target.element)
        activeAnimations.delete(timeline)
      },
    })
    activeAnimations.add(timeline)

    for (const [index, element] of elements.entries()) {
      const target = describeTarget(element, root)
      if (!target)
        continue

      const position = index * boundedRevealInterval
      if (target.animation === 'block') {
        blockTargets.push(target)
        timeline.fromTo(
          target.element,
          target.kind === 'item'
            ? { autoAlpha: 0, force3D: false, scale: 0.985, y: 24 }
            : { autoAlpha: 0, force3D: false, y: 18 },
          target.kind === 'item'
            ? { autoAlpha: 1, duration: 0.52, ease: 'power3.out', force3D: false, scale: 1, y: 0 }
            : { autoAlpha: 1, duration: 0.48, ease: 'power3.out', force3D: false, y: 0 },
          position,
        )
        continue
      }

      const split = SplitText.create(target.element, target.animation === 'chars'
        ? { aria: 'auto', mask: 'chars', type: 'chars' }
        : { aria: 'auto', mask: 'lines', type: 'lines' })
      const fragments = target.animation === 'chars' ? split.chars : split.lines
      if (!fragments.length) {
        split.revert()
        clearElement(target.element)
        continue
      }

      activeSplits.add(split)
      splits.push({ split, target })
      const isHeroHeading = target.animation === 'chars' && headingEffect === 'hero'
      timeline.set(
        target.element,
        isHeroHeading ? { autoAlpha: 1, perspective: 600 } : { autoAlpha: 1 },
        position,
      )

      if (target.animation === 'chars') {
        timeline.fromTo(
          fragments,
          isHeroHeading
            ? {
                autoAlpha: 0,
                rotateX: -60,
                transformOrigin: '50% 100%',
                yPercent: 100,
              }
            : { autoAlpha: 0, force3D: false, yPercent: 100 },
          isHeroHeading
            ? {
                autoAlpha: 1,
                duration: 0.7,
                ease: 'expo.out',
                rotateX: 0,
                stagger: window.innerWidth < 768 ? 0.012 : 0.018,
                yPercent: 0,
              }
            : { autoAlpha: 1, duration: 0.65, ease: 'expo.out', force3D: false, stagger: 0.015, yPercent: 0 },
          position,
        )
      }
      else {
        timeline.fromTo(
          fragments,
          { autoAlpha: 0, force3D: false, yPercent: 100 },
          { autoAlpha: 1, duration: 0.5, ease: 'power3.out', force3D: false, stagger: 0.06, yPercent: 0 },
          position,
        )
      }
    }

    if (!splits.length && !blockTargets.length) {
      activeAnimations.delete(timeline)
      timeline.kill()
    }
  }

  function isInInitialRevealViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect()
    return rect.bottom > 0 && rect.top < window.innerHeight * 0.88
  }

  function queueInitialReveal(elements: HTMLElement[]): void {
    for (const element of elements) pendingInitialTargets.add(element)
    if (initialRevealFrame !== null)
      return

    initialRevealFrame = requestAnimationFrame(() => {
      initialRevealFrame = null
      const batch = [...pendingInitialTargets]
      pendingInitialTargets.clear()
      revealBatch(batch)
    })
  }

  function registerTargets(): void {
    const targets = collectTargets(root)
      .filter(target => !registered.has(target.element))
      .map(target => target.element)

    if (!targets.length)
      return

    const initialTargets: HTMLElement[] = []
    const deferredTargets: HTMLElement[] = []
    for (const element of targets) {
      if (isInInitialRevealViewport(element))
        initialTargets.push(element)
      else
        deferredTargets.push(element)
    }
    for (const element of targets) registered.add(element)
    gsap.set(animateInitial ? targets : deferredTargets, { autoAlpha: 0 })

    if (animateInitial && initialTargets.length)
      queueInitialReveal(initialTargets)

    if (deferredTargets.length) {
      const nextTriggers = ScrollTrigger.batch(deferredTargets, {
        batchMax: () => window.innerWidth < 768 ? 2 : 4,
        interval: revealInterval,
        once: true,
        onEnter: (batch: Element[]) => {
          revealBatch(batch.filter((element): element is HTMLElement => element instanceof HTMLElement))
        },
        start: 'clamp(top 88%)',
      }) as { kill: () => void }[]
      triggers.push(...nextTriggers)
      ScrollTrigger.refresh()
    }
  }

  media.add('(prefers-reduced-motion: no-preference)', () => {
    registerTargets()
    observer = new MutationObserver(() => {
      if (queued)
        return
      queued = true
      queueMicrotask(() => {
        queued = false
        registerTargets()
      })
    })
    observer.observe(root, { childList: true, subtree: true })

    return () => {
      observer?.disconnect()
      observer = null
      if (initialRevealFrame !== null) {
        cancelAnimationFrame(initialRevealFrame)
        initialRevealFrame = null
      }
      pendingInitialTargets.clear()
      for (const trigger of triggers) trigger.kill()
      triggers.length = 0
      for (const animation of activeAnimations) animation.kill()
      activeAnimations.clear()
      for (const split of activeSplits) split.revert()
      activeSplits.clear()
      for (const { element } of collectTargets(root)) clearElement(element)
    }
  }, root)

  return () => media.revert()
}

function collectTargets(root: HTMLElement): RevealTarget[] {
  const items = Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR))
    .filter(element => isEligible(element, root))
    .map(element => ({ animation: 'block' as const, element, kind: 'item' as const }))
  const headings = Array.from(root.querySelectorAll<HTMLElement>(HEADING_SELECTOR))
    .filter(element => isEligible(element, root))
    .filter(element => !element.closest(ITEM_SELECTOR))
    .map(element => ({ animation: 'chars' as const, element, kind: 'heading' as const }))
  const headingElements = new Set(headings.map(target => target.element))
  const lines = Array.from(root.querySelectorAll<HTMLElement>(LINE_SELECTOR))
    .filter(element => isEligible(element, root))
    .filter(element => !element.closest(ITEM_SELECTOR))
    .filter(element => !element.closest(HEADING_SELECTOR))
    .filter(element => !headingElements.has(element))
    .filter((element, _index, all) => !all.some(other => other !== element && other.contains(element)))
    .map(element => ({
      animation: shouldSplitLines(element) ? 'lines' as const : 'block' as const,
      element,
      kind: 'line' as const,
    }))

  return [...items, ...headings, ...lines].sort((left, right) => {
    if (left.element === right.element)
      return 0
    return left.element.compareDocumentPosition(right.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  })
}

function describeTarget(element: HTMLElement, root: HTMLElement): RevealTarget | null {
  if (element.matches(ITEM_SELECTOR))
    return { animation: 'block', element, kind: 'item' }
  if (element.matches(HEADING_SELECTOR))
    return { animation: 'chars', element, kind: 'heading' }
  return isEligible(element, root)
    ? { animation: shouldSplitLines(element) ? 'lines' : 'block', element, kind: 'line' }
    : null
}

function shouldSplitLines(element: HTMLElement): boolean {
  return element.matches('.prose p, .prose li, .prose blockquote')
}

function isEligible(element: HTMLElement, root: HTMLElement): boolean {
  return element.textContent?.trim().length !== 0
    && root.contains(element)
    && !element.matches(IGNORE_SELECTOR)
    && !element.closest(IGNORE_SELECTOR)
}
