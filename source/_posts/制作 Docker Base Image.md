---
title: 基于 CentOS Minimal 镜像制作 Docker Base Image
urlname: xgi2cb
date: '2019-08-30 00:00:00 +0000'
layout: post
comments: true
categories: Docker
tags:
  - Linux
  - Docker
keywords: 'Docker, Centos'
description: 本文记录基于 CentOS Minimal 镜像制作 Docker Base Image。
abbrlink: 8a546874
---

#### 使用镜像安装 centos 虚拟机

使用 VirtualBox、VMware workstation 或者 Proxmox 等虚拟机管理平台创建虚拟机，在这里我使用 Proxmox 创建虚拟机。由于我们只是为了制作 Docker Base Image，虚拟机用完即删，给虚拟机分配的资源可随意配置。下图是我创建的虚拟机基本配置：

![WX20190830-101825@2x.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1567131557233-c3e8da2b-10a6-495a-9805-fcb2f3683b77.png#align=left&display=inline&height=710&name=WX20190830-101825%402x.png&originHeight=710&originWidth=1438&size=138442&status=done&width=1438)

这里使用 CentOS 7 1804 的 ISO 镜像安装虚拟机操作系统，安装系统的过程不再赘述，按照正常安装步骤操作即可。这里使用这个版本的操作系统镜像是因为我们自己的软件包都是基于这个版本的 centos 制作的，我需要这个版本的基础镜像通过安装这些软件包制作最后的工作镜像。读者可以根据自己的需要选择不同操作系统不同的版本。

#### 制作基础镜像

- 配置网络（按需）

如果你的网络是通过 DHCP 配置的这一步不需要，只需要检查一下能否联网并正常解析域名即可。否则，可能需要手动配置网络，具体 IP 地址根据自己的网络情况选择：

```bash
ip a add 192.168.180.150/24 dev eth0
ip r default via 192.168.180.254 dev eth0
```

另外设置一下 dns nameserver：

```bash
cat /etc/resolv.conf
nameserver 192.168.180.42
```

- 安装 docker-ce

```bash
yum install -y yum-utils device-mapper-persistent-data lvm2
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io
systemctl enable --now docker
```

- 获取制作脚本

制作脚本从 Moby 项目获取，具体地址： [https://github.com/moby/moby/tree/master/contrib](https://github.com/moby/moby/tree/master/contrib)，读者可根据自己的需要下载针对不同操作系统的制作脚本，这里使用  mkimage-yum.sh。

```bash
yum install -y wget
wget https://raw.githubusercontent.com/moby/moby/master/contrib/mkimage-yum.sh
chmod +x mkimage-yum.sh
```

- 制作基础镜像

执行以下脚本进行制作：

```bash
./mkimage-yum.sh centos
```

制作完成后：

![WX20190830-101825@2x.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1567133343307-c8b7d86e-9a50-48ac-bfa8-d21c79e26c8c.png#align=left&display=inline&height=108&name=WX20190830-101825%402x.png&originHeight=108&originWidth=1662&size=30100&status=done&width=1662)

然后就可以推送到内部镜像仓库中，并作为基础镜像来使用。
