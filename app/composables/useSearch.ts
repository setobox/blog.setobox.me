import type { SearchIndex } from '#shared/types/search'
import { SEARCH_INDEX_VERSION } from '#shared/types/search'
import { searchDocs } from '#shared/utils/search-score'
import { refDebounced } from '@vueuse/core'
import { computed, shallowRef } from 'vue'
import { flattenGroups, groupHits } from '~/features/search/results'

/** Enough to fill the panel without scoring the whole corpus into the DOM. */
const RESULT_LIMIT = 24
/** Long enough to skip a burst of keystrokes, short enough to feel immediate. */
const QUERY_DEBOUNCE_MS = 120

/**
 * Search state for the dialog.
 *
 * The index is fetched once, on first open, and held for the session -- it is a
 * single cached payload, so re-fetching per keystroke would trade a fast local
 * scan for network latency. Scoring runs client-side against that payload.
 */
export function useSearch() {
  const query = shallowRef('')
  const debouncedQuery = refDebounced(query, QUERY_DEBOUNCE_MS)

  const index = shallowRef<SearchIndex>()
  const pending = shallowRef(false)
  const failed = shallowRef(false)

  async function load() {
    if (index.value || pending.value)
      return

    pending.value = true
    failed.value = false
    try {
      const fetched = await $fetch<SearchIndex>('/api/search-index')
      // A stale shape would mis-render rather than fail loudly, so refuse it.
      if (fetched.version !== SEARCH_INDEX_VERSION)
        throw new Error(`unsupported search index version: ${fetched.version}`)
      index.value = fetched
    }
    catch {
      failed.value = true
    }
    finally {
      pending.value = false
    }
  }

  const hits = computed(() => {
    const docs = index.value?.docs
    if (!docs?.length)
      return []
    return searchDocs(docs, debouncedQuery.value, { limit: RESULT_LIMIT })
  })

  const groups = computed(() => groupHits(hits.value))
  const flatHits = computed(() => flattenGroups(groups.value))

  /** True only once a query has settled and produced nothing. */
  const empty = computed(() =>
    Boolean(debouncedQuery.value.trim())
    && !pending.value
    && !failed.value
    && flatHits.value.length === 0,
  )

  function reset() {
    query.value = ''
  }

  return { query, debouncedQuery, index, pending, failed, groups, flatHits, empty, load, reset }
}
