import type { InjectionKey, ShallowRef } from 'vue'
import { readonly, shallowRef } from 'vue'

export type HomeAnimationPhase = 'inactive' | 'preloading' | 'hero' | 'header' | 'complete'

export interface HomeAnimationContext {
  phase: Readonly<ShallowRef<HomeAnimationPhase>>
  deactivate: () => void
  finish: () => void
  startHeader: () => void
  startHero: () => void
  startPreloading: () => void
}

export const HOME_ANIMATION_CONTEXT_KEY: InjectionKey<HomeAnimationContext>
  = Symbol('home-animation-context')

export function createHomeAnimationContext(initiallyOnHome: boolean): HomeAnimationContext {
  const currentPhase = shallowRef<HomeAnimationPhase>(initiallyOnHome ? 'preloading' : 'inactive')

  function startPreloading(): void {
    currentPhase.value = 'preloading'
  }

  function startHero(): void {
    if (currentPhase.value === 'preloading')
      currentPhase.value = 'hero'
  }

  function startHeader(): void {
    if (currentPhase.value === 'hero')
      currentPhase.value = 'header'
  }

  function finish(): void {
    if (currentPhase.value === 'header')
      currentPhase.value = 'complete'
  }

  function deactivate(): void {
    currentPhase.value = 'inactive'
  }

  return {
    phase: readonly(currentPhase),
    deactivate,
    finish,
    startHeader,
    startHero,
    startPreloading,
  }
}
