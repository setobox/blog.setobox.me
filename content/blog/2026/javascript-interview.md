---
title: 'JavaScript 常见面试题'
description: '整理 JavaScript 面试中常见的类型转换、作用域、this、原型链、Promise、模块、拷贝、集合与错误处理问题。'
date: 2026-08-07
tags:
  - JavaScript
  - Promise
  - ES Modules
categories:
  - 面试题
  - JavaScript
draft: true
---

## 类型与类型转换

### JavaScript 有哪些类型

原始类型有 `undefined`、`null`、`boolean`、`number`、`bigint`、`string` 和 `symbol`，其余值都属于对象。函数也是对象，只是可调用。

`typeof` 适合做第一层判断，但有几个边界：

```js
typeof null // 'object'，历史遗留行为
typeof function noop() {} // 'function'
typeof [] // 'object'
typeof 1n // 'bigint'
typeof undeclaredName // 'undefined'
```

数组用 `Array.isArray()` 判断。跨 iframe 时不要依赖 `value instanceof Array`，因为两边的 `Array` 构造函数不是同一个对象。

### `==` 到底做了什么

宽松相等会按规范的抽象相等算法转换两边类型，并不是简单地都执行一次 `Number()`：

```js
0 == false // true
'' == 0 // true
null == undefined // true
null == 0 // false
[] == 0 // true
```

对象参与比较时通常先执行 `ToPrimitive`，可能调用 `Symbol.toPrimitive`、`valueOf()` 或 `toString()`；之后再根据两侧类型继续转换。规则有确定性，但阅读成本很高，所以业务代码默认使用 `===`。少数人会用 `value == null` 同时判断 `null` 和 `undefined`，前提是团队明确接受这条惯例。

`Object.is()` 与 `===` 只在少数值上不同：

```js
Object.is(Number.NaN, Number.NaN) // true
Object.is(0, -0) // false

Number.NaN === Number.NaN // false
0 === -0 // true
```

### `||` 和 `??` 有什么区别

`||` 在左侧为任意假值时取右侧，包括 `0`、`''` 和 `false`；`??` 只把 `null`、`undefined` 视为缺失。

```ts
const volume = settings.volume ?? 50
const label = input.trim() || '未命名'
```

配置项中的 `0` 和 `false` 往往有真实含义，此时应使用 `??`。需要把空字符串也当作无效输入时，`||` 反而更贴切。

### 值传递还是引用传递

JavaScript 的参数都是按值传递。对象变量保存的值恰好是一个引用，因此函数拿到的是“引用值的副本”：它能通过引用修改同一个对象，却不能通过重绑形参改变外部变量。

```ts
interface User {
  name: string
}

function rename(user: User): void {
  user.name = 'new name'
}

function replace(user: User): void {
  user = { name: 'another user' }
}

const user = { name: 'old name' }
rename(user) // 外部对象被修改
replace(user) // 外部变量仍指向原对象
```

## 作用域、提升与闭包

### `var`、`let`、`const` 的区别

`var` 是函数作用域，会发生声明提升，声明前读取到 `undefined`。`let` 和 `const` 是块级作用域，从进入作用域到声明完成前处于暂时性死区，提前访问会抛出 `ReferenceError`。

```js
console.log(a) // undefined
var a = 1

console.log(b) // ReferenceError
let b = 1
```

“`let` 不提升”是方便记忆但不够准确的说法。它的绑定在整个块中已经存在，正因为如此，声明前访问才不会退回外层同名变量，而是进入暂时性死区。

`const` 只禁止重新绑定，不会让对象深度不可变：

```js
const options = { dark: false }
options.dark = true // 合法
// options = {}     // TypeError 对应的语法赋值会在执行时报错
```

实际编码中默认 `const`，确实需要重绑再用 `let`，一般没有必要继续使用 `var`。

### 什么是闭包

函数会记住它创建时的词法环境，即使外层函数已经返回，仍然可以访问其中的绑定，这就是闭包。

```ts
function createCounter(start = 0): () => number {
  let count = start

  return () => ++count
}

const next = createCounter(10)
next() // 11
next() // 12
```

闭包常用于封装状态、回调和函数工厂。它不是“复制了一份变量值”，而是保留对词法绑定的访问，因此下面所有回调会看到各自的 `i`：

```js
for (let i = 0; i < 3; i += 1) {
  setTimeout(() => console.log(i)) // 0、1、2
}
```

循环头部的 `let` 会为每次迭代创建新的绑定。换成 `var` 后只有一个函数级绑定，回调执行时通常都读到循环结束后的 `3`。

闭包只有在被长期持有并捕获了不再需要的大对象时，才会成为内存问题。GC 与泄漏排查见[《垃圾回收机制》](/blog/2026/javascript-garbage-collection)。

## `this` 由什么决定

普通函数的 `this` 主要看**调用位置**，不是看函数写在哪里：

```js
'use strict'

const user = {
  name: 'Seto',
  getName() {
    return this.name
  },
}

user.getName() // 隐式绑定到 user

const getName = user.getName
getName() // 严格模式下 this 为 undefined
getName.call({ name: 'Alice' }) // 显式绑定
```

常见规则可以这样理解：

1. `new Fn()` 创建新对象，并把构造调用中的 `this` 指向它；若构造函数显式返回对象，则以返回对象为准。
2. `call`、`apply`、`bind` 提供显式绑定。
3. `obj.fn()` 由点号左侧对象提供隐式绑定。
4. 独立调用在严格模式下得到 `undefined`，非严格脚本中可能落到全局对象。

箭头函数没有自己的 `this`、`arguments` 和 `new.target`，它从外层词法环境捕获 `this`，也不能作为构造函数：

```ts
class Timer {
  seconds = 0

  start(): ReturnType<typeof setInterval> {
    return setInterval(() => {
      this.seconds += 1
    }, 1000)
  }
}
```

因此箭头函数适合需要沿用外层 `this` 的回调，不适合需要动态接收调用者的对象方法。

## 原型链与 `class`

读取 `object.key` 时，引擎先查对象自身属性；没有找到就沿 `[[Prototype]]` 向上查，直到找到属性或到达 `null`。这条查找链就是原型链。

```js
const animal = {
  speak() {
    return 'sound'
  },
}

const dog = Object.create(animal)
dog.name = 'Mochi'

dog.hasOwnProperty // 从更上层的 Object.prototype 找到
dog.speak() // 从 animal 找到
Object.hasOwn(dog, 'speak') // false
```

判断自有属性优先用 `Object.hasOwn()`，它不依赖对象继承 `Object.prototype`，也不会被同名属性覆盖。

构造函数的 `prototype` 属性与实例的原型不是同一个概念，却会在 `new` 时联系起来：

```js
function Person(name) {
  this.name = name
}

const person = new Person('Seto')
Object.getPrototypeOf(person) === Person.prototype // true
```

`class` 为原型继承提供了更清晰的语法和更严格的运行规则。实例方法通常位于原型上；实例字段则创建在每个实例自身。私有字段 `#value` 还具有语言级的品牌检查，不能简单等同于原型上的普通属性。

### 改原型后，已有实例会怎样

给原来的 `Person.prototype` 增加属性，已有实例通常能通过原型链读到；把 `Person.prototype` 整体替换成新对象，只影响之后创建的实例，旧实例仍指向旧原型。

这也是为什么运行时随意替换原型很难维护。组合、普通对象工厂或稳定的类定义通常更直接。

## Promise 与 async/await

### Promise 构造器是否异步执行

构造器传入的 executor 会立即同步执行；`.then()`、`.catch()`、`.finally()` 注册的反应回调异步执行。

```js
console.log('A')

const promise = new Promise((resolve) => {
  console.log('B')
  resolve('D')
})

promise.then(console.log)
console.log('C')

// A、B、C、D
```

`.then()` 总会返回一个新的 Promise。回调返回普通值时，新 Promise 以该值兑现；返回 Promise 或 thenable 时会吸收其最终状态；抛出异常时会拒绝。

```ts
const length = await fetch('/api/name')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.text()
  })
  .then(name => name.length)
```

顺带注意：`fetch()` 遇到 HTTP 404、500 时通常仍会兑现，需要自行检查 `response.ok`；网络层失败才会直接拒绝。

### async/await 与 Promise 是什么关系

`async` 函数调用后一定返回 Promise。`return value` 会成为兑现值，未捕获异常会成为拒绝原因。`await` 暂停的是当前 async 函数，不会阻塞线程；即使等待的值已经兑现，后续代码也会异步恢复。

可以并行启动的任务不要串行等待：

```ts
const userPromise = getUser()
const postsPromise = getPosts()

const [user, posts] = await Promise.all([userPromise, postsPromise])
```

`Promise.all()` 在任一输入拒绝后立即拒绝，但不会自动取消其他任务。需要取消网络请求时应显式传递 `AbortSignal`。

几种组合方法的语义不要混淆：

- `Promise.all()`：全部成功才成功，保留输入顺序。
- `Promise.allSettled()`：等待全部结束，得到每项的成功或失败状态。
- `Promise.race()`：第一个落定的结果决定整体状态。
- `Promise.any()`：第一个成功结果；全部失败时以 `AggregateError` 拒绝。

事件循环、宏任务和微任务值得单独展开。面试时至少应能解释：同步代码先完成，Promise 反应属于微任务，当前任务结束后会在进入下一任务前清空微任务队列；微任务不断追加也可能让渲染和其他任务迟迟得不到机会。

## ES Modules 与 CommonJS

ES Module 的 `import` / `export` 具有静态结构，工具可以在执行前分析依赖；导入的是导出绑定的实时只读视图，而不是简单复制一次值。

```ts
// counter.ts
export let count = 0

export function increment(): void {
  count += 1
}

// consumer.ts
import { count, increment } from './counter.js'

increment()
console.log(count) // 1，读取到更新后的绑定
// count += 1       // 导入方不能给绑定赋值
```

静态 `import` 只能写在模块顶层。需要按条件加载或代码分割时使用 `import()`，它返回 Promise。

CommonJS 以 `require()` 和 `module.exports` 为核心，传统加载过程是同步的，导出的通常是一个对象值。Node.js 中 ESM/CJS 的文件识别和互操作还受文件扩展名、`package.json` 的 `type`、`exports` 以及 TypeScript `moduleResolution` 影响，不能只看源码里有没有 `import`。

循环依赖并非必然报错，但很容易在模块初始化完成前读取尚未初始化的绑定。解决问题的首选通常是拆出共享依赖、反转依赖方向，而不是依赖加载顺序碰运气。

## 浅拷贝、深拷贝与结构化克隆

对象展开、`Object.assign()` 和数组 `slice()` 都只复制一层。嵌套对象仍然共享：

```ts
const original = {
  profile: { name: 'Seto' },
}

const copy = { ...original }
copy.profile.name = 'Alice'

console.log(original.profile.name) // 'Alice'
```

`JSON.parse(JSON.stringify(value))` 不是通用深拷贝：它无法表达循环引用、`bigint`，会忽略 `undefined`、函数和 Symbol 属性，还会改变 `Date`、`Map`、`Set` 等值的语义。

宿主支持时，`structuredClone()` 更适合复制可结构化克隆的数据，能处理循环引用、`Map`、`Set`、`Date`、`ArrayBuffer` 等，也可以转移部分可转移对象。但函数和 DOM 节点无法克隆，属性描述符、访问器以及自定义原型等元信息也不应指望被完整保留。

```ts
const source = new Map<string, Set<number>>([
  ['ids', new Set([1, 2, 3])],
])

const cloned = structuredClone(source)
cloned.get('ids')?.add(4)
```

更重要的问题是“为什么要深拷贝”。数据模型边界不清时，到处深拷贝只会隐藏共享状态。很多场景用不可变更新、只读类型或复制真正会修改的那一层就够了。

## Object、Map、Set 怎么选

`Object` 适合字段固定、需要 JSON 表达的记录；`Map` 适合动态增删的键值集合，键可以是任意值，并保留插入顺序；`Set` 适合维护唯一值集合。

```ts
const byElement = new Map<Element, { visible: boolean }>()
const selectedIds = new Set<string>()
```

`Map` 和 `Set` 判断键或成员使用 SameValueZero：`NaN` 与自身相同，`0` 和 `-0` 视为相同；对象仍按身份比较。

```js
new Set([Number.NaN, Number.NaN]).size // 1
new Set([{ id: 1 }, { id: 1 }]).size // 2
```

不要用 `JSON.stringify()` 给任意对象做通用去重键，属性顺序、不可序列化值、循环引用和序列化成本都会带来问题。若业务实体有稳定 ID，就直接以 ID 去重。

需要让元数据不阻止对象回收时，考虑 `WeakMap` / `WeakSet`；它们不可遍历，不适合需要统计和展示全部条目的集合。

## 错误处理

### `catch` 到的值不一定是 Error

JavaScript 允许抛出任意值。TypeScript 严格项目中应把捕获值按 `unknown` 缩窄：

```ts
function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

try {
  await runTask()
}
catch (error: unknown) {
  console.error(messageOf(error))
  throw error
}
```

在系统边界可以把外部错误包装成领域错误，并用 `cause` 保留原始上下文：

```ts
class ConfigLoadError extends Error {
  constructor(path: string, cause: unknown) {
    super(`无法读取配置：${path}`, { cause })
    this.name = 'ConfigLoadError'
  }
}
```

不要只 `catch` 后打印日志并返回空值，这会把真正的故障伪装成后续的空指针或错误数据。能恢复就返回明确的降级结果，不能恢复就带着上下文继续抛出。

### `finally` 有什么坑

`finally` 无论成功、失败都会执行，适合释放锁、关闭连接和恢复状态。但在 `finally` 中 `return` 或抛出新异常会覆盖原本的返回值或错误：

```js
function example() {
  try {
    throw new Error('original')
  }
  finally {
    return 'masked' // 原异常被吞掉
  }
}
```

清理逻辑也可能失败时，要明确哪个错误优先，并尽量保留两者上下文。

## 几个适合继续追问的问题

### 为什么 `Array.prototype.map(parseInt)` 结果出人意料

`map` 会传入 `(element, index, array)`，而 `parseInt` 的第二个参数是进制：

```js
['10', '10', '10'].map(parseInt) // [10, NaN, 2]
```

应明确只传一个参数：

```js
['10', '10', '10'].map(value => Number.parseInt(value, 10))
```

### 稀疏数组与 `undefined` 有区别吗

有。空槽没有对应的自有属性，一些数组方法会跳过空槽；显式的 `undefined` 是实际存在的元素。

```js
0 in Array(1) // false
0 in [undefined] // true
```

业务代码通常应避免制造稀疏数组，因为不同迭代方法对空槽的处理并不一致。

### `delete array[index]` 会怎样

它删除属性但不改变 `length`，因此留下空槽。需要删除并移动后续元素用 `splice()`；需要不可变更新可以使用 `toSpliced()` 或组合 `slice()`。

面试时比背出一行答案更重要的是说明适用边界：规范保证什么、宿主环境负责什么、引擎实现又可能优化什么。把这三层分开，很多看似零散的问题会自然连起来。

## 参考资料

- [MDN：JavaScript data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures)
- [MDN：Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)
- [MDN：Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [MDN：JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN：The structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
