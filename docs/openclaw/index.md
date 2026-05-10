---
lang: zh-CN
title: OpenClaw 部署与实战
description: 记录 OpenClaw Gateway、Docker 部署、Browser Relay 和招聘自动化工作流。
date: 2026-05-08
tags:
  - OpenClaw
  - Agent
  - Browser Relay
---

# OpenClaw 部署与实战

## 1. OpenClaw是什么

OpenClaw是一个自托管AI Gateway。可以把他理解成：各种聊天入口，控制面板，CLI，移动端节点，统一节点，统一接到一个本地或远程运行的网关上，再由网关把消息转给AI Agent。官方文档描述的典型人物结构是: 聊天应用/插件 -> Gateway -> Agent，同时还可接CLI, Web Control UI, macOS App，移动端节点。

相关配置文章：

- [OpenClaw Docker 部署下如何配置 Chrome Browser Relay](./browser-relay-docker.md)
- [OpenClaw 实战：在 BOSS 直聘里做低频打招呼、信息采集和 Excel 落表](./boss-recruiting-practice.md)

## 2. 先建立正确认知：OpenClaw的几个核心概念

### 2.1 Gateway

Gateway是核心进程，是会话，路由，认证，频道连接的“单一真相源”。本地部署OpenClaw，本质上就是先把这个Gateway跑起来。

### 2.2 Control UI / Dashboard

这是浏览器里的控制台界面。官方Getting Started明确建议在网关起来后，用`openclaw dashboard`打开控制台。也就是说，更推荐用命令打开Dashboard，而不是手动猜某个URL根路径。

### 2.3 Onboarding

Onboarding是首次引导流程，用来配置：

- 模型提供商
- API Key
- Gateway
- 认证
- 可选频道/通信入口

### 2.4 Skills

Skills是OpenClaw非常关键的一层。它像**Agent Skills兼容目录** 来告诉Agent：什么时候该用某个能力，怎么用，依赖什么工具。每个skill本质上是一个目录，里面至少用`SKILL.md`。

## 3. 如何判断是否安装成功

### 3.1 看Gateway状态

```bash
openclaw gateway status
```

`gateway status`会显示Gateway服务状态，并可带RPC探测；通常，Gateway默认监听在**18789端口**。

### 3.2 看健康状态

```bash
openclaw health
```

这个命令会去问正在运行的Gateway要一份健康快照；`--verbose`会强制做实时探测，并展示更详细的连接和各通道状态。

### 3.3 打开控制台

```bash
openclaw dashboard
```

如果dashboard能正常打开，通常说明基础链路是通的。

## 如何部署到OpenClaw到Docker上

**step 1: 创建工作目录**

```bash
mkdir -p ~/openclaw-docker
cd ~/openclaw-docker
```

**step 2: 创建`.env`环境文件**

```bash
# 镜像配置
OPENCLAW_IMAGE=jiulingyun803/openclaw-cn:latest

# 数据目录（相对于 docker-compose.yml 所在目录）
OPENCLAW_CONFIG_DIR=./data/.openclaw
OPENCLAW_WORKSPACE_DIR=./data/clawd

# 网关配置
OPENCLAW_GATEWAY_PORT=18789
OPENCLAW_BRIDGE_PORT=18790
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_TOKEN=your-secure-token-here

# Claude 集成（可选，仅使用 Claude 作为后端时填写）
CLAUDE_AI_SESSION_KEY=
CLAUDE_WEB_SESSION_KEY=
CLAUDE_WEB_COOKIE=
```

- **镜像配置**`OPENCLAW_IMAGE`指定了要拉取的Docker镜像，来源是Docker Hub上的`jiulingyun803/openclaw-cn`
- **数据目录**`OPENCLAW_CONFIG_DIR`和`OPENCLAW_WORKSPACE_DIR`分别指定了配置文件和工作空间的本地挂载路径，都在`./data/`下，这样容器重启后数据不会丢失。

1. **数据持久化** -- 容器删除或重建后，配置和工作数据依然保留在宿主机的`./data/`目录下。
2. **作用域隔离** -- `WORKSPACE_DIR` 指定的是 OpenClaw 能操作的工作空间路径。从这个角度看，它确实间接"限定"了 OpenClaw 能读写文件的范围。OpenClaw 只能访问你挂载给它的目录，而不是宿主机上的任意文件，这其实是一种安全设计。

- **网关配置**这部分控制网路访问：`GATEWAY_PORT`（18789）是网关端口，`BRIDGE_PORT`(18790)是桥接端口，`GATEWAY_BIND=lan`表示绑定到局域网地址（而非仅localhost），`GATEWAY_TOKEN`是访问网关的认证令牌，部署时应该替换成一个安全的随机字符串。

注：桥接端口通常用于不同网络或服务之间的中转通信。在这个场景下，网关端口（18789）是对外提供服务的入口，而桥接端口（18790）很可能是容器内部组件之间、或者 OpenClaw 与后端 AI 服务之间的内部通信通道。

**Step 3: 创建`docker-compose.yml`文件**
将以下内容复制到`docker-compose.yml`

```yaml
services:
  openclaw-cn-gateway:
    image: ${OPENCLAW_IMAGE:-openclaw-cn:local}
    user: node:node
    environment:
      HOME: /home/node
      TERM: xterm-256color
      OPENCLAW_GATEWAY_TOKEN: ${OPENCLAW_GATEWAY_TOKEN}
      CLAUDE_AI_SESSION_KEY: ${CLAUDE_AI_SESSION_KEY}
      CLAUDE_WEB_SESSION_KEY: ${CLAUDE_WEB_SESSION_KEY}
      CLAUDE_WEB_COOKIE: ${CLAUDE_WEB_COOKIE}
    volumes:
      - ${OPENCLAW_CONFIG_DIR:-./data/.openclaw}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR:-./data/clawd}:/home/node/clawd
    ports:
      - "${OPENCLAW_GATEWAY_PORT:-18789}:18789"
      - "${OPENCLAW_BRIDGE_PORT:-18790}:18790"
    init: true
    restart: unless-stopped
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "${OPENCLAW_GATEWAY_BIND:-lan}",
        "--port",
        "${OPENCLAW_GATEWAY_PORT:-18789}",
      ]

  openclaw-cn-cli:
    image: ${OPENCLAW_IMAGE:-openclaw-cn:local}
    user: node:node
    environment:
      HOME: /home/node
      TERM: xterm-256color
      BROWSER: echo
      CLAUDE_AI_SESSION_KEY: ${CLAUDE_AI_SESSION_KEY}
      CLAUDE_WEB_SESSION_KEY: ${CLAUDE_WEB_SESSION_KEY}
      CLAUDE_WEB_COOKIE: ${CLAUDE_WEB_COOKIE}
    volumes:
      - ${OPENCLAW_CONFIG_DIR:-./data/.openclaw}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR:-./data/clawd}:/home/node/clawd
    stdin_open: true
    tty: true
    init: true
    entrypoint: ["node", "dist/index.js"]
```

- `openclaw-cn-gateway`（网关服务）
  这是常驻运行的后台服务。它做的事情包括：用 node 用户运行（而非 root，更安全），通过 environment 把 .env 文件里的 token 和 Claude 凭证传进容器，通过 volumes 把宿主机的配置目录和工作空间挂载进去，通过 ports 把 18789 和 18790 端口映射出来，restart: unless-stopped 表示除非手动停止否则自动重启，最后 command 指定启动命令——用 Node.js 运行网关程序并绑定到局域网。

- `openclaw-cn-cli`（命令行工具）
  这是一个交互式的 CLI 客户端。stdin_open: true 和 tty: true 让它能接收键盘输入（类似你打开了一个终端），BROWSER: echo 禁止自动打开浏览器，entrypoint 指定了入口程序。这个容器不常驻运行，而是你需要交互操作时才用。
  两个容器共享同样的数据目录和 Claude 凭证，区别就是一个是后台服务，一个是前台交互工具。可以理解为：gateway 是"服务器"，cli 是"客户端"。

Step 4: 启动容器

```bash
# 拉取最新镜像
docker compose pull

# 启动网关（后台运行）
docker compose up -d openclaw-cn-gateway

# 查看日志（可选）
docker compose logs -f openclaw-cn-gateway
```

Step 5: 运行配置向导

```bash
docker compose run --rm openclaw-cn-cli onboard
```

## OpenClaw Docker部署排查问题总结

### 部署背景

使用 Docker Compose 部署 OpenClaw（`jiulingyun803/openclaw-cn:latest`），包含两个服务：

- `openclaw-cn-gateway`：常驻后台网关服务（端口 18789、18790）
- `openclaw-cn-cli`：交互式命令行工具

### 遇到的问题及解决方案

#### 问题1: Gateway Token Missing（令牌缺失）

**错误信息**

```bash
disconnected (1008): unauthorized: gateway token missing
```

**原因**`.env`文件里的`OPENCLAW_GATEWAY_TOKEN`还是占位符`your-secure-token-here`，没有设置实际的token。

解决方案生成一个安全随机的token：

```bash
openssl rand -hex 32
```

填入x`.env`：

```bash
OPENCLAW_GATEWAY_TOKEN=你生成的token
```

重启服务：

```bash
docker compose down && docker compose up -d
```

#### 问题2: docker-compose.yml 格式错误

错误现象混用了两种environment赋值语法:

```yaml
OPENCLAW_GATEWAY_TOKEN=xxx        # 等号格式
CLAUDE_AI_SESSION_KEY: ${...}     # 冒号格式
```

**原因**Docker Compose 的 environment 块中，等号格式和冒号格式不能混用。

**解决方案**统一使用冒号格式（保持 YAML 风格）：

```yaml
environment:
  OPENCLAW_GATEWAY_TOKEN: xxx
  CLAUDE_AI_SESSION_KEY: ${CLAUDE_AI_SESSION_KEY}
```

#### 问题3: Token Mismatch（令牌不匹配）

**错误信息**

```bash
disconnected (1008): unauthorized: gateway token mismatch
```

**原因**OpenClaw 在首次运行时会自动生成自己的 token 并保存到状态目录，与 `.env` 中手动配置的 token 不一致。
**解决方案**通过 dashboard 命令获取实际生效的 token：

```bash
docker compose exec openclaw-cn-gateway node dist/index.js dashboard --no-open
```

输出会显示实际的token：

```bash
Dashboard URL: http://127.0.0.1:18789/?token=实际的token
```

把这个token填回`.env`，然后重启服务保持一致。

#### 问题4:Pairing Required（需要配对）

**错误信息**

```bash
disconnected (1008): pairing required
```

**原因**OpenClaw 出于安全考虑，新设备（浏览器）连接网关时需要管理员手动批准配对，并不是 Claude 凭证的问题。

**解决方案**
**步骤一：查看待匹配设备**

```bash
docker compose exec openclaw-cn-gateway node dist/index.js devices list
```

输出中会有`Pending`列表，记下Request ID。

**步骤二：批准配对**

```bash
docker compose exec openclaw-cn-gateway node dist/index.js devices approve <Request-ID>
```

**步骤三：刷新浏览器页面**

## 关键命令速查

| 命令                                                                              | 用途                    |
| --------------------------------------------------------------------------------- | ----------------------- |
| `docker compose up -d`                                                            | 启动所有服务            |
| `docker compose down`                                                             | 停止并删除容器          |
| `docker compose logs openclaw-cn-gateway --tail=50`                               | 查看网关日志            |
| `docker compose exec openclaw-cn-gateway env \| grep TOKEN`                       | 检查容器内环境变量      |
| `docker compose exec openclaw-cn-gateway node dist/index.js dashboard --no-open`  | 获取带 token 的访问 URL |
| `docker compose exec openclaw-cn-gateway node dist/index.js devices list`         | 查看设备配对状态        |
| `docker compose exec openclaw-cn-gateway node dist/index.js devices approve <id>` | 批准设备配对            |

## 完整部署流程总结

1. 准备 `.env` 文件，配置基础变量（数据目录、端口等）
2. 用 `openssl rand -hex 32` 生成 token，填入 `OPENCLAW_GATEWAY_TOKEN`
3. 启动服务：`docker compose up -d`
4. 用 dashboard 命令获取实际 token，确保与 `.env` 一致（如不一致则更新并重启）
5. 在浏览器打开带 token 的 dashboard URL
6. 处理 pairing required：在网关容器内执行 `devices approve` 批准浏览器配对
7. 刷新页面，连接成功

## 卸载清理

```bash
# 停止并删除容器
docker compose down

# 删除镜像
docker rmi jiulingyun803/openclaw-cn:latest

# 删除数据目录
rm -rf ./data

# 清理 Docker 缓存（可选）
docker system prune -a
```

## 经验总结

- **OpenClaw 的 token 管理是状态化的**：首次运行后 token 存储在状态目录里，环境变量配置不一定生效，要以容器实际生成的为准。
- **pairing required 是设备级安全机制**：不是凭证问题，需要管理员手动批准每个新接入的设备。
- **CLI 与 Gateway 跨容器通信问题**：在 Docker 部署中，建议直接用 `docker compose exec` 在 Gateway 容器内执行命令，避免网络配置麻烦。
- **错误信息要细看**：`token missing`、`token mismatch`、`pairing required` 是三个不同阶段的问题，对应不同的解决方案。

## 如何给 OpenClaw 增加 Skill

OpenClaw 的 Skill 可以理解成给 Agent 的“能力说明书”。它不是直接写一个浏览器脚本，也不是绕过页面限制，而是告诉 Agent：

- 什么场景下应该启用这个能力
- 启用后先读哪些参考资料
- 具体执行步骤和停止条件是什么
- 哪些行为不能做
- 最后应该用什么格式汇报结果

在 Docker 部署里，配置目录被挂载到了容器内的 `/home/node/.openclaw`：

```yaml
volumes:
  - ${OPENCLAW_CONFIG_DIR:-./data/.openclaw}:/home/node/.openclaw
  - ${OPENCLAW_WORKSPACE_DIR:-./data/clawd}:/home/node/clawd
```

所以宿主机上的目录：

```bash
/Users/youweichen/projects/openclaw-docker/data/.openclaw
```

会对应到容器内：

```bash
/home/node/.openclaw
```

### 1. Skill-only 插件的目录结构

这次我做的是一个 `boss-recruiting` skill-only 插件。最终目录结构如下：

```text
data/.openclaw/extensions/boss-recruiting/
├── index.ts
├── openclaw.plugin.json
├── package.json
└── skills/
    └── boss-recruiting/
        ├── SKILL.md
        ├── agents/
        │   └── openai.yaml
        └── references/
            ├── boss-recruiting-playbook.md
            └── job-profile-template.md
```

几个关键点：

- `openclaw.plugin.json` 是 OpenClaw 识别插件的 manifest。
- `package.json` 里的 `openclaw.extensions` 告诉 OpenClaw 插件入口文件在哪里。
- `index.ts` 是最小插件入口；skill-only 插件可以不注册工具，只暴露 skill。
- `skills/boss-recruiting/SKILL.md` 是真正给 Agent 看的技能说明。
- `references/` 放更详细的参考资料，避免 `SKILL.md` 过长。

### 2. 创建插件目录

在宿主机的 OpenClaw Docker 项目目录中执行：

```bash
cd /Users/youweichen/projects/openclaw-docker
mkdir -p data/.openclaw/extensions/boss-recruiting/skills
```

如果使用 Codex 的 `skill-creator` 初始化，可以先生成标准 Skill 骨架：

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  boss-recruiting \
  --path /Users/youweichen/projects/openclaw-docker/data/.openclaw/extensions/boss-recruiting/skills \
  --resources references \
  --interface display_name='BOSS Recruiting' \
  --interface short_description='Low-frequency BOSS recruiting workflows' \
  --interface default_prompt='Use $boss-recruiting to screen candidates and draft compliant BOSS recruiting outreach.'
```

这个命令会生成：

```text
skills/boss-recruiting/SKILL.md
skills/boss-recruiting/agents/openai.yaml
skills/boss-recruiting/references/
```

### 3. 写 openclaw.plugin.json

插件 manifest 最小内容如下：

```json
{
  "id": "boss-recruiting",
  "name": "BOSS Recruiting",
  "description": "Low-frequency employer-side BOSS直聘 candidate screening, outreach, and reply skill.",
  "skills": ["./skills"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

说明：

- `id` 要和配置里的插件 ID 对上。
- `skills: ["./skills"]` 表示这个插件提供 skill 目录。
- `configSchema` 必须存在，即使没有配置项也要写空 schema。

可以用下面命令检查 JSON 是否合法：

```bash
python3 -m json.tool data/.openclaw/extensions/boss-recruiting/openclaw.plugin.json
```

### 4. 写 package.json

OpenClaw 的插件发现逻辑会读取 `package.json` 里的 `openclaw.extensions`。如果缺少 `package.json`，直接 `plugins install` 会报：

```text
extracted package missing package.json
```

最小 `package.json`：

```json
{
  "name": "@local/boss-recruiting",
  "version": "0.1.0",
  "description": "Skill-only OpenClaw extension for low-frequency BOSS recruiting workflows.",
  "type": "module",
  "openclaw": {
    "extensions": [
      "./index.ts"
    ]
  }
}
```

### 5. 写最小 index.ts

Skill-only 插件不需要注册额外工具，保留一个空注册函数即可：

```ts
export default function register(_api: unknown) {
  // Skill-only plugin. The manifest exposes ./skills to OpenClaw.
}
```

OpenClaw 会通过插件 manifest 里的 `skills` 字段读取 `./skills` 目录。

### 6. 写 SKILL.md

`SKILL.md` 必须有 frontmatter，至少包含：

```markdown
---
name: boss-recruiting
description: "BOSS直聘招聘方工作流。Use when OpenClaw needs to help a recruiter on BOSS直聘 screen candidates, draft or send low-frequency personalized first-contact messages, reply to candidate questions, summarize conversations, or maintain a job profile and compliant outreach playbook."
---
```

正文建议包含：

- Overview：这个 skill 做什么。
- Required References：哪些资料需要按需读取。
- Operating Rules：硬性边界。
- Workflow：执行步骤。
- Sending Gate：什么条件下允许自动发送。
- Stop Conditions：什么情况下必须停止。
- Output Format：每轮如何汇报。

这次 `boss-recruiting` 的核心策略是：

- 招聘方身份。
- BOSS 直聘候选人筛选、主动联系、回复。
- 低频自动发送，不做全自动海投。
- 默认每轮最多联系 5 人。
- 候选人拒绝、平台风控提示、薪资合同等敏感问题时停止或请求确认。
- 不绕过验证码、不调用隐藏 API、不规避平台限制。

### 7. 写 references

我把详细内容拆成了两个 reference：

```text
references/job-profile-template.md
references/boss-recruiting-playbook.md
```

`job-profile-template.md` 用来收集岗位信息：

- 公司/团队
- 岗位名称
- 地点和工作模式
- 薪资范围
- 必须条件
- 加分条件
- 硬性不匹配条件
- 面试流程
- 常见问题答案

`boss-recruiting-playbook.md` 用来定义实际招聘动作：

- 候选人评分规则
- 首次打招呼模板
- 薪资、地点、技术栈、面试流程等回复模板
- follow-up 规则
- batch summary 模板

这样做的好处是 `SKILL.md` 保持短，Agent 只在需要的时候加载详细参考资料。

### 8. 启用插件

如果插件已经放在：

```bash
data/.openclaw/extensions/boss-recruiting
```

也就是容器内：

```bash
/home/node/.openclaw/extensions/boss-recruiting
```

可以直接启用：

```bash
docker exec openclaw-docker-openclaw-cn-gateway-1 \
  node dist/index.js plugins enable boss-recruiting
```

这个命令会写入：

```json
"plugins": {
  "entries": {
    "boss-recruiting": {
      "enabled": true
    }
  }
}
```

如果直接对同一个 extensions 目录执行 `plugins install --link`，可能会报：

```text
插件已存在: /home/node/.openclaw/extensions/boss-recruiting (请先删除)
```

原因是插件已经在全局 extensions 目录下，被 OpenClaw 自动发现了，此时用 `plugins enable` 更合适。

### 9. 配置插件 allow list

OpenClaw 安全检查会提示：

```text
Extensions exist but plugins.allow is not set
```

含义是：`extensions` 目录下存在插件，但没有明确白名单。建议在 `openclaw.json` 里加：

```json
"plugins": {
  "allow": [
    "openclaw-weixin",
    "boss-recruiting",
    "memory-core"
  ],
  "entries": {
    "openclaw-weixin": {
      "enabled": true
    },
    "boss-recruiting": {
      "enabled": true
    }
  }
}
```

这样可以避免以后某个被发现的本地插件意外加载。

### 10. 重启 Gateway

OpenClaw CLI 启用插件后会提示：

```text
Restart the gateway to apply.
```

在 Docker Compose 部署中重启：

```bash
cd /Users/youweichen/projects/openclaw-docker
docker compose up -d --force-recreate openclaw-cn-gateway
```

### 11. 验证插件是否加载

查看已启用插件：

```bash
docker exec openclaw-docker-openclaw-cn-gateway-1 \
  node dist/index.js plugins list --enabled --json
```

期望看到：

```json
{
  "id": "boss-recruiting",
  "name": "BOSS Recruiting",
  "enabled": true,
  "status": "loaded"
}
```

验证 skill snapshot 是否注入：

```bash
docker exec openclaw-docker-openclaw-cn-gateway-1 node --input-type=module -e '
import { loadConfig } from "/app/dist/config/config.js";
import { buildWorkspaceSkillSnapshot } from "/app/dist/agents/skills.js";
const cfg = loadConfig();
const snap = buildWorkspaceSkillSnapshot("/home/node/.openclaw/workspace", { config: cfg });
console.log(JSON.stringify({
  skills: snap.skills.map(s => s.name),
  hasBoss: snap.skills.some(s => s.name === "boss-recruiting"),
  promptHasBoss: snap.prompt.includes("boss-recruiting")
}, null, 2));
'
```

期望输出：

```json
{
  "skills": [
    "boss-recruiting"
  ],
  "hasBoss": true,
  "promptHasBoss": true
}
```

检查 Gateway 健康状态：

```bash
docker exec openclaw-docker-openclaw-cn-gateway-1 node dist/index.js health
```

如果刚重启后马上检查，偶尔会出现：

```text
gateway closed (1006 abnormal closure)
```

通常是 Gateway 还没完全就绪，等几秒再重试即可。

### 12. 如何使用这个招聘 Skill

在 OpenClaw 里可以这样触发：

```text
使用 $boss-recruiting，帮我根据下面岗位配置在 BOSS 直聘上筛选并低频联系候选人：

岗位：Java 后端开发
地点：上海
薪资：25k-35k
必须条件：3 年以上 Java / Spring Boot / MySQL 经验
加分项：有高并发或电商经验
硬性排除：不接受上海办公
面试流程：一面技术，二面主管，HR 沟通
每轮最多联系 5 人
```

也可以让它只写草稿：

```text
使用 $boss-recruiting，根据这个候选人资料帮我写一条 BOSS 直聘首次打招呼消息，先不要发送。
```

回复候选人时：

```text
使用 $boss-recruiting，这个候选人问“薪资可以到多少”，根据岗位配置帮我回复。
```

### 13. 安全和合规边界

招聘自动化很容易踩两个坑：平台风控和误发承诺。所以这个 skill 里必须明确边界：

- 不做全自动海投。
- 不绕过验证码、风控、登录、限流。
- 不调用隐藏接口。
- 不保存候选人隐私到长期记忆。
- 不根据年龄、性别、婚育、民族、宗教等非岗位因素筛选。
- 不承诺未确认的薪资、offer、职级、远程政策。
- 候选人拒绝或不感兴趣后立即停止。
- 平台出现风险提示时停止操作并汇报。

核心原则：让 Agent 做筛选和沟通辅助，而不是让它变成违规群发器。

### 14. 本次踩到的点

1. 只有 `openclaw.plugin.json` 不够，插件安装器还需要 `package.json`。
2. 插件已经在 `/home/node/.openclaw/extensions` 下时，不需要 `install --link`，直接 `plugins enable <id>` 更合适。
3. `plugins enable` 后要重启 Gateway。
4. `plugins list --enabled --json` 能确认插件是否 loaded。
5. `buildWorkspaceSkillSnapshot` 能确认 skill 是否真的进入 Agent prompt。
6. `plugins.allow` 建议显式配置，减少本地扩展自动加载风险。
7. `quick_validate.py` 依赖 `PyYAML`，本机没装时可以先用 Ruby 或手动检查 YAML frontmatter。
