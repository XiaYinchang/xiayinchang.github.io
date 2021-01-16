---
title: 关于K8S中Pod带宽限制的问题
urlname: kb61zt
date: '2019-01-13 00:00:00 +0000'
layout: post
comments: true
categories: Kubernetes
tags:
  - Kubernetes
  - 云计算
keywords: 'Kubernetes, OpenShift, CNI'
description: 尝试使用K8S的CNI网络插件限制Pod带宽。
abbrlink: 2c3c5a80
---

|    Date    |    Log    |
| :--------: | :-------: |
| 13/01/2019 | 初始版本. |

### 需求

因业务需求，需要对 K8S 集群中 Pod 的出入带宽进行限制，可能是因为该需求并不常见，能找到的参考资料不多，只能结合官网的一些简单说明开始了踩坑探索。

### 方案

根据官网[该章节](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/)的描述，感觉配置过程很简单的样子，总结一下：

- 需要使用 CNI 网络插件，确保 kubelet 的启动参数中有 --network-plugin=cni
- 确保 --cni-conf-dir 和 --cni-bin-dir 存在，默认分别是 /etc/cni/net.d 和 /opt/cni/bin
- 修改 CNI 插件的配置如下：```yaml
  {
  "name": "k8s-pod-network",
  "cniVersion": "0.3.0",
  "plugins":
  [
  {
  "type": "calico",
  "log_level": "info",
  "datastore_type": "kubernetes",
  "nodename": "127.0.0.1",
  "ipam": { "type": "host-local", "subnet": "usePodCidr" },
  "policy": { "type": "k8s" },
  "kubernetes": { "kubeconfig": "/etc/cni/net.d/calico-kubeconfig" },
  },
  { "type": "bandwidth", "capabilities": { "bandwidth": true } },
  ]
  }

````

- 在 Pod 模板中添加以下注解即可：```yaml
apiVersion: v1
  kind: Pod
  metadata:
  annotations:
      kubernetes.io/ingress-bandwidth: 1M
      kubernetes.io/egress-bandwidth: 1M
  ...
````

以上几个条件，前两个已经默认满足，我部署的是 Kubernetes 1.13.1 版本，默认启用 CNI。关于第三个，官网没有说哪些 CNI 可以使用带宽限制，直接给出了一个 calico 的配置示例。因为部署 Kubernetes 时网络插件用的 Flannel ，决定直接改下 Flannel 的配置试试。

### 测试

#### 基于 Flannel 的测试

登录到 master 节点， cd 到 /etc/cni/net.d，果然发现了一个名为 10-flannel.conflist 的配置文件孤零零躺着， cat 一下， 内容如下：

```yaml
{
  "name": "cbr0",
  "plugins":
    [
      {
        "type": "flannel",
        "delegate": { "hairpinMode": true, "isDefaultGateway": true },
      },
      { "type": "portmap", "capabilities": { "portMappings": true } },
    ],
}
```

本着只增不减的原则，在配置中增加了 bandwidth 的配置，变成如下内容：

```yaml
{
  "name": "cbr0",
  "plugins":
    [
      {
        "type": "flannel",
        "delegate": { "hairpinMode": true, "isDefaultGateway": true },
      },
      { "type": "portmap", "capabilities": { "portMappings": true } },
      { "type": "bandwidth", "capabilities": { "bandwidth": true } },
    ],
}
```

然后执行 systemctl restart kubelet 重启了一下 kubelet 。再回头 cat 一下配置文件，发现增加的配置消失了...

猜测难道是因为 bandwidth 插件和 portmap 插件有冲突，然后强大的 K8S 来了个自动还原？

只能把 portmap 插件去掉再试试了... 然后重启 kubelet ，发现这次 bandwidth 没有消失。

配置变为：

```yaml
{
  "name": "cbr0",
  "plugins":
    [
      {
        "type": "flannel",
        "delegate": { "hairpinMode": true, "isDefaultGateway": true },
      },
      { "type": "bandwidth", "capabilities": { "bandwidth": true } },
    ],
}
```

之后创建两个 deployment 测试，分别如下：

无带宽限制的 deployment：

```yaml
piVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: centos-deployment
  labels:
    app: centos
spec:
  replicas: 1
  selector:
    matchLabels:
      app: centos
  template:
    metadata:
      labels:
        app: centos
    spec:
      containers:
        - name: centos
          image: xyc11223344/centos
          command: ["nginx", "-g", "daemon off;"]
          ports:
            - containerPort: 80
```

有带宽限制的 deployment：

```yaml
piVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: centos-deployment-01
  labels:
    app: centos-01
spec:
  replicas: 1
  selector:
    matchLabels:
      app: centos-01
  template:
    metadata:
      labels:
        app: centos-01
      annotations:
        kubernetes.io/ingress-bandwidth: 10M
        kubernetes.io/egress-bandwidth: 10M
    spec:
      containers:
        - name: centos-01
          image: xyc11223344/centos
          command: ["nginx", "-g", "daemon off;"]
          ports:
            - containerPort: 80
```

部署后发现，又出错，提示 no bandwidth plugin 之类的...

想了想难道是没有 bandwidth 二进制包， cd 到 /opt/cni/bin 看了下，果然没有任何名为 bandwidth 的东西...

好吧，去 github 上下吧...

一通乱搜，找到了插件[项目地址](https://github.com/containernetworking/plugins)：

下载了最新 release 的 0.7.4 版本二进制包，解压开一看，无语，还是没有...

难道是我解压姿势不对？仔细看了看项目说明，明明是有的，好吧，看来要自己动手编译了。

编译的过程异乎寻常的顺利，前提是你的机子上已经配置好 Go 的开发环境，只需执行以下命令即可:

```bash
git clone https://github.com/containernetworking/plugins.git
cd plugins
./build_linux.sh
```

很快编译完了，在项目目录下出现了 bin 文件夹， ls 查看一下，有了：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575442963241-bc70c7cc-1ee4-4fb6-aecb-0507f46d33ad.png#align=left&display=inline&height=38&name=image.png&originHeight=38&originWidth=1166&size=27284&status=done&style=none&width=1166)

scp 到 master 节点，放到/opt/cni/bin 目录下。

重启 kubelet，又报错...说是 config version is 0.1.0， plugin supports only [0.3.0, 0.3.1, 0.4.0]

完全摸不着头脑，只能靠猜了...

看了一下上边的 Flannel 配置，貌似没有版本号的信息，猜测没有版本号就意味采用了默认版本号，而默认版本号应该是 0.1.0 ，所以才会有上述错误。继续修改配置为：

```yaml
{
  "name": "cbr0",
  "cniVersion": "0.3.0",
  "plugins":
    [
      {
        "type": "flannel",
        "delegate": { "hairpinMode": true, "isDefaultGateway": true },
      },
      { "type": "bandwidth", "capabilities": { "bandwidth": true } },
    ],
}
```

重启 kubelet ， 等了半天 Pod 还是创建不出来，再次 kubetl get events 看看又 TM 咋了...

报错 no interface 之类的...最后一丝侥幸心理也没了。老老实实换 Calico 吧。

#### 基于 Calico 的测试

网络插件要从 Flannel 换为 Calico ，因为 Kubeadm init 时传进去的是 --pod-network-cidr=10.244.0.0/16 ， 和 Calico 的默认网段不一致，好吧，要替换一下了，执行以下命令：

```bash
# 先卸掉flannel
wget https://raw.githubusercontent.com/coreos/flannel/bc79dd1505b0c8681ece4de4c0d86c5cd2643275/Documentation/kube-flannel.yml
kubectl delete -f kube-flannel.yml
# 删掉丫的防干扰
rm -f /etc/cni/net.d/10-flannel.conflist
# 再装calico
kubectl apply -f https://docs.projectcalico.org/v3.3/getting-started/kubernetes/installation/hosted/rbac-kdd.yaml
wget https://docs.projectcalico.org/v3.3/getting-started/kubernetes/installation/hosted/kubernetes-datastore/calico-networking/1.7/calico.yaml
sed 's/192.168.0.0/10.244.0.0/g' calico.yaml
kubectl apply -f calico.yaml
```

再次进入到 /etc/cni/net.d 目录，惊喜的发现多了两个文件：

```bash
cd /etc/cni/net.d
ls
10-calico.conflist  calico-kubeconfig
```

修改 10-calico.conflist 为如下内容，其实就是增加了 bandwidth 的配置项，去掉了 potmap 的配置项：

```yaml
{
  "name": "k8s-pod-network",
  "cniVersion": "0.3.0",
  "plugins":
    [
      {
        "type": "calico",
        "log_level": "info",
        "datastore_type": "kubernetes",
        "nodename": "10-10-183-55",
        "mtu": 1440,
        "ipam": { "type": "host-local", "subnet": "usePodCidr" },
        "policy": { "type": "k8s" },
        "kubernetes": { "kubeconfig": "/etc/cni/net.d/calico-kubeconfig" },
      },
      { "type": "bandwidth", "capabilities": { "bandwidth": true } },
    ],
}
```

重启 kubelet， 呵呵。Pod 终于 Running 了。
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575442988039-9762993b-8113-4dae-b114-b305332405bd.png#align=left&display=inline&height=74&name=image.png&originHeight=74&originWidth=1218&size=63427&status=done&style=none&width=1218)

```bash
# 执行以下命令进入Pod
kubectl exec -it centos-deployment-01-699f7776f-5j6t5 bash
# 执行以下命令开个iperf server，iperf 什么的提前都装好了
iperf -s
# 另外再开个窗口，执行以下命令进入另一个Pod
kubectl exec -it centos-deployment-57948c8598-jwkpr bash
# 执行以下命令进行测试
iperf -c iperf -c 10.244.1.6 -t 10
```

数据如下:

限速前：

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575443012295-d2bc2306-a82c-4223-95a1-7ca0567eaa11.png#align=left&display=inline&height=127&name=image.png&originHeight=127&originWidth=630&size=45608&status=done&style=none&width=630)

限速后：

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575443032242-0bc4e6c4-f824-4821-b254-2d16eee44ce5.png#align=left&display=inline&height=126&name=image.png&originHeight=126&originWidth=660&size=49857&status=done&style=none&width=660)

啊！真的限速了呢！可这限的什么鬼...

明明说好的 10M，怎么变成了 301K...

难道又是姿势不对？换了好多姿势，可每次数据都是不一样的吊诡...

上网搜吧...找到了一个 Github 上的 [issue](https://github.com/kubernetes/kubernetes/issues/70014) ，和我这个问题的症状相似又不太一样，而且看起来已经关闭了。

难道是我的 Kubernetes 版本太老了， 1.13.1 不是最新的吗？难道有新版本发布了？到 Github 上看了看还真有， 3 天前发布了 1.13.2。

好吧，开始升级：

```bash
# 标准的使用kubeadm部署的集群的升级姿势
kubeadm upgrade apply 1.13.2
# 提示可以升级，但是要先自己升级kubeadm kubelet kubectl
yum install kubeadm
# 提示已经是最新了...看来官方源还没跟上步伐，只能从官网自己下二进制包吧
# 到这里https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG-1.13.md下载最新版的linux-server端二进制包
# 解压后，用新的kubeadm kubectl kubelet 替换旧的
# 注意替换 kubelet 要先执行以下命令停止服务
systemctl stop kubelet
# 替换后执行以下命令重启
systemctl start kubelet
# 所有节点都替换这三大件
# 之后执行以下命令升级集群
kubeadm upgrade plan 1.13.2
```

升级完成之后，重新测试。结果真是忧伤，依然吊诡...

万般无奈之下，找到华为云容器团队的杜大师咨询了一下，大师不愧是大师，秒懂怎么回事儿，并教给我如下命令查看 tc 配置，因为说到底这个带宽限制还是通过 Linux TC 实现的:

```bash
tc qdisc show
```

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575443051065-4bc1bc1a-0b5a-4591-b3df-f57802fc1ff4.png#align=left&display=inline&height=274&name=image.png&originHeight=274&originWidth=823&size=150326&status=done&style=none&width=823)

仔细看最后几行，10M 变成了 10K，和上述 70014 描述的 bug 一致，不过 burst 默认是 214747b 有点吊诡...

好吧，总结一下，功能是有的，只不过还有 bug。

折腾到这里，突然有点怀念 OpenShift ，那就测一下吧。

#### 基于 OpenShift-SDN 的测试

先看一下 openshift 的零件，竟然也是标准 CNI：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575443067485-64bda488-ce15-45e7-9208-97030040af11.png#align=left&display=inline&height=220&name=image.png&originHeight=220&originWidth=586&size=68560&status=done&style=none&width=586)

而且据说不用任何额外配置，直接支持带宽限制。所以，把上面的两个 deployment 直接部署，过了一会儿 Pod 就起来了。
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575443083763-bea1fe29-ae77-4322-bf1f-0d955d4780a8.png#align=left&display=inline&height=74&name=image.png&originHeight=74&originWidth=684&size=42546&status=done&style=none&width=684)

然后跑一下 iperf 试试，数据如下：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575443097570-ef5d3d03-4755-497c-8bbe-6ee3bbb73d03.png#align=left&display=inline&height=127&name=image.png&originHeight=127&originWidth=666&size=79395&status=done&style=none&width=666)

看看这数据，真是相当整齐了，10M 就是 10M。

说到底，还是 OpenShift 好用啊。
