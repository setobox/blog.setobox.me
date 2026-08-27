// Auto-registered by Nuxt because it lives in `<rootDir>/layers/*`.
// Intentionally minimal: the layer must not reach back into the host app, so
// everything it needs arrives through `runtimeConfig.ai` and the retriever
// registry in `server/utils/ai-retriever.ts`.
export default defineNuxtConfig({
  $meta: {
    name: 'ai',
  },

  runtimeConfig: {
    ai: {
      // Server-only. Populated from NUXT_AI_API_KEY; never exposed to the client.
      apiKey: '',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      site: {
        description: '',
        name: '',
        url: '',
      },
    },
  },

  routeRules: {
    // Streaming responses must never be buffered by the cache layer.
    '/api/ai/**': { cache: false, prerender: false },
  },
})
