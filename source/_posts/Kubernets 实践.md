---
title: "Kubernetes\_实践"
urlname: kgmvfu
date: '2019-11-13 00:00:00 +0800'
layout: post
comments: true
categories: Kubernetes
tags:
  - Linux
  - Kubernetes
keywords: Kubernetes
description: 本文记录 Kubernetes 相关的操作命令和实践方法。
abbrlink: 9caa466a
---


<a name="BdT88"></a>
#### taint

```bash
# 去除所有节点 mater taint 使之可调度
kubectl taint nodes --all node-role.kubernetes.io/master-
# 为节点添加 taint
kubectl taint nodes node1 node-role.kubernetes.io=master:NoSchedule
```

<a name="O6MDK"></a>
#### toleration

```bash
# 容忍所有
tolerations:
- operator: "Exists"
```

<a name="QJzQf"></a>
#### etcd

- 命令行读写

```
export ETCDCTL_API=3
export ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
export ETCDCTL_CERT=/etc/kubernetes/pki/etcd/healthcheck-client.crt
export ETCDCTL_KEY=/etc/kubernetes/pki/etcd/healthcheck-client.key
export ETCDCTL_ENDPOINTS=192.168.180.7:2379,192.168.180.8:2379,192.168.180.9:2379
// 列出所有键值对
etcdctl get "" --prefix=true
etcdctl get "" --from-key
```

- 备份

```
etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt --key=/etc/kubernetes/pki/etcd/healthcheck-client.key snapshot save etcd-snapshot.db
```

- 磁盘读写速度过慢造成的故障

如果 etcd pod 的 log 中会存在大量的类似 “etcdserver: read-only range request "key:..." with result "..." took too long (...) to execute” 的报错，大概率是磁盘损坏造成的读写速度过慢导致的，etcd 的数据存储在 /var/lib/etcd 目录下。

<a name="kPMVq"></a>
#### 证书

- 为 Ingress Host 生成自签名证书
  - 简易方法

参考：[https://kubernetes.github.io/ingress-nginx/user-guide/tls/](https://kubernetes.github.io/ingress-nginx/user-guide/tls/)
```bash
KEY_FILE=dashboard_key
CERT_FILE=dashboard_cert
CERT_NAME=dashboard_tls
HOST=kubernetes-dashboard.test
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ${KEY_FILE} -out ${CERT_FILE} -subj "/CN=${HOST}/O=${HOST}"
kubectl create secret tls ${CERT_NAME} --key ${KEY_FILE} --cert ${CERT_FILE}
```

  - 定制

参考： [https://mritd.me/2017/03/04/how-to-use-nginx-ingress/](https://mritd.me/2017/03/04/how-to-use-nginx-ingress/)
```bash
# 生成 CA 自签证书 ， 也可以直接使用 /etc/kubernetes/pki/ 下的 CA 证书
mkdir cert && cd cert
openssl genrsa -out ca-key.pem 2048
openssl req -x509 -new -nodes -key ca-key.pem -days 10000 -out ca.pem -subj "/CN=kube-ca"

# 编辑 openssl 配置
cp /etc/pki/tls/openssl.cnf .
vim openssl.cnf

# 主要修改如下
[req]
req_extensions = v3_req # 这行默认注释关着的 把注释删掉
# 下面配置是新增的
[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names
[alt_names]
DNS.1 = harbor.sh.umcloud.network
DNS.2 = gitlab.sh.umcloud.network
DNS.3 = minio.sh.umcloud.network
DNS.4 = registry.sh.umcloud.network

# 生成证书
openssl genrsa -out ingress-key.pem 2048
openssl req -new -key ingress-key.pem -out ingress.csr -subj "/CN=kube-ingress" -config openssl.cnf
openssl x509 -req -in ingress.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out ingress.pem -days 365 -extensions v3_req -extfile openssl.cnf
kubectl create secret tls gitlab-ce-gitlab-tls --key ingress-key.pem --cert ingress.pem -n gitlab-ce
```

- 查看证书内容

```
openssl x509 -in ca.crt -text -noout
openssl s_client -showcerts -connect www.baidu.com:443
```

- 检查证书过期时间

```
kubeadm alpha certs check-expiration
```

<a name="xUZC5"></a>
#### Kubeadm

- kubeadm join ... -v 10

kubeadm 添加第二个 master 节点时出现以下错误：
```bash
I0724 10:27:10.396559   31977 token.go:141] [discovery] Requesting info from "https://192.168.2.65:6445" again to validate TLS against the pinned public key
I0724 10:27:10.397359   31977 round_trippers.go:419] curl -k -v -XGET  -H "User-Agent: kubeadm/v1.14.1 (linux/amd64) kubernetes/b739410" -H "Accept: application/json, */*" 'https://192.168.2.65:6445/api/v1/namespaces/kube-public/configmaps/cluster-info'
I0724 10:27:10.403962   31977 round_trippers.go:438] GET https://192.168.2.65:6445/api/v1/namespaces/kube-public/configmaps/cluster-info  in 6 milliseconds
I0724 10:27:10.403989   31977 round_trippers.go:444] Response Headers:
I0724 10:27:10.404036   31977 token.go:147] [discovery] Failed to request cluster info, will try again: [Get https://192.168.2.65:6445/api/v1/namespaces/kube-public/configmaps/cluster-info: x509: certificate has expired or is not yet valid]
```
错误表明 kubeadm 已经成功从 kube-public 命名空间下的 cluster-info confgimap 中获取到了集群信息，然后在验证集群证书的有效性时出错。`x509: certificate has expired or is not yet valid` 一般是由于系统时间错误导致，可以先用 date 命令确定本地时间是否正确。如果本地时间错误，可以尝试使用 ntp 同步系统时间。
```bash
ntpdate cn.pool.ntp.org
// 如果找不到 ntp 命令，可以使用如下的命令进行安装
yum instal ntp
```

<a name="UYIkL"></a>
#### Helm

- 从模板生成本地文件
```
mkdir yamls
helm fetch --untar --untardir . 'stable/redis' #makes a directory called redis 
helm template --output-dir './yamls' './redis' #redis dir (local helm chart), export to yamls dir
```

<a name="aFRRf"></a>
#### 部署

- sealos

开发测试可以使用 [sealos](https://github.com/fanux/sealos) 这个工具，通过离线安装包部署 Kubernetes，省心实用，但是作者在改过的 Kubeadm 代码里夹杂了一些私货令人不喜。

<a name="iiFsk"></a>
#### 十二因素应用

- 十二因素的提出早于 Kubernetes 的大规模使用，但是一些因素和基于 Kubernetes 的服务开发部署有着很好的吻合。可参考： [https://skyao.io/learning-cloudnative/factor/](https://skyao.io/learning-cloudnative/factor/) ，[https://blog.csdn.net/zeb_perfect/article/details/52536411](https://blog.csdn.net/zeb_perfect/article/details/52536411)， [https://12factor.net/](https://12factor.net/)
- 关于基准代码的理解：每个应用应该使用单独的代码仓库，如果多个应用有需要共享的基准代码，则应当将这部分共享代码组织为一个单独的代码仓库。
| Factor | 描述 |
| :---: | :---: |
| Codebase<br />基准代码 | One codebase tracked in revision control, many deploys<br />一份基准代码，多份部署 |
| Dependencies<br />依赖 | Explicitly declare and isolate dependencies<br />显式声明依赖关系 |
| Config<br />配置 | Store config in the environment<br />在环境中存储配置 |
| Backing services<br />后端服务 | Treat backing services as attached resources<br />把后端服务当作附加资源 |
| Build, release, run<br />构建，发布，运行 | Strictly separate build and run stages<br />严格分离构建和运行 |
| Processes<br />进程 | Execute the app as one or more stateless processes<br />以一个或多个无状态进程运行应用 |
| Port binding<br />端口绑定 | Export services via port binding<br />通过端口绑定提供服务 |
| Concurrency<br />并发 | Scale out via the process model<br />通过进程模型进行扩展 |
| Disposability<br />易处理 | Maximize robustness with fast startup and graceful shutdown<br />快速启动和优雅终止可最大化健壮性 |
| Dev/prod parity<br />开发环境与线上环境等价 | Keep development, staging, and production as similar as possible<br />尽可能的保持开发，预发布，线上环境相同 |
| Logs<br />日志 | Treat logs as event streams<br />把日志当作事件流 |
| Admin processes<br />管理进程 | Run admin/management tasks as one-off processes<br />后台管理任务当作一次性进程运行 |

<a name="USMKa"></a>
#### 常用操作

- helm init 使用 azure 镜像

```
helm init --stable-repo-url  http://mirror.azure.cn/kubernetes/charts/
helm repo add incubator http://mirror.azure.cn/kubernetes/charts-incubator/
```

- awk 打印第一列

```
kubectl get pods -n rook-ceph -owide |grep -i Evicted | awk '{print $1}'| xargs kubectl delete pod -n rook-ceph
```

- cut 获取第一列

```
kubectl get pods -n rook-ceph | grep -i Evicted | sed 's/\s\s*/ /g' |cut -d" " -f1 | xargs kubectl delete pod -n rook-ceph --force --grace-period=0
```


