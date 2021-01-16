---
title: Qt 常见编译问题汇总
urlname: feaklo
date: '2017-04-07 00:00:00 +0800'
layout: post
comments: true
categories: Qt
tags:
  - Qt
  - 编译
  - C++
keywords: 'Qt, 编译问题'
description: Qt编译过程中常见的问题及解决方法汇总。
---

|    Date    |                                                   Log                                                    |
| :--------: | :------------------------------------------------------------------------------------------------------: |
| 04/07/2017 | Initial version: add "constant string to char \*" and "comparison between signed and unsigned integer ". |
| 04/15/2017 |                               add "undefined reference to `inet_addr@4' "                                |

本文汇总了在 Qt  5.8 中使用 C++进行开发时遇到的编译错误和警告及其解决方法，基于 C++11 标准。

### constant string to char \*

初始代码：

```
char *p = "Hello";
```

编译输出：

> ISO C++ forbids conversion from constant string to char \*.

修改代码：

```
char const *p = "Hello";
```

参考资料：

1. [Why is conversion from string constant to 'char\*' valid in C but invalid in C++](http://stackoverflow.com/questions/20944784/why-is-conversion-from-string-constant-to-char-valid-in-c-but-invalid-in-c)

### comparison between signed and unsigned

初始代码：

```
for (int i = 0, max = vec.size(); i != max; ++i)
```

编译输出：

> warning: comparison between signed and unsigned integer expressions [-Wsign-compare]

修改代码：

```
for (std::size_t i = 0, max = vec.size(); i != max; ++i)
```

附加注释：

> 一般情况下，直接使用 size_t 即可。

参考资料：

1. [What is wrong with my For loops? i get warnings: comparison between signed and unsigned integer expressions [-Wsign-compare]](http://stackoverflow.com/questions/7984955/what-is-wrong-with-my-for-loops-i-get-warnings-comparison-between-signed-and-u)
2. [A warning - comparison between signed and unsigned integer expressions](http://stackoverflow.com/questions/3660901/a-warning-comparison-between-signed-and-unsigned-integer-expressions)

### undefined reference to `inet_addr@4'

编译输出：

> undefined reference to `inet_addr@4'

问题分析：

> 这种情况是因为没有把 ws2_32.lib 或 libws2_32.a 加入到编译依赖项中。

一般情况下，出现类似的 undefined reference to '...@...'都是因为只在源代码中引入了头文件，而没有在编译依赖中加入库文件。这种错误多出现在同时具有头文件，静态库，动态库的外部库的引用过程中。
