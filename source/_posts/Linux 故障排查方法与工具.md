---
title: Linux 故障排查方法与工具
urlname: vdixb5
date: '2020-08-04 00:00:00 +0000'
layout: post
categories: Linux
tags:
  - Linux
  - 故障排查
keywords: 'Linux,故障排查'
description: Linux 故障排查的常用方法与工具。
abbrlink: c2292029
updated: 2020-10-21 00:00:00
---

### 负载模拟与分析

#### CPU 密集型

1. `stress-ng --cpu 2 --timeout 600 模拟 CPU` 负载；
1. 通过 `uptime` 可以观察到，系统平均负载很高，通过 `mpstat -P ALL 1 5` 或 `top` 观察到 2 个 CPU 使用率很高，平均负载也很高，而 iowait 为 0 ，说明进程是 CPU 密集型的，一般是由进程使用 CPU 密集导致系统平均负载变高;
1. 通过 `pidstat -u 1` 查看是哪个进程导致 CPU 使用率较高。

#### I/O 密集型

1. `stress-ng -i 4 --hdd 1 --timeout 600` 模拟磁盘 IO；
1. 可以通过 `uptime` 观察到，系统平均负载很高，通过 `mpstat -P ALL 1 5` 或 `top` 观察到 CPU 使用率很低，iowait 很高，一直在等待 IO 处理，说明是 IO 密集型的场景；
1. 通过 `pidstat -d 1` 可以查看哪个进程磁盘读写速度高，也可以通过 `iotop` 查看 IO 高的进程。

#### 大量进程争抢 CPU

1. `stress-ng -c 16 --timeout 600` 模拟大量进程；
1. 通过 `uptime` 观察到系统平均负载很高，通过通过 `mpstat -P ALL 1 5` 或 `top` 观察到 CPU 使用率也很高，iowait 为 0，说明此进程是 CPU 密集型的，或者在进行 CPU 的争用；
1. 通过 `pidstat -u 1` 观察到 wait 指标很高，则说明进程间存在 CPU 争用的情况，可以判断系统中存在大量的进程在等待使用 CPU；大量的进程，超出了 CPU 的计算能力，导致的系统的平均负载很高;
1. 通过 `pidstat -w 1` 也可以看到存在大量的非自愿进程上下文切换。

#### 单进程多线程争抢 CPU

1. `sysbench --threads=10 --time=300 threads run` 模拟多线程；
1. 观察步骤类似大量进程争抢，不同的是 `pidstat -w 1 10` 看到 sysbench 无上下文切换，因为默认显示的是进程间的上下文切换；而使用 `pidstat -w -t` 可以看到存在大量 sysbench 相关的非自愿上下文切换。

#### 网络包注入

使用 Python 包 scapy 可以模拟网络包注入，参考：[用 Python 模拟 TCP 三次握手连接及发送数据](https://www.cnblogs.com/darkpig/p/7629854.html)，[Python3 + Scapy 安装使用教程](https://www.cnblogs.com/lsdb/p/10496171.html)

```python
from scapy.all import *
ans = sr1(IP(src='107.55.66.38',dst='106.75.175.95')/TCP(dport=80, sport=56789,seq=123, flags='S'), verbose=False)
```

### 常用工具

#### vmstat

vmstat 可查看系统 CPU 、内存、IO 的基本使用状态信息。vmstat 展示的是整体 CPU 的使用情况，而不是单个 CPU。

```
root@10-9-23-85 ~# vmstat 1 10
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 1  0      0 262052      0 1843248    0    0     1    55    0    7  3  2 94  0  0
 0  0      0 262232      0 1843260    0    0     0    57 1656 2956  3  2 95  0  0
 0  0      0 261744      0 1843308    0    0     0    56 2038 3790  3  2 95  0  0
 0  0      0 261712      0 1843312    0    0     0   146 2043 3590  2  2 96  1  0
 0  0      0 261776      0 1843312    0    0     0    50 1771 3263  2  2 96  1  0
 0  0      0 261680      0 1843316    0    0     0    48 1461 2896  1  1 98  0  0
 0  0      0 260360      0 1843276    0    0    16    36 1971 3538  3  2 95  0  0
 0  0      0 260168      0 1843256    0    0     0   129 1542 2906  2  2 96  1  0
 1  0      0 259572      0 1843256    0    0     0    82 2417 4036  6  3 91  1  0
 0  0      0 259604      0 1843260    0    0     0   128 1707 3228  2  2 96  1  0
```

其中各项数据的含义如下：

| procs  |   r   | 等待运行的进程数。如果等待运行的进程数越多，意味着 CPU 非常繁忙。另外，如果该参数长期大于 cpu 核心数 3 倍，说明 CPU 资源可能存在较大的瓶颈。                                                                        |
| :----: | :---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|        |   b   | 处在不可中断睡眠状态的进程数。一般是等待 IO 的进程。                                                                                                                                                                |
| memory | swpd  | 已使用的虚拟内存大小。如果虚拟内存使用较多，可能系统的物理内存比较吃紧，需要采取合适的方式来减少物理内存的使用。swapd 不为 0 ，并不意味物理内存吃紧，如果 swapd 没变化，si、so 的值长期为 0 ，也表明系统没有问题。  |
|        | free  | 空闲的物理内存的大小。                                                                                                                                                                                              |
|        | buff  | 用来做 buffer（缓存，主要用于块设备缓存）的内存数，单位：KB。                                                                                                                                                       |
|        | cache | 用作缓存的内存大小，如果 cache 的值大的时候，说明 cache 处的文件数多，如果频繁访问到的文件都能被 cache 处，那么磁盘的读 IO bi 会非常小，单位：KB 。                                                                 |
|  swap  |  si   | 从磁盘写入到 swap 虚拟内存的交换页数量，单位：KB/秒。如果这个值大于 0，表示物理内存不够用或者内存泄露了。                                                                                                           |
|        |  so   | 从 swap 虚拟内读出的数据。即从 swap 中的数据写入到磁盘的交换页数量，单位：KB/秒，如果这个值大于 0 ，表示物理内存不够用或者内存泄露了。                                                                              |

内存够用的时候，这两个值都是 0，如果这两个值长期大于 0 时，系统性能会受到影响，磁盘 IO 和 CPU 资源都会被消耗。
当看到空闲内存（free）很少的或接近于 0 时，就认为内存不够用了，这个是不正确的。不能光看这一点，还要结合 si 和 so 。如果 free 很少，但是 si 和 so 是 0，那么不用担心，系统性能这时不会受到影响的。 |
| io | bi | 每秒从块设备接收到的块数，单位：块/秒 也就是读块设备。bi 通常是读磁盘的数据。 |
| | bo | 每秒发送到块设备的块数，单位：块/秒 也就是写块设备。bo 通常是写磁盘的数据。 |
| system | in | 每秒的中断数，包括时钟中断。 |
| | cs | 每秒的环境（上下文）切换次数。比如我们调用系统函数，就要进行上下文切换，而过多的上下文切换会浪费较多的 CPU 资源，这个数值应该越小越好。 |
| cpu | us | 用户态使用 CPU 的时间（非内核进程占用时间）（单位为百分比）。 us 的值比较高时，说明用户进程消耗的 CPU 时间多。 |
| | sy | 系统使用的 CPU 时间（单位为百分比）。sy 的值高时，说明系统内核消耗的 CPU 资源多，这并不是良性表现，我们应该检查原因。 |
| | id | 空闲的 CPU 的时间（百分比）。 |
| | wa | 等待 IO 的 CPU 时间。这个指标意味着 CPU 在等待硬盘读写操作的时间，用百分比表示。wa 越大则机器 IO 性能就越差。说明 IO 等待比较严重，这可能由于对磁盘大量随机访问造成，也有可能磁盘出现瓶颈（块操作）。 |
| | st | 虚拟机占用 cpu 时间的百分比。如果 CentOS 系统上运行了 KVM 虚拟机监视器，而 KVM 上运行了几个虚拟机，那么这个值将显示这个几个正在运行的虚拟机从物理机中窃取 CPU 运行时间的百分比。 |

#### stress-ng

stress-ng 是 stress 的增强版本，兼容 stress 命令的同时提供了更丰富的压力模拟场景。

```
yum install stress-ng
# 两个 worker 计算圆周率测试，top 命令可以看到 cpu 时间均被消耗在用户空间
stress-ng -c 2 --cpu-method pi
# 两个 worker 遍历所有压力测试算法
stress-ng -c 2 --cpu-method all
# 一个 worker 产生 socket 相关的操作，top 命令可以看到 cpu 时间主要被内核以及软中断占用
# --taskset 选项将任务绑定到指定 cpu 处理
stress-ng --sock 1 --taskset 1
# 不断执行 sync 操作
stress-ng --io 2 --timeout 60s --metrics-brief
# 执行 mmap 申请内存并写入内容
stress-ng --vm 2 --vm-bytes 1G --timeout 60s
```

#### mpstat

mpstat 是 Multiprocessor Statistics 的缩写，可用于获取 CPU 实时统计指标信息，其数据来源于 /proc/stat 文件。mpstat 区别于 vmstat 的一点是：可以查看多核 CPU 中每个计算核心的统计数据。

```
# 显示整体状态
mpstat
# 显示指定 CPU 状态
mpstat -P 0
# 每隔 2 秒显示所有 CPU 的使用信息，共打印 5 次
mpstat -P ALL 2 5
# 显示所有 CPU 上的各种中断每秒总次数
mpstat -I SUM -P ALL
# 显示指定 CPU 的中断总次数
mpstat -I SUM -P 0
# 查看各个 CPU 上各种中断次数
mpstat -I CPU
# 查看各个 CPU 上各种软中断次数
mpstat -I SCPU
```

#### iostat

参考：[How to Monitor Linux Systems Performance with iostat command](https://www.linuxtechi.com/monitor-linux-systems-performance-iostat-command/)

```
iostat -d -x -m 1 6
```

#### sar 

sar 可用于获取进程和网络等各种系统活动统计信息，参考：[Linux sar command](https://www.computerhope.com/unix/usar.htm#:~:text=The%20sar%20command%20extracts%20and,data%20of%20that%20days%20ago.)，[Linux Sar 命令详解](https://www.cnblogs.com/xhyan/p/6531098.html)

```bash
# 获取 CPU 利用率信息
sar -u 2 5
# 获取 127 号中断向量统计信息
sar -I 127 1 10
# 获取内存统计信息
sar -r 1 2
# 获取网卡统计信息
sar -n DEV 1 2
# 获取所有系统统计信息
sar -A 1 2
# 从文件中获取历史统计信息，DD 指的是当天在本月是第几天
sar -r -f /var/log/sa/saDD
# 查看换页情况，其中 pgsteal/s 表示每秒钟从 cache 中被清除来满足内存需要的页个数，数值较大说明确实内存严重不足
sar -B 10 3
# 获取块设备统计信息
sar -d 1 2
# 上下文切换信息
sar -w 1 5
# socket 信息
sar -n SOCK 5 5
# TCP 信息
sar -n TCP 1 5
# 文件系统统计信息
sar -F 2 4
```

#### pidstat

用于显示进程相关统计信息。

```bash
# 以下命令均可添加 -p PID 只显示指定进程信息，加上数字指定刷新间隔，另外可追加 -t 参数显示线程相关信息，默认只显示进程信息
# 显示 CPU 信息
pidstat -u
# 显示内存信息，其中 Cswch/s 表示主动上下文切换，Nvcswch/s 表示被动上下文切换
pidstat -r
# 显示磁盘 IO 信息
pidstat -d
# 显示上下文切换
pidstat -w
# 显示线程相关信息
pidstat -t -p 9252
# 显示独立 TASK 即进程信息，默认显示 CPU 使用信息，可通过追加 -r / -d / -w 等指定显示的信息
pidstat -T TASK
# 显示进程下所有线程信息，默认显示 CPU 使用信息，可通过追加 -r / -d / -w 等指定显示的信息
pidstat -T CHILD
# 以下命令在新版本 sysstat 中才有
# 列出启动命令中包含指定字符串的进程
pidstat -G kube
# -t 包括线程
pidstat -t -G kube
# 显示调度相关信息
pidstat -R
```

#### top

P - 按照 CPU 使用率排序；M - 按照内存使用量排序；T - 按照进程启动后占用的 CPU 时间总和排序

```bash
# -u 指定用户 -d 指定刷新间隔
top -u ceph -d 0.5
```

#### iotop

`iotop`  进程或线程的当前 I/O 使用情况，显示每个进程/线程读写 I/O 带宽以及等待换入和等待 I/O 的线程/进程花费的时间的百分比。

```
# 仅显示正在进行 IO 操作的进程或线程信息
iotop -o
# 只显示进程（线程读写也算到所属进程）
iotop -P -o
```

#### nethogs

查看进程网络流量

```bash
yum install nethogs
```

#### arp

查看 arp 缓存

```python
arp -e
```

### 参考资料

- [CPU-IO-网络-内核参数调优](https://blog.csdn.net/weixin_41843699/article/details/97614157)
- [性能调优攻略](https://coolshell.cn/articles/7490.html)
- [Stress Test CPU and Memory (VM) On a Linux / Unix With Stress-ng](https://www.cyberciti.biz/faq/stress-test-linux-unix-server-with-stress-ng/)
- [linux top 命令看到的实存(RES)与虚存(VIRT)分析](https://www.cnblogs.com/xudong-bupt/p/8643094.html)
- [Linux iostat 命令详解](https://www.jellythink.com/archives/438)
