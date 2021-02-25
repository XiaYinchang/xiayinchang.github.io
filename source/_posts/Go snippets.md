---
title: Go snippets
urlname: mhnb8f
date: '2020-10-21 00:00:00 +0800'
layout: post
comments: true
categories: Go
tags:
  - Go
keywords: 'Go, snippets'
description: Go 可复用的代码片段。
abbrlink: beea4a6b
updated: 2020-10-21 00:00:00
---

#### 生成 csv 文件

```go
file, err := os.OpenFile("test.csv", os.O_CREATE|os.O_WRONLY, 0777)
defer file.Close()
if err != nil {
	os.Exit(1)
}
data := [][]string{{"Line1", "Hello"}, {"Line2", "World"}}
csvWriter := csv.NewWriter(file)
csvWriter.WriteAll(data)
csvWriter.Flush()

dataBuf := bytes.NewBuffer(nil)
writer := csv.NewWriter(dataBuf)
for _, str := range data {
    writer.Write(str)
}
writer.Flush()
```

#### 结合使用 klog 和 cobra

一个更完整的模板：[https://github.com/physcat/klog-cobra](https://github.com/physcat/klog-cobra)

```go
import (
	"flag"
	"github.com/spf13/cobra"
	"k8s.io/klog/v2"
)
func NewRootCmd() *cobra.Command {
	globalConfig := config.GetGlobalConfig()

	cmd := &cobra.Command{
		Use:   "test",
		Short: "\ntest",
	}

	klog.InitFlags(nil)
	cmd.PersistentFlags().AddGoFlagSet(flag.CommandLine)

	cmd.AddCommand(newSubCmd())

	return cmd
}
```

#### 从切片中删除元素

```bash
# 重新构造一个切片
func deleteItem(strSlice []string, index int) []string {
	newSlice := []string{}
	for i, v := range strSlice {
		if i != index {
			newSlice = append(newSlice, v)
		}
	}
	return newSlice
}
# 使用最后一个元素覆盖欲删除的元素，破坏了顺序
func deleteItem1(strSlice []string, index int) []string {
	strSlice[index] = strSlice[len(strSlice)-1]
	return strSlice[:len(strSlice)-1]
}
# 将待删除元素之后的元素整体向前平移一个位置
func deleteItem2(strSlice []string, index int) []string {
	copy(strSlice[index:len(strSlice)-1], strSlice[index+1:])
	return strSlice[:len(strSlice)-1]
}
```

#### 生成 UUID

一种是使用开源库：

```go
package main

import (
    "fmt"
    "github.com/google/uuid"
)

func main() {
    guid := uuid.New()
    fmt.Println(guid)
}
```

一种是直接读取随机数生成 uuid：

```go
package main

import (
	"fmt"
	"math/rand"
	"encoding/hex"
)

# 生成的不是标准 UUID，但思路是一样的，第一种方法底层也是类似实现
func uuid() string {
	u := make([]byte, 16)
	_, err := rand.Read(u)
	if err != nil {
		return ""
	}

	u[8] = (u[8] | 0x80) & 0xBF
	u[6] = (u[6] | 0x40) & 0x4F

	return hex.EncodeToString(u)
}
func main() {
	fmt.Println(uuid())
}
```

一种是调用系统的 uuidgen 工具：

```go
package main

import (
    "fmt"
    "log"
    "os/exec"
)

func main() {
    out, err := exec.Command("uuidgen").Output()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("%s \n", out)
}
```

#### 检查字符串是否符合 base64 编码

参考：[https://stackoverflow.com/questions/8571501/how-to-check-whether-a-string-is-base64-encoded-or-not](https://stackoverflow.com/questions/8571501/how-to-check-whether-a-string-is-base64-encoded-or-not)

```bash
func CheckValidBase64(src string) bool {
	matched, _ := regexp.Match(`^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$`, []byte(src))
	return matched
}
```

#### 检查环境变量是否存在

一般情况下，我们只需要获取环境变量的值，所以使用  `username := os.Getenv("USERNAME")` 即可，当获取到的值为空时，有可能环境变量存在且值为空，也有可能环境变量并不存在，若我们需要知道到底是哪种情况，则可使用 `path, exists := os.LookupEnv("PATH")` 返回的布尔值进行判断。

#### HTTP Response Status

有两种标准写法可用：

```go
// WriteHeader 用以返回指定状态码的 http 响应。如果在调用 Write 方法前没有显式指定状态码，
// 则第一次调用 Write 时会触发一个隐式的设定状态码操作 WriteHeader(http.StatusOK)。因此，
// 一般不需要显式去设置状态码，大多数情况下只是在出现错误时显式调用 WriteHeader 用以返回错误
// 状态。
func ServeHTTP(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusInternalServerError)
    w.Write([]byte("500 - Something bad happened!"))
}
// 另一种写法,其实也是调用了 WriteHeader 方法
func yourFuncHandler(w http.ResponseWriter, r *http.Request) {
    http.Error(w, "my own error message", http.StatusForbidden)
    // or using the default message error
    http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
}
```

#### 获取变量类型

- fmt

```go
import "fmt"
func main() {
    v := "hello world"
    fmt.Println(typeof(v))
}
func typeof(v interface{}) string {
    return fmt.Sprintf("%T", v)
}
```

- reflect

```go
import (
    "reflect"
    "fmt"
)
func main() {
    v := "hello world"
    fmt.Println(typeof(v))
}
func typeof(v interface{}) string {
    return reflect.TypeOf(v).String()
}
```

- [类型断言](https://golang.org/ref/spec#Type_assertions)

```go
func main() {
    v := "hello world"
    fmt.Println(typeof(v))
}
func typeof(v interface{}) string {
    switch t := v.(type) {
    case int:
        return "int"
    case float64:
        return "float64"
    //... etc
    default:
        _ = t
        return "unknown"
    }
}
```

其实前两个都是用了反射，fmt.Printf (“% T”) 里最终调用的还是 `reflect.TypeOf()`。

```go
func (p *pp) printArg(arg interface{}, verb rune) {
    ...
	// Special processing considerations.
	// %T (the value's type) and %p (its address) are special; we always do them first.
	switch verb {
	case 'T':
		p.fmt.fmt_s(reflect.TypeOf(arg).String())
		return
	case 'p':
		p.fmtPointer(reflect.ValueOf(arg), 'p')
		return
	}
```

reflect.TypeOf () 的参数是 `v interface{}`，golang 的反射是怎么做到的呢？在 golang 中，interface 也是一个结构体，记录了 2 个指针：

- 指针 1，指向该变量的类型
- 指针 2，指向该变量的 value

#### 获取变量地址

输入：

```go
package main

import (
	"fmt"
	"reflect"
	"unsafe"
)

func main() {
	intarr := [5]int{12, 34, 55, 66, 43}
	slice := intarr[:]
	fmt.Printf("the len is %d and cap is %d \n", len(slice), cap(slice))
	fmt.Printf("%p   %p   %p   %p\n", &slice[0], &intarr, slice, &slice)
	fmt.Printf("underlay: %#x\n", (*reflect.SliceHeader)(unsafe.Pointer(&slice)).Data)
}
```

输出：

```
the len is 5 and cap is 5
0x456000   0x456000   0x456000   0x40a0e0
underlay: 0x456000
```

#### 按行读取文本

如果是对一个多行的字符串按行读取，则可以：

```go
for _, line := range strings.Split(strings.TrimSuffix(x, "\n"), "\n") {
    fmt.Println(line)
}
```

如果是从文件或者流式管道中按行读取，则可以：

```go
scanner := bufio.NewScanner(f) // f is the *os.File
for scanner.Scan() {
    fmt.Println(scanner.Text()) // Println will add back the final '\n'
}
if err := scanner.Err(); err != nil {
   // handle error
}
// 另一个例子
args := "-E -eNEW,DESTROY -ptcp --any-nat --buffer-size 1024000 --dport " + fmt.Sprintf("%d", serviceNodePort)
cmd := exec.Command("conntrack", strings.Split(args, " ")...)

stdout, _ := cmd.StdoutPipe()
err := cmd.Start()
if err != nil {
    common.ZapClient.Fatalf("start conntrack failed: %s", err.Error())
    errChan <- err
    return
}
scanner := bufio.NewScanner(stdout)
for scanner.Scan() {}
```

#### 从 http request body 中解析出 go 对象

```go
var info MyLocalType
data, err := ioutil.ReadAll(req.Body)
if err != nil {
    w.WriteHeader(http.StatusBadRequest)
    w.Write([]byte("read data from request body failed!"))
}
if err = json.Unmarshal(data, &info); err != nil {
    w.WriteHeader(http.StatusBadRequest)
    w.Write([]byte("parse info from request body failed!"))
}
// 简单点的
if err := json.NewDecoder(req.Body).Decode(&info); err != nil {
    w.WriteHeader(http.StatusBadRequest)
    w.Write([]byte("parse info from request body failed!"))
}
```

#### 从静态文件生成 go code 并 serve

```bash
// 使用两个开源库
go get github.com/jteeuwen/go-bindata
go get github.com/elazarl/go-bindata-assetfs

// 从本地目录生成 go code
// 会在当前目录生成 bindata.go
go-bindata-assetfs swagger-ui/
```

之后就可以使用该文件创建一个 http 静态站点：

```go
// 这里以 swagger-ui 编译之后的文件为例
// 假设生成的 go 代码所属包名为 swagger
package main

import (
	"log"
	"net/http"

	"github.com/elazarl/go-bindata-assetfs"
  	"fake.local.com/test/swagger"
)

// FileServer 会自动尝试获取目录下的 index.html 文件返回给用户
// 从而使得一个静态站点能够正常工作
func main() {
	// Use binary asset FileServer
	http.Handle("/",
		http.FileServer(&assetfs.AssetFS{
		Asset:    swagger.Asset,
		AssetDir: swagger.AssetDir,
		Prefix:   "swagger-ui",
	}))

	log.Println("http server started on :8000")
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
```

#### 生成 zip 文件并返回给 http response

```go
func zipHandler(w http.ResponseWriter, r *http.Request) {
    filename := "randomfile.jpg"

    // var buf bytes.Buffer
    // 直接声明一个 buffer 即可用，buffer 开箱即用是因为当调用 Write 写入内容时会自动判断
    // 底层切片是否为 nil，如果为 nil 则会分配一个容量为 smallBufferSize = 64 ,长度
    // 为待写入切片的长度 n （如果满足 n < smallBufferSize，否则转入其它处理逻辑）
    buf := new(bytes.Buffer)

    // 其实没有必要使用 Buffer ，可以直接使用 w，如下：
    // writer := zip.NewWriter(w)
    // 因为 net/http 内部类型 *response 实现了 http.ResponseWriter ，而 reponse 内部
    // 使用的 bufferio.Writer 本身就已经有缓冲区
    writer := zip.NewWriter(buf)

    data, err := ioutil.ReadFile(filename)
    if err != nil {
        log.Fatal(err)
    }
    f, err := writer.Create(filename)
    if err != nil {
        log.Fatal(err)
    }
    _, err = f.Write([]byte(data))
    if err != nil {
        log.Fatal(err)
    }
    err = writer.Close()
    if err != nil {
        log.Fatal(err)
    }
    // 实测可以使用 w.Header().Set("Content-Type", "application/octet-stream")
    w.Header().Set("Content-Type", "application/zip")
    w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", filename))
    //io.Copy(w, buf)
    w.Write(buf.Bytes())
}
```

另一种简单的写法：

```go
func handleZip(w http.ResponseWriter, r *http.Request) {
    f, err := os.Open("main.go")
    if err != nil {
        log.Fatal(err)
    }
    defer func() {
        if err := f.Close(); err != nil {
            log.Fatal(err)
        }
    }()

    // write straight to the http.ResponseWriter
    zw := zip.NewWriter(w)
    cf, err := zw.Create(f.Name())
    if err != nil {
        log.Fatal(err)
    }

    w.Header().Set("Content-Type", "application/zip")
    w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", f.Name()))

    // copy the file contents to the zip Writer
    _, err = io.Copy(cf, f)
    if err != nil {
        log.Fatal(err)
    }

    // close the zip Writer to flush the contents to the ResponseWriter
    err = zw.Close()
    if err != nil {
        log.Fatal(err)
    }
}
```

#### 反向代理

在 Go 语言中可以很方便地构建反向代理服务器：

```go
// Serve a reverse proxy for a given url
func serveReverseProxy(target string, res http.ResponseWriter, req *http.Request) {
	// parse the url
	url, _ := url.Parse(target)

	// create the reverse proxy
	proxy := httputil.NewSingleHostReverseProxy(url)

	// Update the headers to allow for SSL redirection
	req.URL.Host = url.Host
	req.URL.Scheme = url.Scheme
	req.Header.Set("X-Forwarded-Host", req.Header.Get("Host"))
	req.Host = url.Host

	// Note that ServeHttp is non blocking and uses a go routine under the hood
	proxy.ServeHTTP(res, req)
}
```

#### 写入文件

当待写入的文件已经存在时，应该以可写模式打开它进行写入；当待写入文件不存在时，应该创建该文件并进行写入。直觉上，我们应当首先判断文件是否存在，可以使用如下代码：

```go
if _, err := os.Stat("/path/to/whatever"); os.IsNotExist(err) {
  // path/to/whatever does not exist
}
```

通过跟踪 `os.IsNotExist` 函数的实现可以发现，它主要处理两类错误： `os.ErrNotExist` 和 `syscall.ENOENT` ，也就是只有这两种错误才会使得 `os.IsNotExist(err)` 返回 `true`。实际上，仅仅这两种错误是无法确定文件是不存在的，有时 `os.Stat` 返回 `ENOTDIR` 而不是  `ENOENT` ，例如，如果 `/etc/bashrc` 文件存在，则使用 `os.Stat` 检查 `/etc/bashrc/foobar` 是否存在时会返回 `ENOTDIR` 错误表明 `/etc/bashrc` 不是一个目录，因此上述写法是有问题的。实际上使用 `os.Stat` 的可能结果如下：

```go
if _, err := os.Stat("/path/to/whatever"); err == nil {
  // path/to/whatever exists
} else if os.IsNotExist(err) {
  // path/to/whatever does *not* exist
} else {
  // Schrodinger: file may or may not exist. See err for details.
  // Therefore, do *NOT* use !os.IsNotExist(err) to test for file existence
}
```

也就是说使用 `os.Stat` 无法确定文件是否存在，因此写入文件时先使用 `os.Stat` 判断文件是否存在，不存在时则使用 `os.Create` 创建文件的写法是错误的（尽管大多数时候能够成功写入）。正确的写入文件的方法是 `os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0666)` ，这个函数通过 sys_openat 系统调用依据传入的 Flag 打开文件，如果文件不存在则创建，如果文件存在则直接打开，使用这个函数的另一个好处是不会产生竞争条件（即使另外一个操作正在创建该文件？），参见 [https://stackoverflow.com/questions/12518876/how-to-check-if-a-file-exists-in-go](https://stackoverflow.com/questions/12518876/how-to-check-if-a-file-exists-in-go) 中的一系列回答和讨论。
另一种选择是使用 `ioutil.WriteFile()` ，其内部同样是调用了 `os.OpenFile`，只不过只适用于一次性全量写入。

#### 监听系统信号实现优雅退出

```go
	ctx, cancel := context.WithCancel(context.Background())
	sigc := make(chan os.Signal, 1)
	signal.Notify(sigc, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	go func() {
		<-sigc
		cancel()
	}()
```
