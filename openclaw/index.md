## 1. OpenClaw是什么

OpenClaw是一个自托管AI Gateway。可以把他理解成：各种聊天入口，控制面板，CLI，移动端节点，统一节点，统一接到一个本地或远程运行的网关上，再由网关把消息转给AI Agent。官方文档描述的典型人物结构是: 聊天应用/插件 -> Gateway -> Agent，同时还可接CLI, Web Control UI, macOS App，移动端节点。

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
