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

阿里云会列出需要配置的 DNS 记录，每条都有具体值要复制到你的域名服务商。

### 2.1 为什么需要配置这些 DNS 记录？

直接发邮件（SMTP 裸发）在 2005 年之前可以，现在不行。现代邮件系统（Gmail、Outlook、QQ 邮箱、网易邮箱）都有三层反垃圾机制：

| 机制 | 解决的问题 | 不配会怎样 |
| --- | --- | --- |
| **SPF** | 「这个 IP 有权用 mydomain.com 发邮件吗？」——白名单 | 收件方直接拒收，或丢进垃圾箱 |
| **DKIM** | 「这封邮件真的是 mydomain.com 发的吗？」——密码学校验 | 无法证明不是伪造的，信任分下降 |
| **DMARC** | 「SPF/DKIM 校验失败时怎么处理？」——策略声明 | 缺少明确策略，某些收件方会更严格 |
| **MX** | 「退信发回哪里？」——收信配置 | 阿里云无法处理退信回调，域名验证通不过 |

**简单理解**：SPF = 身份证，DKIM = 签名，DMARC = 出事后怎么办，MX = 退信地址。

不配这 4 条记录，邮件：
1. 阿里云 DirectMail 域名验证通不过，**API 调不动**
2. 就算勉强发出去，80% 进垃圾箱
3. Gmail / Outlook 可能直接返回 `550 SPF check failed`

### 2.2 阿里云会给你 4 条记录要添加

新建域名后，阿里云控制台会展示以下 4 条配置（具体值会因你的域名生成而不同）：

#### (1) DKIM 验证

```
类型：TXT
主机记录：aliyun-cn-hangzhou._domainkey
记录值：v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3...（一串 RSA 公钥）
```

**工作原理**：阿里云发邮件时用这把密钥的**私钥**签名，收件方通过 DNS 查这把**公钥**来校验签名是不是真的。证明「这封邮件确实是阿里云代表 youwei-agent.com 发的，没被中间人篡改」。

#### (2) SPF 验证

```
类型：TXT
主机记录：@（表示根域名 youwei-agent.com 本身）
记录值：v=spf1 include:spf1.dm.aliyun.com -all
```

**工作原理**：收件方（如 QQ 邮箱）收到一封自称 `noreply@youwei-agent.com` 的邮件时，会查这条记录：「`include:spf1.dm.aliyun.com` 里列的 IP 段有没有这个发件 IP？」有 → 通过；没有 → `-all` 表示拒绝。

⚠️ **如果你的域名已经有一条 SPF TXT 记录**（比如 `v=spf1 include:spf.dashscope.aliyuncs.com -all`），**不要新建**，把 `include:spf1.dm.aliyun.com` 合并到现有那条里：

```
v=spf1 include:spf.dashscope.aliyuncs.com include:spf1.dm.aliyun.com -all
```

一条域名只能有一条 SPF，多了会互相冲突导致全部失效。

#### (3) DMARC 验证

```
类型：TXT
主机记录：_dmarc
记录值：v=DMARC1; p=none; rua=mailto:dmarc_report@service.aliyun.com
```

**工作原理**：「p=none」表示 SPF/DKIM 失败时**只记录不处理**（先观察），阿里云会每天给你发 DMARC 报告邮件到 `dmarc_report@service.aliyun.com`，说明有多少邮件伪造了你的域名。

如果以后伪造率太高，可以改成 `p=quarantine`（丢垃圾箱）或 `p=reject`（直接拒绝）。MVP 阶段用 `p=none` 更安全。

#### (4) MX 记录（收信配置）

```
类型：MX
主机记录：@
记录值：mx01.dm.aliyun.com
MX 优先级：10
```

**工作原理**：阿里云发邮件时，会有少部分邮件「退信」——比如收件方邮箱不存在、超容量。退信会被阿里云的收信服务器（`mx01.dm.aliyun.com`）接收，用于统计发信成功率。

这条记录**必须加**，否则阿里云控制台域名状态一直显示「MX 验证中」，整个配置流程走不完。

### 2.3 在阿里云 DNS 控制台添加记录（具体操作）

查一下你的域名 DNS 在哪里管理：

```bash
# 终端执行，看 NS 记录
dig yourdomain.com NS +short
```

- `dns*.hichina.com` → **阿里云（万网）**
- `*.cloudflare.com` → **Cloudflare**
- `dns*.aliyun.com` → **阿里云 DNS**
- `*.namecheap.com` → **Namecheap**

下面以**阿里云（万网）DNS** 为例，其他平台类似：

**步骤 1**：浏览器打开 https://dns.console.aliyun.com/ 并登录

**步骤 2**：找到 `youwei-agent.com` → 点 **解析设置**

**步骤 3**：点右上角 **添加记录**，依次加 4 条：

| # | 记录类型 | 主机记录 | 记录值 | MX 优先级 | TTL |
|---|---------|---------|--------|---------|-----|
| 1 | TXT | `aliyun-cn-hangzhou._domainkey` | `v=DKIM1; k=rsa; p=MIGfMA0...`（从阿里云邮件推送控制台整段复制） | 留空 | 10 分钟 |
| 2 | TXT | `@` | `v=spf1 include:spf1.dm.aliyun.com -all` | 留空 | 10 分钟 |
| 3 | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc_report@service.aliyun.com` | 留空 | 10 分钟 |
| 4 | MX | `@` | `mx01.dm.aliyun.com` | `10` | 10 分钟 |

**步骤 4**：4 条都加完之后，回到阿里云邮件推送控制台 → **发信域名** → 点每条记录右侧的 **验证配置** 按钮。

DNS 通常 1-2 分钟生效。4 条全绿 ✅ 才算成功。

### 2.4 常见 DNS 平台差异

**Cloudflare**：
- `@` 表示根域名，照填
- 记得把 MX、TXT 记录的 **Proxy status** 设为 **DNS only**（灰色云朵），不能让 Cloudflare 的 HTTP 代理干扰邮件流量
- CNAME 类的邮件追踪记录，也要设为 DNS only

**阿里云 DNS（万网）**：
- 主机记录直接填阿里云给的字符串，不用改
- `@` 在下拉菜单里选「@」

**腾讯云 / DNSPod**：
- 同上，主机记录直接填

**Namecheap / GoDaddy**：
- 主机记录填 `@` 或留空表示根域名
- 部分平台 TXT 记录不支持太长，如果 DKIM 公钥超长可以拆成两条（阿里云的通常不会）

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
