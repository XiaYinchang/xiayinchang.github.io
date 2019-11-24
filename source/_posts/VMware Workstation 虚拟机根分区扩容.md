---
title: VMware Workstation 虚拟机 root 分区扩容
urlname: vefh1k
date: '2019-05-26 00:00:00 +0800'
layout: post
comments: true
categories: Virtualization
tags:
  - Virtaulization
  - 云计算
keywords: 'LVM, PV, LV'
description: 在虚拟机创建完成后扩容根分区。
abbrlink: eca5e5f3
---


| Date | Log |
| :---: | :---: |
| 26/05/2019 | 初始版本. |


<a name="b072c805"></a>
### 解决什么问题

本文尝试解决的问题：

- 在使用 VMware Workstation 安装 Centos 虚拟机后，发现根分区大小不够用，在不进行系统重装的前提下对根分区进行扩容。

<a name="fb370aed"></a>
### 具体步骤

基本过程是先通过 VMware Workstations 对虚拟物理磁盘设备进行扩容，然后进入系统后新建 LVM 分区，新建 PV，分配 PV 给 VG，扩容 LV，最后扩容文件系统。<br />
<a name="bb27f7bd"></a>
#### 物理磁盘扩容

在 VMware Workstation 虚拟机详情中，对虚拟物理盘扩容，如图：<br />![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1558855276765-9429af86-29d5-4e67-9dd1-2b5901f41d76.png#align=left&display=inline&height=521&name=image.png&originHeight=623&originWidth=892&size=90730&status=done&width=746)

此时进入操作系统查看块设备详情，目标是增加 centos-root 容量：

```bash
# lsblk
NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda               8:0    0  300G  0 disk 
├─sda1            8:1    0    1G  0 part /boot
└─sda2            8:2    0   39G  0 part 
  ├─centos-root 253:0    0 35.1G  0 lvm  /
  └─centos-swap 253:1    0  3.9G  0 lvm  [SWAP]
sr0              11:0    1 1024M  0 rom  
```

<a name="9NJvT"></a>
#### 新建 LVM 分区
使用 fsdik 在 /dev/sda 上新建分区。
```bash
# fdisk /dev/sda
Welcome to fdisk (util-linux 2.23.2).

Changes will remain in memory only, until you decide to write them.
Be careful before using the write command.


Command (m for help): n
```

根据提示， 一直 Enter 采用默认设置即可，直到出现类似以下输出：

```bash
Partition 3 of type Linux and of size 260 GiB is set
```

之后，键入 t 进行分区类型设置，依次输入 3、8e 设置 LVM 分区：

```bash
Command (m for help): t
Partition number (1-3, default 3): 3
Hex code (type L to list all codes): 8e
Changed type of partition 'Linux' to 'Linux LVM'
```

然后，键入 w 保存分区。

```bash
Command (m for help): w
The partition table has been altered!

Calling ioctl() to re-read partition table.

WARNING: Re-reading the partition table failed with error 16: Device or resource busy.
The kernel still uses the old table. The new table will be used at
the next reboot or after you run partprobe(8) or kpartx(8)
Syncing disks.
```

使用以下命令扫描出新创建的分区：

```bash
# partprobe -s
/dev/sda: msdos partitions 1 2 3
```

或者如下命令扫描：

```bash
# partx -v -a /dev/sda
```

此时，查看块设备详情可以看到新建的 /dev/sda3 分区：

```bash
# lsblk
NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda               8:0    0  300G  0 disk 
├─sda1            8:1    0    1G  0 part /boot
├─sda2            8:2    0   39G  0 part 
│ ├─centos-root 253:0    0 35.1G  0 lvm  /
│ └─centos-swap 253:1    0  3.9G  0 lvm  [SWAP]
└─sda3            8:3    0  260G  0 part 
sr0              11:0    1 1024M  0 rom  
```

<a name="6kVFX"></a>
#### 使用新分区扩容 LV
在磁盘分区的基础上创建物理卷：

```bash
# pvcreate /dev/sda3
Physical volume "/dev/sda3" successfully created
```

使用新建的物理卷扩展卷组：

```bash
# vgextend centos /dev/sda3
  Volume group "centos" successfully extended
```

扩容逻辑卷：

```bash
#  lvextend /dev/centos/root /dev/sda3
  Size of logical volume centos/root changed from 35.12 GiB (8991 extents) to <295.12 GiB (75550 extents).
  Logical volume centos/root successfully resized.
```

扩容文件系统：

```bash
# xfs_growfs /dev/mapper/centos-root
meta-data=/dev/mapper/centos-root isize=512    agcount=4, agsize=2301440 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=0 spinodes=0
data     =                       bsize=4096   blocks=9205760, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
log      =internal               bsize=4096   blocks=4495, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0
data blocks changed from 9205760 to 77363200
```

最后查看块设备详情，扩容成功：

```bash
# lsblk
NAME            MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
sda               8:0    0   300G  0 disk 
├─sda1            8:1    0     1G  0 part /boot
├─sda2            8:2    0    39G  0 part 
│ ├─centos-root 253:0    0 295.1G  0 lvm  /
│ └─centos-swap 253:1    0   3.9G  0 lvm  [SWAP]
└─sda3            8:3    0   260G  0 part 
  └─centos-root 253:0    0 295.1G  0 lvm  /
sr0              11:0    1  1024M  0 rom 
```


