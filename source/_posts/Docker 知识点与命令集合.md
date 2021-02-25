---
title: Docker 知识点与命令集合
urlname: ltai3f
date: '2019-12-23 00:00:00 +0800'
layout: post
categories: Docker
tags:
  - Docker
  - "\_云计算"
keywords: Docker
description: Docker 相关的基础知识与常用操作记录。
abbrlink: f8a08eb2
updated: 2020-12-09 00:00:00
---

#### 安装

参考：[清华镜像源](https://mirrors.tuna.tsinghua.edu.cn/help/docker-ce/)，[阿里镜像源](https://developer.aliyun.com/mirror/docker-ce?spm=a2c6h.13651102.0.0.3e221b11R2we8Y)

```bash
yum remove docker docker-common docker-selinux docker-engine
yum install -y yum-utils device-mapper-persistent-data lvm2
wget -O /etc/yum.repos.d/docker-ce.repo https://download.docker.com/linux/centos/docker-ce.repo
sed -i 's+download.docker.com+mirrors.tuna.tsinghua.edu.cn/docker-ce+' /etc/yum.repos.d/docker-ce.repo
yum install docker-ce docker-ce-cli containerd.io
systemctl enable --now docker
```

#### 按指定格式输出 Images 信息

```bash
 docker images --format "{{.ID}}: {{.Repository}}"
```

| Placeholder   | Description      |
| :------------ | :--------------- |
| `.ID`         | Image ID         |
| `.Repository` | Image repository |
| `.Tag`        | Image tag        |

#### 使用镜像源下载 docker image

```bash
docker pull golang:1.13.0 => docker pull docker.mirrors.ustc.edu.cn/library/golang:1.13.0
docker pull rook/ceph:v1.0.6 => docker pull dockerhub.azk8s.cn/rook/ceph:v1.0.6
docker pull gcr.io/kubernetes-helm/tiller:v2.9.1 => docker pull gcr.azk8s.cn/kubernetes-helm/tiller:v2.9.1
docker pull k8s.gcr.io/kube-apiserver:v1.14.1 => docker pull gcr.azk8s.cn/google-containers/kube-apiserver:v1.14.1
docker pull quay.io/k8scsi/csi-node-driver-registrar:v1.1.0 => docker pull quay-mirror.qiniu.com/k8scsi/csi-node-driver-registrar:v1.1.0
```

#### 新建容器时加入已有容器网络

```
docker run --name b2 -it --network container:b1 --rm busybox:latest
```

#### docker 容器的四种网络模型

Bridge, Host, Container, None，参考： [Docker 的网络模式详解](https://zhuanlan.zhihu.com/p/98788162)

#### 查看 docker registry 中的镜像信息

```
curl -X GET https://myregistry:5000/v2/_catalog
curl -X GET https://myregistry:5000/v2/ubuntu/tags/list
```

#### docker 指定 tcp 监听地址

```
// 修改 /usr/lib/systemd/system/docker.service
ExecStart=/usr/bin/dockerd -H tcp://0.0.0.0:2375 -H fd:// --containerd=/run/containerd/containerd.sock
```

#### 删除私有 registry 中损坏的镜像

docker pull 时报错如下：

```bash
[root@umstor01 ~]# docker pull registry.umstor.io:5050/umplus/umstor-elasticsearch:6.7.1
...
filesystem layer verification failed for digest sha256:08f62e37e0f75961adcf1b87778f8c25412a2865742ffe4d79cde83ac08987ca
```

先到仓库目录  `registry/v2/repositories/umplus` 删除  `umstor-elasticsearch` 镜像，再到  `docker/registry/v2/blobs/sha256` 目录删除  `08f62e37e0f75961adcf1b87778f8c25412a2865742ffe4d79c`。之后重启 docker registry 。

#### docker push 时报错 file integrity checksum failed

```bash
➜  umstorlcm git:(dev) ✗ sudo docker push registry.umstor.io:5050/umplus/umstor-elasticsearch:6.7.1
...
file integrity checksum failed for "usr/share/elasticsearch/plugins/opendistro_security/jjwt-api-0.10.5.jar"
```

可尝试执行 `sudo docker system prune -a` 后重新打包或拉取镜像 retag 重试 push。

#### 允许非 root 用户使用 docker

参考：[https://docs.docker.com/engine/install/linux-postinstall/](https://docs.docker.com/engine/install/linux-postinstall/)

```
sudo groupadd docker
sudo usermod -aG docker $USER
newgrp docker
```

#### 使用远程服务器的 docker 服务

```
docker context create my-remote-docker-machine --docker "host=ssh://username@host:port"
```

#### 限制容器 rootfs 可用的磁盘大小

参见：[https://fabianlee.org/2020/01/15/docker-use-overlay2-with-an-xfs-backing-filesystem-to-limit-rootfs-size/](https://fabianlee.org/2020/01/15/docker-use-overlay2-with-an-xfs-backing-filesystem-to-limit-rootfs-size/)，[https://www.thegeekdiary.com/how-to-enable-disk-quotas-on-an-xfs-file-system/](https://www.thegeekdiary.com/how-to-enable-disk-quotas-on-an-xfs-file-system/)

```bash
# 首先 /var/lib/docker 所在分区挂载时应添加 pquota 选项
UUID=.... /home xfs defaults,uquota,pquota 0 0
# 在创建容器时添加指定相关参数
$ sudo docker run -it --storage-opt size=12m alpine:latest /bin/df -h | grep overlay
overlay 12.0M 8.0K 12.0M 0% /
```

#### volume/bind-mount/tmpfs

volume 由 docker 单独管理，存在于 /var/lib/docker/volumes/ 目录，独立于镜像分层，可视为通过硬链接给指定容器使用，因为 stat 看到的 inode 的 link 数量确实大于 1 ，但似乎对目录建立硬链接是不允许的，所以此处存疑。
bind mount 是 Kubernetes 中给容器挂载各种存储卷统一使用的形式。
tmpfs 在 Kubernetes 中用于保存 service token 到临时文件，之后仍然通过 bind mount 挂载给容器使用。

#### 使用 xfs 作为 overlay2 的基础文件系统

d_type (directory type) 是 Linux 内核的一个术语，表示 “目录类型”，是文件系统上目录信息的一个数据结构。d_type，就是这个数据结构的一个字段，这个字段用来表示文件的类型，是文件，还是管道，还是目录还是套接字等。内核从 Linux 2.6 版本开始支持，但有的文件系统未实现。对于 xfs，初始化文件系统时需要传入如下参数（可能在高版本内核中已默认开启？）：

```bash
mkfs.xfs -n ftype=1 /path/to/your/device
```

#### overlay2

以一个容器为例：

```
$ docker inspect 6a7bbe23dee7 | jq '.[0].GraphDriver'
{
  "Data": {
    "LowerDir": "/data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca-init/diff:/data/docker/overlay2/8f864615b27aff6f4bae9898ac47fd42f567b2abb2bd57f0767bf53af7470cd3/diff:/data/docker/overlay2/26ae8de5b32541349d625f7fa86dbe9b17dc304a406a5a557a0565f4df311546/diff:/data/docker/overlay2/be0892cc29599a864b40f886f766a6042a785cdf6a5c9e046661e60c512cb5eb/diff",
    "MergedDir": "/data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca/merged",
    "UpperDir": "/data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca/diff",
    "WorkDir": "/data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca/work"
  },
  "Name": "overlay2"
}
```

上图中可以看到使用了 overlay2，MergedDir 是最终的统一视图，通过 findmnt 命令可进一步查看：

```
$ findmnt -T /data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca/merged --notruncate
TARGET                                                                                        SOURCE  FSTYPE  OPTIONS
/data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca/merged overlay overlay rw,relatime,lowerdir=/data/docker/overlay2/l/65ULPACJJ5HPW6N7X7O4EYT3FV:/data/docker/overlay2/l/NJSWN22VUADQPGUNVHOTOLFIYO:/data/docker/overlay2/l/ST6G6NDPWCA7DOPGPP6YY5ZQTR:/data/docker/overlay2/l/T5DURVHXWM4P7NNCW4H4TYYVSR,upperdir=/data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca/diff,workdir=/data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca/work
```

可以看到 MergedDir 是挂载点，其它的目录分别以 lowerdir/upperdir/workdir 等挂载参数的形式传入，MergedDir/UpperDir/WorkDir 位于同一层，即可写层。进一步查看 overlay2 下的各层信息：

```bash
# 顶层，即可写层，该层写入的内容在 diff 目录下
$ ls /data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca
diff  link  lower  merged  work

# 查看下层信息，显示的是下层的短 ID
$ cat /data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca/lower
l/65ULPACJJ5HPW6N7X7O4EYT3FV:l/NJSWN22VUADQPGUNVHOTOLFIYO:l/ST6G6NDPWCA7DOPGPP6YY5ZQTR:l/T5DURVHXWM4P7NNCW4H4TYYVS

# 通过短 ID 可以分别找到具体的下层，可以看到与 docker inspect 和 findmnt 中显示的层信息一致
$ realpath /data/docker/overlay2/l/65ULPACJJ5HPW6N7X7O4EYT3FV
/data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca-init/diff

# 查看下层的目录结构，和顶层类似但没有 merged 目录
$ ls /data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca-init/
diff  link  lower  work

# 继续查看下层信息，可以看到是记录的下层短 ID 和顶层 lower 记录的剩余 ID 是一致的
$ cat /data/docker/overlay2/15283905a66bcb3cee77c9b03aae27c2d299356ad4a86383f833a218dd924aca-init/lower
l/NJSWN22VUADQPGUNVHOTOLFIYO:l/ST6G6NDPWCA7DOPGPP6YY5ZQTR:l/T5DURVHXWM4P7NNCW4H4TYYVSR

# 继续查看下层目录，发现是一样的
# 只有最下层略有不同，没有 lower 和 work 目录
$ ls /data/docker/overlay2/be0892cc29599a864b40f886f766a6042a785cdf6a5c9e046661e60c512cb5eb
diff  link
```

根据社区文档说明，link 文件中存放当前层的短 ID，lower 文件记录更下层的短 ID，diff 目录存放当前层的内容，work 目录由 OverlayFS 内部使用。

#### 从源码编译 docker 二进制文件

参考：[Compiling and running your own forked Docker release](https://ops.tips/blog/compiling-your-own-forked-docker-release/)

```
git clone https://github.com/docker/docker-ce.git
// 检出目标版本
git checkout v18.09.2
// 按需修改源码
// 执行编译命令
make static DOCKER_BUILD_PKGS=static-linux
// 查看编译结果
tree ./components/packaging/static/build/linux

./components/packaging/static/build/linux
├── docker
│   ├── docker
│   ├── containerd
│   ├── containerd-ctr
│   ├── containerd-shim
│   ├── dockerd
│   ├── docker-init
│   ├── docker-proxy
│   └── docker-runc
└── docker-18.09.2.tgz
```

#### 减少镜像体积的方式

将多个 RUN 语句组合在一行命令中；使用多阶段构建；使用 Alpine 作为基础镜像；使用 Go 等静态编译语言代替 Java 等动态解释语言。

#### COPY 与 ADD

COPY 比 ADD 多两个特性：可以自动解压 src 为 gzip 等压缩格式的文件到 dst 目录；src 路径可以是一个远程 URL 链接。

#### ENTRYPOINT 与 CMD

ENTRYPOINT 必须是可执行的程序，CMD 作为参数传递给 ENTRYPOINT。
