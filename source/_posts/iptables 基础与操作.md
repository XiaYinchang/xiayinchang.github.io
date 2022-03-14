---
title: iptables 基础与操作
urlname: cskphl
date: '2020-08-15 00:00:00 +0000'
layout: post
categories: 'Linux,网络'
tags:
  - 网络
  - iptables
keywords: 'Linux,iptables'
description: iptables 基础与操作。
abbrlink: 26e8b8c9
updated: 2021-03-11 00:00:00
---

#### 防火墙

从逻辑上讲，大体可分为网络防火墙和主机防火墙，网络防火墙在流量入口的最前端，保护后端网络中所有主机，主机防火墙在流量末端保护本机服务；从物理上讲，可分为硬件防火墙和软件防火墙，网络防火墙往往借助专用硬件设备及其可编程特性配置保护规则，实现高性能流量过滤，主机防火墙则多借助通用服务器和系统内核特性实现纯软件层面的过滤。部署 Linux 系统的主机上可借助内核的 Netfilter 框架实现流量过滤，iptables 正是基于 Netfilter 实现的应用最广的防火墙工具。和很多系统工具一样，iptables 由运行于内核空间的功能模块和运行于用户空间的入口程序共同构成，而我们常用的 iptables 命令行工具就是运行于用户空间的入口程序。iptables 虽然应用广泛，但其规则匹配过程的效率低下也受到诟病，尤其在 Kubernetes 等云原生应用场景中性能问题更为明显，这也促使基于 IPVS 的 kube-proxy 大规模取代了基于 iptables 的模式。从 CentOS 8 开始，旨在取代 iptables 的 nftables 开始成为默认的包过滤工具，它从设计上解决了 iptables 的缺陷并优化了使用体验，值得后续关注。另一项近期更为活跃的技术是 eBPF（extended BPF），起源于 92 年的 BSD Packet Filter，随后进行了全新设计并在 Linux 3.17 版本内核中以 eBPF 为名正式引入，传统的 BPF 以 cBPF 之名继续保留用于兼容。随后，eBPF 的应用领域不断拓宽，不再局限于网络流量的过滤与分析，大有成为 Linux 通用的性能监测基础架构的趋势，尤其在云原生时代，可观测性的重要性愈发突出，eBPF 大有可为。 bpfilter 就是基于 eBPF 构建的新一代包过滤内核模块，或许未来会替代 iptables/nftables ，但目前似乎进展缓慢，参考 [Rethinking bpfilter and user-mode helpers](https://lwn.net/Articles/822744/)。

#### 数据包经过防火墙的流程

一个帮助理解的流程图：
![iptables.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1598403804093-3e5e0ccb-8aca-4b18-ab91-73b8dd83c0bc.png#align=left&display=inline&height=400&margin=%5Bobject%20Object%5D&name=iptables.png&originHeight=533&originWidth=1012&size=56394&status=done&style=none&width=759)
另一个更准确的流程图：
![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1598402936150-d2584938-7100-4ffb-b675-1b578645cbc4.png#align=left&display=inline&height=764&margin=%5Bobject%20Object%5D&name=image.png&originHeight=3054&originWidth=2399&size=1900518&status=done&style=none&width=600)

#### 常用操作

```bash
# 列出规则 -v 显示详细信息，-x 显示计数器精确值，-L 后不跟链名则显示表中所有链的规则，-n 不进行地址反解
iptables --line-numbers -nvx -t filter -L INPUT
# 在指定链的末尾添加规则
iptables -t filter -A INPUT -s 192.168.1.146 -j DROP
# 在指定链的首部添加规则
iptables -t filter -I INPUT -s 192.168.1.146 -j DROP
# 在指定行添加规则
iptables -t filter -I INPUT 3 -s 192.168.1.146 -j DROP
# 删除指定行
iptables -t filter -D INPUT 3
# 删除匹配行，若有多个匹配规则只会删除第一个
iptables -t filter -D INPUT -s 192.168.1.146 -j DROP
# 删除指定链中的所有规则
iptables -t filter -F INPUT
# 删除指定表中的所有规则
iptables -t filter -F
# 导出规则到本地文件
iptables-save > /tmp/rules
# 从本地文件恢复规则
iptables-restore < /tmp/rules
# 指定报文流入的网卡进行过滤，-i 表示从哪个网卡流入，只有 PREOUTING/INPUT/FORWARD 链上能够使用
iptables -t filter -i eth0 -I INPUT -d 192.168.1.8 -p tcp -m tcp --dport 8080 -j DROP
iptables -t filter -i eth0 -I INPUT -s 192.168.1.8 -p tcp --dport 8000:8080 -j DROP
# 指定报文流出的网卡， -o 表示从哪个网卡流出，只有 FOREWARD/OUTPUT/POSTROUTING 链上能够使用
iptables -t filter -o eth0 -I OUTPUT -d 192.168.1.8,192.168.3.4 -p tcp -m multiport --dports 8081,8893 -j DROP
iptables -t filter -o eth0 -I OUTPUT -s 192.168.1.0/24 -p tcp -m multiport --dports 8081,8893 -j DROP
# 指定一段连续的地址
iptables -t filter -I OUTPUT -m iprange --src-range 192.168.1.33-192.168.1.88 -p tcp -m multiport --dports 8081,8893 -j DROP
# 匹配字符串
iptables -t filter -I INPUT -p tcp --sport 80 -m string --algo bm --string "dststr" -j REJECT
# 限制连接数
iptables -t filter -I INPUT -p tcp --dport 22 -m connlimit --connlimit-above 10 -j REJECT
# 限制请求速率
iptables -t filter -I INPUT -p icmp -m limit --limit-burst 3 --limit 10/second -j ACCEPT
# 根据 tcp-flag 限制请求包
iptables -t filter -I INPUT -s 192.168.1.4 -p tcp -m tcp --dport 22 --tcp-flags SYN,ACK,FIN,RST,URG,PSH SYN -j REJECT
iptables -t filter -I INPUT -s 192.168.1.4 -p tcp -m tcp --dport 22 --tcp-flags ALL SYN,ACK -j REJECT
iptables -t filter -I INPUT -s 192.168.1.4 -p tcp -m tcp --dport 22 --syn -j REJECT
# 禁止别人 ping 本机
iptables -t filter -I INPUT -p icmp -m icmp --icmp-type 8/0 -j REJECT
# 放行指定连接状态的数据包，注意这里的连接状态指的是 conntrack 表中维护的每一个连接的状态，而不是 TCP 协议的状态，conntrack 对 UDP 和 ICMP 同样维护有状态
iptables -t filter -I INPUT -p tcp -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
```

#### 自定义链

```bash
# 创建自定义链
iptables -t filter -N NEW_CHAIN
# 向自定义链添加规则
iptables -t filter -I NEW_CHAIN -s 192.168.3.55 -p tcp --dport 80 -j DROP
# 必须在默认链中引用自定义链才能生效
iptables -t filter -I INPUT -j NEW_CHAIN
# 删除自定义链需要先删除对它的引用并清空其中规则
iptables -D INPUT 1
iptables -F NEW_CHAIN
iptables -X NEW_CHAIN
```

#### 查看统计信息

```bash
iptables -nvL [INPUT|FORWARD|OUTPUT|myCHAINNAME] --line-numbers | less
```

#### 观测工具

[https://github.com/commonism/iptables-trace](https://github.com/commonism/iptables-trace)
[https://github.com/x-way/iptables-tracer](https://github.com/x-way/iptables-tracer)

#### 参考资料

- [linux 内核将用 BPF 给 iptables 换心](https://baijiahao.baidu.com/s?id=1598167710178783742픴=spider&for=pc)
- [BPFILTER: Your next Firewall Engine](https://medium.com/@ugendreshwarkudupudi/bpfilter-your-next-firewall-engine-5f7dc63ebc3)
- [iptables Processing Flowchart](https://stuffphilwrites.com/2014/09/iptables-processing-flowchart/)
- [iptables 详解（1）：iptables 概念](http://www.zsythink.net/archives/1199/)

#### 阅读材料

[ebpf-firewall-LPC.pdf](https://www.yuque.com/attachments/yuque/0/2020/pdf/182657/1597492482904-08b61238-07a2-4c27-ab75-f327c7f1da2e.pdf)
