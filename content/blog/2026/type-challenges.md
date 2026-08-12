---
title: 'Type Challenges'
description: '从 Equal 与 Expect 开始，循序练习元组、条件类型、infer、映射类型、模板字面量、递归与联合类型分配。'
date: 2026-08-07
tags:
  - TypeScript
  - Type Challenges
  - 类型体操
categories:
  - TypeScript
  - 编程练习
---

## 类型题到底在练什么

Type Challenges 不是把 JavaScript 搬到类型系统里重写一遍。它真正训练的是三件事：

1. 把一个类型拆成可以匹配的结构。
2. 理解条件类型、联合类型和推断在边界上的行为。
3. 用编译失败表达测试，而不是凭编辑器悬浮结果判断“看起来对了”。

这些能力会直接用在类型安全的路由、事件名、配置转换和库 API 中。不过类型越聪明不代表项目越好：运行时仍然要验证外部数据，过深的递归类型也会拖慢编辑器。练习时可以走得远，生产代码则要把可读性放回来。

下面所有示例都假设启用了 TypeScript 严格模式，并且不使用 `any`。

## 先搭一个最小测试框架

类型没有运行时值，不能交给 Vitest 的 `expect()`。常见做法是让错误答案违反泛型约束，从而在 `tsc --noEmit` 时失败：

```ts
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false

type Expect<Condition extends true> = Condition
type ExpectFalse<Condition extends false> = Condition

type BasicCases = [
  Expect<Equal<'a', 'a'>>,
  ExpectFalse<Equal<'a', string>>,
]
```

`Equal` 利用两个泛型函数在任意 `Value` 下的条件结果比较类型，能比简单的双向 `extends` 区分更多边界。它是练习用的测试工具，不必复制进每个业务模块。

写题时先写 cases，再写实现。错误示例可以用 `@ts-expect-error` 确认“这里必须报错”，但要避免把真实失败也一起压住。

## 第一层：元组是带位置与长度信息的数组

普通数组只知道元素类型，元组还知道每个位置。用条件类型匹配元组结构，就能取出头尾或拼接两个元组：

```ts
type First<Tuple extends readonly unknown[]> =
  Tuple extends readonly [infer Head, ...infer _Tail]
    ? Head
    : never

type Last<Tuple extends readonly unknown[]> =
  Tuple extends readonly [...infer _Head, infer Tail]
    ? Tail
    : never

type Concat<
  Left extends readonly unknown[],
  Right extends readonly unknown[],
> = [...Left, ...Right]

type TupleCases = [
  Expect<Equal<First<readonly ['a', 'b']>, 'a'>>,
  Expect<Equal<First<readonly []>, never>>,
  Expect<Equal<Last<readonly [1, 2, 3]>, 3>>,
  Expect<Equal<Concat<readonly [1, 2], readonly ['a']>, [1, 2, 'a']>>,
]
```

这里的 `readonly unknown[]` 是约束，不是最终结果。它让可变数组、只读数组和 `as const` 得到的只读元组都能传入。空元组匹配不到必需的 `Head`，因此返回 `never`。

也可以用索引访问完成一部分题目：`Tuple[number]` 会得到所有元素类型的联合，`Tuple['length']` 会得到元组的数字字面量长度。遇到题目先看现有类型操作符，未必都需要递归。

## 第二层：条件类型是在判断可赋值性

条件类型的形式是 `T extends U ? X : Y`。这里的 `extends` 判断 `T` 是否可赋值给 `U`，不是只判断名义上的继承关系。

```ts
type ElementOf<Value> =
  Value extends readonly (infer Item)[]
    ? Item
    : Value

type IsNever<Value> = [Value] extends [never]
  ? true
  : false

type ConditionalCases = [
  Expect<Equal<ElementOf<readonly string[]>, string>>,
  Expect<Equal<ElementOf<Date>, Date>>,
  Expect<Equal<IsNever<never>, true>>,
  Expect<Equal<IsNever<string>, false>>,
]
```

为什么 `IsNever<T>` 要加方括号？裸类型参数进入条件类型时会对联合类型逐项分配，而 `never` 是空联合，根本没有成员进入分支，结果仍是 `never`。把两边包成单元素元组后，检查对象不再是裸类型参数，分配行为被关闭。

这个技巧也适合回答面试追问：“如何区分一个联合逐项转换和把整个联合一起转换？”后面还会再用一次。

## 第三层：`infer` 从匹配结构中取变量

`infer` 只能出现在条件类型的 `extends` 子句中。它的意思不是“随便猜一个类型”，而是“如果整体能匹配这个结构，把对应部分记为一个新类型变量”。

```ts
type ReturnValue<Fn> =
  Fn extends (...args: never[]) => infer Result
    ? Result
    : never

type UnwrapPromise<Value> =
  Value extends PromiseLike<infer Inner>
    ? UnwrapPromise<Inner>
    : Value

type ApiCall = (id: string) => Promise<PromiseLike<{ id: string }>>

type InferCases = [
  Expect<Equal<ReturnValue<(value: string) => number>, number>>,
  Expect<
    Equal<
      UnwrapPromise<ReturnValue<ApiCall>>,
      { id: string }
    >
  >,
]
```

这里用 `never[]` 描述我们不关心参数内容的函数形状，避免引入 `any`。`UnwrapPromise` 递归展开嵌套 thenable；真实项目通常直接用标准库的 `Awaited<T>`，练习实现它是为了理解结构匹配。

函数重载需要额外小心：对具有多个调用签名的类型做这种推断时，通常从最后一个、最宽泛的签名推断，类型系统不会在这里执行一次重载解析。

## 第四层：映射类型遍历对象键

映射类型把 `keyof T` 得到的键逐一变换。`-readonly`、`-?` 可以移除修饰符，`as` 可以重映射或过滤键。

```ts
type MutableRequired<Value> = {
  -readonly [Key in keyof Value]-?: Value[Key]
}

type Getters<Value extends object> = {
  [Key in keyof Value as
    Key extends string
      ? `get${Capitalize<Key>}`
      : never
  ]: () => Value[Key]
}

interface Draft {
  readonly title?: string
  readonly count?: number
}

interface Model {
  name: string
  active: boolean
}

type MappedCases = [
  Expect<
    Equal<
      MutableRequired<Draft>,
      { title: string; count: number }
    >
  >,
  Expect<
    Equal<
      Getters<Model>,
      { getName: () => string; getActive: () => boolean }
    >
  >,
]
```

键重映射为 `never` 就等于删除该键。`keyof` 可能包含 `string | number | symbol`，而 `Capitalize` 只处理字符串，因此这里先用 `Key extends string` 缩窄。

这类转换的价值不只是做题。例如事件 API 可以从状态字段生成 `` `${Key}Changed` ``，再通过 `Value[Key]` 保证回调参数与字段类型一致。

## 第五层：模板字面量类型解析字符串

模板字面量类型既能拼接字符串字面量，也能配合 `infer` 拆分字符串。下面从路由路径中提取参数名：

```ts
type RouteParameter<Path extends string> =
  Path extends `${string}:${infer Parameter}/${infer Rest}`
    ? Parameter | RouteParameter<`/${Rest}`>
    : Path extends `${string}:${infer Parameter}`
      ? Parameter
      : never

type RouteParams<Path extends string> = {
  [Parameter in RouteParameter<Path>]: string
}

type RouteCases = [
  Expect<
    Equal<
      RouteParameter<'/users/:userId/posts/:postId'>,
      'userId' | 'postId'
    >
  >,
  Expect<
    Equal<
      RouteParams<'/users/:userId'>,
      { userId: string }
    >
  >,
]
```

它有意只处理 `:name` 这一种简单语法，没有处理可选参数、通配符和查询字符串。类型解析器必须与真实运行时解析器共享同一份语法约定，否则类型“通过”也不能保证运行时正确。

再看一个两端递归裁剪空白的例子：

```ts
type Whitespace = ' ' | '\n' | '\t'

type TrimLeft<Text extends string> =
  Text extends `${Whitespace}${infer Rest}`
    ? TrimLeft<Rest>
    : Text

type Trim<Text extends string> =
  TrimLeft<Text> extends `${infer Rest}${Whitespace}`
    ? Trim<Rest>
    : TrimLeft<Text>

type TrimCases = [
  Expect<Equal<Trim<'  hello\n'>, 'hello'>>,
  Expect<Equal<Trim<'typescript'>, 'typescript'>>,
]
```

每次递归都必须让输入明显变小，否则很容易触发“类型实例化过深”。看到递归题时先找终止条件，再写递归分支。

## 第六层：递归处理嵌套元组

把前面的元组匹配、条件类型与递归组合起来，可以实现扁平化：

```ts
type Flatten<Tuple extends readonly unknown[]> =
  Tuple extends readonly [infer Head, ...infer Tail]
    ? Head extends readonly unknown[]
      ? [...Flatten<Head>, ...Flatten<Tail>]
      : [Head, ...Flatten<Tail>]
    : []

type FlattenCases = [
  Expect<
    Equal<
      Flatten<readonly [1, readonly [2, readonly [3]], 4]>,
      [1, 2, 3, 4]
    >
  >,
  Expect<Equal<Flatten<readonly []>, []>>,
]
```

推导过程可以手工展开一轮：先取出 `Head = 1`、`Tail = [[2, [3]], 4]`；`Head` 不是数组，于是结果以 `[1, ...Flatten<Tail>]` 开始。能写出这一步，后面只是重复。

生产代码里要留意输入是否真的是有限元组。对宽泛的 `string[]` 使用基于“头 + 尾”的递归，往往得不到做题时那样精确的终止结构。

## 第七层：联合类型为什么会分配

当条件左侧是裸类型参数时，联合类型会逐项进入条件，再把结果合成联合：

```ts
type ToArray<Member> = Member extends unknown
  ? Member[]
  : never

type ToArrayTogether<Union> = [Union] extends [unknown]
  ? Union[]
  : never

type DistributiveCases = [
  Expect<
    Equal<
      ToArray<string | number>,
      string[] | number[]
    >
  >,
  Expect<
    Equal<
      ToArrayTogether<string | number>,
      (string | number)[]
    >
  >,
]
```

`string[] | number[]` 表示数组要么全是字符串，要么全是数字；`(string | number)[]` 则允许两者混在同一个数组里。这不是格式差异，而是不同的数据约束。

联合转交叉是这一规则与函数参数逆变的经典组合：

```ts
type UnionToIntersection<Union> = (
  Union extends unknown
    ? (value: Union) => void
    : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never

type IntersectionCase = Expect<
  Equal<
    UnionToIntersection<{ id: string } | { active: boolean }>,
    { id: string } & { active: boolean }
  >
>
```

先把联合的每个成员变成函数，再从“能够接收所有这些函数”的参数位置推断类型，最终得到交叉。这里理解参数位置为什么反向，比记住一段咒语更重要；相关原理可以继续看[《协变和逆变》](/blog/2026/typescript-variance)。

## 一套更有效的练习顺序

建议按下面的节奏做题：

1. 先写正常输入、空输入、只读输入和联合输入的断言。
2. 用一句自然语言说清输入如何被拆开，以及递归何时停止。
3. 只实现最小版本，编译通过后再补边界。
4. 卡住时把复杂类型缩成两个成员，手工展开一轮条件类型。
5. 完成后查看官方工具类型或社区答案，比较约束与失败行为，不只比较字符数。

编辑器悬浮展示会为了可读性化简类型，不是测试结果。把 cases 放在独立的 `.test-d.ts` 或 `.ts` 文件中，让 `tsc --noEmit` 进入 CI，才能保证升级 TypeScript 后仍符合预期。

遇到业务类型时再多问两句：这个约束是否能在运行时兑现？错误提示是否比手写一个普通接口更清楚？如果答案是否定的，简单类型配合边界校验通常更可靠。

## 参考资料

- [Type Challenges 仓库](https://github.com/type-challenges/type-challenges)
- [TypeScript：Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript：Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [TypeScript：Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [TypeScript：Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
