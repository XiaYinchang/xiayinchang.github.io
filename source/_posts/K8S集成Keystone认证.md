
---

title: K8S集成Keystone认证

urlname: ioddt3

date: 2019-02-12 00:00:00 +0000

layout: post

comments: true

categories: Kubernetes

tags: [Kubernetes,云计算,Keystone]

keywords: Kubernetes, Keystone, Authentication

description: 使用 Keystone 管理K8S用户以及认证过程。

---


| Date | Log |
| :---: | :---: |
| 12/02/2019 | 初始版本. |



<a name="b072c805"></a>
### 解决什么问题

本文尝试解决的问题有两个：

- K8S 中虽然有用户的概念，但 K8S 本身并不管理用户以及认证过程，而是提供了多种方式来接入外部用户管理系统。
- K8S 并不能提供物理隔离的多租户能力，但软多租户的实现仍然是有意义的，在一定程度上可以解决每个用户独占一个集群的问题。

上述问题的解决方案其实是很多的，也可以自己开发相应的功能组件，这里选择 Keystone 来解决该问题的原因主要有：

- Keystone 本身是一个非常完备的认证系统，具有完整的域、项目、用户、角色等概念体系和文档完善的 Restful API，可以省去大量的开发工作，尤其适合规模比较小的开发团队拿来即用。
- 大量私有云用户已经使用了 OpenStack 作为基础设施管理平台，在该平台基础上引入 K8S 时可以直接使用 OpenStack中部署好的 Keystone。
- 社区为 K8S 开发了 cloud-provider-openstack，其中就包括对 Keystone 的大量支持性工作，大大降低了用户自行对接使用的难度。
- 我曾经从事过一段时间的基于 OpenStack 的云管平台的开发，对 Keystone 有一定使用经验。

当然，使用 Keystone 的问题也不少，主要有以下几个方面：

- Keystone 本身具有一定的复杂性，有一定的学习成本，一些功能用不到。
- Keystone 的部署也相对麻烦。整个 OpenStack 项目都有着部署麻烦的问题。
- Keystone 在 R 版本之后只支持基于 Fernet 标准的 Token 生成方式。 Fernet token 虽然和 Json Web Token 类似也是一种非持久化 Token，但是其受众群体显然不如 JWT 广，不利于和集群中其它功能模块的集成。一个例子就是，目前 Istio 的认证过程只支持 JWT，这使得无法直接使用 Keystone 作为 Istio 的认证服务器。

要完成整个系统的搭建，显然我们需要进行以下几个步骤：

- 部署一个 K8S 集群；
- 部署 Keystone；
- 部署支撑 Keystone 与 K8S 集成的插件。

在以上步骤中，部署 K8S 相对资料比较齐全，不再赘述，下面主要介绍剩余步骤。


<a name="fb370aed"></a>
### 部署 Keystone

部署 Keystone 是假设用户本身并不具有处于可用状态的 Keystone 服务。

部署 Keystone 可以有多种形式，包括：

- 直接在虚拟机或物理机中部署；
- 使用 Docker 进行容器化部署；
- 在 K8S 集群中部署。

这里在 K8S 集群中部署 Keystone 服务。


<a name="6b097826"></a>
#### Keystone 镜像的构建

OpenStack 容器化部署一直是社区想要解决的问题，Kolla 项目就是为此而生并已经生产可用，但是由于 OpenStack 部署牵涉到的配置选项太多，使用 Kolla 部署仍然没有达到令人欢欣的简单。

我尝试通过 Kolla 生成 Keystone 项目的部署镜像，但是由于国内网络的种种问题以及 OpenStack 的庞大的 Python 依赖体系以及漏洞百出的官方部署文档，该过程并没有顺利完成。

基督徒无奈时应会求助于上帝，程序员无助时多会逛一逛 Github 撞撞运气。

幸运的是我真的找到了一个容器化部署 Keystone 的开源项目，地址[在此](https://github.com/dixudx/keystone-docker)，加上我刚点的星星，总共只有十颗星星，最近更新是18年9月，但文档写的很是详细，决定一试。

把文档读了一遍，开始动手，看到可以设置 Keystone 版本信息，本着不用最新版的程序员不是一个好极客的理念，果断使用 Keystone 最新发布版本 14.0.1。

另外数据库决定使用已经部署在集群中的 TiDB 分布式数据库，因为默认端口是 4000 这个莫名其妙的数字，所以需要改一下该项目中使用到数据库的代码，并在数据库中创建 keystone 用户。之后开始打包镜像，过程很顺利，打包好的镜像上传到了 dockerhub 上 xyc11223344/keystone.


<a name="bb27f7bd"></a>
#### Keystone 部署

部署所用 yaml 文件如下：

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: keystone
---
apiVersion: v1
kind: Service
metadata:
  name: keystone
  namespace: keystone
  labels:
    app: keystone
spec:
  ports:
    - port: 35357
      name: internal
    - port: 5000
      nodePort: 31221
      name: public
  selector:
    app: keystone
  type: NodePort
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: keystone
  namespace: keystone
  labels:
    app: keystone
spec:
  replicas: 1
  selector:
    matchLabels:
      app: keystone
  strategy:
    type: Recreate
  template:
    metadata:
      namespace: keystone
      labels:
        app: keystone
    spec:
      containers:
      - image: xyc11223344/keystone
        name: keystone
        imagePullPolicy: Always
        ports:
        - containerPort: 35357
        - containerPort: 5000
        env:
        - name: KEYSTONE_DB_HOST
          value: "test-tidb.test-tidb"
        - name: KEYSTONE_DB_ROOT_PASSWD_IF_REMOTED
          value: "test"
        volumeMounts:
        - name: tz-config
          mountPath: /etc/localtime
          readOnly: true
      volumes:
        - name: tz-config
          hostPath:
            path: /etc/localtime
```

首次部署后，Pod 一直起不来，kubectl logs 查看 Pod 日志，发现是初始化 Keystone 数据库时报错，提示 Alter database keystone charset 不支持，根据报错信息，发现相关操作在 TiDB 中不兼容，因为 Keystone 本来支持的是 MySQL 数据库，TiDB 虽然号称兼容 MySQL，但是仍然有一些不常用的 DML 操作不支持。

我尝试直接在 Keystone Python 代码中删除掉了该操作，但是再次部署时又出现了其它数据库操作兼容性问题。Keystone 数据库初始化是通过 keystone-manage db_sync 命令执行的，具体的代码我没有去分析，不过从 log 来看，它首先创建了一个空的数据库，然后生成老版本的各个 table ，之后再根据安装的目标版本一步一步升级到最新的，所以出现了大量的数据库变更 ALTER 操作，而不是直接初始化到目标版本完事儿。鉴于此，直接改 Python 代码貌似不可行，转念一想，决定重新部署一个 MySQL 数据库，然后使用该数据库完成初始化工作，获取到最终形态的数据库之后，dump 整个数据库到一个 sql 文件，再导入到 TiDB 数据库中，由于是最终形态，应当不会有 ALTER 操作出现。之后的尝试过程成功进行，获取到了最新版本的数据库 dump 文件，以后部署需要手动导入该文件而不能通过 Keystone 容器启动脚本中的 db_sync 命令完成，虽然解决了兼容性问题，显然该数据库只适应于当前 14.0.1 版本的 Keystone，以后每次更换版本仍然需要重新生成数据库 dump 文件。

解决了数据库问题之后，再次部署，又出现了新的问题，查看 keystone pod log 问题大概是找不到名为 uuid 的 token provider，猜测大概是 OpenStack 升级后配置也发生了一些变化，先到上述开源项目中找到 keystone 配置文件果然找到一段配置，如下：

```toml
[token]
expiration = 3600
provider = uuid
driver = memcache
caching = true
```

显然，问题出在 provider = uuid 这项配置，Google 一下，根据官方文档的说法，从 R 版本开始不再支持 uuid 作为token provider，目前支持 fernet，应当是基于安全和性能考虑作出的变更。

之后将配置更改为：

```toml
[token]
expiration = 3600
provider = fernet
driver = memcache
caching = true
```

重新打包镜像后尝试部署，仍然报错，这次是找不到 fernet 相关的 key 文件，应当是 fernet 需要额外的一些部署操作，查看官方文档后，在镜像启动脚本中添加了以下命令:

```bash
keystone-manage fernet_setup --keystone-user keystone --keystone-group keystone
keystone-manage credential_setup --keystone-user keystone --keystone-group keystone
```

再次重新打包镜像，重新部署，部署成功。curl 访问一下，结果如下：<br />
![](https://ws2.sinaimg.cn/large/007jQb2Zgy1g03rhums9aj30v80lowgm.jpg#align=left&display=inline&height=780&originHeight=780&originWidth=1124&status=done&width=1124)

因为做了一些改动，所以将原来的 keystone 容器化部署开源项目做了一些修改，并提交到了[这里](https://github.com/XiaYinchang/keystone).


<a name="fb97588f"></a>
### 部署 K8S 与 Keystone 集成的支持插件

根据[cloud-provider-openstack](https://github.com/kubernetes/cloud-provider-openstack)的使用说明文档，我们这里主要使用到两个插件：

- k8s-keystone-auth: 实现了Kubernetes webhook authentication 插件接口，将 Keystone 以 webhook 的形式接入到 K8S 认证过程。
- client-keystone-auth: 用于在如 kubectl 等命令行工具端接入 Keystone 认证。


<a name="9bbac6d4"></a>
#### k8s-keystone-auth 的部署

从配置项看，k8s-keystone-auth 的核心功能有三项：接入 Keystone 的认证、接入 Keystone 的鉴权和同步 Keystone 中的项目及角色绑定。其中，接入认证是必选项，其它两项可选。

这里，只使用接入 Keystone 认证和同步 Keystone 中项目及角色绑定两项，鉴权使用 K8S 本身的 RBAC。

同步功能的配置均以 configmap 的形式提供，如下：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: k8s-sync-config
  namespace: kube-system
data:
  syncConfig: |
    data_types_to_sync": ["projects", "role_assignments"]
    "namespace_format": "%n-%i"
    "projects_black_list": []
```

注意，k8s-keystone-auth 必须部署在 kube-system 命名空间中，因为我在查看源代码时发现命名空间被hard coded了。

由于 k8s-keystone-auth 需要使用到命名空间中的默认 serviceaccount 来操作 K8S 集群包括创建命名空间和rolebinding等，所以要为 kube-system:default 服务账户创建 clusterrolebinding，如下：

```bash
kubectl create clusterrolebinding key-auth-cluster-admin --clusterrole=cluster-admin --serviceaccount=kube-system:default
```

另外 K8S 使用 https 协议，所以需要提供 tls 认证证书，这里直接使用 master 节点宿主机上的证书创建一个 secret ，然后挂载到k8s-keystone-auth pod 中使用：

```
kubectl create secret generic keystone-auth-certs --from-file=cert-file=/etc/kubernetes/pki/apiserver.crt --from-file=key-file=/etc/kubernetes/pki/apiserver.key -n kube-system
```

然后，创建 k8s-keystone-auth 的部署文件如下：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: k8s-keystone-auth
  namespace: kube-system
  labels:
    app: k8s-keystone-auth
spec:
  replicas: 2
  selector:
    matchLabels:
      app: k8s-keystone-auth
  template:
    metadata:
      labels:
        app: k8s-keystone-auth
    spec:
      containers:
        - name: k8s-keystone-auth
          image: xyc11223344/k8s-keystone-auth:v1.0
          imagePullPolicy: Always
          args:
            - /bin/k8s-keystone-auth
            - --v=10
            - --tls-cert-file
            - /etc/kubernetes/pki/cert-file
            - --tls-private-key-file
            - /etc/kubernetes/pki/key-file
            - --sync-configmap-name
            - k8s-sync-config
            - --keystone-url
            - http://keystone.keystone:5000/v3
          env:
          - name: KEYSTONE_SYNC_CONFIGMAP_NAME
            value: k8s-sync-config
          volumeMounts:
            - mountPath: /etc/kubernetes/pki
              name: k8s-certs
              readOnly: true
          ports:
            - containerPort: 8443
      volumes:
      - name: k8s-certs
        secret:
          secretName: keystone-auth-certs
---
kind: Service
apiVersion: v1
metadata:
  name: k8s-keystone-auth-service
  namespace: kube-system
spec:
  selector:
    app: k8s-keystone-auth
  ports:
    - nodePort: 32189
      port: 8443
      protocol: TCP
      targetPort: 8443
  type: NodePort
```

第一次部署时使用的是社区提供的 k8scloudprovider/k8s-keystone-auth 镜像，结果部署时一堆报错，先是无法识别 sync-configmap-name 传进去的参数，源代码一看有个很明显的错误，赋值时用错了变量。

没办法重新编译了镜像后尝试部署，又出现报错，干脆直接 panic。看了一下社区源码，有个指针声明一下，未赋值就拿来直接用了，再改了后重新编译，并将镜像传至 xyc11223344/k8s-keystone-auth:v1.0。

再次部署，成功运行起来。然后，需要修改 kube-apiserver的配置文件，使用 webhook 来进行认证。首先，需要创建 webhook 的配置文件如下，需要注意的是 kube-apiserver 是以静态容器的形式启动的，无法访问集群内的服务VIP，所以需要使用 NodePort 来访问刚刚部署好的 k8s-keystone-auth 服务：

```yaml
apiVersion: v1
kind: Config
preferences: {}
clusters:
  - cluster:
      insecure-skip-tls-verify: true
      server: https://10.10.144.75:32189/webhook
    name: webhook
users:
  - name: webhook
contexts:
  - context:
      cluster: webhook
      user: webhook
    name: webhook
current-context: webhook
```

之后将 webhook 配置文件拷贝到每一个 master 节点的 /etc/kubernetes/pki/webhookconfig.yaml 路径， 这是因为该配置文件需要被 kube-apiserver 容器访问到，而 /etc/kubernetes 路径已经以 hostPath 的形式挂载到了 kube-apiserver 容器中，所以放到宿主机上该路径下的文件可以直接被容器访问到。

接下来，更改 kube-apiserver 的启动参数，编辑 /etc/kubernetes/manifests/kube-apiserver.yaml 如下，增加了一行内容：

```
--authentication-token-webhook-config-file=/etc/kubernetes/pki/webhookconfig.yaml
```

![](https://ws4.sinaimg.cn/large/007jQb2Zgy1g03tjttnmrj30z80vc79y.jpg#align=left&display=inline&height=1128&originHeight=1128&originWidth=1268&status=done&width=1268)


<a name="fd1817a9"></a>
#### client-keystone-auth 的部署

先编译出 client-keystone-aut 可执行文件，并放到 master 任意路径，这里放在 /usr/local/bin/client-keystone-auth。然后，执行以下命令创建一个 user ：

```
kubectl config set-credentials admin
```

执行后，查看 ~/.kube/config，发现，多出一个 user，如下：

```
users:
- name: admin
  user: {}
```

修改上述 config 文件如下：

```yaml
users:
- name: admin
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: /usr/local/bin/client-keystone-auth
```

接着执行以下命令：

```
kubectl config set-context --cluster=kubernetes --user=admin keystone-admin@kubernetes
kubectl config use-context keystone-admin@kubernetes
```

此时再执行 kubectl 命令会提示输入 Keystone 相关认证信息。也可以提前设置好如下环境变量：

```
export OS_DOMAIN_NAME=Default
export OS_PROJECT_NAME=admin
export OS_USERNAME=admin
export OS_PASSWORD=test
export OS_AUTH_URL=http://10.10.144.75:31221/v3
export OS_IDENTITY_API_VERSION=3
```

设置好环境变量后使用 kubectl 依然会提示 unauthorized，这是因为 admin 用户并没有权限访问集群资源，admin 用户目前只有权限访问从 keystone 同步过来的项目。执行以下命令，切换 kubectl 认证信息为集群初始的管理员：

```
kubectl config use-context kubernetes-admin@kubernetes
```

此时执行 kubectl get ns 可以发现，keystone 中的项目已经同步过来了，列表中第一个命名空间就是从 Keystone 同步过来的项目，命名规则和我们设置的一致，即项目名-项目ID：<br />
![](https://wx2.sinaimg.cn/large/007jQb2Zgy1g03v1qlgnij30m005o3z5.jpg#align=left&display=inline&height=204&originHeight=204&originWidth=792&status=done&width=792)

刚刚我们说到 keystone-admin[@kubernetes ]() context 只有权限访问从 Keystone 同步过来的项目，也就是这个列表中的第一个命名空间，其它命名空间都是无权限访问的。

另外 kubernetes 中默认已经有 admin 、 edit 和 view 三个clusterrole，而 keystone 默认的三种角色是 admin、 member 和 reader， 为了同步时的一致性，这里将 keystone 中的角色改为和 kubernetes 中一致，如下：<br />
![](https://wx1.sinaimg.cn/large/007jQb2Zgy1g03vpobj52j30lm0h2wgf.jpg#align=left&display=inline&height=614&originHeight=614&originWidth=778&status=done&width=778)

之后，到 admin-b97a1f63205743ce8e33356243774fbc 中查看 rolebinding ：<br />
![](https://ws4.sinaimg.cn/large/007jQb2Zgy1g03vscreo4j310k04s3zl.jpg#align=left&display=inline&height=172&originHeight=172&originWidth=1316&status=done&width=1316)


<a name="9bf2bca6"></a>
### 如何解决了问题

针对文章开篇提到的两个问题，一个是认证系统的问题，一个是软多租户的问题。

针对认证系统的问题，k8s-keystone-auth 插件提供了解决方案。

针对软多租户的问题，可以借由 keystone 的租户管理概念来实现。

而对于 kubectl 命令行工具，client-keystone-auth 插件提供了支持，通过对不同用户可访问命名空间的限制来实现命令行端的权限管控。

