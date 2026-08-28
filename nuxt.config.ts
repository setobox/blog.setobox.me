import type { FileAfterParseHook } from '@nuxt/content'
import { appDescription, appName, siteUrl } from './app/constants/index'
import { designTokens, fontPreloads } from './shared/design/tokens'
import { resolveReadingMinutes } from './shared/utils/reading-time'
import { buildSearchBody, markdownToSearchText } from './shared/utils/search-text'

export default defineNuxtConfig({
  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@pinia/nuxt',
    '@nuxt/eslint',
    '@nuxt/content',
    '@nuxt/image',
  ],

  devtools: {
    enabled: true,
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: {
        lang: 'zh-CN',
      },
      viewport: 'width=device-width,initial-scale=1',
      link: [
        {
          rel: 'icon',
          href: '/_ipx/f_webp&q_80&s_40x40/avatar.jpg',
          sizes: '40x40',
          type: 'image/webp',
        },
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          title: `${appName} · RSS`,
          href: `${siteUrl}/blog/feed.xml`,
        },
        ...fontPreloads,
      ],
      meta: [
        { name: 'description', content: appDescription },
        { name: 'theme-color', content: designTokens.colors.beat.s1 },
      ],
    },
  },

  css: [
    '~/assets/css/fonts.css',
    '~/assets/css/tokens.css',
    '~/assets/css/prose.css',
  ],

  content: {
    database: {
      type: 'd1',
      bindingName: 'setobox-db',
    },
  },

  // Entirely server-only: nothing here is under `runtimeConfig.public`, so the
  // key never reaches the browser. Override per environment with
  // NUXT_AI_API_KEY / NUXT_AI_BASE_URL / NUXT_AI_MODEL.
  runtimeConfig: {
    ai: {
      apiKey: '',
      baseUrl: '',
      model: '',
      // Site identity for the AI layer, which must not import ~/constants.
      site: {
        description: appDescription,
        name: appName,
        url: siteUrl,
      },
    },
  },

  routeRules: {
    '/': { redirect: { to: '/blog', statusCode: 301 } },
    '/blog': { prerender: true },
    '/blog/archive': { prerender: true },
    '/blog/categories': { prerender: true },
    '/blog/feed.xml': { prerender: true },
    '/blog/posts': {
      redirect: { to: '/blog', statusCode: 301 },
    },
    '/blog/tags': { prerender: true },
    '/sitemap.xml': { prerender: true },
    '/collections': { prerender: true },
    '/use': { prerender: true },
    '/api/**': { prerender: false },
  },

  future: {
    compatibilityVersion: 4,
  },

  experimental: {
    payloadExtraction: false,
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
      crawlLinks: true,
      routes: [
        '/blog',
        '/blog/archive',
        '/blog/categories',
        '/blog/feed.xml',
        '/blog/tags',
        '/collections',
        '/sitemap.xml',
        '/use',
      ],
      failOnError: true,
    },
    preset: 'cloudflare-pages',
  },

  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@ai-sdk/vue',
        'ai',
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

      // Derived here so the search index never has to walk the MDC AST.
      content.searchBody = buildSearchBody(file.body)

      // Full prose for the AI assistant. Untruncated on purpose: `searchBody`
      // is capped at 1200 chars, which is a snippet, not enough to answer from.
      // Selected explicitly by the retriever so it never reaches page payloads.
      content.aiBody = markdownToSearchText(file.body)
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
