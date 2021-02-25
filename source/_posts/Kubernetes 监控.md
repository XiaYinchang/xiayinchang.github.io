---
title: Kubernetes 监控
urlname: odgclg
date: '2020-07-26 00:00:00 +0000'
layout: post
comments: true
categories: Kubernetes
tags:
  - 监控
  - Kubernetes
keywords: 'Kubernetes, Prometheus'
description: Kubernetes 监控方法、工具与原理。
abbrlink: b0106d49
updated: 2020-08-30 00:00:00
---

Prometheus 是 Kubernetes 监控体系中的一等公民，也是云原生场景中监控体系的事实标准。Prometheus、Grafana、AlertManager 是云原生监控告警体系的标准配置。对于大规模分布式多集群系统的监控，Thanos 是一个强有力的补充。

### Kubernetes 中监控数据的来源

Kubernetes 中的监控数据，可分为以下几个部分：

#### cAdvisor

cAdvisor 提供容器层级的监控数据，包括容器的内存和 CPU 使用量等。cAdvisor 本身是一个可以独立使用的工具，在 Kubernetes 中 cAdvisor 已经被集成在 Kubelet 的代码中。cAdvisor 的基本原理是监测 cgroup (/sys/fs/cgroup/cpu) 目录下文件和目录的变化，为对应的容器增加 handler 去定期读取容器对应的 cgroup 统计信息；还有一些数据如网络收发字节数是从 `/proc/PID/net/dev` 中定期读取，参考：[https://www.cnblogs.com/elnino/p/10346439.html](https://www.cnblogs.com/elnino/p/10346439.html)。

#### Kubernetes Metrics Server

Metrics Server 汇集从 kubelet(cAdvisor) 收集到的容器信息，用于支持 Kubernetes 内部自动伸缩器和调度器的工作，并不建议作为外部监控体系的数据采集入口。Metrics Server 仅将数据临时保留于内存中，通过 kube-apiserver 将其作为标准的 Kubernetes 资源对象暴露出去，资源组为 `metrics.k8s.io`，用户可通过 kube-apiserver 访问 `/apis/metrics.k8s.io/v1beta1/nodes` 路径获取统计数据。

#### Node Exporter

Node Exporter 是 Prometheus 社区提供的主要用于 Linux 平台获取节点监控信息的工具，其主要工作是提取节点上硬件和系统内核提供的各种统计信息，并以 Prometheus 标准数据格式暴露出来。

#### Kube-State-Metrics

kube-state-metrics 是 Kubernetes 社区提供的对 Kubernetes 原生资源对象的状态信息进行统计的组件，通过它暴露的信息可以获知指定 Pod 的 CPU Request/Limit 值，可以获知 Pod 是处于 Running 或者 Failed 状态，获知 Deployment 预期副本数和当前实际副本数等，这些信息同样以 Prometheus 标准数据格式提供，方便与监控系统对接。

#### Kubernetes 控制组件

Kubernetes 控制组件的控制组件 API Server, Scheduler, Controller, and Etcd 都提供了组件本身的监控信息。

#### 用户应用

用户应用往往也会暴露一些统计信息，尤其是提供 Web 服务的 HTTP Server 端，经常借助于 Prometheus 成熟的 SDK 暴露 RED (Request Rate, Error Rate, and Duration) 数据和程序的堆栈用量。

### 监控信息的分类

获取监控数据之后，可对数据按照分门别类地进行汇总和展示，便于运维人员观测系统性能和排故。Kubernetes 的监控数据可按照集群、节点、Pod（容器）、控制组件和应用进行划分。
集群信息包括集群整体的资源总量和使用量，如节点数量、容器数量，异常容器数量，命名空间数量，总的 CPU 核数和已用核数，总的内存大小和已用内存，集群网络吞吐等；节点信息包括每个节点的资源总量和用量，容器数量，网络和磁盘 IO 等；Pod 和容器的 CPU 及内存用量；控制组件的健康状态和 HTTP 及 GRPC 调用次数和成功率；应用内部的业务生成的统计信息。

### Prometheus

#### yaml 部署

[https://github.com/prometheus-operator/kube-prometheus](https://github.com/prometheus-operator/kube-prometheus)

#### helm chart 部署

prometheus stack 部署以及一些 exporter：[https://github.com/prometheus-community/helm-charts/tree/main/charts](https://github.com/prometheus-community/helm-charts/tree/main/charts)

#### blackbox_exporter

blackbox_exporter 是社区提供的黑盒监测机制，默认监听端口 9115，允许通过 HTTP 、 HTTPS 、DNS 、TCP 和 ICMP 探测端点。在 exporter 中，可以定义一系列执行特定检查的模块，例：检查正在运行的 web 服务器，或者 DNS 解析记录。黑盒监控主要用于探活，因为很多应用并没有提供内部 metrics 接口，无法获取应用内部更多的信息，应用对于我们来说是一个黑盒，只能利用存在已久的协议简单探测应用的存活状态。类似于 MySQL exporter 的采集模块则可以将 MySQL 内部本身提供的 metrics 信息导出成 Prometheus 支持的标准格式。实际上 exporter 多是为了将一些 Prometheus 出现之前的应用暴露的形式各异的监控信息导出为 Prometheus 标准格式。而在 Prometheus 广泛流行之后开发的应用，导出的监控信息基本都遵循 Prometheus 标准格式，不再需要 exporter 中转。

#### relabel

```
# 替换 address 端口
- source_labels:
  - __address__
  separator:     ':'
  regex:         '(.*):(.*)'
  target_label:  '__address__'
  replacement:   '${1}:10249'
```

#### 重新加载配置

启动时添加  --web.enable-lifecycle 参数，重新加载配置使用 `curl -X POST http://localhost:9090/-/reload` 。

#### 校验配置的有效性

从 [Prometheus 仓库](https://github.com/prometheus/prometheus/releases)下载的可执行文件包含了 promtool 工具用于校验配置和 rule 的有效性。

```bash
cat >prometheus.yml <<'EOF'
scrape_configs:
- job_name: prometehus
static_configs:
  - targets: ['localhost:9090']
EOF

./promtool check config prometheus.yml
Checking prometheus.yml
  FAILED: parsing YAML file prometheus.yml: yaml: unmarshal errors:
  line 3: field static_configs not found in type config.plain
```

### 参考资料

1. [A Deep Dive into Kubernetes Metrics](https://blog.freshtracks.io/a-deep-dive-into-kubernetes-metrics-b190cc97f0f6)
