---
title: Netfilter 框架及其周边组件
urlname: eo6o30
date: '2019-12-15 00:00:00 +0000'
layout: post
comments: true
categories: Linux
tags:
  - Linux
keywords: 'Linux, Netfilter, iptables, conntrack, ipvs'
description: >-
  Netfilter 框架及其周边组件作为 Linux 内核网络栈的一部分在网络包过滤等方面发挥重要作用。我们在使用 iptables 配置防火墙规则、使用
  conntrack 跟踪网络连接、使用 ipvs 配置虚拟服务器实现负载均衡时都使用到了 Netfilter 框架提供的功能特性。对 Netfilter
  的生态进行梳理有助于我们对现有应用场景加深理解，也能进一步帮助我们发掘出更多的应用场景。
abbrlink: d617cc74
updated: 2020-08-30 00:00:00
---

### Netfilter

Netfilter 是  Linux 2.4.x 及后续版本内核引入的包过滤框架。Netfilter 包含了一组内核钩子 API ，周边内核组件可以使用这些钩子在网络栈中注册回调函数。每一个在网络栈中流通的包到达相应的钩子时，就会触发相应的回调函数，从而能够完成包过滤、网络地址（端口）转换和网络包协议头修改等各种操作。
Netfilter 提供了五种钩子（参考[Linux Kernel Communication — Netfilter Hooks](https://medium.com/@GoldenOak/linux-kernel-communication-part-1-netfilter-hooks-15c07a5a5c4e)），如下：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1576396676777-643a7090-d522-4f7b-a4a8-e1d20742681a.png#align=left&display=inline&height=237&margin=%5Bobject%20Object%5D&name=image.png&originHeight=474&originWidth=1330&size=35302&status=done&style=none&width=665)

1. NF_IP_PER_ROUNTING — 当数据包到达计算机立即触发。
2. NF_IP_LOCAL_IN — 当数据包的目的地就是当前计算机时触发。
3. NF_IP_FORWARD — 当数据包目的地址是其它的网络接口时触发。
4. NF_IP_POST_ROUTING — 当数据包即将从计算机发出时触发。
5. NF_IP_LOCAL_OUT — 当数据包由本地生成并发向外部时触发。

基于 Netfilter 钩子 API 实现的内核模块主要有 ebtables、arptables、ip(6)tables、nf_tables、NAT、connection tracking 等。如下是维基百科上关于 Netfilter 相关组件的一张示意图：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1576376326201-8e54e0c3-4710-47c7-ae4d-07f66be4452f.png#align=left&display=inline&height=421&margin=%5Bobject%20Object%5D&name=image.png&originHeight=451&originWidth=800&size=58313&status=done&style=none&width=746)
下图是数据包在 Netfilter 框架中的流动过程：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1576390222986-8e61ba27-7ac7-4695-a7e0-0ad91e7ee581.png#align=left&display=inline&height=215&margin=%5Bobject%20Object%5D&name=image.png&originHeight=475&originWidth=1650&size=186592&status=done&style=none&width=746)

### ebtables

ebtables  是以太网桥防火墙，以太网桥工作在数据链路层，ebtables 主要用来过滤链路层数据包。使用 ebtables 可以实现 filtering 、NAT 和 brouting。过滤根据 MAC 头包括 VLAN ID 等信息确定是否丢弃该帧。MAC NAT 可以修改 MAC 源和目的地址。Brouting 意为 bridge or route，根据规则确定应该将数据帧路由给上层（iptables）还是通过网桥转给其它的接口。
ebtables 和我们熟悉的 iptables 很像，也有规则（rules）、链（chains）和表（tables）的概念。ebtables 使用规则确定应当对数据帧执行什么动作。规则按照不同的链分组，不同的表中包含不同的链。在 ebtables 中有三张表：filter、nat 和 broute，分别对应其三大功能模块。
需要注意的是如果一个以太网接口 eth1，它并没有桥接到网桥上，此时，从 eth1 进来的数据包不会走到 ebtables 中。在 bridge check 点，会检查数据包进入的接口是否属于某个桥，如果是则走 ebtables，否则直接走 iptables。也就是说，ebtables 只对桥接网络生效。

#### filter

- INPUT 链：当数据帧的目的 MAC 地址是网桥的 MAC 地址时，这条链上的过滤规则会被应用。
- FORWARD 链：当数据帧将要被网桥转发给其它接口时，这条链上的过滤规则会被应用。
- OUTPUT 链：当数据帧由本地产生或者已经完成路由时。

#### nat

- PREROUTING 链：当数据帧到达时会立即执行该链上的规则。
- OUTPUT 链：对于本地生成的或者已经完成路由的数据帧，在被桥接之前进行修改。
- POSTROUTING 链：在数据帧被发送之前进行修改。

#### broute

- BROUTING 链：应用规则决定对数据帧进行 bridge or route。

下图是一个 iptables 与 ebtables 工作流图：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1576390449967-dd24ea02-2232-41fd-bd07-33aea0a350de.png#align=left&display=inline&height=352&margin=%5Bobject%20Object%5D&name=image.png&originHeight=703&originWidth=1696&size=126471&status=done&style=none&width=848)

### arptables

arptables 和 ebtables 相似，区别在于 arptables 不局限于桥接网络且是专门用来配置和处理 ARP 消息相关的规则。

### iptables

正是基于 Netfilter 钩子 API 的共同点，iptables 和 ebtables 的工作机制相似，区别是 iptables 工作在 OSI 网络模型的三层和四层。
iptables 提供的功能主要有：

- 无状态数据包过滤。
- 有状态数据包过滤：iptables 可以识别到如 ftp 数据包的连接状态，从而基于连接状态能够提供更多的过滤功能。
- 网络地址（端口）转换：iptables 可以修改数据包的协议头信息包括 IP 地址和 TCP/UDP 端口。

一般的说法是 iptables 包含四张表：filter、nat、mangle 和 raw ，但是通过 man 查看 iptables 的使用手册可以看到最新的 iptables 还有 security 表，但是 security 的应用确实也不是很常见，所以这里仍然沿用四张表的说法。filter 表顾名思义主要是根据规则对数据包进行过滤，nat 表则是根据规则进行地址转换，mangle 表用于一些专门的修改操作，例如修改包头中的 TOS（服务类型）字段，raw 表则是在数据包进入 connection tracking 之前应用一些规则进行修改操作。
NAT 又有 SNAT、DNAT 、NAPT 和 MASQUERADE 各种术语。SNAT 意味着更改数据包的源 IP 地址。DNAT 则是更改数据包的目的 IP 地址。NAPT 则是进行端口转发，即修改数据包的 TCP/UDP 端口。MASQUERADE 是 SNAT 的特例，可称为动态 SNAT ，它是用发送数据的网卡上的 IP 来替换源 IP，因此，对于那些 IP 不固定的场合，比如拨号网络或者通过 DHCP 分配 IP 的情况下，需要用 MASQUERADE。以下是一些示例：

```bash
// SNAT 必须指定目标 IP
// 更改数据包的源 IP 地址为 1.2.3.4
iptables -t nat -A POSTROUTING -o eth0 -j SNAT --to 1.2.3.4
// 把所有 10.8.0.0 网段的数据包 SNAT 成 192.168.5.3/192.168.5.4/192.168.5.5 几个 IP 然后发出去
iptables -t nat -A POSTROUTING -s 10.8.0.0/255.255.255.0 -o eth0 -j SNAT --to-source 192.168.5.3-192.168.5.5
// 更改数据包的目的 IP 地址为 1.2.3.4
iptables -t nat -A PREROUTING -i eth0 -j DNAT --to 1.2.3.4
// 将从 eth0 进入的目标端口为 80 的数据包转发到 192.168.1.200 的 8080 端口
iptables -t nat -A PREROUTING -i etho --dport 80 -j DNAT --to-destination 192.168.1.200:8080
// MASQUERADE 不用指定 SNAT 的目标 IP ，不管现在 eth0 的出口获得了怎样的动态 IP
// MASQUERADE 会自动读取 eth0 现在的 IP 地址然后做 SNAT 出去
// 这样就实现了很好的动态 SNAT 地址转换
iptables -t nat -A POSTROUTING -s 10.8.0.0/255.255.255.0 -o eth0 -j MASQUERADE
```

一张可供参考的 iptables 工作流图，需要注意的是只有对发起新连接（包括和已经存在的连接有 related 关系的请求）的请求才会去重新匹配 nat 表中的规则，而其它表中的规则对每一个到来的数据包都会匹配一遍，这得益于基于 Netfilter 的另一个组件 connection tracking 系统，它记录了每一个连接的信息，从而使得同一个连接上的数据包不必经过重新匹配 nat 规则就可获知应当如何传递。
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1576394377796-20f9f09a-67df-418a-96a0-96c9201f59c5.png#align=left&display=inline&height=851&margin=%5Bobject%20Object%5D&name=image.png&originHeight=1133&originWidth=730&size=78757&status=done&style=none&width=548)

### conntrack

在 Netfilter 体系中，状态跟踪机制（conntrack）是重要的一部分。它是基于 Linux 系统的 stateful 防火墙和 NAT 的基础。conntrack 将信息存在内存结构中，包括 IP，端口，协议类型，状态以及超时时间。conntrack 不仅可以对 TCP 这种有状态的会话进行状态跟踪，还可以对 UDP/ICMP 进行状态跟踪。conntrack 本身并不会对包进行过滤，而是提供一种基于状态和关系的过滤依据。
conntrack 定义了 5 种连接状态，分别如下：
**NEW** 匹配连接的第一个包。意思就是，iptables 从连接跟踪表中查到此包是某连接的第一个包。判断此包是某连接的第一个包是依据 conntrack 当前”只看到一个方向数据包”( [UNREPLIED] )，不关联特定协议，因此 NEW 并不单指 tcp 连接的 SYN 包。
**ESTABLISHED** 匹配连接的响应包及后续的包。意思是，iptables 从连接跟踪表中查到此包是属于一个已经收到响应的连接(即没有 [UNREPLIED] 字段)。因此在 iptables 状态中，只要发送并接到响应，连接就认为是 ESTABLISHED 的了。这个特点使 iptables 可以控制由谁发起的连接才可以通过，比如 A 与 B 通信， A 发给 B 数据包属于 NEW 状态， B 回复给 A 的数据包就变为 ESTABLISHED 状态。 ICMP 的错误和重定向等信息包也被看作是 ESTABLISHED ，只要它们是我们所发出的信息的应答。
**RELATED** 状态有点复杂，当一个连接与另一个已经是 ESTABLISHED 的连接有关时，这个连接就被认为是 RELATED 。这意味着，一个连接要想成为 RELATED ，必须首先有一个已经是 ESTABLISHED 的连接存在。这个 ESTABLISHED 连接再产生一个主连接之外的新连接，这个新连接就是 RELATED 状态了，当然首先 conntrack 模块要能”读懂”它是 RELATED 。拿 ftp 来说， FTP 数据传输连接就是 RELATED 与先前已创建的 FTP 控制连接，还有通过 IRC 的 DCC 连接。有了 RELATED 这个状态， ICMP 错误消息、 FTP 传输、 DCC 等才能穿过防火墙正常工作。有些依赖此机制的 TCP 协议和 UDP 协议非常复杂，他们的连接被封装在其它的 TCP 或 UDP 包的数据部分(可以了解下 overlay/vxlan/gre)，这使得 conntrack 需要借助其它辅助模块才能正确”读懂”这些复杂数据包，比如 nf_conntrack_ftp 这个辅助模块。
**INVALID** 匹配那些无法识别或没有任何状态的数据包。这可能是由于系统内存不足或收到不属于任何已知连接的 ICMP 错误消息。一般情况下我们应该 DROP 此类状态的包。
**UNTRACKED** 状态比较简单，它匹配那些带有 NOTRACK 标签的数据包。需要注意的一点是，如果你在 raw 表中对某些数据包设置有 NOTRACK 标签，那上面的 4 种状态将无法匹配这样的数据包，因此你需要单独考虑 NOTRACK 包的放行规则。

### 参考资料

- [https://www.digitalocean.com/community/tutorials/a-deep-dive-into-iptables-and-netfilter-architecture](https://www.digitalocean.com/community/tutorials/a-deep-dive-into-iptables-and-netfilter-architecture)
- [https://guanjunjian.github.io/2017/12/05/study-15-docker-single-host-network-analysis/](https://guanjunjian.github.io/2017/12/05/study-15-docker-single-host-network-analysis/)
- [https://blog.csdn.net/dog250/article/details/5561082](https://blog.csdn.net/dog250/article/details/5561082)
- [https://blog.spoock.com/2020/01/18/conntrack/](https://blog.spoock.com/2020/01/18/conntrack/)
- [https://my.oschina.net/u/232595/blog/1919450](https://my.oschina.net/u/232595/blog/1919450)
- [https://www.cnblogs.com/huenchao/p/6225770.html](https://www.cnblogs.com/huenchao/p/6225770.html)
- [When Linux conntrack is no longer your friend](<https://www.projectcalico.org/when-linux-conntrack-is-no-longer-your-friend/#:~:text=Connection%20tracking%20(%E2%80%9Cconntrack%E2%80%9D),the%20Linux%20kernel's%20networking%20stack.&text=This%20allows%20you%20to%20write,explicitly%20allow%20the%20response%20traffic.>)
