import { describe, expect, it } from 'vitest'
import { toPageContext } from './page-context'

describe('toPageContext', () => {
  it('treats a dated blog path as an article', () => {
    expect(toPageContext('/blog/2026/nuxt-guide', 'Nuxt 指南')).toEqual({
      path: '/blog/2026/nuxt-guide',
      title: 'Nuxt 指南',
      type: 'article',
    })
  })

  it('treats list and taxonomy routes as pages', () => {
    for (const path of ['/blog', '/blog/tags', '/blog/tags/vue', '/blog/archive', '/use']) {
      expect(toPageContext(path).type).toBe('page')
    }
  })

  it('drops a blank title rather than sending an empty string', () => {
    expect(toPageContext('/blog', '   ').title).toBeUndefined()
    expect(toPageContext('/blog').title).toBeUndefined()
  })
})
