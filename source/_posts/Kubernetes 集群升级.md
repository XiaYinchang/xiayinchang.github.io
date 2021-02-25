---
title: Kubernetes 集群升级
urlname: ni161b
date: '2020-09-06 00:00:00 +0800'
layout: post
comments: true
categories: Kubernetes
tags:
  - 集群升级
  - Kubernetes
keywords: 'Kubernetes, 升级'
description: Kubernetes 集群升级的方法探寻。
abbrlink: '67293294'
updated: 2020-09-06 00:00:00
---

### 基本问题

Kubernetes 小版本的升级要简单很多，一般只需要原地替换组件并重启组件即可，不会引发 Pod 重启，不会对业务造成影响，这是因为小版本更多的是维护性的 bug 修复，不会发生大的特性变更。相对的，大版本升级就会面临很多问题，尤其是 Pod 重启可能对业务造成的影响，另一个棘手的问题是资源对象所属资源组及版本的变更。目前查询资料获得的升级方案多是在解决第一个问题，第二个问题鲜有提及，本文也未有方案。

### 常见方案

#### 新旧节点替换

基本过程是：添加新节点 -> 驱逐旧节点上的 Pod -> Pod 在新节点上自动重建 -> 删除旧节点；但是这个过程只完成了对 Node 节点的替换，对于 Master 节点的处理如何进行类似处理还需仔细考虑。这个过程中还有几个细节问题需要考虑：① Pod 的优雅终止，自研组件可以通过捕获 SIGTERM 信号进行优雅退出，对于在线服务应首先停止监听进程，然后等待所有已建立的连接完成通信后退出，而对于 Nginx 等第三方产品可以在 PreStop Hook 中调用其自身提供的退出接口进行退出；② 启动退出服务之前的延时等待，由于 kubelet 删除 Pod 和 kubeproxy 移除相应的 endpoint 是并行的过程，所以很有可能出现 Pod 先停止监听而 endpoint 后移除的情况，会造成新的用户请求被转发到一个已经停止监听的后端 Pod 上从而被拒绝处理的错误发生，影响线上业务，所以需要在 PreStop Hook 中添加一定时间的 sleep ，一般是 5s ；③ 在 Pod 驱逐过程中保持一定的可用量，通过 PodDisruptionBudget 配置相应的策略从而保证在同时对多个节点上的所有 Pod 进行驱逐时能够保持给定标签的 Pod 维持在保证服务可用的水平，从而避免出现同一个服务的所有后端 Pod 同时不可用的情况。

### 参考资料

1. [Zero Downtime Server Updates For Your Kubernetes Cluster](https://blog.gruntwork.io/zero-downtime-server-updates-for-your-kubernetes-cluster-902009df5b33)
