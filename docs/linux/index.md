---
lang: zh-CN
title: Linux 实用指南
description: 按场景组织的 Linux 命令与运维实践，覆盖网络诊断、进程管理、磁盘排查和服务部署。
date: 2026-06-06
tags:
  - Linux
  - 运维
  - 命令行
---

# Linux 实用指南

这个专栏按**排查场景**组织 Linux 命令和实践。每篇文章聚焦一个具体场景，提供可直接复制的命令和排查思路。

## 内容规划

| 场景 | 覆盖工具 | 状态 |
|------|---------|------|
| 进程与端口 | lsof、ps、kill、top、netstat | ✅ 已写 |
| 网络诊断 | curl、ping、dig、ss、traceroute | 🔄 进行中 |
| 磁盘与文件 | df、du、find、chmod、chown | ✅ 已补充 |
| 服务与日志 | systemctl、journalctl、crontab | ✅ 已写 |
| 用户与权限 | useradd、sudo、passwd、umask | 📝 计划中 |

## 当前内容

### 进程与端口

- [进程与端口排查](./process-port.md) - lsof、ps、kill 的核心用法，端口占用排查流程

### 网络诊断

- [curl 命令实战指南](./network-curl.md) - HTTP 调试、API 测试、文件上传下载、DNS 解析验证，以及 WebDAV 方法校验

计划覆盖：
- ping：连通性测试与丢包判断
- dig：DNS 查询与解析验证
- ss：网络连接状态（替代 netstat）
- traceroute：路由追踪与延迟定位

### 磁盘与文件

- [文件与目录排查实战](./file-find-rm.md) - 用 ls、find、rm 和 Git 重导入定位并重建远端目录

计划覆盖：
- df / du：磁盘使用率与目录大小
- chmod / chown：权限修改与所有权
- tar / gzip：压缩与解压

### 服务与日志

- [systemd 与 systemctl 实战](./systemd-systemctl.md) - 服务启停、开机自启、journalctl 日志，以及 Nginx 配置检查与安全重载
- [Docker 与 Docker Compose 排障实战](./docker-compose-ops.md) - 容器、端口映射、日志、docker exec 和 compose 服务重启

计划覆盖：
- ufw：防火墙基础操作

### 发行版认知

- [EulerOS 2.0 是什么？和主流 Linux 有什么区别](./euleros-intro.md) - 概念入门：EulerOS 就是华为的企业级 Linux 发行版，讲清它与 CentOS/Ubuntu 的区别及与 openEuler 的关系

## 使用建议

1. **遇到问题先确定场景**：是网络不通、进程异常、磁盘满了还是服务挂了？
2. **找到对应章节**：按场景定位文章，直接复制命令
3. **理解命令再执行**：每篇文章都会解释命令的关键参数，避免盲目复制

## 相关专栏

- [DNS 与代理](../dns-proxy/) - 域名解析、Nginx 反向代理
- [技术教程](../tutorials/) - VPS 部署、CI/CD 等工程实践
