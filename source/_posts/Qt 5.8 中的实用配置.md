---
title: Qt 5.8 中的实用功能配置
urlname: kb6pq6
date: '2017-03-27 00:00:00 +0800'
layout: post
comments: true
categories: Qt
tags:
  - Qt
  - SVN
  - 代码格式化
keywords: 'Qt, 实用配置'
description: 利用Qt的插件进行实用功能配置。
---

|    Date    |                                     Log                                     |
| :--------: | :-------------------------------------------------------------------------: |
| 03/27/2017 | 初始版本，增加"使用 SVN 进行版本控制"和"使用第三方代码格式化工具"两个章节。 |

Qt 中已经集成了强大的扩展功能，根据需要进行简单的配置就可以更方便的进行开发。以下配置均基于 Windows 平台。

## 使用 SVN 进行版本控制

前提是你的项目中已经有 SVN 服务器，没有的话可以自行搭建，参考[TBD]。

### 下载并安装 SVN 命令行客户端

推荐使用[SlikSVN](https://sliksvn.com/download/)。下载后按照提示正常安装即可。

### 打开 Qt 进行设置

1. 打开 Qt，点击菜单栏"Tools"下的"Options"选项，弹出如下图所示的设置窗口。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575440239388-be68ae19-ccea-4767-a0aa-66d7d99af9da.png#align=left&display=inline&height=677&name=image.png&originHeight=677&originWidth=1178&size=105310&status=done&style=none&width=1178)

2. 在窗口左侧导航栏中，选择"Version Control",然后点击"Subversion"选项卡，设置"Subversion command"路径-上一步中安装的 SlikSvn 路径，"Username"和"Password",然后保存并退出。

### 通过 Qt 导入 SVN 中的工程

1. 点击菜单栏"File"，选择"New File or Project"，弹出如下窗口。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575440346832-96128373-e3af-42e9-877c-0341b124c797.png#align=left&display=inline&height=629&name=image.png&originHeight=629&originWidth=962&size=85193&status=done&style=none&width=962)

2. 依次选择"Import Project"，"Subversion Checkout"，然后点击"Choose"选项，弹出如下窗口。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575440378311-0ced6759-7122-4060-92cb-a21d594e9f44.png#align=left&display=inline&height=573&name=image.png&originHeight=573&originWidth=882&size=80786&status=done&style=none&width=882)

3. 在窗体中分别设置"Repository"-要导入的已经保存在 SVN 中的工程的路径，"Path"-本地保存路径，"Directory"-本地工程目录名（建议使用默认），然后点击"Next"开始自动 Checkout，等 Checkout 完成，打开当前工程，即可开始开发工作。

### 在 Qt 中进行 SVN 常用操作

对工程代码文件修改后，可在菜单栏"Tools"下找到 SVN 常用的"Add","Commit"等指令，如下图。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575440398604-6260a817-8f50-416b-ac37-d3bb7f06f34c.png#align=left&display=inline&height=781&name=image.png&originHeight=781&originWidth=977&size=210113&status=done&style=none&width=977)

## 使用第三方代码格式化工具

Qt 中内置了代码格式化工具，其默认快捷键是 Ctrl + i，使用很方便，但是无法对赋值操作"="两侧自动添加空格，这很不爽，我尝试修改配置文件，却仍然毫无效果，于是决定使用第三方格式化工具。

这个配置过程主要参考的是 Qt Creator 的[官方手册](http://doc.qt.io/qtcreator/creator-beautifier.html)，这里只是稍作翻译。

### 打开 Beautifier 功能

选择 Help > About Plugins > C++ > Beautifier 来打开 Beautifier 功能，之后重启 Qt Creator 以使 Beautifier 生效。

### 下载安装第三方代码格式化工具

Beautifier 支持 Artistic Style, ClangFormat, Uncrustify 三种工具，我都进行了尝试，Artistic Style 没有配置成功，Uncrustify 自带的代码格式化风格没有合适的，最后使用了 ClangFormat，这本是我最不想用的，因为获取其安装包的两种方式都很不爽，一种是自行编译-相当麻烦，一种是下载官方编译好的安装包 LLVM-包含了很多其它工具，非常臃肿。

其实 LLVM 是一款很强大的工具，只是在这里只用到了其中的 ClangFormat 功能，打开[LLVM](http://releases.llvm.org/download.html)页面，选择

Clang for Windows 32 位或 64 位下载官方编译好的安装包，正常安装即可。

### 在 Qt 中配置 ClangFormat

1. 打开 Qt，点击菜单栏"Tools"下的"Options"选项，弹出如下图所示的设置窗口。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575440424321-012b41a0-fc18-4ffe-8e55-920b51fd416b.png#align=left&display=inline&height=677&name=image.png&originHeight=677&originWidth=1178&size=95656&status=done&style=none&width=1178)

2. 在窗口左侧导航栏中，选择"Beautifier",然后在"General"选项卡下勾选"Enable auto format on file save"使得文件在保存时自动格式化，并选择"Tool"为 ClangFormat。
3. 选择"Clang Format"选项卡，设置"Clang Format command"为 ClangFormat 安装路径，选择"Use predefined style"为你需要的代码风格，如下图，之后保存并退出。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575440448145-ed66c2da-2ece-4773-b1f3-0bedc3286748.png#align=left&display=inline&height=677&name=image.png&originHeight=677&originWidth=1178&size=108392&status=done&style=none&width=1178)

### 设置格式化快捷键

已经习惯了使用 Ctrl + i 作为格式化快捷键，因此需要重新设置一下。

选择 Tools > Options > Environment > Keyboard，首先去掉默认的 AutoIndentSelection 的快捷键 Ctrl + i，再为 ClangFormat 的 FormatSelectedText 添加快捷键 Ctrl + i，保存并关闭又可以愉快地使用 Ctrl + i 了，如下图所示。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575440471310-0ee910d2-b3e5-4747-adc6-a710d582a4b5.png#align=left&display=inline&height=677&name=image.png&originHeight=677&originWidth=1178&size=113437&status=done&style=none&width=1178)
