---
title: Kubernetes CSI
urlname: xyrx2u
date: '2019-12-07 00:00:00 +0800'
layout: post
comments: true
categories: Kubernetes
tags:
  - 云计算
  - Kubernetes
keywords: 'Kubernetes, CSI'
description: CSI 是 Kubernetes 对接外部存储的最新规范。
---

#### Volume

在 Kubernetes 中，容器运行结束后其文件系统也随即被销毁，因此无法在容器中直接存储需要持久化的数据；另一方面，Kubernetes 以 Pod 为单位管理多个有一定关联关系的容器，这些容器之间的数据共享也是一个需要解决的一个问题。为此，Kubernetes 中引入了 Volume 的概念，与 Docker 中 Volume 概念的不同之处在于 Kubernetes 中的 Volume 有着完善的生命周期管理，一个 Volume 的生命周期和对应的 Pod 的一致，因此 Pod 中的容器的重启不会造成 Volume 中数据的丢失，且多个容器可以通过挂载同一个 Volume 共享数据，另外单个 Pod 支持使用多个多种类型的 Volume。通过 Volume 的抽象，容器只需要挂载 Volume 到文件系统的某个目录使用它而不必关心 Volume 的存储后端到底是什么类型。

#### 存储插件

Kubernetes 支持的 Volume 存储后端多种多样，包括 RBD/GlusterFS/NFS/azureDisk/awsElasticBlockStore 等各种开源的和来自云厂商的存储产品，为此 Kubernetes 中维护了大量协议相关或是厂商相关的存储插件代码（in-tree，即代码包含在 Kubernetes 核心代码中），它们和 Kubernetes 的核心可执行文件一同维护、编译、构建和交付，这对于 Kubernetes 的核心开发人员以及存储插件开发人员都是不友好的，使得开发和调试过程较为麻烦且存储插件的代码质量难以保证，为此社区最开始引入了  FlexVolume 插件机制（out-tree，Kubernetes 核心代码中只包含作为调用方相关的不变的代码，存储类型相关的代码由存储提供方自行维护），FlexVolume 等同于可被 Pod 直接使用的一种 Volume 后端存储，在执行 Volume 创建和挂载时 Kubernetes 中调用 FlexVolume 的代码依据不同的存储类型调用预先配置好路径的可执行文件完成相关操作，因此 FlexVolume 的工作过程依赖于一系列预先在每台宿主机上预先配置好的可执行文件（例如，使用 Ceph 需要在每个节点上装好 rbd），安装过程极其麻烦。

#### CSI 的引入

CSI(Container Storage Interface) 可以看作是 FlexVolume 的一种升级，其典型区别是 CSI 使用 gRPC 协议调用第三方存储后端而不是直接调用可执行文件，并且 CSI 在接口的标准化和功能特性升级上做了更多优化，并为开发和部署存储插件提供了参考模型，使得存储插件开放人员可以更灵活地开发插件并以 Kubernetes 原生的形式（通过 Deployment 和 DaemonSet 等）来部署插件而不是在宿主机上安装程序包，对于开发和使用群体都更为友好。
CSI 已经被确认为 Kubernetes 主流的存储接口规范，In-tree 的存储插件将逐步迁移至 CSI 方式实现，新的特性将只在 CSI 中增加而不会增加到 FlexVolume 中，未来第三方存储插件将彻底从 Kubernetes 核心代码中移除。  目前 CSI 独有的新特性有：VolumeSnapshot（创建卷快照，并从快照恢复）、Volume clone（从已有卷复制一个新的卷）。
另外非要重要的是，CSI 是由来自 Kubernetes，Mesos， Docker 等社区的成员联合制定的一个行业标准接口规范，这意味存储提供商开发的 CSI 驱动只要稍加修改就可以在不同的平台上使用，大大扩展了 CSI 的用户群体。
CSI 在逻辑上将存储驱动分为两个组件 Controller Plugin 和 Node Plugin：从功能上看，Controller Plugin 与 Kubernetes 控制平面交互，实现 Volume 的创建，Node Plugin 与 Kubelet 协同实现将 Volume 挂载给容器使用；从部署的角度看，Controller Plugin 既可以部署在 Master 节点也可以部署在 Node 节点，一般使用 Deployment 或 StatefulSet 部署，Node Plugin 需要在所有需使用该存储的 Node 上部署，一般使用 DaemonSet 部署。

#### CSI 接口规范

存储驱动需要实现三种 gRPC 服务：Identity Service, Controller Service, Node Service。 Controller Plugin 需要实现  Identity Service 和  Controller Service； Node Plugin 需要实现  Identity Service 和  Node Service。 三种服务定义的基本接口如下：

```protobuf
service Identity {
  // 获取插件的版本和名称
  rpc GetPluginInfo(GetPluginInfoRequest)
    returns (GetPluginInfoResponse) {}

  // 返回插件所支持的功能
  // 主要检测插件是否实现 Controller Service 和是否支持卷访问拓扑限制
  // 插件的相同版本的所有实例，必须返回相同的功能集
  rpc GetPluginCapabilities(GetPluginCapabilitiesRequest)
    returns (GetPluginCapabilitiesResponse) {}

  // 验证插件是否处于健康和就绪状态
  rpc Probe (ProbeRequest)
    returns (ProbeResponse) {}
}

service Controller {
  // 创建卷
  // 请求参数包括：名字、卷容量、卷功能（表明是块存储卷还是文件系统卷，以及访问模式）
  // 、参数、数据源（snapshot,clone），以及卷拓扑限制等
  rpc CreateVolume (CreateVolumeRequest)
    returns (CreateVolumeResponse) {}

  // 删除指定 volume ID 的存储卷
  rpc DeleteVolume (DeleteVolumeRequest)
    returns (DeleteVolumeResponse) {}

  // 使存储卷在某个所需节点上可用即 volume attach
  // 如 Ceph RBD 需要将卷 rbd map 到某个节点上
  rpc ControllerPublishVolume (ControllerPublishVolumeRequest)
    returns (ControllerPublishVolumeResponse) {}

  // 执行 ControllerPublishVolume 相反的操作
  // 使卷在某个节点上不可用，例如将 volume 从某个节点 detach
  rpc ControllerUnpublishVolume (ControllerUnpublishVolumeRequest)
    returns (ControllerUnpublishVolumeResponse) {}

  // 验证预先配置的卷是否满足容器编排系统的需求
  // 可以指定卷功能（表明是块存储卷还是文件系统卷，以及访问模式）、卷属性以及卷拓扑限制等进行验证
  rpc ValidateVolumeCapabilities (ValidateVolumeCapabilitiesRequest)
    returns (ValidateVolumeCapabilitiesResponse) {}

  // 返回所有可用的存储卷，支持分页
  rpc ListVolumes (ListVolumesRequest)
    returns (ListVolumesResponse) {}

  // 返回存储资源池总可用容量。如存储容量有限，则需要执行此操作
  // 假设存储资源池只能提供 1TB 的存储空间,配置和创建新卷时，应检测存储资源池的可用存储容量
  rpc GetCapacity (GetCapacityRequest)
    returns (GetCapacityResponse) {}

  // 返回 Controller 插件支持的功能
  // 比如有些 controller plugin 不支持 GetCapacity，有些则不支持 CreateSnapshot 等
  rpc ControllerGetCapabilities (ControllerGetCapabilitiesRequest)
    returns (ControllerGetCapabilitiesResponse) {}

  // 创建指定 volume ID 的存储快照，用来备份数据
  rpc CreateSnapshot (CreateSnapshotRequest)
    returns (CreateSnapshotResponse) {}

  // 删除指定 ID 的存储快照
  rpc DeleteSnapshot (DeleteSnapshotRequest)
    returns (DeleteSnapshotResponse) {}

  // 返回所有可用的存储快照，支持分页
  rpc ListSnapshots (ListSnapshotsRequest)
    returns (ListSnapshotsResponse) {}

  // 实现磁盘扩容
  // 例如 rbd resize
  rpc ControllerExpandVolume (ControllerExpandVolumeRequest)
    returns (ControllerExpandVolumeResponse) {}
}

service Node {
  // CO 调用此方法以将 volume mount 到指定路径,通常，此路径是节点上的全局路径
  // 此方法调用必须在 NodePublishVolume 之前，NodeStageVolume 是每个卷/每节点执行一次
  // 在 Kubernetes 中，RBD 卷在 attach 到节点后，会将其 mount 到全局目录，然后 mount 到 pod 目录（通过 NodePublishVolume）
  // 两步 mount 操作的原因是因为 Kubernetes 允许多个 pod 使用单个卷
  rpc NodeStageVolume (NodeStageVolumeRequest)
    returns (NodeStageVolumeResponse) {}

  // 执行 NodeStageVolume 相反的操作，从指定目录 unmount 卷
  rpc NodeUnstageVolume (NodeUnstageVolumeRequest)
    returns (NodeUnstageVolumeResponse) {}

  // CO 调用此方法将卷从指定全局路径 mount 到目标路径
  // 通常做的操作是 bind mount，bind mount 允许将路径 mount 到另一个路径
  // 此方法调用必须在 NodeStageVolume 之后，NodePublishVolume 是每个卷/每个工作负载执行一次
  rpc NodePublishVolume (NodePublishVolumeRequest)
    returns (NodePublishVolumeResponse) {}

  // 执行 NodePublishVolume 相反操作，从目标路径 unmount 卷
  rpc NodeUnpublishVolume (NodeUnpublishVolumeRequest)
    returns (NodeUnpublishVolumeResponse) {}

  // 获取指定 Volume 的使用统计信息
  // 包括总容量、可用容量和已用容量
  // 如果 Volume 是以块设备模式使用则不返回可用容量和已用容量
  rpc NodeGetVolumeStats (NodeGetVolumeStatsRequest)
    returns (NodeGetVolumeStatsResponse) {}

  // 实现文件系统扩容
  // 如 xfs_growfs
  rpc NodeExpandVolume(NodeExpandVolumeRequest)
    returns (NodeExpandVolumeResponse) {}

  // 返回 node plugin 支持的功能
  rpc NodeGetCapabilities (NodeGetCapabilitiesRequest)
    returns (NodeGetCapabilitiesResponse) {}

  // 获取 node 节点信息
  // 返回值包括  node ID，节点上最多可发布的 volume 数量，以及 node 可访问的拓扑信息
  rpc NodeGetInfo (NodeGetInfoRequest)
    returns (NodeGetInfoResponse) {}
}
```

#### CSI 插件结构

CSI 规范中要求 gRPC 通信基于 Unix Socket 完成，因此调用方和存储插件需要部署在同一台宿主机上。基于 Kubernetes 集群的安全性考虑，第三方存储厂商提供的驱动被视为不受信任的，因此一般不部署在 Master 节点，即存储驱动中的 Controller Plugin 往往不部署在 Master 节点，但 Kubernetes 控制平面是部署在 Master 节点上的，因此它们之间无法使用基于 Unix Socket 的  gRPC 进行通信，所以需要引入辅助组件实现 Controller Plugin 和 Kubernetes 的协同，辅助组件通过 Kubernetes HTTP API 监听相关对象的变化并通过 gRPC 调用 Controller Plugin 完成 Volume 的创建和删除等操作。而这部分辅助组件的功能对各种第三方存储驱动往往是通用的，所以 CSI 兴趣小组帮助完成了这些辅助组件的开发，存储驱动开发人员只需要将其以 sidecar 的形式引入到部署中即可。

CSI 社区提供的辅助组件如下：

- external-provisioner

如果 CSI 插件提供 CREATE_DELETE_VOLUME 能力，则需实现 Controller Service 的 CreateVolume 和 DeleteVolume 接口。external-provisioner watch 到指定 StorageClass 的 PersistentVolumeClaim 资源状态变更，会自动调用这两个接口。

- external-attacher

如果 CSI 插件提供 PUBLISH_UNPUBLISH_VOLUME 能力，则需实现 Controller Service 的 ControllerPublishVolume 和 ControllerUnpublishVolume 接口。external-attacher watch 到 VolumeAttachment 资源状态变更，会自动调用这两个接口。

- external-snapshotter

如果 CSI 插件提供 CREATE_DELETE_SNAPSHOT 能力，则需实现 Controller Service 的 CreateSnapshot 和 DeleteSnapshot 接口。external-snapshotter watch 到指定 SnapshotClass 的 VolumeSnapshot 资源状态变更，会自动调用这两个接口。

- external-resizer

如果 CSI 插件提供 EXPAND_VOLUME 能力，则需实现 Controller Service 的 ControllerExpandVolume 接口。external-resizer watch 到 PersistentVolumeClaim 资源的容量发生变更，会自动地调用这个接口。

- node-driver-registrar

CSI 插件需实现 Node Service 的 NodeGetInfo 接口后。当 Node Plugin 部署到 kubernetes 的 node 节点时，该 sidecar 会自动调用接口获取 CSI 插件信息，并向 kubelet 进行注册。

- livenessprobe

通过 livenessprobe 辅助组件，kubernetes 即可检测到 CSI 插件相关 pod 的健康状态，当不正常时自动重启相应 pod。
逻辑上独立的 Controller Plugin 和 Node Plugin 可以由一个可执行程序（可称为 CSI Plugin）实现，通过启动参数决定提供 Controller 相关的服务还是 Node 相关的服务，CSI 插件添加辅助组件后，其部署结构如下：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1572510560003-83653de0-138b-4eff-b364-e99bc0d5b2db.png#align=left&display=inline&height=1080&name=image.png&originHeight=1080&originWidth=1920&size=357131&status=done&style=none&width=1920)

#### Ceph CSI 的实现

Ceph CSI 的源代码仓库地址：[https://github.com/ceph/ceph-csi](https://github.com/ceph/ceph-csi)，源码编译后只生成一个可执行文件  cephcsi，根据传入的 --type 参数确定启动 cephfs 还是 rbd 相关的服务， 通过传入的 --nodeserver=true 指明启动 Node Service，通过 --controllerserver=true 致命启动 Controller Service，因此 ceph-csi 通过单一可执行文件同时实现了分别针对 rbd 和 cephfs 提供的 Identity、Controller 和 Node 三种服务。其部署结构和上图基本一致， Controller Service 与社区提供的  csi-provisioner 、csi-snapshotter、csi-attacher 共同组成了一个 StatefulSet , Node Service 与社区提供的 csi-node-driver-registrar 共同组成了一个 Deployment。
Ceph CSI 的代码结构如下，除了一些辅助性的代码，核心代码主要在 cmd 和 pkg 目录下，在 Go 项目中 cmd 目录一般是 main 函数所在的目录，也就是程序的编译和运行入口，所以 ceph csi 最后编译生成一个可执行文件与 cephcsi.go 同名，pkg 目录下则是被 cephcsi 引用的各种包的具体实现，其中 cephfs 目录下包含针对 cephfs 提供的实现 CSI 接口规范的代码， rbd 目录下是针对块存储的代码，csi-common 是共用的代码和类型定义， liveness 是提供 csi 插件存活状态探针的代码：
![DeepinScreenshot_select-area_20191104142608.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1572848810789-0d219333-3ddf-4f8d-bd76-11fb8ae4fcf3.png#align=left&display=inline&height=710&name=DeepinScreenshot_select-area_20191104142608.png&originHeight=710&originWidth=230&size=33434&status=done&style=none&width=230)
cephcsi.go 的引用关系如下图所示， 首先通过 init 函数读取命令行参数并解析存入 config 变量，然后根据配置参数使用 NewDriver 创建不同的 Driver （cephfs 或者 rbd），并调用相关 Driver 的 Run 方法启动 rpc server：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1572859417047-7bdd41d3-eb75-41bf-ac51-1a74c89d486b.png#align=left&display=inline&height=1649&name=image.png&originHeight=1649&originWidth=764&size=325870&status=done&style=none&width=764)

以 rbd Driver 为例，Controller Service 相关接口的实现如下：

- CreateVolume：根据传入的参数执行 rbd create 命令创建 image；
- DeleteVolume：根据传入的参数执行 rbd rm 命令删除 image；
- CreateSnapshot：根据传入的参数先执行 rbd snap create 创建快照，再执行 rbd snap protect 对快照加保护，再通过 rbd snap ls 获取快照信息，取消保护，将快照信息返回给调用方；
- DeleteSnapshot： 根据传入的参数执行 rbd snap rm 删除快照；
- 扩容相关接口未实现。

Node Service 相关接口的实现如下：

- NodeStageVolume：根据传入的参数执行 rbd map 命令将 image 映射为指定节点上的块设备，通过 mkdir 系统调用在指定节点上创建全局挂载目录，根据传入的文件系统类型参数执行 mkfs.\* (ext4, xfs) 命令在 rbd 设备上创建文件系统并将其 mount 到之前创建的全局挂载目录，并将挂载点权限设置为 0777 允许所有容器访问（不安全）。
- NodePublishVolume：根据传入的参数创建针对某个容器的挂载路径，并将  NodeStageVolume 阶段创建的全局挂载路径 bind mount 到该容器路径。
- NodeUnpublishVolume：NodePublishVolume 的逆操作，对容器挂载路径执行 umount 操作并删除路径。
- NodeUnstageVolume：NodeStageVolume 的逆操作，对全局挂载路径执行 umount 操作并删除路径。

Identity Service 接口实现：

- GetPluginCapabilities：返回 rbd Driver 的能力信息，这里返回  PluginCapability_Service_CONTROLLER_SERVICE，表明实现了 Controller Service，特别说明实现了 Controller Service 是因为 Node service 是必须的，而 Controller Service 被设计为可选的。

#### 阅读材料

csi 社区文档：[https://kubernetes-csi.github.io/docs/](https://kubernetes-csi.github.io/docs/)
csi 标准文档： [https://github.com/container-storage-interface/spec/blob/master/spec.md](https://github.com/container-storage-interface/spec/blob/master/spec.md)
