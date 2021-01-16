---
title: Go 语言流式 IO
urlname: trivgo
date: '2019-11-24 00:00:00 +0000'
layout: post
comments: true
categories: 译文
tags:
  - Go
  - 译文
keywords: 'Go,IO'
description: Go 语言中 IO 的基本用法。
abbrlink: d2033f7a
updated: 2019-11-24 00:00:00
---

### 原文

[Streaming IO in Go](https://medium.com/learning-the-go-programming-language/streaming-io-in-go-d93507931185)

在 Go 语言中，实现输入输出操作有专门的原语，这些原语将数据构建为可读写的字节流。Go 语言标准库中 io 包提供了 `io.Reader` 和 `io.Write`r 接口，分别用于数据输入和输出操作，如下图所示：

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1574581234981-aab516f1-5c45-4c94-a275-5291faa2e23b.png#align=left&display=inline&height=186&name=image.png&originHeight=372&originWidth=2772&size=89243&status=done&width=1386)

Go 提供了许多 api，支持来自于内存、文件、网络连接等资源的流式 IO。本文主要讲解如何使用 `io.Reader` 和 `io. Writer` 接口创建能够处理流式数据的 Go 程序，分别提供了基于标准库和自定义类型的实现。

### io.Reader 接口

reader 由 io.Reader 接口定义，可以从数据源读取数据到传输缓冲区，缓冲区中的数据可以继续被流式处理或者直接消费，如下图所示：

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1574582203043-67900870-30e2-4c99-bd30-da4717c937b5.png#align=left&display=inline&height=206&name=image.png&originHeight=412&originWidth=1858&size=60329&status=done&width=929)
如果要把一个 Go 语言类型作为 reader 来使用，这个类型必须实现 `io.Reader` 所定义的 `Read(p []byte)` 方法，如下所示：

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}
```

`Read()`  方法需要返回读取的字节数，如果发生错误则同时返回 error ，如果数据源的所有内容已被读取完毕，则 `Read()` 方法应当返回 `io.EOF` 错误。

### 读取规则（新增）

根据 Reddit 上的反馈，我决定新增这部分内容帮助理解读取操作。一个 reader 的行为取决于它的具体实现，但是 `io.Reader` 的文档中定义了一些基本的规则，在使用 reader 的时候你应当首先阅读这些说明文档：

1. `Read()`  方法会尽可能但最多读取 len(p) 个字节到 p 中。
1. 调用 `Read()` 方法读取的字节数 n 可能小于 len(p)。
1. 在发生读取错误的时候，`Read()`  仍然有可能已经成功读取了 n 个字节的数据到缓冲区 p 中。例如，正在从一个 TCP 套接字中读取数据时套接字突然关闭。根据使用场景的不同，你可以保留这些成功读取的数据或者丢掉它们重新尝试读取。
1. 当数据源中的可用数据被读完时，`Read()`  方法有可能返回一个非零的 n 和 `err = io.EOF`。但是，根据具体的实现，reader 也可以选择在读取结束时返回一个非零的 n 和 `err = nil`。在这种情况下，所有后续的读取操作必须返回 `n = 0` 和 `err = io.EOF`。
1. 最后，`Read()` 调用返回 `n = 0` 和 `err = nil` 并不意味着 EOF 因为下一次调用 `Read()` 方法可能会返回数据。

正如你所看到的，有时候直接从 reader 中读取数据有些棘手。但幸运的是，标准库中实现的 reader 都遵循符合常理的方法使得可以比较容易地实现流式操作。尽管如此，在使用一个 reader 之前仍然应当仔细查阅它的文档。

### 流式读取数据

从一个 reader 中流式读取数据很容易。`Read()` 方法被设计为在循环中调用，在每一次迭代中，`Read()` 方法会从数据源读取一个数据 chunk 并将其放入到缓冲区 p 中。循环过程一直进行直到 `Read()` 方法返回 `io.EOF` 错误。
下面是一个简单的例子：使用 strings.NewReader(string) 创建了一个字符串 reader，对一个源字符串中的字节进行流式处理：

```go
func main() {
	reader := strings.NewReader("Clear is better than clever")
	p := make([]byte, 4)

	for {
		n, err := reader.Read(p)
		if err != nil{
		    if err == io.EOF {
			fmt.Println(string(p[:n])) //should handle any remainding bytes.
			break
		    }
		    fmt.Println(err)
		    os.Exit(1)
		}
		fmt.Println(string(p[:n]))
	}
}
```

上述代码使用 `make([]byte, 4)` 创建了一个容量和长度均为 4 个字节的字节切片作为缓冲区 p。这个缓冲区长度被故意设置为小于源字符串的长度，用来演示如何流式处理长度大于缓冲区长度的数据源。

### 实现自定义 io.Reader

上面的例子使用了标准库的 reader ，现在我们尝试自定义实现一个 reader。下面的代码定义了一个 rader 类型实现了 io.Reader 接口，作用是过滤掉数据源中所有的非字母字符。

```go
type alphaReader struct {
	src string
	cur int
}

func newAlphaReader(src string) *alphaReader {
	return &alphaReader{src: src}
}

func alpha(r byte) byte {
	if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
		return r
	}
	return 0
}

func (a *alphaReader) Read(p []byte) (int, error) {
	if a.cur >= len(a.src) {
		return 0, io.EOF
	}

	x := len(a.src) - a.cur
	n, bound := 0, 0
	if x >= len(p) {
		bound = len(p)
	} else if x <= len(p) {
		bound = x
	}

    //译者注
    //下面的代码改成这个样子比较合适
    //这段代码可以保证每次都读到 4 个字母再返回
    //所以返回的序列是： Hell oIts amwh erei sthe sun
    //而下面的代码返回的序列是：Hell oI ts am ...
    //之所以能正常工作是因为 byte 零值打印出来为空字符串
    //buf := make([]byte, bound)
	//for n < bound && a.cur < len(a.src) {
	//	if char := alpha(a.src[a.cur]); char != 0 {
	//		buf[n] = char
	//		n++
	//	}
	//	a.cur++
	//}

	buf := make([]byte, bound)
	for n < bound {
		if char := alpha(a.src[a.cur]); char != 0 {
			buf[n] = char
		}
		n++
		a.cur++
	}
	copy(p, buf)
	return n, nil
}

func main() {
	reader := newAlphaReader("Hello! It's 9am, where is the sun?")
	p := make([]byte, 4)
	for {
		n, err := reader.Read(p)
		if err == io.EOF {
			break
		}
		fmt.Print(string(p[:n]))
	}
	fmt.Println()
}
```

当程序执行时会输出：

```go
$> go run alpha_reader.go
HelloItsamwhereisthesun
```

### 链式读取

标准库中有很多 reader 已经实现了链式读取。使用一个 reader 作为另一个 reader 的数据源是一种常见的做法。reader 的链式组合使得一个 reader 可以复用另一个 reader 已经实现的逻辑，就像下面代码的做法：更新了  `alphaReader` 的实现使其可以接受一个 `io.Reader` 作为数据源。这样的做法通过复用已有 reader 的工作来降低代码的复杂性。

```go
type alphaReader struct {
	reader io.Reader
}

func newAlphaReader(reader io.Reader) *alphaReader {
	return &alphaReader{reader: reader}
}

func alpha(r byte) byte {
	if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
		return r
	}
	return 0
}

func (a *alphaReader) Read(p []byte) (int, error) {
	n, err := a.reader.Read(p)
	if err != nil {
		return n, err
	}
	buf := make([]byte, n)
	for i := 0; i < n; i++ {
		if char := alpha(p[i]); char != 0 {
			buf[i] = char
		}
	}

	copy(p, buf)
	return n, nil
}

func main() {
	// use an io.Reader as source for alphaReader
	reader := newAlphaReader(strings.NewReader("Hello! It's 9am, where is the sun?"))
	p := make([]byte, 4)
	for {
		n, err := reader.Read(p)
		if err == io.EOF {
			break
		}
		fmt.Print(string(p[:n]))
	}
	fmt.Println()
}
```

### io.Writer 接口

writer 由 `io.Writer` 接口定义，实现流式地将数据从缓冲区写入到目标资源中，如下图所示：

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1574586722093-9d4d9479-da59-446d-a748-e38a16b37d77.png#align=left&display=inline&height=213&name=image.png&originHeight=426&originWidth=1902&size=62060&status=done&width=951)
writer 必须实现 `io.Write`r 接口的 `Write(p []byte)` 方法。`Wirte()`)方法被设计为从缓冲区 p 中读取数据并将其写入到指定的目标资源中。

```go
type Writer interface {
    Write(p []byte) (n int, err error)
}
```

`Write()` 方法的实现应该返回写入的字节数，发生错误时返回 `error`。

### 使用 writers

标准库中有很多预先实现了 `io.Writer` 的类型。使用 writers 也是比较简单的，下面的代码演示了使用 `bytes.Buffer` 作为一个 writer 向内存中写入数据。

```go
func main() {
	proverbs := []string{
		"Channels orchestrate mutexes serialize",
		"Cgo is not Go",
		"Errors are values",
		"Don't panic",
	}
	var writer bytes.Buffer

	for _, p := range proverbs {
		n, err := writer.Write([]byte(p))
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
		if n != len(p) {
			fmt.Println("failed to write data")
			os.Exit(1)
		}
	}

	fmt.Println(writer.String())
}
```

### 实现自定义 io.Writer

下面的代码展示了如何实现一个名为  chanWriter 的自定义` io.Writer` 用来将缓冲区中的内容作为字节序列写入到一个 Go channel 中。

```go
type chanWriter struct {
	ch chan byte
}

func newChanWriter() *chanWriter {
	return &chanWriter{make(chan byte, 1024)}
}

func (w *chanWriter) Chan() <-chan byte {
	return w.ch
}

func (w *chanWriter) Write(p []byte) (int, error) {
	n := 0
	for _, b := range p {
		w.ch <- b
		n++
	}
	return n, nil
}

func (w *chanWriter) Close() error {
	close(w.ch)
	return nil
}

func main() {
	writer := newChanWriter()
	go func() {
		defer writer.Close()
		writer.Write([]byte("Stream "))
		writer.Write([]byte("me!"))
	}()
	for c := range writer.Chan() {
		fmt.Printf("%c", c)
	}
	fmt.Println()
}
```

使用 writer 也非常简单，在 main() 函数中调用（在一个单独的 goroutine 中） `writer.Write()` 方法即可。 chanWriter 也实现了 `io.Closer` 接口，写入完成后调用 `writer.Close()` 方法关闭 channel 防止访问 channel 陷入死锁。

### IO 操作常用的类型和包

之前提到，Go 语言标准库中提供了很多有用的函数和类型使得操作流式 IO 变得非常简单。

#### os.File

os.File 类型表示本地系统的一个文件。它同时实现了 `io.Reader` 和 `io.Writer` 接口，所以可以被用在任何流式 IO 操作的场景。例如，下面的代码展示了如何将字符串切片直接写入到文件中：

```go
func main() {
	proverbs := []string{
		"Channels orchestrate mutexes serialize\n",
		"Cgo is not Go\n",
		"Errors are values\n",
		"Don't panic\n",
	}
	file, err := os.Create("./proverbs.txt")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	defer file.Close()

	for _, p := range proverbs {
		n, err := file.Write([]byte(p))
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
		if n != len(p) {
			fmt.Println("failed to write data")
			os.Exit(1)
		}
	}
	fmt.Println("file write done")
}
```

另外， `io.File` 也可以作为 reader 使用实现流式读取本地文件中的内容。例如，下面的代码演示了读取一个文件并将其内容打印出来：

```go
func main() {
	file, err := os.Open("./proverbs.txt")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	defer file.Close()

	p := make([]byte, 4)
	for {
		n, err := file.Read(p)
		if err == io.EOF {
			break
		}
		fmt.Print(string(p[:n]))
	}
}
```

#### 标准输出、输入和错误

os 包提供了三个变量：`os.Stdout`、`os.Stdin` 和 `os.Stderr` 。它们都是 `*os.File` 类型，分别表示操作系统的标准输出、输入和错误的文件句柄。例如，下面的代码展示直接向标准输出写入内容：

```go
func main() {
	proverbs := []string{
		"Channels orchestrate mutexes serialize\n",
		"Cgo is not Go\n",
		"Errors are values\n",
		"Don't panic\n",
	}

	for _, p := range proverbs {
		n, err := os.Stdout.Write([]byte(p))
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
		if n != len(p) {
			fmt.Println("failed to write data")
			os.Exit(1)
		}
	}
}
```

#### io.Copy()

使用 `io.Copy()` 函数可以很容易地流式地从源 reader 向目标 writer 拷贝数据。它抽象了 `for-loop` 模式和正确处理 `io.EOF` 及字节数的过程。
下面的代码展示了一个之前代码的简化版本，拷贝 proverbs 中的内容到 file 文件中：

```go
func main() {
	proverbs := new(bytes.Buffer)
	proverbs.WriteString("Channels orchestrate mutexes serialize\n")
	proverbs.WriteString("Cgo is not Go\n")
	proverbs.WriteString("Errors are values\n")
	proverbs.WriteString("Don't panic\n")

	file, err := os.Create("./proverbs.txt")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	defer file.Close()

	// copy from reader data into writer file
	if _, err := io.Copy(file, proverbs); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	fmt.Println("file created")
}
```

类似地，我们可以重写之前的程序使用 `io.Copy()` 将本地文件中的内容流式地写入到标准输出：

```go
func main() {
	file, err := os.Open("./proverbs.txt")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	defer file.Close()

	if _, err := io.Copy(os.Stdout, file); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
```

#### io.WriteString()

`io.WriteString()` 为写入字符串到指定 writer 提供了便利：

```go
func main() {
	file, err := os.Create("./magic_msg.txt")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	defer file.Close()
	if _, err := io.WriteString(file, "Go is fun!"); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
```

#### 管道 writers and readers

`io.PipeWrite`r 和 `io.PipeReade`r 将 IO 操作建模为基于内存的管道。数据被写入到管道的写端并在另外一个 goroutine 中从读端读出。下面的代码使用 `io.Pipe()` 创建了一个管道 reader/writer 对用来从 proverbs 缓冲区中拷贝数据到 `io.Stdout`：

```go
func main() {
	proverbs := new(bytes.Buffer)
	proverbs.WriteString("Channels orchestrate mutexes serialize\n")
	proverbs.WriteString("Cgo is not Go\n")
	proverbs.WriteString("Errors are values\n")
	proverbs.WriteString("Don't panic\n")

	piper, pipew := io.Pipe()

	// write in writer end of pipe
	go func() {
		defer pipew.Close()
		io.Copy(pipew, proverbs)
	}()

	// read from reader end of pipe.
	io.Copy(os.Stdout, piper)
	piper.Close()
}
```

#### Buffered IO

Go 通过 `bufio` 包支持 Buffered IO 使得操作文本内容更加方便。例如，下面的代码使用 `'\n'` 作为分隔符一行一行地读取文件的内容：

```go
func main() {
	file, err := os.Open("./planets.txt")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	defer file.Close()
	reader := bufio.NewReader(file)

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			} else {
				fmt.Println(err)
				os.Exit(1)
			}
		}
		fmt.Print(line)
	}
}
```

#### Util 包

ioutil 包是 io 包的一个子包，它提供了几个方便的函数用于执行 IO 操作。例如，下面的代码使用 `ReadFile` 函数读取文件的所有内容到一个 `[]byte` 中:

```go

package main

import (
  "io/ioutil"
   ...
)

func main() {
	bytes, err := ioutil.ReadFile("./planets.txt")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	fmt.Printf("%s", bytes)
}
```

### 总结

这篇文章展示了如何使用 `io.Reader` 和 `io.Writer` 接口实现流式 IO 操作。读过这篇文章后你应该理解了如何使用 io 包写程序处理流式 IO。
这里只对支持流式 IO 的包进行了简单的讨论，并没有深入探讨文件 IO 、缓冲 IO、网络 IO 和格式化 IO 等。我希望这篇文章能给你一些关于 Go 语言流式 IO 编程范式的启发。
