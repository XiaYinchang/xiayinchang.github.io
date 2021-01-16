---
title: Go Rate Limit
urlname: rgxo5h
date: '2020-09-18 00:00:00 +0800'
layout: post
comments: true
categories: Go
tags:
  - Go
keywords: 'Go, RateLimit'
description: Go 中常用的 RateLimit 工具。
updated: 2020-09-18 00:00:00
---

#### 限流算法

在各种限流工具包中，最为常见的是令牌桶算法。除此外，还有漏桶算法等。
令牌桶算法的初始化参数一般包括桶大小和令牌投放速率，桶大小为零则意味着不允许突发流量。

#### golang.org/x/time/rate

实现令牌桶算法，主要提供了 Allow, Reserve, and Wait 三个方法，它们的区别在于没有令牌可用后的行为：Allow 返回一个布尔值 false，Reserve 预定一个令牌并返回需要等待的时间，Wait 会一直阻塞到获取令牌。参见：[https://pkg.go.dev/golang.org/x/time/rate#NewLimiter](https://pkg.go.dev/golang.org/x/time/rate#NewLimiter)。

#### github.com/juju/ratelimit

同样实现令牌桶算法，不同的是提供了 TakeAvailable 方法，可以尝试取出指定数量的令牌，实际取出的令牌数可能少于期望数量，根据实际数量执行下一步操作，另外提供了针对 Reader 和 Writer 的封装。参见：[https://github.com/juju/ratelimit](https://github.com/juju/ratelimit)。

#### 其它实现

[https://github.com/andrewstuart/limio](https://github.com/andrewstuart/limio)
