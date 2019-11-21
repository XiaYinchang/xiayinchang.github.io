
---

title: 为 Proxmox 制作包含 cloud-init 的虚拟机模板

urlname: en0qpx

date: 2019-08-14 00:00:00 +0800

layout: post

categories: Proxmox

tags: [Linux, 云计算,Proxmox,虚拟机]

keywords: Proxmox, cloud-init

description: 为了方便基于 Proxmox 平台创建虚拟机，本文描述了制作包含 cloud-init 的虚拟机模板。

---

<a name="WsMUi"></a>
#### 安装 Centos
在我搭建的 Proxmox 平台中使用了 Ceph 作为虚拟机的后端存储，为了提高虚拟机磁盘性能，在安装虚拟机的时候使用 LVM raid0 逻辑分区挂载根目录。

- 在 install destination 中选中三块盘并勾选自行分区选项

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1565763386484-e5ca7b70-8be9-4748-a45b-729056006387.png#align=left&display=inline&height=690&name=image.png&originHeight=690&originWidth=1038&size=159786&status=done&width=1038)

- 点击 automatically create lvm partition 自动创建分区，删除其它分区只保留 /boot 分区

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1565763580611-942dc4e2-6db4-4dc3-8f80-8c34786c5b08.png#align=left&display=inline&height=751&name=image.png&originHeight=751&originWidth=1043&size=125930&status=done&width=1043)

- 点击 + 按钮添加新的分区，挂载点为根路径，容量超过磁盘最大容量，安装程序会自动校正到真实的最大可用容量。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1565763613900-3375e62f-af48-4a23-a3c2-75d5883a1ce2.png#align=left&display=inline&height=769&name=image.png&originHeight=769&originWidth=1026&size=121666&status=done&width=1026)

- 点击 Modify 按钮修改新建分区的 RAID Level 为 RAID0。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1565763651682-d3ed9a9e-6388-4d4f-802a-09929eaab7af.png#align=left&display=inline&height=769&name=image.png&originHeight=769&originWidth=1041&size=165004&status=done&width=1041)

- 以下是创建完成的分区，保存后按照常规步骤继续安装操作系统。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1565763668133-da5c4ce4-c19a-493c-b20d-fa91ac1c38f9.png#align=left&display=inline&height=733&name=image.png&originHeight=733&originWidth=1020&size=132613&status=done&width=1020)

<a name="0dMBI"></a>
#### 调整安装好的操作系统

- 进入操作系统，首先关闭 selinux、firewalld 和 NetworkManager。

```bash
systemctl disable --now firewalld NetworkManager
setenforce 0
sed -ri '/^[^#]*SELINUX=/s#=.+$#=disabled#' /etc/selinux/config
```

- 安装acpid cloud-init cloud-utils-growpart

apcid 是为了可以使 kvm 可以关闭和重启虚拟机，qemu-guest-agent 使得 Proxmox 可以获取虚拟机的 IP 等信息。
```bash
yum install -y acpid cloud-init cloud-utils-growpart qemu-guest-agent
systemctl enable acpid 
systemctl enable qemu-guest-agent
```


- 禁用默认zeroconf路线

当系统无法连接DHCP server的时候，就会尝试通过ZEROCONF来获取IP,并添加一条169.254.0.0/16的路由条目。
```bash
echo "NOZEROCONF=yes" >> /etc/sysconfig/network
```

- 修改sshd不使用dns防止ssh连接慢

```bash
sed -ri '/UseDNS/{s@#@@;s@\s+.+@ no@}' /etc/ssh/sshd_config
systemctl restart sshd
```

- 修改 cloud-init 配置

分别是允许 root 登录，允许使用 password 登录，禁止第一次开机自动更新系统。
```bash
sed -ri '/disable_root/{s#\S$#0#}' /etc/cloud/cloud.cfg
sed -ri '/ssh_pwauth/{s#\S$#1#}' /etc/cloud/cloud.cfg
sed -ri '/package-update/s@^@#@' /etc/cloud/cloud.cfg
```

- 如有需要可以自行添加一些额外的配置

我在 /sbin/ifup-local 中添加了如下配置用于配置特殊的路由以适应办公室网络环境。
```bash
touch /sbin/ifup-local
chmod +x /sbin/ifup-local
cat /sbin/ifup-local
#!/bin/bash
ip r add 192.168.76.0/24 via 192.168.180.254
ip r add 192.168.77.0/24 via 192.168.180.254
exit 0
```


- 关机，并在 Proxmox 中为之添加 CloudInit Drive。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1565765481819-2158abbc-ff3a-4f5e-870f-40f545b0acd1.png#align=left&display=inline&height=633&name=image.png&originHeight=633&originWidth=719&size=92450&status=done&width=719)

- 填写相关 init 参数并 regenerate image。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1565765613783-81f32306-e298-4d18-a553-128415466232.png#align=left&display=inline&height=388&name=image.png&originHeight=388&originWidth=533&size=35717&status=done&width=533)

- 启用 qemu-agent

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1565768472227-62c14d9c-88ec-47dd-b030-841d773cef94.png#align=left&display=inline&height=645&name=image.png&originHeight=645&originWidth=720&size=68736&status=done&width=720)

- 将虚拟机转为模板，之后就可以以此为基础创建新的虚拟机。
<a name="btgSa"></a>
#### 参考
[proxmox里使用cloud-init和一些笔记](https://zhangguanzhang.github.io/2019/01/22/proxmox-cloud-init/)

