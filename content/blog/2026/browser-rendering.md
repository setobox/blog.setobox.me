---
title: '浏览器渲染原理'
description: '从导航、DOM 与 CSSOM 到布局绘制，再串起事件循环、任务、微任务、动画帧和长任务优化。'
date: 2026-08-05
tags:
  - 浏览器
  - 渲染原理
  - 事件循环
  - JavaScript
  - Web 性能
  - 面试
categories:
  - 面试题
  - 浏览器
draft: true
---

页面不是“HTML 下载完以后一次性画出来”的。网络接收、HTML 解析、资源发现、脚本执行和渲染会交错进行；浏览器还会在主线程工作之间挑选合适的时机更新画面。理解这条流水线，比背“DOM 树 + CSSOM 树 = Render Tree”更接近真实问题。

## 从导航开始

用户输入 URL 或点击链接后，浏览器先确定这是一次导航，并处理 CSP、HSTS、Service Worker、HTTP 缓存等可能改变请求路径的规则。需要访问网络时，大致经历 DNS、连接建立、TLS 和 HTTP 请求；响应还可能经过代理、CDN 和重定向。

收到响应头后，浏览器会根据状态码、`Content-Type`、`Content-Disposition` 等信息判断是显示文档、下载文件还是继续重定向。现代浏览器通常采用多进程架构，网络、浏览器 UI、渲染和 GPU 工作可能分布在不同进程；具体拆分是实现细节，不应把某个 Chrome 版本的进程图当成 Web 平台规范。

HTML 可以流式传输和增量解析。首屏不必等整个响应下载完才开始构建 DOM。解析器还可能通过预加载扫描器提前发现样式表、脚本、字体和图片，尽早发起请求。

## DOM 与 CSSOM

### HTML 怎样变成 DOM

HTML 解析器将字节解码为字符，再经过 tokenization 和 tree construction 构建 DOM。HTML 的容错规则很具体：标签缺失或嵌套错误时，解析器可能自动补节点、移动节点，最终 DOM 不一定与源码缩进长得一样。

```html
<p>第一段
<div>块内容</div>
```

开发者工具中看到的 DOM 是解析和脚本修改后的结果，不是单纯的源文件文本。

经典脚本默认会阻塞 HTML 解析，因为脚本可能调用 `document.write()`，也可能查询或修改已解析的 DOM。几个常见加载方式：

- 普通 `<script src>`：解析器遇到后通常等待下载并执行，再继续解析。
- `defer`：并行下载，文档解析完成后按文档顺序执行，在 `DOMContentLoaded` 前完成。
- `async`：并行下载，准备好就执行，不保证多个脚本的先后顺序。
- `type="module"`：默认具有类似 defer 的执行时机，并按模块依赖图加载；显式 `async` 会改变等待方式。

这些规则还受动态插入、模块依赖和 top-level await 等因素影响。面试回答先明确脚本种类与创建方式，不要只说“async 异步、defer 延迟”。

### CSS 怎样变成 CSSOM

浏览器解析可用的样式表，按照 CSS 语法、层叠和继承计算元素样式。CSSOM 提供了可由脚本读取和修改的样式表模型。

CSS 通常被称为 render-blocking：浏览器需要足够的样式信息才能稳定绘制，避免先显示无样式内容再跳变。样式表还可能间接阻塞脚本执行，因为脚本可以查询计算样式，浏览器必须先得到正确结果。并不是所有 CSS 请求都阻塞当前首屏，例如 media query 当前不匹配的样式表，浏览器可以降低其阻塞影响，但仍可能下载。

减少样式阻塞不能简单等同于“把 CSS 全内联”。应控制关键 CSS 体积、删除无用规则、正确拆分非关键样式，同时保留缓存收益与安全策略。

## 从样式到屏幕

不同浏览器的内部数据结构名称并不完全一致，面试时用下面的抽象流程就够了。

### 1. Style calculation

浏览器为元素匹配选择器，执行层叠、继承和数值计算，得到计算样式。修改一个祖先的继承属性，可能让大量后代重新计算样式；复杂选择器和大 DOM 会增加匹配范围，但现实性能问题更常来自过多节点和频繁失效，而不是某一个选择器理论上“慢一点”。

### 2. Render tree

浏览器把 DOM 中需要渲染的内容与计算样式结合成用于布局和绘制的树。它不等于完整 DOM 的复制：

- `display: none` 的元素不生成布局盒，其后代也不会参与普通渲染。
- `<head>`、脚本等非视觉节点通常不生成盒。
- `visibility: hidden` 仍保留布局空间，只是不绘制可见内容。
- `::before`、`::marker` 等生成内容并不是普通 DOM 子节点，却会参与渲染。

### 3. Layout

Layout 根据格式化上下文、包含块、固有尺寸和约束计算盒子的几何信息。它处理的不只是 `width` 和 `height`，还包括文本换行、Flex/Grid 轨道、滚动区域、相对位置等。

修改 DOM 或几何属性后，浏览器通常先标记相关节点失效，在真正需要结果时再批量计算。若脚本写入后立刻读取布局，就可能迫使浏览器提前同步 layout：

```ts
box.style.width = '40%'

// 为了返回最新矩形，这里可能触发同步布局
const rect = box.getBoundingClientRect()
```

### 4. Paint

Paint 把背景、文本、边框、阴影等视觉内容记录为绘制指令，并处理绘制顺序和裁剪。绘制不等于已经逐像素写到屏幕；浏览器可能把指令分块并栅格化为纹理。

改变颜色通常跳过 layout，但需要重新 paint。大面积阴影、模糊和频繁滚动区域会让 paint 成本变得明显。

### 5. Composite

合成阶段把已经栅格化的图层或分块按正确位置、变换、透明度组合成最终帧。`transform`、`opacity` 动画经常能主要在合成阶段运行，从而避免每帧 layout 和 paint。

不过图层提升是浏览器的优化选择，不是 CSS 属性与独立图层的一一映射。图层过多会占用显存并增加管理成本；`will-change` 应短期、少量使用。

### 三类更新的关系

| 变化       | 可能经过的阶段                            | 例子                                 |
| ---------- | ----------------------------------------- | ------------------------------------ |
| 几何变化   | style → layout → paint → composite        | 改宽高、插入普通流节点、字体导致换行 |
| 纯视觉变化 | style → paint → composite                 | 改文字颜色、背景、阴影               |
| 可合成变化 | style → composite，必要时先完成初始 paint | 已提升内容的 transform、opacity      |

这张表表达的是常见路径，不是跨浏览器的执行承诺。实际判断以性能录制为准。

## 事件循环机制

JavaScript 执行、事件回调、计时器和渲染都需要协调。HTML 标准用 event loop 描述这种调度。一个浏览上下文的事件循环在高层上会反复做这些事：

1. 从合适的 task queue 中选择一个可运行任务并执行。
2. 执行 microtask checkpoint，清空当前可运行的微任务。
3. 在满足条件的 rendering opportunity 中更新渲染，包括动画帧回调、样式、布局和绘制等工作。
4. 继续下一轮，期间还要处理空闲、关闭和其他平台步骤。

标准存在多个 task source，用来维护同源任务之间的顺序；不能把实现想成只有一个简单 FIFO “宏任务队列”。浏览器可以在符合规范约束的前提下选择任务来源，以兼顾输入响应和其他工作。

Worker 有自己的事件循环，并且不能直接访问页面 DOM。网络请求也不是“由主线程同步跑完”：平台和其他线程完成等待后，再把相应回调调度回所属事件循环。

## 任务与微任务

常见 task 来源包括：

- 首次执行一段脚本。
- `setTimeout`、`setInterval` 到期后的回调。
- 用户输入与部分 DOM 事件。
- `MessageChannel` 消息。
- 网络或其他平台 API 完成后安排的回调。

常见 microtask 包括：

- `Promise.then/catch/finally` 反应。
- `await` 之后的 continuation。
- `queueMicrotask()`。
- `MutationObserver` 通知。

### “宏任务”是俗称

面试资料常把 task 叫作 macrotask，以便与 microtask 对照。但 HTML 标准的正式术语是 task，规范没有定义一类名为 macrotask 的队列。回答时可以说“通常俗称宏任务”，再用 task/microtask 解释实际顺序。

### 一段代码的执行顺序

```ts
console.log('start')

setTimeout(() => {
  console.log('timer')
}, 0)

queueMicrotask(() => {
  console.log('microtask 1')
})

Promise.resolve().then(() => {
  console.log('promise')

  queueMicrotask(() => {
    console.log('microtask 2')
  })
})

console.log('end')
```

输出为：

```text
start
end
microtask 1
promise
microtask 2
timer
```

当前脚本任务先执行完，再进行微任务检查。检查期间新加入的 `microtask 2` 也会在本轮继续执行，直到队列清空，计时器任务才有机会运行。

`setTimeout(fn, 0)` 的含义是“达到最短延迟后可被调度”，不是零毫秒准时执行。嵌套计时器、后台页面、系统负载和主线程已有任务都会拉长实际时间。

### 微任务越多越快吗？

不是。微任务检查通常要清空队列才会把控制权交还给事件循环。若微任务不断产生新微任务，输入、计时器和渲染可能长期得不到机会，形成 microtask starvation。

```ts
function loop(): void {
  queueMicrotask(loop)
}

// loop() 会持续占住当前事件循环，不要这样做
```

需要把大量工作拆到多个帧或任务中时，应主动 yield，而不是改成 Promise 链就以为不会阻塞。

## 渲染时机

修改 DOM 并不等于屏幕立刻更新：

```ts
status.textContent = '处理中'
heavyCalculation()
status.textContent = '完成'
```

如果 `heavyCalculation()` 一直占用当前任务，浏览器可能没有机会把“处理中”那一帧呈现出来，用户最终只看到“完成”。即便中间插入 `await Promise.resolve()`，continuation 仍是微任务，通常也没有真正让出本轮渲染机会。

渲染也不是每执行一个 task 就必然发生。浏览器会根据显示刷新率、页面可见性、帧预算和实现策略判断是否存在 rendering opportunity。后台标签页可能显著节流甚至暂停部分更新。

### `requestAnimationFrame`

`requestAnimationFrame()` 请求浏览器在下一次合适的渲染更新前调用回调，适合提交与下一帧相关的视觉变化：

```ts
let x = 0
let previous = 0

function animate(now: number): void {
  const delta = previous === 0 ? 0 : now - previous
  previous = now

  x += delta * 0.08
  box.style.transform = `translateX(${Math.min(x, 320)}px)`

  if (x < 320)
    requestAnimationFrame(animate)
}

requestAnimationFrame(animate)
```

应使用回调提供的时间戳计算进度，而不是假设固定 60 Hz。高刷新率屏幕可能每秒回调更多次，掉帧时也可能间隔更长；隐藏页面中的回调通常会暂停或降频。

`requestAnimationFrame` 不是“自动让慢代码变快”。回调仍在主线程执行，单次工作超过帧预算仍会掉帧。读取和写入布局信息时，先集中读取，再集中写入：

```ts
requestAnimationFrame(() => {
  const widths = cards.map(card => card.getBoundingClientRect().width)

  cards.forEach((card, index) => {
    card.style.setProperty('--measured-width', `${widths[index]}px`)
  })
})
```

## 长任务与性能问题

主线程连续执行较长时间，浏览器就无法及时处理输入或更新画面。Long Tasks API 把占用主线程 50 毫秒以上的任务暴露为性能条目，但 50 毫秒是观测门槛，不是“49 毫秒就一定流畅”。在高刷新率设备中，一帧预算远小于 50 毫秒。

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries())
    console.warn('long task', entry.startTime, entry.duration)
})

observer.observe({ type: 'longtask', buffered: true })
```

支持情况和 TypeScript 的 DOM 类型版本可能不同，工程中应先做能力检测，并以浏览器 Performance 面板、真实用户指标和业务埋点交叉验证。

### 1. 拆分 CPU 工作并主动让出主线程

```ts
async function processItems<T>(
  items: readonly T[],
  handle: (item: T) => void,
): Promise<void> {
  const chunkSize = 200

  for (let start = 0; start < items.length; start += chunkSize) {
    const chunk = items.slice(start, start + chunkSize)
    chunk.forEach(handle)

    // 进入后续 task，让输入和渲染获得调度机会
    await new Promise<void>(resolve => setTimeout(resolve, 0))
  }
}
```

固定 200 条只是示例。真实项目应按耗时切片，并在支持环境中评估专门的调度 API。注意切片会增加总调度成本，需要在吞吐量和响应性之间权衡。

### 2. 把纯计算放进 Worker

压缩、解析大数据、搜索索引等不依赖 DOM 的 CPU 工作可以移到 Web Worker。传递巨量对象本身也有序列化成本，可考虑 transferable object、SharedArrayBuffer 的安全要求或更紧凑的数据结构。

### 3. 减少必须处理的工作量

- 对长列表使用虚拟化或 `content-visibility`，避免创建和渲染不可见的大量节点。
- 输入联想可防抖请求，但不能用防抖掩盖单次计算过慢。
- 缓存确实昂贵且输入稳定的结果，避免无依据地给每个函数 memoize。
- 合并重复状态更新，缩小受影响的组件或 DOM 范围。
- 大脚本按路由或功能拆分，推迟非首屏初始化。

### 4. 避免布局抖动和大面积绘制

把 DOM 读取与写入分组，避免在循环中交替进行。动画优先评估 `transform` 与 `opacity`，同时控制图层数量、绘制面积和视觉效果复杂度。

### 5. 优先响应用户输入

长任务拆分点应围绕真实交互设计：输入后先更新必要的反馈，再安排次要工作。所谓“并发”不意味着主线程同时执行两段 JavaScript，而是工作可以被标记优先级、暂停、恢复或放到别的线程。

## 常见追问

### `DOMContentLoaded` 和 `load` 有什么区别？

`DOMContentLoaded` 在文档解析完成、需要等待的 defer/module 脚本执行完成后触发，不等待普通图片等所有子资源。`load` 要等当前文档及其依赖资源完成。异步脚本、懒加载资源和动态请求让“页面全部加载完”本身变得模糊，性能监控不应只靠这两个事件。

### 为什么 CSS 放头部、脚本常放尾部？

尽早发现关键 CSS 能尽快得到稳定样式；传统阻塞脚本放尾部可以减少解析暂停。现代项目更应通过 `defer`、ES modules、资源优先级和合理拆包表达依赖，而不是机械搬标签。脚本若控制首屏主题或关键布局，加载策略还要避免闪烁和布局偏移。

### Promise 和 `setTimeout` 谁先执行？

若它们在同一个 task 中注册且 Promise 已兑现，Promise reaction 是微任务，会在当前任务结束后的 microtask checkpoint 运行；到期计时器是后续 task，通常更晚。若加入网络、嵌套事件循环或不同执行上下文，必须结合注册和兑现时机分析，不能背成无条件规则。

### 事件循环与渲染是什么关系？

渲染由事件循环协调，但不是一个固定的“每轮最后必跑的宏任务”。浏览器在合适的渲染机会中运行动画帧回调并更新样式、布局和画面；长 task 或无限微任务会推迟这个机会。

### 事件委托为什么有效？

许多事件会沿 DOM 路径冒泡。把监听器放在稳定祖先上，通过 `event.target` 和 `closest()` 找到实际操作对象，可以减少大量重复监听器，也能覆盖后续插入的后代。不是所有事件都冒泡，Shadow DOM 还涉及 composed path，使用前要确认事件语义。

## 参考资料

- [HTML Standard：Navigation and session history](https://html.spec.whatwg.org/multipage/browsing-the-web.html)
- [HTML Standard：Web application APIs / Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [HTML Standard：Scripting](https://html.spec.whatwg.org/multipage/scripting.html)
- [DOM Standard](https://dom.spec.whatwg.org/)
- [CSS Object Model](https://www.w3.org/TR/cssom-1/)
- [CSSOM View Module](https://www.w3.org/TR/cssom-view-1/)
- [CSS 2.2：Visual formatting model](https://www.w3.org/TR/CSS22/visuren.html)
- [Long Tasks API](https://www.w3.org/TR/longtasks-1/)
- [High Resolution Time](https://www.w3.org/TR/hr-time-3/)
