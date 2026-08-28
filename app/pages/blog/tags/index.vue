<script setup lang="ts">
definePageMeta({ layout: 'blog' })
const tags = await useBlogTags()
usePageSeo({ title: '博客标签', description: '按标签浏览全部文章。' })
</script>

<template>
  <section>
    <h1 class="font-display text-display-lg text-ink-50">
      标签
    </h1>
    <p class="text-lead mt-group">
      共 {{ tags.length }} 个标签。
    </p>
    <ul v-if="tags.length" class="m-0 mt-block p-0 list-none flex flex-wrap gap-item">
      <li v-for="term in tags" :key="term.name">
        <NuxtLink :to="term.path" class="text-sm text-ink-300 px-3 py-2 border border-ink-700 rounded-sm inline-flex gap-2 items-center hover:text-accent hover:border-accent focus-ring">
          <span>#{{ term.name }}</span><span class="text-meta">{{ term.count }}</span>
        </NuxtLink>
      </li>
    </ul>
    <p v-else class="text-ink-300 mt-block">
      还没有任何标签。
    </p>
  </section>
</template>
