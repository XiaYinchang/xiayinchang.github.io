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
updated: 2020-09-11 00:00:00
---

#### superblock, inode, dentry, file

理解这几个概念，首先需要搞清楚元数据（metadata ）的概念，借用维基百科的定义，元数据是关于数据的数据，即元数据包含了某段数据的一些信息。就好像你买了一辆车，而这辆车的型号、品牌及产地等信息即为该车的元数据。这些信息并不是车本身的一部分而是关于车的描述，因此称为车的元数据。在 Linux 文件系统中，元数据本身又分为了多个层级。
superblock 超级块是文件系统的元数据，定义了文件系统的大小、类型状态以及一些其它元数据结构的信息（因此可称超级块是元数据的元数据）。超级块是处于较高层级的文件系统的元数据结构，是文件系统非常关键的信息，一旦损坏则会导致所有的数据不可用，所以一般文件系统中超级块的内容会保存多份，必要时可使用工具找到备份的超级块信息恢复损坏的文件系统。
inode 定义了文件的元数据信息。在 Linux 系统中，为了简洁和统一，文件、目录、设备等都被视为 file。inode 包含的元数据中，不包含文件名信息，主要包含：文件的归属关系、读写权限、文件类型以及 inode 描述的 file 在磁盘存储的数据块地址等信息。问题来了，如果 inode 不包含文件名信息，而文件名信息又必然保存在磁盘上（因为将磁盘在不同的计算机上挂载都能够看到文件名，所以文件名信息不可能是保存在某一特定计算机上），而 Linux 文件系统中保存在磁盘上的除了 inode、superblock 等元数据，也就只有数据区了，所以文件名信息必然保存在数据区，那具体是怎么保存呢？刚才提到 inode 指向的也有可能是一个目录，所以猜想这个目录对象的数据区中即保存了相关文件的文件名。
dentry 是仅存在与内核中的对象，用于将内核中的 file 对象与 inode 对象联系起来。dentry 中保存了文件的文件名信息，该文件名也是根据 inode number 信息从磁盘数据中获取的。dentry 是 Linux 内核用来跟踪目录中文件层次结构的工具。 每个 dentry 将一个 inode 号映射到一个文件名。dentry 在文件访问加速和目录遍历等操作中发挥作用。
file 则是最接近用户的文件的定义，对于编程人员来说，操作文件时内核都会创建一个  file 对象，该对象包含文件存储位置和使用该文件的进程的信息和读写文件时的游标信息以及指向的 dentry（在 5.8-rc6 内核源码中看起来是直接指向的 inode ） 信息。 文件对象 (但不包括文件数据本身) 在关闭文件时被丢弃。
以上几种元数据中，superblock 和 inode 都会保存在磁盘上，在操作系统操作文件系统时被读入内核空间，所以在内核空间也会有相关的数据结构和相应的对象，而 dentry 和 file 则是根据内核操作文件的需要动态地进行创建和销毁，是临时存在的对象，不会持久化到磁盘上进行存储。
dentry 是仅存在于内存的目录项缓存，为了提高查找性能而设计，基于文件系统中存储目录信息的 inode 的数据构建，形成一个树状结构，用于从文件名到 inode 号的对应查找，从而能够快速将用户操作的 file 与底层 inode 关联起来。
进程每打开一个文件，就会有一个 file 结构与之对应。同一个进程可以多次打开同一个文件而得到多个不同的 file 结构，file 结构描述被打开文件的属性，如文件的当前偏移量等信息。
两个不同的 file 结构可以对应同一个 dentry 结构。进程多次打开同一个文件时，对应的只有一个 dentry 结构。dentry 结构存储目录项和对应文件（inode）的信息。
在存储介质中，每个文件对应唯一的 inode 结点，但是每个文件又可以有多个文件名。即可以通过不同的文件名访问同一个文件。这里多个文件名对应一个文件的关系在数据结构中表示就是 dentry 和 inode 的关系。
Inode 中不存储文件的名字，它只存储节点号；而 dentry 则保存有名字和与其对应的节点号，所以就可以通过不同的 dentry 访问同一个 inode。
指向同一个 inode 的不同的 dentry 则是通过文件链接（ln 命令）来实现的。
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1576301246896-71a41644-8a76-4077-82dc-e758fc49f277.png#align=left&display=inline&height=150&margin=%5Bobject%20Object%5D&name=image.png&originHeight=299&originWidth=441&size=14934&status=done&style=none&width=220.5)
参考： [https://www.wikiwand.com/en/Inode](https://www.wikiwand.com/en/Inode)，[https://unix.stackexchange.com/a/4403](https://unix.stackexchange.com/a/4403)，[https://marcoguerri.github.io/linux/2016/09/19/on-vfs-dentry-inodes.html](https://marcoguerri.github.io/linux/2016/09/19/on-vfs-dentry-inodes.html)

#### 软链接和硬链接的区别

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1573195363300-6e1b32b6-8636-48a9-a84c-def0811985fb.png#align=left&display=inline&height=255&margin=%5Bobject%20Object%5D&name=image.png&originHeight=255&originWidth=514&size=34517&status=done&style=none&width=514)

- 参考：[https://stackoverflow.com/questions/185899/what-is-the-difference-between-a-symbolic-link-and-a-hard-link](https://stackoverflow.com/questions/185899/what-is-the-difference-between-a-symbolic-link-and-a-hard-link)
- 硬链接是对 inode 的引用，只有所有引用都删除后 inode 才会被删除，删除源文件，通过硬链接创建的文件仍然能够访问之前保存的数据；软链接指向源文件，源文件被删除后，访问软链接会提示文件不存在， inode 一般在源文件删除后即被删除（除非有硬链接指向该 inode）。
- 创建硬链接时源文件必须存在；而软链接可以指向不存在的对象以及不同文件系统（如 nfs）的对象（目录或文件）。
- 创建硬链接增加了针对指定 inode 的引用项，创建软链接增加了一条包含指定路径名称的记录项，由此在内核中构建的 dentry 记录也会有所差别。
- 关于为什么不允许对目录创建硬链接的个人理解：硬链接创建的是和源文件同样类型的文件系统对象，在硬链接创建完成后，文件系统已经无法区分新建出来的文件系统对象是否是通过硬链接创建出来的，因此在执行目录遍历时便会将其作为普通的文件对象对待，因此一旦允许硬链接指向目录，则在出现环路时会永不停止的遍历下去，造成文件系统无法正常工作；而对目录创建软链接可以工作是因为，软链接创建出来的文件系统对象和普通的文件系统对象类型是不一样的，因此文件系统可以区分出软链接创建出来的文件系统对象并在进行目录遍历时获取到软链接指向的最短路径（readlink -f soft-link）后就终止对其进行遍历，从而能够正常工作；其关键在于是否可识别，如果能够识别就可以区别对待。

#### chroot

chroot 改变了进程及其子进程能够访问的文件系统的入口点，使得该应用只能访问新的根目录下的文件内容而无法访问根目录以外的文件，将应用置于沙盒中从而限制其能够访问的文件和设备等资源，实现对应用的安全隔离。

#### 软链接和 bind mount 的比较

- 其相同之处是都可以实现对源目录进行跨文件系统的定位和访问。
- 其主要的不同点在于它们的控制主体和表现形式，软链接由文件系统负责管理，是文件系统中的对象；bind mount 由内核直接控制，是内核中的实体，比文件系统层级更低（因此 bind mount 需要 root 权限，创建软链接并不需要 root 权限），它可以更改文件系统的底层拓扑结构而使得文件系统毫无察觉（因此 bind mount 过程不会持久化保存，系统重启时必须重新进行 bind mount，一般将其写入到 /etc/fstab）。
- 软链接的创建可以使用相对路径或绝对路径，表示对象中保存的源路径与输入路径完全一致，因此有可能使得软链接在某些情况无法访问（例如，在由软链接建立的循环路径中相对路径可能失效）；bind mount 在使用相对路径作为源路径时会将其解析为绝对路径后保存并挂载。
- 在使用 chroot 的情况下，软链接的范围仅限于当前新的根目录下（源目录与目的目录均在当前 chroot 下），而 bind mount 可以将 chroot 外的文件挂载到当前 chroot 中使用（过程是怎样的？）
- 容器文件系统的挂载过程借助了 bind mount。
- bind mount 是将内核中的数据结构从源端拷贝到目的端。
- 改变目录树视图的文件系统可被称为 overlay 文件系统，bindfs/overlay2/aufs 均可称为 overlay 文件系统。
- 参考：[https://www.quora.com/What-are-the-differences-between-bind-mounts-and-symlink-on-Unix](https://www.quora.com/What-are-the-differences-between-bind-mounts-and-symlink-on-Unix)
- 参考：[https://unix.stackexchange.com/questions/198590/what-is-a-bind-mount](https://unix.stackexchange.com/questions/198590/what-is-a-bind-mount)

#### mount namespace

- [https://lwn.net/Articles/689856/](https://lwn.net/Articles/689856/)
- 新的 mount namespace 会继承原 mount namespace 的挂载点（因为是 clone），之后挂载点会各自变化。
- Creating a mount namespace is similar to a recursive bind mount of / followed by chroot into the bind mount. Chroot creating is simular to creating a mount namespace followed by pivot_root.
- [https://unix.stackexchange.com/questions/456620/how-to-perform-chroot-with-linux-namespaces](https://unix.stackexchange.com/questions/456620/how-to-perform-chroot-with-linux-namespaces)

#### bind mount 写入 fstab

```
/cephfs/storage /storage none defaults,bind 0 0
```

#### 文件的 atime/mtime/ctime

atime 是文件最后被访问的时间，mtime 是文件最后更新的时间，ctime 是文件权限/所有者等元数据发生变化的时间，`ls -l` 默认显示文件的 mtime，`touch` 命令用于更新文件的 atime/mtime/ctime 为当前时间。

```bash
# 使用 stat 命令可以查看文件的三种时间戳
stat Dockerfile
# 输出如下
  File: Dockerfile
  Size: 714       	Blocks: 8          IO Block: 4096   regular file
Device: 801h/2049d	Inode: 1730866260  Links: 1
Access: (0644/-rw-r--r--)  Uid: ( 1000/     xyc)   Gid: (  985/   users)
Access: 2020-07-20 18:30:18.011746992 +0800
Modify: 2020-07-20 18:28:45.569930146 +0800
Change: 2020-07-20 18:28:45.569930146 +0800
 Birth: 2020-07-20 18:28:45.569930146 +0800
```

#### 系统启动时加载 initrd (initramfs)

grub 在加载内核的同时，还需要加载 initrd (initramfs)，并交给内核进行挂载。grub 完成自己的任务后会把系统启动的工作移交给内核继续进行，initrd 提供了内核执行启动工作所必须的最小资源集，包括网卡驱动、磁盘驱动、各种文件系统驱动和扩展内核模块等，可视为一个临时的根文件系统，当内核从中获取必要的驱动与模块从而有能力操作各种外设后，将会挂载最终的根文件系统来替换掉该临时的文件系统。
initrd (initial ram disk) 和 initramfs (initial ram file system) 所承载的内容是一样的，区别在于其工作模式。
顾名思义，initrd 是内存盘的镜像，内核在读取其内容时将其作为块设备处理，且这个块设备完整存在于内存中，占用了内存空间，再加上内核从块设备读取数据时会将数据拷贝到 page cache（对于文件数据）和 dentry cache（(对于目录项），相当于同样的数据在内存中存在了两份从而造成浪费。initrd 的另一个特点是，既然它是一个块设备，则在其之上必然存在一种系统（一般是 ext2 ）才能承载可供内核读取的数据，同时内核在编译时也必须加入此种文件系统的驱动。块设备大小固定，所以可能存在内存空间浪费或所需空间不足的情况。
显然，initramfs 是一份文件系统的数据镜像，其所使用的文件系统名为 tmpfs，是一种 dummy 文件系统，它提供给 VFS （虚拟文件系统）的接口仅包含了能够保证正常工作的最少功能集。基于 tmpfs 的文件读写均是对内核中同一份数据的操作，且不需要块设备驱动的介入。另外，tmpfs 基于 Linux cache 系统构建，仅增加少量代码，是内核原生支持的文件系统格式，而无需加入额外的驱动支持。
参考：[https://stackoverflow.com/a/10604667](https://stackoverflow.com/a/10604667)，[https://blog.csdn.net/findstr/article/details/6990807](https://blog.csdn.net/findstr/article/details/6990807)

#### xfs 文件系统

参考：[http://landoflinux.com/linux_xfs_filesystem_introduction.html](http://landoflinux.com/linux_xfs_filesystem_introduction.html)，[https://www.wikiwand.com/en/XFS](https://www.wikiwand.com/en/XFS)，[https://righteousit.wordpress.com/2018/05/21/xfs-part-1-superblock/](https://righteousit.wordpress.com/2018/05/21/xfs-part-1-superblock/)

#### tmpfs

tmpfs 是基于内存的文件系统，它使用虚拟内存空间，可被交换至 swap 分区，初始挂载时使用很小的空间，其占用的内存空间大小随实际文件的大小变化，当文件被删除时内存空间会被释放。挂载时可指定可用空间大小，若未指定，则默认为内存空间大小的一半。tmpfs 基于 ramfs 和 page cache 构建，不同于 ramfs 的是 tmpfs 中的内容可被交换至 swap 分区，tmpfs 所用内存大小和 inode 数量可被限制，防止内存被耗尽。ramfs 基于物理内存，所以无法使用 swap 分区；tmpfs 基于虚拟内存，可使用物理内存和 swap 空间。
tmpfs 通常被用在 /tmp, /var/lock, /var/run 挂载点，也被挂载在 /dev/shm 用于 POSIX 共享内存，挂载至 /dev/shm 由 systemd 自动完成。

```bash
// 手动挂载，size=0 意味不限制大小，nr_inodes=0 意味不限制 inode 数量
mount -t tmpfs -o size=20m tmpfs /mnt/tmp
// 写入 fstab
tmpfs /tmp tmpfs size=2m 0 0
```

#### ls 列出的文件信息

```bash
$ ls -ltrh
total 19M
drwxr-xr-x  4 root root   35 Jul  1 18:07 uk8s-demo
-rw-r--r--  1 root root  21K Jul  3 12:52 prometheus.yaml
-rw-r--r--  1 root root  998 Jul  3 15:02 prometheus-instance.yaml
-rw-r--r--  1 root root 1.5K Jul  3 15:05 prometheus-operator-old.yaml
-rw-r--r--  1 root root 1.4K Jul  3 16:19 etcd-sm.yaml
-rw-r--r--  1 root root  202 Jul  8 15:35 delete-cm.bash
-rw-r--r--  1 root root  32K Jul  8 16:45 prometheus-new.yaml
-rw-r--r--  1 root root  325 Jul  8 18:12 prometheus-svc.yaml
-rw-r--r--  1 root root 2.4K Jul 21 10:33 prometheus-sts.yaml
```

| 第一列     | 第二列 | 第三列 | 第四列 | 第五列 | 第六列       | 第七列    |
| ---------- | ------ | ------ | ------ | ------ | ------------ | --------- |
| drwxr-xr-x | 4      | root   | root   | 35     | Jul  1 18:07 | uk8s-demo |

| 文件的类型和文件权限
第一个字符表示文件类型：d 目录 , - 文件 , l 链接 , s: socket , p: named pipe , b: block device , c: character device。
文件权限中 x 位为 s 时，表示在文件执行时把进程的属主或组 ID 置为该文件的文件属主。 | 文件链接个数 | 文件的所有者 | 文件的属组 | 文件大小 | 文件内容被修改的最后时间 | 文件名称 |

#### /dev/ptmx

伪终端 (pseudoterminal) : ptmx, pts (伪终端 master 和伪终端 slave )。/dev/ptmx 用于创建伪终端主从设备对。当我们用 open 打开 /dev/ptmx 设备后, 返回主设备的文件描述符，并且在 /dev/pts/ 目录下创建一个伪终端从设备。在成功打开 /dev/ptmx 后, 可以通过函数 ptsname() 来获取从设备的 path 。想要打开 open 伪终端从设备,必须先使用主设备的文件描述符调用 grantpt() , unlockpt() 。当主设备和从设备都打开后, 在主设备写入的数据可以在从设备上读取, 在从设备上写入的数据可以在主设备读取。

#### 阅读材料

- [What Are Inodes in Linux and How Are They Used](https://helpdeskgeek.com/linux-tips/what-are-inodes-in-linux-and-how-are-they-used/)
- [https://www.wikiwand.com/en/Inode](https://www.wikiwand.com/en/Inode)
- [https://www.thegeekdiary.com/unix-file-basics-inode-soft-vs-hard-link-device-files/](https://www.thegeekdiary.com/unix-file-basics-inode-soft-vs-hard-link-device-files/)
- [Tmpfs](https://www.kernel.org/doc/html/latest/filesystems/tmpfs.html)，[archwiki-Tmpfs](https://wiki.archlinux.org/index.php/Tmpfs)
- [Linux 特殊权限 SUID,SGID,SBIT](https://www.cnblogs.com/sparkdev/p/9651622.html)
