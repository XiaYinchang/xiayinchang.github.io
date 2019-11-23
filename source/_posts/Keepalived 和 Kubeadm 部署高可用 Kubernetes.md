
---

title: Keepalived 和 Kubeadm 部署高可用 Kubernetes

urlname: byko3z

date: 2019-05-31 00:00:00 +0000

layout: post

categories: kubernetes

tags: [kubernetes,云计算]

keywords: kubernetes, kubeadm, keepalived

description: 离线使用 Keepalived 和 Kubeadm 部署高可用 K8S 集群。

---


<a name="df368884"></a>
### 准备 k8s 离线安装包
在 k8s Github 仓库的 [Release 页面](https://github.com/kubernetes/kubernetes/releases) 找到最新稳定版本，点击对应的如  [CHANGELOG-1.14.md](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG-1.14.md#downloads-for-v1142) 链接进入该版本的安装包下载页面。分别下载 AMD64 版本的 Server 和 Node 安装包 [kubernetes-server-linux-amd64.tar.gz](https://dl.k8s.io/v1.14.2/kubernetes-server-linux-amd64.tar.gz) 与 [kubernetes-node-linux-amd64.tar.gz](https://dl.k8s.io/v1.14.2/kubernetes-node-linux-amd64.tar.gz)。然后使用 tar 命令解压缩并将所有文件汇总到一个集中的目录，如下，其中 coredns、etcd 和 pause 的镜像不包含在上述两个压缩包中，需要自行下载：

```bash
#tree -L 2 kubernetes-1.14.2
kubernetes-1.14.2
├── apiextensions-apiserver
├── cloud-controller-manager
├── hyperkube
├── images
│   ├── cloud-controller-manager.tar
│   ├── coredns.tar
│   ├── etcd.tar
│   ├── kube-apiserver.tar
│   ├── kube-controller-manager.tar
│   ├── kube-proxy.tar
│   ├── kube-scheduler.tar
│   └── pause.tar
├── kubeadm
├── kube-apiserver
├── kube-controller-manager
├── kubectl
├── kubelet
├── kube-proxy
├── kube-scheduler
└── mounter
```

<a name="0laqA"></a>
### 准备ansible 环境和脚本


