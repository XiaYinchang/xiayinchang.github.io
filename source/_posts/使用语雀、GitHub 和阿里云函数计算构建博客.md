---
title: 使用语雀、GitHub 和阿里云函数计算构建博客
urlname: rg9lhf
date: '2019-11-21 00:00:00 +0000'
layout: post
comments: true
categories: 云计算
tags:
  - 语雀
  - GitHub
keywords: '语雀, GitHub, Serverless'
description: >-
  语雀，一款非常便捷友好的知识管理工具，很适合用来撰写博客。借助 yueque-hexo 可以将语雀与静态网站生成工具 Hexo 结合起来，再利用
  GitHub 平台和阿里云函数计算服务可以实现博客更新与发布全流程的自动化。本文简单记录一下折腾过程。
abbrlink: b2362878
---

### 使用语雀撰写博客

最开始搭建自己的博客系统时，我会先写好 Markdown 文件，然后借助 Hexo 生成静态页面，之后部署到云主机上，配置好域名解析后就可以访问了。
虽然 Markdown 已经足够简明便捷，但语雀为我们提供了更友好的 Markdown 编辑器，使得撰写技术文档的体验有了质的提升，因此强烈推荐给大家使用。
语雀的使用也比较简单，首先登陆到[官网](https://yuque.com)使用手机号注册一个账号，然后创建一个知识库，在知识库就可以新建文档开始写文章了。撰写文档时，在快捷键 “/” 的帮助下可以快速插入代码、图片、视频、思维导图等，使用非常方便，更多的内容可以参考语雀官方的[使用文档](https://www.yuque.com/yuque/help)。
实际上，语雀本身也是一个文章发布平台，写好的文章只要被设置为可公开访问，别人就可以在语雀上订阅你的文章，但由于不能自定义域名等原因，目前仍然只是把它作为文档撰写工具，博客站点仍然借助其它平台实现。

### Hexo 与语雀同步

[Hexo](https://hexo.io/) 是一款开源的静态站点生成工具，虽然 [Hugo](https://gohugo.io/) 使用起来可能更加方便，但由于个人十分喜欢 Hexo 的[这款](https://github.com/theme-next/hexo-theme-next)名为 Next 的博客主题，所以一直没有更换为 Hugo。
之前都是直接写好 Markdown 文件放在 Hexo 项目指定目录，然后从 Markdown 生成静态页面，换用了语雀之后则需要借助工具将语雀上的内容导出为 Markdown。语雀支持将文章导出为 Markdown 的操作，你可以在 Web 端简单点击后获取到所有文章的 Markdown 导出，更幸运的是我们可以利用开源工具[ yuque-hexo](https://github.com/x-cold/yuque-hexo) 将导出过程程序化。只需要安装好  yuque-hexo 插件并配置好语雀相关的参数即可。
具体的参数配置可以参考各个开源项目的文档，也可以参考[我的 Hexo 项目](https://github.com/XiaYinchang/xiayinchang.github.io)配置。我将同步操作和 Hexo 的生成静态文件命令合并成了一个 npm 脚本，只需要执行 `npm run generate`  即可完成同步以及静态文件的生成，生成的静态文件在当前目录 `pulic` 路径下。

### 使用 GitHub 托管博客

使用 Hexo 生成的静态页面必须通过网络服务器 Serve 起来才能被别人访问，之前我是使用廉价版的阿里云主机通过 Nginx 启动了 Http 服务器，使用下来发现访问速度比 GitHub 托管还慢，后续也使用过 coding.net 提供的 Pages 服务，访问速度很快，但是服务不太稳定，多次出现未知原因导致博客无法访问，最后决定还是用回 GitHub。
首先在 GitHub 上新建一个名称为 username.github.io 的代码仓库，我建的是  xiayinchang.github.io，根据官方文档的说法， username 需要和你的 GitHub 账户名称保持一致。然后将 Hexo 生成的静态文件（即 public 路径下的文件）添加到该代码仓库，push 到 GitHub 上即可。现在，就可以通过 username.github.io 这个地址访问到博客站点的内容。

### 借助 GitHub Action 实现静态文件的自动生成

GitHub Action 是 GitHub 最新推出的 CICD 工具（完全可以取代第三方的 Travis CI 等工具），和 GitHub 的各项服务无缝集成，开源仓库可以免费使用，虽然有额度限制，但就博客静态文件的生成来说免费额度已经足够用了。GitHub Action 的概念还是很多的，有兴趣的话可以参阅[这篇官方文档](https://help.github.com/en/actions/automating-your-workflow-with-github-actions)。
简单说明一下使用方法，首先需要在 Hexo 项目中新建一个 .github 目录，然后在该目录下再新建  workflows 目录，在  workflows 中新建一个 yml 格式的文件用来定义工作流，如下，我建了两个 yml 文件定义了两种工作流，文件名称可以随便取，这里命名成 nodejs.yml 是因为生成静态文件需要使用 Nodejs，只要按照这种路径定义了工作流，就能被 GitHub Action 系统自动读取并解析，这是一种约定：

```go
➜  xiayinchang.github.io git:(src) tree -L 3 .github
.github
└── workflows
    ├── cron.yml
    └── nodejs.yml
```

简单介绍一下 nodejs.yml 这个文件定义的工作流，on 这行用来指定在发生什么事件（这里响应 push 和 repository_dispatch 两种事件，push 即为向该分支推送代码的事件， repository_dispatch 为自定义外部事件，稍后详说）时执行该工作流，jobs 可以定义多个 job 分别执行不同的工作，不同的 job 可以并行执行，不同 job 的执行环境（操作系统）可以不一样，这里只定义了一个名为 build 的 job，指定的运行环境是 Ubuntu，这个 job 又可以拆分成几个步骤，步骤按序执行，首先通过使用第三方定义好的 actions/checkout@master （这是 GitHub Action 的另一个强大之处，允许直接复用别人定义好的各种操作即 Action）可以实现从 GitHub 仓库（这里指定从当前仓库 xiayinchang.github.io 的 src 分支）拉取代码，然后借助  actions/setup-node@master 这个第三方 Action 实现 Nodejs 环境的配置，这里指定使用 Nodejs 13 版本，接着开始执行 Hexo 的构建，分为安装依赖包和生成静态文件两个命令，最后一步是借助  peaceiris/actions-gh-pages@v2.5.0 这个第三方 Action 将生成的静态文件 push 到指定仓库的指定分支（这里是 xiayinchang.github.io 仓库的 master 分支）。

```go
name: Node CI

on: [push, repository_dispatch]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [13.x]

    steps:
      - uses: actions/checkout@master
        with:
          ref: src
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@master
        with:
          node-version: ${{ matrix.node-version }}
      - name: npm install, build
        run: |
          npm install
          npm run generate
        env:
          CI: true
          HEXO_ALGOLIA_INDEXING_KEY: ${{ secrets.HEXO_ALGOLIA_INDEXING_KEY }}
          YUQUE_TOKEN: ${{ secrets.YUQUE_TOKEN }}
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v2.5.0
        env:
          PERSONAL_TOKEN: ${{ secrets.PERSONAL_TOKEN }}
          PUBLISH_BRANCH: master
          PUBLISH_DIR: ./public
```

回过头查看上述工作流，涉及到了  xiayinchang.github.io 仓库的两个分支，一个是 src 分支，一个是 master 分支， src 分支保存的是 Hexo 项目的代码，用来生成静态文件，master 分支保存的是生成的静态文件，也是 GitHub Pages 服务的数据源，src 分支生成的静态文件要 push 到 master 分支才能被 GitHub Pages 使用，这是因为：根据 GitHub Pages 的说明，静态文件必须要放在 master 分支。
现在，只要修改了部分文章内容后，push 到  xiayinchang.github.io 仓库的 src 分支即会触发该工作流，完成从 Markdown 格式的源文件到博客静态文件的自动生成，并自动推送到 master 分支从而触发 GitHub Pages 的自动更新，进而完成博客站点的自动更新，此时再打开  xiayinchang.github.io 这个站点就能看到更新的文章内容已经显示在网页端了。

### 语雀更新触发 GitHub Action 自动构建

#### 初步方案设计

在上一步中虽然已经实现了自动生成静态文件，但是事件本身仍然需要我们手动生成，即手动 push 后触发自动构建，在这一步我们要实现的是在语雀上更新文章后就能触发 GitHub 的自动构建。语雀提供了 webhook 机制使得更新文章时能够触发外部事件，而 GitHub Action 能够通过我们之前提到过的  repository_dispatch 机制接收外部事件，如果能够将两者对接起来，也就实现了我们的目标，但这个过程并没有那么简单。
语雀支持的 webhook 是一个简单的 http url ，无法添加请求头和请求体，如下图所示:
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1574345326347-21a088e7-b99e-48ab-b4d4-03da8cd43dd5.png#align=left&display=inline&height=281&name=image.png&originHeight=562&originWidth=1454&size=81111&status=done&width=727)
GitHub repository_dispatch 支持的外部事件必须具有以下请求头（包括认证信息）：

```go
curl -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H 'Accept: application/vnd.github.everest-preview+json' \
    -d '{"event_type":"rollback"}' \
    https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO}/dispatches
```

所以直接在语雀 webhook 中添加 GitHub 事件的触发地址是不行的，因为无法添加必须的请求头信息，因此我们需要一个中间层把两者适配起来，示意图如下：

![yuque-github.svg](https://cdn.nlark.com/yuque/0/2019/svg/182657/1574346796484-cd1f3d51-6d05-4e95-a457-68f02556072e.svg#align=left&display=inline&height=53&name=yuque-github.svg&originHeight=53&originWidth=531&size=9035&status=done&width=531)

#### 基于虚拟机的中间层实现

最初，我在购买的阿里云主机上使用 Nodejs 创建了一个简单的 HTTP 服务来实现这个中间层，其代码如下，其基本逻辑和上图一致，首先是在 8888 端口上响应来自语雀的 hook 调用，然后再拼装出一个带有认证信息的 https 请求生成 GitHub 外部事件。这段代码虽然写的比较简陋，但是完全可以满足我们的需求实现语雀更新触发 GitHub 的自动构建和部署。

```javascript
const http = require("http");
const https = require("https");
const url = require("url");
const process = require("process");
http
  .createServer(function (request, response) {
    response.writeHead(200, { "Content-type": "text/plan" });
    response.end("ok");
    pathName = url.parse(request.url).pathname;
    if (pathName === "/sync" && request.method === "POST") {
      const data = JSON.stringify({
        event_type: "run-it",
      });

      const options = {
        hostname: "api.github.com",
        port: 443,
        path: "/repos/XiaYinchang/xiayinchang.github.io/dispatches",
        method: "POST",
        headers: {
          "User-Agent": "curl/7.52.1",
          "Content-Type": "application/json",
          Accept: "application/vnd.github.everest-preview+json",
          Authorization: "token $GITHUB_TOKEN",
        },
      };

      const req = https.request(options, (res) => {
        console.log(`statusCode: ${res.statusCode}`);

        res.on("data", (d) => {
          process.stdout.write(d);
        });
      });

      req.on("error", (error) => {
        console.error(error);
      });

      req.write(data);
      req.end();
    }
  })
  .listen(8888);
```

#### 基于阿里云函数计算的中间层实现

后来发现阿里云函数计算有免费的额度可以使用，完全可以将我的虚拟机释放出来做其他事情，而且虚拟机两年后就到期了，这个函数计算至少坚挺几年问题不大，以下是阿里云官方文档关于函数计算的免费额度说明，前 100 万次调用免费，财大气粗的阿里云：

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1574348003304-00176e01-df5f-452f-8a3e-d2b42ccbb19f.png#align=left&display=inline&height=159&name=image.png&originHeight=318&originWidth=1550&size=73916&status=done&width=775)

根据我们的使用场景，需要部署一个函数能够处理语雀的 http post 请求，参考阿里云函数计算的[官方文档](https://help.aliyun.com/document_detail/74768.html?spm=a2c4g.11186623.6.604.233e68f4qM1FYl)，我创建了一个名为 sync_yuque 的函数，运行环境选择 Python 是因为使用 Nodejs 时发现阿里云的函数计算貌似只支持 Express 的一套 api，我之前写的 Nodejs 的代码都不好用了，然后发现根本不支持 Go 的环境，所以只好用 Python 的：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1574348393403-568dcfe8-4c88-4cd5-9067-3fd4f9b098fe.png#align=left&display=inline&height=382&name=image.png&originHeight=764&originWidth=1648&size=99272&status=done&width=824)
这个函数计算是可以在线编辑代码的，这个函数计算要求函数的命名有一定的规范，最后写的 Python 代码如下：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1574348796118-0f1724a9-181f-4d26-8d47-417aa64642d0.png#align=left&display=inline&height=685&name=image.png&originHeight=1370&originWidth=1678&size=258218&status=done&width=839)
还可以在线调试，点击执行手动触发了一波，看到 GitHub 那边果然被触发了，注意下图中的 Http 触发器有个点击复制的按钮，点击后复制的就是触发 Python 代码调用的 URL 地址，随后会将这个地址添加到语雀的 webhook 中：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1574348964801-b5f5e678-23bd-4af9-b3ad-2a8fdb3eb129.png#align=left&display=inline&height=365&name=image.png&originHeight=1104&originWidth=2256&size=191252&status=done&width=746)
GitHub Action 触发自动构建如下，可以看到触发的事件源确实是  repository_dispatch ：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1574349095187-c0ee05f1-2140-4664-b999-fb46b18e5b1d.png#align=left&display=inline&height=319&name=image.png&originHeight=638&originWidth=2408&size=127346&status=done&width=1204)
最后，将获取的 Http 函数调用地址添加到语雀的 webhook 中，如下：
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1574349534969-cee1fcaf-2bbc-4eff-9c8a-dc44fa6363b8.png#align=left&display=inline&height=522&name=image.png&originHeight=1044&originWidth=2132&size=157428&status=done&width=1066)
现在，在语雀上对应知识库中更新任何一篇文章或者发布新的文章都会触发 GitHub 自动构建和部署，实现博客站点与语雀文章的同步更新，整个过程已经被自动化衔接起来，而你只需要关注写作本身。
