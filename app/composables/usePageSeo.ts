import type { MaybeRefOrGetter } from 'vue'
import { appName, siteUrl } from '~/constants'

export interface PageSeoOptions {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  /**
   * Custom Open Graph image URL. Falls back to site avatar if not provided.
   */
  image?: MaybeRefOrGetter<string>
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
  const image = computed(() => {
    const customImage = options.image ? toValue(options.image) : null
    return customImage ? new URL(customImage, siteUrl).href : `${siteUrl}/avatar.jpg`
  })

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonical,
    ogImage: image,
    ogImageAlt: description,
    ogSiteName: appName,
    ogType: 'website',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image,
    twitterImageAlt: description,
    twitterCard: 'summary_large_image',
    robots: options.noindex ? 'noindex, nofollow' : 'index, follow',
  })

  useHead({
    link: options.noindex ? [] : [{ rel: 'canonical', href: canonical }],
  })
}
