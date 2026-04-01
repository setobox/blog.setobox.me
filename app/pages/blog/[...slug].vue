<script setup>
const router = useRouter()

const slug = useRoute().params.slug
const { data: post } = await useAsyncData(`blog-${slug}`, () => {
  return queryCollection('blog').path(`/blog/${slug.join('/')}`).first()
})

definePageMeta({
  layout: 'post',
})
</script>

<template>
  <!-- Render the blog post as Prose & Vue components -->
  <div>
    <ContentRenderer :value="post" />

    <div text-center>
      <button text-sm btn m="3 t8" @click="router.back()">
        Back
      </button>
    </div>
  </div>
</template>
