import type { ResourceGroup, ResourceLink } from '~~/app/features/resources/types'
import { z } from 'zod'

const WHITESPACE_PATTERN = /\s+/g
const WWW_PREFIX_PATTERN = /^www\./

const milanoteLinkSchema = z.object({
  caption: z.object({
    plainText: z.string(),
  }).optional(),
  faviconUrl: z.url().optional(),
  provider: z.object({
    display: z.string().optional(),
  }).optional(),
  title: z.string().optional(),
  type: z.literal('LINK'),
  url: z.url(),
})

const milanoteBoardSchema = z.object({
  children: z.array(z.unknown()),
  title: z.string(),
  type: z.literal('BOARD'),
})

const milanoteDetailSchema = z.object({
  data: z.object({
    board: z.object({
      children: z.array(z.unknown()),
    }),
  }),
  ok: z.literal(true),
})

function cleanText(value: string | undefined): string {
  return value?.replace(WHITESPACE_PATTERN, ' ').trim() ?? ''
}

function getHostname(url: string): string {
  return new URL(url).hostname.replace(WWW_PREFIX_PATTERN, '')
}

function parseLink(input: unknown): ResourceLink | undefined {
  const result = milanoteLinkSchema.safeParse(input)

  if (!result.success)
    return undefined

  const link = result.data
  const hostname = getHostname(link.url)
  const provider = cleanText(link.provider?.display)
  const title = cleanText(link.title) || provider || hostname
  const caption = cleanText(link.caption?.plainText)

  return {
    description: caption ?? '',
    href: link.url,
    imageUrl: link.faviconUrl,
    title,
  }
}

export function parseMilanoteCollections(input: unknown): ResourceGroup[] {
  const detail = milanoteDetailSchema.parse(input)

  return detail.data.board.children.flatMap((inputBoard) => {
    const result = milanoteBoardSchema.safeParse(inputBoard)

    if (!result.success)
      return []

    const board = result.data
    const items = board.children
      .map(parseLink)
      .filter((item): item is ResourceLink => item !== undefined)

    return [{
      items,
      title: cleanText(board.title),
    }]
  })
}
