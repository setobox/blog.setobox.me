import type { ComputedRef } from 'vue'
import type { BlogTaxonomyKind, BlogTaxonomyTerm } from '~/utils/blog-taxonomy'
import { computed } from 'vue'
import { aggregateTaxonomy } from '~/utils/blog-taxonomy'

function useBlogFacets() {
  return useAsyncData(
    'blog-taxonomy-facets',
    () => {
      const query = queryCollection('blog')
      if (!import.meta.dev)
        query.where('draft', '=', false)

      return query.select('categories', 'tags').all()
    },
    {
      dedupe: 'defer',
      deep: false,
    },
  )
}

async function useBlogTaxonomy(
  kind: BlogTaxonomyKind,
): Promise<ComputedRef<BlogTaxonomyTerm[]>> {
  const { data } = await useBlogFacets()
  return computed(() => aggregateTaxonomy(data.value ?? [], kind))
}

export function useBlogCategories() {
  return useBlogTaxonomy('categories')
}

export function useBlogTags() {
  return useBlogTaxonomy('tags')
}
