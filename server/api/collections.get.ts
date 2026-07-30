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

export default defineCachedEventHandler(
  async (): Promise<ResourceGroup[]> => {
    try {
      const response: unknown = await $fetch(MILANOTE_DETAIL_ENDPOINT, {
        query: {
          exclude: EXCLUDED_FIELDS,
          url: MILANOTE_BOARD_URL,
        },
        retry: 0,
        timeout: 5_000,
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
  },
  {
    getKey: () => 'milanote-board',
    group: 'api',
    maxAge: 60 * 60,
    name: 'collections',
    staleMaxAge: 24 * 60 * 60,
    swr: true,
  },
)
