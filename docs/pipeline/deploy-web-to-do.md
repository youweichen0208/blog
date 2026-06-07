---
lang: zh-CN
title: 在 DigitalOcean 部署 Trading Agent（React + Go + Nginx HTTPS）
description: DigitalOcean Droplet 从零搭建，用 Dockerfile.web 多阶段构建把 React 前端 + Go 后端打包成单一容器，配 Nginx HTTPS 反代上线。
date: 2026-06-07
---

# 在 DigitalOcean 部署 Trading Agent（React + Go + Nginx HTTPS）

[上一篇](./github-actions-ghcr-deploy.md)介绍了 GitHub Actions + GHCR + SSH 的 CI/CD 基础模式。这篇聚焦在这个项目的具体部署：**把 React 前端 + Go 后端合并成一个容器，部署到 DigitalOcean，配 Nginx HTTPS 反代上线**。

整体 CI/CD 流水线（含 A 股数据源 AKShare 独立部署阿里云 ECS）见[下一篇](./deploy-akshare-to-ecs.md)。

## 目标架构

```text
Internet (Browser / WeCom / Telegram)
  │
  ▼
DigitalOcean Droplet (sgp1)
  │
  ├── Nginx HTTPS (:443) ← Certbot 自动续期
  │     │
  │     └── proxy_pass → web 容器 (:8090)
  │                         │ Go API (/api/*)
  │                         │ 静态文件 (React dist)
  │                         └── SQLite (/data/sessions.db)
  │
  └── 调用外网：
        ├── ghcr.io（拉镜像）
        ├── dashscope.aliyuncs.com（LLM）
        ├── tavily.com（联网搜索）
        └── 阿里云 ECS AKShare（A 股数据，见下一篇）
```

**架构决策**：

| 问题 | 选择 | 理由 |
| --- | --- | --- |
| 前后端是否同容器 | 是 | Go 服务托管 `/api/*` + serve 前端 `dist`，简单可靠 |
| 反代选择 | Nginx | 比 Caddy 更可控，适合已有域名配置 |
| HTTPS | Certbot + Nginx | 零成本，自动续期 |
| 数据存储 | SQLite | 单用户小圈子足够，零运维 |

## 1. 购买 DigitalOcean Droplet

DO 控制台 → Create → Droplets：

| 配置项 | 推荐值 | 说明 |
| --- | --- | --- |
| Region | `sgp1`（新加坡） | 亚洲用户延迟低 |
| Plan | Basic $12/mo | 2 vCPU / 2GiB RAM / 50GB NVMe |
| OS | Ubuntu 24.04 LTS | 与 CI 的 `ubuntu-latest` 一致 |
| Authentication | SSH Key | 上传你的本地公钥 |
| 项目标签 | `youwei-trading-agent` | 可选，方便管理 |

IPv6 可以不开，MVP 用 IPv4 足够。

## 2. Droplet 初始配置

SSH 登录：

```bash
ssh root@<do-public-ip>
```

系统更新：

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg
```

安装 Docker（选 Docker CE）：

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker --version          # 确认 24.x+
docker compose version    # 确认 v2.x+
```

创建应用目录：

```bash
mkdir -p /opt/youwei-trading-agent/data
```

`data/` 用于 SQLite 文件持久化，容器内 `/data/sessions.db` 会映射到这里。

## 3. Dockerfile.web：多阶段构建

这是部署的核心——把 React 前端 + Go 后端打成一个精简镜像。

```dockerfile
# 阶段 1：构建 React 前端
FROM node:22-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build     # 产出 frontend/dist/

# 阶段 2：构建 Go 后端，同时拷入前端 dist
FROM golang:1.24-alpine AS backend
WORKDIR /src
RUN apk add --no-cache build-base
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
COPY --from=frontend /src/frontend/dist ./frontend/dist
RUN CGO_ENABLED=1 go build -o /out/web ./cmd/web

# 阶段 3：最小运行镜像
FROM alpine:3.20
WORKDIR /app
RUN apk add --no-cache ca-certificates
COPY --from=backend /out/web /app/web
COPY --from=frontend /src/frontend/dist /app/frontend/dist
CMD ["/app/web"]
```

**为什么这么设计：**

- **三阶段构建**：frontend 编译需要 Node 环境，Go 编译需要 Go 环境，但最终运行镜像只包含 `web` binary + dist 静态文件，基于 Alpine 仅约 30MB。
- **前端嵌入 Go 服务**：Go 服务同时 serve `/api/*` 和 `/`（静态文件），避免前后端两个容器的复杂配置。
- **`CGO_ENABLED=1`**：Go 代码使用 SQLite（cgo 绑定），编译时必须开启 CGO。这也是为什么 Dockerfile 里 `apk add build-base`——它提供 C 编译工具链。
- **`frontend/dist` 拷入两次**：一次进 backend 编译阶段（让 Go 可以 embed 或 serve），一次进最终运行阶段。

**本地试一下构建：**

```bash
docker build -f Dockerfile.web -t youwei-web:latest .
docker run -d -p 8090:8090 -e SQLITE_PATH=/data/sessions.db \
  -v $(pwd)/data:/data youwei-web:latest
```

## 4. docker-compose.prod.yml

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

**关键说明：**

- `IMAGE_REPO` 在部署时通过 CI 的 SSH session export（值为 `ghcr.io/<owner>/<repo>`，小写）
- `.env` 由 CI 生成并通过 `scp` 传到 DO，包含 `DASHSCOPE_API_KEY` 等敏感配置
- `WEB_HTTP_ADDR` 显式声明容器监听端口，和 Nginx `proxy_pass` 对齐
- `/data:/data` 挂载确保 SQLite 文件持久化在宿主机 `./data/`

## 5. GitHub Actions 部署流程

CI 流水线分三步，详见项目 `.github/workflows/deploy.yml`。这里挑关键的 `deploy` job 讲：

```yaml
deploy:
  needs: build
  runs-on: ubuntu-latest
  environment: production
  steps:
    - uses: actions/checkout@v4

    - name: Install SSH key
      uses: shimataro/ssh-key-action@v2
      with:
        key: ${{ secrets.DO_SSH_KEY }}
        known_hosts: 'placeholder'

    - name: Prepare .env locally
      run: |
        cat > .env << 'ENVEOF'
        DASHSCOPE_API_KEY=${{ secrets.DASHSCOPE_API_KEY }}
        TAVILY_API_KEY=${{ secrets.TAVILY_API_KEY }}
        AGENT_MODEL=${{ vars.AGENT_MODEL || 'qwen-plus' }}
        AKSHARE_SERVICE_URL=${{ secrets.AKSHARE_SERVICE_URL }}
        ...其他配置项...
        ENVEOF
        sed -i '/^$/d; s/^[[:space:]]*//' .env    # 去空行去前导空格

    - name: Copy files to server
      run: |
        ssh root@${DO_HOST} mkdir -p /opt/youwei-trading-agent/data
        scp .env docker-compose.prod.yml root@${DO_HOST}:/opt/youwei-trading-agent/

    - name: Pull and restart services
      run: |
        ssh root@${DO_HOST} bash -s <<EOF
        set -euo pipefail
        cd /opt/youwei-trading-agent
        export IMAGE_REPO="\$(echo '${IMAGE_REPO}' | tr '[:upper:]' '[:lower:]')"
        echo '${GITHUB_TOKEN}' | docker login ghcr.io -u '${{ github.actor }}' --password-stdin
        docker compose -f docker-compose.prod.yml pull
        docker compose -f docker-compose.prod.yml up -d --remove-orphans
        docker compose -f docker-compose.prod.yml ps
        docker image prune -f
        EOF
```

**流程总结：**

```
CI runner
  ├── 在本地生成 .env（含所有 secrets）
  ├── scp .env + docker-compose.prod.yml → DO
  └── SSH 到 DO → docker login GHCR → pull → up -d
```

`build` job 已经把 `web:latest` 和 `akshare:latest` 推到 GHCR，`deploy` job 只是拉取并重启。

## 6. Nginx HTTPS 反代（核心）

容器跑起来了，但直接暴露 `8090` 到公网不安全。需要 Nginx 做 HTTPS 反代。

### 6.1 安装 Nginx + Certbot

```bash
apt install -y nginx certbot python3-certbot-nginx
systemctl enable --now nginx
```

### 6.2 配置域名 DNS

在你的域名服务商（或 Cloudflare）A 记录指向 DO 公网 IP。

```
A  @  <do-public-ip>  TTL: Auto
A  *  <do-public-ip>  TTL: Auto   （可选，泛解析）
```

等 5-10 分钟 DNS 传播。验证：

```bash
dig yourdomain.com +short
# 应返回 DO IP
```

### 6.3 Nginx 配置

创建 `/etc/nginx/sites-available/trading-agent`：

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Certbot 验证时访问此路径
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 其它 80 请求跳 HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL 证书（Certbot 申请后会自动填充）
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL 优化
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;

    # 反代到 web 容器
    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket + SSE（流式响应必需）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_read_timeout 120s;
    }
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/trading-agent /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t      # 验证配置语法
systemctl reload nginx
```

### 6.4 Certbot 申请证书

```bash
# 创建 certbot 验证目录
mkdir -p /var/www/certbot

# 申请证书（Certbot 会自动修改 Nginx 配置）
certbot --nginx -d yourdomain.com

# 验证自动续期
certbot renew --dry-run
```

Certbot 会把证书写到 `/etc/letsencrypt/live/yourdomain.com/`，并加 crontab 自动续期。

### 6.5 防火墙收紧

```bash
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP（重定向到 HTTPS）
ufw allow 443/tcp     # HTTPS
ufw enable
ufw status
```

8090 端口现在不需要对外开放（Nginx 从本机内部访问），但 `docker compose` 会把它绑到所有接口。收紧方式：

```yaml
# docker-compose.prod.yml
ports:
  - "127.0.0.1:8090:8090"   # 只监听 127.0.0.1
```

这样外部无法直接访问 8090，必须走 Nginx HTTPS。

## 7. 验证部署

### 7.1 容器状态（DO 上）

```bash
docker compose -f /opt/youwei-trading-agent/docker-compose.prod.yml ps
# 期望：web  Up (healthy)
```

### 7.2 直接访问容器

```bash
curl http://localhost:8090/api/health
# 期望：{"status":"ok"}

curl -I http://localhost:8090/
# 期望：HTTP/1.1 200 OK，Content-Type: text/html（React 首页）
```

### 7.3 走 Nginx 反代

```bash
curl -I https://yourdomain.com
# 期望：HTTP/2 200
```

### 7.4 端到端验证

浏览器访问 `https://yourdomain.com`：

1. 邮箱验证码登录
2. 发送"贵州茅台报价"→ A 股数据正常（走阿里云 ECS AKShare）
3. 发送"TSLA 报价"→ 美股数据正常（Yahoo Finance，DO 直接出网）
4. 发送"贵州茅台的基本面分析"→ 工具调用 + LLM 响应
5. 检查右侧分析面板有步骤展示

## 8. 常见问题

### Q：流式响应中断或只显示一半

Nginx 默认开启 `proxy_buffering`，会把后端的流式响应（SSE）先缓存再发给前端。如果 LLM 响应时间长，可能出现内容"卡住"。

**修复：**

```nginx
location /api/chat/stream {
    proxy_pass http://127.0.0.1:8090;
    proxy_buffering off;          # 关键
    proxy_read_timeout 120s;
    proxy_set_header Connection "";
    chunked_transfer_encoding on;
}
```

或在通用 `location /` 里加 `proxy_buffering off`（本文的配置已经加上）。

### Q：前端白屏 404

`frontend/dist` 没拷进最终镜像。检查 `Dockerfile.web` 的第三阶段：

```dockerfile
COPY --from=frontend /src/frontend/dist /app/frontend/dist
```

本地验证：

```bash
docker run --rm -it youwei-web:latest ls /app/frontend/dist
# 应看到 index.html、assets/ 等
```

### Q：CI 拉 GHCR 镜像超时

DigitalOcean 海外节点拉 `ghcr.io` 通常很快。如果偶发超时，加 GHCR 镜像代理或重试机制（DO 上 `docker pull` 本身支持断点续传）。

### Q：SQLite 文件权限问题

容器内用户 UID 可能和宿主机不同，导致写 `/data/sessions.db` 失败。

```bash
chown -R $(id -u):$(id -g) /opt/youwei-trading-agent/data
chmod 755 /opt/youwei-trading-agent/data
```

或在 compose 里加 `user: "${UID}:${GID}"`（但可能带来其他权限问题）。

### Q：HTTPS 证书申请失败

常见原因：

1. **DNS 未传播**：`dig yourdomain.com` 查不到 IP，等几分钟再试
2. **80 端口被防火墙挡**：临时 `ufw allow 80/tcp`（Certbot HTTP 验证必须走 80）
3. **Nginx 配置错误**：`nginx -t` 检查语法

### Q：如何回滚到旧版本

CI 每次部署都打 `:${{ github.sha }}` tag，可以精准回退：

```bash
cd /opt/youwei-trading-agent
# 改 docker-compose.prod.yml 的 image 行：
# image: ghcr.io/<owner>/<repo>/web:<旧的SHA>
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

或在 GitHub Actions 页面找到上一次成功的 workflow run，点 **Re-run all jobs**。

## 9. 总结

| 层级 | 组件 | 职责 |
| --- | --- | --- |
| 入口 | Nginx :443 | HTTPS 终止 + 反代 |
| 容器 | `web` :8090 | Go API + React 静态文件 |
| 数据 | SQLite `/data` | 用户对话持久化 |
| CI | GitHub Actions | 镜像构建 + 部署 |
| 镜像 | GHCR | 私有容器仓库 |

**这个项目的三篇部署文章：**

| 文章 | 部署目标 | 内容 |
| --- | --- | --- |
| [GitHub Actions + GHCR + SSH](./github-actions-ghcr-deploy.md) | 通用 CI/CD | 基础流水线模式 |
| 本文 | DigitalOcean | React+Go 容器 + Nginx HTTPS |
| [AKShare 部署到阿里云 ECS](./deploy-akshare-to-ecs.md) | 阿里云 ECS | A 股数据源 + 双环境并行 |

push to `main`，剩下的全自动。
