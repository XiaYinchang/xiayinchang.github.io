---
title: ArchLinux 常用命令
urlname: egtn5p
date: '2019-09-04 00:00:00 +0800'
updated: 'Wed Jan 08 2020 00:00:00 GMT+0800 (China Standard Time)'
layout: post
comments: true
categories: Linux
tags:
  - Linux
  - ArchLinux
keywords: ArchLInux
description: 本文记录使用 ArchLinux 作为开发平台常用的命令和操作。
abbrlink: bda105fe
---


<a name="BdT88"></a>
#### yay 使用相关
```bash
# 安装包时覆盖本地已存在文件
yay deluge --force
# 查看所有安装的文件及其路径
yay -Ql deluge
# 查找时按照指定 filed 排序
yay wechat --sortby <votes|popularity|id|baseid|name|base|submitted|modified>
```

<a name="aQrbN"></a>
#### Network-Manage 使用 SSTP VPN 
需要安装客户端软件： `network-manager-sstp`

<a name="xaHEP"></a>
#### 配置 javaws Web 端访问物理服务器终端
到[这里](https://github.com/frekele/oracle-java/releases)下载 Oracle JDK 并解压，将解压得到的文件夹移动至 jvm 目录，例如：
```javascript
wget https://github.com/frekele/oracle-java/releases/download/8u212-b10/jre-8u212-linux-x64.tar.gz
tar zxvf jre-8u212-linux-x64.tar.gz
sudo mv /home/xyc/Downloads/jre1.8.0_212 /usr/lib/jvm/
```
查看已有的 JDK：
```javascript
➜  Downloads archlinux-java status                                                                             
Available Java environments:
  java-13-openjdk
  java-8-openjdk/jre
  jre1.8.0_212 (default)
```
设置默认 Java 环境为新添加的 JDK：
```javascript
sudo archlinux-java set jre1.8.0_212
```
修改 `/usr/lib/jvm/jre1.8.0_212/lib/security/java.security` 文件调整设置为：
```javascript
jdk.tls.disabledAlgorithms=NULL
```
打开 `jcontrol` 程序将物理机终端地址加入白名单，如：`http://192.168.181.134:80`。<br />重新打开浏览器即可。

<a name="AM6Pq"></a>
#### pacman 查看软件包安装的文件
```
bin sudo pacman -Ql cni-plugins
cni-plugins /usr/
cni-plugins /usr/lib/
cni-plugins /usr/lib/cni/
...
```

<a name="J6u5z"></a>
#### 清理系统缓存
```
sudo paccache -r
sudo paccache -ruk0
sudo pacman -Scc
sudo journalctl --vacuum-size=50M
sudo rm /var/lib/systemd/coredump/*
```


