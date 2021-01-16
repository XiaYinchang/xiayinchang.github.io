---
title: Keycloak 使用过程记录
urlname: pfgibp
date: '2019-12-02 00:00:00 +0000'
layout: post
comments: true
categories: 认证
tags:
  - 认证
keywords: 'Keycloak, 认证'
description: 使用 Keycloak 实现统一认证中心过程需要记录的知识点。
abbrlink: e4c4afae
updated: 2019-12-12 00:00:00
---

#### keycloak js sdk

Angular 版本的 SDK ：[https://www.npmjs.com/package/keycloak-angular](https://www.npmjs.com/package/keycloak-angular)。为了实现 Token 刷新可以采用以下方式：

```javascript
keycloak.onTokenExpired = () => {
    console.log('token expired', keycloak.token);
    keycloak.updateToken(30).success(() => {
        console.log('successfully get a new token', keycloak.token);
        ...
    }).error(() => {...});
}
```

#### Keycloak 使用 LDAP

[https://codehumsafar.wordpress.com/tag/ldap-with-keycloak/](https://codehumsafar.wordpress.com/tag/ldap-with-keycloak/)

#### 导出 Realm 和 User

参考：[https://stackoverflow.com/questions/46281416/best-practices-of-export-import-keycloak-data-in-kubernetes](https://stackoverflow.com/questions/46281416/best-practices-of-export-import-keycloak-data-in-kubernetes)

```
./standalone.sh -Dkeycloak.migration.realmName=umstor -Dkeycloak.migration.action=export -Dkeycloak.migration.usersExportStrategy=REALM_FILE -Dkeycloak.migration.provider=singleFile -Dkeycloak.migration.file=/opt/jboss/keycloak/bin/umstor-realm.json -Djboss.http.port=8888 -Djboss.https.port=9999 -Djboss.management.http.port=7777
```

#### Admin cli

在 keycloak 容器镜像中 admin cli 位于` /opt/jboss/keycloak/bin/` 目录下：

```
// 配置授权信息
./kcadm.sh config credentials --server http://localhost:8080/keycloak --realm master --user root --password r00tme
// 根据之前导出的 json 创建 realm
./kcadm.sh create realms -f realm-export.json
```

#### 使用 PostgreSQL 创建数据库

```
psql -h 172.30.229.60 -U keycloak -p 5432 -d postgres
// 登录后创建新的数据库
CREATE DATABASE keycloak WITH OWNER = keycloak;
```
