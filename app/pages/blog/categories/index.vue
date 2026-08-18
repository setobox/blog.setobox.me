<script setup lang="ts">
definePageMeta({ layout: 'blog' })
const categories = await useBlogCategories()
useSeoMeta({ title: '博客分类', description: '按分类浏览全部文章。' })
</script>

<template>
  <section>
    <h1 class="text-display-lg text-ink-50 font-display">
      分类
    </h1>
    <p class="text-lead mt-group">
      共 {{ categories.length }} 个分类。
    </p>
    <ul v-if="categories.length" class="m-0 mt-block p-0 list-none gap-group grid lg:grid-cols-3 md:grid-cols-2 xl:grid-cols-4">
      <li v-for="term in categories" :key="term.name">
        <NuxtLink data-page-item :to="term.path" class="group p-group surface surface-hover flex gap-item items-baseline justify-between focus-ring">
          <span class="flex gap-3 min-w-0 items-center">
            <span class="i-lucide-folder text-ink-300 shrink-0 transition-colors duration-240 group-hover:text-accent" aria-hidden="true" />
            <span class="text-h4 text-ink-50 font-display transition-colors duration-240 group-hover:text-accent">{{ term.name }}</span>
          </span>
          <span class="text-meta text-ink-300 shrink-0 transition-colors duration-240 group-hover:text-accent">{{ term.count }} 篇</span>
        </NuxtLink>
      </li>
    </ul>
    <p v-else class="text-ink-300 mt-block">
      还没有任何分类。
    </p>
  </section>
</template>
