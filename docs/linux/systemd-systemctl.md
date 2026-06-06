---
lang: zh-CN
title: systemd 与 systemctl 实战
description: 理解 systemd 架构，掌握服务启停、开机自启、日志查看与自定义 service 文件编写。
date: 2026-06-06
tags:
  - Linux
  - systemd
  - systemctl
  - 服务管理
---

# systemd 与 systemctl 实战

> **适用场景**：管理服务启停、设置开机自启、查看系统日志、编写自定义后台服务。
>
> **前置阅读**：[进程与端口排查](./process-port.md) 介绍了如何查看和管理进程，本文侧重 systemd 这个更上层的服务管理器。

## 1. 什么是 systemd

systemd 是现代 Linux 的 **init 系统**（PID 1），系统启动后它负责：

1. 启动和管理所有后台服务
2. 挂载文件系统
3. 管理用户会话
4. 处理定时任务（替代部分 cron）
5. 记录日志（journalctl）

### 1.1 核心概念

| 概念 | 含义 |
|------|------|
| **Unit** | systemd 管理的最小单元，每种类型有对应后缀 |
| **.service** | 后台服务单元（Nginx、MySQL、自定义应用） |
| **.timer** | 定时任务单元（替代 crontab） |
| **.socket** | 套接字激活单元（监听端口，按需启动服务） |
| **.target** | 一组 unit 的集合（类似 runlevel） |

```
systemd (PID 1)
├── nginx.service
├── mysql.service
├── sshd.service
├── my-app.service      ← 自定义应用
├── docker.service
└── timers.target
    └── certbot.timer   ← 证书自动续期
```

### 1.2 systemctl vs service

老系统用 `service`，新系统用 `systemctl`：

```bash
# 老写法
service nginx start

# 新写法（推荐）
systemctl start nginx
```

`service` 命令在 systemd 系统上只是 `systemctl` 的包装器，直接用 `systemctl` 更高效。

## 2. systemctl 常用命令

### 2.1 服务生命周期

```bash
# 启动
systemctl start nginx

# 停止
systemctl stop nginx

# 重启（进程会被完全终止后重启）
systemctl restart nginx

# 重载配置（不断开连接，只重新读取配置）
systemctl reload nginx

# 查看状态（最常用）
systemctl status nginx
```

输出示例：

```
● nginx.service - A high performance web server
     Loaded: loaded (/etc/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: active (running) since Mon 2026-06-06 10:30:15 UTC; 2h 15min ago
    Process: 1542 ExecStart=/usr/sbin/nginx -g daemon off; (code=exited, status=0/SUCCESS)
   Main PID: 1551 (nginx)
      Tasks: 3 (limit: 38158)
     Memory: 8.2M
        CPU: 45ms
     CGroup: /system.slice/nginx.service
             ├─1551 nginx: master process /usr/sbin/nginx -g daemon off;
             ├─1552 nginx: worker process
             └─1553 nginx: worker process
```

关键字段：
- `Loaded: ... enabled` → 开机自启已启用
- `Active: active (running)` → 服务正在运行
- `Main PID` → 主进程 PID，可以用 `kill` 或 `journalctl` 追踪

### 2.2 开机自启

```bash
# 启用开机自启（创建 .wants 软链接）
systemctl enable nginx

# 禁用开机自启（删除软链接）
systemctl disable nginx

# 启用并立即启动（二合一）
systemctl enable --now nginx

# 检查是否启用
systemctl is-enabled nginx
```

> 如果服务文件刚创建或修改过，需要先让 systemd 重新扫描：
>
> ```bash
> systemctl daemon-reload
> ```

### 2.3 查看所有服务状态

```bash
# 列出所有活跃的 service
systemctl list-units --type=service

# 列出所有 service（包括未活跃的）
systemctl list-units --type=service --all

# 只看失败的服务（排查启动问题时很有用）
systemctl list-units --type=service --state=failed

# 查看某个服务的依赖关系
systemctl list-dependencies nginx
```

### 2.4 服务状态速查

| 命令 | 用途 |
|------|------|
| `systemctl is-active nginx` | 返回 `active` 或 `inactive` |
| `systemctl is-enabled nginx` | 返回 `enabled` 或 `disabled` |
| `systemctl show nginx` | 显示完整属性（非常多） |
| `systemctl cat nginx` | 直接查看 service 文件内容 |
| `systemctl edit nginx` | 创建 override 配置（不修改原文件） |

## 3. 编写自定义 .service 文件

当你需要把一个应用作为后台服务运行时（比如 Node.js 后端、Go 应用、Python 脚本），需要自己写 `.service` 文件。

### 3.1 基本结构

创建 `/etc/systemd/system/my-app.service`：

```ini
[Unit]
Description=My Backend Application
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/my-app
ExecStart=/opt/my-app/bin/server
Restart=on-failure
RestartSec=5
Environment="NODE_ENV=production"
Environment="PORT=8080"

[Install]
WantedBy=multi-user.target
```

### 3.2 各字段说明

#### [Unit] 段

| 字段 | 说明 |
|------|------|
| `Description` | 服务描述（systemctl status 第一行显示） |
| `After` | 本服务在这些 unit **之后**启动（不强制等待） |
| `Requires` | 强依赖：这些 unit 失败则本服务不启动 |
| `Wants` | 弱依赖：尽量拉起这些 unit，失败不影响本服务 |

#### [Service] 段

| 字段 | 说明 |
|------|------|
| `Type` | `simple`（前台进程）/ `forking`（后台守护）/ `oneshot`（执行完退出） |
| `User` / `Group` | 以哪个用户运行（避免用 root） |
| `WorkingDirectory` | 工作目录 |
| `ExecStart` | 启动命令（必须是绝对路径） |
| `ExecStop` | 停止命令（可选，默认发 SIGTERM） |
| `Restart` | `always` / `on-failure` / `no` |
| `RestartSec` | 重启前等待秒数 |
| `Environment` | 注入环境变量，可以写多个 |
| `EnvironmentFile` | 从文件读取环境变量，如 `/etc/my-app/env` |

#### [Install] 段

| 字段 | 说明 |
|------|------|
| `WantedBy` | `enable` 时链接到哪个 target（通常 `multi-user.target`） |

### 3.3 常见场景示例

#### Node.js / Next.js 应用

```ini
[Unit]
Description=Next.js Web Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/web-app
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
Environment="NODE_ENV=production"
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
```

#### Go 后端

```ini
[Unit]
Description=Go API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/api-server
ExecStart=/opt/api-server/api-server
Restart=always
RestartSec=3
Environment="GIN_MODE=release"

[Install]
WantedBy=multi-user.target
```

#### Python 应用（使用虚拟环境）

```ini
[Unit]
Description=Python FastAPI Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/python-app
ExecStart=/opt/python-app/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### Docker Compose 服务

```ini
[Unit]
Description=Docker Compose Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/docker-app
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

### 3.4 部署流程

```bash
# 1. 创建 service 文件
vim /etc/systemd/system/my-app.service

# 2. 重载 systemd（必须）
systemctl daemon-reload

# 3. 启动
systemctl start my-app

# 4. 查看状态
systemctl status my-app

# 5. 设置开机自启
systemctl enable my-app
```

## 4. journalctl 查看日志

systemd 统一管理所有 unit 的日志，用 `journalctl` 查看：

### 4.1 基础用法

```bash
# 查看某个服务的全部日志
journalctl -u nginx

# 实时跟踪日志（类似 tail -f）
journalctl -u nginx -f

# 只查看最近 100 行
journalctl -u nginx -n 100

# 查看从某个时间开始的日志
journalctl -u nginx --since "2026-06-06 10:00:00"
journalctl -u nginx --since today

# 查看某次启动的日志（-b 0 表示本次启动，-b -1 上次）
journalctl -u nginx -b 0

# 按日志级别过滤（err 及以上）
journalctl -u nginx -p err

# 反向查看（最新的在前）
journalctl -u nginx -r
```

### 4.2 日志级别

| 级别 | 名称 | 说明 |
|------|------|------|
| 0 | emerg | 系统不可用 |
| 1 | alert | 必须立即处理 |
| 2 | crit | 严重错误 |
| 3 | err | 普通错误 |
| 4 | warning | 警告 |
| 5 | notice | 正常但重要 |
| 6 | info | 信息 |
| 7 | debug | 调试 |

```bash
# 查看错误及以上级别
journalctl -u nginx -p err

# 查看 warning 及以上
journalctl -u nginx -p warning
```

### 4.3 磁盘管理

日志会持续增长，需要定期清理：

```bash
# 查看当前日志占用磁盘
journalctl --disk-usage

# 保留最近 7 天的日志
journalctl --vacuum-time=7d

# 只保留 500MB 日志
journalctl --vacuum-size=500M

# 永久配置：修改 /etc/systemd/journald.conf
# MaxFileSec=7day
# SystemMaxUse=500M
```

## 5. systemd timer（替代 crontab）

systemd 自带定时器，比 cron 更强大：支持依赖管理、日志记录、错过后补执行。

### 5.1 创建定时任务

需要一对文件：
- `.service` — 要执行的任务
- `.timer` — 调度规则

**`/etc/systemd/system/backup.service`**：

```ini
[Unit]
Description=Daily Database Backup

[Service]
Type=oneshot
ExecStart=/opt/scripts/backup-db.sh
```

**`/etc/systemd/system/backup.timer`**：

```ini
[Unit]
Description=Run backup daily at 2am

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

`Persistent=true` 表示如果错过了执行时间（比如服务器关机），下次启动会立即补一次。

```bash
systemctl daemon-reload
systemctl enable --now backup.timer

# 查看所有 timer
systemctl list-timers

# 查看下次执行时间
systemctl status backup.timer
```

### 5.2 OnCalendar 语法

| 写法 | 含义 |
|------|------|
| `*-*-* 02:00:00` | 每天凌晨 2 点 |
| `Mon *-*-* 09:00:00` | 每周一上午 9 点 |
| `*-*-1,15 03:00:00` | 每月 1 号和 15 号凌晨 3 点 |
| `hourly` | 每小时（= `*-*-* *:00:00`） |
| `daily` | 每天凌晨（= `*-*-* 00:00:00`） |
| `weekly` | 每周一凌晨 |
| `monthly` | 每月 1 号凌晨 |

验证日历表达式：

```bash
systemd-analyze calendar "Mon *-*-* 09:00:00"
```

## 6. 常见问题排查

### 服务启动失败

```bash
# 查看详细错误
systemctl status my-app
journalctl -u my-app -n 50 --no-pager

# 检查 .service 文件语法
systemd-analyze verify /etc/systemd/system/my-app.service
```

常见错误：
- `ExecStart` 路径不存在或没有执行权限
- 环境变量未设置（检查 `Environment` 或 `EnvironmentFile`）
- 依赖的服务未启动（检查 `After` 和 `Requires`）

### 服务一直重启

```bash
# 查看重启次数和原因
systemctl show my-app | grep -E "NRestarts|Result"

# 临时禁用自动重启，方便调试
systemctl edit my-app
# 加入：
# [Service]
# Restart=no
systemctl restart my-app
```

### 环境变量不生效

```bash
# 查看实际加载的环境变量
systemctl show my-app | grep Environment

# 从文件读取时，文件格式必须正确
# /etc/my-app/env：
# KEY1=value1
# KEY2=value2
```

### daemon-reload vs restart

- `daemon-reload`：让 systemd 重新扫描 `.service` 文件（文件内容改了就要执行）
- `restart`：重启服务进程（代码更新后执行）

修改 `.service` 文件后需要 **先 daemon-reload，再 restart**：

```bash
systemctl daemon-reload
systemctl restart my-app
```

## 7. 常用命令速查表

```bash
# ===== 服务管理 =====
systemctl start/stop/restart/reload/status <name>
systemctl enable/disable <name>
systemctl enable --now <name>     # 启用并启动
systemctl daemon-reload           # 重载 .service 文件

# ===== 状态查询 =====
systemctl list-units --type=service --state=running
systemctl list-units --type=service --state=failed
systemctl list-timers
systemctl cat <name>              # 查看 service 文件
systemctl edit <name>             # 创建 override 配置

# ===== 日志 =====
journalctl -u <name> -f           # 实时跟踪
journalctl -u <name> -n 100       # 最近 100 行
journalctl -u <name> --since today
journalctl -u <name> -p err       # 只看错误
journalctl --disk-usage
journalctl --vacuum-time=7d       # 清理 7 天前的

# ===== 系统 =====
systemctl list-units --type=target       # 查看当前 target
systemctl isolate rescue.target          # 进入救援模式
systemctl poweroff / reboot
```

## 8. 延伸阅读

- [进程与端口排查](./process-port.md) - lsof、ps、kill 的核心用法
- [curl 命令实战指南](./network-curl.md) - HTTP 调试与 API 测试
- [域名解析与反向代理部署](../dns-proxy/deploy-dns-nginx.md) - 用 systemd 管理 Nginx 服务的完整案例
- [freedesktop.org systemd 文档](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
