---
lang: zh-CN
title: RAG 实战指南
description: 基于 Docker 的 RAG 系统部署教程
date: 2026-01-21
---

# RAG 实战指南

## 1. 预先准备

### 1.1 服务器配置

**Step 1**：准备阿里云服务器

- 配置：2 核 2G
- 操作系统：Ubuntu/Debian

### 1.2 安装 Docker 环境

**Step 2**：安装 Docker 和 Docker Compose

```bash
apt update
apt install docker.io docker-compose
```

**Step 3**：启动 Docker 服务

```bash
systemctl start docker
systemctl enable docker
```

## 2. 配置 Docker 镜像加速

### 2.1 创建配置目录

```bash
sudo mkdir -p /etc/docker
```

**参数说明**：

- 创建 Docker 的配置目录
- `-p` 参数表示：
  - 目录不存在就创建
  - 已存在也不会报错

**配置文件位置**：Docker 的核心配置文件都放在 `/etc/docker`

### 2.2 配置镜像加速器

```bash
sudo tee /etc/docker/daemon.json <<-'EOF'
{
    "registry-mirrors": [
        "https://docker.m.daocloud.io",
        "https://dockerhub.timeweb.cloud"
    ]
}
EOF
```

**配置说明**：

1. **daemon.json 是什么？**

   - Docker 守护进程的配置文件
   - 用于配置 Docker 的全局行为

2. **registry-mirrors 是什么？**

   - Docker 镜像仓库的镜像源
   - 加速国内拉取 Docker 镜像的速度

3. **tee + EOF 是干什么？**
   - 用 **root 权限** 写文件
   - 比 `sudo vim` 更适合脚本/复制执行

### 2.3 重新加载配置

**Step 1**：重新加载 systemd 配置

```bash
sudo systemctl daemon-reload
```

**作用**：

- 让 systemd **重新加载服务配置**
- 告诉系统："服务配置可能变了，刷新一下"

**Step 2**：重启 Docker 服务

```bash
sudo systemctl restart docker
```

**作用**：

- 重启 Docker 守护进程
- 让 `/etc/docker/daemon.json` 真正生效
- Docker 的配置只有在启动时读取

### 2.4 整体流程图

```
mkdir /etc/docker
        ↓
写 daemon.json（镜像加速器）
        ↓
systemd 重新加载
        ↓
重启 dockerd
        ↓
docker pull 走镜像加速
```

### 2.5 验证配置

执行完后应该检查什么？

1. **Docker 是否正常？**

   ```bash
   docker --version
   systemctl status docker
   ```

2. **镜像加速是否生效？**

   ```bash
   docker info | grep -A 5 "Registry Mirrors"
   ```

**注意**：Docker 连不上 90% 是网络问题，不是 Docker 问题。
