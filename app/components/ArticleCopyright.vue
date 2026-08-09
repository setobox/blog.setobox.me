<script setup lang="ts">
import { useDateFormat } from '@vueuse/core'

interface Props {
  title: string
  permalink: string
  publishedAt: Date | string
}

const props = defineProps<Props>()

const displayDate = useDateFormat(() => props.publishedAt, 'YYYY-MM-DD')
const licenseUrl = 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
</script>

<template>
  <section
    aria-label="文章版权声明"
    class="bg-black/30 px-6 py-7 rounded-2xl relative overflow-hidden isolate md:px-9 md:py-8"
  >
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 640 640"
      class="text-fg-1 opacity-5 h-36 w-36 pointer-events-none right-5 top-1/2 absolute sm:h-60 sm:w-60 -translate-y-1/2 sm:right-6"
    >
      <path
        fill="currentColor"
        d="m317.8 278.9l-33.2 17.3c-9.4-19.6-25.2-19.9-27.5-19.9c-22.1 0-33.2 14.6-33.2 43.8c0 23.6 9.2 43.8 33.2 43.8c14.5 0 24.6-7.1 30.6-21.3l30.6 15.5c-6.2 11.5-25.7 39-65.1 39c-22.6 0-74-10.3-74-77c0-58.7 43-77.1 72.6-77.1c30.7 0 52.7 11.9 66 35.9m143 0L428 296.2c-9.5-19.8-25.7-19.9-27.9-19.9c-22.1 0-33.2 14.6-33.2 43.8c0 23.5 9.2 43.8 33.2 43.8c14.4 0 24.6-7.1 30.5-21.3l31 15.5c-2.1 3.8-21.4 39-65.1 39c-22.7 0-74-9.9-74-77c0-58.7 43-77.1 72.6-77.1c30.7 0 52.6 11.9 65.6 35.9zM319.6 72C176.7 72 72 187.1 72 320.1c0 138.4 113.6 248 247.6 248c129.9 0 248.4-100.9 248.4-248C568 182.2 461.4 72 319.6 72m.9 450.8c-112.5 0-203.7-93-203.7-202.8c0-105.4 85.4-203.3 203.7-203.3c112.5 0 202.8 89.5 202.8 203.3c0 121.7-99.7 202.8-202.8 202.8"
      />
    </svg>

    <div class="min-w-0 relative z-10">
      <h2 class="text-lg text-fg-1 leading-snug font-bold m-0">
        {{ title }}
      </h2>

      <a
        class="text-base text-current-1 mt-1 block break-all transition-colors duration-150 hover:text-current-2 focus-visible:outline-2 focus-visible:outline-current-2 focus-visible:outline-offset-2"
        :href="permalink"
      >
        {{ permalink }}
      </a>

      <dl class="mt-5 gap-4 grid grid-cols-1 sm:gap-x-10 sm:grid-cols-[max-content_max-content_minmax(0,1fr)]">
        <div>
          <dt class="text-sm text-fg-4 font-mono">
            作者
          </dt>
          <dd class="text-base text-fg-2 m-0 mt-1">
            Setobox（姬顶盒）
          </dd>
        </div>

        <div>
          <dt class="text-sm text-fg-4 font-mono">
            发布于
          </dt>
          <dd class="text-base text-fg-2 m-0 mt-1 tabular-nums">
            <time :datetime="displayDate">{{ displayDate }}</time>
          </dd>
        </div>

        <div>
          <dt class="text-sm text-fg-4 font-mono">
            许可协议
          </dt>
          <dd class="text-base m-0 mt-1">
            <a
              class="text-current-1 transition-colors duration-150 hover:text-current-2 focus-visible:outline-2 focus-visible:outline-current-2 focus-visible:outline-offset-2"
              :href="licenseUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY-NC-SA 4.0
            </a>
          </dd>
        </div>
      </dl>
    </div>
  </section>
</template>
