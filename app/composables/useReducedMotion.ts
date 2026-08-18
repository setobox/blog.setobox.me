/**
 * `prefers-reduced-motion: reduce` 的读取。
 *
 * ## 为什么不用 VueUse 的 `useReducedMotion()`
 *
 * docs/07 §5.1 建议用它。它返回一个响应式 ref，媒体查询变化时会更新 —— 而本项目
 * 需要的恰恰是**一次性快照**：分支决定的是「建不建时间轴、注不注册 ScrollTrigger」，
 * 那是组件挂载时做一次的结构性决策。给一个会变的 ref 去做结构性分支，等于要求
 * 每处消费方都想清楚「运行中途翻转怎么办」，而正确答案是「不支持中途翻转，重进
 * 页面即可」—— 系统级动效偏好不是会被反复拨动的开关。
 *
 * 用 `matchMedia().matches` 直接读，还省掉一层 VueUse 的响应式包装。
 *
 * ## 必须只在客户端调用
 *
 * SSR 阶段没有 `window`，也**没有办法知道**访客的动效偏好 —— 媒体查询不进 HTTP
 * 头。所以服务端一律返回 false（即「正常动效」），客户端在 onMounted 里再读真值。
 * 这不会造成 hydration mismatch：降级与否只影响 JS 建不建时间轴，不影响 SSR 输出的
 * DOM 结构。布局层面的降级由 CSS 的 `@media (prefers-reduced-motion: reduce)`
 * 独立承担，那条在服务端渲染的样式表里就已经生效，零闪动。
 */
export function prefersReducedMotion(): boolean {
  if (import.meta.server)
    return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
