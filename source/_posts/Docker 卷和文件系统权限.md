---
title: Docker 卷和文件系统权限
urlname: vngkut
date: '2019-10-17 00:00:00 +0800'
layout: post
comments: true
categories: 译文
tags:
  - Docker
  - 译文
keywords: Docker
description: 使用 Docker 将宿主机目录挂载到容器内使用，往往会出现权限问题造成无法正常读写文件，这篇文章揭示了背后的原因。
abbrlink: 86bd2460
---

|    Date    |    Log    |
| :--------: | :-------: |
| 17/10/2019 | 初始版本. |

### 原文

[Docker volumes and file system permissions](https://medium.com/@nielssj/docker-volumes-and-file-system-permissions-772c1aee23ca)
Docker 卷和文件系统权限

### 译文

Docker 容器的文件系统是临时存在的（不要在运行期间持久化数据到容器内的文件目录）。但是很多容器存在持久化数据的需求。Docker 的卷挂载功能提供了一种满足数据持久化需求的能力，但是使用时往往存在一些有关文件系统权限的陷阱。

在生产环境中你一般会使用一些公有云提供商的容器编排工具和持久化存储，提供商已经帮助解决了文件权限的设置问题。在大多数已部署的设置中，您将使用容器编排机制，并且某些公共云产品提供了永久性存储，它们可能具有自己配置权限的方式。但是，在本地开发期间或在产品的早期迭代中，最简单的方法是将宿主机目录挂载为 Docker 卷的形式暴露给容器内服务使用。

将主机目录配置为 Docker 卷时需要注意以下内容：

- 对卷中的内容设置的文件权限在容器和宿主机看来是一样的。
- 仅 UID（用户 ID）和 GID（组 ID）会影响文件权限。例如，用户和组的名称和密码不需要匹配，甚至不需要在主机和容器中真实存在。
- 容器 OS 根据其自身的配置对容器内的文件进行操作。例如，如果在主机和容器中都存在用户 A，如果仅在宿主机上将用户 A 添加到组 B，则在容器内用户 A 仍将无法拥有读写归属于组 B 的文件的权限，除非在容器内也创建了组 B 并将用户 A 添加到其中。
- 默认情况下，容器的命令以 root 身份运行
- 可以（在基于 unix 的系统上）将文件 / 目录所有权设置为不属于任何实际存在的组的 GID

如果你牢记上述事实，则应该能够正确配置容器和卷，并不会对文件读写权限的各种情况感到意外。如果你不熟悉 UNIX 文件权限，可以阅读该[页面](https://help.ubuntu.com/community/FilePermissions)关于文件权限的描述。

下面举例说明本地开发时如何快速配置文件权限：

在宿主机上将要用作卷的目录的归属组设置为未被任何已存在的组使用的 GID（此例中设置为 1024）

```go
chown :1024 /data/myvolume
```

更改目录权限以授予组成员完全访问权限（读 + 写 + 执行）

```go
chmod 775 /data/myvolume
```

确保文件夹中所有新建内容都将继承归属组

```go
chmod g+s /data/myvolume
```

在 Dockerfile 中创建一个用户，该用户是 1024 组的成员

```go
RUN addgroup --gid 1024 mygroup
RUN adduser --disabled-password --gecos "" --force-badname --ingroup 1024 myuser
USER myuser
```

（可选）在宿主机将当前用户添加到 1024 组中，从而可以方便地在宿主机上操作挂载为容器卷的目录的内容

```go
adduser ubuntu 1024
```

上面的示例是一个很简单的配置，可以使得不需要使用 root 用户在容器内运行程序，也可以在主机上操作挂载为容器卷的目录的内容而无需使用主机 root 用户。这些设置过程硬编码到 Docker 镜像打包过程中使得无法在容器运行时调整 GID。如果调整，则需将 GID 作为环境变量传递到容器内，并编写一个通用的初始化脚本在容器启动时进行权限配置。DeniBertović 的这篇博客  [https://denibertovic.com/posts/handling-permissions-with-docker-volumes/](https://denibertovic.com/posts/handling-permissions-with-docker-volumes/)  提供了完成此类设置的指南。
