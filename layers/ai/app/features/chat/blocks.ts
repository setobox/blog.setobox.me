import type { UIMessage } from 'ai'
import type { AiCitation } from '../../../shared/ai/contracts'

/**
 * Projects `UIMessage.parts` onto renderable blocks.
 *
 * The AI SDK already maintains parts incrementally as the stream arrives, so
 * this stays a pure mapping — no reducer, no mutation, testable in bare node.
 */

export type AiToolState
  = | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error'

export type AiBlock
  = | { type: 'text', text: string }
    | { type: 'tool', name: string, state: AiToolState, input?: unknown, output?: unknown }
    | { type: 'citations', items: AiCitation[] }
    | { type: 'error', message: string }

interface UIPartLike {
  type: string
  text?: string
  state?: string
  input?: unknown
  output?: unknown
  errorText?: string
}

const TOOL_STATES = new Set<AiToolState>([
  'input-streaming',
  'input-available',
  'output-available',
  'output-error',
])

function toolState(raw: unknown): AiToolState {
  return TOOL_STATES.has(raw as AiToolState) ? (raw as AiToolState) : 'input-streaming'
}

/** Tool parts are typed `tool-<name>` (or `dynamic-tool`) rather than a fixed literal. */
function toolName(type: string): string | undefined {
  if (type.startsWith('tool-'))
    return type.slice(5)
  if (type === 'dynamic-tool')
    return 'tool'
  return undefined
}

function citationsOf(output: unknown): AiCitation[] {
  if (!output || typeof output !== 'object')
    return []

  const raw = (output as { citations?: unknown }).citations
  if (!Array.isArray(raw))
    return []

  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object')
      return []
    const { path, title } = item as { path?: unknown, title?: unknown }
    if (typeof path !== 'string' || typeof title !== 'string')
      return []
    return [{ path, title }]
  })
}

export function partsToBlocks(message: UIMessage): AiBlock[] {
  const blocks: AiBlock[] = []
  const seenCitations = new Set<string>()
  const citations: AiCitation[] = []

  for (const part of (message.parts ?? []) as UIPartLike[]) {
    if (part.type === 'text') {
      const text = part.text ?? ''
      if (!text)
        continue

      // Consecutive text deltas belong to one paragraph run.
      const last = blocks.at(-1)
      if (last?.type === 'text')
        last.text += text
      else blocks.push({ type: 'text', text })

      continue
    }

    const name = toolName(part.type)
    if (!name)
      continue

    const state = toolState(part.state)

    blocks.push({
      type: 'tool',
      name,
      state,
      input: part.input,
      output: state === 'output-error' ? part.errorText : part.output,
    })

    for (const citation of citationsOf(part.output)) {
      if (seenCitations.has(citation.path))
        continue
      seenCitations.add(citation.path)
      citations.push(citation)
    }
  }

  if (citations.length)
    blocks.push({ type: 'citations', items: citations })

  return blocks
}
