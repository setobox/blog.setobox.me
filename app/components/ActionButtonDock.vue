<script setup lang="ts">
const { actions } = useActionButtons()

async function runAction(action: (typeof actions.value)[number]): Promise<void> {
  await action.onClick()
}
</script>

<template>
  <TransitionGroup
    v-if="actions.length"
    tag="div"
    class="flex flex-col gap-2.5 bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] fixed z-toast"
    role="toolbar"
    aria-label="页面操作"
    enter-active-class="transition-[opacity,transform] duration-300 ease-out motion-reduce:duration-0"
    enter-from-class="translate-x-3 translate-y-3 scale-90 opacity-0"
    leave-active-class="absolute bottom-0 right-0 transition-[opacity,transform] duration-300 ease-out motion-reduce:duration-0"
    leave-to-class="translate-x-3 translate-y-3 scale-90 opacity-0"
    move-class="transition-transform duration-300 ease-out motion-reduce:duration-0"
  >
    <button
      v-for="action in actions"
      :key="action.id"
      class="text-xl text-ink-100 p-0 outline-none border border-ink-700 rounded-lg bg-ink-900/92 inline-flex h-12 w-12 cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.24)] transition-[color,border-color,background-color,transform] duration-240 items-center justify-center backdrop-blur-md hover:(text-accent border-ink-500 bg-ink-850 -translate-x-0.5 -translate-y-0.5) active:translate-0 motion-reduce:transition-none"
      type="button"
      :aria-label="action.label"
      :title="action.label"
      @click="runAction(action)"
    >
      <span :class="action.icon" aria-hidden="true" />
    </button>
  </TransitionGroup>
</template>
