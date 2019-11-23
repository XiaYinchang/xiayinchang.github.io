
---

title: ArchLinux 常用命令

urlname: egtn5p

date: 2019-09-04 00:00:00 +0800

layout: post

comments: true

categories: Linux

tags: [Linux,ArchLinux]

keywords: ArchLInux

description: 本文记录使用 ArchLinux 作为开发平台常用的命令和操作。

---


<a name="BdT88"></a>
#### yay 使用相关

```bash
# 安装包时覆盖本地已存在文件
yay deluge --force
# 查看所有安装的文件及其路径
yay -Ql deluge
# 查找时按照指定 filed 排序
yay wechat --sortby <votes|popularity|id|baseid|name|base|submitted|modified>
```

<a name="aQrbN"></a>
#### Network-Manage 使用 SSTP VPN 
需要安装客户端软件： `network-manager-sstp`


