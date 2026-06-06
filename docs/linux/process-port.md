---
lang: zh-CN
title: 进程与端口排查
description: lsof、ps、kill 的核心用法，端口占用排查流程与常见场景处理。
date: 2026-06-06
tags:
  - Linux
  - 进程管理
  - 端口
  - lsof
---

# 进程与端口排查

在 Unix 系统中，"一切皆文件"，网络连接也被视为一种打开的文件。排查进程和端口占用是日常运维的基础操作。

## 核心流程

```
端口被占用 → lsof 找到进程 → ps 确认详情 → kill 结束进程
```

## lsof：列出打开的文件

`lsof`（List Open Files）是 Linux/macOS 上专门查看打开文件的命令。加上 `-i` 参数后，可以专门筛选**网络相关的文件（即网络连接）**。

### 基本语法

```bash
lsof -i [协议]@[主机]:[端口]
```

### 常用场景

#### 1. 查看谁占用了某个端口

```bash
lsof -i :8080
```

输出示例：

```
COMMAND   PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    18653  alice   21u  IPv4 0x1234      0t0  TCP *:http-alt (LISTEN)
```

关键字段：
- `COMMAND`：进程名称
- `PID`：进程 ID（kill 时用）
- `USER`：运行用户
- `FD`：文件描述符（21u 表示第 21 个文件，u 表示 update 模式）
- `TYPE`：IPv4/IPv6
- `NAME`：连接状态（LISTEN、ESTABLISHED 等）

#### 2. 查看所有网络连接

```bash
lsof -i
```

#### 3. 只看 TCP 或 UDP

```bash
lsof -i tcp
lsof -i udp
```

#### 4. 查看某用户的网络连接

```bash
lsof -i -u alice
```

#### 5. 查看某进程打开的所有文件

```bash
lsof -p 18653
```

## ps：查看进程状态

`ps`（Process Status）用于查看当前运行的进程。

### 常用命令

```bash
# 查看所有进程（完整信息）
ps aux

# 查看所有进程（树形结构）
ps auxf

# 按 CPU 使用率排序
ps aux --sort=-%cpu | head -10

# 按内存使用排序
ps aux --sort=-%mem | head -10

# 只看某用户的进程
ps aux | grep alice

# 查看某端口的进程（配合 grep）
ps aux | grep 18653

# 查看某进程的详细信息
ps -p 18653 -o pid,user,start,time,cmd
```

### ps 输出字段

```
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
alice    18653  0.5  2.1 512345 43210 ?        Ssl  10:00   0:05 node server.js
```

- `USER`：运行用户
- `PID`：进程 ID
- `%CPU`：CPU 使用率
- `%MEM`：内存使用率
- `VSZ`：虚拟内存（KB）
- `RSS`：物理内存（KB）
- `STAT`：进程状态（S=睡眠，R=运行，Z=僵尸，T=停止）
- `START`：启动时间
- `TIME`：累计 CPU 时间
- `COMMAND`：命令与参数

## kill：结束进程

`kill` 向进程发送信号，常用信号：

| 信号 | 编号 | 含义 |
|------|------|------|
| `SIGTERM` | 15 | 请求终止（默认），进程可以清理资源 |
| `SIGKILL` | 9 | 强制终止，进程无法拦截 |
| `SIGHUP` | 1 | 重新加载配置 |

### 基本用法

```bash
# 请求进程优雅退出
kill 18653

# 强制杀死进程
kill -9 18653

# 重新加载配置（不重启）
kill -HUP 18653
```

## 实战：端口占用排查流程

### 场景：启动服务时提示 "Port 8080 already in use"

**Step 1：找到占用端口的进程**

```bash
lsof -i :8080
```

输出：

```
COMMAND   PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    18653  alice   21u  IPv4 0x1234      0t0  TCP *:http-alt (LISTEN)
```

**Step 2：确认是否是应该运行的实例**

```bash
ps -p 18653 -o pid,user,start,time,cmd
```

输出：

```
  PID USER     STARTED     TIME COMMAND
18653 alice    10:00:00 00:05:23 node server.js
```

**Step 3：决定处理方式**

- 如果是旧实例 → kill 掉，重新启动
- 如果是正确实例 → 换个端口启动新服务

```bash
# 优雅终止
kill 18653

# 等 2 秒检查是否还在
sleep 2 && lsof -i :8080

# 如果还在，强制杀死
kill -9 18653
```

**Step 4：验证端口已释放**

```bash
lsof -i :8080
# 无输出说明端口已释放
```

### 场景：两个进程争用同一端口

有时会有多个进程监听同一端口，需要逐个确认：

```bash
# 1. 查看所有占用该端口的进程
lsof -i :18789
```

![lsof 命令输出](/images/posts/2026/05/2026-05-24-screenshot.png)

```bash
# 2. 逐个检查每个 PID 的启动命令
ps -p 18653 -o pid,user,start,time,cmd
ps -p 18654 -o pid,user,start,time,cmd

# 3. 杀死不需要的实例
kill 18653

# 4. 验证只剩一个
lsof -i :18789
```

## top：实时监控进程

`top` 提供实时的系统资源监控。

```bash
# 启动 top
top

# 常用交互键（在 top 运行中）
# P - 按 CPU 使用率排序
# M - 按内存使用排序
# k - 输入 PID 杀死进程
# q - 退出

# 只看某用户的进程
top -u alice

# 一次性快照（不进入交互模式）
top -b -n 1 | head -20
```

## 常见问题

### Q：kill 后进程还在？

某些进程会捕获 `SIGTERM` 并忽略，改用 `SIGKILL`：

```bash
kill -9 <PID>
```

如果 `-9` 还不行，可能是僵尸进程（状态为 Z），需要 kill 父进程：

```bash
# 找父进程
ps -o ppid= -p <僵尸PID>
# 杀死父进程
kill <父进程PID>
```

### Q：如何找到所有监听端口的进程？

```bash
# macOS
lsof -nP -iTCP -sTCP:LISTEN

# Linux
sudo ss -tlnp
```

### Q：进程占用内存过高怎么排查？

```bash
# 按内存排序查看
ps aux --sort=-%mem | head -10

# 或使用 top 交互模式按 M 键
top
# 然后按 M
```

## 相关资源

- [Linux 实用指南](../linux/) - 更多 Linux 场景文章
- [DNS 与代理](../dns-proxy/) - 网络相关排查
- [技术教程](../tutorials/) - 服务器部署与运维
