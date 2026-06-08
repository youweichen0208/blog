---
lang: zh-CN
title: GitHub Actions + GHCR + SSH 自动部署到 DigitalOcean
description: 代码合入 main 后自动构建镜像、推送到 GHCR、SSH 到 DigitalOcean Droplet 拉取并重启服务，完整 CI/CD 流水线教程。
date: 2026-06-06
---

# GitHub Actions + GHCR + SSH 自动部署到 DigitalOcean

手动部署代码到服务器既痛苦又容易出错。本教程演示如何搭建一套完整的 CI/CD 流水线：**代码合入 `main` 后，GitHub Actions 自动跑测试、构建 Docker 镜像、推送到 GHCR，然后通过 SSH 到 DigitalOcean Droplet 拉取并重启服务**。

## 整体架构

```
git push → main
       ↓
GitHub Actions
  ├── test      (go build / vet / test)
  ├── build     (docker buildx → 推 ghcr.io)
  └── deploy    (scp .env + docker-compose.prod.yml → SSH pull + up -d)
       ↓
DigitalOcean Droplet
  └── docker compose pull → up -d
```

用到的组件：
- **GitHub Actions**：流水线引擎
- **GHCR**（GitHub Container Registry）：镜像仓库，与 GitHub 原生集成
- **DigitalOcean Droplet**：生产服务器
- **docker compose**：服务编排（容器运行，而非 bare binary）

## 前置条件

| 条件 | 说明 |
| --- | --- |
| GitHub repo | 代码托管在 GitHub |
| DigitalOcean Droplet | 已开通，能 SSH root 登录 |
| Docker | Droplet 已安装 `docker.io` 和 `docker-compose-plugin` |
| 域名（可选） | 已解析到 Droplet IP，配合 Caddy/Nginx 提供 HTTPS |

## 1. 准备 DigitalOcean Droplet

### 1.1 安装 Docker

```bash
# 在 Droplet 上以 root 执行
apt update && apt install -y docker.io docker-compose-plugin
systemctl enable --now docker
```

### 1.2 创建应用目录

```bash
mkdir -p /opt/youwei-trading-agent/data
```

应用镜像、compose 文件、环境变量将统一存放在该目录下，持久化数据（SQLite）挂在 `data/` 子目录。

## 2. 生成 CI 专用 SSH 密钥

GitHub Actions 需要 SSH 登录 Droplet。建议**单独生成一对专用密钥**，而不是复用你本地的私钥：

```bash
# 在本地执行（不需要密码短语，CI 用）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ci_deploy_key -N ""
```

把公钥追加到 Droplet 的 `~/.ssh/authorized_keys`：

```bash
ssh-copy-id -i ci_deploy_key.pub root@<DROPLET_IP>
```

保存 **私钥** 内容（`ci_deploy_key` 文件内容），待会要放进 GitHub Secrets。

测试免密登录：

```bash
ssh -i ci_deploy_key root@<DROPLET_IP> hostname
```

## 3. 编写 GitHub Actions Workflow

在仓库创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:   # 支持手动触发

jobs:
  # ── 阶段 1：跑测试，失败则阻断流水线 ──
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.24'
      - run: go build ./...
      - run: go vet ./...
      - run: go test ./...

  # ── 阶段 2：构建并推送镜像到 GHCR ──
  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write   # 必须有写 GHCR 的权限
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # 构建 bot-wecom
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile.bot-wecom
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/bot-wecom:${{ github.sha }}
            ghcr.io/${{ github.repository }}/bot-wecom:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # 构建 akshare（Python 服务）
      - uses: docker/build-push-action@v6
        with:
          context: ./services/akshare
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/akshare:${{ github.sha }}
            ghcr.io/${{ github.repository }}/akshare:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ── 阶段 3：SSH 部署到 Droplet ──
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production    # 触发 production 环境审批（可选）
    steps:
      - uses: actions/checkout@v4

      - name: 准备 .env 文件
        run: |
          cat > .env << 'ENVEOF'
          DASHSCOPE_API_KEY=${{ secrets.DASHSCOPE_API_KEY }}
          TAVILY_API_KEY=${{ secrets.TAVILY_API_KEY }}
          AGENT_MODEL=${{ vars.AGENT_MODEL }}
          AGENT_SEARCH_DEFAULT=${{ vars.AGENT_SEARCH_DEFAULT }}
          WECOM_CORP_ID=${{ secrets.WECOM_CORP_ID }}
          WECOM_AGENT_ID=${{ secrets.WECOM_AGENT_ID }}
          WECOM_SECRET=${{ secrets.WECOM_SECRET }}
          WECOM_TOKEN=${{ secrets.WECOM_TOKEN }}
          WECOM_AES_KEY=${{ secrets.WECOM_AES_KEY }}
          SQLITE_PATH=/data/sessions.db
          LOG_LEVEL=info
          HTTP_ADDR=:8080
          ENVEOF
          sed -i '/^$/d; s/^[[:space:]]*//' .env

      - name: 同步文件到服务器
        env:
          DO_HOST: ${{ secrets.DO_HOST }}
        run: |
          ssh -o StrictHostKeyChecking=accept-new \
            root@${DO_HOST} \
            mkdir -p /opt/youwei-trading-agent/data
          scp -o StrictHostKeyChecking=accept-new \
            .env docker-compose.prod.yml \
            root@${DO_HOST}:/opt/youwei-trading-agent/

      - name: 拉取镜像并重启
        env:
          DO_HOST: ${{ secrets.DO_HOST }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          IMAGE_REPO: ghcr.io/${{ github.repository }}
        run: |
          ssh -o StrictHostKeyChecking=accept-new root@${DO_HOST} \
            bash -s <<EOF
            set -euo pipefail
            cd /opt/youwei-trading-agent
            export IMAGE_REPO="\$(echo '${IMAGE_REPO}' | tr '[:upper:]' '[:lower:]')"
            echo '${GITHUB_TOKEN}' | docker login ghcr.io \\
              -u '${{ github.actor }}' --password-stdin
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d \\
              --remove-orphans
            docker compose -f docker-compose.prod.yml ps
            docker image prune -f
            EOF
```

**关键细节：**

- `GITHUB_TOKEN` 是 GitHub Actions 自动注入的，不需要手动创建 Secret。但 GHCR 私有仓库需要 `packages: write` 权限，已在 `build` job 里声明。
- `github.repository` 自动返回 `owner/repo` 格式，但必须 `tr '[:upper:]' '[:lower:]'` 转小写，否则 GHCR 会拒绝。
- `.env` 在 CI runner 本地生成，再 `scp` 到服务器，避免在 SSH bash heredoc 里嵌套多行字符串导致的转义问题。

## 4. 编写 docker-compose.prod.yml

在仓库根目录创建 `docker-compose.prod.yml`，与本地 `docker-compose.yml` 的区别是：**image 从 GHCR 拉取，而不是本地 build**：

```yaml
services:
  akshare:
    image: ${IMAGE_REPO}/akshare:latest
    ports:
      - "8888:8888"
    healthcheck:
      test: ["CMD", "python", "-c",
        "import urllib.request; urllib.request.urlopen('http://localhost:8888/health', timeout=3)"]
      interval: 30s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  bot-wecom:
    image: ${IMAGE_REPO}/bot-wecom:latest
    env_file: .env
    environment:
      AKSHARE_SERVICE_URL: http://akshare:8888
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data
    depends_on:
      akshare:
        condition: service_healthy
    restart: unless-stopped
```

`IMAGE_REPO` 由 deploy 阶段在 SSH 里 export，避免写死在配置文件中。

## 5. 配置 GitHub Secrets

进入 GitHub repo → **Settings → Secrets and variables → Actions**，依次添加：

### Repository secrets（加密，日志中不可见）

| Name | 值 |
| --- | --- |
| `DO_HOST` | Droplet 公网 IP，如 `188.166.xxx.xxx` |
| `DO_SSH_KEY` | `ci_deploy_key` 私钥的完整内容 |
| `DASHSCOPE_API_KEY` | 阿里云百炼 API Key |
| `TAVILY_API_KEY` | Tavily 搜索 API Key |
| `WECOM_CORP_ID` | 企业微信企业 ID |
| `WECOM_AGENT_ID` | 企业微信应用 ID |
| `WECOM_SECRET` | 企业微信应用 Secret |
| `WECOM_TOKEN` | 企业微信回调 Token |
| `WECOM_AES_KEY` | 企业微信回调 EncodingAESKey |

### Repository variables（不加密，适合非敏感配置）

| Name | 值 |
| --- | --- |
| `AGENT_MODEL` | `qwen-plus` |
| `AGENT_SEARCH_DEFAULT` | `true` |

### Environment（可选，加人工审批）

进入 **Settings → Environments → New environment**，创建 `production`。可以：
- 打开 **Required reviewers**：每次部署需要指定人员点 Approve
- 添加 **Deployment branches**：只允许 `main` 触发
- 设置 **Wait timer**：强制等待一段时间

> **⚠️ Environment Secrets vs Repository Secrets：最容易踩的坑**
>
> 如果你的 `deploy` job 加了 `environment: production`，它**只能访问 Environment 级别的 Secrets**，不能访问 Repository 级别的 Secrets。
>
> GitHub 把 Secrets 分两层：
>
> | 层级 | 位置 | deploy job 是否能访问 |
> | --- | --- | --- |
> | Repository secrets | Settings → Secrets and variables → **Actions** | ❌ 不能（如果 job 有 environment） |
> | Environment secrets | Settings → Environments → **production** → Environment secrets | ✅ 能 |
>
> **推荐做法**：把所有生产 Secret 都配在 **production Environment** 下（Settings → Environments → production → Environment secrets），Repository 级别只放公共的非敏感配置（如 `AGENT_MODEL`）。
>
> 详见 [部署 Web 到 DO 的踩坑 FAQ](./deploy-web-to-do.md#qgithub-environment-secrets-vs-repository-secrets-不生效)。

## 6. 触发与验证

### 6.1 自动触发

```bash
git checkout main
echo "# 触发部署" >> README.md
git add README.md
git commit -m "chore: trigger CI deploy"
git push origin main
```

进入 GitHub → repo → **Actions** 页面，能看到 workflow 正在运行。

### 6.2 手动触发

支持 `workflow_dispatch`，可以在 Actions 页面点 **Run workflow** 按钮手动部署。

### 6.3 验证部署

```bash
# 在 Droplet 上
docker compose -f /opt/youwei-trading-agent/docker-compose.prod.yml ps
# 应看到 akshare 和 bot-wecom 都是 Up

# 检查健康
curl http://localhost:8080/health
```

## 7. 常见问题

### Q: GHCR 登录失败，403 Forbidden

GHCR 私有仓库需要 `packages: write` 权限。确认 `build` job 的 `permissions` 已声明：

```yaml
permissions:
  contents: read
  packages: write
```

### Q: `toomanyrequests: You have reached your pull rate limit`

Docker Hub 免费配额有限。如果你的镜像依赖 Docker Hub（如 `golang:1.24-alpine`），可以在 workflow 里加 Docker Hub 登录：

```yaml
- uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKERHUB_USERNAME }}
    password: ${{ secrets.DOCKERHUB_TOKEN }}
```

或把基础镜像换成 GHCR 上的镜像。

### Q: Droplet 上 `docker compose pull` 超时（从海外拉 GCR/GHCR）

如果你的 Droplet 在中国大陆，拉 `ghcr.io` 可能很慢。解决方案：
- **推荐**：在 GitHub Actions 里 build 时多推一份到国内镜像（阿里云 ACR、腾讯云 TCR），Droplet 从国内拉
- 配置 Droplet 的 Docker daemon 走代理：编辑 `/etc/docker/daemon.json`
  ```json
  {"proxies": {"http-proxy": "http://proxy:port", "https-proxy": "http://proxy:port"}}
  ```

### Q: SSH connection refused / timeout

- 确认 Droplet 安全组（防火墙）开放了 22 端口
- 确认 `DO_SSH_KEY` 是 **私钥内容**，不是文件路径
- 测试本地能否直接 SSH：`ssh -i ci_deploy_key root@<IP>`

### Q: 如何回滚到上一个版本？

workflow 默认打 <code v-pre>&#58;${{ github.sha }}</code> 和 `:latest` 两个 tag。回滚时 SSH 到 Droplet：

```bash
cd /opt/youwei-trading-agent

# 列出可用 tag（在 GHCR web UI 或 docker 命令）
docker image ls ghcr.io/<owner>/<repo>/bot-wecom

# 用具体 SHA tag 拉取历史版本
docker pull ghcr.io/<owner>/<repo>/bot-wecom:<旧SHA>

# 手动修改 docker-compose.prod.yml 或用 sed 替换 latest → <旧SHA>
# 然后重启
docker compose -f docker-compose.prod.yml up -d
```

或者更简单：在 GitHub Actions 页面找到上一次成功的 workflow run，点 **Re-run all jobs**。

## 8. 进阶优化

### 8.1 只发版部署，不每次 push 都部署

把触发条件从 `push` 改成 `release`：

```yaml
on:
  release:
    types: [published]
```

每次打 tag + 发布 Release 才触发部署，适合正式项目。

### 8.2 多服务分步健康检查

部署后主动轮询健康端点，失败则报警：

```yaml
- name: Wait for services healthy
  run: |
    for i in {1..10}; do
      if curl -sf http://${DO_HOST}:8080/health; then
        echo "Services healthy"
        exit 0
      fi
      sleep 5
    done
    echo "Health check timeout" >&2
    exit 1
```

### 8.3 通知到企业微信 / Telegram

部署结果推送到聊天群（适合团队协作）：

```yaml
- name: Notify success
  if: success()
  run: |
    curl -X POST "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${WEBHOOK}" \
      -H 'Content-Type: application/json' \
      -d '{"msgtype":"text","text":{"content":"✅ 部署成功: ${{ github.sha }}"}}'
```

### 8.4 滚动更新 / 蓝绿部署

当前方案是 `pull + up -d`，有几秒服务中断。如果需要零停机：
- 使用 `docker swarm` + rolling update
- 或在 Droplet 前置 Nginx/Caddy，新旧容器并存切换

## 总结

| 阶段 | 耗时 | 作用 |
| --- | --- | --- |
| `test` | ~1min | Go 编译 + 单测，守住质量关 |
| `build` | ~3min | 构建多架构镜像，推 GHCR |
| `deploy` | ~1min | scp 配置 → pull 镜像 → restart |

**核心优势**：整套流程在 GitHub 生态内闭环，不需要自建 Jenkins / GitLab Runner / Harbor，适合中小团队快速上线。

把这套流水线接好之后，开发者只需要 `git push`，剩下的全自动。
