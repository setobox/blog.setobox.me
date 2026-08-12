---
title: 'Vue 常见面试题'
description: '从响应式原理到 Pinia、SSR，整理 Vue 面试中真正需要讲清楚的问题。'
date: 2026-08-07
tags:
  - 'Vue'
  - 'Vue 3'
  - 'Pinia'
  - '前端面试'
categories:
  - '面试题'
  - '前端'
---

Vue 面试最怕背 API 名字。面试官继续问一句“为什么”，如果只记得结论，很快就会卡住。下面按实际项目中的因果关系来整理：先说明框架如何工作，再谈什么时候用、哪里会出问题。

## Vue 3 的响应式是怎么工作的

Vue 3 主要使用两种拦截方式：

- `reactive()` 用 `Proxy` 代理对象，读取属性时收集依赖，写入、删除或迭代结构变化时触发依赖；
- `ref()` 把值放进带 getter / setter 的 `.value` 属性。传入对象时，默认还会用 `reactive()` 做深层转换。

组件渲染、`computed()` 和 watcher 都会创建响应式 effect。effect 执行时，Vue 记录当前活跃 effect；代码读取响应式属性后，`track()` 把属性与 effect 建立关系；属性变化时，`trigger()` 找到订阅者并交给调度器执行。

可以把核心过程简化为：

```ts
let activeEffect: (() => void) | undefined

const dependencies = new WeakMap<
  object,
  Map<PropertyKey, Set<() => void>>
>()

function track(target: object, key: PropertyKey): void {
  if (!activeEffect)
    return

  let targetMap = dependencies.get(target)
  if (!targetMap) {
    targetMap = new Map()
    dependencies.set(target, targetMap)
  }

  let effects = targetMap.get(key)
  if (!effects) {
    effects = new Set()
    targetMap.set(key, effects)
  }

  effects.add(activeEffect)
}
```

真实实现还要处理 effect 清理、嵌套执行、computed 缓存、数组与集合类型、批量调度等，不能把这段示意代码当作源码。

### `ref()` 和 `reactive()` 怎么选

`ref()` 能保存任意类型，也允许整体替换；`reactive()` 只接受对象，适合以属性修改为主的状态。团队里常见的做法是以 `ref` 为默认选择，表单或聚合状态再用 `reactive`。

```ts
import { reactive, shallowRef } from 'vue'

const selectedId = shallowRef<string | null>(null)

const form = reactive({
  name: '',
  email: '',
})
```

`reactive()` 有两个重要限制：

1. 整体换成另一个对象会断开原代理的连接；
2. 普通 JavaScript 解构会拿到当前值，失去属性访问带来的依赖追踪。

```ts
const state = reactive({ count: 0 })
const { count } = state // count 只是普通 number
```

可以使用 `toRefs()`，或保留 `state.count` 访问。Vue 3.5 的 Reactive Props Destructure 是 `defineProps()` 的编译期特例，不代表任意 `reactive()` 对象都能安全解构。

### 为什么模板里经常不用写 `.value`

模板编译器会自动解包顶层 ref，所以模板中可以写 `count`。JavaScript 中没有这层编译转换，仍然要写 `count.value`。ref 放进深层对象、数组或原生集合时，解包规则也有边界，不能把“模板会解包”理解成任何位置都会透明处理。

## `computed`、`watch` 和 `watchEffect` 有什么区别

一句话区分：`computed` 负责派生值，watcher 负责副作用。

### `computed`

- getter 应该保持纯函数，不发请求、不写存储、不修改其他状态；
- 结果会缓存，依赖未变化时重复读取不会重新计算；
- 默认只读，也可以提供 getter / setter 构造可写 computed；
- Vue 3.4 以后，计算结果没有改变时不会继续触发下游 effect。

```ts
import { computed, shallowRef } from 'vue'

const price = shallowRef(100)
const quantity = shallowRef(2)

const total = computed(() => price.value * quantity.value)
```

### `watch`

- 显式指定依赖，只有来源变化才调用回调；
- 默认懒执行，可用 `immediate: true` 首次执行；
- 能拿到新旧值；
- 适合请求、日志、持久化和与非响应式系统同步。

```ts
watch(
  () => props.userId,
  userId => loadUser(userId),
  { immediate: true },
)
```

来源要传 ref、reactive 对象、getter 或它们的数组，不能传已经读取出来的普通值。观察对象时，优先写到具体字段；`deep: true` 会遍历整棵对象，数据大时成本不低。Vue 3.5 可以用数字限制最大深度。

### `watchEffect`

- 立即运行，在同步执行期间自动收集读取过的依赖；
- 写起来短，但依赖不如 `watch` 显式；
- 异步回调只追踪第一个 `await` 之前读取的依赖；
- 适合依赖较多但副作用简单的同步场景。

两种 watcher 都应该清理失效副作用。Vue 3.5 可以使用 `onWatcherCleanup()`，并且要在 `await` 前注册：

```ts
import { onWatcherCleanup, shallowRef, watch } from 'vue'

const query = shallowRef('')

watch(query, async (value) => {
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())

  await fetch(`/api/search?q=${encodeURIComponent(value)}`, {
    signal: controller.signal,
  })
})
```

`flush: 'pre'` 是默认值，在组件 DOM 更新前运行；需要读取更新后的 DOM 时用 `'post'`；`'sync'` 会跳过批处理，应谨慎使用。

## Vue 为什么要异步更新，`nextTick()` 做什么

一次同步代码可能连续修改多个状态。如果每次赋值都立刻重渲染，会产生大量重复工作。Vue 把组件更新任务放进队列，同一个组件在一个 tick 内会去重，然后通过微任务统一刷新。

`nextTick()` 等待的是 Vue 当前这轮 DOM 更新完成，不是随便延迟一个固定时间：

```vue
<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef } from 'vue'

const open = shallowRef(false)
const panel = useTemplateRef<HTMLElement>('panel')

async function openAndMeasure(): Promise<void> {
  open.value = true
  await nextTick()
  console.log(panel.value?.getBoundingClientRect())
}
</script>

<template>
  <button type="button" @click="openAndMeasure">打开</button>
  <section v-if="open" ref="panel">内容</section>
</template>
```

如果只是响应状态变化后读取 DOM，`watch(..., { flush: 'post' })` 往往比到处调用 `nextTick()` 更清楚。

## Composition API 生命周期怎么理解

`<script setup>` 本身就在组件 setup 阶段执行，通常不需要 `beforeCreate` 和 `created` 的替代钩子。常用对应关系如下：

| Options API     | Composition API   | 常见用途                             |
| --------------- | ----------------- | ------------------------------------ |
| `beforeMount`   | `onBeforeMount`   | 首次 DOM patch 前                    |
| `mounted`       | `onMounted`       | 访问 DOM、启动浏览器库               |
| `beforeUpdate`  | `onBeforeUpdate`  | DOM 更新前记录状态                   |
| `updated`       | `onUpdated`       | DOM 更新后处理，避免在这里继续改状态 |
| `beforeUnmount` | `onBeforeUnmount` | 实例仍可用时做清理                   |
| `unmounted`     | `onUnmounted`     | 清理监听、计时器和外部实例           |
| `activated`     | `onActivated`     | KeepAlive 缓存实例重新激活           |
| `deactivated`   | `onDeactivated`   | KeepAlive 实例进入缓存               |
| `errorCaptured` | `onErrorCaptured` | 捕获后代组件错误                     |

初次挂载时，父组件先进入 `beforeMount`，同步子组件完成挂载后，父组件才 `mounted`。卸载时父组件先进入 `beforeUnmount`，子组件先完成 `unmounted`，最后父组件 `unmounted`。

`onMounted()` 只保证同步子组件已挂载，不等待异步组件或 `<Suspense>` 中的异步依赖。SSR 期间也不会运行 `onMounted`、`onUpdated` 和 `onUnmounted`；服务端取数可使用框架能力或 `onServerPrefetch()`。

## 组件之间有哪些通信方式

先按数据所有权选择，不要一遇到跨组件就上全局 store。

1. **props down / events up**：父子组件的默认方案，边界最清楚；
2. **`v-model`**：子组件确实需要编辑父级值时，建立显式双向契约；
3. **slots**：父组件控制内容，子组件控制布局；作用域插槽可以把子组件数据交给父级模板；
4. **模板 ref + `defineExpose()`**：聚焦、打开弹窗等命令式操作，暴露最小 API；
5. **provide / inject**：主题、表单上下文等跨越多层组件树的依赖，使用 `InjectionKey` 保证类型；
6. **Pinia**：跨页面、跨功能共享，并有明确业务生命周期的状态；
7. **路由或 URL**：筛选条件、分页等需要刷新后保留和可分享的状态。

组件事件不会像原生 DOM 事件一样自动冒泡。祖父组件要监听孙组件事件，中间组件需要显式转发，或者重新评估状态应该归谁所有。

provide / inject 适合传上下文，但建议由 provider 保留修改权，只向下提供只读状态和明确 action，避免任意后代直接修改共享对象。

## 组件 `v-model` 的本质是什么

Vue 3 默认的组件 `v-model` 是一组 prop 与事件：

```vue
<Editor
  :model-value="title"
  @update:model-value="title = $event"
/>
```

Vue 3.4 以后，子组件用 `defineModel()` 可以直接声明这份契约：

```vue
<!-- Editor.vue -->
<script setup lang="ts">
const title = defineModel<string>({ required: true })
const page = defineModel<number>('page', { required: true })
</script>

<template>
  <input v-model="title" type="text">
  <button type="button" @click="page++">下一页</button>
</template>
```

父组件：

```vue
<Editor v-model="title" v-model:page="page" />
```

底层仍然是 `modelValue` / `update:modelValue`，命名 model 则是 `page` / `update:page`。`defineModel()` 还可以读取修饰符并通过 `get`、`set` 转换值。

给子组件 model 设置默认值时要小心：如果父级绑定值是 `undefined`，子组件可能已经有默认值，而父级仍是 `undefined`，形成短暂不同步。公共组件更适合声明 `required`，由父级决定初始值。

## Vue 3 的 diff 做了哪些事，为什么 `key` 重要

Vue 的模板编译器会提前标记静态内容、动态属性和稳定片段，运行时不必无差别遍历所有节点。对于带 key 的子节点列表，更新过程大致是：

1. 从头和尾同步相同节点；
2. 为剩余新节点建立 key 到索引的映射；
3. 找出可复用、需要卸载和需要新增的节点；
4. 对需要移动的部分求最长递增子序列，尽量减少真实 DOM 移动。

`key` 表示节点身份，不只是为了消除控制台警告。稳定 key 能让 Vue 判断“同一个数据项移动了位置”，从而保留正确的组件实例、输入状态和局部副作用。

不要使用随机数，也不要在可插入、删除或排序的列表中用数组下标。下标代表位置，不代表业务实体：

```vue
<UserRow
  v-for="user in users"
  :key="user.id"
  :user="user"
/>
```

同一个位置故意换 key，可以强制销毁旧组件并创建新实例，例如重置整个表单；这应该是明确意图，而不是修复状态问题的常规手段。

## `v-if` 和 `v-show` 怎么选

- `v-if` 是惰性的，条件为假时不创建分支；切换会挂载和卸载组件；
- `v-show` 首次就会渲染，只切换元素的 `display`；
- 初始很少展示、切换不频繁用 `v-if`；高频切换且节点创建昂贵时考虑 `v-show`。

`v-if` 与 `v-for` 不要写在同一个元素上。`v-if` 的优先级更高，表达式也拿不到当前 `v-for` 作用域。过滤列表应放进 computed，整组显示隐藏则把 `v-if` 写在外层容器。

## KeepAlive、Teleport 和 Suspense 分别解决什么

### KeepAlive

`<KeepAlive>` 缓存动态组件实例，切走时不会正常卸载，因此表单输入、滚动位置和局部状态可以保留。它缓存的是组件实例及其子树，不是把任何页面请求都自动缓存。

可以用 `include`、`exclude` 和 `max` 控制缓存。进入和离开缓存会触发 `onActivated()`、`onDeactivated()`；WebSocket、轮询或媒体播放不一定应该在缓存期间继续运行，需要主动暂停。

### Teleport

`<Teleport>` 只改变真实 DOM 的落点，组件逻辑层级没有改变。props、emits、provide / inject 和 DevTools 中的父子关系仍按原组件树工作。它适合弹窗、Toast、浮层等需要逃离祖先层叠上下文的内容。

目标节点要存在。Vue 3.5 的 `defer` 可以把目标解析延迟到同一个 mount / update tick 的末尾，但不会无限等待稍后出现的节点。

### Suspense

`<Suspense>` 协调异步 setup、顶层 `await` 和异步组件，在默认内容未就绪时显示 fallback。它仍被 Vue 标记为实验功能，公共 API 未来可能调整。

Suspense 不是通用请求库，也不会自动缓存接口。SSR 框架中的数据获取、路由导航和错误处理通常还有自己的约定，不能只套一层 Suspense 就算完成异步状态设计。

## 自定义指令适合做什么

自定义指令适合复用“直接操作某个 DOM 元素”的行为，例如聚焦、拖拽适配或第三方 DOM 插件绑定：

```vue
<script setup lang="ts">
import type { Directive } from 'vue'

const vFocus: Directive<HTMLInputElement> = {
  mounted(element) {
    element.focus()
  },
}
</script>

<template>
  <input v-focus type="text">
</template>
```

如果逻辑主要是状态和副作用，优先 composable；如果还包含一块可复用 UI，优先组件。指令拿到的是元素，组件内部结构一旦变化就容易耦合，因此不应该用指令代替组件通信。

指令钩子与组件生命周期相似，包括 `created`、`beforeMount`、`mounted`、`beforeUpdate`、`updated`、`beforeUnmount` 和 `unmounted`。绑定事件或外部实例时，要在卸载阶段成对清理。

## Vue 项目如何做性能优化

先区分加载性能和更新性能。没有性能数据时，优化很容易变成增加复杂度。

### 加载性能

- 营销页和内容页优先考虑 SSG 或 SSR，不必把所有页面都做成纯 SPA；
- 路由和重型组件使用动态 import，减少首屏 JavaScript；
- 检查依赖体积，利用 ESM tree-shaking，避免整包引入；
- 图片、字体、网络瀑布和缓存策略往往比框架微优化影响更大；
- SSR 页面使用懒水合时，同时评估可交互时间和事件体验。

### 更新性能

- 让传给子组件的 props 尽量稳定，不要让所有列表项都接收不断变化的全局值；
- 派生数据放进纯 `computed`，避免模板里反复过滤和排序；
- 大列表做虚拟滚动，不要一次创建几万个 DOM 节点；
- 大型不可变数据使用 `shallowRef()` / `shallowReactive()`，通过替换根引用更新；
- 避免在热路径的大列表中堆叠没有价值的组件抽象；
- `v-once`、`v-memo` 只用于测量后确认的热点，错误依赖会直接产生陈旧 UI；
- 清理 watcher、事件、计时器和外部实例，避免“页面越用越慢”。

Chrome Performance、Vue DevTools 的性能分析和生产环境 Web Vitals，应该先于优化方案出现。

## Vuex 和 Pinia 有什么区别

Pinia 最初就是对“下一代 Vuex”形态的探索，后来覆盖了 Vuex 5 原本要解决的大部分问题，成为 Vue 官方对新项目的推荐。Vuex 4 仍可运行在 Vue 3 上，老项目不必为了追新而立即重写。

| 对比项          | Vuex 4                              | Pinia                                    |
| --------------- | ----------------------------------- | ---------------------------------------- |
| 写入状态        | 通常通过 `commit` mutation          | action、直接赋值或 `$patch`              |
| 异步逻辑        | action，再 commit mutation          | action 可直接同步或异步修改 state        |
| 组织方式        | 单一 store + modules，可 namespaced | 多个扁平 store，天然按 ID 区分           |
| TypeScript      | 可以类型化，但常需要额外封装        | API 以类型推断为设计目标                 |
| Composition API | 通过 `useStore()` 使用              | Option Store 和 Setup Store 都是一级能力 |
| 动态注册        | 显式注册模块                        | store 使用时自然创建                     |
| DevTools        | 支持                                | 支持，并保留 action、state 时间线        |
| SSR             | 需要按请求创建 store 并序列化       | 同样需要请求隔离，官方提供成熟集成方式   |

Vuex 强制 mutation 的价值在于让状态变更有统一记录入口，但实际项目常出现大量只赋值一行的模板代码。Pinia 移除 mutation，action 既表达业务动作，也可以直接写 state。

Pinia 的 Setup Store 很接近普通 composable：

```ts
// stores/cart.ts
import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'

interface CartItem {
  id: string
  price: number
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  const items = shallowRef<CartItem[]>([])

  const total = computed(() => items.value.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  ))

  function addItem(item: CartItem): void {
    items.value = [...items.value, item]
  }

  return { items, total, addItem }
})
```

使用时不要直接解构 state 和 getter，否则会丢失响应式；使用 `storeToRefs()`，action 可以直接解构：

```ts
import { storeToRefs } from 'pinia'

const cart = useCartStore()
const { items, total } = storeToRefs(cart)
const { addItem } = cart
```

### 应该选哪个

- Vue 3 新项目优先 Pinia；
- 现有 Vuex 项目稳定、类型与模块封装完善时，可以继续维护；
- 迁移应按业务模块逐步进行，不要同时重写 store、组件和接口层；
- 只有单页面少量共享状态时，普通 composable 或 `provide/inject` 可能已经够用。

无论使用哪一个，store 都不应变成所有状态的垃圾桶。临时弹窗开关、只属于一个组件的表单草稿，留在局部更容易维护。

## SSR 和 hydration 是什么关系

SSR 在服务器执行组件，输出 HTML。浏览器先显示这份 HTML，再运行同一应用并进行 hydration：Vue 复用已有 DOM、建立组件实例、恢复响应式关系并绑定事件，而不是重新创建整页节点。

水合要求服务端输出与客户端第一次渲染的结构一致。常见 mismatch 来源包括：

- 非法 HTML 嵌套被浏览器自动修正，例如 `<p>` 中放 `<div>`；
- 模板中直接使用 `Math.random()`、当前时间或服务端与客户端不同时区的格式化结果；
- setup 阶段直接读取 `window`、`document`、`localStorage` 或屏幕宽度；
- 服务端请求之间共享模块级响应式状态，导致用户数据串线；
- 服务端与客户端分别请求一次数据，返回结果不同；
- 第三方库在 hydration 前擅自修改 DOM。

Vue 遇到 mismatch 会尝试恢复，但可能丢弃错误节点并重新挂载，增加可交互时间，还可能让事件和状态短暂错位。正确做法是让第一次渲染确定且可复现：

- 每个请求创建独立 app、router 和 store；
- 把服务端数据安全序列化到页面，再由客户端恢复；
- 浏览器专属逻辑放在 `onMounted()` 或框架的 `<ClientOnly>` 中，并准备稳定 fallback；
- 用 `useId()` 生成 SSR 稳定 ID；
- 用 Nuxt 的 `useFetch()`、`useAsyncData()` 和 `useState()` 等 SSR-aware API 避免双请求与状态泄漏；
- 序列化用户数据时防止闭合 `<script>` 等注入问题，使用框架提供的 payload 机制。

纯 Vue 可以自己搭 SSR，但生产项目还要处理路由、数据预取、资源清单、流式响应、缓存和部署，通常直接使用 Nuxt 更合理。

## Vue 2 和 Vue 3 的核心区别

| 主题            | Vue 2                              | Vue 3                                              |
| --------------- | ---------------------------------- | -------------------------------------------------- |
| 对象响应式      | `Object.defineProperty` 逐属性劫持 | `Proxy` 代理对象，ref 使用 getter / setter         |
| 新增 / 删除属性 | 有检测限制，常需 `Vue.set`         | Proxy 可拦截新增、删除与迭代                       |
| 数组            | 重写变异方法，索引和 length 有限制 | Proxy 可处理索引和 length                          |
| 逻辑复用        | mixin、renderless component        | Composition API、composable                        |
| 应用实例        | 全局 `Vue.use`、`Vue.component`    | `createApp()` 隔离每个应用配置                     |
| 根节点          | 组件通常要求单根                   | 支持 Fragment 多根节点                             |
| `v-model`       | `value` + `input`，`.sync` 补充    | `modelValue` + `update:modelValue`，支持多个 model |
| 事件声明        | 无 `emits` 选项                    | 可声明并校验 emits                                 |
| 内置能力        | 无 Teleport / Suspense             | 提供 Teleport，Suspense 仍为实验能力               |
| TypeScript      | 后补支持，类型推断有限             | 核心代码与 API 按 TypeScript 设计                  |
| 构建优化        | 全局 API 较难 tree-shake           | 多数 API 使用命名导入，可 tree-shake               |

Vue 3 不再内置 filters，推荐 computed 或普通格式化函数；`destroyed` / `beforeDestroy` 改名为 `unmounted` / `beforeUnmount`。迁移构建还要注意第三方库、全局实例 API、指令钩子和 `v-model` 契约。

Vue 3 的 Proxy 响应式不能在不支持 Proxy 的旧浏览器中用 polyfill 完整模拟，这也是它不支持 IE 11 的根本原因之一。

## 几个容易被追问的判断题

### props 能不能改

prop 绑定是只读的，不能在子组件中重新赋值。对象 prop 的深层属性在 JavaScript 层面仍然可改，但会形成隐式的父级状态修改。除非父子强耦合且契约明确，否则应 emit 事件让拥有者修改。

### `setup()` 里能不能用 `this`

不能依赖组件实例 `this`。setup 在实例选项完全建立前执行，Composition API 通过闭包和显式导入组织逻辑。`<script setup>` 顶层绑定会直接暴露给模板。

### `v-html` 有什么风险

它会把字符串作为 HTML 写入 DOM。用户输入或不可信接口内容会带来 XSS，插值 `{{ value }}` 才会自动转义。确实要渲染富文本时，在可信边界使用成熟白名单净化器，并限制链接、事件属性和 URL 协议。

### composable 和普通工具函数有什么区别

composable 通常使用 Vue 响应式 API或生命周期，封装有状态逻辑，并按约定以 `use` 开头。纯格式化、解析和数学计算没有响应式上下文，写成普通函数更合适。

### 为什么不建议把所有东西都做成响应式

响应式会带来代理、依赖追踪和调度成本。SDK 实例、DOM 节点、不可变大对象等不需要深层追踪的值，可以使用 `shallowRef()`、`markRaw()` 或保留为普通变量。状态最少、派生值明确，通常比后期补微优化更有效。

## 官方参考

- [Vue 响应式深入](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [Computed](https://vuejs.org/guide/essentials/computed.html)
- [Watchers](https://vuejs.org/guide/essentials/watchers.html)
- [组件基础与通信](https://vuejs.org/guide/essentials/component-basics.html)
- [Vue 性能优化](https://vuejs.org/guide/best-practices/performance.html)
- [Vue SSR 指南](https://vuejs.org/guide/scaling-up/ssr.html)
- [Pinia 与 Vuex 的官方对比](https://pinia.vuejs.org/introduction.html#comparison-with-vuex)
- [Vue 3 迁移指南](https://v3-migration.vuejs.org/)
