<script setup lang="ts">
const router = useRouter()

const { data: posts } = await useAsyncData('blog', () => queryCollection('blog').all())

const isDev = process.env.NODE_ENV === 'development'
</script>

<template>
  <div>
    <h1>Blog</h1>
    <ul>
      <li v-for="post in posts" :key="post.id">
        <NuxtLink :to="post.path">
          {{ post.title }}
        </NuxtLink>
      </li>
    </ul>

    <div v-if="isDev">
      {{ posts?.length }} posts found.
    </div>

    <div text-center>
      <button text-sm btn m="3 t8" @click="router.back()">
        Back
      </button>
    </div>
  </div>
</template>
