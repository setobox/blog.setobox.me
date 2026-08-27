import type { UIMessage } from 'ai'
import type { PageContext } from '../../../shared/ai/contracts'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai'
import { toWebRequest } from 'h3'
import { z } from 'zod'

const PageContextSchema = z.object({
  path: z.string(),
  title: z.string().optional(),
  type: z.enum(['article', 'page']),
})

const ChatBodySchema = z
  .object({
    // Validated structurally here; the AI SDK owns the part-level shape.
    messages: z.array(z.custom<UIMessage>()).min(1).max(200),
    page: PageContextSchema.optional(),
    summary: z.string().max(4_000).optional(),
  })
  .strict()

/**
 * Streaming chat.
 *
 * Never wrap this in `defineCachedEventHandler`: the cache layer materialises
 * the whole body, which would break streaming and let one reader's reply be
 * served to another.
 */
export default defineEventHandler(async (event) => {
  const { messages, page, summary } = await readValidatedBody(event, body =>
    ChatBodySchema.parse(body))

  const { messages: modelMessages, stats } = await buildModelContext({
    // Async in AI SDK v7 — awaiting is required or this resolves to `{}`.
    messages: await convertToModelMessages(messages),
    summary,
  })

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      if (stats.newSummary) {
        writer.write({
          type: 'data-summary',
          data: {
            droppedMessages: stats.droppedMessages,
            summary: stats.newSummary,
          },
        })
      }

      const result = streamText({
        // Web-standard signal: `event.node.req` is Node-only and deprecated in h3 v1.
        abortSignal: toWebRequest(event).signal,
        // Segmenter-based chunking keeps CJK from streaming one glyph at a time.
        experimental_transform: smoothStream({
          chunking: new Intl.Segmenter('zh', { granularity: 'word' }),
        }),
        messages: modelMessages,
        model: aiModel(),
        stopWhen: stepCountIs(5),
        system: buildSystemPrompt(page as PageContext | undefined),
        tools: aiTools({ page, retriever: getAiRetriever(event) }),
      })

      writer.merge(result.toUIMessageStream({ sendStart: false }))
    },
    onError: error => (error instanceof Error ? error.message : '请求失败，请重试。'),
  })

  return createUIMessageStreamResponse({ stream })
})
