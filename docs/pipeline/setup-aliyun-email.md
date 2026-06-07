---
lang: zh-CN
title: 阿里云邮件推送配置：让验证码真正发到邮箱
description: 默认验证码只打到服务器后端日志，本文配置阿里云 DirectMail 服务，让验证码真正通过邮件发到用户邮箱。
date: 2026-06-07
---

# 阿里云邮件推送配置：让验证码真正发到邮箱

`youwei-trading-agent` 的登录需要邮箱验证码。默认情况下（开发模式），验证码只打到容器 stdout 日志，不会真的发邮件。生产环境必须让验证码邮件真正送达，否则用户根本无法登录。

本文用阿里云 DirectMail（邮件推送）完成配置，整个流程约 15 分钟。

## 默认行为：ConsoleSender

看 `cmd/web/main.go` 的 `newEmailSender`：

```go
if cfg.AliyunAccessKeyID == "" || cfg.AliyunAccessKeySecret == "" || cfg.EmailFromAddress == "" {
    applog.Info("email_sender_console", map[string]any{
        "hint": "set ALIYUN_ACCESS_KEY_ID + ALIYUN_ACCESS_KEY_SECRET + EMAIL_FROM_ADDRESS for prod",
    })
    return email.NewConsoleSender()   // 只打日志，不发邮件
}
return email.NewAliyunSender(...)
```

只要 DO 的 `.env` 里有以下三个变量，应用启动就会用阿里云 SMTP 真正发送：

| 环境变量 | 值 |
| --- | --- |
| `ALIYUN_ACCESS_KEY_ID` | RAM 子账号的 AccessKey ID |
| `ALIYUN_ACCESS_KEY_SECRET` | RAM 子账号的 AccessKey Secret |
| `EMAIL_FROM_ADDRESS` | 发信地址（如 `noreply@youwei-agent.com`） |

下面逐步讲怎么在阿里云控制台拿到这些值。

## 1. 开通阿里云邮件推送

访问 [DirectMail 控制台](https://dm.console.aliyun.com/) → 首次使用提示开通 → 点「立即开通」。

开通后进入控制台首页，左侧菜单：**发信域名** / **发信地址** / **数据统计** / **设置 SMTP**。

> 邮件推送服务按发送量计费，每月 2000 封免费额度，超出约 0.001 元/封。MVP 上线前用户量级完全可以白嫖。

## 2. 配置发信域名

左侧菜单 → **发信域名** → 右上角 **新建域名** → 填你的域名（如 `youwei-agent.com`）。

阿里云会列出需要配置的 DNS 记录，每条都有具体值要复制到你的域名服务商（Cloudflare / 阿里云 DNS / 腾讯云 DNS）：

### 2.1 必需的 DNS 记录

| 类型 | 主机记录（Name） | 记录值 | 用途 |
| --- | --- | --- | --- |
| TXT | `@` | `v=spf1 include:spf.dm.aliyun.com -all` | SPF 反伪造 |
| TXT | `_dxxx._domainkey` | 阿里云给的公钥 | DKIM 签名 |
| CNAME | `xxx.dm` | `xxx.dm.aliyun.com` | 邮件追踪 |
| MX | `xxx.dm` | `xxx.dm.aliyun.com` | 退信处理 |

把 `xxx` 替换为阿里云给你的具体字符串。

### 2.2 验证 DNS

每条记录配好后，在阿里云对应条目右侧点 **验证配置**。全部通过即显示绿色 ✅。

DNS 传播可能需要几分钟到几小时。如果验证失败，等 5 分钟再点一次。

常见 DNS 配置方式：

**Cloudflare：**
- 主机记录里 `@` 表示根域名，`_dxxx._domainkey` 直接复制
- 记得把对应记录的 **Proxy status** 设为 **DNS only**（灰色云朵），不能让 Cloudflare 代理邮件流量

**阿里云 DNS：**
- 主机记录直接填阿里云给的字符串，不用改

## 3. 创建发信地址

左侧菜单 → **发信地址** → **新建发信地址**：

| 字段 | 填什么 |
| --- | --- |
| 发信地址 | `noreply@youwei-agent.com`（域名必须是你配置的域名） |
| 回信地址 | 留空或填你常用邮箱 |
| 发信类型 | **触发邮件**（验证码类选这个） |
| 每日发信额度 | 默认 500，可调整 |

创建完成后，这个地址就能被 API 调用发邮件了。

## 4. 创建 RAM 子账号 + AccessKey

访问 [RAM 控制台](https://ram.console.aliyun.com/) → **用户** → **创建用户**：

- 登录名称：`directmail-sender`
- 勾选「**OpenAPI 调用访问**」（即编程访问）
- 不勾选「控制台访问」

授权：
- 用户列表 → 找到 `directmail-sender` → **添加权限**
- 搜索 `AliyunDMFullAccess`（邮件推送管理权限）
- 勾选并确认

生成 AccessKey：
- 回到用户列表 → 点 `directmail-sender` → **AccessKey** 标签页
- **创建 AccessKey** → 下载或复制
  - `AccessKey ID`：形如 `LTAI5txxxxxxxxx`
  - `AccessKey Secret`：形如 `YjKxxxxxxxxxxxxx`（只显示一次，务必保存）

> **安全第一**：用 RAM 子账号而不是主账号的 AccessKey。主账号的 AccessKey 一旦泄露等于交出整个阿里云账号。

## 5. 写入 DO 的 .env

把三个值添加到 DO 的 `/opt/youwei-trading-agent/.env`：

```bash
# 接在现有行后面追加
ALIYUN_ACCESS_KEY_ID=LTAI5txxxxxxxxx
ALIYUN_ACCESS_KEY_SECRET=YjKxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@youwei-agent.com
```

**⚠️ 注意**：CI 部署会重新覆盖 `.env`，所以必须同步在 GitHub Environment Secrets 中也加上这三个：

| GitHub Secret | 值 |
| --- | --- |
| `ALIYUN_ACCESS_KEY_ID` | RAM AccessKey ID |
| `ALIYUN_ACCESS_KEY_SECRET` | RAM AccessKey Secret |
| `EMAIL_FROM_ADDRESS` | `noreply@youwei-agent.com` |

然后在项目的 `.github/workflows/deploy.yml` 的 `Prepare .env` step 中也加上这三行，让 CI 下次部署时自动写入。（具体见[部署 Web 到 DO](./deploy-web-to-do.md#5-github-actions-部署流程)。）

## 6. 重新部署 web 容器

修改 `.env` 后，`docker compose restart` **不会**重新加载环境变量（这是常见的坑）。必须用 `up -d --force-recreate`：

```bash
cd /opt/youwei-trading-agent
docker compose -f docker-compose.prod.yml up -d --force-recreate web
```

验证启动日志确认走的是阿里云 sender：

```bash
docker compose -f docker-compose.prod.yml logs --tail=20 web | grep email_sender
```

期望看到：

```
{"level":"INFO","msg":"email_sender_aliyun","from":"noreply@youwei-agent.com"}
```

如果还是看到 `email_sender_console`，说明环境变量没生效，检查第 5 步是否用 `force-recreate`。

## 7. 端到端测试

打开 `https://你的域名` → 邮箱验证码登录 → 输入邮箱 → 点「发送验证码」。

预期：

1. 浏览器显示"验证码已发送"
2. 邮箱里（含垃圾箱）收到一封标题为「您的验证码」的邮件
3. 输入邮件里的 6 位验证码 → 登录成功

如果没收到邮件，查看容器日志：

```bash
docker compose -f docker-compose.prod.yml logs --tail=30 web | grep -i email
```

**常见错误**：

| 日志内容 | 原因 | 修复 |
| --- | --- | --- |
| `aliyun_email_failed` + `InvalidAccessKeyId` | AccessKey ID 错误 | 检查 RAM AccessKey ID |
| `InvalidApi` | API 调用格式错误 | 极少出现，联系代码 |
| `InvalidDomainName` | 发信域名 DNS 没通过验证 | 回阿里云控制台点「验证配置」 |
| `QuotaExhausted` | 当日发信额度用尽 | RAM 控制台调高配额 |
| 无 `email_code_sent` 日志 | 根本没走到发送函数 | 重启容器确认走 AliyunSender |

## 8. 总结

| 步骤 | 耗时 |
| --- | --- |
| 开通 DirectMail 服务 | 1 分钟 |
| 配发信域名 + DNS + 验证 | 10 分钟（含 DNS 传播） |
| 创发信地址 | 1 分钟 |
| 创 RAM 子账号 + AccessKey | 3 分钟 |
| 写 .env + 重启容器 | 2 分钟 |
| **总计** | **~15 分钟** |

配好之后的维护基本为零——DirectMail 的 DNS 和证书都不需要续期，每月免费 2000 封邮件对 MVP 绰绰有余。

## 系列文章

| 文章 | 部署目标 | 内容 |
| --- | --- | --- |
| [GitHub Actions + GHCR + SSH](./github-actions-ghcr-deploy.md) | 通用 CI/CD | 基础流水线模式 |
| [DO 部署 Web 前后端](./deploy-web-to-do.md) | DigitalOcean | React+Go 容器 + Nginx HTTPS |
| [ECS 部署 AKShare](./deploy-akshare-to-ecs.md) | 阿里云 ECS | A 股数据源 + 双环境并行 |
| 本文 | 阿里云 DirectMail | 邮箱验证码真正发送 |
