export const ARTICLE_LAYOUT_STORAGE_KEY = 'setobox:article-layout:v1'
export const LEGACY_APPEARANCE_STORAGE_KEY = 'setobox:appearance:v1'

export const ARTICLE_LAYOUTS = ['list', 'grid'] as const

export type ArticleLayout = (typeof ARTICLE_LAYOUTS)[number]

export function isArticleLayout(value: unknown): value is ArticleLayout {
  return typeof value === 'string' && ARTICLE_LAYOUTS.includes(value as ArticleLayout)
}

function readLegacyLayout(raw: string | null): ArticleLayout | undefined {
  if (!raw)
    return undefined

  try {
    const value = JSON.parse(raw) as { articleLayout?: unknown }
    return isArticleLayout(value.articleLayout) ? value.articleLayout : undefined
  }
  catch {
    return undefined
  }
}

export function resolveArticleLayout(
  currentRaw: string | null,
  legacyRaw: string | null,
): ArticleLayout {
  if (isArticleLayout(currentRaw))
    return currentRaw

  return readLegacyLayout(legacyRaw) ?? 'list'
}

export const ARTICLE_LAYOUT_BOOTSTRAP_SCRIPT = `(() => {
  const root = document.documentElement
  let layout = 'list'
  try {
    const current = localStorage.getItem('${ARTICLE_LAYOUT_STORAGE_KEY}')
    if (current === 'list' || current === 'grid') {
      layout = current
    }
    else {
      const legacyRaw = localStorage.getItem('${LEGACY_APPEARANCE_STORAGE_KEY}')
      const legacy = legacyRaw ? JSON.parse(legacyRaw) : null
      if (legacy && (legacy.articleLayout === 'list' || legacy.articleLayout === 'grid')) {
        layout = legacy.articleLayout
        localStorage.setItem('${ARTICLE_LAYOUT_STORAGE_KEY}', layout)
      }
    }
  }
  catch {}
  root.dataset.articleLayout = layout
})()`
