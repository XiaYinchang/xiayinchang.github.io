---
title: Linux 内存管理基础知识
urlname: wwl0x3
date: '2020-12-18 00:00:00 +0800'
layout: post
comments: true
categories: Linux
tags:
  - Linux
  - 内存管理
keywords: 'Linux, 内存管理'
description: Linux 内存管理基础知识。
abbrlink: '51188647'
updated: 2020-12-18 00:00:00
---

#### buffer 与 cache

buffer 一般用于数据的批量处理，减少操作次数；cache 一般是缓存一部分文件内容在内存，命中缓存时就不需要从磁盘读取，减少 I/O 读操作。
