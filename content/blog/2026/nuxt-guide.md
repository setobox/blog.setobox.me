---
title: '关于 Nuxt 你应该知道的'
description: '以 Nuxt 4 为基线，讲清目录、渲染、取数、Nitro、状态、水合与部署之间的关系。'
date: 2026-08-16
tags:
  - 'Nuxt 4'
  - 'Nuxt'
  - 'Vue'
  - 'Nitro'
  - 'SSR'
categories:
  - '前端'
  - '全栈'
  - 'Nuxt'
---

Nuxt 不只是“带服务端渲染的 Vue”。它把 Vue 应用、文件路由、服务端数据获取、Nitro API、构建产物和部署适配放进同一套约定里。真正用顺手的关键，不是记住所有自动导入，而是知道一段代码在哪个环境执行、数据怎样穿过 SSR 和 hydration、最终产物要跑在哪里。

本文以 Nuxt 4 为基线。Nuxt 3 项目最先要注意的变化，是 Vue 应用源码默认进入 `app/`，而 `server/` 仍在项目根目录。

## 先建立一张运行地图

一个请求进入 Nuxt 后，大致经过这些层次：

```text
浏览器请求
   ↓
Nitro / server middleware / API routes
   ↓
Nuxt 路由与页面数据获取
   ↓
Vue 在服务端生成 HTML + Nuxt payload
   ↓
浏览器显示 HTML，再用 payload 完成 hydration
   ↓
后续路由切换主要在客户端执行
```

这张图解释了很多常见问题：路由 middleware 不能替代 API 鉴权，setup 里裸用 `$fetch` 可能请求两次，模块顶层的 `ref` 会在服务端跨用户共享，浏览器 API 参与首屏渲染会造成 hydration mismatch。

## Nuxt 4 的目录怎么分

一个常见项目可以这样组织：

```text
my-app/
├─ app/
│  ├─ app.vue
│  ├─ app.config.ts
│  ├─ error.vue
│  ├─ assets/
│  ├─ components/
│  ├─ composables/
│  ├─ layouts/
│  ├─ middleware/
│  ├─ pages/
│  ├─ plugins/
│  └─ utils/
├─ server/
│  ├─ api/
│  ├─ routes/
│  ├─ middleware/
│  ├─ plugins/
│  └─ utils/
├─ shared/
│  ├─ types/
│  └─ utils/
├─ public/
├─ modules/
├─ layers/
├─ nuxt.config.ts
└─ package.json
```

可以按职责记：

- `app/` 是 Vue 应用，页面、组件、路由 middleware 和 Nuxt 插件都在这里；
- `server/` 是 Nitro 服务端代码，不会打进浏览器 bundle；
- `shared/` 放浏览器与服务端都能使用的纯类型和纯函数，不能偷偷依赖 Vue 或 Nitro 上下文；
- `public/` 中的文件原样从网站根路径提供，不经过构建处理；
- `app/assets/` 中的 CSS、图片和字体由构建工具处理；
- `modules/` 是本地 Nuxt 模块，`layers/` 用来复用一整套 Nuxt 约定与配置。

Nuxt 4 中 `~` / `@` 指向 `app/`，`~~` / `@@` 才指向项目根目录；`#shared` 和 `#server` 则是更明确的专用别名。把 Nuxt 3 代码直接搬过来时，路径别名是很容易漏掉的一处。

自动导入能减少样板代码，但目录也因此成为公开约定。业务复杂后仍建议按功能分组，例如 `app/components/checkout/`、`app/composables/useCheckout.ts`，不要把所有组件铺在一个大目录里。

## 渲染模式不是项目级单选题

### Universal Rendering

Nuxt 默认开启 SSR。首次访问时服务器生成 HTML，浏览器拿到 JavaScript 后进行 hydration；后续页面切换通常由客户端路由接管。

它适合内容需要被搜索引擎和链接预览读取，同时又需要较强交互的页面。代价是代码要同时兼容服务端和浏览器，还要承担服务器运行、缓存与监控成本。

### Client-side Rendering

整个项目可以关闭 SSR：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false,
})
```

这更接近传统 SPA，适合登录后的后台、内部工具等 SEO 不重要的场景。它能部署为静态文件，但用户要等 JavaScript 下载和执行后才看到主要内容。

### Prerender 与 Hybrid Rendering

内容在构建时已知、更新不频繁时，可以预渲染成静态 HTML。混合项目则通过 `routeRules` 为不同路由选择策略：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },
    '/about': { prerender: true },
    '/blog/**': { isr: 3600 },
    '/catalog/**': { swr: 300 },
    '/admin/**': { ssr: false },
    '/old-page': { redirect: '/new-page' },
    '/api/public/**': { cors: true },
  },
})
```

这里不是“性能开关越多越好”：

- `prerender` 在构建时生成页面，动态路由需要能被爬取或显式提供；
- `swr` 允许先返回旧缓存，再在后台刷新；
- `isr` 的具体实现依赖部署平台与 Nitro preset；
- `ssr: false` 只解决该路由的渲染方式，不自动解决权限和数据安全。

选渲染方式时先问数据何时可用、多久变化、是否个性化、缓存能否共享，再看平台是否完整支持对应 route rule。开发环境能跑，不代表目标平台的缓存语义完全相同。

## `useFetch`、`useAsyncData` 和 `$fetch` 怎么选

这三个名字很像，但解决的问题不同。

### `$fetch`：一次普通请求

`$fetch` 基于 ofetch，适合用户点击后的提交、删除和刷新等事件：

```vue
<script setup lang="ts">
interface CreateCommentInput {
  postId: string
  content: string
}

async function submitComment(input: CreateCommentInput): Promise<void> {
  await $fetch('/api/comments', {
    method: 'POST',
    body: input,
  })
}
</script>
```

在服务端调用项目内部 Nitro 路由时，`$fetch` 可以直接调用处理器，不必真的绕一趟 HTTP。

但不要在页面 setup 中裸写 `await $fetch('/api/posts')` 作为首屏取数。相同 setup 会在服务器和浏览器运行，`$fetch` 不负责把服务端结果放进 Nuxt payload，容易形成双请求。

### `useFetch`：HTTP 场景的 SSR-aware 封装

`useFetch` 把 `$fetch` 包在 `useAsyncData` 上：服务端请求完成后，结果进入 payload，客户端 hydration 会复用它。

```vue
<!-- app/pages/posts/[slug].vue -->
<script setup lang="ts">
import { computed } from 'vue'

interface Post {
  slug: string
  title: string
  description: string
  content: string
}

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const {
  data: post,
  status,
  error,
  refresh,
} = await useFetch<Post>(
  () => `/api/posts/${encodeURIComponent(slug.value)}`,
)

if (error.value?.statusCode === 404) {
  throw createError({
    status: 404,
    statusText: 'Not Found',
    message: '文章不存在',
  })
}
</script>

<template>
  <article v-if="post">
    <h1>{{ post.title }}</h1>
    <p>{{ post.description }}</p>
  </article>
  <button v-else-if="status === 'error'" type="button" @click="refresh()">
    重新加载
  </button>
</template>
```

URL getter 依赖 `slug`，路由参数改变时会重新请求。`status` 比单个 `pending` 布尔值更能区分 `idle`、`pending`、`success` 与 `error`。

默认 `await` 会在客户端导航时等待数据。非关键区域可以使用 `lazy: true` 或 `useLazyFetch()`，让导航先完成，再自己渲染 loading。`server: false` 则会等 hydration 后才在浏览器请求，即使在 setup 中 `await`，此时 `data` 也可能仍是 `undefined`。

同一个 key 会共享 `data`、`error` 和 `status`。需要跨组件复用时给出明确 key，并保证 `handler`、`deep`、`transform`、`pick`、`default` 等关键选项一致。不要为了“缓存”随手复用 key，否则两个语义不同的请求会互相覆盖。

### `useAsyncData`：包住任意异步数据源

数据来自 SDK、文件系统、CMS client，或者要组合多次请求时用 `useAsyncData`：

```vue
<script setup lang="ts">
const { data: dashboard } = await useAsyncData(
  'dashboard',
  async (_nuxtApp, { signal }) => {
    const [profile, notifications] = await Promise.all([
      $fetch('/api/profile', { signal }),
      $fetch('/api/notifications', { signal }),
    ])

    return { profile, notifications }
  },
)
</script>
```

handler 应该返回可序列化的数据，并尽量无副作用。初始化 Pinia、打点或写 cookie 不是数据查询，放进 `useAsyncData` 可能因 SSR、重试或刷新而重复执行，这类动作使用 `callOnce()` 或明确的服务端逻辑更合适。

### 取数时最常见的几个坑

- 独立请求串行 `await`，无意中形成瀑布；
- 把整个后端对象塞进 payload，应该用 `pick` / `transform` 缩小传输内容；
- 用固定 URL，再额外 watch 参数，却忘了 URL 本身已经在第一次调用时求值；
- 自己包一层 async composable，破坏 Nuxt 编译器的 key 和上下文处理；新版本优先使用 `createUseFetch` / `createUseAsyncData`；
- SSR 请求第三方域名时无差别转发客户端 headers，可能泄露 cookie；只转发确实需要的 header。

## Nitro 让 Nuxt 不只是一套页面框架

`server/api/` 会生成 `/api/*`，`server/routes/` 可以生成任意服务端路径。Nitro 基于 h3，处理器可以直接返回对象，框架负责 JSON 序列化和类型生成。

```ts
// server/api/posts/[slug].get.ts
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    throw createError({
      status: 400,
      statusText: 'Bad Request',
      message: '文章 slug 格式不正确',
    })
  }

  const post = await findPostBySlug(slug)
  if (!post) {
    throw createError({
      status: 404,
      statusText: 'Not Found',
      message: '文章不存在',
    })
  }

  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    content: post.content,
  }
})
```

TypeScript 只能约束编译时，URL、query、body、cookie 和第三方响应都属于不可信边界，仍要在运行时校验。可以使用 h3 的 validated helpers 配合 schema validator，不要把 `as SomeType` 当验证。

Nitro 构建后输出独立的 `.output/`，并为 Node、serverless、edge 等环境提供 preset。平台无关不代表运行时完全相同：Node 原生模块、文件写入、长连接、后台任务和数据库连接池，在 edge 或短生命周期 serverless 中都要重新评估。

## 路由 middleware 和 server middleware 不一样

`app/middleware/` 处理 Vue Router 导航：

```ts
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware(() => {
  const session = useSession()

  if (!session.value.user)
    return navigateTo('/login')
})
```

页面通过 `definePageMeta({ middleware: 'auth' })` 使用；文件名带 `.global.ts` 时每次导航都运行。首次 SSR 和后续客户端导航都可能执行 route middleware，因此不要在其中放无法重复的副作用。

`server/middleware/` 则在 Nitro 请求进入具体路由前执行，适合请求日志、相关 ID、统一 header 等。它会影响 API 和资源请求，不是 Vue 页面导航钩子。

最重要的一点：前端路由守卫只是体验层。用户可以直接请求 `/api/admin`，真正的鉴权与授权必须在服务端 API 或 server middleware 中再次完成。

## Plugins 应该只做应用级接线

`app/plugins/` 中的 Nuxt plugin 适合安装 Vue 插件、注入 API client、注册全局 hook。`.client.ts` 和 `.server.ts` 可以限制运行环境：

```ts
// app/plugins/api.ts
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = $fetch.create({
    baseURL: config.public.apiBase,
  })

  return {
    provide: { api },
  }
})
```

页面初始数据若使用这个 `$api`，仍需包在 `useAsyncData()` 中，避免 SSR 双请求。插件会影响整个应用启动，重型初始化和彼此依赖太多会拖慢服务端请求与 hydration；功能局部可创建的对象不要都塞进全局 plugin。

浏览器专属 SDK 放在 `.client.ts`，但这只避免服务端 import 报错。第三方库若会立即改 DOM，通常还要等 `onMounted()` 或 `app:mounted`，否则仍可能打乱 hydration。

## `runtimeConfig`、`app.config` 和环境变量

需要按部署环境覆盖的值放 `runtimeConfig`：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    cmsToken: '',
    public: {
      apiBase: '/api',
      siteUrl: 'https://example.com',
    },
  },
})
```

- `cmsToken` 只在服务端可见；
- `public` 会进入客户端 payload，绝不能放密钥；
- 环境变量使用对应的 `NUXT_` 命名，例如 `NUXT_CMS_TOKEN`、`NUXT_PUBLIC_API_BASE`；
- `.env` 由 Nuxt CLI 在开发和构建时读取，但运行已构建的生产服务器时不会自动读取，部署平台要真正注入环境变量；
- 在 server route 中推荐 `useRuntimeConfig(event)`，确保读取当前请求环境下的覆盖值。

`app/app.config.ts` 适合公开、构建期确定、可热更新的主题或产品配置，也允许非 JSON 原始类型；它不是保存秘密或部署环境差异的地方。

不要把私有 runtime config 渲染到模板、写入 `useState()` 或从 API 原样返回。只要到过浏览器，就已经不是秘密。

## `useState` 和 Pinia 怎么分工

组件自己的状态用 `ref` / `reactive`。跨组件但结构简单的状态，可以封装 `useState`：

```ts
// app/composables/useTheme.ts
export function useTheme() {
  return useState<'light' | 'dark'>('theme', () => 'light')
}
```

`useState` 的值会写进 Nuxt payload，在 SSR 与客户端之间恢复，并按请求隔离。值必须可序列化，不要保存函数、类实例、Symbol 或循环引用。

下面这种模块顶层状态在浏览器 SPA 中看似正常，在常驻服务器上却可能被所有请求共享：

```ts
// 错误示例：可能跨用户泄漏
export const currentUser = ref<User | null>(null)
```

Pinia 适合状态多、业务 action 明确、需要 DevTools、插件或测试隔离的场景。Nuxt 中通过 `@pinia/nuxt` 集成后，同样要注意 SSR 初始化：

```vue
<script setup lang="ts">
const account = useAccountStore()

await callOnce('account', () => account.fetchCurrentUser())
</script>
```

`useState` 和 Pinia 不是“轻量版与高级版”的固定等级。主题、一次性 banner 用 `useState` 很自然；购物车、权限和复杂表单流程更适合 Pinia。需要跨刷新持久化时，还要选择 cookie、服务端会话或浏览器存储，store 本身不会自动持久化。

## SEO 不能只写一个 title

SSR 或预渲染解决的是“爬虫能否在 HTML 中看到内容”，页面仍需要正确的元信息。Nuxt 推荐用类型安全的 `useSeoMeta()`：

```vue
<script setup lang="ts">
interface Post {
  title: string
  description: string
}

const config = useRuntimeConfig()
const route = useRoute()
const { data: post } = await useFetch<Post>(
  () => `/api/posts/${String(route.params.slug)}`,
)

useSeoMeta({
  title: () => post.value?.title ?? '文章不存在',
  description: () => post.value?.description ?? '',
  ogTitle: () => post.value?.title ?? '',
  ogDescription: () => post.value?.description ?? '',
  ogUrl: () => `${config.public.siteUrl}${route.path}`,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [
    {
      rel: 'canonical',
      href: `${config.public.siteUrl}${route.path}`,
    },
  ],
})
</script>
```

站点级固定语言、favicon 和默认 title 可以放在 `nuxt.config.ts`；页面动态内容放 `useSeoMeta()`。Open Graph 图片和 canonical URL 使用绝对地址，并确认分页、筛选参数和重复内容的索引策略。

如果页面本身使用 `ssr: false`，meta 标签虽然还能由客户端修改，但很多抓取器和分享机器人不会等待 JavaScript。需要 SEO 的内容不要靠客户端后补。

## 错误处理要分层

Nuxt 中的错误来源不止页面请求：Vue 渲染、插件启动、Nitro handler 和 chunk 下载都可能失败。

- `throw createError(...)`：表达带 HTTP 状态的业务错误，页面和服务端都能使用；
- `app/error.vue`：致命错误的全屏错误页，`clearError({ redirect: '/' })` 可清理并跳转；
- `<NuxtErrorBoundary>`：只替换局部客户端子树，不让整个应用进入错误页；
- `onErrorCaptured()` / `vue:error` hook：捕获、记录组件错误；
- API route：返回正确 4xx / 5xx，不要把所有失败包装成 `200 { success: false }`。

`statusText` 应保持简短且符合 HTTP ASCII 约束，中文详情写进 `message`。错误页是一次新的页面渲染，middleware 可能再次运行；如果错误本身来自 plugin，清理错误前不要盲目依赖该 plugin 注入的能力。

错误 UI 也要区分“可以重试的局部请求失败”和“页面根本不存在”。把所有 `useFetch` error 都升级为全屏 500，用户体验通常很差。

## SSR 水合最常见的坑

hydration 会让客户端 Vue 接管服务端已经生成的 DOM。两边第一次渲染不一致时，Vue 会警告并尝试恢复，可能重新创建节点、造成闪烁或让事件绑定异常。

### 浏览器 API 参与首次渲染

```ts
// 错误：服务端没有 localStorage
const theme = localStorage.getItem('theme')
```

需要服务端知道的偏好放 cookie：

```ts
const theme = useCookie<'light' | 'dark'>('theme', {
  default: () => 'light',
})
```

仅浏览器可用的组件放进 `<ClientOnly>` 并提供尺寸稳定的 fallback，或者在 `onMounted()` 后初始化。能用 CSS 媒体查询解决的响应式布局，不要在模板里判断 `window.innerWidth`。

### 随机数、时间和时区

服务端与客户端分别调用 `Math.random()` 会得到不同结果。需要同一个随机值时用 `useState()` 在服务端生成并随 payload 恢复。时间展示优先 `<NuxtTime>`，或延迟到客户端，并避免 fallback 引起布局跳动。

### 非法 HTML

浏览器会修正不合法嵌套，例如把 `<p><div>...</div></p>` 重排。服务端字符串与浏览器修正后的 DOM 自然对不上。先检查最终 HTML，不要看到 warning 就用 `<ClientOnly>` 掩盖。

### 跨请求状态与重复取数

模块顶层可变状态会在常驻服务端共享，可能直接泄漏另一个用户的数据。首屏 setup 裸用 `$fetch` 又会让客户端重新请求。对应地使用 `useState` / Pinia SSR 集成，以及 `useFetch` / `useAsyncData`。

hydration warning 不只是开发环境噪音。它意味着 SSR 的正确性假设已经被破坏，应从第一处不一致开始修。

## 部署前先决定需要什么运行时

Nitro 能生成多种目标产物，但选择仍取决于业务：

| 方式           | 适合                                       | 主要限制                                     |
| -------------- | ------------------------------------------ | -------------------------------------------- |
| 静态生成       | 文档、博客、更新不频繁的营销页             | 构建时必须知道路由，无法做每请求个性化 SSR   |
| 常驻 Node 服务 | 复杂 SSR、长连接、稳定连接池、传统基础设施 | 要负责进程、扩缩容、缓存和监控               |
| Serverless     | 流量波动大、希望按请求扩容                 | 冷启动、执行时长、无持久磁盘、数据库连接管理 |
| Edge           | 全球低延迟、轻量鉴权和边缘渲染             | Node API、原生依赖、CPU 时间和平台兼容约束   |

Node 构建通常这样运行：

```bash
pnpm build
node .output/server/index.mjs
```

纯静态站点：

```bash
pnpm generate
```

产物位于 `.output/public/`。其他平台通过对应 Nitro preset 生成适配产物，优先使用平台与 Nuxt 官方维护的 preset，不要复制一份多年不更新的部署脚本。

上线前至少确认：

1. route rules 在目标 preset 上的真实缓存行为；
2. runtime 环境变量是在启动时注入，还是已被构建进产物；
3. serverless / edge 是否支持使用中的 Node API、数据库驱动和图像处理库；
4. 动态路由是否被完整预渲染，404 与重定向是否正确；
5. 多实例部署下，内存缓存和本地文件是否会产生不一致；
6. 日志、错误上报、追踪 ID 和健康检查是否覆盖 Nitro 层。

## 一套实际的选型顺序

拿到新页面时，可以按这个顺序决定，而不是先堆 API：

1. **页面是否需要可索引首屏内容**：需要就保留 SSR / prerender，不需要可考虑局部 CSR；
2. **数据是否构建时可知**：可知且变化慢就 prerender，变化频繁再选 SSR、SWR 或 ISR；
3. **数据从哪里来**：HTTP 用 `useFetch`，SDK 或组合查询用 `useAsyncData`，用户动作使用 `$fetch`；
4. **状态归谁所有**：组件局部状态、`useState`、Pinia、cookie 或服务端 session 各司其职；
5. **代码运行在哪**：浏览器、Vue SSR、Nitro，跨边界的数据都要验证和序列化；
6. **最终部署在哪**：先验证目标 preset 的能力，再决定缓存、数据库和 Node 依赖。

Nuxt 的约定确实很多，但它们围绕的是同一件事：把一次服务端渲染和后续客户端应用可靠地接起来。只要始终能回答“这段代码此刻在哪运行”，大部分看似玄学的问题都会变得具体。

## 官方参考

- [Nuxt 4 Directory Structure](https://nuxt.com/docs/4.x/directory-structure)
- [Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering)
- [Data Fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching)
- [Nitro Server Engine](https://nuxt.com/docs/4.x/guide/concepts/server-engine)
- [State Management](https://nuxt.com/docs/4.x/getting-started/state-management)
- [Runtime Config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config)
- [SEO and Meta](https://nuxt.com/docs/4.x/getting-started/seo-meta)
- [Error Handling](https://nuxt.com/docs/4.x/getting-started/error-handling)
- [Nuxt and Hydration](https://nuxt.com/docs/4.x/guide/best-practices/hydration)
- [Deployment](https://nuxt.com/docs/4.x/getting-started/deployment)
