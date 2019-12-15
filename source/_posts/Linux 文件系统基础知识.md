---
title: Linux 文件系统基础知识
urlname: vuhmq2
date: '2019-11-08 00:00:00 +0800'
updated: 'Sat Dec 14 2019 00:00:00 GMT+0800 (China Standard Time)'
layout: post
comments: true
categories: Linux
tags:
  - Linux
keywords: Linux
description: Linux 文件系统基础知识。
abbrlink: c957e495
---

<a name="vzdGd"></a>
#### superblock, inode, dentry, file
理解这几个概念，首先需要搞清楚元数据（metadata ）的概念，借用维基百科的定义，元数据是关于数据的数据，即元数据包含了某段数据的一些信息。就好像你买了一辆车，而这辆车的型号、品牌及产地等信息即为该车的元数据。这些信息并不是车本身的一部分而是关于车的描述，因此称为车的元数据。在 Linux 文件系统中，元数据本身又分为了多个层级。<br />superblock 超级块是文件系统的元数据，定义了文件系统的大小、类型状态以及一些其它元数据结构的信息（此时可称超级块是元数据的元数据）。超级块是处于较高层级的文件系统的元数据结构。超级块是文件系统非常关键的信息，一旦损坏则会导致所有的数据不可用，所以一般文件系统中超级块的内容会保存多份，必要时可使用工具找到备份的超级块信息恢复损坏的文件系统。<br />inode 定义了文件的元数据信息。在 Linux 系统中，为了简洁和统一，文件、目录、设备等都被视为 file。inode 包含的元数据中，不包含文件名信息，主要包含：文件的归属关系、读写权限、文件类型以及 inode 描述的 file 在磁盘存储的数据块地址等信息。问题来了，如果 inode 不包含文件名信息，而文件名信息又必然保存在磁盘上（因为将磁盘在不同的计算机上挂载都能够看到文件名，所以文件名信息不可能是保存在某一特定计算机上），而 Linux 文件系统中保存在磁盘上的除了 inode、superblock 等元数据，也就只有数据区了，所以文件名信息必然保存在数据区，那具体是怎么保存呢？刚才提到 inode 指向的也有可能是一个目录，所以猜想这个目录对象的数据区中即保存了相关文件的文件名。<br />dentry 是仅存在与内核中的对象，用于将内核中的 file 对象与 inode 对象联系起来。dentry 中保存了文件的文件名信息，该文件名想必也是根据 inode number 信息从磁盘数据中获取的（？）。dentry 是 Linux 内核用来跟踪目录中文件层次结构的工具。 每个 dentry 将一个 inode 号映射到一个文件名和一个父目录。dentry 在文件访问加速和目录遍历等操作中发挥作用。<br />file 则是最接近用户的文件的定义，对于编程人员来说，操作文件时内核都会创建一个 file 对象，该对象包含文件存储位置和使用该文件的进程的信息和读写文件时的游标信息以及指向的 dentry 信息。 文件对象 (但不包括文件数据本身) 在关闭文件时被丢弃。<br />以上几种元数据中，superblock 和 inode 都会保存在磁盘上，在操作系统操作文件系统时被读入内核空间，所以在内核空间也会有相关的数据结构和相应的对象，而 dentry 和 file 则是根据内核操作文件的需要动态地进行创建和销毁，是临时存在的对象，不会持久化到磁盘上进行存储。<br />进程每打开一个文件，就会有一个 file 结构与之对应。同一个进程可以多次打开同一个文件而得到多个不同的 file 结构，file 结构描述被打开文件的属性，如文件的当前偏移量等信息。<br />两个不同的 file 结构可以对应同一个 dentry 结构。进程多次打开同一个文件时，对应的只有一个 dentry 结构。dentry 结构存储目录项和对应文件（inode）的信息。<br />在存储介质中，每个文件对应唯一的 inode 结点，但是每个文件又可以有多个文件名。即可以通过不同的文件名访问同一个文件。这里多个文件名对应一个文件的关系在数据结构中表示就是 dentry 和 inode 的关系。<br />Inode 中不存储文件的名字，它只存储节点号；而 dentry 则保存有名字和与其对应的节点号，所以就可以通过不同的 dentry 访问同一个 inode。<br />指向同一个 inode 的不同的 dentry 则是通过文件链接（ln 命令）来实现的。<br />![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1576301246896-71a41644-8a76-4077-82dc-e758fc49f277.png#align=left&display=inline&height=150&name=image.png&originHeight=299&originWidth=441&size=14934&status=done&style=none&width=220.5)<br />参考： [https://www.wikiwand.com/en/Inode](https://www.wikiwand.com/en/Inode)，[https://unix.stackexchange.com/a/4403](https://unix.stackexchange.com/a/4403)，[https://marcoguerri.github.io/linux/2016/09/19/on-vfs-dentry-inodes.html](https://marcoguerri.github.io/linux/2016/09/19/on-vfs-dentry-inodes.html)
<a name="8BQYD"></a>
#### 软链接和硬链接的区别
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1573195363300-6e1b32b6-8636-48a9-a84c-def0811985fb.png#align=left&display=inline&height=255&name=image.png&originHeight=255&originWidth=514&size=34517&status=done&style=none&width=514)

- 参考：[https://stackoverflow.com/questions/185899/what-is-the-difference-between-a-symbolic-link-and-a-hard-link](https://stackoverflow.com/questions/185899/what-is-the-difference-between-a-symbolic-link-and-a-hard-link)
- 硬链接是对 inode 的引用，只有所有引用都删除后 inode 才会被删除，删除源文件，通过硬链接创建的文件仍然能够访问之前保存的数据；软链接指向源文件，源文件被删除后，访问软链接会提示文件不存在， inode 一般在源文件删除后即被删除（除非有硬链接指向该 inode）。
- 创建硬链接时源文件必须存在；而软链接可以指向不存在的对象以及不同文件系统（如 nfs）的对象（目录或文件）。
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
<a name="ICS4l"></a>
#### bind mount 写入 fstab
```
/cephfs/storage /storage none defaults,bind 0 0
```


