---
title: '手写防抖：从清除定时器到 cancel 与 flush'
description: '按面试中的推导顺序实现 debounce，解释 this、参数透传、leading、trailing、cancel 和 flush。'
date: 2026-08-09
tags:
  - JavaScript
  - 防抖
  - 面试
categories:
  - 面试题
  - JavaScript
---

防抖是前端面试里很常见的一道手写题。代码不长，真正容易出问题的是一上来就写完整版：定时器、立即执行、最后一次调用、返回值全挤在一起，写到后面自己也说不清每个变量在管什么。

更稳妥的方式是先写出最小实现，再顺着需求往上加。每多一个能力，就解释它为什么需要新的状态。

## 先写最简单的 trailing debounce

搜索框连续输入时，通常只关心用户最后停在哪个关键词。假设等待时间是 300ms，只要 300ms 内又有输入，就放弃上一次计划并重新计时。

```js
function debounce(fn, delay) {
  let timer = null

  return function (...args) {
    clearTimeout(timer)

    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}
```

这个版本只维护一个 `timer`。每次调用都清除旧定时器，再创建一个新的。事件一直触发，计时就一直往后推；等到安静了 `delay` 毫秒，`fn` 才会执行。

```js
const search = debounce((keyword) => {
  console.log('搜索：', keyword)
}, 300)

search('v')
search('vu')
search('vue')

// 300ms 后输出：搜索：vue
```

它执行在一连串调用的末尾，所以叫 trailing debounce，也就是尾沿防抖。

## 为什么还要传 `this` 和参数

只写 `fn()` 也能防抖，但包装后的函数就不像原函数了：参数没传进去，调用者的 `this` 也丢了。

```js
const counter = {
  value: 10,
  print(step) {
    console.log(this.value + step)
  },
}

counter.printLater = debounce(counter.print, 300)
counter.printLater(2) // 应该输出 12
```

调用 `printLater` 时，`this` 是 `counter`，参数是 `[2]`。防抖只是把执行推迟了，不应该改变这次调用的上下文，所以定时器回调里用了：

```js
fn.apply(this, args)
```

`apply` 不是唯一写法，下面两种也可以：

```js
fn.call(this, ...args)
Reflect.apply(fn, this, args)
```

这里用 `apply` 只是顺手，因为剩余参数收集出来的 `args` 本来就是数组。

有一个细节比 `apply` 更容易被忽略：返回的包装函数要写成普通函数。

```js
return function (...args) {
  // this 由调用方式决定
}
```

如果把它改成箭头函数，`this` 会从 `debounce` 所在的词法作用域中取得，不会因为 `counter.printLater()` 而指向 `counter`。里面的 `setTimeout` 回调反而适合箭头函数，因为它需要沿用外层拿到的 `this`。

## 增加 leading：第一次立即执行

搜索联想适合等用户停下来，但防止按钮连点通常希望第一次点击马上生效，随后一段时间内的点击全部忽略。

要做到这一点，先判断当前是不是这一轮的第一次调用。`timer === null` 正好能表示“前面没有等待中的任务”。

```js
function debounce(fn, delay, immediate = false) {
  let timer = null

  return function (...args) {
    const shouldCallNow = immediate && timer === null

    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
    }, delay)

    if (shouldCallNow) {
      return fn.apply(this, args)
    }
  }
}
```

第一次调用时 `timer` 为空，函数立即执行，同时启动定时器。等待期间再次调用只会刷新定时器，不会再次执行。直到停止触发满 `delay` 毫秒，`timer` 才回到 `null`，下一轮调用又可以立即执行。

这个版本已经能处理防重复提交：

```js
const submit = debounce(handleSubmit, 1000, true)
```

不过 `immediate` 只能表达“是否立即执行”，不能说明结束后要不要再补一次。需求稍微复杂一点，它就不够用了。

## 把立即执行拆成 leading 和 trailing

防抖常见的执行方式有三种：

| 配置                             | 执行时机                         | 常见场景            |
| -------------------------------- | -------------------------------- | ------------------- |
| `leading: false, trailing: true` | 停止触发后执行最后一次           | 搜索联想、表单校验  |
| `leading: true, trailing: false` | 第一次立即执行                   | 防止重复提交        |
| `leading: true, trailing: true`  | 第一次立即执行，结束后按需补一次 | resize 后的布局校准 |

`leading` 和 `trailing` 同时开启时还有一个边界：如果总共只调用了一次，不能在开头和结尾各执行一次。只有等待期间出现了新调用，结尾那次执行才有意义。

为此需要保存最近一次调用的参数和 `this`。每次新调用都会覆盖它们，trailing 最终拿到的自然是最新值；leading 执行后则把它们清空。如果后面没有新调用，定时器到期时就知道不必重复执行。

```js
function debounce(
  fn,
  delay,
  {
    leading = false,
    trailing = true,
  } = {},
) {
  let timer = null
  let lastArgs
  let lastThis
  let result

  const invoke = () => {
    const args = lastArgs
    const thisArg = lastThis

    lastArgs = undefined
    lastThis = undefined
    result = fn.apply(thisArg, args)

    return result
  }

  const clearPendingCall = () => {
    lastArgs = undefined
    lastThis = undefined
  }

  const onTimeout = () => {
    timer = null

    if (trailing && lastArgs !== undefined) {
      invoke()
      return
    }

    clearPendingCall()
  }

  function debounced(...args) {
    lastArgs = args
    lastThis = this

    const shouldCallLeading = leading && timer === null

    if (timer !== null) {
      clearTimeout(timer)
    }

    timer = setTimeout(onTimeout, delay)

    if (shouldCallLeading) {
      return invoke()
    }

    return result
  }

  return debounced
}
```

假设 `leading` 和 `trailing` 都为 `true`：

```text
0ms      调用 A，立即执行 A
100ms    调用 B，重新计时并保存 B
200ms    调用 C，重新计时并保存 C
500ms    计时结束，执行 C
```

如果只有 0ms 的一次调用，leading 执行后会清空 `lastArgs`，300ms 时不会再执行。

两端都执行并不是默认答案。比如搜索 `v → vu → vue`，开头请求一次 `v` 通常没有价值；而窗口 resize 时，第一次变化可以先更新一次布局，拖动结束后再按最终尺寸校准，这时两端的状态才都有用。

## `cancel`：取消还没发生的调用

定时器不一定要等到触发。组件已经卸载、弹窗已经关闭，或者搜索条件被清空时，之前排队的任务应该作废。

`cancel` 做的事很直接：清掉定时器，再把内部状态恢复到初始值。

```js
debounced.cancel = () => {
  if (timer !== null) {
    clearTimeout(timer)
  }

  timer = null
  lastArgs = undefined
  lastThis = undefined
}
```

只调用 `clearTimeout` 还不够。如果不把 `timer` 设回 `null`，开启 leading 的防抖会误以为自己仍在上一轮等待中，下一次调用无法立即执行。

## `flush`：不等了，现在就执行

`flush` 处理的是相反的情况：任务确实要执行，只是不想继续等。

例如编辑器原计划在停止输入两秒后保存草稿，用户现在准备关闭编辑器，就可以把仍在等待的最后一次保存立刻刷出去。

```js
debounced.flush = () => {
  if (timer === null) {
    return result
  }

  clearTimeout(timer)
  timer = null

  if (trailing && lastArgs !== undefined) {
    return invoke()
  }

  clearPendingCall()
  return result
}
```

`flush` 只会处理待执行的 trailing 调用。没有等待中的任务时，它不会凭空再调用一次原函数。

把这两个方法挂回前面的实现，就是一个面试中已经足够完整的版本：

```js
debounced.cancel = () => {
  if (timer !== null) {
    clearTimeout(timer)
  }

  timer = null
  clearPendingCall()
}

debounced.flush = () => {
  if (timer === null) {
    return result
  }

  clearTimeout(timer)
  timer = null

  if (trailing && lastArgs !== undefined) {
    return invoke()
  }

  clearPendingCall()
  return result
}
```

## 异步执行拿不到原调用的返回值

leading 可以同步执行，所以包装函数能立刻返回 `fn` 的结果。trailing 发生在定时器回调里，原来的那次函数调用早已结束，不可能把未来的结果同步返回给它。

```js
const getValue = debounce(() => 42, 300)
const value = getValue()

console.log(value) // undefined
```

如果业务需要等待 trailing 的执行结果，API 就不应该继续伪装成普通同步函数。可以单独设计 Promise 版本，并明确约定多次调用是共享同一个 Promise、分别 resolve，还是取消旧任务。这个问题已经超出基础防抖，不适合悄悄塞进一个 `setTimeout` 实现里。

## 面试时怎么写更顺

现场手写时，先完成只有 `timer` 的尾沿防抖，并把“清除旧定时器、重新计时”说清楚。接着主动指出目前已经透传了参数和动态 `this`，但还没有立即执行、取消和刷新能力。

如果面试官继续追问，再按下面的顺序扩展：

1. 用 `timer === null` 判断一轮调用的开始，加入 `leading`；
2. 用 `lastArgs`、`lastThis` 记录最后一次调用，加入 `trailing`；
3. 执行后清空调用信息，处理 leading 与 trailing 同时开启时的单次调用；
4. 清理全部内部状态，实现 `cancel`；
5. 复用 `invoke`，实现 `flush`。

这样写的好处不是代码更短，而是每个变量都有来路。即使最后没有时间写完，已经完成的部分也能独立工作，后续缺的能力和边界也说得清楚。

最后还可以补一句防抖与节流的区别：防抖关心的是“停止触发多久以后执行”，节流关心的是“持续触发期间多久最多执行一次”。搜索框和滚动监听只是常见例子，执行时机才是选择它们的依据。
