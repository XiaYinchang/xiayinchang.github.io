---
title: Linux 实用命令集合
urlname: qyggmq
date: '2019-11-09 00:00:00 +0800'
updated: 'Tue Jun 09 2020 00:00:00 GMT+0800 (China Standard Time)'
layout: post
categories: Linux
tags:
  - Linux
  - "\_云计算"
keywords: 'Linux, Docker'
description: 在云计算场景下常用的 Linux 命令记录。
abbrlink: b489449e
---

<a name="CYJKi"></a>
#### CentOS<br />

- 升级系统内核
```bash
rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
rpm -Uvh http://www.elrepo.org/elrepo-release-7.0-2.el7.elrepo.noarch.rpm
yum --enablerepo=elrepo-kernel install kernel-ml
awk -F\' '$1=="menuentry " {print i++ " : " $2}' /etc/grub2.cfg
grub2-set-default 0
grub2-mkconfig -o /boot/grub2/grub.cfg
reboot
```


- 安装fish
```bash
cd /etc/yum.repos.d/
wget https://download.opensuse.org/repositories/shells:fish:release:2/CentOS_7/shells:fish:release:2.repo
yum install fish -y
```


- 创建网桥

可以直接在配置文件修改，如下创建网桥 br0：
```bash
# cat /etc/sysconfig/network-scripts/ifcfg-br0 
TYPE=Bridge
BOOTPROTO=static
DEFROUTE=yes
NAME=br0
DEVICE=br0
ONBOOT=yes
IPADDR=192.168.180.136
NETMASK=255.255.255.0
GATEWAY=192.168.180.254
DNS1=114.114.114.114
```

加入物理网卡 em1 到网桥
```bash
# cat /etc/sysconfig/network-scripts/ifcfg-em1
TYPE=Ethernet
BOOTPROTO=static
DEFROUTE=no
NAME=em1
DEVICE=em1
ONBOOT=yes
BRIDGE=br0
```



- 创建 veth 并持久化

创建两对 veth 并加入到网桥，脚本如下：
```bash
# cat /root/config_veth.sh 
#!/bin/bash

ip link add dev veth0 type veth peer name veth1
ip link add dev veth2 type veth peer name veth3
ip link set dev veth0 up
ip link set dev veth1 up
ip link set dev veth2 up
ip link set dev veth3 up

exit 0
```

<br />执行上述脚本，只是临时创建虚拟网卡，系统重启后又会消失，目前没找到持久化方法，所以只能退而求其次，将上述脚本做成一个服务，在每次系统启动时自动执行以上操作：
```bash
# cat /usr/lib/systemd/system/veth.service 
[Unit]
Description=Create veths
After=network-pre.target dbus.service
Before=network.target network.service

[Service]
ExecStart=/root/config_veth.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

<br />创建完上述文件，不要忘了执行 systemctl enable --now veth 启用服务；而对于虚拟网卡设备的配置仍然放在网络配置文件目录下：
```bash
# cat /etc/sysconfig/network-scripts/ifcfg-veth0
DEVICE=veth0
DEVICETYPE=veth
VETH_PEER=veth1
BRIDGE=br0
ONBOOT=yes

# cat /etc/sysconfig/network-scripts/ifcfg-veth1
DEVICE=veth1
DEVICETYPE=veth
VETH_PEER=veth0
ONBOOT=yes
BOOTPROTO=static
IPADDR=192.168.180.211
MTU=1500
NETMASK=255.255.255.0

# cat /etc/sysconfig/network-scripts/ifcfg-veth2
DEVICE=veth2
DEVICETYPE=veth
VETH_PEER=veth3
BRIDGE=br0
ONBOOT=yes

# cat /etc/sysconfig/network-scripts/ifcfg-veth3
DEVICE=veth3
DEVICETYPE=veth
VETH_PEER=veth2
ONBOOT=yes
```

<br />现在，就算重启系统虚拟网卡也会被自动重建了。<br />

- 自动加载内核模块

以下示例加载 ipvs 内核模块:
```bash
$ cat /etc/modules-load.d/ipvs.conf
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
```


- 自动设置内核参数
以下示例启用 ipv4 转发功能：
```bash
$ cat /etc/sysctl.conf
net.bridge.bridge-nf-call-iptables=1
net.bridge.bridge-nf-call-ip6tables=1
vm.max_map_count=262144
vm.swappiness=0
net.core.somaxconn=32768
net.ipv4.tcp_syncookies=0
net.ipv4.conf.all.rp_filter=1
net.ipv4.ip_forward=1
```


- 磁盘性能测试


```bash
yum install epel-release
yum install fio
fio --randrepeat=1 --ioengine=libaio --direct=1 --gtod_reduce=1 --name=test --filename=test --bs=4k --iodepth=64 --size=4G --readwrite=randrw --rwmixread=75

//latnecy
yum install epel-release
yum install ioping
ioping -c 10 .
```


- 安装 MariaDB



```bash
# 添加 MariaDB 仓库
cat /etc/yum.repos.d/MariaDB.repo
[mariadb]
name = MariaDB
baseurl = http://yum.mariadb.org/10.4/centos7-amd64
gpgkey=https://yum.mariadb.org/RPM-GPG-KEY-MariaDB
gpgcheck=1
  
# 执行安装
yum -y install MariaDB-server MariaDB-client
systemctl enable --now mariadb
```


- 在 grub 引导界面临时编辑内核启动参数

     首先，选中要编辑的内核项，按 **e** 进入编辑页面，编辑完成后按 **Ctrl + x**  启动系统。下图为编辑内核参数直接进入救援模式。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1570848156874-4feb1fc6-38d3-4dc2-a3f9-ff076f94291e.png#align=left&display=inline&height=230&margin=%5Bobject%20Object%5D&name=image.png&originHeight=230&originWidth=716&size=13999&status=done&style=none&width=716)<br />

- 在操作系统中编辑内核启动参数并重新生成 grub 引导



```bash
// 修改 /etc/default/grub 中的参数设置
[root@umstor03 ~]# cat /etc/default/grub 
GRUB_TIMEOUT=5
GRUB_DISTRIBUTOR="$(sed 's, release .*$,,g' /etc/system-release)"
GRUB_DEFAULT=saved
GRUB_DISABLE_SUBMENU=true
GRUB_TERMINAL_OUTPUT="console"
GRUB_CMDLINE_LINUX="crashkernel=auto rd.lvm.lv=centos_umstor03/root video=640x480 nomodeset"
GRUB_DISABLE_RECOVERY="true"

// 执行以下命令生成新的 grub 引导文件
grub2-mkconfig -o /boot/grub2/grub.cfg
// 重启系统时参数生效
```


- netinstall  centos 1804 可用如下镜像源
```
// 不要遗漏最后的反斜线
https://mirrors.tuna.tsinghua.edu.cn/centos-vault/7.5.1804/os/x86_64/
```


- 包版本降级
```bash
yum downgrade httpd-2.2.3-22.el5
```


- 查看包安装信息
```bash
rpm -qa | grep nginx
rpm -qf /usr/sbin/nginx
rpm -ql nginx
```


- 安装指定版本
```
yum --showduplicate list kubeadm
yum install kubeadm-1.17.4-0
```


<a name="Y0lD3"></a>
#### Debian

- 按关键字检索安装包
```
apt update
apt-cache search linux-image
apt-cache madison iptables
```

- 查看已安装软件包
```
dpkg -l | grep linux
```

- 下载包不安装
```
apt-get download docker-ce
```


<a name="PHSFv"></a>
#### Raspberry

- 清理桌面环境
```bash
sudo apt-get purge desktop-base lightdm lxappearance lxde-common lxde-icon-theme lxinput lxpanel lxpolkit lxrandr lxsession-edit lxshortcut lxtask lxterminal obconf openbox raspberrypi-artwork xarchiver xinit xserver-xorg xserver-xorg-video-fbdev
sudo apt-get autoremove --purge
```


<a name="3HTPv"></a>
#### VIM

- 替换空格为换行

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1559296752599-dea00714-5a9b-40e4-9f26-b2aff1323c3c.png#align=left&display=inline&height=25&margin=%5Bobject%20Object%5D&name=image.png&originHeight=25&originWidth=160&size=2640&status=done&style=none&width=160)

- 替换 tab 为空格

`:%s/\t/  /g`<br />

<a name="Qgmi6"></a>
#### Ansible

- 打印 Ansible 所有的变量 



```
- name: Print some debug information 
  vars: 
    msg: |
        Module Variables ("vars"):
        --------------------------------
        {{ vars | to_nice_json }} 
 
        Environment Variables ("environment"):
        --------------------------------
        {{ environment | to_nice_json }} 
 
        GROUP NAMES Variables ("group_names"):
        --------------------------------
        {{ group_names | to_nice_json }}
 
        GROUPS Variables ("groups"):
        --------------------------------
        {{ groups | to_nice_json }}
 
        HOST Variables ("hostvars"):
        --------------------------------
        {{ hostvars | to_nice_json }} 
 
  debug: 
    msg: "{{ msg.split('\n') }}"       
  tags: debug_info
```

<br />或者<br />

```
- name: Display all variables/facts known for a host
  debug:
    var: hostvars[inventory_hostname]
  tags: debug_info
```


<a name="uiMU3"></a>
#### man 查看手册
```
// 查看 man 命令使用说明
man man
// 查看 exit bash 命令使用说明
man exit
// 查看 exit 系统调用使用说明，指定 section 为 2（系统调用手册所在区）
man 2 exit
// 如果提示 No entry in section 2 ，可尝试安装 man-pages
yay -S man-pages
```


<a name="gzyiV"></a>
#### tcpdump 捕获 http 包
更多参考：[https://hackertarget.com/tcpdump-examples/](https://hackertarget.com/tcpdump-examples/)
```bash
tcpdump -s 0 -A 'tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x47455420'
tcpdump -ni ens5f0 -A -s 10240 'tcp port 8056 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)' | egrep --line-buffered "^........(GET |HTTP\/|POST |HEAD )|^[A-Za-z0-9-]+: " | sed -r 's/^........(GET |HTTP\/|POST |HEAD )/\n\1/g'
```


<a name="WZCnh"></a>
#### mount 查看目录或分区挂载情况


```bash
cat /proc/mounts
// or
cat /proc/self/mountinfo
// or
mount -l
// or
findmnt
// or
df -aTh
```


<a name="1rSZC"></a>
#### pgrep 进程检索与杀死


```bash
// 按名称列出进程 ID
pgrep chrome
// 按名称杀死进程
pkill -9 fish
killall -9 fish
// 杀死指定 ID 的进程
kill -9 3049
// 列出进程树
pstree -p
```


<a name="e1tG9"></a>
#### fuser 找到正在使用某个文件的进程


```bash
// fuser 是 file user 的缩写
fuser -uv <filename>
fuser -uvm /folder
// 查看哪个程序在占用 8000 端口
fuser -v -n tcp 8000
```


<a name="lw5hk"></a>
#### lsof 列出所有打开的文件


```bash
// lsof 是 list open files 的缩写
// -i 代表列出正在打开的 IPV4[6] 文件； -n 表示不进行 DNS 反解； -P 表示不进行端口反解
lsof -i -n -P
// 查看当前目录下打开的文件
lsof .
```


<a name="70PLT"></a>
#### strace 跟踪系统调用
strace 用法参考： [https://www.howtoforge.com/linux-strace-command/](https://www.howtoforge.com/linux-strace-command/)<br />

```
strace -i ls
```


<a name="6F4YX"></a>
#### getent 获取系统用户信息


```
getent passwd
```


<a name="zdvyH"></a>
#### sed

- 删除所有以 # 开头的行
```bash
sed '/^#/ d'
```
更多使用方法参考：[https://www.folkstalk.com/2013/03/sed-remove-lines-file-unix-examples.html](https://www.folkstalk.com/2013/03/sed-remove-lines-file-unix-examples.html)

- 替换一个匹配字符串的其中一部分
```bash
sed 's/\(前一部分\)要替换的部分\(后一部分\)/\1替换后的字符串\2/'
```

- 使用环境变量
```bash
eval sed ’s/$a/$b/’ filename
sed "s/$a/$b/" filename
sed ’s/’$a’/’$b’/’ filename 
sed s/$a/$b/ filename
```

- 替换多个空格为一个
```bash
sed 's/\s\+/ /g'
```


<a name="tZDa5"></a>
#### 生成 Linux 用户密码的哈希值


```
python -c "import crypt, getpass, pwd; print(crypt.crypt('password', '\$6\$saltsalt\$'))"
// 或者使用 go
package main                                                
import (
    "fmt"
    "github.com/tredoe/osutil/user/crypt/sha512_crypt"
)
func main() {
    c := sha512_crypt.New()
    hash, err := c.Generate([]byte("rasmuslerdorf"), []byte("$6$usesomesillystringforsalt"))
    if err != nil {
        panic(err)
    }
    fmt.Println(hash)
}
```


<a name="uvsm2"></a>
#### 允许使用 root 用户 ssh 登录
先删除 `/root/.ssh/authorized_keys` 中的多余限制信息，之后在 `/etc/ssh/sshd_config` 中添加 `PermitRootLogin yes` 后重启 sshd 服务。<br />

<a name="vwUdA"></a>
#### 解决"rtnetlink answers file exists"
```
ip a flush dev eth0
```


<a name="HPtZj"></a>
#### ssh 取消 StrictHostKeyChecking 并从环境变量读取 ssh key 到本地
```bash
echo "Host *" > /etc/ssh/ssh_config
echo "  StrictHostKeyChecking=no" >> /etc/ssh/ssh_config
echo "  UserKnownHostsFile=/dev/null" >> /etc/ssh/ssh_config
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "$SSH_PRIVATE_KEY" | tr -d '\r' > ~/.ssh/id_rsa
echo "$SSH_PUBLIC_KEY" > ~/.ssh/id_rsa.pub
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```


<a name="Ey88A"></a>
#### 查看登录记录
```bash
# 查看当前登录用户
who
# 查看最近登录记录
last -F
# 查看最近90天所有用户的最后登录时间
lastlog --time 90
```


<a name="g7NoE"></a>
#### rsync 同步时需要 root 权限
```bash
rsync -aru -e "ssh" --rsync-path="sudo rsync" 172.16.110.215:~/ ~/  --progress --exclude=.cache
```


<a name="xr010"></a>
#### rclone 将 http file server 的内容同步到本地


```bash
rclone sync --http-url http://my.file.server :http:centos/test /repo/test --progress
```


<a name="hU4cE"></a>
#### expr 比较字符串大小
```bash
str3='v1.13'
str2='v1.14'
if [ $(expr ${str3} \<= ${str2}) -eq 1 ]; then    echo "[${str3}] <= [${str2}]"; else    echo "[${str3}] > [${str2}]"; fi
```


<a name="bjtsD"></a>
#### tr 移除所有空格
```bash
// 获取 kubernetes 版本
kubectl version --short | tail -1 | cut -d':' -f2 | tr -d '[:space:]'
```


<a name="NBOFH"></a>
#### vegeta 对 HTTP 服务进行性能测试
```go
echo "GET http://localhost:8080/cephcsi" | vegeta attack -rate=20000 -duration=60s > result.bin
vegeta report result.bin
```
更多内容参考：[https://www.scaleway.com/en/docs/vegeta-load-testing/](https://www.scaleway.com/en/docs/vegeta-load-testing/)<br />

<a name="DNQzt"></a>
#### zip 压缩文件不带顶级目录
```
pushd /Users/me/development/something
cd path/to/parent/dir/;
zip -r complete/path/to/name.zip ./*
popd
```


<a name="KWEjv"></a>
#### MySQL 执行单行命令
```
mysql --user="$user" --password="$password" --database="$database" --execute="DROP DATABASE $user; CREATE DATABASE $database;"
```


<a name="bIf97"></a>
#### MySQL 导出数据库
```
// 导出
mysqldump -P 3306 -u root --password=password -h 172.30.100.43  keycloak > keycloak-3.sql
// 导入
mysql -P 3306 -u root --password=password -h 172.30.100.43  keycloak < keycloak.sql
```


<a name="csvsg"></a>
#### ss 列出所有处于监听状态的 socket
```javascript
ss -lntu
-l = only services which are listening on some port
-n = show port number, don't try to resolve the service name
-t = tcp ports
-u = udp ports
-p = name of the program
```


<a name="1EEnK"></a>
#### 查看网络中已存在的 IP
```bash
arp-scan -I eth0 192.168.180.0/24
//或
nmap -sP -PR 192.168.180.*
```


<a name="sbDNW"></a>
#### iostat 查看磁盘读写速度
参考：[https://www.linuxtechi.com/monitor-linux-systems-performance-iostat-command/](https://www.linuxtechi.com/monitor-linux-systems-performance-iostat-command/)
```bash
// 以 MB 为单位显示速度
iostat -m
```


<a name="vWZU0"></a>
#### Wireshark 过滤表达式
参考：[https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html](https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html)
```
ip.scr==10.0.0.5 or ip.dst==192.1.1.1
```


<a name="lX9js"></a>
#### alpine 修改镜像源
```
sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
```


<a name="52SGW"></a>
#### tinc 配置 VPN
首先要有一个有公网 IP 的服务器作为交换节点。该节点进行如下配置：
```bash
yum install -y tinc
mkdir -p /etc/tinc/vpn/hosts
vim /etc/tinc/vpn/tinc.conf
  Name = vpn
  Interface = tinc
  Mode = switch
tincd -n vpn -K
 // 启动服务
tincd -n vpn -D
ip link set tinc up
ip a add 192.168.120.1/24 dev tinc
```
客户端配置：
```bash
mkdir -p /etc/tinc/`hostname`/hosts
vim /etc/tinc/`hostname`/tinc.conf
  Name = hostname
  Interface = tinc
  Mode = switch
  ConnectTo = vpn
tincd -n `hostname` -K
scp vpn-public-ip:/etc/tinc/vpn/hosts/vpn /etc/tinc/`hostname`/hosts
vim /etc/tinc/`hostname`/hosts/vpn # 第一行加上 Address = vpn-public-ip
scp /etc/tinc/vpn/hosts/`hostname` vpn-public-ip:/etc/tinc/vpn/hosts/
 // 启动服务
tincd -n `hostname` -D
ip link set tinc up
ip a add 192.168.120.2/24 dev tinc
ip r add 10.10.0.0/16 dev tinc
```


<a name="ttdKC"></a>
#### 删文件报错 Structure needs cleaning
```bash
sudo rm -fR hourly.5/

rm: cannot remove 'hourly.5/snapshot_root/mnt/Vancouver/temp/temp - old/temp - 09 (Dec 07, 2014 - Sep 02, 2015)/a_OLD-gmail/victoria.a.stuart@gmail.com/[Gmail]/LINUX/rsync, rsnapshot; Other backups/19.bak': Structure needs cleaning
```
原因可能是文件系统损坏，xfs 文件系统可以使用 Live 系统登陆后使用以下命令尝试修复：
```bash
umount /dev/sda1
xfs_repair /dev/sda1
```


<a name="hh4rr"></a>
#### coredumpctl 
```bash
coredumpctl list
coredumpctl dump pid
coredumpctl dump chrome
coredumpctl -o core.dump dump chrome
coredumpctl gdb pid
```


<a name="AUh3a"></a>
#### 终端设置全局代理，对 ssh 和 http均有效
```bash
export ALL_PROXY=socks5://127.0.0.1:1080
```


<a name="JiKnX"></a>
#### nethogs 查看进程网速
```bash
yum install nethogs
```


<a name="LldNZ"></a>
#### fpm 制作 deb/rpm 安装包
参考：[https://askubuntu.com/a/1121733](https://askubuntu.com/a/1121733)
```
fpm -f -s dir -t deb -n iptables -v 1.6.2 -C `pwd` --prefix / --deb-no-default-config-files usr
```


<a name="aUM4A"></a>
#### 生成随机值
```
$(awk -v n=1 -v seed="$RANDOM" 'BEGIN { srand(seed); for (i=0; i<n; ++i) printf("%.4f\n", rand()*10) }')
```


<a name="bQa14"></a>
#### NetworkManager (nmcli)

- 设置静态地址
```bash
nmcli connection
nmcli con mod eth1 ipv4.addresses 192.168.5.1/24
nmcli con mod eth1 ipv4.method manual
nmcli con up eth1
```


<a name="s8j4z"></a>
#### base64 编码
```
echo -n 'test' | base64
```
<a name="fVXHJ"></a>
#### wget 到指定目录
```yaml
wget -P /tmp http://cluster-api.cn-bj.ufileos.com/cluster-api-uk8s-init.tar.gz
```
<a name="tiQ7D"></a>
#### tar 解压到指定目录
```yaml
tar -zxvf /tmp/cluster-api-uk8s-init.tar.gz -C /usr/local/bin
```
<a name="Eo8vV"></a>
#### 判断 Linux 发行版
通过 `/etc/os-release`
```yaml
ssh $ip "sed -n 's/^ID= *//p' /etc/os-release | xargs"
if [ "$result" = "centos" ]; then
  echo "=========current linux distribution is centos========"
  # do something
elif [ "$result" = "debian" ]; then
  echo "=========current linux distribution is debian========"
  ssh $ip "cat /etc/debian_version"
  if [ "$result" = "8.2" ]; then
    # do something
  fi
else
  echo "=========current linux distribution not support========"
  exit 1
fi
```
通过文件，参考：[https://stackoverflow.com/a/3792848](https://stackoverflow.com/a/3792848)
```yaml
if [ -f /etc/centos-release ]; then
  # do something
elif [ -f /etc/debian_version ]; then
  VERSION=$(cat /etc/debian_version)
  if [ "${VERSION}" = "8.2" ]; then
    echo "debian 8.2"
  fi
fi
```
使用 lsb_release
```yaml
# centos 需要安装支持软件
yum install redhat-lsb-core
# debian 可以直接使用
lsb_release -is
```


<a name="kMFK1"></a>
#### 判断文件是否存在
```bash
// -f 判断文件存在
if [ ! -f "/usr/local/bin/hyperkube.bak" ]; then cp /usr/local/bin/hyperkube /usr/local/bin/hyperkube.bak; fi
```
<a name="5xOak"></a>
#### sshpass 跳过 hostkey 检查
```bash
sshpass -p password scp -o StrictHostKeyChecking=no -r test/ root@10.8.53.47:/tmp/test
```


<a name="MRxpZ"></a>
#### 查看 NVIDIA GPU 工作情况
下载 P40 驱动：[http://us.download.nvidia.com/tesla/440.64.00/NVIDIA-Linux-x86_64-440.64.00.run](http://us.download.nvidia.com/tesla/440.64.00/NVIDIA-Linux-x86_64-440.64.00.run)
```
lspci | grep -i nvidia
nvidia-smi
```


<a name="4bqUv"></a>
#### jq
```bash
// 统计 curl 结果中 Info 数组的长度
curl 'http://…' | jq '.Infos' | jq length
```
<a name="FXG9d"></a>
#### rar 解压
```bash
sudo apt install unrar
sudo dnf install unrar
yay unrar
unrar e tecmint.rar
unrar e tecmint.rar /home/
```
<a name="4Os5J"></a>
#### Python & pip
出现安装错误：<br />`Cannot uninstall 'ipython'. It is a distutils installed project and thus we cannot accurately determine which files belong to it which would lead to only a partial uninstall.`<br />可尝试通过以下命令解决：
```
pip install --ignore-installed -U ipython
```


<a name="TYmp4"></a>
#### head/tail/dd 截取文件中部分内容
```bash
head -n 100 file   # 前 100 行
head -c 100 file   # 前 100 字符
tail -n 100 file   # 后 100 行
tail -c 100 file   # 后 100 字符
head -n 10 /var/log/pacman.log | tail -n 1                    # 第 10 行
dd count=5 bs=1 if=/var/log/pacman.log 2>/dev/null            # 前 5 个字符
head -n 10 /var/log/pacman.log | tail -n 1 | cut -c 10-15     # 第 10 行的第 10 到 15 个字符
```
<a name="vc5dh"></a>
#### 快速生成大文件用于占位空间
参见：[https://askubuntu.com/questions/506910/creating-a-large-size-file-in-less-time](https://askubuntu.com/questions/506910/creating-a-large-size-file-in-less-time)
```bash
# 仅对支持该操作的文件系统有效，仅为一次系统调用，无 IO 读写，预分配空间，速度快，使用 du 查看确实占用了 5G 空间
fallocate -l 5G example_file
# 仅对支持该操作的文件系统有效，仅在文件末尾写入一个字节，使用 du 查看未见占用 10G 空间，有效性存疑
dd if=/dev/zero of=zeros.img count=1 bs=1 seek=$((10 * 1024 * 1024 * 1024 - 1)) 
# 常规的做法
dd if=/dev/urandom of=test1 bs=1M count=10240   # 用随机数填充文件
dd if=/dev/zero of=zero.img count=1024 bs=10M # 用 0 填充文件

```
<a name="NyjiF"></a>
#### /dev/null、/dev/zero、/dev/random和/dev/urandom
参考：[https://blog.csdn.net/sinat_26058371/article/details/86754683](https://blog.csdn.net/sinat_26058371/article/details/86754683)
```bash
# /dev/null “空”设备，又称黑洞。任何输入到这个“设备”的数据都将被直接丢弃。最常用的用法是把不需要的输出重定向到这个文件。
run.sh 1>/dev/null 2>&1  #将标准输出和错误输出重定向到/dev/null，运行这个脚本不会输出任何信息到终端
# /dev/zero “零”设备，可以无限的提供空字符（0x00，ASCII代码NUL）。常用来生成一个特定大小的文件。
dd if=/dev/zero of=./output.txt bs=1024 count=1 #产生一个1k大小的文件output.txt
# /dev/random 和 /dev/urandom 是随机数设备，提供不间断的随机字节流。
# /dev/random 产生随机数据依赖系统中断，当系统中断不足时，/dev/random 设备会“挂起”，因而产生数据速度较慢，但随机性好；
# /dev/urandom 不依赖系统中断，数据产生速度快，但随机性较低。
str=$(cat /dev/urandom | od -x | tr -d ' ' | head -n 1) # 利用 /dev/urandom 设备产生一个 128 位的随机字符串
```
<a name="HuRwm"></a>
#### iptables
```bash
// 备份 filter 表
iptables-save -t filter > iptables.bak
// 从备份恢复
iptables-restor < iptables.bak
```
<a name="UtLof"></a>
#### awk
修改 fstab ，添加 mount option，参见： [https://stackoverflow.com/a/9119317](https://stackoverflow.com/a/9119317)
```bash
// 为 /home 挂载添加 acl 配置
awk '$2~"^/home$"{$4="acl,"$4}1' OFS="\t" /etc/fstab
```
<a name="C3YgL"></a>
#### 判断字符串包含子串
参见：[https://stackoverflow.com/questions/229551/how-to-check-if-a-string-contains-a-substring-in-bash](https://stackoverflow.com/questions/229551/how-to-check-if-a-string-contains-a-substring-in-bash)
```bash
string='My string';
# 会进行整个字符串的匹配，不需要加通配符
if [[ $string =~ "My" ]]
then
   echo "It's there!"
fi
```
<a name="ujq6H"></a>
#### findmnt
参见： [https://www.tecmint.com/find-mounted-file-systems-in-linux/](https://www.tecmint.com/find-mounted-file-systems-in-linux/)
```bash
# 列出所有 ext4 文件系统
findmnt -t ext4
# 查找 /data 挂载点
findmnt -T /data
# 在 /etc/fstab 中查找挂载点
findmnt -s
# 隐藏打印的信息列头
findmnt -n
# 指定输出的列
findmnt -o FSTYPE
```


<a name="1FJ0W"></a>
#### systemctl
```bash
# 判断服务是否存活
systemctl is-active --quiet service
```


<a name="5f7Ry"></a>
#### shell 脚本语法校验
参考：[https://stackoverflow.com/questions/171924/how-do-i-syntax-check-a-bash-script-without-running-it](https://stackoverflow.com/questions/171924/how-do-i-syntax-check-a-bash-script-without-running-it)
```bash
bash -n tmp.sh
// 或者安装 shellcheck 工具
shellcheck tmp.sh
```


<a name="vcsBE"></a>
#### 带超时的循环
参考：[https://stackoverflow.com/questions/27555727/timeouting-a-while-loop-in-linux-shell-script](https://stackoverflow.com/questions/27555727/timeouting-a-while-loop-in-linux-shell-script)
```bash
timeout 5 bash -c -- 'while true; do printf ".";done'
```


<a name="EvNGL"></a>
#### shell 中打印带日期的日志
参考：[https://serverfault.com/a/310099](https://serverfault.com/a/310099)
```bash
echo $(date -u) "Some message or other"
```


<a name="y3vg8"></a>
#### 部署 STUN 服务
参考：[https://github.com/coturn/coturn](https://github.com/coturn/coturn)，[http://www.stunprotocol.org/](http://www.stunprotocol.org/)，[https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)<br />

<a name="d8YOA"></a>
#### 常见工具的 IPV6 模式
```bash
scp -6 hyperkube root@[2003:da8:2004:1000:0a09:6ec4:0006:ed49]:/tmp
ping6 2003:da8:2004:1000:0a2a:1e5e:0122:d75b
```


<a name="EsaA7"></a>
#### 实用工具

- 一个在线渲染代码为图片的网站：[https://carbon.now.sh/](https://carbon.now.sh/) ， 可以通过设置修改边框等信息。
- pandoc 可以借助第三方引擎实现各种文档格式之间的转换：[https://pandoc.org/](https://pandoc.org/)。
- MOBI 转 PDF 的在线网站：[https://ebook2pdf.com/](https://ebook2pdf.com/)
- Github dispatch 使用示例：[https://alejandroandr.eu/posts/manual-trigger-github-workflows/](https://alejandroandr.eu/posts/manual-trigger-github-workflows/)
- deepin-wine 安装微软雅黑字体 : [https://github.com/wszqkzqk/deepin-wine-ubuntu/issues/136#issuecomment-514585722](https://github.com/wszqkzqk/deepin-wine-ubuntu/issues/136#issuecomment-514585722)
- 配置 Linux 为一个简单的路由器：[https://www.ascinc.com/blog/linux/how-to-build-a-simple-router-with-ubuntu-server-18-04-1-lts-bionic-beaver/](https://www.ascinc.com/blog/linux/how-to-build-a-simple-router-with-ubuntu-server-18-04-1-lts-bionic-beaver/)
- 安装 cuda 参考：[https://linuxconfig.org/how-to-install-nvidia-cuda-toolkit-on-centos-7-linux](https://linuxconfig.org/how-to-install-nvidia-cuda-toolkit-on-centos-7-linux)
- 下载 vscode 使用国内镜像: [https://zhuanlan.zhihu.com/p/112215618](https://zhuanlan.zhihu.com/p/112215618)



<a name="Ocuwz"></a>
#### 疑难杂症

- ssh 设置 `UseDNS no` 后仍然登录慢，依然有可能是 DNS 解析的问题，更改 /etc/resolv.conf 中配置的 nameserver 之后好了。
- centos yum 命令执行到 `Loaded plugins: fastestmirror` 时很慢，也可能是 DNS 解析的问题。

