---
title: "Kubernetes\_实践"
urlname: kgmvfu
date: '2019-11-13 00:00:00 +0000'
layout: post
comments: true
categories: Kubernetes
tags:
  - Linux
  - Kubernetes
keywords: Kubernetes
description: 本文记录 Kubernetes 相关的操作命令和实践方法。
abbrlink: 9caa466a
updated: 2021-07-14 00:00:00
---

#### kubectl

```bash
# 使用原始 URL 获取资源信息
kubectl get --raw "/apis/metrics.k8s.io/v1beta1/nodes"
# 定制输出列
kubectl get nodes -o=custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
# 删除所有 evicted pods
kubectl get po --all-namespaces --field-selector 'status.phase!=Running' -o json | kubectl delete -f -
kubectl get pods --all-namespaces | grep Evicted | awk '{print $2 " --namespace=" $1}' | xargs kubectl delete pod
kubectl get pods --all-namespaces | grep -E 'ImagePullBackOff|ErrImagePull|Evicted' | awk '{print $2 " --namespace=" $1}' | xargs kubectl delete pod
kubectl get pods -n rook-ceph | grep -i Evicted | sed 's/\s\s*/ /g' |cut -d" " -f1 | xargs kubectl delete pod -n rook-ceph --force --grace-period=0
# 列出所有位于指定节点的 pod
kubectl get pods --all-namespaces -o wide --field-selector spec.nodeName=10.25.150.64
# 从 cronjob 手动触发一个 job
kubectl create job tmp-daily-report-job-02 --from=cronjob/job-1119051325-app-v1-0  -n data-infra
# 更新镜像
kubectl set image deployment/my-deployment mycontainer=myimage:latest
# 获取某个字段信息
kubectl get deployment nginx-deployment -o jsonpath='{.spec.replicas}'
# 按实际内存使用量排序
kubectl top pod --no-headers --all-namespaces | sort --reverse --key 4 --numeric
# watch pod 变化，并带上时间戳
kubectl get pods --watch-only | while read line ; do echo -e "$(date +"%Y-%m-%d %H:%M:%S.%3N")\t pods\t $line" ; done
# 重启容器
kubectl rollout restart deployment your_deployment_name
# 获取
kubectl get svc pg-debug -n core -o jsonpath='{.spec.ports[].nodePort}'
# 使用 annotation 查询对象
kubectl get deploy -o=jsonpath='{.items[?(@.spec.template.metadata.annotations.prometheus\.io/scrape=="true")].metadata.name}'
```

#### 判断 deploy ready

```bash
kubectl rollout status deployment/<deployment-name>
if [[ "$?" -ne 0 ]] then
    echo "deployment failed!"
    exit 1
fi
```

#### 列出命名空间下所有资源对象

```bash
kubectl api-resources --verbs=list --namespaced -o name | xargs -n 1 kubectl get --show-kind --ignore-not-found -n default
# 或
function kubectlgetall {
  for i in $(kubectl api-resources --verbs=list --namespaced -o name | grep -v "events.events.k8s.io" | grep -v "events" | sort | uniq); do
    echo "Resource:" $i
    kubectl -n ${1} get --ignore-not-found ${i}
  done
}
```

#### Patch 更新的三种操作

如下为 kubectl patch 命令更新资源的基本形式，其中 type 有三种 json/merge/strategic：

```bash
kubectl patch xxxx --type xxxx --patch xxxx
```

标准的 json patch，Content-Type: application/json-patch+json：

```bash
kubectl patch deployments patch-demo --type json --patch '[{"op":"replace", "path":"/spec/replicas", "value":4}]'
```

标准的 json merge patch，Content-Type: application/merge-json-patch+json，执行局部替换：

```bash
$ cat prometheus-patch.yaml
spec:
  template:
    spec:
      containers:
      - image: uhub.service.ucloud.cn/uk8s_public/prometheus:test
        name: prometheus

# 以下命令会将整个 containers 列表替换掉
$ kubectl patch deployment prometheus-k8s --type merge --patch "$(cat prometheus-patch.yaml)"
kubectl patch configmap/coredns -n kube-system --type merge -p '{"data":{"upstreamNameservers":"[\"1.1.1.1\", \"1.0.0.1\"]"}}'
```

JSON strategic merge patch，增量形式更新对象，默认策略是执行替换，实际策略与属性的标签有关：

```bash
$ cat patch-file-containers.yaml
spec:
  template:
    spec:
      containers:
      - name: patch-demo-ctr-2
        image: redis

$ kubectl patch deployment patch-demo --patch "$(cat patch-file-containers.yaml)"
# 可以看到新增了容器，而不是替换了容器列表
$ kubectl get deployment patch-demo -o yaml
   containers:
      - image: redis
        imagePullPolicy: Always
        name: patch-demo-ctr-2
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      - image: nginx
        imagePullPolicy: Always
        name: patch-demo-ctr
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File

 # 这是因为在类型定义的标签中定义了 Containers 属性的 patchStrategy 为 merge，因此未执行默认替换策略
 # 而如果 patch 内容中包含 Tolerations 列表，则 Tolerations 会被替换
 type PodSpec struct {
  ...
  Containers []Container `json:"containers" patchStrategy:"merge" patchMergeKey:"name" ...`
  Tolerations []Toleration `json:"tolerations,omitempty" opt,name=tolerations"`

```

#### taint

```bash
# 去除所有节点 mater taint 使之可调度
  kubectl taint nodes --all node-role.kubernetes.io/master-
# 为节点添加 taint
kubectl taint nodes node1 node-role.kubernetes.io/master=:NoSchedule
```

#### toleration

```bash
# 容忍所有
tolerations:
- operator: "Exists"
```

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
etcdctl get / --prefix --keys-only
etcdctl del /registry/tekton.dev/pipelineruns/cp-2000001293/ --prefix
etcdctl get /registry/pods/cp-2000001293/ --prefix --keys-only | wc -l
```

- 备份

```
etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt --key=/etc/kubernetes/pki/etcd/healthcheck-client.key snapshot save etcd-snapshot.db
```

- 磁盘读写速度过慢造成的故障

如果 etcd pod 的 log 中会存在大量的类似 “etcdserver: read-only range request "key:..." with result "..." took too long (...) to execute” 的报错，大概率是磁盘损坏造成的读写速度过慢导致的，etcd 的数据存储在 /var/lib/etcd 目录下。

- 删除节点

```
etcdctl member list
etcdctl member remove member_id
```

- check cluster health

```bash
etcdctl endpoint health
```

- etcd 故障恢复

注意：对于断电或系统意外崩溃的情况可尝试重启 etcd ，如果重启无法解决再使用备份进行恢复。
参考：[https://blog.csdn.net/dazuiba008/article/details/94595679](https://blog.csdn.net/dazuiba008/article/details/94595679)

#### drain node

```bash
# 不加 --ignore-daemonsets 会因为节点上部署有 daemonset 管理的 Pod 而中止
# 不加 --force 会因为节点上有不属于任何控制器的独立 Pod 而中止
# 不加 --delete-local-data 会因为节点上有 Pod 使用了 emptyDir 或 LocalPV 之类的本地存储而中止
kubectl drain <nodeName> --ignore-daemonsets --force --delete-local-data
```

#### nodeName/nodeSelector/Affinity

直接指定 nodeName 后 Pod 将被视为已调度而不再经过调度器进行调度；nodeSelector 通过节点标签来指定 Pod 调度到相应节点上去，是较为简单的一种方式；Affinity 支持逻辑表达式实现更复杂的调度逻辑，且可设置不具强制性的软亲和，还可以设置 Pod 之间的亲和与反亲和特性。

#### 逻辑上的隔离

可通过配置限制 kubelet 在启动时设置节点的某些具有特殊前缀的标签，例如 `node-role.kubernetes.io/master, node-restriction.kubernetes.io/` 等，这些标签只能在节点加入集群后由具有集群管理员权限的用户添加上去，配合 `nodeSelector/Affinity` 可以实现 Pod 在逻辑上的一种隔离，将具有不同安全等级要求的 Pod 调度到不同的节点上去。

#### 节点状态和 Taint

当节点 Condition 中的最后一项即 Type 为 Ready 这一项，其 Status 值为 False 时，controller-manager 中的 node-controller 会自动为节点添加 key 为 node.kubernetes.io/not-ready 的 taint；当其 Status 值为 Unknown 时，自动添加 key 为 node.kubernetes.io/unreachable 的 taint。当 taint effect 为 NoExecute，会驱逐运行在问题节点上的 Pod。参考：[https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)。

#### Kubernetes-go-client

- 更新 api 对象的两种方式

```go
import (
"k8s.io/apimachinery/pkg/types"
)

patch, err := json.Marshal([]common.JsonPatchSpec{
    {
        Op:    "replace",
        Path:  "/spec/suspend",
        Value: true,
    },
})

_, err = common.CronClient.CronJobs(config.UMStorInfraNamespace).Patch(in.GetName(), types.JSONPatchType, patch)

// 或者使用 update
// 先按需修改 originDeploy 中的内容，关键是要重建 objectmeta
_, err = common.AppsClient.Deployments(config.UMStorInfraNamespace).Update(&k8s_apps_api.Deployment{
    ObjectMeta: k8s_metav1.ObjectMeta{
        Name:            in.Name,
        ResourceVersion: originDeploy.ResourceVersion,
        Labels:          originDeploy.Labels,
    },
    Spec: originDeploy.Spec,
})
```

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

- kubeadm 部署时 config 文件

参考：[https://godoc.org/k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta2](https://godoc.org/k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta2)，kubelet 自定义配置参考：[https://godoc.org/k8s.io/kubelet/config/v1beta1#KubeletConfiguration](https://godoc.org/k8s.io/kubelet/config/v1beta1#KubeletConfiguration)。一个需要注意的地方是
一个单 master 节点集群配置参考，需要注意的是虽然在下面的配置中已经设置了 failSwapOn 为 false，但是 kubeadm 并不会去检测该配置，仍然会报错，不过该报错可以被忽略，因为这个设置随后确实会被添加到 kubelet 的配置中并生效，因此 init 时执行  `sudo kubeadm init --config kubeadm.yml --ignore-preflight-errors=all` 即可：

```bash
apiVersion: kubeadm.k8s.io/v1beta2
imageRepository: gcr.azk8s.cn/google-containers
kind: ClusterConfiguration
kubernetesVersion: v1.16.0
networking:
  serviceSubnet: 10.96.0.0/12
  podSubnet: 10.244.0.0/16
apiServer:
  extraArgs:
    bind-address: 0.0.0.0
    feature-gates: "EphemeralContainers=true"
  extraVolumes:
  - name: "timezone"
    hostPath: "/etc/localtime"
    mountPath: "/etc/localtime"
    readOnly: true
    pathType: File
controllerManager:
  extraArgs:
    bind-address: 0.0.0.0
    feature-gates: "EphemeralContainers=true"
  extraVolumes:
  - name: "timezone"
    hostPath: "/etc/localtime"
    mountPath: "/etc/localtime"
    readOnly: true
    pathType: File
scheduler:
  extraArgs:
    address: 0.0.0.0
    feature-gates: "EphemeralContainers=true"
  extraVolumes:
  - name: "timezone"
    hostPath: "/etc/localtime"
    mountPath: "/etc/localtime"
    readOnly: true
    pathType: File
---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
clusterCIDR: 10.244.0.0/16
iptables:
  masqueradeAll: false
  minSyncPeriod: 0s
  syncPeriod: 30s
ipvs:
  excludeCIDRs: null
  minSyncPeriod: 0s
  scheduler: rr
  syncPeriod: 30s
kind: KubeProxyConfiguration
mode: ipvs
---
apiVersion: kubelet.config.k8s.io/v1beta1
cgroupDriver: systemd
failSwapOn: false
kind: KubeletConfiguration
```

- 内核配置参考

```bash
[xyc-pc ~]# cat /etc/modules-load.d/ipvs.conf
ip_vs
ip_vs_lc
ip_vs_wlc
ip_vs_rr
ip_vs_wrr
ip_vs_lblc
ip_vs_lblcr
ip_vs_dh
ip_vs_sh
ip_vs_nq
ip_vs_sed
ip_vs_ftp
nf_conntrack
br_netfilter

//使其临时生效
ipvs_modules="ip_vs ip_vs_lc ip_vs_wlc ip_vs_rr ip_vs_wrr ip_vs_lblc ip_vs_lblcr ip_vs_dh ip_vs_sh ip_vs_nq ip_vs_sed ip_vs_ftp nf_conntrack br_netfilter";
for kernel_module in ${ipvs_modules}; do modprobe ${kernel_module} > /dev/null 2>&1;done

[xyc-pc ~]# cat /etc/sysctl.conf
net.bridge.bridge-nf-call-iptables=1
net.bridge.bridge-nf-call-ip6tables=1
vm.max_map_count=262144
vm.swappiness=0
net.core.somaxconn=32768
net.ipv4.tcp_syncookies=0
net.ipv4.conf.all.rp_filter=1
net.ipv4.ip_forward=1
net.core.default_qdisc=fq_codel
//使其临时生效
sysctl -p /etc/sysctl.conf
```

#### Helm

- helm init 使用 azure 镜像

```
helm init --stable-repo-url  http://mirror.azure.cn/kubernetes/charts/
helm repo add incubator http://mirror.azure.cn/kubernetes/charts-incubator/
```

- 从模板生成本地文件

```
mkdir yamls
helm fetch --untar --untardir . 'stable/redis' #makes a directory called redis
helm template --output-dir './yamls' './redis' #redis dir (local helm chart), export to yamls dir
```

- 拉取压缩文件到本地

```
helm fetch ucloud/uk8s-etcd-backup
```

- 制作 chart

```bash
➜ tree uk8s-etcd-backup
uk8s-etcd-backup
├── Chart.yaml
├── templates
│   ├── configmap.yaml
│   ├── cronjob.yaml
│   └── secret.yaml
└── values.yaml

helm package uk8s-etcd-backup
```

#### 添加自定义 DNS 记录

```bash
[root@10-8-62-148 ~]# kubectl get cm -n kube-system coredns -oyaml
apiVersion: v1
data:
  Corefile: |
    .:53 {
        errors
        health
        rewrite name harbor.sh.umcloud.network harbor.default.svc.cluster.local
        rewrite name docker.sh.umcloud.network docker.default.svc.cluster.local
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           upstream
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        hosts {
          10.250.11.11 test1.test.com
          10.250.12.64 test2.test.com
          fallthrough
        }
        prometheus :9153
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
kind: ConfigMap
metadata:
  creationTimestamp: "2019-09-05T07:29:37Z"
  name: coredns
  namespace: kube-system

[root@10-8-62-148 ~]# cat umcloud-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: harbor
spec:
  ports:
    - port: 80
      name: http
    - port: 443
      name: https
---
apiVersion: v1
kind: Endpoints
metadata:
  name: harbor
subsets:
  - addresses:
      - ip: 10.8.62.148
    ports:
      - port: 80
        name: http
        protocol: TCP
      - port: 443
        name: https
        protocol: TCP
```

#### 向容器添加 hosts 记录

```bash
apiVersion: v1
kind: Pod
metadata:
  name: hostaliases-pod
spec:
  restartPolicy: Never
  hostAliases:
  - ip: "127.0.0.1"
    hostnames:
    - "foo.local"
    - "bar.local"
  - ip: "10.1.2.3"
    hostnames:
    - "foo.remote"
    - "bar.remote"
  containers:
  - name: cat-hosts
    image: busybox
    command:
    - cat
    args:
    - "/etc/hosts"
```

#### ingress-nginx

- 为转向上游的请求添加 header：

```javascript
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  annotations:
    ingress.kubernetes.io/configuration-snippet: |-
      set $best_http_host "usergate.dev.choicesaas.cn";
      proxy_set_header Host                   $best_http_host;
...
```

- nginx 原样传递编码过的 URL

```
map '' $seed_uri {
    default $request_uri;
}
server {
    listen       8001;
    server_name  _;
    root         /usr/share/nginx/html/;
    location / {
        proxy_set_header Host $http_host;
        proxy_pass http://umstor-rgw-customer.storage-system.svc.cluster.local$seed_uri;
    }
    ...
}
```

- 自定义 timeout

```bash
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "1800"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "1800"
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
```

- 后端服务需要使用 HTTPS 访问

```bash
nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
```

- 透传 TLS 握手

```bash
nginx.ingress.kubernetes.io/ssl-passthrough: "true"
```

- 实现泛域名解析

借助 lua 脚本实现，参考：[https://www.bookstack.cn/read/kubernetes-practice-guide/best-practice-wildcard-domain-forward.md](https://www.bookstack.cn/read/kubernetes-practice-guide/best-practice-wildcard-domain-forward.md)

#### CronJob 与 Job

建议设置  startingDeadlineSeconds 值以防止从最后一次调度到当前时间错过的调度次数超过 100 导致不再进行调度（使用 etcd 备份数据恢复集群时可能出现这种情况），参考：[https://www.jianshu.com/p/3e3b18414e45](https://www.jianshu.com/p/3e3b18414e45)。
job.spec.ttlSecondsAfterFinished 参数有三种选项：不设置，则 Job 不会被自动删除；设置为 0 ，则在 Job 运行完成后立即自动删除；设置为非零值，则在一定时间后自动删除。
cronjob 则通过  cronjob.spec.failedJobsHistoryLimit （默认值为 1 ） 和  cronjob.spec.successfulJobsHistoryLimit （默认值为 3 ） 来控制保存的 Job 数量。
job.spec.template.spec.restartPolicy 设置的是 Pod 的重启策略，在 Job 这种一次性任务的场景中，应当设置为 OnFailure 或者 Never，在 Deployment 场景中应当保持默认值 Always。
job.spec.backoffLimit 设置的次数指的是 Pod 运行失败后，尝试重新创建 Pod 的次数，不包括第一次运行。例如，设置 backoffLimit 为 2 ，则该 job 相关的 Pod 最多会重试三次（通过依次创建 3 个不同的 Pod 实现）。这有别于 job.spec.template.spec.restartPolicy 参数，restartPolicy 是针对同一个 Pod 不停重启重试，而 job.spec.backoffLimit 则是尝试创建新的 Pod。

#### field-selector 和 labels-selector

字段选择器：

```
kubectl get pods --field-selector=status.phase!=Running,spec.restartPolicy=Always
kubectl get statefulsets,services --all-namespaces --field-selector metadata.namespace!=default
```

标签选择器：

```
kubectl get pods -l environment=production,tier=frontend
kubectl get pods -l 'environment in (production),tier in (frontend)'
kubectl get pods -l 'environment in (production, qa)'
kubectl get pods -l 'environment,environment notin (frontend)'
# 也可以仅使用标签名选择，而不必指定标签值
kubectl get cm -n monitoring -l prometheus-name
```

#### 使用 subPath 挂载 Volume

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  selector:
    matchLabels:
      app: mysql
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - image: mysql:5.6
        name: mysql
        env:
          # Use secret in real usage
        - name: MYSQL_ROOT_PASSWORD
          value: password
        ports:
        - containerPort: 3306
          name: mysql
        volumeMounts:
        - name: mysql-configmap-volume
          mountPath: /etc/mysql/conf.d/binlog_format.cnf
          subPath: binlog_format.cnf
      volumes:
      - name: mysql-configmap-volume
        configMap:
          name: mysql-configmap
          items:
          - key: mysql_binlog_format.cnf
            path: binlog_format.cnf
```

#### 创建并使用 imagePullSecrets

```
// 创建 secret
kubectl create secret docker-registry my-registry --docker-server=my.private.registry --docker-username=test --docker-password=test
// 在 default service account 中使用
[root@cicd03 ~]# kubectl get serviceaccount default -oyaml
apiVersion: v1
imagePullSecrets:
- name: my-registry
kind: ServiceAccount
metadata:
  name: default
  namespace: default
secrets:
- name: default-token-l9xgs
```

#### sealos 部署 Kubernetes

开发测试可以使用 [sealos](https://github.com/fanux/sealos) 这个工具，通过离线安装包部署 Kubernetes，省心实用，但是作者在改过的 Kubeadm 代码里夹杂了一些私货令人不喜。

- 离线安装包下载链接
  | 1.17.0 | [https://sealyun.oss-cn-beijing.aliyuncs.com/413bd3624b2fb9e466601594b4f72072-1.17.0/kube1.17.0.tar.gz](https://sealyun.oss-cn-beijing.aliyuncs.com/413bd3624b2fb9e466601594b4f72072-1.17.0/kube1.17.0.tar.gz) |
  | --- | --- |
  | 1.17.1 | [https://sealyun.oss-cn-beijing.aliyuncs.com/9347ea4e446ce514dbba6f686034a363-1.17.1/kube1.17.1.tar.gz](https://sealyun.oss-cn-beijing.aliyuncs.com/9347ea4e446ce514dbba6f686034a363-1.17.1/kube1.17.1.tar.gz) |
  | 1.19.0 | [https://sealyun.oss-cn-beijing.aliyuncs.com/c937a97b72d16653ef25b0b54bdc7131-1.19.0/kube1.19.0.tar.gz](https://sealyun.oss-cn-beijing.aliyuncs.com/c937a97b72d16653ef25b0b54bdc7131-1.19.0/kube1.19.0.tar.gz) |

- 添加 master 节点

```
// 先安装好 docker， 参见：https://docs.docker.com/install/linux/docker-ce/centos/
systemctl enable --now docker
// 从集群内节点拷贝离线安装包并解压缩
scp 192.168.180.8:./kube1.15.0.tar.gz .
tar zxvf kube1.15.0.tar.gz
// 执行初始化操作
chmod +x ./kube/shell/init.sh
cd kube/shell
./init.sh
// 在 hosts 文件中加入 apiserver 解析
echo '192.168.180.7 apiserver.cluster.local' >> /etc/hosts
// 获取 cert-key
kubeadm init phase upload-certs --upload-certs
// 获取加入集群的命令
kubeadm token create --print-join-command
// 拼出 master 节点加入集群的命令并执行
kubeadm join apiserver.cluster.local:6443 --control-plane --certificate-key $CERT_KEY --token f0d79y.lekvh1338tye45d0 --discovery-token-ca-cert-hash sha256:33d4cbc2207ad24c551cbdd0d5b9c70cf42232795d87d7c30054ddb8773c99f6
// 加入成功后替换解析地址为本机 IP
```

#### 优雅地删除节点

删除 master 节点时注意可能需要手动修改  kubeadm-config 中的配置，同时手动修改  /etc/kubernetes/manifests/etcd.yaml 文件移除相关 IP。

```
kubectl get nodes
kubectl drain <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-local-data
kubectl delete node <node-name>
```

#### 重启容器而非删除

删除容器后会重新进行调度，如果希望在同一个宿主机上重新拉起容器可以执行如下命令：

```bash
# 在容器中执行如下命令，会使容器重新创建，但不会重新调度
kill 1
```

但需要注意的是，上述命令会造成容器重建，所以在容器中进行的非持久修改均会丢失，若想保留临时修改，可先找到容器所在宿主机，然后登录到宿主机上执行 `docker restart` 重启会保留临时修改，往往用于调试场景。

#### ServiceAccountTokenVolumeProjection 生成有时效的 Token

参考：[https://developer.aliyun.com/article/742572](https://developer.aliyun.com/article/742572)，[https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#service-account-token-volume-projection](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#service-account-token-volume-projection),[https://www.alibabacloud.com/help/zh/doc-detail/160384.htm](https://www.alibabacloud.com/help/zh/doc-detail/160384.htm)
kube-apiserver
![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1586427070015-35b14a0a-4cf8-48cf-ae25-db4531f0b8b1.png#crop=0&crop=0&crop=1&crop=1&height=824&id=iJVjL&margin=%5Bobject%20Object%5D&name=image.png&originHeight=824&originWidth=983&originalType=binary∶=1&rotation=0&showTitle=false&size=117967&status=done&style=none&title=&width=983)

```
--service-account-issuer=kubernetes.default.svc \
--service-account-signing-key-file=/etc/kubernetes/ssl/ca-key.pem \
--api-audiences=kubernetes.default.svc \
--feature-gates=BoundServiceAccountTokenVolume=true \
```

kube-controller-manager
![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1586427180951-d8f9d830-5f94-4bb3-bbd6-640dd513b3f2.png#crop=0&crop=0&crop=1&crop=1&height=363&id=FIfGF&margin=%5Bobject%20Object%5D&name=image.png&originHeight=363&originWidth=924&originalType=binary∶=1&rotation=0&showTitle=false&size=65129&status=done&style=none&title=&width=924)

```
--controllers=*,bootstrapsigner,tokencleaner,root-ca-cert-publisher \
--feature-gates=BoundServiceAccountTokenVolume=true \
```

示例

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
    - image: uhub.service.ucloud.cn/wxyz/etcd:3.4.3
      command: ["ping"]
      args:
        - 10.13.97.88
      name: etcd
      volumeMounts:
        - mountPath: /var/run/secrets/tokens
          name: vault-token
  serviceAccountName: build-robot
  volumes:
    - name: vault-token
      projected:
        sources:
          - serviceAccountToken:
              path: vault-token
              expirationSeconds: 600
              audience: vault
```

#### kube-controller-manager 10252 port in use 

在一定的概率下启动 kube-controller 会出现所需端口已被 kube-apiserver 占用的情况，这是因为 kube-apiserver 向内核申请一个随机端口用于和 etcd 通信，而恰好该端口是稍后 kube-controller-manger 所需的，由于多次出现这种巧合情况，所以对随机算法仍存疑？临时解决方法是调整随机端口范围，避开 10252 端口：

```yaml
net.ipv4.ip_local_port_range="12000 65535"
```

#### kubelet 启动时持续报错 node not found

一般在经过几次报错后等节点注册成功就会正常，但是有些时候会出现持续报错，此时需要注意的是在 node not found 之前出现的错误，一般解决了这些前置错误就可以了。

#### 编译带 debug 信息的 kubernetes 组件

修改 `hack/lib/golang.sh`  文件，将 `goldflags="${GOLDFLAGS:-} -s -w $(kube::version::ldflags)"` 修改为 `goldflags="${GOLDFLAGS:-} $(kube::version::ldflags)"`。

```bash
// 执行以下命令编译所需二进制程序：
make hyperkube GOGCFLAGS="all=-N -l" GOLDFLAGS=""
// 执行以下命令开始调试
dlv exec ./hyperkube
```

#### subpath 挂载 configmap 文件不能自动更新的问题

参考：[https://github.com/kubernetes/kubernetes/issues/50345#issuecomment-391888999](https://github.com/kubernetes/kubernetes/issues/50345#issuecomment-391888999)，不使用 subpath，另建一个目录专门挂载 configmap，从而不会覆盖原目录及其文件，在原目录建一个符号链接指向 confgimap 挂载路径，从而能够利用到自动更新机制。

#### OOM 时 PreStop 钩子无法发挥作用

当 Pod 内存使用超出 Limit 时，会被内核 oom_killer 杀死，此时由于不是通过 apiserver 发出的删除 pod 调用也不是 Pod 自身的主动终止，所以 PreStop 并不会被触发，为了能够在内存使用超限被杀死前触发 PreStop，一种 walkaround 是通过一个监测内存使用量的程序在内存即将超限（例如 95% ）之前实施自杀，从而能够触发 PreStop ，可参考 ：[https://github.com/16Bitt/kubemem](https://github.com/16Bitt/kubemem)。

#### 在容器内修改系统参数

大多数 namespace 级别的系统参数是安全的，可通过以下方式修改：

```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx
  name: centos-deployment
  namespace: default
spec:
  selector:
    matchLabels:
      app: centos
  template:
    metadata:
      labels:
        app: centos
    spec:
      securityContext:
        sysctls:
          - name: kernel.shm_rmid_forced
            value: "1"
      containers:
      ...
```

对于非安全的 namespace 级别的参数需在 kubelet 启动参数中启用后才能进一步设置，`kubelet --allowed-unsafe-sysctls 'kernel.msg*,net.core.somaxconn'`。
对于非安全的且为非 namespace 级别的内核参数，只能在宿主机上修改或者给容器添加特权后进入容器修改：

```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx
  name: centos-deployment
  namespace: default
spec:
  selector:
    matchLabels:
      app: centos
  template:
    metadata:
      labels:
        app: centos
    spec:
      containers:
        - image: 'uhub.service.ucloud.cn/ucloud/centos6-ssh:latest'
          imagePullPolicy: Always
          name: centos
          ports:
            - containerPort: 80
              protocol: TCP
          securityContext:
            privileged: true
```

#### Pod SecurityContext 和 Container SecurityContext

参考：[https://medium.com/kubernetes-tutorials/defining-privileges-and-access-control-settings-for-pods-and-containers-in-kubernetes-2cef08fc62b7](https://medium.com/kubernetes-tutorials/defining-privileges-and-access-control-settings-for-pods-and-containers-in-kubernetes-2cef08fc62b7)

#### DaemonSet 的调度

DaemonSet 相关的 Pod 并不由 kube-scheduler 进行调度，而是由 kube-controller 中的  DaemonSet controller 进行创建和调度，一般的 Pod 总是创建之后先进入 Pending 状态，而 DaemonSet 相关的 Pod 并没有 Pending 状态，Pod 优先级和抢占由 kube-scheduler 去执行，DaemonSet controller 并不会考虑这些，当然也可以通过一些设置（待补充）让调度工作由 kube-scheduler 去完成。DaemonSet controller 会自动为相关 Pod 添加一系列 toleration（包括对网络分区的容忍，对一些节点不可调度状态的容忍等），会造成 cordon 操作无法对 DaemonSet Pod 生效。参考：[https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/#taints-and-tolerations](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/#taints-and-tolerations)

#### Pod 终止信息

可以在 Pod 意外终止时，向 /dev/termination-log 文件中写入终止原因，方便 Kubernetes 获取信息并填入 Pod 状态字段中。通过以下方式可获取终止原因：

```
kubectl get pod termination-demo -o go-template="{{range .status.containerStatuses}}{{.lastState.terminated.message}}{{end}}"
```

另一方面可以通过 Pod.Spec.Containers[0].terminationMessagePath 自定义文件路径（默认是 /dev/termination-log ），也可以将  Pod.Spec.Containers[0].terminationMessagePolicy 设置为  FallbackToLogsOnError 告诉 Kubernetes 在指定文件内容为空且容器错误退出时，从容器日志中获取最后一段日志信息作为终止信息。参考：[https://kubernetes.io/docs/tasks/debug-application-cluster/determine-reason-pod-failure/](https://kubernetes.io/docs/tasks/debug-application-cluster/determine-reason-pod-failure/)

#### Kubernetes log 等级

一般调试开到 5 级即可，参考：[https://github.com/kubernetes/community/blob/master/contributors/devel/sig-instrumentation/logging.md](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-instrumentation/logging.md)。可通过 HTTP 接口热更新日志级别：

```bash
# 调整日志级别到3
curl -X PUT http://127.0.0.1:8081/debug/flags/v -d "3"
```

#### coredns

coredns 支持多种数据来源插件，对于 Kubernetes 的支持是通过 watch Service/Pod/Endpoints/Namespaces 资源动态增删解析记录实现的。
coredns 实现泛域名解析

#### 让 Pod 在节点上均匀分布

在默认的调度策略下，优先考虑到的是资源使用比例的均衡，所以同一个 Deployment 所属的多个 Pod 副本可能集中分布在个别节点上，为了使 Pod 能够在拓扑结构上均匀分布到各个节点上，有两个策略可以考虑：

- 当 Pod 副本数少于节点数量时，可为 Pod 添加 Pod 之间的反亲和性避免同类 Pod 调度到同一个节点上；
- 当 Pod 副本数比节点数量多时，反亲和性可能导致节点无处调度，或者仍然出现多个 Pod 调度到同一节点，一种更为通用的做法是使用 1.16 版本开始引入的 PodTopologySpreadConstraints，可以为 Pod 设置如下属性：

```bash
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    k8s-app: uk8s-kubectl
  name: uk8s-kubectl
spec:
  replicas: 18
  selector:
    matchLabels:
      k8s-app: uk8s-kubectl
  template:
    metadata:
      labels:
        k8s-app: uk8s-kubectl
    spec:
      topologySpreadConstraints:
      - topologyKey: "kubernetes.io/hostname" # 以节点为粒度，也可以是 region、zone
        maxSkew: 1 # 允许的节点之间 Pod 数量的最大偏差
        whenUnsatisfiable: ScheduleAnyway # 当节点偏差大于设定值时的调度策略
        labelSelector:  # 选中需应用此规则的 Pod
          matchLabels:
            k8s-app: uk8s-kubectl
      ...
```

#### 升级 Kubernetes 组件和 etcd

参考：[https://platform9.com/blog/kubernetes-upgrade-the-definitive-guide-to-do-it-yourself/](https://platform9.com/blog/kubernetes-upgrade-the-definitive-guide-to-do-it-yourself/)

#### 查看 Kubernetes 每个版本的发布日志

[https://relnotes.k8s.io/](https://relnotes.k8s.io/)

#### 为系统关键组件设置高优先级

对于部署于集群中的关键组件如 CoreDNS，可通过为 Pod 设置 priorityClassName: system-cluster-critical，来提高优先级，降低集群资源不足时被驱逐后持续 Pending 的概率，system-node-critical 优先级最高，高于 system-cluster-critical。

#### kube-proxy 的 nftables 实现

[https://github.com/zevenet/nftlb](https://github.com/zevenet/nftlb)，[https://github.com/sbezverk/nfproxy](https://github.com/sbezverk/nfproxy)，[https://github.com/zevenet/kube-nftlb](https://github.com/zevenet/kube-nftlb)

#### Service Topology

用于按照节点物理拓扑分发 ClusterIP 或 NodePort 类型的 Service 流量到不同的 Endpoint 去，例如：可以指定集群内 client 端的请求优先分发到同一宿主机或同一机房的 server 端 Pod 去：

```bash
# 本例中优先将流量分发至同一宿主机，其次是同一机房，然后是同一地域，最后回退到默认策略
# 若没有最后的 * 号，则会丢弃该请求
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 9376
  topologyKeys:
    - "kubernetes.io/hostname"
    - "topology.kubernetes.io/zone"
    - "topology.kubernetes.io/region"
    - "*"
```

#### Node Conditions

节点 NetworkUnavailable 是否为 True 是通过检查节点上有没有配置好 Pod 网段的路由确定的。节点 Ready Condition 值为 False 说明出现了磁盘、内存或网络等问题， Ready Condition 值为 Unknown 是因为 kubelet 超过 node-monitor-grace-period （默认 40s）没有上报节点状态信息。当 Ready Condition 保持 False 或者 Unknown 超过 pod-eviction-timeout （默认 5 分钟）则 Node controller 将该节点上的 Pod 设置为待删除，若此时节点不可达，API server 无法与 kubelet 通信，则 Pod 将维持 Terminating 或 Unknown 状态直到节点被管理员手动从集群中删除或者节点重新可达。参考：[https://kubernetes.io/docs/concepts/architecture/nodes/#condition](https://kubernetes.io/docs/concepts/architecture/nodes/#condition)。

#### 多租户的思考

从 Kubernetes 网络模型的角度来看，Kubernetes 至多实现逻辑上的多租户隔离。多租户的第一步，需要接入用户管理与认证中心，可通过 OpenID 的方式接入；通过 RBAC 控制用户的操作权限，限定用户可以操作的命名空间和资源类型；通过 NetworkPolicy 控制 Pod 之间的网络通信；通过 ResourceQuota 限制 CPU 之类资源的用量和资源对象的数量，从而保证资源使用的公平性；通过 PodSecurityPolicy 限制安全敏感的 Pod 相关字段的设置，如命名空间、系统调用、特权等级；通过 Pod 之间的反亲和性避免不同用户的 Pod 调度到同一节点；通过亲和性或者污点与容忍将特定用户的 Pod 调度到特定节点；引入分层的命名空间实现权限在父子命名空间之间的继承；使用 firecracker 之类的轻量级虚拟机实现 runtime 提升隔离性；进一步可引入 Open Policy Agent 进行应用层的权限验证。

#### 删除命名空间卡在 Terminating

首先要检查命名空间下所有资源删除成功，接下来有两种处理方式：一种是强制删除命名空间，通过如下命令移除所有 finalizer ：

```
for ns in $(kubectl get ns --field-selector status.phase=Terminating -o jsonpath='{.items[*].metadata.name}'); do  kubectl get ns $ns -ojson | jq '.spec.finalizers = []' | kubectl replace --raw "/api/v1/namespaces/$ns/finalize" -f -; done
```

另一种是查看命名空间 Status 中的 Conditions 信息，找到导致命名空间删除失败的具体原因，进而解决问题后自动删除。

#### Containerd 导出镜像

```
crictl images | grep -v IMAGE | grep -v ucloud | awk '{print $1,$2}' | while read image tag; do
  name=`echo $image | awk -F "/" '{print $NF}'`
  new_name="uhub.service.ucloud.cn/wxyz/"$name":"$tag
  ctr --namespace k8s.io images tag $image":"$tag $new_name
  mkdir -p /tmp/tars
  ctr --namespace k8s.io images export "/tmp/tars/"$name"."$tag".tar" $new_name --platform x86_64
  sshpass -p uk8s-r00tme scp -o StrictHostKeyChecking=no -r /tmp/tars 10.8.25.22:/root/tars
done
```

#### Pod 创建过程简析

使用 kubectl apply 命令时，kubectl 首先从服务端拉取完整的 Kubernetes OpenAPI 定义，然后尝试查询待创建的资源是否已存在，未存在则执行 Post 创建，已存在则与本地文件比较是否需要更新，需要更新则执行 Patch 操作；kube-scheduler watch 到 Pod 创建，则执行调度过程将其调度到某一节点上；kubelet watch 到有 Pod 调度过来，则执行创建过程拉起 Pod。

#### Liveness, Readiness and Startup Probes

readinessProbe 用来确定服务是否可以接受用户请求，endpoint controller 据此增减 pod ip；livenessProbe 用来确定 Pod 是否存活，kubelet 据此决定是否重启 Pod；readinessProbe 与 livenessProbe 可同时使用，均为持续性检测，可设置检测周期以及失败和成功次数的阈值；startupProbe 用于启动时间较长的 Pod，仅在 Pod 启动时检测，并且启用时 readinessProbe 与 livenessProbe 均被禁用。参考：[https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)。

#### Pod 的删除流程

执行 kubectl delete pod , kubectl 向 api server 发起 Delete 请求；api-server 更新 Pod 信息设置 deletionTimestamp 和 deletionGracePeriodSeconds，Phase 可能仍然是 Running ，不发生变化；kubelet watch 到 Pod 变化，然后开始执行 graceful 删除过程；controller manager watch 到 Pod 变化，从 endpoint 中删除 pod，触发 kube-proxy 更新规则；最后，kubelet 触发 api-server 删除 Pod 对象，这样一个同名的 Pod 可以安全地重建。强制删除会导致 api-server 不等待 kubelet 确认删除 Pod 而直接删除对象，此时允许立即新建一个同名的 Pod，对于 StatefulSet 的应用来说是危险的。

#### Pod 与 Container 状态

Pod 的 Phase 字段标识 Pod 状态，kubectl get pod 展示的 Status 列并不一定与 Phase 字段一致，而是由 api-server 通过一系列规则计算得到并返回给 kubectl 的，参考代码 [printPod](https://github.com/kubernetes/kubernetes/blob/36f571404fcb136011024b89efaa2a0d089acd5f/pkg/printers/internalversion/printers.go#L740)，例如当 Pod 的 DeletionTimestamp 字段不为空且节点可达时计算得到的 Status 为 Terminating ；Pod 的 Phase 参考 [https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-phase](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-phase)。

#### 日志收集

日志可大致分为应用日志、K8S 组件日志、Linux 系统日志，另外还有 K8S Events 、APIServer 审计日志也有分析价值，一般可使用 Filebeat 以 DaemonSet 的形式部署到各个节点收集日志，再推送到 Logstash 进行过滤聚合后，推送到 Elasticsearch 进行存储，最后使用 Kibana 查看日志；也可以使用更轻量的 Promtail、Loki、Grafana 的组合。

#### 已用内存的计算

Kubelet 获取的已用内存的值来自于 cgroup `memory.usage_in_bytes - memory.stat.total_inactive_file` ，total_inactive_file 被包含在 cache 中，实际上 total_active_file 也是包含在 cache 中，在 Linux 内存管理中，一个文件被读或写两次就会被放入 active_file_list，active_file 也可以被回收从而释放内存。相关的讨论参见：[https://github.com/kubernetes/kubernetes/issues/43916](https://github.com/kubernetes/kubernetes/issues/43916)，[https://cloud.tencent.com/developer/article/1637682](https://cloud.tencent.com/developer/article/1637682)，[Memory_working_set vs Memory_rss in Kubernetes, which one you should monitor?](https://medium.com/@eng.mohamed.m.saeed/memory-working-set-vs-memory-rss-in-kubernetes-which-one-you-should-monitor-8ef77bf0acee)，[https://kubernetes.io/docs/tasks/administer-cluster/out-of-resource/#active-file-memory-is-not-considered-as-available-memory](https://kubernetes.io/docs/tasks/administer-cluster/out-of-resource/#active-file-memory-is-not-considered-as-available-memory)。

#### 获取 kubelet profile

其它组件的调试信息参考：[kubernetes 关键组件 debug](https://blog.csdn.net/u012986012/article/details/106065230)。

```bash
curl -k --key /etc/kubernetes/ssl/kubelet.key --cert /etc/kubernetes/ssl/kubelet.crt https://NODE_IP:10250/debug/pprof/heap  >> heap.info
go tool pprof heap.info
或者
kubectl proxy --address='0.0.0.0' --accept-hosts='^*$'
go tool pprof -seconds=60 -raw -output=kubelet.pprof http://127.0.0.1:8001/api/v1/nodes/${NODENAME}/proxy/debug/pprof/profile
```

#### Deployment 中使用 PVC

一般来讲 Deployment 应当用来部署无状态应用，需要挂载 PVC 时最好使用 StatefulSet。如果 Deployment 使用了 ReadWriteOnce 的 PVC （块存储），在滚动更新时会因为需要先拉起新的 Pod 再终止旧 Pod 造成同时挂载该 PVC 的情况，这是不允许，所以会一直卡在这个状态。如果想要这样使用，可以把更新策略改成 Recreate ，这样会先删除旧 Pod 再建新 Pod，这必然导致业务中断。另一种方案是使用 ReadWriteMany 的 PVC（文件或对象存储），可以允许多 Pod 同时挂载。

#### 让 Pod 中的容器按顺序启动

一种方案是使用 PostStart 脚本去调用 Container 的健康检查接口，直到容器运行正常后终止脚本，其能够工作的前提是：假如容器的  `PostStart` hook 没有正确的返回，kubelet 便不会去创建下一个容器。这种方式是有些 hack 的，而且也无法保证一直能够使用，这不是 kubernetes 保证不会变更的方式。参考：[https://mp.weixin.qq.com/s/VulB3tiXTRAjYsuWxgU1Zg](https://mp.weixin.qq.com/s/VulB3tiXTRAjYsuWxgU1Zg)。

#### 通过 patch 修改 service 的 status 字段

```bash
# cat /tmp/json
{
    "status": {
      "loadBalancer": {
        "ingress": [
          {
            "ip": "10.5.6.79"
          }
        ]
      }
    }
}

curl --request PATCH --data "$(cat /tmp/json)" -H "Content-Type:application/merge-patch+json"
http://localhost:8080/api/v1/namespaces/gitlab/services/git-cp/status

```

#### kubectl 部署时默认命名空间的设置

Pod 中执行 kubectl apply 时如果未指定命名空间，并且待部署的资源中也没有明确指定命名空间，则会尝试从几个地方获取命名空间信息，会先尝试从环境变量 `POD_NAMESPACE` 中读取，读不到则是尝试从当前 context 中获取，如果找不到则继续尝试从 `/var/run/secrets/kubernetes.io/serviceaccount/namespace` 中获取，参考 [https://kubernetes.io/docs/reference/kubectl/overview/#in-cluster-authentication-and-namespace-overrides](https://kubernetes.io/docs/reference/kubectl/overview/#in-cluster-authentication-and-namespace-overrides)。
可通过以下命令设置 context 中的命名空间。

```bash
kubectl config set-context --current --namespace=default
```

#### 在 Pod 中屏蔽 serviceaccount 自动挂载

一种是设置 Pod 的 automountServiceAccountToken 参数，禁止当前 Pod 自动挂载；一种是设置 ServiceAccount 的 automountServiceAccountToken 参数，默认所有 Pod 不自动挂载；一种是 Pod 挂载后再通过自定义挂载覆盖掉自动挂载的目录 `/var/run/secrets/kubernetes.io/serviceaccount`。

#### port-forward 转发 Pod 端口到本地

```bash
kubectl port-forward --address 0.0.0.0 pod/mypod 8888:5000
```

#### 十二因素应用

- 十二因素的提出早于 Kubernetes 的大规模使用，但是一些因素和基于 Kubernetes 的服务开发部署有着很好的吻合。可参考： [https://skyao.io/learning-cloudnative/factor/](https://skyao.io/learning-cloudnative/factor/) ，[https://blog.csdn.net/zeb_perfect/article/details/52536411](https://blog.csdn.net/zeb_perfect/article/details/52536411)， [https://12factor.net/](https://12factor.net/)
- 关于基准代码的理解：每个应用应该使用单独的代码仓库，如果多个应用有需要共享的基准代码，则应当将这部分共享代码组织为一个单独的代码仓库。
  | Factor | 描述 |
  | --- | --- |
  | Codebase
  基准代码 | One codebase tracked in revision control, many deploys
  一份基准代码，多份部署 |
  | Dependencies
  依赖 | Explicitly declare and isolate dependencies
  显式声明依赖关系 |
  | Config
  配置 | Store config in the environment
  在环境中存储配置 |
  | Backing services
  后端服务 | Treat backing services as attached resources
  把后端服务当作附加资源 |
  | Build, release, run
  构建，发布，运行 | Strictly separate build and run stages
  严格分离构建和运行 |
  | Processes
  进程 | Execute the app as one or more stateless processes
  以一个或多个无状态进程运行应用 |
  | Port binding
  端口绑定 | Export services via port binding
  通过端口绑定提供服务 |
  | Concurrency
  并发 | Scale out via the process model
  通过进程模型进行扩展 |
  | Disposability
  易处理 | Maximize robustness with fast startup and graceful shutdown
  快速启动和优雅终止可最大化健壮性 |
  | Dev/prod parity
  开发环境与线上环境等价 | Keep development, staging, and production as similar as possible
  尽可能的保持开发，预发布，线上环境相同 |
  | Logs
  日志 | Treat logs as event streams
  把日志当作事件流 |
  | Admin processes
  管理进程 | Run admin/management tasks as one-off processes
  后台管理任务当作一次性进程运行 |

#### 书籍

[Kubernetes Patterns Reusable Elements for Designing Cloud-Native Applications.pdf](https://www.yuque.com/attachments/yuque/0/2020/pdf/182657/1592733448171-9fd3c848-1cef-4910-9722-4655a34dbb87.pdf)
