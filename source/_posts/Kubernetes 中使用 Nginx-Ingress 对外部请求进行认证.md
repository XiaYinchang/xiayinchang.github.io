---
title: Kubernetes 中使用 Nginx-Ingress 对外部请求进行认证
urlname: hvu32r
date: '2019-12-03 00:00:00 +0800'
updated: 2019-12-7
layout: post
comments: true
categories: 译文
tags:
  - Go
  - 译文
keywords: 'Go, Auth, 认证'
description: 在 Kubernetes 中使用 Nginx-Ingress 作为 API 网关时可以使用独立的认证服务将认证逻辑从业务代码中解耦出来。
abbrlink: f901e5ff
---


<a name="2PGKt"></a>
### 原文
[Authenticate requests to apps on kubernetes using Nginx-Ingress and an AuthService](https://medium.com/@ankit.wal/authenticate-requests-to-apps-on-kubernetes-using-nginx-ingress-and-an-authservice-37bf189670ee)<br />

在诸如 Kubernetes 的集群上部署微服务的一种常见模式是将认证过程委托给外部认证服务或者是将认证过程抽取为单独的微服务部署在当前集群，其基本结构如下图所示：

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575344848404-ec7c7588-8044-46e0-a3f8-46d682a8329c.png#align=left&display=inline&height=1058&name=image.png&originHeight=1058&originWidth=1246&size=76582&status=done&style=none&width=1246)

通过将对所有 API 调用的认证过程委托给独立的认证服务可以避免在每个业务微服务中都要实现认证插件，从而使得开发团队可以专注于业务逻辑的开发，避免重复的工作。本文介绍了使用 ingress-nginx 注解配置外部认证服务实现用户身份验证与授权。

<a name="kEL2C"></a>
### Authentication Annotations
<a name="0hiT0"></a>
#### auth-url
Nginx-inkress 是一个相当成熟的为部署在 kubernetes 上的工作流提供外部入口的解决方案，它带有很多开箱即用的特性。这些特性大多数都可以通过简单地向服务的 ingress yaml 文件中添加注解来使用。这里需要使用其中专门用于对接外部认证的注解 'auth-url' 。
```javascript
nginx.ingress.kubernetes.io/auth-url: "url to auth service"
```
这个注解告诉 ingress-nginx 控制器先将传入的请求转发给认证服务，然后如果认证服务返回状态码为 200 OK 的响应，则将请求继续转发到下游服务。例如:
```javascript
apiVersion: extensions/v1beta1 
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/auth-url: http://auth-service.prod.svc.cluster.local/authenticate
  namespace: prod 
  name: ingress-with-auth
spec: 
  rules:
   - host: api.microservice-1.myapp.com
      http:
        paths:
        - path: /secure/
          backend:
            serviceName: microservice-1
            servicePort: 8080
```
上面的 ingress 配置指示 ingress-nginx 将所有路径为 `api.microservice-1.myapp.com/secure/` 的外部请求首先转发到部署在集群内的认证服务的 `/authenticate` 端点，其基本过程如下：

1. 客户端向 `api.microservice-1.myapp.com/secure/*` 发起 API 请求；
1. 请求到达 ingress-nginx 控制器，控制器将其转给认证服务的 `/authenticate` 端点；
1. 如果认证服务返回 `200 Ok` 则继续讲该请求转给 `microservice-1` 服务。

<a name="Zd1lp"></a>
#### auth-response-headers
我们可以使用  auth-response-headers 注解让认证服务传递一些信息到下游的业务应用。例如，认证服务在进行认证的过程中可以解析出用户名或用户 ID ，并将用户信息传递给  `microservice-1` 服务：
```javascript
apiVersion: extensions/v1beta1 
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/auth-url: http://auth-service.prod.svc.cluster.local/authenticate
    nginx.ingress.kubernetes.io/auth-response-headers: UserID
  namespace: prod 
  name: ingress-with-auth
spec: 
  rules:
   - host: api.microservice-1.myapp.com
      http:
        paths:
        - path: /secure/
          backend:
            serviceName: microservice-1
            servicePort: 8080
```

1. 客户端向 api.microservice-1.myapp.com/secure/* 发起 API 请求；
1. 请求到达 ingress-nginx 控制器，控制器将其转给认证服务的 /authenticate 端点；
1. 认证服务在认证过程中解析出 `UserID`，在返回的 `200 Ok` 响应中带上 `UserID` 头信息；
1. ingress-nginx 控制器从认证服务的响应中获取 UserID 信息并添加到初始的客户端请求头中，并将客户请求传递给 `microservice-1` 服务。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575347734772-e086bf98-4064-49c8-9f46-6f951898dc86.png#align=left&display=inline&height=1064&name=image.png&originHeight=1064&originWidth=1248&size=81349&status=done&style=none&width=1248)

<a name="xK7hi"></a>
### 译者补充
<a name="mCRS2"></a>
#### keycloak-auth
在看到这篇文章之前，我们已经进行了类似的实践，我们的认证中心基于 [keycloak](https://github.com/keycloak/keycloak) 实现，keycloak 部署于 Kubernetes 集群内，为了能够无侵入地为已有的业务微服务（实现所用的语言有 Go 和 Python）添加基于 keycloak 的认证过程，我们希望能够使用类似 [keycloak-gatekeeper](https://github.com/keycloak/keycloak-gatekeeper) 的机制在请求到达业务微服务之前实现认证和授权。keycloak-gatekeeper 实现了认证／授权／反向代理的功能，它可以根据配置的规则，针对每个 HTTP 请求（Method 和 URL）进行基于角色的授权，通过认证和授权的请求会代理向业务微服务发起请求。由于我们已经使用 ingress-nginx 作为服务入口即反向代理服务器，所以 keycloak-gatekeeper 反向代理的功能是我们不需要的，因此我对 keycloak-gatekeeper 做了一些裁剪形成了 [nginx-ingress-keycloak-auth](https://github.com/XiaYinchang/nginx-ingress-keycloak-auth)，主要完成了以下改造：

1. 移除反向代理相关代码。
1. 与 ingress-nginx auth-url 接口对接起来，针对通过授权的请求直接返回 200（不再执行反向代理）。
1. 在入口中间件中（EntrypointMiddleware）中将 `req *http.Request` 对象的 URL 和 Method 信息更改为从 ingress-nginx 传递的 "X-Original-Url" 和 "X-Original-Method" 请求头解析出的内容以便复用原有的认证和授权逻辑。
1. 对代码结构进行了调整使其更符合 Go 项目的通用项目结构模式。

<a name="pWbqx"></a>
#### LDAP 对接 ingress-nginx
[https://github.com/kubernetes/ingress-nginx/issues/1676#issuecomment-427033748](https://github.com/kubernetes/ingress-nginx/issues/1676#issuecomment-427033748)

<a name="elPJY"></a>
#### ingress-nginx 生成配置的模板
[https://github.com/kubernetes/ingress-nginx/blob/b286c2a3364888de32cb60c4771e57a1ed8e5735/rootfs/etc/nginx/template/nginx.tmpl](https://github.com/kubernetes/ingress-nginx/blob/b286c2a3364888de32cb60c4771e57a1ed8e5735/rootfs/etc/nginx/template/nginx.tmpl)

<a name="dh0i1"></a>
#### Go 实现的一个 JWT Validator 
[https://github.com/carlpett/nginx-subrequest-auth-jwt](https://github.com/carlpett/nginx-subrequest-auth-jwt)

