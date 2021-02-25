---
title: MeshCentral - 管理远程设备的利器
urlname: mgvvhs
date: '2020-06-20 00:00:00 +0000'
layout: post
categories: 开发工具
tags:
  - MeshCentral
  - 开发工具
keywords: 'MeshCentral, 远程控制'
description: "MeshCentral 是一款开源的可私有化部署的 Web 端远程设备管理工具，功能强大，可以登录远程桌面或者直接打开终端，也可以传输文件，既可以通过中心服务器连接远程设备，也支持\_WebRTC，通过 NAT 穿透实现 Peer To Peer 的连接，对于使用羊毛版公有云服务器的群体无疑是极其友好的，唯一不足的地方就是界面观感不佳，一眼看去让人百感交集。"
abbrlink: f5428d95
updated: 2020-06-20 00:00:00
---

#### 基本信息

仓库地址：[https://github.com/Ylianst/MeshCentral](https://github.com/Ylianst/MeshCentral)
官方首页：[https://www.meshcommander.com/meshcentral2](https://www.meshcommander.com/meshcentral2)
开发语言：MeshCentral 中心服务器采用 NodeJS 开发（UI 是 JavaScript），另外需要在每个远程设备上安装  MeshAgent 用于控制设备，该组件使用 C 语言开发。
工作原理：MeshCentral 作为中心服务器应当部署在具有公网 IP 的节点上，这样方便随时随地管理远程设备；如果你只需要在本地局域网内管理其它设备，也可以部署在本地节点；如果你的家用宽带有自己固定的公网 IP ，部署在家里的电脑上也是可以的；总之，你需要部署一个具有广泛可达的通信地址的中心服务器，这里推荐使用公有云厂商的羊毛版服务器。MeshAgent 安装在你的远程节点上，远程节点的操作系统可以是 macOS 、Windows 或者 Linux。MeshAgent 向中心服务器注册自己的基本信息并通过 WebSocket 协议与中心服务器保持通信，如果开启了 WebRTC 模式，还会使用  STUN 协议获取节点的公网通信地址并上报给中心服务器。当你在笔记本电脑上通过浏览器打开控制界面尝试去连接远程节点时，若未开启 WebRTC，所有的通信流量都要经过中心服务器中转，这样不仅会增加中心服务器的负担，通信速率也将受到中心服务器带宽能力的限制，而在 WebRTC 模式下，你的笔记本可以和远程节点直连，这无疑是一种更高效地工作模式，在运气好的情况下（两端上行带宽都比较高）可以获得极佳的远程桌面清晰度和流畅度。
官方文档：该项目的另一大优点是文档较为详细，安装指南：[MeshCentral2InstallGuide-0.0.9.pdf](http://info.meshcentral.com/downloads/MeshCentral2/MeshCentral2InstallGuide-0.0.9.pdf)；用户手册：[MeshCentral2UserGuide-0.2.9.pdf](http://info.meshcentral.com/downloads/MeshCentral2/MeshCentral2UserGuide-0.2.9.pdf)。

#### 安装部署

MeshCentral 的功能较为丰富，这里我仅结合自己的使用需求实施较为简单的部署。MeshCentral 部署在我之前购买的阿里云虚拟机上，其基本信息如下，目前已稳定运行了两年，我的博客也部署在同一台虚拟机上：
![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1592718150625-fce9a72d-93b0-4421-a548-2bae46f3ccbc.png#align=left&display=inline&height=268&margin=%5Bobject%20Object%5D&name=image.png&originHeight=536&originWidth=2676&size=133276&status=done&style=none&width=1338)
使用 nvm 安装 NodeJS ：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
cat>>~/.bashrc<<EOF
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
EOF
source ~/.bashrc
nvm install 12
nvm alias default 12
```

使用 node 安装 meshcentral :

```bash
npm install -g nrm
nrm use taobao
mkdir /root/meshcentral
cd /root/meshcentral
npm install meshcentral
```

创建 systemd 服务描述文件：

```bash
cat>/etc/systemd/system/meshcentral.service<<EOF
[Unit]
Description=MeshCentral Server

[Service]
Type=simple
LimitNOFILE=1000000
ExecStart=`which node` /root/meshcentral/node_modules/meshcentral
WorkingDirectory=/root/meshcentral
Environment=NODE_ENV=production
User=root
Group=root
Restart=always
# Restart service after 10 seconds if node service crashes
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

启动服务：

```bash
# 启动服务
systemctl enable --now meshcentral
# 检查服务状态，若无异常则服务已经启动
systemctl status meshcentral
```

meshcentral 默认监听在 8080 和 8443 端口，8080 端口可使用 http 访问，8443 端口需使用 https 访问，默认情况下，http 访问 8080 端口会重定向至 8443 https 访问。由于我们使用的私有证书，浏览器会提示非安全链接，忽略即可。初次登录时由于无用户，所以会提示创建用户，并授予该用户管理员权限。
登录后需要先创建设备组，填好设备组名称，设备组类型使用默认的 "Manage using a software agent" 即可， 如下：
![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1592724691670-56251d09-9d0d-4e45-841a-1d84cdbd5ddf.png#align=left&display=inline&height=413&margin=%5Bobject%20Object%5D&name=image.png&originHeight=826&originWidth=2364&size=278961&status=done&style=none&width=1182)
然后向设备组中添加设备，根据操作系统选择部署 MeshAgent 的方式，若远程节点操作系统为 Linux ，则会生成一个脚本，到远程节点上去执行该脚本即可，Windows 和 macOS 则是下载一个安装包到节点上部署。
![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1592725026046-9d018b1f-9b75-423f-8915-7421a188e5f9.png#align=left&display=inline&height=399&margin=%5Bobject%20Object%5D&name=image.png&originHeight=798&originWidth=2270&size=190398&status=done&style=none&width=1135)

#### 开启 WebRTC

#### 操作使用体验

远程桌面
![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1592725895076-877202e7-75d8-4421-9563-43a098870059.png#align=left&display=inline&height=796&margin=%5Bobject%20Object%5D&name=image.png&originHeight=1592&originWidth=2612&size=3526151&status=done&style=none&width=1306)
终端
![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1592725982695-c2d7c4e7-39b3-492a-b4cd-30609eecbbff.png#align=left&display=inline&height=409&margin=%5Bobject%20Object%5D&name=image.png&originHeight=818&originWidth=1810&size=235964&status=done&style=none&width=905)
文件传输
![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1592726016995-65c4a6eb-da88-4d68-be49-564918406ee1.png#align=left&display=inline&height=545&margin=%5Bobject%20Object%5D&name=image.png&originHeight=1090&originWidth=1566&size=131995&status=done&style=none&width=783)

#### WebRTC 阅读材料

参考：[https://zhuanlan.zhihu.com/p/86759357](https://zhuanlan.zhihu.com/p/86759357)
