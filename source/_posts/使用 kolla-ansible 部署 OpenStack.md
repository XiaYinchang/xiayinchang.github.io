---
title: 使用 kolla-ansible 部署 OpenStack
urlname: hd3h5q
date: '2019-05-26 00:00:00 +0800'
layout: post
categories: OpenStack
tags:
  - OpenStack
  - "\_云计算"
keywords: 'OpenStack, Kolla, Ansible'
description: 使用 kolla-ansible 部署一套具有三个控制节点和两个计算节点的 OpenStack 环境。
updated: 2020-07-23 00:00:00
---

|    Date    |    Log    |
| :--------: | :-------: |
| 26/05/2019 | 初始版本. |

### 解决什么问题

本文尝试解决的问题：

- 使用个人开发电脑搭建一套 OpenStack 开发环境。

本文所有操作的前提是个人电脑搭建 Linux 操作系统且具有 16G 以上的内存资源和 足够大的硬盘空间。要完成整个系统的搭建，需要进行：

- 准备三个控制节点和两个计算节点的虚拟机环境；
- 使用 kolla-ansible 部署 OpenStack。

### 准备虚拟机

首先，新建 /infra 目录用于存放本次部署产生所有的数据信息，包括安装文件和虚拟机磁盘文件。基于 VMware Workstation 创建虚拟机， VMware Workstation 安装过程不再赘述。使用 CentOS 7.6 最小系统镜像安装操作系统，镜像地址：

```bash
https://mirrors.tuna.tsinghua.edu.cn/centos/7.6.1810/isos/x86_64/CentOS-7-x86_64-Minimal-1810.iso
```

三个控制节点配置相同，可以在创建完成一个虚拟机后使用 VMware 提供的 clone 功能直接复制出其余的（复制得到的虚拟机需要重新生成 MAC 地址，否则会造成地址冲突），配置详情如下：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1558868599415-e0c7d40e-0869-4bdb-b9cd-c03d2ca01291.png#align=left&display=inline&height=702&margin=%5Bobject%20Object%5D&name=image.png&originHeight=702&originWidth=891&size=68225&status=done&style=none&width=891)
两个计算节点在上图配置的基础上提升了内存、处理器和硬盘配置，这里硬盘容量设置较大是为了后续在 OpenStack 环境中部署 Kubernetes 等其它系统做准备，可根据个人需要缩减：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1558868727583-2c08f21e-a5cd-4226-9050-fe9a3a935143.png#align=left&display=inline&height=696&margin=%5Bobject%20Object%5D&name=image.png&originHeight=696&originWidth=885&size=68338&status=done&style=none&width=885)
所有节点配置两张网卡：一张用于 OpenStack 管理网，通过 NAT 连接外网；一张用于 Neutron 网络，直接桥接到外部网络。可根据个人需求调整连接外部网络的方式，VMware 虚拟网络信息如下：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1558869217104-6d5aa106-722c-4a3a-a398-6aec413ea9c2.png#align=left&display=inline&height=614&margin=%5Bobject%20Object%5D&name=image.png&originHeight=614&originWidth=617&size=55558&status=done&style=none&width=617)
虚拟机创建完成后进入操作系统检查 IP 地址获取情况：

```bash
[root@controller_03 ~]# ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 00:50:56:32:8a:b7 brd ff:ff:ff:ff:ff:ff
    inet 172.16.192.131/24 brd 172.16.192.255 scope global noprefixroute ens33
       valid_lft forever preferred_lft forever
    inet6 fe80::250:56ff:fe32:8ab7/64 scope link
       valid_lft forever preferred_lft forever
3: ens36: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 00:50:56:34:89:62 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.10/24 brd 192.168.1.255 scope global noprefixroute dynamic ens36
       valid_lft 82858sec preferred_lft 82858sec
    inet6 fe80::91ef:7089:dc2e:d7f1/64 scope link noprefixroute
       valid_lft forever preferred_lft forever
```

如果没有获取到 IP 可执行 dhclient 命令尝试获取 IP 地址，动态分配的 IP 地址只是为系统提供了临时连接外部网络的途径。为了后续的自动化部署，我们需要将每个节点连接管理网的网卡 IP 地址固定下来，并使用管理网网关为默认路由网关（一定要确认好网关地址），如下：

```bash
[root@controller_03 ~]# cat /etc/sysconfig/network-scripts/ifcfg-ens33
TYPE=Ethernet
PROXY_METHOD=none
BROWSER_ONLY=no
BOOTPROTO=static
DEFROUTE=yes
NAME=ens33
UUID=f7c0ccd3-10d2-4bd9-bc47-c6429cbc28a0
DEVICE=ens33
ONBOOT=yes
IPADDR=172.16.192.131
GATEWAY=172.16.192.2
NETMASK=255.255.255.0
DNS1=114.114.114.114
DNS2=1.1.1.1
DNS3=8.8.4.4
```

给 Neutron 使用的网卡配置如下：

```bash
# cat /etc/sysconfig/network-scripts/ifcfg-ens36
TYPE=Ethernet
PROXY_METHOD=none
BROWSER_ONLY=no
BOOTPROTO=dhcp
DEFROUTE=no
NAME=ens36
DEVICE=ens36
ONBOOT=yes
```

为了管理方便，我们将三个控制节点和两个计算节点的 hostname 分别设置为（主机名不能带下划线，否则部署 OpenStack 时报错）:

```bash
controller-01
controller-02
controller-03
compute-01
compute-02
```

为了方便命令行登录节点，可通过 ssh-copy-id 将宿主机 ssh public-key 拷贝到各虚拟节点，之后在 ssh 登录时无需再输入密码。
为了方便在所有虚拟机和宿主机之间共享文件，我们可以使用 VMware 的文件共享机制将宿主机目录挂载到虚拟机中。首先，在虚拟机的属性配置中添加要共享的文件夹，如下是将宿主机上的 /infra/vmshare 目录共享给虚拟机：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1558870518738-a48e46b4-d616-4a1b-9c17-f11fc2595b76.png#align=left&display=inline&height=590&margin=%5Bobject%20Object%5D&name=image.png&originHeight=701&originWidth=886&size=70490&status=done&style=none&width=746)

只有上图的设置还不够，我们需要进入到虚拟机内部将共享的文件夹挂载到本地目录才能使用，如下，该命令的涵义是将名称为 vmshare 的共享挂载到本地 /vmshare 目录：

```bash
vmhgfs-fuse .host:/vmshare /vmshare
```

另外也可以将挂载信息写入到 /etc/fstab 使系统在启动时自动挂载：

```bash
.host:/vmshare /vmshare fuse.vmhgfs-fuse allow_other 0 0
```

部署 OpenStack 的时候需要使用到网卡的混杂模式，而在 Linux 下虚拟机没有权限完成该操作，可通过以下设置开放权限给虚拟机：

```bash
sudo chmod a+rw /dev/vmnet0
sudo chmod a+rw /dev/vmnet8
```

在使用图形化界面完成以上操作和配置后，我们将脱离 GUI 运行虚拟机，这样可以节省一些资源开支。执行以下命令以命令行形式运行虚拟机：

```bash
vmrun start /infra/openstack_controller_02/openstack_controller_02.vmx nogui
```

现在，将所有节点都以 nogui 形式启动起来，vmrun list 可以看到它们：

```bash
(kolla) ➜  kolla vmrun list
Total running VMs: 5
/infra/openstack_controller_02/openstack_controller_02.vmx
/infra/openstack_controller_03/openstack_controller_03.vmx
/infra/openstack_controller_01/openstack_controller_01.vmx
/infra/openstack_compute_01/openstack_compute_01.vmx
/infra/openstack_compute_02/openstack_compute_02.vmx
```

我们的虚拟机环境准备好了，开始使用 kolla-ansible 进行部署。

### 使用 kolla-ansible 部署 OpenStack

参考 kolla-ansible [官方文档](https://docs.openstack.org/kolla-ansible/latest/user/quickstart.html)  进行部署。
创建一份虚拟 Python 环境用于本次部署，需要先安装 virtualenv ，我的宿主机环境是 ArchLinux，执行以下命令安装，其它 Linux 环境请自行 Google 安装方法：

```bash
yay -S python-virtualenv
```

然后执行以下命令创建 kolla 虚拟环境：

```bash
virtualenv -p python2 /infra/kolla
```

使用以下命令激活虚拟 Python 环境 :

```bash
source /infra/kolla/bin/activate
```

安装 Ansible:

```bash
pip install ansible
```

为了方便对所有节点执行一些共性的操作，我们临时创建一份 hosts 文件，如下：

```bash
(kolla) ➜  kolla cat /infra/hosts
[OpenstackGroup:children]
 nodes
 controllers
 computes
[OpenstackGroup:vars]
 ansible_ssh_user=root
 ansible_ssh_pass=r00tme
 ansible_port=22
[nodes]
 openstack_controller_01 ansible_host=172.16.192.129
 openstack_controller_02 ansible_host=172.16.192.130
 openstack_controller_03 ansible_host=172.16.192.131
 openstack_compute_01 ansible_host=172.16.192.132
 openstack_compute_02 ansible_host=172.16.192.133
[contorllers]
 openstack_controller_01 ansible_host=172.16.192.129
 openstack_controller_02 ansible_host=172.16.192.130
 openstack_controller_03 ansible_host=172.16.192.131
[computes]
 openstack_compute_01 ansible_host=172.16.192.132
 openstack_compute_02 ansible_host=172.16.192.133
```

启用 SELinux 会带来一些麻烦，影响 kolla 安装部署，因此我们使用 ansible 关闭所有节点的 SELinux 并重启系统使之生效：

```bash
ansible nodes -i /infra/hosts -m shell -a 'sed -i "s#SELINUX=enforcing#SELINUX=disabled#g" /etc/selinux/config'
ansible nodes -i /infra/hosts -m shell -a 'reboot'
```

另外，我们使用清华开源镜像替代 Pypi 官方仓库：

```bash
ansible nodes -i /infra/hosts -m shell -a 'yum install -y wget'
ansible nodes -i /infra/hosts -m shell -a 'wget https://tuna.moe/oh-my-tuna/oh-my-tuna.py'
ansible nodes -i /infra/hosts -m shell -a 'python /root/oh-my-tuna.py'
```

接下来，继续按照 kolla 文档安装 kolla-ansible：

```bash
pip install kolla-ansible
sudo mkdir -p /etc/kolla
sudo chown $USER:$USER /etc/kolla
cp -r /infra/kolla/share/kolla-ansible/etc_examples/kolla/* /etc/kolla
cp /infra/kolla/share/kolla-ansible/ansible/inventory/multinode /infra/kolla
```

然后，配置 multinode inventory 文件，根据文档中的说明来进行配置即可：

```bash
(kolla) ➜  kolla cat multinode
# These initial groups are the only groups required to be modified. The
# additional groups are for more control of the environment.
[control]
# 这里的配置和我们宿主机 hosts 配置要对应起来
openstack_controller_01
openstack_controller_02
openstack_controller_03

# The above can also be specified as follows:
#control[01:03]     ansible_user=kolla

# 网路节点和控制节点对应
[network]
openstack_controller_01
openstack_controller_02
openstack_controller_03

# inner-compute is the groups of compute nodes which do not have
# external reachability.
# DEPRECATED, the group will be removed in S release of OpenStack,
# use variable neutron_compute_dvr_mode instead.
[inner-compute]

# 我们的两个计算节点都可以联通外网
# DEPRECATED, the group will be removed in S release of OpenStack,
# use variable neutron_compute_dvr_mode instead.
[external-compute]
openstack_compute_01
openstack_compute_02

[compute:children]
inner-compute
external-compute

# 监控节点可以选择控制节点中的任意一个
[monitoring]
openstack_controller_01

# When compute nodes and control nodes use different interfaces,
# you need to comment out "api_interface" and other interfaces from the globals.yml
# and specify like below:
#compute01 neutron_external_interface=eth0 api_interface=em1 storage_interface=em1 tunnel_interface=em1

# 存储节点和计算节点复用
[storage]
openstack_compute_01
openstack_compute_02

[deployment]
localhost       ansible_connection=local

[baremetal:children]
control
network
compute
storage
monitoring

# 添加了一项变量配置，指明登录虚拟机节点所需要的用户名和密码
[baremetal:vars]
ansible_ssh_user=root
ansible_ssh_pass=r00tme
ansible_port=22
```

注意上述文件中的虚拟机名称应当可以在宿主机解析到其对应的 IP 地址，为此 宿主机 hosts 增加如下配置：

```bash
(kolla) ➜  kolla tail -n 5 /etc/hosts
172.16.192.129 openstack_controller_01
172.16.192.130 openstack_controller_02
172.16.192.131 openstack_controller_03
172.16.192.132 openstack_compute_01
172.16.192.133 openstack_compute_02
```

执行以下命令生成安装过程所需的数据库等各项基础设施密码：

```bash
kolla-genpwd
```

然后修改 kolla 的全局配置文件  /etc/kolla/globals.yml :

```bash
# 所有OpenStack组件的基础镜像使用 centos
kolla_base_distro: "centos"
# 选择社区编译好的安装源文件进行安装
kolla_install_type: "binary"
# 选择安装 R 版 OpenStack
openstack_release: "rocky"
# 设置管理网使用的网卡，即为我们为每个虚拟机添加的网卡之一
network_interface: "ens33"
# 设置 Neutron 使用的网卡，即为我们为虚拟机添加的另外一块网卡
neutron_external_interface: "ens36"
# 设置管理平台 VIP，该 IP 漂移在三个控制节点的管理网卡上，因此应是一个未被占用的和管理网段一致的 IP 地址
kolla_internal_vip_address: "172.16.192.134"
```

接下来，开始真正部署的第一步，在所有节点上安装部署依赖的基础软件包，安装过程可能有报错，可针对具体问题解决后重复执行安装命令：

```bash
kolla-ansible -i /infra/kolla/multinode bootstrap-servers
```

第二步，检查环境是否已经准备好，配置是否有错漏，检查过程可能会抛出一些错误，不要惊慌，一般都有提示信息，按照提示去修改即可：

```bash
kolla-ansible -i /infra/kolla/multinode prechecks
```

第三步，正式开始安装：

```bash
kolla-ansible -i /infra/kolla/multinode deploy
```

如果在安装中出错，可以先找到错误原因并修复后，先清理上次安装后再重装：

```bash
kolla-ansible -i ./multinode destroy --yes-i-really-really-mean-it
kolla-ansible -i /infra/kolla/multinode deploy
```

### 常见错误

- 在 bootstrap-servers 阶段遇到 Python uninstall request 包错误，可尝试如下方式解决：

```bash
  pip install -I requests==2.9
```

### 参考资料

- [Kolla 安装 Openstack](https://www.jianshu.com/p/c549a512c224)
