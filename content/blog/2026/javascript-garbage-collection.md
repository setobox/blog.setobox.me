---
title: '垃圾回收机制'
description: '从可达性和标记清除出发，理解 JavaScript 引擎的分代、增量与并发回收，以及常见内存泄漏的定位方法。'
date: 2026-07-26
tags:
  - JavaScript
  - GC
  - 内存管理
categories:
  - 面试题
  - JavaScript
draft: true
---

## 先说结论：GC 回收的是不可达对象

JavaScript 会自动管理内存，但“自动”不等于“不会泄漏”。垃圾回收器只能判断一个对象是否还可能被程序访问，无法判断开发者以后还想不想用它。

理解 GC 最实用的模型是**可达性**：从一组根节点出发，沿引用关系能够访问到的值就是可达的；无法到达的对象才有资格被回收。

常见的根节点包括：

- 当前调用栈里的局部变量和参数
- 全局对象及其属性
- 模块环境等仍由运行时持有的顶层绑定
- 宿主环境保留的回调，例如仍然注册着的事件监听器

遍历随后会沿普通对象属性和函数关联的闭包环境继续进行，因此一个仍然可达的回调也会保留它捕获的变量。

```ts
interface Profile {
  name: string
}

let profile: Profile | null = { name: 'Seto' }
const current = profile

profile = null
```

把 `profile` 设为 `null` 并不会让对象立刻消失，因为 `current` 仍然指向它。只有所有从根节点出发的强引用路径都断开后，它才变成不可达。至于具体何时回收，由引擎决定。

这也解释了为什么循环引用本身不是问题：

```ts
interface Node {
  peer?: Node
}

let left: Node | null = {}
let right: Node | null = {}

left.peer = right
right.peer = left

left = null
right = null
```

两个对象互相引用，但外部已经无法访问它们，现代 JavaScript 引擎仍能将它们回收。只有“引用计数”这一类单纯统计入度的算法才会被这种环困住。

## 标记—清除做了什么

标记—清除可以拆成两个动作：

1. 从根节点开始遍历对象图，标记所有可达对象。
2. 扫描堆，回收没有被标记的对象所占空间。

实际引擎还会整理空闲列表或移动存活对象以减少内存碎片，因此常能看到“标记—整理”“标记—压缩”等名字。移动对象时，引擎还需要更新所有指向旧地址的引用。

面试里不必把某个版本 V8 的内部实现背成规范。ECMAScript 规定语言行为，却不规定 GC 必须使用哪种算法，也不承诺某一时刻一定回收。下面几种都是常见的**实现思路**，不同引擎、不同版本会组合使用。

## 为什么还需要分代、增量和并发

### 分代回收

大量对象创建后很快就失去作用，例如一次函数调用里的临时数组；少数对象则会存活很久。分代回收利用这种“多数对象朝生夕死”的经验规律，将堆大致分成新生代和老生代：

- 新生代空间较小，回收更频繁，适合快速处理大量短命对象。
- 多次回收后仍存活的对象会被晋升到老生代，老生代检查频率通常更低。
- 老对象可能引用新对象，引擎会借助写屏障和记忆集记录这类跨代引用，避免每次年轻代回收都扫描整个老生代。

以 V8 为例，它的年轻代与老年代使用不同的回收策略，而且实现会随版本演进。这里应该记住的是分代的动机，而不是某个固定的空间大小或晋升次数。

### 增量回收

一次做完整个标记过程可能造成很长的主线程停顿。增量标记把工作切成许多小段，在 JavaScript 执行间隙逐步完成。

代价是对象图会在两段标记之间变化。引擎需要写屏障维护标记状态，不能简单地“上次走到哪，下次接着走”。增量方案主要缩短单次停顿，不一定减少 GC 的总工作量。

### 并行与并发不是一回事

- **并行（parallel）**：主线程暂停执行 JavaScript，多个线程一起完成 GC 工作，以缩短这次停顿。
- **并发（concurrent）**：辅助线程在主线程继续运行 JavaScript 时处理一部分 GC 工作，主线程只在必要阶段短暂停顿。

并发实现更复杂，因为程序可能一边修改对象图，GC 一边读取它。写屏障、同步以及最后的收尾阶段都有成本，所以“并发 GC”也不等于完全没有暂停。

## 真正经常遇到的内存泄漏

从可达性出发，内存泄漏可以换一种说法：**对象明明已经没有业务用途，却仍能从根节点访问到**。

### 无上限的缓存

```ts
interface SearchResult {
  items: readonly string[]
}

const cache = new Map<string, SearchResult>()

export function remember(query: string, result: SearchResult): void {
  cache.set(query, result)
}
```

只要 `cache` 本身存活，所有键和值都可达。解决方式通常不是换成弱引用，而是先定义缓存策略：容量上限、TTL、LRU 淘汰或主动失效。

### 没有解除的监听与订阅

```ts
function mountPreview(button: HTMLButtonElement): () => void {
  const model = new Uint8Array(8 * 1024 * 1024)

  const onClick = (): void => {
    console.log(model.byteLength)
  }

  button.addEventListener('click', onClick)

  return () => {
    button.removeEventListener('click', onClick)
  }
}
```

监听器闭包捕获了 `model`。组件已经离开页面却没有执行清理函数时，事件目标仍可能通过监听器保留整条引用链。WebSocket、观察器、状态库订阅和第三方 SDK 回调也属于同一类问题。

如果 API 支持 `AbortSignal`，把多个监听器绑定到同一个生命周期会更容易收尾：

```ts
const controller = new AbortController()

window.addEventListener('resize', updateLayout, {
  signal: controller.signal,
})

// 卸载时统一清理
controller.abort()
```

### 长时间运行的定时器

定时器注册的回调及其闭包会被宿主环境保留。`setInterval` 忘记清理、递归 `setTimeout` 没有停止条件，都会让相关对象继续可达。组件销毁或任务取消时，应同时调用 `clearInterval` / `clearTimeout`。

### 意外保留的大对象

闭包不一定泄漏，但捕获范围过大时会放大问题。例如只需要一个 `id`，却让长期回调整体引用一份大响应对象。脱离文档树的 DOM 节点也不会自动回收：如果 JavaScript 数组、监听器或调试变量仍然指向它，它依旧可达。

## WeakMap、WeakSet 与 WeakRef

### WeakMap 和 WeakSet 适合附着型数据

`WeakMap` 的键、`WeakSet` 的成员不会仅仅因为存在于弱集合中就被保活。当前规范允许可被垃圾回收的对象和非注册 `Symbol` 作为弱键，实际业务最常见的仍是对象。

```ts
interface Metadata {
  measuredAt: number
}

const metadata = new WeakMap<Element, Metadata>()

export function markMeasured(element: Element): void {
  metadata.set(element, { measuredAt: Date.now() })
}
```

当某个元素在别处已经不可达时，这条元数据不会单独阻止它被回收。这很适合对象私有元数据、访问结果缓存和去重标记。

弱集合不可枚举，也没有 `size` 和 `clear()`。否则代码可以通过遍历观察对象究竟何时被 GC，回收时机就不再是不可观测的实现细节。`WeakMap` 的值仍然是强引用；只有键不再被外部强引用时，对应条目才可能一起消失。

### WeakRef 不是普通缓存的默认答案

`WeakRef<T>` 的 `deref()` 随时可能得到 `undefined`，而且不同设备、不同负载下的回收时机可能完全不同。不要用它实现正确性依赖，例如锁、连接管理或“对象离开时一定执行”的业务逻辑。

```ts
let previewRef: WeakRef<HTMLCanvasElement> | undefined

export function rememberPreview(canvas: HTMLCanvasElement): void {
  previewRef = new WeakRef(canvas)
}

export function getPreview(): HTMLCanvasElement | undefined {
  return previewRef?.deref()
}
```

`FinalizationRegistry` 同样没有及时执行甚至一定执行的保证，更适合极少数资源管理的兜底或诊断场景，不能替代显式的 `dispose()`。

## 如何定位泄漏

排查内存问题时，先做一个能重复的操作序列，例如“进入详情页—返回列表”执行 20 次。只看任务管理器里的一次内存上涨很容易误判：堆扩容、缓存和尚未触发的 GC 都可能让曲线暂时不降。

在 Chrome DevTools 中，可以按下面的顺序缩小范围：

1. 空闲后做一份 Heap Snapshot，执行操作并回到初始状态，再做一份快照。
2. 比较两份快照，关注数量持续增长的实例、`Detached` DOM、对象的 retained size。
3. 沿 Retainers / Path to GC Root 向上查，找到究竟是数组、监听器、闭包还是缓存把它保留下来。
4. 用 Allocation instrumentation on timeline 记录操作过程，确认对象在哪段代码创建、是否能在回到初始状态后释放。
5. 修复后重复同样的操作序列，而不是只验证一次刷新。

Node.js 也可以通过 `--inspect` 接入 DevTools，结合堆快照、分配分析和进程指标定位问题。测试时强制触发 GC 可以减少噪声，但它只是诊断手段，不能修复仍然存在的强引用。

## 面试追问

### `const` 声明的对象会一直留在内存里吗？

不会。`const` 约束的是绑定不能重新赋值，不是对象永远可达。局部作用域退出且没有其他引用后，对象仍然可以被回收。

### 把变量设为 `null` 就能释放内存吗？

只能断开这一条引用，而且不会要求引擎立刻回收。局部变量即将离开作用域时，刻意赋 `null` 通常没有意义；对长期存活对象的字段、缓存条目或订阅引用，主动断开才可能有帮助。

### 闭包一定造成内存泄漏吗？

不会。闭包只是延长它实际引用的数据的生命周期。问题发生在闭包被长期持有，同时捕获了不再需要的对象，并且缺少明确的清理边界。

### 为什么不能依赖 GC 执行资源清理？

文件句柄、网络连接和锁需要确定的释放时机，而对象回收时间不确定，进程退出时清理回调也可能来不及执行。因此这类资源应使用显式关闭、`try...finally` 或语言提供的显式资源管理机制。

更多 JavaScript 基础追问可以继续看[《JavaScript 常见面试题》](/blog/2026/javascript-interview)。

## 参考资料

- [MDN：Memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)
- [MDN：WeakRef](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef)
- [V8：Trash talk: the Orinoco garbage collector](https://v8.dev/blog/trash-talk)
- [V8：Concurrent marking](https://v8.dev/blog/concurrent-marking)
