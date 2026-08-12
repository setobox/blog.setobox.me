---
title: '防抖与节流'
description: '从调用时间线到 TypeScript 实现，讲清防抖、节流、leading、trailing、maxWait，以及 cancel 和 flush 的设计取舍。'
date: 2026-08-07
tags:
  - JavaScript
  - TypeScript
  - 性能优化
categories:
  - 面试题
  - JavaScript
---

## 区别不在“少执行几次”，而在执行时机

滚动、输入和指针移动都可能在很短时间内触发大量事件。防抖与节流都能限制函数执行频率，但它们回答的是两个不同的问题：

- **防抖（debounce）**等待一段安静时间。只要新调用不断到来，计时就重新开始。
- **节流（throttle）**把连续调用切成时间窗口，保证一段时间内至多执行一次。

假设 `wait = 100ms`，调用发生在 `0、30、60、190ms`：

- 只有尾沿的防抖会在约 `160ms` 和 `290ms` 执行。
- 默认首尾沿节流通常会在 `0ms` 先执行，随后在窗口边界用最新参数补一次；具体时间取决于实现如何定义窗口。

所以“搜索框用防抖、滚动用节流”只是经验，不是定义。真正的选择标准是：业务需要等用户停下来，还是需要在持续输入期间稳定获得进度。

## leading、trailing 与 maxWait

### leading：第一下是否立即执行

`leading: true` 表示空闲一段时间后的第一次调用立即执行。它适合需要即时反馈的场景，例如防止按钮连点：第一次提交立刻生效，之后的重复点击被合并。

### trailing：结束后是否补最后一次

`trailing: true` 表示窗口结束时用**最后一次调用**的 `this` 和参数执行。输入联想通常需要尾沿，因为用户最后输入的内容才是目标查询。

首沿和尾沿同时开启时，一个孤立调用只应执行一次；只有等待期间又收到调用，尾沿才需要补执行。否则一次点击会平白触发两次。

### maxWait：持续输入也不能无限推迟

纯尾沿防抖可能一直不执行：只要事件间隔始终小于 `wait`，截止时间就持续后移。`maxWait` 给延迟加上上限，适合自动保存、遥测上报等“希望合并，但不能永远不处理”的任务。

节流也可以看成一种特殊防抖：将 `maxWait` 设为 `wait`，再按需要开启首沿和尾沿。这样连续调用最多等待一个窗口。

## 一个可取消、可刷新的 TypeScript 实现

下面的实现保留参数和动态 `this`，支持 `leading`、`trailing`、`maxWait`、`cancel()`、`flush()` 与 `pending()`。它依赖 `Date.now()` 的单调性近似，并处理了系统时间向后调整的情况。

```ts
export interface DebounceOptions {
  leading?: boolean
  trailing?: boolean
  maxWait?: number
}

export interface Debounced<This, Args extends unknown[], Result> {
  (this: This, ...args: Args): Result | undefined
  cancel(): void
  flush(): Result | undefined
  pending(): boolean
}

function normalizeDelay(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number`)
  }

  return value
}

export function debounce<This, Args extends unknown[], Result>(
  fn: (this: This, ...args: Args) => Result,
  delay: number,
  options: DebounceOptions = {},
): Debounced<This, Args, Result> {
  const wait = normalizeDelay(delay, 'delay')
  const leading = options.leading ?? false
  const trailing = options.trailing ?? true
  const requestedMaxWait = options.maxWait
  const hasMaxWait = requestedMaxWait !== undefined
  const maxWait = requestedMaxWait !== undefined
    ? Math.max(normalizeDelay(requestedMaxWait, 'maxWait'), wait)
    : 0

  if (!leading && !trailing) {
    throw new TypeError('leading and trailing cannot both be false')
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  let lastArgs: Args | undefined
  let lastThis: This | undefined
  let lastCallTime: number | undefined
  let lastInvokeTime = 0
  let result: Result | undefined

  const invoke = (time: number): Result | undefined => {
    const args = lastArgs
    const thisArg = lastThis

    lastArgs = undefined
    lastThis = undefined

    if (args === undefined) {
      return result
    }

    lastInvokeTime = time
    result = fn.apply(thisArg as This, args)
    return result
  }

  const shouldInvoke = (time: number): boolean => {
    if (lastCallTime === undefined) {
      return true
    }

    const sinceLastCall = time - lastCallTime
    const sinceLastInvoke = time - lastInvokeTime

    return (
      sinceLastCall >= wait
      || sinceLastCall < 0
      || (hasMaxWait && sinceLastInvoke >= maxWait)
    )
  }

  const remainingWait = (time: number): number => {
    const sinceLastCall = time - (lastCallTime ?? time)
    const sinceLastInvoke = time - lastInvokeTime
    const untilTrailing = wait - sinceLastCall

    return Math.max(
      0,
      hasMaxWait
        ? Math.min(untilTrailing, maxWait - sinceLastInvoke)
        : untilTrailing,
    )
  }

  const trailingEdge = (time: number): Result | undefined => {
    timer = undefined

    if (trailing && lastArgs !== undefined) {
      return invoke(time)
    }

    lastArgs = undefined
    lastThis = undefined
    return result
  }

  const timerExpired = (): void => {
    const time = Date.now()

    if (shouldInvoke(time)) {
      trailingEdge(time)
      return
    }

    timer = setTimeout(timerExpired, remainingWait(time))
  }

  const leadingEdge = (time: number): Result | undefined => {
    lastInvokeTime = time
    timer = setTimeout(timerExpired, wait)

    return leading ? invoke(time) : result
  }

  const debounced = function (this: This, ...args: Args): Result | undefined {
    const time = Date.now()
    const invokeNow = shouldInvoke(time)

    lastArgs = args
    lastThis = this
    lastCallTime = time

    if (invokeNow) {
      if (timer === undefined) {
        return leadingEdge(time)
      }

      if (hasMaxWait) {
        clearTimeout(timer)
        timer = setTimeout(timerExpired, wait)
        return invoke(time)
      }
    }

    timer ??= setTimeout(timerExpired, wait)
    return result
  } as Debounced<This, Args, Result>

  debounced.cancel = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }

    timer = undefined
    lastArgs = undefined
    lastThis = undefined
    lastCallTime = undefined
    lastInvokeTime = 0
  }

  debounced.flush = (): Result | undefined => {
    if (timer === undefined) {
      return result
    }

    clearTimeout(timer)
    return trailingEdge(Date.now())
  }

  debounced.pending = (): boolean => timer !== undefined

  return debounced
}
```

实现里有几个容易漏掉的细节：

- 每次调用都覆盖 `lastArgs` 和 `lastThis`，尾沿才能拿到最新值。
- 真正执行前先清空暂存参数。即使原函数内部再次调用包装函数，也不会把新一轮状态误清掉。
- `maxWait` 不小于 `wait`，避免出现互相矛盾的时间窗口。
- `cancel()` 同时清理计时器、参数和时间戳；下一次调用会被视为全新一轮。
- `flush()` 取消现有计时器并立即完成待执行的尾沿，防止旧计时器稍后再次唤醒。

## 用防抖实现节流

```ts
export interface ThrottleOptions {
  leading?: boolean
  trailing?: boolean
}

export function throttle<This, Args extends unknown[], Result>(
  fn: (this: This, ...args: Args) => Result,
  wait: number,
  options: ThrottleOptions = {},
): Debounced<This, Args, Result> {
  return debounce(fn, wait, {
    leading: options.leading ?? true,
    trailing: options.trailing ?? true,
    maxWait: wait,
  })
}
```

这个定义让防抖和节流共享同一套边界行为，尤其是 `cancel()`、`flush()` 以及首尾沿同时开启时的规则。不同库对窗口边界可能有细微差别，项目中最好固定一个实现并用假计时器测试，而不是在各组件里手写变体。

## `this`、参数与返回值应该怎么处理

普通函数的 `this` 取决于调用方式，因此包装函数需要在每次调用时记录它：

```ts
class SearchBox {
  query = ''

  update = debounce(function (this: SearchBox, value: string): string {
    this.query = value
    return this.query
  }, 200)
}

const box = new SearchBox()
box.update('typescript')
box.update.flush() // 'typescript'
```

返回值没有完美方案。首沿执行可以同步返回本次结果；尾沿执行发生在未来，当前调用不可能同步拿到它。这里沿用常见约定：包装函数返回最近一次真实执行的结果，尚未执行时返回 `undefined`，`flush()` 返回强制执行后的结果。

如果原函数返回 Promise，包装函数的返回类型就是 `Promise<T> | undefined`。这仍不代表每次调用都有一份对应的 Promise：多次调用被合并后，只有真实执行的那一次异步任务存在。若调用方必须逐次等待并区分“执行”“被替换”“被取消”，就应该额外设计任务协议，例如为每次调用返回带状态的 Promise；那已经不是一个简单的防抖工具了。

## cancel 与 flush 的取舍

`cancel()` 适合生命周期结束和请求条件失效：

```ts
declare const editor: HTMLElement
declare function persistDraft(): void

const saveDraft = debounce(persistDraft, 800, { maxWait: 5000 })

editor.addEventListener('input', saveDraft)

function unmount(): void {
  saveDraft.cancel()
  editor.removeEventListener('input', saveDraft)
}
```

页面离开前到底用 `cancel()` 还是 `flush()`，取决于业务语义：草稿不应丢失就 `flush()`，已经切换到另一份文档、旧数据绝不能落库就 `cancel()`。工具函数无法替你做这个决定。

还有一种常见竞态不属于防抖本身：旧搜索请求可能比新请求更晚返回。防抖只能减少发起次数，不能保证响应顺序。需要用 `AbortController` 取消旧请求，或用递增序号忽略过期响应。

## 场景怎么选

| 场景                 | 更合适的策略                  | 原因                                     |
| -------------------- | ----------------------------- | ---------------------------------------- |
| 输入联想             | 尾沿防抖                      | 等输入短暂停顿后查询，使用最后一个关键词 |
| 自动保存             | 尾沿防抖 + `maxWait`          | 合并频繁修改，又避免一直不保存           |
| 提交按钮防连点       | 首沿防抖                      | 第一次立即响应，短时间内忽略重复操作     |
| 滚动进度、指针坐标   | 节流                          | 持续交互期间仍要稳定更新                 |
| 窗口尺寸变化后的重排 | 尾沿防抖                      | 通常只关心最终尺寸                       |
| 无限列表预加载       | 节流或 `IntersectionObserver` | 需要持续检查；能用观察器时优先交给浏览器 |

最后一个面试里的加分点是：限频函数不是性能问题的万能解。动画更新优先考虑 `requestAnimationFrame`，元素进入视口优先考虑 `IntersectionObserver`，网络层还要考虑取消、去重和缓存。先确认真正的瓶颈，再决定是否需要防抖或节流。

## 参考资料

- [MDN：Debounce](https://developer.mozilla.org/en-US/docs/Glossary/Debounce)
- [MDN：Throttle](https://developer.mozilla.org/en-US/docs/Glossary/Throttle)
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
