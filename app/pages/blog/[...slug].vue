<script setup lang="ts">
import Giscus from '@giscus/vue'
import { usePreferredReducedMotion, useWindowScroll } from '@vueuse/core'
import { computed } from 'vue'
import { siteUrl } from '~/constants'
import { formatContentDate, isoContentDate } from '~/utils/content-date'

definePageMeta({ layout: 'default' })

const route = useRoute()
const path = route.path
const { data: post } = await useAsyncData(`blog-${path}`, () => blogPostByPath(path))

if (!post.value)
  throw createError({ statusCode: 404, statusMessage: '文章不存在', fatal: true })

const article = post.value
const permalink = new URL(route.path, siteUrl).href
const { data: surround } = await useAsyncData(`blog-surround-${path}`, () => blogPostSurroundings(path))
const newer = computed(() => surround.value?.[0] ?? null)
const older = computed(() => surround.value?.[1] ?? null)
const { y } = useWindowScroll({ window: import.meta.client ? window : undefined })
const preferredMotion = usePreferredReducedMotion()

useActionButton({
  id: 'article-home',
  icon: 'i-lucide-house',
  label: '返回博客列表',
  order: 0,
  async onClick() {
    await navigateTo('/blog')
  },
})

useActionButton({
  id: 'article-top',
  icon: 'i-lucide-chevron-up',
  label: '回到页面顶部',
  order: 1,
  visible: computed(() => y.value > 0),
  onClick() {
    if (!import.meta.client)
      return
    window.scrollTo({
      top: 0,
      behavior: preferredMotion.value === 'reduce' ? 'auto' : 'smooth',
    })
  },
})

useSeoMeta({
  title: article.title,
  description: article.description,
})
</script>

<template>
  <BlogArticleShell :toc="article.body?.toc">
    <article class="min-w-0">
      <div class="mx-auto max-w-prose w-full">
        <header>
          <div class="text-meta flex flex-wrap gap-item items-center">
            <time :datetime="isoContentDate(article.updated ?? article.date)">
              {{ formatContentDate(article.updated ?? article.date) }}
            </time>
            <span aria-hidden="true">·</span>
            <span>{{ article.minutes ?? 1 }} 分钟阅读</span>
          </div>

          <h1 class="article-title text-ink-50 font-display mt-item">
            {{ article.title }}
          </h1>
          <p v-if="article.description" class="text-lead mt-group">
            {{ article.description }}
          </p>

          <div v-if="article.categories?.length" class="mt-group flex flex-wrap gap-item">
            <NuxtLink
              v-for="category in article.categories"
              :key="category"
              :to="`/blog/categories/${encodeURIComponent(slugifyTaxonomy(category))}`"
              class="text-meta hover:text-ink-100 focus-ring"
            >
              {{ category }}
            </NuxtLink>
          </div>

          <div v-if="article.tags?.length" class="mt-item flex flex-wrap gap-item">
            <NuxtLink
              v-for="tag in article.tags"
              :key="tag"
              :to="`/blog/tags/${encodeURIComponent(slugifyTaxonomy(tag))}`"
              class="text-xs text-ink-300 px-2 py-1 border border-ink-700 rounded-sm hover:text-ink-100 hover:border-ink-600 focus-ring"
            >
              #{{ tag }}
            </NuxtLink>
          </div>

          <figure v-if="article.cover" class="m-0 mt-block rounded-lg overflow-hidden">
            <NuxtImg
              :src="article.cover"
              :alt="`${article.title} 封面`"
              class="h-auto max-w-full w-full block"
              width="896"
              sizes="100vw lg:896px"
              format="webp"
              quality="80"
              loading="eager"
              decoding="async"
              fetchpriority="high"
            />
          </figure>
        </header>

        <ContentRenderer :value="article" class="mt-block prose" />

        <ArticleCopyright
          class="mt-section"
          :permalink="permalink"
          :published-at="article.date"
          :title="article.title"
        />

        <nav class="mt-section pt-block border-t border-ink-700 flex flex-col gap-group md:flex-row" aria-label="相邻文章">
          <NuxtLink v-if="newer" data-page-item :to="newer.path" class="p-group surface surface-hover flex-1 focus-ring">
            <span class="text-meta">看看别的</span>
            <span class="text-ink-100 mt-item block">{{ newer.title }}</span>
          </NuxtLink>
          <NuxtLink v-if="older" data-page-item :to="older.path" class="p-group surface surface-hover flex-1 md:text-right focus-ring">
            <span class="text-meta">看看别的</span>
            <span class="text-ink-100 mt-item block">{{ older.title }}</span>
          </NuxtLink>
        </nav>

        <div data-text-reveal-ignore class="mt-section">
          <ClientOnly>
            <Giscus
              id="comments"
              repo="setobox/giscus.setobox.me"
              repo-id="R_kgDOTr3Vsg"
              category="Announcements"
              category-id="DIC_kwDOTr3Vss4DCi6X"
              mapping="pathname"
              term="Welcome to @giscus/vue component!"
              reactions-enabled="1"
              emit-metadata="0"
              input-position="top"
              theme="gruvbox_dark"
              lang="zh-CN"
              loading="lazy"
            />
          </ClientOnly>
        </div>
      </div>
    </article>
  </BlogArticleShell>
</template>

<style scoped>
.article-title {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.02em;
}
</style>
