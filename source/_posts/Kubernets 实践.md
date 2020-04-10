---
title: "Kubernetes\_实践"
urlname: kgmvfu
date: '2019-11-13 00:00:00 +0800'
updated: 'Thu Apr 09 2020 00:00:00 GMT+0800 (China Standard Time)'
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

- 删除节点
```
etcdctl member list
etcdctl member remove member_id
```


- check cluster health
```bash
etcdctl endpoint health
```


<a name="xcw1D"></a>
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


- kubeadm 部署时 config 文件

参考：[https://godoc.org/k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta2](https://godoc.org/k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta2)，kubelet 自定义配置参考：[https://godoc.org/k8s.io/kubelet/config/v1beta1#KubeletConfiguration](https://godoc.org/k8s.io/kubelet/config/v1beta1#KubeletConfiguration)。一个需要注意的地方是<br />一个单 master 节点集群配置参考，需要注意的是虽然在下面的配置中已经设置了 failSwapOn 为 false，但是 kubeadm 并不会去检测该配置，仍然会报错，不过该报错可以被忽略，因为这个设置随后确实会被添加到 kubelet 的配置中并生效，因此 init 时执行 `sudo kubeadm init --config kubeadm.yml --ignore-preflight-errors=all` 即可：
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


<a name="UYIkL"></a>
#### Helm

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


<a name="b94zX"></a>
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


<a name="9BV58"></a>
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


<a name="O0gNe"></a>
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


<a name="pCtvi"></a>
#### CronJob
建议设置 startingDeadlineSeconds 值以防止从最后一次调度到当前时间错过的调度次数超过 100 导致不再进行调度（使用 etcd 备份数据恢复集群时可能出现这种情况），参考：[https://www.jianshu.com/p/3e3b18414e45](https://www.jianshu.com/p/3e3b18414e45)。<br />

<a name="d24JT"></a>
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
```


<a name="sM7pt"></a>
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


<a name="rN7rK"></a>
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


<a name="Fq6Wa"></a>
#### sealos 部署 Kubernetes
开发测试可以使用 [sealos](https://github.com/fanux/sealos) 这个工具，通过离线安装包部署 Kubernetes，省心实用，但是作者在改过的 Kubeadm 代码里夹杂了一些私货令人不喜。

- 离线安装包下载链接




| 1.17.0 | [https://sealyun.oss-cn-beijing.aliyuncs.com/413bd3624b2fb9e466601594b4f72072-1.17.0/kube1.17.0.tar.gz](https://sealyun.oss-cn-beijing.aliyuncs.com/413bd3624b2fb9e466601594b4f72072-1.17.0/kube1.17.0.tar.gz) |
| --- | --- |
| 1.17.1 | [https://sealyun.oss-cn-beijing.aliyuncs.com/9347ea4e446ce514dbba6f686034a363-1.17.1/kube1.17.1.tar.gz](https://sealyun.oss-cn-beijing.aliyuncs.com/9347ea4e446ce514dbba6f686034a363-1.17.1/kube1.17.1.tar.gz) |



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


<a name="XIbTO"></a>
#### 优雅地删除节点
 删除 master 节点时注意可能需要手动修改 kubeadm-config 中的配置，同时手动修改 /etc/kubernetes/manifests/etcd.yaml 文件移除相关 IP。
```
kubectl get nodes
kubectl drain <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-local-data
kubectl delete node <node-name>
```


<a name="z42bx"></a>
#### 重启容器而非删除
删除容器后会重新进行调度，如果希望在同一个宿主机上重新拉起容器可以执行如下命令：
```bash
# 在容器中执行如下命令，会使容器重新创建，但不会重新调度
kill 1
```
但需要注意的是，上述命令会造成容器重建，所以在容器中进行的非持久修改均会丢失，若想保留临时修改，可先找到容器所在宿主机，然后登录到宿主机上执行 `docker restart` 重启会保留临时修改，往往用于调试场景。<br />

<a name="05Wmk"></a>
#### ServiceAccountTokenVolumeProjection 生成有时效的 Token
参考：[https://developer.aliyun.com/article/742572](https://developer.aliyun.com/article/742572)，[https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#service-account-token-volume-projection](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#service-account-token-volume-projection),[https://www.alibabacloud.com/help/zh/doc-detail/160384.htm](https://www.alibabacloud.com/help/zh/doc-detail/160384.htm)<br />kube-apiserver<br />![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1586427070015-35b14a0a-4cf8-48cf-ae25-db4531f0b8b1.png#align=left&display=inline&height=824&name=image.png&originHeight=824&originWidth=983&size=117967&status=done&style=none&width=983)<br />

```
--service-account-issuer=kubernetes.default.svc \
--service-account-signing-key-file=/etc/kubernetes/ssl/ca-key.pem \
--api-audiences=kubernetes.default.svc \
--feature-gates=BoundServiceAccountTokenVolume=true \
```

<br />kube-controller-manager<br />![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1586427180951-d8f9d830-5f94-4bb3-bbd6-640dd513b3f2.png#align=left&display=inline&height=363&name=image.png&originHeight=363&originWidth=924&size=65129&status=done&style=none&width=924)<br />

```
--controllers=*,bootstrapsigner,tokencleaner,root-ca-cert-publisher \
--feature-gates=BoundServiceAccountTokenVolume=true \
```

<br />示例
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



<a name="COum0"></a>
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



