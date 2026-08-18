import { describe, expect, it } from 'vitest'
import { createHomeAnimationContext } from './animation'

describe('home animation context', () => {
  it('plays the home phases in order', () => {
    const animation = createHomeAnimationContext(true)

    expect(animation.phase.value).toBe('preloading')
    animation.startHero()
    animation.startHeader()
    animation.finish()

    expect(animation.phase.value).toBe('complete')
  })

  it('ignores out-of-order and duplicate transitions', () => {
    const animation = createHomeAnimationContext(false)

    animation.startHero()
    animation.startHeader()
    animation.finish()
    expect(animation.phase.value).toBe('inactive')

    animation.startPreloading()
    animation.startPreloading()
    animation.startHero()
    animation.startHero()
    animation.startHeader()
    animation.startHeader()
    expect(animation.phase.value).toBe('header')
  })

  it('can reset for a later home navigation or deactivate during an interruption', () => {
    const animation = createHomeAnimationContext(true)

    animation.deactivate()
    expect(animation.phase.value).toBe('inactive')

    animation.startPreloading()
    animation.startHero()
    animation.deactivate()
    expect(animation.phase.value).toBe('inactive')
  })
})
