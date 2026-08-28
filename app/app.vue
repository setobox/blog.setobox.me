<script setup lang="ts">
import AiChatDialog from '#layers/ai/app/components/AiChatDialog.vue'
import { shallowRef } from 'vue'
import ActionButtonDock from '~/components/ActionButtonDock.vue'
import UiAppFooter from '~/components/ui/AppFooter.vue'
import UiAppHeader from '~/components/ui/AppHeader.vue'
import { useProvideActionButtons } from '~/composables/useActionButtons'
import { appDescription, appName, siteUrl } from '~/constants'
import { ARTICLE_LAYOUT_BOOTSTRAP_SCRIPT } from '~/features/article-layout/preferences'

const { registerAction } = useProvideActionButtons()

const chatOpen = shallowRef(false)

registerAction({
  icon: 'i-lucide-sparkles',
  id: 'ai-chat',
  label: 'AI 助手',
  order: 2,
  onClick: () => {
    chatOpen.value = true
  },
})

useHead({
  script: [{
    id: 'article-layout-preference',
    innerHTML: ARTICLE_LAYOUT_BOOTSTRAP_SCRIPT,
    tagPosition: 'head',
  }],
  title: appName,
  // Pages set a bare `title`; this appends the site name so they do not have
  // to repeat it. Collapses to `appName` alone on the site root.
  titleTemplate: title => (title && title !== appName ? `${title} · ${appName}` : appName),
  link: [
    { rel: 'canonical', href: siteUrl },
  ],
})

// Site-wide social defaults. Post pages override these with per-article values.
useSeoMeta({
  ogSiteName: appName,
  ogType: 'website',
  ogLocale: 'zh_CN',
  ogTitle: appName,
  ogDescription: appDescription,
  ogUrl: siteUrl,
  ogImage: `${siteUrl}/avatar.jpg`,
  ogImageWidth: '1200',
  ogImageHeight: '630',
  ogImageAlt: appDescription,
  twitterCard: 'summary_large_image',
  twitterSite: '@setobox',
  twitterCreator: '@setobox',
  twitterTitle: appName,
  twitterDescription: appDescription,
  twitterImage: `${siteUrl}/avatar.jpg`,
  twitterImageAlt: appDescription,
})
</script>

<template>
  <NuxtLoadingIndicator
    color="var(--c-accent)"
    :height="3"
    :throttle="200"
  />

  <UiAppHeader />

  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <UiAppFooter />

  <ActionButtonDock />

  <AiChatDialog v-model="chatOpen" />
</template>
