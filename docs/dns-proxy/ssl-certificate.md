---
lang: zh-CN
title: "SSL 证书：为什么你的网站需要 HTTPS"
description: 理解 SSL/TLS 证书的工作原理，掌握 Let's Encrypt + Certbot 在 Nginx 上申请与自动续期的完整流程。
date: 2026-06-06
tags:
  - SSL
  - TLS
  - HTTPS
  - Let's Encrypt
  - Certbot
  - Nginx
---

# SSL 证书：为什么你的网站需要 HTTPS

> **适用场景**：为 Nginx 反向代理配置 HTTPS，让浏览器地址栏显示安全锁。
>
> **前置阅读**：[Nginx 反向代理：从概念到实战](./nginx-reverse-proxy.md) 解释了 Nginx 做 SSL 终止的原理，本文聚焦证书本身。

## 1. SSL 证书是什么

SSL（Secure Sockets Layer）证书是一段数字文件，绑定在域名上，用于：

1. **加密通信**：浏览器与服务器之间传输的数据被加密，中间人无法窃听
2. **身份验证**：证书由受信任的 CA（Certificate Authority）签发，证明「这个域名确实属于这个服务器」

现在 SSL 已被 TLS（Transport Layer Security）取代，但人们仍习惯说「SSL 证书」。

### 1.1 一次 HTTPS 连接发生了什么

```
Client                              Server
  |                                    |
  |  --- ClientHello (支持的加密算法) ---> |
  |                                    |
  |  <--- ServerHello + 证书 (含公钥) ---  |
  |                                    |
  |  验证证书 → CA 是否可信? 域名是否匹配?  |
  |                                    |
  |  --- 用公钥加密 Pre-Master Secret -> |
  |                                    |
  |  Server 用私钥解密 → 双方各自生成会话密钥 |
  |                                    |
  |  ======= 对称加密通信 =============    |
```

核心：**证书 = 公钥 + 域名 + CA 签名**。私钥保存在服务器，永远不暴露。

### 1.2 证书文件结构

Certbot 申请后会在 `/etc/letsencrypt/live/<域名>/` 下生成四个文件：

| 文件 | 用途 |
|------|------|
| `fullchain.pem` | 完整证书链 = 服务器证书 + 中间 CA 证书，Nginx 用它给客户端 |
| `privkey.pem` | 私钥，Nginx 用它解密客户端发来的 Pre-Master Secret |
| `cert.pem` | 只有服务器证书，一般不直接用 |
| `chain.pem` | 只有中间 CA 证书，一般不直接用 |

Nginx 只需要 `fullchain.pem` 和 `privkey.pem`。

## 2. 为什么要在 Nginx 后配置 SSL

### 2.1 Nginx 作为 SSL 终止点

在反向代理架构中，SSL 通常由 Nginx 负责终止，后端服务只处理 HTTP：

```
浏览器 --HTTPS--> Nginx :443  --HTTP--> 后端 :8080
                   ↑
              SSL 在这里终止
```

这样做的好处：

| 好处 | 说明 |
|------|------|
| **统一管理** | 证书只配在 Nginx 一层，后端服务不需要关证书 |
| **简化后端** | 后端只监听 HTTP，不需要处理 TLS 握手逻辑 |
| **灵活性** | 换证书、改 TLS 版本只改 Nginx 配置，不改代码 |
| **多服务共用** | 一个证书、一个 443 端口，多个后端服务共享域名 |

### 2.2 没有 SSL 会怎样

- 浏览器会标记网站「不安全」，用户信任度降低
- API 回调（企业微信、支付宝、Stripe）要求 HTTPS，不支持 HTTP
- 数据传输明文暴露，Wi-Fi 劫持或中间人可截获敏感信息（密码、Token、会话）
- Let's Encrypt 等免费 CA 让 HTTPS 成本几乎为零，没有理由不用

## 3. Let's Encrypt 与 Certbot

### 3.1 Let's Encrypt 是什么

Let's Encrypt 是一家免费的、自动化的、开放的 CA。它通过 ACME 协议自动签发证书，无需人工审核。

特点：

- **免费**：不需要付费
- **自动续期**：证书有效期 90 天，Certbot 自动续期
- **主流信任**：所有新浏览器和操作系统都信任 Let's Encrypt

### 3.2 申请证书的前置条件

| 条件 | 说明 |
|------|------|
| 域名 DNS 已生效 | `dig yourdomain.com +short` 能返回服务器 IP |
| Nginx 已启动且 80 端口可用 | Certbot 通过 HTTP-01 验证域名所有权 |
| 服务器防火墙开放 80 和 443 | `ufw allow 80/tcp && ufw allow 443/tcp` |

> **HTTP-01 验证原理**：CA 向 `http://yourdomain.com/.well-known/acme-challenge/<token>` 发一个请求，Certbot 预先在这个路径放好应答文件，证明你能控制这个域名的服务器。

### 3.3 安装 Certbot

```bash
apt update
apt install -y certbot python3-certbot-nginx
```

### 3.4 申请证书

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot 会：
1. 与 Let's Encrypt 通信完成域名验证
2. 下载证书到 `/etc/letsencrypt/live/yourdomain.com/`
3. **自动修改 Nginx 配置**，插入 SSL 指令
4. 重载 Nginx

> 也可以只申请证书，不自动修改 Nginx（手动配置模式）：
>
> ```bash
> certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
> ```

### 3.5 手动配置 Nginx（不依赖 Certbot 自动改写）

Certbot 申请后，手动在 Nginx 配置中添加：

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

### 3.6 各指令说明

| 指令 | 说明 |
|------|------|
| `listen 443 ssl` | 监听 HTTPS 端口 |
| `ssl_certificate` | 证书链文件路径（给客户端的） |
| `ssl_certificate_key` | 私钥文件路径（服务器解密用） |
| `ssl_protocols` | 允许的 TLS 版本，禁用 SSLv3/TLSv1.0/TLSv1.1 |
| `ssl_ciphers` | 允许的加密套件 |
| `ssl_prefer_server_ciphers` | 服务器优先选择加密套件 |
| `ssl_session_cache` | SSL 会话缓存，减少握手开销 |
| `ssl_session_timeout` | 会话缓存有效时间 |

## 4. 证书自动续期

Let's Encrypt 证书有效期 90 天，Certbot 安装时已自动配置 systemd timer 或 cron 续期。

### 4.1 验证续期是否正常

```bash
certbot renew --dry-run
```

输出包含 `Congratulations, all simulated renewals succeeded` 即正常。

### 4.2 查看下次续期时间

```bash
certbot certificates
```

### 4.3 续期失败的常见原因

| 原因 | 排查方法 |
|------|---------|
| Nginx 未运行 | `systemctl status nginx` |
| 80 端口被占用 | `ss -tlnp \| grep :80` |
| DNS 失效 | `dig yourdomain.com +short` |
| 防火墙拦截 | `ufw status` 确认 80/443 开放 |

### 4.4 续期后重载 Nginx

Certbot 默认续期后会自动 reload Nginx。如果手动续期需要自己 reload：

```bash
certbot renew
systemctl reload nginx
```

也可以通过 deploy hook 确保每次续期后自动 reload：

```bash
certbot renew --deploy-hook "systemctl reload nginx"
```

## 5. 多域名证书（SAN 证书）

一个证书可以同时保护多个域名：

```bash
certbot --nginx \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d api.yourdomain.com
```

适合单台 Nginx 挂多个子域名的场景。如果子域名较多（如 `*.yourdomain.com`），需要申请**通配符证书**，只能用 DNS-01 验证（不支持 HTTP-01）：

```bash
certbot --manual --preferred-challenges dns certonly \
  -d yourdomain.com -d "*.yourdomain.com"
```

Certbot 会提示你在 DNS 添加一条 TXT 记录来验证。

## 6. 常见问题

### 浏览器提示证书不受信任

1. 检查证书域名与访问域名是否匹配：
   ```bash
   openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout | grep -A1 "Subject Alternative Name"
   ```
2. 检查证书是否过期：
   ```bash
   openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -enddate -noout
   ```
3. 检查证书链是否完整（fullchain.pem 而不是 cert.pem）

### ERR_SSL_VERSION_OR_CIPHER_MISMATCH

TLS 版本不匹配，确保 Nginx 配置中没有过期的协议：

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
```

### 证书续期后浏览器仍显示旧证书

Nginx 没有 reload，仍在用旧证书：

```bash
systemctl reload nginx
```

### Mixed Content 警告

HTTPS 页面引用了 HTTP 资源（图片、脚本）。后端生成链接时使用 HTTPS，检查 `X-Forwarded-Proto` Header 是否正确传递：

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

## 7. 延伸阅读

- [Nginx 反向代理：从概念到实战](./nginx-reverse-proxy.md) - Nginx 做 SSL 终止的配置详解
- [域名解析与反向代理部署](./deploy-dns-nginx.md) - 阿里云 + DigitalOcean 的完整部署流程，包含 Certbot 实操
- [Let's Encrypt 官方文档](https://letsencrypt.org/docs/)
- [SSL Labs 测试](https://www.ssllabs.com/ssltest/) - 检测你的 HTTPS 配置安全等级
