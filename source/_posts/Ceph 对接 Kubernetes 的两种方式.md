---
title: Ceph 对接 Kubernetes 的两种方式
urlname: yek3gp
date: '2019-09-11 00:00:00 +0800'
layout: post
comments: true
categories: Kubernetes
tags:
  - Ceph
  - Kubernetes
keywords: 'Kubernetes,Ceph'
description: 本文讲述Ceph 对接 Kubernetes 的两种方式。
abbrlink: 466a6051
---

#### 准备工作

- 创建 rbd 存储池

```
ceph osd pool create rbd 128 128
rbd pool init rbd
```

- 获取 ceph 集群基本信息

```
# 执行 cat 查看 ceph 配置文件
cat /etc/ceph/ceph.conf

[global]
bluestore block db size = 10737418240
bluestore block fast create = False
bluestore block fast size = 10737418240
cluster network = 10.10.0.0/16
fsid = 5db6cfe0-e485-4884-89eb-8f926fd6d677
mon allow pool delete = True
mon health preluminous compat warning = False
mon host = [v2:10.10.46.236:3300,v1:10.10.46.236:6789],[v2:10.10.66.143:3300,v1:10.10.66.143:6789],[v2:10.10.178.231:3300,v1:10.10.178.231:6789]
mon initial members = u1,u2,u3
mon_max_pg_per_osd = 400
osd pool default crush rule = -1
public network = 10.10.0.0/16
```

由上述信息可知，ceph 集群 clusterid 为  5db6cfe0-e485-4884-89eb-8f926fd6d677，monitor 节点信息为：10.10.46.236:6789，10.10.66.143:6789，10.10.178.231:6789。

- 获取 client.admin keyring

```
➜  ~ cat /etc/ceph/ceph.client.admin.keyring
[client.admin]
	key = AQAheXddCD0xBhAA3KEps1mbPzcJbFVKVpIdMQ==
	caps mds = "allow *"
	caps mgr = "allow *"
	caps mon = "allow *"
	caps osd = "allow *"
```

记录 admin 用户的 key 为  AQAheXddCD0xBhAA3KEps1mbPzcJbFVKVpIdMQ==。

#### In-tree

In-tree 插件是比较早和成熟的方式，调用不同存后端的代码包含在 Kubernetes 核心代码中，缺乏灵活性，不利于更新迭代，而且使用起来比较麻烦，需要在每个需要 PV 的命名空间都创建 role 和 secret key，不建议使用。如需使用，参见  [An Innovator’s Guide to Kubernetes Storage Using Ceph](https://medium.com/velotio-perspectives/an-innovators-guide-to-kubernetes-storage-using-ceph-a4b919f4e469) 。

#### Out-tree

Out-tree 存储插件主要是 CSI ，Kubernetes 核心代码定义了调用接口，具体的实现由第三方插件开发商自行维护，是未来主流的使用方式，目前 Ceph-CSI rbd 相关功能已经 GA。

- 下载最新的 ceph-csi 代码，地址：[https://github.com/ceph/ceph-csi/archive/v1.2.0.tar.gz](https://github.com/ceph/ceph-csi/archive/v1.2.0.tar.gz)
- 解压后目录结构如下：

```
➜  ceph-csi-1.2.0 tree -L 1
.
├── assets
├── cmd
├── deploy
├── deploy.sh
├── docs
├── e2e
├── examples
├── Gopkg.lock
├── Gopkg.toml
├── LICENSE
├── Makefile
├── pkg
├── README.md
├── scripts
├── troubleshooting
└── vendor
```

- 以 rbd 配置为例，先修改  deploy/rbd/kubernetes/v1.14+/csi-config-map.yaml 文件内容，将 ceph 集群信息填写进去：

```
apiVersion: v1
kind: ConfigMap
data:
  config.json: |-
    [
      {
        "clusterID": "5db6cfe0-e485-4884-89eb-8f926fd6d677",
        "monitors": [
          "10.10.46.236",
          "10.10.66.143",
          "10.10.178.231"
        ]
      }
    ]
metadata:
  name: ceph-csi-config
```

- 执行以下脚本进行部署

```
./examples/rbd/plugin-deploy.sh
```

- 创建 rbd-secret

```
kubectl create secret generic csi-rbd-secret --from-literal=adminID="admin" --from-literal=adminKey="AQAheXddCD0xBhAA3KEps1mbPzcJbFVKVpIdMQ==" --from-literal=userID="admin" --from-literal=userKey="AQAheXddCD0xBhAA3KEps1mbPzcJbFVKVpIdMQ=="
```

- 修改 examples/rbd/storageclass.yaml 文件，主要是填上 clusterID

```
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
   name: csi-rbd-sc
provisioner: rbd.csi.ceph.com
parameters:
   # String representing a Ceph cluster to provision storage from.
   # Should be unique across all Ceph clusters in use for provisioning,
   # cannot be greater than 36 bytes in length, and should remain immutable for
   # the lifetime of the StorageClass in use.
   # Ensure to create an entry in the config map named ceph-csi-config, based on
   # csi-config-map-sample.yaml, to accompany the string chosen to
   # represent the Ceph cluster in clusterID below
   clusterID: 5db6cfe0-e485-4884-89eb-8f926fd6d677

   # Ceph pool into which the RBD image shall be created
   pool: rbd

   # RBD image format. Defaults to "2".
   imageFormat: "2"

   # RBD image features. Available for imageFormat: "2"
   # CSI RBD currently supports only `layering` feature.
   imageFeatures: layering

   # The secrets have to contain Ceph credentials with required access
   # to the 'pool'.
   csi.storage.k8s.io/provisioner-secret-name: csi-rbd-secret
   csi.storage.k8s.io/provisioner-secret-namespace: default
   csi.storage.k8s.io/node-stage-secret-name: csi-rbd-secret
   csi.storage.k8s.io/node-stage-secret-namespace: default
   # Specify the filesystem type of the volume. If not specified,
   # csi-provisioner will set default as `ext4`.
   csi.storage.k8s.io/fstype: xfs
   # uncomment the following to use rbd-nbd as mounter on supported nodes
   # mounter: rbd-nbd
reclaimPolicy: Delete
mountOptions:
   - discard
```

- 创建 storage-class

```
kubectl apply -f examples/rbd/storageclass.yaml
```

- 设置该 storage-class 为默认

```
kubectl patch storageclass csi-rbd-sc -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

- 以上部署主要使用了默认值，相关插件都部署在 default 命名空间，可以根据需要进行调整。
