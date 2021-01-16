---
title: Linux 基础网络知识
urlname: ggqnsg
date: '2019-10-09 00:00:00 +0000'
layout: post
comments: true
categories: 网络
tags:
  - Linux
  - 网络
keywords: 网络
description: 本文记录需要掌握的基础网络知识。
abbrlink: 52b545c8
updated: 2020-09-03 00:00:00
---

#### DNS 域名服务器数量

通常，在 Linux 系统中，可在 /etc/resolv.conf 中配置 DNS 域名服务器，如下：

```bash
# cat /etc/resolv.conf
nameserver 10.23.255.1
nameserver 10.23.255.2
nameserver 114.114.114.114
```

排名越靠前的 nameserver 优先级越高，只有从第一个 DNS 服务器获取解析结果超时或失败才会转入下一个。看起来我们可以增加很多 nameserver，实际上这个数量存在一个默认值为 3 的最大数量限制，通过 man 手册可以看到：

```bash
➜  ~ man resolv.conf | awk '/nameserver Name/,/search Search/ {print prev; prev=$0}'

       nameserver Name server IP address
              Internet  address  of a name server that the resolver should query, either an IPv4 address (in dot notation), or an IPv6 address in colon (and possibly dot) notation as per RFC 2373.  Up to MAXNS (currently 3, see <re‐
              solv.h>) name servers may be listed, one per keyword.  If there are multiple servers, the resolver library queries them in the order listed.  If no nameserver entries are present, the default is to use the name  server
              on  the  local  machine.   (The algorithm used is to try a name server, and if the query times out, try the next, until out of name servers, then repeat trying all the name servers until a maximum number of retries are
              made.)
```

进一步这个值实际是在代码头文件中写死的：

```bash
# 在 resolv.h 中引入了 res_state.h
[root@pc /] head -n 61 /usr/include/resolv.h | tail -n 10
#ifndef _RESOLV_H_
#define _RESOLV_H_

#include <sys/cdefs.h>
#include <sys/param.h>
#include <sys/types.h>
#include <stdio.h>
#include <netinet/in.h>
#include <arpa/nameser.h>
#include <bits/types/res_state.h>

# 在 res_state.h 中定义了 MAXNS 宏，其值为 3
[root@pc /]# head -n 10 /usr/include/bits/types/res_state.h
#ifndef __res_state_defined
#define __res_state_defined 1

#include <sys/types.h>
#include <netinet/in.h>

/* res_state: the global state used by the resolver stub.  */
#define MAXNS			3	/* max # name servers we'll track */
#define MAXDFLSRCH		3	/* # default domain levels to try */
#define MAXDNSRCH		6	/* max # domains in search path */
```

想要配置更多的 DNS 服务器地址，则可使用第三方软件，例如 dnsmasq ，参考：[https://askubuntu.com/questions/1157265/how-do-i-allow-more-than-3-dns-servers-in-ubuntu-16](https://askubuntu.com/questions/1157265/how-do-i-allow-more-than-3-dns-servers-in-ubuntu-16)。

#### NO-CARRIER 网卡故障

NO-CARRIER 表示网络接口未检测到线路上的信号。通常是因为网络电缆已拔出或断开。在极少数情况下，也可能是硬件故障或驱动程序错误。

#### WebSocket 和 Socket 的区别

WebSocket 一般用于浏览器与应用服务器之间的交互，它是类似于 HTTP 的应用层协议，建立在 TCP/IP 之上。它主要应用于浏览器端需要和服务段建立固定连接的场景。而纯粹的 Socket 比 WebSocket 更加强大和通用。Socket 也基于 TCP/IP 但不局限于浏览器应用场景，使用 Socket 可以实现各种各样的通信过程。

#### WebSocket 通信建立过程

所有客户端与  WebSocket Server 建立进行通信时，都需要先发送 Http Get 请求完成握手过程，该 Http 请求头中包含  Upgrade: websocket 等必要字段，WebSocket Server 端必须能够处理该 Http 请求并在接受建立 WebSocket 连接时返回一个状态码为 101 的 Http 响应告诉客户端从现在开始把协议切换为 WebSocket。这样设计的一个好处时可以让 WebSocket 服务与已经存在的 Http 服务复用同一个端口，只需要一个后端进程处理两种通信协议。当然，也可以搭建一个纯粹的 WebSocket Server，只是依然需要能够响应握手时客户端发出的用以协议升级的 Http 请求，只不过对于其它的 Http 请求不会响应，亦即纯粹的 WebSocket Server 处理且仅处理用以协议升级 Http Get 的请求，之后的通信过程将全部使用 WebSocket 协议。更多解释参考：[https://stackoverflow.com/questions/47085281/do-websocket-implementations-use-http-protocol-internally](https://stackoverflow.com/questions/47085281/do-websocket-implementations-use-http-protocol-internally)

#### HTTP 1.0 、1.1 、2 关于 TCP 连接使用的区别

简单理解，在 HTTP 1.0 中，每个 HTTP 操作对应一个不同的 TCP 连接，即 HTTP 请求与 TCP 连接一一对应；在 1.1 中，浏览器执行多个 HTTP 请求时，仍然可能建立多个 TCP 连接，但是每个连接不再一一对应一个 HTTP 请求，而是多个请求在同一个 TCP 连接上串行方式传递请求-响应数据，实现连接复用；在 2.0 中，一次会话只建立一个 TCP 连接，且多个请求可并行发起并接收响应，实现多路复用。

#### TCP 连接建立与断开

1. TCP Server 端初始处于 LISTEN 状态；TCP Client 端新建一个 TCP Socket （端口号由操作系统分配）并主动发起 SYNC 请求，其过程是向 Server 端发送一个标志位为 SYN=1 及 ACK=0 ，序列号为随机生成的 x，数据部分为空的 TCP 报文，其结果是 Client 端进入  SYN_SENT 状态；Server 端接收到 Client 端的报文，根据  SYN=1 及 ACK=0 确定这是发起连接请求的报文并据此进行响应，其过程是向 Client 端发送一个标志位为  SYN=1 及 ACK=1（确认与同步二合一），序列号为随机生成的 y，确认号为 x+1，数据部分为空的 TCP 报文，其结果是服务端进入  SYN_RECV 状态；Client 端接收到 Server 回复的报文，确认可以和服务端建立通信，因此进入  ESTABLISHED 状态，作为对服务端 SYNC 报文的回应，客户端向服务端发送一个标志位为 ACK=1，序列号为 x+1，确认号为 y+1，数据部分为空的 TCP 报文；服务端收到确认报文后才会进入  ESTABLISHED 状态。
1. TCP 连接建立过程中，最后一次客户端向服务端发送的确认报文除了作为对服务端同步报文的回应，也基于以下原因：在客户端刚开始发起连接时发出的 SYNC 请求报文如果迟迟没有收到服务端的确认报文，客户端会放弃该连接，重新发出 SYNC 请求报文；此时服务端有可能会收到两条 SYNC 报文（超时的报文和新的报文），如果没有最后一次客户端发送的确认报文，服务端直接进入 ESTABLISHED 状态，会建立起两条连接，从而会浪费一条连接开销。
1. 当 TCP 连接建立完成后，两方的角色将变成对称的，任何一端都无法识别自己为客户端还是服务端，因此任何一端都可以先发送 FIN 报文用以关闭连接。由于一旦 FIN 报文从某一端发出，则该端将无法向对端发送数据（接收不受影响），因此往往是由先确知自己无需再发送数据的一端首先发起关闭连接的请求，而对端无需在收到 FIN 报文后立即开始 FIN 过程，可以继续向发起端发送数据直到数据发送完毕后再开始 FIN 过程，因此 TCP 的关闭过程也被称为是半关闭过程，所谓的四次挥手也源于此。
1. FIN 开始之前两方都处于  ESTABLISHED 状态，直到有一方的应用层确认数据发送完毕，主动发起了关闭连接的过程，此时会向另一方（后称为被动方）发送 FIN 请求，其过程是发送一个标志位 FIN=1，序列号为 u ，数据部分为空（也可能不为空，稍后讨论）的 TCP 报文，其结果是主动方进入了  FIN_WAIT 状态；被动方接收到主动方发出的报文，会返回一个标志位为  ACK=1，序列号为 v，确认号为 u+1 ，数据部分为空的报文，结果是被动方进入  CLOSE_WAIT 状态；此后被动方可以继续发送数据直到数据发送完成；被动方完成数据发送，向主动方发送标志位为 FIN=1 及 ACK=1 ，序列号为 w ，确认号依然为 u+1 的，数据部分为空（也可能不为空，稍后讨论）的 TCP 报文，之后被动方进入  LAST_ACK 状态；主动方收到被动方的 FIN 报文后，返回一个标志位为 ACK=1 ，序列号为 u+1 ，确认号为 w+1，数据部分为空的报文，此后主动方进入  TIME_WAIT 状态进行超时等待；被动方收到主动方的确认报文后进入 CLOSED 状态，此时被动方已经先完成了关闭连接的过程。
1. FIN 主动方进入  TIME_WAIT 状态后，会等待 2 倍的最大报文生存时间即  2MSL，等待的原因主要有两个： ① 为了保证主动方发送的最后一个 ACK 报文段能够到达被动方。即如果最后这个确认报文丢失，被动方会超时重传 FIN 报文，然后主动方再一次确认，同时启动 2MSL 计时器，如此下去。如果主动方没有等待时间，发送完确认报文就立即释放连接的话，即使被动方重传了 FIN 报文，也会因主动方已关闭而使被动方无法收到确认报文，被动方就无法正常进入 CLOSE 状态。 ② 防止已失效的连接请求报文出现在新的连接中。经过 2MSL，和该连接的相关的报文要么已经到达目的地，要么会被丢弃掉，不会滞留在网络中。这样的话，在下一个连接中就不会出现上一个连接遗留下来的请求报文了。
1. RFC 793 中规定 MSL（Maximum Segment Lifetime）为 2 分钟，实际应用中常用的是 30 秒，1 分钟和 2 分钟等。Linux 系统下可通过以下命令查看：`cat /proc/sys/net/ipv4/tcp_fin_timeout` ，在我的 Deepin 和 Manjaro 系统中分别是 40s 和 60s。

补充：这段描述可能有误，tcp_fin_timeout 时间应该指的是 FIN_WAIT_2 状态的连接，超时强制关闭的时间。

7. FIN 报文中是可以携带数据的，携带数据时的连接关闭过程与不携带数据时并无本质区别，只不过与 FIN 报文对应的 ACK 报文中的确认号值需要加上 FIN 报文发来的数据长度 d ，如果 FIN 报文不携带数据时对应的 ACK 报文的确认号为 u+1，则 FIN 携带数据时确认号还要加上 d 用以表示被动方收到了长度为 d 的数据内容，此时确认号为 u+1+d 。 FIN 包携带数据往往是为了提高通信效率，因为这样做相当于将最后一个数据报文和 FIN 报文合二为一，节省了一个报文的发送过程。
8. FIN 谁先关闭的问题可以通过一个简单的抓包实验进行观察：通过启动一个 `python3 -mhttp.server` Http 服务器，使用 WireShark 进行抓包，执行  `curl 127.0.0.1:8000` 后观察抓取的数据包，可以发现服务端在发送 Http 响应的同时主动发起了关闭连接的过程，即最后一个数据报文和 FIN 报文合二为一。
9. 通过抓包观察，在数据传输过程中某一方应答报文的确认号为总是等于另一方发送的报文的序列号和报文数据长度之和，而这个和值也会变成发送方下一次发送报文时的序列号。序列号和确认号的初始值来源于建立连接时客户端和服务端分别获取的随机序列号值 x， y，在连接建立后，第一个数据报文的序列号和确认号分别是 x+1,y+1（客户端发送第一份数据）或者 y+1, x+1（服务端发送第一份数据）。
10. TCP 连接参考文档：[https://blog.csdn.net/guyuealian/article/details/52535294](https://blog.csdn.net/guyuealian/article/details/52535294) ，[https://stackoverflow.com/questions/289194/what-is-maximum-segment-lifetime/35000966](https://stackoverflow.com/questions/289194/what-is-maximum-segment-lifetime/35000966)， [https://www.wikiwand.com/en/Transmission_Control_Protocol](https://www.wikiwand.com/en/Transmission_Control_Protocol)，[https://stackoverflow.com/questions/4677925/who-first-sets-tcp-fin-flag-in-client-server-connection](https://stackoverflow.com/questions/4677925/who-first-sets-tcp-fin-flag-in-client-server-connection)
11. 一张助于理解的图：

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1571478423292-36b18cb8-3312-42ed-940e-40b15315d38d.png#align=left&display=inline&height=793&margin=%5Bobject%20Object%5D&name=image.png&originHeight=793&originWidth=796&size=62072&status=done&style=none&width=796)

#### Linux 内核网络相关函数调用关系图

![linux-net.jpeg](https://cdn.nlark.com/yuque/0/2019/jpeg/182657/1571896927566-028e0063-6be9-4472-a446-66ac67ca17f5.jpeg#align=left&display=inline&height=1952&margin=%5Bobject%20Object%5D&name=linux-net.jpeg&originHeight=1952&originWidth=3489&size=1016557&status=done&style=none&width=3489)

#### 简略数据收发流图

![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1597494298490-a685c988-d4f4-4d89-8edb-af96e7b55d0a.png#align=left&display=inline&height=547&margin=%5Bobject%20Object%5D&name=image.png&originHeight=1093&originWidth=1545&size=268899&status=done&style=none&width=772.5)

#### Qdisc 在 Linux 网络栈中的位置

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1571898730049-ed53082d-e336-42cd-aa59-7233ebb6d57c.png#align=left&display=inline&height=913&margin=%5Bobject%20Object%5D&name=image.png&originHeight=1475&originWidth=1205&size=325485&status=done&style=none&width=746)

#### 网络路由过程

- 路由器与 NAT：

纯粹的路由过程并不会修改 IP 地址，路由过程会修改 MAC 地址，而家用路由器往往并不是纯粹的路由器，而是包含了 NAT 单元，所以家用路由器会修改 IP 从而实现一个局域网内的多个计算机同时连接外网。

- 一个关于路由过程的说明：

```
The source and destination MAC address will change as the frame traverses the
network to that of the next hop device and sending device port MAC, respectively.

EXAMPLE:

Three routers, A, B, C. They are connected in line (A connects to B, B connects to
A and C and C only connects to B like this: A — B — C ) with Host 1 on router A and
Host 2 on Router C.

( 1 — A — B — C — 2 )

Host connected to router A wants to talk to host connected to router C. Host A
determines the IP address of the host and does an ARP lookup to see if it is local.
The host on A determines that it is not local so it looks for a default gateway IP
address. Once found, the IP of the default gateway is checked for an ARP entry and,
if not, broadcasts and ARP to determine the MAC address. Now that all this has been
done, Host 1 on Router A will forward the packet with the Source IP and MAC of its
machine, Host 1. The Destination IP will be that of Host 2 on Router C and the
Destination MAC will be the MAC address of the default gateway, which in this case,
if the network is setup properly, will be the interface on Router A connecting to
the local LAN segment where Host 1 resides. Once Router A receives the frame,
it will check the destination IP address to see if the IP Address is connected to
a local LAN segment or not. In this case, we need to go through Router C to get
to Host 2, the router determines that the destination IP is NOT local and looks
at the routing table for the next steps. This step will check for the BEST route
available to the Destination IP address. If no route is found, it will check for
a quad route (0.0.0.0 a.k.a. Default Route). Once the interface is determined based
on the route selection process, it will check for an ARP entry for the IP address
of the next hop, in this case, Router B interface facing Router A. Router A will
send the frame up to the CPU and have the source and dest MAC addresses updated to
reflect the following. Router A egress interface will be the new Source MAC and
Router B interface facing toward router A will be the Destination MAC address.
Once Router B gets the frame, it will do the same thing and forward the frame out
toward router C with the Source MAC being the Router B interface facing Router C
and the Destination MAC address being the interface of Router C. All the while,
the Source and Destination IP addresses are the same. Since Host 2 would most
likely be sent to a switch that connects all the users up, Router C will check
its route table and see that the Destination IP address is locally connected via
one of its interfaces. At that point,a final ARP check is done to find the MAC
address of Host 2. The switch will respond with this information and report it
back to Router C. Router C then replaces the Destination MAC to that of Host 2
(learned via ARP) and replaces the Source MAC as the interface of Router C
connected to the LAN Segment/Switch. The switch, assuming it’s layer 2 only,
will see the Destination MAC as that of Host 2 and forward the packet out the port
that Host 2 is connected. Host 2 then receives the frame and the initial journey
is completed. All the while, these ARP entries are being cached and stored for the
return path as well.

In summary, ARP is used to map the IP to MAC addresses in a network for non-local
forwarding. This is done to prevent broadcasts from flooding the network. Imagine
if you will, the Internet being one big flat network. All of the hosts on the
Internet would be ARP-ing for the MAC address of the device it wants to talk to and,
we would never be able to load http://Quora.com as the Internet would be flooded
with Broadcasts. The purpose of a router is just that, break up the broadcast
domains to prevent this from occuring. Back in the day, we had to design networks
with this in mind as switching hadn’t been fully realized yet.

Last thing to note that is important. All communication happens at Layer 2,
Layer 3 is just a way for us humans to organize the network in a way that makes
logical sense using IP addressing.
```

- 一个路由选择的例子：

[https://community.cisco.com/t5/networking-blogs/what-happens-when-router-receives-packet/ba-p/3105996](https://community.cisco.com/t5/networking-blogs/what-happens-when-router-receives-packet/ba-p/3105996)

#### 端口与套接字的区别与联系

原文地址：[https://stackoverflow.com/questions/152457/what-is-the-difference-between-a-port-and-a-socket?page=1&tab=votes#tab-top](https://stackoverflow.com/questions/152457/what-is-the-difference-between-a-port-and-a-socket?page=1&tab=votes#tab-top)
**总结**
一个 TCP 套接字是一个端点（endpoint）实例：由特定 TCP 连接或处于监听状态的 TCP server 的上下文环境中的一个 IP 地址和一个端口定义。
一个端口是一个虚拟的 ID 定义了一个服务端点（有别于服务实例端点又称 session ID）。
TCP 套接字不是连接，而是特定连接的一个端点。
同一个服务端点可以存在多个并发连接，因为一个连接是由本地和远端端点共同标识的，所以能够允许不同连接的流量根据该连接的信息被路由到不同的服务实例去处理。
对于给定的一个地址与端口组合，只能有一个处于监听状态的套接字（ Linux 从 3.9 版本的开始引入了 SO_REUSEPORT 选项，允许多进程多个套接字监听在同一个端口，内核负责把建立新连接的请求负载均衡到不同的进程去处理，提高 accept 性能，就我个人的理解，在云原生场景下不应该使用该选项，更好的一种方式是以容器的形式在不同的宿主机上启动多个进程，通过四层或七层负载均衡的方式提升 HTTP Server 的性能 ）。
**说明**
这是一个有趣的问题，迫使我重新审视许多我以为自己彻底了解的事情。你可能认为像 “socket” 这样的名字是不言自明的：它的选择显然是为了让人联想起插入网络电缆的端点，因为它们具有很强的功能相似性。然而，在网络编程术语中来说，“插座” 这个词背负着太多的包袱，因此有必要对它进行仔细的重新检查。
在广泛的意义上来理解，一个端口就是一个进口或出口点。尽管 porte 这个法语单词没有被用在网络术语中，但它的字面意思门或门户进一步强调了这样一个事实：无论你是运输数据还是大型钢制集装箱，端口都是运输的端点。
基于本次讨论的需要，这里仅仅考虑 TCP-IP 网络的情况。OSI 模型是一个非常好的网络模型，但它从来没有被完整实现过，在高流量高压力的网络环境中也很少有部署实施。
IP 地址和端口的组合严格地来讲被称为端点，有时也称为套接字。这种用法起源于 RFC793，它是最初的 TCP 规范文档。
一个 TCP  连接由两个端点 (又称为套接字) 定义。
一个端点 (套接字) 由网络地址和端口 ID 组合定义。需要注意的是，地址与端口的组合并不能确切标识一个套接字 (稍后将详细介绍)。
端口的作用是区分给定网络地址上的多个服务端点。也可以说一个端口是一个虚拟的端点。 这种虚拟化使单个网络接口上的多个并发连接成为可能。

> 套接字对 (由客户端 IP 地址、客户端端口号、服务器 IP 地址和服务器端口号组成的 4 元组) 描述的两个端点唯一标识了一个网络中的每个 TCP 连接。 (_TCP-IP Illustrated Volume 1_, W. Richard Stevens)

在大多数派生自 C 的编程语言中，TCP 连接的建立和操作都是通过调用 Socket 类的实例的一系列方法完成的。虽然常见的是在更高的抽象层次上去操作连接，例如通过  NetworkStream 类的实例，但这些高层次类一般也是通过暴露底层套接字对象的引用来实现的。对于编程人员来说，这个套接字对象似乎代表连接，因为连接是使用套接字对象的方法创建和操作的。
在 C# 中，建立一个 TCP 连接（与已经存在的一个监听服务）的第一步是创建一个 TcpClient 对象。如果你没有为 TcpClient 构造函数指定端点，它将使用默认值：某种方法定义的本地端点。然后在已创建的实例上调用 Connect 方法，Connect 方法需要对方端点信息作为参数。
所有这些都有点令人困惑，让你相信套接字是一种连接，这是不正确的。 我一直在这种误解之下苦苦思索，直到到  Richard Dorman  问了这个问题。
经过大量的阅读和思考，我现在确信，拥有一个带有两个参数 LocalEndpoint 和 RemoteEndpoint 的构造函数的类 TcpConnection 更有具体意义。 当本地端点可以接受缺省值时，可以支持传入单个参数 RemoteEndpoint。 在具有多个网络接口的计算机上使用默认的本地端点会产生不确定性，但是可以使用路由表来选择能够到达远程端点的最短路径的接口来消除这种不确定性。
在其它方面的一些明确性也能有提升。套接字不能被 IP 地址和端口的组合确切地标识：

> [...]TCP 会用到组成本地和外部地址的所有四个值对传入的多路数据段进行解析：目的 IP 地址、目的端口、源 IP 地址和源端口。 TCP 无法仅通过目的端口来确定将到达的数据段传递给哪个进程。 此外，[给定端口号] 上的 [多个] 端点中唯有处于监听状态的端点才会收到建立连接的请求。 (p255, _TCP-IP Illustrated Volume 1_, W. Richard Stevens)

如你所见，对于一个网络服务来说，在同一地址 / 端口上存在多个套接字不仅是可能的，而且这种可能性还很大，只不过在一个特定的地址 / 端口组合上只能有一个处于监听状态的套接字。 典型的库实现提供一个套接字类，开发人员使用这个类的实例创建和管理连接。这是极其不幸的，因为它造成了混淆，并导致了对套接字和连接两个概念大范围的混用。
Hagrawal 不相信我的观点（见评论），因此在此给出一个示例。我通过浏览器访问了  http://dilbert.com  然后执行了  `netstat -an -p tcp`  命令。命令输出内容的最后六行包含了两个例子可以说明仅靠地址和端口是不足以唯一标识一个套接字的事实。可以看到在 192.168.1.3 (我的本地工作站) 和 54.252.94.236:80 (远端 HTTP 服务器) 之间有两个不同的 TCP 连接。

```
TCP    192.168.1.3:63240      54.252.94.236:80       SYN_SENT
TCP    192.168.1.3:63241      54.252.94.236:80       SYN_SENT
TCP    192.168.1.3:63242      207.38.110.62:80       SYN_SENT
TCP    192.168.1.3:63243      207.38.110.62:80       SYN_SENT
TCP    192.168.1.3:64161      65.54.225.168:443      ESTABLISHED
```

由于套接字是一个连接的一个端点，所以地址／端口组合  `207.38.110.62:80`  和`54.252.94.236:80`  分别都有两个套接字。
我想  Hagrawal 的误解来自于我对 "identifies" 一词的极其谨慎地使用。  我提到  "identifies" 一词指的是  “完全、明确和唯一地识别”。 在上面的示例中，地址 / 端口组合 54.252.94.236:80 有两个端点。 如果只有地址和端口信息，则无法区分这些套接字，即没有足够的信息来标识一个套接字。
RFC793 文档 2.7 章节第二段说到：

> 一个连接由通信两端的一对套接字完整描述。一个本地套接字可以参与到与多个外部套接字建立的多个连接中。

从编程的角度来讲这个关于套接字的说法毫无意义，因为它和作为特定连接端点的套接字对象并不相同。对于一个编程人员来说（这个问题的大多数受众应该是程序员），这是非常关键的实用性的区别。
端口是用在 TCP/IP 协议栈中指代通信端点。而套接字是在各种协议栈的实现中通用的对通信端点的软件抽象（socket API）。例如不同于 TCP/IP 的另一种协议实现是  XTI/TLI API。

#### Linux bridge

网桥可以是指物理设备也可以指虚拟设备，两者功能一致。这里只讨论 Linux 系统中虚拟网桥的工作过程。Linux bridge 是一个虚拟的二层设备，它本身不能收发任何数据，除非将一个或多个网卡设备和它绑定，即将网络接口加入网桥。Linux bridge 完成工作依赖四个组件：

- 一组网络接口：用于在上游交换机（路由器）和其它主机之间转发流量。这些接口可以是物理接口也可以是虚拟接口。一般来讲，要想能够访问广域网则必须有物理接口，而如果是在同一宿主机的不同虚拟机之间通信则使用虚拟接口即可。
- 控制平面：用于运行 STP （生成树协议），避免产生环路造成网络崩溃。
- 转发平面：用于处理从各个网络接口进入的数据帧，根据 MAC 地址表中的记录决定将数据帧转发到哪个网络接口。
- MAC 地址表：用于记录局域网中每个宿主机的位置（通过 MAC 地址与接口的对应关系确定位置）。

网桥通过构造一张 MAC 地址表将 MAC 地址和 MAC 地址连接的网络端口关联起来。当一个数据帧到达网桥的一个接口，网桥会更新 MAC 地址表记录下数据帧中的源 MAC 地址和该网络接口的对应关系。每个接口可以关联多个 MAC 地址，但是每个 MAC 地址只能对应一个网络接口。
数据帧从某个接口到达网桥后，网桥在记录源 MAC 地址与接口的对应关系的同时，也会查找表中关于目的 MAC 地址的记录。如果目的 MAC 地址在表中，则数据帧会被转发到对应的接口。如果目的 MAC 地址不在表中，或者目的 MAC 地址是一个广播或多播地址，则该数据帧将会被转发给除了进入网桥时的端口之外的所有端口。这样会造成环路和流量洪泛，而 STP 就是用来解决这个问题的，STP 会保留所有可以到达根路由器的路径中最短的路径，而切断其它的路径，从而形成树形结构。
实验细节参考：[https://hechao.li/2017/12/13/linux-bridge-part1/](https://hechao.li/2017/12/13/linux-bridge-part1/)

#### TUN/TAP

根据 Linux 内核文档: TUN/TAP 为用户空间程序提供分组接收和传输功能。它可以被看作是一个简单的点对点或以太网设备，它不是从物理媒体接收数据包，而是从用户空间程序接收数据包，并且不是通过物理媒体发送数据包，而是将数据包写入用户空间程序。
也就是说，TUN/TAP  接口是虚拟接口，没有相关的物理设备。用户空间程序可以连接到 TUN/TAP 接口，并处理发送到接口的流量。
TUN 接口是虚拟 IP 点对点接口，而 TAP 接口是虚拟以太网接口。 这意味着用户程序只能从 / 向 TUN 接口读 / 写 IP 数据包，从 / 向 TAP 接口读 / 写以太网帧。
TUN 接口的典型用例是 IP 隧道。 例如，OpenVPN 从 tun0 等 TUN 接口接收数据包，并在将其发送到真正的以太网接口 eth0 之前对其进行加密。 然后，对端网络上的 OpenVPN 客户端接收来自 eth0 的数据包，并在将其发送到 tun0 之前对其进行解密。 换句话说，OpenVPN 作为 tun0 和 eth0 之间的代理工作，并在两个主机之间通过互联网创建加密的 UDP 连接。
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1576386544299-80e5dc93-9f94-475c-9c4e-ba06248e534e.png#align=left&display=inline&height=474&margin=%5Bobject%20Object%5D&name=image.png&originHeight=559&originWidth=879&size=160518&status=done&style=none&width=746)
TAP 接口的典型用例是虚拟网络。 例如，在 Linux Bridge Part 1 中，我们已经看到，当我们使用桥接网络在 KVM 中创建一个 VM 时，它会创建一个类似 vnet0 的 TAP 接口，并将其添加到 Linux 桥。 在这种情况下，KVM 是用于读取和写入 TAP 接口的 usersapce 程序。 当 VM0 向它的 eth0 发送一个数据包时，KVM 将其发送到 TAP 接口 vnet0，以便桥接器将其转发到 vnet1。 然后 KVM 接收它并将其发送给 VM1 的 eth0。
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1576386832999-494d3049-2e09-4f79-a962-d68a84ff1820.png#align=left&display=inline&height=341&margin=%5Bobject%20Object%5D&name=image.png&originHeight=341&originWidth=521&size=21678&status=done&style=none&width=521)
`ip tuntap`  命令可用于管理  TUN/TAP 接口。例如:

```bash
$ ip tuntap help
Usage: ip tuntap { add | del | show | list | lst | help } [ dev PHYS_DEV ]
          [ mode { tun | tap } ] [ user USER ] [ group GROUP ]
          [ one_queue ] [ pi ] [ vnet_hdr ] [ multi_queue ]

Where: USER  := { STRING | NUMBER }
       GROUP := { STRING | NUMBER }
```

参考：[https://hechao.li/2018/05/21/Tun-Tap-Interface/](https://hechao.li/2018/05/21/Tun-Tap-Interface/)

#### iproute2 用法

```bash
# 列出所有 veth 设备
ip -c link show type veth
# 列出所有 tunnel 设备
ip tunnel show
```

#### TCP 连接的意外情况

- 服务端连接处于建立状态，但收到 SYN 包

当 TCP 连接建立后，如果客户端意外断电（没有主动关闭 TCP 连接的过程），此时服务端连接状态仍为  established，客户端重启后如果恰好使用了之前一样的端口重新发起建立 TCP 连接的请求，服务端会收到 SYN 包，并将其作为一个合法的包，返回 ACK ；客户端此时处于  SYN_SENT 状态，却收到了一个不带 SYN 标志的 ACK 包，由此客户端可以确定这是来自于遗留连接的包，因此会发出 RST 包。服务端收到 RST 包则会清理掉遗留连接的信息。客户端在稍后可以重新尝试建立连接。
导致建立状态的服务端收到 SYN 包情况有多种，可参考：[https://serverfault.com/a/733727](https://serverfault.com/a/733727)

- 服务端进程终止

如果服务端进程通过 kill 终止，操作系统在结束进程时会关闭该进程打开的所有连接，此时会向客户端发送 FIN 包，客户端回复 ACK 包，若客户端继续向服务端发送数据，则虽然 TCP 连接还是半关闭状态，理论上讲可以继续接收数据，但由于进程已经被终止，所以服务端会回复 RST 包，客户端读取操作将会接收到  ECONNRESET 错误。

- 服务端意外崩溃从网络中消失

此时，客户端没有任何感知，仍然继续发送包，一般来讲，会进入重传直至超时的过程，最后发送操作会返回 ETIMEDOUT 错误；但如果中间路由器已经判定服务端主机不可达，则会返回  EHOSTUNREACH 或  ENETUNREACH 错误。

- 服务端崩溃后重启回到网络中

此时，客户端发送给服务端的数据包会得到 RST 响应。

- 服务端正常关机或重启

此时，服务端会先终止进程再关机，终止进程时 TCP 连接会被正常关闭，客户端能够及时获取到服务端状态从而做出响应。
参考：[https://www.cnblogs.com/549294286/p/5208357.html](https://www.cnblogs.com/549294286/p/5208357.html)

#### TCP 连接能存活多久

理论上讲，一旦连接建立，将永远存活下去，哪怕一直没有数据传输，即使是其中一端故障，另一端仍保持连接建立状态。如果开启了 keepalive 特性（Linux 中在 setsockopt 时传入 SO_KEEPALIVE 参数)，则操作系统（ Linux 内核协议栈）会自动在空闲一段时间后发送探测包，帮助一直保持连接状态或者在故障时及时发现并关闭连接。但实际上会有各种规则或意外会使连接无法持续维持：一种情况是通过 DHCP 获取的 IP 地址到期，IP 地址可能发生变化；还有一些需要经过 NAT 的连接则可能由于存储空间不足丢弃老的 TCP 连接状态；Linux conntrack 表的大小也是有限的，如果连接数太多到超过表的存储上限，老的不活跃的 TCP 连接状态也会被丢弃；还有的防火墙能够识别出 keepalive 探测包和数据包，会根据用户配置的规则在连接空闲一段时间后强制关闭连接。参考：[https://stackoverflow.com/a/419491](https://stackoverflow.com/a/419491)，[https://networkengineering.stackexchange.com/a/30961](https://networkengineering.stackexchange.com/a/30961)，[https://notes.shichao.io/unp/ch7/](https://notes.shichao.io/unp/ch7/)。

#### 发送数据时超时时间设置

keepalive 对于空闲的连接可以及时发现问题并关闭 broken 连接，对于处于繁忙状态的 TCP 连接，数据包发送失败且重试也失败直至关闭连接会经历两个过程：tcp_retries1，默认进行 3 次重传；tcp_retries1  后，网络层将被告知传输故障；tcp_retries2，默认进行 15 次重传；tcp_retries2 连接关闭。我们可以通过设置这两个参数来改变每个阶段的重传次数从而间接影响超时时间，但是由于无法直接设置时间限制，这种更改不具有太大实用价值。实际上，在 Linux 编程中有另外一个 socket 参数  TCP_USER_TIMEOUT 可能更加有效，它可以确保重试过程在指定时间内终结并强制关闭连接。但更多的编程方式推荐在应用层去设置超时时间，从而更灵活的实现逻辑而不是去更改和依赖底层配置，例如 HTTP 1.1 中的 Keepalive header 可以指定该连接的存活时间，一旦超过指定时间仍没有数据传输，则关闭连接。在服务端 HTTP 编程中我们也经常设置发送和接收的超时时间。
参考：[https://blog.cloudflare.com/when-tcp-sockets-refuse-to-die/](https://blog.cloudflare.com/when-tcp-sockets-refuse-to-die/)，[https://man7.org/linux/man-pages/man7/tcp.7.html](https://man7.org/linux/man-pages/man7/tcp.7.html)，[https://stackoverflow.com/a/5907951](https://stackoverflow.com/a/5907951)，[https://pracucci.com/linux-tcp-rto-min-max-and-tcp-retries2.html](https://pracucci.com/linux-tcp-rto-min-max-and-tcp-retries2.html)。

#### 关于  TCP_KEEPALIVE 的阅读资料

[https://codearcana.com/posts/2015/08/28/tcp-keepalive-is-a-lie.html](https://codearcana.com/posts/2015/08/28/tcp-keepalive-is-a-lie.html)，[https://blog.csdn.net/chrisnotfound/article/details/80111559](https://blog.csdn.net/chrisnotfound/article/details/80111559)，

#### 查看网络统计信息的几种工具

参考：[https://www.cyberciti.biz/faq/network-statistics-tools-rhel-centos-debian-linux/](https://www.cyberciti.biz/faq/network-statistics-tools-rhel-centos-debian-linux/)，[https://prefetch.net/blog/2011/07/11/using-netstat-and-dropwatch-to-observe-packet-loss-on-linux-servers/](https://prefetch.net/blog/2011/07/11/using-netstat-and-dropwatch-to-observe-packet-loss-on-linux-servers/)

```
# 查看每个网卡的统计信息，以下三种命令结果类似,主要包括发送和接收的包量和比特数，MTU，发送和接收的出错数量
netstat -i
ifconfig
ip -s link
# 查看所有协议栈信息的汇总
netstat -s
# 查看发送接收速率
sar -n DEV 1 3
sar -n DEV
# 使用 dropwatch（Kernel dropped packet monitor） 可以监测内核丢包信息 ，执行以下命令，然后输入 start
dropwatch -l kas
```

#### 网络性能测试

使用 iperf3 进行性能测试， centos 可直接执行 `yum install iperf3` 进行安装：

```bash
# 启动服务端 -s 意思是服务端
iperf3 -s
# 后台进程方式启动服务端，-D 意思是 Daemon 进程启动
iperf3 -s -D
# 在客户端执行 TCP 测试， -c 指的是客户端，-b 目标带宽（一般与网卡带宽相匹配），-n 发送字节数
iperf3 -c 10.10.140.95 -b 10000M -n 10G
# 执行 UDP 测试，-u 使用 UDP 协议，-l 指定数据包大小，这里指定的是 TCP 或 UDP 数据部分的大小为 1400
# 实际发送时的 MAC 帧长会是 1454 ，包括：
# 26 个字节的 MAC 帧头：7 个字节的前导码，1 个字节的帧起始符，6 字节目的 MAC ，6 字节源 MAC ，2 字节帧长度，以及位于帧末尾的 4 字节 CRC 校验和
# 20 字节的 IP 头部
# 8 字节 UDP 头部
iperf3 -u -c 10.10.140.95 -b 10000M -n 10G -l1400
# 由于 iperf3 只显示带宽，可以借助 sar 查看包量
# sar 工具包含在 sysstat 中
```

#### 网络性能调优

网卡收发数据处理速度成为瓶颈时，可通过手动设置 CPU 亲和性（ irqbalance 的自动负载均衡很多时候不好用） 将中断处理分发到不同的 CPU 上，避免集中在一个 CPU 上。

```bash
# 执行以下命令可以找到虚拟机上 eth0 对应的底层设备
readlink -e /sys/class/net/eth0/
/sys/devices/pci0000:00/0000:00:04.0/virtio1/net/eth0
# 从 proc 目录下可以找到设备驱动相关的中断
[root@10-10-175-184 ~]# cat /proc/interrupts
           CPU0       CPU1       CPU2       CPU3
  0:         32          0          0          0   IO-APIC   2-edge      timer
  1:          9          0          0          0   IO-APIC   1-edge      i8042
  4:          0          0        728          0   IO-APIC   4-edge      ttyS0
  6:          0          0          0          3   IO-APIC   6-edge      floppy
  8:          0          0          0          0   IO-APIC   8-edge      rtc0
  9:          0          0          0          0   IO-APIC   9-fasteoi   acpi
 10:          0          0          0          0   IO-APIC  10-fasteoi   virtio0
 11:          0          0         32          0   IO-APIC  11-fasteoi   uhci_hcd:usb1
 12:          0          0          0         15   IO-APIC  12-edge      i8042
 14:          0          0          0          0   IO-APIC  14-edge      ata_piix
 15:          0          0          0          0   IO-APIC  15-edge      ata_piix
 24:          0          0          0          0   PCI-MSI 81920-edge      virtio2-config
 25:          0          0       8954          0   PCI-MSI 81921-edge      virtio2-req.0
 26:          0          0          0          0   PCI-MSI 65536-edge      virtio1-config
 27:          0          0          0     152606   PCI-MSI 65537-edge      virtio1-input.0
 28:      15864          0          0          0   PCI-MSI 65538-edge      virtio1-output.0
 # 目前有四个 CPU 核，通过如下方式可以设置 irq CPU 亲和性，设置的是十六进制值，1 表示 0001 第一个 CPU 核，即将 27 号中断调度到 CPU0 上处理；
 # 8 表示 1000 ，将 28 号中断调度到 CPU3 上处理；f 表示 1111 ，表明可以将中断调度到四个核中任一个上处理
 echo 1 > /proc/irq/27/smp_affinity
 echo 8 > /proc/irq/28/smp_affinity
```

上述方式能够有效的前提是网卡收发数据过程中确实存在多种中断请求，而一般情况下，一张网卡对应一个发送队列，一个发送队列对应一种中断请求，此时就无法通过 CPU 负载均衡来提升网络性能。有的网卡是硬件实现多队列，在虚拟化场景下，配置网卡多队列也可以通过软件实现。
对于多队列网卡，可通过设置 `/sys/class/net/eth0/queues/rx-0/rps_cpus` 来指定使用哪些 CPU 处理接收操作，参考： [https://xixiliguo.github.io/post/multi-queue/](https://xixiliguo.github.io/post/multi-queue/)，[https://www.eflycloud.com/blog/blogDetail?id=377](https://www.eflycloud.com/blog/blogDetail?id=377)。
当缓冲区大小成为瓶颈时，可调整内核参数进行优化：

```bash
# 该参数决定了，网络设备接收数据包的速率比内核处理这些包的速率快时，允许送到队列的数据包的最大数目。
net.core.netdev_max_backlog = 400000
# 该参数指定了每个套接字所允许的最大缓冲区的大小
net.core.optmem_max = 10000000
# 指定了接收套接字缓冲区大小的缺省值（以字节为单位）
net.core.rmem_default = 16777216
# 指定了接收套接字缓冲区大小的最大值（以字节为单位）
net.core.rmem_max = 16777216
# 表示socket监听的backlog(监听队列)上限
net.core.somaxconn = 100000
# 定义默认的发送窗口大小
net.core.wmem_default = 16777216
# 定义发送窗口的最大大小
net.core.wmem_max = 16777216
# 确定 TCP 栈应该如何反映内存使用；每个值的单位都是内存页（通常是 4KB）。
# 第一个值是内存使用的下限。
# 第二个值是内存压力模式开始对缓冲区使用应用压力的上限。
# 第三个值是内存上限。在这个层次上可以将报文丢弃，从而减少对内存的使用。
net.ipv4.tcp_mem=91650	122203	183300
# 为自动调优定义每个 socket 使用的内存。
# 第一个值是为 socket 的发送缓冲区分配的最少字节数。
# 第二个值是默认值（该值会被 wmem_default 覆盖），缓冲区在系统负载不重的情况下可以增长到这个值。
# 第三个值是发送缓冲区空间的最大字节数（该值会被 wmem_max 覆盖）。
net.ipv4.tcp_wmem=4096 16384 16777216
net.ipv4.tcp_rmem=4096 131072 16777216
```

对于 tap 设备，建议设置以下参数，参考 [high_packet_loss_in_the_tx_queue_of_the_instance_s_tap_interface](https://access.redhat.com/documentation/en-us/red_hat_openstack_platform/13/html/ovs-dpdk_end_to_end_troubleshooting_guide/high_packet_loss_in_the_tx_queue_of_the_instance_s_tap_interface)：

```bash
# 注意以下设置仅临时有效
ifconfig eth0 txqueuelen 8000
# 或
ip link set tap<uuid> txqueuelen <new queue length>
# 持久设置
cat <<'EOF'>/etc/udev/rules.d/71-net-txqueuelen.rules
SUBSYSTEM=="net", ACTION=="add", KERNEL=="tap*", ATTR{tx_queue_len}="10000"
EOF
```

#### OSI 开放互联模型

![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1593480135479-c91d4d48-b51e-4746-931c-5c1533e624b6.png#align=left&display=inline&height=794&margin=%5Bobject%20Object%5D&name=image.png&originHeight=1587&originWidth=1120&size=505862&status=done&style=none&width=560)

#### tcp_tw_reuse 和 SO_REUSEADDR

tcp_tw_reuse 和 SO_REUSEADDR 都会改变内核处理 TIME_WAIT 状态的 TCP 连接的方式。只有先发起关闭连接的一方才会进入 TIME_WAIT 状态。
开启 tcp_tw_reuse 可以重复利用处于 TIME_WAIT 状态的连接。tcp_tw_reuse 设置的是内核变量 sysctl_tcp_tw_reuse ，而这个变量仅在 tcp_twsk_unique 函数中使用。而这个函数的调用路径有且仅有一个：tcp_v4_connect->inet_hash_connect->\_\_inet_check_established->twsk_unique->twsk_unique。也就是说 tcp_tw_reuse 仅在 TCP 套接字作为客户端，调用 connect 时起作用。绝大部分的 TCP 服务器不会有大量主动连接的动作（或许会连接 DB 等，但一般也是长连接）。因此这个选项对于 TCP 服务端来说，基本上是无用的，完全是没必要打开。在 K8S 环境中，节点一般既是服务端也是客户端，发起大量短连接的可能性是存在的，所以开启也是有作用的。
SO_REUSEADDR 可以缓解 TIME_WAIT 状态的连接的端口占用问题，允许将未彻底释放的端口 bind 到新的 socket 进行监听，server 端启动监听时应默认设置该参数，这样可以在 server 端服务重启时不至出现 "Address already in use" 的 bind 错误，加快重启过程。

#### SO_REUSEADDR 与 SO_REUSEPORT

SO_REUSEADDR 两个主要效果：改变了通配绑定时处理源地址冲突的处理方式；允许将处于 TIME_WAIT 状态的 TCP 连接对应的 socket 所占用的端口号拿出来给新的 socket 去 bind 使用。
SO_REUSEPORT 主要是允许多个 socket 绑定到同一个端口上进行监听，为了防止端口劫持，限制所有使用相同 ip 和 port 的 socket 都必须拥有相同的有效用户 id，其主要效果是由内核进行负载均衡提高了 accept 的效率。

#### 多线程（进程）网络编程与 SO_REUSEPORT

在 SO_REUSEPORT 没有出现之前，多线程编程一般有两种方式处理客户端请求：① 指派一条线程专门进行 accept ，获取 socket 后分派给 worker 线程。这种方法使得进行 accept 的线程成为了单点，容易成为性能的瓶颈。② 多个线程同时进行 accept ，这种方法的问题是协议栈/调度器中的一些机制导致每个线程 accept 成功的概率不均匀，可能出现几个 CPU 撑死几个 CPU 饿死的情况，导致负载不均衡。且多个线程监听同一个 socket 会出现惊群现象，造成 CPU 资源的浪费，而为了解决惊群现象引入了共享锁机制，又会带来处理性能的下降。
而引入 SO_REUSEPORT 之后，每个 worker 线程均拥有自己的 socket，内核负责把用户请求通过 hash 映射均匀地分发给各个 worker 线程，避免了共享锁的竞争带来的消耗和性能下降。各个线程中 accept socket 不一样，有新连接建立时，内核只会唤醒一个线程来 accept ，不会出现惊群现象并且保证唤醒的均衡性。
多个 socket 的一个问题是其中一个 worker 线程阻塞时会造成所有分发到该线程的请求均被阻塞，参见：[从 SO_REUSEPORT 服务器的一个弊端看多队列服务模型](https://blog.csdn.net/dog250/article/details/107227145)。
![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1596547632756-09311bd2-899c-45f8-83e7-165af8e2a16f.png#align=left&display=inline&height=393&margin=%5Bobject%20Object%5D&name=image.png&originHeight=785&originWidth=850&size=90942&status=done&style=none&width=425)    ![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1596547640520-425396fc-a06a-4590-ac4f-a4351a70bc83.png#align=left&display=inline&height=390&margin=%5Bobject%20Object%5D&name=image.png&originHeight=780&originWidth=850&size=94147&status=done&style=none&width=425)

#### QUIC

快速 UDP 网路连接协议（QUIC）最初由 Google 公司推出，用于支持下一代 HTTPS 协议。IETF 基于此推出了更通用的 QUIC 协议，可以支持 HTTP 以外的诸如 SSH、SMTP、DNS、NTP 等应用层协议。QUIC 的主要特性有：

- QUIC 将握手和密钥协商（TLS）过程整合在一起，即发起请求的同时传递密钥协商报文，相对于 TCP 场景下 TCP 连接的建立和 TLS 握手是独立的过程，QUIC 减少了初始化时所需的请求和响应包，节省了开销；
- QUIC 的数据重传实现在 QUIC 级别而不是协议栈级别，因此一个 QUIC 连接中的多个流可以相互独立而不会因丢包重传发生阻塞，QUIC 在修复一个流时不会影响到其它流的工作，相较之下基于 TCP 实现的 HTTP/2 协议虽然也实现了连接的多路复用，但只要其中一个流发生丢包就会引发协议栈级别的重传，从而可能阻塞所有流的工作过程，直到丢包得以恢复；
- QUIC 能够提高网络切换期间的性能，这是相较于 TCP 而言，用户使用移动设备时经常发生网络切换，由于 IP 地址的变化会导致原有 TCP 连接失效，因而需要重新握手建立连接，而 QUIC 通过一个连接标识符而不是地址与端口的组合来唯一标识一个连接，当用户 IP 发生变化时，连接 ID 依然有效从而无需重新建立连接；
- QUIC 在应用程序中实现而不是在内核代码中实现，这使其具有更大的灵活性，可以快速更新引入特性而无需依赖内核升级，QUIC 能够实现以上特性的一个原因也正是因为其减少了对内核协议栈的依赖，具有更大的自主性和灵活性，而想要对 TCP 这种存在极其悠久的网络协议模块进行改良无疑是困难的甚至是不可能的。

#### tcp_syncookies

其基本思想是通过生成特殊的序列号保存信息而不是在服务端分配资源保存半连接，避免消耗服务端过多资源，从而防范 sync flood 攻击，参考：[https://segmentfault.com/a/1190000019292140](https://segmentfault.com/a/1190000019292140)。

#### 获取网络栈监控信息

参考：[Monitoring Network Stack](https://arthurchiao.art/blog/monitoring-network-stack/)

#### XDP

XDP 是从 Linux 4.8 版本内核引入的基于 eBPF 的快速数据路径，其基本原理是在数据接收路径上添加了一个更早的 hook 点（早于 Netfilter 的 PREROUTING hook 点），可以根据用户提供的 eBPF 程序确定对数据包的处理（丢弃、向上传递或者转发）。该 hook 点位于网卡驱动程序中，紧随中断处理，在数据包进入内核协议栈进行内存分配（开销巨大）之前，因此具有极高性能。对于不支持 offload 的网卡，eBPF 代码仍在内核中执行，流量较大时 CPU 负载会较高；而对于支持 offload 的网卡，可以将用户提供的 eBPF 程序注入到网卡中，由网卡硬件负责执行，大大降低了 CPU 的负担，且性能更好。XDP 的一种应用场景是应对 DDoS 的攻击，因为其可以高效地拦截数据包。

#### unix socket

使用 `lsof -U` 可以列出所有 Unix 套接字对应的文件，有些文件名以 `@` 符号开头，它们是使用了 Linux 抽象命名空间的特性，其好处是不需要在文件系统上创建一个文件，从而不需要小心维护文件的存在且在套接字关闭之后删除文件，`@` 开头的文件在套接字关闭后自动删除，仅存在于内存。

#### 阅读资料

- [Socket Options](https://notes.shichao.io/unp/ch7/)
- [快速 UDP 网络连接](https://www.wikiwand.com/zh-hans/%E5%BF%AB%E9%80%9FUDP%E7%BD%91%E7%BB%9C%E8%BF%9E%E6%8E%A5)
- [科普：QUIC 协议原理分析](https://zhuanlan.zhihu.com/p/32553477)
- [以讹传讹的“tcp_tw_reuse”](https://cloud.tencent.com/developer/article/1412003)
- [Socket Sharding in NGINX Release 1.9.1](https://www.nginx.com/blog/socket-sharding-nginx-release-1-9-1/)
- [最近在 nginx1.9.1 中支持了 reuse_port 这个功能 是准许多个 socket 监听同一个端口？ - 凡柯的回答 - 知乎](https://www.zhihu.com/question/51618274/answer/126729306)
- [Nginx 多进程模型是如何实现高并发的？ - linuor 的回答 - 知乎](https://www.zhihu.com/question/22062795/answer/20197329)
- [Linux 网络编程客户\服务器设计范式](https://www.cnblogs.com/Anker/p/7075141.html)，[Linux 最新 SO_REUSEPORT 特性](https://www.cnblogs.com/Anker/p/7076537.html)
- [简单对比 Libevent、libev、libuv](https://www.cnblogs.com/sunsky303/p/9094822.html)
- [TCP 拥塞控制图解](https://blog.csdn.net/dog250/article/details/51287078)
- [Linux 网络数据转发平面的变迁-从内核协议栈到 DPDK/XDP](https://blog.csdn.net/dog250/article/details/107243696)
- [虚拟网卡和 loopback 的思想](https://blog.csdn.net/dog250/article/details/5593508)
- [cache 老化时间的思考--以 nat 为例](https://blog.csdn.net/dog250/article/details/5561083)
- [使用 XDP(eXpress Data Path)防御 DDoS 攻击](https://blog.csdn.net/dog250/article/details/77993218)
- [Express Data Path](https://www.wikiwand.com/en/Express_Data_Path)
- [eBPF 简史](https://www.ibm.com/developerworks/cn/linux/l-lo-eBPF-history/index.html)
- [https://www.cnblogs.com/aquester/p/9891484.html](https://www.cnblogs.com/aquester/p/9891484.html)
