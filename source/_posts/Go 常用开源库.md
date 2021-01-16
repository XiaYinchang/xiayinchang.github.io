---
title: Go 常用开源库
urlname: iekhgs
date: '2020-10-12 00:00:00 +0000'
layout: post
comments: true
categories: Go
tags:
  - Go
keywords: 'Go, 开源库'
description: Go 编程常用的开源库。
abbrlink: 2ebf5f2a
updated: 2021-01-05 00:00:00
---

#### 按列格式化输出 columnize

[github.com/ryanuber/columnize](http://github.com/ryanuber/columnize)

#### 命令行工具框架 cobra

[github.com/spf13/cobra](https://github.com/spf13/cobra)

```bash
# 在子命令的 Run 函数执行前执行初始化任务
cobra.OnInitialize(initConfig)
```

#### 发送邮件

[github.com/scorredoira/email](https://github.com/scorredoira/email)

```bash
# 发送 HTML 格式的邮件
m := email.NewHTMLMessage(subject, content)
# 添加附件
m.AttachBuffer(attach.Filename, attach.Data, false)
```

#### 从字符串解析 bytesize

[github.com/docker/go-units](https://github.com/docker/go-units)

```bash
	# 从字符串解析出以字节为单位的大小
  b, _ := units.RAMInBytes("1m")
	fmt.Printf("%d\n", uint64(b))
  # 从字符串解析出时间间隔
	duration, _ := time.ParseDuration("1m")
```
