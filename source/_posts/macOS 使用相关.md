---
title: macOS 使用相关
urlname: kgdfl4
date: '2020-05-06 00:00:00 +0800'
layout: post
categories: 开发工具
tags:
  - macOS
  - 开发工具
keywords: macOS
description: macOS 使用相关。
updated: 2020-07-10 00:00:00
---

#### 安装  source-code-pro 字体

```
brew tap homebrew/cask-fonts && brew cask install font-source-code-pro
```

#### 解决字体模糊

开启  HiDPI 参考：[https://github.com/xzhih/one-key-hidpi](https://github.com/xzhih/one-key-hidpi)

#### VMware fusion 开机启动虚拟机

参考：[https://gist.github.com/jasoncodes/613198/bb94f7d9a1aa0f1bbb42deddcbca9b2dc532ff7e](https://gist.github.com/jasoncodes/613198/bb94f7d9a1aa0f1bbb42deddcbca9b2dc532ff7e)

#### homebrew 使用国内镜像源

需先安装 homebrew ，然后配置国内镜像源，参考：[https://developer.aliyun.com/mirror/homebrew?spm=a2c6h.13651102.0.0.3e221b11ZOeaob](https://developer.aliyun.com/mirror/homebrew?spm=a2c6h.13651102.0.0.3e221b11ZOeaob)，[https://blog.csdn.net/iroguel/article/details/93481795](https://blog.csdn.net/iroguel/article/details/93481795)

```bash
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

#### 安装 iproute2

```
brew install iproute2mac
```

#### 强制退出进程

Command + Option + Shift + Esc
