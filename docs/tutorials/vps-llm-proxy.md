---
lang: zh-CN
title: 海外 VPS 部署多 LLM API 代理
description: 使用 Nginx 反向代理在海外 VPS 上搭建 OpenAI、Anthropic、Gemini 等多 LLM API 的统一代理入口。
date: 2026-05-13
tags:
  - VPS
  - Nginx
  - LLM
  - API代理
---

# 海外 VPS 部署多 LLM API 代理 - 完整教程

> **适用场景**：Ubuntu/Debian VPS + 有域名 + 代理 OpenAI / Anthropic / Gemini 等海外 API
>
> **预计耗时**：30-60 分钟
>
> **难度**：⭐⭐⭐（需要基础 Linux 命令）

---

## 目录

- [一、整体架构](#一整体架构)
- [二、前置准备](#二前置准备)
- [三、VPS 基础配置](#三vps-基础配置)
- [四、域名解析](#四域名解析)
- [五、安装 Nginx](#五安装-nginx)
- [六、申请 SSL 证书](#六申请-ssl-证书)
- [七、编写代理配置](#七编写代理配置)
- [八、测试验证](#八测试验证)
- [九、Hermes Agent 集成](#九hermes-agent-集成)
- [十、监控与维护](#十监控与维护)
- [十一、安全加固](#十一安全加固)
- [十二、故障排查](#十二故障排查)
- [附录 A：一键安装脚本](#附录-a一键安装脚本)
- [附录 B：常见问题 FAQ](#附录-b常见问题-faq)

---

## 一、整体架构

### 1.1 数据流

```
┌──────────────────────────────────┐
│   Mac mini（国内）                │
│   ├── Hermes Agent               │
│   └── 业务服务                    │
└──────────────┬───────────────────┘
               │ HTTPS 加密
               │ https://api.yourdomain.com/...
               ▼
┌──────────────────────────────────┐
│   海外 VPS                        │
│   ├── Nginx 反向代理              │
│   ├── Let's Encrypt SSL          │
│   └── 路由规则                    │
└──────────────┬───────────────────┘
               │
       ┌───────┼────────┬──────────┐
       ▼       ▼        ▼          ▼
   OpenAI  Anthropic  Gemini  其他 API
```

### 1.2 路由设计

| 客户端请求路径 | 转发到 |
|--------------|--------|
| `https://api.yourdomain.com/openai/v1/...` | `https://api.openai.com/v1/...` |
| `https://api.yourdomain.com/anthropic/v1/...` | `https://api.anthropic.com/v1/...` |
| `https://api.yourdomain.com/gemini/v1/...` | `https://generativelanguage.googleapis.com/v1/...` |
| `https://api.yourdomain.com/health` | 健康检查（直接返回 ok） |

### 1.3 安全设计

- ✅ HTTPS 全程加密（Let's Encrypt 受信证书）
- ✅ 访问令牌（x-proxy-token Header）防滥用
- ✅ 速率限制（每分钟 60 次）
- ✅ 防火墙只开必要端口
- ✅ SSH 密钥登录 + fail2ban

---

## 二、前置准备

### 2.1 你需要有

- ✅ **海外 VPS**：Ubuntu 20.04+ 或 Debian 11+，1 核 1G 配置即可
  - 推荐地区：东京、新加坡、香港（离中国近）
  - 推荐厂商：Vultr、DigitalOcean、AWS Lightsail、搬瓦工
- ✅ **域名**：任意 TLD，`.xyz` / `.top` 等便宜的就行
- ✅ **VPS 的 SSH 访问权限**（root 或 sudo 用户）
- ✅ **Mac/Windows 本地终端**（Mac 自带 Terminal，Windows 用 PowerShell 或 WSL）

### 2.2 准备工作清单

在开始前，请准备好以下信息：

```
□ VPS IP 地址：___________________
□ VPS SSH 端口：__________ (默认 22)
□ VPS 用户名：____________ (默认 root 或 ubuntu)
□ SSH 密钥或密码：________________
□ 域名：_____________________ (如 example.com)
□ 子域名前缀：________ (推荐 api)
□ 你的邮箱：_______________ (用于 Let's Encrypt 通知)
```

### 2.3 测试 VPS 网络

在正式配置前，**必须验证 VPS 能访问目标 API**：

```bash
# SSH 到 VPS 后执行
curl -v --max-time 10 https://api.openai.com/v1/models 2>&1 | head -20

# 看到 "HTTP/2 401" 是好事，说明能连上 OpenAI
# 看到 "Could not resolve" 或 "timeout" → VPS 网络也有问题
```

**如果 VPS 本身连不上 OpenAI**，要么换 VPS 提供商，要么换地区（个别廉价 VPS 也被限制）。

---

## 三、VPS 基础配置

### 3.1 SSH 连接

```bash
# 在你本地电脑（Mac/Windows）执行

# 使用密码登录
ssh root@YOUR_VPS_IP

# 使用密钥登录
ssh -i ~/.ssh/your-key.pem root@YOUR_VPS_IP

# 自定义端口
ssh -p 22022 root@YOUR_VPS_IP
```

### 3.2 系统更新

```bash
# 更新软件包列表
apt update

# 升级已安装的软件
apt upgrade -y

# 安装常用工具
apt install -y curl wget vim htop ufw git
```

### 3.3 配置时区（可选）

```bash
# 查看当前时区
timedatectl

# 设置为亚洲/上海（方便看日志）
timedatectl set-timezone Asia/Shanghai

# 或者 UTC（推荐服务器统一用 UTC）
timedatectl set-timezone UTC
```

### 3.4 配置防火墙

```bash
# 启用 UFW
ufw allow 22/tcp      # SSH（必须，否则会被锁在外面）
ufw allow 80/tcp      # HTTP（用于 Let's Encrypt 证书验证）
ufw allow 443/tcp     # HTTPS（API 代理）

# 启用防火墙
ufw --force enable

# 查看状态
ufw status verbose
```

预期输出：

```
Status: active
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

---

## 四、域名解析

### 4.1 在域名管理面板添加 DNS 记录

不管你用哪家域名服务商（Cloudflare/Namecheap/阿里云等），都是添加一条 **A 记录**：

```
记录类型: A
主机记录:  api          (你要的子域名前缀)
记录值:   YOUR_VPS_IP   (你的 VPS IP 地址)
TTL:      600 秒         (1 小时内生效)
代理状态: 仅 DNS（如果用 Cloudflare，选灰色云朵，不要橙色）
```

### 4.2 Cloudflare 用户特别说明

如果你用 Cloudflare 管理 DNS：

1. 登录 Cloudflare 控制台
2. 选择你的域名
3. 进入 **DNS** 标签页
4. 点击 **Add record**
5. 填写：
   - Type: `A`
   - Name: `api`
   - IPv4 address: `YOUR_VPS_IP`
   - Proxy status: **DNS only**（重要！点击橙色云朵变灰色）
6. 保存

> ⚠️ **重要**：必须关闭 Cloudflare 代理（橙色云朵），否则会和你的 SSL 证书冲突。

### 4.3 验证 DNS 生效

```bash
# 在 Mac 上验证（用你的实际域名替换）
dig api.yourdomain.com +short

# 应该返回你的 VPS IP
# 如果没返回，等 1-10 分钟（DNS 传播需要时间）

# 也可以用 nslookup
nslookup api.yourdomain.com

# 在 VPS 上 ping 自己的域名也能验证
ping api.yourdomain.com -c 3
```

---

## 五、安装 Nginx

### 5.1 安装

```bash
# VPS 上执行
apt install -y nginx

# 启动服务
systemctl start nginx
systemctl enable nginx    # 设置开机自启

# 验证状态
systemctl status nginx
```

应该看到 `active (running)` 状态。

### 5.2 验证 Nginx 可访问

```bash
# 在 VPS 上自测
curl http://localhost
# 应该看到 Nginx 欢迎页 HTML

# 在 Mac 上访问（用浏览器或 curl）
curl http://YOUR_VPS_IP
# 或浏览器打开 http://YOUR_VPS_IP
```

看到 "Welcome to nginx!" 说明 Nginx 运行正常。

### 5.3 清理默认配置

```bash
# 删除默认 site（避免和我们的配置冲突）
rm /etc/nginx/sites-enabled/default

# 重启 Nginx
systemctl reload nginx
```

---

## 六、申请 SSL 证书

使用 **Let's Encrypt** 免费证书，通过 **Certbot** 自动化管理。

### 6.1 安装 Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 6.2 申请证书

```bash
# 用你的实际域名和邮箱替换
certbot --nginx -d api.yourdomain.com --email your@email.com --agree-tos --no-eff-email --redirect
```

参数说明：
- `--nginx`：自动配置 Nginx
- `-d api.yourdomain.com`：要申请证书的域名
- `--email`：通知邮箱
- `--agree-tos`：同意服务条款
- `--no-eff-email`：不订阅 EFF 邮件
- `--redirect`：自动配置 HTTP → HTTPS 跳转

成功后会看到：

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/api.yourdomain.com/privkey.pem
This certificate expires on 2026-08-XX.
```

### 6.3 验证自动续期

Certbot 已自动设置定时任务，证书会在到期前自动续期：

```bash
# 测试续期（不会实际续期，只是模拟）
certbot renew --dry-run

# 查看续期任务
systemctl status certbot.timer
```

---

## 七、编写代理配置

### 7.1 生成访问令牌

为了防止有人发现你的代理地址后乱用，加一层简单的 token 验证：

```bash
# 生成 32 字节的随机 token
openssl rand -base64 32
```

**复制输出，妥善保存**。例如：

```
abc123XyZ456def789GhI012jkL345mnO678pqR=
```

这个 token 后面要写进 Nginx 配置 + Hermes 配置。

### 7.2 创建主配置文件

```bash
vim /etc/nginx/sites-available/llm-proxy
```

粘贴下面的完整配置（**替换 3 个地方**：域名、token、邮箱可选）：

```nginx
# ============================================
# LLM API 代理 - Nginx 配置
# ============================================

# 速率限制：每个 IP 每分钟 60 次（防滥用）
limit_req_zone $binary_remote_addr zone=llm_limit:10m rate=60r/m;

# ============================================
# HTTP 强制跳转 HTTPS
# ============================================
server {
    listen 80;
    server_name api.yourdomain.com;   # ⭐ 修改：你的域名

    return 301 https://$server_name$request_uri;
}

# ============================================
# HTTPS 主服务
# ============================================
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;   # ⭐ 修改：你的域名

    # ---- SSL 证书（Certbot 自动配置）----
    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # ---- SSL 安全配置 ----
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # ---- 日志 ----
    access_log /var/log/nginx/llm-proxy-access.log;
    error_log  /var/log/nginx/llm-proxy-error.log warn;

    # ---- 请求体大小（GPT 上下文可能很长）----
    client_max_body_size 50M;

    # ---- 超时设置（LLM 响应慢）----
    proxy_connect_timeout 60s;
    proxy_send_timeout    600s;
    proxy_read_timeout    600s;

    # ---- 关键：流式响应（SSE）支持 ----
    proxy_buffering         off;
    proxy_cache             off;
    proxy_http_version      1.1;
    proxy_set_header        Connection "";

    # ---- DNS 解析器（用于动态域名解析）----
    resolver 8.8.8.8 1.1.1.1 valid=300s ipv6=off;
    resolver_timeout 5s;

    # ---- 访问令牌验证 ----
    set $proxy_token "PASTE_YOUR_TOKEN_HERE";   # ⭐ 修改：你的 token
    if ($http_x_proxy_token != $proxy_token) {
        return 403;
    }

    # ============================================
    # 路由：OpenAI
    # ============================================
    location /openai/ {
        limit_req zone=llm_limit burst=20 nodelay;

        # 去掉前缀 /openai/，转发到 OpenAI
        proxy_pass https://api.openai.com/";

        # 必要的请求头
        proxy_set_header Host              api.openai.com;
        proxy_set_header Authorization     $http_authorization;
        proxy_set_header Content-Type      $http_content_type;
        proxy_set_header User-Agent        $http_user_agent;
        proxy_set_header OpenAI-Organization $http_openai_organization;
        proxy_set_header OpenAI-Beta       $http_openai_beta;

        # SNI（必须）
        proxy_ssl_server_name on;
        proxy_ssl_name        api.openai.com;
        proxy_ssl_verify      off;
    }

    # ============================================
    # 路由：Anthropic Claude
    # ============================================
    location /anthropic/ {
        limit_req zone=llm_limit burst=20 nodelay;

        proxy_pass https://api.anthropic.com/";

        # Anthropic 用 x-api-key 而不是 Authorization
        proxy_set_header Host                 api.anthropic.com;
        proxy_set_header x-api-key            $http_x_api_key;
        proxy_set_header anthropic-version    $http_anthropic_version;
        proxy_set_header anthropic-beta       $http_anthropic_beta;
        proxy_set_header Content-Type         $http_content_type;

        proxy_ssl_server_name on;
        proxy_ssl_name        api.anthropic.com;
        proxy_ssl_verify      off;
    }

    # ============================================
    # 路由：Google Gemini
    # ============================================
    location /gemini/ {
        limit_req zone=llm_limit burst=20 nodelay;

        proxy_pass https://generativelanguage.googleapis.com/";

        proxy_set_header Host          generativelanguage.googleapis.com;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header x-goog-api-key $http_x_goog_api_key;
        proxy_set_header Content-Type  $http_content_type;

        proxy_ssl_server_name on;
        proxy_ssl_name        generativelanguage.googleapis.com;
        proxy_ssl_verify      off;
    }

    # ============================================
    # 路由：Mistral（备用）
    # ============================================
    location /mistral/ {
        limit_req zone=llm_limit burst=20 nodelay;

        proxy_pass https://api.mistral.ai/";

        proxy_set_header Host          api.mistral.ai;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Content-Type  $http_content_type;

        proxy_ssl_server_name on;
        proxy_ssl_name        api.mistral.ai;
        proxy_ssl_verify      off;
    }

    # ============================================
    # 健康检查（不需要 token）
    # ============================================
    location = /health {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }

    # ============================================
    # 默认拒绝其他路径
    # ============================================
    location / {
        return 404 "Not Found\n";
    }
}
```

**保存退出**（Vim：`ESC` → `:wq` → 回车）。

### 7.3 必须修改的 3 个地方

```nginx
# 1. server_name（两处）
server_name api.yourdomain.com;   ← 改成你的域名

# 2. SSL 证书路径
ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
                                  ↑ 改成你的域名

# 3. 访问令牌
set $proxy_token "PASTE_YOUR_TOKEN_HERE";   ← 替换为你生成的 token
```

### 7.4 启用配置

```bash
# 创建软链接启用
ln -s /etc/nginx/sites-available/llm-proxy /etc/nginx/sites-enabled/

# 测试 Nginx 配置语法
nginx -t
```

应该看到：

```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

如果有错误，按提示修改后再测试。

```bash
# 重新加载 Nginx
systemctl reload nginx

# 查看运行状态
systemctl status nginx
```

---

## 八、测试验证

### 8.1 测试 1：健康检查

```bash
# 在 Mac 本地测试（任何位置都行）
curl https://api.yourdomain.com/health

# 预期输出
ok
```

✅ 健康检查通过说明：
- DNS 解析正常
- Nginx 运行正常
- SSL 证书有效
- HTTPS 通畅

### 8.2 测试 2：Token 验证

```bash
# 不带 token（应该被拒）
curl https://api.yourdomain.com/openai/v1/models

# 预期：403 Forbidden
```

### 8.3 测试 3：调 OpenAI

```bash
# 用你真实的 OpenAI API Key 测试
curl https://api.yourdomain.com/openai/v1/models \
  -H "x-proxy-token: 你的token" \
  -H "Authorization: Bearer sk-你的OpenAI密钥"

# 预期：返回 OpenAI 的模型列表 JSON
```

### 8.4 测试 4：调 Claude

```bash
curl https://api.yourdomain.com/anthropic/v1/messages \
  -H "x-proxy-token: 你的token" \
  -H "x-api-key: sk-ant-你的Claude密钥" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-haiku-4-5",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 8.5 测试 5：实际对话（流式）

```bash
curl https://api.yourdomain.com/openai/v1/chat/completions \
  -H "x-proxy-token: 你的token" \
  -H "Authorization: Bearer sk-你的OpenAI密钥" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "用一句话介绍你自己"}],
    "stream": true
  }'

# 预期：看到 SSE 流式输出
# data: {"choices":[{"delta":{"content":"我"}}]}
# data: {"choices":[{"delta":{"content":"是"}}]}
# ...
```

如果以上测试都通过，**你的代理已经正常工作**！🎉

---

## 九、Hermes Agent 集成

回到你的 Mac mini，配置 Hermes 使用代理。

### 9.1 编辑 Hermes 配置

```bash
# 在 Mac 上
vim ~/.hermes/config.yaml
```

### 9.2 完整配置示例

```yaml
# ============================================
# Hermes Agent 配置
# ============================================

agent:
  name: stock-assistant
  description: 股票分析与告警助手

# ============================================
# 模型配置（通过海外 VPS 代理）
# ============================================
models:
  # 默认模型
  default: gpt-4o-mini

  providers:
    # ---- OpenAI（走海外代理）----
    openai:
      api_key: ${OPENAI_API_KEY}
      base_url: https://api.yourdomain.com/openai/v1   # ⭐ 你的代理
      extra_headers:
        x-proxy-token: ${PROXY_TOKEN}                   # ⭐ 你的 token
      models:
        - gpt-4o-mini
        - gpt-4o
        - gpt-5-codex
      timeout: 120s

    # ---- Anthropic Claude（走海外代理）----
    anthropic:
      api_key: ${ANTHROPIC_API_KEY}
      base_url: https://api.yourdomain.com/anthropic
      extra_headers:
        x-proxy-token: ${PROXY_TOKEN}
        anthropic-version: "2023-06-01"
      models:
        - claude-haiku-4-5
        - claude-sonnet-4.6
        - claude-opus-4.7
      timeout: 120s

    # ---- Google Gemini（走海外代理）----
    gemini:
      api_key: ${GEMINI_API_KEY}
      base_url: https://api.yourdomain.com/gemini
      extra_headers:
        x-proxy-token: ${PROXY_TOKEN}
      models:
        - gemini-2.5-pro
        - gemini-2.5-flash
      timeout: 120s

    # ---- DeepSeek（国内直连，不走代理）----
    deepseek:
      api_key: ${DEEPSEEK_API_KEY}
      base_url: https://api.deepseek.com/v1
      models:
        - deepseek-chat
        - deepseek-reasoner
      timeout: 120s

# ============================================
# 智能路由（按场景自动选模型）
# ============================================
routing:
  default: deepseek-chat   # 默认便宜的

  rules:
    # 复杂分析用 Claude
    - condition: deep_analysis
      model: claude-sonnet-4.6

    # 代码生成用 Codex
    - condition: code_generation
      model: gpt-5-codex

    # 多模态（图片）用 Gemini
    - condition: has_image
      model: gemini-2.5-pro

# ============================================
# 记忆系统
# ============================================
memory:
  working:
    max_tokens: 8000
  short_term:
    retention_days: 30
  long_term:
    enabled: true
    summarization_interval: weekly

# ============================================
# 自进化
# ============================================
evolution:
  enabled: true
  reflection_schedule: "0 3 * * 0"   # 每周日凌晨3点

# ============================================
# 多渠道告警
# ============================================
channels:
  web:
    enabled: true
  dingtalk:
    enabled: true
    webhook: ${DINGTALK_WEBHOOK}
```

### 9.3 设置环境变量

```bash
# 编辑 shell 配置
vim ~/.zshrc   # 或 ~/.bashrc

# 添加以下内容
export OPENAI_API_KEY=sk-你的OpenAI密钥
export ANTHROPIC_API_KEY=sk-ant-你的Claude密钥
export GEMINI_API_KEY=你的Gemini密钥
export DEEPSEEK_API_KEY=sk-你的DeepSeek密钥
export PROXY_TOKEN=你的VPS代理token
export DINGTALK_WEBHOOK=你的钉钉机器人webhook

# 立即生效
source ~/.zshrc
```

### 9.4 重启 Hermes

```bash
# 用 brew services 启动
brew services restart hermes-agent

# 或手动重启
pkill hermes
hermes serve --daemon

# 验证状态
hermes status
```

### 9.5 测试

```bash
# 测试默认模型
hermes chat "你好"

# 测试 OpenAI
hermes chat --model gpt-4o-mini "用 Python 写一个二分查找"

# 测试 Claude
hermes chat --model claude-sonnet-4.6 "分析下当前的 A 股市场"

# 测试 Gemini
hermes chat --model gemini-2.5-flash "今天天气怎么样"
```

如果都能正常对话，**整套链路完成**！

---

## 十、监控与维护

### 10.1 实时日志查看

**VPS 上**：

```bash
# 看实时访问日志
tail -f /var/log/nginx/llm-proxy-access.log

# 看错误日志
tail -f /var/log/nginx/llm-proxy-error.log

# 同时看两个
tail -f /var/log/nginx/llm-proxy-*.log
```

### 10.2 流量统计

```bash
# 今日请求数
grep "$(date +%d/%b/%Y)" /var/log/nginx/llm-proxy-access.log | wc -l

# 按路径统计
awk '{print $7}' /var/log/nginx/llm-proxy-access.log | sort | uniq -c | sort -rn

# 按状态码统计
awk '{print $9}' /var/log/nginx/llm-proxy-access.log | sort | uniq -c | sort -rn

# 看响应时间分布
awk '{print $NF}' /var/log/nginx/llm-proxy-access.log | sort -n | tail -20
```

### 10.3 日志轮转（防止占满磁盘）

```bash
# 创建配置
vim /etc/logrotate.d/nginx-llm-proxy
```

```
/var/log/nginx/llm-proxy-*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 $(cat /var/run/nginx.pid)
        fi
    endscript
}
```

测试配置：

```bash
logrotate -d /etc/logrotate.d/nginx-llm-proxy
```

### 10.4 设置可用性监控

使用免费的 **UptimeRobot**：

1. 注册 https://uptimerobot.com
2. 点击 **+ Add New Monitor**
3. 配置：
   - Monitor Type: `HTTPS`
   - Friendly Name: `LLM Proxy`
   - URL: `https://api.yourdomain.com/health`
   - Monitoring Interval: `5 minutes`
4. 添加你的邮箱/微信/钉钉接收告警
5. 保存

代理挂了你 5 分钟内就能收到通知。

### 10.5 SSL 证书状态

```bash
# 查看证书过期时间
certbot certificates

# 输出示例：
# Certificate Name: api.yourdomain.com
#   Expiry Date: 2026-08-XX (VALID: 89 days)
```

证书 30 天内过期会自动续期。

### 10.6 资源监控

```bash
# 实时查看 CPU/内存
htop

# Nginx 进程
ps aux | grep nginx

# 磁盘空间
df -h

# 络流量
apt install -y vnstat
vnstat -d   # 每日流量
vnstat -m   # 每月流量
```

---

## 十一、安全加固

### 11.1 SSH 安全

```bash
# 创建普通用户（不要总用 root）
adduser admin
usermod -aG sudo admin

# 配置 SSH 密钥（在 Mac 上生成）
# ssh-keygen -t ed25519 -C "your@email.com"
# 然后把 ~/.ssh/id_ed25519.pub 内容复制到 VPS

# 在 VPS 上
mkdir -p /home/admin/.ssh
echo "你的公钥内容" > /home/admin/.ssh/authorized_keys
chmod 700 /home/admin/.ssh
chmod 600 /home/admin/.ssh/authorized_keys
chown -R admin:admin /home/admin/.ssh
```

修改 SSH 配置：

```bash
vim /etc/ssh/sshd_config

# 修改这几项：
Port 22022                       # 改个非标准端口
PermitRootLogin no               # 禁止 root 登录
PasswordAuthentication no        # 禁用密码登录
PubkeyAuthentication yes
AllowUsers admin                 # 只允许 admin

# 重启 SSH
systemctl restart sshd

# ⚠️ 重要：别忘了开新端口
ufw allow 22022/tcp
ufw delete allow 22/tcp
```

**测试新配置生效**：

```bash
# 在 Mac 上
ssh -p 22022 admin@YOUR_VPS_IP

# 确认能连上后再断开旧连接
```

### 11.2 安装 fail2ban

防止暴力破解 SSH：

```bash
apt install -y fail2ban

cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = 22022
maxretry = 3
bantime = 3600
findtime = 600

[nginx-http-auth]
enabled = true
port = http,https
EOF

systemctl restart fail2ban

# 查看状态
fail2ban-client status sshd
```

### 11.3 自动安全更新

```bash
apt install -y unattended-upgrades

# 启用自动更新
dpkg-reconfigure -plow unattended-upgrades

# 查看配置
cat /etc/apt/apt.conf.d/50unattended-upgrades
```

### 11.4 隐藏 Nginx 版本

```bash
vim /etc/nginx/nginx.conf

# 在 http 块里加：
http {
    server_tokens off;
    # ... 其他配置
}

systemctl reload nginx
```

### 11.5 定期更换 Token

每 1-3 个月换一次 token，防止泄露：

```bash
# 生成新 token
openssl rand -base64 32

# 修改 Nginx 配置
vim /etc/nginx/sites-available/llm-proxy
# 把 $proxy_token 改成新值

# 重载
nginx -t && systemctl reload nginx

# 同步修改 Hermes 配置
# ~/.hermes/config.yaml 或环境变量
```

### 11.6 限流加强

如果发现有人尝试爆破 token，增加限流：

```nginx
# 编辑 /etc/nginx/sites-available/llm-proxy

# 提高限制
limit_req_zone $binary_remote_addr zone=llm_limit:10m rate=300r/m;

# 或者按 token 限流（更严格）
limit_req_zone $http_x_proxy_token zone=token_limit:10m rate=120r/m;

location /openai/ {
    limit_req zone=llm_limit burst=50 nodelay;
    limit_req zone=token_limit burst=20 nodelay;
    # ...
}
```

### 11.7 IP 白名单（可选）

如果你的 Mac mini 是固定公网 IP，可以只允许它访问：

```nginx
# 在 location 块里加
allow YOUR_MAC_IP;
deny all;
```

或者用 Cloudflare 的 Zero Trust（免费）。

---

## 十二、故障排查

### 12.1 502 Bad Gateway

**可能原因**：
1. VPS 也连不上上游 API
2. SSL SNI 没配
3. DNS 解析失败

**排查**：

```bash
# 在 VPS 上手动测
curl -v https://api.openai.com

# 看错误日志
tail -50 /var/log/nginx/llm-proxy-error.log

# 检查 DNS
nslookup api.openai.com
```

### 12.2 403 Forbidden

**原因**：x-proxy-token 不匹配

**检查**：

```bash
# 看 Nginx 配置的 token
grep proxy_token /etc/nginx/sites-available/llm-proxy

# 看 Hermes 配置的 token
echo $PROXY_TOKEN
```

确保两边一致。

### 12.3 SSL 证书错误

```bash
# 重新签发
certbot delete --cert-name api.yourdomain.com
certbot --nginx -d api.yourdomain.com

# 测试证书
curl -v https://api.yourdomain.com/health 2>&1 | grep -i "SSL\|cert"
```

### 12.4 流式输出不工作

确保配置里有：

```nginx
proxy_buffering off;
proxy_cache off;
proxy_http_version 1.1;
proxy_set_header Connection "";
```

### 12.5 请求超时

```bash
# 调大超时
vim /etc/nginx/sites-available/llm-proxy

proxy_connect_timeout 120s;
proxy_send_timeout    900s;
proxy_read_timeout    900s;

# 重载
systemctl reload nginx
```

### 12.6 Nginx 配置语法错误

```bash
# 详细的错误信息
nginx -t

# 看具体哪一行出错
nginx -T 2>&1 | grep -A 2 -B 2 "error"
```

### 12.7 完全无法访问

```bash
# 检查 Nginx 是否运行
systemctl status nginx

# 检查端口监听
ss -tlnp | grep -E ':80|:443'

# 检查防火墙
ufw status

# 检查 SELinux（如果是 CentOS）
sestatus
```

---

## 附录 A：一键安装脚本

将以下脚本保存为 `setup-proxy.sh`，在 VPS 上执行：

```bash
#!/bin/bash
# ============================================
# LLM API 代理一键安装脚本
# 适用于 Ubuntu 20.04+ / Debian 11+
# ============================================

set -e

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---- 检查 root ----
if [ "$EUID" -ne 0 ]; then
    error "请用 root 运行：sudo bash setup-proxy.sh"
    exit 1
fi

# ---- 交互输入 ----
read -p "请输入你的域名（例如 api.yourdomain.com）: " DOMAIN
read -p "请输入你的邮箱（用于 Let's Encrypt）: " EMAIL

# 生成 token
PROXY_TOKEN=$(openssl rand -base64 32)
info "已生成 Proxy Token: $PROXY_TOKEN"
info "⭐ 请保存这个 token，Hermes 配置需要用！"

read -p "确认开始安装？(y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    exit 0
fi

# ---- 系统更新 ----
info "更新系统..."
apt update && apt upgrade -y
apt install -y curl wget vim ufw nginx certbot python3-certbot-nginx

# ---- 防火墙 ----
info "配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ---- 验证 DNS ----
info "验证 DNS 解析..."
RESOLVED_IP=$(dig +short $DOMAIN | head -1)
SERVER_IP=$(curl -s ifconfig.me)

if [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
    warn "DNS 未生效或解析错误"
    warn "域名解析: $RESOLVED_IP"
    warn "服务器 IP: $SERVER_IP"
    read -p "继续？(y/n): " GO
    [ "$GO" != "y" ] && exit 1
fi

# ---- 清理默认配置 ----
rm -f /etc/nginx/sites-enabled/default

# ---- 申请 SSL ----
info "申请 SSL 证书..."
certbot --nginx -d $DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --redirect \
    --non-interactive

# ---- 写 Nginx 配置 ----
info "写入 Nginx 代理配置..."
cat > /etc/nginx/sites-available/llm-proxy << EOF
limit_req_zone \$binary_remote_addr zone=llm_limit:10m rate=60r/m;

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;

    access_log /var/log/nginx/llm-proxy-access.log;
    error_log  /var/log/nginx/llm-proxy-error.log;

    client_max_body_size 50M;
    proxy_connect_timeout 60s;
    proxy_send_timeout    600s;
    proxy_read_timeout    600s;
    proxy_buffering       off;
    proxy_http_version    1.1;
    proxy_set_header      Connection "";

    resolver 8.8.8.8 1.1.1.1 valid=300s ipv6=off;

    set \$proxy_token "$PROXY_TOKEN";
    if (\$http_x_proxy_token != \$proxy_token) {
        return 403;
    }

    location /openai/ {
        limit_req zone=llm_limit burst=20 nodelay;
        proxy_pass https://api.openai.com/;
        proxy_set_header Host          api.openai.com;
        proxy_set_header Authorization \$http_authorization;
        proxy_set_header Content-Type  \$http_content_type;
        proxy_ssl_server_name on;
        proxy_ssl_name        api.openai.com;
    }

    location /anthropic/ {
        limit_req zone=llm_limit burst=20 nodelay;
        proxy_pass https://api.anthropic.com/;
        proxy_set_header Host              api.anthropic.com;
        proxy_set_header x-api-key         \$http_x_api_key;
        proxy_set_header anthropic-version \$http_anthropic_version;
        proxy_set_header Content-Type      \$http_content_type;
        proxy_ssl_server_name on;
        proxy_ssl_name        api.anthropic.com;
    }

    location /gemini/ {
        limit_req zone=llm_limit burst=20 nodelay;
        proxy_pass https://generativelanguage.googleapis.com/;
        proxy_set_header Host          generativelanguage.googleapis.com;
        proxy_set_header Authorization \$http_authorization;
        proxy_set_header Content-Type  \$http_content_type;
        proxy_ssl_server_name on;
        proxy_ssl_name        generativelanguage.googleapis.com;
    }

    location = /health {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }

    location / {
        return 404;
    }
}
EOF

ln -sf /etc/nginx/sites-available/llm-proxy /etc/nginx/sites-enabled/

# ---- 测试并重载 ----
info "测试 Nginx 配置..."
if nginx -t; then
    systemctl reload nginx
    info "✅ Nginx 配置加载成功"
else
    error "Nginx 配置有错，请检查"
    exit 1
fi

# ---- 完成信息 ----
echo ""
echo "============================================"
echo -e "${GREEN}🎉 安装完成！${NC}"
echo "============================================"
echo ""
echo "代理地址："
echo "  OpenAI:    https://$DOMAIN/openai/v1"
echo "  Anthropic: https://$DOMAIN/anthropic"
echo "  Gemini:    https://$DOMAIN/gemini"
echo ""
echo "访问 Token（请妥善保存）："
echo "  $PROXY_TOKEN"
echo ""
echo "测试命令（在你的 Mac 上）："
echo "  curl https://$DOMAIN/health"
echo ""
echo "Hermes 配置示例："
echo "  base_url: https://$DOMAIN/openai/v1"
echo "  extra_headers:"
echo "    x-proxy-token: $PROXY_TOKEN"
echo "============================================"
```

执行：

```bash
chmod +x setup-proxy.sh
./setup-proxy.sh
```

按提示输入域名和邮箱，剩下的全自动。

---

## 附录 B：常见问题 FAQ

### Q1：VPS 选哪家最好？

**推荐**（按性价比）：
- **搬瓦工 CN2 GIA**：到大陆速度最快，但贵
- **Vultr 东京**：均衡，$6/月起
- **DigitalOcean 新加坡**：稳定，$6/月起
- **AWS Lightsail 东京**：大厂稳定，$5/月起
- **Hetzner**：欧洲便宜大碗，但延迟高

**避免**：阿里云轻量海外（被墙概率高）、Google Cloud（贵）

### Q2：域名怎么买最便宜？

- **Cloudflare Registrar**：成本价，`.com` 约 $9.5/年（无加价）
- **NameSilo**：常年优惠，新注册便宜
- **Porkbun**：性价比高
- **阿里云**：方便，但需要实名

### Q3：代理会被 OpenAI 封吗？

理论上不会，因为：
- 你只是用 Nginx 转发，不是修改/嗅探数据
- OpenAI 看到的请求都正常带 Authorization
- 没有违反 OpenAI 服务条款

**但要注意**：
- 不要把代理公开分享给陌生人
- 单 IP 调用频率不要太高
- 用付费 API Key（免费试用 Key 容易被封）

### Q4：流量会爆吗？

LLM 请求流量很小：
- 单次请求：5-20KB（含提问 + 回答）
- 即使每天 10000 次：~150MB
- 每月：~5GB

绝大多数 VPS 月流量都是 1TB 起，**完全不用担心**。

### Q5：可以代理 ChatGPT 网页吗？

**不推荐**。ChatGPT 网页（chat.openai.com）有复杂的前端逻辑、WebSocket、Cookie 等，简单 Nginx 代理跑不通。

如果想代理 ChatGPT 网页用，看这些项目：
- ChatGPT-Next-Web
- Lobe Chat

### Q6：如何加新的 API？

只要在 Nginx 配置里加一段 `location`：

```nginx
location /xai/ {
    limit_req zone=llm_limit burst=20 nodelay;
    proxy_pass https://api.x.ai/;
    proxy_set_header Host          api.x.ai;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header Content-Type  $http_content_type;
    proxy_ssl_server_name on;
    proxy_ssl_name        api.x.ai;
}
```

然后 `nginx -t && systemctl reload nginx`。

### Q7：CDN 加速可以用吗？

可以，但要注意：
- **不要套 Cloudflare 橙色云朵代理**（流式响应会断）
- 如果一定要套，要开 **Enterprise** 版（昂贵）
- 推荐：Cloudflare 灰色云朵（仅 DNS）

### Q8：代理速度比直连慢多少？

```
直连 OpenAI（如果能直连）：100-200ms
通过 VPS 代理：150-300ms

只多了 50-100ms，用户感知不大
```

主要看你 VPS 到 OpenAI 的延迟。

### Q9：被墙了怎么办？

**症状**：从 Mac 访问 `api.yourdomain.com` 也开始超时。

**应对**：
1. 临时换 IP（VPS 厂商通常支持 $1-3 换 IP）
2. 换域名（用新 IP + 新域名重新部署）
3. 套 Cloudflare 代理（注意流式问题）
4. 用 Cloudflare Tunnel（如果 VPS 也能用）

### Q10：能给朋友共用吗？

**可以**，但要分发管理：

```nginx
# 多 token 验证
map $http_x_proxy_token $token_valid {
    default 0;
    "your-token-1" 1;
    "friend-token-2" 1;
    "friend-token-3" 1;
}

server {
    # ...
    if ($token_valid = 0) {
        return 403;
    }
}
```

或用更专业的方案：[New API](https://github.com/Calcium-Ion/new-api)（OpenAI 兼容的 API 网关，支持多用户、计费）。

---

## 完成检查清单

部署完成后，逐项确认：

- [ ] SSH 可正常连接 VPS
- [ ] 防火墙开放了 22/80/443
- [ ] 域名 DNS 已解析到 VPS IP
- [ ] Nginx 已运行，开机自启
- [ ] SSL 证书已申请，可自动续期
- [ ] Nginx 配置已写入并启用
- [ ] `curl https://api.yourdomain.com/health` 返回 ok
- [ ] 调用 OpenAI 测试成功
- [ ] Hermes 配置已更新
- [ ] 环境变量已设置
- [ ] Hermes chat 测试成功
- [ ] 已设置 UptimeRobot 监控
- [ ] SSH 已改为密钥登录
- [ ] 已安装 fail2ban
- [ ] 已备份 Token 到密码管理器

---

## 文档信息

- **版本**：v1.0
- **最后更新**：2026-05-13
- **适用版本**：Ubuntu 20.04+, Nginx 1.18+, Certbot 1.21+

---

**祝部署顺利！** 🚀

如有问题，按 [十二、故障排查](#十二故障排查) 章节排查；
还解决不了再回头看每一步是否正确。