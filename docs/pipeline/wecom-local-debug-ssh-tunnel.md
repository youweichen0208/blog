---
lang: zh-CN
title: 企业微信本地调试：SSH 反向隧道 + Nginx
description: 通过 SSH 反向隧道将云服务器流量转发到本地，配合 Nginx HTTPS，实现企业微信回调本地调试。
date: 2026-06-06
---

# 企业微信本地调试：SSH 反向隧道 + Nginx

企业微信回调要求**公网 HTTPS URL**，本地开发环境没有公网 IP，怎么办？本文介绍零成本方案：SSH 反向隧道 + Nginx 反代，把云服务器流量转发到本地。

## 为什么需要这个

企业微信的消息回调机制要求你提供一个 HTTPS 公网地址，企业微信会：
1. 先 GET 这个地址做签名验证
2. 用户发消息时 POST 到这个地址

本地 `go run ./cmd/bot-wecom` 监听 `localhost:8080`，企业微信访问不到。需要一个桥梁把公网流量转进来。

## 方案选型

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| **SSH 反向隧道 + Nginx** | 已有云服务器，零成本，域名固定 | 需手动维护 SSH 连接 |
| ngrok | 一条命令搞定 | 免费版域名每次变；HTTPS 需付费 |
| cloudflared | 免费、域名固定、自动 HTTPS | 需 Cloudflare 账号 + 域名托管 |

如果你已经有一台云服务器（比如已经在跑生产环境），SSH 反向隧道是最省事的选择。

## 整体架构

```
企业微信 → https://your-domain.com/wecom/callback
       → 云服务器 Nginx (443 → proxy_pass localhost:18080)
       → SSH 反向隧道 (18080 → 本地 8080)
       → 本地 bot-wecom (localhost:8080)
```

三层分工：
- **本地**：跑业务代码，热重载调试
- **SSH 隧道**：把云服务器的 18080 端口映射到本地 8080
- **云服务器 Nginx**：接收公网 443 HTTPS 流量，转发到 18080

## Step 1：本地启动 bot-wecom

```bash
cd your-project
make run-wecom
```

确认本地 8080 端口在监听：

```bash
curl http://localhost:8080/wecom/callback?msg_signature=test
# 预期返回 401 invalid signature（说明服务起来了）
```

### .env 最小配置

```bash
# 必须有
DASHSCOPE_API_KEY=sk-你的真实key
WECOM_CORP_ID=ww你的企业ID
WECOM_AGENT_ID=你的应用ID
WECOM_SECRET=你的应用Secret
WECOM_TOKEN=你的回调Token
WECOM_AES_KEY=你的AESKey

# 本地调试推荐
HTTP_ADDR=:8080
SQLITE_PATH=./data/sessions.db
LOG_LEVEL=debug
```

`LOG_LEVEL=debug` 方便看到完整的请求链路，调试完记得改回 `info`。

## Step 2：建立 SSH 反向隧道

```bash
ssh -R 18080:localhost:8080 root@<云服务器IP> -N
```

参数说明：

| 参数 | 含义 |
| --- | --- |
| `-R 18080:localhost:8080` | 云服务器的 18080 端口 → 你本地的 8080 |
| `-N` | 只建隧道，不打开远程 shell |

开一个新终端窗口验证隧道是否通了：

```bash
# 先 SSH 到云服务器
ssh root@<云服务器IP>

# 在云服务器上 curl 18080
curl http://localhost:18080/wecom/callback?msg_signature=test
# 预期返回 401 invalid signature（说明隧道通了）
```

### 常见问题：端口已被占用

如果云服务器上 18080 已被占用，换一个端口：

```bash
ssh -R 19080:localhost:8080 root@<云服务器IP> -N
```

对应 Nginx 配置也要改成 `proxy_pass http://127.0.0.1:19080`。

### 防止隧道断开

SSH 隧道长时间空闲会断。加上 `ServerAliveInterval`：

```bash
ssh -R 18080:localhost:8080 -o ServerAliveInterval=60 -o ServerAliveCountMax=3 root@<云服务器IP> -N
```

更彻底的方案是用 `autossh` 自动重连：

```bash
# macOS
brew install autossh

# 运行
autossh -M 0 -R 18080:localhost:8080 -o ServerAliveInterval=60 -o ServerAliveCountMax=3 root@<云服务器IP> -N
```

### 设置开机自启（可选）

如果你经常需要本地调试，可以把隧道做成 launchd service（macOS）：

```xml
<!-- ~/Library/LaunchAgents/com.wecom.tunnel.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.wecom.tunnel</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/autossh</string>
    <string>-M</string>
    <string>0</string>
    <string>-R</string>
    <string>18080:localhost:8080</string>
    <string>-o</string>
    <string>ServerAliveInterval=60</string>
    <string>-o</string>
    <string>ServerAliveCountMax=3</string>
    <string>root@你的云服务器IP</string>
    <string>-N</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.wecom.tunnel.plist
```

## Step 3：云服务器配 Nginx

### 3.1 安装 Nginx

```bash
# Ubuntu/Debian
apt update && apt install -y nginx

# CentOS/RHEL
yum install -y nginx
```

### 3.2 申请 SSL 证书

企业微信**强制要求 HTTPS 443**，需要 SSL 证书。用 Let's Encrypt 免费申请：

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

> **没有域名？** 用 nip.io 的 trick：`<你的IP>.nip.io` 会自动解析到对应 IP。例如 IP 是 `188.166.1.2`，就用 `188-166-1-2.nip.io`。

```bash
certbot --nginx -d 188-166-1-2.nip.io
```

### 3.3 配置 Nginx

编辑 `/etc/nginx/conf.d/wecom.conf`：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location /wecom/callback {
        proxy_pass http://127.0.0.1:18080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 75s;
    }
}

# HTTP 跳转 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

测试并重载：

```bash
nginx -t && systemctl reload nginx
```

### 3.4 验证全链路

在云服务器上 curl：

```bash
curl https://your-domain.com/wecom/callback?msg_signature=test
# 预期返回 401（签名无效但 Nginx → 隧道 → 本地都通了）
```

或者从外部机器 curl：

```bash
curl https://your-domain.com/wecom/callback?msg_signature=test
```

## Step 4：企业微信后台配置

登录[企业微信管理后台](https://work.weixin.qq.com) → **应用管理** → 你的自建应用 → **接收消息** → **设置 API 接收**：

| 字段 | 值 |
| --- | --- |
| URL | `https://your-domain.com/wecom/callback` |
| Token | 你 `.env` 中的 `WECOM_TOKEN` |
| EncodingAESKey | 你 `.env` 中的 `WECOM_AES_KEY` |

点「保存」，企业微信会向这个 URL 发 GET 请求做签名验证。

**成功标志**：页面提示保存成功，不报错。

**失败排查**：
- 如果报「URL 响应异常」→ curl 验证全链路是否通
- 如果报「签名验证失败」→ 检查 `.env` 中 `WECOM_TOKEN` / `WECOM_AES_KEY` / `WECOM_CORP_ID` 是否和后台一致

## Step 5：开始调试

在企业微信 App 中给你的应用发一条消息：

> "帮我看看贵州茅台的股价"

本地终端会实时打印：

```
INFO wecom_worker_start user_id=xxx
INFO agent_request_start query="帮我看看贵州茅台的股价"
INFO tool_call name=get_quote symbol=600519
INFO agent_request_done duration_ms=3200
```

企业微信 App 里几秒后会收到 Agent 的回复。

## 完整流程图

```
企业微信用户发消息
       ↓
企业微信服务器 POST https://your-domain.com/wecom/callback
       ↓
云服务器 Nginx (443 SSL)
       │ proxy_pass http://127.0.0.1:18080
       ↓
SSH 反向隧道 (18080 → localhost:8080)
       ↓
本地 bot-wecom (localhost:8080)
       │  验签 → 解密 → 丢入队列 → worker 处理
       │  Agent.Ask() → LLM + 工具调用 → 生成回复
       │  wecom.Client.SendText() → 调企业微信 API 发消息
       ↓
企业微信用户收到回复 ✅
```

## 日常开发工作流

每次本地调试只需要三步：

```bash
# 终端 1：启动 bot
make run-wecom

# 终端 2：建立隧道
ssh -R 18080:localhost:8080 -o ServerAliveInterval=60 root@<云服务器IP> -N

# 企业微信发消息测试
```

调试完毕后 `Ctrl+C` 关掉隧道即可，云服务器上的 Nginx 不用管，没有隧道时请求会直接返回 502。

## 常见问题

### Q: SSH 隧道断开后 Nginx 返回什么？

502 Bad Gateway。因为没有隧道在监听 18080 端口，Nginx proxy_pass 失败。不影响云服务器上其他服务。

### Q: 云服务器安全组要开哪些端口？

| 端口 | 用途 |
| --- | --- |
| 22 | SSH（建隧道） |
| 80 | HTTP → 301 跳转 HTTPS |
| 443 | HTTPS（企业微信任回调入口） |

18080 不需要对外开放，只在云服务器本地访问。

### Q: 能同时在本地和云服务器上跑 bot 吗？

可以，但**企业微信回调 URL 只能指向一个地方**。想切回生产环境时，把回调 URL 改回云服务器的 bot 地址，关掉本地隧道即可。

### Q: Let's Encrypt 证书过期怎么办？

certbot 会自动续期。手动检查：

```bash
certbot renew --dry-run
```

如果用 nip.io 域名，certbot 可能不支持自动续期，手动 re-issue 即可。

### Q: 不想暴露 443 端口 / 没有域名

可以直接用 HTTP + IP 测试签名验证逻辑，但企业微信后台配置回调时**不接受 HTTP**，必须 HTTPS。最低门槛还是 Let's Encrypt + 域名（或 nip.io）。
