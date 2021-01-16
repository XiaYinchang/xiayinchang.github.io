---
title: Linux 常用系统调用
urlname: bz00k3
date: '2020-09-11 00:00:00 +0000'
layout: post
comments: true
categories: Linux
tags:
  - Linux
  - 系统调用
keywords: 'Linux, 系统调用'
description: Linux 常用系统调用。
abbrlink: fa6b61f1
updated: 2020-09-11 00:00:00
---

#### fcntl

用于操作文件描述符，可以改变已打开文件的性质，fcntl 针对描述符提供控制，参数 fd 是被参数 cmd 操作的描述符，根据 cmd 的类型，fcntl 能够接受第三个参数 int arg :

```
# 设置 fd 为非阻塞
fcntl(fd, F_SETFL, flags | O_NONBLOCK);
```
