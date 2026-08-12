---
title: '协变和逆变'
description: '从函数参数与返回值出发，理解 TypeScript 的协变、逆变、双变和不变，以及 strictFunctionTypes、数组与 readonly 的边界。'
date: 2026-08-07
tags:
  - TypeScript
  - 类型系统
  - 泛型
categories:
  - TypeScript
  - 编程语言
---

## 先从“能不能替换”开始

如果 `Dog` 可以用在所有需要 `Animal` 的地方，就说 `Dog` 是 `Animal` 的子类型。方差讨论的是：把它们放进同一个泛型后，这个可替换关系会保留、反转，还是消失。

```ts
class Animal {
  constructor(readonly name: string) {}
}

class Dog extends Animal {
  bark(): string {
    return `${this.name}: woof`
  }
}

class Cat extends Animal {
  meow(): string {
    return `${this.name}: meow`
  }
}
```

后文都建立在 `Dog <: Animal` 上。`<:` 可以读作“是……的子类型”。TypeScript 主要采用结构类型系统，真实判断依据是成员结构；这里用类只是为了让关系更直观。

四个常见结果是：

| 名称 | `Dog` 与 `Animal` 放入 `F<T>` 后 | 直觉             |
| ---- | -------------------------------- | ---------------- |
| 协变 | `F<Dog> <: F<Animal>`            | 方向不变         |
| 逆变 | `F<Animal> <: F<Dog>`            | 方向反转         |
| 不变 | 两个方向都不成立                 | 必须是同一类型   |
| 双变 | 两个方向都允许                   | 宽松但可能不安全 |

不要急着背表。看清一个类型参数是被“产出”还是被“消费”，方向自然就出来了。

## 返回值为什么协变

只负责生产值的函数可以写成：

```ts
type Producer<Value> = () => Value

const produceDog: Producer<Dog> = () => new Dog('Mochi')
const produceAnimal: Producer<Animal> = produceDog

const animal = produceAnimal() // 静态类型是 Animal，实际得到 Dog
```

需要 `Animal` 的调用方只会使用 `Animal` 保证存在的能力。给它一个更具体的 `Dog` 不会破坏任何假设，因此 `Producer<Dog>` 可以替代 `Producer<Animal>`。

这就是返回值位置的协变：输入类型越具体，生产者类型也越具体，方向不变。

反过来不安全。一个只承诺返回 `Animal` 的函数可能返回 `Cat`，不能拿去满足“必须返回 `Dog`”的要求：

```ts
const produceAnyAnimal: Producer<Animal> = () => new Cat('Mimi')

// @ts-expect-error Animal 不一定具有 bark()
const mustProduceDog: Producer<Dog> = produceAnyAnimal
```

## 参数为什么逆变

消费者只接收值，不返回相关类型：

```ts
type Consumer<Value> = (value: Value) => void

const consumeAnimal: Consumer<Animal> = (animal) => {
  console.log(animal.name)
}

const consumeDog: Consumer<Dog> = consumeAnimal
consumeDog(new Dog('Mochi'))
```

需要“能处理 Dog 的函数”时，提供一个连所有 Animal 都能处理的函数当然安全。于是 `Consumer<Animal>` 可以替代 `Consumer<Dog>`，方向与原始子类型关系相反。

另一个方向会出问题：

```ts
const dogOnly: Consumer<Dog> = (dog) => {
  console.log(dog.bark())
}

// @ts-expect-error 调用方可能传入 Cat
const acceptsAnimal: Consumer<Animal> = dogOnly
```

若这次赋值被允许，`acceptsAnimal(new Cat('Mimi'))` 在类型上合法，运行时却会调用不存在的 `bark()`。

逆变最初容易绕，是因为我们习惯盯着参数声明里的 `Dog`。换成调用者视角就清楚了：能接收范围更宽的函数，才更容易替换其他消费者。

## `strictFunctionTypes` 改变了什么

启用 `strict` 时，`strictFunctionTypes` 默认开启。它让函数类型的参数按逆变方式检查，而不是默认双变。

```ts
interface CallbackBox<Value> {
  handle: (value: Value) => void
}

const dogCallback: CallbackBox<Dog> = {
  handle: dog => console.log(dog.bark()),
}

// @ts-expect-error 只能处理 Dog 的回调不能冒充 Animal 回调
const animalCallback: CallbackBox<Animal> = dogCallback
```

注意 `handle: (value: Value) => void` 是**函数属性**。TypeScript 为兼容既有 JavaScript 模式，对方法声明和构造签名保留了例外：方法参数仍可能按双变检查。

```ts
interface MethodBox<Value> {
  handle(value: Value): void
}

const dogMethod: MethodBox<Dog> = {
  handle(dog) {
    console.log(dog.bark())
  },
}

// 方法参数双变使这次赋值通过
const animalMethod: MethodBox<Animal> = dogMethod

function demonstrateMethodHole(): void {
  // 编译通过，但实际会在 dog.bark() 处抛错
  animalMethod.handle(new Cat('Mimi'))
}
```

这段代码说明了一个很实用的 API 设计区别：如果一个成员表达的是回调槽位，并且希望 `strictFunctionTypes` 真正检查参数方向，优先写成函数属性；方法语法更适合常规面向对象方法，但会保留这处宽松行为。

“双变”就是源参数可赋值给目标参数，或目标参数可赋值给源参数时都允许。它提升了兼容性，却不是完全可靠的类型证明。

## 同时输入和输出时通常不变

一个状态既读又写同一个 `Value`：

```ts
interface State<Value> {
  get: () => Value
  set: (value: Value) => void
}

declare let dogState: State<Dog>
declare let animalState: State<Animal>

// @ts-expect-error set 方向不安全
animalState = dogState

// @ts-expect-error get 方向不安全
dogState = animalState
```

`get` 要求协变，`set` 要求逆变，两个方向合在一起后都不能放宽，因此 `State<T>` 对 `T` 是不变的。

这也给 API 拆分提供了理由。调用方只读取时，不要交出完整可写 Store：

```ts
interface Reader<Value> {
  get: () => Value
}

interface Writer<Value> {
  set: (value: Value) => void
}

function inspectAnimals(source: Reader<Animal>): string {
  return source.get().name
}

inspectAnimals(dogState) // Reader 的输出位置允许协变
```

读写接口分开后，权限更小，替换关系也更灵活。

## 可变数组为什么有风险

直觉上 `Dog[]` 可以当作 `Animal[]` 读取，因为每只 Dog 都是 Animal。问题出在数组还允许写入：

```ts
const dogs: Dog[] = [new Dog('Mochi')]
const animals: Animal[] = dogs

animals.push(new Cat('Mimi'))

function demonstrateArrayHole(): void {
  // 编译器仍把这个元素视为 Dog，运行时却可能是 Cat
  dogs[1].bark()
}
```

TypeScript 允许这类赋值，与数组方法参数的宽松检查和整体兼容性取舍有关。这是类型系统刻意接受的不健全之处，开启 `strict` 也不会让它消失。

如果函数只读取数组，参数应声明为只读：

```ts
function namesOf(animals: readonly Animal[]): string[] {
  return animals.map(animal => animal.name)
}

const readonlyDogs: readonly Dog[] = [new Dog('Mochi')]
const readonlyAnimals: readonly Animal[] = readonlyDogs

namesOf(readonlyDogs)

// @ts-expect-error 只读视图不能写入 Cat
readonlyAnimals.push(new Cat('Mimi'))
```

`readonly Animal[]` 去掉了通过这个引用写入的能力，于是把只读 Dog 数组当作只读 Animal 数组是安全的。只读元组也遵循同样思路。

不过 `readonly` 是浅层且只约束当前引用。原始可变数组的其他持有者仍可修改它，数组里的对象属性也不会自动冻结：

```ts
const mutableDogs = [new Dog('Mochi')]
const view: readonly Animal[] = mutableDogs

mutableDogs.push(new Dog('Kuro')) // 合法，view 也会看到新元素
```

所以 `readonly` 表达的是 API 权限，不是运行时不可变快照。

## 可变对象也要考虑写入方向

下面这种盒子表面上只是一个属性，实际上既能读取又能写入：

```ts
interface Box<Value> {
  value: Value
}

const dogBox: Box<Dog> = { value: new Dog('Mochi') }
const animalBox: Box<Animal> = dogBox

animalBox.value = new Cat('Mimi')

function demonstrateBoxHole(): void {
  dogBox.value.bark()
}
```

TypeScript 仍允许这次赋值，这与可变数组类似，也是不完全健全的兼容性选择。仅把属性标为 `readonly` 能禁止通过该接口重新赋值，使“只产出 Value”的意图更清楚：

```ts
interface ReadonlyBox<Value> {
  readonly value: Value
}

const safeDogBox: ReadonlyBox<Dog> = { value: new Dog('Mochi') }
const safeAnimalBox: ReadonlyBox<Animal> = safeDogBox
```

设计泛型 API 时，不要只看类型参数写在哪个尖括号里，还要沿着所有成员确认它最终落在读取、写入还是方法参数位置。

## `in` 和 `out` 方差标注

TypeScript 通常会根据结构自动推断方差。对于复杂泛型，库作者也可以明确写出意图：

```ts
type Source<out Value> = {
  read: () => Value
}

type Sink<in Value> = {
  write: (value: Value) => void
}

interface MutableState<in out Value> {
  get: () => Value
  set: (value: Value) => void
}
```

- `out` 表示类型参数用于输出，期望协变。
- `in` 表示用于输入，期望逆变。
- `in out` 表示不变。

这些标注主要用于记录复杂类型的真实方差，并可能帮助极复杂递归类型的检查性能；它们不是把一个原本不安全的结构强行改造成协变或逆变的开关。官方文档明确建议不要给普通泛型到处加标注，也不要让标注与结构行为不一致。大多数业务代码让 TypeScript 自动推断即可。

## 一个贴近业务的例子：事件订阅

事件系统把载荷交给回调，回调是消费者：

```ts
interface BaseEvent {
  occurredAt: number
}

interface OrderCreatedEvent extends BaseEvent {
  orderId: string
}

type EventHandler<Event> = (event: Event) => void

function onOrderCreated(handler: EventHandler<OrderCreatedEvent>): void {
  handler({
    occurredAt: Date.now(),
    orderId: 'order-1',
  })
}

const auditEveryEvent: EventHandler<BaseEvent> = (event) => {
  console.log(event.occurredAt)
}

onOrderCreated(auditEveryEvent) // 安全：它能处理更宽的 BaseEvent

const requiresInternalField: EventHandler<
  OrderCreatedEvent & { internalTraceId: string }
> = event => console.log(event.internalTraceId)

// @ts-expect-error 发布方从未承诺 internalTraceId
onOrderCreated(requiresInternalField)
```

这正是逆变在实际项目里的作用：它阻止回调擅自要求发布方没有承诺的字段，同时允许只依赖基础字段的通用处理器复用。

如果把 `handler` 写成对象方法、用 `any` 擦掉载荷，或者在边界上随意断言，就可能绕开这层保护。外部消息仍应先经过运行时校验，类型安全只覆盖已经进入类型系统的数据。

## 常见追问

### 参数更少的函数为什么能赋给参数更多的回调

JavaScript 函数可以忽略多余实参，因此只使用 `value` 的回调可以传给会提供 `(value, index, array)` 的 `forEach`。这是函数参数数量兼容规则，不等于“参数类型是协变的”。

```ts
const logValue = (value: string): void => console.log(value)

Array.of('a', 'b').forEach(logValue)
```

反过来，把一个要求更多必填参数的函数放到只保证传一个参数的位置就不安全。

### 返回值为 `void` 为什么能接收有返回值的函数

在回调上下文中，`() => number` 可以赋给 `() => void`，意思是调用方承诺忽略返回值，不是函数真的不返回值。这是 TypeScript 为常见 JavaScript 回调提供的特殊兼容规则。

```ts
const values: number[] = []
const append: (value: number) => void = value => values.push(value)
```

`push()` 实际返回新长度，但 `append` 的调用方不能依赖这个返回值。

### `strictFunctionTypes` 是否让 TypeScript 完全健全

不会。方法双变、可变数组、可变属性和一些宿主 API 都保留了实用但不完全安全的规则。TypeScript 的目标是在 JavaScript 生态中提供有效保护，而不是构建形式化证明系统。理解这些边界，才能知道何时使用函数属性、`readonly`、`unknown` 和运行时校验补上缺口。

## 参考资料

- [TypeScript 2.6：Strict function types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html#strict-function-types)
- [TypeScript：Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [TypeScript：Generics - Variance Annotations](https://www.typescriptlang.org/docs/handbook/2/generics.html#variance-annotations)
- [TypeScript 3.4：readonly arrays and tuples](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#improvements-for-readonlyarray-and-readonly-tuples)
