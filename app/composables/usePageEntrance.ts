import type { Ref } from 'vue'
import { onMounted, onScopeDispose } from 'vue'

export function usePageEntrance(target: Readonly<Ref<HTMLElement | null>>): void {
  let disposed = false
  let stopAnimation: (() => void) | undefined

  onMounted(async () => {
    const shouldAnimateEntrance = isGsapReady()
    const gsap = await loadGsap()
    const root = target.value
    if (disposed || !shouldAnimateEntrance || !gsap || !root)
      return

    const context = gsap.context(() => {
      const intro = root.querySelector<HTMLElement>('[data-page-intro]')
      const items = root.querySelectorAll<HTMLElement>('[data-page-item]')
      const timeline = gsap.timeline({
        defaults: {
          duration: 0.45,
          ease: 'power2.out',
        },
      })

      if (intro) {
        timeline.from(intro, {
          autoAlpha: 0,
          clearProps: 'all',
          y: 12,
        })
      }

      if (items.length) {
        timeline.from(items, {
          autoAlpha: 0,
          clearProps: 'all',
          stagger: 0.06,
          y: 10,
        }, intro ? '-=0.2' : 0)
      }
    }, root)
    stopAnimation = () => context.revert()
  })

  onScopeDispose(() => {
    disposed = true
    stopAnimation?.()
  })
}
