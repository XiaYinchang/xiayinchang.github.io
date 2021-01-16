---
title: Go 开发与调试工具与方法
urlname: sxpwav
date: '2020-12-16 00:00:00 +0800'
layout: post
comments: true
categories: Go
tags:
  - Go
keywords: 'Go, 开发, 调试'
description: Go 开发与调试辅助工具。
updated: 2021-01-09 00:00:00
---

#### staticcheck

可用于代码静态检查，发现未被使用的变量、类型和函数等，以及不规范的代码：[https://github.com/dominikh/go-tools](https://github.com/dominikh/go-tools)。

```
staticcheck --unused.whole-program=true -- ./...
```

#### 在 VSCode 中以 root 权限进行 debug

[Debug Golang in VS Code in Linux as root](https://fatdragon.me/blog/2020/06/debug-golang-vs-code-linux-root)

#### 查看编译二进制文件使用的 Go 版本

```bash
go version /usr/local/bin/kubelet
// 或者
strings /usr/local/bin/kubelet | grep 'go1\.'
```
