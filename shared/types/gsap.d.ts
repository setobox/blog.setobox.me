// Global types
export type GSAPDraggableVars = Draggable.Vars
export type GSAPAnimation = gsap.core.Animation
export type GSAPCallback = gsap.Callback
export type GSAPDelayedCall = ReturnType<GSAP['delayedCall']>
export type GSAPDistributeConfig = gsap.utils.DistributeConfig
export type GSAPPlugin = gsap.Plugin
export type GSAPPluginScope = gsap.PluginScope
export type GSAPPluginStatic = gsap.PluginStatic
export type GSAPStaggerVars = gsap.StaggerVars
export type GSAPTickerCallback = gsap.TickerCallback
export type GSAPTimeline = gsap.core.Timeline
export type GSAPTimelineVars = gsap.TimelineVars
export type GSAPTween = gsap.core.Tween
export type GSAPTweenTarget = gsap.TweenTarget
export type GSAPTweenVars = gsap.TweenVars

export type GSAP = typeof gsap
export type GSAPScrollTrigger = typeof import('gsap/ScrollTrigger')['ScrollTrigger']
export type GSAPSplitText = typeof import('gsap/SplitText')['SplitText']
export type GSAPSplitTextInstance = ReturnType<GSAPSplitText['create']>
