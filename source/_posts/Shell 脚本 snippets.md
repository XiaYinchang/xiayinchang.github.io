---
title: Shell 脚本 snippets
urlname: ggzq6c
date: '2021-01-16 00:00:00 +0000'
layout: post
comments: true
categories: linux
tags:
  - linux
  - shell
keywords: shell
description: Shell 脚本 snippets。
abbrlink: d2d8a73b
updated: 2021-01-19 00:00:00
---

#### 重试逻辑

参考：[https://unix.stackexchange.com/q/82598](https://unix.stackexchange.com/q/82598)

```bash
n=0
until [ "$n" -ge 5 ]
do
   command && break  # substitute your command here
   n=$((n+1))
   sleep 15
done
# 或者
# command 退出码为 0 则为 true 继续执行 break 而不会执行 sleep
for i in {1..5}; do command && break || sleep 15; done
# 或者写成函数
function fail {
  echo $1 >&2
  exit 1
}

function retry {
  local n=1
  local max=5
  local delay=15
  while true; do
    "$@" && break || {
      if [[ $n -lt $max ]]; then
        ((n++))
        echo "Command failed. Attempt $n/$max:"
        sleep $delay;
      else
        fail "The command has failed after $n attempts."
      fi
    }
  done
}

retry ping invalidserver
```

#### 检查环境变量是否设置

```bash
# -z 检查目标变量值长度是否为零
if [[ -z "${DEPLOY_ENV}" ]]; then
  MY_SCRIPT_VARIABLE="Some default value because DEPLOY_ENV is undefined"
else
  MY_SCRIPT_VARIABLE="${DEPLOY_ENV}"
fi

# or using a short-hand version

[[ -z "${DEPLOY_ENV}" ]] && MyVar='default' || MyVar="${DEPLOY_ENV}"

# or even shorter use

MyVar="${DEPLOY_ENV:-default_value}"
```

#### 让脚本执行更安全

```bash
set -euxo pipefail
# 默认情况下某行命令执行出错后脚本会继续执行
# set -e 使脚本执行出错则立即退出，不再执行后续命令， 如果想阻止命令执行失败退出，则可以在命令后增加 || true
invalid_cmd || true
# 默认对于管道连接的多个命令只要最后一个执行成功则就认为执行成功
# set -o pipefail 则会检查管道连接的所有的命令，只有所有命令都执行成功才算成功
invalid_cmd | echo "true"  # 默认该行命令被视为成功执行，设置 pipefail 则被视为失败
# 变量未设置时，默认为空值，引用不会报错
# set -u 让引用未设置的变量立即报错
# set -x 会在执行每条命令前先将其打印出来
```

#### 使用临时目录

```bash
#!/bin/bash
# 创建临时目录并在脚本执行结束或中断时清理临时目录
# the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# the temp directory used, within $DIR
# omit the -p parameter to create a temporal directory in the default location
# -t 按指定格式命名文件夹
WORK_DIR=`mktemp -d -p "$DIR" -t test.XXXX`

# check if tmp dir was created
if [[ ! "$WORK_DIR" || ! -d "$WORK_DIR" ]]; then
  echo "Could not create temp dir"
  exit 1
fi

# deletes the temp directory
function cleanup {
  rm -rf "$WORK_DIR"
  echo "Deleted temp working directory $WORK_DIR"
}

# register the cleanup function to be called on the EXIT signal
trap cleanup EXIT

# implementation of script starts here
...
```

#### 输出重定向

& 是一个描述符，如果 1 或 2 前不加&，会被当成一个普通文件。
1>&2 意思是把标准输出重定向到标准错误。
2>&1 意思是把标准错误输出重定向到标准输出。
&>filename 意思是把标准输出和标准错误输出都重定向到文件 filename 中。

#### && 与 ||

利用 && 与 || 可以节省一些 if 判断，在一行语句中完成不同情况的处理。

```bash
# 当且仅当 command1 的退出码为 0 时，command2 才会执行
command1 && command2
# 当且仅当 command1 的退出码不为 0 时， command2 才会执行
command1 || command2
# 如下是示例， true 的作用是返回退出码 0 ， false 的作用是返回退出码 1
[me@linuxbox]$ true || echo "echo executed"
[me@linuxbox]$ false || echo "echo executed"
echo executed
[me@linuxbox]$ true && echo "echo executed"
echo executed
[me@linuxbox]$ false && echo "echo executed"
[me@linuxbox]$
# 如下是应用，在打开目录失败时输出错误信息并退出，打开成功则继续执行
cd "$some_directory" || error_exit "Cannot change directory! Aborting"
rm *
# 或者
cd "$some_directory" && rm ./*
```

#### 错误处理

参考：[https://stackoverflow.com/a/185900](https://stackoverflow.com/a/185900)

```bash
# 以下逻辑在某行命令执行后退出码非 0 时打印错误并退出
# 在脚本退出码为 0 时清理临时目录
tempfiles=( )
cleanup() {
  rm -f "${tempfiles[@]}"
}
trap cleanup 0

error() {
  local parent_lineno="$1"
  local message="$2"
  local code="${3:-1}"
  if [[ -n "$message" ]] ; then
    echo "Error on or near line ${parent_lineno}: ${message}; exiting with status ${code}"
  else
    echo "Error on or near line ${parent_lineno}; exiting with status ${code}"
  fi
  exit "${code}"
}
trap 'error ${LINENO}' ERR
# 手动触发方式
error ${LINENO} "the foobar failed" 2
```

#### for 循环指定次数

```bash
for i in {1..200}; do
  dosomething
done
```

#### `set -e` 出现非零返回值立即退出

```bash
set -e： 执行的时候如果出现了返回值为非零，整个脚本就会立即退出
set +e： 执行的时候如果出现了返回值为非零将会继续执行下面的脚本

set -e 命令用法总结如下：
1. 当命令的返回值为非零状态时，则立即退出脚本的执行。
2. 作用范围只限于脚本执行的当前进行，不作用于其创建的子进程（https://blog.csdn.net/fc34235/article/details/76598448 ）。
3. 另外，当想根据命令执行的返回值，输出对应的log时，最好不要采用set -e选项，而是通过配合exit 命令来达到输出log并退出执行的目的。
```

#### 设置工作目录

```
#!/bin/bash
cd "$(dirname "$0")"
```

#### 捕捉信号并处理

```bash
#!/bin/bash
exit_script() {
    echo "Printing something special!"
    echo "Maybe executing other commands!"
    trap - SIGINT SIGTERM # clear the trap
    kill -- -$$ # Sends SIGTERM to child/sub processes
}

trap exit_script SIGINT SIGTERM

echo "Some other text"
#other commands here
sleep infinity
```

#### shell 脚本语法校验

参考：[https://stackoverflow.com/questions/171924/how-do-i-syntax-check-a-bash-script-without-running-it](https://stackoverflow.com/questions/171924/how-do-i-syntax-check-a-bash-script-without-running-it)

```bash
bash -n tmp.sh
// 或者安装 shellcheck 工具
shellcheck tmp.sh
```

#### 带超时的循环

参考：[https://stackoverflow.com/questions/27555727/timeouting-a-while-loop-in-linux-shell-script](https://stackoverflow.com/questions/27555727/timeouting-a-while-loop-in-linux-shell-script)

```bash
timeout 5 bash -c -- 'while true; do printf ".";done'
```

#### 打印带日期的日志

参考：[https://serverfault.com/a/310099](https://serverfault.com/a/310099),[https://stackoverflow.com/a/1705761](https://stackoverflow.com/a/1705761)

```bash
echo $(date -u) "Some message or other"
```
