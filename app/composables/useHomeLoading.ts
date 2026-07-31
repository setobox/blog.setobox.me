import type { HomeLoadingState } from '#shared/types/loading'
import { clampLoadingProgress } from '#shared/utils/loading'
import { computed, readonly } from 'vue'

export function useHomeLoading() {
  const route = useRoute()
  const startsOnHome = route.path === '/'
  const state = useState<HomeLoadingState>('home-loading', () => ({
    active: startsOnHome,
    progress: 0,
    runId: startsOnHome ? 1 : 0,
    targetIsHome: startsOnHome,
  }))

  const active = computed(() => state.value.active)
  const progress = computed(() => state.value.progress)
  const runId = computed(() => state.value.runId)
  const targetIsHome = computed(() => state.value.targetIsHome)

  function begin(): number {
    const nextRunId = state.value.runId + 1
    state.value = {
      active: true,
      progress: 0,
      runId: nextRunId,
      targetIsHome: true,
    }
    return nextRunId
  }

  function setProgress(expectedRunId: number, nextProgress: number): void {
    if (state.value.runId !== expectedRunId || !state.value.active)
      return

    state.value = {
      ...state.value,
      progress: clampLoadingProgress(nextProgress),
    }
  }

  function finish(expectedRunId: number): void {
    if (
      state.value.runId !== expectedRunId
      || !state.value.active
    ) {
      return
    }

    state.value = {
      ...state.value,
      active: false,
      progress: 100,
    }
  }

  function cancel(expectedRunId: number): void {
    if (state.value.runId !== expectedRunId)
      return

    state.value = {
      ...state.value,
      active: false,
      progress: 0,
    }
  }

  function setTargetIsHome(isHome: boolean): void {
    if (state.value.targetIsHome === isHome)
      return

    state.value = {
      ...state.value,
      targetIsHome: isHome,
    }
  }

  return {
    active,
    begin,
    cancel,
    finish,
    progress,
    runId,
    setProgress,
    setTargetIsHome,
    state: readonly(state),
    targetIsHome,
  }
}
