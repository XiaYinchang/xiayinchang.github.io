---
title: 树莓派 3B 编译安装 zfs
urlname: uv2afi
date: '2019-06-21 00:00:00 +0800'
layout: post
categories: Linux
tags:
  - Linux
  - 树莓派
  - 存储
keywords: 'Linux, zfs'
description: 记录在树莓派官方系统上从源代码编译安装 zfs 的过程。
abbrlink: 6adad945
---

- 安装依赖

```bash
sudo apt remove 3.6-trunk-rpi
sudo apt update
sudo apt install build-essential autoconf libtool gawk alien fakeroot
sudo apt install dkms zlib1g-dev uuid-dev libattr1-dev libblkid-dev libselinux-dev libudev-dev libssl-dev parted lsscsi wget ksh
sudo apt install python3-dev python3-setuptools python3-cffi
```

- 安装内核头文件

```bash
 sudo apt upgrade raspberrypi-kernel raspberrypi-kernel-headers
```

- 从[这里](https://github.com/zfsonlinux/zfs/releases)下载源代码并解压

```bash
 wget https://github.com/zfsonlinux/zfs/releases/download/zfs-0.8.1/zfs-0.8.1.tar.gz && tar zxf zfs-0.8.1.tar.gz
```

- 编译安装

```bash
cd ../zfs-0.8.1
autoreconf --install --force
./configure --with-config=srpm
sed -E 's/(^RPMBUILD = rpmbuild.*)/\1 --target=armhf/' -i Makefile
make pkg-utils deb-dkms
for deb in *.deb; do sudo dpkg -i "$deb"; done
```

- 重启系统
