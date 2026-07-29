import type { ResourceGroup } from '~~/app/features/resources/types'

const MILANOTE_DETAIL_ENDPOINT = 'https://mn.setobox.me/api/detail'
const MILANOTE_BOARD_URL = 'https://app.milanote.com/1WOTjb1OxP4xfc?p=3Ok1zpJfWiB'
const EXCLUDED_FIELDS = [
  '**.location',
  '**.timestamps',
  'board.color',
  'board.id',
  'board.title',
  'board.type',
  'fetchedAt',
  'source',
  'source.boardId',
  'source.provider',
  'version',
].join(',')

export default defineEventHandler(async (): Promise<ResourceGroup[]> => {
  try {
    const response: unknown = await $fetch(MILANOTE_DETAIL_ENDPOINT, {
      query: {
        exclude: EXCLUDED_FIELDS,
        url: MILANOTE_BOARD_URL,
      },
    })

    return parseMilanoteCollections(response)
  }
  catch (cause) {
    throw createError({
      cause,
      statusCode: 502,
      statusMessage: 'Unable to load collection data',
    })
  }
})
