---
title: 'Vapor Mode'
description: 'Vue 3.6 Vapor Mode 的编译模型、启用方式、兼容边界与迁移判断。'
date: 2026-07-24
tags:
  - 'Vue 3.6'
  - 'Vue'
  - 'Vapor Mode'
  - '性能优化'
categories:
  - '前端'
  - 'Vue'
---

## 先说结论：它还不是稳定功能

截至 2026 年 8 月 7 日，npm 的 `latest` 仍指向 Vue `3.5.40`，Vue 3.6 的最新版本是 `3.6.0-rc.2`。Vapor Mode 已在 3.6 RC 阶段完成预定功能，但 Vue 官方仍把 RC 标记为预发布版本。

“功能完备”和“稳定发布”不是一回事。前者意味着不会再补一轮大功能，后者还要经过真实项目验证、修复兼容性问题并形成稳定版本。官方此时建议的范围也很克制：

- 在现有应用里局部使用，例如改造一个更新压力很大的页面；
- 用 Vapor 构建小型新应用；
- 暂时不要把大型成熟项目的全量迁移当作常规升级。

如果项目要求长期稳定、依赖较多或没有足够的回归测试，继续使用 Vue 3.5 的 Virtual DOM 模式更稳妥。

## Vapor 到底改了什么

传统 Vue SFC 会被编译成渲染函数。组件更新时，渲染函数生成新的 VNode，运行时再比较新旧 VNode，把差异同步到真实 DOM。Vue 的编译器已经能标记静态节点、动态属性和稳定片段，所以这里并不是“每次粗暴比较整棵树”，但 VNode 创建与 patch 运行时仍然存在。

Vapor 选择了另一条路：编译器提前分析模板，把静态结构、节点创建和动态绑定拆开，生成直接操作 DOM 的代码，并让响应式副作用只更新对应的文本、属性或结构分支。更新时不再先构造一棵新的 VNode 树。

可以把两种模型简化为：

```text
Virtual DOM：状态变化 → 重新执行渲染函数 → 创建 VNode → diff / patch → DOM
Vapor：      状态变化 → 命中对应响应式副作用 ───────────────→ DOM
```

这也是 Vapor 能减少基础运行时代码并改善细粒度更新性能的原因。它不是把 Vue 改造成另一套模板语法，而是让熟悉的 SFC 在编译后走另一套运行时。

| 对比项     | Virtual DOM 模式                       | Vapor Mode                                 |
| ---------- | -------------------------------------- | ------------------------------------------ |
| 更新单位   | 组件渲染与 VNode patch                 | 编译期生成的细粒度 DOM 更新                |
| 基础运行时 | 包含 VDOM runtime                      | 纯 Vapor 应用可以不带 VDOM runtime         |
| 动态能力   | render function、JSX 和 VNode 生态成熟 | 以可静态分析的模板和 `<script setup>` 为主 |
| 兼容性     | Vue 3 现有生态的默认模式               | 只兼容 Vue API 的一个子集                  |
| 迁移成本   | 无                                     | 需要排查实例代理、指令、插槽和组件库       |

## 如何启用

### 先在独立分支固定预发布版本

试验阶段不要使用会自动漂移的版本范围。下面的版本号对应本文写作时的最新 RC：

```bash
pnpm add vue@3.6.0-rc.2
pnpm add -D @vitejs/plugin-vue@^6.0.8
```

升级 Vue 时，`vue`、`@vue/compiler-sfc` 和服务端渲染相关包应保持同一版本，避免编译器与运行时不匹配。

### 按组件启用

最适合现有项目的方式，是在 SFC 上显式增加 `vapor` 标记：

```vue
<script setup lang="ts" vapor>
import { computed, shallowRef } from 'vue'

const count = shallowRef(0)
const doubled = computed(() => count.value * 2)
</script>

<template>
  <button type="button" @click="count++">
    {{ count }} × 2 = {{ doubled }}
  </button>
</template>
```

`<script vapor>` 是 `<script setup vapor>` 的简写。纯模板组件也可以把标记写在模板上：

```vue
<template vapor>
  <p>这整个 SFC 会按 Vapor 模式编译。</p>
</template>
```

Vapor 不支持 Options API，因此不能在普通的 `export default { data, methods }` 组件上直接打开。

### 在 Vite 中把兼容 SFC 默认编译为 Vapor

`@vitejs/plugin-vue` 6.0.8 增加了插件级兜底选项。它适合已经确认整个应用符合约束的新项目，不适合作为第一次试验的开关：

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue({
      features: {
        vapor: true,
      },
    }),
  ],
})
```

这个选项只会把兼容的 `<script setup>` SFC 作为 Vapor 处理；逐文件的 `vapor` 标记仍然更容易审查和回退。

### 纯 Vapor 应用

如果根组件到叶子组件都使用 Vapor，可以从 `createVaporApp()` 启动：

```ts
// main.ts
import { createVaporApp } from 'vue'
import App from './App.vue'

createVaporApp(App).mount('#app')
```

这种方式不引入 Virtual DOM runtime，缩减基础包体积的收益最完整。

### 与现有 VDOM 应用混用

现有应用通常由 `createApp()` 启动。要在其中渲染 Vapor 组件，需要安装互操作插件：

```ts
// main.ts
import { createApp, vaporInteropPlugin } from 'vue'
import App from './App.vue'

createApp(App)
  .use(vaporInteropPlugin)
  .mount('#app')
```

反过来，Vapor 应用要使用 VDOM 组件，也需要 `vaporInteropPlugin`。一旦把 VDOM runtime 带回来，纯 Vapor 的基础包体积优势就会被削弱。

互操作覆盖常规 props、事件和插槽，但官方明确提醒仍可能存在边缘问题。实践中最好按页面或功能区域划界，避免 Vapor 和 VDOM 组件层层交叉嵌套。

## 不能忽略的兼容边界

Vapor 的目标不是无条件兼容所有 Vue 写法。下面这些能力在 3.6 RC 中不支持，或语义与 VDOM 模式不同：

- 不支持 Options API；
- 不支持 `app.config.globalProperties`；
- Vapor 组件中的 `getCurrentInstance()` 返回 `null`；
- 不支持 `@vue:mounted` 这类元素级生命周期事件；
- 不支持 `v-memo`，因为它本来就是面向 VNode 更新的优化；
- 组件模板 ref 不再暴露 `$el`、`$props`、`$attrs`、`$slots`、`$refs` 等实例代理属性；
- render function 和 JSX 组件仍属于 VDOM 组件，放进纯 Vapor 应用时需要互操作；
- 自定义指令使用新的函数式接口，依赖传统指令钩子对象的代码不能直接照搬。

### 事件委托与 `stopPropagation()`

Vapor 会把符合条件的事件委托到 `document`。如果某个祖先节点提前调用 `stopPropagation()`，事件到不了 `document`，委托处理器也不会执行。

确实需要直接绑定到元素时，可以使用动态事件或对象形式绕过委托：

```vue
<script setup lang="ts" vapor>
const eventName = 'click' as const

function handleClick(): void {
  console.log('direct listener')
}
</script>

<template>
  <button @[eventName]="handleClick">
    Direct listener
  </button>
</template>
```

这类差异在封装菜单、弹层和手势组件时尤其值得检查。

### 不要把调用插槽当成无副作用探测

在 VDOM 思维里，有些代码会先执行 `slots.default?.()`，查看返回值后再决定渲染什么。Vapor 中调用插槽可能立即创建 DOM、注册响应式副作用，SSR 水合时还可能认领已有节点，因此不能把它当作安全的“试运行”。

能交给模板的插槽渲染就留在模板里：

```vue
<template vapor>
  <slot>
    <p>没有传入内容时显示这里。</p>
  </slot>
</template>
```

## 哪些场景值得试

比较适合的场景：

- 高频更新、节点较多，并且性能分析确认组件更新是主要瓶颈；
- 小型交互工具、嵌入式组件或对基础包体积敏感的页面；
- 组件主要使用模板、Composition API 和 `<script setup>`；
- 团队能控制大部分组件源码，有完整的单元测试和端到端测试。

暂时不适合贸然迁移的场景：

- 大量使用 Options API、JSX、render function 或 `getCurrentInstance()`；
- UI 组件库和内部插件依赖组件实例代理或 VNode；
- SSR 页面包含复杂插槽、Teleport、自定义指令，但缺少水合回归测试；
- 现有页面没有性能数据，只是希望换编译模式后“自动变快”。

Vapor 能减少框架层面的工作，但不能解决昂贵的业务计算、超大 DOM、同步布局抖动、图片过重或请求瀑布。优化前仍应先用 Performance 面板和 Vue DevTools 找到真正的热点。

## 一条更稳的迁移路线

1. **先做静态排查**：搜索 Options API、`getCurrentInstance`、`globalProperties`、JSX、render function、`v-memo` 和实例 `$` 属性。
2. **固定版本和基准**：在独立分支锁定 RC 版本，记录产物体积、首屏指标和热点交互耗时。
3. **从叶子或独立页面开始**：优先选择依赖少、边界清楚、更新频繁的区域，不要先改应用壳和全局基础组件。
4. **减少交叉嵌套**：把 VDOM 组件库留在一个明确区域，避免互操作边界散落在组件树各层。
5. **补齐行为测试**：重点覆盖事件传播、插槽、模板 ref、自定义指令、Teleport、SSR 和 hydration。
6. **重新测量再决定**：同时比较性能、包体积、开发工具体验和维护成本。收益不足时，回退逐文件标记即可。

Vapor 最有价值的地方，是给 Vue 增加一种不依赖 VNode 的编译选择，而不是宣布 Virtual DOM 已经过时。3.6 RC 已经足够用来认真验证，但离“所有 Vue 项目都应该打开”还有一段生态磨合期。

## 官方参考

- [Vue 3.6.0 RC.1 发布说明与 Vapor Mode 状态](https://github.com/vuejs/core/releases/tag/v3.6.0-rc.1)
- [Vue 3.6.0 RC.2 发布页](https://github.com/vuejs/core/releases/tag/v3.6.0-rc.2)
- [Vue npm 版本列表](https://www.npmjs.com/package/vue?activeTab=versions)
- [@vitejs/plugin-vue 的 Vapor 全局开关](https://github.com/vitejs/vite-plugin-vue/pull/766)
