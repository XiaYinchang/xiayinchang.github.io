---
title: Linux 文件系统基础知识
urlname: vuhmq2
date: '2019-11-08 00:00:00 +0800'
layout: post
comments: true
categories: Linux
tags:
  - Linux
keywords: Linux
description: Linux 文件系统基础知识。
abbrlink: c957e495
---

<a name="d3l9E"></a>
#### 软链接和硬链接的区别
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1573195363300-6e1b32b6-8636-48a9-a84c-def0811985fb.png#align=left&display=inline&height=255&name=image.png&originHeight=255&originWidth=514&search=&size=34517&status=done&width=514)

- 参考：[https://stackoverflow.com/questions/185899/what-is-the-difference-between-a-symbolic-link-and-a-hard-link](https://stackoverflow.com/questions/185899/what-is-the-difference-between-a-symbolic-link-and-a-hard-link)
- 硬链接是对 inode 的引用，只有所有引用都删除后 inode 才会被删除，删除源文件，通过硬链接创建的文件仍然能够访问之前保存的数据；软链接指向源文件，源文件被删除后，访问软链接会提示文件不存在， inode 一般在源文件删除后即被删除（除非有硬链接指向该 inode）。
- 创建硬链接时源文件必须存在；而软链接可以指向不存在的对象以及不同文件系统的对象（目录或文件）。
- 创建硬链接改变文件系统结构，创建软链接不改变文件系统结构（或许是增加了一个应用层存储软链接对象）。
- 关于为什么不允许对目录创建硬链接的个人理解：硬链接创建的是和源文件同样类型的文件系统对象，在硬链接创建完成后，文件系统已经无法区分新建出来的文件系统对象是否是通过硬链接创建出来的，因此在执行目录遍历时便会将其作为普通的文件对象对待，因此一旦允许硬链接指向目录，则在出现环路时会永不停止的遍历下去，造成文件系统无法正常工作；而对目录创建软链接可以工作是因为，软链接创建出来的文件系统对象和普通的文件系统对象类型是不一样的，因此文件系统可以区分出软链接创建出来的文件系统对象并在进行目录遍历时获取到软链接指向的最短路径（readlink -f soft-link）后就终止对其进行遍历，从而能够正常工作；其关键在于是否可识别，如果能够识别就可以区别对待。
<a name="KiJyy"></a>
#### chroot
chroot 改变了进程及其子进程能够访问的文件系统的入口点，使得该应用只能访问新的根目录下的文件内容而无法访问根目录以外的文件，将应用置于沙盒中从而限制其能够访问的文件和设备等资源，实现对应用的安全隔离。
<a name="Hy6Xv"></a>
#### 软链接和 bind mount 的比较

- 其相同之处是都可以实现对源目录进行跨文件系统的定位和访问。
- 其主要的不同点在于它们的控制主体和表现形式，软链接由文件系统负责管理，是文件系统中的对象；bind mount 由内核直接控制，是内核中的实体，比文件系统层级更低（因此 bind mount 需要 root 权限，创建软链接并不需要 root 权限），它可以更改文件系统的底层拓扑结构而使得文件系统毫无察觉（因此 bind mount 过程不会持久化保存，系统重启时必须重新进行 bind mount，一般将其写入到 /etc/fstab）。
- 软链接的创建可以使用相对路径或绝对路径，表示对象中保存的源路径与输入路径完全一致，因此有可能使得软链接在某些情况无法访问（例如，在由软链接建立的循环路径中相对路径可能失效）；bind mount 在使用相对路径作为源路径时会将其解析为绝对路径后保存并挂载。
- 在使用 chroot 的情况下，软链接的范围仅限于当前新的根目录下（源目录与目的目录均在当前 chroot 下），而 bind mount 可以将 chroot 外的文件挂载到当前 chroot 中使用（过程是怎样的？）
- 容器文件系统的挂载过程借助了 bind mount。
- 参考：[https://www.quora.com/What-are-the-differences-between-bind-mounts-and-symlink-on-Unix](https://www.quora.com/What-are-the-differences-between-bind-mounts-and-symlink-on-Unix)
- 参考：[https://unix.stackexchange.com/questions/198590/what-is-a-bind-mount](https://unix.stackexchange.com/questions/198590/what-is-a-bind-mount)
<a name="XJ56q"></a>
#### mount namespace

- [https://lwn.net/Articles/689856/](https://lwn.net/Articles/689856/)
- 新的 mount namespace 会继承原 mount namespace 的挂载点（因为是 clone），之后挂载点会各自变化。
- Creating a mount namespace is similar to a recursive bind mount of / followed by chroot into the bind mount. Chroot creating is simular to creating a mount namespace followed by pivot_root.
- [https://unix.stackexchange.com/questions/456620/how-to-perform-chroot-with-linux-namespaces](https://unix.stackexchange.com/questions/456620/how-to-perform-chroot-with-linux-namespaces)

