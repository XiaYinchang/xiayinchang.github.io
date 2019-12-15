---
title: 在 Go 中不要拷贝锁
urlname: nfeqc2
date: '2019-12-07 00:00:00 +0800'
updated: 2019-12-7
layout: post
comments: true
categories: 译文
tags:
  - Go
  - 译文
keywords: 'Go, mutex, concurrent'
description: 在并发编程时，往往需要使用到锁保护共享的资源，Go 语言中锁是值类型，所以拷贝会失去作用。
abbrlink: 6b348626
---


<a name="2PGKt"></a>
### 原文
[Beware of copying mutexes in Go](https://eli.thegreenplace.net/2018/beware-of-copying-mutexes-in-go/)

假设我们定义了一个包含一个映射表（ map）的结构体，我们想要使用结构体的方法去修改映射表的内容，如下是一个例子：
```go
package main

import "fmt"

type Container struct {
  counters map[string]int
}

func (c Container) inc(name string) {
  c.counters[name]++
}

func main() {
  c := Container{counters: map[string]int{"a": 0, "b": 0}}

  doIncrement := func(name string, n int) {
    for i := 0; i < n; i++ {
      c.inc(name)
    }
  }

  doIncrement("a", 100000)

  fmt.Println(c.counters)
}
```
代码中 `Container` 包含了一个由计数器组成的映射表，使用计数器名称作为索引。`Container` 的 inc 方法会去增加指定计数器的值（假设指定计数器已经存在）。main 函数中使用 for 循环调用 inc 方法多次。<br />运行这段代码，输出如下：
```
map[a:100000 b:0]
```
现在我们想在两个 goroutine 中并发调用 inc 方法。由于我们担心竞争情况，我们使用一个互斥锁来保护关键区域:
```go
package main

import (
  "fmt"
  "sync"
  "time"
)

type Container struct {
  sync.Mutex                       // <-- Added a mutex
  counters map[string]int
}

func (c Container) inc(name string) {
  c.Lock()                         // <-- Added locking of the mutex
  defer c.Unlock()
  c.counters[name]++
}

func main() {
  c := Container{counters: map[string]int{"a": 0, "b": 0}}

  doIncrement := func(name string, n int) {
    for i := 0; i < n; i++ {
      c.inc(name)
    }
  }

  go doIncrement("a", 100000)
  go doIncrement("a", 100000)

  // Wait a bit for the goroutines to finish
  time.Sleep(300 * time.Millisecond)
  fmt.Println(c.counters)
}
```
你预期的输出结果会是什么呢？我得到了如下输出：
```go
fatal error: concurrent map writes

goroutine 5 [running]:
runtime.throw(0x4b765b, 0x15)

<...> more goroutine stacks
exit status 2
```
我们已经很小心地使用锁保护共享变量，那到底是哪里出错了？你能看出来如何去修复这个错误吗？提示：只需要一个字符的变动即可。<br />这段代码的问题在于 inc 方法定义在了 Container 上，而不是 *Container，因此每次调用 inc 方法 Container 实例都会被复制一次。换种说法，inc 是一个值接收器而不是指针接收器。因此 inc 的每次调用并不能真正修改最初的 Container 实例。<br />但是，等一下，既然如此，那为什么我们的第一个例子能够正常工作呢？在只有一个 goroutine 的例子中，我们也是按值传递了 c 到 inc 函数，但是它确实起作用了。main 函数确实观察到了 inc 函数对映射表的修改。这是因为映射表比较特殊：它是引用类型，而不是值类型。存在 Container 中的并不是真正的映射表的数据，而是一个指向映射表数据的指针。因此，就算我们创建了一个 Container 的副本，它的 counters 成员仍然保存了相同映射表数据的地址。<br />所以说第一个例子的代码也是错误的。尽管这段代码可以工作，但它显然违反了 Go 社区的[编程指南](https://golang.org/doc/faq#methods_on_values_or_pointers)：修改对象内容的方法应该定义在类型指针上，而不是类型值上。这里使用映射表给我造成了一个安全上的错觉。作为练习，尝试使用单个 int 类型的计数器替代最初例子中的映射表，然后注意 inc 方法只是修改了计数器的副本，所以在 main 函数中看不到这种修改的效果。<br />Mutex 是值类型（参见 [Go 源码](https://golang.org/src/sync/mutex.go)中的定义，注释中很清楚地写明了不要拷贝互斥锁），因此拷贝是错误的行为。拷贝只是创建了一个完全不同的新的互斥锁，因此它的互斥功能不再有效。<br />因此，针对上述代码的一个字符的修正就是在定义 inc 方法时在 Container 前添加一个 * 号：
```go
func (c *Container) inc(name string) {
  c.Lock()
  defer c.Unlock()
  c.counters[name]++
}
```
这样， 就会将 c 的指针传入 inc 方法，实际上是对调用方持有的内存中同一个 Container 实例的引用。<br />这不是一个少见的错误。实际上， go vet 会对此发出警告：
```go
$ go tool vet method-mutex-value-receiver.go
method-mutex-value-receiver.go:19: inc passes lock by value: main.Container
```
这种情况经常出现在 HTTP 处理函数中，这些处理函数在不需要开发人员显示使用 go 语句的情况下被并发地调用。我会在随后的博文中详述这一点。<br />我觉得这个问题对于认识 Go 语言中的值接收器和指针接收器的区别有很大的帮助。为了把问题说清楚，下面给出一个和之前代码无关的示例。这个例子用到了 Go 中使用 & 操作符创建指针和使用 %p 格式化输出指针值的功能：
```go
package main

import "fmt"

type Container struct {
  i int
  s string
}

func (c Container) byValMethod() {
  fmt.Printf("byValMethod got &c=%p, &(c.s)=%p\n", &c, &(c.s))
}

func (c *Container) byPtrMethod() {
  fmt.Printf("byPtrMethod got &c=%p, &(c.s)=%p\n", c, &(c.s))
}

func main() {
  var c Container
  fmt.Printf("in main &c=%p, &(c.s)=%p\n", &c, &(c.s))

  c.byValMethod()
  c.byPtrMethod()
}
```
输出结果如下（这是在我的电脑上的输出，和你电脑上的变量地址可能不一样，但是地址之间的关系是一样的）：
```go
in main &c=0xc00000a060, &(c.s)=0xc00000a068
byValMethod got &c=0xc00000a080, &(c.s)=0xc00000a088
byPtrMethod got &c=0xc00000a060, &(c.s)=0xc00000a068
```
main 函数创建了一个 Container 实例并打印出了实例的地址及实例成员变量 s 的地址，接着调用了实例的两个方法。<br />byValMethod 方法有一个值接收器，它打印出的地址和 main 函数中打印出的不一样因为接收到的是 c 的一个副本。另一方面，byPtrMethod 方法有一个指针接收器并且它观察到的地址和 main 函数中的一致，因为它获取到的是最初的 c，而不是一个副本。

<a name="xK7hi"></a>
### 译者补充
<a name="mCRS2"></a>
#### 读写锁
Go 语言中还有一种锁：读写锁（RWMutex），读写锁也是值类型，也不能拷贝。

