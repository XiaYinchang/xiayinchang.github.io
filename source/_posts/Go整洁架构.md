---
title: Go整洁架构实践
urlname: aeqw3t
date: '2018-09-17 22:50:56 +0800'
layout: post
comments: true
categories: 译文
tags:
  - Go
  - 译文
keywords: 'Go,Architecture'
description: go整洁架构实践。
abbrlink: '35963400'
---


| Date | Log |
| :---: | :---: |
| 17/09/2018 | 初始版本. |

<a name="e5729e94"></a>
### 原文

[Clean Architecture in Go](https://medium.com/@hatajoe/clean-architecture-in-go-4030f11ec1b1)

本文讲述了一个使用 Go 和 gRPC 实践整洁架构的案例。

<a name="df368884"></a>
### 前言

整洁架构现在已为人熟知，但是很多人可能并不了解如何去实现。本文尝试使用 Go 和 Grpc 提供一种清晰明了的实现方法。文中案例源码已放在[基站](https://github.com/hatajoe/8am)，这个小项目演示了用户注册业务的实现，有任何问题可以随时反馈。

<a name="8a95a6d1"></a>
### 结构

8am 基于整洁架构，其目录结构如下:

```shell
% tree
.
├── Makefile
├── README.md
├── app
│   ├── domain
│   │   ├── model
│   │   ├── repository
│   │   └── service
│   ├── interface
│   │   ├── persistence
│   │   └── rpc
│   ├── registry
│   └── usecase
├── cmd
│   └── 8am
│       └── main.go
└── vendor
    ├── vendor packages
    |...
```

顶级目录包含了三个子目录，分别是：

- app ： 应用包根目录
- cmd：main 包目录
- vendor ：第三方包目录

整洁架构的概念分层如下图所示：<br />![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1575442901636-ce111580-647a-485d-adfd-bed678fc98ee.png#align=left&display=inline&height=567&name=image.png&originHeight=567&originWidth=772&size=383132&status=done&style=none&width=772)<br />整个架构共有四层，从外到内依次为蓝绿红黄层，除了作为应用目录的蓝色层，其余各层分别表示了：

- interface: 绿色层
- usercase: 红色层
- domain: 黄色层

整洁架构的核心就是在各层之间构建接口。

<a name="af7f7ab9"></a>
### 实体层-黄色层

在作者看来，实体层和领域层在分层架构中的含义是类似的。这里称之为领域层是为了避免和 DDD 中实体的概念混淆。

领域层包含三个包：

- model: 具有聚合，实体和值对象
- repository: 具有聚合的存储库接口
- service: 具有依赖于多个模型的应用程序服务

下面介绍各个包的实现细节：

<a name="model"></a>
#### model

model 描述的用户聚合如下：

> 这实际上还不是一个聚合，在这里视为聚合的前提是未来还会添加更多实体和值对象。


```go
package model

type User struct {
	id    string
	email string
}

func NewUser(id, email string) *User {
	return &User{
		id:    id,
		email: email,
	}
}

func (u *User) GetID() string {
	return u.id
}

func (u *User) GetEmail() string {
	return u.email
}
```

聚合是事务的边界，用以保持业务规则的一致性。因此，需要有一个仓储对应一个聚合。

<a name="repository"></a>
#### repository

repository 只负责提供实体集合的操作接口而不必关心持久化的具体实现。其代码实现如下：

```go
package repository

import "github.com/hatajoe/8am/app/domain/model"

type UserRepository interface {
	FindAll() ([]*model.User, error)
        FindByEmail(email string) (*model.User, error)
        Save(*model.User) error
}
```

FindAll方法获取所有存储在系统中的用户。Save方法保存用户。再次强调，该层不应该获知对象是怎样被存储或序列化的。

<a name="service"></a>
#### service

service 由各种业务逻辑组成。业务逻辑不应该包含在model中。例如，应用不允许已经存在的邮箱重复进行注册。如果把校验逻辑放在 model 中，会感到很别扭，如下：

```go
func (u *User) Duplicated(email string) bool {
        // Find user by email from persistence layer...
}
```

Duplicated function 实际上和 User 模型是无关的。<br />
为了解决这个问题，我们可以添加如下的服务层：

```go
type UserService struct {
        repo repository.UserRepository
}

func (s *UserService) Duplicated(email string) error {
        user, err := s.repo.FindByEmail(email)
        if user != nil {
            return fmt.Errorf("%s already exists", email)
        }
        if err != nil {
            return err
        }
        return nil
}
```

实体层包含业务逻辑以及与其它层的接口。业务逻辑仅应涉及 model 和 service， 而不应该依赖于其它任何层级。如果需要访问其它层，则应当使用 repository 穿透层级。通过这种依赖倒置的形式，各个包之间会有更好的隔离性，并且更方便测试和维护。

<a name="42e9e3dd"></a>
### 用例层-红色层

用例指的是应用的单一可操作单元。在该项目中， 获取用户列表和注册新用户被定义为用例。这些用例使用如下接口表示：

```go
type UserUsecase interface {
    ListUser() ([]*User, error)
    RegisterUser(email string) error
}
```

为什么使用接口表示呢？这是因为用例将会被接口层（绿色层）使用。跨越层级的操作应通过定义的接口完成。

UserUsecase 的简单实现如下：

```go
type userUsecase struct {
    repo    repository.UserRepository
    service *service.UserService
}

func NewUserUsecase(repo repository.UserRepository, service *service.UserService) *userUsecase {
    return &userUsecase {
        repo:    repo,
        service: service,
    }
}

func (u *userUsecase) ListUser() ([]*User, error) {
    users, err := u.repo.FindAll()
    if err != nil {
        return nil, err
    }
    return toUser(users), nil
}

func (u *userUsecase) RegisterUser(email string) error {
    uid, err := uuid.NewRandom()
    if err != nil {
        return err
    }
    if err := u.service.Duplicated(email); err != nil {
        return err
    }
    user := model.NewUser(uid.String(), email)
    if err := u.repo.Save(user); err != nil {
        return err
    }
    return nil
}
```

userUsercase 依赖两个包： repository.UserRepository 接口 和 *service.UserService 结构。这两个包必须在用例初始化的时候由用例使用者进行注入。这些依赖关系通常由依赖注入容器解决，文中后面将会提及。ListUser 会获取所有已注册用户，RegisterUser 会将注册邮箱未重复的用户注册到系统中。

有一点要指出，这里的 User 并不是 model.User。model.User 可能拥有很多商业信息，但是其它层级不应该了解太多。 因此，这里专门为用例中的用户定义了DAO来屏蔽更具体的信息。

```go
type User struct {
    ID    string
    Email string
}

func toUser(users []*model.User) []*User {
    res := make([]*User, len(users))
    for i, user := range users {
        res[i] = &User{
            ID:    user.GetID(),
            Email: user.GetEmail(),
        }
    }
    return res
}
```

你可能会想，为什么这个服务不使用接口而是直接实现呢？这是因为该服务不依赖于任何其它服务。<br />
相反，当仓储穿透层和具体实现依赖于其它层不应知道太多细节的设备时，就需要定义一个接口来实现。作者认为这是整洁架构中最重要的一点。

<a name="4cc3104e"></a>
### 接口层-绿色层

该层放置具体对象，如API端点的处理程序，RDB的存储库或接口的其他边界。在这个案例中，添加了内存存储访问器和 gRPC 服务两个对象。

<a name="4825ab28"></a>
#### 内存存储访问器

作者使用用户存储库作为内存存储访问器。

```go
type userRepository struct {
    mu    *sync.Mutex
    users map[string]*User
}

func NewUserRepository() *userRepository {
    return &userRepository{
        mu:    &sync.Mutex{},
        users: map[string]*User{},
    }
}

func (r *userRepository) FindAll() ([]*model.User, error) {
    r.mu.Lock()
    defer r.mu.Unlock()
    users := make([]*model.User, len(r.users))
    i := 0
    for _, user := range r.users {
        users[i] = model.NewUser(user.ID, user.Email)
        i++
    }
    return users, nil
}

func (r *userRepository) FindByEmail(email string) (*model.User, error) {
    r.mu.Lock()
    defer r.mu.Unlock()
    for _, user := range r.users {
        if user.Email == email {
            return model.NewUser(user.ID, user.Email), nil
        }
    }
    return nil, nil
}

func (r *userRepository) Save(user *model.User) error {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.users[user.GetID()] = &User{
        ID:    user.GetID(),
        Email: user.GetEmail(),
    }
    return nil
}
```

这是存储库的具体实现。如果我们需要将用户持久保存到RDB或其他，我们将需要另一个实现。但即使在这种情况下，我们也不需要更改模型层。模型层仅依赖于存储库接口，并对实现细节毫不关心。这很鹅妹子嘤。<br />
这里的 User 仅在当前包中定义，用于实现跨越层级的信息解封。

```go
type User struct {
    ID    string
    Email string
}
```

<a name="f04c0c37"></a>
#### gRPC service

作者认为gRPC服务也应当包括在接口层中。gRPC服务的目录结构如下：

```
% tree
.
├── rpc.go
└── v1.0
    ├── protocol
    │   ├── user_service.pb.go
    │   └── user_service.proto
    ├── user_service.go
    └── v1.go
```

protocol 目录包含协议缓冲区DSL文件（user_service.proto）和生成的RPC服务代码（user_service.pb.go）。<br />
user_service.go 是gRPC端点处理程序的包装器：

```go
type userService struct {
    userUsecase usecase.UserUsecase
}
func NewUserService(userUsecase usecase.UserUsecase) *userService {
    return &userService{
        userUsecase: userUsecase,
    }
}

func (s *userService) ListUser(ctx context.Context, in *protocol.ListUserRequestType) (*protocol.ListUserResponseType, error) {
    users, err := s.userUsecase.ListUser()
    if err != nil {
        return nil, err
    }
    res := &protocol.ListUserResponseType{
        Users: toUser(users),
    }
    return res, nil
}

func (s *userService) RegisterUser(ctx context.Context, in *protocol.RegisterUserRequestType) (*protocol.RegisterUserResponseType, error) {
    if err := s.userUsecase.RegisterUser(in.GetEmail()); err != nil {
        return &protocol.RegisterUserResponseType{}, err
    }
    return &protocol.RegisterUserResponseType{}, nil
}

func toUser(users []*usecase.User) []*protocol.User {
 res := make([]*protocol.User, len(users))
    for i, user := range users {
        res[i] = &protocol.User{
            Id:    user.ID,
            Email: user.Email,
        }
    }
    return res
}
```

userService 仅依赖用例接口。如果你想在其它层级（例如，终端）中使用用例，你可以在接口层中按照需求实现该服务。<br />
v1.go 使用DI容器解析对象依赖项：

```go
func Apply(server *grpc.Server, ctn *registry.Container) {
    protocol.RegisterUserServiceServer(server, NewUserService(ctn.Resolve("user-usecase").(usecase.UserUsecase)))
}
```

v1.go将从* registry.Container检索到的包应用于gRPC服务。

最后，简单看一下DI容器的实现。

<a name="registry"></a>
### registry

registry 是一个DI 容器用以解析对象依赖。这里使用了 [github.com/sarulabs/di](https://github.com/sarulabs/di) 作为DI容器。

github.com/surulabs/di  使用起来很简单：

```go
type Container struct {
    ctn di.Container
}

func NewContainer() (*Container, error) {
    builder, err := di.NewBuilder()
    if err != nil {
        return nil, err
    }
    if err := builder.Add([]di.Def{
        {
            Name:  "user-usecase",
            Build: buildUserUsecase,
        },
    }...); err != nil {
        return nil, err
    }
    return &Container{
        ctn: builder.Build(),
    }, nil
}

func (c *Container) Resolve(name string) interface{} {
    return c.ctn.Get(name)
}

func (c *Container) Clean() error {
    return c.ctn.Clean()
}

func buildUserUsecase(ctn di.Container) (interface{}, error) {
    repo := memory.NewUserRepository()
    service := service.NewUserService(repo)
    return usecase.NewUserUsecase(repo, service), nil
}
```

例如，在上面，将 user-usecase 字符串通过 buildUserUsecase 函数与具体用例实现关联起来。由此，我们可以在注册文件中任意替换用例的具体实现。

