
---

title: Go 知识点汇总

urlname: sfexfo

date: 2019-10-12 00:00:00 +0800

layout: post

comments: true

categories: Go

tags: [Go]

keywords: Go

description: 汇总对 Go 语言的基本理解、编程方法和开源库等。

---

<a name="YEnn3"></a>
### 基本理解
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

<a name="IWVp8"></a>
#### 包导入过程
![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1572858912878-86d89e2a-168b-43ad-9e9b-70068b16e723.png#align=left&display=inline&height=424&name=image.png&originHeight=424&originWidth=953&search=&size=146883&status=done&width=953)
<a name="ifRex"></a>
#### godoc 与 go doc
从 go 1.12 开始， godoc 不再提供各种子命令，仅作为一个 http server 提供 GOPATH 和 GOROOT 下 pkg 的在线文档，而 go doc 命令可以用来查看本地程序的文档。

<a name="EA3XH"></a>
### 编程方法
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
也就是说使用 `os.Stat` 无法确定文件是否存在，因此写入文件时先使用 `os.Stat` 判断文件是否存在，不存在时则使用 `os.Create` 创建文件的写法是错误的（尽管大多数时候能够成功写入）。正确的写入文件的方法是 `os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0666)` ，这个函数通过 sys_openat 系统调用依据传入的 Flag 打开文件，如果文件不存在则创建，如果文件存在则直接打开，使用这个函数的另一个好处是不会产生竞争条件（即使另外一个操作正在创建该文件？），参见 [https://stackoverflow.com/questions/12518876/how-to-check-if-a-file-exists-in-go](https://stackoverflow.com/questions/12518876/how-to-check-if-a-file-exists-in-go) 中的一系列回答和讨论。<br />另一种选择是使用 `ioutil.WriteFile()` ，其内部同样是调用了 `os.OpenFile`，只不过只适用于一次性全量写入。

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
关于 Template 的使用可以参考：[https://github.com/grpc-ecosystem/grpc-gateway/blob/master/protoc-gen-grpc-gateway/gengateway/template.go](https://github.com/grpc-ecosystem/grpc-gateway/blob/master/protoc-gen-grpc-gateway/gengateway/template.go)

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

<a name="utDk1"></a>
### WebAssembly

1. 作者通过一系列 hack 过程成功实现了将一个 go 语言写的工具 [pdfcpu](https://github.com/pdfcpu/pdfcpu) 编译为 wasm 文件并运行在浏览器中，其中有使用到一个浏览器端基于内存的文件系统 [BrowserFS](https://github.com/jvilk/BrowserFS) （实现了 Node JS 的 fs 库的 API）对 pdf 文件进行操作，很有意思。博客地址：[https://dev.to/wcchoi/browser-side-pdf-processing-with-go-and-webassembly-13hn](https://dev.to/wcchoi/browser-side-pdf-processing-with-go-and-webassembly-13hn)，代码地址：[https://github.com/wcchoi/go-wasm-pdfcpu](https://github.com/wcchoi/go-wasm-pdfcpu)。
1. vugu 使用 go 实现的类似于 vue 的前端框架，用 go 替代 JavaScript 写逻辑：[https://github.com/vugu/vugu](https://github.com/vugu/vugu)。

<a name="ttykc"></a>
### 开源库

1. Linux 操作系统功能调用 [osutil](https://github.com/tredoe/osutil)， 可以用以生成 Linux 用户密码的 Hash。
1. 一个强大的请求限速库 [https://github.com/didip/tollbooth](https://github.com/didip/tollbooth)，可以根据请求头或者源 IP 限速。
1. Go 社区提供的实现了令牌桶算法的限速包 [https://godoc.org/golang.org/x/time/rate](https://godoc.org/golang.org/x/time/rate)，一个简单的例子 [https://pliutau.com/rate-limit-http-requests/](https://pliutau.com/rate-limit-http-requests/) 。
1. 一个创建和解压 zip 文件的库，在调用标准库 `archive/zip` 基础上做了些友好封装：[https://github.com/pierrre/archivefile](https://github.com/pierrre/archivefile)。
1. 一个 Markdown 转 PDF 的库，只是不支持中文字符：[https://github.com/mandolyte/mdtopdf](https://github.com/mandolyte/mdtopdf)。
<a name="8GqY0"></a>
### 
<a name="ymvvh"></a>
### 书籍

1. 《Go 语言从入门到进阶实战》名字俗了点，但是内容还是值得一读，作者对 Go 语言的使用还是很熟练的。
1. 《Go 语言高级编程》 [https://github.com/chai2010/advanced-go-programming-book](https://github.com/chai2010/advanced-go-programming-book) rpc 相关的内容可以一读。
1. Concurrency in Go


