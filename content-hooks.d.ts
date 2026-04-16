import type { FileAfterParseHook } from '@nuxt/content'

declare module 'nuxt/schema' {
  interface NuxtHooks {
    'content:file:afterParse': (context: FileAfterParseHook) => Promise<void> | void
  }
}

export {}
