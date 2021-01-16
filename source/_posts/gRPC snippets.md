---
title: gRPC snippets
urlname: xs66n7
date: '2019-11-14 00:00:00 +0000'
layout: post
comments: true
categories: gRPC
tags:
  - gRPC
  - Go
keywords: gRPC
description: gRPC 用法相关的知识和技巧以及代码片段汇总。
abbrlink: ab759786
updated: 2020-01-09 00:00:00
---

#### 使用 gRPC 错误类型

服务端返回  `codes.PermissionDenined`  错误：

```go
import (
	...
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)
...
return nil, status.Error(codes.PermissionDenied, "PERMISSION_DENIED_TEXT")
```

客户端使用  `status`  库的  `FromError`  函数解析错误，使用`swicth` 语句判断错误类型并进行对应操作:

```
// client
    assignvar, err := s.MyFunctionCall(ctx, ...)
    if err != nil {
        if e, ok := status.FromError(err); ok {
            switch e.Code() {
            case codes.PermissionDenied:
                fmt.Println(e.Message()) // this will print PERMISSION_DENIED_TEST
            case codes.Internal:
                fmt.Println("Has Internal Error")
            case codes.Aborted:
                fmt.Println("gRPC Aborted the call")
            default:
                fmt.Println(e.Code(), e.Message())
            }
        }
        else {
            fmt.Printf("not able to parse error returned %v", err)
        }
    }
```

#### 使用 metadata 进行用户认证

参考：[https://github.com/grpc/grpc-go/issues/106](https://github.com/grpc/grpc-go/issues/106)，通过添加拦截器的方式

```go
// client
grpc.Dial(target,
    grpc.WithInsecure(),
    grpc.WithPerRPCCredentials(&loginCreds{
    Username: "admin",
    Password: "admin123",
}))

type loginCreds struct {
    Username, Password string
}

func (c *loginCreds) GetRequestMetadata(context.Context, ...string) (map[string]string, error) {
    return map[string]string{
        "username": c.Username,
        "password": c.Password,
    }, nil
}

func (c *loginCreds) RequireTransportSecurity() bool {
    return true
}

// server
grpc.NewServer(
    grpc.StreamInterceptor(streamInterceptor),
    grpc.UnaryInterceptor(unaryInterceptor)
)

func streamInterceptor(srv interface{}, stream grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
    if err := authorize(stream.Context()); err != nil {
        return err
    }

    return handler(srv, stream)
}

func unaryInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    if err := authorize(ctx); err != nil {
        return err
    }

    return handler(ctx, req)
}

func authorize(ctx context.Context) error {
    if md, ok := metadata.FromContext(ctx); ok {
        if len(md["username"]) > 0 && md["username"][0] == "admin" &&
            len(md["password"]) > 0 && md["password"][0] == "admin123" {
            return nil
        }

        return AccessDeniedErr
    }

    return EmptyMetadataErr
}
```

- 官方文档关于认证的内容：[https://grpc.io/docs/guides/auth/](https://grpc.io/docs/guides/auth/)，支持基于 TLS 证书的认证过程，使用参考：[https://mycodesmells.com/post/authentication-in-grpc](https://mycodesmells.com/post/authentication-in-grpc)，这篇文章也说明 contextWithValue 的值无法通过 gRPC 通信传递，需要通过 metadata 传输用户信息。
- 使用 metadata：可以使用 metadata 传输一些用户认证或者业务无关的信息，类似于 Http 请求中的 Header。使用方法参考： [http://ralphbupt.github.io/2017/05/27/gRPC 之 metadata/](http://ralphbupt.github.io/2017/05/27/gRPC%E4%B9%8Bmetadata/) 以及原文 [https://github.com/grpc/grpc-go/blob/master/Documentation/grpc-metadata.md#sending-metadata-1](https://github.com/grpc/grpc-go/blob/master/Documentation/grpc-metadata.md#sending-metadata-1)。

#### grpc-gateway 实现 gRPC server 提供  RESTful

实现在同一服务端的同一端口同时提供 gRPC 和 RESTful 服务，用于向后兼容及技术栈的平滑迁移。其基本原理是创建一个 HTTP  反向代理服务，将客户端的 HTTP 请求转换为 gRPC 客户端请求并向 gRPC 服务端发起调用。辅助命令工具的部署安装参考：[https://grpc-ecosystem.github.io/grpc-gateway/docs/usage.html](https://grpc-ecosystem.github.io/grpc-gateway/docs/usage.html)。
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1573718382911-c19287bb-bfb6-4d82-8970-00489693b8ad.png#align=left&display=inline&height=369&name=image.png&originHeight=369&originWidth=749&size=52841&status=done&style=none&width=749)
会使用到以下命令：

```go
// 基于 proto 生成 go 代码，使用到 protoc-gen-go 可执行文件
// -I 参数用于指定 proto 文件中导入的外部 proto 文件的搜索路径
protoc -I/usr/local/include -I. -I$GOPATH/src -I$GOPATH/src/github.com/grpc-ecosystem/grpc-gateway/third_party/googleapis --go_out=plugins=grpc:. service.proto
// 生成 grpc-web 的 js 代码，非必须，仅当欲使用 grpc-web，使用到 protoc-gen-grpc-web 可执行文件
protoc service.proto --grpc-web_out=import_style=typescript,mode=grpcwebtext:./ --js_out=import_style=commonjs:.
// 生成 grpc-gateway 相关的 go 代码，使用到 protoc-gen-grpc-gateway 可执行文件
protoc -I/usr/local/include -I. -I$GOPATH/src -I$GOPATH/src/github.com/grpc-ecosystem/grpc-gateway/third_party/googleapis  --grpc-gateway_out=logtostderr=true:. service.proto
// 生成 swagger 格式的 API 文档，使用到 protoc-gen-swagger 可执行文件
protoc -I/usr/local/include -I. -I$GOPATH/src -I$GOPATH/src/github.com/grpc-ecosystem/grpc-gateway/third_party/googleapis --swagger_out=logtostderr=true:. service.proto
```

使用 gRPC 错误类型的另一个好处是 grpc-gateway 会自动将其转换为对应的 HTTP 状态码而不是每次出错都返回 500，参见 grpc-gateway [源码](https://github.com/grpc-ecosystem/grpc-gateway/blob/master/runtime/errors.go)。
grpc-gateway 需要使用  google.api.http，参考  [https://blog.csdn.net/xiaojia1100/article/details/79447283](https://blog.csdn.net/xiaojia1100/article/details/79447283)
可参考的实例：

- [https://medium.com/swlh/rest-over-grpc-with-grpc-gateway-for-go-9584bfcbb835](https://medium.com/swlh/rest-over-grpc-with-grpc-gateway-for-go-9584bfcbb835)
- [https://forum.golangbridge.org/t/go-rest-grpc-api/13072/5](https://forum.golangbridge.org/t/go-rest-grpc-api/13072/5)

#### 使用 Empty 类型

在 gRPC 中要求每个函数调用都有返回值，如果确实不需要返回值，则为了统一规范与重用，我们可以使用 google 提供的 Empty 类型，Empty 类型的对象在序列化和反序列化时会被视为空对象，其 JSON 形式表示为 `{}` ，使用方法：

```protobuf
import "google/protobuf/empty.proto";
service Foo {
  rpc Bar(google.protobuf.Empty) returns (google.protobuf.Empty);
}
```

#### 传输文件

[https://ops.tips/blog/sending-files-via-grpc/](https://ops.tips/blog/sending-files-via-grpc/)
