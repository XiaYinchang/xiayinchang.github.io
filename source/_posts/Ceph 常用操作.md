---
title: Ceph 常用操作
urlname: asu9v3
date: '2019-09-03 00:00:00 +0800'
updated: 'Fri Dec 06 2019 00:00:00 GMT+0800 (China Standard Time)'
layout: post
comments: true
categories: Ceph
tags:
  - Linux
  - Ceph
keywords: Ceph
description: 本文记录使用 Ceph 过程中常用的命令。
abbrlink: e8bac896
---


<a name="BdT88"></a>
#### 删除 rbd image 时提示有 watcher
查看该 image 信息

```bash
root@openstack-compute-02:~# rbd info vm-109-cloudinit --pool cloud-disk
rbd image 'vm-109-cloudinit':
        size 4 MiB in 1 objects
        order 22 (4 MiB objects)
        snapshot_count: 0
        id: 85a71142d8c136
        block_name_prefix: rbd_data.85a71142d8c136
        format: 2
        features: layering, exclusive-lock, object-map, fast-diff, deep-flatten
        op_features: 
        flags: 
        create_timestamp: Wed Aug 28 10:04:09 2019
        access_timestamp: Mon Sep  2 13:59:31 2019
        modify_timestamp: Mon Sep  2 13:59:31 2019
```

从 info 中 block_name_prefix: rbd_data.85a71142d8c136 获知 rados 对象名称为 rbd_header.85a71142d8c136 ，然后列出对象所有 watcher：

```bash
root@openstack-compute-02:~# rados listwatchers --pool cloud-disk rbd_header.85a71142d8c136
watcher=192.168.180.116:0/2072981162 client.27537920 cookie=139876735669120
```

或者直接通过 rbd 命令列出 watcher：

```bash
root@openstack-compute-02:~# rbd status --pool cloud-disk vm-109-cloudinit
Watchers:
        watcher=192.168.180.116:0/2072981162 client.27537920 cookie=139876735669120
```

将 watcher 加入黑名单：

```bash
ceph osd blacklist add 192.168.180.116:0/2072981162
```

此时再次查看 image 的 watcher ：

```bash
root@openstack-compute-02:~# rbd status --pool cloud-disk vm-109-cloudinit
Watchers: none
```

没有了 watcher 我们就可以继续删除该 image ：

```bash
rbd rm --pool cloud-disk vm-109-cloudinit
```

然后将 watcher 从黑名单剔除或者不手动操作，默认1个小时后自动恢复：

```bash
root@openstack-compute-02:~# ceph osd blacklist ls
listed 1 entries
192.168.180.116:0/2072981162 2019-09-03 11:19:24.466205
root@openstack-compute-02:~# ceph osd blacklist rm 192.168.180.116:0/2072981162
un-blacklisting 192.168.180.116:0/2072981162
root@openstack-compute-02:~# ceph osd blacklist clear
 removed all blacklist entries
root@openstack-compute-02:~# ceph osd blacklist ls
listed 0 entries
```

<a name="uB6Bh"></a>
#### scrub errors 修复
错误如下：

```bash
root@umstor21:~# ceph -s
  cluster:
    id:     d6aadfd6-9e08-4000-98bd-a5a14f59ef97
    health: HEALTH_ERR
            30 scrub errors
            Reduced data availability: 25 pgs inactive
            Possible data damage: 1 pg inconsistent
            Degraded data redundancy: 60273/2821944 objects degraded (2.136%), 68 pgs degraded, 57 pgs undersized
 
  services:
    mon: 3 daemons, quorum openstack-compute-04,openstack-compute-02,openstack-compute-03 (age 63m)
    mgr: openstack-compute-02(active, since 8d), standbys: openstack-compute-04, openstack-compute-03
    mds: cephfs:1 {0=openstack-compute-04=up:active} 2 up:standby
    osd: 19 osds: 18 up (since 8m), 18 in (since 53m); 57 remapped pgs
 
  data:
    pools:   12 pools, 1076 pgs
    objects: 1.41M objects, 5.3 TiB
    usage:   4.9 TiB used, 11 TiB / 16 TiB avail
    pgs:     2.323% pgs not active
             60273/2821944 objects degraded (2.136%)
             1006 active+clean
             32   active+undersized+degraded+remapped+backfill_wait
             18   undersized+degraded+remapped+backfill_wait+peered
             11   active+recovery_wait+degraded
             7    undersized+degraded+remapped+backfilling+peered
             1    active+recovery_wait
             1    active+clean+inconsistent
 
  io:
    recovery: 40 MiB/s, 21 objects/s
```

查看详细信息：

```bash
root@umstor21:~# ceph health detail
HEALTH_ERR 30 scrub errors; Reduced data availability: 25 pgs inactive; Possible data damage: 1 pg inconsistent; Degraded data redundancy: 59572/2821944 objects degraded (2.111%), 68 pgs degraded, 57 pgs undersized
OSD_SCRUB_ERRORS 30 scrub errors
PG_AVAILABILITY Reduced data availability: 25 pgs inactive
    pg 1.1 is stuck inactive for 3867.682789, current state undersized+degraded+remapped+backfill_wait+peered, last acting [26]
    pg 1.1b is stuck inactive for 3867.800588, current state undersized+degraded+remapped+backfill_wait+peered, last acting [24]
    pg 1.26 is stuck inactive for 3867.806862, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.35 is stuck inactive for 3867.794765, current state undersized+degraded+remapped+backfill_wait+peered, last acting [5]
    pg 1.3a is stuck inactive for 3867.628287, current state undersized+degraded+remapped+backfilling+peered, last acting [11]
    pg 1.3e is stuck inactive for 3867.807629, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.41 is stuck inactive for 3867.794638, current state undersized+degraded+remapped+backfill_wait+peered, last acting [24]
    pg 1.4b is stuck inactive for 3867.674743, current state undersized+degraded+remapped+backfilling+peered, last acting [26]
    pg 1.5e is stuck inactive for 3867.717186, current state undersized+degraded+remapped+backfilling+peered, last acting [10]
    pg 1.64 is stuck inactive for 3867.809421, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.68 is stuck inactive for 3867.806775, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.86 is stuck inactive for 3867.805018, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.8c is stuck inactive for 3867.668131, current state undersized+degraded+remapped+backfill_wait+peered, last acting [4]
    pg 1.a4 is stuck inactive for 3867.759708, current state undersized+degraded+remapped+backfilling+peered, last acting [22]
    pg 1.c7 is stuck inactive for 3867.765074, current state undersized+degraded+remapped+backfill_wait+peered, last acting [22]
    pg 1.d9 is stuck inactive for 3867.588416, current state undersized+degraded+remapped+backfilling+peered, last acting [12]
    pg 1.f9 is stuck inactive for 3867.797908, current state undersized+degraded+remapped+backfill_wait+peered, last acting [5]
    pg 1.148 is stuck inactive for 3867.800417, current state undersized+degraded+remapped+backfill_wait+peered, last acting [24]
    pg 1.14b is stuck inactive for 3867.807076, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.15e is stuck inactive for 3867.716724, current state undersized+degraded+remapped+backfill_wait+peered, last acting [10]
    pg 1.164 is stuck inactive for 3867.760788, current state undersized+degraded+remapped+backfill_wait+peered, last acting [22]
    pg 1.177 is stuck inactive for 3867.795676, current state undersized+degraded+remapped+backfilling+peered, last acting [5]
    pg 1.17e is stuck inactive for 3867.809061, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.181 is stuck inactive for 3867.669194, current state undersized+degraded+remapped+backfilling+peered, last acting [4]
    pg 1.1ce is stuck inactive for 3867.757812, current state undersized+degraded+remapped+backfill_wait+peered, last acting [22]
PG_DAMAGED Possible data damage: 1 pg inconsistent
    pg 1.8d is active+clean+inconsistent, acting [6,11]
PG_DEGRADED Degraded data redundancy: 59572/2821944 objects degraded (2.111%), 68 pgs degraded, 57 pgs undersized
    pg 1.1 is stuck undersized for 564.241756, current state undersized+degraded+remapped+backfill_wait+peered, last acting [26]
    pg 1.1b is stuck undersized for 3264.748374, current state undersized+degraded+remapped+backfill_wait+peered, last acting [24]
    pg 1.26 is stuck undersized for 564.326041, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.35 is stuck undersized for 564.277686, current state undersized+degraded+remapped+backfill_wait+peered, last acting [5]
    pg 1.3a is stuck undersized for 3264.718236, current state undersized+degraded+remapped+backfilling+peered, last acting [11]
    pg 1.3e is stuck undersized for 564.326326, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.41 is stuck undersized for 3264.744338, current state undersized+degraded+remapped+backfill_wait+peered, last acting [24]
    pg 1.4b is stuck undersized for 3264.740569, current state undersized+degraded+remapped+backfilling+peered, last acting [26]
    pg 1.5e is stuck undersized for 3264.315873, current state undersized+degraded+remapped+backfilling+peered, last acting [10]
    pg 1.64 is stuck undersized for 3264.792433, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.68 is stuck undersized for 567.346719, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.86 is stuck undersized for 3264.777395, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.8c is stuck undersized for 3264.756387, current state undersized+degraded+remapped+backfill_wait+peered, last acting [4]
    pg 1.a4 is stuck undersized for 3264.668182, current state undersized+degraded+remapped+backfilling+peered, last acting [22]
    pg 1.15e is stuck undersized for 3264.387945, current state undersized+degraded+remapped+backfill_wait+peered, last acting [10]
    pg 1.164 is stuck undersized for 3264.727217, current state undersized+degraded+remapped+backfill_wait+peered, last acting [22]
    pg 1.177 is stuck undersized for 564.278243, current state undersized+degraded+remapped+backfilling+peered, last acting [5]
    pg 1.17e is stuck undersized for 3264.792153, current state undersized+degraded+remapped+backfill_wait+peered, last acting [6]
    pg 1.181 is stuck undersized for 3264.761056, current state undersized+degraded+remapped+backfilling+peered, last acting [4]
    pg 1.1ce is stuck undersized for 3264.675284, current state undersized+degraded+remapped+backfill_wait+peered, last acting [22]
    pg 5.9 is active+recovery_wait+degraded, acting [22,8,14]
    pg 5.11 is active+recovery_wait+degraded, acting [8,4,24]
    pg 5.21 is active+recovery_wait+degraded, acting [4,5,26]
    pg 5.2f is active+recovery_wait+degraded, acting [8,2,22]
    pg 5.3f is active+recovery_wait+degraded, acting [9,12,0]
    pg 5.4c is active+recovery_wait+degraded, acting [9,26,1]
    pg 5.50 is active+recovery_wait+degraded, acting [24,9,0]
    pg 5.51 is active+recovery_wait+degraded, acting [22,12,3]
    pg 5.55 is active+recovery_wait+degraded, acting [4,11,9]
    pg 7.7 is active+recovery_wait+degraded, acting [24,10,5]
    pg 9.3 is stuck undersized for 3264.586508, current state active+undersized+degraded+remapped+backfill_wait, last acting [9,6]
    pg 12.3 is stuck undersized for 3264.749745, current state active+undersized+degraded+remapped+backfill_wait, last acting [24,12]
    pg 12.5 is stuck undersized for 3264.749762, current state active+undersized+degraded+remapped+backfill_wait, last acting [24,12]
    pg 12.18 is stuck undersized for 3264.586508, current state active+undersized+degraded+remapped+backfill_wait, last acting [9,10]
    pg 12.1d is stuck undersized for 3264.671133, current state active+undersized+degraded+remapped+backfill_wait, last acting [22,2]
    pg 12.2c is stuck undersized for 565.278100, current state active+undersized+degraded+remapped+backfill_wait, last acting [5,2]
    pg 12.31 is stuck undersized for 3264.439978, current state active+undersized+degraded+remapped+backfill_wait, last acting [10,26]
    pg 12.3b is stuck undersized for 3264.791588, current state active+undersized+degraded+remapped+backfill_wait, last acting [6,11]
    pg 12.3c is stuck undersized for 3264.749388, current state active+undersized+degraded+remapped+backfill_wait, last acting [3,26]
    pg 12.68 is stuck undersized for 3264.750611, current state active+undersized+degraded+remapped+backfill_wait, last acting [26,6]
    pg 12.74 is stuck undersized for 565.313175, current state active+undersized+degraded+remapped+backfill_wait, last acting [6,5]
    pg 12.78 is stuck undersized for 3264.753912, current state active+undersized+degraded+remapped+backfill_wait, last acting [3,24]
    pg 12.81 is stuck undersized for 3264.781922, current state active+undersized+degraded+remapped+backfill_wait, last acting [6,26]
    pg 12.85 is stuck undersized for 565.276004, current state active+undersized+degraded+remapped+backfill_wait, last acting [5,26]
    pg 12.8b is stuck undersized for 3264.788455, current state active+undersized+degraded+remapped+backfill_wait, last acting [0,23]
    pg 12.8c is stuck undersized for 3264.721783, current state active+undersized+degraded+remapped+backfill_wait, last acting [12,0]
    pg 12.8e is stuck undersized for 567.299698, current state active+undersized+degraded+remapped+backfill_wait, last acting [8,22]
    pg 12.94 is stuck undersized for 565.277670, current state active+undersized+degraded+remapped+backfill_wait, last acting [5,23]
    pg 12.a0 is stuck undersized for 568.309205, current state active+undersized+degraded+remapped+backfill_wait, last acting [26,1]
    pg 12.a3 is active+undersized+degraded+remapped+backfill_wait, acting [12,4]
    pg 15.1 is active+recovery_wait+degraded, acting [3,9,6]
```

修复 pg

```bash
ceph pg repair <pg_id>
```

<a name="RAYxC"></a>
#### 删除 Monitor
```
systemctl stop ceph-mon@openstack-compute-02.service
ceph mon remove openstack-compute-02
// 移除 ceph.conf 中的相关信息
```

<a name="0zXsv"></a>
#### ceph-ansible 部署
```bash
git clone https://github.com/ceph/ceph-ansible.git
git checkout v4.0.0
// 在部署节点安装
yum install -y ansible python-notario
rpm -i http://download-ib01.fedoraproject.org/pub/epel/testing/7/x86_64/Packages/p/python2-notario-0.0.14-1.el7.noarch.rpm
// 在所有节点安装
yum install -y python-netaddr 
```
cd  到 ceph-ansible ， 创建 hosts 文件如下：
```bash
[CephGroup:children]
mons
osds
mdss
mgrs
rgws
[CephGroup:vars]
# 最好事先配好免密
ansible_ssh_user=root
ansible_ssh_pass=test
ansible_port=22

[mons]
ceph-csi-01
ceph-csi-02
ceph-csi-03
[osds]
ceph-csi-01
ceph-csi-02
ceph-csi-03
[mdss]
ceph-csi-01
ceph-csi-02
ceph-csi-03
[mgrs]
ceph-csi-01
ceph-csi-02
ceph-csi-03
[rgws]
ceph-csi-01
ceph-csi-02
ceph-csi-03
```
cd 到 group_vars 目录：
```bash
cp all.yml.sample all.yml
// 取消注释并修改以下字段
ceph_origin: repository
ceph_repository: community
ceph_stable_release: nautilus
monitor_interface: eth0
public_network: 10.23.0.0/16
radosgw_interface: eth0

cp osd.yml.sample osd.yml
// 添加安装盘信息
devices:
  - /dev/vdb
  - /dev/vdc
  - /dev/vdd
```
回到项目根目录执行安装:
```bash
ansible-playbook -i hosts -v site.yml
```

<a name="BMg3M"></a>
#### ceph-ansible 添加 osd 
```
cd /opt/ceph-ansible
cp infrastructure-playbooks/add-osd.yml ./
// 修改 group_vars/all.yml 磁盘信息
ansible-playbook -vv -i hosts --limit 192.168.203.143 add-osd.yml
// 新增一个 osd 宿主节点和在已有的 osd 节点上增加一块盘步骤一样
// 添加完 osd 如果卡在 restart osd daemon 可通过执行以下命令解决
ceph osd unset noup
```

<a name="knNuf"></a>
#### rbd image 使用
```
// 创建大小为 1G 的 image
rbd create rbd/myimage --size 1024
rbd map rbd/myimage
mkfs.xfs /dev/rbd0
mkdir /data
mount /dev/rbd0 /data
// 扩容
rbd resize --image=rbd/myimage --size 10G
xfs_growfs /data
// 卸载
umount /data
// 检查占用设备的进程
fuser -m -v /dev/rbd0
rbd unmap /dev/rbd0
rbd rm rbd/myimage
// rbd image 转换 format，也可用于 image 复制
rbd export rbd/myrbd - | rbd import --image-format 2 - rbd/myrbd_v2
// rbd bench
rados bench -p rbd 20 -b 4K write -t 1 --no-cleanup
rbd create --size 4G test
rbd bench-write test
```

<a name="Z5LCG"></a>
#### Cinder 创建 Volume 副本并 Boot with it
OpenStack: import existing Ceph volumes in Cinder：[https://ceph.com/geen-categorie/openstack-import-existing-ceph-volumes-in-cinder/](https://ceph.com/geen-categorie/openstack-import-existing-ceph-volumes-in-cinder/)

<a name="xGnOB"></a>
#### 查看并修改 crushmap
```
1. 获取集群 crushmap
ceph osd getcrushmap -o {file1}
{file1} 为自定义的文件名，该文件为二进制文件，不可编辑。要想编辑此文件，需要用工具将其反编译解析，如 crushtool 工具。

2 反编译 crushmap
crushtool -d {file1} -o {file2}
反编译二进制文件 {file1} 得到可编辑文件 {file2}

3. 编辑 crushmap
按自我需求修改可编辑文件 {file2}

4. 编译 crushmap
要想编辑后的文件机器能够识别，必须用工具编译它生成二进制文件。
crushtool -c {file2} -o {file3}

5. 注入 crushmap
要想新的 crushmap 在集群中生效，必须将其注入要集群。
ceph osd setcrushmap -i {file3}
```
基本理解：[深入理解 ceph crush (1)—- 理解 crush map 文件](https://www.dovefi.com/post/%E6%B7%B1%E5%85%A5%E7%90%86%E8%A7%A3crush1%E7%90%86%E8%A7%A3crush_map%E6%96%87%E4%BB%B6/)／Crush算法：[大话 Ceph--CRUSH 那点事儿](http://www.xuxiaopang.com/2016/11/08/easy-ceph-CRUSH/)／Crush 查看：[Ceph 实践之 Crushmap 相关](https://www.jianshu.com/p/2355701459e9)。

<a name="7Rb6C"></a>
#### OSD 过度使用内存
在使用 Bluestore 时，bluestore_cache_autotune 默认已经启用，Bluestore 会将 OSD 堆内存使用量保持在指定的大小之下，通过配置选项 osd_memory_target 来控制，默认为 4G。对于内存较少但 OSD 节点较多的情况，仍然会可能造成内存几乎全部被 OSD 所用，最终致使宿主机死机。可以通过两种方式来缓解这种情况，一种是在启用自动配置时调小 osd_memory_target 值，例如：
```
[osd]
osd memory target = 2147483648
```
另一种是禁用自动配置并手动指定缓存大小：
```
[osd]
bluestore_cache_autotune = False
bluestore_min_alloc_size_ssd = 32768
bluestore_min_alloc_size_hdd = 32768
bluestore_min_alloc_size = 32768
bluestore_cache_kv_max = 6442450944
bluestore_cache_kv_ratio = 0.990000
bluestore_cache_meta_ratio = 0.010000
bluestore_cache_size = 12884901888
bluestore_cache_size_hdd = 12884901888
bluestore_cache_size_ssd = 12884901888
```


