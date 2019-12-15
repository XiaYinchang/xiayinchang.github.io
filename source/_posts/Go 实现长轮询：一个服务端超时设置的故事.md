---
title: Go 实现长轮询：一个服务端超时设置的故事
urlname: mel61p
date: '2019-12-08 00:00:00 +0800'
updated: 2019-12-8
layout: post
comments: true
categories: 译文
tags:
  - Go
  - 译文
keywords: 'Go, 长轮询, timeout'
description: >-
  前端获取实时更新的后端数据主要有短轮询、长轮询、WebSocket、SSE等几种方式，对于新开发的应用使用 WebSocket
  是更好的选择，而如果是需要对已有的 HTTP/1.1 API 添加实时获取数据的特性，使用长轮询则相对简单一些。本文即是作者在使用长轮询改造已有 API
  时关于服务端超时时间设置的讨论。
abbrlink: '46e95013'
---


<a name="2PGKt"></a>
### 原文
[Golang long-polling: a tale of server timeouts](https://lucasroesler.com/2018/07/golang-long-polling-a-tale-of-server-timeouts/)

我最近花了一周时间来实现 HTTP 长轮询。和软件开发中经常发生的一样，经过漫长的 debug 过程，我最终的修复方案涉及到的代码只有一行。

在现代 Web 应用开发中实时更新正变得很常见。正好，我最近就在我的一个服务上实现了长轮询。Web 应用获取实时更新有以下几种方式：

1. 短轮询：Web 应用按照指定的时间间隔不断的发出请求，比如每秒一次。
1. 长轮询：Web 应用重复地进行 HTTP 请求，但是每个请求的存活时间比较长。只有服务端有更新或者请求超时，该请求才会被响应，随后 Web 应用立即发起一个新的请求。
1. HTTP 流：Web 应用发起一个持久的 HTTP 请求，且请求不会被关闭。一旦服务端有更新就会立即发送部分响应，可以使用类似 ndjson 的形式。
1. WebSocket：同样地 Web 应用发起一个持久的允许双向通信的请求。

有很多原因告诫我们永远不要用第一种方式，而是选择 2-4 中的某一种。在我们的使用场景中，我们想要给已经存在的 REST API 添加只读的获取实时更新的特性，所以长轮询看起来是一种非常自然和简单的实现方式。<br />不幸的是，基本上没有关于长轮询的标准或规范。这意味着一切只能自己动手。我们设计了如下的请求序列：<br />![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575783155078-b299a29e-2114-4667-ad30-947580207315.png#align=left&display=inline&height=526&name=image.png&originHeight=526&originWidth=579&size=95727&status=done&style=none&width=579)<br />注意请求超时时我们返回 304（未改变） 状态码而不是 504（服务端超时）。我们使用了请求头 prefer 来发送轮询参数。<br />下面是一个实现了上述轮询序列的简单例子（只是使用了 URL 传递查询参数）：
```go
package main

import (
	"context"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"net/http/httptest"
	"time"
)

func getLongPollDuration(r *http.Request) time.Duration {
	timeout, err := time.ParseDuration(r.URL.Query().Get("wait"))
	if err != nil {
		return 15 * time.Second
	}

	log.Printf("found custom timeout: %s", timeout)
	return timeout
}

func getResource(ctx context.Context) string {
	return "{\"id\": 1, \"updatedAt\": \"" + time.Now().Format(time.RFC3339) + "\"}"
}

func waitForResource(ctx context.Context, wait time.Duration) string {

	// randomly wait up to 15 seconds for a "resource changed event"
	r := rand.Intn(15)
	ticker := time.Tick(time.Duration(r) * time.Second)
	waiter := time.Tick(wait)

	log.Printf("will wait up to %s for the resource", wait)

	select {
	case <-ctx.Done():
		log.Printf("Received context cancel")
		return ""
	case ts := <-waiter:
		log.Printf("Received method timeout: %s", ts)
		return ""
	case ts := <-ticker:
		log.Printf("Received resource update at: %s", ts)
		return "{\"id\": 1, \"updatedAt\": \"" + ts.Format(time.RFC3339) + "\"}"
	}
}

func resourceFunc(w http.ResponseWriter, r *http.Request) {
	index := r.URL.Query().Get("index")

	if index != "" {
		timeout := getLongPollDuration(r)
		response := waitForResource(r.Context(), timeout)
		if response == "" {
			// write long poll timeout
			w.WriteHeader(http.StatusNotModified)
		}
		fmt.Fprintf(w, response)
		return

	}

	response := getResource(r.Context())
	fmt.Fprintf(w, response)
}

func main() {
	ts := httptest.NewServer(http.HandlerFunc(resourceFunc))
	defer ts.Close()

	// you should always set these timeouts, otherwise requests
	// can never timeout
	ts.Config.ReadTimeout = 10 * time.Second
	ts.Config.WriteTimeout = 10 * time.Second

	res, err := http.Get(ts.URL + "?index=2&wait=15s")
	if err != nil {
		log.Fatal(err)
	}
	resourceResp, err := ioutil.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%s\n", res.Status)
	fmt.Printf("%s", resourceResp)
}
```
当使用 Nginx 作为代理暴露这个服务时，问题由于下面一行代码变得麻烦起来：
```go
ts.Config.WriteTimeout = 10 * time.Second
```
在我们最初的 API 的实现中，我们将服务端超时时间设置为了 10 秒，但是在我实现长轮询的时候我把超时时间设置为了 15 秒。这导致了 Nginx 偶发性地返回 502 错误。Nginx 会报出如下错误：
```
upstream prematurely closed connection while reading response header from upstream
```
最终发现，这个错误消息是准确的并且指向了确切的问题（go 由于超时时间到达关闭了请求，但是我的处理函数仍然在请求关闭后尝试去写入内容），但是在网上搜索的结果并没有提供太多帮助。最后，我断断续续花了一周时间跟踪调试直到确定是配置问题。WriteTimeout 最短也需要设置为与允许的长轮询等待时间一样长，在我们的场景中是 60 秒。<br />但愿其他陷入同样 Nginx 错误的人能够先再次检查他们的服务端超时时间设置。另外，可以查阅[这篇文章](https://blog.cloudflare.com/the-complete-guide-to-golang-net-http-timeouts/)关于 go 中各种服务端超时的详情。

