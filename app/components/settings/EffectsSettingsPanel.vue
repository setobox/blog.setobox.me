<script setup lang="ts">
interface Props {
  enabled: boolean
}

interface Emits {
  setEnabled: [enabled: boolean]
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <section
    id="effects-settings-panel"
    class="gap-2.5 grid"
    role="tabpanel"
    aria-labelledby="effects-settings-tab"
  >
    <div class="flex gap-2.5 items-center justify-between">
      <div class="min-w-0">
        <p class="text-10px text-fg-4 tracking-0.12em font-mono m-0 mb-0.5 uppercase">
          视觉效果
        </p>
        <h2 class="text-[0.95rem] text-fg-1 leading-5 m-0">
          滤镜
        </h2>
      </div>
      <button
        class="effects-settings-toggle p-0 border border-fg-6 rounded-full bg-bg-4 shrink-0 h-5.5 w-9.5 cursor-pointer transition-[border-color,background-color] duration-150 relative"
        :class="{ '!border-[var(--theme-3)] !bg-[var(--theme-5)]': enabled }"
        type="button"
        role="switch"
        :aria-checked="enabled"
        aria-label="滤镜"
        @click="emit('setEnabled', !enabled)"
      >
        <span
          class="rounded-full bg-fg-2 h-4 w-4 shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-[background-color,transform] duration-150 left-0.75 top-0.75 absolute"
          :class="{ 'translate-x-4.25 bg-[var(--theme-1)]': enabled }"
          aria-hidden="true"
        />
      </button>
    </div>
  </section>
</template>

<style scoped>
.effects-settings-toggle:focus-visible {
  outline: 2px solid var(--theme-1);
  outline-offset: 2px;
}
</style>
