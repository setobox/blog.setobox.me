import { describe, expect, it } from 'vitest'
import {
  isArticleLayout,
  resolveArticleLayout,
} from './preferences'

describe('article layout preferences', () => {
  it('accepts only supported layouts', () => {
    expect(isArticleLayout('list')).toBe(true)
    expect(isArticleLayout('grid')).toBe(true)
    expect(isArticleLayout('cards')).toBe(false)
  })

  it('prefers the dedicated storage value', () => {
    expect(resolveArticleLayout('grid', JSON.stringify({ articleLayout: 'list' }))).toBe('grid')
  })

  it('migrates the article layout from the legacy appearance payload', () => {
    expect(resolveArticleLayout(null, JSON.stringify({
      accent: { mode: 'preset', preset: 'sky' },
      articleLayout: 'grid',
      visualFilterEnabled: true,
    }))).toBe('grid')
  })

  it('falls back safely for malformed or unsupported data', () => {
    expect(resolveArticleLayout('masonry', '{')).toBe('list')
    expect(resolveArticleLayout(null, JSON.stringify({ articleLayout: 'masonry' }))).toBe('list')
  })
})
