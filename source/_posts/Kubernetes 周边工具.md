---
title: Kubernetes 周边工具
urlname: txw09z
date: '2020-10-16 00:00:00 +0000'
layout: post
comments: true
categories: Kubernetes
tags:
  - Kubernetes
keywords: Kubernetes
description: Kubernetes 周边工具。
abbrlink: afef0f89
updated: 2021-04-13 00:00:00
---

#### octant

一款 Kubernetes Dashboard：[github.com/vmware-tanzu/octant](https://github.com/vmware-tanzu/octant)。

#### Sonobuoy

Kubernetes e2e 测试框架，默认运行 Kubernetes 一致性测试，可以自定义插件对 Kubernetes 集群进行测试：[github.com/vmware-tanzu/sonobuoy](https://github.com/vmware-tanzu/sonobuoy)。

#### kubectl-aliases

常用的 kubectl 缩略别名：[github.com/ahmetb/kubectl-aliases](https://github.com/ahmetb/kubectl-aliases)。

#### velero

备份工具，可以备份集群资源至 S3，并通过磁盘快照等形式备份 PV ：[https://github.com/vmware-tanzu/velero](https://github.com/vmware-tanzu/velero)。

#### etcdkeeper

可通过 web 页面查看和修改 etcd 数据：[https://github.com/evildecay/etcdkeeper](https://github.com/evildecay/etcdkeeper)。

```
etcdkeeper -cacert /etc/kubernetes/ssl/ca.pem -cert /etc/kubernetes/ssl/etcd.pem -key /etc/kubernetes/ssl/etcd-key.pem
```

#### skopeo

可用于不同镜像格式的转换和推送：[https://github.com/containers/skopeo](https://github.com/containers/skopeo)。

#### pprof 文件转成火焰图

```bash
git clone https://github.com/brendangregg/FlameGraph.git
cd FlameGraph/
./stackcollapse-go.pl kubelet.pprof > kubelet.out
./flamegraph.pl kubelet.out > kubelet.svg
```

#### TUF

[https://github.com/theupdateframework/tuf](https://github.com/theupdateframework/tuf)
一款通用的用于提升软件包分发安全性的框架，Harbor 将其应用到了 OCI 制品的分发中。
