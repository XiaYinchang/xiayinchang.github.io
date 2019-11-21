
---

title: 从 RESTful 到 gRPC-Web 的平滑切换

urlname: zqi1p4

date: 2019-09-17 00:00:00 +0800

layout: post

comments: true

categories: Go

tags: [RESTful,gRPC-Web]

keywords: gRPC-Web

description: 在分布式系统架构中，后端服务较多使用 gRPC 进行通信，当需要暴露服务给前端时往往需要增加一层 Http Server 将 gRPC-Web 转换为 RESTful 接口，这会增加额外的工作量，而 gRPC-Web 项目可以帮助我们避免这些工作，实现在前端直接调用 gRPC 服务。对于已经存在大量 RESTful 调用的系统中，立即全部迁移至 gRPC-Web 是不现实的，因此我们需要一种平滑迁移的方案能够实现：对于同一个资源的请求旧的前端调用仍然使用 RESTful，同时新的前端调用可以使用 gRPC-Web，而对于新增资源则直接使用 gRPC-Web 调用，同时也兼容  RESTful，为了实现这种兼容性不能增加额外的服务端，即 gRPC-Web 和 RESTful 的服务监听在同一地址的同一端口。

---

<a name="z0hPi"></a>
#### gRPC-Web

- 安装

参考[官方安装说明](https://grpc-ecosystem.github.io/grpc-gateway/docs/usage.html)，需要指出的是有可能如果出现以下报错：

```
protoc: error while loading shared libraries: libprotobuf.so.20: cannot open shared object file: No such file or directory
```

此时，需要执行以下命令更新环境变量中关于 LIB 的信息：

```
sudo ldconfig
或者
export LD_LIBRARY_PATH=/usr/local/lib
```


