import type { FileAfterParseHook } from '@nuxt/content'
import { appDescription } from './app/constants/index'
import { resolveReadingMinutes } from './shared/utils/reading-time'

export default defineNuxtConfig({
  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/eslint',
    '@nuxt/content',
    '@nuxt/image',
  ],

  devtools: {
    enabled: true,
  },

  app: {
    head: {
      viewport: 'width=device-width,initial-scale=1',
      link: [
        {
          rel: 'icon',
          href: '/_ipx/f_webp&q_80&s_40x40/avatar.jpg',
          sizes: '40x40',
          type: 'image/webp',
        },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: appDescription },
        { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#f6f4f2' },
        { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#252423' },
      ],
    },
  },

  css: [
    '~/assets/main.css',
  ],

  colorMode: {
    classSuffix: '',
  },

  content: {
    database: {
      type: 'd1',
      bindingName: 'setobox-db',
    },
  },

  routeRules: {
    '/': { prerender: true },
    '/use': { prerender: true },
  },

  future: {
    compatibilityVersion: 4,
  },

  experimental: {
    renderJsonPayloads: true,
    typedPages: true,
  },

  compatibilityDate: '2026-04-01',

  nitro: {
    esbuild: {
      options: {
        target: 'esnext',
      },
    },
    prerender: {
      crawlLinks: false,
      routes: ['/'],
      failOnError: true,
    },
    preset: 'cloudflare-pages',
  },

  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
  },
  hooks: {
    'content:file:afterParse': ({ collection, content, file }: FileAfterParseHook) => {
      if (collection.name !== 'blog')
        return

      content.pin = typeof content.pin === 'number' && Number.isFinite(content.pin)
        ? content.pin
        : content.pin === true ? 1 : undefined

      const minutes = content.minutes
      content.minutes = resolveReadingMinutes(
        file.body,
        typeof minutes === 'number' ? minutes : undefined,
      )
    },
  },

  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: true,
      },
    },
  },

  image: {
    providers: {
      none: {},
    },
  },
})
