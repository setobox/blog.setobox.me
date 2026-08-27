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
})

// Site-wide social defaults. Post pages override these with per-article values.
useSeoMeta({
  ogSiteName: appName,
  ogType: 'website',
  ogLocale: 'zh_CN',
  ogTitle: appName,
  ogDescription: appDescription,
  ogImage: `${siteUrl}/avatar.jpg`,
  twitterCard: 'summary_large_image',
  twitterTitle: appName,
  twitterDescription: appDescription,
  twitterImage: `${siteUrl}/avatar.jpg`,
})
</script>

<template>
  <NuxtLoadingIndicator
    color="var(--c-accent)"
    :height="3"
    :throttle="200"
  />

  <UiAppHeader />

  <div id="smooth-wrapper">
    <div id="smooth-content" tabindex="-1">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <UiAppFooter />
    </div>
  </div>

  <ActionButtonDock />

  <AiChatDialog v-model="chatOpen" />
</template>
