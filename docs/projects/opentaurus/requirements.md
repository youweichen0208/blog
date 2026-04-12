# 需求设计（OpenTaurus）

---

## 1. 项目背景

### 1.1 行业现状

当前主流云厂商均提供了成熟的数据库管理 CLI 工具：AWS 的 `aws rds` 命令集支持完整的 RDS 实例生命周期管理，阿里云的 `aliyun rds` 同样覆盖了从创建到删除的全流程操作。这些工具已成为企业客户日常运维的标配。

华为云在 RDS 产品能力上已经具备竞争力，但在命令行工具层面与 AWS 和阿里云存在差距。客户在自动化运维、脚本化管理场景下缺乏高效工具，往往需要通过控制台手动操作，效率低下。

### 1.2 项目目标

开发一套对标 AWS CLI 和阿里云 CLI 的华为云 RDS 命令行工具，并创新性地叠加 AI Agent 智能交互层，实现：

- 客户通过命令行完成 RDS 实例全生命周期管理（创建、查询、删除、重启、备份）
- 客户通过自然语言对话完成复杂操作，降低使用门槛
- 单二进制分发，客户下载即用，零依赖

### 1.3 目标用户

- **企业 DevOps / SRE 团队：** 需要脚本化、自动化管理数据库
- **开发者：** 在开发/测试环境快速创建和销毁数据库实例
- **DBA：** 日常实例管理、备份、监控
- **新手用户：** 通过 Agent 自然语言交互降低学习曲线

---

## 2. 需求分析

### 2.1 竞品对标分析

| 功能维度          | AWS CLI             | 阿里云 CLI | OpenTaurus（本项目） |
| ----------------- | ------------------- | ---------- | -------------------- |
| 实例 CRUD         | ✓                   | ✓          | ✓                    |
| 备份管理          | ✓                   | ✓          | ✓                    |
| 规格查询          | ✓                   | ✓          | ✓                    |
| 等待机制 (Waiter) | ✓                   | ✗          | ✓                    |
| 交互式创建        | ✗                   | ✓          | ✓                    |
| 多格式输出        | ✓ (table/json/yaml) | ✓ (json)   | ✓ (table/json/yaml)  |
| AI Agent 智能交互 | ✗                   | ✗          | **✓ 创新**           |
| 自然语言参数补全  | ✗                   | ✗          | **✓ 创新**           |

> **竞争优势：** OpenTaurus 在对标 AWS 和阿里云全部基础功能的同时，创新性地加入 AI Agent 智能交互层，这是竞品均未提供的差异化能力。

### 2.2 核心功能需求

#### Phase 1：CLI 基础能力（第 1-6 周）

| 命令                          | 说明                        | 优先级 | 周次     |
| ----------------------------- | --------------------------- | ------ | -------- |
| openTaurus configure          | 配置 AK/SK/Region/ProjectID | P0     | 第 1 周  |
| openTaurus flavor list        | 查询可用数据库规格          | P0     | 第 2 周  |
| openTaurus instance create    | 创建 RDS 实例 + 等待就绪    | P0     | 第 3 周  |
| openTaurus instance list      | 列出所有实例                | P0     | 第 4 周  |
| openTaurus instance show      | 查看实例详情 + 连接信息     | P0     | 第 4 周  |
| openTaurus instance delete    | 删除实例（二次确认）        | P0     | 第 5 周  |
| openTaurus instance restart   | 重启实例                    | P1     | 第 5 周  |
| openTaurus backup create/list | 备份管理                    | P1     | 第 11 周 |

#### Phase 2：Agent 智能交互层（第 7-12 周）

| 模块                 | 说明                                    | 优先级 | 周次     |
| -------------------- | --------------------------------------- | ------ | -------- |
| LLM HTTP 客户端      | net/http 调用 LLM API，不依赖第三方 SDK | P0     | 第 7 周  |
| 响应解析器           | JSON 解析，提取 tool_use / end_turn     | P0     | 第 7 周  |
| Tool 注册表          | Service 函数映射为 LLM Tool             | P0     | 第 8 周  |
| Tool-calling 主循环  | 调 LLM → 执行 Tool → 喂回结果 → 循环    | P0     | 第 8 周  |
| 安全确认机制         | 三级安全模型：直接执行/确认/强确认      | P0     | 第 9 周  |
| 系统提示词           | 角色定义 + 行为约束 + 参数补全引导      | P0     | 第 9 周  |
| openTaurus chat 命令 | 单次模式 + 交互式多轮对话               | P0     | 第 10 周 |

### 2.3 非功能需求

- **分发：** 单二进制分发，支持 Linux / macOS / Windows 三平台，客户下载即用
- **性能：** CLI 启动时间 < 100ms，API 调用超时 30s，Agent 单轮超时 60s
- **安全：** AK/SK 本地存储权限 0600，支持环境变量覆盖，删除操作必须二次确认
- **可用性：** API 调用自动重试（最多 3 次，指数退避），错误码翻译为人类可读提示
- **测试：** Service 层覆盖率 > 70%，CI 自动运行全量测试

---

## 3. 技术选型：为什么选择 Go

### 3.1 CLI 场景的天然优势

Go 是 CLI 工具开发的行业标准选择。以下知名 CLI 工具均基于 Go 构建：

| 工具      | 开发者        | 用途                |
| --------- | ------------- | ------------------- |
| kubectl   | Google / CNCF | Kubernetes 集群管理 |
| docker    | Docker Inc.   | 容器管理            |
| gh        | GitHub        | GitHub CLI          |
| terraform | HashiCorp     | 基础设施即代码      |
| hugo      | Hugo Authors  | 静态网站生成        |

### 3.2 与其他语言的对比

| 维度       | Go                      | TypeScript         | Python               |
| ---------- | ----------------------- | ------------------ | -------------------- |
| 二进制体积 | **10-15 MB**            | 50-70 MB (pkg)     | 80+ MB (PyInstaller) |
| 启动速度   | **~10ms**               | ~200ms             | ~500ms               |
| 打包复杂度 | **go build 一条命令**   | 需要 esbuild + pkg | 需要 PyInstaller     |
| 交叉编译   | **极简（GOOS/GOARCH）** | 需分平台打包       | 需分平台打包         |
| 运行时依赖 | **无**                  | 内嵌 Node.js       | 内嵌 Python          |
| CLI 生态   | **Cobra（业界标准）**   | oclif（成熟）      | Click（成熟）        |
| 并发能力   | **goroutine 原生支持**  | 单线程 async       | GIL 限制             |

### 3.3 Go 做自定义 Agent 的可行性

本项目采用自定义 Agent 方案，不依赖任何第三方 Agent 框架。Agent 的核心本质是一个 HTTP 调用 + JSON 解析的循环，Go 的标准库完全能胜任：

- **net/http：** 调用 LLM API，构造请求 / 解析响应
- **encoding/json：** 解析 tool_use 参数、构造 tool_result
- **fmt + os：** 确认机制的用户交互

> **为什么不用 LLM SDK？** 本项目选择自定义实现 Agent，不使用 Anthropic SDK 或 OpenAI SDK。原因是：Agent 的核心就是 HTTP POST + JSON 解析 + 循环，Go 标准库完全覆盖；自定义实现可以同时支持 Anthropic、OpenAI 等多个 LLM 提供商，通过配置切换；减少第三方依赖，保持二进制体积最小。

### 3.4 Go 的分发优势

Go 的交叉编译能力是选择它的决定性因素之一。一条 `go build` 命令即可生成目标平台的二进制文件，客户下载后直接运行，无需安装任何运行时环境：

| 平台                  | 编译命令                           | 产物体积 |
| --------------------- | ---------------------------------- | -------- |
| Linux (amd64)         | GOOS=linux GOARCH=amd64 go build   | ~12 MB   |
| Linux (arm64)         | GOOS=linux GOARCH=arm64 go build   | ~12 MB   |
| macOS (Intel)         | GOOS=darwin GOARCH=amd64 go build  | ~13 MB   |
| macOS (Apple Silicon) | GOOS=darwin GOARCH=arm64 go build  | ~13 MB   |
| Windows               | GOOS=windows GOARCH=amd64 go build | ~13 MB   |

---

## 4. 架构设计

### 4.1 分层架构

项目采用三层架构，CLI 和 Agent 共用 Service 层，避免业务逻辑重复：

| 层次       | 职责                  | 技术实现                  |
| ---------- | --------------------- | ------------------------- |
| 用户交互层 | CLI 命令 + Agent Chat | Cobra 命令 / Agent 主循环 |
| Service 层 | 核心业务逻辑（共用）  | Go struct + interface     |
| SDK 层     | 华为云 API 封装       | net/http + AK/SK 签名     |

# OpenTaurus 架构设计全景图

---

## 一、总体架构（简化版）

```mermaid
graph TB
    CLI["CLI 命令<br/>openTaurus instance create/list/delete"]
    CHAT["Agent 对话<br/>openTaurus chat '创建MySQL实例'"]
    CMD["命令层 cmd/"]
    AGENT["Agent 主循环<br/>LLM 交互 + Tool 调用"]
    SERVICE["Service 层<br/>实例/规格/备份管理"]
    SDK["SDK 层<br/>HTTP + AK/SK 签名"]
    CONFIG["配置管理<br/>~/.openTaurus/config.yaml"]
    UI["UI 输出<br/>table/json/yaml"]
    CLOUD["华为云 RDS API"]
    LLM["LLM API<br/>Anthropic/OpenAI"]

    CLI --> CMD
    CHAT --> CMD
    CMD --> SERVICE
    CMD --> AGENT
    AGENT <--> LLM
    AGENT --> SERVICE
    SERVICE --> SDK
    SERVICE --> UI
    SDK --> CONFIG
    SDK --> CLOUD

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef cloudStyle fill:#F0F0F0,stroke:#666,stroke-width:2px,color:#000

    class CLI,CHAT,CMD,AGENT,SERVICE,SDK,CONFIG,UI nodeStyle
    class CLOUD,LLM cloudStyle
```

### 架构说明

**核心设计原则：两条路径，一个核心**

1. **CLI 路径**：`CLI 命令 → cmd/ → Service 层 → SDK → 华为云`
2. **Agent 路径**：`Agent 对话 → cmd/chat → Agent 主循环 ↔ LLM → Service 层 → SDK → 华为云`
3. **共享核心**：CLI 和 Agent 都调用同一个 Service 层，避免业务逻辑重复

**分层职责**

| 层次       | 职责                                  | 关键模块                         |
| ---------- | ------------------------------------- | -------------------------------- |
| 命令层     | 解析用户输入，路由到 Service 或 Agent | cmd/                             |
| Agent 层   | LLM 交互、Tool 调用、安全确认         | agent/agent.go, llm.go, tools.go |
| Service 层 | 核心业务逻辑（CLI 和 Agent 共用）     | service/instance.go, flavor.go   |
| SDK 层     | 华为云 API 封装、签名、错误处理       | sdk/client.go, signer.go         |
| 基础设施   | 配置、UI 输出                         | config/, ui/                     |

---

## 二、CLI 开发流程（第 1-6 周）

```mermaid
graph LR
    W1["W1: 配置+SDK基座<br/>AK/SK + HTTP签名"]
    W2["W2: 规格查询+输出<br/>flavor list + formatter"]
    W3["W3: 创建实例+等待<br/>create + waiter"]
    W4["W4: 列表+详情<br/>list + show"]
    W5["W5: 删除+重启<br/>delete + restart"]
    W6["W6: 错误处理+测试<br/>error + CI"]

    W1 --> W2 --> W3 --> W4 --> W5 --> W6

    classDef weekStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    class W1,W2,W3,W4,W5,W6 weekStyle
```

**关键里程碑**

- W1-2: 链路打通（configure + SDK 签名 + flavor list）
- W3-4: 核心功能（create / list / show）
- W5-6: 完善体验（delete / restart + 错误处理 + 测试）

---

## 三、Agent 主控循环

```mermaid
graph TD
    START["用户输入"]
    CALL["调用 LLM API"]
    CHECK{"stop_reason?"}
    TOOL["提取 tool_use"]
    SAFE{"安全级别?"}
    CONFIRM["用户确认?"]
    EXEC["执行 Service"]
    FEED["结果喂回 LLM"]
    OUTPUT["输出回复"]
    DONE["结束"]

    START --> CALL
    CALL --> CHECK
    CHECK -->|tool_use| TOOL
    CHECK -->|end_turn| OUTPUT
    TOOL --> SAFE
    SAFE -->|只读| EXEC
    SAFE -->|写入/删除| CONFIRM
    CONFIRM -->|Yes| EXEC
    CONFIRM -->|No| FEED
    EXEC --> FEED
    FEED --> CALL
    OUTPUT --> DONE

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef decisionStyle fill:#F0E6FF,stroke:#4B0082,stroke-width:2px,color:#000

    class START,CALL,TOOL,EXEC,FEED,OUTPUT,DONE nodeStyle
    class CHECK,SAFE,CONFIRM decisionStyle
```

**三级安全模型**

- **直接执行**：list / show / flavor（只读操作）
- **Y/N 确认**：create / restart（写操作，展示参数摘要）
- **强确认**：delete（删除操作，需输入实例名）

---

## 四、Agent 开发流程（第 7-12 周）

```mermaid
graph LR
    W7["W7: LLM客户端+解析<br/>HTTP + JSON parser"]
    W8["W8: Tool注册+主循环<br/>Service映射 + loop"]
    W9["W9: 确认机制+提示词<br/>三级安全 + prompts"]
    W10["W10: chat命令+对话<br/>单次 + 交互模式"]
    W11["W11: 备份+交互式<br/>backup + interactive"]
    W12["W12: 测试+打包+文档<br/>CI + release"]

    W7 --> W8 --> W9 --> W10 --> W11 --> W12

    classDef weekStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    class W7,W8,W9,W10,W11,W12 weekStyle
```

**关键里程碑**

- W7-8: Agent 跑通（LLM 客户端 + Tool-calling 循环）
- W9-10: Agent 可用（安全确认 + chat 命令）
- W11-12: 产品发布（完整功能 + 测试 + 打包）

---

## 五、完整数据流示例

用户通过 Agent 创建 MySQL 实例的完整交互流程：

```
用户: "帮我创建一个 MySQL 8.0 实例，4核16G"
  │
  ▼
Agent 循环:
  1. 调用 LLM → 返回 tool_use: list_flavors
  2. 执行查询 → 找到匹配规格 rds.mysql.m6.large.8
  3. 结果喂回 LLM → 发现缺少 VPC/密码，询问用户
  4. 用户补充: "用 prod-vpc，名字 prod-mysql，密码 MyPass123!"
  5. LLM 返回 tool_use: create_instance
  6. 展示参数摘要 → 用户确认 (Y)
  7. 执行创建 → 等待就绪
  8. 返回实例 ID + 连接信息
```

<details>
<summary>点击展开查看详细时序图</summary>

```mermaid
sequenceDiagram
    actor User as 用户
    participant Agent as Agent
    participant LLM as LLM API
    participant Service as Service 层
    participant Cloud as 华为云 API

    User->>Agent: "创建MySQL实例 4核16G"

    Note over Agent,LLM: 第1轮
    Agent->>LLM: POST (messages + tools)
    LLM-->>Agent: tool_use: list_flavors
    Agent->>Service: FlavorService.List()
    Service->>Cloud: GET /flavors
    Cloud-->>Service: 规格列表
    Service-->>Agent: 找到匹配规格

    Note over Agent,LLM: 第2轮
    Agent->>LLM: POST (tool_result)
    LLM-->>Agent: end_turn: "还需要VPC和密码"
    Agent-->>User: 询问缺失参数

    User->>Agent: "用prod-vpc，密码MyPass123!"

    Note over Agent,LLM: 第3轮
    Agent->>LLM: POST (用户回复)
    LLM-->>Agent: tool_use: create_instance
    Agent-->>User: 展示参数，确认？(Y/n)
    User-->>Agent: Y
    Agent->>Service: InstanceService.Create()
    Service->>Cloud: POST /instances
    Cloud-->>Service: 实例创建中

    Note over Service: 轮询等待
    loop 每10s
        Service->>Cloud: GET /instances/{id}
        Cloud-->>Service: status: Running
    end

    Service-->>Agent: 实例已就绪

    Note over Agent,LLM: 第4轮
    Agent->>LLM: POST (tool_result)
    LLM-->>Agent: end_turn: 最终回复
    Agent-->>User: "实例已创建！连接: mysql -h 192.168.0.55"
```

</details>

---

## 六、模块详细展开（可选查看）

# OpenTaurus 架构设计全景图

---

```mermaid
graph TD
    %% ====== 用户入口 ======
    CLI["CLI 模式<br/>openTaurus instance create<br/>openTaurus instance list<br/>openTaurus flavor list"]
    CHAT["Agent 模式<br/>openTaurus chat '创建MySQL实例'<br/>openTaurus chat 'prod-mysql有慢查询吗'"]

    %% ====== 命令路由 ======
    CMD_CLI["cmd/ 命令路由<br/>instance / flavor / backup<br/>configure / completion"]
    CMD_CHAT["cmd/chat.go<br/>Agent 入口"]

    %% ====== Agent 层 ======
    AGENT_CORE["agent.go · 主控循环<br/>构造 messages → 调 LLM<br/>→ 解析响应 → 执行 Tool → 循环"]
    A_LLM["llm.go<br/>LLM 客户端<br/>net/http POST"]
    A_TOOLS["tools.go<br/>Tool 注册表<br/>Service → Tool"]
    A_SAFE["confirm.go<br/>安全确认<br/>三级模型"]
    A_PROMPT["prompts.go<br/>系统提示词"]

    %% ====== Service 层 ======
    SVC_INST["instance.go<br/>Create / List / Show<br/>Delete / Restart"]
    SVC_FLAVOR["flavor.go<br/>ListFlavors"]
    SVC_BACKUP["backup.go<br/>Create / List"]
    SVC_WAITER["waiter.go<br/>轮询等待就绪"]
    SVC_DIAG["diagnose.go<br/>慢查询 / 连接数<br/>锁分析 / 表空间"]

    %% ====== SDK 层 ======
    SDK_CLIENT["client.go<br/>HTTP 客户端<br/>超时 30s · 重试 3 次"]
    SDK_SIGN["signer.go<br/>AK/SK HMAC-SHA256"]
    SDK_ERR["errors.go<br/>错误码 → 人类可读"]
    SDK_DB["db.go<br/>database/sql<br/>直连 MySQL / PG"]

    %% ====== MCP 层 ======
    MCP_MONITOR["MCP: Cloud Eye<br/>CPU / 内存 / IOPS"]
    MCP_LOG["MCP: LTS 日志<br/>错误日志 / 审计日志"]
    MCP_DAS["MCP: DAS<br/>慢 SQL 报告"]
    MCP_VPC["MCP: VPC<br/>安全组 / 网络排查"]

    %% ====== 横向支撑 ======
    CFG["config/<br/>~/.openTaurus/config.yaml<br/>多 Profile · ENV 覆盖"]
    UI["ui/<br/>table / json / yaml<br/>color · spinner"]

    %% ====== 外部系统 ======
    LLM["LLM API<br/>Anthropic / OpenAI"]
    CLOUD["Huawei Cloud RDS API"]
    DB["🗄️ 客户数据库实例<br/>MySQL / PostgreSQL"]
    CLOUD_OTHER["华为云其他服务<br/>Cloud Eye / LTS / DAS / VPC"]

    %% ====== 连线：用户 → 命令 ======
    CLI --> CMD_CLI
    CHAT --> CMD_CHAT

    %% ====== 连线：命令 → 下层 ======
    CMD_CLI --> SVC_INST
    CMD_CLI --> SVC_FLAVOR
    CMD_CLI --> SVC_BACKUP
    CMD_CLI --> UI
    CMD_CLI --> CFG
    CMD_CHAT --> AGENT_CORE

    %% ====== 连线：Agent 内部 ======
    AGENT_CORE --> A_LLM
    AGENT_CORE --> A_TOOLS
    AGENT_CORE --> A_SAFE
    AGENT_CORE --> A_PROMPT
    A_LLM --> LLM

    %% ====== 连线：Agent → Service（内置 Tool）======
    A_TOOLS --> SVC_INST
    A_TOOLS --> SVC_FLAVOR
    A_TOOLS --> SVC_BACKUP
    A_TOOLS --> SVC_DIAG

    %% ====== 连线：Agent → MCP（外部数据源）======
    A_TOOLS --> MCP_MONITOR
    A_TOOLS --> MCP_LOG
    A_TOOLS --> MCP_DAS
    A_TOOLS --> MCP_VPC

    %% ====== 连线：Service → SDK ======
    SVC_INST --> SDK_CLIENT
    SVC_FLAVOR --> SDK_CLIENT
    SVC_BACKUP --> SDK_CLIENT
    SVC_WAITER --> SDK_CLIENT
    SVC_WAITER --> UI
    SVC_DIAG --> SDK_DB
    SVC_DIAG --> SDK_CLIENT

    %% ====== 连线：SDK → 外部 ======
    SDK_CLIENT --> SDK_SIGN
    SDK_CLIENT --> SDK_ERR
    SDK_SIGN --> CFG
    SDK_CLIENT --> CLOUD
    SDK_DB --> DB

    %% ====== 连线：MCP → 外部 ======
    MCP_MONITOR --> CLOUD_OTHER
    MCP_LOG --> CLOUD_OTHER
    MCP_DAS --> CLOUD_OTHER
    MCP_VPC --> CLOUD_OTHER

    %% ====== 样式 ======
    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef diagStyle fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#000
    classDef mcpStyle fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#000
    classDef externalStyle fill:#F0F0F0,stroke:#666,stroke-width:2px,color:#000

    class CLI,CHAT nodeStyle
    class CMD_CLI,CMD_CHAT nodeStyle
    class AGENT_CORE,A_LLM,A_TOOLS,A_SAFE,A_PROMPT nodeStyle
    class SVC_INST,SVC_FLAVOR,SVC_BACKUP,SVC_WAITER nodeStyle
    class SDK_CLIENT,SDK_SIGN,SDK_ERR nodeStyle
    class CFG,UI nodeStyle
    class SVC_DIAG,SDK_DB diagStyle
    class MCP_MONITOR,MCP_LOG,MCP_DAS,MCP_VPC mcpStyle
    class CLOUD,LLM,DB,CLOUD_OTHER externalStyle
```

---

## 二、CLI 数据流（Phase 1）

```mermaid
graph LR
    C1["用户输入命令"]
    C2["cmd/ 解析参数"]
    C3["service/ 业务逻辑"]
    C4["sdk/ 签名 + HTTP"]
    C5["☁️ 华为云 API"]

    C1 --> C2 --> C3 --> C4 --> C5

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef externalStyle fill:#F0F0F0,stroke:#666,stroke-width:2px,color:#000

    class C1,C2,C3,C4 nodeStyle
    class C5 externalStyle
```

---

## 三、Agent 数据流（Phase 2 — 实例管理）

```mermaid
graph LR
    A1["用户自然语言"]
    A2["agent/ 主循环"]
    A3["LLM 推理"]
    A4["tools.go 选 Tool"]
    A5["confirm.go 确认"]
    A6["service/ 执行"]
    A7["sdk/ API 调用"]
    A8["华为云 API"]

    A1 --> A2 --> A3 --> A4 --> A5 --> A6 --> A7 --> A8
    A6 -->|"结果喂回"| A2

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef decisionStyle fill:#F0E6FF,stroke:#4B0082,stroke-width:2px,color:#000
    classDef externalStyle fill:#F0F0F0,stroke:#666,stroke-width:2px,color:#000

    class A1,A2,A4,A6,A7 nodeStyle
    class A3,A5 decisionStyle
    class A8 externalStyle
```

---

## 四、智能诊断数据流（Phase 3 — 内置 Tool 直连）

```mermaid
graph LR
    D1["'prod-mysql 有慢查询吗'"]
    D2["agent/ 主循环"]
    D3["LLM 推理"]
    D4["tools.go<br/>选 diagnose_slow_query"]
    D5["service/diagnose.go"]
    D6["sdk/ 拿实例 IP"]
    D7["华为云 API"]
    D8["database/sql 直连"]
    D9["客户 MySQL"]
    D10["LLM 总结分析"]
    D11["返回诊断报告"]

    D1 --> D2 --> D3 --> D4 --> D5
    D5 --> D6 --> D7
    D7 -->|"IP:Port"| D5
    D5 --> D8 --> D9
    D9 -->|"慢查询数据"| D5
    D5 -->|"结果喂回"| D10 --> D11

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef diagStyle fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#000
    classDef decisionStyle fill:#F0E6FF,stroke:#4B0082,stroke-width:2px,color:#000
    classDef externalStyle fill:#F0F0F0,stroke:#666,stroke-width:2px,color:#000

    class D1,D2,D10,D11 nodeStyle
    class D3 decisionStyle
    class D4,D5,D8 diagStyle
    class D6 nodeStyle
    class D7,D9 externalStyle
```

---

## 五、智能诊断数据流（Phase 3 — MCP 外部数据源）

```mermaid
graph LR
    M1["'prod-mysql 为什么连不上'"]
    M2["agent/ 主循环"]
    M3["LLM 推理"]
    M4["tools.go 编排多个数据源"]
    M5_A["MCP: VPC<br/>查安全组规则"]
    M5_B["MCP: Cloud Eye<br/>查 CPU/连接数"]
    M5_C["MCP: LTS<br/>查错误日志"]
    M5_D["内置 Tool<br/>查实例状态"]
    M6["华为云各服务"]
    M7["LLM 综合分析"]
    M8["返回排查报告"]

    M1 --> M2 --> M3 --> M4
    M4 --> M5_A --> M6
    M4 --> M5_B --> M6
    M4 --> M5_C --> M6
    M4 --> M5_D --> M6
    M6 -->|"各项数据"| M7 --> M8

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef mcpStyle fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#000
    classDef diagStyle fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#000
    classDef decisionStyle fill:#F0E6FF,stroke:#4B0082,stroke-width:2px,color:#000
    classDef externalStyle fill:#F0F0F0,stroke:#666,stroke-width:2px,color:#000

    class M1,M2,M7,M8 nodeStyle
    class M3 decisionStyle
    class M5_A,M5_B,M5_C mcpStyle
    class M4,M5_D diagStyle
    class M6 externalStyle
```

---

## 六、Agent 主控循环（含诊断分支）

```mermaid
graph TD
    START(["开始"])
    BUILD["构造 messages<br/>system prompt + tools + 用户消息"]
    CALL["POST → LLM API"]
    PARSE["解析响应"]
    CHECK{"stop_reason?"}
    EXTRACT["提取 tool_use<br/>name + params"]
    CLASSIFY{"Tool 类型?"}
    MANAGE["实例管理 Tool<br/>create / list / show<br/>delete / restart / flavor"]
    DIAG_BUILTIN["内置诊断 Tool<br/>slow_query / processlist<br/>lock_analysis / tablespace"]
    DIAG_MCP["MCP 诊断 Tool<br/>monitor / log<br/>das_report / vpc_check"]
    SAFE{"需要确认?"}
    EXECUTE["执行 Tool"]
    CONFIRM_OP["展示操作 → 确认"]
    CANCEL["告知 LLM: 已取消"]
    FEED["构造 tool_result → 喂回"]
    MAX{"超过 10 轮?"}
    OUTPUT["输出最终回复"]
    TIMEOUT["提示: 请重新描述"]
    END(["结束"])

    START --> BUILD
    BUILD --> CALL
    CALL --> PARSE
    PARSE --> CHECK
    CHECK -->|"end_turn"| OUTPUT
    CHECK -->|"tool_use"| EXTRACT
    EXTRACT --> CLASSIFY
    CLASSIFY -->|"管理类"| MANAGE
    CLASSIFY -->|"内置诊断"| DIAG_BUILTIN
    CLASSIFY -->|"MCP 诊断"| DIAG_MCP
    MANAGE --> SAFE
    DIAG_BUILTIN --> EXECUTE
    DIAG_MCP --> EXECUTE
    SAFE -->|"只读操作"| EXECUTE
    SAFE -->|"写/删操作"| CONFIRM_OP
    CONFIRM_OP -->|"Yes"| EXECUTE
    CONFIRM_OP -->|"No"| CANCEL
    EXECUTE --> FEED
    CANCEL --> FEED
    FEED --> MAX
    MAX -->|"否"| CALL
    MAX -->|"是"| TIMEOUT
    TIMEOUT --> END
    OUTPUT --> END

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef decisionStyle fill:#F0E6FF,stroke:#4B0082,stroke-width:2px,color:#000
    classDef diagStyle fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#000
    classDef mcpStyle fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#000

    class START,BUILD,CALL,PARSE,EXTRACT,MANAGE,EXECUTE,CANCEL,FEED,OUTPUT,TIMEOUT,END nodeStyle
    class CHECK,CLASSIFY,SAFE,MAX decisionStyle
    class DIAG_BUILTIN diagStyle
    class DIAG_MCP mcpStyle
    class CONFIRM_OP nodeStyle
```

---

## 七、Tool 注册表全景

```mermaid
graph TD
    REGISTRY["tools.go · Tool 注册表"]

    REGISTRY --> G1
    REGISTRY --> G2
    REGISTRY --> G3

    G1["实例管理（Phase 1-2）"]
    G1_1["create_instance → service.Create"]
    G1_2["list_instances → service.List"]
    G1_3["show_instance → service.Show"]
    G1_4["delete_instance → service.Delete"]
    G1_5["restart_instance → service.Restart"]
    G1_6["list_flavors → service.Flavor"]
    G1_7["create_backup → service.Backup"]

    G2["内置诊断（Phase 3a）"]
    G2_1["diagnose_slow_query<br/>→ 直连 MySQL 查 slow_log"]
    G2_2["diagnose_processlist<br/>→ SHOW PROCESSLIST"]
    G2_3["diagnose_locks<br/>→ INNODB STATUS"]
    G2_4["diagnose_tablespace<br/>→ 表空间使用率"]

    G3["MCP 诊断（Phase 3b）"]
    G3_1["mcp_monitor<br/>→ Cloud Eye 监控指标"]
    G3_2["mcp_logs<br/>→ LTS 错误日志"]
    G3_3["mcp_slow_report<br/>→ DAS 慢 SQL 报告"]
    G3_4["mcp_network<br/>→ VPC 安全组排查"]

    G1 --> G1_1
    G1 --> G1_2
    G1 --> G1_3
    G1 --> G1_4
    G1 --> G1_5
    G1 --> G1_6
    G1 --> G1_7

    G2 --> G2_1
    G2 --> G2_2
    G2 --> G2_3
    G2 --> G2_4

    G3 --> G3_1
    G3 --> G3_2
    G3 --> G3_3
    G3 --> G3_4

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef diagStyle fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#000
    classDef mcpStyle fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#000

    class REGISTRY,G1,G1_1,G1_2,G1_3,G1_4,G1_5,G1_6,G1_7 nodeStyle
    class G2,G2_1,G2_2,G2_3,G2_4 diagStyle
    class G3,G3_1,G3_2,G3_3,G3_4 mcpStyle
```

---

## 八、模块依赖（W1-W6 CLI + W7-W12 Agent）

```mermaid
graph TD
    W1_CONF["W1: configure"]
    W1_SDK["W1: SDK Client"]
    W2_FLAVOR["W2: flavor list"]
    W2_FMT["W2: Formatter"]
    W3_CREATE["W3: instance create"]
    W3_WAITER["W3: Waiter"]
    W4_LIST["W4: instance list"]
    W4_SHOW["W4: instance show"]
    W5_DELETE["W5: instance delete"]
    W5_RESTART["W5: instance restart"]
    W6_ERROR["W6: 错误处理 + 测试"]
    W7_LLM["W7: LLM 客户端 + 解析器"]
    W8_LOOP["W8: Tool 注册 + 主循环"]
    W9_SAFE["W9: 确认机制 + 提示词"]
    W10_CHAT["W10: openTaurus chat"]
    W11_EXT["W11: 备份 + 交互式"]
    W12_SHIP["W12: 测试 + 打包 + 文档"]

    W1_CONF --> W1_SDK
    W1_SDK --> W2_FLAVOR
    W1_SDK --> W2_FMT
    W2_FLAVOR --> W3_CREATE
    W2_FMT --> W3_CREATE
    W3_CREATE --> W3_WAITER
    W1_SDK --> W4_LIST
    W1_SDK --> W4_SHOW
    W4_SHOW --> W5_DELETE
    W3_WAITER --> W5_RESTART
    W5_DELETE --> W6_ERROR
    W5_RESTART --> W6_ERROR
    W6_ERROR --> W7_LLM
    W7_LLM --> W8_LOOP
    W8_LOOP --> W9_SAFE
    W9_SAFE --> W10_CHAT
    W10_CHAT --> W11_EXT
    W11_EXT --> W12_SHIP

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    class W1_CONF,W1_SDK,W2_FLAVOR,W2_FMT,W3_CREATE,W3_WAITER,W4_LIST,W4_SHOW,W5_DELETE,W5_RESTART,W6_ERROR,W7_LLM,W8_LOOP,W9_SAFE,W10_CHAT,W11_EXT,W12_SHIP nodeStyle
```

---

## 九、演进路线

```mermaid
graph LR
    P1["Phase 1<br/>CLI 基础<br/>W1-W6"]
    P2["Phase 2<br/>Agent 层<br/>W7-W12"]
    P3A["Phase 3a<br/>内置诊断<br/>database/sql 直连"]
    P3B["Phase 3b<br/>MCP 扩展<br/>Cloud Eye / LTS / DAS / VPC"]

    P1 -->|"Service 层完成"| P2
    P2 -->|"加诊断 Tool"| P3A
    P3A -->|"需要多数据源"| P3B

    classDef nodeStyle fill:#E6E6FA,stroke:#4B0082,stroke-width:2px,color:#000
    classDef diagStyle fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#000
    classDef mcpStyle fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#000

    class P1,P2 nodeStyle
    class P3A diagStyle
    class P3B mcpStyle
```

| 阶段     | 交付物                                  | 架构模式               |
| -------- | --------------------------------------- | ---------------------- |
| Phase 1  | 8 个 CLI 命令 + Service + SDK           | 纯 CLI                 |
| Phase 2  | 自定义 Agent + Tool Calling + 安全确认  | 单体 Agent + 技能库    |
| Phase 3a | 内置诊断 Tool（直连 MySQL）             | Agent + 内置诊断       |
| Phase 3b | MCP 扩展（Cloud Eye / LTS / DAS / VPC） | Agent + 内置诊断 + MCP |

---

## 十、诊断场景示例

### 场景 A：慢查询分析（内置 Tool，直连数据库）

```
用户: prod-mysql 最近有慢查询吗

Agent 执行:
  1. tool_use: show_instance → 拿到 IP 192.168.0.12:3306
  2. tool_use: diagnose_slow_query → 直连 MySQL 查 slow_log
  3. LLM 拿到 15 条慢查询记录，总结分析

Agent 回复:
  过去 24 小时有 15 条慢查询，主要集中在 orders 表：
  - SELECT * FROM orders WHERE status='pending' (avg 3.2s, 9次)
    → 建议: 给 status 字段加索引
  - SELECT * FROM orders JOIN users ON ... (avg 5.1s, 6次)
    → 建议: 优化 JOIN 条件，考虑分页
```

### 场景 B：连不上排查（MCP 多数据源）

```
用户: prod-mysql 连不上了怎么回事

Agent 执行:
  1. tool_use: show_instance → 实例状态 Running，没挂
  2. mcp_monitor → CPU 95%，连接数 500/500 已满
  3. mcp_logs → 错误日志: Too many connections
  4. mcp_network → 安全组 3306 端口已放通

Agent 回复:
  排查结果：实例正常运行，但连接数已满（500/500）。
  错误日志确认: "Too many connections"
  安全组没有问题，3306 端口已放通。

  建议:
  1. 立即: 检查应用是否有连接泄漏
  2. 短期: 调大 max_connections 参数
  3. 长期: 考虑升级实例规格或引入连接池
```

### 场景C: 如果遇到非法或者还没纳管的场景

比如用户问"帮我优化一下慢 SQL"，你的 Tool 注册表里没有这个功能，LLM 看了一圈发现没有合适的工具可以调，`stop_reason` 就会返回 end_turn 而不是 `tool_use`，然后直接用文字回答。

```text
你是华为云 RDS 管理助手。

你能做的事：
- 创建/查询/删除/重启 RDS 实例
- 查询数据库规格
- 管理备份

你不能做的事：
- 操作 RDS 以外的华为云服务
- 执行 SQL
- 修改网络/安全组

当用户问你能力范围以外的事时，
诚实告知你不支持，并建议用户通过华为云控制台操作。
```

有了这个约束，用户问超范围的问题时， LLM的回复大概是:

```text
用户: 帮我优化一下慢 SQL
Agent: 抱歉，我目前不支持 SQL 优化功能。我可以帮你管理 RDS 实例（创建、查询、删除、重启）和备份。
      SQL 优化建议通过华为云控制台的 DAS（数据管理服务）进行。
```

不会报错，不会崩溃，不会瞎编一个不存在的 Tool 去调。LLM 知道自己有哪些工具——因为你在请求里把 Tool 列表传给它了，它不会凭空造一个出来。

---

## 五、完整数据流（一次 Agent 创建实例的全链路）

```mermaid
sequenceDiagram
    actor User as  用户
    participant Chat as cmd/chat.go
    participant Agent as agent/agent.go
    participant LLM as LLM API
    participant Tools as agent/tools.go
    participant Confirm as agent/confirm.go
    participant Service as service/
    participant SDK as sdk/client.go
    participant Cloud as 华为云 API

    User->>Chat: openTaurus chat "创建MySQL实例 4核16G"
    Chat->>Agent: Run("创建MySQL实例 4核16G")

    Note over Agent: 循环第 1 轮
    Agent->>LLM: POST messages + tools
    LLM-->>Agent: tool_use: list_flavors {engine: "MySQL"}
    Agent->>Tools: Execute("list_flavors", params)
    Tools->>Service: FlavorService.List("MySQL")
    Service->>SDK: GET /v3/{project}/flavors
    SDK->>Cloud: HTTPS (AK/SK 签名)
    Cloud-->>SDK: 200 OK {flavors: [...]}
    SDK-->>Service: []Flavor
    Service-->>Tools: 格式化结果
    Tools-->>Agent: "找到规格: rds.mysql.m6.large.8 (4C16G)"

    Note over Agent: 循环第 2 轮
    Agent->>LLM: POST messages + tool_result
    LLM-->>Agent: end_turn: "找到匹配规格，还需要VPC和密码"
    Agent-->>Chat: 输出提问
    Chat-->>User: "还需要 VPC、名称和密码"

    User->>Chat: "用prod-vpc，名字prod-mysql，密码MyPass123!"
    Chat->>Agent: Run(用户回复)

    Note over Agent: 循环第 3 轮
    Agent->>LLM: POST messages
    LLM-->>Agent: tool_use: create_instance {完整参数}
    Agent->>Confirm: Check(create_instance, params)
    Confirm-->>User: 展示参数摘要，确认？(Y/n)
    User-->>Confirm: Y
    Confirm-->>Agent: approved = true
    Agent->>Tools: Execute("create_instance", params)
    Tools->>Service: InstanceService.Create(input)
    Service->>SDK: POST /v3/{project}/instances
    SDK->>Cloud: HTTPS
    Cloud-->>SDK: 200 OK {id: "i-abc123"}
    SDK-->>Service: Instance{ID, Status: "Creating"}

    Note over Service: Waiter 轮询
    loop 每 10s 轮询
        Service->>SDK: GET /v3/{project}/instances/i-abc123
        SDK->>Cloud: HTTPS
        Cloud-->>SDK: {status: "Creating"} → {status: "Running"}
    end

    Service-->>Tools: Instance{ID: "i-abc123", Status: "Running"}
    Tools-->>Agent: "创建成功，ID: i-abc123"

    Note over Agent: 循环第 4 轮
    Agent->>LLM: POST messages + tool_result
    LLM-->>Agent: end_turn: 最终回复
    Agent-->>Chat: 格式化输出
    Chat-->>User: 实例已创建！连接: mysql -h 192.168.0.55 -P 3306
```

---

## 七、技术栈清单

| 用途      | 库 / 工具               | 说明                      |
| --------- | ----------------------- | ------------------------- |
| CLI 框架  | spf13/cobra             | kubectl, docker, gh 都用  |
| 配置管理  | spf13/viper             | 支持 YAML/ENV/flag        |
| 交互式 UI | AlecAivazis/survey/v2   | 终端交互选择              |
| 表格输出  | olekukonez/tablewriter  | 终端表格                  |
| 彩色输出  | fatih/color             | 状态彩色标识              |
| Spinner   | briandowns/spinner      | 加载动画                  |
| HTTP      | net/http（标准库）      | 调华为云 API + LLM API    |
| JSON      | encoding/json（标准库） | 零依赖                    |
| 测试      | stretchr/testify        | 断言 + mock               |
| 发布      | goreleaser              | 交叉编译 + GitHub Release |

---

## 八、开发计划

### 总体时间线

| 周次   | 阶段       | 核心交付物                         | 里程碑         |
| ------ | ---------- | ---------------------------------- | -------------- |
| W1-2   | CLI 基座   | configure + SDK 签名 + flavor list | 链路打通       |
| W3-4   | CLI 核心   | instance create / list / show      | 创建和查询可用 |
| W5-6   | CLI 完善   | delete / restart + 错误处理 + 测试 | CLI 生产级     |
| W7-8   | Agent 基础 | LLM 客户端 + Tool 注册 + 主循环    | Agent 跑通     |
| W9-10  | Agent 完善 | 确认机制 + 提示词 + chat 命令      | Agent 可用     |
| W11-12 | 交付       | 备份 + 测试 + 打包 + 文档          | 产品发布       |

### 开发方法论

项目采用 **SDD + TDD + CI/CD** 的开发模式：

- **SDD（Spec Driven Development）**：每个功能开发前先写规格说明
- **TDD（Test Driven Development）**：先写测试再写实现，Service 层严格驱动
- **CI/CD**：GitHub Actions 自动化 Lint + 测试 + 构建

---

## 九、总结

OpenTaurus 项目的核心价值在于：在对标 AWS 和阿里云全部基础 CLI 能力的同时，通过 AI Agent 智能交互层实现差异化竞争。

**技术选型**：选择 Go 语言，获得单二进制分发、极快启动、交叉编译等 CLI 场景的天然优势，同时通过自定义 Agent 实现避免对第三方框架的依赖。

**架构设计**：遵循"最简架构"原则，采用分层设计，CLI 和 Agent 共享 Service 层，避免业务逻辑重复。

**开发方法**：采用 SDD + TDD + CI/CD 的成熟方法论，确保 12 周内交付高质量产品。

> **核心理念：** 先构建能工作的最简单系统，然后让它随需求自然生长。—— Anthropic, Building Effective AI Agents
