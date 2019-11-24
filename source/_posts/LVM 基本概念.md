---
title: LVM 基本概念
urlname: poq0bg
date: '2019-09-08 16:08:50 +0800'
layout: post
comments: true
categories: 译文
tags:
  - LVM
  - 译文
keywords: 'LVM,CentOS'
description: LVM 初学者必知必会。
abbrlink: '31e91381'
---



| Date | Log |
| :---: | :---: |
| 2019/05/28 | 初始版本. |
| 2019/09/08 | 添加逻辑卷扩容. |



<a name="e5729e94"></a>
### 原文
[RedHat / CentOS : A beginners guide to LVM](https://www.thegeekdiary.com/redhat-centos-a-beginners-guide-to-lvm-logical-volume-manager/)<br />

<a name="df368884"></a>
### 什么是LVM
逻辑卷管理（LVM）在物理磁盘和文件系统之间引入了额外的一层从而使得文件系统具有了如下特性：

- 方便地在线扩容和移动，不需要系统范围的中断
- 利用磁盘不连续的空间
- 有含义的卷名取代通常的晦涩的设备名
- 跨多个物理磁盘

Linux LVM 和 HP-UX LVM非常相似，但是提供了更多诸如磁盘快照、集群支持（GFS2、OCFS 和 Lustre）等高级功能。

<a name="mLNqS"></a>
### 概念

LVM 包含几项概念上的分层：物理卷（PV）、逻辑卷（LV）和文件系统。<br />![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1559006793676-717ab08e-f951-4f4c-b181-9167f797adb9.png#align=left&display=inline&height=316&name=image.png&originHeight=316&originWidth=260&size=21399&status=done&width=260)<br />这些分层又由较小的单元组成，例如物理卷由一组PE（Physical Extents）组成、逻辑卷由一组LE（Logical Extents）组成。Extent 在这里指的是组成卷的最小逻辑单元。Extent 在磁盘管理中指的是一些连续的 block，一个 extent 由起始的 block 加上长度进行定义。 Extent 是 btrfs 管理磁盘空间的最小单位，由 extent tree 管理。 Btrfs 分配 data 或 metadata 都需要查询 extent tree 以便获得空闲空间的信息。<br />![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1559008329932-64cc00c4-b926-40f1-be09-d0ab8e0f90d9.png#align=left&display=inline&height=179&name=image.png&originHeight=179&originWidth=563&size=39153&status=done&width=563)<br />
<br />![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1559007427978-1c2c017c-ab1a-4b34-a21a-55b313d17ac5.png#align=left&display=inline&height=258&name=image.png&originHeight=258&originWidth=671&size=23025&status=done&width=671)<br />

<a name="BfIJI"></a>
#### 物理卷（PV）
每个物理卷可以是磁盘分区，整个磁盘，元设备或回环文件。 使用命令 pvcreate 初始化存储空间以供 LVM 使用。 将块设备初始化为物理卷会在设备的开头放置标签。
<a name="m0nfw"></a>
#### 卷组（VG）
一个卷组将一组逻辑卷和物理卷纳入到一个管理单元。卷组被切分成一组大小固定的 PE。vgcreate 命令使用先前 pvcreate 为 LVM 配置的物理卷路径创建一个卷组。

- 卷组由物理卷构成，物理卷由 PE 构成。不同卷组包含的 PE 大小可以不同，具体是在创建卷组时指定。
- PE 的默认大小是 4MB，但是可以在创建 VG 的时候指定不同的值。
- 一般来讲，PE 大小越大性能越好，逻辑卷的控制粒度也会降低。
<a name="JvUDh"></a>
#### 逻辑卷（LV）
逻辑卷在概念上和非 LVM 系统中的硬盘分区等价。逻辑卷就是一些在从属于同一卷组的 PE 的基础上创建的块设备。可以使用 lvcreate 命令在某个卷组里创建逻辑卷。
<a name="9YWaY"></a>
#### 文件系统
文件系统构建在逻辑卷之上。使用 mkfs 命令可以在基于逻辑卷创建文件系统。文件系统创建完成后就可以根据需要挂载使用。
<a name="6E788"></a>
### 实操
<a name="Rvesv"></a>
#### 示例
接下来的操作中我们将会：

1. 基于三个物理磁盘（/dev/sdb,/dev/sdc,/dev/sdd）创建三个物理卷。
1. 基于三个物理卷创建一个卷组（/dev/vg01）。
1. 在卷组中创建一个逻辑卷。
1. 在逻辑卷上创建文件系统并且挂载（/data01）。
<a name="tNiMj"></a>
#### 创建物理卷
使用 pvcreate 命令初始化 LVM 使用的物理卷。在创建物理卷之前需要确保目标磁盘在操作系统中可见。使用 lvmdiskscan 扫描可用于创建物理卷的块设备。

```bash
# lvmdiskscan
.......
  /dev/sdb   [       2.00 GiB]
  /dev/sdc   [       2.00 GiB]
  /dev/sdd   [       2.00 GiB]
  3 disks
  19 partitions
  0 LVM physical volume whole disks
  0 LVM physical volumes
```

初始化块设备：

```bash
# pvcreate /dev/sdb /dev/sdc /dev/sdd
  Physical volume "/dev/sdb" successfully created
  Physical volume "/dev/sdc" successfully created
  Physical volume "/dev/sdd" successfully created
```

查看物理卷：<br />可以使用 pvdisplay、pvs 和 pvscan 查看刚刚创建的物理卷。

```bash
# pvdisplay
  "/dev/sdb" is a new physical volume of "2.00 GiB"
  --- NEW Physical volume ---
  PV Name               /dev/sdb
  VG Name
  PV Size               2.00 GiB
  Allocatable           NO
  PE Size               0
  Total PE              0
  Free PE               0
  Allocated PE          0
  PV UUID               Mt3F7z-a2AV-28Vn-uXe2-QejE-Z6tP-UMlQGM

  "/dev/sdc" is a new physical volume of "2.00 GiB"
  --- NEW Physical volume ---
  PV Name               /dev/sdc
  VG Name
  PV Size               2.00 GiB
  Allocatable           NO
  PE Size               0
  Total PE              0
  Free PE               0
  Allocated PE          0
  PV UUID               5m1Fuc-yTRn-I2vG-bMfU-6SE7-53EA-s8VQjt

  "/dev/sdd" is a new physical volume of "2.00 GiB"
  --- NEW Physical volume ---
  PV Name               /dev/sdd
  VG Name
  PV Size               2.00 GiB
  Allocatable           NO
  PE Size               0
  Total PE              0
  Free PE               0
  Allocated PE          0
  PV UUID               1x3e2A-C0Lt-DrUA-tPSM-lsMu-sn70-qg1j8p
```

```bash
# pvscan
  PV /dev/sdb                      lvm2 [2.00 GiB]
  PV /dev/sdc                      lvm2 [2.00 GiB]
  PV /dev/sdd                      lvm2 [2.00 GiB]
  Total: 3 [6.00 GiB] / in use: 0 [0   ] / in no VG: 3 [6.00 GiB]
```

```bash
# pvs
  PV         VG   Fmt  Attr PSize PFree
  /dev/sdb        lvm2 a--  2.00g 2.00g
  /dev/sdc        lvm2 a--  2.00g 2.00g
  /dev/sdd        lvm2 a--  2.00g 2.00g
```

<a name="UUsml"></a>
#### 创建卷组
使用 vgcreate 命令创建新的卷组 vg01，卷组用到了刚刚创建的三个PV。使用通过传入 -s 参数指定 PE 的大小、传入 -p 指定 PV 的最大数量、传入 -I 指定 LV 的最大数量。这些参数都是可选项。

```bash
# vgcreate vg01 /dev/sdb /dev/sdc /dev/sdd
  Volume group "vg01" successfully created
```

pvcreate 命令可选参数列表如下：

| Option | Meaning |
| :--- | :--- |
| -s | Physical extent size |
| -p | Max number of PVs |
| -l | Max number of LVs |
| –alloc | allocation policy (either contiguous, anywhere, or cling) |


使用 vgs 和 vgdisplay 命令可以查看卷组信息：

```bash
# vgs vg01
  VG   #PV #LV #SN Attr   VSize VFree
  vg01   3   0   0 wz--n- 5.99g 5.99g
```

```bash
# vgdisplay vg01
  --- Volume group ---
  VG Name               vg01
  System ID
  Format                lvm2
  Metadata Areas        3
  Metadata Sequence No  1
  VG Access             read/write
  VG Status             resizable
  MAX LV                0
  Cur LV                0
  Open LV               0
  Max PV                0
  Cur PV                3
  Act PV                3
  VG Size               5.99 GiB
  PE Size               4.00 MiB
  Total PE              1533
  Alloc PE / Size       0 / 0
  Free  PE / Size       1533 / 5.99 GiB
  VG UUID               Cw7GGz-NH3o-Sax2-5jPv-buZS-938T-tmNKFa
```

使用 vgchange 命令可以 activate/deactivate 卷组。<br />激活卷组：

```bash
# vgchange -a n vg01
  0 logical volume(s) in volume group "vg01" now active
```

停用卷组：

```bash
# vgchange -a y vg01
  1 logical volume(s) in volume group "vg01" now active
```

<a name="F4bvs"></a>
#### 创建逻辑卷
使用 lvcreate 命令在卷组中创建逻辑卷。

- 如果在创建逻辑卷时未指定卷名，默认卷名是 lvol#，#代表逻辑卷序号。
- 一般来讲，如果在创建逻辑卷时不指定所用物理卷，逻辑卷会在紧邻当前位置的下一个可用 PV 上创建。

创建一个 5GB 大小的名称为 lvol01 的逻辑卷：

```bash
# lvcreate -L 5G -n lvol01 vg01
  Logical volume "lvol01" created
```

创建一个 stripped 卷，通过以下命令创建一个跨越三个物理卷的 stripped 逻辑卷：

```bash
# lvcreate -L 5G -I 4096 -i 3 -n lvol01 vg01
  Rounding size (1280 extents) up to stripe boundary size (1281 extents)
  Logical volume "lvol01" created
```

lvcreate 命令的部分参数说明如下：

```bash
I - PVs to span while creating striped volume
i - stripe unit
```

创建 mirrored 卷，使用如下命令创建一个跨越三个物理卷的含有三路镜像的卷：

```bash
# lvcreate -L 1G -m 2 -n lvol01 vg01
  Logical volume "lvol01" created
```
在创建镜像逻辑卷时可以指定使用哪些物理卷，这里卷组中只有三个物理卷，所以默认逻辑卷默认在这三个物理卷上创建。

查看逻辑卷<br />可以使用 lvdisplay、lvs 和 lvscan 命令查看创建的逻辑卷：

```bash
# lvs /dev/vg01/lvol01
  LV     VG   Attr      LSize Pool Origin Data%  Move Log         Cpy%Sync Convert
  lvol01 vg01 mwi-a-m-- 1.00g                         lvol01_mlog   100.00
```

```bash
# lvdisplay /dev/vg01/lvol01
  --- Logical volume ---
  LV Path                /dev/vg01/lvol01
  LV Name                lvol01
  VG Name                vg01
  LV UUID                ptlmAV-mO42-fWiJ-e2Ml-r9kj-PFcC-MOexxw
  LV Write Access        read/write
  LV Creation host, time localhost.localdomain, 2014-10-22 09:04:25 -0700
  LV Status              available
  # open                 0
  LV Size                1.00 GiB
  Current LE             256
  Mirrored volumes       3
  Segments               1
  Allocation             inherit
  Read ahead sectors     auto
  - currently set to     256
  Block device           253:4
```

```bash
# lvscan
  ACTIVE            '/dev/vg01/lvol01' [1.00 GiB] inherit
```

<a name="MLjmc"></a>
#### 创建文件系统
最后一步是在刚刚创建好的逻辑卷上创建文件系统并将其挂载到系统目录从而能够访问它并且存储数据。使用 mkfs 命令在逻辑卷上创建文件系统。

```bash
# mkfs.ext4 /dev/vg01/lvol01
mke2fs 1.41.12 (17-May-2010)
Filesystem label=
OS type: Linux
Block size=4096 (log=2)
Fragment size=4096 (log=2)
Stride=0 blocks, Stripe width=0 blocks
65536 inodes, 262144 blocks
13107 blocks (5.00%) reserved for the super user
First data block=0
Maximum filesystem blocks=268435456
8 block groups
32768 blocks per group, 32768 fragments per group
8192 inodes per group
Superblock backups stored on blocks:
	32768, 98304, 163840, 229376

Writing inode tables: done
Creating journal (8192 blocks): done
Writing superblocks and filesystem accounting information: done

This filesystem will be automatically checked every 37 mounts or
180 days, whichever comes first.  Use tune2fs -c or -i to override.
```

文件系统创建完成后，相应的逻辑卷就可以用来挂载了。请确保在 /etc/fstab 文件中添加相应的条目，然后在系统启动时就可以自动挂载逻辑卷到相应的目录了。

```bash
# mkdir /data01
# mount /dev/vg01/lvol01 /data01
```

```bash
# vi /etc/fstab
/dev/vg01/lvol01	/data01			ext4	defaults	0 0
```

```bash
# df -h /data01
Filesystem                   Size  Used  Avail  Use%  Mounted on
/dev/mapper/vg01-lvol01     1008M   34M  924M   4%    /data01
```

使用带 GUI 的工具管理 LVM<br />如果你想使用图形化界面管理 LVM，推荐 system-config-lvm。 使用以下命令进行安装：

```bash
# yum install system-config-lvm
```

执行以下命令启动：

```bash
system-config-lvm
```

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1559628183097-f4e684b1-2ab3-432d-b062-075ed84278f4.png#align=left&display=inline&height=568&name=image.png&originHeight=568&originWidth=970&size=83085&status=done&width=970)<br />

- 逻辑卷扩容

```bash
# 扩容到 12G
lvextend -L12G /dev/vg01/lvol01
# 容量增加 1G
lvextend -L+1G /dev/vg01/lvol01
# 占用 vg 所有剩余空间
lvextend -l +100%FREE /dev/vg01/lvol01
```


