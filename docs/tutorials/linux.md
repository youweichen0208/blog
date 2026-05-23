---
lang: zh-CN
title: Linux 高频命令
description: 记录日常排查端口、进程和网络连接时最常用的 Linux/macOS 命令。
date: 2026-04-15
tags:
  - Linux
---

# Linux 高频命令

## 介绍

在Unix系统中，“一切皆文件”，网络连接也被视为一种打开的文件。加上`-i`参数后，`lsof`就专门筛选**网络相关的文件（即网络连接）**。

### lsof

`lsof`是Linux/macOS上一个很实用的命令，全称是List Open Files（列出打开的文件）。

```bash
lsof -i [协议]@[主机]:[端口]
```

**e.g.**

1. `lsof -i :18789`**列出所有正在使用18789端口的进程**。它会告诉你哪个程序占用了这个端口，进程ID是多少，连接状态是什么(LISTEN, ESTABLISH等)。

2. 当有两个同样的进程在一个端口 混淆，如何解决

step 1: lsof -i :18789
![lsof 命令输出](/images/posts/2026/05/2026-05-23-screenshot.png)

这个目前混淆进程就是node 18653

step 2: kill 18653

step 3: 再检查一次 `lsof -i :18789`
补充：如果它还在，再强制杀掉`kill -9 18653`
