---
title: Go 知识点汇总
urlname: sfexfo
date: '2019-10-12 00:00:00 +0000'
layout: post
comments: true
categories: Go
tags:
  - Go
keywords: Go
description: 汇总对 Go 语言的基本理解、编程方法和开源库等。
abbrlink: defe85e8
updated: 2020-10-30 00:00:00
---

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

上述示例说明 slice 可以不进行初始化，在 append 调用中会自动创建底层数组分配空间，即所谓懒初始化。一般情况下， slice 可通过以下方式产生：
输入：

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

以上输出说明，整个过程中两个切片的底层数组仍然是同一个，这是因为切片复制完成的瞬间新切片和原切片的底层数组一定是同一个，之后随着 append 操作有可能会造成切片各自的底层数组发生变化，而这种变化并不是一定会出现，只有底层数组的容量不足以容纳新的元素时才会发生，而上面的输出结果表明，由于底层数组的容量仍然足以容纳新的元素，所以切片 append 操作后底层数组仍未变化，也就是说原切片和新切片之间仍然有可能相互影响。
下面的例子恰好是由于新切片 append 元素时底层数组不足以容纳新的元素造成底层数组的变化，之后两个切片再无关系：

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

综上，我们不能依靠拷贝切片之间的联系来获取排序后的元素值（除非是原地排序，不需要增加切片大小），即不能像 C 语言使用指针一样，而应当每次返回一个新的切片存储排好序的值。

#### 包导入过程

![image.png](https://cdn.nlark.com/yuque/0/2019/png/182657/1572858912878-86d89e2a-168b-43ad-9e9b-70068b16e723.png#align=left&display=inline&height=424&margin=%5Bobject%20Object%5D&name=image.png&originHeight=424&originWidth=953&size=146883&status=done&style=none&width=953)

#### godoc 与 go doc

从 go 1.12 开始， godoc 不再提供各种子命令，仅作为一个 http server 提供 GOPATH 和 GOROOT 下 pkg 的在线文档，而 go doc 命令可以用来查看本地程序的文档。

#### GOPRIVATE

从 go 1.13 开始，增加了  GOPRIVATE 环境变量的配置用以跳过对私有仓库的 checksum 检查：

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

#### json unmarshal 时会保留对象已有的值

结论：
json unmarshal 会忽略结构体中小写字母开头的字段；对同一对象执行多次 unmarshal 会覆盖与前一次 unmarshal 同名的字段，前一次 unmarshal 得到的非同名字段会被保留。示例如下：

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

#### json unmarshal 时传入什么类型的值

json.Unmarshal 的第二个参数必须是指针，且指针值不为 nil，但是指针可以指向一个值为 nil 的指针，此时 unmarshal 会自动分配对象并赋值给此值为 nil 的指针，unmarshal 得到的内容保存在该对象中，因此也支持目标结构体中含有指针类型字段。

```go
package main

import (
	"encoding/json"
	"fmt"
)

type Result struct {
	Foo *string `json:"foo"`
}

func main() {
	content := []byte(`{"foo": "bar"}`)
	var result1 Result
	err := json.Unmarshal(content, &result1) // this is fine
	fmt.Println(err)

	var result2 = new(Result)
	err = json.Unmarshal(content, result2) // and this
	fmt.Println(err)

	var result3 = &Result{}
	err = json.Unmarshal(content, result3) // this is also fine
	fmt.Println(err)

	var result4 *Result
	err = json.Unmarshal(content, result4) // err json: Unmarshal(nil *main.Result)
	fmt.Println(err)

	var result5 *Result
	err = json.Unmarshal(content, &result5) // this is fine, because unmarshal allocates a new value
	fmt.Println(err)
}
```

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

#### go 编译相关问题

etcd 编译时 GO 依赖包版本报错的解决方法: [https://aiops.red/archives/571](https://aiops.red/archives/571)
编译完成的程序在容器内运行时提示：`exec user process caused "no such file or directory"`，一般是因为程序编译时没有禁用 CGO :  `CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/csi-resizer ./cmd/csi-resizer/main.go `。
在已经指定使用 `-mod=vendor` 进行编译时仍提示  `build uk8s/uk8s-report: cannot load github.com/montanaflynn/stats: no Go source files`，可能是因为  `github.com/montanaflynn/stats` 是个 subemodule。

#### Unicode 字符编码

Unicode 定义了一种编码规则，为每个（语言或表情）符号指定了一个数值。而  UTF-8 是该编码规则在计算机上进行存储时的一种实现。在使用 UTF-8 进行编解码时依据的仍然是 Unicode 编码规则。参见  [字符编码笔记：ASCII，Unicode 和 UTF-8](http://www.ruanyifeng.com/blog/2007/10/ascii_unicode_and_utf-8.html)。在 Go 语言中，字符编码使用 UTF-8。在下述代码中，`你好` 在计算机中使用 UTF-8 编码进行存储时保存的是 `E4BDA0E5A5BD` 二进制值，而在解释这个二进制值时会按照 UTF-8 规则转换后得到 `4F60597D` ，然后根据 Unicode 编码表，最后获知这是中文字符 `你好` 。可使用该工具观察编码转换：[https://www.qqxiuzi.cn/bianma/Unicode-UTF.php](https://www.qqxiuzi.cn/bianma/Unicode-UTF.php)。

```
string([]byte{'\xe4', '\xbd', '\xa0', '\xe5', '\xa5', '\xbd'}) // 你好
string([]rune{'\u4F60', '\u597D'}) // 你好
```

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

#### 关于应用配置的思考

配置的最佳方式是使用环境变量，这是最符合 **_十二因素应用_** （Twelve-Factor App）的配置方式；但我们写程序时很多时候会考虑到不同的部署方式和配置方式，所以会有兼容命令行参数配置和配置文件（如 json/yaml ）的需求。使用  [github.com/spf13/viper](https://github.com/spf13/viper) 能够满足我们的需求（参考：[Reading Configuration Files and Environment Variables in GO ](https://medium.com/@bnprashanth256/reading-configuration-files-and-environment-variables-in-go-golang-c2607f912b63)），但是对于同一参数的不同配置方式的优先级如何安排需要考虑一下，一般而言配置文件作为静态数据我们认为其优先级最低，但环境变量和命令行参数谁的优先级更多似乎并无定论（在 viper 中可以确定的是环境变量的优先级高于配置文件，但命令行参数还未明确测试），我的考虑是命令行参数的优先级应当高于环境变量，因为命令参数属于更细粒度的控制参数，就像我们在使用常用的 Linux 工具一样，环境变量往往只设置一次且只设置诸如 Token 一类的短期不变且有一定安全需求的配置，而命令行参数则可能每次运行程序都会略作调整，所以命令行参数的优先级更高一些。基于此，结合 viper 库写一些辅助代码可以实现这个需求。
补充：后续在 viper 源代码中看到了，确实也是命令行参数的优先级更高，官方文档也有描述，如下
![image.png](https://cdn.nlark.com/yuque/0/2020/png/182657/1592419877483-67f0c574-00b4-4e50-9b21-801a6ee24604.png#align=left&display=inline&height=591&margin=%5Bobject%20Object%5D&name=image.png&originHeight=1182&originWidth=1918&size=270747&status=done&style=none&width=959)

#### 当结构体内嵌套的结构体字段重名时

```go
package main

import (
	"fmt"
)

type Test1 struct {
	Name string
}
type Test2 struct {
	Name string
}

type Test struct {
	Test1
	Test2
}

func main() {
	test := Test{}
	test.Test1.Name = "test1"
	test.Test2.Name = "test2"
	fmt.Println(test.Test1.Name)
	fmt.Println(test.Test2.Name)
//	以下代码报错： ambiguous selector test.Name
//	fmt.Println(test.Name)
}
```

#### panic 的过程与捕获

panic 会被层层向上传播，直到 main 函数；在其中每一个调用层级都可以使用 recover 去捕获，需要注意的是 recover 只能在 defer 中被调用（defer 正常在外围函数 return 后执行，因此有时可以用来修改函数的返回值），因为当程序出现 panic 时原有的执行逻辑会被打断（**特别要注意，recover 只能恢复上层调用者的后续执行，recover 所在外围函数的执行逻辑不能继续进行，外围函数此时返回值为返回类型的默认值即零值**），只有 defer 中的逻辑可以继续执行。当我们想要程序捕获 panic，然后仅打印日志信息后正常退出，仅仅使用 recover 是不够的，需要配合 os.Exit(0) 进行退出。
panic 只能被同一 goroutine 中的 recover 捕获。当在一个 goroutine 中发生 panic 时，会层层向上返回并执行各层调用中的 defer 逻辑，如果中途 panic 未被捕获，则一直返回到生成 goroutine 时调用的函数，并执行该函数中的 defer 逻辑，随后终止程序并报告错误。
参考：[https://blog.golang.org/defer-panic-and-recover](https://blog.golang.org/defer-panic-and-recover)，[https://medium.com/rungo/defer-panic-and-recover-in-go-689dfa7f8802](https://medium.com/rungo/defer-panic-and-recover-in-go-689dfa7f8802)，[https://yourbasic.org/golang/recover-from-panic/](https://yourbasic.org/golang/recover-from-panic/)，[https://stackoverflow.com/a/50409138](https://stackoverflow.com/a/50409138)

```go
package main

import (
	"fmt"
	"os"
)

func main() {
	defer func() {
		fmt.Println("end of main") // push the call to the stack
        // 注意，如果注释掉下面一行代码则程序退出码仍然为非 0 ，有可能是 2
        // 在使用 k8s 部署程序的时候，我们可能想要捕获所有的异常，只有对于可重入的异常我们才允许退出码为非 0 ，从而通过 Job Controller 自动重试
        // 对于非可重入的异常则打印日志信息后作为正常程序退出
		os.Exit(0)
	}()
	fmt.Println("begining of main")
	panic("stop here")
	// the deffered functions are called as if they are here
}
```

#### TeeReader

`TeeReader(r Reader, w Writer) Reader` 提供了复制 Reader 的能力。一般无法从 Reader 中重复读取数据，一次读取完成则 Reader 会被清空，而 TeeReader 可以包装原始 Reader 后返回一个特殊的 Reader，在对该特殊 Reader 进行读取的同时，将成功读到的内容复制写入 Writer 中。我们可以使用 bytes.Buffer 作为 Writer，由于 bytes.Buffer 同时也实现了 Reader 接口，所以可以再次从中读取原始 Reader 的内容。

```go
func main() {
	r := strings.NewReader("some io.Reader stream to be read\n")
	var buf bytes.Buffer
	tee := io.TeeReader(r, &buf)

	printall := func(r io.Reader) {
		b, err := ioutil.ReadAll(r)
		if err != nil {
			log.Fatal(err)
		}

		fmt.Printf("%s", b)
	}

	printall(tee)
	printall(&buf)

}
```

#### h2c/h2

虽然 HTTP/2 协议本身和 TLS 协议并无绑定关系，但现在的很多反向代理工具仅支持在 HTTPS 模式下使用 HTTP/2，而在 Go 语言扩展库 `golang.org/x/net/http2` 的实现中，构建 HTTP/2 服务端也必须传入 TLS 配置，否则 HTTP/2 服务端将退化为只支持 HTTP/1.x 的协议，如下：

```go
import (
    "fmt"
    "html"
    "net/http"

    "golang.org/x/net/http2"
)

func main() {
    var server http.Server
    http2.VerboseLogs = true
    server.Addr = ":8080"
    http2.ConfigureServer(&server, &http2.Server{})
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "URL: %q\n", html.EscapeString(r.URL.Path))
        ShowRequestInfoHandler(w, r)
    })

    server.ListenAndServe() //不启用 https 则默认只支持http1.x
    //log.Fatal(server.ListenAndServeTLS("localhost.cert", "localhost.key"))
}
func ShowRequestInfoHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/plain")
    fmt.Fprintf(w, "Method: %s\n", r.Method)
    fmt.Fprintf(w, "Protocol: %s\n", r.Proto)
    fmt.Fprintf(w, "Host: %s\n", r.Host)
    fmt.Fprintf(w, "RemoteAddr: %s\n", r.RemoteAddr)
    fmt.Fprintf(w, "RequestURI: %q\n", r.RequestURI)
    fmt.Fprintf(w, "URL: %#v\n", r.URL)
    fmt.Fprintf(w, "Body.ContentLength: %d (-1 means unknown)\n", r.ContentLength)
    fmt.Fprintf(w, "Close: %v (relevant for HTTP/1 only)\n", r.Close)
    fmt.Fprintf(w, "TLS: %#v\n", r.TLS)
    fmt.Fprintf(w, "\nHeaders:\n")
    r.Header.Write(w)
}
```

HTTP/2 客户端可通过启用 AllowHTTP 选项和更改 DialTLS 逻辑实现无需 TLS 的 HTTP/2 请求传输，但由于服务端存在问题，仅仅调整了客户端仍无法工作，以下客户端的请求会导致服务端向客户端响应一个 HTTP/1.1 的请求同时关闭 TCP 连接：

```go
package main

import (
    "crypto/tls"
    "fmt"
    "io/ioutil"
    "log"
    "net"
    "net/http"

    "golang.org/x/net/http2"
)

func main() {
    url := "http://localhost:8080/"
    client(url)
}

func client(url string) {
    log.SetFlags(log.Llongfile)
    tr := &http2.Transport{ //可惜服务端 退化成了 http1.x
        AllowHTTP: true, //充许非加密的链接
        // TLSClientConfig: &tls.Config{
        //     InsecureSkipVerify: true,
        // },
        DialTLS: func(netw, addr string, cfg *tls.Config) (net.Conn, error) {
            return net.Dial(netw, addr)
        },
    }

    httpClient := http.Client{Transport: tr}

    resp, err := httpClient.Get(url)
    if err != nil {
        log.Fatal(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        fmt.Println("resp StatusCode:", resp.StatusCode)
        return
    }

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("resp.Body:\n", string(body))
}
```

这是因为客户端发送了 HTTP/2 的请求，而服务端已退化为仅支持 HTTP/1.x。 一种自然而然的做法是改造服务端使其支持无需 TLS 的 HTTP/2 传输，使用 h2c 是可行的解决方案：

```go
package main
import (
	"fmt"
	"log"
	"net/http"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)
func main() {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "Hello world")
	})
	h2s := &http2.Server{
        IdleTimeout: 1 * time.Minute,
	}
	h1s := &http.Server{
		Addr: ":8972",
		Handler: h2c.NewHandler(handler, h2s),
	}
	log.Fatal(h1s.ListenAndServe())
}
```

上述方案的特点是同时支持 HTTP/2 和 HTTP/1.x ，对于客户端来说，可以有三种可能：仅通过 HTTP/1.1 通信；先通过 HTTP/1.1 建立连接，再通过升级协议升级至 HTTP/2；一开始就通过 HTTP/2 建立连接。如果我们本身不需要 HTTP/1.x ，则有更直接的写法：

```go
package main
import (
	"fmt"
	"log"
	"net/http"
	"golang.org/x/net/http2"
)
func main() {
    server := http2.Server{}
    l, err := net.Listen("tcp", "0.0.0.0:1010")
	if err != nil {
		level.Error(logger).Log("msg", fmt.Sprintf("start listen failed: %v", err))
		os.Exit(1)
	}
	defer l.Close()

    fmt.Printf("Listening [0.0.0.0:1010]...\n")
    for {
        conn, err := l.Accept()
		if err != nil {
			level.Warn(logger).Log("msg", fmt.Sprintf("accept a new connection failed: %v", err))
			continue
		}
        go server.ServeConn(conn, &http2.ServeConnOpts{
            Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                fmt.Fprintf(w, "Hello, %v, http: %v", r.URL.Path, r.TLS == nil)
            }),
        })
    }
}
```

#### HTTP/1.1 Keep-Alive

Go 标准库 net/http 提供的 http.DefaultClient 默认启用了 Keep-Alive，但想要真正复用 TCP 连接，还要在处理请求时注意及时关闭 Response Body，如下：

```go
resp, err := http.Post("https://api.some-web.com/v2/events", "application/json", bytes.NewBuffer(eventJson))
if err != nil {
	log.Println("err", err)
	return defaultErrStatus, err
}
// 在 Go 1.7 之前需要手动在关闭之前将 Body 中的内容读完，1.7 以后调用 Body.Close() 时会自动处理
// io.Copy(ioutil.Discard, resp.Body)
// 只有及时关闭 response.Body 才能有效复用 TCP 连接
// Go 语言标准库已经确保 resp.Body 不会是 nil，即使并没有数据从对端返回
defer resp.Body.Close()
```

#### errors after go 1.13

```go
# 使用 fmt.Errorf %w 格式化 可以返回一个 wrap 后的 error
# 使用 errors.Is 和 errors.As 均是遍历错误链，调用 Unwrap 方法
package main

import (
	"errors"
	"fmt"
)

type MyError struct {
	msg string
}

func (e *MyError) Error() string {
	return e.msg
}

var generalErr = &MyError{
	msg: "general error",
}

func main() {
	err := fmt.Errorf("this is new error: %w", generalErr)
	fmt.Printf("%#v\n", err)
	if errors.Is(err, generalErr) {
		fmt.Println("this is a wrapped generalErr")
		fmt.Printf("%#v\n", generalErr)
	}
	var myError *MyError
	if errors.As(err, &myError) {
		fmt.Println(`this is an error with type "MyError"`)
		fmt.Printf("%#v\n", myError)
	}
}
```

以上代码输出如下：

```
&fmt.wrapError{msg:"this is new error: general error", err:(*main.MyError)(0x564880)}
this is a wrapped generalErr
&main.MyError{msg:"general error"}
this is an error with type "MyError"
&main.MyError{msg:"general error"}
```

应当何时对错误进行 wrap

```go
# 如下定义的一个全局变量可视为一个哨兵错误，如果调用方需要依据错误类型进行分类错误处理，则应当对错误进行 wrap，否则出于隐藏底层细节的需要不应 wrap
var ErrPermission = errors.New("permission denied")
// DoSomething returns an error wrapping ErrPermission if the user
// does not have permission to do something.
func DoSomething() error {
    if !userHasPermission() {
        // If we return ErrPermission directly, callers might come
        // to depend on the exact error value, writing code like this:
        //
        //     if err := pkg.DoSomething(); err == pkg.ErrPermission { … }
        //
        // This will cause problems if we want to add additional
        // context to the error in the future. To avoid this, we
        // return an error wrapping the sentinel so that users must
        // always unwrap it:
        //
        //     if err := pkg.DoSomething(); errors.Is(err, pkg.ErrPermission) { ... }
        return fmt.Errorf("%w", ErrPermission)
    }
}
```

#### WebAssembly

1. 作者通过一系列 hack 过程成功实现了将一个 go 语言写的工具 [pdfcpu](https://github.com/pdfcpu/pdfcpu)  编译为  wasm 文件并运行在浏览器中，其中有使用到一个浏览器端基于内存的文件系统 [BrowserFS](https://github.com/jvilk/BrowserFS) （实现了 Node JS 的 fs 库的 API）对 pdf 文件进行操作，很有意思。博客地址：[https://dev.to/wcchoi/browser-side-pdf-processing-with-go-and-webassembly-13hn](https://dev.to/wcchoi/browser-side-pdf-processing-with-go-and-webassembly-13hn)，代码地址：[https://github.com/wcchoi/go-wasm-pdfcpu](https://github.com/wcchoi/go-wasm-pdfcpu)。
2. vugu 使用 go 实现的类似于 vue 的前端框架，用 go 替代 JavaScript 写逻辑：[https://github.com/vugu/vugu](https://github.com/vugu/vugu)。

#### TCP 与 UDP 编程

参考：[https://www.linode.com/docs/development/go/developing-udp-and-tcp-clients-and-servers-in-go/](https://www.linode.com/docs/development/go/developing-udp-and-tcp-clients-and-servers-in-go/)

#### context 用法

参考：[https://www.sohamkamani.com/golang/2018-06-17-golang-using-context-cancellation/](https://www.sohamkamani.com/golang/2018-06-17-golang-using-context-cancellation/)

#### Linux 伪终端用法

参考：[https://www.jianshu.com/p/11c01003211b](https://www.jianshu.com/p/11c01003211b)

#### channel 引发资源泄漏

channel 引发资源泄漏的场景是： goroutine 操作 channel 后，处于发送或接收阻塞状态，而 channel 处于满或空的状态，一直得不到改变。同时，垃圾回收器也不会回收此类资源，进而导致 gouroutine 会一直处于等待队列中。
另外，程序运行过程中，对于一个 channel，如果没有任何 goroutine 引用了，gc 会对其进行回收操作，不会引起内存泄漏，所以在多生产者多消费者通过一个 channel 进行通信时，可以通过一个中间的信号 channel 停止发送和接收而不去关闭数据 channel，而由 gc 回收数据 channel，从而避免无法确定何时关闭 channel 而造成多次关闭同一 channel 引发 panic。

#### 操作 channel panic

发生 panic 的情况有三种：向一个关闭的 channel 进行写操作；关闭一个 nil 的 channel；重复关闭一个 channel。读、写一个 nil channel 都会被阻塞。

#### 结构体作为 map 的 key

当结构体的成员都是可以判等时（使用 == ），该结构体也可以判等（结构体所有字段的值相等时两个结构体视为相等），就可以作为 map 的 key ，否则就不可以。下述程序中，a1 和 a2 可判等且相等，a3 和 a4 不可判等，程序无法通过编译。

```
package main

import "fmt"

type Test1 struct {
	Name  string
	Value int
}

type Test2 struct {
	Name    string
	Value   int
	Handler func() error
}

func main() {
	a1 := Test1{
		Name:  "a1",
		Value: 0,
	}
	a2 := Test1{
		Name:  "a1",
		Value: 0,
	}
	fmt.Println(a1 == a2)
	a3 := Test2{
		Name:  "a1",
		Value: 0,
	}
	a4 := Test2{
		Name:  "a1",
		Value: 0,
	}
	fmt.Println(a3 == a4)
}
```

#### &^ 操作符

此运算符是双目运算符，按位计算，将运算符左边数据相异的位保留，相同位清零。其特点是：① 如果右侧是 0 ，则左侧数保持不变；② 如果右侧是 1 ，则左侧数一定清零；③ 功能同 a&(^b) 相同。

#### Go 内存垃圾回收的触发条件

从上次垃圾回收结束到现在时间已经超过两分钟则触发垃圾回收；从上次垃圾回收到现在堆内存增长了 100% 后触发回收，该比例可通过 GOGC 调整。

#### 基于信号的抢占

每个 M 新建时都会监听 SIGURG 信号，用于接收抢占信号。

#### 开源库

1. Linux 操作系统功能调用  [osutil](https://github.com/tredoe/osutil)， 可以用以生成 Linux 用户密码的 Hash。
2. 一个强大的请求限速库  [https://github.com/didip/tollbooth](https://github.com/didip/tollbooth)，可以根据请求头或者源 IP 限速。
3. Go 社区提供的实现了令牌桶算法的限速包  [https://godoc.org/golang.org/x/time/rate](https://godoc.org/golang.org/x/time/rate)，一个简单的例子  [https://pliutau.com/rate-limit-http-requests/](https://pliutau.com/rate-limit-http-requests/) 。
4. 一个创建和解压 zip 文件的库，在调用标准库 `archive/zip`  基础上做了些友好封装：[https://github.com/pierrre/archivefile](https://github.com/pierrre/archivefile)。
5. 一个 Markdown 转 PDF 的库，只是不支持中文字符：[https://github.com/mandolyte/mdtopdf](https://github.com/mandolyte/mdtopdf)。
6. 可以从文件中加载环境变量的库  [github.com/joho/godotenv](https://github.com/joho/godotenv) ，不过使用 [github.com/spf13/viper](https://github.com/spf13/viper) 可能更佳，参考：[https://levelup.gitconnected.com/a-no-nonsense-guide-to-environment-variables-in-go-55d7661f09b0](https://levelup.gitconnected.com/a-no-nonsense-guide-to-environment-variables-in-go-55d7661f09b0)，[https://towardsdatascience.com/use-environment-variable-in-your-next-golang-project-39e17c3aaa66](https://towardsdatascience.com/use-environment-variable-in-your-next-golang-project-39e17c3aaa66)。
7. 获取文件系统事件通知：[https://github.com/fsnotify/fsnotify](https://github.com/fsnotify/fsnotify)。
8. 获取内核事件：[https://github.com/euank/go-kmsg-parser/](https://github.com/euank/go-kmsg-parser/)。

#### 参考资料

1. [HTTP/2 Cleartext (H2C) golang example](https://github.com/thrawn01/h2c-golang-example)
2. [https://mrwaggel.be/post/golang-transfer-a-file-over-a-tcp-socket/](https://mrwaggel.be/post/golang-transfer-a-file-over-a-tcp-socket/)
3. [http://networkbit.ch/golang-ssh-client/#multiple_commands](http://networkbit.ch/golang-ssh-client/#multiple_commands)

#### 书籍

1. 《Go 语言从入门到进阶实战》名字俗了点，但是内容还是值得一读，作者对 Go 语言的使用还是很熟练的。
2. 《Go 语言高级编程》 [https://github.com/chai2010/advanced-go-programming-book](https://github.com/chai2010/advanced-go-programming-book) rpc 相关的内容可以一读。
3. Concurrency in Go

[Concurrency in Go.pdf](https://www.yuque.com/attachments/yuque/0/2019/pdf/182657/1571297377193-45707879-2de2-41bf-930f-47146ce64c1b.pdf)

4. [Network-Programming-with-Go](https://tumregels.github.io/Network-Programming-with-Go/)
