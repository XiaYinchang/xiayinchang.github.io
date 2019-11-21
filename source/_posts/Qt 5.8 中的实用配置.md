
---

title: Qt 5.8 中的实用功能配置

urlname: kb6pq6

date: 2017-03-27 00:00:00 +0800

layout: post

comments: true

categories: Qt

tags: [Qt,SVN,代码格式化]

keywords: Qt, 实用配置

description: 利用Qt的插件进行实用功能配置。

---


| Date | Log |
| :---: | :---: |
| 03/27/2017 | 初始版本，增加"使用SVN进行版本控制"和"使用第三方代码格式化工具"两个章节。 |


Qt 中已经集成了强大的扩展功能，根据需要进行简单的配置就可以更方便的进行开发。以下配置均基于Windows平台。


<a name="42218e06"></a>
## 使用SVN进行版本控制

前提是你的项目中已经有SVN服务器，没有的话可以自行搭建，参考[TBD]。


<a name="7721685c"></a>
### 下载并安装SVN命令行客户端

推荐使用[SlikSVN](https://sliksvn.com/download/)。下载后按照提示正常安装即可。


<a name="79262238"></a>
### 打开 Qt 进行设置

1. 打开Qt，点击菜单栏"Tools"下的"Options"选项，弹出如下图所示的设置窗口。<br />
![](http://i.imgur.com/yBYxwpG.png#align=left&display=inline&height=677&originHeight=677&originWidth=1178&status=done&width=1178)
2. 在窗口左侧导航栏中，选择"Version Control",然后点击"Subversion"选项卡，设置"Subversion command"路径-上一步中安装的SlikSvn路径，"Username"和"Password",然后保存并退出。


<a name="2109a010"></a>
### 通过 Qt 导入SVN中的工程

1. 点击菜单栏"File"，选择"New File or Project"，弹出如下窗口。<br />
![](http://i.imgur.com/HJ1JAP3.png#align=left&display=inline&height=629&originHeight=629&originWidth=962&status=done&width=962)
2. 依次选择"Import Project"，"Subversion Checkout"，然后点击"Choose"选项，弹出如下窗口。<br />
![](http://i.imgur.com/BwaYgxG.png#align=left&display=inline&height=573&originHeight=573&originWidth=882&status=done&width=882)
3. 在窗体中分别设置"Repository"-要导入的已经保存在SVN中的工程的路径，"Path"-本地保存路径，"Directory"-本地工程目录名（建议使用默认），然后点击"Next"开始自动Checkout，等Checkout完成，打开当前工程，即可开始开发工作。


<a name="64eed538"></a>
### 在 Qt 中进行SVN常用操作

对工程代码文件修改后，可在菜单栏"Tools"下找到SVN常用的"Add","Commit"等指令，如下图。<br />
![](http://i.imgur.com/8lmetjw.png#align=left&display=inline&height=781&originHeight=781&originWidth=977&status=done&width=977)


<a name="3da7a94e"></a>
## 使用第三方代码格式化工具

Qt 中内置了代码格式化工具，其默认快捷键是Ctrl + i，使用很方便，但是无法对赋值操作"="两侧自动添加空格，这很不爽，我尝试修改配置文件，却仍然毫无效果，于是决定使用第三方格式化工具。<br />
这个配置过程主要参考的是Qt Creator的[官方手册](http://doc.qt.io/qtcreator/creator-beautifier.html)，这里只是稍作翻译。


<a name="316d92d0"></a>
### 打开 Beautifier 功能

选择Help > About Plugins > C++ > Beautifier 来打开 Beautifier 功能，之后重启 Qt Creator 以使 Beautifier 生效。


<a name="a420232a"></a>
### 下载安装第三方代码格式化工具

Beautifier 支持 Artistic Style, ClangFormat, Uncrustify 三种工具，我都进行了尝试，Artistic Style 没有配置成功，Uncrustify 自带的代码格式化风格没有合适的，最后使用了 ClangFormat，这本是我最不想用的，因为获取其安装包的两种方式都很不爽，一种是自行编译-相当麻烦，一种是下载官方编译好的安装包 LLVM-包含了很多其它工具，非常臃肿。<br />
其实 LLVM 是一款很强大的工具，只是在这里只用到了其中的 ClangFormat 功能，打开[LLVM](http://releases.llvm.org/download.html)页面，选择<br />
Clang for Windows 32位或64位下载官方编译好的安装包，正常安装即可。


<a name="ab8a866d"></a>
### 在 Qt 中配置 ClangFormat

1. 打开Qt，点击菜单栏"Tools"下的"Options"选项，弹出如下图所示的设置窗口。<br />
![](http://i.imgur.com/xfOL9Mt.png#align=left&display=inline&height=677&originHeight=677&originWidth=1178&status=done&width=1178)
2. 在窗口左侧导航栏中，选择"Beautifier",然后在"General"选项卡下勾选"Enable auto format on file save"使得文件在保存时自动格式化，并选择"Tool"为ClangFormat。
3. 选择"Clang Format"选项卡，设置"Clang Format command"为ClangFormat安装路径，选择"Use predefined style"为你需要的代码风格，如下图，之后保存并退出。<br />
![](http://i.imgur.com/virAgOZ.png#align=left&display=inline&height=677&originHeight=677&originWidth=1178&status=done&width=1178)


<a name="386a789b"></a>
### 设置格式化快捷键

已经习惯了使用Ctrl + i 作为格式化快捷键，因此需要重新设置一下。<br />
选择Tools > Options > Environment > Keyboard，首先去掉默认的 AutoIndentSelection 的快捷键Ctrl + i，再为 ClangFormat 的 FormatSelectedText 添加快捷键Ctrl + i，保存并关闭又可以愉快地使用Ctrl + i了，如下图所示。<br />
![](http://i.imgur.com/WmkAHC7.png#align=left&display=inline&height=677&originHeight=677&originWidth=1178&status=done&width=1178)

