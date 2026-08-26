---
title: 'CSS 面试题'
description: '梳理 CSS 的优先级、盒模型、格式化上下文、渲染成本、层叠上下文、现代布局与渐进增强。'
date: 2026-08-12
tags:
  - CSS
  - 浏览器渲染
  - Web 性能
  - 响应式设计
  - 面试
categories:
  - 面试题
  - CSS
---

CSS 的难点不在属性数量，而在几套规则会同时生效：选择器先匹配元素，层叠决定哪个声明获胜，格式化上下文计算几何位置，最后浏览器才会布局、绘制和合成。顺着这条链回答，很多看似零散的题都能连起来。

## 选择器优先级

选择器的 specificity 通常写成三列 `A-B-C`：

- `A`：ID 选择器数量。
- `B`：类、属性和伪类选择器数量。
- `C`：类型选择器和伪元素数量。

从左向右比较，先比较 A，再比较 B，最后比较 C。不是把它换算成十进制，也不存在“十个类一定抵一个 ID”。

```css
/* 0-1-1 */
.card h2 {}

/* 1-0-1 */
#app h2 {}

/* 0-2-1 */
button[data-state='open']:hover {}

/* 0-0-1 */
::selection {}
```

通配符 `*` 和组合符不增加优先级。内联 `style` 不属于选择器 specificity，教学时常写成额外的一列 `1-0-0-0`；在同一层叠来源的普通作者样式中，它通常高于样式表规则，但仍会受 `!important`、来源、动画和过渡等层叠规则影响。

### `:is()`、`:not()`、`:has()` 与 `:where()`

`:is()`、`:not()` 和 `:has()` 伪类本身不加一份伪类权重，它们取参数列表中最具体选择器的权重；`:where()` 的权重始终为 `0-0-0`。

```css
/* 1-0-1，因为参数中 #featured 最具体 */
article:is(.post, #featured) h2 {}

/* 0-1-1，:where(...) 不贡献权重 */
:where(#app, .page) .card {}
```

`:where()` 很适合写可覆盖的基础样式。原生嵌套也会影响优先级计算，不能只把最终文本机械拼起来猜；复杂规则应在开发者工具里查看实际匹配结果。

### 为什么“加一个更长的选择器”不是好修复

优先级战争通常来自职责不清。更可靠的处理顺序是：确认规则是否匹配、声明是否有效、所在层是否正确，再通过组件边界、低权重选择器和 `@layer` 管理覆盖关系。`!important` 适合明确的优先级契约，例如无障碍工具类或必须压过第三方普通样式的 override 层，不适合当作默认补丁。

## 盒模型

每个盒子从内到外由 content、padding、border、margin 组成。默认 `box-sizing: content-box` 下，声明的 `width` 与 `height` 只控制 content box：

```text
占用宽度 = margin-left + border-left + padding-left
         + width
         + padding-right + border-right + margin-right
```

`border-box` 则让 `width` 包含 content、padding 和 border，布局尺寸更容易推理：

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

不过 `border-box` 不包含 margin。元素真正能否收缩，还受最小尺寸、内容的最小固有宽度和布局上下文影响。例如 Flex 项目默认 `min-width: auto`，长文本可能把容器撑开，常见修复是对允许收缩的项目设置 `min-width: 0`，而不是盲目加 `overflow: hidden`。

### 外边距折叠

普通块级盒在块方向上的相邻 margin 可能折叠，最终距离不是简单相加。父元素与第一个或最后一个普通流子元素的 margin 也可能折叠。Flex、Grid 项目的 margin 不折叠；建立新的块级格式化上下文也能隔离一部分折叠关系。

`margin: 0 auto` 能让有可用剩余空间、且行内方向尺寸不是占满的块盒水平居中。它不是通用的垂直居中方案。

## BFC：块级格式化上下文

BFC 可以理解为一块独立组织普通流块盒、浮动和 margin 的布局区域。常见建立方式包括：

- 根元素。
- `float` 不是 `none`。
- `position: absolute` 或 `fixed`。
- `display: inline-block`、`flow-root`，以及 table cell 等特定内部显示类型。
- `overflow` 不是 `visible` 或 `clip`。
- 某些布局/绘制 containment，例如 `contain: layout`、`content` 或 `paint`。
- 多列容器。

Flex 和 Grid 会建立各自的格式化上下文。它们同样能隔离许多普通流行为，但面试时直接把“所有 flex/grid 元素都创建 BFC”当作精确定义并不合适。

BFC 常见效果有：

- 包含内部浮动，避免容器高度塌陷。
- BFC 的边界不会与同一 BFC 中的浮动盒重叠，可用于早期的图文两栏布局。
- 隔离部分垂直 margin 折叠。

现在若只是清除内部浮动，优先使用语义明确的 `display: flow-root`：

```css
.article {
  display: flow-root;
}
```

用 `overflow: hidden` 虽然常能得到相似布局结果，却会顺带裁剪溢出内容，可能截断阴影、焦点环或弹层。

## CSS 渲染原理

浏览器解析 HTML 和 CSS，得到 DOM 与 CSSOM；匹配样式后构建用于渲染的结构，计算几何信息，再绘制像素并把图层合成到屏幕。不同引擎的内部阶段和优化会变化，但从性能角度可以抓住三类成本：layout、paint、composite。

### 什么情况下会触发 reflow（回流）？

Layout 或 reflow 会重新计算元素尺寸和位置。常见原因包括：

- 插入、删除元素，或切换 `display` 导致布局树变化。
- 修改 `width`、`height`、padding、border、margin、定位偏移等几何属性。
- 字体、字号、行高、文本或图片固有尺寸变化，导致换行和内容尺寸改变。
- 视口或包含块尺寸变化。
- Flex/Grid 轨道、项目顺序或对齐方式变化。
- 写入样式后立即读取 `offsetWidth`、`getBoundingClientRect()` 等布局信息，浏览器为了返回最新值被迫同步刷新布局。

影响范围不一定是整页。浏览器会尽量标记局部脏区域，布局 containment 也能限制传播；具体范围由依赖关系和引擎实现决定。

下面的循环容易造成 layout thrashing：

```ts
for (const item of items) {
  item.style.width = `${container.clientWidth / 2}px`
}
```

每轮先写再读，可能反复强制布局。改为先批量读取、再批量写入：

```ts
const width = container.clientWidth / 2

for (const item of items)
  item.style.width = `${width}px`
```

### 什么情况下只触发 repaint（重绘）？

元素几何位置不变，只改变视觉外观时，通常无需重新布局，但需要重新绘制，例如：

- `color`、`background-color`、`border-color`。
- `outline`、`box-shadow`、`text-shadow`。
- `visibility`，它保留原有布局空间。

“只重绘”仍可能很贵。一个覆盖全屏的模糊阴影、复杂渐变或大面积固定背景，每帧重绘的成本可能高于小范围布局。应在性能面板中看实际 Paint 记录，不能只按属性名估算。

### 什么情况下可能只需 composite（合成）？

`transform` 和 `opacity` 不改变普通流几何，动画时常可由合成线程复用已经绘制的纹理。`filter` 也可能被合成器处理，但成本和支持方式更依赖效果与引擎。

这不代表设置了 `transform` 就必然得到独立图层，也不代表完全没有初始绘制。图层提升是浏览器实现策略。`will-change` 只能作为即将变化的提示，长期给大量元素设置会占用纹理内存，反而降低性能。

```css
.drawer {
  transform: translateX(-100%);
  transition: transform 200ms ease;
}

.drawer[data-open='true'] {
  transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  .drawer {
    transition: none;
  }
}
```

## 层叠机制

“优先级高就赢”只说了层叠的一小步。规范会依次考虑规则是否相关、来源与重要性、封装上下文、层、specificity、作用域接近程度和出现顺序。

在最常见的作者样式内部，可以先记住：

1. 比较普通声明与 `!important` 声明。
2. 比较 cascade layer。
3. 同层再比较 specificity。
4. 若还相同，作用域距离和源码顺序参与决定，后出现的通常获胜。

对普通声明，未放入显式层的样式高于已命名层；命名层中越晚声明的层越高。对 `!important`，层顺序会反转，越早的层越高，这样底层设计约束能抵御后续覆盖。

```css
@layer reset, base, components, utilities;

@layer base {
  :where(button) {
    font: inherit;
  }
}

@layer components {
  .button {
    color: white;
    background: rebeccapurple;
  }
}

@layer utilities {
  .text-black {
    color: black;
  }
}
```

CSS Transition 产生的值在层叠中有非常高的优先顺序，甚至可暂时覆盖重要声明；动画声明也有自己的层叠位置。因此开发者工具里看到 `!important` 没生效时，还要检查元素是否正在过渡。

### 继承与关键字

层叠先为元素选出声明，再计算继承和值。文本相关属性多会继承，盒模型属性通常不会。几个常用关键字：

- `inherit`：强制取父元素的计算值。
- `initial`：使用属性在规范中的初始值，不等于浏览器默认样式。
- `unset`：可继承属性表现为 `inherit`，否则表现为 `initial`。
- `revert`：回退到更早的来源。
- `revert-layer`：回退当前层，让较低层参与决定。

## 层叠上下文与 `z-index`

层叠上下文是一组独立参与堆叠的元素。子元素无论把 `z-index` 写得多大，都不能直接越过祖先所在层叠上下文的兄弟。

常见创建条件包括：

- 根元素。
- 定位元素的 `z-index` 不是 `auto`。
- `position: fixed` 或 `sticky`。
- Flex/Grid 项目的 `z-index` 不是 `auto`。
- `opacity` 小于 `1`。
- 非 `none` 的 `transform`、`filter`、`perspective`、`clip-path`、mask 等。
- `isolation: isolate`、非 `normal` 的 `mix-blend-mode`。
- 某些 `contain` 与 `will-change` 配置。

遇到“弹窗写了 `z-index: 999999` 仍被挡住”，沿祖先向上找层叠上下文，比继续加数字有效。真正跨组件的浮层通常放进顶层 portal/teleport 容器；原生 `<dialog>` 打开为 modal 时会进入 top layer，不再按普通文档层叠解决。

## Flex、Grid 与常见布局

Flex 是一维布局：重点处理一条主轴上的分配、收缩与对齐。Grid 是二维布局：同时定义行列与区域。两者可以嵌套，不需要二选一。

### Flex 常见追问

`flex: 1` 在常用语法中会让项目共同分配剩余空间，但它不等于单独设置 `flex-grow: 1`；展开值还涉及 `flex-shrink` 与 `flex-basis`。项目内容不肯收缩时先检查自动最小尺寸：

```css
.layout {
  display: flex;
}

.main {
  flex: 1 1 0;
  min-width: 0;
}
```

主轴由 `flex-direction` 决定，所以 `justify-content` 不总是“水平对齐”，`align-items` 也不总是“垂直对齐”。

### Grid 自适应卡片

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 1rem;
}
```

`auto-fit` 会折叠空轨道，让现有项目扩展；`auto-fill` 会保留可容纳的空轨道。`minmax(0, 1fr)` 常用于允许轨道小于内容的最小固有宽度。

### 居中的选择

- 单个已知容器内居中：Grid 的 `place-items: center`。
- 一行内容的两轴对齐：Flex。
- 文本行内居中：`text-align: center`，它作用于行内内容而不是随意移动块盒。
- 绝对定位浮层：`inset: 50% auto auto 50%` 配合 `translate(-50%, -50%)`，但普通页面布局优先使用 Flex/Grid。

## 响应式设计

响应式不是维护几套固定设备宽度，而是让组件在可用空间、内容增长和用户偏好变化时仍能工作。

### 视口查询与容器查询

媒体查询适合页面级变化：

```css
.page {
  padding-inline: clamp(1rem, 4vw, 4rem);
}

@media (width >= 64rem) {
  .page {
    grid-template-columns: 16rem minmax(0, 1fr);
  }
}
```

容器查询适合可复用组件根据所在容器变化：

```css
.card-list {
  container: cards / inline-size;
}

.card {
  display: grid;
  gap: 0.75rem;
}

@container cards (width >= 32rem) {
  .card {
    grid-template-columns: 10rem minmax(0, 1fr);
  }
}
```

还应考虑：

- 使用逻辑属性 `margin-inline`、`padding-block`、`inset-inline-start`，适配不同书写方向。
- 图片设置合理的 `width`/`height` 或 `aspect-ratio`，减少布局偏移。
- 文本允许放大，避免固定高度截断内容。
- 尊重 `prefers-reduced-motion`、`prefers-contrast` 等用户偏好。
- 断点由内容何时失效决定，不必追逐具体设备型号。

## CSS 新特性

“进入规范草案”“某个浏览器实现”和“目标用户都可用”是三件事。上线前应按项目支持矩阵检查兼容性，并用渐进增强提供基础体验。下面按解决的问题归类，不把所有功能都宣称为全平台稳定。

### 已适合纳入现代工程评估的能力

- Container Queries：组件按容器尺寸响应，减少对全局视口断点的依赖。
- Cascade Layers：显式管理 reset、组件、工具类和第三方样式的覆盖顺序。
- 原生 CSS Nesting：减少重复父选择器；语法和 Sass 并不完全相同，迁移要实际编译检查。
- `:has()`：根据后代或后续关系选择当前元素，可处理表单状态、卡片内容等过去需要脚本的场景。
- Subgrid：子网格沿用父网格轨道，适合多卡片内容对齐。
- 逻辑属性、`min()`、`max()`、`clamp()` 与 `aspect-ratio`：用内容和书写模式驱动尺寸。
- `@property`：为自定义属性声明类型、初始值和继承行为，使部分自定义属性可以可靠插值动画。

```css
@property --progress {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}

.meter {
  background: linear-gradient(
    to right,
    royalblue var(--progress),
    lightgray 0
  );
  transition: --progress 300ms ease;
}
```

### 需要按目标浏览器谨慎启用的能力

- `@scope`：给一段 DOM 指定样式上、下边界，并把 scope proximity 纳入层叠；规范仍在演进时应避免依赖边缘语义。
- View Transitions：对同文档或跨文档导航做视觉过渡；必须保留无动画时完整可用的页面。
- Scroll-driven Animations：让动画时间线由滚动进度驱动，适合视差和阅读进度，但要照顾减少动态效果偏好。
- Anchor Positioning：让浮层相对锚点定位，可减少手写测量逻辑；浮层的碰撞回退、top layer 和支持范围仍需按项目验证。
- 更深入的 style/scroll-state container queries：能力与语法持续扩展，不能仅凭“支持 `@container`”推断全部子特性可用。

功能检测示例：

```css
.field-help {
  display: none;
}

@supports selector(.field:has(:invalid)) {
  .field:has(:invalid) .field-help {
    display: block;
  }
}
```

`@supports` 只能说明浏览器接受某段语法，不保证实现没有缺陷，也不替代无障碍和真实设备测试。

## 常见追问

### `display: none`、`visibility: hidden`、`opacity: 0` 有何区别？

- `display: none`：不生成用于布局的盒，通常也不在可访问性树中。
- `visibility: hidden`：保留布局空间，不绘制元素，后代可通过 `visibility: visible` 特殊处理。
- `opacity: 0`：盒仍布局、通常仍可命中和聚焦，只是透明；若要禁用交互还需单独处理，但不要因此破坏键盘和辅助技术语义。

### 伪类和伪元素有什么区别？

伪类选择元素的状态或关系，如 `:hover`、`:focus-visible`、`:has()`；伪元素选择不存在于普通 DOM 元素列表中的渲染部分，如 `::before`、`::marker`。现代语法用双冒号表示伪元素，部分早期伪元素仍兼容单冒号。

### 为什么 `height: 100%` 有时无效？

百分比高度需要能解析的包含块尺寸。若父级块方向尺寸仍由内容决定，子元素的 `100%` 可能没有可用的确定高度。可以给包含块建立明确尺寸，或在适合的布局中使用 Flex/Grid 的拉伸能力；不要沿祖先链机械写满 `height: 100%`。

### `position: sticky` 为什么不生效？

先检查是否设置了 `top` 等 inset、滚动容器是谁、祖先是否产生了不同的滚动机制、容器是否有足够滚动距离，以及 sticky 元素是否与容器一样高。它相对最近的滚动容器和包含块约束，不一定相对视口。

### 如何排查一条 CSS 没生效？

按顺序检查：选择器是否匹配；属性和值是否有效；声明是否被层叠覆盖；元素是否处于预期格式化与层叠上下文；尺寸是否受 min/max 或固有尺寸限制；最后再看浏览器兼容和引擎问题。开发者工具的 Computed、Layout、Layers 和 Performance 面板比猜测快得多。

## 参考资料

- [Selectors Level 4](https://www.w3.org/TR/selectors-4/)
- [CSS Cascading and Inheritance Level 5](https://www.w3.org/TR/css-cascade-5/)
- [CSS Cascading and Inheritance Level 6（Working Draft）](https://www.w3.org/TR/css-cascade-6/)
- [CSS 2.2：Visual formatting model](https://www.w3.org/TR/CSS22/visuren.html)
- [CSS Flexible Box Layout Module Level 1](https://www.w3.org/TR/css-flexbox-1/)
- [CSS Grid Layout Module Level 2](https://www.w3.org/TR/css-grid-2/)
- [CSS Containment Module Level 3](https://drafts.csswg.org/css-contain-3/)
- [CSS Nesting Module Level 1](https://drafts.csswg.org/css-nesting/)
- [CSS View Transitions Module Level 1](https://drafts.csswg.org/css-view-transitions-1/)
- [CSS Anchor Positioning](https://drafts.csswg.org/css-anchor-position-1/)
