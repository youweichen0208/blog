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
