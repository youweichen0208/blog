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

访问 [RAM 控制台](https://ram.console.aliyun.com/) → **用户** → **创建用户**。

### 4.1 基本信息

| 字段 | 填什么 |
| --- | --- |
| 登录名称 | `directmail-sender` |
| 显示名称 | `邮件推送服务`（可选） |
| 标签 | 不用绑 |
| MFA / 安全手机 / 安全邮箱 | 不用填 |

### 4.2 访问配置

阿里云 2025 年起改了界面措辞，两个选项二选一（建议只勾一种）：

| 选项 | 是否勾选 | 说明 |
| --- | --- | --- |
| **使用控制台访问** | ❌ 不勾 | 这个是让人登录网页的，子账号不需要 |
| **使用永久 AccessKey 访问** | ✅ 勾选 | 这个就是以前叫「OpenAPI 调用访问」的选项，用于程序调 API |

> 旧文档里写的「勾选 OpenAPI 调用访问」= 现在的「使用永久 AccessKey 访问」，是同一个东西改了个名字。

点 **添加用户**，会自动弹出 AccessKey 对：

- `AccessKey ID`：形如 `LTAI5txxxxxxxxx`
- `AccessKey Secret`：形如 `YjKxxxxxxxxxxxxx`

⚠️ **只显示一次，务必立即保存**。关了窗口就再也看不到了，只能删了重新生成。

### 4.3 授权

回到用户列表 → 找到 `directmail-sender` → **添加权限**：

1. 搜索 `AliyunDMFullAccess`
2. 勾选并确认

这个权限只能调用邮件推送相关的 API，不能动你的 ECS、OSS 等其他资源。

> **安全第一**：用 RAM 子账号而不是主账号的 AccessKey。主账号的 AccessKey 一旦泄露等于交出整个阿里云账号。

## 5. 写入 DO 的 .env

把四个值添加到 DO 的 `/opt/youwei-trading-agent/.env`：

```bash
# 在 DO 上执行
cat >> /opt/youwei-trading-agent/.env << 'EOF'
ALIYUN_ACCESS_KEY_ID=LTAI5txxxxxxxxx
ALIYUN_ACCESS_KEY_SECRET=YjKxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME="Your Project Name"
EOF
```

**⚠️ 注意：必须同步配置 GitHub Environment Secrets**

只写 DO 的 `.env` 不够——CI 下次部署时会把 `.env` 重新覆盖，导致邮件配置丢失！必须把这 4 个值加到 GitHub：

**GitHub repo → Settings → Environments → production → Environment secrets**，添加：

| Secret Name | Value |
|-------------|-------|
| `ALIYUN_ACCESS_KEY_ID` | RAM AccessKey ID |
| `ALIYUN_ACCESS_KEY_SECRET` | RAM AccessKey Secret |
| `EMAIL_FROM_ADDRESS` | `noreply@yourdomain.com` |
| `EMAIL_FROM_NAME` | 发件人显示名称（如 `Youwei Agent`） |

> ⚠️ **必须配在 Environment (production) 下的 Secrets**，不是 Repository Secrets。因为 `deploy.yml` 的 `deploy` job 带了 `environment: production`，只能访问 Environment 级别的 Secrets。配错了位置（放在 Repository Secrets），CI 部署时这些值会是空的。

**还需要更新 `.github/workflows/deploy.yml`**

在 `deploy.yml` 的 `Prepare .env locally` 步骤（约第 128 行）的 `.env` 模板末尾，加上这 4 行：

```yaml
          # deploy.yml: Prepare .env locally 的 cat > .env 部分
          # ... 前面的配置 ...
          WECOM_CORP_ID=${{ secrets.WECOM_CORP_ID }}
          WECOM_AGENT_ID=${{ secrets.WECOM_AGENT_ID }}
          WECOM_SECRET=${{ secrets.WECOM_SECRET }}
          # ↓↓↓ 邮件配置，新增 ↓↓↓
          ALIYUN_ACCESS_KEY_ID=${{ secrets.ALIYUN_ACCESS_KEY_ID }}
          ALIYUN_ACCESS_KEY_SECRET=${{ secrets.ALIYUN_ACCESS_KEY_SECRET }}
          EMAIL_FROM_ADDRESS=${{ secrets.EMAIL_FROM_ADDRESS }}
          EMAIL_FROM_NAME=${{ secrets.EMAIL_FROM_NAME }}
          ENVEOF
```

否则即使 GitHub Secrets 配了，CI 部署时 `.env` 里还是没有邮件配置，容器启动会报错或者回退到 `ConsoleSender`（只打日志不发邮件）。

更新后正常走 Git 流程提交：

```bash
git add .github/workflows/deploy.yml
git commit -m "feat(deploy): add email config to .env template"
git push origin main
```

CI 会自动部署，这次部署会把邮件配置写进 DO 的 `.env`。

## 6. 重新部署 web 容器

**⚠️ 修改 `.env` 之后，`docker compose restart` 不会重新加载环境变量！这是最常见的坑。**

正确姿势：

```bash
cd /opt/youwei-trading-agent

# 如果你手动操作，先 export IMAGE_REPO 避免 compose 警告
export IMAGE_REPO=ghcr.io/<你的github用户名>/<仓库名>
export IMAGE_REPO=$(echo $IMAGE_REPO | tr '[:upper:]' '[:lower:]')

docker compose -f docker-compose.prod.yml up -d --force-recreate web
```

> **为什么 `restart` 不行**：`restart` 只是重启容器进程，不会重新读取宿主机上的 `.env`。`--force-recreate` 才会销毁旧容器，新建一个新容器，重新注入环境变量。
>
> **`IMAGE_REPO variable is not set` 警告**：如果你没 `export IMAGE_REPO`，compose 会把镜像解析成 `/web:latest`，拉取时直接失败。CI 里不需要 `export`，因为 GitHub Actions runner 在 SSH session 里 export 了。

验证启动日志，确认走阿里云 sender：

```bash
docker compose -f docker-compose.prod.yml logs --tail=20 web | grep email_sender
```

**期望看到**（配置成功）：

```
{"level":"INFO","msg":"email_sender_aliyun","from":"noreply@yourdomain.com"}
```

**❌ 错误情况**：

```
{"level":"INFO","msg":"email_sender_console","hint":"set ALIYUN_ACCESS_KEY_ID + ..."}
```

这个表示环境变量没生效，回到了 ConsoleSender（只打日志不发邮件）。检查：
1. `.env` 里是不是真的有 `ALIYUN_ACCESS_KEY_ID` 这行
2. 是不是用了 `--force-recreate` 而不是 `restart`
3. `docker compose exec web env | grep ALIYUN` 看容器内环境变量是不是空的

## 7. 端到端测试

**Step 1：验证 DNS 全部生效**（可选但推荐）

```bash
# 任意能解析 DNS 的机器上
dig yourdomain.com TXT +short | grep -i spf
dig mx01.dm.aliyun.com._domainkey.yourdomain.com TXT +short
dig _dmarc.yourdomain.com TXT +short
dig yourdomain.com MX +short
```

或者回到阿里云邮件推送控制台 → **发信域名** → 4 条记录全绿 ✅。

**Step 2：发起验证码请求**

打开 `https://你的域名` → 邮箱验证码登录 → 输入你常用的邮箱（QQ / 163 / Gmail 都行）→ 点「发送验证码」。

**预期结果**：

1. 浏览器显示「验证码已发送」
2. 邮箱里（含垃圾箱 / 订阅邮件 folder）收到一封标题为「您的验证码：xxxxxx」的邮件
3. 输入邮件里的 6 位验证码 → 登录成功

**Step 3：如果没收到邮件，排查**

**3a. 先确认发送是否调用了阿里云**

```bash
# 在 DO 上执行
docker compose -f docker-compose.prod.yml logs --tail=30 web | grep -i email
```

应该能看到 `email_code_sent` 或 `aliyun_email_failed`。如果只有 `email_code_sent` 没看到 `aliyun_email_failed`，说明阿里云 API 调用成功了，问题在收件方那边（被过滤了）。

**3b. 看有没有报错**

```bash
docker compose -f docker-compose.prod.yml logs --tail=50 web | grep -E "ERROR|email"
```

**常见错误对照表**：

| 日志关键字 | 错误含义 | 修复方法 |
|-----------|---------|----------|
| `Forbidden` + `not authorized to operate` | RAM 子账号缺少邮件推送权限 | 见下方「3e. RAM 权限不足」 |
| `InvalidAccessKeyId` | AccessKey ID 写错了 | 检查 RAM AccessKey ID，注意首字符不是空格 |
| `InvalidAccessKeySecret` | AccessKey Secret 写错了 | 检查 Secret，注意只显示一次不要复制错 |
| `MissingReplyToAddress` | 代码参数漏了 `ReplyToAddress` | 检查代码 `aliyun.go` 的 `params` 包含 `"ReplyToAddress": "true"` |
| `InvalidDomainName` | 发信域名 DNS 验证没通过 | 回阿里云控制台点「验证配置」，4 条 DNS 全绿才行 |
| `InvalidAddress` | 发信地址 `noreply@...` 没创建或格式错 | 检查阿里云「发信地址」页面是否创建了 |
| `QuotaExhausted` | 当日发信额度达到上限（默认 500 封） | RAM 控制台提高配额，或换个 RAM 子账号 |
| `InvalidFromAddress` | 收件方邮箱拒绝接收 | 可能是邮箱域名黑名单，换一个邮箱收件人试试 |
| 没有任何 email 日志 | 请求根本没走到邮件发送函数 | 检查登录接口，可能是前端或路由配置问题 |

**3c. 邮件显示被拒收（550 错误）**

某些邮箱（特别是 163 / QQ）对阿里云直发邮件比较严格，可能直接返回 `550 SPF check failed` 或 `550 Sender address rejected`。

排查：

```bash
# 看完整错误
docker compose -f docker-compose.prod.yml logs --tail=50 web | grep -A 5 "aliyun_email_failed"
```

常见原因：
- **SPF 记录配错**：检查你的域名 SPF 是不是 `include:spf1.dm.aliyun.com -all`
- **DMARC 设为 reject**：阿里云给的默认是 `p=none`，如果你自己改成了 `p=reject`，会拒收未通过 SPF/DKIM 的邮件
- **发信域名 DNS 验证失败**：回到阿里云控制台点「验证配置」

**3d. 完全没收到，但 API 返回成功**

这是最常见的「假成功」情况，邮件被收件方静默丢弃到垃圾箱 / 订阅邮件 / 广告邮件文件夹。让用户检查：

- **Gmail**：垃圾箱 + 促销（Promotions） + 社交（Social）标签
- **QQ 邮箱**：垃圾箱
- **163 邮箱**：广告邮件

如果确认进了垃圾箱，说明 DKIM / SPF / DMARC 配置有问题，收件方邮件服务器不信任你的发信域名。重新检查 DNS 4 条记录。

**3e. RAM 权限不足（Forbidden 错误）**

完整错误信息类似：

```json
{
  "Code": "Forbidden",
  "Message": "The user is not authorized to operate on the specified resource.",
  "AccessDeniedDetail": {
    "AuthPrincipalType": "SubUser",
    "AuthPrincipalOwnerId": "13686690xxxxxx"
  }
}
```

**根因**：RAM 子账号 `directmail-sender` 没有 `AliyunDMFullAccess` 权限，或者根本没授权到 DirectMail API。

**修复步骤**：

1. 打开 RAM 控制台：https://ram.console.aliyun.com/users
2. 找到 `directmail-sender`（或者你给子账号起的名字）→ 点进去 → **权限管理** 标签页
3. 点 **新增授权** → 搜索 `AliyunDMFullAccess` → 勾选 → 确定

如果权限已经加了还是报错，排查这几点：

| 检查项 | 说明 |
|--------|------|
| AccessKey ID/Secret 是不是配错的子账号？ | RAM 控制台 → 子账号 → **AccessKey 管理**，确认 AccessKey ID 前缀（如 `LTAI5t...`）和你用的一致 |
| 权限是不是还没生效？ | RAM 权限变更是**即时生效**的，不需要等。但可以 `docker compose -f docker-compose.prod.yml restart web` 试一下（注意要用 `--force-recreate` 才能真正重新加载环境变量） |
| 是不是授权到了错误的子账号？ | 确认你授权的子账号就是生成 AccessKey 的那个。RAM 控制台 → 子账号列表，每个子账号的 AccessKey 单独管理 |

如果还是不行，最后手段：**删除旧的 AccessKey，重新创建**：

1. RAM 控制台 → 子账号 → **AccessKey 管理** → 删除旧 AccessKey
2. **创建 AccessKey** → 复制新的 ID 和 Secret（只显示一次）
3. 更新 DO 的 `.env` + GitHub Environment Secrets（`ALIYUN_ACCESS_KEY_ID` 和 `ALIYUN_ACCESS_KEY_SECRET`）
4. 在 DO 上执行：
   ```bash
   cd /opt/youwei-trading-agent
   export IMAGE_REPO=ghcr.io/<你的github>/<仓库名>
   docker compose -f docker-compose.prod.yml up -d --force-recreate web
   ```

**为什么会漏授权？**

RAM 子账号创建时**默认没有任何权限**，必须手动添加授权。阿里云的授权方式有两种，容易搞混：

| 方式 | 在哪里操作 | 区别 |
|------|-----------|------|
| 子账号详情页 → **权限管理** | 给指定子账号加权限 | ✅ 推荐，明确 |
| 权限策略 → **用户授权** | 从权限侧找用户 | 同上，入口不同而已 |

两种方式等价，任选一种即可。关键是授权后必须能看到子账号的权限列表里有 `AliyunDMFullAccess`。

## 8. 总结

| 步骤 | 耗时 |
| --- | --- |
| 开通 DirectMail 服务 | 1 分钟 |
| 配发信域名 + DNS + 验证 | 10 分钟（含 DNS 传播） |
| 创发信地址 | 1 分钟 |
| 创 RAM 子账号 + AccessKey | 3 分钟 |
| 写 DO .env + `--force-recreate` 重启 | 2 分钟 |
| **配 GitHub Environment Secrets + 改 deploy.yml** | 3 分钟 |
| CI 部署验证 | 2 分钟 |
| **总计** | **~20 分钟** |

**踩坑清单**（来自实战）：

| 坑 | 解决 |
| --- | --- |
| `.env` 改完没生效 | `restart` 不会重新加载 `.env`，必须 `--force-recreate` |
| CI 部署后邮件配置丢失 | GitHub Secrets 配在 Environment (production) 下，且 deploy.yml 的 `.env` 模板里加上了邮件变量 |
| 收到 550 错误 | SPF / DKIM / DMARC 必须全部验证通过 |
| 邮件进垃圾箱 | DNS 4 条记录全配 + 收件方加白名单或检查 Promotion 文件夹 |
| `InvalidAccessKeyId` | RAM AccessKey ID/Secret 只显示一次，复制错了只能删了重新生成 |
| `Forbidden` / `not authorized` | RAM 子账号**默认没有任何权限**，必须手动去 RAM 控制台给 `directmail-sender` 添加 `AliyunDMFullAccess` 授权 |

配好之后的维护基本为零——DirectMail 的 DNS 和证书都不需要续期，每月免费 2000 封邮件对 MVP 绰绰有余。

## 系列文章

| 文章 | 部署目标 | 内容 |
| --- | --- | --- |
| [GitHub Actions + GHCR + SSH](./github-actions-ghcr-deploy.md) | 通用 CI/CD | 基础流水线模式 |
| [DO 部署 Web 前后端](./deploy-web-to-do.md) | DigitalOcean | React+Go 容器 + Nginx HTTPS |
| [ECS 部署 AKShare](./deploy-akshare-to-ecs.md) | 阿里云 ECS | A 股数据源 + 双环境并行 |
| 本文 | 阿里云 DirectMail | 邮箱验证码真正发送 |
