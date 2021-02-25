---
title: context 相关知识与用法
urlname: stmiiz
date: '2021-01-10 00:00:00 +0800'
layout: post
comments: true
categories: go
tags:
  - go
  - context
keywords: context
description: context 相关的知识和用法。
abbrlink: b246b51
updated: 2021-01-10 00:00:00
---

#### 父子 context cancel 的传递

以下测试可以简单验证父 context cancel 会传递到子 context，子 context cancel 不会影响父 context。

```go
package main

import (
	"fmt"
	"context"
	"time"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	newCtx, cancel1 := context.WithCancel(ctx)
	go func(){
		<-ctx.Done()
		fmt.Printf("parent cancelled %s\n", time.Now())
	}()
	go func(){
		<-newCtx.Done()
		fmt.Printf("child cancelled %s\n", time.Now())
	}()
	time.Sleep(1*time.Second)
    // cancel()
	cancel1()
	time.Sleep(10*time.Second)
    // cancel1()
	cancel()
	time.Sleep(10*time.Second)
}
```
