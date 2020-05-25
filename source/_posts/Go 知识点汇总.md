---
title: Go 知识点汇总
urlname: sfexfo
date: '2019-10-12 10:19:35 +0800'
tags: []
abbrlink: defe85e8
---

<br />
<br />title: Go 知识点汇总
date: 2019-10-12
updated: 2020-05-25
layout: post
comments: true
categories: Go
tags: [Go]
keywords: Go
description: 汇总对 Go 语言的基本理解、编程方法和开源库等。



---



<a name="szYLf"></a>
#### 关于 slice 的初始化
执行代码：
```go
package main

import (
	"fmt"
)

func main() {
	var tmpSlice []int
	fmt.Printf("value: %[1]v   type: %[1]T    len: %d    cap: %d    underlay: %p\n", tmpSlice, len(tmpSlice), cap(tmpSlice), tmpSlice)
	tmpSlice = append(tmpSlice, 1)
	fmt.Printf("value: %[1]v   type: %[1]T    len: %d    cap: %d    underlay: %p\n", tmpSlice, len(tmpSlice), cap(tmpSlice), tmpSlice)
}
```
输出：
```
value: []   type: []int    len: 0    cap: 0    underlay: 0x0
value: [1]   type: []int    len: 1    cap: 2    underlay: 0x414028
```
上述示例说明 slice 可以不进行初始化，在 append 调用中会自动创建底层数组分配空间，即所谓懒初始化。一般情况下， slice 可通过以下方式产生：<br />输入：
```go
package main

import (
	"fmt"
)

func main() {
	slice1 := []int{1,2,3}
	printSlice(slice1)
	
	slice2 := []int{6:1}
	printSlice(slice2)
	
	underlayArr :=[...]int{15:1}
	slice3 := underlayArr[12:]
	printSlice(slice3)
	
	slice4 := make([]int,3)
	printSlice(slice4)
	
	slice5 := make([]int,3,8)
	printSlice(slice5)
}

func printSlice(s []int) {
	fmt.Printf("value: %[1]v   type: %[1]T    len: %d    cap: %d    underlay: %p\n", s, len(s), cap(s), s)
}
```
输出：
```
value: [1 2 3]   type: []int    len: 3    cap: 3    underlay: 0x414020
value: [0 0 0 0 0 0 1]   type: []int    len: 7    cap: 7    underlay: 0x45e020
value: [0 0 0 1]   type: []int    len: 4    cap: 4    underlay: 0x4300f0
value: [0 0 0]   type: []int    len: 3    cap: 3    underlay: 0x4140a0
value: [0 0 0]   type: []int    len: 3    cap: 8    underlay: 0x45e040
```


<a name="J5JDU"></a>
#### 切片拷贝
以下代码：
```go
package main

import (
	"fmt"
)

func main() {
	arr := [20]int{}
	slice1 := arr[2:5]
	fmt.Printf("%+v\n", slice1)
	slice2 := slice1
	slice2[1] = 3

	slice2 = append(slice2, []int{1}...)
	fmt.Printf("%+v\n", slice1)
	fmt.Printf("%+v\n", slice2)
	slice2[2] = 5
	fmt.Printf("%+v\n", slice1)
	fmt.Printf("%+v\n", slice2)
}
```
输出：
```bash
[0 0 0]
[0 3 0]
[0 3 0 1]
[0 3 5]
[0 3 5 1]
```
以上输出说明，整个过程中两个切片的底层数组仍然是同一个，这是因为切片复制完成的瞬间新切片和原切片的底层数组一定是同一个，之后随着 append 操作有可能会造成切片各自的底层数组发生变化，而这种变化并不是一定会出现，只有底层数组的容量不足以容纳新的元素时才会发生，而上面的输出结果表明，由于底层数组的容量仍然足以容纳新的元素，所以切片 append 操作后底层数组仍未变化，也就是说原切片和新切片之间仍然有可能相互影响。<br />下面的例子恰好是由于新切片 append 元素时底层数组不足以容纳新的元素造成底层数组的变化，之后两个切片再无关系：
```go
package main

import (
	"fmt"
)

func main() {
	slice1 := []int{1, 2, 3, 10: 0}
	fmt.Printf("%+v\n", slice1)
	slice2 := slice1
	slice2[1] = 3

	slice2 = append(slice2, []int{1}...)
	fmt.Printf("%+v\n", slice1)
	fmt.Printf("%+v\n", slice2)
	slice2[3]=5
	fmt.Printf("%+v\n", slice1)
	fmt.Printf("%+v\n", slice2)
}

```
输出：
```go
[1 2 3 0 0 0 0 0 0 0 0]
[1 3 3 0 0 0 0 0 0 0 0]
[1 3 3 0 0 0 0 0 0 0 0 1]
[1 3 3 0 0 0 0 0 0 0 0]
[1 3 3 5 0 0 0 0 0 0 0 1]
```
综上，我们不能依靠拷贝切片之间的联系来获取排序后的元素值（除非是原地排序，不需要增加切片大小），即不能像 C 语言使用指针一样，而应当每次返回一个新的切片存储排好序的值。<br />

<a name="IWVp8"></a>
#### 包导入过程
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1572858912878-86d89e2a-168b-43ad-9e9b-70068b16e723.png#align=left&display=inline&height=424&margin=%5Bobject%20Object%5D&name=image.png&originHeight=424&originWidth=953&size=146883&status=done&style=none&width=953)
<a name="ifRex"></a>
#### godoc 与 go doc
从 go 1.12 开始， godoc 不再提供各种子命令，仅作为一个 http server 提供 GOPATH 和 GOROOT 下 pkg 的在线文档，而 go doc 命令可以用来查看本地程序的文档。
<a name="zfykF"></a>
#### GOPRIVATE
从 go 1.13 开始，增加了 GOPRIVATE 环境变量的配置用以跳过对私有仓库的 checksum 检查：
```bash
export GOPRIVATE="git.ucloudadmin.com/*,git.umcloud.io/*"
# 设置完之后，通过 go env 可以看到 GONOSUMDB 和 GONOPROXY 环境变量也被自动更新了
GO111MODULE="on"
GOARCH="amd64"
GOBIN=""
GOCACHE="/home/xyc/.cache/go-build"
GOENV="/home/xyc/.config/go/env"
GOEXE=""
GOFLAGS=""
GOHOSTARCH="amd64"
GOHOSTOS="linux"
GONOPROXY="git.ucloudadmin.com/*,git.umcloud.io/*"
GONOSUMDB="git.ucloudadmin.com/*,git.umcloud.io/*"
GOOS="linux"
GOPATH="/home/xyc/go"
GOPRIVATE="git.ucloudadmin.com/*,git.umcloud.io/*"
...
```

<br />

<a name="2qLn1"></a>
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
<a name="fCmPq"></a>
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


<a name="XLO09"></a>
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


<a name="yfmQE"></a>
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


<a name="q6Eoo"></a>
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


<a name="RkIX9"></a>
#### 写入文件
当待写入的文件已经存在时，应该以可写模式打开它进行写入；当待写入文件不存在时，应该创建该文件并进行写入。直觉上，我们应当首先判断文件是否存在，可以使用如下代码：
```go
if _, err := os.Stat("/path/to/whatever"); os.IsNotExist(err) {
  // path/to/whatever does not exist
}
```
通过跟踪 `os.IsNotExist` 函数的实现可以发现，它主要处理两类错误： `os.ErrNotExist` 和 `syscall.ENOENT` ，也就是只有这两种错误才会使得 `os.IsNotExist(err)` 返回 `true`。实际上，仅仅这两种错误是无法确定文件是不存在的，有时 `os.Stat` 返回 `ENOTDIR` 而不是 `ENOENT` ，例如，如果 `/etc/bashrc` 文件存在，则使用 `os.Stat` 检查 `/etc/bashrc/foobar` 是否存在时会返回 `ENOTDIR` 错误表明 `/etc/bashrc` 不是一个目录，因此上述写法是有问题的。实际上使用 `os.Stat` 的可能结果如下：
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
也就是说使用 `os.Stat` 无法确定文件是否存在，因此写入文件时先使用 `os.Stat` 判断文件是否存在，不存在时则使用 `os.Create` 创建文件的写法是错误的（尽管大多数时候能够成功写入）。正确的写入文件的方法是 `os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0666)` ，这个函数通过 sys_openat 系统调用依据传入的 Flag 打开文件，如果文件不存在则创建，如果文件存在则直接打开，使用这个函数的另一个好处是不会产生竞争条件（即使另外一个操作正在创建该文件？），参见 [https://stackoverflow.com/questions/12518876/how-to-check-if-a-file-exists-in-go](https://stackoverflow.com/questions/12518876/how-to-check-if-a-file-exists-in-go) 中的一系列回答和讨论。<br />另一种选择是使用 `ioutil.WriteFile()` ，其内部同样是调用了 `os.OpenFile`，只不过只适用于一次性全量写入。<br />

<a name="ZC8Wn"></a>
#### Template 中判断 range 最后一个元素
template 中可以使用 if 判断值是否为 0 ，不像在 Go 语法只能对 bool 值执行 if 操作，因此判断是否为第一个元素相对容易一些，使用 `{\{if $index\}\},\{\{end\}\}` 即可，而且 `index` 不需要专门声明。判断是否为最后一个元素则需要自定义函数如下：
```go
package main

import (
    "os"
    "reflect"
    "text/template"
)

var fns = template.FuncMap{
    "last": func(x int, a interface{}) bool {
        return x == reflect.ValueOf(a).Len() - 1
    },
}

func main() {
    t := template.Must(template.New("abc").Funcs(fns).Parse(`\{\{range  $i, $e := .\}\}\{\{if $i\}\}, \{\{end\}\}\{\{if last $i $\}\}and \{\{end\}\}\{\{$e\}\}\{\{end\}\}.`))
    a := []string{"one", "two", "three"}
    t.Execute(os.Stdout, a)
}
```
关于 Template 的使用可以参考：[https://github.com/grpc-ecosystem/grpc-gateway/blob/master/protoc-gen-grpc-gateway/gengateway/template.go](https://github.com/grpc-ecosystem/grpc-gateway/blob/master/protoc-gen-grpc-gateway/gengateway/template.go)<br />

<a name="0UUJH"></a>
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


<a name="vNzvG"></a>
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


<a name="CtPsq"></a>
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


<a name="zJv1y"></a>
#### json unmarshal 时保留 raw message
保留 raw message 的一个用途是，针对不同版本的返回值同一字段的结构可能不一样，因此可以先保留 raw message 然后根据版本进行进一步处理。
```bash
package main

import (
	"encoding/json"
	"fmt"
	"strconv"
)

var jsonStrVersion1 = []byte(`{
    "id"  : 15,
    "version" : 1,
    "foo" : { "foo": 123, "bar": "baz" }
}`)
var jsonStrVersion2 = []byte(`{
    "id"  : 16,
    "version" : 2,
    "foo" : 124
}`)

type Bar struct {
	Id      int64           `json:"id"`
	Version int64           `json:"version"`
	Foo     json.RawMessage `json:"foo"`
}
type Foo struct {
	Foo int64  `json:"foo"`
	Bar string `json:"bar"`
}

func main() {
	var bar Bar
	err := json.Unmarshal(jsonStrVersion1, &bar)
	if err != nil {
		panic(err)
	}
	getFoo(bar)
	err = json.Unmarshal(jsonStrVersion2, &bar)
	if err != nil {
		panic(err)
	}
	getFoo(bar)
}

func getFoo(bar Bar) {
	var num int64
	switch bar.Version {
	case 1:
		var foo Foo
		_ = json.Unmarshal(bar.Foo, &foo)
		num = foo.Foo
	case 2:
		num, _ = strconv.ParseInt(string(bar.Foo), 10, 64)
	}
	fmt.Println(num)
}
//输出
//123
//124
```


<a name="YaySB"></a>
#### json unmarshal 时会保留对象已有的值
结论：<br />json unmarshal 会忽略结构体中小写字母开头的字段；对同一对象执行多次 unmarshal 会覆盖与前一次 unmarshal 同名的字段，前一次 unmarshal 得到的非同名字段会被保留。<br />代码：
```go
package main

import (
	"encoding/json"
	"fmt"
)

type Foo struct {
    // 如果是 val1，将无法在 json.unmarshal 时被赋值成功
	Val1 string
	Val2 string
	Val3Ptr *string
}

func main() {
	var foo Foo
	foo.Val1 = "val1"
	foo.Val2 = "val2"
	fmt.Printf("%+v\n", foo)
	fooBytes, _ := json.Marshal(foo)
	fmt.Printf("%+v\n", fooBytes)
	fmt.Printf("%s\n", fooBytes)
	json.Unmarshal([]byte(`{"Val1": "val1"}`), &foo)
	fmt.Printf("%+v\n", foo)
	json.Unmarshal([]byte(`{"val1": "val1-1", "val2": "val2", "val3ptr": "val3"}`), &foo)
	fmt.Printf("%s\n", *foo.Val3Ptr)
	fmt.Printf("%+v\n", foo)
}
```
输出：
```bash
{Val1:val1 Val2:val2 Val3Ptr:<nil>}
[123 34 86 97 108 49 34 58 34 118 97 108 49 34 44 34 86 97 108 50 34 58 34 118 97 108 50 34 44 34 86 97 108 51 80 116 114 34 58 110 117 108 108 125]
{"Val1":"val1","Val2":"val2","Val3Ptr":null}
{Val1:val1 Val2:val2 Val3Ptr:<nil>}
val3
{Val1:val1-1 Val2:val2 Val3Ptr:0xc000010370}
```


<a name="Ep42i"></a>
#### 编译时自动添加版本和日期信息
简单的做法是把版本信息放到 main 包中，如下：
```go
package main
import (
  "fmt"
)
var GitCommit string
func main() {
  fmt.Printf("Hello world, version: %s\n", GitCommit)
}
```
然后在编译时加上如下参数：
```bash
export GIT_COMMIT=$(git rev-list -1 HEAD)
# go build -ldflags="-X 'package_path.variable_name=new_value'"
go build -ldflags "-X main.GitCommit=$GIT_COMMIT"
```
如果将 version 信息放到一个单独的包中，如 app/version，如下：
```bash
package main

import (
    "app/build"
    "fmt"
)

var Version = "development"

func main() {
    fmt.Println("Version:\t", Version)
    fmt.Println("build.Time:\t", build.Time)
    fmt.Println("build.User:\t", build.User)
}
```
则添加参数时就需要先找到 version 包的路径，可通过如下方式寻找：
```bash
# 先编译得到 app 可执行文件
go build
# 再通过工具找到包的信息
go tool nm ./app | grep app
# 输出如下：
Output
  55d2c0 D app/build.Time
  55d2d0 D app/build.User
  4069a0 T runtime.appendIntStr
  462580 T strconv.appendEscapedRune
# 之后就可以使用以下方式添加编译参数
go build -v -ldflags="-X 'main.Version=v1.0.0' -X 'app/build.User=$(id -u -n)' -X 'app/build.Time=$(date)'"
```
常用的版本相关信息有：
```bash
now=$(date +'%Y-%m-%d_%T')
commit=$(git rev-parse HEAD)
```


<a name="CTcih"></a>
#### go 编译相关问题
etcd 编译时 GO 依赖包版本报错的解决方法: [https://aiops.red/archives/571](https://aiops.red/archives/571)<br />编译完成的程序在容器内运行时提示：`exec user process caused "no such file or directory"`，一般是因为程序编译时没有禁用 CGO :  `CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/csi-resizer ./cmd/csi-resizer/main.go `。<br />在已经指定使用 `-mod=vendor` 进行编译时仍提示 `build uk8s/uk8s-report: cannot load github.com/montanaflynn/stats: no Go source files`，可能是因为 `github.com/montanaflynn/stats` 是个subemodule。

<a name="Ddd3z"></a>
#### Unicode 字符编码
Unicode 定义了一种编码规则，为每个（语言或表情）符号指定了一个数值。而 UTF-8 是该编码规则在计算机上进行存储时的一种实现。在使用 UTF-8 进行编解码时依据的仍然是 Unicode 编码规则。参见 [字符编码笔记：ASCII，Unicode 和 UTF-8](http://www.ruanyifeng.com/blog/2007/10/ascii_unicode_and_utf-8.html)。在 Go 语言中，字符编码使用 UTF-8。在下述代码中，`你好` 在计算机中使用 UTF-8 编码进行存储时保存的是 `E4BDA0E5A5BD` 二进制值，而在解释这个二进制值时会按照 UTF-8 规则转换后得到 `4F60597D` ，然后根据 Unicode 编码表，最后获知这是中文字符 `你好` 。可使用该工具观察编码转换：[https://www.qqxiuzi.cn/bianma/Unicode-UTF.php](https://www.qqxiuzi.cn/bianma/Unicode-UTF.php)。
```
string([]byte{'\xe4', '\xbd', '\xa0', '\xe5', '\xa5', '\xbd'}) // 你好
string([]rune{'\u4F60', '\u597D'}) // 你好
```
<a name="8UcUS"></a>
#### 使用 dlv 调试 Go 程序
参考：[https://github.com/go-delve/delve/blob/master/Documentation/cli/expr.md](https://github.com/go-delve/delve/blob/master/Documentation/cli/expr.md)，[https://github.com/go-delve/delve/tree/master/Documentation/cli](https://github.com/go-delve/delve/tree/master/Documentation/cli)
```bash
// 安装 dlv
go get github.com/go-delve/delve/cmd/dlv
// 编译带有 Debug 信息的程序
CGO_ENABLED=0 go build -mod vendor -gcflags="all=-N -l" -o test main.go
// 带参数启动调试
dlv exec ./test -- --log-level debug --config conf/config.toml
// 查看文件路径
sources
// 通过文件名设置断点
b /home/xyc/Development/test/main.go:34
// 通过函数名设置断点
// 在函数入口处设置断点
b logic.getClusterInfo
// 在函数内第一行代码处设置断点
b logic.getClusterInfo:1 
// 打印当前执行环境的所有局部变量
locals
// 打印指定的变量
p tmpBytes
// []byte转换为字符串打印
p string(tmpBytes)
// 每次执行到断点 1 处自动执行某种操作
on 1 print tmpBytes
// 当满足某个条件时触发断点
condition 1 tmpTimes > 6
```
<br />
<a name="2EBTq"></a>
#### WebAssembly

1. 作者通过一系列 hack 过程成功实现了将一个 go 语言写的工具 [pdfcpu](https://github.com/pdfcpu/pdfcpu) 编译为 wasm 文件并运行在浏览器中，其中有使用到一个浏览器端基于内存的文件系统 [BrowserFS](https://github.com/jvilk/BrowserFS) （实现了 Node JS 的 fs 库的 API）对 pdf 文件进行操作，很有意思。博客地址：[https://dev.to/wcchoi/browser-side-pdf-processing-with-go-and-webassembly-13hn](https://dev.to/wcchoi/browser-side-pdf-processing-with-go-and-webassembly-13hn)，代码地址：[https://github.com/wcchoi/go-wasm-pdfcpu](https://github.com/wcchoi/go-wasm-pdfcpu)。
1. vugu 使用 go 实现的类似于 vue 的前端框架，用 go 替代 JavaScript 写逻辑：[https://github.com/vugu/vugu](https://github.com/vugu/vugu)。



<a name="1aiBl"></a>
#### 开源库

1. Linux 操作系统功能调用 [osutil](https://github.com/tredoe/osutil)， 可以用以生成 Linux 用户密码的 Hash。
1. 一个强大的请求限速库 [https://github.com/didip/tollbooth](https://github.com/didip/tollbooth)，可以根据请求头或者源 IP 限速。
1. Go 社区提供的实现了令牌桶算法的限速包 [https://godoc.org/golang.org/x/time/rate](https://godoc.org/golang.org/x/time/rate)，一个简单的例子 [https://pliutau.com/rate-limit-http-requests/](https://pliutau.com/rate-limit-http-requests/) 。
1. 一个创建和解压 zip 文件的库，在调用标准库 `archive/zip` 基础上做了些友好封装：[https://github.com/pierrre/archivefile](https://github.com/pierrre/archivefile)。
1. 一个 Markdown 转 PDF 的库，只是不支持中文字符：[https://github.com/mandolyte/mdtopdf](https://github.com/mandolyte/mdtopdf)。


<br />

<a name="cCStY"></a>
#### 书籍

1. 《Go 语言从入门到进阶实战》名字俗了点，但是内容还是值得一读，作者对 Go 语言的使用还是很熟练的。
1. 《Go 语言高级编程》 [https://github.com/chai2010/advanced-go-programming-book](https://github.com/chai2010/advanced-go-programming-book) rpc 相关的内容可以一读。
1. Concurrency in Go




