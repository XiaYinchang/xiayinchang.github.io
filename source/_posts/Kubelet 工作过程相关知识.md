---
title: Kubelet 工作过程简析
urlname: gnxyg4
date: '2020-12-19 00:00:00 +0800'
layout: post
comments: true
categories: Kubernetes
tags:
  - Kubernetes
keywords: 'Kubernetes, Kubelet'
description: Kubelet 工作过程相关知识点的记录。
abbrlink: aad9c438
updated: 2020-12-19 00:00:00
---

#### syncLoop 处理哪些工作

watch apiserver 得到的 Pod 配置更新的事件；来自于 PLEG 产生的 Pod 状态变更事件，因为 Runtime 并没有提供事件通知的接口，所有现在 PLEG 采用定时轮询（默认 1s）的方式获取 Pod 状态并通过与上一次记录的状态比较计算变化产生事件，如果超过 3 分钟没有轮询成功的记录，则会认为 Runtime 出错，进而触发 Node NotReady；来自于 livenessManager 的事件，对于设置了 liveness 探针的 Pod，如果探针监测失败，则应处理相应事件；默认每两秒种执行一次的清理工作；默认每秒中执行一次 Pod sync 检查，检查队列中是否有需要执行 syncPod 操作的 Pod。除此外，还有一些如 evictionManager （默认 10 秒检测一次） 不通过 syncLoop 自行处理相关事件的控制循环。

#### 删除 Pod 过程

参考：[https://blog.csdn.net/nangonghen/article/details/109305635](https://blog.csdn.net/nangonghen/article/details/109305635)
