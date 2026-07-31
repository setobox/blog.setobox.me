import type { Ref } from 'vue'
import { onMounted, onScopeDispose } from 'vue'

export function usePageEntrance(target: Readonly<Ref<HTMLElement | null>>): void {
  let stopAnimation: (() => void) | undefined
  const { gsap } = useGsap()

  onMounted(() => {
    const root = target.value
    if (!gsap || !root)
      return

    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
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
    stopAnimation = () => media.revert()
  })

  onScopeDispose(() => {
    stopAnimation?.()
  })
}
