---
title: Ceph 常用操作
urlname: asu9v3
date: '2019-09-03 00:00:00 +0800'
updated: 'Sun Mar 22 2020 00:00:00 GMT+0800 (China Standard Time)'
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
    ...
```

修复 pg

```bash
ceph pg repair <pg_id>
```

<a name="RAYxC"></a>
#### 删除 Monitor
更复杂情况参考：[https://www.jianshu.com/p/b78cf33e558f](https://www.jianshu.com/p/b78cf33e558f)
```
systemctl stop ceph-mon@openstack-compute-02.service
// 如果停止一个 ceph-mon 后无法执行 ceph 命令，则应当先删除 mon 再停止 ceph-mon 服务
ceph mon remove openstack-compute-02
// 移除 ceph.conf 中的相关信息
```

<a name="PVcDQ"></a>
#### 添加 Monitor
```
// 预先安装 ceph-common ，再安装 ceph-mon
yum -y install ceph-common
// 在目标节点上创建 mon 目录，一般使用 hostname 作为 mon-id 
mkdir -p /var/lib/ceph/mon/ceph-`hostname`
// 从已有 ceph 节点复制 ceph 配置
scp 192.168.180.7:/etc/ceph/* /etc/ceph/
// 获取 mon keyring
ceph auth get mon. -o /tmp/mon.keyring
// 获取 mon map
ceph mon getmap -o /tmp/mon.map
// 格式化 mon 数据目录
ceph-mon -i `hostname` --mkfs --monmap /tmp/mon.map --keyring /tmp/mon.keyring
// 更改目录所属用户为 ceph
chown -R ceph:ceph /etc/ceph /var/lib/ceph
// 启动 ceph-mon 服务
systemctl enable --now ceph-mon@`hostname`
```

<a name="0zXsv"></a>
#### ceph-ansible 部署
```bash
git clone https://github.com/ceph/ceph-ansible.git
git checkout v4.0.9
// 在部署节点安装
yum install -y python-paramiko sshpass
rpm -i https://releases.ansible.com/ansible/rpm/release/epel-7-x86_64/ansible-2.8.9-1.el7.ans.noarch.rpm
// 在所有 ceph 节点安装
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
ansible_ssh_user=root
ansible_ssh_pass=test
ansible_port=22

[mons]
ceph-csi-01 ansible_host=10.8.107.149
ceph-csi-02 ansible_host=10.8.185.232
ceph-csi-03 ansible_host=10.8.143.178
[osds]
ceph-csi-01 ansible_host=10.8.107.149
ceph-csi-02 ansible_host=10.8.185.232
ceph-csi-03 ansible_host=10.8.143.178
[mdss]
ceph-csi-01 ansible_host=10.8.107.149
ceph-csi-02 ansible_host=10.8.185.232
ceph-csi-03 ansible_host=10.8.143.178
[mgrs]
ceph-csi-01 ansible_host=10.8.107.149
ceph-csi-02 ansible_host=10.8.185.232
ceph-csi-03 ansible_host=10.8.143.178
[rgws]
ceph-csi-01 ansible_host=10.8.107.149
ceph-csi-02 ansible_host=10.8.185.232
ceph-csi-03 ansible_host=10.8.143.178
[grafana-server]
ceph-csi-01 ansible_host=10.8.107.149
ceph-csi-02 ansible_host=10.8.185.232
ceph-csi-03 ansible_host=10.8.143.178
```
cd 到 group_vars 目录：
```bash
cp all.yml.sample all.yml
// 填入以下内容并修改 public_network 与当前网络匹配
ceph_origin: repository
ceph_repository: community
ceph_stable_release: nautilus
monitor_interface: eth0
public_network: 10.23.0.0/16
radosgw_interface: eth0

cp osds.yml.sample osds.yml
// 添加安装盘信息
devices:
  - /dev/vdb
  - /dev/vdc
  - /dev/vdd
```
回到项目根目录执行安装:
```bash
cp site.yml.sample site.yml
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

<a name="SnsuP"></a>
#### ceph 查看存储池 IO
```bash
ceph osd pool stats
```

<a name="x0FF4"></a>
#### ceph 总体及各存储池使用量
```bash
ceph df detail
```

<a name="XThMD"></a>
#### 删除存储池
```bash
$ ceph tell mon.\* injectargs '--mon-allow-pool-delete=true'
## The following will delete the pool
$ ceph osd pool delete <pool-name> <pool-name> --yes-i-really-really-mean-it
$ ceph tell mon.\* injectargs '--mon-allow-pool-delete=false'
```

<a name="gZ7UD"></a>
#### rados 对象操作
```bash
// 上传文件
rados -p <pool-name> put <object-name> <file>
// 下载文件
rados -p <pool-name> get <object-name> <file>
// 列出文件
rados -p <pool-name> ls
// 删除文件
rados -p <pool-name> rm <object-name>
```

<a name="K2eGm"></a>
#### 挂载 cephfs 到本地
用户态挂载
```bash
yum install ceph-fuse -y
mkdir -p /mnt/cephfs
ceph-fuse -n client.admin --key AQBvN8lbCuTBFhAAJPMWYwu+Jho8B1QGt80jAA== --host 10.23.229.102,10.23.109.25 /mnt/cephfs
```
内核态挂载
```bash
mount -t ceph 192.168.0.1:6789,192.168.0.2:6789:/ /mnt/cephfs -o name=admin,secret=AQATSKdNGBnwLhAAnNDKnH65FmVKpXZJVasUeQ==
```
写入到 fstab 中，开机自动挂载
```
192.168.180.125:6789,192.168.180.115:6789:/ /mnt/cephfs ceph name=admin,secret=AQAoDAZdss8dEhAA1IQSOpkYbJrUN8vTceYKMw==,_netdev,noatime     0 0
```

<a name="0mfaM"></a>
#### 开启存储池 pg_num 自动调整
```
// 启用自动调整模块
ceph mgr module enable pg_autoscaler
// 为已经存在的存储池开启自动调整
ceph osd pool ls | xargs -I {} ceph osd pool set {} pg_autoscale_mode on
// 为后续新创建的存储池默认开启
ceph config set global osd_pool_default_pg_autoscale_mode on
// 查看自动增加的 pg 数量
ceph osd pool autoscale-status
```

<a name="BlwFR"></a>
#### 删除 OSD 节点
参考先删后增节点时如何减少数据迁移：[https://www.cnblogs.com/schangech/p/8036191.html](https://www.cnblogs.com/schangech/p/8036191.html)
```bash
// 停止指定 OSD 进程
systemctl stop ceph-osd@15
// out 指定 OSD
ceph osd out 15
// crush remove 指定 OSD
ceph osd crush remove osd.15
// 删除 osd 对应的 auth
ceph auth del osd.15
// 删除 osd
ceph osd rm 15
// 按照上述步骤删除节点上所有 osd 后，crush remove 指定节点
ceph osd crush rm osd-host
```

<a name="jpOwk"></a>
#### CentOS 安装 ceph-common
```
rpm -Uvh https://download.ceph.com/rpm-nautilus/el7/noarch/ceph-release-1-1.el7.noarch.rpm
// 或使用镜像源
rpm -Uvh https://mirrors.tuna.tsinghua.edu.cn/ceph/rpm-nautilus/el7/noarch/ceph-release-1-1.el7.noarch.rpm
sed -i 's+download.ceph.com+mirrors.tuna.tsinghua.edu.cn/ceph+' /etc/yum.repos.d/ceph.repo
yum -y install epel-release
yum -y install ceph-common
```

<a name="pzQnJ"></a>
#### 查看使用 ceph-volume 创建的 osd 信息
ceph-volume 使用逻辑卷创建 osd，ceph-disk 使用物理盘创建 osd，物理盘创建的 osd 与 盘符对应关系往往一目了然，逻辑卷创建的 osd 与盘符的对应关系需要执行以下命令查询：
```
ceph-volume inventory /dev/sda
```

<a name="RPg2T"></a>
#### /var/lib/ceph/osd/ceph-x 使用内存盘
使用 bluestore 的 OSD，所有需要持久化的数据均存储在 LVM metadata 中，所以 /var/lib/ceph/osd/ceph-x 使用 tmpfs 是预期行为， OSD 启动时会从 metadata 中取出相关数据填充到 tmpfs 文件中。参见：[http://lists.ceph.com/pipermail/ceph-users-ceph.com/2019-February/032797.html](http://lists.ceph.com/pipermail/ceph-users-ceph.com/2019-February/032797.html)

<a name="DcPaA"></a>
#### osd (near) full 的解决方法

- 根本解决之道是添加 osd
- 临时解决方法删除无用数据， osd full 时所有的读写操作都无法进行，可通过两种方法恢复读写：

一是调整 full osd 的权重：`ceph osd crush reweight osd.33 0.7`<br />二是调高 full 的上限：`ceph osd set-full-ratio 0.98`，参见：[no-free-drive-space](https://docs.ceph.com/docs/master/rados/troubleshooting/troubleshooting-osd/#no-free-drive-space)<br />


