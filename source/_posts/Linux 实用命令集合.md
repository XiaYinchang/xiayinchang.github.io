---
title: Linux 实用命令集合
urlname: qyggmq
date: '2019-11-09 00:00:00 +0800'
updated: 'Tue Feb 11 2020 00:00:00 GMT+0800 (China Standard Time)'
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

执行上述脚本，只是临时创建虚拟网卡，系统重启后又会消失，目前没找到持久化方法，所以只能退而求其次，将上述脚本做成一个服务，在每次系统启动时自动执行以上操作：

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

创建完上述文件，不要忘了执行 systemctl enable --now veth 启用服务；而对于虚拟网卡设备的配置仍然放在网络配置文件目录下：

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

现在，就算重启系统虚拟网卡也会被自动重建了。

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

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1570848156874-4feb1fc6-38d3-4dc2-a3f9-ff076f94291e.png#align=left&display=inline&height=230&name=image.png&originHeight=230&originWidth=716&size=13999&status=done&style=none&width=716)<br />

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

<a name="3HTPv"></a>
#### VIM

- 替换空格为换行

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1559296752599-dea00714-5a9b-40e4-9f26-b2aff1323c3c.png#align=left&display=inline&height=25&name=image.png&originHeight=25&originWidth=160&size=2640&status=done&style=none&width=160)

<a name="FfBcn"></a>
#### Git

- 修改历史 commit 信息
```
git rebase -i HEAD~2
pick -> edit
git commit --amend
git rebase --continue
```

- 修改 commit 时间
```
# 设置为当前时间
GIT_COMMITTER_DATE="$(date '+%Y-%m-%d %H:%M:%S')" git commit --amend --no-edit --date "$(date)"
# 设置为指定时间
GIT_COMMITTER_DATE="Mon 20 Aug 2018 20:19:19 BST" git commit --amend --no-edit --date "Mon 20 Aug 2018 20:19:19 BST"
```

- 比较两个分支的不同
```
git diff branch_1..branch_2
```

- merge 时使用指定方代码解决冲突
```go
git merge -X theirs origin/dev
git merge -X ours origin/dev
```

- 查看一个文件完整的修改历史
```
git log --follow -p -- _config.yml
```

- 将当前分支下子目录内容提交至另一个分支
```
git subtree push --prefix dist origin gh-pages
```

- 删除 submodule
```
git submodule deinit <path_to_submodule>
git rm <path_to_submodule>
git commit -m "Removed submodule "
```

- 合并所有 commit 为一个
```
git rebase --root -i
```

- 删除所有没有远程分支的本地分支
```
git fetch -p && git branch -vv | awk '/: gone]/{print $1}' | xargs git branch -d
```

- 撤销某个 commit
```
git revert --strategy resolve <commit>
```

- 使用 ssh 替代 https 访问
```bash
git config --global url."git@git.ucloudadmin.com:".insteadOf "https://git.ucloudadmin.com/"
```

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

或者

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
strace 用法参考： [https://www.howtoforge.com/linux-strace-command/](https://www.howtoforge.com/linux-strace-command/)

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
先删除 `/root/.ssh/authorized_keys` 中的多余限制信息，之后在 `/etc/ssh/sshd_config` 中添加 `PermitRootLogin yes` 后重启 sshd 服务。

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
更多内容参考：[https://www.scaleway.com/en/docs/vegeta-load-testing/](https://www.scaleway.com/en/docs/vegeta-load-testing/)

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

<a name="fL7Yx"></a>
#### 实用工具

- 一个在线渲染代码为图片的网站：[https://carbon.now.sh/](https://carbon.now.sh/) ， 可以通过设置修改边框等信息。
- pandoc 可以借助第三方引擎实现各种文档格式之间的转换：[https://pandoc.org/](https://pandoc.org/)。
- MOBI 转 PDF 的在线网站：[https://ebook2pdf.com/](https://ebook2pdf.com/)
- Github dispatch 使用示例：[https://alejandroandr.eu/posts/manual-trigger-github-workflows/](https://alejandroandr.eu/posts/manual-trigger-github-workflows/)
- deepin-wine 安装微软雅黑字体 : [https://github.com/wszqkzqk/deepin-wine-ubuntu/issues/136#issuecomment-514585722](https://github.com/wszqkzqk/deepin-wine-ubuntu/issues/136#issuecomment-514585722)



