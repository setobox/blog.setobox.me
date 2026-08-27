import type { LanguageModel } from 'ai'
import type { AiSiteConfig } from '../../shared/ai/contracts'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

interface AiRuntimeConfig {
  apiKey: string
  baseUrl: string
  model: string
  site: AiSiteConfig
}

function aiConfig(): AiRuntimeConfig {
  return useRuntimeConfig().ai as unknown as AiRuntimeConfig
}

/**
 * The chat model, resolved per request.
 *
 * Any OpenAI-compatible endpoint works (DeepSeek, Qwen, Zhipu…); swapping
 * providers is a `baseUrl` + `model` change, not a code change.
 */
export function aiModel(): LanguageModel {
  const { apiKey, baseUrl, model } = aiConfig()

  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'AI is not configured. Set NUXT_AI_API_KEY.',
    })
  }

  return createOpenAICompatible({
    apiKey,
    baseURL: baseUrl,
    name: 'setobox-ai',
  }).chatModel(model)
}

export function aiSite(): AiSiteConfig {
  return aiConfig().site
}
