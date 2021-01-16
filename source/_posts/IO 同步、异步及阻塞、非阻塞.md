---
title: IO 同步、异步及阻塞、非阻塞
urlname: riyfd8
date: '2019-12-08 00:00:00 +0800'
layout: post
comments: true
categories: Linux
tags:
  - Linux
  - IO
keywords: 'Linux,IO,异步,同步,阻塞,非阻塞'
description: 理清 Linux 网络 IO 的各种概念。
updated: 2019-12-08 00:00:00
---

#### 网络 IO 

一般情况下，一次网络 IO 读操作会涉及两个系统对象：(1) 用户进程 (线程) Process；(2) 内核对象 kernel，两个处理阶段：

```
[1] Waiting for the data to be ready - 等待数据准备好
[2] Copying the data from the kernel to the process - 将数据从内核空间的buffer拷贝到用户空间进程的buffer
```

阻塞与非阻塞指的是用户进程在发起调用后等待调用结果的状态，同步与异步指的是内核如何处理用户调用并如何将结果返回给用户进程。
阻塞与非阻塞关注的是单个进程（线程）的执行状态，同步和异步关注的是程序之间的协作关系（这里主要是用户进程与内核之间）。
异步一定不会造成阻塞，因此只有同步时才有阻塞与非阻塞之分。异步的实现一般是通过函数回调来实现，例如 Node.js 的回调函数，参见：[https://www.cnblogs.com/chenyangyao/p/libuv_threadpool.html](https://www.cnblogs.com/chenyangyao/p/libuv_threadpool.html)。
同步与异步的一个区别是，同步函数调用时返回的即为最终数据，异步调用不立即返回数据，可以在执行一些其他任务之后再来查看调用结果或者是在接到事件通知后查看结果。
异步 IO 中内核会负责将数据拷贝到用户态（或者使用内存映射），然后通知用户进程使用即可，而同步 IO 需要用户进程自行通过系统调用从内核拷贝数据。
同步 IO 中，对同一个描述符的操作必须是有序的。异步 IO 中，可以允许多方同时对同一个描述符发送 IO 请求，或者一次发送多个请求，当然需要有机制去区分这些请求。同步是线性的，异步可以认为是并发的（联想到 HTTP/1.1 和 HTTP/2 在发起大量 HTTP 请求时的不同表现）。
从总体的 CPU 效率来看，非阻塞不一定比阻塞更好，如果非阻塞是通过轮询查询数据是否准备好，虽然轮询的过程中可能穿插一些其它工作，但大概率会因为数据没有 ready 而致使 CPU 空转，虽然当前进程获取的时间片多了，但却存在大量的浪费，还不如进程阻塞被挂起，CPU 忙其它的工作。
阻塞、非阻塞、多路 IO 复用，都是同步 IO。真正的异步 IO 需要内核的深度参与。换句话说，只有用户线程在操作 IO 的时候根本不去考虑 IO 的执行全部都交给内核去完成，而自己只等待一个完成信号的时候，才是真正的异步 IO。所以，拉一个子线程去轮询、去死循环，或者使用 select、poll、epool，都不是异步。
Linux 中不存在完全异步的网络 IO，AIO 由于没有完善的网络 API，目前主要用于文件 IO，例如数据库或分布式存储后端，参见：[https://www.zhihu.com/question/26943558](https://www.zhihu.com/question/26943558)。
虽然 Linux 中主流的网络 IO 模型都是同步 IO ，但是基于多路复用和回调机制的 epoll 也是够用的。

#### 五类 IO 模型

1. 完全阻塞

两个处理阶段均阻塞。一个线程只处理一个连接。
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575800282968-bce27934-e535-49b8-8c25-2945f7d2ce70.png#align=left&display=inline&height=291&name=image.png&originHeight=291&originWidth=550&size=33321&status=done&style=none&width=550)

2. 非阻塞

检查数据是否准备好的阶段即阶段一不阻塞（一般是通过轮询实现，虽然不阻塞，但是一样低效，此时调用方处于忙等待，不被挂起，消耗 CPU 资源），阶段二阻塞。一个线程处理一个连接。
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575800363874-2e57da37-f74c-4dd4-b75c-6a7db13bb99d.png#align=left&display=inline&height=291&name=image.png&originHeight=291&originWidth=550&size=40341&status=done&style=none&width=550)

3. IO 多路复用

两个阶段均阻塞，但是一个线程可以处理多个连接。虽然阶段一阻塞，但是被阻塞线程可以被挂起，阻塞期间不消耗 CPU 资源。
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575800468227-7354dc16-071b-459d-a472-33103ef6e76d.png#align=left&display=inline&height=299&name=image.png&originHeight=299&originWidth=550&size=42845&status=done&style=none&width=550)

4. 信号驱动 IO

阶段一创建信号即可，不需要监测描述符，不阻塞，阶段二阻塞。
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575800792427-fc0c4e8f-336a-4c86-a3b0-646238b5c2ca.png#align=left&display=inline&height=313&name=image.png&originHeight=313&originWidth=550&size=44205&status=done&style=none&width=550)

5. 异步 IO

两个阶段均不阻塞。
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575800815863-ec7fe271-d1a0-4e49-a4ba-8e5d5990e151.png#align=left&display=inline&height=327&name=image.png&originHeight=327&originWidth=550&size=41762&status=done&style=none&width=550)

6. 总体比较

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575804118240-0ad5c30f-e984-45fc-b945-a6ca192fefa7.png#align=left&display=inline&height=328&name=image.png&originHeight=328&originWidth=587&size=87015&status=done&style=none&width=587)

#### IO 多路复用

IO 多路复用是 Linux 网络编程用到的主流的 IO 模型。select，poll，epoll 都是 IO 多路复用的机制。I/O 多路复用通过一种机制，可以监视多个描述符，一旦某个描述符就绪（一般是读就绪或者写就绪），能够通知程序进行相应的读写操作。 select，poll，epoll 本质上都是同步 I/O，因为他们都需要在读写事件就绪后由用户进程负责执行读写，且读写过程是阻塞的，而异步 I/O 则无需用户进程负责读写，异步 I/O 的实现会负责把数据从内核拷贝到用户空间。可以查阅三个分别使用 [select](http://www.cnblogs.com/Anker/archive/2013/08/14/3258674.html)，[poll](http://www.cnblogs.com/Anker/archive/2013/08/15/3261006.html)，[epoll](http://www.cnblogs.com/Anker/archive/2013/08/17/3263780.html) 编写的 echo 示例程序帮助理解三种机制的工作过程。
select 仅仅知道有 IO 事件发生，却并不知道发生在哪个 socket 上（可能有一个，多个甚至全部），所以只能无差别轮询所有 socket 找出可读或可写的 socket 进行操作。由于是轮询所以是 O(n)  的时间复杂度，socket 越多则轮询时间越长。
select 主要有三个问题：① 被监控的描述符集合大小被宏控制为 1024 （64 位机是 2048），数量太少；② 描述符集合需要从用户空间拷贝到内核空间，我们希望不要拷贝；③ 当被监控的描述符中有 IO 事件发生时，我们希望通知更精细一点，可以直接从通知中获取存在可读事件的描述符集合，而不是需要遍历整个描述符集合。
poll 本质上和 select 没有区别，poll 只是解决了 select 的第一个问题即描述符集合大小限制的问题，poll 使用了 pollfd 结构而不是 select 的 fd_set 结构，基于链表来存储描述符，所以没有最大连接数的限制。但是，poll 并没有改变大量描述符被复制于用户态和内核态的地址空间之间，以及个别描述符就绪触发整体描述符集合的遍历的低效问题。poll 随着监控的 socket 集合的增加性能线性下降，poll 不适合用于大并发场景。
epoll 可以理解为 event poll，不同于无差别轮询，epoll 会把哪个 socket 发生了怎样的 IO 事件通知我们。所以我们说 epoll 实际上是事件驱动的（每个事件关联上 socket ），此时我们对这些 socket 的操作都是有意义的（复杂度降低到了 O(1)）。Epoll 最大的优点就在于它只管 “活跃” 的连接，而跟连接总数无关，因此在实际的网络环境中，Epoll 的效率就会远远高于 select 和 poll。
epoll 解决 select 遗留的问题时主要借助两种思想：引入中间层和变集中处理为分散处理。每次调用 select 时都会进行一次描述符集合从用户空间到内核空间的拷贝，但实际上由于连续两次调用时描述符集合的变化很小，没必要每次都重新准备整个描述符集合，所以在 epoll 中引入了 epoll_ctl 系统调用，将描述符的增删改和高频调用的 epoll_wait 隔离开，在最初通过 epoll_create 创建 epoll 描述符后，会立即将监听 socket 的描述符通过 epoll_ctl 调用加入到描述符集合中，随后只有在需要监控的描述符集合发生变化时才会通过 epoll_ctl 去增删改，而 epoll_wait 调用并不会重新复制描述符集合到内核空间，这样就将 select 中的大块的内存拷贝（集中处理）分散为了低频的小块内存拷贝（分散处理）。同时，对于高频 epoll_wait 调用返回可读就绪的描述符集合时的拷贝问题，epoll 通过内核与用户空间 mmap (内存映射) 同一块内存来解决。mmap 将用户空间的一块地址和内核空间的一块地址同时映射到相同的一块物理内存地址（不管是用户空间还是内核空间都是虚拟地址，最终要通过地址映射映射到物理地址），使得这块物理内存对内核和对用户均可见，减少用户态和内核态之间的数据交换。
另外，epoll 通过 epoll_ctl 来对监控的描述符集合来进行增、删、改，那么必须涉及到描述符的快速查找问题，于是，一个低时间复杂度的增、删、改、查的数据结构来组织被监控的描述符集合是必不可少的了。在 linux 2.6.8 之前的内核，epoll 使用散列表来组织描述符集合，于是在创建 epoll 描述符的时候，epoll 需要初始化散列表的大小。于是 epoll_create (int size) 有一个参数 size，以便内核根据 size 的大小来分配散列表的大小。在 linux 2.6.8 以后的内核中，epoll 使用红黑树来组织监控的描述符集合，于是 epoll_create (int size) 的参数 size 实际上已经没有意义了。
epoll 巧妙的引入一个中间层解决了大量监控 socket 的无效遍历问题。epoll 在中间层上为每个监控的 socket 准备了一个单独的回调函数 epoll_callback_sk，而对于 select，所有的 socket 都共用一个相同的回调函数。正是这个单独的回调 epoll_callback_sk 使得每个 socket 都能单独处理自身，当自己就绪的时候将自身 socket 挂入 epoll 的 ready_list。同时，epoll 引入了一个睡眠队列 single_epoll_wait_list，分割了两类睡眠等待。process 不再睡眠在所有的 socket 的睡眠队列上，而是睡眠在 epoll 的睡眠队列上等待“任意一个 socket 可读就绪”事件。而中间 wait_entry_sk 则代替 process 睡眠在具体的 socket 上，当 socket 就绪的时候，它就可以处理自身了。
关于更多 epoll 边沿触发和水平触发的内容参考：[https://cloud.tencent.com/developer/article/1005481](https://cloud.tencent.com/developer/article/1005481)。简单理解，边沿触发只有新的数据到达时会被触发（就算有未读完的数据也必须等到新数据到来后触发才能继续读），而水平触发只要有数据可读就会被触发（可能是上次触发后数据未读完）。而相对的，边沿触发由于只会在新的数据到来时才会通知到用户进程，所以 epoll_wait 返回的描述符集合可能会小于使用水平触发，所以有边沿触发效率更高的说法。但假如那些被边沿触发忽略掉的而被水平触发返回的可读描述符仍然是你需要读取的对象，那水平触发可能效率更高，因为你可以更快的读完剩余数据而不是必须等到新数据的到来。
