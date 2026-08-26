import type { MaybeRefOrGetter } from 'vue'
import { siteUrl } from '~/constants'

export interface PageSeoOptions {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  /**
   * Keep the page out of the index. Also drops the canonical link, which means
   * nothing on a route that should not rank at all.
   */
  noindex?: boolean
}

/**
 * Title, description and canonical for a non-article page.
 *
 * Canonical is derived from `route.path`, so query strings (`?page=2`) collapse
 * onto the base path -- paginated listings should not compete with page 1 in
 * the index. Articles do not use this: they need per-article `article:*` and
 * JSON-LD, which `blog/[...slug].vue` sets directly.
 */
export function usePageSeo(options: PageSeoOptions): void {
  const route = useRoute()
  const canonical = computed(() => new URL(route.path, siteUrl).href)
  const title = computed(() => toValue(options.title))
  const description = computed(() => toValue(options.description))

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonical,
    twitterTitle: title,
    twitterDescription: description,
    robots: options.noindex ? 'noindex, nofollow' : 'index, follow',
  })

  useHead({
    link: options.noindex ? [] : [{ rel: 'canonical', href: canonical }],
  })
}
