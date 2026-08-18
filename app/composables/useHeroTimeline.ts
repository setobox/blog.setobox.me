import type { GSAP, GSAPSplitText, GSAPSplitTextInstance } from '#shared/types/gsap'

export interface HeroTimelineHandle {
  dispose: () => void
}

export interface HeroTimelineOptions {
  onTextComplete: () => void
}

/** Builds the DOM-only hero entrance and layer reveal timelines. */
export async function useHeroTimeline(
  root: HTMLElement,
  options: HeroTimelineOptions,
): Promise<HeroTimelineHandle> {
  const { gsap, loadPlugins } = useGsap()
  if (!gsap)
    return { dispose() {} }

  const plugins = await loadPlugins(['ScrollTrigger', 'SplitText'] as const)
  if (!plugins) {
    options.onTextComplete()
    return { dispose() {} }
  }

  const { ScrollTrigger, SplitText } = plugins
  await document.fonts.ready
  let disposed = false
  let textCompleted = false

  function completeText(): void {
    if (disposed || textCompleted)
      return
    textCompleted = true
    options.onTextComplete()
  }

  const media = gsap.matchMedia()
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const scenes = root.querySelectorAll<HTMLElement>('[data-layer-scene]')
    const context = gsap.context(() => {
      runHeroTextIntro(gsap, SplitText, root, completeText)

      for (const scene of scenes) {
        const content = scene.querySelector<HTMLElement>('[data-layer-content]')
        const placeholder = scene.querySelector<HTMLElement>('[data-layer-placeholder]')
        if (!content || !placeholder)
          continue

        gsap.timeline({
          scrollTrigger: {
            trigger: scene,
            start: 'top 90%',
            end: 'bottom 10%',
            scrub: 0.65,
          },
        })
          .fromTo(content, { yPercent: 105, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.32, ease: 'power3.out' })
          .fromTo(placeholder, { yPercent: 45, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.22, ease: 'power2.out' }, 0.08)
          .to([content, placeholder], { yPercent: -16, autoAlpha: 0, duration: 0.24, ease: 'power2.in' }, 0.76)
      }
    }, root)

    ScrollTrigger.refresh()

    return () => {
      context.revert()
      gsap.set(root.querySelectorAll('[data-entry], [data-layer-content], [data-layer-placeholder]'), { clearProps: 'all' })
    }
  }, root)

  media.add('(prefers-reduced-motion: reduce)', () => {
    completeText()
  }, root)

  return {
    dispose: () => {
      disposed = true
      media.revert()
    },
  }
}

function runHeroTextIntro(
  gsap: GSAP,
  SplitText: GSAPSplitText,
  root: HTMLElement,
  onComplete: () => void,
): void {
  const title = root.querySelector<HTMLElement>('[data-entry="title"]')
  const subtitle = root.querySelector<HTMLElement>('[data-entry="subtitle"]')
  const cta = root.querySelector<HTMLElement>('[data-entry="cta"]')
  const splits: GSAPSplitTextInstance[] = []
  const timeline = gsap.timeline({
    defaults: { overwrite: 'auto' },
    onComplete: () => {
      for (const split of splits) split.revert()
      gsap.set([title, subtitle, cta].filter((target): target is HTMLElement => Boolean(target)), {
        clearProps: 'transform,opacity,visibility,perspective',
      })
      onComplete()
    },
  })

  if (title) {
    const split = SplitText.create(title, { aria: 'auto', mask: 'chars', type: 'chars' })
    splits.push(split)
    timeline.set(title, { autoAlpha: 1, perspective: 600 }, 0)
    timeline.fromTo(
      split.chars,
      { autoAlpha: 0, rotateX: -60, transformOrigin: '50% 100%', yPercent: 100 },
      {
        autoAlpha: 1,
        duration: 0.7,
        ease: 'expo.out',
        rotateX: 0,
        stagger: window.innerWidth < 768 ? 0.012 : 0.018,
        yPercent: 0,
      },
      0,
    )
  }

  if (subtitle) {
    const split = SplitText.create(subtitle, { aria: 'auto', mask: 'lines', type: 'lines' })
    splits.push(split)
    timeline.fromTo(
      split.lines,
      { autoAlpha: 0, yPercent: 100 },
      { autoAlpha: 1, duration: 0.5, ease: 'power2.out', stagger: 0.08, yPercent: 0 },
      0.32,
    )
  }

  if (cta) {
    timeline.fromTo(
      cta,
      { autoAlpha: 0, scale: 0.9 },
      { autoAlpha: 1, duration: 0.45, ease: 'back.out(1.6)', scale: 1 },
      0.62,
    )
  }

  if (!title && !subtitle && !cta) {
    timeline.kill()
    onComplete()
  }
}
