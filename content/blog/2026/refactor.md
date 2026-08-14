---
title: '使用 Nuxt Content 重构网站'
description: '旧网站已成过去，现在我将重铸荣光，Made the blog grand again.'
date: 2026-07-21
updated: 2026-08-04
tags:
  - Nuxt
  - Cloudflare
categories:
  - Blog
---

## 前言

旧网站是基于 Hexo + GitHub Pages 搭建的，虽然可以满足基本的博客需求，但技术栈太久没有更新，还停留在 Node 12 时期，维护需要考虑很多依赖的更新。正巧很久以前就看到了 Nuxt Content，早就想试试看了，那么咱就开始吧。

## MVP(Minimum Viable Product)

做项目第一步自然少不了 MVP，最小可行产品。对于博客来说，最小可行产品就是能写文章、能展示文章，并且有基本的页面布局。

### 技术选型

选用 Nuxt + Nuxt Content 的原因，主要有以下几点：

1. 普遍的 Markdown 语法支持自然不必多说，除了最基础的渲染、代码高亮外，Nuxt Content 还支持自定义组件，能在 Markdown 中直接使用 Vue 组件，极大地扩展了 Markdown 的能力。
2. Visual Editor，官方提供了简单易用的可视化编辑器，能在浏览器中直接编辑 Markdown 文件，哦我的天呐这将省不少事。

### RoadMap

- [x] 项目初始化
- [ ] 首页
  - [ ] 沉浸式体验
- [x] 博客
  - [x] 列表页
  - [x] 详情页
- [x] 旧文章迁移
- [x] 部署上线

Next Step:

- [ ] 博客
  - [ ] 分类页
  - [ ] 标签页
  - [ ] 归档页
  - [x] 网站导航
  - [x] Use
- [ ] 其他
  - [x] 评论系统
  - [ ] 音乐

## 搭建详情

### 项目初始化

这里我使用了 `vitesee-nuxt` 模板来初始化项目，主要是因为它集成了 Vite、Nuxt、TailwindCSS、UnoCSS 等常用工具，省去了很多配置的麻烦。

### 首页

这部分打算使用 Gsap + Three.js 来实现沉浸式体验，Awwwards 上有很多优秀的案例。

### 博客

最基础的便是列表 + 详情页，列表页使用 Nuxt Content 提供的 [`queryCollection`](https://content.nuxt.com/docs/utils/query-collection) 方法来获取文章列表和内容。
然后便是常见的分类页、标签页和归档页，使用 [`query-collection-item-surroundings`](https://content.nuxt.com/docs/utils/query-collection-item-surroundings) 方法可以

### 文章迁移

翻了下之前的博客，原本也没多少文章，所以迁移起来也不算麻烦。旧博客的文章是以 Markdown 格式存储在 GitHub 仓库中的，迁移到 Nuxt Content 也很简单，只需要把 Markdown 文件放到 `content` 目录下即可。

### 部署上线

这次考虑直接部署到 Cloudflare Pages 上，财大气粗的 Cloudflare 免费额度足够使用了。
之前试过 Vercel、Netlify，在大陆会出现访问不了、速度慢等问题，固然作罢。

根据 Nuxt Content 官方文档，我们需要在 Cloudflare Pages 上，配置好构建命令和输出目录，确保内容能够正确生成和部署。
需注意 v4 版本的 Nuxt Content 需要配置 db，这里直接按文档推荐配置好预设：

```ts
export default defineNuxtConfig({
  content: {
    database: {
      type: 'd1',
      bindingName: 'foobar'
    }
  }
})
```

OK，这样部署上线就完成了。

## 评论

之前用过 [Valine](https://valine.js.org/)、[Twikoo](https://twikoo.js.org/) ，都是非常简单就能上手。但考虑到经过一番调研，最终选择了 [Giscus](https://giscus.app/zh-CN) 作为评论系统，把每篇文章的评论映射到 GitHub Discussions，评论数据、账号体系、权限、通知和审核都由 GitHub 承担，不需要维护额外后台，且天然能过滤一些广告。

搭建步骤参考文章 [《用 Github 管理你的评论区》](/blog/2026/giscus/)，我在这里就不赘述了。
