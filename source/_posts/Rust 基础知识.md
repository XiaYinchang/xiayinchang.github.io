---
title: Rust 基础知识
urlname: gt4uko
date: '2020-09-11 00:00:00 +0800'
layout: post
comments: true
categories: Rust
tags:
  - Rust
keywords: Rust
description: Rust 基础知识。
abbrlink: bedbca3d
updated: 2020-09-11 00:00:00
---

#### rustup

rustup 是一个 rust 开发环境管理工具，可用于在不同的 rust 版本切换，指定目标平台等。

```
# 安装
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup show
rustup man cargo
```

打包为无需依赖 libc 的 fully static binaries：

```
rustup target add x86_64-unknown-linux-musl
cargo build --target x86_64-unknown-linux-musl --release
```

#### 打印结构体

```
#[derive(Debug)]
struct User {
  username: String,
  email: String,
  sign_in_count: u64,
  active: bool,
}

fn main() {
  let user1 = User {
    email: String::from("someone@example.com"),
    username: String::from("someusername123"),
    active: true,
    sign_in_count: 1,
  };

  let user2 = User {
    email: user1.email.clone(),
    username: String::from("anotherusername567"),
    active: user1.active,
    sign_in_count: user1.sign_in_count,
  };
  println!("{:?}", user1);
  println!("{:?}", user2);
}
```
