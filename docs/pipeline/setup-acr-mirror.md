---
lang: zh-CN
title: 阿里云 ACR 加速 GitHub Actions 部署到国内 ECS
description: 解决国内 ECS 拉取 ghcr.io 镜像慢的问题，通过阿里云容器镜像服务（ACR）做镜像中转，ECS 从 ACR 拉取速度提升 10 倍以上。
date: 2026-06-07
---

# 阿里云 ACR 加速 GitHub Actions 部署到国内 ECS

## 1. 问题背景

如果你的部署架构是：

```
GitHub Actions (海外 runner) 
  → 构建镜像推送到 GHCR (ghcr.io)
  → SSH 到国内 ECS 拉镜像
```

你会发现 `docker pull ghcr.io/...` 经常卡 5-15 分钟，甚至超时失败。原因：

1. **ghcr.io 服务器在海外**：国内网络访问 GitHub Packages 本身就不稳定
2. **Docker mirror 配置无效**：`/etc/docker/daemon.json` 里的 `registry-mirrors` 只对 Docker Hub 生效，对 ghcr.io 没用
3. **CI/CD 时间被严重拉长**：原本 1 分钟的部署变成 10+ 分钟

实测对比（上海 ECS 拉同一个镜像）：

| 镜像源 | 耗时 |
|--------|------|
| `ghcr.io/...` | 5-15 分钟 |
| `registry.cn-shanghai.aliyuncs.com/...` | 30 秒 |

## 2. 解决方案：CI 多推一份到 ACR

思路很简单：

```
GitHub Actions Build Job
  ├─→ docker push ghcr.io/...:latest     (给海外 DO 用)
  └─→ docker push registry.cn-shanghai.aliyuncs.com/...:latest   (给国内 ECS 用)

ECS Deploy Job
  └─→ docker pull registry.cn-shanghai.aliyuncs.com/...:latest
```

**核心原则**：
- 镜像只构建一次（在 GitHub Actions runner 上）
- 推送到两个不同的 registry
- 部署时按网络就近原则拉取

## 3. 阿里云 ACR 控制台配置

### 3.1 开通容器镜像服务

访问 https://cr.console.aliyun.com → 自动跳转到个人版（免费）

如果是首次使用，会自动创建实例，不需要额外操作。

### 3.2 选择地域

建议选和你 ECS **同一个地域**，延迟最低：

| ECS 地域 | ACR 推荐地域 |
|----------|-------------|
| 上海 | `cn-shanghai` |
| 杭州 | `cn-hangzhou` |
| 北京 | `cn-beijing` |
| 深圳 | `cn-shenzhen` |

> 如果不确定 ECS 在哪，选 `cn-shanghai`（资源最丰富，网络通达性最好）。

### 3.3 创建命名空间（Namespace）

- 左侧菜单：**实例列表 → 命名空间**
- 点 **创建命名空间**
- 命名：`youwei-agent`（建议和你的 GitHub 用户名/仓库名保持一致，方便记）

> 命名空间类似 Docker Hub 的用户名，用于组织镜像仓库。

### 3.4 创建镜像仓库（Repository）

- 左侧菜单：**镜像仓库**
- 点 **创建镜像仓库**
- 填写：
  - **命名空间**：`youwei-agent`（下拉选）
  - **仓库名称**：`akshare`（你项目的镜像名，如 `akshare`、`web`）
  - **摘要**：`A 股数据服务`（可选）
  - **仓库类型**：**私有**（⚠️ 必选，否则会公开你的代码）
- 下一步 → **本地仓库**（不用关联 GitHub/GitLab，我们直接 push）→ **下一步 → 创建镜像仓库**

### 3.5 设置访问凭证（固定密码）

- 左侧菜单：**访问凭证**
- **设置固定密码**：生成一个强密码（建议 16 位以上，含大小写 + 数字 + 符号）
  - 示例：`Youwei@ACR2026!xYz`
- **保存密码**（只显示一次，务必先复制保存）

**记下以下信息**：

| 项 | 值 | 示例 |
|----|---|------|
| Registry | `registry.<地域>.aliyuncs.com` | `registry.cn-shanghai.aliyuncs.com` |
| Username | 你的阿里云登录邮箱（主账号邮箱，不是 RAM 子账号） | `your@email.com` |
| Password | 刚才设的固定密码 | `Youwei@ACR2026!xYz` |

⚠️ **为什么是主账号邮箱不是 RAM 子账号**：
- ACR 个人版的认证机制和 RAM 分离，必须用阿里云主账号邮箱登录
- 如果你不记得主账号邮箱，去右上角头像 → 「基本信息」查看

## 4. GitHub Secrets 配置

**GitHub repo → Settings → Environments → production → Environment secrets**，添加 3 个：

| Secret Name | Value | 说明 |
|-------------|-------|------|
| `ACR_REGISTRY` | `registry.cn-shanghai.aliyuncs.com` | ACR 域名（按你的地域） |
| `ACR_USERNAME` | `your@email.com` | 阿里云主账号邮箱 |
| `ACR_PASSWORD` | `YourStrongPassword` | ACR 固定密码 |

## 5. 修改 `.github/workflows/deploy.yml`

### 5.1 Build job 加 ACR login + push

找到现有的 `docker/login-action` 和 `docker/build-push-action` 部分，在推送 GHCR 之后，再登录 ACR 并推送同一镜像：

```yaml
  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write   # for GHCR
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3

      # 1. Login GHCR
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # 2. Login ACR (新增)
      - uses: docker/login-action@v3
        with:
          registry: ${{ secrets.ACR_REGISTRY }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      # 3. Build & push web to GHCR
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile.web
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/web:${{ github.sha }}
            ghcr.io/${{ github.repository }}/web:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # 4. Build & push akshare to both GHCR + ACR (改动)
      - uses: docker/build-push-action@v6
        with:
          context: ./services/akshare
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/akshare:${{ github.sha }}
            ghcr.io/${{ github.repository }}/akshare:latest
            ${{ secrets.ACR_REGISTRY }}/youwei-agent/akshare:${{ github.sha }}
            ${{ secrets.ACR_REGISTRY }}/youwei-agent/akshare:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

> **注意**：`tags` 字段里加了 2 行 ACR 的 tag。`docker/build-push-action` 会自动 push 到所有指定的 registry，无需重复 build。

### 5.2 deploy-akshare job 改成从 ACR 拉

找到 `deploy-akshare` job，把 `IMAGE_REPO` 从 GHCR 改成 ACR：

```yaml
  deploy-akshare:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Install SSH key
        uses: shimataro/ssh-key-action@v2
        with:
          key: ${{ secrets.AK_SHARE_ECS_SSH_KEY }}
          known_hosts: 'placeholder'

      - name: Deploy AKShare to ECS
        env:
          AK_SHARE_ECS_HOST: ${{ secrets.AK_SHARE_ECS_HOST }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ACR_REGISTRY: ${{ secrets.ACR_REGISTRY }}
          ACR_USERNAME: ${{ secrets.ACR_USERNAME }}
          ACR_PASSWORD: ${{ secrets.ACR_PASSWORD }}
          IMAGE_REPO: ghcr.io/${{ github.repository }}   # 这个不再用
          ACR_IMAGE_REPO: ${{ secrets.ACR_REGISTRY }}/youwei-agent  # 新增
        run: |
          ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=60 -o ServerAliveCountMax=10 \
            root@${AK_SHARE_ECS_HOST} bash -s <<DEPLOY_EOF
          set -euo pipefail

          # Login ACR (不再 login GHCR)
          echo '${ACR_PASSWORD}' | docker login \
            -u '${ACR_USERNAME}' --password-stdin '${ACR_REGISTRY}'

          ACR_IMAGE_REPO="\$(echo '${ACR_IMAGE_REPO}' | tr '[:upper:]' '[:lower:]')"
          docker pull \${ACR_IMAGE_REPO}/akshare:latest

          docker stop akshare 2>/dev/null || true
          docker rm akshare 2>/dev/null || true
          docker run -d --name akshare --restart unless-stopped \
            -p 8888:8888 \${ACR_IMAGE_REPO}/akshare:latest

          sleep 5
          curl -fs http://localhost:8888/health \
            || { echo "AKShare health check FAILED"; exit 1; }
          docker image prune -f
          DEPLOY_EOF
```

### 5.3 修改后提交

```bash
git add .github/workflows/deploy.yml
git commit -m "feat(infra): use ACR mirror for ECS deployments"
git push origin main
```

## 6. 验证

### 6.1 CI 完成后检查 ACR 控制台

打开 ACR 控制台 → 镜像仓库 → 你创建的 `akshare` 仓库 → **镜像版本**

应该看到两个 tag：
- `<git-sha>`（如 `a4d0917`）
- `latest`

如果只有 `latest` 没有 sha tag，说明 CI 推送失败，看 Build job 日志。

### 6.2 在 ECS 上对比拉取速度

**手动测试**（可选，但推荐做一次）：

```bash
# SSH 到 ECS
ssh root@<your-ecs-ip>

# 测试拉 GHCR（慢）
time docker pull ghcr.io/youweichen0208/youwei-trading-agent/akshare:latest
# 预期：5-15 分钟

# 测试拉 ACR（快）
docker login -u <your-email> -p <password> registry.cn-shanghai.aliyuncs.com
time docker pull registry.cn-shanghai.aliyuncs.com/youwei-agent/akshare:latest
# 预期：< 1 分钟
```

### 6.3 部署成功后看 GitHub Actions 日志

打开 GitHub Actions → 最近一次 `deploy` workflow → 点击 `deploy-akshare` job → 展开 `Deploy AKShare to ECS` step：

应该看到类似这样的输出：

```
latest: Pulling from youwei-agent/akshare
...
Digest: sha256:...
Status: Downloaded newer image for registry.cn-shanghai.aliyuncs.com/youwei-agent/akshare:latest
{"status":"ok"}
```

整个 job 应该 1-2 分钟内完成，而不是之前 10+ 分钟。

## 7. 常见问题

### Q：ACR 个人版有限制吗？

| 限制项 | 个人版 | 企业版 |
|--------|--------|--------|
| 命名空间数量 | 3 个 / 实例 | 无限 |
| 仓库数量 | 300 个 / 命名空间 | 无限 |
| 镜像大小 | 无限制 | 无限制 |
| Pull 次数/月 | 100 万次 | 无限 |
| Push 次数/月 | 100 万次 | 无限 |

对个人项目或小团队完全够用。

### Q：要不要配置 ACR 跨地域同步？

**不需要**。你的 ECS 和 ACR 在同一个地域（都选 `cn-shanghai`），网络已经是最优路径。

跨地域同步（企业版功能）只有当你的 ECS 分布在全国多个地域时才有用。

### Q：Docker mirror 配置对什么有用？

`/etc/docker/daemon.json` 里的 `registry-mirrors` **只对 Docker Hub 生效**：

| 镜像源 | 受 mirror 影响 |
|--------|----------------|
| `docker.io/library/...` | ✅ 是 |
| `ghcr.io/...` | ❌ 否 |
| `registry.cn-shanghai.aliyuncs.com/...` | ❌ 否 |
| `gcr.io/...` | ❌ 否 |
| `quay.io/...` | ❌ 否 |

所以给 ghcr.io 加速必须用本文的「多 registry push」方案，mirror 没用。

### Q：CI 推送 ACR 失败：`unauthorized: authentication required`

检查 3 点：

1. **ACR 密码**：必须去控制台「访问凭证」设固定密码，不能用阿里云主账号登录密码
2. **ACR_USERNAME**：必须是主账号「邮箱」（不是手机号，不是 RAM 子账号用户名）
3. **仓库类型**：如果是「公开」仓库，push 不需要认证；如果是「私有」仓库，必须认证（推荐私有）

### Q：CI 推送 ACR 失败：`denied: requested access`

说明登录成功了，但没有 push 权限到该仓库。检查：

- 仓库存在：ACR 控制台 → 镜像仓库 → 是否已创建 `akshare` 仓库
- 命名空间匹配：tag 里的命名空间是 `youwei-agent`，控制台的命名空间也是 `youwei-agent`
- 仓库名匹配：tag 里是 `akshare`，控制台的仓库名也是 `akshare`

### Q：ECS 拉取 ACR 失败：同样的 unauthorized

ECS 上的 `docker login` 命令要正确：

```bash
docker login -u <your-email> -p <password> registry.cn-shanghai.aliyuncs.com
```

注意 `-p` 后面跟的是 ACR 固定密码，不是阿里云登录密码。

CI 里是用 `${ACR_PASSWORD}` 通过 stdin 传入，避免密码出现在 shell history。

### Q：为什么不直接用 ECS 上的 ACR 镜像，把 GHCR 的删掉？

**不要删 GHCR**，原因：

1. **DO 部署（海外）还是走 GHCR 快**
2. **备份原则**：万一 ACR 挂了，GHCR 还在，可以快速恢复
3. **历史版本**：GHCR 上保留完整的 commit sha 历史，方便回滚

两个 registry 各一份镜像，是标准的「双写」模式，多花一点点存储成本（ACR 个人版免费存储无限，GHCR 免费存储也无限），换来高可用和就近访问。

## 8. 总结

| 项 | 配置前 | 配置后 |
|----|--------|--------|
| ECS 拉取 akshare 镜像耗时 | 5-15 分钟 | < 1 分钟 |
| 部署成功率 | ~70%（经常超时） | ~100% |
| CI/CD 总体时长 | 15+ 分钟 | 3-4 分钟 |

本文档的配置成本：
- ACR 控制台配置（5 分钟，一次性）
- GitHub Secrets 加 3 个值（1 分钟）
- 改 `deploy.yml` 两处（5 分钟）

总计 10 分钟左右，换来每次部署节省 10+ 分钟，**强烈建议在国内 ECS 部署的场景下配 ACR mirror**。

## 9. 系列文章

| 文章 | 内容 |
|------|------|
| [GitHub Actions + GHCR + SSH](./github-actions-ghcr-deploy.md) | 基础 CI/CD 流水线模式 |
| [DO 部署 Web](./deploy-web-to-do.md) | DigitalOcean 上部署 React+Go 容器 |
| [ECS 部署 AKShare](./deploy-akshare-to-ecs.md) | 阿里云 ECS 上部署 A 股数据源（本文加速它的镜像拉取） |
| [阿里云邮件验证码](./setup-aliyun-email.md) | DirectMail 配置，真正发送验证邮件 |
| 本文 | ACR 镜像中转加速国内 ECS 部署 |
