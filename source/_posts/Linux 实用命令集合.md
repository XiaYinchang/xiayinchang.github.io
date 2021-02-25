---
title: Linux 实用命令集合
urlname: qyggmq
date: '2019-11-09 00:00:00 +0800'
layout: post
categories: Linux
tags:
  - Linux
  - "\_云计算"
keywords: 'Linux, Docker'
description: 在云计算场景下常用的 Linux 命令记录。
abbrlink: b489449e
updated: 2021-01-19 00:00:00
---

#### CentOS

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

- 安装 fish

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

首先，选中要编辑的内核项，按 **e** 进入编辑页面，编辑完成后按  **Ctrl + x**  启动系统。下图为编辑内核参数直接进入救援模式。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1570848156874-4feb1fc6-38d3-4dc2-a3f9-ff076f94291e.png#align=left&display=inline&height=230&margin=%5Bobject%20Object%5D&name=image.png&originHeight=230&originWidth=716&size=13999&status=done&style=none&width=716)

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
# 查询已安装的软件包
rpm -qa | grep sysstat
# 查询软件包信息
rpm -qi sysstat-10.1.5-19.el7.x86_64
# 查询软件包含的文件信息
rpm -ql sysstat-10.1.5-19.el7.x86_64
# 通过绝对路径查询文件属于哪个软件包
rpm -qf /usr/bin/pidstat
# 查看安装包中的版本信息
rpm -qip foo.rpm
# 只下载不安装
yum install -y --downloadonly --downloaddir=. docker-ce
# 列出依赖包
yum deplist containerd
```

- 安装指定版本

```
yum --showduplicate list kubeadm
yum install kubeadm-1.17.4-0
```

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

#### Raspberry

- 清理桌面环境

```bash
sudo apt-get purge desktop-base lightdm lxappearance lxde-common lxde-icon-theme lxinput lxpanel lxpolkit lxrandr lxsession-edit lxshortcut lxtask lxterminal obconf openbox raspberrypi-artwork xarchiver xinit xserver-xorg xserver-xorg-video-fbdev
sudo apt-get autoremove --purge
```

#### vim

- 替换空格为换行

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1559296752599-dea00714-5a9b-40e4-9f26-b2aff1323c3c.png#align=left&display=inline&height=25&margin=%5Bobject%20Object%5D&name=image.png&originHeight=25&originWidth=160&size=2640&status=done&style=none&width=160)

- 替换 tab 为空格

`:%s/\t/ /g`

- 复制

`v` 进入按字符复制模式， `Shift + v `进入按行复制模式，`Ctrl + Shift + v` 进入按块复制模式

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

- 执行命令

```
ansible -i hosts master -m shell -a "ls /root"
```

- 从远端拉取文件

```
ansible -i hosts master -m fetch -a "src=/root/test.json dest=/root/test.json"
```

- 上传文件

```
ansible -i hosts master -m copy -a "src=/root/uk8s-apiresources dest=/root/uk8s-apiresources mode=0777"
```

#### man

```
// 查看 man 命令使用说明
man man
// 查看 exit bash 命令使用说明
man exit
// 查看 exit 系统调用使用说明，指定 section 为 2（系统调用手册所在区）
man 2 exit
// 默认情况 man 会找到最佳匹配结果并显示，若需要显示所有匹配结果可使用 -a 参数
man -a socket
// 如果提示 No entry in section 2 ，可尝试安装 man-pages
yay -S man-pages
```

#### tcpdump

捕获 http 包，更多参考：[https://hackertarget.com/tcpdump-examples/](https://hackertarget.com/tcpdump-examples/)，[https://danielmiessler.com/study/tcpdump/](https://danielmiessler.com/study/tcpdump/)

```bash
tcpdump -s 0 -A 'tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x47455420'
tcpdump -ni ens5f0 -A -s 10240 'tcp port 8056 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)' | egrep --line-buffered "^........(GET |HTTP\/|POST |HEAD )|^[A-Za-z0-9-]+: " | sed -r 's/^........(GET |HTTP\/|POST |HEAD )/\n\1/g'
```

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

#### pstree

进程树中，名称使用大括号包裹的为线程，其它为进程。

```bash
$ pstree -pg | grep node
             |-node(26200,26200)-+-node(26211,26200)-+-{node}(26212,26200)
             |                   |                   |-{node}(26213,26200)
             |                   |                   |-{node}(26214,26200)
             |                   |                   |-{node}(26215,26200)
             |                   |                   |-{node}(26216,26200)
             |                   |                   |-{node}(26217,26200)
             |                   |                   |-{node}(26218,26200)
             |                   |                   |-{node}(26219,26200)
             |                   |                   |-{node}(26220,26200)
             |                   |                   `-{node}(26221,26200)
             |                   |-{node}(26201,26200)
             |                   |-{node}(26202,26200)
             |                   |-{node}(26203,26200)
             |                   |-{node}(26204,26200)
             |                   |-{node}(26205,26200)
             |                   |-{node}(26206,26200)
             |                   |-{node}(26207,26200)
             |                   |-{node}(26208,26200)
             |                   |-{node}(26209,26200)
             |                   `-{node}(26210,26200)
```

可通过 top 命令进一步验证：

```bash
# 列出一个进程中所有线程的信息
top -H -p 26200
```

另一个分辨方式是线程共享地址空间，一个进程中的所有线程具有相同的 VIRT，RES 和 SHR ，如下图：
![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1592743812467-47c3df1f-4677-4969-a005-3bff19a08a40.png#align=left&display=inline&height=771&margin=%5Bobject%20Object%5D&name=image.png&originHeight=1542&originWidth=2700&size=902573&status=done&style=none&width=1350)

#### fuser 找到正在使用某个文件的进程

```bash
// fuser 是 file user 的缩写
fuser -uv <filename>
fuser -uvm /folder
// 查看哪个程序在占用 8000 端口
fuser -v -n tcp 8000
```

#### lsof 列出所有打开的文件

```bash
// lsof 是 list open files 的缩写
// -i 代表列出正在打开的 IPV4[6] 文件； -n 表示不进行 DNS 反解； -P 表示不进行端口反解
lsof -i -n -P
// 查看当前目录下打开的文件
lsof .
# 获取指定进程打开的文件
lsof -p pid
```

#### strace

strace 用法参考： [https://www.howtoforge.com/linux-strace-command/](https://www.howtoforge.com/linux-strace-command/)

```
strace -i ls
```

#### getent 获取系统用户信息

```
getent passwd
```

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
eval sed 's/$a/$b/' filename
sed "s/$a/$b/" filename
sed 's/'$a'/'$b'/' filename
sed s/$a/$b/ filename
```

- 替换多个空格为一个

```bash
sed 's/\s\+/ /g'
```

- 打印指定行

```bash
# -n 不打印输入内容; -e 多项操作或; p 表示打印
sed -n 8p file  #print line 8
sed -n -e 1p -e 8p file   #print line 1 and line 8
sed -n 1,8p file    #print line 1 to line 8
sed -n -e 1,8p -e 20p file   #print line 1-8 and line 20
```

- 删除指定行

```bash
sed -i '2d' filename                # 删除第二行
sed -i '2,5d' filename					    # 删除第 2 至第 5 行
var1=7
var2=9
sed -i "${var1},${var2}d" filename	# 这里引号必须为双引号，删除第 7 到第 9 行
sed -i '$d' filename                # 删除最后一行
sed -i '/xxx/d' filename            # 删除包含 xxx 的行
```

- 替换一组文件中的字符

```bash
sed -i 's/CURRENT_HOST_ZONE_ID/test/g' /tmp/{test1,test2}
```

- 插入多个空格只需要在第一个空格前加反斜线

```bash
sed -i -e '/network-plugin/i\                --container-runtime=remote \\' /etc/kubernetes/kubelet
```

- 在指定模式串前面或后面添加内容

```bash
# 后面
sed -i '/\[Service\]/a EnvironmentFile\=\-\/etc\/kubernetes\/ucloud' /usr/lib/systemd/system/containerd.service
# 前面只需将 a 换成 i
```

- 对目录下所有文件执行替换

```bash
# 最后的 \; 必不可少
find ./ -type f -exec sed -i -e "s/K8S_NODE_NAME/$K8S_NODE_NAME/g" -e "s/WORK_Dir/$WORK_Dir/g" -e "s/STATUS_CM/$STATUS_CM/g" {} \;
```

- 报错

```
如下报错一般是因为匹配字符串中包含了多余的 /
sed: -e expression #1, char 34: unknown option to `s'
```

#### grep

```bash
# -i 不区分大小写; -n 显示文件行号; -e 多项查询条件，或操作
grep -in -e 'AddNode' -e 'checkpara' -r .
grep -E "10.9.150.110|10.9.68.13"
# -v 匹配不符合指定条件的内容
grep -in -v 'AddUK8SClusterNode' -r .
grep -v -E "10.9.150.110|10.9.68.13"
# -I 忽略检索二进制文件，等同于 --binary-files=without-match
grep -I -i 'ifup-post' -r .
```

#### awk

修改 fstab ，添加 mount option，参见： [https://stackoverflow.com/a/9119317](https://stackoverflow.com/a/9119317)

```bash
# 为 /home 挂载添加 acl 配置
awk '$2~"^/home$"{$4="acl,"$4}1' OFS="\t" /etc/fstab
```

打印指定列，参考：[https://www.cnblogs.com/liuyihua1992/p/9689308.html](https://www.cnblogs.com/liuyihua1992/p/9689308.html)

```bash
# $0 表示所有列; -F 指定解析时使用的分隔符; $(NF) 表示最后一列，$(NF-1) 表示倒数第二列，以此类推
awk '{print $0}' file    #打印所有列
awk '{print $1}' file  #打印第一列
awk '{print $1, $3}' file   #打印第一和第三列
cat file | awk '{print $3, $1}'   #打印第三列和第一列，注意先后顺序。
cat file | awk '{print $3, $NF}' #打印第三列和最后一列
awk -F ":" '{print $1, $3}'  #以“:”为分隔符分割列，然后打印第一列和第三列
# 一种打印N列之后的所有列的方法：把前N列都赋值为空，然后打印所有列
awk '{for(i=1;i<=N;i++){$i=""}; print $0}' file
# 打印时带上分隔符
awk -v OFS=',' '{print $1,$2}'
# 处理多个返回值
crictl images | grep -v IMAGE | awk '{print $1,$2}' | while read var1 var2; do echo $var1":"$var2; done
```

#### tee

```bash
# 同时输出到标准输出和追加至文件
echo "test"| tee -a outfile
```

#### split

```bash
# 按行数分割文件
split -l 300 log.txt newfile
# 按大小分割文件
split -b 500m log.txt newfile
```

#### date

```bash
# 获取当前时间时间戳，ms 为单位
echo `expr \`date +%s%N\` / 1000000`
```

#### od

```
# 按指定进制读取文件的二进制数据 -d 十进制  -o 八进制  -x 十六进制 -t 可用以指定显示时每项的字节宽度
od -t u1 prometheus-new.yaml
```

#### sort

```bash
# 按指定列排序
sort -k 2 file.txt
```

#### crond

/etc/cron.d 目录下添加文件设置定时任务时必须要在文件结尾加换行才能生效。

#### iproute2

```
# 获取指定目标地址匹配的路由
ip route get 106.75.220.2
```

#### 正则匹配

```bash
# 匹配除空格以外的字符
\S+ 或 [^\s]+
```

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

#### 允许使用 root 用户 ssh 登录

先删除 `/root/.ssh/authorized_keys` 中的多余限制信息，之后在 `/etc/ssh/sshd_config` 中添加 `PermitRootLogin yes` 后重启 sshd 服务。

#### 解决"rtnetlink answers file exists"

```
ip a flush dev eth0
```

#### 查看登录记录

```bash
# 查看当前登录用户
who
# 查看最近登录记录
last -F
# 查看最近90天所有用户的最后登录时间
lastlog --time 90
```

#### rsync 同步时需要 root 权限

```bash
rsync -aru -e "ssh" --rsync-path="sudo rsync" 172.16.110.215:~/ ~/  --progress --exclude=.cache
```

#### rclone  将 http file server 的内容同步到本地

```bash
rclone sync --http-url http://my.file.server :http:centos/test /repo/test --progress
```

#### expr 比较字符串大小

```bash
str3='v1.13'
str2='v1.14'
if [ $(expr ${str3} \<= ${str2}) -eq 1 ]; then    echo "[${str3}] <= [${str2}]"; else    echo "[${str3}] > [${str2}]"; fi
```

#### tr 移除所有空格

```bash
// 获取 kubernetes 版本
kubectl version --short | tail -1 | cut -d':' -f2 | tr -d '[:space:]'
```

#### vegeta 对 HTTP 服务进行性能测试

```go
echo "GET http://localhost:8080/cephcsi" | vegeta attack -rate=20000 -duration=60s > result.bin
vegeta report result.bin
```

更多内容参考：[https://www.scaleway.com/en/docs/vegeta-load-testing/](https://www.scaleway.com/en/docs/vegeta-load-testing/)

#### zip 压缩文件不带顶级目录

```
pushd /Users/me/development/something
cd path/to/parent/dir/;
zip -r complete/path/to/name.zip ./*
popd
```

#### MySQL

- 执行单行命令

```
mysql --user="$user" --password="$password" --database="$database" --execute="DROP DATABASE $user; CREATE DATABASE $database;"
```

- 导出数据库

```
// 导出
mysqldump -P 3306 -u root --password=password -h 172.30.100.43  keycloak > keycloak-3.sql
// 导入
mysql -P 3306 -u root --password=password -h 172.30.100.43  keycloak < keycloak.sql
```

#### ss 列出所有处于监听状态的 socket

```javascript
ss -lntu
-l = only services which are listening on some port
-n = show port number, don't try to resolve the service name
-t = tcp ports
-u = udp ports
-p = name of the program
```

#### 查看网段中已使用 IP

```bash
arp-scan -I eth0 192.168.180.0/24
//或
nmap -sP -PR 192.168.180.*
```

#### Wireshark 过滤表达式

参考：[https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html](https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html)

```
ip.scr==10.0.0.5 or ip.dst==192.1.1.1
```

#### alpine 修改镜像源

```
sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
```

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

#### 删文件报错  Structure needs cleaning

```bash
sudo rm -fR hourly.5/

rm: cannot remove 'hourly.5/snapshot_root/mnt/Vancouver/temp/temp - old/temp - 09 (Dec 07, 2014 - Sep 02, 2015)/a_OLD-gmail/victoria.a.stuart@gmail.com/[Gmail]/LINUX/rsync, rsnapshot; Other backups/19.bak': Structure needs cleaning
```

原因可能是文件系统损坏，xfs 文件系统可以使用 Live 系统登陆后使用以下命令尝试修复：

```bash
umount /dev/sda1
xfs_repair /dev/sda1
```

#### coredumpctl 

```bash
coredumpctl list
coredumpctl dump pid
coredumpctl dump chrome
coredumpctl -o core.dump dump chrome
coredumpctl gdb pid
```

#### 终端设置全局代理，对 ssh 和 http 均有效

```bash
export ALL_PROXY=socks5://127.0.0.1:1080
```

#### fpm 制作 deb/rpm 安装包

参考：[https://askubuntu.com/a/1121733](https://askubuntu.com/a/1121733)

```
fpm -f -s dir -t deb -n iptables -v 1.6.2 -C `pwd` --prefix / --deb-no-default-config-files usr
```

#### 生成随机值

```
$(awk -v n=1 -v seed="$RANDOM" 'BEGIN { srand(seed); for (i=0; i<n; ++i) printf("%.4f\n", rand()*10) }')
```

#### NetworkManager (nmcli)

- 设置静态地址

```bash
nmcli connection
nmcli con mod eth1 ipv4.addresses 192.168.5.1/24
nmcli con mod eth1 ipv4.method manual
nmcli con up eth1
```

#### base64 编码

```
# echo 不打印换行
echo -n 'test' | base64
# base64 输出不打印换行
echo -n "apfjxkic-omyuobwd339805ak:60a06cd2ddfad610b9490d359d605407" | base64 -w 0
```

#### wget

```yaml
# 下载文件到指定目录
wget -P /tmp http://cluster-api.cn-bj.ufileos.com/cluster-api-uk8s-init.tar.gz
# 下载指定目录下所有文件到本地当前目录：-nd 不创建目录；-r 递归下载；-l1 只下载当前目录下的文件；–no-parent 不下载父目录中的文件
# -nd 递归下载时不创建一层一层的目录，把所有的文件下载到当前目录
# -np 递归下载时不搜索上层目录，如wget -c -r www.xianren.org/pub/path/
wget -nd -r -l1 --no-parent --reject "index.html*" http://demo.abc.com/path/to/file/
```

#### tar 解压到指定目录

```yaml
tar -zxvf /tmp/cluster-api-uk8s-init.tar.gz -C /usr/local/bin
```

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

#### sshpass 跳过 hostkey 检查

```bash
sshpass -p password scp -o StrictHostKeyChecking=no -r test/ root@10.8.53.47:/tmp/test
```

#### 查看 NVIDIA GPU 工作情况

下载 P40 驱动：[http://us.download.nvidia.com/tesla/440.64.00/NVIDIA-Linux-x86_64-440.64.00.run](http://us.download.nvidia.com/tesla/440.64.00/NVIDIA-Linux-x86_64-440.64.00.run)

```
lspci | grep -i nvidia
nvidia-smi
```

#### fio 

可指定 fio 测试输出结果格式为 json ，然后使用 jq 按需解析，参考：[https://boke.wsfnk.com/archives/293.html](https://boke.wsfnk.com/archives/293.html)

#### jq

```bash
// 统计 curl 结果中 Info 数组的长度
curl 'http://…' | jq '.Infos' | jq length
```

#### rar 解压

```bash
sudo apt install unrar
sudo dnf install unrar
yay unrar
unrar e tecmint.rar
unrar e tecmint.rar /home/
```

#### Python & pip

出现安装错误：
`Cannot uninstall 'ipython'. It is a distutils installed project and thus we cannot accurately determine which files belong to it which would lead to only a partial uninstall.`
可尝试通过以下命令解决：

```
pip install --ignore-installed -U ipython
```

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

#### /dev/null、/dev/zero、/dev/random 和/dev/urandom

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

#### iptables

```bash
// 备份 filter 表
iptables-save -t filter > iptables.bak
// 从备份恢复
iptables-restor < iptables.bak
```

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

#### systemctl

```bash
# 判断服务是否存活
systemctl is-active --quiet service
# 获取服务文件地址
systemctl show -p FragmentPath containerd | awk -F "=" '{print $2}'
```

#### conntrack

```bash
# 显示时间戳
conntrack -E -o timestamp
```

#### ssh

- ssh debug 带时间戳

参考：[https://www.depesz.com/2010/12/13/a-tale-of-slow-ssh-connections/](https://www.depesz.com/2010/12/13/a-tale-of-slow-ssh-connections/), [https://blog.csdn.net/sinat_38723234/article/details/103216464](https://blog.csdn.net/sinat_38723234/article/details/103216464)

```bash
time ssh -v 192.168.255.128 id 2>&1  | perl -pe 'use Time::HiRes qw( time ); $_ = sprintf("%.6f %s", time(), $_)'
```

- ssh 保持连接存活

可以在客户端设置  ServerAliveInterval 或者在服务端设置  ServerAliveInterval，其效果是一样的，即在一段时间没有收到对方的数据后，发送探活消息，确保连接存活。分别配合 ServerAliveCountMax（默认为 3 ） 和 ClientAliveCountMax （默认为 3 ）使用，超过三次探活包没有得到回应则关闭会话。与  TCPKeepAlive 的一个不同是，ssh 的探活消息是加密传输的。

```bash
echo "ClientAliveInterval 60" | sudo tee -a /etc/ssh/sshd_config
echo "	ServerAliveInterval 30" >> /etc/ssh/ssh_config
echo "ServerAliveInterval 60" >> ~/.ssh/config
```

- ssh 取消 StrictHostKeyChecking 并从环境变量读取 ssh key 到本地

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

#### pssh

轻量的 ssh 批量操作工具

```
# 安装
yum install pssh
#pssh 远程批量执行命令
pssh -h ip.txt -P "uptime"
#-h  后面接主机ip文件,文件数据格式[user@]host[:port]
#-P  显示输出内容
#如果没办法密钥认证.可以采用下面方法,但不是很安全
sshpass -p 123456 pssh -A -h ip.txt -i "uptime"
```

#### 按行读取文件并处理

参考：[https://stackoverflow.com/questions/10929453/read-a-file-line-by-line-assigning-the-value-to-a-variable](https://stackoverflow.com/questions/10929453/read-a-file-line-by-line-assigning-the-value-to-a-variable)

```bash
# IFS= (or IFS='') 不去除行头和行尾的空格，一般可不加
# -r 不进行反斜线转义，原样输出
while IFS= read -r line; do
    echo "Text read from file: $line"
done < my_filename.txt
```

#### 浮点数运算

```bash
echo 'scale=2; 3/2' | bc -l
```

#### 部署 STUN 服务

参考：[https://github.com/coturn/coturn](https://github.com/coturn/coturn)，[http://www.stunprotocol.org/](http://www.stunprotocol.org/)，[https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)

#### 安装 ruby

```bash
gpg2 --keyserver hkp://pool.sks-keyservers.net --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3 7D2BAF1CF37B13E2069D6956105BD0E739499BDB
curl -sSL get.rvm.io | bash -s stable
source /etc/profile.d/rvm.sh
echo "ruby_url=https://cache.ruby-china.com/pub/ruby" > /usr/local/rvm/user/db
rvm list known
rvm install 2.3.1
rvm use 2.3.1 --default
gem sources --add https://mirrors.tuna.tsinghua.edu.cn/rubygems/ --remove https://rubygems.org/
gem sources -l
gem install --no-document fpm
```

#### find

```bash
# 按扩展名排除文件
find . -not -name "*.exe" -not -name "*.dll" -not -type d
```

#### find -print0 与  xargs -0

一般会有下列用法：

```bash
find . -name "*.txt" | xargs rm
```

上述用法在大多数时候是有效的，而当文件名称中包含空格或换行符时则会出错，这是因为 xargs 默认将空格或换行符作为切分字符串的标识。一种有效的改进方法是使用 NULL 作为分隔符，如下：

```bash
find . -name "*.txt" -print0 | xargs -0 rm
```

其中，-print0 用于告诉 find 在每个查询到的结果后加一个 NULL 字符而不是默认的加一个换行符，-0 告诉 xargs 使用 NULL 来分切字符串而不是默认的空格或换行符。参考：[https://www.cnblogs.com/liuyihua1992/p/9689314.html](https://www.cnblogs.com/liuyihua1992/p/9689314.html)
另一种简单可行的方法是：

```bash
find . -name "*.txt" | xargs -i rm {}
# 或者
find . -name "*.txt" | xargs -I {} rm {}
```

其中 -i 默认使用 {} 作为替换符号， -I 可以自行指定其他的替换符号，其能够生效的原因是该选项使得 xargs 以换行符为结尾的每一项直接去替换 {} ，而不再使用换行符或空格去解析字符内容。

#### nginx 指定子进程运行时使用的用户

更改 `/etc/nginx/nginx.conf` 配置`user nginx;`。参考：[https://stackoverflow.com/a/42329561](https://stackoverflow.com/a/42329561)

#### 禁用 selinux

参考：[https://linuxconfig.org/how-to-disable-enable-selinux-on-ubuntu-20-04-focal-fossa-linux](https://linuxconfig.org/how-to-disable-enable-selinux-on-ubuntu-20-04-focal-fossa-linux)

```bash
echo 'SELINUX=disabled' > /etc/selinux/config
```

#### 检查最近是否出现 OOM

```
dmesg | egrep -i "killed process"
#CentOS
grep -i "out of memory" /var/log/messages
#Debian / Ubuntu
grep -i "out of memory" /var/log/kern.log
```

#### 判断 cloud-init 结束

cloud-init 执行结束后会创建文件 `/var/lib/cloud/instance/boot-finished`

#### 手动添加 ARP 表项

```
# 该命令仅临时有效，重启消失
arp -s 10.0.0.2 00:0c:29:c0:94:bf
# 可将相关命令放入开机启动脚本每次开机自动添加
arp -i eth0 -s 192.168.0.4 00:50:cc:44:55:55
```

#### 添加开机启动脚本

常规的做法是在 `/etc/rc.local` 中添加相关脚本，但现在并不推荐这样做，centos `rc.local` 中有这样一段提示：

```
 cat /etc/rc.local
#!/bin/bash
# THIS FILE IS ADDED FOR COMPATIBILITY PURPOSES
#
# It is highly advisable to create own systemd services or udev rules
# to run scripts during boot instead of using this file.
#
# In contrast to previous versions due to parallel execution during boot
# this script will NOT be run after all other services.
#
# Please note that you must run 'chmod +x /etc/rc.d/rc.local' to ensure
# that this script will be executed during boot.

touch /var/lock/subsys/local
```

对于网络相关的配置，也可以创建 `/sbin/ifup-pre-local` 或者 `/sbin/ifup-local` 脚本，它们分别在 `ifup` 和 `ifup-post` 中被调用。
所以更好的一种方式是创建由 systemd 管理的一次性服务，服务中可设置 Type=oneshot 或 Type=simple 。

#### systemd

参考：[http://www.jinbuguo.com/systemd/systemd.service.html](http://www.jinbuguo.com/systemd/systemd.service.html)，[http://www.jinbuguo.com/](http://www.jinbuguo.com/)，[https://www.ruanyifeng.com/blog/2016/03/systemd-tutorial-part-two.html](https://www.ruanyifeng.com/blog/2016/03/systemd-tutorial-part-two.html)，[https://stackoverflow.com/a/39050387](https://stackoverflow.com/a/39050387)

#### systemd-modules-load.service

systemd-modules-load.service 在系统启动时自动读取 /etc/modules-load.d 等目录下的配置文件加载指定的内核模块。

#### 拉高 CPU 使用率

```bash
cat /dev/zero>/dev/null
```

#### 配置 6to4 隧道

参考：[https://www.deepspace6.net/docs/iproute2tunnel-en.html](https://www.deepspace6.net/docs/iproute2tunnel-en.html)，[https://www.tldp.org/HOWTO/Linux+IPv6-HOWTO/ch09s04.html](https://www.tldp.org/HOWTO/Linux+IPv6-HOWTO/ch09s04.html)

#### 常见工具的 IPV6 模式

```bash
scp -6 hyperkube root@[2003:da8:2004:1000:0a09:6ec4:0006:ed49]:/tmp
ping6 2003:da8:2004:1000:0a2a:1e5e:0122:d75b
curl -g 'http://[2003:ac12:fed0:1:0:ff:aad:aef]:8080'
```

#### linux 排故常用命令

[https://arthurchiao.art/blog/linux-trouble-shooting-cheat-sheet/](https://arthurchiao.art/blog/linux-trouble-shooting-cheat-sheet/)

#### journalctl

```bash
# 获取指定时间段的日志
journalctl -u kube-apiserver.service --since "2020-07-27 17:10:00" --until "2020-07-27 17:15:00"
# 获取磁盘用量
journalctl --disk-usage
# 仅保留两天内日志
journalctl --vacuum-time=2d
# 仅保留 500M 日志
journalctl --vacuum-size=500M
# 两者可结合使用，表明两个条件需同时满足
journalctl --vacuum-time=2d --vacuum-size=500M
```

#### 手动断开一个 TCP 连接

在 server 端手动断开一个连接，可以有以下几种方式：

```bash
ss -K dst 192.168.1.214 dport = 49029
iptables -A FORWARD -p TCP  -s 192.168.1.146 --sport 36522 -j REJECT --reject-with tcp-reset
conntrack -D -p tcp --src 192.168.1.146 --sport 33486
```

#### NR 与 \_nr

在 awk 语义环境中， NR 和 NF 是内置的变量，NR 表示当前记录的行号，NF 则表示当前记录可以按照指定分隔符划分成几个部分。在 Linux 环境中，经常看到 nr 结尾的统计数据，此时 nr 代表的是 number 的缩写。

```
# 打印一行内容并随后打印当前行的 NF 值
awk '{print ; print NF}' infile
# 打印每行的 NR 值
awk '{print NR}' infile
# sar 打印系统使用的 file 和 inode 数量
sar -v 1 2
09:38:17 AM dentunusd   file-nr  inode-nr    pty-nr
09:38:18 AM     33059      2048     32077         1
09:38:19 AM     33059      2048     32077         1
Average:        33059      2048     32077         1
```

#### Linux 系统启动过程

上电 -> 从固件读取 BIOS -> 从磁盘固定位置（或者网络、CD 等）读取 BootLoader（通常是 GRUB2）-> BootLoader 加载内核和初始根文件系统 -> 加载文件系统 -> 初始化工作完成后启动 1 号用户进程 init。参考：[简述 Linux 的启动过程](https://segmentfault.com/a/1190000006872609)

#### 实用工具

- 一个在线渲染代码为图片的网站：[https://carbon.now.sh/](https://carbon.now.sh/) ， 可以通过设置修改边框等信息。
- pandoc 可以借助第三方引擎实现各种文档格式之间的转换：[https://pandoc.org/](https://pandoc.org/)。
- MOBI 转 PDF 的在线网站：[https://ebook2pdf.com/](https://ebook2pdf.com/)
- Github dispatch 使用示例：[https://alejandroandr.eu/posts/manual-trigger-github-workflows/](https://alejandroandr.eu/posts/manual-trigger-github-workflows/)
- deepin-wine 安装微软雅黑字体 : [https://github.com/wszqkzqk/deepin-wine-ubuntu/issues/136#issuecomment-514585722](https://github.com/wszqkzqk/deepin-wine-ubuntu/issues/136#issuecomment-514585722)
- 配置 Linux 为一个简单的路由器：[https://www.ascinc.com/blog/linux/how-to-build-a-simple-router-with-ubuntu-server-18-04-1-lts-bionic-beaver/](https://www.ascinc.com/blog/linux/how-to-build-a-simple-router-with-ubuntu-server-18-04-1-lts-bionic-beaver/)
- 安装 cuda 参考：[https://linuxconfig.org/how-to-install-nvidia-cuda-toolkit-on-centos-7-linux](https://linuxconfig.org/how-to-install-nvidia-cuda-toolkit-on-centos-7-linux)
- 下载 vscode 使用国内镜像: [https://zhuanlan.zhihu.com/p/112215618](https://zhuanlan.zhihu.com/p/112215618)
- 查看系统的各种统计信息：[https://www.cnblogs.com/lovesKey/p/10900501.html](https://www.cnblogs.com/lovesKey/p/10900501.html)

#### 疑难杂症

- ssh 设置 `UseDNS no` 后仍然登录慢，依然有可能是 DNS 解析的问题，更改 /etc/resolv.conf 中配置的 nameserver 之后好了，更多可能参考：[https://jrs-s.net/2017/07/01/slow-ssh-logins/#:~:text=It's%20usually%20DNS.,restart%20ssh%2C%20etc%20as%20appropriate.](https://jrs-s.net/2017/07/01/slow-ssh-logins/#:~:text=It's%20usually%20DNS.,restart%20ssh%2C%20etc%20as%20appropriate.)。
- centos yum 命令执行到 `Loaded plugins: fastestmirror` 时很慢，也可能是 DNS 解析的问题。
- 在 while 循环中使用 ssh 命令时，发现 while 循环提前结束了，其原因是 ssh 命令会从标准输入中读取内容，因此后续脚本被 ssh 读入了，所以无法继续执行，解决办法就是重定向 ssh 命令的标准输入为 /dev/null，参考：[https://stackoverflow.com/a/9393147](https://stackoverflow.com/a/9393147)。
