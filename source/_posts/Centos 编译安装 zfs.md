---
title: Centos 编译安装 zfs
urlname: mr25kw
date: '2019-06-21 00:00:00 +0800'
layout: post
categories: Linux
tags:
  - Linux
  - Centos
  - 存储
keywords: 'Linux, zfs'
description: 记录在Centos 7.6 上从源代码编译安装 zfs 的过程。
---

- 安装依赖

```bash
yum groupinstall "Development Tools"
yum install zlib-devel libuuid-devel libattr-devel libblkid-devel libselinux-devel libudev-devel
yum install parted lsscsi ksh openssl-devel elfutils-libelf-devel
yum install kernel-devel-$(uname -r)
```

- 从[这里](https://github.com/zfsonlinux/zfs/releases)下载源代码并解压

```bash
 wget https://github.com/zfsonlinux/zfs/releases/download/zfs-0.8.1/zfs-0.8.1.tar.gz && tar zxf zfs-0.8.1.tar.gz
```

- 编译安装

```bash
cd ../zfs-0.8.1
sh autogen.sh
./configure
make -s -j$(nproc)
make install
```

- 重启系统
