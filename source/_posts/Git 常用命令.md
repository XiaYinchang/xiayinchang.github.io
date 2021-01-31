---
title: Git 常用命令
urlname: vz3l55
date: '2020-04-21 00:00:00 +0000'
layout: post
categories: 开发工具
tags:
  - Linux
  - 开发工具
keywords: Git
description: Git 常用命令记录。
abbrlink: 5fddf106
updated: 2020-08-18 00:00:00
---

#### 修改历史 commit 信息

```
git rebase -i HEAD~2
pick -> edit
git commit --amend
git rebase --continue
```

#### 修改 commit 时间

```
# 设置为当前时间
GIT_COMMITTER_DATE="$(date '+%Y-%m-%d %H:%M:%S')" git commit --amend --no-edit --date "$(date)"
# 设置为指定时间
GIT_COMMITTER_DATE="Mon 20 Aug 2018 20:19:19 BST" git commit --amend --no-edit --date "Mon 20 Aug 2018 20:19:19 BST"
```

#### 比较两个分支的不同

```
git diff branch_1..branch_2
```

#### 列出不同分支之间的所有 commit

```bash
git log --left-right --cherry-pick --oneline v1.14.6..v1.14.10
```

#### 比较两个分支中指定文件或目录

```bash
git diff mybranch master -- myfile.cs
```

#### merge 时使用指定方代码解决冲突

```go
git merge -X theirs origin/dev
git merge -X ours origin/dev
```

#### 查看一个文件完整的修改历史

```
git log --follow -p -- _config.yml
```

#### 将当前分支下子目录内容提交至另一个分支

```
git subtree push --prefix dist origin gh-pages
```

#### 删除 submodule

```
git submodule deinit <path_to_submodule>
git rm <path_to_submodule>
git commit -m "Removed submodule "
```

#### 合并所有 commit 为一个

```
git rebase --root -i
// 使用以下命令可以将需要 rebase 的 commit 的时间全部设置为当前时间
git rebase --ignore-date 303a824f46b497f71582e2e5d493c132b85e3e0a
```

#### 删除所有没有远程分支的本地分支

```
git fetch -p && git branch -vv | awk '/: gone]/{print $1}' | xargs git branch -d
```

#### 撤销某个 commit

```
git revert --strategy resolve <commit>
```

#### 使用 ssh 替代 https 访问

```bash
git config --global url."git@git.ucloudadmin.com:".insteadOf "https://git.ucloudadmin.com/"
```

#### 查看 commit 内容

查看指定 commit id 的提交内容

```yaml
git show 67cebafce9c45a1d65fddd3d1742c4cb42851d10
```

查看最近 n 次提交内容

```yaml
git log -p -n 1
```

#### 创建和删除 tag

```bash
// 删除本地 tag
git tag -d v0.0.1
// 删除远程仓库 tag
git push --delete origin v0.0.1
// 创建本地 tag
git tag v0.0.1 -m "Release version 0.0.1"
// 以某个 commit 为基础创建 tag
git tag -a v0.0.1 30728cab -m "Release version 0.0.1"
// 推送指定 tag 到远程
git push origin v0.0.1
// 推送所有 tag 到远程
git push --tags
```

#### 获取最近的 tag

```bash
// 获取最新的 tag
git describe --tags $(git rev-list --tags --max-count=1)
// 获取最新 commit 对应的 tag
git describe --abbrev=0
git describe --tags
```

#### 创建和应用 patch

```bash
// 生成 git patch
git diff c78bca..709fcfe > /tmp/cloudprovider.patch
// 应用 patch
git apply /tmp/cloudprovider.patch
```

#### gitlab 创建 tag 和发布附件流程

参考：[https://stackoverflow.com/a/55415383](https://stackoverflow.com/a/55415383)

#### cherry-pick 时移除不需要的修改

参考：[https://stackoverflow.com/questions/5717026/how-to-git-cherry-pick-only-changes-to-certain-files](https://stackoverflow.com/questions/5717026/how-to-git-cherry-pick-only-changes-to-certain-files)
如果需要移除的修改较少，可使用以下方式：

```
git cherry-pick -n 1683355bf81435ffdcbf332ad3558cb92853c9eb
// 丢弃该 commit 对 go.mod 文件的修改
git restore --staged go.mod
// 或者
git checkout HEAD go.mod
// 直接提交即可, commit 信息使用上述 commit 的
git commit
```

如果大部分修改都需要移除，可采用：

```
git cherry-pick -n 1683355bf81435ffdcbf332ad3558cb92853c9eb
git reset HEAD
// 添加需要保留的修改
git add <path>
// 移除所有不需要保存的修改
git clean -f
```

如果仅有一两项文件或目录的修改需要保留，可执行：

```
// 应用对文件或目录下文件的修改
git show SHA -- file1.txt file2.txt | git apply -
git show SHA -- dir1 dir2 | git apply -
// 保存修改
git add file1.txt file2.txt
git commit -c SHA
// 或者二合一
git show SHA -- file1.txt file2.txt | git apply --cached -
```

#### 使用指定 commit 中的内容覆盖指定文件或目录

```bash
git checkout c5f567 -- file1/to/restore file2/to/restore
```

#### github actions

- 自动创建发布：[https://github.com/actions/upload-release-asset](https://github.com/actions/upload-release-asset)

#### clone all projects in group

[https://github.com/gabrie30/ghorg](https://github.com/gabrie30/ghorg)
