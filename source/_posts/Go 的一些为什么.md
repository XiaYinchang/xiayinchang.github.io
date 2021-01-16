---
title: Go 的一些为什么
urlname: aqgwbs
date: '2020-12-24 00:00:00 +0800'
layout: post
comments: true
categories: Go
tags:
  - Go
keywords: Go
description: Go 为什么这样设计和使用的一些问题。
updated: 2020-12-24 00:00:00
---

#### 调度器为什么引入 P

将原先与 M 相绑定的资源（比如 mcache）转移给 P，减少内存浪费；将全局状态（如 grunnable 队列）分解给 P，减少锁的争用，提高调度效率。参考：[goroutine 调度过程中 P 到底扮演什么角色？](https://www.zhihu.com/question/63906375/answer/496840262)
