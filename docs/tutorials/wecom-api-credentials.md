---
lang: zh-CN
title: 企业微信 API 凭证获取完整指南
description: 详细讲解如何获取企业微信开发的 5 个核心凭证参数。
date: 2026-05-27
tags:
  - 企业微信
  - API
---

# 获取企业微信 API 凭证的完整步骤

这 5 个参数是企业微信开发的核心凭证，分别用在不同地方。下面一个一个讲怎么拿。

## 一、各参数是什么 + 在哪里拿

| 参数 | 含义 | 从哪拿 |
|------|------|--------|
| **WECOM_CORP_ID** | 企业 ID | 我的企业页面 |
| **WECOM_AGENT_ID** | 应用 ID | 自建应用详情页 |
| **WECOM_SECRET** | 应用密钥 | 自建应用详情页 |
| **WECOM_TOKEN** | 回调 Token（接收消息用） | 自建应用 → 接收消息配置 |
| **WECOM_AES_KEY** | 消息加密密钥 | 自建应用 → 接收消息配置 |

> 大前提：你需要先**注册企业微信 + 创建一个自建应用**。

## 二、登录管理后台

访问：**https://work.weixin.qq.com/wework_admin**

用注册时绑定的微信扫码登录。

## 三、获取 WECOM_CORP_ID（企业 ID）

### 步骤

1. 后台左下角 → 点 **"我的企业"** 标签
2. 滑到页面**最底部**
3. 找到 **"企业 ID"** 这一项
4. 复制（一串字符，类似 `ww1234567890abcdef`）

### 位置参考

```
我的企业页面
  ↓
企业信息
企业名称: XXX
企业简称: XXX
...
...（一堆其他信息）...
...
企业 ID: ww1234567890abcdef   ← 这里！点旁边复制
```

保存这个值就是 `WECOM_CORP_ID`。

## 四、创建自建应用（拿 AgentId 和 Secret 必经步骤）

### 步骤 1：进入应用管理

后台 → 顶部 **"应用管理"** 标签

### 步骤 2：创建自建应用

- 滑到 **"自建"** 区域
- 点 **"创建应用"** 按钮

### 步骤 3：填写应用信息

| 字段 | 怎么填 |
|------|--------|
| **应用 logo** | 上传一个图（必须，可以是任意 png） |
| **应用名称** | 比如"金融分析助手"、"消息推送" |
| **应用介绍** | 一句话描述 |
| **可见范围** | 选哪些部门/成员能用（可以全选） |

### 步骤 4：点"创建应用"

创建成功后进入应用详情页，这里有你要的信息。

## 五、获取 WECOM_AGENT_ID 和 WECOM_SECRET

### 在应用详情页

```
应用详情
┌─────────────────────────────────────┐
│ 应用名称: 金融分析助手                │
│ 应用 logo: [图]                      │
│                                     │
│ AgentId: 1000002                    │ ← 这就是 WECOM_AGENT_ID
│ Secret:  ●●●●●●●● [查看] [发送到微信] │ ← 这就是 WECOM_SECRET
│                                     │
│ 可见范围: ...                        │
└─────────────────────────────────────┘
```

### 拿 AgentId

- **AgentId** 是一串数字（如 `1000002`）
- 直接显示在页面上，点击复制

保存这个就是 `WECOM_AGENT_ID`。

### 拿 Secret

- **Secret** 默认隐藏
- 点 **"查看"** 或 **"发送到微信"**
- 会通过"企业微信助手"发到你绑定的微信里
- 复制收到的 Secret（一串字符，约 40-50 位）

保存这个就是 `WECOM_SECRET`。

> Secret 重要提示：
> - 只显示一次（再次查看也要重新发送）
> - **千万不要泄露**（相当于密码）
> - 不要提交到 git
> - 用环境变量存

## 六、获取 WECOM_TOKEN 和 WECOM_AES_KEY（接收消息用）

> 只有需要"接收企业微信消息"时才需要这两个。比如：
> - 用户在企业微信里给你的应用发消息，你想收到
> - 做企业微信机器人（双向对话）
> - 接收审批回调
>
> **只是做单向消息推送（你的程序往企业微信发消息）不需要这两个**。

### 步骤 1：在应用详情页找"接收消息"

应用详情页 → 滑到下面 → 找 **"接收消息"** 区域 → 点 **"设置 API 接收"** 或 **"启用 API 接收"**

### 步骤 2：填写回调配置

会出现一个表单：

```
┌─────────────────────────────────────┐
│ URL:        [你的服务器接收URL]       │
│ Token:      [系统随机生成 / 你填]     │ ← WECOM_TOKEN
│ EncodingAESKey: [生成 43 位密钥]      │ ← WECOM_AES_KEY
│ 消息加密方式: [安全模式（推荐）]      │
└─────────────────────────────────────┘
```

### 步骤 3：生成 Token

- 点 **"随机获取"** → 系统生成
- 或者自己填一个字符串（3-32 位，英文数字）

保存这个就是 `WECOM_TOKEN`。

### 步骤 4：生成 EncodingAESKey

- 点 **"随机获取"** → 系统生成 43 位字符串
- 必须是 43 位的（A-Z, a-z, 0-9）

保存这个就是 `WECOM_AES_KEY`。

### 步骤 5：填 URL 并验证

这一步需要你**已经写好了接收消息的接口**：

- URL：必须是公网可访问的 HTTPS 地址，如 `https://yourdomain.com/wecom/callback`
- 这个接口要能正确响应企业微信发的验证请求
- 点 **"保存"**，企业微信会发一个 GET 请求验证
- 验证通过才能保存成功

> 如果接口还没写好，可以**先点保存（会失败）**，把 Token 和 AES_KEY 记下来，写完接口再来验证。

## 七、配置 IP 白名单（开发必看）

调用 API 前，要把你的服务器 IP 加白名单：

### 步骤

1. 应用详情页 → 滑到最下面
2. 找 **"企业可信 IP"** → 点 **"配置"**
3. 添加你的服务器公网 IP
4. 保存

> 不加白名单调用 API 会报错 60020。

**如果是本地开发**：
- 用你公网 IP（查询：`curl ifconfig.me`）
- 或者用内网穿透工具（ngrok、frp）拿到一个公网 IP

## 八、完整配置示例

把所有获取到的值放在 `.env` 文件里：

```bash
# .env
WECOM_CORP_ID=ww1234567890abcdef
WECOM_AGENT_ID=1000002
WECOM_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WECOM_TOKEN=your_random_token_here
WECOM_AES_KEY=43位随机字符串字符串字符串字符串字符串字符串
```

或者 Python 配置：

```python
import os

WECOM_CONFIG = {
    "corp_id": os.environ.get("WECOM_CORP_ID"),
    "agent_id": int(os.environ.get("WECOM_AGENT_ID")),
    "secret": os.environ.get("WECOM_SECRET"),
    "token": os.environ.get("WECOM_TOKEN"),
    "aes_key": os.environ.get("WECOM_AES_KEY"),
}
```

## 九、快速验证凭证是否正确

### 测试 1：获取 access_token（最基础测试）

```bash
# 替换成你的 CORP_ID 和 SECRET
curl "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=ww1234567890abcdef&corpsecret=你的secret"
```

成功返回：

```json
{
    "errcode": 0,
    "errmsg": "ok",
    "access_token": "accesstoken000001",
    "expires_in": 7200
}
```

如果报错：

| 错误码 | 含义 | 解决 |
|--------|------|------|
| 40013 | CorpId 不存在 | 检查 CORP_ID |
| 40001 | Secret 错误 | 重新拿 Secret |
| 60020 | IP 不在白名单 | 加白名单 |

### 测试 2：发条消息试试

```python
import requests

# 1. 获取 access_token
resp = requests.get(
    "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
    params={
        "corpid": "你的WECOM_CORP_ID",
        "corpsecret": "你的WECOM_SECRET",
    }
)
access_token = resp.json()["access_token"]

# 2. 发消息
resp = requests.post(
    f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={access_token}",
    json={
        "touser": "@all",          # 发给所有人，或写成员 userid
        "msgtype": "text",
        "agentid": 1000002,         # 你的 WECOM_AGENT_ID
        "text": {
            "content": "Hello from API！"
        }
    }
)
print(resp.json())
```

收到企业微信通知 → 成功！

## 十、可视化对照表

```
企业微信管理后台
│
├── 我的企业
│   └── 企业信息（最底部）
│       └── 企业 ID                 → WECOM_CORP_ID
│
├── 应用管理
│   └── 自建 → [创建/选择应用]
│       │
│       ├── 应用详情页
│       │   ├── AgentId             → WECOM_AGENT_ID
│       │   ├── Secret              → WECOM_SECRET
│       │   │
│       │   └── 接收消息（点设置API接收）
│       │       ├── Token           → WECOM_TOKEN
│       │       └── EncodingAESKey  → WECOM_AES_KEY
│       │
│       └── 企业可信 IP(最底部)         → 加白名单
│
└── 通讯录
    └── 成员 userid                    → 发消息用
```

## 十一、需要哪些参数（按场景）

不同场景需要不同参数，不一定都要：

### 场景 1：只发消息（最常见）

```
WECOM_CORP_ID
WECOM_AGENT_ID
WECOM_SECRET

不需要 TOKEN / AES_KEY
```

### 场景 2：接收消息 + 双向对话

```
WECOM_CORP_ID
WECOM_AGENT_ID
WECOM_SECRET
WECOM_TOKEN
WECOM_AES_KEY
```

### 场景 3：群机器人（最简单）

如果只是想往群里发消息，**不用创建应用，更不用上面这些参数**。

直接：

1. 在某个群里点右上角"..." → "群机器人" → "添加机器人"
2. 复制 Webhook URL
3. 直接 POST 消息到这个 URL：

```bash
curl 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxx-xxxx-xxxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "msgtype": "text",
    "text": {
      "content": "Hello"
    }
  }'
```

这是最简单的方式，但只能发到固定群。

## 十二、安全注意事项

### 1. Secret 千万别泄露

- 不要写在代码里直接 commit
- 不要发到聊天群
- 不要截图发出来
- 用环境变量 `.env`
- `.env` 加到 `.gitignore`
- 生产环境用密钥管理服务

### 2. 一旦泄露立即重置

应用详情页 → 找到 Secret → 点 **"重置"** → 旧的立即失效。

### 3. IP 白名单加细一点

- 不要加 `0.0.0.0/0`
- 只加你真正用的服务器 IP
- 临时调试用完记得删

### 4. AES_KEY 也要保密

- 这是消息加密密钥
- 泄露会让别人能伪造企业微信消息发给你

---

## 一句话总结

**5 个参数都在企业微信后台拿：CORP_ID 在"我的企业"，AGENT_ID 和 SECRET 在自建应用详情页，TOKEN 和 AES_KEY 在"接收消息"配置里。只发消息的话前 3 个就够了，要接收消息才需要后 2 个。最简单的"发消息到群"用群机器人 Webhook，不用任何这些参数。**