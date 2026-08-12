---
title: 'Vue 3.5 新特性'
description: '从响应式重构到懒水合，梳理 Vue 3.5 真正值得在项目中使用的变化。'
date: 2026-08-07
tags:
  - 'Vue 3.5'
  - 'Vue'
  - 'Composition API'
  - 'SSR'
categories:
  - '前端'
  - 'Vue'
---

Vue 3.5 没有破坏性变更，升级时很少需要改业务代码，但它并不是一次只修边角问题的小版本。响应式系统重构、Reactive Props Destructure 稳定、模板 ref、SSR 懒水合和 watcher 清理，都能直接改善日常开发。

这篇不照着 changelog 逐条念，重点看哪些变化会影响现在的写法。

## 响应式系统重构

Vue 3.5 重写了响应式依赖管理的内部实现，使用版本计数和双向链表维护订阅关系。对业务代码来说，`ref`、`reactive`、`computed` 和 `watch` 的公开行为没有改变；收益主要体现在框架内部：

- 官方测试中的响应式内存占用下降约 56%；
- 修复 SSR 中悬空 computed 造成的陈旧值和内存问题；
- 大型深层响应式数组的依赖追踪在部分场景可快到原来的 10 倍；
- 依赖增删更稳定，computed 是否失效也更容易判断。

这类优化通常不需要改一行代码。不过，“数组追踪变快”不等于可以随意把几十万条深层对象全部做成响应式数据。大型只读结果集依然适合 `shallowRef()`，更新时替换根引用：

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'

interface Row {
  id: string
  title: string
}

const rows = shallowRef<Row[]>([])

function appendRow(row: Row): void {
  rows.value = [...rows.value, row]
}
</script>
```

框架优化降低了正常使用的成本，数据结构选择仍然要看更新方式。

## Reactive Props Destructure 正式稳定

Vue 3.4 及更早版本中，从 `defineProps()` 解构出来的变量会失去响应式连接。Vue 3.5 默认启用编译转换，在同一个 `<script setup>` 中访问解构变量时，编译器会把它改写成对应的 `props.xxx`。

这让类型声明和默认值都简洁了不少：

```vue
<script setup lang="ts">
import { computed, watch } from 'vue'

interface Props {
  title?: string
  pageSize?: number
}

const {
  title = '未命名列表',
  pageSize = 20,
} = defineProps<Props>()

const heading = computed(() => `${title}（每页 ${pageSize} 条）`)

watch(
  () => pageSize,
  size => console.log('page size:', size),
)
</script>

<template>
  <h2>{{ heading }}</h2>
</template>
```

这里有一个容易踩的坑：解构变量看起来像 ref，实际并不是 ref。下面的写法等价于把一个普通数值交给 `watch()`，编译器会给出警告：

```ts
// 错误：pageSize 不是 WatchSource
watch(pageSize, () => {})
```

需要保留响应式时传 getter：

```ts
watch(() => pageSize, size => console.log(size))
```

传给 composable 也是同样的规则。composable 可以用 `toValue()` 同时兼容普通值、ref 和 getter：

```ts
import { toValue, watchEffect, type MaybeRefOrGetter } from 'vue'

export function usePageSize(source: MaybeRefOrGetter<number>) {
  watchEffect(() => {
    console.log('current page size:', toValue(source))
  })
}

// 调用处
usePageSize(() => pageSize)
```

如果团队认为解构后的变量和普通常量太像，可以继续保留 `const props = defineProps<Props>()` 的写法，或者在 Vue 官方 VS Code 扩展里开启解构 props 的 inlay hint。新语法是可用工具，不是必须遵守的风格。

## `useTemplateRef()` 让模板引用不再靠同名约定

过去通常这样声明模板 ref：

```ts
const input = ref<HTMLInputElement | null>(null)
```

然后模板里写 `ref="input"`。变量名与模板 ref 名必须对应，封装 composable 或使用动态 ref 时不够灵活。

Vue 3.5 提供 `useTemplateRef()`，通过运行时字符串关联模板节点，返回只读的 shallow ref：

```vue
<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'

const searchInput = useTemplateRef<HTMLInputElement>('search-input')

onMounted(() => {
  searchInput.value?.focus()
})
</script>

<template>
  <input
    ref="search-input"
    type="search"
    placeholder="搜索文章"
  >
</template>
```

配合 `@vue/language-tools` 2.1 及以上版本，静态模板 ref 的元素或组件类型通常能自动推断。显式泛型仍然适合写在文档示例或推断不充分的位置。

对组件 ref 也要保持克制：优先使用 props 和 emits。确实需要命令式调用时，让子组件通过 `defineExpose()` 只暴露必要方法，不要依赖完整组件实例。

## `useId()` 解决 SSR 下的稳定 ID

表单标签、错误提示和无障碍属性经常需要唯一 ID。数组下标会随结构变化，`Math.random()` 又会让服务端 HTML 与客户端第一次渲染不一致。

`useId()` 返回应用内唯一，并且在服务端与客户端渲染之间保持稳定的字符串：

```vue
<script setup lang="ts">
import { useId } from 'vue'

const emailId = useId()
const helpId = useId()
</script>

<template>
  <label :for="emailId">邮箱</label>
  <input
    :id="emailId"
    type="email"
    :aria-describedby="helpId"
  >
  <small :id="helpId">我们不会公开你的邮箱。</small>
</template>
```

同一组件多次调用、同一组件的多个实例，都会获得不同 ID。如果页面同时挂载多个 Vue 应用，可以用 `app.config.idPrefix` 区分应用。不要在 `computed()` 内调用 `useId()`，应在 setup 顶层生成后再引用。

## `onWatcherCleanup()` 集中处理失效副作用

搜索联想里最常见的竞态是：旧请求比新请求晚返回，最终用旧结果覆盖新结果。Vue 一直支持 watcher 回调的 `onCleanup` 参数，3.5 又提供了独立的 `onWatcherCleanup()`，让清理逻辑在嵌套函数中也更容易注册。

```vue
<script setup lang="ts">
import { onWatcherCleanup, shallowRef, watch } from 'vue'

interface SearchItem {
  id: string
  title: string
}

const query = shallowRef('')
const results = shallowRef<SearchItem[]>([])

function isSearchItems(value: unknown): value is SearchItem[] {
  return Array.isArray(value) && value.every((item) => {
    if (typeof item !== 'object' || item === null)
      return false

    const record = item as Record<string, unknown>
    return typeof record.id === 'string' && typeof record.title === 'string'
  })
}

watch(query, async (value) => {
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())

  if (!value.trim()) {
    results.value = []
    return
  }

  const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`, {
    signal: controller.signal,
  })

  if (!response.ok)
    throw new Error(`Search failed: ${response.status}`)

  const payload: unknown = await response.json()
  if (!isSearchItems(payload))
    throw new Error('Invalid search response')

  results.value = payload
})
</script>
```

`onWatcherCleanup()` 必须在 watcher 回调或 `watchEffect()` 的同步执行阶段调用，不能放到 `await` 后面。需要在异步执行后注册清理时，继续使用回调参数中的 `onCleanup`。

## watcher 还能暂停，并限制深度

3.5 的 `watch()` 与 `watchEffect()` 返回句柄增加了 `pause()` 和 `resume()`。批量写入期间不希望执行昂贵副作用时，比销毁后重新创建 watcher 更方便：

```ts
import { watchEffect } from 'vue'

const handle = watchEffect(() => {
  persistDraft()
})

handle.pause()
try {
  applyRemotePatch()
}
finally {
  handle.resume()
}

// 不再需要时
handle.stop()
```

`deep` 也可以传数字，限制向下遍历的最大层数：

```ts
watch(settings, saveSettings, { deep: 2 })
```

这能避免为了观察少量嵌套字段而遍历整棵大对象。不过如果只关心几个字段，显式 getter 依然最清楚。

## Deferred Teleport

以前 `<Teleport>` 挂载时，目标节点必须已经存在。目标也由 Vue 渲染、但出现在同一模板后方时，常常需要把容器挪到应用壳。

3.5 的 `defer` 会把目标解析推迟到当前 mount / update tick 的末尾：

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'

const open = shallowRef(false)
</script>

<template>
  <button type="button" @click="open = true">
    打开抽屉
  </button>

  <Teleport defer to="#drawer-target">
    <aside v-if="open">
      抽屉内容
    </aside>
  </Teleport>

  <div id="drawer-target" />
</template>
```

`defer` 只等当前渲染周期。如果目标节点要一秒后才出现，Teleport 仍会报错，它不是无限等待目标的机制。

## SSR 懒水合策略

SSR 先把 HTML 发给浏览器，hydration 再为节点建立响应式关系和事件处理。首屏下方的评论、推荐或图表即使暂时看不到，默认也会跟着水合，可能挤占主线程。

Vue 3.5 允许异步组件指定水合策略。比如组件接近视口时再水合：

```vue
<script setup lang="ts">
import {
  defineAsyncComponent,
  hydrateOnVisible,
} from 'vue'

const CommentsPanel = defineAsyncComponent({
  loader: () => import('./CommentsPanel.vue'),
  hydrate: hydrateOnVisible({ rootMargin: '200px' }),
})
</script>

<template>
  <CommentsPanel />
</template>
```

内置策略包括：

- `hydrateOnIdle()`：浏览器空闲时水合，可设置最长等待时间；
- `hydrateOnVisible()`：借助 `IntersectionObserver`，接近或进入视口时水合；
- `hydrateOnMediaQuery()`：媒体查询命中时水合；
- `hydrateOnInteraction()`：点击、悬停等交互发生时水合，并重放触发水合的事件；
- 自定义 `HydrationStrategy`：自行决定时机并返回清理函数。

这是面向 SSR 异步组件的底层 API，不是普通客户端组件的懒加载替代品。实际项目还要同时考虑代码分包、数据请求和组件水合时机，不能只改一个选项就期待首屏指标大幅改善。

## `data-allow-mismatch` 只屏蔽“不可避免”的差异

服务器时区与用户时区不同，本地化时间文本可能天然不一致。Vue 3.5 可以在对应元素上标记允许的 mismatch 类型：

```vue
<script setup lang="ts">
const { timestamp } = defineProps<{
  timestamp: number
}>()
</script>

<template>
  <time data-allow-mismatch="text">
    {{ new Date(timestamp).toLocaleString() }}
  </time>
</template>
```

可选值包括 `text`、`children`、`class`、`style` 和 `attribute`。不传值时允许该元素上的所有类型。

它只是抑制已知警告，不会修复错误的服务端渲染。随机数、非法 HTML 嵌套、浏览器 API参与首屏条件判断等问题，仍应该让服务端和客户端第一次渲染保持一致。

## 其他值得留意的变化

Vue 3.5 还完善了 Custom Elements：可以通过 `configureApp` 配置应用，支持 `useHost()`、`useShadowRoot()`、关闭 Shadow DOM 以及为注入的 `<style>` 设置 CSP nonce。对组件库作者来说，这比业务页面更重要。

升级时建议一起检查：

1. Vue 相关包保持同版本，更新 `@vue/language-tools` 与 `vue-tsc`；
2. 为 Reactive Props Destructure 统一团队风格，避免一部分代码误把解构变量当 ref；
3. 把请求取消、计时器和事件订阅收口到 watcher cleanup；
4. SSR 项目重点回归 ID、水合、Teleport 和异步组件；
5. 优化前后都用真实页面测量，不把框架基准直接换算成业务收益。

## 官方参考

- [Announcing Vue 3.5](https://blog.vuejs.org/posts/vue-3-5)
- [Reactive Props Destructure](https://vuejs.org/guide/components/props.html#reactive-props-destructure)
- [Composition API Helpers](https://vuejs.org/api/composition-api-helpers.html)
- [Watcher API 与 onWatcherCleanup](https://vuejs.org/api/reactivity-core.html#onwatchercleanup)
- [异步组件的 Lazy Hydration](https://vuejs.org/guide/components/async.html#lazy-hydration)
- [Deferred Teleport](https://vuejs.org/guide/built-ins/teleport.html#deferred-teleport)
