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


| Date | Log |
| :---: | :---: |
| 01/07/2018 | 初始版本：根据杭州Service Mesh线下Meet Up中唐老师相关讲解内容和官方文档简单总结. |


Prometheus和Grafana作为监控界的仙侣组合为我们进行系统运行状况的监控提供了极大的便利，简单说，Prometheus对数据进行采集，Grafana对对数据进行图表形式的展示。当然它们也提供了更多高级功能。<br />
在规模不大且结构简单的系统中，Prometheus的基本功能已经可以完全满足用户需求。但在一些复杂场景下Prometheus的应用会面临一些问题，Prometheus本身应对这些问题略显吃力。而Thanos正是Improbable-eng团队为解决这些问题而开发的一款开源中间层框架，它对Grafana提供与Prometheus一致的数据源接口，同时可以无缝地部署到现有的Prometheus环境中，不需要对Prometheus做任何定制。


<a name="87f45c06"></a>
### Prometheus面临的问题

1. 全局视图<br />
当Prometheus用于监控多个Kubernetes集群时，它并没有提供一种较好的全局统一的数据采集方式。举个例子，需要实现当有60%的集群处于掉线状态时监控系统进行报警，通过Prometheus该如何实现？如何将来自不同集群的数据进行聚合？
2. 高可用<br />
Prometheus如何方便的实现高可用？较为简单的方案是在同一个server上启动两个Prometheus实例，通过简单的反向代理实现高可。但问题是两个Prometheus实例的数据信息出现不一致时该如何处理，例如一段时间内其中一个实例的数据为空，另一个实例的数据可用，则在前端的不同查询可能会对同一时间段的信息展示出现完全不同的效果，影响监控人员的使用。因此需要进行数据合并。
3. 历史数据的处理<br />
Prometheus本身使用本地存储，为保证存储空间可用，会定时清理存储的监控数据，如果监控人员需要对长期的监控数据，例如1年的数据，进行分析，进而分析系统的潜在问题。对于Prometheus来说纵向扩充硬盘的体积是较为简单的解决方案，然而这种形式成本高昂，也不方便数据管理和迁移。


<a name="d66e0cef"></a>
### Thanos的解决方案

Thanos致力于通过一种简单的可无缝接入当前系统的方案解决这些问题。其主要功能点通过Sidecar、Querier、Store和Compactor来实现，这里做一个简单介绍。

1. Sidecar<br />
Sidecar作为一个单独的进程和已有的Prometheus实例运行在一个server上，互不影响。Sidecar可以视为一个Proxy组件，所有对Prometheus的访问都通过Sidecar来代理进行。通过Sidecar还可以将采集到的数据直接备份到云端对象存储服务器。
2. Querier<br />
所有的Sidecar与Querier直连，同时Querier实现了一套Prometheus官方的HTTP API从而保证对外提供与Prometheus一致的数据源接口，Grafana可以通过同一个查询接口请求不同集群的数据，Querier负责找到对应的集群并通过Sidecar获取数据。Querier本身也是水平可扩展的，因而可以实现高可部署，而且Querier可以实现对高可部署的Prometheus的数据进行合并从而保证多次查询结果的一致性，从而解决全局视图和高可用的问题。
3. Store<br />
Store实现了一套和Sidecar完全一致的API提供给Querier用于查询Sidecar备份到云端对象存储的数据。因为Sidecar在完成数据备份后，Prometheus会清理掉本地数据保证本地空间可用。所以当监控人员需要调取历史数据时只能去对象存储空间获取，而Store就提供了这样一个接口。Store Gateway只会缓存对象存储的基本信息，例如存储块的索引，从而保证实现快速查询的同时占用较少本地空间。
4. Comactor<br />
Compactor主要用于对采集到的数据进行压缩，实现将数据存储至对象存储时节省空间。


<a name="c23f4d1c"></a>
### Thanos的生产可用性

Thanos诞生还不到一年，目前最新的发布版本为0.1.0-rc.1，大量的生产实践还未看到，短期预计还不具备生产可用性，但是解决问题的理念值得长期关注。

