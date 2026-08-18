import type { ArticleLayout } from '~/features/article-layout/preferences'
import { onMounted, onScopeDispose } from 'vue'
import {
  ARTICLE_LAYOUT_STORAGE_KEY,
  LEGACY_APPEARANCE_STORAGE_KEY,
  resolveArticleLayout,
} from '~/features/article-layout/preferences'

export function useArticleLayoutPreference() {
  const layout = useState<ArticleLayout>('article-layout-preference', () => 'list')

  function apply(value: ArticleLayout, persist = true): void {
    layout.value = value

    if (!import.meta.client)
      return

    document.documentElement.dataset.articleLayout = value
    if (persist)
      window.localStorage.setItem(ARTICLE_LAYOUT_STORAGE_KEY, value)
  }

  function handleStorage(event: StorageEvent): void {
    if (event.key !== ARTICLE_LAYOUT_STORAGE_KEY)
      return

    apply(resolveArticleLayout(event.newValue, null), false)
  }

  onMounted(() => {
    const value = resolveArticleLayout(
      window.localStorage.getItem(ARTICLE_LAYOUT_STORAGE_KEY),
      window.localStorage.getItem(LEGACY_APPEARANCE_STORAGE_KEY),
    )
    apply(value, window.localStorage.getItem(ARTICLE_LAYOUT_STORAGE_KEY) !== value)
    window.addEventListener('storage', handleStorage)
  })

  onScopeDispose(() => {
    if (import.meta.client)
      window.removeEventListener('storage', handleStorage)
  })

  return {
    layout: readonly(layout),
    setLayout: apply,
  }
}
