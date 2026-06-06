---
lang: zh-CN
title: 域名解析与反向代理部署
description: 阿里云域名解析、DigitalOcean 服务器 nginx 配置、Let's Encrypt SSL 证书与企业微信回调接入的完整流程。
date: 2026-06-06
---

# 域名解析与反向代理部署

本文记录从零开始，将本地或云服务器上的 Agent 服务通过域名暴露到公网的完整步骤。

以 `youwei-agent.com`（阿里云购买）+ DigitalOcean 新加坡 Droplet 为例，最终效果是企业微信回调可通过 `https://youwei-agent.com/wecom/callback` 访问。

## 1. 阿里云域名解析

### 1.1 实名认证

在阿里云购买的域名必须完成实名认证，否则域名状态为 `clientHold`，DNS 解析完全暂停。

- 登录 [阿里云域名控制台](https://dc.console.aliyun.com/next/index#/domain-list/all)
- 找到目标域名，点击 **实名认证**，提交身份证照片
- 审核周期通常 **1~3 个工作日**，通过后 `clientHold` 自动解除

可以通过以下命令检查域名状态：

```bash
whois youwei-agent.com | grep -i status
```

看到 `clientHold` 消失说明已通过。

### 1.2 添加 DNS 解析记录

在阿里云 **云解析 DNS** 控制台，打开 **快速添加解析**：

| 字段 | 填写内容 |
|------|---------|
| 业务需求 | 将网站域名解析到服务器 IPv4 地址 |
| 网站域名 | 勾选 `youwei-agent.com` 和 `www.youwei-agent.com`（两个都勾）|
| 记录值 | 你的服务器公网 IPv4 地址 |

> 使用 DigitalOcean Reserved IP 作为记录值，即使重建 Droplet 也不需要改 DNS，只要保持 Reserved IP 绑定当前 Droplet 即可。

### 1.3 验证解析生效

```bash
dig youwei-agent.com +short
# 或
ping -c 3 youwei-agent.com
```

返回正确的 IP 地址即说明解析已生效。

## 2. 服务器安装 nginx 与 SSL 证书

SSH 登录到 DigitalOcean 服务器：

### 2.1 安装 nginx

```bash
apt update && apt install -y nginx
```

### 2.2 申请 Let's Encrypt SSL 证书

先确保 nginx 已启动且 80 端口未被其他服务占用：

```bash
systemctl start nginx
systemctl enable nginx
```

安装 certbot 并自动获取证书：

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d youwei-agent.com -d www.youwei-agent.com
```

certbot 会自动修改 nginx 配置，填入 `ssl_certificate` 和 `ssl_certificate_key`。

证书默认 90 天过期，certbot 会自动设置 systemd timer 续期，可以用以下命令验证：

```bash
certbot renew --dry-run
```

## 3. nginx 反向代理配置

使用编辑器创建站点配置文件 `/etc/nginx/sites-available/youwei-agent`（这是一个文件，不是文件夹）：

```bash
# 用 nano 新建（适合新手，Ctrl+O 保存，Ctrl+X 退出）
nano /etc/nginx/sites-available/youwei-agent

# 或用 vim（i 进入插入模式，Esc → :wq 保存退出）
vim /etc/nginx/sites-available/youwei-agent
```

填入以下内容：

```nginx
server {
    listen 443 ssl;
    server_name youwei-agent.com www.youwei-agent.com;

    # certbot 自动生成的证书路径（示例，实际路径由 certbot 填写）
    # ssl_certificate /etc/letsencrypt/live/youwei-agent.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/youwei-agent.com/privkey.pem;

    # 企业微信回调 → bot-wecom (8080)
    location /wecom/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Web 界面 → web (8090)
    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name youwei-agent.com www.youwei-agent.com;
    return 301 https://$host$request_uri;
}
```

这份配置由两个 `server` 块组成，各自职责如下：

### 第一个 server 块：处理 HTTPS 请求（443 端口）

```nginx
server {
    listen 443 ssl;                                    # 监听 HTTPS 端口（443）
    server_name youwei-agent.com www.youwei-agent.com; # 匹配哪个域名的请求

    # ssl_certificate / ssl_certificate_key 由 certbot 自动填入，
    # 告诉 Nginx 用哪个证书和私钥做 TLS 握手
```

`location` 是路由规则，Nginx 按请求路径分配给不同后端：

| 客户端请求 | location 匹配 | 转发到 |
|---|---|---|
| `https://youwei-agent.com/wecom/callback` | `/wecom/` | `127.0.0.1:8080`（bot-wecom） |
| `https://youwei-agent.com/` 或其他路径 | `/` | `127.0.0.1:8090`（web-ui） |

`proxy_set_header` 把客户端的真实信息透传给后端，否则后端拿不到真实 IP 和域名：

| Header | 作用 |
|---|---|
| `Host $host` | 告诉后端请求来自哪个域名 |
| `X-Real-IP $remote_addr` | 客户端真实 IP（否则后端只看到 127.0.0.1） |
| `X-Forwarded-For` | 多级代理时追踪完整链路 |
| `X-Forwarded-Proto $scheme` | 客户端用的是 http 还是 https |

### 第二个 server 块：HTTP 强制跳转 HTTPS（80 端口）

```nginx
server {
    listen 80;
    server_name youwei-agent.com www.youwei-agent.com;
    return 301 https://$host$request_uri;  # 所有 HTTP 请求 301 跳转到 HTTPS
}
```

用户输入 `http://youwei-agent.com/xxx` 时，浏览器被强制跳转到 `https://youwei-agent.com/xxx`，确保所有流量都走加密通道。

启用站点并重载 nginx：

```bash
ln -s /etc/nginx/sites-available/youwei-agent /etc/nginx/sites-enabled/
nginx -t            # 检查配置语法
systemctl reload nginx
```

## 4. 企业微信回调 URL 配置

域名和 nginx 都就绪后，在企业微信管理后台配置：

1. 登录 [企业微信管理后台](https://work.weixin.qq.com/)
2. 进入 **应用管理** → 你的自建应用
3. 找到 **"接收消息"** 区域，点击 **"设置 API 接收"**
4. 填写：

   | 字段 | 值 |
   |------|---|
   | URL | `https://youwei-agent.com/wecom/callback` |
   | Token | 点击 **随机获取** 或自定义，写入 `.env` 的 `WECOM_TOKEN` |
   | EncodingAESKey | 点击 **随机获取**（自动生成 43 位），写入 `.env` 的 `WECOM_AES_KEY` |

5. 先启动 `bot-wecom` 服务，再点击企业微信后台的 **保存** 完成验证

### Token 与 AESKey 格式要求

从 `internal/wecom/crypto.go` 的实现可知：

- `WECOM_TOKEN`：任意字符串，无长度限制
- `WECOM_AES_KEY`：必须恰好 **43 个字符**，由企业微信生成，Base64 解码后为 32 字节 AES-256 密钥

## 常见问题

### clientHold 状态无法解析

域名注册当天完成实名认证后，`clientHold` 通常需要 **12~24 小时** 自动解除。开发阶段可以先用 ngrok 顶着：

```bash
brew install ngrok && ngrok http 8080
```

把 ngrok 给的 HTTPS 地址填到企业微信后台，调通后再切回域名。

### certbot 申请证书失败

- 确认 nginx 已启动且 80 端口未被其他进程占用
- 确认 DNS 解析已生效，`dig youwei-agent.com +short` 能返回服务器 IP
- 如果有防火墙，确保开放 80 和 443 端口：
  ```bash
  ufw allow 80/tcp && ufw allow 443/tcp
  ```

### Cloudflare 代理 vs DNS 直连

如果域名托管在 Cloudflare，注意代理状态（橙色云朵）会经过 CF 节点，可能与企业微信证书校验冲突。调试时建议设为 **DNS Only**（灰色云朵），直连服务器。
