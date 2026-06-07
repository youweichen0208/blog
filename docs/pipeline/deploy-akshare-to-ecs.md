---
lang: zh-CN
title: GitHub Actions 多环境部署：DigitalOcean + 阿里云 ECS 并行部署
description: 将 A 股数据源 AKShare 从 DigitalOcean 独立到阿里云 ECS，GitHub Actions 并行部署到两个云厂商，解决东财/新浪境外 IP 限流问题。
date: 2026-06-07
---

# GitHub Actions 多环境部署：DigitalOcean + 阿里云 ECS 并行部署

上一篇文章介绍了如何将整个应用通过 GitHub Actions 部署到一台 DigitalOcean Droplet。但有一个问题没解决：**A 股数据源 AKShare 在 DigitalOcean（境外 IP）上无法正常工作**——东方财富和新浪财经对境外 IP 频率限制，部分接口直接拒绝。

解决方案是把 AKShare 拆出来，部署到一台有国内 IP 的阿里云 ECS 上。本文介绍如何在 GitHub Actions 中同时管理两个部署目标。

## 目标架构

```
github push → main
           ↓
GitHub Actions
  ├── test      (go build / vet / test / frontend)
  ├── build     (web + akshare 镜像 → GHCR)
  ├── deploy         → SSH → DO Droplet   (web 容器)
  └── deploy-akshare → SSH → 阿里云 ECS   (akshare 容器)
```

```text
Internet (Browser / WeCom / Telegram)
  │
  ▼
DigitalOcean Droplet (境外, sgp1)
  │
  ├── Caddy HTTPS (:443)
  │
  └── web 容器 (:8090)
        │   Go API + React 静态文件
        │   SQLite 文件存储
        │
        ▼  HTTP (调用 AKShare)
  阿里云 ECS (国内)
  │
  └── akshare 容器 (:8888)
        FastAPI A 股数据服务
        底层调用 akshare 库（爬取东财/新浪，需国内 IP）
```

**为什么用阿里云 ECS 而不是 Mac mini：**

| 方案 | 可用性 | 运维复杂度 | 成本 |
| --- | --- | --- | --- |
| Mac mini + Tailscale | 依赖家宽 + Docker Desktop 顺序启动 | 高（CGNAT、断电、Docker 顺序） | 电费 |
| 阿里云 ECS | 7×24 在线，SLA 保障 | 低 | 约 ¥100/年（2C2G 轻量） |

## 前置条件

| 条件 | 说明 |
| --- | --- |
| DO Droplet 已部署 | 已完成[上一篇文章](./github-actions-ghcr-deploy.md)的全部步骤 |
| 阿里云账号 | 已实名认证 |
| GitHub repo | CI Secrets 已配置 DO 相关 Key |

## 1. 购买阿里云轻量应用服务器

### 1.1 套餐选择

进入阿里云控制台 → [轻量应用服务器](https://www.aliyun.com/product/swas) → 创建实例。

推荐配置：

| 配置项 | 推荐值 | 说明 |
| --- | --- | --- |
| 地域 | 任意国内节点 | 与 DO 之间的公网延迟通常 100-200ms，AKShare 已有 30s 缓存，可接受 |
| 实例套餐 | 2 核 2G | AKShare 内存占用 300-500MB，2G 绰绰有余 |
| 系统盘 | 50GB SSD | 足够装 Docker + 镜像 |
| 带宽 | 4Mbps | AKShare 返回 JSON，流量极小 |
| 月流量 | 300GB | 单次查询几 KB，月跑不完 300GB |
| 镜像 | Ubuntu + Docker 社区版 | 系统装好直接自带 Docker |
| 时长 | 1 年 | 1.7 折活动约 ¥100/年 |

### 1.2 其他配置项

以下配置全部**保持默认**，不需要改动：

- **主机名**：默认基于 IP/ID 生成即可
- **私网域名解析**：单台 ECS 不需要内网 DNS 发现
- **有序后缀**：批量创建时才需要
- **CPU 选项**：默认配置即可
- **文件备份**：不需要。AKShare 容器不存储持久化数据，每台机器重建几分钟即可恢复
- **扩展应用/程序**：选 Docker 社区版

### 1.3 为什么 2C2G 够用

AKShare 是个轻量 Python/FastAPI 服务：

- 基本不吃 CPU（只在被调用时计算，且调用频率低）
- 内存峰值约 500MB（akshare 库加载历史数据时会有一波）
- 300GB 月流量绰绰有余（报价数据只传 JSON，几 KB/次）
- 4Mbps 带宽完全够（报价数据不涉及大文件）

## 2. ECS 初始配置

### 2.1 SSH 登录

```bash
ssh root@<ecs-public-ip>
```

### 2.2 验证 Docker

如果购买时选了 Docker 社区版镜像，直接验证：

```bash
docker --version          # 20.x+
docker compose version    # v2.x
```

如果没有 Docker：

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

### 2.3 生成 CI 用 SSH 密钥

复用 DO 部署用的密钥也可以，也可以单独生成一对（审计更清晰）：

> **注意方向**：这个密钥是让 **GitHub Actions runner → SSH → 阿里云 ECS**（执行 docker pull/run 等部署命令），不是让 ECS 连接 DO。ECS 从 DO Registry 拉镜像走的是 `docker login` 认证，不需要 SSH 密钥。

```bash
ssh-keygen -t ed25519 -C "github-actions-ecs-deploy" -f ecs_deploy_key -N ""
ssh-copy-id -i ecs_deploy_key.pub root@<ecs-public-ip>
```

保存 **私钥** 内容（`ecs_deploy_key` 文件），待会放进 GitHub Secrets。

测试免密登录：

```bash
ssh -i ecs_deploy_key root@<ecs-public-ip> hostname
```

## 3. 安全组配置

进入 ECS 控制台 → 实例详情 → 安全组 → 入方向规则，添加：

| 协议 | 端口 | 授权对象 | 说明 |
| --- | --- | --- | --- |
| TCP | 22 | GitHub Actions runner IP 段 | CI SSH 部署用 |
| TCP | 8888 | `<DO 公网 IP>/32` | DO web 调用 AKShare |

> **不建议把 8888 开放给 `0.0.0.0/0`**。AKShare 没有鉴权，暴露到公网等于把 A 股 API 开放给所有人白嫖。

验证安全组生效：

```bash
# 在 DO Droplet 上执行
curl -m 5 http://<ecs-public-ip>:8888/health
# 期望：{"status":"ok"}

# 在其他机器上执行（应该超时或被拒绝）
curl -m 5 http://<ecs-public-ip>:8888/health
# 期望：Connection refused 或 timeout
```

## 4. 修改 docker-compose.prod.yml

DO 上不再运行 AKShare，改为通过 `AKSHARE_SERVICE_URL` 环境变量连接 ECS。

**改动前（单机方案）：**

```yaml
services:
  akshare:
    image: ${IMAGE_REPO}/akshare:latest
    ports:
      - "8888:8888"
    healthcheck:
      ...
    restart: unless-stopped

  web:
    image: ${IMAGE_REPO}/web:latest
    env_file: .env
    environment:
      AKSHARE_SERVICE_URL: http://akshare:8888   # 容器间内网
    ...
```

**改动后（双机方案）：**

```yaml
services:
  web:
    image: ${IMAGE_REPO}/web:latest
    env_file: .env
    environment:
      WEB_HTTP_ADDR: :8090
    ports:
      - "8090:8090"
    volumes:
      - ./data:/data
    restart: unless-stopped
```

**关键变化：**

- 移除整个 `akshare` service
- `AKSHARE_SERVICE_URL` 不再硬编码，改为通过 `.env` 注入，值指向 ECS 公网 IP
- 移除 `depends_on`（没有本地依赖了）

## 5. 修改 GitHub Actions Workflow

在现有 `deploy.yml` 中新增 `deploy-akshare` job，与 `deploy` 并行执行。

新增部分：

```yaml
  deploy-akshare:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Install SSH key
        uses: shimataro/ssh-key-action@v2
        with:
          key: ${{ secrets.ECS_SSH_KEY }}
          known_hosts: 'placeholder'

      - name: Deploy AKShare to ECS
        env:
          ECS_HOST: ${{ secrets.ECS_HOST }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          IMAGE_REPO: ghcr.io/${{ github.repository }}
        run: |
          ssh -o StrictHostKeyChecking=accept-new root@${ECS_HOST} \
            bash -s <<DEPLOY_EOF
          set -euo pipefail
          IMAGE_REPO="\$(echo '${IMAGE_REPO}' | tr '[:upper:]' '[:lower:]')"
          echo '${GITHUB_TOKEN}' | docker login ghcr.io \
            -u '${{ github.actor }}' --password-stdin
          docker pull \${IMAGE_REPO}/akshare:latest
          docker stop akshare 2>/dev/null || true
          docker rm akshare 2>/dev/null || true
          docker run -d --name akshare \
            --restart unless-stopped \
            -p 8888:8888 \
            \${IMAGE_REPO}/akshare:latest
          sleep 5
          curl -fs http://localhost:8888/health \
            || { echo "AKShare health check FAILED"; exit 1; }
          docker image prune -f
          DEPLOY_EOF
```

**heredoc 转义的坑：**

上面这段代码最容易被踩到的是 heredoc 语法。GitHub Actions 里 `run:` 的内容是 shell 脚本，shell 里嵌入了 SSH heredoc。需要区分"哪层展开哪个变量"：

- `<<DEPLOY_EOF`（无引号）：runner 侧先展开 `${GITHUB_TOKEN}` 等变量，ECS 拿到的是已展开的值
- SSH heredoc 内部要保留的变量（如 `${IMAGE_REPO}`），必须用 `\$` 转义，阻止 runner 侧展开

如果写成 `<<'DEPLOY_EOF'`（有引号），则是 ECS 侧展开，但 `GITHUB_TOKEN` 在 ECS 上不存在，部署会失败。

**完整 workflow 结构：**

```
test → build (web + akshare 镜像 → GHCR)
         ├── deploy         (DO web 容器)
         └── deploy-akshare (ECS AKShare 容器)
```

`deploy` 和 `deploy-akshare` 都依赖 `build`，互不依赖，并行执行。

## 6. 配置新增 GitHub Secrets

在 GitHub repo → Settings → Secrets and variables → Actions 中**新增**：

| Secret | 值 | 说明 |
| --- | --- | --- |
| `ECS_SSH_KEY` | `ecs_deploy_key` 私钥完整内容 | CI 部署 ECS 用 |
| `ECS_HOST` | ECS 公网 IP | CI 部署 ECS 用 |

**更新**已有的 Secret：

| Secret | 旧值 | 新值 |
| --- | --- | --- |
| `AKSHARE_SERVICE_URL` | `http://akshare:8888` 或 Mac Tailscale IP | `http://<ecs-public-ip>:8888` |

## 7. 验证部署

### 7.1 触发 CI

```bash
git checkout main
echo "# add ecs deploy" >> README.md
git add README.md && git commit -m "chore: trigger CI deploy"
git push origin main
```

进入 GitHub → repo → Actions，应该看到两个 deploy job 并行运行：

```
✅ test
✅ build
✅ deploy          (DO, ~1min)
✅ deploy-akshare  (ECS, ~30s)
```

### 7.2 验证 ECS 上 AKShare

```bash
# SSH 到 ECS
ssh root@<ecs-public-ip>

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
# 期望看到 akshare Up + 0.0.0.0:8888->8888/tcp

curl http://localhost:8888/health
# 期望：{"status":"ok"}

curl "http://localhost:8888/quote?symbol=600519"
# 期望：贵州茅台的 JSON 报价数据
```

### 7.3 验证 DO 调到 ECS

```bash
# SSH 到 DO
ssh root@<do-ip>

curl -w '\n%{time_total}\n' http://<ecs-public-ip>:8888/health
# 期望：200 OK，延迟 < 500ms

# 检查 web 容器日志
docker compose -f /opt/youwei-trading-agent/docker-compose.prod.yml logs \
  --tail=50 web | grep -i akshare
```

### 7.4 端到端验证

浏览器访问你的网站，发送一条 A 股查询（如"贵州茅台报价"），确认数据正常返回。

这条请求的完整路径是：

```
浏览器 → DO (web 容器) → HTTP → ECS (AKShare 容器)
                              ↓
                         akshare 库 → 东方财富/新浪
                              ↓
                         JSON 返回 → web 容器 → 浏览器
```

## 8. 常见问题

### Q：ECS pull GHCR 镜像超时

阿里云国内拉 `ghcr.io` 偶尔很慢。两种解决方案：

**方案 A**：配置 Docker mirror（最简单）

```bash
# 编辑 /etc/docker/daemon.json
echo '{"registry-mirrors": ["https://mirror.ccs.tencentyun.com"]}' \
  > /etc/docker/daemon.json
systemctl restart docker
```

**方案 B**：在 build 阶段多推一份到阿里云 ACR，ECS 从 ACR 拉

```yaml
# deploy.yml build job 中新增
- uses: docker/login-action@v3
  with:
    registry: registry.cn-shenzhen.aliyuncs.com
    username: ${{ secrets.ACR_USERNAME }}
    password: ${{ secrets.ACR_PASSWORD }}

- uses: docker/build-push-action@v6
  with:
    context: ./services/akshare
    push: true
    tags: |
      ghcr.io/${{ github.repository }}/akshare:latest
      registry.cn-shenzhen.aliyuncs.com/youwei/akshare:latest
```

ECS 侧改为从 ACR pull：

```yaml
docker pull registry.cn-shenzhen.aliyuncs.com/youwei/akshare:latest
```

### Q：GitHub Actions IP 段不固定，安全组怎么配 SSH

GitHub Actions 的 runner IP 来自 GitHub 的 IP 段，范围较广。两种处理方式：

**方案 A（推荐）**：安全组 22 端口开放 `0.0.0.0/0`，但 SSH 只允许密钥认证（禁用密码）。配合 `fail2ban` 防暴力破解：

```bash
apt install -y fail2ban
systemctl enable --now fail2ban
```

**方案 B**：使用 GitHub 的 [meta API](https://api.github.com/meta) 获取 runner IP 段，动态更新安全组规则。需要写额外的 CI step，适合对安全性要求极高的场景。

### Q：AKShare 容器健康检查失败

```bash
# 在 ECS 上执行
docker logs akshare

# 常见错误：
# 1. akshare 库版本不兼容 → 更新 requirements.txt 中的版本号
# 2. FastAPI 启动失败 → 检查 8888 端口是否被占用
lsof -i :8888
```

### Q：DO 调 ECS 延迟高

国内 ECS → 海外 DO 通常 100-200ms，反向同理。AKShare 的查询结果已有 30s 缓存层（DO → 应用层缓存），同一股票短时间内只调一次 ECS，延迟可接受。

如果延迟持续 > 1s：

```bash
# 在 DO 上测 ping
ping <ecs-public-ip>

# 测实际接口耗时
curl -w '%{time_total}\n' http://<ecs-public-ip>:8888/health
```

持续高延迟可能是 ECS 所在节点网络问题，尝试更换地域。

## 9. 总结

| 维度 | 单机方案（DO + Mac mini） | 双机方案（DO + ECS） |
| --- | --- | --- |
| 可用性 | Mac mini 断网即丢 A 股 | ECS 7×24 在线 |
| 网络复杂度 | 需 Tailscale，家宽 CGNAT 问题 | 公网直连，无需隧道 |
| 额外成本 | 电费 + Tailscale 免费 | ECS 约 ¥100/年 |
| 运维 | Mac mini 需管 Docker 顺序、断电恢复 | SSH 即可排查 |
| CI/CD | Mac mini 无法 CI（无公网） | 双 job 并行，完整自动化 |

**核心原则**：把必须放在国内的东西（AKShare）放到国内的云（阿里云 ECS），把面向用户的应用层放到海外（DigitalOcean），GitHub Actions 并行管理两边，各司其职。

push to `main` 之后，剩下的全自动。
