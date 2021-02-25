---
title: Thanos基本功能总结
urlname: dfwamg
date: '2018-07-02 00:04:56 +0800'
layout: post
comments: true
categories: 云计算
tags:
  - 云计算
  - Thanos
  - Prometheus
keywords: 'Thanos,Prometheus'
description: Thanos基本功能总结。
abbrlink: 1f42eec9
---

|    Date    |                                         Log                                          |
| :--------: | :----------------------------------------------------------------------------------: |
| 01/07/2018 | 初始版本：根据杭州 Service Mesh 线下 Meet Up 中唐老师相关讲解内容和官方文档简单总结. |

Prometheus 和 Grafana 作为监控界的仙侣组合为我们进行系统运行状况的监控提供了极大的便利，简单说，Prometheus 对数据进行采集，Grafana 对对数据进行图表形式的展示。当然它们也提供了更多高级功能。

在规模不大且结构简单的系统中，Prometheus 的基本功能已经可以完全满足用户需求。但在一些复杂场景下 Prometheus 的应用会面临一些问题，Prometheus 本身应对这些问题略显吃力。而 Thanos 正是 Improbable-eng 团队为解决这些问题而开发的一款开源中间层框架，它对 Grafana 提供与 Prometheus 一致的数据源接口，同时可以无缝地部署到现有的 Prometheus 环境中，不需要对 Prometheus 做任何定制。

### Prometheus 面临的问题

1. 全局视图

当 Prometheus 用于监控多个 Kubernetes 集群时，它并没有提供一种较好的全局统一的数据采集方式。举个例子，需要实现当有 60%的集群处于掉线状态时监控系统进行报警，通过 Prometheus 该如何实现？如何将来自不同集群的数据进行聚合？ 2. 高可用

Prometheus 如何方便的实现高可用？较为简单的方案是在同一个 server 上启动两个 Prometheus 实例，通过简单的反向代理实现高可。但问题是两个 Prometheus 实例的数据信息出现不一致时该如何处理，例如一段时间内其中一个实例的数据为空，另一个实例的数据可用，则在前端的不同查询可能会对同一时间段的信息展示出现完全不同的效果，影响监控人员的使用。因此需要进行数据合并。 3. 历史数据的处理

Prometheus 本身使用本地存储，为保证存储空间可用，会定时清理存储的监控数据，如果监控人员需要对长期的监控数据，例如 1 年的数据，进行分析，进而分析系统的潜在问题。对于 Prometheus 来说纵向扩充硬盘的体积是较为简单的解决方案，然而这种形式成本高昂，也不方便数据管理和迁移。

### Thanos 的解决方案

Thanos 致力于通过一种简单的可无缝接入当前系统的方案解决这些问题。其主要功能点通过 Sidecar、Querier、Store 和 Compactor 来实现，这里做一个简单介绍。

1. Sidecar

Sidecar 作为一个单独的进程和已有的 Prometheus 实例运行在一个 server 上，互不影响。Sidecar 可以视为一个 Proxy 组件，所有对 Prometheus 的访问都通过 Sidecar 来代理进行。通过 Sidecar 还可以将采集到的数据直接备份到云端对象存储服务器。 2. Querier

所有的 Sidecar 与 Querier 直连，同时 Querier 实现了一套 Prometheus 官方的 HTTP API 从而保证对外提供与 Prometheus 一致的数据源接口，Grafana 可以通过同一个查询接口请求不同集群的数据，Querier 负责找到对应的集群并通过 Sidecar 获取数据。Querier 本身也是水平可扩展的，因而可以实现高可部署，而且 Querier 可以实现对高可部署的 Prometheus 的数据进行合并从而保证多次查询结果的一致性，从而解决全局视图和高可用的问题。 3. Store

Store 实现了一套和 Sidecar 完全一致的 API 提供给 Querier 用于查询 Sidecar 备份到云端对象存储的数据。因为 Sidecar 在完成数据备份后，Prometheus 会清理掉本地数据保证本地空间可用。所以当监控人员需要调取历史数据时只能去对象存储空间获取，而 Store 就提供了这样一个接口。Store Gateway 只会缓存对象存储的基本信息，例如存储块的索引，从而保证实现快速查询的同时占用较少本地空间。 4. Comactor

Compactor 主要用于对采集到的数据进行压缩，实现将数据存储至对象存储时节省空间。

### Thanos 的生产可用性

Thanos 诞生还不到一年，目前最新的发布版本为 0.1.0-rc.1，大量的生产实践还未看到，短期预计还不具备生产可用性，但是解决问题的理念值得长期关注。
