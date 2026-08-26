---
title: 'React 常见面试题'
description: '从渲染与状态快照出发，理解 Hooks、Effect、并发更新、服务端渲染和 React 性能优化。'
date: 2026-08-18
tags:
  - React
  - React 19
  - JavaScript
  - 前端工程
  - 面试
categories:
  - 面试题
  - React
---

React 面试容易变成 API 接龙，但真正贯穿大多数问题的是渲染模型：组件执行得到一份 UI 描述，状态更新安排下一次渲染，React 比较结果并在 commit 阶段更新宿主环境。Hooks、闭包、memo 和并发特性都建立在这套模型上。

本文以 React 19.2 官方文档描述的 API 为基准。Fiber 调度、lane 等概念有助于阅读源码，但属于实现细节；业务代码不应依赖某个版本的内部字段或精确调度顺序。

## React 的渲染模型

React 组件本质上是根据 props、state 和 context 返回 UI 描述的函数。一次更新可以拆成三个便于理解的阶段：

1. Trigger：首次挂载，或 state、父组件、context 等发生更新，触发渲染工作。
2. Render：React 调用组件，递归计算下一棵 UI 树。这个阶段应保持纯净。
3. Commit：把必要变化应用到 DOM，并处理与提交相关的 Effect。

“组件 render 了”不等于“DOM 一定变化”。如果新旧结果等价，React 可以不改对应 DOM。反过来，直接修改 DOM 也不会自动改变 React state，下一次 commit 还可能把手动修改覆盖。

### 为什么 render 必须纯净

给定同一组输入，组件应返回同样的 JSX，且不在 render 中产生外部副作用：

```tsx
// 错误：渲染本身修改了组件外部状态
let nextId = 0

function Row() {
  nextId += 1
  return <div>{nextId}</div>
}
```

并发渲染可能暂停、重试或放弃一轮 render；Strict Mode 在开发环境也会额外调用部分逻辑，帮助暴露不纯代码。因此网络请求、订阅和手动 DOM 操作应放到事件处理、Effect 或框架提供的数据层中，而不是组件函数正文。

这并不要求“组件里不能计算”。数组筛选、格式化文本、根据 props 选择 JSX 都是 render 的正常工作，只要不修改外部系统和输入对象。

## Props 与 State

Props 是父组件传入的只读输入；state 是组件对某次渲染的私有状态快照。二者改变都可能产生新的 UI，但组件不应直接修改它们。

```tsx
type CounterProps = {
  initialValue?: number
  step?: number
}

export function Counter({
  initialValue = 0,
  step = 1,
}: CounterProps) {
  const [count, setCount] = useState(initialValue)

  return (
    <button onClick={() => setCount(current => current + step)}>
      {count}
    </button>
  )
}
```

`useState(initialValue)` 只在初次挂载时使用初始值。父组件后来改变 `initialValue`，不会自动重置 `count`。若业务需要跟随 prop，应先判断这个 state 是否多余；需要真正重置一棵子树时，可以改变它的 key，让 React 按新的身份重新挂载。

### State 是快照

每次 render 都拿到固定的 state 值。事件处理函数闭包捕获的是创建它的那次 render：

```tsx
function addThree() {
  setCount(count + 1)
  setCount(count + 1)
  setCount(count + 1)
}
```

这三行在同一次事件中都读取相同的 `count`，通常只得到一次 `+1`。若后一次更新依赖前一次结果，使用 updater：

```tsx
function addThree() {
  setCount(current => current + 1)
  setCount(current => current + 1)
  setCount(current => current + 1)
}
```

React 会批处理合适范围内的更新，减少重复 commit。调用 setter 后当前变量不会立刻变化；需要的下一状态应由 updater 计算，或等下一次 render 使用。

### 为什么不能直接修改对象 State

```tsx
// 错误：修改原对象后仍把同一引用交回去
user.name = nextName
setUser(user)

// 正确：创建下一份值
setUser(current => ({
  ...current,
  name: nextName,
}))
```

React 使用引用身份判断大量更新边界。不可变更新既让变化可检测，也避免旧 render 的快照被后来代码悄悄改写。深层状态经常更新时，优先重新设计状态形状或使用 reducer，而不是先引入复杂深拷贝。

## `key` 到底解决什么问题

key 帮助 React 在同一父级的一组子元素中识别“谁还是谁”。它应该在兄弟范围内唯一、稳定，并来自数据本身。

```tsx
function TodoList({ todos }: { todos: readonly Todo[] }) {
  return (
    <ul>
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  )
}
```

用数组下标作 key 并非语法错误。静态、不会增删重排且没有独立子状态的列表中，它可能足够；一旦列表插入、排序或过滤，下标对应的数据会变化，输入值、焦点和组件 state 可能被错误复用。

`Math.random()` 更糟：每次 render 都产生新 key，React 会把旧组件卸载再挂载，丢失本地状态和 DOM 复用。

key 不会作为普通 prop 传给组件。组件需要 ID 时要显式写 `id={todo.id}`。key 也能有意重置状态，例如切换不同用户的编辑表单：

```tsx
<ProfileForm key={user.id} user={user} />
```

## Hooks 规则

普通 Hooks 应满足两条规则：

1. 只在 React 函数组件或自定义 Hook 中调用。
2. 在组件顶层调用，不放进条件、循环、事件处理函数或普通嵌套函数。

React 依赖调用顺序把每次 render 的 Hook 与之前状态对应起来：

```tsx
// 错误：条件变化后，后续 Hook 的位置会错位
if (enabled)
  useEffect(connect, [])

// 正确：始终调用 Hook，把条件放进内部
useEffect(() => {
  if (!enabled)
    return

  return connect()
}, [enabled])
```

React 19 的 `use` API 有单独规则，可以在条件和循环中读取 Promise 或 context，但仍必须在组件或 Hook 中调用，也不能放进 `try/catch`。不要把这个例外推广到 `useState`、`useEffect` 等普通 Hook。

自定义 Hook 是复用有状态逻辑，不是共享 state 实例。两个组件各自调用 `useOnlineStatus()`，默认仍各有一套 Hook 状态；它们可能共同订阅同一个外部源。

## 闭包与过期值

函数组件每次 render 都创建新的局部变量和函数。异步回调捕获旧 render 的值很正常，问题在于代码是否表达了最新数据需求。

### 定时器中的旧 State

```tsx
function Clock() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds(current => current + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  return <time>{seconds}s</time>
}
```

使用函数式更新后，回调不需要读取闭包中的 `seconds`，Effect 也不必每秒拆掉并重建计时器。

若回调确实要读取最新值，可以重新设计数据流、把反应逻辑放进 Effect 并声明依赖，或在不影响渲染的场景用 ref 保存可变值。ref 更新不会触发 render，因此不能用它替代所有 state。

“故意漏掉依赖以保持旧闭包”通常是在埋问题。应让 Hooks lint 规则检查依赖，再消除不必要的对象/函数依赖或拆分 Effect。

## `useEffect`：与外部系统同步

Effect 最清楚的定义是：把组件与 React 之外的系统同步，例如网络连接、浏览器 API、第三方控件、定时器和事件订阅。

```tsx
type ChatRoomProps = {
  roomId: string
}

function ChatRoom({ roomId }: ChatRoomProps) {
  useEffect(() => {
    const connection = createConnection(roomId)
    connection.connect()

    return () => connection.disconnect()
  }, [roomId])

  return <section>Room: {roomId}</section>
}
```

依赖改变时，React 会先使用旧值运行 cleanup，再用新值运行 setup；组件卸载时也会 cleanup。Strict Mode 开发环境会额外执行一次 setup → cleanup → setup，用来检查清理逻辑是否与建立逻辑对称。生产环境并不是“Effect 永远执行两次”。

### 哪些逻辑不该放 Effect

- 能由 props/state 直接计算的派生值，直接在 render 中计算。
- 用户点击造成的提交，在事件处理函数中执行，因为那里知道具体事件。
- 为了同步两个互相可推导的 state 而写 Effect，通常应移除冗余 state。
- 数据获取若由框架路由、服务端组件或缓存层负责更合适，就不要每个组件手写瀑布请求。

```tsx
// 不必用 Effect 再 setState
const fullName = `${firstName} ${lastName}`
```

### `useEffect` 与 `useLayoutEffect`

`useLayoutEffect` 在浏览器重绘前执行并会阻塞绘制，适合必须测量布局后同步修正位置的少量场景。`useEffect` 更适合不要求阻塞绘制的同步。React 可能因交互调度调整 Effect 的实际执行时机，因此不要把它们当作精确计时 API。

服务端没有浏览器 layout；大量 `useLayoutEffect` 也会拖慢首帧。能用 CSS 布局解决时，优先不用 JavaScript 测量。

## `memo`、`useMemo` 与 `useCallback`

三者都是性能优化，不是语义保证：

- `memo(Component)`：父组件 render 时，若传入 props 按比较规则没有变化，可跳过该组件的一次 render。
- `useMemo(calculate, deps)`：在依赖未变时复用一次计算结果。
- `useCallback(fn, deps)`：在依赖未变时复用函数引用。

```tsx
const visibleProducts = useMemo(
  () => filterProducts(products, query),
  [products, query],
)

const handleSelect = useCallback((id: string) => {
  setSelectedId(id)
}, [])

return (
  <MemoizedProductList
    products={visibleProducts}
    onSelect={handleSelect}
  />
)
```

只有当下游对引用稳定敏感，例如子组件经过 memo、值是其他 Hook 的依赖，或计算经测量确实昂贵时，这样做才可能有收益。每次都新建的对象 prop 会让浅比较失效；但为所有表达式加 memo 也会增加代码和依赖比较成本。

`memo` 只处理 props。组件自己的 state 或所消费的 context 改变时仍会 render。自定义比较函数必须比较每个会影响输出的 prop，包括函数；把旧函数误判为相等，函数闭包就可能长期看到旧 props/state。

官方文档说明 React Compiler 能在启用它的项目中自动应用一部分等价的 memoization。是否采用取决于项目构建链和兼容性；即便用了编译器，组件纯度、正确依赖和性能测量仍然必要。

## Context

Context 让深层组件读取上方 provider 的值，适合主题、当前用户、语言环境和一组共享服务。它解决的是传递路径，不自动解决状态建模和更新性能。

```tsx
type Theme = 'light' | 'dark'

const ThemeContext = createContext<Theme>('light')

function App() {
  const [theme, setTheme] = useState<Theme>('light')

  return (
    <ThemeContext.Provider value={theme}>
      <Toolbar onToggle={() => {
        setTheme(current => current === 'light' ? 'dark' : 'light')
      }} />
    </ThemeContext.Provider>
  )
}
```

当 provider 的 value 改变时，消费它的组件会更新。若 value 每次都新建为 `{ state, actions }`，所有消费者可能一起更新。可按变化频率拆分 context，让 action 引用稳定，或使用带 selector 的外部 store。不要为了避开两三层明确的 props 就默认引入全局 context，显式传递往往更容易追踪。

React 19 允许直接把 context 对象作为 provider 渲染；`.Provider` 写法仍便于理解旧代码和兼容不同版本。面试中先问清项目版本，再讨论推荐语法。

## 状态管理怎样选

先按状态归属分类，再选工具：

- 只服务一个组件：本地 `useState`。
- 多个相邻组件共享：提升到最近共同父级。
- 转移规则复杂：`useReducer` 把状态转移集中起来。
- 深层树共享且更新不频繁：Context。
- 跨页面客户端状态、需要 selector/调试/持久化：评估外部 store。
- URL 能表达的筛选、分页和选中项：优先放 URL，天然可分享和前进后退。
- 服务端数据：交给框架数据层或具备缓存、去重、失效和竞态处理的数据请求库。

Redux、Zustand 或其他方案都不是项目规模的自动答案。判断维度是更新频率、数据归属、并发竞态、服务端集成、调试需求和团队约束。

外部可变 store 若要安全接入并发 React，应使用库提供的 React 绑定，或按契约通过 `useSyncExternalStore` 订阅，而不是在 render 中随手读取一个全局变量。

## 受控组件与非受控组件

受控输入的当前值来自 React state，并在 `onChange` 中同步更新：

```tsx
function SearchBox() {
  const [query, setQuery] = useState('')

  return (
    <label>
      搜索
      <input
        value={query}
        onChange={event => setQuery(event.currentTarget.value)}
      />
    </label>
  )
}
```

它便于即时校验、联动和统一提交。非受控输入由 DOM 保存当前值，通过 `defaultValue` 设置初值，提交时用 ref 或 `FormData` 读取，简单表单中代码更少。

一个输入在生命周期内不应在受控与非受控间切换。传了 `value` 却没有同步 `onChange`，输入会像只读一样。文本输入的紧急 state 更新也不该放进 Transition，否则显示会跟不上键盘输入。

## 并发特性

并发渲染不是让同一个主线程同时执行两段 JavaScript。它让 React 的 render 工作可以按优先级调度，并在必要时暂停、恢复、重启或放弃；DOM commit 仍保持一致，用户不会看到只提交一半的 React 树。

普通紧急更新保持直接响应。非紧急更新可以用 Transition 标记：

```tsx
function ProductSearch({ products }: {
  products: readonly Product[]
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [isPending, startTransition] = useTransition()

  const visibleProducts = useMemo(
    () => products.filter(product =>
      product.name.toLowerCase().includes(filter.toLowerCase()),
    ),
    [products, filter],
  )

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextQuery = event.currentTarget.value

    // 输入框必须紧急更新
    setQuery(nextQuery)

    // 较慢的结果列表允许被新输入打断
    startTransition(() => {
      setFilter(nextQuery)
    })
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <span>正在更新结果…</span>}
      <ProductList products={visibleProducts} />
    </>
  )
}
```

Transition 不能用来控制文本输入。`useDeferredValue` 则适合让某个派生值落后于紧急值，由 React 在后台追赶。两者不会让过滤算法本身更快，只是改善调度；数据量巨大时仍需索引、虚拟化、服务端查询或 Worker。

### Suspense 的作用

Suspense boundary 在子树尚未准备好时显示 fallback，并与流式 SSR、代码分割、Transition 和支持 Suspense 的数据源协作。它不会自动让任意 `useEffect` 请求具备缓存与暂停能力；数据源必须与 Suspense 集成，通常由框架或数据层提供。

并发能力应通过公开 API 使用。不要根据 Fiber 是否“分片”来推断某次更新一定会被打断，设备速度和调度条件都可能让它一次完成。

## SSR 与 Hydration

SSR 在服务端把 React 树输出为 HTML，让用户和爬虫更早获得内容。浏览器随后加载 JavaScript，通过 `hydrateRoot` 在现有 HTML 上附加事件和 React 状态，这个过程叫 hydration。

```tsx
import { hydrateRoot } from 'react-dom/client'
import { App } from './App'

hydrateRoot(
  document.getElementById('root')!,
  <App />,
)
```

客户端首次 render 应与服务端输出一致。常见 hydration mismatch 来源包括：

- render 中调用 `Date.now()`、`Math.random()`。
- 服务端与客户端的语言、时区或数据不同。
- 在 render 中直接按 `window` 是否存在输出不同结构。
- 无效 HTML 嵌套被浏览器解析器修正。
- 请求到达客户端前，外部数据已发生变化却没有传递同一快照。

Mismatch 应当作为 bug 修复。`suppressHydrationWarning` 只适合时间戳等确实不可避免的小范围差异，不是整棵树的静音按钮。

流式 SSR 可以先发送已经准备好的部分，并让 Suspense 边界后续补齐。Hydration 也可按可用内容逐步进行。真实项目通常通过 Next.js、Remix 等框架组织路由、数据、流式和打包，而不是手写完整 SSR 管线。

React Server Components 与 SSR 不是同义词：RSC 在服务端执行组件并传输一种可组合的结果，SSR 把树转成 HTML；框架可以组合两者。客户端组件边界、序列化和缓存行为应按所用框架版本说明。

## 性能优化

性能优化先测量，再定位是网络、JavaScript、render、commit、layout 还是 paint。React DevTools Profiler 能查看哪些组件 render、commit 花了多久；浏览器 Performance 面板则能看到主线程和渲染成本。

### 让状态靠近使用位置

把输入框的每个按键状态放到页面顶层，会让整棵子树都获得更新机会。若其他区域不需要该值，让 state 留在局部；需要共享时再提升。组件组合和 `children` 也能把不相关子树隔离在更新边界之外。

### 避免 Effect 更新链

Effect 中无条件 `setState` 会额外产生一轮 render，多个 Effect 互相推动更容易形成瀑布或死循环。能在 render 推导就直接推导，能在一次事件中计算就一次更新。

### 控制列表与数据规模

为大列表虚拟化，只渲染可见区域；为昂贵搜索建立索引或移到服务端；不要指望 `memo` 解决数万个 DOM 节点的布局和绘制成本。

### 稳定引用要有目的

先确认慢组件确实因 props 引用变化重复 render，再使用 memo/useMemo/useCallback。把常量对象移到组件外、让 reducer dispatch 或 state setter 直接向下传，有时比堆更多 Hook 简单。

### 拆分代码和非紧急工作

按路由或重功能拆包，使用框架预加载避免请求瀑布；用 Transition 保护输入响应；纯 CPU 重活必要时进入 Worker。React 优化只覆盖 React 工作，网络、DOM 数量和 CSS 渲染同样要测。

## 与 Vue 的中性对比

React 和 Vue 都以组件组织 UI，也都能做客户端应用、SSR、流式渲染和生态化状态管理。差异更多体现在默认表达方式与更新模型，而不是“谁绝对更快”。

| 维度         | React                                                  | Vue                                                    |
| ------------ | ------------------------------------------------------ | ------------------------------------------------------ |
| UI 表达      | JavaScript/TypeScript 中使用 JSX，控制流沿用语言本身   | 单文件组件与模板是常见默认，也支持 JSX/render function |
| 响应更新     | state setter/context/store 安排组件 render，再比较结果 | 运行时响应式追踪组件 render 使用的依赖，再安排更新     |
| 逻辑复用     | Hooks 与普通函数组合                                   | Composition API/composables 与响应式原语               |
| 性能工具     | memo、并发调度、Compiler、Profiler                     | computed、细粒度依赖追踪、编译优化、性能面板           |
| 官方框架路径 | 官方文档建议完整应用采用 React framework               | Vue 可用 Vue Router/Pinia，SSR 常使用 Nuxt             |

Vue 的模板编译可以提供静态分析，React 的 JSX 则让 UI 与 JavaScript 组合直接；React Compiler 又在改变部分手工 memo 的需求，Vue 也在演进不同编译策略。面试中更有价值的回答是结合团队能力、生态依赖、SSR/部署需求和现有代码说明取舍，而不是引用多年前的基准图。

## 常见追问

### `setState` 是同步还是异步？

setter 调用会同步登记更新，但当前 render 的 state 变量不会原地改变；React 会按所在上下文批处理并安排后续 render。与其用“同步/异步”二选一，不如说明 state snapshot、更新队列和 commit 何时可见。需要基于前值计算时使用函数 updater。

### 父组件 render，子组件一定 render 吗？

默认情况下，React 会继续 render 它直接返回的子组件。`memo`、稳定的 element/props、框架或编译器优化可能跳过部分工作；子组件消费的 context 或自身 state 变化又会触发它。是否有 DOM 变化还要看 render 结果比较。

### `useRef` 与 `useState` 的区别是什么？

两者都能跨 render 保存值。修改 state 会安排 render；修改 `ref.current` 不会。Ref 适合 DOM 引用、计时器 ID、与渲染无关的可变值。界面需要随值变化时应使用 state，否则画面可能长期停留在旧值。

### Error Boundary 能捕获所有错误吗？

Error Boundary 用于捕获后代渲染、生命周期和部分 React 工作中的错误并显示 fallback。它不会自动捕获普通事件处理函数、任意异步回调、服务端渲染中的所有错误，也不能捕获 boundary 自身抛出的错误。事件和请求仍需显式错误处理。

### 为什么不能把 Hooks 放在条件里？

React 需要用稳定调用顺序对应每个 Hook 的状态槽。某次 render 少调用一个 Hook，后面的状态就会错位。条件应放进 Hook 内部，或把分支拆成不同组件。

## 参考资料

- [React：Render and Commit](https://react.dev/learn/render-and-commit)
- [React：State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
- [React：Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)
- [React：Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [React：Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [React：useEffect](https://react.dev/reference/react/useEffect)
- [React：memo](https://react.dev/reference/react/memo)
- [React：useMemo](https://react.dev/reference/react/useMemo)
- [React：useCallback](https://react.dev/reference/react/useCallback)
- [React：useTransition](https://react.dev/reference/react/useTransition)
- [React DOM：hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot)
- [React DOM：Server APIs](https://react.dev/reference/react-dom/server)
- [React Compiler：Introduction](https://react.dev/learn/react-compiler/introduction)
