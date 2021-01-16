---
title: K8S PVC 在线扩容
urlname: goqtlq
date: '2019-10-16 00:00:00 +0000'
layout: post
categories: Kubernetes
tags:
  - Kubernetes
  - Ceph
keywords: 'Kubernetes, Ceph'
description: 使用 Ceph 作为 Kubernetes 存储后端时，需要一些配置使其支持对 PVC 的在线扩容。
abbrlink: 99dfe25e
---

1. 创建 storageclass 时加入 allowVolumeExpansion: true 参数。

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd
parameters: ...
provisioner: kubernetes.io/rbd
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

1. 在所有 master 节点上安装好 ceph-common 包，并且拷贝 ceph 配置文件到每个 master 节点的 /etc/ceph 目录，确保 `ceph -s` 能够输出正常的结果。
1. 执行以下命令从某一 kube-controller-manager 容器中拷贝出 kube-controller-manager 可执行文件以备后用：

```
kubectl -n kube-system cp kube-controller-manager-节点名:usr/local/bin/kube-controller-manager .
```

4. 基于 ceph 基础镜像重新打包一个包含有 rbd 命令的 kube-controller-manager 容器镜像。ceph 基础镜像的版本要和部署好的 ceph 集群的版本一致，通过 `ceph -v` 查看版本，例如 ceph 版本是 12.2.4 ，则通过 dockerhub 可以获取到 ceph 12.2.4 的基础镜像：[https://hub.docker.com/r/ceph/ceph-amd64/tags](https://hub.docker.com/r/ceph/ceph-amd64/tags), 然后使用以下 Dockerfile 文件重新打包镜像：

```
FROM ceph/ceph-amd64:v12.2.4-20190828
# 将上一步获取的 kube-controller-manager 与此 Dockerfile 置于同一目录
ADD kube-controller-manager /usr/local/bin/kube-controller-manager
```

5. 使用上述 Dockerfile 执行以下命令打包，镜像名称和标签可以自定义，标签最好和原始的 kube-controller-manager 保持一致：

```
docker build -t kube-controller-manager-ceph-v12.2.4:v1.13.3 .
```

6. 执行以下命令导出镜像并上传至所有 master 节点后倒入：

```
# 导出镜像
docker save kube-controller-manager-ceph-v12.2.4:v1.13.3 | gzip -c > kube-controller-manager.tar.gz
# 上传至 master 节点
scp kube-controller-manager.tar.gz root@master1:.
# 登录至 master 节点并执行以下命令倒入镜像
docker load < kube-controller-manager.tar.gz
# 以上步骤需要在所有 master 节点执行
```

7. 修改 kube-api-server / kube-controller-manager / kubelet 配置以启用 ExpandInUsePersistentVolumes:

/etc/kubernetes/manifests/kube-apiserver.yaml 中添加 feature-gates 参数：

```yaml
...
spec:
  containers:
  - command:
    - kube-apiserver
    ...
    - --feature-gates=ExpandInUsePersistentVolumes=true
```

/etc/kubernetes/manifests/kube-controller-manager.yaml 中添加 feature-gates 参数并替换镜像为之前重新制作的镜像，另外需要将宿主机上的 ceph 配置目录挂载到 kube-controller-manager 容器中：

```yaml
...
spec:
  containers:
  - command:
    - kube-controller-manager
    ...
    - --feature-gates=ExpandInUsePersistentVolumes=true
    image: kube-controller-manager-ceph-v12.2.4:v1.13.3
    ...
    volumeMounts:
    ...
    - mountPath: /etc/ceph
      name: ceph-config
      readOnly: true
  ...
  volumes:
  ...
  - hostPath:
      path: /etc/ceph
      type: Directory
    name: ceph-config
```

以上关于 kube-apiserver 和 kube-controller-manager 的操作需要在所有 master 节点上执行，kubelet 会监听到相关文件的变化并自动应用这些更新。

/etc/systemd/system/kubelet.service.d/10-kubeadm.conf 中更改 ExecStart 项增加 feature-gates 参数：

```
ExecStart=/usr/bin/kubelet --feature-gates=ExpandInUsePersistentVolumes=true ...
```

修改后需要执行以下命令使更改生效：

```
systemctl daemon-reload
systemctl restart kubelet
```

以上关于 kubelet 的修改需要再所有计算节点上执行。 8. 执行完所有以上操作后即可对使用该 storgeclass 的 PVC 进行动态在线扩容。
